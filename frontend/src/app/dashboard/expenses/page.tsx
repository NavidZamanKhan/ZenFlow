'use client'

import { Suspense } from 'react'
import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { ExpensesPage } from '@/components/dashboard/expenses/expenses-page'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardExpensesPage() {
  return (
    <DashboardPageShell>
      <Suspense
        fallback={
          <div className="max-w-5xl px-4 py-8 sm:px-8" aria-label="Loading expenses">
            <Skeleton className="mb-6 h-7 w-28 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        }
      >
        <ExpensesPage />
      </Suspense>
    </DashboardPageShell>
  )
}
