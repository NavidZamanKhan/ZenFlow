'use client'

import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCheck,
  CheckSquare2,
  Clock3,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/notification'
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useNotifications } from './notifications-provider'

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  budget: Wallet,
  task: CheckSquare2,
  reminder: Clock3,
}

const TYPE_ICON_WRAP: Record<NotificationType, string> = {
  budget: 'bg-[var(--zf-accent-soft)] text-[var(--zf-accent)] dark:bg-[var(--zf-soft-fill)] dark:text-[var(--zf-accent)]',
  task: 'bg-[var(--zf-accent-soft)] text-[var(--zf-accent)] dark:bg-[var(--zf-soft-fill)] dark:text-[var(--zf-accent)]',
  reminder: 'bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400',
}

function NotificationRow({
  notification,
  onSelect,
}: {
  notification: Notification
  onSelect: (notification: Notification) => void
}) {
  const Icon = TYPE_ICON[notification.type]

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(notification)}
        className={cn(
          'flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zf-accent)]',
          notification.read
            ? 'hover:bg-slate-50/80 opacity-75 dark:hover:bg-[var(--zf-soft-fill)]/80'
            : 'bg-[var(--zf-accent-light-bg)] hover:bg-[var(--zf-accent-soft)]/70 dark:bg-[var(--zf-soft-fill)] dark:hover:bg-[var(--zf-elevated)]',
        )}
      >
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl',
            TYPE_ICON_WRAP[notification.type],
          )}
        >
          <Icon size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm',
                notification.read
                  ? 'font-medium text-slate-600 dark:text-[var(--zf-text-muted)]'
                  : 'font-semibold text-slate-800 dark:text-[var(--zf-text)]',
              )}
            >
              {notification.title}
            </span>
            {!notification.read ? (
              <span
                className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500"
                aria-hidden="true"
              />
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-[var(--zf-text-muted)]">
            {notification.description}
          </span>
          <span className="mt-1 block text-[11px] font-medium text-slate-400 dark:text-[var(--zf-text-muted)]/80">
            {formatRelativeTime(notification.timestamp)}
          </span>
        </span>
      </button>
    </li>
  )
}

/**
 * Bell trigger + unread badge + dynamic notification list popover.
 * Data comes from NotificationsProvider derived from user tasks, budget, and events.
 */
export function NotificationsBell() {
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const showEmpty = notifications.length === 0

  const handleSelect = (item: Notification) => {
    markAsRead(item.id)
    if (item.href) {
      router.push(item.href)
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        className="zf-tap relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zf-accent)] dark:text-[var(--zf-text-muted)] dark:hover:bg-[var(--zf-soft-fill)] dark:hover:text-[var(--zf-text)]"
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="flex w-[min(22rem,calc(100vw-2rem))] flex-col border border-slate-100 bg-white p-0 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-[var(--zf-border)]">
          <PopoverTitle className="dark:text-[var(--zf-text)]">Notifications</PopoverTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <>
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums dark:text-[var(--zf-text-muted)]">
                  {unreadCount} unread
                </span>
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  title="Mark all as read"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-[var(--zf-accent)] transition-colors hover:bg-[var(--zf-accent-soft)] dark:text-[var(--zf-accent)] dark:hover:bg-[var(--zf-accent-soft)]"
                >
                  <CheckCheck size={12} aria-hidden="true" />
                  <span>Mark all read</span>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {showEmpty ? (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--zf-accent-soft)] dark:bg-[var(--zf-soft-fill)]">
              <Bell size={18} className="text-[var(--zf-accent)]" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-[var(--zf-text)]">
              You&apos;re all caught up
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-[var(--zf-text-muted)]">
              New budget alerts, task reminders, and nudges will show up here.
            </p>
          </div>
        ) : (
          <ul className="max-h-[min(22rem,60vh)] space-y-0.5 overflow-y-auto p-2">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onSelect={handleSelect}
              />
            ))}
          </ul>
        )}

        {unreadCount > 0 ? (
          <div className="border-t border-slate-100 p-2 dark:border-[var(--zf-border)]">
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="w-full rounded-xl px-3 py-2 text-center text-xs font-semibold text-[var(--zf-accent)] transition-colors hover:bg-[var(--zf-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zf-accent)] dark:text-[var(--zf-accent)] dark:hover:bg-[var(--zf-accent-soft)]"
            >
              Mark all as read
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

