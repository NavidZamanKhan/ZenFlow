/** Shared date helpers for the Tasks and Calendar modules. */

/** Format an ISO date (yyyy-mm-dd) or datetime string as e.g. "Jul 18, 2026". */
export function formatDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Format a local HH:mm (or HH:mm:ss) string as e.g. "2:30 PM". */
export function formatTimeFromHHMM(hhmm: string): string {
  const [hours, minutes] = hhmm.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Format task due date and optional time, e.g. "Aug 30, 2026 · 10:30 AM". */
export function formatTaskDue(dueDate: string, dueTime: string | null): string {
  const datePart = formatDate(dueDate)
  if (!dueTime) return datePart
  return `${datePart} · ${formatTimeFromHHMM(dueTime)}`
}

/** Format an ISO datetime as e.g. "2:30 PM". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Today as a yyyy-mm-dd string in local time. */
export function todayISODate(): string {
  return toISODate(new Date())
}

/** Convert a Date to a local yyyy-mm-dd string. */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Convert a Date to a local yyyy-mm-ddThh:mm string (for datetime-local inputs). */
export function toISODateTimeLocal(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${toISODate(date)}T${h}:${min}`
}

/** True when the ISO date (yyyy-mm-dd) is strictly before today. */
export function isOverdue(isoDate: string, dueTime?: string | null): boolean {
  const today = todayISODate()
  if (isoDate < today) return true
  if (isoDate > today) return false
  if (!dueTime) return false
  const [hours, minutes] = dueTime.split(':').map(Number)
  const now = new Date()
  const due = new Date(now)
  due.setHours(hours, minutes, 0, 0)
  return now >= due
}

/** Sort key comparison: date first, then time (null time before timed on same day). */
export function compareDueDateTime(
  a: { dueDate: string | null; dueTime: string | null },
  b: { dueDate: string | null; dueTime: string | null },
): number {
  if (a.dueDate === null && b.dueDate === null) return 0
  if (a.dueDate === null) return 1
  if (b.dueDate === null) return -1
  const dateCmp = a.dueDate.localeCompare(b.dueDate)
  if (dateCmp !== 0) return dateCmp
  const aTime = a.dueTime ?? ''
  const bTime = b.dueTime ?? ''
  return aTime.localeCompare(bTime)
}

/** Compact relative label for recent timestamps (e.g. "Just now", "18m ago", "2d ago"). */
export function formatRelativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  if (Number.isNaN(then.getTime()) || diffMs < 0) return formatDate(iso)

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return formatDate(iso)
}
