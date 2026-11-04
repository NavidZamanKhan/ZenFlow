'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  apiCreateReminder,
  apiDeleteReminder,
  apiGetReminders,
  apiSnoozeReminder,
  apiUpdateReminder,
} from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { clientCache } from '@/lib/client-cache'
import type { Reminder, ReminderInput } from '@/types/reminder'

function sortByRemindAt(list: Reminder[]): Reminder[] {
  return [...list].sort((a, b) => a.remindAt.localeCompare(b.remindAt))
}

/**
 * User-scheduled reminders (/api/reminders/). The backend scheduler fires
 * them when `remindAt` passes; this hook manages the list with optimistic
 * updates and in-memory SWR caching like the other data hooks.
 */
export function useReminders() {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const cacheKey = userEmail ? `${userEmail}:reminders` : ''

  const [reminders, setReminders] = useState<Reminder[]>(() =>
    cacheKey ? clientCache.get<Reminder[]>(cacheKey) ?? [] : [],
  )
  const [loading, setLoading] = useState<boolean>(() => !cacheKey || !clientCache.has(cacheKey))
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const read = useCallback(
    () => (cacheKey ? clientCache.get<Reminder[]>(cacheKey) ?? [] : []),
    [cacheKey],
  )
  const write = useCallback(
    (next: Reminder[]) => {
      const sorted = sortByRemindAt(next)
      if (cacheKey) clientCache.set(cacheKey, sorted)
      setReminders(sorted)
    },
    [cacheKey],
  )

  useEffect(() => {
    if (!cacheKey) return
    return clientCache.subscribe(cacheKey, () => {
      const cached = clientCache.get<Reminder[]>(cacheKey)
      if (cached) {
        setReminders(cached)
        setLoading(false)
      }
    })
  }, [cacheKey])

  useEffect(() => {
    if (!userEmail || !cacheKey) return
    let cancelled = false

    apiGetReminders()
      .then((records) => {
        if (cancelled) return
        write(records)
        setError(null)
      })
      .catch((err: unknown) => {
        console.error('Failed to load reminders', err)
        if (!cancelled) setError('Could not load your reminders.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userEmail, cacheKey, reloadKey, write])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  const createReminder = useCallback(
    async (input: ReminderInput): Promise<boolean> => {
      const tempId = `temp-${crypto.randomUUID()}`
      const now = new Date().toISOString()
      const optimistic: Reminder = {
        id: tempId,
        title: input.title,
        message: input.message ?? '',
        remindAt: input.remindAt,
        channel: input.channel ?? 'in_app',
        status: 'scheduled',
        sentAt: null,
        lastError: '',
        emailSentAt: null,
        emailAttempts: 0,
        nextAttemptAt: null,
        taskId: input.taskId ?? null,
        eventId: input.eventId ?? null,
        createdAt: now,
        updatedAt: now,
      }
      write([optimistic, ...read()])

      try {
        const created = await apiCreateReminder(input)
        write(read().map((r) => (r.id === tempId ? created : r)))
        toast.success('Reminder scheduled')
        return true
      } catch (err) {
        console.error('Failed to create reminder', err)
        write(read().filter((r) => r.id !== tempId))
        toast.error('Could not schedule the reminder.')
        return false
      }
    },
    [read, write],
  )

  const updateReminder = useCallback(
    async (id: string, patch: Partial<ReminderInput>): Promise<boolean> => {
      const original = read().find((r) => r.id === id)
      if (!original) return false
      write(read().map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } as Reminder : r)))
      try {
        const updated = await apiUpdateReminder(id, patch)
        write(read().map((r) => (r.id === id ? updated : r)))
        return true
      } catch (err) {
        console.error('Failed to update reminder', err)
        write(read().map((r) => (r.id === id ? original : r)))
        toast.error('Could not update the reminder.')
        return false
      }
    },
    [read, write],
  )

  const snoozeReminder = useCallback(
    async (id: string, minutes: number): Promise<boolean> => {
      const original = read().find((r) => r.id === id)
      if (!original) return false
      const base = Math.max(new Date(original.remindAt).getTime(), Date.now())
      const optimisticAt = new Date(base + minutes * 60_000).toISOString()
      write(
        read().map((r) =>
          r.id === id ? { ...r, remindAt: optimisticAt, status: 'scheduled', sentAt: null } : r,
        ),
      )
      try {
        const updated = await apiSnoozeReminder(id, minutes)
        write(read().map((r) => (r.id === id ? updated : r)))
        toast.success(minutes >= 1440 ? 'Snoozed by 1 day' : `Snoozed ${minutes} min`)
        return true
      } catch (err) {
        console.error('Failed to snooze reminder', err)
        write(read().map((r) => (r.id === id ? original : r)))
        toast.error('Could not snooze the reminder.')
        return false
      }
    },
    [read, write],
  )

  const cancelReminder = useCallback(
    (id: string) => updateReminder(id, { status: 'cancelled' }),
    [updateReminder],
  )

  const deleteReminder = useCallback(
    async (id: string): Promise<boolean> => {
      const original = read().find((r) => r.id === id)
      if (!original) return false
      write(read().filter((r) => r.id !== id))
      try {
        await apiDeleteReminder(id)
        toast.success('Reminder deleted')
        return true
      } catch (err) {
        console.error('Failed to delete reminder', err)
        write([...read(), original])
        toast.error('Could not delete the reminder.')
        return false
      }
    },
    [read, write],
  )

  return {
    reminders,
    loading,
    error,
    reload,
    createReminder,
    updateReminder,
    snoozeReminder,
    cancelReminder,
    deleteReminder,
  }
}
