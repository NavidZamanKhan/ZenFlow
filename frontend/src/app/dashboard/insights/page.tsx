'use client'

import dynamic from 'next/dynamic'
import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { Skeleton } from '@/components/ui/skeleton'

const InsightsPage = dynamic(
  () =>
    import('@/components/dashboard/insights/insights-page').then(
      (module) => module.InsightsPage,
    ),
  {
    loading: () => (
      <div
        className="max-w-5xl px-4 py-8 sm:px-8"
        aria-label="Loading insights"
      >
        <div className="mb-6 space-y-2">
          <Skeleton className="h-3 w-48 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[350px] rounded-3xl" />
          <Skeleton className="h-[350px] rounded-3xl" />
        </div>
      </div>
    ),
  },
)

export default function DashboardInsightsPage() {
  return (
    <DashboardPageShell>
      <InsightsPage />
    </DashboardPageShell>
  )
}
