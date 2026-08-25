import type { AccentColor } from '@/types/settings'

export type AccentPalette = {
  base: string
  hover: string
  soft: string
}

/** Explicit hex triples — not hue rotations of each other. */
export const ACCENT_PALETTES: Record<AccentColor, AccentPalette> = {
  blue: { base: '#1D70E8', hover: '#1660CC', soft: '#E2EEFC' },
  teal: { base: '#14B8A6', hover: '#0F9B8A', soft: '#E0F7F4' },
  violet: { base: '#8B5CF6', hover: '#7C3AED', soft: '#EDE9FE' },
  coral: { base: '#F97316', hover: '#EA580C', soft: '#FFEDD5' },
}

/** Dark surface used when mixing a readable soft accent tint. */
const DARK_SURFACE = '#1A2332'

/**
 * Writes the active accent palette onto :root as --zf-accent*.
 * In dark mode, --zf-accent-soft is a color-mix of the accent into the dark
 * surface (~20%) so soft fills stay legible; light mode keeps pastel softs.
 * Base and hover are unchanged across themes.
 */
export function applyAccentColor(
  accent: AccentColor = 'blue',
  resolvedTheme: 'light' | 'dark' = 'light',
): void {
  if (typeof document === 'undefined') return

  const palette = ACCENT_PALETTES[accent] ?? ACCENT_PALETTES.blue
  const root = document.documentElement
  const soft =
    resolvedTheme === 'dark'
      ? `color-mix(in srgb, ${palette.base} 12%, ${DARK_SURFACE})`
      : palette.soft

  root.style.setProperty('--zf-accent', palette.base)
  root.style.setProperty('--zf-accent-hover', palette.hover)
  root.style.setProperty('--zf-accent-soft', soft)
}
