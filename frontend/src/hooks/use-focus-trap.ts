'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true' && el.tabIndex !== -1,
  )
}

/**
 * Focus trap for dialogs/drawers:
 * - Moves focus into the container on open
 * - Cycles Tab/Shift+Tab within focusable children
 * - Restores focus to the previously focused element on close
 * - Optionally locks body scroll
 */
export function useFocusTrap(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  options?: { lockScroll?: boolean },
) {
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const lockScroll = options?.lockScroll ?? true

  useEffect(() => {
    if (!open) return

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const container = containerRef.current
    if (!container) return

    // Defer so AnimatePresence / portal children have mounted.
    const frame = requestAnimationFrame(() => {
      const focusable = getFocusable(container)
      const target = focusable[0] ?? container
      target.focus({ preventScroll: true })
    })

    let previousOverflow = ''
    if (lockScroll) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusable = getFocusable(container)
      if (focusable.length === 0) {
        event.preventDefault()
        container.focus({ preventScroll: true })
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !container.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      if (lockScroll) {
        document.body.style.overflow = previousOverflow
      }
      const restore = previouslyFocused.current
      if (restore && typeof restore.focus === 'function') {
        restore.focus({ preventScroll: true })
      }
    }
  }, [open, containerRef, lockScroll])
}
