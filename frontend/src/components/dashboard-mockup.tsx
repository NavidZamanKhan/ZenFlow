import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Bell,
  Wallet,
  LayoutGrid,
  ListTodo,
  BarChart3,
  Settings,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const barData = [
  { label: 'M', value: 42 },
  { label: 'T', value: 68 },
  { label: 'W', value: 55 },
  { label: 'T', value: 80 },
  { label: 'F', value: 96 },
  { label: 'S', value: 38 },
  { label: 'S', value: 60 },
]

const tasks = [
  { title: 'Finalize Q3 roadmap', done: true, tag: 'Product' },
  { title: 'Review design handoff', done: true, tag: 'Design' },
  { title: 'Client sync — Northwind', done: false, tag: 'Meeting' },
  { title: 'Draft budget proposal', done: false, tag: 'Finance' },
]

const reminders = [
  { title: 'Standup with team', time: '9:30 AM' },
  { title: 'Dentist appointment', time: '2:00 PM' },
  { title: 'Send invoice #402', time: '5:15 PM' },
]

export function DashboardMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'glass-strong overflow-hidden rounded-3xl border border-border/70 shadow-[0_30px_80px_-30px_rgba(56,89,140,0.35)]',
        className,
      )}
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3.5">
        <span className="size-3 rounded-full bg-destructive/50" aria-hidden="true" />
        <span className="size-3 rounded-full bg-chart-3/70" aria-hidden="true" />
        <span className="size-3 rounded-full bg-primary/60" aria-hidden="true" />
        <div className="ml-4 flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1.5 text-xs text-muted-foreground">
          <Search className="size-3.5" aria-hidden="true" />
          <span>Search ZenFlow…</span>
        </div>
      </div>

      <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[180px_1fr]">
        {/* sidebar */}
        <aside className="hidden flex-col gap-1 border-r border-border/60 p-4 sm:flex">
          <div className="mb-4 flex items-center gap-2 px-1">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutGrid className="size-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold">ZenFlow</span>
          </div>
          {[
            { icon: LayoutGrid, label: 'Overview', active: true },
            { icon: ListTodo, label: 'Tasks' },
            { icon: CalendarDays, label: 'Calendar' },
            { icon: Wallet, label: 'Expenses' },
            { icon: BarChart3, label: 'Insights' },
            { icon: Settings, label: 'Settings' },
          ].map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
                active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </div>
          ))}
        </aside>

        {/* mobile mini sidebar */}
        <aside className="flex flex-col items-center gap-4 border-r border-border/60 py-4 sm:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="size-4" aria-hidden="true" />
          </div>
          <ListTodo className="size-4 text-muted-foreground" aria-hidden="true" />
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
          <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
        </aside>

        {/* main */}
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Good morning, Maya</p>
              <h3 className="text-base font-semibold sm:text-lg">Today&apos;s focus</h3>
            </div>
            <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
              4 tasks
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            {/* tasks */}
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <ListTodo className="size-4 text-primary" aria-hidden="true" />
                Tasks
              </div>
              <ul className="space-y-2.5">
                {tasks.map((task) => (
                  <li key={task.title} className="flex items-center gap-2.5 text-sm">
                    {task.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                    )}
                    <span className={cn('flex-1 truncate', task.done && 'text-muted-foreground line-through')}>
                      {task.title}
                    </span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {task.tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* productivity chart */}
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="size-4 text-primary" aria-hidden="true" />
                Productivity
              </div>
              <p className="mb-3 text-xs text-muted-foreground">This week · +18%</p>
              <div className="flex h-24 items-end justify-between gap-1.5">
                {barData.map((bar, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'w-full rounded-t-md',
                        i === 4 ? 'bg-primary' : 'bg-primary/25',
                      )}
                      style={{ height: `${bar.value}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* reminders */}
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Bell className="size-4 text-primary" aria-hidden="true" />
                Reminders
              </div>
              <ul className="space-y-2.5">
                {reminders.map((r) => (
                  <li key={r.title} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 truncate">
                      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                      <span className="truncate">{r.title}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{r.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* expense overview */}
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Wallet className="size-4 text-primary" aria-hidden="true" />
                Expenses
              </div>
              <p className="text-2xl font-semibold tracking-tight">$2,480</p>
              <p className="mb-3 text-xs text-muted-foreground">Spent this month</p>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                <span className="h-full bg-primary" style={{ width: '46%' }} />
                <span className="h-full bg-chart-2" style={{ width: '28%' }} />
                <span className="h-full bg-chart-3" style={{ width: '18%' }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" aria-hidden="true" /> Software
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-chart-2" aria-hidden="true" /> Travel
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-chart-3" aria-hidden="true" /> Other
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
