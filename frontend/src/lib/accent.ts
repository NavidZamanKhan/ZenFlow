import type { AccentColor } from '@/types/settings'

export type AccentPalette = {
  base: string
  hover: string
  soft: string
  /** Very light pastel background for light mode cards/callouts */
  lightBg: string
  /** Subtle pastel border for light mode cards/callouts */
  lightBorder: string
  /** Dark mode surface palette — accent-tinted dark backgrounds */
  dark: {
    canvas: string
    surface: string
    elevated: string
    border: string
    softFill: string
  }
}

/** Explicit hex triples — not hue rotations of each other. */
export const ACCENT_PALETTES: Record<AccentColor, AccentPalette> = {
  blue: {
    base: '#1D70E8',
    hover: '#1660CC',
    soft: '#E2EEFC',
    lightBg: '#F5F9FE',
    lightBorder: '#D7E7FA',
    dark: {
      canvas: '#0f1419',
      surface: '#1a2332',
      elevated: '#243044',
      border: '#2e3a4d',
      softFill: '#1e293b',
    },
  },
  teal: {
    base: '#14B8A6',
    hover: '#0F9B8A',
    soft: '#E0F7F4',
    lightBg: '#F0FDFA',
    lightBorder: '#C3F0EA',
    dark: {
      canvas: '#0f1716',
      surface: '#1a2e2b',
      elevated: '#24403b',
      border: '#2e4d47',
      softFill: '#1e3330',
    },
  },
  violet: {
    base: '#8B5CF6',
    hover: '#7C3AED',
    soft: '#EDE9FE',
    lightBg: '#F5F3FF',
    lightBorder: '#DDD6FE',
    dark: {
      canvas: '#110f19',
      surface: '#221a33',
      elevated: '#312444',
      border: '#3d2e4d',
      softFill: '#27203b',
    },
  },
  coral: {
    base: '#F97316',
    hover: '#EA580C',
    soft: '#FFEDD5',
    lightBg: '#FFF7ED',
    lightBorder: '#FED7AA',
    dark: {
      canvas: '#171210',
      surface: '#2d2118',
      elevated: '#3d2e22',
      border: '#4d3a2e',
      softFill: '#33271e',
    },
  },
}

/**
 * Writes the active accent palette onto :root as --zf-accent*.
 * In dark mode, surfaces, borders, and fills are tinted to match the accent.
 */
export function applyAccentColor(
  accent: AccentColor = 'blue',
  resolvedTheme: 'light' | 'dark' = 'light',
): void {
  if (typeof document === 'undefined') return

  const palette = ACCENT_PALETTES[accent] ?? ACCENT_PALETTES.blue
  const root = document.documentElement
  const isDark = resolvedTheme === 'dark'

  const soft = isDark
    ? `color-mix(in srgb, ${palette.base} 12%, ${palette.dark.surface})`
    : palette.soft

  // Core accent
  const accentFg = isDark
    ? `color-mix(in srgb, #ffffff 25%, ${palette.base})`
    : palette.base

  root.style.setProperty('--zf-accent', palette.base)
  root.style.setProperty('--zf-accent-hover', palette.hover)
  root.style.setProperty('--zf-accent-soft', soft)
  root.style.setProperty('--zf-accent-fg', accentFg)

  // Light mode pastel fills
  root.style.setProperty('--zf-accent-light-bg', palette.lightBg)
  root.style.setProperty('--zf-accent-light-border', palette.lightBorder)

  // Dark mode accent-tinted surfaces
  if (isDark) {
    root.style.setProperty('--zf-canvas', palette.dark.canvas)
    root.style.setProperty('--zf-surface', palette.dark.surface)
    root.style.setProperty('--zf-elevated', palette.dark.elevated)
    root.style.setProperty('--zf-border', palette.dark.border)
    root.style.setProperty('--zf-soft-fill', palette.dark.softFill)
    // Sync shadcn tokens
    root.style.setProperty('--background', palette.dark.canvas)
    root.style.setProperty('--card', palette.dark.surface)
    root.style.setProperty('--popover', palette.dark.surface)
    root.style.setProperty('--secondary', palette.dark.softFill)
    root.style.setProperty('--muted', palette.dark.softFill)
    root.style.setProperty('--border', palette.dark.border)
    root.style.setProperty('--input', palette.dark.border)
    root.style.setProperty('--ring', palette.base)
    root.style.setProperty('--primary', palette.base)
    root.style.setProperty('--sidebar', palette.dark.surface)
    root.style.setProperty('--sidebar-primary', palette.base)
    root.style.setProperty('--sidebar-accent', palette.dark.softFill)
    root.style.setProperty('--sidebar-border', palette.dark.border)
    root.style.setProperty('--sidebar-ring', palette.base)
  } else {
    // Reset dark overrides in case we're switching from dark to light
    const darkVars = [
      '--zf-canvas', '--zf-surface', '--zf-elevated', '--zf-border', '--zf-soft-fill',
      '--background', '--card', '--popover', '--secondary', '--muted',
      '--border', '--input', '--ring', '--primary',
      '--sidebar', '--sidebar-primary', '--sidebar-accent', '--sidebar-border', '--sidebar-ring',
    ]
    darkVars.forEach((v) => root.style.removeProperty(v))
  }
}
