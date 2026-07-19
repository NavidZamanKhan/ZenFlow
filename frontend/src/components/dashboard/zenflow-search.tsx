'use client'

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useTasks } from '@/hooks/use-tasks'
import { useExpenses } from '@/hooks/use-expenses'
import { useEvents } from '@/hooks/use-events'
import {
  groupSearchResults,
  searchZenFlow,
  SEARCH_GROUP_LABEL,
  type SearchResult,
} from '@/lib/zenflow-search'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const DEBOUNCE_MS = 180

type ZenflowSearchProps = {
  id?: string
  className?: string
  inputClassName?: string
  /** Called after a result is chosen (e.g. close mobile drawer / collapse panel). */
  onNavigate?: () => void
  autoFocus?: boolean
}

/**
 * Shared "Search ZenFlow..." control used by the sidebar and mobile header.
 * Local, debounced search across pages/settings + tasks/expenses/events.
 */
export function ZenflowSearch({
  id,
  className,
  inputClassName,
  onNavigate,
  autoFocus = false,
}: ZenflowSearchProps) {
  const router = useRouter()
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listboxId = `${inputId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)

  const { tasks, loading: tasksLoading } = useTasks()
  const { expenses, loading: expensesLoading } = useExpenses()
  const { events, loading: eventsLoading } = useEvents()
  const sourcesLoading = tasksLoading || expensesLoading || eventsLoading

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  // `searching` is derived so a future async backend can replace the debounce
  // effect with a fetch without changing the loading UI contract.
  const searching = query !== debouncedQuery

  useEffect(() => {
    const delay = query.trim() ? DEBOUNCE_MS : 0
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [query])

  const results = useMemo(
    () =>
      searchZenFlow(debouncedQuery, {
        tasks,
        expenses,
        events,
      }),
    [debouncedQuery, tasks, expenses, events],
  )

  const grouped = useMemo(() => groupSearchResults(results), [results])
  const flatResults = results
  const safeActiveIndex =
    flatResults.length === 0
      ? 0
      : Math.min(activeIndex, flatResults.length - 1)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const showPanel = open && query.trim().length > 0
  const showLoading = showPanel && (searching || sourcesLoading)
  const showEmpty =
    showPanel &&
    !showLoading &&
    debouncedQuery.trim().length > 0 &&
    flatResults.length === 0
  const showResults = showPanel && !showLoading && flatResults.length > 0

  const selectResult = useCallback(
    (result: SearchResult) => {
      setOpen(false)
      setQuery('')
      setDebouncedQuery('')
      onNavigate?.()
      router.push(result.href)
    },
    [onNavigate, router],
  )

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel) {
      if (event.key === 'Escape') {
        setQuery('')
        setOpen(false)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (flatResults.length === 0) return
      setActiveIndex((index) => {
        const current = Math.min(index, flatResults.length - 1)
        return (current + 1) % flatResults.length
      })
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (flatResults.length === 0) return
      setActiveIndex((index) => {
        const current = Math.min(index, flatResults.length - 1)
        return (current - 1 + flatResults.length) % flatResults.length
      })
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const selected = flatResults[safeActiveIndex]
      if (selected) selectResult(selected)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <label htmlFor={inputId} className="sr-only">
        Search ZenFlow
      </label>
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      />
      <input
        id={inputId}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          showResults && flatResults[safeActiveIndex]
            ? `${inputId}-option-${safeActiveIndex}`
            : undefined
        }
        value={query}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Search ZenFlow..."
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(
          'w-full rounded-xl border border-slate-100 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1D70E8]',
          inputClassName,
        )}
      />

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(24rem,70vh)] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-lg shadow-slate-200/60"
        >
          {showLoading ? (
            <div className="space-y-2 p-2" aria-label="Searching" role="status">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex items-center gap-3 px-2 py-1.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {showEmpty ? (
            <p className="px-3 py-8 text-center text-xs leading-relaxed text-slate-500">
              Nothing matches &ldquo;{debouncedQuery.trim()}&rdquo;. Try a page
              name, task, expense, or event.
            </p>
          ) : null}

          {showResults
            ? grouped.map(({ group, items }) => (
                <div key={group} className="mb-1 last:mb-0">
                  <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {SEARCH_GROUP_LABEL[group]}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const index = flatResults.findIndex(
                        (result) => result.id === item.id,
                      )
                      const active = index === safeActiveIndex
                      const Icon = item.icon
                      return (
                        <li key={item.id} role="presentation">
                          <button
                            type="button"
                            id={`${inputId}-option-${index}`}
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => selectResult(item)}
                            className={cn(
                              'flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors',
                              active
                                ? 'bg-[#E2EEFC] text-[#1D70E8]'
                                : 'text-slate-700 hover:bg-slate-50',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl',
                                active ? 'bg-white/80' : 'bg-slate-50',
                              )}
                            >
                              <Icon size={15} aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {item.title}
                              </span>
                              {item.subtitle ? (
                                <span
                                  className={cn(
                                    'mt-0.5 block truncate text-[11px]',
                                    active
                                      ? 'text-[#1D70E8]/80'
                                      : 'text-slate-500',
                                  )}
                                >
                                  {item.subtitle}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  )
}
