'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MotionConfig } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Toaster } from 'sonner'
import { useAccentCssVars } from '@/hooks/use-accent-css-vars'
import { useMediaQuery } from '@/hooks/use-media-query'
import { SlideDrawer } from '@/components/ui/slide-drawer'
import { SpotlightModal } from './spotlight-modal'
import { MobileHeader } from './mobile-header'
import { NotificationsProvider } from './notifications-provider'
import { Sidebar } from './sidebar'
import { MainContent } from './main-content'

/** Sonner toaster synced to next-themes so dark mode gets dark toast surfaces. */
function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  const isLg = useMediaQuery('(min-width: 1024px)')
  const theme =
    resolvedTheme === 'dark' || resolvedTheme === 'light'
      ? resolvedTheme
      : 'system'

  return (
    <Toaster
      position={isLg ? 'bottom-right' : 'bottom-center'}
      theme={theme}
      richColors
      closeButton
      // Extra bottom offset clears the home indicator on phones.
      offset={isLg ? 16 : 28}
      mobileOffset={28}
    />
  )
}

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  useAccentCssVars()
  const pathname = usePathname()
  // Token is the pathname the drawer was opened for - auto-closes on route change.
  const [openForPath, setOpenForPath] = useState<string | null>(null)
  const mobileNavOpen = openForPath === pathname

  // Clear a stale token after navigating away so the drawer can't reopen when the
  // user later returns to that path. Render-time adjustment: guarded, converges in
  // one extra render, no effect needed.
  if (openForPath !== null && openForPath !== pathname) {
    setOpenForPath(null)
  }

  const closeMobileNav = () => setOpenForPath(null)

  // Clear any scroll lock left from landing drawers / auth modals before paint.
  useEffect(() => {
    document.documentElement.style.removeProperty('overflow')
    document.body.style.removeProperty('overflow')
  }, [])

  return (
    // reducedMotion="user" makes every framer-motion animation in the dashboard
    // respect the OS-level prefers-reduced-motion setting (transforms disabled,
    // opacity fades kept).
    <MotionConfig reducedMotion="user">
      <NotificationsProvider>
        <div className="zf-dashboard-shell flex w-full bg-white font-sans pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] dark:bg-[var(--zf-canvas)]">
          <a href="#main-content" className="zf-skip-link">
            Skip to main content
          </a>

          {/* Desktop sidebar */}
          <div className="hidden h-full flex-shrink-0 lg:flex">
            <Sidebar />
          </div>

          {/* Mobile / tablet drawer */}
          <SlideDrawer
            open={mobileNavOpen}
            onClose={closeMobileNav}
            rootClassName="lg:hidden"
            label="Main navigation"
          >
            <Sidebar onNavigate={closeMobileNav} className="border-r-0" />
          </SlideDrawer>

          {/* Content column - full width when drawer is closed */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <MobileHeader
              menuOpen={mobileNavOpen}
              onMenuClick={() => setOpenForPath(pathname)}
            />
            <main
              id="main-content"
              className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
            >
              {children ?? <MainContent />}
            </main>
          </div>
          <SpotlightModal />
          <ThemedToaster />
        </div>
      </NotificationsProvider>
    </MotionConfig>
  )
}
