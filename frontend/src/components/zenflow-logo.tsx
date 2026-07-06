import { cn } from '@/lib/utils'

export function ZenFlowLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-xl bg-primary text-primary-foreground',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[62%]" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5 6.5h14L5 17.5h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
