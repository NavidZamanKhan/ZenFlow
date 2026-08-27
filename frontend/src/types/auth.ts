// ---------------------------------------------------------------------------
// Auth domain types - shared between lib/api.ts and lib/auth.tsx
// ---------------------------------------------------------------------------

/** The user shape returned by the backend (snake_case from DRF). */
export interface ApiUser {
  id: string
  email: string
  full_name: string
  avatar: string | null
  avatar_url?: string | null
  email_verified: boolean
  has_password?: boolean
  date_joined: string
  created_at: string
  updated_at: string
}

/** Camel-cased user shape used throughout the frontend. */
export interface User {
  id: string
  email: string
  fullName: string
  avatar: string | null
  avatarUrl: string | null
  emailVerified: boolean
  hasPassword: boolean
  dateJoined: string
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

// -- Register ---------------------------------------------------------------

export interface RegisterRequest {
  full_name: string
  email: string
  password: string
  confirm_password: string
}

/** Returned on 201 (new registration) or 200 (email already registered). */
export interface RegisterResponse {
  message: string
  pending_registration_id?: string
}

// -- Verify Email -----------------------------------------------------------

export interface VerifyEmailRequest {
  pending_registration_id: string
  otp: string
}

export interface VerifyEmailResponse {
  tokens: AuthTokens
  user: Pick<ApiUser, 'id' | 'email' | 'full_name' | 'email_verified' | 'has_password'>
}

// -- Resend OTP -------------------------------------------------------------

export interface ResendOtpRequest {
  pending_registration_id: string
}

export interface ResendOtpResponse {
  message: string
}

// -- Login ------------------------------------------------------------------

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  tokens: AuthTokens
  user: Pick<ApiUser, 'id' | 'email' | 'full_name' | 'email_verified' | 'has_password'>
}

// -- Google Auth ------------------------------------------------------------

export interface GoogleAuthRequest {
  id_token?: string
  access_token?: string
}

// -- Password Management & Account Deletion ---------------------------------

export interface SetPasswordRequest {
  new_password: string
  confirm_password: string
}

export interface ResetPasswordWithOtpRequest {
  otp: string
  new_password: string
  confirm_password: string
}

export interface DeleteAccountRequest {
  otp: string
  password?: string
}

// -- Logout -----------------------------------------------------------------

export interface LogoutRequest {
  refresh: string
}

export interface LogoutResponse {
  detail: string
}

// -- Helpers ----------------------------------------------------------------

/** Maps a snake_case ApiUser (or partial) to the frontend camelCase User. */
export function toUser(
  api: ApiUser | Pick<ApiUser, 'id' | 'email' | 'full_name' | 'email_verified'> | (Pick<ApiUser, 'id' | 'email' | 'full_name' | 'email_verified'> & { has_password?: boolean }),
): User {
  const rawAvatarUrl = 'avatar_url' in api ? (api.avatar_url ?? null) : null
  const rawAvatar = 'avatar' in api ? (api.avatar ?? null) : null
  return {
    id: api.id,
    email: api.email,
    fullName: api.full_name,
    avatar: rawAvatar,
    avatarUrl: rawAvatarUrl || rawAvatar,
    emailVerified: api.email_verified,
    hasPassword: 'has_password' in api ? Boolean(api.has_password) : false,
    dateJoined: 'date_joined' in api ? api.date_joined : '',
    createdAt: 'created_at' in api ? api.created_at : '',
    updatedAt: 'updated_at' in api ? api.updated_at : '',
  }
}
