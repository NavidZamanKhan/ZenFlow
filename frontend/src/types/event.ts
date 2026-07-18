export interface CalendarEvent {
  id: string
  title: string
  description: string
  /** ISO datetime string */
  start: string
  /** ISO datetime string */
  end: string
  allDay: boolean
  createdAt: string
  updatedAt: string
}

export type CalendarEventInput = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
