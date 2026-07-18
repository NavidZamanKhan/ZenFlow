'use client'

import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { CalendarPage } from '@/components/dashboard/calendar/calendar-page'

export default function DashboardCalendarPage() {
  return (
    <DashboardPageShell>
      <CalendarPage />
    </DashboardPageShell>
  )
}
