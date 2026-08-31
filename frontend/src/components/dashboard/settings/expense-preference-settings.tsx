'use client'

import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightLeft, Globe, Loader2, ReceiptText, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { EXPENSE_CATEGORY_META } from '@/lib/expense-meta'
import { smartConvertCurrency } from '@/lib/currency'
import { useCurrency } from '@/lib/currency-context'
import {
  apiGetBudget,
  apiGetExpenses,
  apiUpdateBudget,
  apiUpdateExpense,
} from '@/lib/api'
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from '@/types/expense'
import type { ExpenseCategory } from '@/types/expense'
import {
  SETTINGS_CURRENCIES,
  type ExpensePreferenceSettings,
} from '@/types/settings'
import {
  SettingsField,
  SettingsSection,
  SettingsSelect,
} from './settings-section'

const expensePreferenceSchema = z.object({
  currency: z.enum(SETTINGS_CURRENCIES),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
  numberFormat: z.enum(['1,234.56', '1.234,56', '1 234,56']),
  firstDayOfWeek: z.enum(['Sunday', 'Monday']),
  timeFormat: z.enum(['12-hour', '24-hour']),
  defaultPaymentMethod: z.enum(PAYMENT_METHODS),
  defaultCategory: z.enum(EXPENSE_CATEGORIES),
})

type ExpensePreferenceFormValues = z.infer<typeof expensePreferenceSchema>

const CURRENCY_OPTIONS = [
  { value: 'BDT', label: 'BDT: Bangladeshi Taka (৳)' },
  { value: 'USD', label: 'USD: US Dollar ($)' },
  { value: 'EUR', label: 'EUR: Euro (€)' },
  { value: 'GBP', label: 'GBP: British Pound (£)' },
  { value: 'INR', label: 'INR: Indian Rupee (₹)' },
  { value: 'JPY', label: 'JPY: Japanese Yen (¥)' },
  { value: 'CAD', label: 'CAD: Canadian Dollar (CA$)' },
  { value: 'AUD', label: 'AUD: Australian Dollar (AU$)' },
] as const

const DATE_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (07/19/2026)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (19/07/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-07-19)' },
] as const

const NUMBER_FORMAT_OPTIONS = [
  { value: '1,234.56', label: '1,234.56' },
  { value: '1.234,56', label: '1.234,56' },
  { value: '1 234,56', label: '1 234,56' },
] as const

const FIRST_DAY_OPTIONS = [
  { value: 'Sunday', label: 'Sunday' },
  { value: 'Monday', label: 'Monday' },
] as const

const PAYMENT_OPTIONS = PAYMENT_METHODS.map((value) => ({
  value,
  label: value,
}))

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((value) => ({
  value,
  label: value,
}))

export function ExpensePreferenceSettingsSection({
  preferences,
  onSave,
}: {
  preferences: ExpensePreferenceSettings
  onSave: (preferences: ExpensePreferenceSettings) => boolean
}) {
  const { rates, rateAgainstUSD, lastUpdated, isLive, loadingRates, refreshRates } = useCurrency()

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting },
  } = useForm<ExpensePreferenceFormValues>({
    resolver: zodResolver(expensePreferenceSchema),
    mode: 'onTouched',
    defaultValues: preferences,
  })

  useEffect(() => {
    reset(preferences)
  }, [preferences, reset])

  const selectedCategory = useWatch({
    control,
    name: 'defaultCategory',
  })
  const selectedCurrency = useWatch({
    control,
    name: 'currency',
  })

  const categoryMeta = EXPENSE_CATEGORY_META[selectedCategory] || EXPENSE_CATEGORY_META.Food
  const CategoryIcon = categoryMeta.icon
  const activeRate = rates[selectedCurrency] || 1

  const submitPreferences = async (values: ExpensePreferenceFormValues) => {
    if (onSave(values)) {
      toast.success('Expense preferences saved.')
    } else {
      toast.error('Could not save expense preferences.')
    }
  }

  const handleRefreshRates = async () => {
    await refreshRates()
    toast.success('Live exchange rates updated from market data.')
  }

  return (
    <SettingsSection
      id="expense-preferences"
      icon={ReceiptText}
      title="Expense preferences"
      description="Customize your currency, formatting defaults, and live exchange rates."
    >
      <form onSubmit={handleSubmit(submitPreferences)} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingsField label="Default currency">
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <SettingsSelect
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val)
                    const current = getValues()
                    onSave({ ...current, currency: val as any })
                    toast.success('Currency updated and synced with cloud.')
                  }}
                  options={CURRENCY_OPTIONS}
                  ariaLabel="Default currency"
                />
              )}
            />
          </SettingsField>

          <SettingsField label="Date format">
            <Controller
              control={control}
              name="dateFormat"
              render={({ field }) => (
                <SettingsSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={DATE_FORMAT_OPTIONS}
                  ariaLabel="Date format"
                />
              )}
            />
          </SettingsField>

          <SettingsField label="Number format">
            <Controller
              control={control}
              name="numberFormat"
              render={({ field }) => (
                <SettingsSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={NUMBER_FORMAT_OPTIONS}
                  ariaLabel="Number format"
                />
              )}
            />
          </SettingsField>

          <SettingsField label="First day of week">
            <Controller
              control={control}
              name="firstDayOfWeek"
              render={({ field }) => (
                <SettingsSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={FIRST_DAY_OPTIONS}
                  ariaLabel="First day of week"
                />
              )}
            />
          </SettingsField>

          <SettingsField label="Default payment method">
            <Controller
              control={control}
              name="defaultPaymentMethod"
              render={({ field }) => (
                <SettingsSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={PAYMENT_OPTIONS}
                  ariaLabel="Default payment method"
                />
              )}
            />
          </SettingsField>

          <SettingsField label="Default expense category">
            <Controller
              control={control}
              name="defaultCategory"
              render={({ field }) => (
                <SettingsSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={CATEGORY_OPTIONS}
                  ariaLabel="Default expense category"
                />
              )}
            />
            <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-[var(--zf-text-muted)]">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-lg"
                style={{
                  color: categoryMeta.color,
                  backgroundColor: categoryMeta.softBg,
                }}
              >
                <CategoryIcon size={12} />
              </span>
              Uses the same category metadata as Expenses
            </span>
          </SettingsField>
        </div>

        {/* Live Exchange Rate Card */}
        <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-[var(--zf-accent-light-border)] bg-[var(--zf-accent-light-bg)] p-4 sm:flex-row sm:items-center dark:border-[var(--zf-border)] dark:bg-[var(--zf-soft-fill)]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--zf-accent-soft)] text-[var(--zf-accent)]">
              <Globe size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-800 dark:text-[var(--zf-text)]">
                  Live Market Exchange Rate
                </p>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  {isLive ? 'Live' : 'Cached'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-[var(--zf-text-muted)]">
                $1.00 USD ={' '}
                <strong className="font-semibold text-slate-900 dark:text-[var(--zf-text)]">
                  {activeRate.toFixed(2)} {selectedCurrency}
                </strong>
                <span className="ml-1.5 text-slate-400 dark:text-[var(--zf-text-muted)]">
                  ({lastUpdated})
                </span>
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshRates}
            disabled={loadingRates}
            className="h-8 rounded-xl border-[var(--zf-accent-light-border)] bg-white text-xs font-semibold text-[var(--zf-accent)] hover:bg-[var(--zf-accent-soft)] dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] dark:hover:bg-[var(--zf-elevated)]"
          >
            {loadingRates ? (
              <Loader2 size={13} className="mr-1.5 animate-spin" />
            ) : (
              <RefreshCw size={13} className="mr-1.5" />
            )}
            Refresh rate
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-[var(--zf-border)] dark:bg-[var(--zf-soft-fill)]">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-[var(--zf-text)]">
              24-hour time
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-[var(--zf-text-muted)]">
              Store times as 24-hour instead of 12-hour display.
            </p>
          </div>
          <Controller
            control={control}
            name="timeFormat"
            render={({ field }) => (
              <Switch
                checked={field.value === '24-hour'}
                onCheckedChange={(checked) =>
                  field.onChange(checked ? '24-hour' : '12-hour')
                }
                aria-label="Use 24-hour time"
                className="data-checked:bg-[var(--zf-accent)]"
              />
            )}
          />
        </div>

        <div className="flex justify-end mt-5">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-4 rounded-xl bg-[var(--zf-accent)] text-white hover:bg-[var(--zf-accent-hover)]"
          >
            <Save size={15} />
            Save preferences
          </Button>
        </div>
      </form>
    </SettingsSection>
  )
}
