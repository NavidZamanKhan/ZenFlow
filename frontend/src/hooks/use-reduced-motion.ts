'use client'

import { useReducedMotion } from 'framer-motion'

/**
 * Shared prefers-reduced-motion check for JS-driven animation (Framer values,
 * Recharts isAnimationActive). CSS-only motion should use Tailwind's
 * `motion-safe:` variant instead. Framer components are additionally covered
 * globally by <MotionConfig reducedMotion="user"> in the dashboard shell.
 */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false
}
