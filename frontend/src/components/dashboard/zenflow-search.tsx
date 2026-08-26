'use client'

import { Search } from 'lucide-react'
import { openSpotlight } from './spotlight-modal'
import { cn } from '@/lib/utils'

type ZenflowSearchProps = {
  id?: string
  className?: string
  inputClassName?: string
  /** Called after search action is triggered (e.g. close mobile drawer). */
  onNavigate?: () => void
  autoFocus?: boolean
}

/**
 * Shared "Press / to search..." trigger used by the sidebar and mobile header.
 * Clicking this button or pressing `/` (or Cmd+K) opens the Spotlight modal.
 */
export function ZenflowSearch({
  id,
  className,
  inputClassName,
  onNavigate,
}: ZenflowSearchProps) {
  const handleClick = () => {
    onNavigate?.()
    openSpotlight()
  }

  return (
    <div className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        onClick={handleClick}
        aria-label="Open universal search (Press / or Cmd+K)"
        className={cn(
          'group flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 py-1.5 pl-9 pr-2.5 text-xs text-slate-400 transition-all hover:border-slate-200 hover:bg-slate-100/80 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zf-accent)] dark:border-[var(--zf-border)] dark:bg-[var(--zf-soft-fill)] dark:text-[var(--zf-text-muted)] dark:hover:bg-[var(--zf-elevated)]',
          inputClassName,
        )}
      >
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600 dark:text-[var(--zf-text-muted)] dark:group-hover:text-[var(--zf-text)]"
          aria-hidden="true"
        />
        <span className="truncate font-medium text-slate-400 dark:text-[var(--zf-text-muted)]">
          Press / to search...
        </span>
        <kbd className="pointer-events-none rounded-md border border-slate-200/80 bg-white/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400 shadow-xs dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] dark:text-[var(--zf-text-muted)]">
          /
        </kbd>
      </button>
    </div>
  )
}
