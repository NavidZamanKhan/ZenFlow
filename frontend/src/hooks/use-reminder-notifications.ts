'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  apiGetReminderNotifications,
  apiMarkAllReminderNotificationsRead,
  apiMarkReminderNotificationRead,
} from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { clientCache } from '@/lib/client-cache'
import type { ReminderNotification } from '@/types/reminder'
import type { Notification } from '@/types/notification'

/** Prefix that distinguishes server-side reminder notifications from derived ones. */
export const REMINDER_NOTIFICATION_PREFIX = 'reminder:'

export function toReminderNotificationId(serverId: string): string {
  return `${REMINDER_NOTIFICATION_PREFIX}${serverId}`
}

export function fromReminderNotificationId(id: string): string | null {
  return id.startsWith(REMINDER_NOTIFICATION_PREFIX) ? id.slice(REMINDER_NOTIFICATION_PREFIX.length) : null
}

export function toNotification(item: ReminderNotification): Notification {
  return {
    id: toReminderNotificationId(item.id),
    type: 'reminder',
    title: item.title,
    description: item.body || 'Reminder',
    read: item.read,
    timestamp: item.createdAt,
    href: item.href || '/dashboard',
  }
}

const DEFAULT_POLL_MS = 60_000

/**
 * Notifications produced by the reminder scheduler (Celery Beat fires due
 * reminders → ReminderNotification rows). Read state lives on the server so it
 * follows the user across devices. Polled every minute and on window focus.
 */
export function useReminderNotifications(pollMs: number = DEFAULT_POLL_MS) {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const cacheKey = userEmail ? `${userEmail}:reminder-notifications` : ''

  const [items, setItems] = useState<ReminderNotification[]>(() =>
    cacheKey ? clientCache.get<ReminderNotification[]>(cacheKey) ?? [] : [],
  )
  const [loading, setLoading] = useState<boolean>(() => !cacheKey || !clientCache.has(cacheKey))
  const [error, setError] = useState<string | null>(null)

  const write = useCallback(
    (next: ReminderNotification[]) => {
      if (cacheKey) clientCache.set(cacheKey, next)
      setItems(next)
    },
    [cacheKey],
  )

  useEffect(() => {
    if (!cacheKey) return
    return clientCache.subscribe(cacheKey, () => {
      const cached = clientCache.get<ReminderNotification[]>(cacheKey)
      if (cached) {
        setItems(cached)
        setLoading(false)
      }
    })
  }, [cacheKey])

  const refresh = useCallback(async () => {
    if (!userEmail) return
    try {
      const records = await apiGetReminderNotifications()
      write(records)
      setError(null)
    } catch (err) {
      console.error('Failed to load reminder notifications', err)
      setError('Could not load reminders.')
    } finally {
      setLoading(false)
    }
  }, [userEmail, write])

  useEffect(() => {
    if (!userEmail) return
    let cancelled = false

    const run = () => {
      if (!cancelled && document.visibilityState !== 'hidden') void refresh()
    }

    run()
    const timer = window.setInterval(run, pollMs)
    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', run)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', run)
    }
  }, [userEmail, pollMs, refresh])

  const markRead = useCallback(
    async (serverId: string) => {
      const current = clientCache.get<ReminderNotification[]>(cacheKey) ?? items
      const target = current.find((n) => n.id === serverId)
      if (!target || target.read) return
      const now = new Date().toISOString()
      write(current.map((n) => (n.id === serverId ? { ...n, read: true, readAt: now } : n)))
      try {
        await apiMarkReminderNotificationRead(serverId)
      } catch (err) {
        console.error('Failed to mark reminder notification read', err)
        const latest = clientCache.get<ReminderNotification[]>(cacheKey) ?? current
        write(latest.map((n) => (n.id === serverId ? target : n)))
      }
    },
    [cacheKey, items, write],
  )

  const markAllRead = useCallback(async () => {
    const current = clientCache.get<ReminderNotification[]>(cacheKey) ?? items
    if (!current.some((n) => !n.read)) return
    const now = new Date().toISOString()
    write(current.map((n) => (n.read ? n : { ...n, read: true, readAt: now })))
    try {
      await apiMarkAllReminderNotificationsRead()
    } catch (err) {
      console.error('Failed to mark all reminder notifications read', err)
      write(current)
    }
  }, [cacheKey, items, write])

  return { items, loading, error, refresh, markRead, markAllRead }
}
