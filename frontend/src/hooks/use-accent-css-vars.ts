'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { applyAccentColor } from '@/lib/accent'
import { useSettings } from '@/hooks/use-settings'

/**
 * Keeps :root --zf-accent* in sync with the saved appearance.accentColor
 * and the resolved light/dark theme (for theme-aware --zf-accent-soft).
 */
export function useAccentCssVars() {
  const { settings, loading } = useSettings()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (loading) return
    const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
    applyAccentColor(settings.appearance.accentColor, theme)
    const density = settings.appearance.density || 'comfortable'
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-density', density)
    }
  }, [loading, settings.appearance.accentColor, settings.appearance.density, resolvedTheme])
}
