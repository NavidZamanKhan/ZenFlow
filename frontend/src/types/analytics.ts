// ---------------------------------------------------------------------------
// Analytics domain types - shape of GET /api/analytics/summary/
// Every bucket is grouped by the currency the expenses were paid in; the
// client converts buckets to the display currency with its live rate table.
// ---------------------------------------------------------------------------

import type { ExpenseCategory, PaymentMethod } from '@/types/expense'
import type { CurrencyCode } from '@/lib/currency'

export interface AnalyticsBucket {
  currency: CurrencyCode
  amount: number
  transactions: number
}

export interface AnalyticsCategoryBucket extends AnalyticsBucket {
  category: ExpenseCategory
}

export interface AnalyticsMonthBucket extends AnalyticsBucket {
  /** "YYYY-MM" */
  month: string
}

export interface AnalyticsMonthCategoryBucket extends AnalyticsMonthBucket {
  category: ExpenseCategory
}

export interface AnalyticsPaymentMethodBucket extends AnalyticsBucket {
  paymentMethod: PaymentMethod
}

export interface AnalyticsDayBucket extends AnalyticsBucket {
  /** "YYYY-MM-DD" */
  date: string
}

/**
 * The largest expense of a single currency. Because raw amounts in different
 * currencies are not comparable, the server returns one candidate per currency
 * and the client picks the overall winner after converting each one.
 */
export interface AnalyticsLargestExpense {
  id: string
  title: string
  amount: number
  currency: CurrencyCode
  category: ExpenseCategory
  date: string
}

export interface AnalyticsSummary {
  range: { start: string | null; end: string | null }
  generatedAt: string
  transactions: number
  activeDays: number
  activeMonths: number
  totals: AnalyticsBucket[]
  byCategory: AnalyticsCategoryBucket[]
  byMonth: AnalyticsMonthBucket[]
  byMonthCategory: AnalyticsMonthCategoryBucket[]
  byPaymentMethod: AnalyticsPaymentMethodBucket[]
  byDay: AnalyticsDayBucket[]
  /** One entry per currency present in the range (empty when there are no expenses). */
  largestExpenses: AnalyticsLargestExpense[]
  mostActiveDay: { date: string; transactions: number } | null
}

export interface AnalyticsSummaryParams {
  /** Inclusive "YYYY-MM-DD" lower bound. */
  start?: string
  /** Inclusive "YYYY-MM-DD" upper bound. */
  end?: string
}
