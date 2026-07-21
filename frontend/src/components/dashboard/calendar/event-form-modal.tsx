'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/shared/modal'
import type { CalendarEvent, CalendarEventInput } from '@/types/event'

const eventSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string(),
    start: z.string().min(1, 'Start time is required'),
    end: z.string().min(1, 'End time is required'),
    allDay: z.boolean(),
  })
  .refine((data) => data.end > data.start, {
    message: 'End must be after start',
    path: ['end'],
  })

type EventFormValues = z.infer<typeof eventSchema>

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D70E8]/30 focus:border-[#1D70E8] transition-all'
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

export interface EventFormDefaults {
  start: string
  end: string
  allDay: boolean
}

interface EventFormModalProps {
  open: boolean
  /** Event being edited, or null when creating a new one. */
  event: CalendarEvent | null
  /** Prefill values when creating from a calendar date/slot click. */
  defaults: EventFormDefaults | null
  onClose: () => void
  onSubmit: (input: CalendarEventInput) => Promise<boolean>
  onDelete?: (event: CalendarEvent) => void
}

export function EventFormModal({
  open,
  event,
  defaults,
  onClose,
  onSubmit,
  onDelete,
}: EventFormModalProps) {
  return (
    <Modal open={open} title={event ? 'Edit event' : 'New event'} onClose={onClose}>
      <EventForm
        key={event?.id ?? `${defaults?.start ?? 'new'}`}
        event={event}
        defaults={defaults}
        onClose={onClose}
        onSubmit={onSubmit}
        onDelete={onDelete}
      />
    </Modal>
  )
}

function EventForm({
  event,
  defaults,
  onClose,
  onSubmit,
  onDelete,
}: Omit<EventFormModalProps, 'open'>) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    mode: 'onTouched',
    defaultValues: {
      title: event?.title ?? '',
      description: event?.description ?? '',
      start: event ? event.start.slice(0, event.allDay ? 10 : 16) : (defaults?.start ?? ''),
      end: event ? event.end.slice(0, event.allDay ? 10 : 16) : (defaults?.end ?? ''),
      allDay: event?.allDay ?? defaults?.allDay ?? false,
    },
  })

  const allDay = useWatch({ control, name: 'allDay' })

  const submit = async (values: EventFormValues) => {
    const ok = await onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      start: values.start,
      end: values.end,
      allDay: values.allDay,
    })
    if (ok) onClose()
  }

  const dateInputType = allDay ? 'date' : 'datetime-local'

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="event-title" className={labelClass}>
          Title
        </label>
        <input
          id="event-title"
          type="text"
          placeholder="e.g. Client sync — Northwind"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'event-title-error' : undefined}
          className={inputClass}
          {...register('title')}
        />
        {errors.title ? (
          <p id="event-title-error" role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="event-description" className={labelClass}>
          Description <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <textarea
          id="event-description"
          rows={3}
          placeholder="Add any details..."
          className={`${inputClass} resize-none`}
          {...register('description')}
        />
      </div>

      <label htmlFor="event-all-day" className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
        <input
          id="event-all-day"
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 accent-[#1D70E8]"
          {...register('allDay')}
        />
        All day
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="event-start" className={labelClass}>
            Starts
          </label>
          <input
            id="event-start"
            type={dateInputType}
            aria-invalid={errors.start ? true : undefined}
            aria-describedby={errors.start ? 'event-start-error' : undefined}
            className={inputClass}
            {...register('start')}
          />
          {errors.start ? (
            <p id="event-start-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.start.message}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="event-end" className={labelClass}>
            Ends
          </label>
          <input
            id="event-end"
            type={dateInputType}
            aria-invalid={errors.end ? true : undefined}
            aria-describedby={errors.end ? 'event-end-error' : undefined}
            className={inputClass}
            {...register('end')}
          />
          {errors.end ? (
            <p id="event-end-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.end.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {event && onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(event)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 transition-colors"
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1D70E8] hover:bg-[#1660CC] transition-colors disabled:pointer-events-none disabled:opacity-60"
          >
            {event ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </form>
  )
}
