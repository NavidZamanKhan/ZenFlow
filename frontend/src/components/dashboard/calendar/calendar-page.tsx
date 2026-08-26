'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useEvents } from '@/hooks/use-events'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useTasks } from '@/hooks/use-tasks'
import { toISODate, toISODateTimeLocal } from '@/lib/dates'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState, ErrorState } from '@/components/shared/state-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { EventFormModal, type EventFormDefaults } from './event-form-modal'
import type { CalendarEvent } from '@/types/event'
import './calendar.css'

const DESKTOP_VIEWS = [
  { id: 'dayGridMonth', label: 'Month' },
  { id: 'timeGridWeek', label: 'Week' },
  { id: 'timeGridDay', label: 'Day' },
  { id: 'listWeek', label: 'List' },
] as const

const MOBILE_VIEWS = [
  { id: 'listWeek', label: 'List' },
  { id: 'timeGridDay', label: 'Day' },
  { id: 'dayGridMonth', label: 'Month' },
  { id: 'timeGridWeek', label: 'Week' },
] as const

type ViewId = (typeof DESKTOP_VIEWS)[number]['id']

const TASK_ID_PREFIX = 'task:'

function needsMinWidth(view: ViewId): boolean {
  return view === 'dayGridMonth' || view === 'timeGridWeek' || view === 'timeGridDay'
}

export function CalendarPage() {
  const isMd = useMediaQuery('(min-width: 768px)')
  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    reload: reloadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEvents()
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    reload: reloadTasks,
  } = useTasks()

  const calendarRef = useRef<FullCalendar>(null)
  const [title, setTitle] = useState('')
  const [activeView, setActiveView] = useState<ViewId>('listWeek')
  const [viewReady, setViewReady] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [formDefaults, setFormDefaults] = useState<EventFormDefaults | null>(null)
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null)

  const loading = eventsLoading || tasksLoading
  const loadError = eventsError || tasksError

  // Pick a phone-friendly default once media query is known; remount calendar via key.
  useEffect(() => {
    setActiveView(isMd ? 'dayGridMonth' : 'listWeek')
    setViewReady(true)
  }, [isMd])

  const views = isMd ? DESKTOP_VIEWS : MOBILE_VIEWS
  const initialView = isMd ? 'dayGridMonth' : 'listWeek'

  const openCreateToday = () => {
    const day = toISODate(new Date())
    setEditing(null)
    setFormDefaults({ start: day, end: day, allDay: true })
    setFormOpen(true)
  }

  const calendarEvents = useMemo<EventInput[]>(() => {
    const standalone: EventInput[] = events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      classNames: ['zenflow-event'],
    }))
    const taskDeadlines: EventInput[] = tasks
      .filter((task) => task.dueDate !== null)
      .map((task) => ({
        id: `${TASK_ID_PREFIX}${task.id}`,
        title: task.completed ? `✓ ${task.title}` : task.title,
        start: task.dueDate as string,
        allDay: true,
        editable: false,
        classNames: ['zenflow-task-event'],
      }))
    return [...standalone, ...taskDeadlines]
  }, [events, tasks])

  const getApi = () => calendarRef.current?.getApi()

  const changeView = (view: ViewId) => {
    setActiveView(view)
    getApi()?.changeView(view)
  }

  const onDatesSet = (arg: DatesSetArg) => {
    setTitle(arg.view.title)
    setActiveView(arg.view.type as ViewId)
  }

  const onDateClick = (arg: DateClickArg) => {
    setEditing(null)
    if (arg.allDay) {
      const day = toISODate(arg.date)
      setFormDefaults({ start: day, end: day, allDay: true })
    } else {
      const end = new Date(arg.date.getTime() + 60 * 60 * 1000)
      setFormDefaults({
        start: toISODateTimeLocal(arg.date),
        end: toISODateTimeLocal(end),
        allDay: false,
      })
    }
    setFormOpen(true)
  }

  const onEventClick = (arg: EventClickArg) => {
    if (arg.event.id.startsWith(TASK_ID_PREFIX)) {
      toast.info('Task deadlines are managed on the Tasks page.')
      return
    }
    const event = events.find((e) => e.id === arg.event.id)
    if (event) {
      setEditing(event)
      setFormDefaults(null)
      setFormOpen(true)
    }
  }

  const onEventMoved = async (arg: EventDropArg | EventResizeDoneArg) => {
    const { event } = arg
    if (event.id.startsWith(TASK_ID_PREFIX) || !event.start) {
      arg.revert()
      return
    }
    const end = event.end ?? event.start
    const ok = await updateEvent(
      event.id,
      {
        start: event.allDay ? toISODate(event.start) : toISODateTimeLocal(event.start),
        end: event.allDay ? toISODate(end) : toISODateTimeLocal(end),
        allDay: event.allDay,
      },
      { successMessage: 'Event rescheduled' },
    )
    if (!ok) arg.revert()
  }

  const confirmDelete = async () => {
    if (deleting) {
      await deleteEvent(deleting.id)
      setDeleting(null)
      setFormOpen(false)
    }
  }

  const toolbarButton =
    'zf-tap relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors'

  const showMinWidth = needsMinWidth(activeView)

  return (
    <div className="max-w-6xl px-4 py-8 sm:px-8">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            Plan your time with intent
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[var(--zf-text)]">
            Calendar
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--zf-accent)]" aria-hidden="true" />
            Events
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#7EDCD6]" aria-hidden="true" />
            Task deadlines
          </span>
        </div>
      </div>

      {/* Calendar card */}
      <div className="rounded-3xl border border-slate-100/80 bg-white p-4 shadow-sm dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] sm:p-6">
        {/* Custom toolbar - stacks on narrow screens */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays size={18} className="flex-shrink-0 text-[var(--zf-accent)]" />
            <h2 className="truncate text-base font-bold text-slate-800 dark:text-[var(--zf-text)]">
              {title || 'Calendar'}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex max-w-full items-center overflow-x-auto rounded-xl bg-[#F1F3F5] p-1 dark:bg-slate-800">
              {views.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => changeView(view.id)}
                  className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 sm:px-3 ${
                    activeView === view.id
                      ? 'bg-white text-slate-800 shadow-sm dark:bg-[var(--zf-surface)] dark:text-slate-100'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => getApi()?.prev()}
                aria-label="Previous"
                className={toolbarButton}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => getApi()?.today()}
                className="rounded-xl bg-[var(--zf-accent-soft)] px-3.5 py-2 text-xs font-semibold text-[var(--zf-accent-fg)] transition-colors hover:bg-[color-mix(in_srgb,var(--zf-accent)_18%,white)]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => getApi()?.next()}
                aria-label="Next"
                className={toolbarButton}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {loadError && !loading ? (
          <ErrorState
            description={loadError}
            onRetry={() => {
              if (eventsError) reloadEvents()
              if (tasksError) reloadTasks()
            }}
            className="my-6 border-0 bg-transparent"
          />
        ) : loading || !viewReady ? (
          <Skeleton className="h-[540px] w-full rounded-2xl" aria-label="Loading calendar" />
        ) : (
          <>
            {calendarEvents.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No events yet"
                description="Your month is clear. Click a date below or add an event to start planning."
                action={
                  <button
                    type="button"
                    onClick={openCreateToday}
                    className="flex items-center gap-1.5 rounded-xl bg-[var(--zf-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--zf-accent-hover)]"
                  >
                    <Plus size={16} />
                    Add your first event
                  </button>
                }
                className="py-8"
              />
            ) : null}
            <div className={`zenflow-calendar ${showMinWidth ? 'overflow-x-auto' : 'overflow-x-hidden'}`}>
              <div className={showMinWidth ? 'min-w-[560px]' : 'min-w-0 w-full'}>
                <FullCalendar
                  key={initialView}
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                  initialView={initialView}
                  headerToolbar={false}
                  events={calendarEvents}
                  editable
                  dayMaxEvents={3}
                  height="auto"
                  nowIndicator
                  datesSet={onDatesSet}
                  dateClick={onDateClick}
                  eventClick={onEventClick}
                  eventDrop={onEventMoved}
                  eventResize={onEventMoved}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <CheckCircle2 size={13} aria-hidden="true" />
        {isMd
          ? 'Click a date to add an event, or click an event to edit it. Drag to reschedule.'
          : 'Tap a date or event to add or edit. Use List view for a phone-friendly agenda.'}
      </p>

      <EventFormModal
        open={formOpen}
        event={editing}
        defaults={formDefaults}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => (editing ? updateEvent(editing.id, input) : createEvent(input))}
        onDelete={setDeleting}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete event"
        message={`"${deleting?.title ?? ''}" will be permanently deleted. This can't be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
