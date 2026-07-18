import {
  averageDailyExpense,
  averageMonthlyExpense,
  highestSpendingCategory,
  monthlySpending,
  monthlyTrend,
  spendingByCategory,
  spendingByPaymentMethod,
  sumAmounts,
} from '@/lib/expense-stats'
import { todayISODate } from '@/lib/dates'
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type Expense,
  type ExpenseCategory,
  type PaymentMethod,
} from '@/types/expense'

export interface SpendingPoint {
  key: string
  amount: number
  transactions: number
}

export interface CategoryBreakdown {
  category: ExpenseCategory
  amount: number
  percentage: number
  transactions: number
}

export interface PaymentBreakdown {
  paymentMethod: PaymentMethod
  amount: number
  percentage: number
  transactions: number
}

export interface CategoryMovement {
  category: ExpenseCategory
  amount: number
  percentage: number | null
}

export interface SpendingDay {
  date: string
  amount: number
  transactions: number
}

export interface InsightsAnalytics {
  total: number
  thisMonth: number
  lastMonth: number
  averageDaily: number
  averageMonthly: number
  highestCategory: ReturnType<typeof highestSpendingCategory>
  lowestCategory: CategoryBreakdown | null
  totalTransactions: number
  currentMonthTransactions: number
  monthChangePercentage: number | null
  monthlyTrend: SpendingPoint[]
  categoryBreakdown: CategoryBreakdown[]
  weeklySpending: SpendingPoint[]
  dailySpending: SpendingPoint[]
  paymentDistribution: PaymentBreakdown[]
  biggestCategoryIncrease: CategoryMovement | null
  biggestCategoryDecrease: CategoryMovement | null
  mostActiveDay: SpendingDay | null
  mostExpensiveDay: SpendingDay | null
  largestExpense: Expense | null
  averageTransactionValue: number
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

function previousMonthKey(currentMonth: string): string {
  const [year, month] = currentMonth.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 2, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function shiftISODate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function percentageOf(amount: number, total: number): number {
  return total > 0 ? (amount / total) * 100 : 0
}

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

function aggregateDays(expenses: Expense[]): Map<string, SpendingDay> {
  const days = new Map<string, SpendingDay>()
  for (const expense of expenses) {
    const existing = days.get(expense.date)
    days.set(expense.date, {
      date: expense.date,
      amount: (existing?.amount ?? 0) + expense.amount,
      transactions: (existing?.transactions ?? 0) + 1,
    })
  }
  return days
}

export function categoryBreakdown(expenses: Expense[]): CategoryBreakdown[] {
  const total = sumAmounts(expenses)
  const totals = spendingByCategory(expenses)

  return EXPENSE_CATEGORIES.map((category) => {
    const categoryExpenses = expenses.filter((expense) => expense.category === category)
    const amount = totals[category] ?? 0
    return {
      category,
      amount,
      percentage: percentageOf(amount, total),
      transactions: categoryExpenses.length,
    }
  })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

export function paymentBreakdown(expenses: Expense[]): PaymentBreakdown[] {
  const total = sumAmounts(expenses)
  const totals = spendingByPaymentMethod(expenses)

  return PAYMENT_METHODS.map((paymentMethod) => {
    const methodExpenses = expenses.filter(
      (expense) => expense.paymentMethod === paymentMethod,
    )
    const amount = totals[paymentMethod] ?? 0
    return {
      paymentMethod,
      amount,
      percentage: percentageOf(amount, total),
      transactions: methodExpenses.length,
    }
  })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

export function weeklySpending(
  expenses: Expense[],
  referenceDate = todayISODate(),
): SpendingPoint[] {
  const days = aggregateDays(expenses)
  return Array.from({ length: 7 }, (_, index) => {
    const key = shiftISODate(referenceDate, index - 6)
    const day = days.get(key)
    return {
      key,
      amount: day?.amount ?? 0,
      transactions: day?.transactions ?? 0,
    }
  })
}

export function dailySpending(
  expenses: Expense[],
  referenceDate = todayISODate(),
): SpendingPoint[] {
  const currentMonth = monthKey(referenceDate)
  const lastDay = Number(referenceDate.slice(8, 10))
  const days = aggregateDays(expenses)

  return Array.from({ length: lastDay }, (_, index) => {
    const key = `${currentMonth}-${String(index + 1).padStart(2, '0')}`
    const day = days.get(key)
    return {
      key,
      amount: day?.amount ?? 0,
      transactions: day?.transactions ?? 0,
    }
  })
}

export function categoryMovements(
  expenses: Expense[],
  referenceDate = todayISODate(),
): { increase: CategoryMovement | null; decrease: CategoryMovement | null } {
  const currentMonth = monthKey(referenceDate)
  const lastMonth = previousMonthKey(currentMonth)
  const currentTotals = spendingByCategory(
    expenses.filter((expense) => monthKey(expense.date) === currentMonth),
  )
  const previousTotals = spendingByCategory(
    expenses.filter((expense) => monthKey(expense.date) === lastMonth),
  )

  const movements = EXPENSE_CATEGORIES.map((category) => {
    const current = currentTotals[category] ?? 0
    const previous = previousTotals[category] ?? 0
    return {
      category,
      amount: current - previous,
      percentage: percentageChange(current, previous),
    }
  })

  const increase = movements
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0] ?? null
  const decrease = movements
    .filter((item) => item.amount < 0)
    .sort((a, b) => a.amount - b.amount)[0] ?? null

  return { increase, decrease }
}

export function buildInsightsAnalytics(
  expenses: Expense[],
  referenceDate = todayISODate(),
): InsightsAnalytics {
  const currentMonth = monthKey(referenceDate)
  const lastMonth = previousMonthKey(currentMonth)
  const currentMonthExpenses = expenses.filter(
    (expense) => monthKey(expense.date) === currentMonth,
  )
  const days = [...aggregateDays(expenses).values()]
  const breakdown = categoryBreakdown(expenses)
  const movements = categoryMovements(expenses, referenceDate)
  const trendTransactions = new Map<string, number>()

  for (const expense of expenses) {
    const key = monthKey(expense.date)
    trendTransactions.set(key, (trendTransactions.get(key) ?? 0) + 1)
  }

  const trend = monthlyTrend(expenses).map((point) => ({
    key: point.month,
    amount: point.amount,
    transactions: trendTransactions.get(point.month) ?? 0,
  }))

  const thisMonth = monthlySpending(expenses, currentMonth)
  const lastMonthTotal = monthlySpending(expenses, lastMonth)

  return {
    total: sumAmounts(expenses),
    thisMonth,
    lastMonth: lastMonthTotal,
    averageDaily: averageDailyExpense(expenses),
    averageMonthly: averageMonthlyExpense(expenses),
    highestCategory: highestSpendingCategory(expenses),
    lowestCategory: breakdown.at(-1) ?? null,
    totalTransactions: expenses.length,
    currentMonthTransactions: currentMonthExpenses.length,
    monthChangePercentage: percentageChange(thisMonth, lastMonthTotal),
    monthlyTrend: trend,
    categoryBreakdown: breakdown,
    weeklySpending: weeklySpending(expenses, referenceDate),
    dailySpending: dailySpending(expenses, referenceDate),
    paymentDistribution: paymentBreakdown(expenses),
    biggestCategoryIncrease: movements.increase,
    biggestCategoryDecrease: movements.decrease,
    mostActiveDay:
      [...days].sort(
        (a, b) => b.transactions - a.transactions || b.amount - a.amount,
      )[0] ?? null,
    mostExpensiveDay:
      [...days].sort(
        (a, b) => b.amount - a.amount || b.transactions - a.transactions,
      )[0] ?? null,
    largestExpense:
      [...expenses].sort(
        (a, b) => b.amount - a.amount || b.date.localeCompare(a.date),
      )[0] ?? null,
    averageTransactionValue: expenses.length > 0 ? sumAmounts(expenses) / expenses.length : 0,
  }
}
