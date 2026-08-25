'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  CurrencyCode,
  CURRENCY_METADATA,
  CurrencyMeta,
  FALLBACK_RATES_USD_BASE,
  fetchExchangeRates,
  convertAmount,
  formatMoney,
} from './currency'
import { useSettings } from '@/hooks/use-settings'

interface CurrencyContextType {
  currency: CurrencyCode
  meta: CurrencyMeta
  rates: Record<CurrencyCode, number>
  rateAgainstUSD: number
  lastUpdated: string
  isLive: boolean
  loadingRates: boolean
  convert: (amount: number, fromCurrency?: CurrencyCode) => number
  format: (amount: number, fromCurrency?: CurrencyCode) => string
  refreshRates: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()
  const activeCurrency = (settings.expensePreferences?.currency as CurrencyCode) || 'BDT'

  const [rates, setRates] = useState<Record<CurrencyCode, number>>(FALLBACK_RATES_USD_BASE)
  const [lastUpdated, setLastUpdated] = useState<string>('Live')
  const [isLive, setIsLive] = useState<boolean>(true)
  const [loadingRates, setLoadingRates] = useState<boolean>(false)

  const loadRates = useCallback(async (force = false) => {
    setLoadingRates(true)
    try {
      const data = await fetchExchangeRates(force)
      setRates(data.rates)
      setLastUpdated(data.lastUpdated)
      setIsLive(data.isLive)
    } catch {
      // Fallback already handled
    } finally {
      setLoadingRates(false)
    }
  }, [])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  const convert = useCallback(
    (amount: number, fromCurrency: CurrencyCode = 'USD'): number => {
      return convertAmount(amount, activeCurrency, rates, fromCurrency)
    },
    [activeCurrency, rates],
  )

  const format = useCallback(
    (amount: number, fromCurrency: CurrencyCode = 'USD'): string => {
      return formatMoney(amount, activeCurrency, rates, fromCurrency)
    },
    [activeCurrency, rates],
  )

  const refreshRates = useCallback(async () => {
    await loadRates(true)
  }, [loadRates])

  const meta = CURRENCY_METADATA[activeCurrency] || CURRENCY_METADATA.BDT
  const rateAgainstUSD = rates[activeCurrency] || 1

  return (
    <CurrencyContext.Provider
      value={{
        currency: activeCurrency,
        meta,
        rates,
        rateAgainstUSD,
        lastUpdated,
        isLive,
        loadingRates,
        convert,
        format,
        refreshRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    // Graceful fallback if called outside provider
    const fallbackCurrency: CurrencyCode = 'BDT'
    const fallbackMeta = CURRENCY_METADATA[fallbackCurrency]
    return {
      currency: fallbackCurrency,
      meta: fallbackMeta,
      rates: FALLBACK_RATES_USD_BASE,
      rateAgainstUSD: FALLBACK_RATES_USD_BASE.BDT,
      lastUpdated: 'Default',
      isLive: false,
      loadingRates: false,
      convert: (amount: number) => convertAmount(amount, fallbackCurrency, FALLBACK_RATES_USD_BASE, 'USD'),
      format: (amount: number) => formatMoney(amount, fallbackCurrency, FALLBACK_RATES_USD_BASE, 'USD'),
      refreshRates: async () => {},
    }
  }
  return context
}
