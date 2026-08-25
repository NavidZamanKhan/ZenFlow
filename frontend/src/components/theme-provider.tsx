'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

/**
 * App-wide theme class manager (light / dark / system).
 * Persistence of the user's preference lives in useSettings() —
 * SettingsThemeSync keeps next-themes aligned with that store.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      storageKey="zenflow:ui-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
