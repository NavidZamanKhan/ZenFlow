/** Shared date helpers for the Tasks and Calendar modules. */

/** Format an ISO date (yyyy-mm-dd) or datetime string as e.g. "Jul 18, 2026". */
export function formatDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
export function isOverdue(isoDate: string): boolean {
  return isoDate < todayISODate()
}
