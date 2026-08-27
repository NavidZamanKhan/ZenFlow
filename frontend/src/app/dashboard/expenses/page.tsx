'use client'

import dynamic from 'next/dynamic'
import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { Skeleton } from '@/components/ui/skeleton'

const ExpensesPage = dynamic(
  () =>
    import('@/components/dashboard/expenses/expenses-page').then(
      (module) => module.ExpensesPage,
    ),
  {
    loading: () => (
      <div className="max-w-5xl px-4 py-8 sm:px-8" aria-label="Loading expenses">
        <Skeleton className="mb-6 h-7 w-28 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    ),
  },
)

export default function DashboardExpensesPage() {
  return (
    <DashboardPageShell>
      <ExpensesPage />
    </DashboardPageShell>
  )
}
