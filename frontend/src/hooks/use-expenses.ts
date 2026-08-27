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

  const createExpense = useCallback(
    async (input: ExpenseInput) => {
      const currentList = clientCache.get<Expense[]>(cacheKey) ?? expenses
      const tempId = `temp-${crypto.randomUUID()}`
      const now = new Date().toISOString()
      const optimisticExpense: Expense = {
        id: tempId,
        title: input.title,
        amount: Number(input.amount),
        category: input.category,
        date: input.date,
        currency: input.currency || 'BDT',
        paymentMethod: input.paymentMethod,
        notes: input.notes ?? '',
        receiptImage: input.receiptImage ?? null,
        isRecurring: input.isRecurring ?? false,
        recurringInterval: input.recurringInterval || null,
        tags: input.tags ?? [],
        createdAt: now,
        updatedAt: now,
      }

      // Optimistic 0ms insert
      const optimisticList = [optimisticExpense, ...currentList]
      clientCache.set(cacheKey, optimisticList)
      setExpenses(optimisticList)
      toast.success('Expense added')

      try {
        const created = await apiCreateExpense(input)
        const syncedList = (clientCache.get<Expense[]>(cacheKey) ?? optimisticList).map(
          (e) => (e.id === tempId ? created : e),
        )
        clientCache.set(cacheKey, syncedList)
        setExpenses(syncedList)
        return true
      } catch {
        // Rollback
        const rolledBackList = (clientCache.get<Expense[]>(cacheKey) ?? optimisticList).filter(
          (e) => e.id !== tempId,
        )
        clientCache.set(cacheKey, rolledBackList)
        setExpenses(rolledBackList)
        toast.error('Could not add the expense.')
        return false
      }
    },
    [cacheKey, expenses],
  )

  const updateExpense = useCallback(
    async (id: string, patch: Partial<ExpenseInput>) => {
      const currentList = clientCache.get<Expense[]>(cacheKey) ?? expenses
      const originalExpense = currentList.find((e) => e.id === id)
      if (!originalExpense) return false

      // Optimistic 0ms update
      const now = new Date().toISOString()
      const optimisticList = currentList.map((e) =>
        e.id === id
          ? {
              ...e,
              ...patch,
              amount: patch.amount !== undefined ? Number(patch.amount) : e.amount,
              updatedAt: now,
            }
          : e,
      )
      clientCache.set(cacheKey, optimisticList)
      setExpenses(optimisticList)
      toast.success('Expense updated')

      try {
        const updated = await apiUpdateExpense(id, patch)
        const syncedList = (clientCache.get<Expense[]>(cacheKey) ?? optimisticList).map(
          (e) => (e.id === id ? updated : e),
        )
        clientCache.set(cacheKey, syncedList)
        setExpenses(syncedList)
        return true
      } catch {
        // Rollback
        const rolledBackList = (clientCache.get<Expense[]>(cacheKey) ?? optimisticList).map(
          (e) => (e.id === id ? originalExpense : e),
        )
        clientCache.set(cacheKey, rolledBackList)
        setExpenses(rolledBackList)
        toast.error('Could not update the expense.')
        return false
      }
    },
    [cacheKey, expenses],
  )

  const deleteExpense = useCallback(
    async (id: string) => {
      const currentList = clientCache.get<Expense[]>(cacheKey) ?? expenses
      const originalExpense = currentList.find((e) => e.id === id)
      if (!originalExpense) return false

      // Optimistic 0ms delete
      const optimisticList = currentList.filter((e) => e.id !== id)
      clientCache.set(cacheKey, optimisticList)
      setExpenses(optimisticList)
      toast.success('Expense deleted')

      try {
        await apiDeleteExpense(id)
        return true
      } catch {
        // Rollback
        const rolledBackList = [...(clientCache.get<Expense[]>(cacheKey) ?? optimisticList), originalExpense]
        clientCache.set(cacheKey, rolledBackList)
        setExpenses(rolledBackList)
        toast.error('Could not delete the expense.')
        return false
      }
    },
    [cacheKey, expenses],
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

