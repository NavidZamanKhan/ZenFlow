'use client'

import { cn } from '@/lib/utils'
import { NotificationsBell } from './notifications-bell'
import { UserMenu } from './user-menu'

type HeaderActionsProps = {
  className?: string
}

/** Notification bell + user avatar menu for the dashboard header. */
export function HeaderActions({ className }: HeaderActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center gap-2',
        className,
      )}
    >
      <NotificationsBell />
      <UserMenu />
    </div>
  )
}
