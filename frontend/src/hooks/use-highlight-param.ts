'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Reads `?highlight=<id>` from the URL and briefly marks that item so list
 * pages can scroll to it and show a temporary ring. Clears after a few
 * seconds so the highlight doesn't stick forever.
 */
export function useHighlightParam(durationMs = 4000): string | null {
  const searchParams = useSearchParams()
  const highlight = searchParams.get('highlight')
  const [expiredId, setExpiredId] = useState<string | null>(null)

  useEffect(() => {
    if (!highlight) return
    const clearTimer = window.setTimeout(
      () => setExpiredId(highlight),
      durationMs,
    )
    return () => window.clearTimeout(clearTimer)
  }, [highlight, durationMs])

  const activeId =
    highlight && expiredId !== highlight ? highlight : null

  useEffect(() => {
    if (!activeId) return
    const frame = window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-highlight-id="${CSS.escape(activeId)}"]`,
      )
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeId])

  return activeId
}
