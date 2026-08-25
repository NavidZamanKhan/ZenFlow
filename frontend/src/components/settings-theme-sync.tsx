'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/auth'
import { useSettings } from '@/hooks/use-settings'

/**
 * Bridges useSettings().appearance.theme → next-themes on load / when the
 * persisted theme value actually changes.
 *
 * IMPORTANT: next-themes recreates `setTheme` whenever its internal theme
 * state changes (`useCallback(..., [theme])`). This sync must NOT list
 * `setTheme` as an effect dependency — otherwise, after Appearance saves a
 * new theme and calls setTheme(), this effect re-fires with a *stale*
 * useSettings() copy (each useSettings() call has independent React state)
 * and overwrites the user's choice (classic Dark→Light failure).
 */
export function SettingsThemeSync() {
  const { user } = useAuth()
  const { settings, loading } = useSettings()
  const { setTheme } = useTheme()
  const setThemeRef = useRef(setTheme)
  setThemeRef.current = setTheme

  const theme = settings.appearance.theme

  useEffect(() => {
    if (!user || loading) return
    setThemeRef.current(theme)
  }, [user, loading, theme])

  return null
}
