'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ZenFlowLogo } from '@/components/zenflow-logo'
import { SlideDrawer } from '@/components/ui/slide-drawer'
import { LandingHashLink } from '@/components/landing-hash-link'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const closeOnResize = () => {
      if (window.matchMedia('(min-width: 768px)').matches) setMenuOpen(false)
    }
    window.addEventListener('resize', closeOnResize)
    return () => window.removeEventListener('resize', closeOnResize)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className={cn(
        // Safe-area keeps the mask under the notch; padding matches prior pt-3 / sm:pt-4.
        'fixed inset-x-0 top-0 z-50 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-[calc(1rem+env(safe-area-inset-top))]',
        scrolled ? 'bg-background' : 'bg-transparent',
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-300 sm:px-6',
          scrolled
            ? 'bg-background border border-border/70 shadow-[0_12px_40px_-18px_rgba(56,89,140,0.4)]'
            : 'border border-transparent',
        )}
      >
        <LandingHashLink
          href="#top"
          className="flex items-center gap-2.5"
          aria-label="ZenFlow home"
        >
          <ZenFlowLogo className="size-7" />
          <span className="text-lg font-semibold tracking-tight">ZenFlow</span>
        </LandingHashLink>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((link) => (
            <LandingHashLink
              key={link.label}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zf-accent)]"
            >
              {link.label}
            </LandingHashLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            render={<Link href="/login" />}
            className="hidden rounded-full text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground sm:inline-flex"
          >
            Login
          </Button>
          <Button
            render={<Link href="/register" />}
            className="rounded-full px-5 text-sm shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Sign Up
          </Button>
          <button
            type="button"
            className="zf-tap relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zf-accent)] md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <SlideDrawer
        open={menuOpen}
        onClose={closeMenu}
        side="right"
        rootClassName="md:hidden"
        label="Primary"
        className="w-[min(100%,20rem)] border-l border-border/70 bg-background/95 px-5 py-6 backdrop-blur-xl"
      >
        <div id="landing-mobile-nav" className="flex h-full flex-col">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Menu</p>
          <nav className="mt-4 flex flex-col gap-1" aria-label="Mobile primary">
            {links.map((link) => (
              <LandingHashLink
                key={link.label}
                href={link.href}
                onNavigate={closeMenu}
                className="rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zf-accent)]"
              >
                {link.label}
              </LandingHashLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-5 sm:hidden">
            <Button
              variant="outline"
              render={<Link href="/login" onClick={closeMenu} />}
              className="w-full rounded-full"
            >
              Login
            </Button>
            <Button
              render={<Link href="/register" onClick={closeMenu} />}
              className="w-full rounded-full"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </SlideDrawer>
    </header>
  )
}
