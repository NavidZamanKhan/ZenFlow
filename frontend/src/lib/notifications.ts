import { formatDate, formatTime, todayISODate, toISODate } from '@/lib/dates'
import { formatMoney, type CurrencyCode } from '@/lib/currency'
import type { Budget } from '@/types/budget'
import type { CalendarEvent } from '@/types/event'
import type { Expense } from '@/types/expense'
import type { Notification } from '@/types/notification'
import type { Task } from '@/types/task'

export function tomorrowISODate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return toISODate(tomorrow)
}

export function currentYearMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Converts an amount from `fromCurrency` into the user's display currency. */
export type ConvertFn = (amount: number, fromCurrency?: CurrencyCode) => number

export type DeriveNotificationsParams = {
  tasks: Task[]
  expenses: Expense[]
  budget: Budget
  events: CalendarEvent[]
  readIds: Set<string>
  /** Display currency every budget figure is evaluated and formatted in. */
  currency?: CurrencyCode
  /**
   * Currency converter. Expenses are stored in the currency they were paid
   * in and the budget in its own currency, so both sides are converted to the
   * display currency before any threshold is compared.
   */
  convert?: ConvertFn
}

/**
 * Highest configured threshold that `percentage` has reached, or null.
 * Thresholds are the user's `budget.warningThresholds` (percent of limit).
 */
export function crossedThreshold(percentage: number, thresholds: number[]): number | null {
  let crossed: number | null = null
  for (const raw of thresholds) {
    const threshold = Number(raw)
    if (!Number.isFinite(threshold) || threshold <= 0) continue
    if (percentage >= threshold && (crossed === null || threshold > crossed)) {
      crossed = threshold
    }
  }
  return crossed
}

/**
 * Dynamically computes notifications from real user data (tasks, expenses, budgets, and events).
 */
export function deriveNotifications({
  tasks,
  expenses,
  budget,
  events,
  readIds,
  currency = 'BDT',
  convert = (amount) => amount,
}: DeriveNotificationsParams): Notification[] {
  const today = todayISODate()
  const tomorrow = tomorrowISODate()
  const currentMonth = currentYearMonth()
  const list: Notification[] = []

  // ---------------------------------------------------------------------------
  // 1. Task Notifications
  // ---------------------------------------------------------------------------
  for (const task of tasks) {
    if (task.completed) continue
    if (!task.dueDate) continue

    const taskDate = task.dueDate.slice(0, 10)

    if (taskDate < today) {
      // Overdue task
      const id = `notif-task-overdue-${task.id}`
      list.push({
        id,
        type: 'task',
        title: `Task overdue: ${task.title}`,
        description: `Was due on ${formatDate(taskDate)}.`,
        read: readIds.has(id),
        timestamp: `${taskDate}T23:59:00`,
        href: '/dashboard/tasks',
      })
    } else if (taskDate === today) {
      // Due Today
      const id = `notif-task-today-${task.id}`
      list.push({
        id,
        type: 'task',
        title: `Task due today: ${task.title}`,
        description: 'Scheduled for today. Stay focused.',
        read: readIds.has(id),
        timestamp: `${taskDate}T09:00:00`,
        href: '/dashboard/tasks',
      })
    } else if (taskDate === tomorrow) {
      // Due Tomorrow (within 24h window)
      const id = `notif-task-tomorrow-${task.id}`
      list.push({
        id,
        type: 'task',
        title: `Task due tomorrow: ${task.title}`,
        description: `Due tomorrow (${formatDate(taskDate)}).`,
        read: readIds.has(id),
        timestamp: `${taskDate}T09:00:00`,
        href: '/dashboard/tasks',
      })
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Calendar Event Reminders
  // ---------------------------------------------------------------------------
  for (const event of events) {
    if (!event.start) continue
    const eventDate = event.start.slice(0, 10)
    const timeLabel = !event.allDay && event.start.includes('T') ? ` at ${formatTime(event.start)}` : ''

    if (eventDate === today) {
      const id = `notif-event-today-${event.id}`
      list.push({
        id,
        type: 'reminder',
        title: `Event today: ${event.title}`,
        description: `Happening today${timeLabel}.`,
        read: readIds.has(id),
        timestamp: event.start,
        href: '/dashboard/calendar',
      })
    } else if (eventDate === tomorrow) {
      const id = `notif-event-tomorrow-${event.id}`
      list.push({
        id,
        type: 'reminder',
        title: `Event tomorrow: ${event.title}`,
        description: `Scheduled for tomorrow${timeLabel}.`,
        read: readIds.has(id),
        timestamp: event.start,
        href: '/dashboard/calendar',
      })
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Budget & Expense Alerts (Current Month)
  // ---------------------------------------------------------------------------
  // Everything below is evaluated in the display currency: each expense is
  // converted from the currency it was paid in, and every limit from the
  // budget's currency, so a 90% alert means 90% regardless of mixed currencies.
  const thresholds = budget.warningThresholds?.length ? budget.warningThresholds : [50, 75, 90, 100]
  const budgetCurrency = budget.currency || currency
  const toBase = (amount: number, from?: CurrencyCode) => convert(Number(amount) || 0, from)

  const currentMonthExpenses = expenses.filter((e) => e.date?.startsWith(currentMonth))
  let totalSpent = 0
  const categorySpent: Record<string, number> = {}
  for (const exp of currentMonthExpenses) {
    const amount = toBase(exp.amount, exp.currency)
    totalSpent += amount
    categorySpent[exp.category] = (categorySpent[exp.category] || 0) + amount
  }

  // Overall Monthly Total Alert
  const monthlyLimit = toBase(budget.monthlyTotal, budgetCurrency)
  if (monthlyLimit > 0) {
    const percentage = (totalSpent / monthlyLimit) * 100
    const threshold = crossedThreshold(percentage, thresholds)
    if (threshold !== null) {
      const formattedSpent = formatMoney(totalSpent, currency)
      const formattedBudget = formatMoney(monthlyLimit, currency)
      const id = `notif-budget-total-${threshold}-${currentMonth}`
      list.push({
        id,
        type: 'budget',
        title: threshold >= 100 ? 'Monthly budget exceeded' : `Monthly budget at ${threshold}%`,
        description:
          threshold >= 100
            ? `You've spent ${formattedSpent} of your ${formattedBudget} total budget.`
            : `You've used ${formattedSpent} (${Math.round(percentage)}%) of your ${formattedBudget} limit.`,
        read: readIds.has(id),
        timestamp: new Date().toISOString(),
        href: '/dashboard/expenses/budget',
      })
    }
  }

  // Category Budget Alerts
  if (budget.categoryBudgets) {
    for (const [catName, limit] of Object.entries(budget.categoryBudgets)) {
      const catBudget = toBase(Number(limit) || 0, budgetCurrency)
      if (catBudget <= 0) continue

      const spent = categorySpent[catName] || 0
      const percentage = (spent / catBudget) * 100
      const threshold = crossedThreshold(percentage, thresholds)
      if (threshold === null) continue

      const formattedCategorySpent = formatMoney(spent, currency)
      const formattedCategoryBudget = formatMoney(catBudget, currency)
      const id = `notif-budget-cat-${threshold}-${catName}-${currentMonth}`
      list.push({
        id,
        type: 'budget',
        title: threshold >= 100 ? `Budget exceeded: ${catName}` : `Budget alert: ${catName} at ${threshold}%`,
        description:
          threshold >= 100
            ? `You've spent ${formattedCategorySpent} of your ${formattedCategoryBudget} ${catName} budget.`
            : `You've used ${formattedCategorySpent} of your ${formattedCategoryBudget} ${catName} budget this month.`,
        read: readIds.has(id),
        timestamp: new Date().toISOString(),
        href: '/dashboard/expenses/budget',
      })
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Sort: Unread first, then latest timestamp
  // ---------------------------------------------------------------------------
  list.sort((a, b) => {
    if (a.read !== b.read) {
      return a.read ? 1 : -1
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  return list
}
