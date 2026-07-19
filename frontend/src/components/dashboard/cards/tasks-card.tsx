'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, ListTodo, Plus } from 'lucide-react'
import { formatDate, isOverdue } from '@/lib/dates'
import { TaskFormModal } from '@/components/dashboard/tasks/task-form-modal'
import { Skeleton } from '@/components/ui/skeleton'
import type { Task, TaskInput, TaskPriority } from '@/types/task'

const priorityDot: Record<TaskPriority, string> = {
  low: 'bg-slate-300',
  medium: 'bg-[#1D70E8]',
  high: 'bg-rose-500',
}

const priorityLabel: Record<TaskPriority, string> = {
  low: 'Low priority',
  medium: 'Medium priority',
  high: 'High priority',
}

type TasksCardProps = {
  tasks: Task[]
  loading: boolean
  onToggle: (task: Task) => Promise<boolean>
  onCreate: (input: TaskInput) => Promise<boolean>
}

export function TasksCard({ tasks, loading, onToggle, onCreate }: TasksCardProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const completedCount = tasks.filter((task) => task.completed).length
  const visibleTasks = [...tasks]
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return b.createdAt.localeCompare(a.createdAt)
    })
    .slice(0, 5)

  const handleToggle = async (task: Task) => {
    setPendingId(task.id)
    await onToggle(task)
    setPendingId(null)
  }

  return (
    <div className="rounded-3xl border border-slate-100/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListTodo size={18} className="text-[#1D70E8]" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-800">Tasks</h2>
        </div>
        <p className="text-xs font-medium text-slate-400 tabular-nums">
          {loading ? '…' : `${completedCount}/${tasks.length} completed`}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1 rounded-xl bg-[#E2EEFC] px-3 py-1.5 text-xs font-semibold text-[#1D70E8] transition-colors hover:bg-[#d3e5fb]"
        >
          <Plus size={13} aria-hidden="true" />
          Add task
        </button>
        <Link
          href="/dashboard/tasks"
          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          View all
        </Link>
      </div>

      <div className="space-y-1">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-2 py-2.5">
              <Skeleton className="h-[18px] w-[18px] rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4 max-w-[200px]" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="hidden h-5 w-14 rounded-full sm:block" />
            </div>
          ))
        ) : visibleTasks.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-slate-400">
            No tasks yet. Add one to get started.
          </p>
        ) : (
          visibleTasks.map((task) => {
            const overdue =
              !task.completed && task.dueDate !== null && isOverdue(task.dueDate)
            return (
              <button
                key={task.id}
                type="button"
                disabled={pendingId === task.id}
                onClick={() => handleToggle(task)}
                className="group flex w-full items-start justify-between gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-slate-50/50 disabled:pointer-events-none disabled:opacity-60"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    <AnimatePresence mode="wait" initial={false}>
                      {task.completed ? (
                        <motion.span
                          key="done"
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                          className="block"
                        >
                          <CheckCircle2 size={18} className="text-[#1D70E8]" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="open"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="block h-[18px] w-[18px] rounded-full border border-slate-300 transition-colors group-hover:border-[#1D70E8]"
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-medium transition-all ${
                        task.completed
                          ? 'text-slate-400 line-through'
                          : 'text-slate-700'
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${priorityDot[task.priority]}`}
                        title={priorityLabel[task.priority]}
                        aria-label={priorityLabel[task.priority]}
                      />
                      {task.dueDate ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            overdue ? 'text-rose-500' : 'text-slate-400'
                          }`}
                        >
                          <CalendarDays size={11} aria-hidden="true" />
                          {formatDate(task.dueDate)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {task.category ? (
                  <span className="flex-shrink-0 rounded-full bg-[#F1F3F5] px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-500">
                    {task.category}
                  </span>
                ) : null}
              </button>
            )
          })
        )}
      </div>

      <TaskFormModal
        open={formOpen}
        task={null}
        onClose={() => setFormOpen(false)}
        onSubmit={onCreate}
      />
    </div>
  )
}
