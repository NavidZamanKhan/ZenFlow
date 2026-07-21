'use client'

import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ReceiptText, Save } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { EXPENSE_CATEGORY_META } from '@/lib/expense-meta'
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from '@/types/expense'
import {
  SETTINGS_CURRENCIES,
  type ExpensePreferenceSettings,
} from '@/types/settings'
import {
  SettingsField,
  SettingsNote,
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
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'BDT', label: 'BDT — Bangladeshi Taka' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
] as const

const DATE_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY — 07/19/2026' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY — 19/07/2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD — 2026-07-19' },
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
  const {
    control,
    handleSubmit,
    reset,
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
  const categoryMeta = EXPENSE_CATEGORY_META[selectedCategory]
  const CategoryIcon = categoryMeta.icon

  const submitPreferences = (values: ExpensePreferenceFormValues) => {
    if (onSave(values)) {
      toast.success('Expense preferences saved.')
    } else {
      toast.error('Could not save expense preferences.')
    }
  }

  return (
    <SettingsSection
      id="expense-preferences"
      icon={ReceiptText}
      title="Expense preferences"
      description="Set defaults that future expense workflows can consume."
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
                  onValueChange={field.onChange}
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
            <span className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center"
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

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 mt-5">
          <div>
            <p className="text-sm font-semibold text-slate-700">24-hour time</p>
            <p className="text-xs text-slate-500 mt-0.5">
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
                className="data-checked:bg-[#1D70E8]"
              />
            )}
          />
        </div>

        <div className="mt-5">
          <SettingsNote>
            These defaults are stored and ready for future consumers. Existing
            Expenses and Insights formatting remains unchanged until a separate
            app-wide preference integration is approved.
          </SettingsNote>
        </div>

        <div className="flex justify-end mt-5">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-4 rounded-xl bg-[#1D70E8] text-white hover:bg-[#1660CC]"
          >
            <Save size={15} />
            Save preferences
          </Button>
        </div>
      </form>
    </SettingsSection>
  )
}
