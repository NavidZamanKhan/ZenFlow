'use client'

import { useAuth } from '@/lib/auth'

type GreetingProps = {
  remainingTasks?: number
  loading?: boolean
}

export function Greeting({ remainingTasks = 0, loading = false }: GreetingProps) {
  const { user } = useAuth()
  const displayName = user?.fullName ? user.fullName.split(' ')[0] : 'Maya'
  const badgeLabel = loading
    ? '…'
    : `${remainingTasks} ${remainingTasks === 1 ? 'task' : 'tasks'}`

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="mb-0.5 text-sm font-medium text-slate-400">
          Good morning, {displayName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          Today&apos;s focus
        </h1>
      </div>

      <div className="rounded-full bg-[#E2EEFC] px-3.5 py-1">
        <span className="text-xs font-semibold text-[#1D70E8] tabular-nums">
          {badgeLabel}
        </span>
      </div>
    </div>
  )
}
