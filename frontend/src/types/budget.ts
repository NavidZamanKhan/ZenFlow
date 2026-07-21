import type { ExpenseCategory } from '@/types/expense'

export const DEFAULT_BUDGET_THRESHOLDS = [50, 75, 90, 100] as const

export type BudgetAlertHistory = Record<
  string,
  Partial<Record<ExpenseCategory, number[]>>
>

export interface Budget {
  monthlyTotal: number
  categoryBudgets: Record<ExpenseCategory, number>
  warningThresholds: number[]
  alertedThresholds: BudgetAlertHistory
  createdAt: string
  updatedAt: string
}

export type BudgetValues = Pick<
  Budget,
  'monthlyTotal' | 'categoryBudgets' | 'warningThresholds'
>
