'use client'

import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type SlideDrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  side?: 'left' | 'right'
  className?: string
  /** Extra class on the fixed overlay root (e.g. `lg:hidden`). */
  rootClassName?: string
}

const EASE = [0.32, 0.72, 0, 1] as const

/**
 * Reusable slide-in drawer with backdrop. First framer-motion pattern in the app —
 * prefer this over one-off motion markup for overlays and panels.
 */
export function SlideDrawer({
  open,
  onClose,
  children,
  side = 'left',
  className,
  rootClassName,
}: SlideDrawerProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  const offscreenX = side === 'left' ? '-100%' : '100%'

  return (
    <AnimatePresence>
      {open ? (
        <div
          className={cn('fixed inset-0 z-50', rootClassName)}
          role="dialog"
          aria-modal="true"
        >
          <motion.button
            type="button"
            data-no-press
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            onClick={onClose}
          />
          <motion.aside
            className={cn(
              'absolute top-0 bottom-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl',
              side === 'left' ? 'left-0' : 'right-0',
              className,
            )}
            initial={{ x: offscreenX }}
            animate={{ x: 0 }}
            exit={{ x: offscreenX }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {children}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
