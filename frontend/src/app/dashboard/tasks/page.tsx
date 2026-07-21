'use client'

import { Suspense } from 'react'
import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { TasksPage } from '@/components/dashboard/tasks/tasks-page'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardTasksPage() {
  return (
    <DashboardPageShell>
      <Suspense
        fallback={
          <div className="max-w-5xl px-4 py-8 sm:px-8" aria-label="Loading tasks">
            <Skeleton className="mb-6 h-7 w-24 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        }
      >
        <TasksPage />
      </Suspense>
    </DashboardPageShell>
  )
}
