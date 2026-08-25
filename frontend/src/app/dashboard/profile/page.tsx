'use client'

import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { ProfilePage } from '@/components/dashboard/profile/profile-page'

export default function DashboardProfilePage() {
  return (
    <DashboardPageShell>
      <ProfilePage />
    </DashboardPageShell>
  )
}
