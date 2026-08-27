'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { createClientStore } from '@/lib/client-store'
import { clientCache } from '@/lib/client-cache'
import type { CalendarEvent, CalendarEventInput } from '@/types/event'

const eventStore = createClientStore<CalendarEventInput, CalendarEvent>('events')

type MutationOptions = {
  silent?: boolean
  successMessage?: string
}

export function useEvents() {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const cacheKey = userEmail ? `${userEmail}:events` : ''

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    return cacheKey ? clientCache.get<CalendarEvent[]>(cacheKey) ?? [] : []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    return !cacheKey || !clientCache.has(cacheKey)
  })
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!cacheKey) return
    const unsubscribe = clientCache.subscribe(cacheKey, () => {
      const cached = clientCache.get<CalendarEvent[]>(cacheKey)
      if (cached) {
        setEvents(cached)
        setLoading(false)
      }
    })
    return unsubscribe
  }, [cacheKey])

  useEffect(() => {
    if (!userEmail || !cacheKey) return
    let cancelled = false

    if (!clientCache.has(cacheKey)) {
      setLoading(true)
    }
    setError(null)

    eventStore
      .list(userEmail)
      .then((records) => {
        if (!cancelled) {
          clientCache.set(cacheKey, records)
          setEvents(records)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          const msg = 'Could not load your events.'
          setError(msg)
          if (!clientCache.has(cacheKey)) {
            toast.error(msg)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userEmail, cacheKey, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const createEvent = useCallback(
    async (input: CalendarEventInput) => {
      const currentList = clientCache.get<CalendarEvent[]>(cacheKey) ?? events
      const tempId = `temp-${crypto.randomUUID()}`
      const now = new Date().toISOString()
      const optimisticEvent: CalendarEvent = {
        id: tempId,
        title: input.title,
        description: input.description ?? '',
        start: input.start,
        end: input.end,
        allDay: input.allDay ?? false,
        createdAt: now,
        updatedAt: now,
      }

      // Optimistic 0ms insert
      const optimisticList = [optimisticEvent, ...currentList]
      clientCache.set(cacheKey, optimisticList)
      setEvents(optimisticList)
      toast.success('Event created')

      try {
        const created = await eventStore.create(userEmail, input)
        const syncedList = (clientCache.get<CalendarEvent[]>(cacheKey) ?? optimisticList).map(
          (e) => (e.id === tempId ? created : e),
        )
        clientCache.set(cacheKey, syncedList)
        setEvents(syncedList)
        return true
      } catch {
        // Rollback
        const rolledBackList = (clientCache.get<CalendarEvent[]>(cacheKey) ?? optimisticList).filter(
          (e) => e.id !== tempId,
        )
        clientCache.set(cacheKey, rolledBackList)
        setEvents(rolledBackList)
        toast.error('Could not create the event.')
        return false
      }
    },
    [userEmail, cacheKey, events],
  )

  const updateEvent = useCallback(
    async (
      id: string,
      patch: Partial<CalendarEventInput>,
      options?: MutationOptions,
    ) => {
      const currentList = clientCache.get<CalendarEvent[]>(cacheKey) ?? events
      const originalEvent = currentList.find((e) => e.id === id)
      if (!originalEvent) return false

      // Optimistic 0ms update
      const now = new Date().toISOString()
      const optimisticList = currentList.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt: now } : e,
      )
      clientCache.set(cacheKey, optimisticList)
      setEvents(optimisticList)
      if (!options?.silent) {
        toast.success(options?.successMessage ?? 'Event updated')
      }

      try {
        const updated = await eventStore.update(userEmail, id, patch)
        const syncedList = (clientCache.get<CalendarEvent[]>(cacheKey) ?? optimisticList).map(
          (e) => (e.id === id ? updated : e),
        )
        clientCache.set(cacheKey, syncedList)
        setEvents(syncedList)
        return true
      } catch {
        // Rollback
        const rolledBackList = (clientCache.get<CalendarEvent[]>(cacheKey) ?? optimisticList).map(
          (e) => (e.id === id ? originalEvent : e),
        )
        clientCache.set(cacheKey, rolledBackList)
        setEvents(rolledBackList)
        toast.error('Could not update the event.')
        return false
      }
    },
    [userEmail, cacheKey, events],
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      const currentList = clientCache.get<CalendarEvent[]>(cacheKey) ?? events
      const originalEvent = currentList.find((e) => e.id === id)
      if (!originalEvent) return false

      // Optimistic 0ms delete
      const optimisticList = currentList.filter((e) => e.id !== id)
      clientCache.set(cacheKey, optimisticList)
      setEvents(optimisticList)
      toast.success('Event deleted')

      try {
        await eventStore.remove(userEmail, id)
        return true
      } catch {
        // Rollback
        const rolledBackList = [...(clientCache.get<CalendarEvent[]>(cacheKey) ?? optimisticList), originalEvent]
        clientCache.set(cacheKey, rolledBackList)
        setEvents(rolledBackList)
        toast.error('Could not delete the event.')
        return false
      }
    },
    [userEmail, cacheKey, events],
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
