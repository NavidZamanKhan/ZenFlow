/** Frontend notification shape - swap the data source later without changing renderers. */
export type NotificationType = 'budget' | 'task' | 'reminder'

export type Notification = {
  id: string
  type: NotificationType
  title: string
  description: string
  read: boolean
  /** ISO-8601 timestamp; UI derives a relative label from this. */
  timestamp: string
  /** Route to navigate to when clicked (e.g. /dashboard/tasks). */
  href?: string
}
