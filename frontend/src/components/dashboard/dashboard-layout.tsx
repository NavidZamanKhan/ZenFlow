'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'
import { SlideDrawer } from '@/components/ui/slide-drawer'
import { MobileHeader } from './mobile-header'
import { Sidebar } from './sidebar'
import { MainContent } from './main-content'

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  // Token is the pathname the drawer was opened for — auto-closes on route change.
  const [openForPath, setOpenForPath] = useState<string | null>(null)
  const mobileNavOpen = openForPath === pathname

  // Clear a stale token after navigating away so the drawer can't reopen when the
  // user later returns to that path. Render-time adjustment: guarded, converges in
  // one extra render, no effect needed.
  if (openForPath !== null && openForPath !== pathname) {
    setOpenForPath(null)
  }

  const closeMobileNav = () => setOpenForPath(null)

  return (
    // reducedMotion="user" makes every framer-motion animation in the dashboard
    // respect the OS-level prefers-reduced-motion setting (transforms disabled,
    // opacity fades kept).
    <MotionConfig reducedMotion="user">
      <div className="flex h-screen w-screen overflow-hidden bg-white font-sans">
        {/* Desktop sidebar — unchanged at lg+ */}
        <div className="hidden h-full flex-shrink-0 lg:flex">
          <Sidebar />
        </div>

        {/* Mobile / tablet drawer */}
        <SlideDrawer
          open={mobileNavOpen}
          onClose={closeMobileNav}
          rootClassName="lg:hidden"
        >
          <Sidebar onNavigate={closeMobileNav} className="border-r-0" />
        </SlideDrawer>

        {/* Content column — full width when drawer is closed */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MobileHeader
            menuOpen={mobileNavOpen}
            onMenuClick={() => setOpenForPath(pathname)}
          />
          {children ?? <MainContent />}
        </div>
        <Toaster position="bottom-right" richColors />
      </div>
    </MotionConfig>
  )
}
