'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Grid3x3,
  LayoutDashboard,
  CheckSquare2,
  Calendar,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  icon: LucideIcon
  id: string
  href: string
  children?: { label: string; href: string }[]
}

const navItems: NavItem[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    id: 'overview',
    href: '/dashboard',
  },
  {
    label: 'Tasks',
    icon: CheckSquare2,
    id: 'tasks',
    href: '/dashboard/tasks',
  },
  {
    label: 'Calendar',
    icon: Calendar,
    id: 'calendar',
    href: '/dashboard/calendar',
  },
  {
    label: 'Expenses',
    icon: Wallet,
    id: 'expenses',
    href: '/dashboard/expenses',
    children: [
      { label: 'All Expenses', href: '/dashboard/expenses' },
      { label: 'Budget', href: '/dashboard/expenses/budget' },
    ],
  },
  {
    label: 'Insights',
    icon: BarChart3,
    id: 'insights',
    href: '/dashboard/insights',
  },
  {
    label: 'Settings',
    icon: Settings,
    id: 'settings',
    href: '/dashboard/settings',
  },
]

type SidebarProps = {
  /** Called when a nav link is activated (e.g. close mobile drawer). */
  onNavigate?: () => void
  className?: string
}

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <div
      className={cn(
        'flex h-full w-72 flex-shrink-0 flex-col border-r border-slate-100 bg-white',
        className,
      )}
    >
      {/* macOS Controls & Search Bar Row */}
      <div className="flex items-center gap-4 px-6 pb-4 pt-6">
        {/* macOS Window Controls */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#FF5F56]"></div>
          <div className="h-3 w-3 rounded-full bg-[#FFBD2E]"></div>
          <div className="h-3 w-3 rounded-full bg-[#27C93F]"></div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1">
          <label htmlFor="sidebar-zenflow-search" className="sr-only">
            Search ZenFlow
          </label>
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 transform text-slate-500"
            aria-hidden="true"
          />
          <input
            id="sidebar-zenflow-search"
            type="search"
            placeholder="Search ZenFlow..."
            className="w-full rounded-xl border border-slate-100 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1D70E8]"
          />
        </div>
      </div>

      {/* Logo — brand mark, not a page heading (pages own the sole <h1>) */}
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#1D70E8] shadow-sm">
          <Grid3x3 size={18} className="text-white" aria-hidden="true" />
        </div>
        <p className="text-lg font-bold tracking-tight text-slate-800">ZenFlow</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4" aria-label="Main">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
            const itemClass = `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 ${
              isActive
                ? 'bg-[#E2EEFC] text-[#1D70E8]'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`

            return (
              <div key={item.id}>
                <Link
                  href={item.href}
                  className={itemClass}
                  onClick={onNavigate}
                  aria-current={isActive && !item.children ? 'page' : undefined}
                >
                  <Icon
                    size={18}
                    className={isActive ? 'text-[#1D70E8]' : 'text-slate-500'}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>

                {item.children ? (
                  <div className="ml-9 mt-1 space-y-0.5 border-l border-slate-100 pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          aria-current={childActive ? 'page' : undefined}
                          className={cn(
                            'block rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                            childActive
                              ? 'bg-[#F5F9FE] text-[#1D70E8]'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                          )}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Logout button at the bottom */}
      <div className="border-t border-slate-50 p-4">
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            logout()
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 transition-all duration-150 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={18} aria-hidden="true" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}
