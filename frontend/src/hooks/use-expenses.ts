'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { createClientStore } from '@/lib/client-store'
import type { Expense, ExpenseInput } from '@/types/expense'

/**
 * Expenses data hook.
 * Persistence currently goes through createClientStore → localStorage.
 * Swap the store internals for real API calls later without changing consumers.
 */
const expenseStore = createClientStore<ExpenseInput, Expense>('expenses')

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
    expenseStore
      .list(userEmail)
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

  const createExpense = useCallback(
    async (input: ExpenseInput) => {
      try {
        const created = await expenseStore.create(userEmail, input)
        setExpenses((prev) => [...prev, created])
        toast.success('Expense added')
        return true
      } catch {
        toast.error('Could not add the expense.')
        return false
      }
    },
    [userEmail],
  )

  const updateExpense = useCallback(
    async (id: string, patch: Partial<ExpenseInput>) => {
      try {
        const updated = await expenseStore.update(userEmail, id, patch)
        setExpenses((prev) => prev.map((expense) => (expense.id === id ? updated : expense)))
        toast.success('Expense updated')
        return true
      } catch {
        toast.error('Could not update the expense.')
        return false
      }
    },
    [userEmail],
  )

  const deleteExpense = useCallback(
    async (id: string) => {
      try {
        await expenseStore.remove(userEmail, id)
        setExpenses((prev) => prev.filter((expense) => expense.id !== id))
        toast.success('Expense deleted')
        return true
      } catch {
        toast.error('Could not delete the expense.')
        return false
      }
    },
    [userEmail],
  )

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
