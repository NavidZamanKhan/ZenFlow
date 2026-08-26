import { todayISODate } from '@/lib/dates'
import type { CurrencyCode } from '@/lib/currency'
import type { Expense, ExpenseCategory } from '@/types/expense'

export type ExpenseConverter = (amount: number, currency?: CurrencyCode) => number

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

function currentMonthKey(): string {
  return monthKey(todayISODate())
}

export function getExpenseAmount(expense: Expense, convertFn?: ExpenseConverter): number {
  return convertFn ? convertFn(expense.amount, expense.currency) : expense.amount
}

export function sumAmounts(expenses: Expense[], convertFn?: ExpenseConverter): number {
  return expenses.reduce((sum, expense) => sum + getExpenseAmount(expense, convertFn), 0)
}

export function totalExpenses(expenses: Expense[], convertFn?: ExpenseConverter): number {
  return sumAmounts(expenses, convertFn)
}

export function todaysSpending(expenses: Expense[], convertFn?: ExpenseConverter): number {
  const today = todayISODate()
  return sumAmounts(expenses.filter((expense) => expense.date === today), convertFn)
}

export function monthlySpending(expenses: Expense[], month = currentMonthKey(), convertFn?: ExpenseConverter): number {
  return sumAmounts(expenses.filter((expense) => monthKey(expense.date) === month), convertFn)
}

export function highestSpendingCategory(
  expenses: Expense[],
  convertFn?: ExpenseConverter,
): { category: ExpenseCategory; amount: number } | null {
  if (expenses.length === 0) return null

  const totals = new Map<ExpenseCategory, number>()
  for (const expense of expenses) {
    const amt = getExpenseAmount(expense, convertFn)
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + amt)
  }

  let top: { category: ExpenseCategory; amount: number } | null = null
  for (const [category, amount] of totals) {
    if (!top || amount > top.amount) {
      top = { category, amount }
    }
  }
  return top
}

export function averageDailyExpense(expenses: Expense[], convertFn?: ExpenseConverter): number {
  if (expenses.length === 0) return 0
  const dates = new Set(expenses.map((expense) => expense.date))
  return sumAmounts(expenses, convertFn) / dates.size
}

export function averageMonthlyExpense(expenses: Expense[], convertFn?: ExpenseConverter): number {
  if (expenses.length === 0) return 0
  const months = new Set(expenses.map((expense) => monthKey(expense.date)))
  return sumAmounts(expenses, convertFn) / months.size
}

export function spendingByCategory(expenses: Expense[], convertFn?: ExpenseConverter): Record<ExpenseCategory, number> {
  const totals = {} as Record<ExpenseCategory, number>
  for (const expense of expenses) {
    const amt = getExpenseAmount(expense, convertFn)
    totals[expense.category] = (totals[expense.category] ?? 0) + amt
  }
  return totals
}

export function spendingByPaymentMethod(expenses: Expense[], convertFn?: ExpenseConverter): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const expense of expenses) {
    const amt = getExpenseAmount(expense, convertFn)
    totals[expense.paymentMethod] = (totals[expense.paymentMethod] ?? 0) + amt
  }
  return totals
}

export function monthlyTrend(expenses: Expense[], convertFn?: ExpenseConverter): { month: string; amount: number }[] {
  const totals = new Map<string, number>()
  for (const expense of expenses) {
    const key = monthKey(expense.date)
    const amt = getExpenseAmount(expense, convertFn)
    totals.set(key, (totals.get(key) ?? 0) + amt)
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }))
}
