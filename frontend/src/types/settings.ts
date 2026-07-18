import type { ExpenseCategory, PaymentMethod } from '@/types/expense'

export const SETTINGS_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'BDT',
  'INR',
  'JPY',
  'CAD',
  'AUD',
] as const

export type SettingsCurrency = (typeof SETTINGS_CURRENCIES)[number]
export type ThemePreference = 'light' | 'dark' | 'system'
export type AccentColor = 'blue' | 'teal' | 'violet' | 'coral'
export type DisplayDensity = 'comfortable' | 'compact'
export type SettingsDateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
export type NumberFormat = '1,234.56' | '1.234,56' | '1 234,56'
export type FirstDayOfWeek = 'Sunday' | 'Monday'
export type TimeFormat = '12-hour' | '24-hour'

export interface ProfileSettings {
  fullName: string
  username: string
  email: string
  phone: string
  country: string
  timeZone: string
  language: string
}

export interface AppearanceSettings {
  theme: ThemePreference
  accentColor: AccentColor
  density: DisplayDensity
}

export interface ExpensePreferenceSettings {
  currency: SettingsCurrency
  dateFormat: SettingsDateFormat
  numberFormat: NumberFormat
  firstDayOfWeek: FirstDayOfWeek
  timeFormat: TimeFormat
  defaultPaymentMethod: PaymentMethod
  defaultCategory: ExpenseCategory
}

export interface ZenFlowSettings {
  profile: ProfileSettings
  appearance: AppearanceSettings
  expensePreferences: ExpensePreferenceSettings
}

export function createDefaultSettings(
  email = '',
  fullName = '',
  timeZone = 'UTC',
): ZenFlowSettings {
  return {
    profile: {
      fullName,
      username: email.split('@')[0] ?? '',
      email,
      phone: '',
      country: '',
      timeZone,
      language: 'English',
    },
    appearance: {
      theme: 'light',
      accentColor: 'blue',
      density: 'comfortable',
    },
    expensePreferences: {
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: '1,234.56',
      firstDayOfWeek: 'Sunday',
      timeFormat: '12-hour',
      defaultPaymentMethod: 'Card',
      defaultCategory: 'Food',
    },
  }
}
