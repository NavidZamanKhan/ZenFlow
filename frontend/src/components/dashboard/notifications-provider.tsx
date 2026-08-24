'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { deriveNotifications } from '@/lib/notifications'
import { useTasks } from '@/hooks/use-tasks'
import { useExpenses } from '@/hooks/use-expenses'
import { useBudget } from '@/hooks/use-budget'
import { useEvents } from '@/hooks/use-events'
import type { Notification } from '@/types/notification'

type NotificationsContextValue = {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
}

const READ_STORAGE_KEY = 'zenflow:read_notifications'

function getStoredReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function saveStoredReadIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // Ignore storage quota errors
  }
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { tasks } = useTasks()
  const { expenses } = useExpenses()
  const { budget } = useBudget()
  const { events } = useEvents()

  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())

  // Hydrate read IDs on mount
  useEffect(() => {
    setReadIds(getStoredReadIds())
  }, [])

  // Derive notifications dynamically whenever live data or read state changes
  const notifications = useMemo(() => {
    return deriveNotifications({
      tasks,
      expenses,
      budget,
      events,
      readIds,
    })
  }, [tasks, expenses, budget, events, readIds])

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notifications],
  )

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveStoredReadIds(next)
      return next
    })
  }, [])

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev)
      for (const n of notifications) {
        next.add(n.id)
      }
      saveStoredReadIds(next)
      return next
    })
  }, [notifications])

  const value = useMemo(
    () => ({ notifications, unreadCount, markAsRead, markAllAsRead }),
    [notifications, unreadCount, markAsRead, markAllAsRead],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationsProvider',
    )
  }
  return context
}
