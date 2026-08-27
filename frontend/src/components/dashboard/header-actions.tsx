'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useSettings } from '@/hooks/use-settings'
import { applyAccentColor } from '@/lib/accent'
import { NotificationsBell } from './notifications-bell'
import { UserMenu } from './user-menu'

type HeaderActionsProps = {
  className?: string
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const { settings, updateSection } = useSettings()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-9 w-9 rounded-xl" aria-hidden="true" />
  }

  const isDark = resolvedTheme === 'dark'

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark'
    setTheme(nextTheme)
    applyAccentColor(settings.appearance.accentColor, nextTheme)
    updateSection('appearance', {
      ...settings.appearance,
      theme: nextTheme,
    })
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="zf-tap relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zf-accent)] dark:text-[var(--zf-text-muted)] dark:hover:bg-[var(--zf-hover-fill)] dark:hover:text-[var(--zf-text)]"
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}

/** Notification bell + theme toggle + user avatar menu for the dashboard header. */
export function HeaderActions({ className }: HeaderActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center gap-1.5',
        className,
      )}
    >
      <ThemeToggle />
      <NotificationsBell />
      <UserMenu />
    </div>
  )
}
