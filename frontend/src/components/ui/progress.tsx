import { cn } from '@/lib/utils'

type ProgressProps = {
  value: number
  className?: string
  indicatorClassName?: string
  label?: string
}

export function Progress({
  value,
  className,
  indicatorClassName,
  label = 'Progress',
}: ProgressProps) {
  const normalized = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(normalized)}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-slate-100',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width,background-color] duration-300',
          indicatorClassName,
        )}
        style={{ width: `${normalized}%` }}
      />
    </div>
  )
}
