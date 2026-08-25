// ---------------------------------------------------------------------------
// Real-time Currency Exchange Rate Engine & Formatter
// ---------------------------------------------------------------------------

export type CurrencyCode =
  | 'BDT'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'INR'
  | 'JPY'
  | 'CAD'
  | 'AUD'

export interface CurrencyMeta {
  code: CurrencyCode
  name: string
  symbol: string
  locale: string
  flag: string
  fractionDigits: number
}

export const CURRENCY_METADATA: Record<CurrencyCode, CurrencyMeta> = {
  BDT: {
    code: 'BDT',
    name: 'Bangladeshi Taka',
    symbol: '৳',
    locale: 'en-BD',
    flag: '🇧🇩',
    fractionDigits: 2,
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    locale: 'en-US',
    flag: '🇺🇸',
    fractionDigits: 2,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    locale: 'de-DE',
    flag: '🇪🇺',
    fractionDigits: 2,
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    locale: 'en-GB',
    flag: '🇬🇧',
    fractionDigits: 2,
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    locale: 'en-IN',
    flag: '🇮🇳',
    fractionDigits: 2,
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    locale: 'ja-JP',
    flag: '🇯🇵',
    fractionDigits: 0,
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$',
    locale: 'en-CA',
    flag: '🇨🇦',
    fractionDigits: 2,
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'AU$',
    locale: 'en-AU',
    flag: '🇦🇺',
    fractionDigits: 2,
  },
}

// Fallback rates against USD in case of network unavailability / offline mode
export const FALLBACK_RATES_USD_BASE: Record<CurrencyCode, number> = {
  USD: 1.0,
  BDT: 121.5,
  EUR: 0.92,
  GBP: 0.79,
  INR: 86.5,
  JPY: 154.2,
  CAD: 1.38,
  AUD: 1.52,
}

const CACHE_KEY = 'zenflow:exchange_rates_v1'
const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

export interface ExchangeRatesData {
  base: string
  rates: Record<CurrencyCode, number>
  lastUpdated: string
  isLive: boolean
}

/**
 * Fetch live exchange rates with localStorage caching and fallback.
 */
export async function fetchExchangeRates(forceRefresh = false): Promise<ExchangeRatesData> {
  if (typeof window !== 'undefined' && !forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY)
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw)
        const age = Date.now() - new Date(parsed.timestamp).getTime()
        if (age < CACHE_TTL_MS && parsed.rates?.BDT) {
          return {
            base: 'USD',
            rates: parsed.rates,
            lastUpdated: parsed.lastUpdated || new Date(parsed.timestamp).toLocaleTimeString(),
            isLive: true,
          }
        }
      }
    } catch {
      // Cache parsing failed, proceed to fetch
    }
  }

  // Fetch live rates from Open Exchange Rates API (free, open, no key required)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      if (data && data.rates) {
        const liveRates: Record<CurrencyCode, number> = {
          USD: 1.0,
          BDT: Number(data.rates.BDT) || FALLBACK_RATES_USD_BASE.BDT,
          EUR: Number(data.rates.EUR) || FALLBACK_RATES_USD_BASE.EUR,
          GBP: Number(data.rates.GBP) || FALLBACK_RATES_USD_BASE.GBP,
          INR: Number(data.rates.INR) || FALLBACK_RATES_USD_BASE.INR,
          JPY: Number(data.rates.JPY) || FALLBACK_RATES_USD_BASE.JPY,
          CAD: Number(data.rates.CAD) || FALLBACK_RATES_USD_BASE.CAD,
          AUD: Number(data.rates.AUD) || FALLBACK_RATES_USD_BASE.AUD,
        }

        const result: ExchangeRatesData = {
          base: 'USD',
          rates: liveRates,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isLive: true,
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              timestamp: new Date().toISOString(),
              lastUpdated: result.lastUpdated,
              rates: liveRates,
            }),
          )
        }

        return result
      }
    }
  } catch {
    // Network failure / timeout — fallback gracefully
  }

  return {
    base: 'USD',
    rates: FALLBACK_RATES_USD_BASE,
    lastUpdated: 'Fallback Rate',
    isLive: false,
  }
}

/**
 * Converts an amount from one currency to another using exchange rates.
 */
export function convertAmount(
  amount: number,
  toCurrency: CurrencyCode = 'BDT',
  rates: Record<CurrencyCode, number> = FALLBACK_RATES_USD_BASE,
  fromCurrency: CurrencyCode = 'USD',
): number {
  if (fromCurrency === toCurrency || !amount) return amount
  const fromRate = rates[fromCurrency] || 1
  const toRate = rates[toCurrency] || 1
  const inUSD = amount / fromRate
  return inUSD * toRate
}

/**
 * Formats an amount into the localized currency string (e.g. ৳12,500.00 or $100.00).
 * If fromCurrency is provided and differs from currency, it converts the amount first.
 */
export function formatMoney(
  amount: number,
  currency: CurrencyCode = 'BDT',
  rates: Record<CurrencyCode, number> = FALLBACK_RATES_USD_BASE,
  fromCurrency?: CurrencyCode,
): string {
  const converted =
    fromCurrency && fromCurrency !== currency
      ? convertAmount(amount, currency, rates, fromCurrency)
      : amount

  const meta = CURRENCY_METADATA[currency] || CURRENCY_METADATA.BDT

  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      maximumFractionDigits: meta.fractionDigits,
      minimumFractionDigits: meta.fractionDigits,
    }).format(converted)
  } catch {
    return `${meta.symbol}${converted.toFixed(meta.fractionDigits)}`
  }
}
