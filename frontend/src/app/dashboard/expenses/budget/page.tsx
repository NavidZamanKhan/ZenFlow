'use client'

import { DashboardPageShell } from '@/components/dashboard/dashboard-page-shell'
import { BudgetPage } from '@/components/dashboard/expenses/budget-page'

export default function DashboardBudgetPage() {
  return (
    <DashboardPageShell>
      <BudgetPage />
    </DashboardPageShell>
  )
}
