'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/types/expense'
import {
  DEFAULT_BUDGET_THRESHOLDS,
  type Budget,
  type BudgetAlertHistory,
} from '@/types/budget'

export type ThresholdAlert = {
  category: ExpenseCategory
  threshold: number
}

export function budgetStorageKey(userEmail: string): string {
  return `zenflow:budget:${userEmail}`
}

function emptyCategoryBudgets(): Record<ExpenseCategory, number> {
  return Object.fromEntries(
    EXPENSE_CATEGORIES.map((category) => [category, 0]),
  ) as Record<ExpenseCategory, number>
}

function createDefaultBudget(): Budget {
  const now = new Date().toISOString()
  return {
    monthlyTotal: 0,
    categoryBudgets: emptyCategoryBudgets(),
    warningThresholds: [...DEFAULT_BUDGET_THRESHOLDS],
    alertedThresholds: {},
    createdAt: now,
    updatedAt: now,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonNegativeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

function normalizeBudget(value: unknown): Budget {
  const defaults = createDefaultBudget()
  if (!isRecord(value)) return defaults

  const storedCategories = isRecord(value.categoryBudgets)
    ? value.categoryBudgets
    : {}
  const categoryBudgets = emptyCategoryBudgets()
  for (const category of EXPENSE_CATEGORIES) {
    categoryBudgets[category] = nonNegativeNumber(storedCategories[category])
  }

  const warningThresholds = Array.isArray(value.warningThresholds)
    ? value.warningThresholds
        .filter(
          (threshold): threshold is number =>
            typeof threshold === 'number' &&
            Number.isFinite(threshold) &&
            threshold > 0,
        )
        .sort((a, b) => a - b)
    : [...DEFAULT_BUDGET_THRESHOLDS]

  return {
    monthlyTotal: nonNegativeNumber(value.monthlyTotal),
    categoryBudgets,
    warningThresholds:
      warningThresholds.length > 0
        ? warningThresholds
        : [...DEFAULT_BUDGET_THRESHOLDS],
    alertedThresholds: isRecord(value.alertedThresholds)
      ? (value.alertedThresholds as BudgetAlertHistory)
      : {},
    createdAt:
      typeof value.createdAt === 'string'
        ? value.createdAt
        : defaults.createdAt,
    updatedAt:
      typeof value.updatedAt === 'string'
        ? value.updatedAt
        : defaults.updatedAt,
  }
}

/**
 * User-scoped budget persistence boundary. Components never access localStorage;
 * replacing these internals with an API leaves consumers unchanged.
 */
export function useBudget() {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const [budget, setBudget] = useState<Budget>(createDefaultBudget)
  const [loading, setLoading] = useState(true)
  const [hasBudget, setHasBudget] = useState(false)
  const budgetRef = useRef(budget)

  useEffect(() => {
    if (!userEmail) return

    let cancelled = false
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(budgetStorageKey(userEmail))
        const next = normalizeBudget(raw ? JSON.parse(raw) : null)
        if (!cancelled) {
          budgetRef.current = next
          setBudget(next)
          setHasBudget(raw !== null)
        }
      } catch {
        const next = createDefaultBudget()
        if (!cancelled) {
          budgetRef.current = next
          setBudget(next)
          setHasBudget(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userEmail])

  const persist = useCallback(
    (next: Budget): boolean => {
      if (!userEmail) return false
      try {
        localStorage.setItem(budgetStorageKey(userEmail), JSON.stringify(next))
        budgetRef.current = next
        setBudget(next)
        setHasBudget(true)
        return true
      } catch {
        return false
      }
    },
    [userEmail],
  )

  const setMonthlyTotal = useCallback(
    (monthlyTotal: number): boolean => {
      const current = budgetRef.current
      return persist({
        ...current,
        monthlyTotal: nonNegativeNumber(monthlyTotal),
        updatedAt: new Date().toISOString(),
      })
    },
    [persist],
  )

  const setCategoryBudget = useCallback(
    (category: ExpenseCategory, amount: number): boolean => {
      const current = budgetRef.current
      return persist({
        ...current,
        categoryBudgets: {
          ...current.categoryBudgets,
          [category]: nonNegativeNumber(amount),
        },
        updatedAt: new Date().toISOString(),
      })
    },
    [persist],
  )

  const recordThresholdAlerts = useCallback(
    (month: string, alerts: ThresholdAlert[]): ThresholdAlert[] => {
      if (alerts.length === 0) return []

      const current = budgetRef.current
      const monthHistory = current.alertedThresholds[month] ?? {}
      const recorded: ThresholdAlert[] = []
      const nextMonthHistory = { ...monthHistory }

      for (const alert of alerts) {
        const previous = nextMonthHistory[alert.category] ?? []
        if (previous.includes(alert.threshold)) continue
        nextMonthHistory[alert.category] = [...previous, alert.threshold]
        recorded.push(alert)
      }

      if (recorded.length === 0) return []

      const next: Budget = {
        ...current,
        alertedThresholds: {
          ...current.alertedThresholds,
          [month]: nextMonthHistory,
        },
        updatedAt: new Date().toISOString(),
      }

      return persist(next) ? recorded : []
    },
    [persist],
  )

  return {
    budget,
    hasBudget,
    loading,
    setMonthlyTotal,
    setCategoryBudget,
    recordThresholdAlerts,
  }
}
