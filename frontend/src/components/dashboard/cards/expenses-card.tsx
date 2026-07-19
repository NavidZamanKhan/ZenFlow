'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'
import { todayISODate } from '@/lib/dates'
import { EXPENSE_CATEGORY_META } from '@/lib/expense-meta'
import { spendingByCategory } from '@/lib/expense-stats'
import { formatCurrency } from '@/lib/format'
import type { Budget } from '@/types/budget'
import type { Expense } from '@/types/expense'

const FALLBACK_SEGMENT_COLORS = [
  'bg-[#1D70E8]',
  'bg-[#67B2F5]',
  'bg-[#7EDCD6]',
  'bg-[#8B5CF6]',
  'bg-[#F97316]',
]

type ExpensesCardProps = {
  expenses: Expense[]
  budget: Budget
  hasBudget: boolean
  loading: boolean
}

export function ExpensesCard({
  expenses,
  budget,
  hasBudget,
  loading,
}: ExpensesCardProps) {
  const month = todayISODate().slice(0, 7)

  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(month)),
    [expenses, month],
  )

  const spent = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const remaining = budget.monthlyTotal - spent
  const showBudget = hasBudget && budget.monthlyTotal > 0

  const segments = useMemo(() => {
    const totals = spendingByCategory(monthExpenses)
    const entries = Object.entries(totals)
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)

    if (entries.length === 0 || spent <= 0) return []

    return entries.map(([category, amount], index) => ({
      name: category,
      amount,
      percentage: (amount / spent) * 100,
      color:
        category in EXPENSE_CATEGORY_META
          ? undefined
          : FALLBACK_SEGMENT_COLORS[index % FALLBACK_SEGMENT_COLORS.length],
      hex:
        category in EXPENSE_CATEGORY_META
          ? EXPENSE_CATEGORY_META[category as keyof typeof EXPENSE_CATEGORY_META]
              .color
          : undefined,
    }))
  }, [monthExpenses, spent])

  return (
    <div className="rounded-3xl border border-slate-100/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-[#1D70E8]" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-800">Expenses</h2>
        </div>
        <Link
          href="/dashboard/expenses/budget"
          className="text-xs font-semibold text-[#1D70E8] hover:underline"
        >
          {showBudget ? 'Edit budget' : 'Set budget'}
        </Link>
      </div>

      {loading ? (
        <div className="mb-6 h-16 animate-pulse rounded-2xl bg-slate-50" />
      ) : showBudget ? (
        <div className="mb-6 space-y-3">
          <div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-800 tabular-nums">
              {formatCurrency(spent)}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              Spent this month
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-medium text-slate-400">Budget</p>
              <p className="mt-0.5 text-sm font-bold text-slate-800 tabular-nums">
                {formatCurrency(budget.monthlyTotal)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-medium text-slate-400">Remaining</p>
              <p
                className={`mt-0.5 text-sm font-bold tabular-nums ${
                  remaining < 0 ? 'text-rose-600' : 'text-slate-800'
                }`}
              >
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-3xl font-extrabold tracking-tight text-slate-800 tabular-nums">
            {formatCurrency(spent)}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            Spent this month
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex h-2.5 overflow-hidden rounded-full border border-slate-100/30 bg-slate-50">
          {segments.length === 0 ? (
            <div className="h-full w-full bg-slate-100" />
          ) : (
            segments.map((segment) => (
              <div
                key={segment.name}
                className={`h-full transition-all duration-300 ${segment.color ?? ''}`}
                style={{
                  width: `${segment.percentage}%`,
                  backgroundColor: segment.hex,
                }}
                title={`${segment.name}: ${formatCurrency(segment.amount)}`}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
        {segments.length === 0 ? (
          <p className="text-xs font-semibold text-slate-400">
            No spending recorded this month
          </p>
        ) : (
          segments.map((segment) => (
            <div key={segment.name} className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${segment.color ?? ''}`}
                style={{ backgroundColor: segment.hex }}
              />
              <p className="text-xs font-semibold text-slate-400">
                {segment.name}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
