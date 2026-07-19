'use client'

import { useMemo, useState } from 'react'
import {
  CalendarDays,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  Wallet,
} from 'lucide-react'
import { useExpenses } from '@/hooks/use-expenses'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState, ErrorState } from '@/components/shared/state-blocks'
import { AnimatedItem, AnimatedList } from '@/components/ui/animated-list'
import { Skeleton } from '@/components/ui/skeleton'
import { monthlySpending, todaysSpending, totalExpenses } from '@/lib/expense-stats'
import { formatCurrency } from '@/lib/format'
import { todayISODate } from '@/lib/dates'
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
  'px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1D70E8]/30 focus:border-transparent transition-all'

function monthBounds(monthValue: string): { start: string; end: string } | null {
  if (!monthValue) return null
  const [year, month] = monthValue.split('-').map(Number)
  const start = `${monthValue}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${monthValue}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function ExpensesPage() {
  const {
    expenses,
    loading,
    error,
    reload,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useExpenses()

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

  const summary = useMemo(
    () => ({
      total: totalExpenses(expenses),
      today: todaysSpending(expenses),
      month: monthlySpending(expenses),
    }),
    [expenses],
  )

  const visibleExpenses = useMemo(() => {
    const query = search.trim().toLowerCase()
    const monthRange = monthBounds(month)
    const min = minAmount ? Number(minAmount) : null
    const max = maxAmount ? Number(maxAmount) : null

    const filtered = expenses.filter((expense) => {
      if (category !== 'all' && expense.category !== category) return false
      if (paymentMethod !== 'all' && expense.paymentMethod !== paymentMethod) return false

      if (monthRange) {
        if (expense.date < monthRange.start || expense.date > monthRange.end) return false
      }
      if (dateFrom && expense.date < dateFrom) return false
      if (dateTo && expense.date > dateTo) return false

      if (min !== null && Number.isFinite(min) && expense.amount < min) return false
      if (max !== null && Number.isFinite(max) && expense.amount > max) return false

      if (query) {
        const inTitle = expense.title.toLowerCase().includes(query)
        const inNotes = expense.notes.toLowerCase().includes(query)
        const inTags = expense.tags.some((tag) => tag.toLowerCase().includes(query))
        if (!inTitle && !inNotes && !inTags) return false
      }

      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortKey === 'oldest') return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
      if (sortKey === 'highest') return b.amount - a.amount
      if (sortKey === 'lowest') return a.amount - b.amount
      return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    })
  }, [expenses, search, category, paymentMethod, month, dateFrom, dateTo, minAmount, maxAmount, sortKey])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditing(expense)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    const ok = await deleteExpense(deleting.id)
    if (ok) setDeleting(null)
  }

  const currentMonthValue = todayISODate().slice(0, 7)

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-0.5">Track where your money goes</p>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Expenses</h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1D70E8] hover:bg-[#1660CC] shadow-sm transition-colors"
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
          value={formatCurrency(summary.total)}
        />
        <SummaryCard
          icon={CalendarDays}
          label="Today's spending"
          value={formatCurrency(summary.today)}
        />
        <SummaryCard
          icon={Receipt}
          label="This month"
          value={formatCurrency(summary.month)}
        />
        <div className="bg-white rounded-3xl p-5 border border-slate-100/80 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank size={18} className="text-[#1D70E8]" />
            <h2 className="text-sm font-bold text-slate-800">Remaining budget</h2>
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">Set a budget</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Budgets are coming soon. This card is ready for when you define monthly limits.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative min-w-0 flex-1 max-w-xs basis-full sm:basis-auto sm:min-w-[180px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D70E8]/30 focus:border-transparent transition-all"
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
          placeholder="Min $"
          aria-label="Minimum amount"
          className={`${selectClass} w-24`}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
          placeholder="Max $"
          aria-label="Maximum amount"
          className={`${selectClass} w-24`}
        />
      </div>

      {/* List card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Receipt size={18} className="text-[#1D70E8]" />
          <h2 className="text-base font-bold text-slate-800">
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
                  className="flex items-center gap-1.5 rounded-xl bg-[#1D70E8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1660CC]"
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
    <div className="bg-white rounded-3xl p-5 border border-slate-100/80 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-[#1D70E8]" />
        <h2 className="text-sm font-bold text-slate-800">{label}</h2>
      </div>
      <p className="text-2xl font-extrabold text-slate-800 tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  )
}
