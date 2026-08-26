'use client'

import type { MouseEvent, ReactNode } from 'react'
import { scrollToHash } from '@/lib/smooth-scroll'

type LandingHashLinkProps = {
  href: string
  className?: string
  children: ReactNode
  /** Runs before scroll (e.g. close mobile drawer so body scroll unlocks). */
  onNavigate?: () => void
  'aria-label'?: string
}

/**
 * Same-page `#` link with smooth scroll + reduced-motion respect.
 * Non-hash hrefs behave as normal anchors.
 */
export function LandingHashLink({
  href,
  className,
  children,
  onNavigate,
  'aria-label': ariaLabel,
}: LandingHashLinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith('#') || href === '#') return

    event.preventDefault()
    onNavigate?.()

    // Defer scroll so drawer close can restore body overflow first.
    requestAnimationFrame(() => {
      scrollToHash(href)
    })
  }

  return (
    <a href={href} className={className} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </a>
  )
}
