'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGetAnalyticsSummary } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { clientCache } from '@/lib/client-cache'
import type { AnalyticsSummary, AnalyticsSummaryParams } from '@/types/analytics'

export function analyticsSummaryCacheKey(userEmail: string, params: AnalyticsSummaryParams = {}): string {
  return `${userEmail}:analytics-summary:${params.start ?? ''}:${params.end ?? ''}`
}

/**
 * Drop every cached analytics summary for the user so the next render
 * refetches. Called by the expenses hook after any mutation.
 */
export function invalidateAnalyticsSummary(userEmail: string): void {
  if (!userEmail) return
  clientCache.deleteByPrefix(`${userEmail}:analytics-summary:`)
}

/**
 * Server-side expense aggregation (per-category / per-month totals etc.).
 * Stale-while-revalidate: cached data renders instantly, then refreshes.
 */
export function useAnalyticsSummary(params: AnalyticsSummaryParams = {}) {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const { start, end } = params
  const cacheKey = userEmail ? analyticsSummaryCacheKey(userEmail, { start, end }) : ''

  const [summary, setSummary] = useState<AnalyticsSummary | null>(() =>
    cacheKey ? clientCache.get<AnalyticsSummary>(cacheKey) ?? null : null,
  )
  const [loading, setLoading] = useState<boolean>(() => !cacheKey || !clientCache.has(cacheKey))
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Follow cache updates/invalidation triggered elsewhere (expense mutations).
  useEffect(() => {
    if (!cacheKey) return
    return clientCache.subscribe(cacheKey, () => {
      const cached = clientCache.get<AnalyticsSummary>(cacheKey)
      if (cached) {
        setSummary(cached)
        setLoading(false)
      } else {
        setReloadKey((key) => key + 1)
      }
    })
  }, [cacheKey])

  useEffect(() => {
    if (!userEmail || !cacheKey) return
    let cancelled = false

    // `loading` starts true when nothing is cached (see useState); invalidation
    // after an expense mutation refetches in the background while the stale
    // summary stays on screen.
    apiGetAnalyticsSummary({ start, end })
      .then((data) => {
        if (cancelled) return
        clientCache.set(cacheKey, data)
        setSummary(data)
        setError(null)
      })
      .catch((err: unknown) => {
        console.error('Failed to load analytics summary', err)
        if (!cancelled) setError('Could not load your insights.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userEmail, cacheKey, start, end, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  return { summary, loading, error, reload }
}
