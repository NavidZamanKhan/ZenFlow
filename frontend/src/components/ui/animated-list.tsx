'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Same easing as SlideDrawer / Modal — one motion language across the app.
const EASE = [0.32, 0.72, 0, 1] as const

/**
 * Enter/exit wrapper for dynamic lists (tasks, expenses, reminders).
 * Children must be keyed AnimatedItem elements. `initial={false}` skips the
 * enter animation on first mount so page loads don't cascade.
 * Reduced motion is handled by <MotionConfig reducedMotion="user"> in the
 * dashboard shell (transforms disabled, opacity fades kept).
 */
export function AnimatedList({ children }: { children: ReactNode }) {
  return <AnimatePresence initial={false}>{children}</AnimatePresence>
}

export function AnimatedItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
