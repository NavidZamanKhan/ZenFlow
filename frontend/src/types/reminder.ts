// ---------------------------------------------------------------------------
// Reminder domain types - /api/reminders/ and /api/reminders/notifications/
// ---------------------------------------------------------------------------

export type ReminderChannel = 'in_app' | 'email' | 'both'
/** `failed` = email delivery gave up after the server's retry budget. */
export type ReminderStatus = 'scheduled' | 'sent' | 'cancelled' | 'failed'

export interface Reminder {
  id: string
  title: string
  message: string
  /** ISO-8601 datetime at which the reminder fires. */
  remindAt: string
  channel: ReminderChannel
  status: ReminderStatus
  sentAt: string | null
  lastError: string
  /** Email delivery bookkeeping (read-only; only meaningful for email/both). */
  emailSentAt: string | null
  emailAttempts: number
  nextAttemptAt: string | null
  taskId: string | null
  eventId: number | string | null
  createdAt: string
  updatedAt: string
}

export interface ReminderInput {
  title: string
  message?: string
  remindAt: string
  channel?: ReminderChannel
  /** Clients may only schedule or cancel; `sent`/`failed` are scheduler-owned. */
  status?: Exclude<ReminderStatus, 'sent' | 'failed'>
  taskId?: string | null
  eventId?: number | string | null
}

export interface ReminderNotification {
  id: string
  reminderId: string | null
  title: string
  body: string
  href: string
  read: boolean
  readAt: string | null
  createdAt: string
}
