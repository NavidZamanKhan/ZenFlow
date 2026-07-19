import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Calendar,
  CheckSquare2,
  LayoutDashboard,
  Palette,
  Settings,
  SlidersHorizontal,
  UserRound,
  Wallet,
} from 'lucide-react'
import type { CalendarEvent } from '@/types/event'
import type { Expense } from '@/types/expense'
import type { Task } from '@/types/task'

export type SearchResultGroup =
  | 'pages'
  | 'expenses'
  | 'tasks'
  | 'events'

export type SearchResult = {
  id: string
  group: SearchResultGroup
  title: string
  subtitle?: string
  href: string
  icon: LucideIcon
}

export type SearchDestination = {
  id: string
  title: string
  subtitle: string
  href: string
  keywords: string[]
  icon: LucideIcon
  group: 'pages'
}

/** Static navigable destinations — pages + settings sections that actually exist. */
export const SEARCH_DESTINATIONS: SearchDestination[] = [
  {
    id: 'page-overview',
    title: 'Overview',
    subtitle: 'Dashboard home',
    href: '/dashboard',
    keywords: ['home', 'dashboard', 'overview'],
    icon: LayoutDashboard,
    group: 'pages',
  },
  {
    id: 'page-tasks',
    title: 'Tasks',
    subtitle: 'Task list',
    href: '/dashboard/tasks',
    keywords: ['todo', 'checklist'],
    icon: CheckSquare2,
    group: 'pages',
  },
  {
    id: 'page-calendar',
    title: 'Calendar',
    subtitle: 'Events and schedule',
    href: '/dashboard/calendar',
    keywords: ['schedule', 'events'],
    icon: Calendar,
    group: 'pages',
  },
  {
    id: 'page-expenses',
    title: 'Expenses',
    subtitle: 'All expenses',
    href: '/dashboard/expenses',
    keywords: ['spending', 'money'],
    icon: Wallet,
    group: 'pages',
  },
  {
    id: 'page-budget',
    title: 'Budget',
    subtitle: 'Monthly budget',
    href: '/dashboard/expenses/budget',
    keywords: ['limits', 'allowance'],
    icon: Wallet,
    group: 'pages',
  },
  {
    id: 'page-insights',
    title: 'Insights',
    subtitle: 'Spending analytics',
    href: '/dashboard/insights',
    keywords: ['charts', 'analytics', 'reports'],
    icon: BarChart3,
    group: 'pages',
  },
  {
    id: 'page-settings',
    title: 'Settings',
    subtitle: 'Workspace preferences',
    href: '/dashboard/settings',
    keywords: ['preferences', 'profile'],
    icon: Settings,
    group: 'pages',
  },
  {
    id: 'settings-profile',
    title: 'Profile',
    subtitle: 'Settings · Profile',
    href: '/dashboard/settings#profile',
    keywords: ['name', 'email', 'avatar', 'account'],
    icon: UserRound,
    group: 'pages',
  },
  {
    id: 'settings-appearance',
    title: 'Appearance',
    subtitle: 'Settings · Appearance',
    href: '/dashboard/settings#appearance',
    keywords: ['theme', 'density', 'display'],
    icon: Palette,
    group: 'pages',
  },
  {
    id: 'settings-expense-preferences',
    title: 'Expense Preferences',
    subtitle: 'Settings · Expense Preferences',
    href: '/dashboard/settings#expense-preferences',
    keywords: ['currency', 'payment', 'categories'],
    icon: SlidersHorizontal,
    group: 'pages',
  },
]

export const SEARCH_GROUP_ORDER: SearchResultGroup[] = [
  'pages',
  'tasks',
  'expenses',
  'events',
]

export const SEARCH_GROUP_LABEL: Record<SearchResultGroup, string> = {
  pages: 'Pages',
  tasks: 'Tasks',
  expenses: 'Expenses',
  events: 'Calendar',
}

const GROUP_ICON: Record<SearchResultGroup, LucideIcon> = {
  pages: LayoutDashboard,
  tasks: CheckSquare2,
  expenses: Wallet,
  events: Calendar,
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function matches(query: string, ...fields: Array<string | null | undefined>): boolean {
  return fields.some((field) => field && normalize(field).includes(query))
}

export type SearchSources = {
  tasks: Task[]
  expenses: Expense[]
  events: CalendarEvent[]
}

/**
 * Pure local search. Structured so a future async/backend search can replace
 * this function's body without changing the UI contract.
 */
export function searchZenFlow(
  rawQuery: string,
  sources: SearchSources,
  limitPerGroup = 5,
): SearchResult[] {
  const query = normalize(rawQuery)
  if (!query) return []

  const pages = SEARCH_DESTINATIONS.filter((item) =>
    matches(query, item.title, item.subtitle, ...item.keywords),
  )
    .slice(0, limitPerGroup)
    .map(
      (item): SearchResult => ({
        id: item.id,
        group: 'pages',
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
        icon: item.icon,
      }),
    )

  const tasks = sources.tasks
    .filter((task) => matches(query, task.title, task.description, task.category))
    .slice(0, limitPerGroup)
    .map(
      (task): SearchResult => ({
        id: `task-${task.id}`,
        group: 'tasks',
        title: task.title,
        subtitle: task.category || (task.completed ? 'Completed' : 'Task'),
        href: `/dashboard/tasks?highlight=${encodeURIComponent(task.id)}`,
        icon: GROUP_ICON.tasks,
      }),
    )

  const expenses = sources.expenses
    .filter((expense) =>
      matches(
        query,
        expense.title,
        expense.notes,
        expense.category,
        expense.tags.join(' '),
      ),
    )
    .slice(0, limitPerGroup)
    .map(
      (expense): SearchResult => ({
        id: `expense-${expense.id}`,
        group: 'expenses',
        title: expense.title,
        subtitle: expense.category,
        href: `/dashboard/expenses?highlight=${encodeURIComponent(expense.id)}`,
        icon: GROUP_ICON.expenses,
      }),
    )

  const events = sources.events
    .filter((event) => matches(query, event.title, event.description))
    .slice(0, limitPerGroup)
    .map(
      (event): SearchResult => ({
        id: `event-${event.id}`,
        group: 'events',
        title: event.title,
        subtitle: event.allDay ? 'All-day event' : 'Calendar event',
        // Calendar deep-highlight needs FullCalendar API work — navigate only.
        href: '/dashboard/calendar',
        icon: GROUP_ICON.events,
      }),
    )

  return [...pages, ...tasks, ...expenses, ...events]
}

export function groupSearchResults(
  results: SearchResult[],
): Array<{ group: SearchResultGroup; items: SearchResult[] }> {
  return SEARCH_GROUP_ORDER.map((group) => ({
    group,
    items: results.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0)
}
