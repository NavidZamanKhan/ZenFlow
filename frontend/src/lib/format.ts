/**
 * Shared display formatters.
 */

import {
  CurrencyCode,
  CURRENCY_METADATA,
} from './currency'

export type { CurrencyCode }

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'BDT',
): string {
  const meta = CURRENCY_METADATA[currency] || CURRENCY_METADATA.BDT
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      maximumFractionDigits: meta.fractionDigits,
      minimumFractionDigits: meta.fractionDigits,
    }).format(amount)
  } catch {
    return `${meta.symbol}${amount.toFixed(meta.fractionDigits)}`
  }
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
