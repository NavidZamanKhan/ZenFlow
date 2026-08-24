'use client'

import { useEffect } from 'react'
import { applyAccentColor } from '@/lib/accent'
import { useSettings } from '@/hooks/use-settings'

/**
 * Keeps :root --zf-accent* in sync with the saved appearance.accentColor.
 * Pair with applyAccentColor() on Appearance save so updates apply without remount.
 */
export function useAccentCssVars() {
  const { settings, loading } = useSettings()

  useEffect(() => {
    if (loading) return
    applyAccentColor(settings.appearance.accentColor)
  }, [loading, settings.appearance.accentColor])
}
