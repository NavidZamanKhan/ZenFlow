'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiCreateTask, apiDeleteTask, apiGetTasks, apiUpdateTask } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Task, TaskInput } from '@/types/task'

type MutationOptions = {
  silent?: boolean
  successMessage?: string
}

export function useTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    /* eslint-disable react-hooks/set-state-in-effect -- reset load flags before async list */
    setLoading(true)
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    apiGetTasks()
      .then((records) => {
        if (!cancelled) {
          setTasks(records)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load your tasks.')
          toast.error('Could not load your tasks.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const createTask = useCallback(async (input: TaskInput) => {
    try {
      const created = await apiCreateTask(input)
      setTasks((prev) => [...prev, created])
      toast.success('Task created')
      return true
    } catch {
      toast.error('Could not create the task.')
      return false
    }
  }, [])

  const updateTask = useCallback(
    async (id: string, patch: Partial<TaskInput>, options?: MutationOptions) => {
      try {
        const updated = await apiUpdateTask(id, patch)
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
        if (!options?.silent) {
          toast.success(options?.successMessage ?? 'Task updated')
        }
        return true
      } catch {
        toast.error('Could not update the task.')
        return false
      }
    },
    [],
  )

  const deleteTask = useCallback(async (id: string) => {
    try {
      await apiDeleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      toast.success('Task deleted')
      return true
    } catch {
      toast.error('Could not delete the task.')
      return false
    }
  }, [])

  const toggleTask = useCallback(
    (task: Task) =>
      updateTask(
        task.id,
        { completed: !task.completed },
        {
          successMessage: task.completed
            ? 'Task marked incomplete'
            : 'Task completed',
        },
      ),
    [updateTask],
  )

  return {
    tasks,
    loading,
    error,
    reload,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
  }
}
