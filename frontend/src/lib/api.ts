// ---------------------------------------------------------------------------
// Typed API client for the Django backend.
//
// Authentication is cookie based: the backend sets httpOnly, Secure JWT
// access/refresh cookies, so the browser attaches them automatically
// (`credentials: 'include'`). JavaScript never sees the tokens. Mutating
// requests carry an `X-CSRFToken` header (double-submit pattern); the token
// is returned by the auth endpoints and kept in memory only.
// ---------------------------------------------------------------------------

import type {
  ApiUser,
  AuthSessionResponse,
  DeleteAccountRequest,
  ForgotPasswordRequest,
  GoogleAuthRequest,
  LoginRequest,
  LogoutResponse,
  PasswordRecoveryConfirmRequest,
  PasswordRecoveryTokenRequest,
  PasswordRecoveryValidateResponse,
  RegisterRequest,
  RegisterResponse,
  ResendOtpRequest,
  ResendOtpResponse,
  ResetPasswordWithOtpRequest,
  SetPasswordRequest,
  VerifyEmailRequest,
} from '@/types/auth'
import type { Task, TaskInput } from '@/types/task'
import type { Expense, ExpenseInput } from '@/types/expense'
import type { Budget, BudgetValues, ThresholdAlert } from '@/types/budget'
import type { CalendarEvent, CalendarEventInput } from '@/types/event'
import type { AnalyticsSummary, AnalyticsSummaryParams } from '@/types/analytics'
import type { Reminder, ReminderInput, ReminderNotification } from '@/types/reminder'

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'https://zenflow-5u3r.onrender.com'
).replace(/\/$/, '')

// -- Session hint -----------------------------------------------------------
// The auth cookies are httpOnly, so the client cannot inspect them. A tiny
// non-sensitive flag records that a session was established so the app can
// skip the /me round-trip for anonymous visitors. It holds no credentials.

const SESSION_HINT_KEY = 'zenflow:session'
const LEGACY_TOKEN_KEY = 'zenflow:tokens'

export function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

export function markSession(): void {
  try {
    localStorage.setItem(SESSION_HINT_KEY, '1')
  } catch {
    // Storage unavailable (private mode) - the app still works, it only
    // loses the fast-path on reload.
  }
}

export function clearSession(): void {
  csrfToken = null
  try {
    localStorage.removeItem(SESSION_HINT_KEY)
    localStorage.removeItem(REFRESHED_AT_KEY)
    // Remove tokens persisted by older builds of the app.
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // ignore
  }
}

// -- CSRF token (memory only) -----------------------------------------------

let csrfToken: string | null = null
let csrfPromise: Promise<string | null> | null = null

export function setCsrfToken(token: string | null | undefined): void {
  if (token) csrfToken = token
}

/** Fetch a CSRF token from the backend if we don't already hold one. */
async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken
  if (!csrfPromise) {
    csrfPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/csrf/`, {
          credentials: 'include',
        })
        if (!res.ok) return null
        const data = (await res.json()) as { csrfToken?: string }
        setCsrfToken(data.csrfToken)
        return csrfToken
      } catch {
        return null
      } finally {
        csrfPromise = null
      }
    })()
  }
  return csrfPromise
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

// -- Session-expired hook ---------------------------------------------------
// Registered by the AuthProvider so a failed silent refresh can reset the UI
// (clear user, redirect to /login) from anywhere in the app.

type SessionExpiredHandler = () => void
let sessionExpiredHandler: SessionExpiredHandler | null = null

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  sessionExpiredHandler = handler
}

// -- Helpers ----------------------------------------------------------------

/** Structured error thrown by API call functions. */
export class ApiError extends Error {
  status: number
  /** Backend error messages - either a flat list or field-keyed object. */
  errors: string[] | Record<string, string[]>

  constructor(
    status: number,
    errors: string[] | Record<string, string[]>,
  ) {
    const flat = Array.isArray(errors) ? errors.join(' ') : Object.values(errors).flat().join(' ')
    super(flat)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { headers, ...rest } = options
  const method = (rest.method ?? 'GET').toUpperCase()

  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData
  const defaultHeaders: Record<string, string> = isFormData
    ? {}
    : { 'Content-Type': 'application/json' }

  if (!SAFE_METHODS.has(method)) {
    const token = await ensureCsrfToken()
    if (token) defaultHeaders['X-CSRFToken'] = token
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    })
  } catch {
    throw new ApiError(0, ['Cannot reach the server. Is the backend running?'])
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  const raw = await res.text()
  let body: unknown = null
  if (raw) {
    try {
      body = JSON.parse(raw) as unknown
    } catch {
      throw new ApiError(res.status, [
        res.status >= 500
          ? 'Server error while processing the request.'
          : 'Unexpected response from the server.',
      ])
    }
  }

  // Auth endpoints rotate the CSRF token alongside the session cookies.
  if (body && typeof body === 'object' && 'csrfToken' in body) {
    setCsrfToken((body as { csrfToken?: string }).csrfToken)
  }

  if (!res.ok) {
    const record =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : null

    // A CSRF rejection means our in-memory token no longer matches the
    // cookie; forget it so the next unsafe request fetches a fresh one.
    if (res.status === 403 && typeof record?.detail === 'string' && record.detail.startsWith('CSRF')) {
      csrfToken = null
    }

    let errors: string[] | Record<string, string[]>
    if (record && Array.isArray(record.errors)) {
      errors = record.errors as string[]
    } else if (record && typeof record.detail === 'string') {
      errors = [record.detail]
    } else if (record && Array.isArray(record.detail)) {
      errors = record.detail.map(String)
    } else if (record) {
      // DRF field-keyed validation errors, e.g. { password: ["..."] }
      errors = record as Record<string, string[]>
    } else {
      errors = [`Request failed (${res.status}).`]
    }

    throw new ApiError(res.status, errors)
  }

  return body as T
}

// -- Silent refresh ---------------------------------------------------------
// The refresh token rotates on every use and the previous one is blacklisted,
// so two refreshes with the same token must never race: the loser gets a 401
// and the server expires the cookies the winner just received. Two layers
// prevent that:
//   1. `refreshPromise` - single flight within this tab;
//   2. a Web Lock (`navigator.locks`) - single flight across tabs. Tabs queue
//      on the lock; a tab that acquires it after another tab has just
//      refreshed skips the network call (the browser's cookie jar is shared,
//      so it already holds the new cookies) and simply retries its request.
// Browsers without Web Locks fall back to the timestamp check alone, which
// narrows the window but cannot fully close it.

const REFRESH_LOCK_NAME = 'zenflow:session-refresh'
const REFRESHED_AT_KEY = 'zenflow:session-refreshed-at'
/** How long after another tab's refresh we treat the cookies as fresh. */
const REFRESH_REUSE_WINDOW_MS = 15_000

let refreshPromise: Promise<boolean> | null = null

function lastRefreshAt(): number {
  try {
    const raw = localStorage.getItem(REFRESHED_AT_KEY)
    const at = raw ? Number(raw) : 0
    return Number.isFinite(at) ? at : 0
  } catch {
    return 0
  }
}

function recordRefresh(): void {
  try {
    localStorage.setItem(REFRESHED_AT_KEY, String(Date.now()))
  } catch {
    // Storage unavailable - other tabs simply cannot benefit from this refresh.
  }
}

/** True when another tab refreshed after `since` and recently enough to trust. */
function refreshedSince(since: number): boolean {
  const at = lastRefreshAt()
  return at > since && Date.now() - at < REFRESH_REUSE_WINDOW_MS
}

async function callRefreshEndpoint(): Promise<void> {
  const refresh = () =>
    request<{ detail: string; csrfToken: string }>('/api/auth/refresh/', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  try {
    await refresh()
  } catch (err) {
    // The refresh endpoint is CSRF-protected. A stale in-memory CSRF token
    // (e.g. the cookie was reissued by another tab) is recoverable: fetch a
    // fresh one and try once more. Anything else propagates.
    if (err instanceof ApiError && err.status === 403) {
      csrfToken = null
      await refresh()
      return
    }
    throw err
  }
}

async function performRefresh(startedAt: number): Promise<boolean> {
  if (refreshedSince(startedAt)) return true
  try {
    await callRefreshEndpoint()
    recordRefresh()
    markSession()
    return true
  } catch {
    return false
  }
}

async function withCrossTabLock(fn: () => Promise<boolean>): Promise<boolean> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (locks && typeof locks.request === 'function') {
    const result: unknown = await locks.request(REFRESH_LOCK_NAME, fn)
    return result === true
  }
  return fn()
}

export async function silentRefreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    // Captured before waiting for the lock so a refresh completed by another
    // tab *while we waited* counts as ours.
    const startedAt = Date.now()
    refreshPromise = withCrossTabLock(() => performRefresh(startedAt)).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/**
 * Wrapper around request() for endpoints that require a session.
 * On 401 (access cookie expired) it transparently refreshes the session via
 * the httpOnly refresh cookie and retries once. If the refresh fails the
 * session is considered gone and the registered handler logs the user out.
 */
async function authRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    return await request<T>(path, options)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const refreshed = await silentRefreshSession()
      if (refreshed) {
        return await request<T>(path, options)
      }
      clearSession()
      sessionExpiredHandler?.()
    }
    throw err
  }
}

// -- Public endpoints (no auth required) ------------------------------------

export function apiCsrf(): Promise<{ csrfToken: string }> {
  return request<{ csrfToken: string }>('/api/auth/csrf/')
}

export function apiRegister(data: RegisterRequest): Promise<RegisterResponse> {
  return request<RegisterResponse>('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiVerifyEmail(data: VerifyEmailRequest): Promise<AuthSessionResponse> {
  return request<AuthSessionResponse>('/api/auth/verify-email/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiResendOtp(data: ResendOtpRequest): Promise<ResendOtpResponse> {
  return request<ResendOtpResponse>('/api/auth/resend-otp/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiLogin(data: LoginRequest): Promise<AuthSessionResponse> {
  return request<AuthSessionResponse>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiGoogleAuth(data: GoogleAuthRequest): Promise<AuthSessionResponse> {
  return request<AuthSessionResponse>('/api/auth/google/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// -- Password recovery (public, email link) ---------------------------------

export function apiForgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
  return request<{ message: string }>('/api/auth/password/forgot/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiValidateRecoveryToken(
  data: PasswordRecoveryTokenRequest,
): Promise<PasswordRecoveryValidateResponse> {
  return request<PasswordRecoveryValidateResponse>('/api/auth/password/forgot/validate/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiConfirmPasswordRecovery(
  data: PasswordRecoveryConfirmRequest,
): Promise<{ message: string }> {
  return request<{ message: string }>('/api/auth/password/forgot/confirm/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// -- Protected endpoints (auth required) ------------------------------------

export function apiLogout(): Promise<LogoutResponse> {
  return authRequest<LogoutResponse>('/api/auth/logout/', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function apiMe(): Promise<ApiUser> {
  return authRequest<ApiUser>('/api/auth/me/')
}

export function apiUpdateProfile(data: {
  fullName?: string
  avatar?: File | null
}): Promise<ApiUser> {
  const formData = new FormData()
  if (data.fullName !== undefined) {
    formData.append('full_name', data.fullName)
  }
  if (data.avatar instanceof File) {
    formData.append('avatar', data.avatar)
  }
  return authRequest<ApiUser>('/api/auth/me/', {
    method: 'PATCH',
    body: formData,
  })
}

export function apiSetPassword(
  data: SetPasswordRequest,
): Promise<{ message: string; user: ApiUser }> {
  return authRequest<{ message: string; user: ApiUser }>(
    '/api/auth/password/set/',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
}

export function apiSendPasswordResetOtp(): Promise<{ message: string }> {
  return authRequest<{ message: string }>('/api/auth/password/otp/', {
    method: 'POST',
  })
}

export function apiResetPasswordWithOtp(
  data: ResetPasswordWithOtpRequest,
): Promise<{ message: string }> {
  return authRequest<{ message: string }>('/api/auth/password/reset/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiSendDeleteAccountOtp(): Promise<{ message: string }> {
  return authRequest<{ message: string }>('/api/auth/delete-account/otp/', {
    method: 'POST',
  })
}

export function apiDeleteAccount(
  data: DeleteAccountRequest,
): Promise<{ message: string }> {
  return authRequest<{ message: string }>('/api/auth/delete-account/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// -- Tasks endpoints --------------------------------------------------------

export function apiGetTasks(): Promise<Task[]> {
  return authRequest<Task[]>('/api/tasks/')
}

export function apiCreateTask(data: TaskInput): Promise<Task> {
  return authRequest<Task>('/api/tasks/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiUpdateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
  return authRequest<Task>(`/api/tasks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function apiDeleteTask(id: string): Promise<void> {
  return authRequest<void>(`/api/tasks/${id}/`, {
    method: 'DELETE',
  })
}

// -- Expenses endpoints ------------------------------------------------------

export function apiGetExpenses(): Promise<Expense[]> {
  return authRequest<Expense[]>('/api/expenses/')
}

export function apiCreateExpense(data: ExpenseInput): Promise<Expense> {
  return authRequest<Expense>('/api/expenses/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiUpdateExpense(id: string, patch: Partial<ExpenseInput>): Promise<Expense> {
  return authRequest<Expense>(`/api/expenses/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function apiDeleteExpense(id: string): Promise<void> {
  return authRequest<void>(`/api/expenses/${id}/`, {
    method: 'DELETE',
  })
}

// -- Analytics endpoints -----------------------------------------------------

export function apiGetAnalyticsSummary(
  params: AnalyticsSummaryParams = {},
): Promise<AnalyticsSummary> {
  return authRequest<AnalyticsSummary>(
    `/api/analytics/summary/${buildQuery({ start: params.start, end: params.end })}`,
  )
}

// -- Budget endpoints --------------------------------------------------------

export function apiGetBudget(): Promise<Budget> {
  return authRequest<Budget>('/api/budget/')
}

export function apiUpdateBudget(patch: Partial<BudgetValues>): Promise<Budget> {
  return authRequest<Budget>('/api/budget/', {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

export function apiRecordThresholdAlerts(
  month: string,
  alerts: ThresholdAlert[],
): Promise<{ recorded: ThresholdAlert[] }> {
  return authRequest<{ recorded: ThresholdAlert[] }>('/api/budget/record-alerts/', {
    method: 'POST',
    body: JSON.stringify({ month, alerts }),
  })
}

// -- Reminders endpoints -----------------------------------------------------

export function apiGetReminders(params: {
  status?: Reminder['status']
  upcoming?: boolean
} = {}): Promise<Reminder[]> {
  return authRequest<Reminder[]>(
    `/api/reminders/${buildQuery({ status: params.status, upcoming: params.upcoming ? 1 : undefined })}`,
  )
}

export function apiCreateReminder(data: ReminderInput): Promise<Reminder> {
  return authRequest<Reminder>('/api/reminders/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiUpdateReminder(id: string, patch: Partial<ReminderInput>): Promise<Reminder> {
  return authRequest<Reminder>(`/api/reminders/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function apiDeleteReminder(id: string): Promise<void> {
  return authRequest<void>(`/api/reminders/${id}/`, { method: 'DELETE' })
}

export function apiSnoozeReminder(id: string, minutes = 10): Promise<Reminder> {
  return authRequest<Reminder>(`/api/reminders/${id}/snooze/`, {
    method: 'POST',
    body: JSON.stringify({ minutes }),
  })
}

export function apiGetReminderNotifications(params: { unread?: boolean } = {}): Promise<ReminderNotification[]> {
  return authRequest<ReminderNotification[]>(
    `/api/reminders/notifications/${buildQuery({ unread: params.unread ? 1 : undefined })}`,
  )
}

export function apiMarkReminderNotificationRead(id: string): Promise<ReminderNotification> {
  return authRequest<ReminderNotification>(`/api/reminders/notifications/${id}/read/`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function apiMarkAllReminderNotificationsRead(): Promise<{ updated: number }> {
  return authRequest<{ updated: number }>('/api/reminders/notifications/read-all/', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function apiDeleteReminderNotification(id: string): Promise<void> {
  return authRequest<void>(`/api/reminders/notifications/${id}/`, { method: 'DELETE' })
}

// -- Events endpoints --------------------------------------------------------

export interface ApiCalendarEvent {
  id: string
  title: string
  description?: string
  start_datetime: string
  end_datetime?: string | null
  all_day: boolean
  created_at: string
  updated_at: string
}

function fromApiEvent(e: ApiCalendarEvent): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? '',
    start: e.start_datetime,
    end: e.end_datetime ?? e.start_datetime,
    allDay: e.all_day,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

function toApiEventInput(input: CalendarEventInput | Partial<CalendarEventInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.description !== undefined) payload.description = input.description.trim()
  if (input.start !== undefined) payload.start_datetime = input.start
  if (input.end !== undefined) payload.end_datetime = input.end || null
  if (input.allDay !== undefined) payload.all_day = input.allDay
  return payload
}

export async function apiGetEvents(): Promise<CalendarEvent[]> {
  const records = await authRequest<ApiCalendarEvent[]>('/api/events/')
  return records.map(fromApiEvent)
}

export async function apiCreateEvent(data: CalendarEventInput): Promise<CalendarEvent> {
  const created = await authRequest<ApiCalendarEvent>('/api/events/', {
    method: 'POST',
    body: JSON.stringify(toApiEventInput(data)),
  })
  return fromApiEvent(created)
}

export async function apiUpdateEvent(id: string, patch: Partial<CalendarEventInput>): Promise<CalendarEvent> {
  const updated = await authRequest<ApiCalendarEvent>(`/api/events/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(toApiEventInput(patch)),
  })
  return fromApiEvent(updated)
}

export function apiDeleteEvent(id: string): Promise<void> {
  return authRequest<void>(`/api/events/${id}/`, {
    method: 'DELETE',
  })
}


