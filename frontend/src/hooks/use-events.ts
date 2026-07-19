'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { createClientStore } from '@/lib/client-store'
import type { CalendarEvent, CalendarEventInput } from '@/types/event'

const eventStore = createClientStore<CalendarEventInput, CalendarEvent>('events')

type MutationOptions = {
  silent?: boolean
  successMessage?: string
}

export function useEvents() {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!userEmail) return
    let cancelled = false
    /* eslint-disable react-hooks/set-state-in-effect -- reset load flags before async list */
    setLoading(true)
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    eventStore
      .list(userEmail)
      .then((records) => {
        if (!cancelled) {
          setEvents(records)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load your events.')
          toast.error('Could not load your events.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userEmail, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const createEvent = useCallback(
    async (input: CalendarEventInput) => {
      try {
        const created = await eventStore.create(userEmail, input)
        setEvents((prev) => [...prev, created])
        toast.success('Event created')
        return true
      } catch {
        toast.error('Could not create the event.')
        return false
      }
    },
    [userEmail],
  )

  const updateEvent = useCallback(
    async (
      id: string,
      patch: Partial<CalendarEventInput>,
      options?: MutationOptions,
    ) => {
      try {
        const updated = await eventStore.update(userEmail, id, patch)
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)))
        if (!options?.silent) {
          toast.success(options?.successMessage ?? 'Event updated')
        }
        return true
      } catch {
        toast.error('Could not update the event.')
        return false
      }
    },
    [userEmail],
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      try {
        await eventStore.remove(userEmail, id)
        setEvents((prev) => prev.filter((e) => e.id !== id))
        toast.success('Event deleted')
        return true
      } catch {
        toast.error('Could not delete the event.')
        return false
      }
    },
    [userEmail],
  )

  return {
    events,
    loading,
    error,
    reload,
    createEvent,
    updateEvent,
    deleteEvent,
  }
}
