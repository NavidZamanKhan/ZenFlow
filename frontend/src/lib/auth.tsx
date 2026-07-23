'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types/auth'
import { toUser } from '@/types/auth'
import {
  apiLogin,
  apiLogout,
  apiMe,
  apiRegister,
  apiResendOtp,
  apiVerifyEmail,
  ApiError,
  clearTokens,
  getStoredTokens,
  storeTokens,
} from './api'

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
  signup: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<SignupResult>
  verifyEmail: (pendingRegistrationId: string, otp: string) => Promise<void>
  resendOtp: (pendingRegistrationId: string) => Promise<void>
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
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const router = useRouter()

  // Hydrate session on mount — check for stored tokens, validate with /me
  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      clearLegacyAuth()

      const tokens = getStoredTokens()
      if (!tokens) {
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
        // Token is invalid/expired — clear everything
        clearTokens()
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

  // -- Login ----------------------------------------------------------------

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await apiLogin({ email, password })
    storeTokens(res.tokens.access, res.tokens.refresh)
    const u = toUser(res.user)
    storeUser(u)
    setUser(u)
    setIsAuthenticated(true)
    router.push('/dashboard')
  }, [router])

  // -- Signup (step 1 — returns pending ID, does NOT authenticate) ----------

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
      // Backend returned generic message without an ID — email already
      // registered but we don't reveal that to the user (anti-enumeration).
      // We still return a fake flow so the UI shows the OTP dialog.
      // The user won't receive an OTP email, and verify-email will fail
      // with "Invalid or expired registration." which is acceptable UX.
      throw new ApiError(400, ['An account with this email may already exist. Try logging in.'])
    }

    return { pendingRegistrationId: res.pending_registration_id }
  }, [])

  // -- Verify email (step 2 — authenticates on success) ---------------------

  const verifyEmail = useCallback(async (
    pendingRegistrationId: string,
    otp: string,
  ): Promise<void> => {
    const res = await apiVerifyEmail({
      pending_registration_id: pendingRegistrationId,
      otp,
    })
    storeTokens(res.tokens.access, res.tokens.refresh)
    const u = toUser(res.user)
    storeUser(u)
    setUser(u)
    setIsAuthenticated(true)
    router.push('/dashboard')
  }, [router])

  // -- Resend OTP -----------------------------------------------------------

  const resendOtp = useCallback(async (pendingRegistrationId: string): Promise<void> => {
    await apiResendOtp({ pending_registration_id: pendingRegistrationId })
  }, [])

  // -- Logout ---------------------------------------------------------------

  const logout = useCallback(async (): Promise<void> => {
    const tokens = getStoredTokens()
    if (tokens) {
      try {
        await apiLogout(tokens.refresh)
      } catch {
        // Even if the backend call fails (e.g. token already expired),
        // we still clear local state and redirect.
      }
    }
    clearTokens()
    clearUser()
    setIsAuthenticated(false)
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, signup, verifyEmail, resendOtp, logout }}>
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
