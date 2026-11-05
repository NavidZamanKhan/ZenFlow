'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types/auth'
import { toUser } from '@/types/auth'
import {
  apiGoogleAuth,
  apiLogin,
  apiLogout,
  apiMe,
  apiRegister,
  apiResendOtp,
  apiUpdateProfile,
  apiVerifyEmail,
  ApiError,
  clearSession,
  hasSessionHint,
  markSession,
  setSessionExpiredHandler,
} from './api'
import { clientCache } from './client-cache'

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

interface SignupResult {
  pendingRegistrationId: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  loading: boolean

  login: (email: string, password: string) => Promise<void>
  /** `idToken` is the Google ID token (`credential`) returned by Google Identity Services. */
  loginWithGoogle: (idToken: string) => Promise<void>
  signup: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<SignupResult>
  verifyEmail: (pendingRegistrationId: string, otp: string) => Promise<void>
  resendOtp: (pendingRegistrationId: string) => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (data: { fullName?: string; avatar?: File | null }) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ---------------------------------------------------------------------------
// User persistence (separate from token storage)
// ---------------------------------------------------------------------------

const USER_KEY = 'zenflow:user'

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function storeUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function clearUser(): void {
  localStorage.removeItem(USER_KEY)
}

// Also clear legacy keys from the old localStorage-simulation auth
function clearLegacyAuth(): void {
  localStorage.removeItem('isAuthenticated')
  localStorage.removeItem('user')
  // Older builds persisted JWTs in localStorage; tokens now live in
  // httpOnly cookies so anything left behind is dead weight.
  localStorage.removeItem('zenflow:tokens')
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const router = useRouter()

  const resetLocalSession = useCallback(() => {
    clearSession()
    clearUser()
    clientCache.clear()
    setIsAuthenticated(false)
    setUser(null)
  }, [])

  // When a silent refresh fails anywhere in the app the session is gone:
  // drop local state and send the user to the login page.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      resetLocalSession()
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
        router.push('/login')
      }
    })
    return () => setSessionExpiredHandler(null)
  }, [resetLocalSession, router])

  // Hydrate session on mount. The JWT cookies are httpOnly (invisible to JS),
  // so we ask /me whether the browser still holds a valid session. A small
  // non-sensitive flag lets anonymous visitors skip the round-trip.
  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      clearLegacyAuth()

      if (!hasSessionHint()) {
        clearUser()
        setLoading(false)
        return
      }

      // Optimistic: show stored user instantly while validating
      const cached = getStoredUser()
      if (cached) {
        setUser(cached)
        setIsAuthenticated(true)
      }

      try {
        const apiUser = await apiMe()
        if (cancelled) return
        const freshUser = toUser(apiUser)
        setUser(freshUser)
        setIsAuthenticated(true)
        storeUser(freshUser)
      } catch {
        if (cancelled) return
        // Cookies are invalid/expired - clear everything
        clearSession()
        clearUser()
        setIsAuthenticated(false)
        setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    hydrate()
    return () => { cancelled = true }
  }, [])

  const establishSession = useCallback((apiUser: Parameters<typeof toUser>[0]) => {
    markSession()
    const u = toUser(apiUser)
    storeUser(u)
    setUser(u)
    setIsAuthenticated(true)
    router.push('/dashboard')
  }, [router])

  // -- Login ----------------------------------------------------------------

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await apiLogin({ email, password })
    establishSession(res.user)
  }, [establishSession])

  // -- Google Login ---------------------------------------------------------

  const loginWithGoogle = useCallback(async (idToken: string): Promise<void> => {
    const res = await apiGoogleAuth({ id_token: idToken })
    establishSession(res.user)
  }, [establishSession])

  // -- Signup (step 1 - returns pending ID, does NOT authenticate) ----------

  const signup = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
  ): Promise<SignupResult> => {
    const res = await apiRegister({
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
    })

    if (!res.pending_registration_id) {
      // Backend returned generic message without an ID - email already
      // registered but we don't reveal that to the user (anti-enumeration).
      // We still return a fake flow so the UI shows the OTP dialog.
      // The user won't receive an OTP email, and verify-email will fail
      // with "Invalid or expired registration." which is acceptable UX.
      throw new ApiError(400, ['An account with this email may already exist. Try logging in.'])
    }

    return { pendingRegistrationId: res.pending_registration_id }
  }, [])

  // -- Verify email (step 2 - authenticates on success) ---------------------

  const verifyEmail = useCallback(async (
    pendingRegistrationId: string,
    otp: string,
  ): Promise<void> => {
    const res = await apiVerifyEmail({
      pending_registration_id: pendingRegistrationId,
      otp,
    })
    establishSession(res.user)
  }, [establishSession])

  // -- Resend OTP -----------------------------------------------------------

  const resendOtp = useCallback(async (pendingRegistrationId: string): Promise<void> => {
    await apiResendOtp({ pending_registration_id: pendingRegistrationId })
  }, [])

  // -- Refresh User --------------------------------------------------------

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const apiUser = await apiMe()
      const freshUser = toUser(apiUser)
      setUser(freshUser)
      storeUser(freshUser)
    } catch {
      // Ignore if cannot refresh
    }
  }, [])

  // -- Update Profile ------------------------------------------------------

  const updateProfile = useCallback(async (data: {
    fullName?: string
    avatar?: File | null
  }): Promise<User> => {
    const apiUser = await apiUpdateProfile(data)
    const freshUser = toUser(apiUser)
    setUser(freshUser)
    storeUser(freshUser)
    return freshUser
  }, [])

  // -- Logout ---------------------------------------------------------------

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Blacklists the refresh token and clears the httpOnly cookies.
      await apiLogout()
    } catch {
      // Even if the backend call fails (e.g. session already expired),
      // we still clear local state and redirect.
    }
    resetLocalSession()
    router.push('/login')
  }, [resetLocalSession, router])

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, loginWithGoogle, signup, verifyEmail, resendOtp, refreshUser, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
