import { todayISODate } from '@/lib/dates'
import type { Expense, ExpenseCategory } from '@/types/expense'

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

function currentMonthKey(): string {
  return monthKey(todayISODate())
}

export function sumAmounts(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0)
}

export function totalExpenses(expenses: Expense[]): number {
  return sumAmounts(expenses)
}

export function todaysSpending(expenses: Expense[]): number {
  const today = todayISODate()
  return sumAmounts(expenses.filter((expense) => expense.date === today))
}

export function monthlySpending(expenses: Expense[], month = currentMonthKey()): number {
  return sumAmounts(expenses.filter((expense) => monthKey(expense.date) === month))
}

export function highestSpendingCategory(
  expenses: Expense[],
): { category: ExpenseCategory; amount: number } | null {
  if (expenses.length === 0) return null

  const totals = new Map<ExpenseCategory, number>()
  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount)
  }

  let top: { category: ExpenseCategory; amount: number } | null = null
  for (const [category, amount] of totals) {
    if (!top || amount > top.amount) {
      top = { category, amount }
    }
  }
  return top
}

export function averageDailyExpense(expenses: Expense[]): number {
  if (expenses.length === 0) return 0
  const dates = new Set(expenses.map((expense) => expense.date))
  return sumAmounts(expenses) / dates.size
}

export function averageMonthlyExpense(expenses: Expense[]): number {
  if (expenses.length === 0) return 0
  const months = new Set(expenses.map((expense) => monthKey(expense.date)))
  return sumAmounts(expenses) / months.size
}

export function spendingByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const totals = {} as Record<ExpenseCategory, number>
  for (const expense of expenses) {
    totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount
  }
  return totals
}

export function spendingByPaymentMethod(expenses: Expense[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const expense of expenses) {
    totals[expense.paymentMethod] = (totals[expense.paymentMethod] ?? 0) + expense.amount
  }
  return totals
}

export function monthlyTrend(expenses: Expense[]): { month: string; amount: number }[] {
  const totals = new Map<string, number>()
  for (const expense of expenses) {
    const key = monthKey(expense.date)
    totals.set(key, (totals.get(key) ?? 0) + expense.amount)
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }))
}
