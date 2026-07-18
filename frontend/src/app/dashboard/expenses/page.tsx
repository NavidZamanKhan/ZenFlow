'use client'

import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { ExpensesPage } from '@/components/dashboard/expenses/expenses-page'

export default function DashboardExpensesPage() {
  return (
    <DashboardPageShell>
      <ExpensesPage />
    </DashboardPageShell>
  )
}
