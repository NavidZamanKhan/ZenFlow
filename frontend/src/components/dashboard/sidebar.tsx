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
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { HeaderActions } from './header-actions'
import { ZenflowSearch } from './zenflow-search'

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
]

type SidebarProps = {
  /** Called when a nav link is activated (e.g. close mobile drawer). */
  onNavigate?: () => void
  className?: string
}

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div
      className={cn(
        'flex h-full w-72 flex-shrink-0 flex-col border-r border-slate-100 bg-white dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]',
        className,
      )}
    >
      {/* Search + header actions */}
      <div className="flex items-center gap-4 px-6 pb-4 pt-6">
        <ZenflowSearch
          id="sidebar-zenflow-search"
          className="min-w-0 flex-1"
          onNavigate={onNavigate}
        />
        <HeaderActions />
      </div>

      {/* Logo — brand mark, not a page heading (pages own the sole <h1>) */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        aria-label="ZenFlow home"
        className="flex items-center gap-3 px-6 py-4 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zf-accent)]"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--zf-accent)] shadow-sm">
          <Grid3x3 size={18} className="text-white" aria-hidden="true" />
        </div>
        <p className="text-lg font-bold tracking-tight text-slate-800 dark:text-[var(--zf-text)]">
          ZenFlow
        </p>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4" aria-label="Main">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
            const itemClass = cn(
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150',
              isActive
                ? 'bg-[var(--zf-accent-soft)] text-[var(--zf-accent-fg)]'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-[var(--zf-text-muted)] dark:hover:bg-[var(--zf-hover-fill)] dark:hover:text-[var(--zf-text)]',
            )

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
                    className={
                      isActive
                        ? 'text-[var(--zf-accent-fg)]'
                        : 'text-slate-500 dark:text-[var(--zf-text-muted)]'
                    }
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>

                {item.children ? (
                  <div className="ml-9 mt-1 space-y-0.5 border-l border-slate-100 pl-3 dark:border-[var(--zf-border)]">
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
                              ? 'bg-[var(--zf-accent-soft)] text-[var(--zf-accent-fg)]'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-[var(--zf-text-muted)] dark:hover:bg-[var(--zf-hover-fill)] dark:hover:text-[var(--zf-text)]',
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
    </div>
  )
}
