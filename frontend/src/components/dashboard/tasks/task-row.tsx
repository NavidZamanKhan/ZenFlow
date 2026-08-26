'use client'

import { CalendarDays, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { formatDate, isOverdue } from '@/lib/dates'
import type { Task, TaskPriority } from '@/types/task'

const priorityPill: Record<TaskPriority, string> = {
  low: 'bg-[#F1F3F5] text-slate-500 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-[var(--zf-accent-soft)] text-[var(--zf-accent-fg)] dark:bg-[var(--zf-soft-fill)] dark:text-[var(--zf-accent-fg)]',
  high: 'bg-rose-50 text-rose-500 dark:bg-rose-950/60 dark:text-rose-300',
}

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

interface TaskRowProps {
  task: Task
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  highlighted?: boolean
}

/** Task row matching the Overview TasksCard visual pattern, extended for the full page. */
export function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  highlighted = false,
}: TaskRowProps) {
  const overdue = !task.completed && task.dueDate !== null && isOverdue(task.dueDate)

  return (
    <div
      data-highlight-id={task.id}
      className={`group flex items-center gap-3 py-2.5 px-2 rounded-xl transition-colors ${
        highlighted
          ? 'bg-[var(--zf-accent-soft)] ring-2 ring-[color-mix(in_srgb,var(--zf-accent)_35%,transparent)]'
          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        className="zf-tap relative flex-shrink-0"
      >
        {task.completed ? (
          <CheckCircle2 size={18} className="text-[var(--zf-accent)]" />
        ) : (
          <span className="block w-[18px] h-[18px] rounded-full border border-slate-300 dark:border-slate-600 hover:border-[var(--zf-accent)] transition-colors" />
        )}
      </button>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium transition-all ${
            task.completed
              ? 'text-slate-500 line-through dark:text-slate-400'
              : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {task.dueDate ? (
            <span
              className={`inline-flex items-center gap-1 ${
                overdue ? 'text-rose-500 dark:text-rose-400' : ''
              }`}
            >
              <CalendarDays size={12} aria-hidden="true" />
              {formatDate(task.dueDate)}
              {overdue ? '  · Overdue' : ''}
            </span>
          ) : null}
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap sm:hidden ${priorityPill[task.priority]}`}
          >
            {priorityLabels[task.priority]}
          </span>
          {task.category ? (
            <span className="inline-flex rounded-full bg-[#F1F3F5] px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-slate-500 dark:bg-slate-800 dark:text-slate-300 sm:hidden">
              {task.category}
            </span>
          ) : null}
        </div>
      </div>

      {/* Pills */}
      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${priorityPill[task.priority]}`}
        >
          {priorityLabels[task.priority]}
        </span>
        {task.category && (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F3F5] dark:bg-slate-800 text-slate-500 dark:text-slate-300 whitespace-nowrap">
            {task.category}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="zf-row-actions flex items-center gap-0.5 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={`Edit ${task.title}`}
          className="zf-tap relative p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-[var(--zf-accent-soft)] hover:text-[var(--zf-accent)] transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label={`Delete ${task.title}`}
          className="zf-tap relative p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
