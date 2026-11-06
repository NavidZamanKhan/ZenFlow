'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellPlus, Check, Clock3, Mail, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatTime, todayISODate, toISODate, toISODateTimeLocal } from '@/lib/dates'
import { AnimatedItem, AnimatedList } from '@/components/ui/animated-list'
import { Skeleton } from '@/components/ui/skeleton'
import type { CalendarEvent } from '@/types/event'
import type { Reminder, ReminderChannel, ReminderInput } from '@/types/reminder'
import type { Task } from '@/types/task'

type ReminderItem =
  | {
      kind: 'task'
      id: string
      title: string
      whenLabel: string
      sortKey: string
      task: Task
    }
  | {
      kind: 'event'
      id: string
      title: string
      whenLabel: string
      sortKey: string
      event: CalendarEvent
    }
  | {
      kind: 'reminder'
      id: string
      title: string
      whenLabel: string
      sortKey: string
      reminder: Reminder
    }

type RemindersCardProps = {
  tasks: Task[]
  events: CalendarEvent[]
  /** Scheduled reminders from /api/reminders/ (fired by the backend scheduler). */
  scheduled?: Reminder[]
  loading: boolean
  onToggleTask: (task: Task) => Promise<boolean>
  onUpdateTask: (
    id: string,
    patch: Partial<Pick<Task, 'dueDate' | 'completed' | 'title' | 'description' | 'priority' | 'category'>>,
  ) => Promise<boolean>
  onUpdateEvent: (
    id: string,
    patch: Partial<Pick<CalendarEvent, 'start' | 'end' | 'allDay' | 'title' | 'description'>>,
  ) => Promise<boolean>
  onCreateReminder?: (input: ReminderInput) => Promise<boolean>
  onSnoozeReminder?: (id: string, minutes: number) => Promise<boolean>
  onCancelReminder?: (id: string) => Promise<boolean>
}

const CHANNEL_LABEL: Record<ReminderChannel, string> = {
  in_app: 'In-app',
  email: 'Email',
  both: 'In-app + email',
}

function reminderWhenLabel(iso: string, today: string): string {
  const day = iso.slice(0, 10)
  const date = new Date(iso)
  const localDay = toISODate(date)
  if (localDay === today) return `Today · ${formatTime(iso)}`
  if (localDay < today || day < today) return `Missed · ${formatDate(localDay)} ${formatTime(iso)}`
  return `${formatDate(localDay)} · ${formatTime(iso)}`
}

function addDaysISO(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

function addDaysDateTime(iso: string, days: number): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  date.setDate(date.getDate() + days)
  if (iso.length === 10) return toISODate(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${toISODate(date)}T${hours}:${minutes}`
}

function eventDay(iso: string): string {
  return iso.slice(0, 10)
}

export function RemindersCard({
  tasks,
  events,
  scheduled = [],
  loading,
  onToggleTask,
  onUpdateTask,
  onUpdateEvent,
  onCreateReminder,
  onSnoozeReminder,
  onCancelReminder,
}: RemindersCardProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const today = todayISODate()
  const horizon = addDaysISO(today, 7)

  const reminders = useMemo<ReminderItem[]>(() => {
    const taskItems: ReminderItem[] = tasks
      .filter(
        (task) =>
          !task.completed &&
          task.dueDate !== null &&
          task.dueDate <= horizon,
      )
      .map((task) => ({
        kind: 'task' as const,
        id: `task:${task.id}`,
        title: task.title,
        whenLabel:
          task.dueDate === today
            ? 'Due today'
            : task.dueDate && task.dueDate < today
              ? `Overdue · ${formatDate(task.dueDate)}`
              : `Due ${formatDate(task.dueDate as string)}`,
        sortKey: task.dueDate as string,
        task,
      }))

    const eventItems: ReminderItem[] = events
      .filter((event) => {
        const day = eventDay(event.start)
        return day >= today && day <= horizon
      })
      .map((event) => ({
        kind: 'event' as const,
        id: `event:${event.id}`,
        title: event.title,
        whenLabel: event.allDay
          ? eventDay(event.start) === today
            ? 'All day today'
            : `All day · ${formatDate(eventDay(event.start))}`
          : eventDay(event.start) === today
            ? formatTime(event.start)
            : `${formatDate(eventDay(event.start))} · ${formatTime(event.start)}`,
        sortKey: event.start,
        event,
      }))

    const scheduledItems: ReminderItem[] = scheduled
      .filter((reminder) => reminder.status === 'scheduled' && toISODate(new Date(reminder.remindAt)) <= horizon)
      .map((reminder) => ({
        kind: 'reminder' as const,
        id: `reminder:${reminder.id}`,
        title: reminder.title,
        whenLabel: `${reminderWhenLabel(reminder.remindAt, today)} · ${CHANNEL_LABEL[reminder.channel]}`,
        sortKey: reminder.remindAt,
        reminder,
      }))

    return [...taskItems, ...eventItems, ...scheduledItems]
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(0, 6)
  }, [tasks, events, scheduled, today, horizon])

  const completeTask = async (task: Task) => {
    setPendingId(`task:${task.id}`)
    await onToggleTask(task)
    setPendingId(null)
  }

  const snooze = async (item: ReminderItem) => {
    setPendingId(item.id)
    if (item.kind === 'task' && item.task.dueDate) {
      await onUpdateTask(item.task.id, {
        dueDate: addDaysISO(item.task.dueDate, 1),
      })
    } else if (item.kind === 'event') {
      await onUpdateEvent(item.event.id, {
        start: addDaysDateTime(item.event.start, 1),
        end: addDaysDateTime(item.event.end, 1),
      })
    } else if (item.kind === 'reminder' && onSnoozeReminder) {
      await onSnoozeReminder(item.reminder.id, 24 * 60)
    }
    setPendingId(null)
  }

  const dismissReminder = async (reminder: Reminder) => {
    if (!onCancelReminder) return
    setPendingId(`reminder:${reminder.id}`)
    await onCancelReminder(reminder.id)
    setPendingId(null)
  }

  const navigate = (item: ReminderItem) => {
    if (item.kind === 'reminder') {
      if (item.reminder.taskId) router.push('/dashboard/tasks')
      else if (item.reminder.eventId) router.push('/dashboard/calendar')
      return
    }
    router.push(item.kind === 'task' ? '/dashboard/tasks' : '/dashboard/calendar')
  }

  return (
    <div className="rounded-3xl border border-slate-100/80 bg-white p-6 shadow-sm transition-[transform,box-shadow] duration-200 ease-out hover:shadow-md motion-safe:hover:-translate-y-0.5 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] dark:shadow-black/20 dark:hover:shadow-black/30">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-[var(--zf-accent)]" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-800 dark:text-[var(--zf-text)]">
            Reminders
          </h2>
        </div>
        {onCreateReminder ? (
          <button
            type="button"
            onClick={() => setComposerOpen((open) => !open)}
            aria-expanded={composerOpen}
            aria-controls="reminder-composer"
            className="zf-tap relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--zf-accent)] transition-colors hover:bg-[var(--zf-accent-soft)]"
          >
            <BellPlus size={14} aria-hidden="true" />
            {composerOpen ? 'Close' : 'New reminder'}
          </button>
        ) : null}
      </div>

      {composerOpen && onCreateReminder ? (
        <ReminderComposer
          onSubmit={async (input) => {
            const ok = await onCreateReminder(input)
            if (ok) setComposerOpen(false)
            return ok
          }}
        />
      ) : null}

      <div className="space-y-3 px-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 py-1">
              <Skeleton className="mt-1 h-2.5 w-2.5 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3 max-w-[180px]" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-7 w-14 rounded-lg" />
            </div>
          ))
        ) : reminders.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-[var(--zf-text-muted)]">
            Nothing due in the next 7 days. Upcoming tasks and events will
            appear here.
          </p>
        ) : (
          <AnimatedList>
            {reminders.map((item) => (
            <AnimatedItem
              key={item.id}
              className="group flex items-start justify-between gap-3 rounded-xl py-1"
            >
              <button
                type="button"
                onClick={() => navigate(item)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <div
                  className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                    item.kind === 'task'
                      ? 'bg-[var(--zf-accent)]'
                      : item.kind === 'event'
                        ? 'bg-[#7EDCD6]'
                        : 'bg-amber-400'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-[var(--zf-text)]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-[var(--zf-text-muted)]">
                    {item.whenLabel}
                  </p>
                </div>
              </button>

              <div className="flex flex-shrink-0 items-center gap-0.5">
                {item.kind === 'task' ? (
                  <button
                    type="button"
                    disabled={pendingId === item.id}
                    onClick={() => completeTask(item.task)}
                    aria-label={`Mark ${item.title} complete`}
                    className="zf-tap relative rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-[var(--zf-accent-soft)] hover:text-[var(--zf-accent)] disabled:pointer-events-none disabled:opacity-60 dark:text-[var(--zf-text-muted)]"
                  >
                    <Check size={14} />
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pendingId === item.id}
                  onClick={() => snooze(item)}
                  aria-label={`Snooze ${item.title} by one day`}
                  className="zf-tap relative rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-60 dark:text-[var(--zf-text-muted)] dark:hover:bg-[var(--zf-hover-fill)] dark:hover:text-[var(--zf-text)]"
                >
                  <Clock3 size={14} />
                </button>
                {item.kind === 'reminder' && onCancelReminder ? (
                  <button
                    type="button"
                    disabled={pendingId === item.id}
                    onClick={() => dismissReminder(item.reminder)}
                    aria-label={`Cancel reminder ${item.title}`}
                    className="zf-tap relative rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-60 dark:text-[var(--zf-text-muted)] dark:hover:bg-rose-950/40"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </AnimatedItem>
            ))}
          </AnimatedList>
        )}
      </div>

      {!loading && reminders.length > 0 ? (
        <p className="mt-4 text-[11px] text-slate-500 dark:text-[var(--zf-text-muted)]">
          Blue = task due dates · Teal = calendar events · Amber = scheduled
          reminders (delivered in-app or by email when they come due).
        </p>
      ) : null}
    </div>
  )
}

function defaultRemindAt(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  date.setSeconds(0, 0)
  return toISODateTimeLocal(date)
}

function ReminderComposer({ onSubmit }: { onSubmit: (input: ReminderInput) => Promise<boolean> }) {
  const [title, setTitle] = useState('')
  const [remindAt, setRemindAt] = useState(defaultRemindAt)
  const [channel, setChannel] = useState<ReminderChannel>('in_app')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      toast.error('Give the reminder a title.')
      return
    }
    const when = new Date(remindAt)
    if (Number.isNaN(when.getTime())) {
      toast.error('Pick a valid date and time.')
      return
    }
    if (when.getTime() < Date.now() - 60_000) {
      toast.error('Pick a time in the future.')
      return
    }
    setSaving(true)
    const ok = await onSubmit({ title: trimmed, remindAt: when.toISOString(), channel })
    setSaving(false)
    if (ok) {
      setTitle('')
      setRemindAt(defaultRemindAt())
    }
  }

  const inputClass =
    'h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-[color-mix(in_srgb,var(--zf-accent)_30%,transparent)] dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] dark:text-slate-100'

  return (
    <form
      id="reminder-composer"
      onSubmit={submit}
      className="mb-5 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-[var(--zf-border)] dark:bg-slate-800/40"
    >
      <label htmlFor="reminder-title" className="sr-only">
        Reminder title
      </label>
      <input
        id="reminder-title"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Remind me to…"
        maxLength={255}
        autoFocus
        className={inputClass}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <label htmlFor="reminder-at" className="sr-only">
            Remind at
          </label>
          <input
            id="reminder-at"
            type="datetime-local"
            value={remindAt}
            onChange={(event) => setRemindAt(event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:w-40">
          <label htmlFor="reminder-channel" className="sr-only">
            Delivery channel
          </label>
          <div className="relative">
            <Mail
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <select
              id="reminder-channel"
              value={channel}
              onChange={(event) => setChannel(event.target.value as ReminderChannel)}
              className={`${inputClass} appearance-none pl-8`}
            >
              <option value="in_app">In-app</option>
              <option value="email">Email</option>
              <option value="both">In-app + email</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="h-9 rounded-xl bg-[var(--zf-accent)] px-4 text-xs font-semibold text-white transition-colors hover:bg-[var(--zf-accent-hover)] disabled:pointer-events-none disabled:opacity-60"
        >
          {saving ? 'Scheduling…' : 'Schedule'}
        </button>
      </div>
    </form>
  )
}
