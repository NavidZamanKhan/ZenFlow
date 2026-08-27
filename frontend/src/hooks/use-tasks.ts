'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ApiError,
  apiCreateTask,
  apiDeleteTask,
  apiGetTasks,
  apiUpdateTask,
} from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Task, TaskInput } from '@/types/task'

import { clientCache } from '@/lib/client-cache'

type MutationOptions = {
  silent?: boolean
  successMessage?: string
}

function taskErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Cannot reach the server. Is the backend running?'
    }
    if (error.status === 401) {
      return 'Session expired. Please log in again.'
    }
    if (error.status >= 500) {
      return 'Server error while saving the task. Check the backend logs.'
    }
    if (error.message.trim()) {
      return error.message
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

export function useTasks() {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const cacheKey = userEmail ? `${userEmail}:tasks` : ''

  const [tasks, setTasks] = useState<Task[]>(() => {
    return cacheKey ? clientCache.get<Task[]>(cacheKey) ?? [] : []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    return !cacheKey || !clientCache.has(cacheKey)
  })
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!cacheKey) return
    const unsubscribe = clientCache.subscribe(cacheKey, () => {
      const cached = clientCache.get<Task[]>(cacheKey)
      if (cached) {
        setTasks(cached)
        setLoading(false)
      }
    })
    return unsubscribe
  }, [cacheKey])

  useEffect(() => {
    if (!user || !cacheKey) return
    let cancelled = false

    if (!clientCache.has(cacheKey)) {
      setLoading(true)
    }
    setError(null)

    apiGetTasks()
      .then((records) => {
        if (!cancelled) {
          clientCache.set(cacheKey, records)
          setTasks(records)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load tasks', err)
        if (!cancelled) {
          const message = taskErrorMessage(err, 'Could not load your tasks.')
          setError(message)
          if (!clientCache.has(cacheKey)) {
            toast.error(message)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, cacheKey, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const createTask = useCallback(
    async (input: TaskInput) => {
      const currentList = clientCache.get<Task[]>(cacheKey) ?? tasks
      const tempId = `temp-${crypto.randomUUID()}`
      const now = new Date().toISOString()
      const optimisticTask: Task = {
        id: tempId,
        title: input.title,
        description: input.description ?? '',
        dueDate: input.dueDate ?? null,
        priority: input.priority ?? 'medium',
        category: input.category ?? '',
        completed: input.completed ?? false,
        createdAt: now,
        updatedAt: now,
      }

      // Optimistic 0ms insert
      const optimisticList = [optimisticTask, ...currentList]
      clientCache.set(cacheKey, optimisticList)
      setTasks(optimisticList)
      toast.success('Task created')

      // Fire network request in background
      apiCreateTask(input)
        .then((created) => {
          const current = clientCache.get<Task[]>(cacheKey) ?? optimisticList
          const syncedList = current.map((t) => (t.id === tempId ? created : t))
          clientCache.set(cacheKey, syncedList)
          setTasks(syncedList)
        })
        .catch((err: unknown) => {
          console.error('Failed to create task', err)
          const current = clientCache.get<Task[]>(cacheKey) ?? optimisticList
          const rolledBackList = current.filter((t) => t.id !== tempId)
          clientCache.set(cacheKey, rolledBackList)
          setTasks(rolledBackList)
          toast.error(taskErrorMessage(err, 'Could not create the task.'))
        })

      return true
    },
    [cacheKey, tasks],
  )

  const updateTask = useCallback(
    async (id: string, patch: Partial<TaskInput>, options?: MutationOptions) => {
      const currentList = clientCache.get<Task[]>(cacheKey) ?? tasks
      const originalTask = currentList.find((t) => t.id === id)
      if (!originalTask) return false

      // Optimistic 0ms update
      const now = new Date().toISOString()
      const optimisticList = currentList.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: now } : t,
      )
      clientCache.set(cacheKey, optimisticList)
      setTasks(optimisticList)
      if (!options?.silent) {
        toast.success(options?.successMessage ?? 'Task updated')
      }

      // Fire network request in background
      apiUpdateTask(id, patch)
        .then((updated) => {
          const current = clientCache.get<Task[]>(cacheKey) ?? optimisticList
          const syncedList = current.map((t) => (t.id === id ? updated : t))
          clientCache.set(cacheKey, syncedList)
          setTasks(syncedList)
        })
        .catch((err: unknown) => {
          console.error('Failed to update task', err)
          const current = clientCache.get<Task[]>(cacheKey) ?? optimisticList
          const rolledBackList = current.map((t) => (t.id === id ? originalTask : t))
          clientCache.set(cacheKey, rolledBackList)
          setTasks(rolledBackList)
          toast.error(taskErrorMessage(err, 'Could not update the task.'))
        })

      return true
    },
    [cacheKey, tasks],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      const currentList = clientCache.get<Task[]>(cacheKey) ?? tasks
      const originalTask = currentList.find((t) => t.id === id)
      if (!originalTask) return false

      // Optimistic 0ms delete
      const optimisticList = currentList.filter((t) => t.id !== id)
      clientCache.set(cacheKey, optimisticList)
      setTasks(optimisticList)
      toast.success('Task deleted')

      apiDeleteTask(id).catch((err: unknown) => {
        console.error('Failed to delete task', err)
        const current = clientCache.get<Task[]>(cacheKey) ?? optimisticList
        const rolledBackList = [...current, originalTask]
        clientCache.set(cacheKey, rolledBackList)
        setTasks(rolledBackList)
        toast.error(taskErrorMessage(err, 'Could not delete the task.'))
      })

      return true
    },
    [cacheKey, tasks],
  )

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
