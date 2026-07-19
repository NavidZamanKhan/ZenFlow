'use client'

import dynamic from 'next/dynamic'
import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { Skeleton } from '@/components/ui/skeleton'

const CalendarPage = dynamic(
  () =>
    import('@/components/dashboard/calendar/calendar-page').then(
      (module) => module.CalendarPage,
    ),
  {
    loading: () => (
      <div
        className="max-w-5xl px-4 py-8 sm:px-8"
        aria-label="Loading calendar"
      >
        <div className="mb-6 space-y-2">
          <Skeleton className="h-3 w-44 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-3xl" />
      </div>
    ),
  },
)

export default function DashboardCalendarPage() {
  return (
    <DashboardPageShell>
      <CalendarPage />
    </DashboardPageShell>
  )
}
