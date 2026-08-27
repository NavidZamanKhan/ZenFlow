'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from './dashboard-layout'

/**
 * Auth-guarded wrapper for dashboard sub-pages (Tasks, Calendar).
 * Mirrors the guard behavior of app/dashboard/page.tsx without modifying it.
 */
export function DashboardPageShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router])

  if (loading || !isAuthenticated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-zenflow-bg"
        role="status"
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-4 border-zenflow-primary border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-zenflow-text-secondary">
            Loading your workspace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex-1 bg-white dark:bg-[var(--zf-canvas)] lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
        <div className="lg:min-h-0 lg:flex-1 lg:overflow-auto">{children}</div>
      </div>
    </DashboardLayout>
  )
}
