'use client'

import { Pencil, Repeat2, Trash2 } from 'lucide-react'
import { EXPENSE_CATEGORY_META } from '@/lib/expense-meta'
import { formatCurrency, formatDisplayDate } from '@/lib/format'
import type { Expense } from '@/types/expense'

interface ExpenseRowProps {
  expense: Expense
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

/** Row layout matching Tasks TaskRow: icon, title/meta, right amount, hover actions. */
export function ExpenseRow({ expense, onEdit, onDelete }: ExpenseRowProps) {
  const meta = EXPENSE_CATEGORY_META[expense.category]
  const Icon = meta.icon

  return (
    <div className="group flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50/50 transition-colors">
      <div
        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: meta.softBg, color: meta.color }}
        aria-hidden="true"
      >
        <Icon size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{expense.title}</p>
        <p className="flex items-center gap-1.5 text-xs mt-0.5 font-medium text-slate-500">
          <span>{formatDisplayDate(expense.date)}</span>
          <span aria-hidden="true">·</span>
          <span>{expense.paymentMethod}</span>
          {expense.isRecurring && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-0.5 text-[#1D70E8]">
                <Repeat2 size={11} aria-hidden="true" />
                {expense.recurringInterval}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F3F5] text-slate-500 whitespace-nowrap">
          {expense.category}
        </span>
      </div>

      <p className="text-sm font-bold text-slate-800 tabular-nums flex-shrink-0">
        {formatCurrency(expense.amount)}
      </p>

      <div className="zf-row-actions flex items-center gap-0.5 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(expense)}
          aria-label={`Edit ${expense.title}`}
          className="zf-tap relative p-1.5 rounded-lg text-slate-500 hover:bg-[#E2EEFC] hover:text-[#1D70E8] transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(expense)}
          aria-label={`Delete ${expense.title}`}
          className="zf-tap relative p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
