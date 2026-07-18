'use client'

import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { InsightsPage } from '@/components/dashboard/insights/insights-page'

export default function DashboardInsightsPage() {
  return (
    <DashboardPageShell>
      <InsightsPage />
    </DashboardPageShell>
  )
}
