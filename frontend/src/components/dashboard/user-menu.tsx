'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function avatarLetter(fullName?: string | null, email?: string | null): string {
  const name = fullName?.trim()
  if (name) return name[0]!.toUpperCase()
  const mail = email?.trim()
  if (mail) return mail[0]!.toUpperCase()
  return 'Z'
}

type UserMenuProps = {
  className?: string
}

/**
 * Avatar trigger + account dropdown. Logout reuses useAuth().logout() —
 * the same function formerly used by the sidebar footer.
 */
export function UserMenu({ className }: UserMenuProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const letter = avatarLetter(user?.fullName, user?.email)
  const displayName = user?.fullName?.trim() || user?.email || 'ZenFlow user'
  const email = user?.email?.trim() || ''

  const go = (href: string) => {
    router.push(href)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="User menu"
        className={cn(
          'zf-tap flex h-9 w-9 items-center justify-center rounded-full bg-[#E2EEFC] text-sm font-bold text-[#1D70E8] transition-colors hover:bg-[#D6E8FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zf-accent)] dark:bg-[var(--zf-soft-fill)] dark:text-[var(--zf-accent)] dark:hover:bg-[var(--zf-elevated)]',
          className,
        )}
      >
        <span aria-hidden="true">{letter}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(16rem,calc(100vw-2rem))] min-w-0 rounded-2xl border border-slate-100 bg-white p-1.5 text-slate-800 shadow-lg shadow-slate-200/60 ring-0 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] dark:text-[var(--zf-text)] dark:shadow-black/40"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 py-2.5">
            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-[var(--zf-text)]">
              {displayName}
            </span>
            {email ? (
              <span className="mt-0.5 block truncate text-xs font-normal text-slate-500 dark:text-[var(--zf-text-muted)]">
                {email}
              </span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-slate-100 dark:bg-[var(--zf-border)]" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 focus:bg-slate-50 focus:text-slate-800 dark:text-[var(--zf-text)] dark:focus:bg-[var(--zf-soft-fill)] dark:focus:text-[var(--zf-text)]"
            onClick={() => go('/dashboard/profile')}
          >
            <UserRound
              size={16}
              className="text-slate-500 dark:text-[var(--zf-text-muted)]"
              aria-hidden="true"
            />
            My Profile
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 focus:bg-slate-50 focus:text-slate-800 dark:text-[var(--zf-text)] dark:focus:bg-[var(--zf-soft-fill)] dark:focus:text-[var(--zf-text)]"
            onClick={() => go('/dashboard/settings')}
          >
            <Settings
              size={16}
              className="text-slate-500 dark:text-[var(--zf-text-muted)]"
              aria-hidden="true"
            />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-slate-100 dark:bg-[var(--zf-border)]" />

        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40 dark:focus:text-red-300"
          onClick={() => {
            void logout()
          }}
        >
          <LogOut size={16} aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
