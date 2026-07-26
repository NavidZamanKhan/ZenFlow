'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  apiCreateExpense,
  apiDeleteExpense,
  apiGetExpenses,
  apiUpdateExpense,
} from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Expense, ExpenseInput } from '@/types/expense'

/**
 * Expenses data hook.
 * Backed by Django REST API endpoints (/api/expenses/).
 */
export function useExpenses() {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!userEmail) return
    let cancelled = false
    /* eslint-disable react-hooks/set-state-in-effect -- reset load flags before async list */
    setLoading(true)
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    apiGetExpenses()
      .then((records) => {
        if (!cancelled) {
          setExpenses(records)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load your expenses.')
          toast.error('Could not load your expenses.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userEmail, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const createExpense = useCallback(async (input: ExpenseInput) => {
    try {
      const created = await apiCreateExpense(input)
      setExpenses((prev) => [...prev, created])
      toast.success('Expense added')
      return true
    } catch {
      toast.error('Could not add the expense.')
      return false
    }
  }, [])

  const updateExpense = useCallback(
    async (id: string, patch: Partial<ExpenseInput>) => {
      try {
        const updated = await apiUpdateExpense(id, patch)
        setExpenses((prev) =>
          prev.map((expense) => (expense.id === id ? updated : expense)),
        )
        toast.success('Expense updated')
        return true
      } catch {
        toast.error('Could not update the expense.')
        return false
      }
    },
    [],
  )

  const deleteExpense = useCallback(async (id: string) => {
    try {
      await apiDeleteExpense(id)
      setExpenses((prev) => prev.filter((expense) => expense.id !== id))
      toast.success('Expense deleted')
      return true
    } catch {
      toast.error('Could not delete the expense.')
      return false
    }
  }, [])

  return {
    expenses,
    loading,
    error,
    reload,
    createExpense,
    updateExpense,
    deleteExpense,
  }
}

