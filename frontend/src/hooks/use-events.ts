'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  apiCreateEvent,
  apiDeleteEvent,
  apiGetEvents,
  apiUpdateEvent,
  type EventRange,
} from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { clientCache } from '@/lib/client-cache'
import type { CalendarEvent, CalendarEventInput } from '@/types/event'

export type { EventRange }

type MutationOptions = {
  silent?: boolean
  successMessage?: string
}

/**
 * One store per user holds every event fetched so far (merged by id) plus the
 * windows already loaded from the API. Each `useEvents(range)` caller only
 * requests its own window via `?start=&end=` and reads the overlapping slice,
 * so the dashboard, calendar and notifications never download the full list.
 */
type EventsStore = {
  events: CalendarEvent[]
  ranges: EventRange[]
}

const EMPTY_STORE: EventsStore = { events: [], ranges: [] }

// -- Range helpers ----------------------------------------------------------

function toMs(value: string): number {
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

function normalizeRange(range: EventRange): EventRange {
  return {
    start: new Date(range.start).toISOString(),
    end: new Date(range.end).toISOString(),
  }
}

function rangeCovered(ranges: EventRange[], range: EventRange): boolean {
  const start = toMs(range.start)
  const end = toMs(range.end)
  return ranges.some((r) => toMs(r.start) <= start && toMs(r.end) >= end)
}

function mergeRanges(ranges: EventRange[]): EventRange[] {
  const sorted = [...ranges].sort((a, b) => toMs(a.start) - toMs(b.start))
  const merged: EventRange[] = []
  for (const r of sorted) {
    const last = merged[merged.length - 1]
    if (last && toMs(r.start) <= toMs(last.end)) {
      if (toMs(r.end) > toMs(last.end)) last.end = r.end
    } else {
      merged.push({ ...r })
    }
  }
  return merged
}

function eventOverlaps(event: CalendarEvent, range: EventRange): boolean {
  const start = toMs(event.start)
  const end = toMs(event.end || event.start)
  return end >= toMs(range.start) && start <= toMs(range.end)
}

function isTempId(id: string): boolean {
  return id.startsWith('temp-')
}

/** Local-midnight window from `fromDays` to `toDays` (inclusive) relative to today. */
export function dayRange(fromDays: number, toDays: number, now = new Date()): EventRange {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + fromDays)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  end.setDate(end.getDate() + toDays)
  return { start: start.toISOString(), end: end.toISOString() }
}

/** Memoised `dayRange` for components - stable across re-renders within a day. */
export function useDayRange(fromDays: number, toDays: number): EventRange {
  const dayKey = new Date().toDateString()
  return useMemo(() => {
    void dayKey // recompute when the calendar day changes
    return dayRange(fromDays, toDays)
  }, [fromDays, toDays, dayKey])
}

// -- Hook -------------------------------------------------------------------

export function useEvents(range?: EventRange) {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const cacheKey = userEmail ? `${userEmail}:events` : ''

  const normalized = useMemo(() => (range ? normalizeRange(range) : undefined), [range])
  const rangeKey = normalized ? `${normalized.start}|${normalized.end}` : ''

  const readStore = useCallback(
    (): EventsStore => (cacheKey ? clientCache.get<EventsStore>(cacheKey) ?? EMPTY_STORE : EMPTY_STORE),
    [cacheKey],
  )

  const [store, setStore] = useState<EventsStore>(readStore)
  const [loading, setLoading] = useState<boolean>(() => {
    if (!cacheKey) return true
    const cached = clientCache.get<EventsStore>(cacheKey)
    if (!cached) return true
    return normalized ? !rangeCovered(cached.ranges, normalized) : cached.ranges.length === 0
  })
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const loadedOnce = useRef(false)

  const writeStore = useCallback(
    (next: EventsStore) => {
      if (cacheKey) clientCache.set(cacheKey, next)
      setStore(next)
    },
    [cacheKey],
  )

  // Stay in sync with other hook instances sharing the store.
  useEffect(() => {
    if (!cacheKey) return
    const unsubscribe = clientCache.subscribe(cacheKey, () => {
      const cached = clientCache.get<EventsStore>(cacheKey)
      if (cached) setStore(cached)
    })
    return unsubscribe
  }, [cacheKey])

  // Fetch the requested window (stale-while-revalidate).
  useEffect(() => {
    if (!user || !cacheKey) return
    let cancelled = false

    // `loading` starts true (see useState) and flips off after the first
    // response; later window changes refetch in the background so the
    // calendar never unmounts while navigating.
    apiGetEvents(normalized)
      .then((records) => {
        if (cancelled) return
        const latest = readStore()
        const fetchedIds = new Set(records.map((e) => e.id))
        const kept = latest.events.filter((e) => {
          if (fetchedIds.has(e.id)) return false
          if (isTempId(e.id)) return true
          // Drop stale copies inside the refreshed window (deleted elsewhere).
          return normalized ? !eventOverlaps(e, normalized) : false
        })
        const ranges = normalized
          ? mergeRanges([...latest.ranges, normalized])
          : [{ start: new Date(0).toISOString(), end: new Date(8.64e15).toISOString() }]
        writeStore({ events: [...kept, ...records], ranges })
        loadedOnce.current = true
        setError(null)
      })
      .catch((err: unknown) => {
        console.error('Failed to load events', err)
        if (cancelled) return
        const msg = 'Could not load your events.'
        setError(msg)
        if (!loadedOnce.current && !clientCache.has(cacheKey)) {
          toast.error(msg)
        }
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // rangeKey captures the normalised range contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cacheKey, rangeKey, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  // Slice visible to this caller.
  const events = useMemo(
    () => (normalized ? store.events.filter((e) => eventOverlaps(e, normalized)) : store.events),
    [store.events, normalized],
  )

  const createEvent = useCallback(
    async (input: CalendarEventInput) => {
      const current = readStore()
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
      writeStore({ ...current, events: [optimisticEvent, ...current.events] })
      toast.success('Event created')

      // Fire API sync in background
      apiCreateEvent(input)
        .then((created) => {
          const latest = readStore()
          writeStore({
            ...latest,
            events: latest.events.map((e) => (e.id === tempId ? created : e)),
          })
        })
        .catch((err: unknown) => {
          console.error('Failed to create event', err)
          const latest = readStore()
          writeStore({ ...latest, events: latest.events.filter((e) => e.id !== tempId) })
          toast.error('Could not create the event.')
        })

      return true
    },
    [readStore, writeStore],
  )

  const updateEvent = useCallback(
    async (
      id: string,
      patch: Partial<CalendarEventInput>,
      options?: MutationOptions,
    ) => {
      const current = readStore()
      const originalEvent = current.events.find((e) => e.id === id)
      if (!originalEvent) return false

      // Optimistic 0ms update
      const now = new Date().toISOString()
      writeStore({
        ...current,
        events: current.events.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now } : e)),
      })
      if (!options?.silent) {
        toast.success(options?.successMessage ?? 'Event updated')
      }

      // Fire API sync in background
      apiUpdateEvent(id, patch)
        .then((updated) => {
          const latest = readStore()
          writeStore({ ...latest, events: latest.events.map((e) => (e.id === id ? updated : e)) })
        })
        .catch((err: unknown) => {
          console.error('Failed to update event', err)
          const latest = readStore()
          writeStore({
            ...latest,
            events: latest.events.map((e) => (e.id === id ? originalEvent : e)),
          })
          toast.error('Could not update the event.')
        })

      return true
    },
    [readStore, writeStore],
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      const current = readStore()
      const originalEvent = current.events.find((e) => e.id === id)
      if (!originalEvent) return false

      // Optimistic 0ms delete
      writeStore({ ...current, events: current.events.filter((e) => e.id !== id) })
      toast.success('Event deleted')

      apiDeleteEvent(id).catch((err: unknown) => {
        console.error('Failed to delete event', err)
        const latest = readStore()
        writeStore({ ...latest, events: [...latest.events, originalEvent] })
        toast.error('Could not delete the event.')
      })

      return true
    },
    [readStore, writeStore],
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
