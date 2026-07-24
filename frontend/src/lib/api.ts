// ---------------------------------------------------------------------------
// Typed API client for Django backend auth endpoints.
// Uses native fetch — no new dependencies.
// ---------------------------------------------------------------------------

import type {
  ApiUser,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RegisterRequest,
  RegisterResponse,
  ResendOtpRequest,
  ResendOtpResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from '@/types/auth'
import type { Task, TaskInput } from '@/types/task'

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
  /** Backend error messages — either a flat list or field-keyed object. */
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
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  // 204 No Content
  if (res.status === 204) return undefined as T

  const body = await res.json()

  if (!res.ok) {
    // The backend returns errors in two shapes:
    //   { "errors": [...] }                     — service-level errors
    //   { "field": ["msg"], "field2": [...] }   — serializer validation errors
    const errors: string[] | Record<string, string[]> =
      body.errors ?? body.detail
        ? { _general: [body.detail ?? 'Request failed'] }
        : body
    throw new ApiError(res.status, errors)
  }

  return body as T
}

/**
 * Wrapper around request() that attaches the stored access token.
 * If the request returns 401, tokens are cleared — the auth context
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
