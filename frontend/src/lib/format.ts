/**
 * Shared display formatters.
 * Currency/date preferences from Settings can later drive these helpers
 * without touching consuming components.
 */

export type CurrencyCode = 'USD' | 'EUR' | 'BDT' | 'INR'

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  BDT: 'en-BD',
  INR: 'en-IN',
}

export function formatCurrency(amount: number, currency: CurrencyCode = 'USD'): string {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export type DateFormatPreference = 'MDY' | 'DMY'

export function formatDisplayDate(
  iso: string,
  preference: DateFormatPreference = 'MDY',
): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(date.getTime())) return iso

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()

  return preference === 'DMY' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`
}
