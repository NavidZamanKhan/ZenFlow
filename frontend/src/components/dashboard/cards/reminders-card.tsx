'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Clock3 } from 'lucide-react'
import { formatDate, formatTime, todayISODate, toISODate } from '@/lib/dates'
import { AnimatedItem, AnimatedList } from '@/components/ui/animated-list'
import { Skeleton } from '@/components/ui/skeleton'
import type { CalendarEvent } from '@/types/event'
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

type RemindersCardProps = {
  tasks: Task[]
  events: CalendarEvent[]
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
  loading,
  onToggleTask,
  onUpdateTask,
  onUpdateEvent,
}: RemindersCardProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
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

    return [...taskItems, ...eventItems]
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(0, 5)
  }, [tasks, events, today, horizon])

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
    }
    setPendingId(null)
  }

  const navigate = (item: ReminderItem) => {
    router.push(item.kind === 'task' ? '/dashboard/tasks' : '/dashboard/calendar')
  }

  return (
    <div className="rounded-3xl border border-slate-100/80 bg-white p-6 shadow-sm transition-[transform,box-shadow] duration-200 ease-out hover:shadow-md motion-safe:hover:-translate-y-0.5">
      <div className="mb-6 flex items-center gap-2">
        <Bell size={18} className="text-[#1D70E8]" aria-hidden="true" />
        <h2 className="text-base font-bold text-slate-800">Reminders</h2>
      </div>

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
          <p className="py-6 text-center text-sm text-slate-500">
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
                    item.kind === 'task' ? 'bg-[#1D70E8]' : 'bg-[#7EDCD6]'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
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
                    className="zf-tap relative rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-[#E2EEFC] hover:text-[#1D70E8] disabled:pointer-events-none disabled:opacity-60"
                  >
                    <Check size={14} />
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pendingId === item.id}
                  onClick={() => snooze(item)}
                  aria-label={`Snooze ${item.title} by one day`}
                  className="zf-tap relative rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-60"
                >
                  <Clock3 size={14} />
                </button>
              </div>
            </AnimatedItem>
            ))}
          </AnimatedList>
        )}
      </div>

      {!loading && reminders.length > 0 ? (
        <p className="mt-4 text-[11px] text-slate-500">
          Blue = task due dates · Teal = calendar events. Events can be snoozed
          but not marked complete (no completion field on events).
        </p>
      ) : null}
    </div>
  )
}
