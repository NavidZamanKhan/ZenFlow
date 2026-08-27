'use client'

import { useMemo, useState } from 'react'
import { ListFilter, ListTodo, Plus, Search, X } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { useHighlightParam } from '@/hooks/use-highlight-param'
import { compareDueDateTime } from '@/lib/dates'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState, ErrorState } from '@/components/shared/state-blocks'
import { AnimatedItem, AnimatedList } from '@/components/ui/animated-list'
import { Skeleton } from '@/components/ui/skeleton'
import { SlideDrawer } from '@/components/ui/slide-drawer'
import { TaskFormModal } from './task-form-modal'
import { TaskRow } from './task-row'
import type { Task, TaskSortKey, TaskStatusFilter } from '@/types/task'

const priorityRank = { high: 0, medium: 1, low: 2 } as const

const selectClass =
  'px-3 py-2 rounded-xl bg-slate-50 dark:bg-[var(--zf-surface)] border border-slate-100 dark:border-[var(--zf-border)] text-xs font-medium text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--zf-accent)_30%,transparent)] focus:border-transparent transition-all'

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
  const highlightId = useHighlightParam()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TaskStatusFilter>('all')
  const [category, setCategory] = useState('all')
  const [sortKey, setSortKey] = useState<TaskSortKey>('createdAt')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const categories = useMemo(() => {
    const set = new Set(tasks.map((t) => t.category).filter(Boolean))
    return [...set].sort()
  }, [tasks])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (status !== 'all') count += 1
    if (category !== 'all') count += 1
    if (sortKey !== 'createdAt') count += 1
    return count
  }, [status, category, sortKey])

  const clearFilters = () => {
    setStatus('all')
    setCategory('all')
    setSortKey('createdAt')
  }

  const filterControls = (
    <>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as TaskStatusFilter)}
        aria-label="Filter by status"
        className={`${selectClass} w-full sm:w-auto`}
      >
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="Filter by category"
        className={`${selectClass} w-full sm:w-auto`}
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
        className={`${selectClass} w-full sm:w-auto`}
      >
        <option value="createdAt">Newest</option>
        <option value="dueDate">Due date</option>
        <option value="priority">Priority</option>
      </select>
    </>
  )

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
        return compareDueDateTime(a, b)
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
          <p className="mb-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            Stay on top of your day
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[var(--zf-text)]">
            Tasks
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[var(--zf-accent-soft)] px-3.5 py-1">
            <span className="text-xs font-semibold text-[var(--zf-accent-fg)]">
              {remaining} {remaining === 1 ? 'task' : 'tasks'} left
            </span>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--zf-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--zf-accent-hover)]"
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
            aria-hidden="true"
          />
          <input
            id="tasks-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-xl border border-slate-100 dark:border-[var(--zf-border)] bg-slate-50 dark:bg-[var(--zf-surface)] py-2 pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--zf-accent)_30%,transparent)]"
          />
        </div>

        <div className="hidden flex-wrap items-center gap-2 sm:flex">{filterControls}</div>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="zf-tap relative inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] dark:text-slate-200 sm:hidden"
          aria-expanded={filtersOpen}
        >
          <ListFilter size={14} aria-hidden="true" />
          Filters
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--zf-accent)] px-1.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      <SlideDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="right"
        rootClassName="sm:hidden"
        label="Task filters"
        className="w-[min(100%,20rem)] px-5 py-6"
      >
        <div className="flex h-full flex-col">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-[var(--zf-text)]">Filters</h2>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
              className="zf-tap relative rounded-xl p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col gap-3">{filterControls}</div>
          <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-5 dark:border-[var(--zf-border)]">
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-[var(--zf-border)] dark:text-slate-300"
              >
                Clear filters
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="w-full rounded-xl bg-[var(--zf-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--zf-accent-hover)]"
            >
              Done
            </button>
          </div>
        </div>
      </SlideDrawer>

      <div className="rounded-3xl border border-slate-100/80 dark:border-[var(--zf-border)] bg-white dark:bg-[var(--zf-surface)] p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <ListTodo size={18} className="text-[var(--zf-accent)]" />
          <h2 className="text-base font-bold text-slate-800 dark:text-[var(--zf-text)]">
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
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--zf-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--zf-accent-hover)]"
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
                    highlighted={highlightId === task.id}
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
