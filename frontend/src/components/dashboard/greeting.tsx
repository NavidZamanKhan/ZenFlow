'use client'

import { useAuth } from '@/lib/auth'

export function Greeting() {
  const { user } = useAuth()
  const displayName = user?.fullName ? user.fullName.split(' ')[0] : 'Maya'

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-0.5">
          Good morning, {displayName}
        </p>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Today&apos;s focus
        </h1>
      </div>

      {/* Tasks Badge */}
      <div className="bg-[#E2EEFC] px-3.5 py-1 rounded-full">
        <span className="text-xs font-semibold text-[#1D70E8]">
          4 tasks
        </span>
      </div>
    </div>
  )
}

