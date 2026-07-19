'use client'

import { useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useEvents } from '@/hooks/use-events'
import { useTasks } from '@/hooks/use-tasks'
import { toISODate, toISODateTimeLocal } from '@/lib/dates'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState, ErrorState } from '@/components/shared/state-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { EventFormModal, type EventFormDefaults } from './event-form-modal'
import type { CalendarEvent } from '@/types/event'
import './calendar.css'

const VIEWS = [
  { id: 'dayGridMonth', label: 'Month' },
  { id: 'timeGridWeek', label: 'Week' },
  { id: 'timeGridDay', label: 'Day' },
] as const

type ViewId = (typeof VIEWS)[number]['id']

const TASK_ID_PREFIX = 'task:'

export function CalendarPage() {
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
  const [activeView, setActiveView] = useState<ViewId>('dayGridMonth')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [formDefaults, setFormDefaults] = useState<EventFormDefaults | null>(null)
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null)

  const loading = eventsLoading || tasksLoading
  const loadError = eventsError || tasksError

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
    'p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors'

  return (
    <div className="px-4 sm:px-8 py-8 max-w-6xl">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-0.5">Plan your time with intent</p>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Calendar</h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D70E8]" aria-hidden="true" />
            Events
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7EDCD6]" aria-hidden="true" />
            Task deadlines
          </span>
        </div>
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100/80 shadow-sm">
        {/* Custom toolbar */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-[#1D70E8]" />
            <h2 className="text-base font-bold text-slate-800">{title || 'Calendar'}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher */}
            <div className="flex items-center bg-[#F1F3F5] rounded-xl p-1">
              {VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => changeView(view.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    activeView === view.id
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
            {/* Navigation */}
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
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#1D70E8] bg-[#E2EEFC] hover:bg-[#d3e5fb] transition-colors"
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
        ) : loading ? (
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
                    className="flex items-center gap-1.5 rounded-xl bg-[#1D70E8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1660CC]"
                  >
                    <Plus size={16} />
                    Add your first event
                  </button>
                }
                className="py-8"
              />
            ) : null}
            <div className="zenflow-calendar overflow-x-auto">
              <div className="min-w-[560px]">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
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

      {/* Hint */}
      <p className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-4">
        <CheckCircle2 size={13} aria-hidden="true" />
        Click a date to add an event, or click an event to edit it. Drag to reschedule.
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
