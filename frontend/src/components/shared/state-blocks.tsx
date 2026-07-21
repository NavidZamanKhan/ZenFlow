import type { LucideIcon } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

/** Shared empty-state pattern used across Expenses / Tasks / Insights / Budget. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E2EEFC]">
        <Icon size={22} className="text-[#1D70E8]" aria-hidden="true" />
      </div>
      <h2 className="mb-1 text-sm font-semibold text-slate-700">{title}</h2>
      <p className="mb-5 max-w-[260px] text-xs leading-relaxed text-slate-500">
        {description}
      </p>
      {action}
    </div>
  )
}

type ErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

/** Minimal recoverable error card — ready for future API failures. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this data. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center rounded-3xl border border-rose-100 bg-rose-50/40 px-5 py-10 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100">
        <AlertCircle size={22} className="text-rose-500" aria-hidden="true" />
      </div>
      <h2 className="mb-1 text-sm font-semibold text-slate-700">{title}</h2>
      <p className="mb-5 max-w-[260px] text-xs leading-relaxed text-slate-500">
        {description}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-[#1D70E8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1660CC]"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
