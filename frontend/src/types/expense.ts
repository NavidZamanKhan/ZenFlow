export const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Bills',
  'Shopping',
  'Entertainment',
  'Education',
  'Healthcare',
  'Travel',
  'Subscription',
  'Others',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const PAYMENT_METHODS = [
  'Cash',
  'Card',
  'Bank Transfer',
  'Mobile Wallet',
  'Other',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const RECURRING_INTERVALS = ['weekly', 'monthly', 'yearly'] as const

export type RecurringInterval = (typeof RECURRING_INTERVALS)[number]

export interface Expense {
  id: string
  title: string
  amount: number
  category: ExpenseCategory
  /** ISO date string (yyyy-mm-dd) */
  date: string
  paymentMethod: PaymentMethod
  notes: string
  /** Optional local preview URL or remote URL string — no file backend yet */
  receiptImage: string | null
  isRecurring: boolean
  recurringInterval: RecurringInterval | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>

export type ExpenseSortKey = 'newest' | 'oldest' | 'highest' | 'lowest'
