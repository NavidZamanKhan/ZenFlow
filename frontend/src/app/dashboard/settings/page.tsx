'use client'

import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { SettingsPage } from '@/components/dashboard/settings/settings-page'

export default function DashboardSettingsPage() {
  return (
    <DashboardPageShell>
      <SettingsPage />
    </DashboardPageShell>
  )
}
