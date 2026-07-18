'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'

export default function DashboardPage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router])

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zenflow-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-zenflow-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-zenflow-text-secondary">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return <DashboardLayout />
}
