/**
 * Landing-page hash navigation: smooth scroll when motion is allowed,
 * instant jump when the user prefers reduced motion.
 * Relies on CSS `scroll-margin-top` so the fixed header does not cover headings.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Scroll to a same-page hash target. Returns false if the element is missing. */
export function scrollToHash(hash: string): boolean {
  if (typeof document === 'undefined') return false

  const id = hash.startsWith('#') ? hash.slice(1) : hash
  if (!id) return false

  const el = document.getElementById(id)
  if (!el) return false

  el.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  })

  if (typeof history !== 'undefined') {
    history.pushState(null, '', `#${id}`)
  }

  return true
}

/** Use on same-page `#…` anchors; leaves external / route links alone. */
export function handleHashLinkClick(
  event: { preventDefault: () => void; currentTarget: EventTarget & { getAttribute: (name: string) => string | null } },
): boolean {
  const href = event.currentTarget.getAttribute('href')
  if (!href?.startsWith('#') || href === '#') return false

  event.preventDefault()
  return scrollToHash(href)
}
