'use client'

import { useEffect, useState } from 'react'

/**
 * Subscribe to a CSS media query. Returns `false` during SSR / before mount
 * so first paint matches the narrow default (mobile-first).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}
