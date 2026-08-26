'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Globe,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  Wallet,
} from 'lucide-react'
import { useBudget } from '@/hooks/use-budget'
import { useExpenses } from '@/hooks/use-expenses'
import { useHighlightParam } from '@/hooks/use-highlight-param'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState, ErrorState } from '@/components/shared/state-blocks'
import { AnimatedItem, AnimatedList } from '@/components/ui/animated-list'
import { Skeleton } from '@/components/ui/skeleton'
import { monthlySpending, todaysSpending, totalExpenses } from '@/lib/expense-stats'
import { useCurrency } from '@/lib/currency-context'
import { todayISODate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type Expense,
  type ExpenseCategory,
  type ExpenseSortKey,
  type PaymentMethod,
} from '@/types/expense'
import { ExpenseFormModal } from './expense-form-modal'
import { ExpenseRow } from './expense-row'

const selectClass =
  'px-3 py-2 rounded-xl bg-slate-50 dark:bg-[var(--zf-surface)] border border-slate-100 dark:border-[var(--zf-border)] text-xs font-medium text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--zf-accent)_30%,transparent)] focus:border-transparent transition-all'

function monthBounds(monthValue: string): { start: string; end: string } | null {
  if (!monthValue) return null
  const [year, month] = monthValue.split('-').map(Number)
  const start = `${monthValue}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${monthValue}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function ExpensesPage() {
  const { format, currency, rateAgainstUSD, meta } = useCurrency()
  const {
    expenses,
    loading,
    error,
    reload,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useExpenses()
  const {
    budget,
    hasBudget,
    loading: budgetLoading,
  } = useBudget()
  const highlightId = useHighlightParam()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'all' | ExpenseCategory>('all')
  const [paymentMethod, setPaymentMethod] = useState<'all' | PaymentMethod>('all')
  const [month, setMonth] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortKey, setSortKey] = useState<ExpenseSortKey>('newest')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)

  const bounds = useMemo(() => monthBounds(month), [month])

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase()
    const min = minAmount ? Number(minAmount) : null
    const max = maxAmount ? Number(maxAmount) : null

    return expenses.filter((expense) => {
      if (category !== 'all' && expense.category !== category) return false
      if (paymentMethod !== 'all' && expense.paymentMethod !== paymentMethod) return false
      if (bounds) {
        if (expense.date < bounds.start || expense.date > bounds.end) return false
      }
      if (dateFrom && expense.date < dateFrom) return false
      if (dateTo && expense.date > dateTo) return false
      if (min !== null && Number.isFinite(min) && expense.amount < min) return false
      if (max !== null && Number.isFinite(max) && expense.amount > max) return false
      if (
        query &&
        !expense.title.toLowerCase().includes(query) &&
        !expense.notes.toLowerCase().includes(query) &&
        !expense.tags.some((tag) => tag.toLowerCase().includes(query))
      ) {
        return false
      }
      return true
    })
  }, [
    expenses,
    search,
    category,
    paymentMethod,
    bounds,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
  ])

  const visibleExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      if (sortKey === 'oldest') return a.date.localeCompare(b.date)
      if (sortKey === 'highest') return b.amount - a.amount
      if (sortKey === 'lowest') return a.amount - b.amount
      return b.date.localeCompare(a.date)
    })
  }, [filteredExpenses, sortKey])

  const summary = useMemo(() => {
    return {
      total: totalExpenses(expenses),
      today: todaysSpending(expenses),
      month: monthlySpending(expenses),
    }
  }, [expenses])

  const showMonthlyBudget = hasBudget && budget.monthlyTotal > 0
  const remainingBudget = budget.monthlyTotal - summary.month

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditing(expense)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (deleting) {
      await deleteExpense(deleting.id)
      setDeleting(null)
    }
  }

  if (loading) return <div className="p-8 text-slate-600 dark:text-slate-300">Loading...</div>

  if (error) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-5xl">
        <ErrorState description={error} onRetry={reload} />
      </div>
    )
  }

  const currentMonthValue = todayISODate().slice(0, 7)

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-0.5">Track where your money goes</p>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--zf-accent-soft)] dark:bg-[var(--zf-soft-fill)] text-[var(--zf-accent)] border border-[var(--zf-accent-light-border)] dark:border-[var(--zf-border)]">
              <Globe size={11} />
              {currency} {currency !== 'USD' ? `(1 USD ≈ ${rateAgainstUSD.toFixed(2)} ${currency})` : ''}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-[var(--zf-text)] tracking-tight">Expenses</h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--zf-accent)] hover:bg-[var(--zf-accent-hover)] shadow-sm transition-colors"
        >
          <Plus size={16} />
          Add expense
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={Wallet}
          label="Total expenses"
          value={format(summary.total)}
        />
        <SummaryCard
          icon={CalendarDays}
          label="Today's spending"
          value={format(summary.today)}
        />
        <SummaryCard
          icon={Receipt}
          label="This month"
          value={format(summary.month)}
        />
        <RemainingBudgetCard
          loading={budgetLoading}
          showBudget={showMonthlyBudget}
          remaining={remainingBudget}
          monthlyTotal={budget.monthlyTotal}
          spent={summary.month}
          format={format}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative min-w-0 flex-1 max-w-xs basis-full sm:basis-auto sm:min-w-[180px]">
          <label htmlFor="expenses-search" className="sr-only">
            Search expenses
          </label>
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
            aria-hidden="true"
          />
          <input
            id="expenses-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[var(--zf-surface)] border border-slate-100 dark:border-[var(--zf-border)] text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--zf-accent)_30%,transparent)] focus:border-transparent transition-all"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as 'all' | ExpenseCategory)}
          aria-label="Filter by category"
          className={selectClass}
        >
          <option value="all">All categories</option>
          {EXPENSE_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as 'all' | PaymentMethod)}
          aria-label="Filter by payment method"
          className={selectClass}
        >
          <option value="all">All payments</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="Filter by month"
          className={selectClass}
          max={currentMonthValue}
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as ExpenseSortKey)}
          aria-label="Sort expenses"
          className={selectClass}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest amount</option>
          <option value="lowest">Lowest amount</option>
        </select>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
          className={selectClass}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
          className={selectClass}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          placeholder={`Min ${meta.symbol}`}
          aria-label="Minimum amount"
          className={`${selectClass} w-24`}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
          placeholder={`Max ${meta.symbol}`}
          aria-label="Maximum amount"
          className={`${selectClass} w-24`}
        />
      </div>

      {/* List card */}
      <div className="bg-white dark:bg-[var(--zf-surface)] rounded-3xl p-6 border border-slate-100/80 dark:border-[var(--zf-border)] shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Receipt size={18} className="text-[var(--zf-accent)]" />
          <h2 className="text-base font-bold text-slate-800 dark:text-[var(--zf-text)]">
            {visibleExpenses.length === 1
              ? '1 expense'
              : `${visibleExpenses.length} expenses`}
          </h2>
        </div>

        {error && !loading ? (
          <ErrorState
            description={error}
            onRetry={reload}
            className="border-0 bg-transparent py-10"
          />
        ) : loading ? (
          <div className="space-y-3 py-1" aria-label="Loading expenses">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-3.5 max-w-[240px] flex-1" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : visibleExpenses.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={expenses.length === 0 ? 'No expenses yet' : 'Nothing matches'}
            description={
              expenses.length === 0
                ? 'Quiet books start empty. Add your first expense to begin tracking calmly.'
                : 'Try a different search or clear the filters.'
            }
            action={
              expenses.length === 0 ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--zf-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--zf-accent-hover)]"
                >
                  <Plus size={16} />
                  Add your first expense
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-1">
            <AnimatedList>
              {visibleExpenses.map((expense) => (
                <AnimatedItem key={expense.id}>
                  <ExpenseRow
                    expense={expense}
                    onEdit={openEdit}
                    onDelete={setDeleting}
                    highlighted={highlightId === expense.id}
                  />
                </AnimatedItem>
              ))}
            </AnimatedList>
          </div>
        )}
      </div>

      <ExpenseFormModal
        open={formOpen}
        expense={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) =>
          editing ? updateExpense(editing.id, input) : createExpense(input)
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete expense"
        message={`"${deleting?.title ?? ''}" will be permanently deleted. This can't be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet
  label: string
  value: string
}) {
  return (
    <div className="bg-white dark:bg-[var(--zf-surface)] rounded-3xl p-5 border border-slate-100/80 dark:border-[var(--zf-border)] shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-[var(--zf-accent)]" />
        <h2 className="text-sm font-bold text-slate-800 dark:text-[var(--zf-text)]">{label}</h2>
      </div>
      <p className="text-2xl font-extrabold text-slate-800 dark:text-[var(--zf-text)] tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  )
}

function RemainingBudgetCard({
  loading,
  showBudget,
  remaining,
  monthlyTotal,
  spent,
  format,
}: {
  loading: boolean
  showBudget: boolean
  remaining: number
  monthlyTotal: number
  spent: number
  format: (amount: number) => string
}) {
  return (
    <div className="bg-white dark:bg-[var(--zf-surface)] rounded-3xl p-5 border border-slate-100/80 dark:border-[var(--zf-border)] shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PiggyBank size={18} className="text-[var(--zf-accent)]" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-[var(--zf-text)]">
            Remaining budget
          </h2>
        </div>
        {!loading ? (
          <Link
            href="/dashboard/expenses/budget"
            className="text-[11px] font-semibold text-[var(--zf-accent)] hover:underline"
          >
            {showBudget ? 'Edit' : 'Set budget'}
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-3 w-36 rounded-md" />
        </div>
      ) : showBudget ? (
        <>
          <p
            className={cn(
              'text-2xl font-extrabold tracking-tight tabular-nums',
              remaining < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-800 dark:text-[var(--zf-text)]',
            )}
          >
            {format(remaining)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {format(spent)} of {format(monthlyTotal)} spent this month
            {remaining < 0 ? ' · Over budget' : ''}
          </p>
        </>
      ) : (
        <>
          <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Set a monthly budget
          </p>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Define a monthly limit on the Budget page to track what you have left to spend.
          </p>
        </>
      )}
    </div>
  )
}
