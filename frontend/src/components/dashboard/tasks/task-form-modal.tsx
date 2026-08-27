'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/shared/modal'
import { TASK_PRIORITIES, type Task, type TaskInput, type TaskPriority } from '@/types/task'

const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  dueDate: z.string(),
  dueTime: z.string().refine(
    (value) => value.trim() === '' || HH_MM_PATTERN.test(value.trim()),
    'Use HH:mm format, e.g. 10:30',
  ),
  priority: z.enum(TASK_PRIORITIES),
  category: z.string(),
})

type TaskFormValues = z.infer<typeof taskSchema>

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[var(--zf-surface)] border border-slate-200 dark:border-[var(--zf-border)] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--zf-accent)_30%,transparent)] focus:border-[var(--zf-accent)] transition-colors'
/** Native date/time pickers need light color-scheme in dark UI (Windows/Chrome). */
const nativePickerClass =
  'min-h-[42px] [color-scheme:light] cursor-pointer'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5'

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

interface TaskFormModalProps {
  open: boolean
  /** Task being edited, or null when creating a new one. */
  task: Task | null
  onClose: () => void
  onSubmit: (input: TaskInput) => Promise<boolean>
}

export function TaskFormModal({ open, task, onClose, onSubmit }: TaskFormModalProps) {
  return (
    <Modal open={open} title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <TaskForm key={task?.id ?? 'new'} task={task} onClose={onClose} onSubmit={onSubmit} />
    </Modal>
  )
}

function TaskForm({
  task,
  onClose,
  onSubmit,
}: Pick<TaskFormModalProps, 'task' | 'onClose' | 'onSubmit'>) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    mode: 'onTouched',
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: task?.dueDate ?? '',
      dueTime: task?.dueTime ?? '',
      priority: task?.priority ?? 'medium',
      category: task?.category ?? '',
    },
  })

  const dueDate = useWatch({ control, name: 'dueDate' })
  const hasDueDate = Boolean(dueDate?.trim())
  const dueDateRef = useRef<HTMLInputElement | null>(null)

  const { onChange: onDueDateChange, ...dueDateField } = register('dueDate')

  const openNativePicker = (input: HTMLInputElement | null) => {
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
  }

  const submit = async (values: TaskFormValues) => {
    const dueDate = values.dueDate || null
    const ok = await onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      dueDate,
      dueTime: dueDate && values.dueTime.trim() ? values.dueTime.trim() : null,
      priority: values.priority,
      category: values.category.trim(),
      completed: task?.completed ?? false,
    })
    if (ok) onClose()
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="task-title" className={labelClass}>
          Title
        </label>
        <input
          id="task-title"
          type="text"
          placeholder="e.g. Finalize Q3 roadmap"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'task-title-error' : undefined}
          className={inputClass}
          {...register('title')}
        />
        {errors.title ? (
          <p id="task-title-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="task-description" className={labelClass}>
          Description <span className="text-slate-500 dark:text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="task-description"
          rows={3}
          placeholder="Add details, links, or notes..."
          className={`${inputClass} resize-none`}
          {...register('description')}
        />
      </div>

      <div className="space-y-3">
        <div className="min-w-0">
          <label htmlFor="task-due-date" className={labelClass}>
            Due date <span className="text-slate-500 dark:text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="task-due-date"
            type="date"
            className={`${inputClass} ${nativePickerClass}`}
            {...dueDateField}
            ref={(el) => {
              dueDateField.ref(el)
              dueDateRef.current = el
            }}
            onClick={() => openNativePicker(dueDateRef.current)}
            onChange={(e) => {
              onDueDateChange(e)
              if (!e.target.value) setValue('dueTime', '')
            }}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="task-due-time" className={labelClass}>
            Due time <span className="text-slate-500 dark:text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="task-due-time"
            type="text"
            inputMode="numeric"
            placeholder="10:30"
            disabled={!hasDueDate}
            aria-disabled={!hasDueDate}
            aria-invalid={errors.dueTime ? true : undefined}
            aria-describedby={
              errors.dueTime ? 'task-due-time-error' : hasDueDate ? 'task-due-time-hint' : undefined
            }
            autoComplete="off"
            spellCheck={false}
            maxLength={5}
            className={`${inputClass} min-h-[42px] disabled:cursor-not-allowed disabled:opacity-50`}
            {...register('dueTime')}
          />
          {errors.dueTime ? (
            <p id="task-due-time-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {errors.dueTime.message}
            </p>
          ) : hasDueDate ? (
            <p id="task-due-time-hint" className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Type time as HH:mm (24-hour), e.g. 10:30 or 22:15.
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Select a due date first to add a time.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-w-0">
          <label htmlFor="task-priority" className={labelClass}>
            Priority
          </label>
          <select id="task-priority" className={`${inputClass} min-h-[42px]`} {...register('priority')}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {priorityLabels[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="task-category" className={labelClass}>
            Category <span className="text-slate-500 dark:text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="task-category"
            type="text"
            placeholder="e.g. Product, Design, Finance"
            className={inputClass}
            {...register('category')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
          {task ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  )
}
