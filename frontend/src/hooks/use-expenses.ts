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
import { clientCache } from '@/lib/client-cache'
import type { Expense, ExpenseInput } from '@/types/expense'

/**
 * Expenses data hook.
 * Backed by Django REST API endpoints (/api/expenses/) with in-memory SWR caching.
 */
export function useExpenses() {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const cacheKey = userEmail ? `${userEmail}:expenses` : ''

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    return cacheKey ? clientCache.get<Expense[]>(cacheKey) ?? [] : []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    return !cacheKey || !clientCache.has(cacheKey)
  })
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!cacheKey) return
    const unsubscribe = clientCache.subscribe(cacheKey, () => {
      const cached = clientCache.get<Expense[]>(cacheKey)
      if (cached) {
        setExpenses(cached)
        setLoading(false)
      }
    })
    return unsubscribe
  }, [cacheKey])

  useEffect(() => {
    if (!userEmail || !cacheKey) return
    let cancelled = false

    if (!clientCache.has(cacheKey)) {
      setLoading(true)
    }
    setError(null)

    apiGetExpenses()
      .then((records) => {
        if (!cancelled) {
          clientCache.set(cacheKey, records)
          setExpenses(records)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          const msg = 'Could not load your expenses.'
          setError(msg)
          if (!clientCache.has(cacheKey)) {
            toast.error(msg)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userEmail, cacheKey, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  const createExpense = useCallback(async (input: ExpenseInput) => {
    try {
      const created = await apiCreateExpense(input)
      const currentList = clientCache.get<Expense[]>(cacheKey) ?? expenses
      const updatedList = [...currentList, created]
      clientCache.set(cacheKey, updatedList)
      setExpenses(updatedList)
      toast.success('Expense added')
      return true
    } catch {
      toast.error('Could not add the expense.')
      return false
    }
  }, [cacheKey, expenses])

  const updateExpense = useCallback(
    async (id: string, patch: Partial<ExpenseInput>) => {
      try {
        const updated = await apiUpdateExpense(id, patch)
        const currentList = clientCache.get<Expense[]>(cacheKey) ?? expenses
        const updatedList = currentList.map((expense) =>
          expense.id === id ? updated : expense,
        )
        clientCache.set(cacheKey, updatedList)
        setExpenses(updatedList)
        toast.success('Expense updated')
        return true
      } catch {
        toast.error('Could not update the expense.')
        return false
      }
    },
    [cacheKey, expenses],
  )

  const deleteExpense = useCallback(async (id: string) => {
    try {
      await apiDeleteExpense(id)
      const currentList = clientCache.get<Expense[]>(cacheKey) ?? expenses
      const updatedList = currentList.filter((expense) => expense.id !== id)
      clientCache.set(cacheKey, updatedList)
      setExpenses(updatedList)
      toast.success('Expense deleted')
      return true
    } catch {
      toast.error('Could not delete the expense.')
      return false
    }
  }, [cacheKey, expenses])

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

