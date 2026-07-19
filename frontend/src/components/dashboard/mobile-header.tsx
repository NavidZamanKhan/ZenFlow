'use client'

import { useState } from 'react'
import { Grid3x3, Menu, Search, X } from 'lucide-react'
import { ZenflowSearch } from './zenflow-search'

type MobileHeaderProps = {
  onMenuClick: () => void
  menuOpen?: boolean
}

/**
 * Compact top bar for viewports below `lg`. Replaces always-visible sidebar branding
 * on mobile; desktop branding remains in the fixed sidebar.
 */
export function MobileHeader({ onMenuClick, menuOpen = false }: MobileHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="lg:hidden flex-shrink-0 border-b border-slate-100 bg-white pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-3 px-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          className="zf-tap relative -ml-2 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1D70E8] shadow-sm">
            <Grid3x3 size={16} className="text-white" aria-hidden="true" />
          </div>
          <span className="truncate text-base font-bold tracking-tight text-slate-800">
            ZenFlow
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          aria-label={searchOpen ? 'Close search' : 'Open search'}
          aria-expanded={searchOpen}
          className="zf-tap relative -mr-2 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          {searchOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <Search size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {searchOpen ? (
        <div className="px-4 pb-3">
          <ZenflowSearch
            id="mobile-zenflow-search"
            autoFocus
            inputClassName="py-2 text-sm"
            onNavigate={() => setSearchOpen(false)}
          />
        </div>
      ) : null}
    </header>
  )
}
