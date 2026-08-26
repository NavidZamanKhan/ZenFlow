// ---------------------------------------------------------------------------
// Typed API client for Django backend auth endpoints.
// Uses native fetch - no new dependencies.
// ---------------------------------------------------------------------------

import type {
  ApiUser,
  DeleteAccountRequest,
  GoogleAuthRequest,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RegisterRequest,
  RegisterResponse,
  ResendOtpRequest,
  ResendOtpResponse,
  ResetPasswordWithOtpRequest,
  SetPasswordRequest,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from '@/types/auth'
import type { Task, TaskInput } from '@/types/task'
import type { Expense, ExpenseInput } from '@/types/expense'
import type { Budget, BudgetValues, ThresholdAlert } from '@/types/budget'

const API_BASE = 'http://localhost:8000'

// -- Token persistence (localStorage) ---------------------------------------

const TOKEN_KEY = 'zenflow:tokens'

export function getStoredTokens(): { access: string; refresh: string } | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function storeTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ access, refresh }))
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
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

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { headers, ...rest } = options

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
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

  if (!res.ok) {
    const record =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : null

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

/**
 * Wrapper around request() that attaches the stored access token.
 * If the request returns 401, tokens are cleared - the auth context
 * will detect this and redirect to /login.
 *
 * TODO: Wire silent token refresh here once the backend exposes
 * POST /api/auth/refresh/ (TokenRefreshView). Until then, a 401
 * means the session is over and the user must re-login.
 */
async function authRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const tokens = getStoredTokens()
  if (!tokens) {
    throw new ApiError(401, ['Not authenticated.'])
  }

  try {
    return await request<T>(path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${tokens.access}`,
      },
    })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearTokens()
    }
    throw err
  }
}

// -- Public endpoints (no auth required) ------------------------------------

export function apiRegister(data: RegisterRequest): Promise<RegisterResponse> {
  return request<RegisterResponse>('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiVerifyEmail(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
  return request<VerifyEmailResponse>('/api/auth/verify-email/', {
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

export function apiLogin(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiGoogleAuth(data: GoogleAuthRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/google/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// -- Protected endpoints (auth required) ------------------------------------

export function apiLogout(refresh: string): Promise<LogoutResponse> {
  return authRequest<LogoutResponse>('/api/auth/logout/', {
    method: 'POST',
    body: JSON.stringify({ refresh } satisfies LogoutRequest),
  })
}

export function apiMe(): Promise<ApiUser> {
  return authRequest<ApiUser>('/api/auth/me/')
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


