'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useAuth } from '@/lib/auth'
import { apiGetBudget, apiUpdateBudget } from '@/lib/api'
import { clientCache } from '@/lib/client-cache'
import {
  type CurrencyCode,
  convertAmount,
  fetchExchangeRates,
} from '@/lib/currency'
import {
  createDefaultSettings,
  type ZenFlowSettings,
  type ExpensePreferenceSettings,
  type SettingsCurrency,
} from '@/types/settings'

export function settingsStorageKey(userEmail: string): string {
  return `zenflow:settings:${userEmail}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeStoredSettings(
  stored: unknown,
  defaults: ZenFlowSettings,
): ZenFlowSettings {
  if (!isRecord(stored)) return defaults

  const storedAppearance = isRecord(stored.appearance) ? stored.appearance : {}
  const activeUiTheme =
    typeof window !== 'undefined'
      ? (localStorage.getItem('zenflow:ui-theme') as ZenFlowSettings['appearance']['theme'] | null)
      : null

  return {
    profile: isRecord(stored.profile)
      ? { ...defaults.profile, ...stored.profile }
      : defaults.profile,
    appearance: {
      ...defaults.appearance,
      ...storedAppearance,
      theme:
        activeUiTheme && ['light', 'dark', 'system'].includes(activeUiTheme)
          ? activeUiTheme
          : (storedAppearance.theme as ZenFlowSettings['appearance']['theme']) ||
            defaults.appearance.theme,
    },
    expensePreferences: isRecord(stored.expensePreferences)
      ? { ...defaults.expensePreferences, ...stored.expensePreferences }
      : defaults.expensePreferences,
  } as ZenFlowSettings
}

interface SettingsContextType {
  settings: ZenFlowSettings
  loading: boolean
  error: string | null
  reload: () => void
  updateSection: <Section extends keyof ZenFlowSettings>(
    section: Section,
    value: ZenFlowSettings[Section],
  ) => boolean
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const VALID_CATEGORIES = [
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
]

function normalizeCategoryName(raw: string): string {
  const match = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === raw.trim().toLowerCase(),
  )
  return match || 'Others'
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const [settings, setSettings] = useState<ZenFlowSettings>(() =>
    createDefaultSettings(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!userEmail) {
      setSettings(createDefaultSettings())
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const defaults = createDefaultSettings(
      userEmail,
      user?.fullName ?? '',
      timeZone,
    )

    let initialMerged = defaults
    try {
      const raw = localStorage.getItem(settingsStorageKey(userEmail))
      const stored: unknown = raw ? JSON.parse(raw) : null
      initialMerged = mergeStoredSettings(stored, defaults)
      if (!cancelled) {
        setSettings(initialMerged)
        setError(null)
      }
    } catch {
      if (!cancelled) {
        setSettings(defaults)
        setError('Could not load your saved settings.')
      }
    } finally {
      if (!cancelled) setLoading(false)
    }

    // Cloud synchronization: verify cloud budget and keep in sync without overwriting user's local explicit preference
    apiGetBudget()
      .then((cloudBudget) => {
        if (cancelled || !cloudBudget?.currency) return
        const localCur = initialMerged.expensePreferences?.currency
        if (localCur && localCur !== cloudBudget.currency) {
          // Push local preferred currency to cloud so cloud catches up to user choice
          fetchExchangeRates().then((ratesData) => {
            const oldCur = cloudBudget.currency as CurrencyCode
            const newCur = localCur as CurrencyCode
            const rates = ratesData.rates
            const convertedMonthlyTotal = convertAmount(
              cloudBudget.monthlyTotal || 0,
              newCur,
              rates,
              oldCur,
            )
            const convertedCategories: Record<string, number> = {}
            if (cloudBudget.categoryBudgets) {
              for (const [cat, amt] of Object.entries(cloudBudget.categoryBudgets)) {
                const normalizedCat = normalizeCategoryName(cat)
                convertedCategories[normalizedCat] = convertAmount(
                  Number(amt) || 0,
                  newCur,
                  rates,
                  oldCur,
                )
              }
            }
            apiUpdateBudget({
              monthlyTotal: convertedMonthlyTotal,
              categoryBudgets: convertedCategories,
              currency: newCur,
            }).then((updatedBudget) => {
              const budgetCacheKey = `${userEmail}:budget`
              clientCache.set(budgetCacheKey, updatedBudget)
            }).catch(() => {})
          }).catch(() => {})
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [userEmail, user?.fullName, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const updateSection = useCallback(
    <Section extends keyof ZenFlowSettings>(
      section: Section,
      value: ZenFlowSettings[Section],
    ): boolean => {
      if (!userEmail) return false

      try {
        const next = { ...settings, [section]: value }
        localStorage.setItem(settingsStorageKey(userEmail), JSON.stringify(next))
        if (section === 'appearance') {
          const app = value as ZenFlowSettings['appearance']
          if (app.theme && typeof window !== 'undefined') {
            localStorage.setItem('zenflow:ui-theme', app.theme)
          }
        } else if (section === 'expensePreferences') {
          const exp = value as ExpensePreferenceSettings
          const oldCurrency = settings.expensePreferences?.currency || 'BDT'
          const newCurrency = exp.currency

          if (newCurrency && newCurrency !== oldCurrency) {
            // Fetch rates and convert current cloud budget to new currency in real-time
            Promise.all([apiGetBudget(), fetchExchangeRates()])
              .then(([cloudBudget, ratesData]) => {
                const oldCur = (cloudBudget.currency || oldCurrency) as CurrencyCode
                const newCur = newCurrency as CurrencyCode
                const rates = ratesData.rates
                const convertedMonthlyTotal = convertAmount(
                  cloudBudget.monthlyTotal || 0,
                  newCur,
                  rates,
                  oldCur,
                )
                const convertedCategories: Record<string, number> = {}
                if (cloudBudget.categoryBudgets) {
                  for (const [cat, amt] of Object.entries(cloudBudget.categoryBudgets)) {
                    const normalizedCat = normalizeCategoryName(cat)
                    convertedCategories[normalizedCat] = convertAmount(
                      Number(amt) || 0,
                      newCur,
                      rates,
                      oldCur,
                    )
                  }
                }
                return apiUpdateBudget({
                  monthlyTotal: convertedMonthlyTotal,
                  categoryBudgets: convertedCategories,
                  currency: newCur,
                }).then((updatedBudget) => {
                  // Invalidate and update SWR in-memory clientCache
                  const budgetCacheKey = `${userEmail}:budget`
                  clientCache.set(budgetCacheKey, updatedBudget)
                })
              })
              .catch((err) => {
                console.error('Failed to sync converted budget to cloud', err)
              })
          }
        }
        setSettings(next)
        return true
      } catch {
        return false
      }
    },
    [settings, userEmail],
  )

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        reload,
        updateSection,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
