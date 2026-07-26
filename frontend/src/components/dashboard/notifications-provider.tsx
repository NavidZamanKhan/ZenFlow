'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createDummyNotifications } from '@/lib/dummy-notifications'
import type { Notification } from '@/types/notification'

type NotificationsContextValue = {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    createDummyNotifications(),
  )

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notifications],
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((item) => (item.read ? item : { ...item, read: true })),
    )
  }, [])

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
