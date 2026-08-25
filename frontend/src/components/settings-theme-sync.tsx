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
  const { theme: activeTheme, setTheme } = useTheme()
  const initialSyncDone = useRef(false)

  const theme = settings.appearance.theme

  useEffect(() => {
    if (!user || loading) return

    // On initial load, if ui-theme is already stored in browser, don't clobber it
    if (!initialSyncDone.current) {
      initialSyncDone.current = true
      const storedUiTheme =
        typeof window !== 'undefined'
          ? localStorage.getItem('zenflow:ui-theme')
          : null
      if (storedUiTheme && ['light', 'dark', 'system'].includes(storedUiTheme)) {
        // UI theme is already present, match next-themes
        if (storedUiTheme !== activeTheme) {
          setTheme(storedUiTheme)
        }
        return
      }
    }

    if (theme && theme !== activeTheme) {
      setTheme(theme)
    }
  }, [user, loading, theme, activeTheme, setTheme])

  return null
}
