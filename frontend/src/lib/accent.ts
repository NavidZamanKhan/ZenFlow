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

/**
 * Writes the active accent palette onto :root as --zf-accent*.
 * Call on dashboard load and immediately after a successful Appearance save.
 */
export function applyAccentColor(accent: AccentColor = 'blue'): void {
  if (typeof document === 'undefined') return

  const palette = ACCENT_PALETTES[accent] ?? ACCENT_PALETTES.blue
  const root = document.documentElement
  root.style.setProperty('--zf-accent', palette.base)
  root.style.setProperty('--zf-accent-hover', palette.hover)
  root.style.setProperty('--zf-accent-soft', palette.soft)
}
