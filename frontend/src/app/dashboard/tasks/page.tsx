'use client'

import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { TasksPage } from '@/components/dashboard/tasks/tasks-page'

export default function DashboardTasksPage() {
  return (
    <DashboardPageShell>
      <TasksPage />
    </DashboardPageShell>
  )
}
