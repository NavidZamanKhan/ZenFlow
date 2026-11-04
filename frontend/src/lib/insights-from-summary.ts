/**
 * Builds the Insights dashboard model from the server-side aggregation
 * (`GET /api/analytics/summary/`). All GROUP BY work happens in the database;
 * this module only converts each currency bucket into the display currency
 * and shapes the result for the existing Recharts views.
 */

import { todayISODate } from '@/lib/dates'
import type { ExpenseConverter } from '@/lib/expense-stats'
import type {
  CategoryBreakdown,
  CategoryMovement,
  InsightsAnalytics,
  LargestExpense,
  PaymentBreakdown,
  SpendingDay,
  SpendingPoint,
} from '@/lib/insights-stats'
import type {
  AnalyticsBucket,
  AnalyticsLargestExpense,
  AnalyticsSummary,
} from '@/types/analytics'
import type { ExpenseCategory, PaymentMethod } from '@/types/expense'

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

type Totals = { amount: number; transactions: number }

/** Sum currency buckets sharing `keyOf(bucket)` after converting each to the display currency. */
function collapse<T extends AnalyticsBucket>(
  buckets: T[],
  keyOf: (bucket: T) => string,
  convert: ExpenseConverter,
): Map<string, Totals> {
  const out = new Map<string, Totals>()
  for (const bucket of buckets) {
    const key = keyOf(bucket)
    const amount = convert(Number(bucket.amount) || 0, bucket.currency)
    const existing = out.get(key)
    out.set(key, {
      amount: (existing?.amount ?? 0) + amount,
      transactions: (existing?.transactions ?? 0) + bucket.transactions,
    })
  }
  return out
}

function sumTotals(map: Map<string, Totals>): number {
  let total = 0
  for (const value of map.values()) total += value.amount
  return total
}

/**
 * Pick the overall largest expense from the server's per-currency candidates.
 * Each candidate is converted to the display currency first, so a 20 USD
 * expense can correctly beat a 1500 BDT one. Ties on the converted amount go
 * to the most recent expense, mirroring the server's within-currency order.
 */
export function selectLargestExpense(
  candidates: AnalyticsLargestExpense[],
  convert: ExpenseConverter,
): LargestExpense | null {
  let winner: LargestExpense | null = null
  for (const candidate of candidates) {
    const amount = convert(Number(candidate.amount) || 0, candidate.currency)
    if (
      winner === null ||
      amount > winner.amount ||
      (amount === winner.amount && candidate.date > winner.date)
    ) {
      winner = { ...candidate, amount }
    }
  }
  return winner
}

export function buildInsightsFromSummary(
  summary: AnalyticsSummary,
  convert: ExpenseConverter,
  referenceDate = todayISODate(),
): InsightsAnalytics {
  const currentMonth = monthKey(referenceDate)
  const lastMonth = previousMonthKey(currentMonth)

  const byCategory = collapse(summary.byCategory, (b) => b.category, convert)
  const byMonth = collapse(summary.byMonth, (b) => b.month, convert)
  const byDay = collapse(summary.byDay, (b) => b.date, convert)
  const byPayment = collapse(summary.byPaymentMethod, (b) => b.paymentMethod, convert)
  const byMonthCategory = collapse(
    summary.byMonthCategory,
    (b) => `${b.month}|${b.category}`,
    convert,
  )

  const total = sumTotals(byCategory)
  const totalTransactions = summary.transactions

  // -- Category breakdown ---------------------------------------------------
  const categoryBreakdown: CategoryBreakdown[] = [...byCategory.entries()]
    .map(([category, totals]) => ({
      category: category as ExpenseCategory,
      amount: totals.amount,
      percentage: percentageOf(totals.amount, total),
      transactions: totals.transactions,
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  // -- Payment distribution -------------------------------------------------
  const paymentDistribution: PaymentBreakdown[] = [...byPayment.entries()]
    .map(([paymentMethod, totals]) => ({
      paymentMethod: paymentMethod as PaymentMethod,
      amount: totals.amount,
      percentage: percentageOf(totals.amount, total),
      transactions: totals.transactions,
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  // -- Monthly trend ----------------------------------------------------------
  const monthlyTrend: SpendingPoint[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, totals]) => ({ key, amount: totals.amount, transactions: totals.transactions }))

  const thisMonth = byMonth.get(currentMonth)?.amount ?? 0
  const lastMonthTotal = byMonth.get(lastMonth)?.amount ?? 0

  // -- Daily series -----------------------------------------------------------
  const weeklySpending: SpendingPoint[] = Array.from({ length: 7 }, (_, index) => {
    const key = shiftISODate(referenceDate, index - 6)
    const day = byDay.get(key)
    return { key, amount: day?.amount ?? 0, transactions: day?.transactions ?? 0 }
  })

  const lastDay = Number(referenceDate.slice(8, 10))
  const dailySpending: SpendingPoint[] = Array.from({ length: lastDay }, (_, index) => {
    const key = `${currentMonth}-${String(index + 1).padStart(2, '0')}`
    const day = byDay.get(key)
    return { key, amount: day?.amount ?? 0, transactions: day?.transactions ?? 0 }
  })

  // -- Category movements (this month vs last month) --------------------------
  const categories = new Set<string>()
  for (const key of byMonthCategory.keys()) {
    const [month, category] = key.split('|')
    if (month === currentMonth || month === lastMonth) categories.add(category)
  }
  const movements: CategoryMovement[] = [...categories].map((category) => {
    const current = byMonthCategory.get(`${currentMonth}|${category}`)?.amount ?? 0
    const previous = byMonthCategory.get(`${lastMonth}|${category}`)?.amount ?? 0
    return {
      category: category as ExpenseCategory,
      amount: current - previous,
      percentage: percentageChange(current, previous),
    }
  })
  const biggestCategoryIncrease =
    movements.filter((m) => m.amount > 0).sort((a, b) => b.amount - a.amount)[0] ?? null
  const biggestCategoryDecrease =
    movements.filter((m) => m.amount < 0).sort((a, b) => a.amount - b.amount)[0] ?? null

  // -- Day records --------------------------------------------------------------
  const days: SpendingDay[] = [...byDay.entries()].map(([date, totals]) => ({
    date,
    amount: totals.amount,
    transactions: totals.transactions,
  }))
  const mostActiveDay =
    [...days].sort((a, b) => b.transactions - a.transactions || b.amount - a.amount)[0] ?? null
  const mostExpensiveDay =
    [...days].sort((a, b) => b.amount - a.amount || b.transactions - a.transactions)[0] ?? null

  const highestCategory = categoryBreakdown[0]
    ? { category: categoryBreakdown[0].category, amount: categoryBreakdown[0].amount }
    : null

  const largestExpense = selectLargestExpense(summary.largestExpenses, convert)

  return {
    total,
    thisMonth,
    lastMonth: lastMonthTotal,
    averageDaily: summary.activeDays > 0 ? total / summary.activeDays : 0,
    averageMonthly: summary.activeMonths > 0 ? total / summary.activeMonths : 0,
    highestCategory,
    lowestCategory: categoryBreakdown.at(-1) ?? null,
    totalTransactions,
    currentMonthTransactions: byMonth.get(currentMonth)?.transactions ?? 0,
    monthChangePercentage: percentageChange(thisMonth, lastMonthTotal),
    monthlyTrend,
    categoryBreakdown,
    weeklySpending,
    dailySpending,
    paymentDistribution,
    biggestCategoryIncrease,
    biggestCategoryDecrease,
    mostActiveDay,
    mostExpensiveDay,
    largestExpense,
    averageTransactionValue: totalTransactions > 0 ? total / totalTransactions : 0,
  }
}
