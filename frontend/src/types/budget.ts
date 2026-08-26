import type { ExpenseCategory } from '@/types/expense'
import type { CurrencyCode } from '@/lib/currency'

export const DEFAULT_BUDGET_THRESHOLDS = [50, 75, 90, 100] as const

export type BudgetAlertHistory = Record<
  string,
  Partial<Record<ExpenseCategory, number[]>>
>

export interface Budget {
  monthlyTotal: number
  currency: CurrencyCode
  categoryBudgets: Record<ExpenseCategory, number>
  warningThresholds: number[]
  alertedThresholds: BudgetAlertHistory
  createdAt: string
  updatedAt: string
}

export type BudgetValues = Pick<
  Budget,
  'monthlyTotal' | 'currency' | 'categoryBudgets' | 'warningThresholds'
>

export type ThresholdAlert = {
  category: ExpenseCategory
  threshold: number
}
