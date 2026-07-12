'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ZenFlowLogo } from '@/components/zenflow-logo'
import { cn } from '@/lib/utils'

const links = [
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Contact', href: '#contact' },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:pt-4">
      <div
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-300 sm:px-6',
          scrolled
            ? 'glass-strong border border-border/70 shadow-[0_12px_40px_-18px_rgba(56,89,140,0.4)]'
            : 'border border-transparent',
        )}
      >
        <a href="#top" className="flex items-center gap-2.5" aria-label="ZenFlow home">
          <ZenFlowLogo className="size-7" />
          <span className="text-lg font-semibold tracking-tight">ZenFlow</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              {link.label}
            </a>
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
        </div>
      </div>
    </header>
  )
}
