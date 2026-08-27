'use client'

import dynamic from 'next/dynamic'
import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { Skeleton } from '@/components/ui/skeleton'

const TasksPage = dynamic(
  () =>
    import('@/components/dashboard/tasks/tasks-page').then(
      (module) => module.TasksPage,
    ),
  {
    loading: () => (
      <div className="max-w-5xl px-4 py-8 sm:px-8" aria-label="Loading tasks">
        <Skeleton className="mb-6 h-7 w-24 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    ),
  },
)

export default function DashboardTasksPage() {
  return (
    <DashboardPageShell>
      <TasksPage />
    </DashboardPageShell>
  )
}
