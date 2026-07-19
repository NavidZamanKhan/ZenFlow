'use client'

import { CalendarDays, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { formatDate, isOverdue } from '@/lib/dates'
import type { Task, TaskPriority } from '@/types/task'

const priorityPill: Record<TaskPriority, string> = {
  low: 'bg-[#F1F3F5] text-slate-500',
  medium: 'bg-[#E2EEFC] text-[#1D70E8]',
  high: 'bg-rose-50 text-rose-500',
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
          ? 'bg-[#E2EEFC] ring-2 ring-[#1D70E8]/35'
          : 'hover:bg-slate-50/50'
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
          <CheckCircle2 size={18} className="text-[#1D70E8]" />
        ) : (
          <span className="block w-[18px] h-[18px] rounded-full border border-slate-300 hover:border-[#1D70E8] transition-colors" />
        )}
      </button>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate transition-all ${
            task.completed ? 'line-through text-slate-500' : 'text-slate-700'
          }`}
        >
          {task.title}
        </p>
        {task.dueDate && (
          <p
            className={`flex items-center gap-1 text-xs mt-0.5 font-medium ${
              overdue ? 'text-rose-500' : 'text-slate-500'
            }`}
          >
            <CalendarDays size={12} aria-hidden="true" />
            {formatDate(task.dueDate)}
            {overdue && ' · Overdue'}
          </p>
        )}
      </div>

      {/* Pills */}
      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${priorityPill[task.priority]}`}
        >
          {priorityLabels[task.priority]}
        </span>
        {task.category && (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F3F5] text-slate-500 whitespace-nowrap">
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
          className="zf-tap relative p-1.5 rounded-lg text-slate-500 hover:bg-[#E2EEFC] hover:text-[#1D70E8] transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label={`Delete ${task.title}`}
          className="zf-tap relative p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
