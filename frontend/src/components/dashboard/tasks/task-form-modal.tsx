'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/shared/modal'
import { TASK_PRIORITIES, type Task, type TaskInput, type TaskPriority } from '@/types/task'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  dueDate: z.string(),
  priority: z.enum(TASK_PRIORITIES),
  category: z.string(),
})

type TaskFormValues = z.infer<typeof taskSchema>

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D70E8]/30 focus:border-[#1D70E8] transition-all'
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

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
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    mode: 'onTouched',
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: task?.dueDate ?? '',
      priority: task?.priority ?? 'medium',
      category: task?.category ?? '',
    },
  })

  const submit = async (values: TaskFormValues) => {
    const ok = await onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      dueDate: values.dueDate || null,
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
          className={inputClass}
          {...register('title')}
        />
        {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="task-description" className={labelClass}>
          Description <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="task-description"
          rows={3}
          placeholder="Add any details..."
          className={`${inputClass} resize-none`}
          {...register('description')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="task-due-date" className={labelClass}>
            Due date
          </label>
          <input id="task-due-date" type="date" className={inputClass} {...register('dueDate')} />
        </div>
        <div>
          <label htmlFor="task-priority" className={labelClass}>
            Priority
          </label>
          <select id="task-priority" className={inputClass} {...register('priority')}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {priorityLabels[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="task-category" className={labelClass}>
          Category <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="task-category"
          type="text"
          placeholder="e.g. Product, Design, Finance"
          className={inputClass}
          {...register('category')}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
          {task ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  )
}
