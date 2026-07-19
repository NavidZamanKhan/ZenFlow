'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/shared/modal'
import { todayISODate } from '@/lib/dates'
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  RECURRING_INTERVALS,
  type Expense,
  type ExpenseInput,
} from '@/types/expense'

const expenseSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    amount: z.string().min(1, 'Amount is required'),
    category: z.enum(EXPENSE_CATEGORIES),
    date: z.string().min(1, 'Date is required'),
    paymentMethod: z.enum(PAYMENT_METHODS),
    notes: z.string(),
    receiptImage: z.string(),
    isRecurring: z.boolean(),
    recurringInterval: z.enum(RECURRING_INTERVALS).or(z.literal('')),
    tags: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.title.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Title is required', path: ['title'] })
    }

    const amount = Number(values.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Amount must be a positive number',
        path: ['amount'],
      })
    }

    if (values.isRecurring && !values.recurringInterval) {
      ctx.addIssue({
        code: 'custom',
        message: 'Choose a recurring interval',
        path: ['recurringInterval'],
      })
    }
  })

type ExpenseFormValues = z.infer<typeof expenseSchema>

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D70E8]/30 focus:border-[#1D70E8] transition-all'
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

interface ExpenseFormModalProps {
  open: boolean
  expense: Expense | null
  onClose: () => void
  onSubmit: (input: ExpenseInput) => Promise<boolean>
}

export function ExpenseFormModal({ open, expense, onClose, onSubmit }: ExpenseFormModalProps) {
  return (
    <Modal open={open} title={expense ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <ExpenseForm
        key={expense?.id ?? 'new'}
        expense={expense}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </Modal>
  )
}

function ExpenseForm({
  expense,
  onClose,
  onSubmit,
}: Pick<ExpenseFormModalProps, 'expense' | 'onClose' | 'onSubmit'>) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    mode: 'onTouched',
    defaultValues: {
      title: expense?.title ?? '',
      amount: expense ? String(expense.amount) : '',
      category: expense?.category ?? 'Food',
      date: expense?.date ?? todayISODate(),
      paymentMethod: expense?.paymentMethod ?? 'Card',
      notes: expense?.notes ?? '',
      receiptImage: expense?.receiptImage ?? '',
      isRecurring: expense?.isRecurring ?? false,
      recurringInterval: expense?.recurringInterval ?? '',
      tags: expense?.tags.join(', ') ?? '',
    },
  })

  const isRecurring = useWatch({ control, name: 'isRecurring' })

  const submit = async (values: ExpenseFormValues) => {
    const ok = await onSubmit({
      title: values.title.trim(),
      amount: Number(values.amount),
      category: values.category,
      date: values.date,
      paymentMethod: values.paymentMethod,
      notes: values.notes.trim(),
      receiptImage: values.receiptImage.trim() || null,
      isRecurring: values.isRecurring,
      recurringInterval: values.isRecurring
        ? (values.recurringInterval as (typeof RECURRING_INTERVALS)[number])
        : null,
      tags: values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    })
    if (ok) onClose()
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="expense-title" className={labelClass}>
          Title
        </label>
        <input
          id="expense-title"
          type="text"
          placeholder="e.g. Groceries at FreshMart"
          className={inputClass}
          {...register('title')}
        />
        {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="expense-amount" className={labelClass}>
            Amount
          </label>
          <input
            id="expense-amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className={inputClass}
            {...register('amount')}
          />
          {errors.amount && <p className="mt-1.5 text-xs text-red-500">{errors.amount.message}</p>}
        </div>
        <div>
          <label htmlFor="expense-date" className={labelClass}>
            Date
          </label>
          <input id="expense-date" type="date" className={inputClass} {...register('date')} />
          {errors.date && <p className="mt-1.5 text-xs text-red-500">{errors.date.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="expense-category" className={labelClass}>
            Category
          </label>
          <select id="expense-category" className={inputClass} {...register('category')}>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="expense-payment" className={labelClass}>
            Payment method
          </label>
          <select id="expense-payment" className={inputClass} {...register('paymentMethod')}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="expense-notes" className={labelClass}>
          Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="expense-notes"
          rows={2}
          placeholder="Add any details..."
          className={`${inputClass} resize-none`}
          {...register('notes')}
        />
      </div>

      <div>
        <label htmlFor="expense-tags" className={labelClass}>
          Tags <span className="text-slate-400 font-normal">(comma-separated, optional)</span>
        </label>
        <input
          id="expense-tags"
          type="text"
          placeholder="e.g. work, personal"
          className={inputClass}
          {...register('tags')}
        />
      </div>

      <div>
        <label htmlFor="expense-receipt" className={labelClass}>
          Receipt URL <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="expense-receipt"
          type="url"
          placeholder="https://..."
          className={inputClass}
          {...register('receiptImage')}
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 accent-[#1D70E8]"
          {...register('isRecurring')}
        />
        Recurring expense
      </label>

      {isRecurring && (
        <div>
          <label htmlFor="expense-interval" className={labelClass}>
            Interval
          </label>
          <select id="expense-interval" className={inputClass} {...register('recurringInterval')}>
            <option value="">Select interval</option>
            {RECURRING_INTERVALS.map((interval) => (
              <option key={interval} value={interval}>
                {interval.charAt(0).toUpperCase() + interval.slice(1)}
              </option>
            ))}
          </select>
          {errors.recurringInterval && (
            <p className="mt-1.5 text-xs text-red-500">{errors.recurringInterval.message}</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1D70E8] hover:bg-[#1660CC] transition-colors disabled:pointer-events-none disabled:opacity-60"
        >
          {expense ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  )
}
