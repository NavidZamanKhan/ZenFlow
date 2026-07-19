'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, PiggyBank, Save, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { useBudget } from '@/hooks/use-budget'
import { useExpenses } from '@/hooks/use-expenses'
import { todayISODate } from '@/lib/dates'
import { EXPENSE_CATEGORY_META } from '@/lib/expense-meta'
import { spendingByCategory } from '@/lib/expense-stats'
import { formatCurrency } from '@/lib/format'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/types/expense'
import { Progress } from '@/components/ui/progress'

const CARD_CLASS =
  'rounded-3xl border border-slate-100/80 bg-white shadow-sm'

function progressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-rose-500'
  if (percentage >= 75) return 'bg-amber-400'
  return 'bg-[#7EDCD6]'
}

function currentThreshold(
  percentage: number,
  thresholds: number[],
): number | null {
  return (
    [...thresholds]
      .sort((a, b) => b - a)
      .find((threshold) => percentage >= threshold) ?? null
  )
}

function parseAmount(value: string): number | null {
  const amount = Number(value.replace(/[$,\s]/g, ''))
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

function formatAmountInput(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function BudgetPage() {
  const {
    budget,
    hasBudget,
    loading: budgetLoading,
    setMonthlyTotal,
    setCategoryBudget,
    recordThresholdAlerts,
  } = useBudget()
  const { expenses, loading: expensesLoading } = useExpenses()
  const month = todayISODate().slice(0, 7)

  const currentMonthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(month)),
    [expenses, month],
  )
  const categorySpending = useMemo(
    () => spendingByCategory(currentMonthExpenses),
    [currentMonthExpenses],
  )
  const totalSpent = currentMonthExpenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  )

  useEffect(() => {
    if (!hasBudget || budgetLoading || expensesLoading) return

    const candidates = EXPENSE_CATEGORIES.flatMap((category) => {
      const limit = budget.categoryBudgets[category]
      if (limit <= 0) return []
      const percentage = ((categorySpending[category] ?? 0) / limit) * 100
      return budget.warningThresholds
        .filter((threshold) => percentage >= threshold)
        .map((threshold) => ({ category, threshold }))
    })

    const recorded = recordThresholdAlerts(month, candidates)
    for (const alert of recorded) {
      toast.warning(
        alert.threshold >= 100
          ? `${alert.category} has reached its monthly budget.`
          : `${alert.category} has used ${alert.threshold}% of its monthly budget.`,
      )
    }
  }, [
    budget,
    budgetLoading,
    categorySpending,
    expensesLoading,
    hasBudget,
    month,
    recordThresholdAlerts,
  ])

  if (budgetLoading || expensesLoading) return <BudgetLoading />

  if (!hasBudget) {
    return (
      <div className="max-w-5xl px-4 py-8 sm:px-8">
        <PageHeading />
        <section
          className={`${CARD_CLASS} flex flex-col items-center px-5 py-12 text-center sm:px-8`}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E2EEFC] text-[#1D70E8]">
            <PiggyBank size={22} aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            Give every dollar a plan
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
            Set a monthly budget first, then add category limits to track
            spending and receive timely alerts.
          </p>
          <div className="mt-6 w-full max-w-sm">
            <MonthlyBudgetForm
              value={0}
              onSave={(amount) => {
                const saved = setMonthlyTotal(amount)
                toast[saved ? 'success' : 'error'](
                  saved ? 'Monthly budget saved' : 'Could not save your budget.',
                )
                return saved
              }}
              submitLabel="Set monthly budget"
            />
          </div>
        </section>
      </div>
    )
  }

  const remaining = budget.monthlyTotal - totalSpent
  const overallPercentage =
    budget.monthlyTotal > 0 ? (totalSpent / budget.monthlyTotal) * 100 : 0

  return (
    <div className="max-w-5xl px-4 py-8 sm:px-8">
      <PageHeading />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryStat label="Monthly budget" value={formatCurrency(budget.monthlyTotal)} />
        <SummaryStat label="Spent this month" value={formatCurrency(totalSpent)} />
        <SummaryStat
          label="Remaining"
          value={formatCurrency(remaining)}
          warning={remaining < 0}
        />
      </div>

      <section className={`${CARD_CLASS} mb-6 p-5 sm:p-6`}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <WalletCards size={18} className="text-[#1D70E8]" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-800">
                Monthly budget
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {Math.round(overallPercentage)}% used this month
            </p>
          </div>
          <div className="w-full sm:max-w-sm">
            <MonthlyBudgetForm
              key={budget.monthlyTotal}
              value={budget.monthlyTotal}
              onSave={(amount) => {
                const saved = setMonthlyTotal(amount)
                toast[saved ? 'success' : 'error'](
                  saved ? 'Monthly budget updated' : 'Could not update your budget.',
                )
                return saved
              }}
            />
          </div>
        </div>
        <Progress
          value={overallPercentage}
          label="Overall monthly budget used"
          indicatorClassName={progressColor(overallPercentage)}
        />
      </section>

      <section aria-labelledby="category-budgets-heading">
        <div className="mb-4">
          <h2
            id="category-budgets-heading"
            className="text-base font-bold text-slate-800"
          >
            Category budgets
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Limits and spending are calculated for the current calendar month.
          </p>
        </div>

        <div className="space-y-3">
          {EXPENSE_CATEGORIES.map((category) => (
            <CategoryBudgetRow
              key={`${category}:${budget.categoryBudgets[category]}`}
              category={category}
              budgetAmount={budget.categoryBudgets[category]}
              spent={categorySpending[category] ?? 0}
              thresholds={budget.warningThresholds}
              onSave={(amount) => {
                const saved = setCategoryBudget(category, amount)
                toast[saved ? 'success' : 'error'](
                  saved
                    ? `${category} budget updated`
                    : `Could not update the ${category.toLowerCase()} budget.`,
                )
                return saved
              }}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function PageHeading() {
  return (
    <div className="mb-6">
      <p className="mb-0.5 text-sm font-medium text-slate-400">
        Plan spending with confidence
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-800">
        Budget
      </h1>
    </div>
  )
}

type MonthlyBudgetFormProps = {
  value: number
  onSave: (amount: number) => boolean
  submitLabel?: string
}

const MonthlyBudgetForm = function MonthlyBudgetForm({
  value,
  onSave,
  submitLabel = 'Save',
}: MonthlyBudgetFormProps) {
  const [draft, setDraft] = useState(
    value > 0 ? formatAmountInput(value) : '',
  )
  const [saving, setSaving] = useState(false)

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = parseAmount(draft)
    if (amount === null) {
      toast.error('Enter a valid budget amount.')
      return
    }
    setSaving(true)
    onSave(amount)
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor={`monthly-budget-${submitLabel}`}>
        Monthly budget amount
      </label>
      <div className="relative min-w-0 flex-1">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
          aria-hidden="true"
        >
          $
        </span>
        <input
          id={`monthly-budget-${submitLabel}`}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const amount = parseAmount(draft)
            if (amount !== null) setDraft(formatAmountInput(amount))
          }}
          placeholder="0.00"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 text-sm text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#1D70E8]/30"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#1D70E8] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1660CC] disabled:pointer-events-none disabled:opacity-60"
      >
        <Save size={15} aria-hidden="true" />
        {submitLabel}
      </button>
    </form>
  )
}

type CategoryBudgetRowProps = {
  category: ExpenseCategory
  budgetAmount: number
  spent: number
  thresholds: number[]
  onSave: (amount: number) => boolean
}

function CategoryBudgetRow({
  category,
  budgetAmount,
  spent,
  thresholds,
  onSave,
}: CategoryBudgetRowProps) {
  const [draft, setDraft] = useState(
    budgetAmount > 0 ? formatAmountInput(budgetAmount) : '',
  )
  const [saving, setSaving] = useState(false)
  const meta = EXPENSE_CATEGORY_META[category]
  const Icon = meta.icon
  const remaining = budgetAmount - spent
  const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
  const threshold = budgetAmount > 0
    ? currentThreshold(percentage, thresholds)
    : null

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = parseAmount(draft)
    if (amount === null) {
      toast.error(`Enter a valid budget for ${category}.`)
      return
    }
    setSaving(true)
    onSave(amount)
    setSaving(false)
  }

  return (
    <article className={`${CARD_CLASS} p-4 sm:p-5`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: meta.softBg, color: meta.color }}
            aria-hidden="true"
          >
            <Icon size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-slate-800">
                {category}
              </h3>
              {threshold !== null ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    threshold >= 100
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <AlertTriangle size={11} aria-hidden="true" />
                  {threshold >= 100 ? 'Over budget' : `${threshold}% used`}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Budget {formatCurrency(budgetAmount)} · Spent {formatCurrency(spent)}
              {' · '}Remaining {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"
        >
          <label htmlFor={`budget-${category}`} className="sr-only">
            {category} monthly budget
          </label>
          <div className="relative min-w-0 sm:w-36">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
              aria-hidden="true"
            >
              $
            </span>
            <input
              id={`budget-${category}`}
              type="text"
              inputMode="decimal"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                const amount = parseAmount(draft)
                if (amount !== null) setDraft(formatAmountInput(amount))
              }}
              placeholder="0.00"
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 text-sm text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#1D70E8]/30"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-xl bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-[#E2EEFC] hover:text-[#1D70E8] disabled:pointer-events-none disabled:opacity-60"
          >
            Save
          </button>
        </form>
      </div>

      <Progress
        value={percentage}
        label={`${category} budget used`}
        indicatorClassName={progressColor(percentage)}
        className="mt-4"
      />
    </article>
  )
}

function SummaryStat({
  label,
  value,
  warning = false,
}: {
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div className={`${CARD_CLASS} p-5`}>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p
        className={`mt-1 truncate text-2xl font-extrabold tracking-tight tabular-nums ${
          warning ? 'text-rose-600' : 'text-slate-800'
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}

function BudgetLoading() {
  return (
    <div
      className="max-w-5xl px-4 py-8 sm:px-8"
      aria-label="Loading budget"
    >
      <div className="mb-6 h-12 w-40 animate-pulse rounded-xl bg-slate-100" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-3xl bg-slate-50"
          />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-3xl bg-slate-50"
          />
        ))}
      </div>
    </div>
  )
}
