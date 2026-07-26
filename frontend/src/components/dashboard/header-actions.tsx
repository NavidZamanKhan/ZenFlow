'use client'

import { Bell } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

function avatarLetter(fullName?: string | null, email?: string | null): string {
  const name = fullName?.trim()
  if (name) return name[0]!.toUpperCase()
  const mail = email?.trim()
  if (mail) return mail[0]!.toUpperCase()
  return 'Z'
}

type HeaderActionsProps = {
  className?: string
}

/**
 * Visual-only notification + user controls for the dashboard header.
 * Dropdowns and real notification data land in later phases.
 */
export function HeaderActions({ className }: HeaderActionsProps) {
  const { user } = useAuth()
  const letter = avatarLetter(user?.fullName, user?.email)

  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center gap-2',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Notifications"
        className="zf-tap flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
      >
        <Bell size={18} aria-hidden="true" />
      </button>

      <button
        type="button"
        aria-label="User menu"
        className="zf-tap flex h-9 w-9 items-center justify-center rounded-full bg-[#E2EEFC] text-sm font-bold text-[#1D70E8] transition-colors hover:bg-[#D6E8FA]"
      >
        <span aria-hidden="true">{letter}</span>
      </button>
    </div>
  )
}
