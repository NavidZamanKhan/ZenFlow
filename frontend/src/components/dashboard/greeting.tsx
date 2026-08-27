'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

type GreetingProps = {
  remainingTasks?: number
  loading?: boolean
}

/** Local-time greeting buckets for the Overview header. */
function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

export function Greeting({ remainingTasks = 0, loading = false }: GreetingProps) {
  const { user } = useAuth()
  const displayName = user?.fullName ? user.fullName.split(' ')[0] : 'Maya'
  const badgeLabel = loading
    ? '…'
    : `${remainingTasks} ${remainingTasks === 1 ? 'task' : 'tasks'}`

  // Start neutral so SSR and first client paint match; resolve after mount.
  const [salutation, setSalutation] = useState('Hello')

  useEffect(() => {
    setSalutation(greetingForHour(new Date().getHours()))
  }, [])

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="mb-0.5 text-sm font-medium text-slate-500 dark:text-[var(--zf-text-muted)]">
          {salutation}, {displayName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[var(--zf-text)]">
          Today&apos;s focus
        </h1>
      </div>

      <div className="rounded-full bg-[var(--zf-accent-soft)] px-3.5 py-1">
        <span className="text-xs font-semibold tabular-nums text-[var(--zf-accent-fg)]">
          {badgeLabel}
        </span>
      </div>
    </div>
  )
}
