import { Bell, Check, ListTodo, Search, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const tasks = [
  { label: 'Finalize Q3 roadmap', tag: 'Product', done: true },
  { label: 'Review design handoff', tag: 'Design', done: true },
  { label: 'Client sync — Northwind', tag: 'Meeting', done: false },
  { label: 'Draft budget proposal', tag: 'Finance', done: false },
]

const reminders = [
  { label: 'Standup with team', time: '9:30 AM', dot: 'bg-teal-400' },
  { label: 'Dentist appointment', time: '2:00 PM', dot: 'bg-rose-400' },
  { label: 'Send invoice #402', time: '5:15 PM', dot: 'bg-[var(--zf-accent)]' },
]

// heights as % of the chart container
const bars = [40, 60, 50, 80, 70, 90, 65]

export function DashboardPreview() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] dark:shadow-black/40">
      {/* window chrome + search */}
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-red-400" />
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="size-2 rounded-full bg-teal-400" />
        </div>
        <div className="flex h-8 flex-1 items-center gap-2 rounded-full bg-slate-100 px-3.5 dark:bg-[var(--zf-soft-fill)]">
          <Search className="size-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <span className="text-xs text-slate-400 dark:text-slate-500">Search ZenFlow...</span>
        </div>
      </div>

      {/* greeting */}
      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-[var(--zf-text-muted)]">Good morning, Maya</p>
          <p className="text-lg font-bold text-slate-900 dark:text-[var(--zf-text)]">Today&apos;s focus</p>
        </div>
        <span className="rounded-full bg-[var(--zf-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--zf-accent)]">
          4 tasks
        </span>
      </div>

      {/* task list */}
      <div className="mt-4 rounded-xl border border-slate-100 p-4 dark:border-[var(--zf-border)] dark:bg-[var(--zf-elevated)]/40">
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
          <ListTodo className="size-3.5" aria-hidden="true" />
          Tasks
        </p>
        <ul className="mt-3 space-y-2.5">
          {tasks.map((task) => (
            <li key={task.label} className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex size-4.5 shrink-0 items-center justify-center rounded-full',
                  task.done
                    ? 'bg-[var(--zf-accent)] text-white'
                    : 'border-2 border-slate-300 dark:border-slate-600',
                )}
                aria-hidden="true"
              >
                {task.done && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  'flex-1 truncate text-sm',
                  task.done
                    ? 'text-slate-400 line-through dark:text-slate-500'
                    : 'text-slate-700 dark:text-slate-200',
                )}
              >
                {task.label}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-[var(--zf-soft-fill)] dark:text-slate-400">
                {task.tag}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* reminders + productivity */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 p-4 dark:border-[var(--zf-border)] dark:bg-[var(--zf-elevated)]/40">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
            <Bell className="size-3.5" aria-hidden="true" />
            Reminders
          </p>
          <ul className="mt-3 space-y-2">
            {reminders.map((reminder) => (
              <li key={reminder.label} className="flex items-center gap-2 py-1">
                <span className={cn('size-1.5 shrink-0 rounded-full', reminder.dot)} aria-hidden="true" />
                <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                  {reminder.label}
                </span>
                <span className="text-xs whitespace-nowrap text-slate-400 dark:text-slate-500">
                  {reminder.time}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-100 p-4 dark:border-[var(--zf-border)] dark:bg-[var(--zf-elevated)]/40">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
            <TrendingUp className="size-3.5" aria-hidden="true" />
            Productivity
          </p>
          <p className="mt-3 text-xs text-slate-500 dark:text-[var(--zf-text-muted)]">
            This week ·{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">+18%</span>
          </p>
          <div className="mt-3 flex items-end gap-1.5" aria-hidden="true">
            {bars.map((height, i) => (
              <span
                key={i}
                className="w-2.5 rounded-full bg-[var(--zf-accent)]"
                style={{ height: `${height * 2}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
