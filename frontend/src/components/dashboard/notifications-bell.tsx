'use client'

import {
  Bell,
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
  budget: 'bg-[#E2EEFC] text-[#1D70E8]',
  task: 'bg-[#E2EEFC] text-[#1D70E8]',
  reminder: 'bg-teal-50 text-teal-600',
}

function NotificationRow({
  notification,
  onSelect,
}: {
  notification: Notification
  onSelect: (id: string) => void
}) {
  const Icon = TYPE_ICON[notification.type]

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(notification.id)}
        className={cn(
          'flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D70E8]',
          notification.read
            ? 'hover:bg-slate-50/80'
            : 'bg-[#F5F9FE] hover:bg-[#E2EEFC]/70',
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
                  ? 'font-medium text-slate-600'
                  : 'font-semibold text-slate-800',
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
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
            {notification.description}
          </span>
          <span className="mt-1 block text-[11px] font-medium text-slate-400">
            {formatRelativeTime(notification.timestamp)}
          </span>
        </span>
      </button>
    </li>
  )
}

/**
 * Bell trigger + unread badge + notification list popover.
 * Data comes from NotificationsProvider (dummy today, API-ready shape).
 */
export function NotificationsBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications()
  const showEmpty = unreadCount === 0

  return (
    <Popover>
      <PopoverTrigger
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        className="zf-tap relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D70E8]"
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
        className="flex w-[min(20rem,calc(100vw-2rem))] flex-col p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <PopoverTitle>Notifications</PopoverTitle>
          {unreadCount > 0 ? (
            <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {unreadCount} unread
            </span>
          ) : null}
        </div>

        {showEmpty ? (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E2EEFC]">
              <Bell size={18} className="text-[#1D70E8]" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              You&apos;re all caught up
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              New budget alerts, task reminders, and nudges will show up here.
            </p>
          </div>
        ) : (
          <ul className="max-h-[min(22rem,60vh)] space-y-0.5 overflow-y-auto p-2">
            {notifications
              .filter((item) => !item.read)
              .map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onSelect={markAsRead}
                />
              ))}
          </ul>
        )}

        <div className="border-t border-slate-100 p-2">
          <button
            type="button"
            className="w-full rounded-xl px-3 py-2 text-center text-xs font-semibold text-[#1D70E8] transition-colors hover:bg-[#E2EEFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D70E8]"
          >
            View all
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
