'use client'

import { useMemo, useState } from 'react'
import { ListTodo, Plus, Search } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { TaskFormModal } from './task-form-modal'
import { TaskRow } from './task-row'
import type { Task, TaskSortKey, TaskStatusFilter } from '@/types/task'

const priorityRank = { high: 0, medium: 1, low: 2 } as const

const selectClass =
  'px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1D70E8]/30 focus:border-transparent transition-all'

export function TasksPage() {
  const { tasks, loading, createTask, updateTask, deleteTask, toggleTask } = useTasks()

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
    <div className="px-4 sm:px-8 py-8 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-0.5">Stay on top of your day</p>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tasks</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#E2EEFC] px-3.5 py-1 rounded-full">
            <span className="text-xs font-semibold text-[#1D70E8]">
              {remaining} {remaining === 1 ? 'task' : 'tasks'} left
            </span>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1D70E8] hover:bg-[#1660CC] shadow-sm transition-colors"
          >
            <Plus size={16} />
            New task
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D70E8]/30 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatusFilter)}
          aria-label="Filter by status"
          className={selectClass}
        >
          <option value="all">All statuses</option>
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
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as TaskSortKey)}
          aria-label="Sort tasks"
          className={selectClass}
        >
          <option value="createdAt">Newest first</option>
          <option value="dueDate">By due date</option>
          <option value="priority">By priority</option>
        </select>
      </div>

      {/* Task list card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ListTodo size={18} className="text-[#1D70E8]" />
          <h2 className="text-base font-bold text-slate-800">
            {status === 'completed' ? 'Completed' : status === 'active' ? 'Active' : 'All tasks'}
          </h2>
        </div>

        {loading ? (
          <div className="space-y-3 py-1" aria-label="Loading tasks">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-2">
                <div className="w-[18px] h-[18px] rounded-full bg-slate-100 animate-pulse" />
                <div className="h-3.5 rounded-full bg-slate-100 animate-pulse flex-1 max-w-[240px]" />
                <div className="h-5 w-16 rounded-full bg-slate-50 animate-pulse hidden sm:block" />
              </div>
            ))}
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#E2EEFC] flex items-center justify-center mb-4">
              <ListTodo size={22} className="text-[#1D70E8]" />
            </div>
            {tasks.length === 0 ? (
              <>
                <p className="text-sm font-semibold text-slate-700 mb-1">No tasks yet</p>
                <p className="text-xs text-slate-400 mb-5 max-w-[240px]">
                  A clear list is a calm mind. Add your first task to get started.
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1D70E8] hover:bg-[#1660CC] transition-colors"
                >
                  <Plus size={16} />
                  Create your first task
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700 mb-1">Nothing matches</p>
                <p className="text-xs text-slate-400 max-w-[240px]">
                  Try a different search or clear the filters.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onEdit={openEdit}
                onDelete={setDeleting}
              />
            ))}
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
