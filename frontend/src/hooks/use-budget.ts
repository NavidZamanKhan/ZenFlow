'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  apiGetBudget,
  apiRecordThresholdAlerts,
  apiUpdateBudget,
} from '@/lib/api'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/types/expense'
import {
  DEFAULT_BUDGET_THRESHOLDS,
  type Budget,
  type BudgetValues,
  type ThresholdAlert,
} from '@/types/budget'

import type { CurrencyCode } from '@/lib/currency'
import { useCurrency } from '@/lib/currency-context'

function emptyCategoryBudgets(): Record<ExpenseCategory, number> {
  return Object.fromEntries(
    EXPENSE_CATEGORIES.map((category) => [category, 0]),
  ) as Record<ExpenseCategory, number>
}

function createDefaultBudget(): Budget {
  const now = new Date().toISOString()
  return {
    monthlyTotal: 0,
    currency: 'BDT',
    categoryBudgets: emptyCategoryBudgets(),
    warningThresholds: [...DEFAULT_BUDGET_THRESHOLDS],
    alertedThresholds: {},
    createdAt: now,
    updatedAt: now,
  }
}

function nonNegativeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

/**
 * User-scoped budget persistence boundary connected to ZenFlow backend API.
 */
export function useBudget() {
  const { user } = useAuth()
  const { currency: activeCurrency, convert } = useCurrency()
  const [budget, setBudget] = useState<Budget>(createDefaultBudget)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const budgetRef = useRef(budget)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    apiGetBudget()
      .then((fetchedBudget) => {
        if (cancelled) return
        budgetRef.current = fetchedBudget
        setBudget(fetchedBudget)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('Could not load your budget.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const setMonthlyTotal = useCallback(
    async (monthlyTotal: number, currency?: CurrencyCode): Promise<boolean> => {
      try {
        const patch: Partial<BudgetValues> = {
          monthlyTotal: nonNegativeNumber(monthlyTotal),
        }
        if (currency) patch.currency = currency
        const updated = await apiUpdateBudget(patch)
        budgetRef.current = updated
        setBudget(updated)
        return true
      } catch {
        return false
      }
    },
    [],
  )

  const setCategoryBudget = useCallback(
    async (category: ExpenseCategory, amount: number, currency?: CurrencyCode): Promise<boolean> => {
      try {
        const current = budgetRef.current
        const mergedCategories = {
          ...current.categoryBudgets,
          [category]: nonNegativeNumber(amount),
        }
        const patch: Partial<BudgetValues> = {
          categoryBudgets: mergedCategories,
        }
        if (currency) patch.currency = currency
        const updated = await apiUpdateBudget(patch)
        budgetRef.current = updated
        setBudget(updated)
        return true
      } catch {
        return false
      }
    },
    [],
  )

  const recordThresholdAlerts = useCallback(
    async (
      month: string,
      alerts: ThresholdAlert[],
    ): Promise<ThresholdAlert[]> => {
      if (alerts.length === 0) return []

      try {
        const res = await apiRecordThresholdAlerts(month, alerts)
        if (res.recorded.length > 0) {
          const freshBudget = await apiGetBudget()
          budgetRef.current = freshBudget
          setBudget(freshBudget)
        }
        return res.recorded
      } catch {
        return []
      }
    },
    [],
  )

  const budgetCurrency = budget.currency || 'BDT'

  const displayMonthlyTotal = useMemo(() => {
    if (!budget.monthlyTotal) return 0
    if (budgetCurrency === activeCurrency) return budget.monthlyTotal
    return convert(budget.monthlyTotal, budgetCurrency)
  }, [budget.monthlyTotal, budgetCurrency, activeCurrency, convert])

  const displayCategoryBudgets = useMemo(() => {
    const res: Record<ExpenseCategory, number> = {} as Record<ExpenseCategory, number>
    for (const cat of EXPENSE_CATEGORIES) {
      const raw = budget.categoryBudgets[cat] ?? 0
      if (!raw) {
        res[cat] = 0
      } else if (budgetCurrency === activeCurrency) {
        res[cat] = raw
      } else {
        res[cat] = convert(raw, budgetCurrency)
      }
    }
    return res
  }, [budget.categoryBudgets, budgetCurrency, activeCurrency, convert])

  const hasBudget =
    displayMonthlyTotal > 0 ||
    Object.values(displayCategoryBudgets).some((amount: number) => amount > 0)

  return {
    budget,
    displayMonthlyTotal,
    displayCategoryBudgets,
    hasBudget,
    loading,
    error,
    reload,
    setMonthlyTotal,
    setCategoryBudget,
    recordThresholdAlerts,
  }
}
