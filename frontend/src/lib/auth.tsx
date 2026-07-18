'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  email: string
  fullName?: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (fullName: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const router = useRouter()

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Check localStorage on client side mount
    const authFlag = localStorage.getItem('isAuthenticated') === 'true'
    const storedUserStr = localStorage.getItem('user')

    if (authFlag && storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr)
        setIsAuthenticated(true)
        setUser({ email: storedUser.email, fullName: storedUser.fullName })
      } catch {
        // Clear broken localStorage data
        localStorage.removeItem('isAuthenticated')
      }
    }
    setLoading(false)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const login = async (email: string, password: string): Promise<boolean> => {
    const storedUserStr = localStorage.getItem('user')
    if (!storedUserStr) {
      throw new Error('No registered account found. Please sign up first.')
    }

    try {
      const storedUser = JSON.parse(storedUserStr)
      if (storedUser.email === email && storedUser.password === password) {
        setIsAuthenticated(true)
        setUser({ email: storedUser.email, fullName: storedUser.fullName })
        localStorage.setItem('isAuthenticated', 'true')
        router.push('/dashboard')
        return true
      } else {
        throw new Error('Invalid email or password.')
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw e
      }
      throw new Error('Login failed')
    }
  }

  const signup = async (fullName: string, email: string, password: string): Promise<boolean> => {
    const userObj = { fullName, email, password }
    localStorage.setItem('user', JSON.stringify(userObj))
    setIsAuthenticated(true)
    setUser({ email, fullName })
    localStorage.setItem('isAuthenticated', 'true')
    router.push('/dashboard')
    return true
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem('isAuthenticated')
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signup, logout, loading }}>
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
