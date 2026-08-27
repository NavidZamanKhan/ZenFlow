'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/shared/modal'
import { todayISODate } from '@/lib/dates'
import { useCurrency } from '@/lib/currency-context'
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

type ExpenseFormValues = {
  title: string
  amount: string
  category: (typeof EXPENSE_CATEGORIES)[number]
  date: string
  paymentMethod: (typeof PAYMENT_METHODS)[number]
  notes: string
  receiptImage: string
  isRecurring: boolean
  recurringInterval: (typeof RECURRING_INTERVALS)[number] | ''
  tags: string
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[var(--zf-surface)] border border-slate-200 dark:border-[var(--zf-border)] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--zf-accent)_30%,transparent)] focus:border-[var(--zf-accent)] transition-colors'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5'

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
  const { currency: activeCurrency, meta } = useCurrency()
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
      amount: expense?.amount !== undefined ? String(expense.amount) : '',
      category: expense?.category ?? 'Food',
      date: expense?.date ?? todayISODate(),
      paymentMethod: expense?.paymentMethod ?? 'Card',
      notes: expense?.notes ?? '',
      receiptImage: expense?.receiptImage ?? '',
      isRecurring: expense?.isRecurring ?? false,
      recurringInterval: (expense?.recurringInterval as any) ?? '',
      tags: expense?.tags.join(', ') ?? '',
    },
  })

  const isRecurring = useWatch({ control, name: 'isRecurring' })

  const submit = async (values: ExpenseFormValues) => {
    const rawTags = values.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const receiptImage = values.receiptImage.trim()

    const ok = await onSubmit({
      title: values.title.trim(),
      amount: Number(values.amount),
      currency: expense?.currency ?? activeCurrency,
      category: values.category,
      date: values.date,
      paymentMethod: values.paymentMethod,
      notes: values.notes.trim(),
      receiptImage: receiptImage ? receiptImage : null,
      isRecurring: values.isRecurring,
      recurringInterval: values.isRecurring && values.recurringInterval ? values.recurringInterval : null,
      tags: rawTags,
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
          placeholder="e.g. Blue Bottle Coffee"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'expense-title-error' : undefined}
          className={inputClass}
          {...register('title')}
        />
        {errors.title && (
          <p id="expense-title-error" role="alert" className="mt-1.5 text-xs text-red-500 dark:text-red-400">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="expense-amount" className={labelClass}>
            Amount ({meta.code})
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-slate-400"
              aria-hidden="true"
            >
              {meta.symbol}
            </span>
            <input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? 'expense-amount-error' : undefined}
              className={`${inputClass} pl-8`}
              {...register('amount')}
            />
          </div>
          {errors.amount && (
            <p id="expense-amount-error" role="alert" className="mt-1.5 text-xs text-red-500 dark:text-red-400">
              {errors.amount.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="expense-date" className={labelClass}>
            Date
          </label>
          <input
            id="expense-date"
            type="date"
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? 'expense-date-error' : undefined}
            className={inputClass}
            {...register('date')}
          />
          {errors.date && (
            <p id="expense-date-error" role="alert" className="mt-1.5 text-xs text-red-500 dark:text-red-400">
              {errors.date.message}
            </p>
          )}
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
          Notes <span className="text-slate-500 dark:text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="expense-notes"
          rows={2}
          placeholder="Add any notes or context..."
          className={`${inputClass} resize-none`}
          {...register('notes')}
        />
      </div>

      <div>
        <label htmlFor="expense-tags" className={labelClass}>
          Tags <span className="text-slate-500 dark:text-slate-400 font-normal">(comma-separated)</span>
        </label>
        <input
          id="expense-tags"
          type="text"
          placeholder="e.g. coffee, meeting, tax-deductible"
          className={inputClass}
          {...register('tags')}
        />
      </div>

      <div>
        <label htmlFor="expense-receipt" className={labelClass}>
          Receipt image URL <span className="text-slate-500 dark:text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="expense-receipt"
          type="url"
          placeholder="https://..."
          className={inputClass}
          {...register('receiptImage')}
        />
      </div>

      <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300 font-medium">
        <input
          id="expense-recurring"
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-[var(--zf-accent)]"
          {...register('isRecurring')}
        />
        <label htmlFor="expense-recurring" className="cursor-pointer">
          Recurring expense
        </label>
      </div>

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
            <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{errors.recurringInterval.message}</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--zf-accent)] hover:bg-[var(--zf-accent-hover)] transition-colors disabled:pointer-events-none disabled:opacity-60"
        >
          {expense ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  )
}
