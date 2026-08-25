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
  'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[var(--zf-surface)] border border-slate-200 dark:border-[var(--zf-border)] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--zf-accent)_30%,transparent)] focus:border-[var(--zf-accent)] transition-all'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5'

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
          placeholder="e.g. Design review with team"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'event-title-error' : undefined}
          className={inputClass}
          {...register('title')}
        />
        {errors.title ? (
          <p id="event-title-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="event-description" className={labelClass}>
          Description <span className="text-slate-500 dark:text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="event-description"
          rows={3}
          placeholder="Add location, video call link, or notes..."
          className={`${inputClass} resize-none`}
          {...register('description')}
        />
      </div>

      <div className="flex items-center justify-between py-1">
        <label htmlFor="event-allday" className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
          All-day event
        </label>
        <input
          id="event-allday"
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[var(--zf-accent)] focus:ring-[var(--zf-accent)]"
          {...register('allDay')}
        />
      </div>

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
            <p id="event-start-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
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
            <p id="event-end-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
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
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--zf-accent)] hover:bg-[var(--zf-accent-hover)] transition-colors disabled:pointer-events-none disabled:opacity-60"
          >
            {event ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </form>
  )
}
