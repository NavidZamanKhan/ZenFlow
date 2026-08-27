'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Calendar,
  CheckSquare2,
  CornerDownLeft,
  LayoutDashboard,
  Search,
  Wallet,
  X,
} from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { useExpenses } from '@/hooks/use-expenses'
import { useEvents } from '@/hooks/use-events'
import {
  groupSearchResults,
  searchZenFlow,
  SEARCH_DESTINATIONS,
  SEARCH_GROUP_LABEL,
  type SearchResult,
} from '@/lib/zenflow-search'
import { cn } from '@/lib/utils'

const SPRING_BOUNCE = {
  type: 'spring',
  damping: 18,
  stiffness: 320,
  mass: 0.75,
} as const

/** Global event helper to trigger Spotlight from anywhere in the app */
export function openSpotlight() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zenflow:open-spotlight'))
  }
}

export function SpotlightModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { tasks } = useTasks()
  const { expenses } = useExpenses()
  const { events } = useEvents()

  // Listen for global keyboard shortcuts: `/` and `Cmd+K` / `Ctrl+K` and custom event
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
        return
      }

      // `/` shortcut
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null
        const isEditable =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target?.isContentEditable ||
          target?.getAttribute('contenteditable') === 'true'

        if (isEditable) return

        event.preventDefault()
        setOpen(true)
      }
    }

    const handleCustomOpen = () => {
      setOpen(true)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('zenflow:open-spotlight', handleCustomOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('zenflow:open-spotlight', handleCustomOpen)
    }
  }, [])

  // Auto-focus and reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setDebouncedQuery('')
      setActiveIndex(0)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  // Sync query instantly
  useEffect(() => {
    setDebouncedQuery(query)
    setActiveIndex(0)
  }, [query])

  // Compute results
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) {
      // Default: show quick destinations
      return SEARCH_DESTINATIONS.map(
        (dest): SearchResult => ({
          id: dest.id,
          group: 'pages',
          title: dest.title,
          subtitle: dest.subtitle,
          href: dest.href,
          icon: dest.icon,
        }),
      )
    }
    return searchZenFlow(debouncedQuery, { tasks, expenses, events }, 6)
  }, [debouncedQuery, tasks, expenses, events])

  const grouped = useMemo(() => groupSearchResults(results), [results])
  const flatResults = results
  const safeActiveIndex =
    flatResults.length === 0
      ? 0
      : Math.min(activeIndex, flatResults.length - 1)

  // Scroll active item into view
  useEffect(() => {
    if (!open || flatResults.length === 0) return
    const activeEl = listRef.current?.querySelector(
      `[data-spotlight-index="${safeActiveIndex}"]`,
    )
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [safeActiveIndex, open, flatResults.length])

  const selectResult = useCallback(
    (result: SearchResult) => {
      setOpen(false)
      setQuery('')
      setDebouncedQuery('')
      router.push(result.href)
    },
    [router],
  )

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (flatResults.length === 0) return
      setActiveIndex((prev) => (prev + 1) % flatResults.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (flatResults.length === 0) return
      setActiveIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const selected = flatResults[safeActiveIndex]
      if (selected) selectResult(selected)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] sm:pt-[14vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Spotlight search"
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Spotlight Card with Bouncy Spring Animation */}
          <motion.div
            className="relative flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]/95 dark:shadow-black/60"
            initial={{ opacity: 0, scale: 0.84, y: -28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -16, transition: { duration: 0.15 } }}
            transition={SPRING_BOUNCE}
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center border-b border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4 dark:border-[var(--zf-border)]">
              <Search
                size={20}
                className="shrink-0 text-slate-400 dark:text-[var(--zf-text-muted)]"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search tasks, expenses, calendar, or pages..."
                className="w-full bg-transparent pl-3 pr-8 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-[var(--zf-text)] dark:placeholder:text-[var(--zf-text-muted)] sm:text-base"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:text-[var(--zf-text-muted)] dark:hover:text-[var(--zf-text)]"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              ) : (
                <kbd className="hidden rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 sm:inline-block dark:border-[var(--zf-border)] dark:bg-[var(--zf-soft-fill)] dark:text-[var(--zf-text-muted)]">
                  ESC
                </kbd>
              )}
            </div>

            {/* Search Results List */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-2 sm:p-3"
            >
              {flatResults.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[var(--zf-soft-fill)]">
                    <Search size={18} className="text-slate-400 dark:text-[var(--zf-text-muted)]" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-[var(--zf-text)]">
                    No results found for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-[var(--zf-text-muted)]">
                    Try searching for a task, expense category, or page name.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {grouped.map(({ group, items }) => (
                    <div key={group}>
                      <div className="px-3 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[var(--zf-text-muted)]">
                        {SEARCH_GROUP_LABEL[group]}
                      </div>
                      <div className="space-y-0.5">
                        {items.map((item) => {
                          const itemIndex = flatResults.findIndex(
                            (r) => r.id === item.id,
                          )
                          const isSelected = itemIndex === safeActiveIndex
                          const Icon = item.icon

                          return (
                            <button
                              key={item.id}
                              type="button"
                              data-spotlight-index={itemIndex}
                              onClick={() => selectResult(item)}
                              onMouseEnter={() => {
                                setActiveIndex(itemIndex)
                                try {
                                  router.prefetch(item.href)
                                } catch {
                                  // Ignore
                                }
                              }}
                              className={cn(
                                'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors',
                                isSelected
                                  ? 'bg-[var(--zf-accent-soft)] text-[var(--zf-accent)]'
                                  : 'text-slate-700 hover:bg-slate-50 dark:text-[var(--zf-text)] dark:hover:bg-[var(--zf-soft-fill)]',
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div
                                  className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                                    isSelected
                                      ? 'bg-[var(--zf-accent)] text-white'
                                      : 'bg-slate-100 text-slate-500 dark:bg-[var(--zf-soft-fill)] dark:text-[var(--zf-text-muted)]',
                                  )}
                                >
                                  <Icon size={16} aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold sm:text-sm">
                                    {item.title}
                                  </p>
                                  {item.subtitle ? (
                                    <p className="truncate text-[11px] text-slate-400 dark:text-[var(--zf-text-muted)]">
                                      {item.subtitle}
                                    </p>
                                  ) : null}
                                </div>
                              </div>

                              {isSelected ? (
                                <div className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[var(--zf-accent)]">
                                  <span className="hidden sm:inline">Open</span>
                                  <CornerDownLeft size={13} aria-hidden="true" />
                                </div>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Spotlight Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-400 dark:border-[var(--zf-border)] dark:bg-[var(--zf-canvas)]/60 dark:text-[var(--zf-text-muted)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[9px] dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]">
                    ↑
                  </kbd>
                  <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[9px] dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]">
                    ↓
                  </kbd>
                  <span>Navigate</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[9px] dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]">
                    ↵
                  </kbd>
                  <span>Select</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[9px] dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)]">
                    esc
                  </kbd>
                  <span>Close</span>
                </span>
              </div>
              <div className="font-medium text-slate-400">
                {flatResults.length} {flatResults.length === 1 ? 'item' : 'items'}
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
