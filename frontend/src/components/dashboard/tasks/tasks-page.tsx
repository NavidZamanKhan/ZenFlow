'use client'

import { useMemo, useState } from 'react'
import { ListTodo, Plus, Search } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState, ErrorState } from '@/components/shared/state-blocks'
import { AnimatedItem, AnimatedList } from '@/components/ui/animated-list'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskFormModal } from './task-form-modal'
import { TaskRow } from './task-row'
import type { Task, TaskSortKey, TaskStatusFilter } from '@/types/task'

const priorityRank = { high: 0, medium: 1, low: 2 } as const

const selectClass =
  'px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1D70E8]/30 focus:border-transparent transition-all'

export function TasksPage() {
  const {
    tasks,
    loading,
    error,
    reload,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
  } = useTasks()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TaskStatusFilter>('all')
  const [category, setCategory] = useState('all')
  const [sortKey, setSortKey] = useState<TaskSortKey>('createdAt')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)

  const categories = useMemo(() => {
    const set = new Set(tasks.map((t) => t.category).filter(Boolean))
    return [...set].sort()
  }, [tasks])

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = tasks.filter((task) => {
      if (status === 'active' && task.completed) return false
      if (status === 'completed' && !task.completed) return false
      if (category !== 'all' && task.category !== category) return false
      if (
        query &&
        !task.title.toLowerCase().includes(query) &&
        !task.description.toLowerCase().includes(query)
      ) {
        return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortKey === 'dueDate') {
        if (a.dueDate === null && b.dueDate === null) return 0
        if (a.dueDate === null) return 1
        if (b.dueDate === null) return -1
        return a.dueDate.localeCompare(b.dueDate)
      }
      if (sortKey === 'priority') {
        return priorityRank[a.priority] - priorityRank[b.priority]
      }
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [tasks, search, status, category, sortKey])

  const remaining = tasks.filter((t) => !t.completed).length

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditing(task)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (deleting) {
      await deleteTask(deleting.id)
      setDeleting(null)
    }
  }

  return (
    <div className="max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-0.5 text-sm font-medium text-slate-500">
            Stay on top of your day
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Tasks
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#E2EEFC] px-3.5 py-1">
            <span className="text-xs font-semibold text-[#1D70E8]">
              {remaining} {remaining === 1 ? 'task' : 'tasks'} left
            </span>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-[#1D70E8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1660CC]"
          >
            <Plus size={16} />
            New task
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 max-w-xs flex-1 basis-full sm:basis-auto sm:min-w-[180px]">
          <label htmlFor="tasks-search" className="sr-only">
            Search tasks
          </label>
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            id="tasks-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1D70E8]/30"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatusFilter)}
          aria-label="Filter by status"
          className={selectClass}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className={selectClass}
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as TaskSortKey)}
          aria-label="Sort tasks"
          className={selectClass}
        >
          <option value="createdAt">Newest</option>
          <option value="dueDate">Due date</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      <div className="rounded-3xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <ListTodo size={18} className="text-[#1D70E8]" />
          <h2 className="text-base font-bold text-slate-800">
            {status === 'completed'
              ? 'Completed'
              : status === 'active'
                ? 'Active'
                : 'All tasks'}
          </h2>
        </div>

        {error && !loading ? (
          <ErrorState
            description={error}
            onRetry={reload}
            className="border-0 bg-transparent py-10"
          />
        ) : loading ? (
          <div className="space-y-3 py-1" aria-label="Loading tasks">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="h-[18px] w-[18px] rounded-full" />
                <Skeleton className="h-3.5 max-w-[240px] flex-1" />
                <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
              </div>
            ))}
          </div>
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={tasks.length === 0 ? 'No tasks yet' : 'Nothing matches'}
            description={
              tasks.length === 0
                ? 'A clear list is a calm mind. Add your first task to get started.'
                : 'Try a different search or clear the filters.'
            }
            action={
              tasks.length === 0 ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex items-center gap-1.5 rounded-xl bg-[#1D70E8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1660CC]"
                >
                  <Plus size={16} />
                  Create your first task
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-1">
            <AnimatedList>
              {visibleTasks.map((task) => (
                <AnimatedItem key={task.id}>
                  <TaskRow
                    task={task}
                    onToggle={toggleTask}
                    onEdit={openEdit}
                    onDelete={setDeleting}
                  />
                </AnimatedItem>
              ))}
            </AnimatedList>
          </div>
        )}
      </div>

      <TaskFormModal
        open={formOpen}
        task={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) =>
          editing ? updateTask(editing.id, input) : createTask(input)
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete task"
        message={`"${deleting?.title ?? ''}" will be permanently deleted. This can't be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
