import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Circle,
  CreditCard,
  Grid3x3,
  LayoutDashboard,
  LineChart,
  ListTodo,
  BarChart3,
  Search,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** Decorative stand-in for the signed-in Overview — mirrors shell + 2×2 cards. */
const tasks = [
  { title: 'Finalize Q3 roadmap', done: true, tag: 'Product', priority: 'bg-[var(--zf-accent)]' },
  { title: 'Review design handoff', done: true, tag: 'Design', priority: 'bg-rose-400' },
  { title: 'Client sync — Northwind', done: false, tag: 'Meeting', priority: 'bg-[var(--zf-accent)]' },
  { title: 'Draft budget proposal', done: false, tag: 'Finance', priority: 'bg-amber-400' },
]

const reminders = [
  { title: 'Standup with team', time: '9:30 AM' },
  { title: 'Dentist appointment', time: '2:00 PM' },
  { title: 'Send invoice #402', time: '5:15 PM' },
]

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: ListTodo, label: 'Tasks', active: false },
  { icon: CalendarDays, label: 'Calendar', active: false },
  { icon: Wallet, label: 'Expenses', active: false },
  { icon: BarChart3, label: 'Insights', active: false },
] as const

export function DashboardMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl border border-slate-100/80 bg-white shadow-[0_30px_80px_-30px_rgba(56,89,140,0.35)] dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] dark:shadow-black/40',
        className,
      )}
    >
      <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[168px_1fr]">
        {/* Sidebar — matches authenticated shell (no Settings; Settings lives in user menu) */}
        <aside className="flex flex-col border-r border-slate-100 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]">
          <div className="hidden items-center gap-2 border-b border-slate-100 px-3 py-3 sm:flex dark:border-[var(--zf-border)]">
            <div className="flex h-7 flex-1 items-center justify-between gap-1.5 rounded-lg bg-slate-50 px-2 text-[10px] text-slate-400 dark:bg-[var(--zf-soft-fill)] dark:text-[var(--zf-text-muted)]">
              <div className="flex items-center gap-1.5 min-w-0">
                <Search className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">Press / to search</span>
              </div>
              <kbd className="rounded border border-slate-200/80 bg-white/90 px-1 py-0.5 font-mono text-[9px] font-semibold text-slate-400 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] dark:text-[var(--zf-text-muted)]">
                /
              </kbd>
            </div>
            <span
              className="size-6 shrink-0 rounded-full bg-[var(--zf-soft-fill)] text-[10px] font-bold leading-6 text-center text-[var(--zf-accent-fg)] dark:bg-[var(--zf-soft-fill)]"
              aria-hidden="true"
            >
              M
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 px-2 py-3 sm:justify-start sm:px-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--zf-accent)] text-white">
              <Grid3x3 className="size-3.5" aria-hidden="true" />
            </div>
            <span className="hidden text-sm font-bold tracking-tight text-slate-800 sm:inline dark:text-[var(--zf-text)]">
              ZenFlow
            </span>
          </div>

          <nav className="flex flex-1 flex-col items-center gap-1 px-1.5 pb-3 sm:items-stretch sm:px-2" aria-hidden="true">
            {navItems.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={cn(
                  'flex items-center justify-center gap-2.5 rounded-xl px-2.5 py-2 text-sm sm:justify-start',
                  active
                    ? 'bg-[var(--zf-accent-soft)] text-[var(--zf-accent-fg)]'
                    : 'text-slate-500 dark:text-[var(--zf-text-muted)]',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden font-medium sm:inline">{label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main — greeting + 2×2 Overview cards */}
        <div className="min-w-0 bg-slate-50/80 p-3 sm:p-4 dark:bg-[var(--zf-canvas)]">
          <div className="mb-3 flex items-end justify-between gap-2 sm:mb-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 sm:text-xs dark:text-[var(--zf-text-muted)]">
                Good morning, Maya
              </p>
              <h3 className="text-sm font-bold tracking-tight text-slate-800 sm:text-base dark:text-[var(--zf-text)]">
                Today&apos;s focus
              </h3>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--zf-accent-soft)] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[var(--zf-accent-fg)] sm:text-xs">
              4 tasks
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Tasks */}
            <div className="rounded-2xl border border-slate-100/80 bg-white p-3 shadow-sm sm:p-4 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 sm:text-sm dark:text-[var(--zf-text)]">
                  <ListTodo className="size-3.5 text-[var(--zf-accent)]" aria-hidden="true" />
                  Tasks
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-[var(--zf-text-muted)]">
                  2/4 completed
                </span>
              </div>
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.title} className="flex items-center gap-2 text-xs sm:text-sm">
                    {task.done ? (
                      <CheckCircle2
                        className="size-3.5 shrink-0 text-[var(--zf-accent)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="size-3.5 shrink-0 text-slate-300 dark:text-[var(--zf-border)]"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        task.priority,
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate font-medium',
                        task.done
                          ? 'text-slate-500 line-through dark:text-[var(--zf-text-muted)]'
                          : 'text-slate-700 dark:text-[var(--zf-text)]',
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="hidden shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline dark:bg-[var(--zf-soft-fill)] dark:text-[var(--zf-text-muted)]">
                      {task.tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Productivity — line chart like the live card */}
            <div className="rounded-2xl border border-slate-100/80 bg-white p-3 shadow-sm sm:p-4 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-800 sm:text-sm dark:text-[var(--zf-text)]">
                <LineChart className="size-3.5 text-[var(--zf-accent)]" aria-hidden="true" />
                Productivity
              </div>
              <p className="mb-2 text-[10px] font-medium text-slate-500 dark:text-[var(--zf-text-muted)]">
                Week of Mar 10 · +18% vs last week
              </p>
              <p className="mb-2 text-2xl font-extrabold tracking-tight tabular-nums text-slate-800 dark:text-[var(--zf-text)]">
                72%
              </p>
              <svg
                viewBox="0 0 200 64"
                className="h-14 w-full overflow-visible sm:h-16"
                preserveAspectRatio="none"
                role="img"
                aria-label="Weekly productivity trend"
              >
                <defs>
                  <linearGradient id="mockup-prod-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--zf-accent)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--zf-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path
                  d="M8 48 C 30 46, 40 40, 55 28 C 70 16, 85 12, 100 22 C 115 32, 130 38, 145 20 C 160 6, 175 10, 192 14 L 192 64 L 8 64 Z"
                  fill="url(#mockup-prod-grad)"
                />
                <path
                  d="M8 48 C 30 46, 40 40, 55 28 C 70 16, 85 12, 100 22 C 115 32, 130 38, 145 20 C 160 6, 175 10, 192 14"
                  fill="none"
                  stroke="var(--zf-accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="192" cy="14" r="3.5" fill="var(--zf-accent)" />
              </svg>
              <div className="mt-1 flex justify-between px-0.5 text-[10px] font-semibold text-slate-500 dark:text-[var(--zf-text-muted)]">
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
                <span>S</span>
              </div>
            </div>

            {/* Reminders */}
            <div className="rounded-2xl border border-slate-100/80 bg-white p-3 shadow-sm sm:p-4 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-800 sm:text-sm dark:text-[var(--zf-text)]">
                <Bell className="size-3.5 text-[var(--zf-accent)]" aria-hidden="true" />
                Reminders
              </div>
              <ul className="space-y-2">
                {reminders.map((r) => (
                  <li
                    key={r.title}
                    className="flex items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-[var(--zf-accent)]"
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium text-slate-700 dark:text-[var(--zf-text)]">
                        {r.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500 dark:text-[var(--zf-text-muted)]">
                      {r.time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Expenses — spent + budget/remaining like live Overview */}
            <div className="rounded-2xl border border-slate-100/80 bg-white p-3 shadow-sm sm:p-4 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 sm:text-sm dark:text-[var(--zf-text)]">
                  <CreditCard className="size-3.5 text-[var(--zf-accent)]" aria-hidden="true" />
                  Expenses
                </div>
                <span className="text-[10px] font-semibold text-[var(--zf-accent-fg)]">
                  Edit budget
                </span>
              </div>
              <p className="text-xl font-extrabold tracking-tight tabular-nums text-slate-800 sm:text-2xl dark:text-[var(--zf-text)]">
                $2,480
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-[var(--zf-text-muted)]">
                Spent this month
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-[var(--zf-soft-fill)]">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-[var(--zf-text-muted)]">
                    Budget
                  </p>
                  <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-800 dark:text-[var(--zf-text)]">
                    $4,000
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-[var(--zf-soft-fill)]">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-[var(--zf-text-muted)]">
                    Remaining
                  </p>
                  <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-800 dark:text-[var(--zf-text)]">
                    $1,520
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
