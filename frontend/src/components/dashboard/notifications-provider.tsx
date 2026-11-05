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
import { useDayRange, useEvents } from '@/hooks/use-events'
import {
  fromReminderNotificationId,
  toNotification,
  useReminderNotifications,
} from '@/hooks/use-reminder-notifications'
import { useCurrency } from '@/lib/currency-context'
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

function sortNotifications(list: Notification[]): Notification[] {
  return [...list].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { tasks } = useTasks()
  const { expenses } = useExpenses()
  const { budget } = useBudget()
  // Derived event reminders only look at today and tomorrow.
  const eventRange = useDayRange(0, 2)
  const { events } = useEvents(eventRange)
  const { currency, convert } = useCurrency()
  const {
    items: reminderItems,
    markRead: markReminderRead,
    markAllRead: markAllRemindersRead,
  } = useReminderNotifications()

  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())

  // Hydrate read IDs on mount
  useEffect(() => {
    setReadIds(getStoredReadIds())
  }, [])

  // Derived (client-side) notifications: tasks, events, budget thresholds.
  // Budget alerts honour the user's configurable `warningThresholds` and are
  // evaluated after converting every amount into the display currency.
  const derived = useMemo(() => {
    return deriveNotifications({
      tasks,
      expenses,
      budget,
      events,
      readIds,
      currency,
      convert,
    })
  }, [tasks, expenses, budget, events, readIds, currency, convert])

  // Server-side reminder notifications (fired by the scheduler).
  const reminderNotifications = useMemo(
    () => reminderItems.map(toNotification),
    [reminderItems],
  )

  const notifications = useMemo(
    () => sortNotifications([...reminderNotifications, ...derived]),
    [reminderNotifications, derived],
  )

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notifications],
  )

  const markAsRead = useCallback((id: string) => {
    const serverId = fromReminderNotificationId(id)
    if (serverId) {
      void markReminderRead(serverId)
      return
    }
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveStoredReadIds(next)
      return next
    })
  }, [markReminderRead])

  const markAllAsRead = useCallback(() => {
    void markAllRemindersRead()
    setReadIds((prev) => {
      const next = new Set(prev)
      for (const n of derived) {
        next.add(n.id)
      }
      saveStoredReadIds(next)
      return next
    })
  }, [derived, markAllRemindersRead])

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
