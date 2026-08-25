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

export type DeriveNotificationsParams = {
  tasks: Task[]
  expenses: Expense[]
  budget: Budget
  events: CalendarEvent[]
  readIds: Set<string>
  currency?: CurrencyCode
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
  const currentMonthExpenses = expenses.filter((e) => e.date?.startsWith(currentMonth))
  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  const categorySpent: Record<string, number> = {}
  for (const exp of currentMonthExpenses) {
    const cat = exp.category
    categorySpent[cat] = (categorySpent[cat] || 0) + (Number(exp.amount) || 0)
  }

  // Overall Monthly Total Alert
  if (budget.monthlyTotal > 0) {
    const ratio = totalSpent / budget.monthlyTotal
    const formattedSpent = formatMoney(totalSpent, currency)
    const formattedBudget = formatMoney(budget.monthlyTotal, currency)

    if (ratio >= 1.0) {
      const id = `notif-budget-total-100-${currentMonth}`
      list.push({
        id,
        type: 'budget',
        title: 'Monthly budget exceeded',
        description: `You've spent ${formattedSpent} of your ${formattedBudget} total budget.`,
        read: readIds.has(id),
        timestamp: new Date().toISOString(),
        href: '/dashboard/expenses/budget',
      })
    } else if (ratio >= 0.9) {
      const id = `notif-budget-total-90-${currentMonth}`
      list.push({
        id,
        type: 'budget',
        title: 'Monthly budget at 90%',
        description: `You've used ${formattedSpent} (${Math.round(ratio * 100)}%) of your ${formattedBudget} limit.`,
        read: readIds.has(id),
        timestamp: new Date().toISOString(),
        href: '/dashboard/expenses/budget',
      })
    } else if (ratio >= 0.8) {
      const id = `notif-budget-total-80-${currentMonth}`
      list.push({
        id,
        type: 'budget',
        title: 'Monthly budget at 80%',
        description: `You've used ${formattedSpent} (${Math.round(ratio * 100)}%) of your ${formattedBudget} limit.`,
        read: readIds.has(id),
        timestamp: new Date().toISOString(),
        href: '/dashboard/expenses/budget',
      })
    }
  }

  // Category Budget Alerts
  if (budget.categoryBudgets) {
    for (const [catName, limit] of Object.entries(budget.categoryBudgets)) {
      const catBudget = Number(limit) || 0
      if (catBudget <= 0) continue

      const spent = categorySpent[catName] || 0
      const ratio = spent / catBudget
      const formattedCategorySpent = formatMoney(spent, currency)
      const formattedCategoryBudget = formatMoney(catBudget, currency)

      if (ratio >= 1.0) {
        const id = `notif-budget-cat-100-${catName}-${currentMonth}`
        list.push({
          id,
          type: 'budget',
          title: `Budget exceeded: ${catName}`,
          description: `You've spent ${formattedCategorySpent} of your ${formattedCategoryBudget} ${catName} budget.`,
          read: readIds.has(id),
          timestamp: new Date().toISOString(),
          href: '/dashboard/expenses/budget',
        })
      } else if (ratio >= 0.9) {
        const id = `notif-budget-cat-90-${catName}-${currentMonth}`
        list.push({
          id,
          type: 'budget',
          title: `Budget alert: ${catName} at 90%`,
          description: `You've used ${formattedCategorySpent} of your ${formattedCategoryBudget} ${catName} budget this month.`,
          read: readIds.has(id),
          timestamp: new Date().toISOString(),
          href: '/dashboard/expenses/budget',
        })
      } else if (ratio >= 0.8) {
        const id = `notif-budget-cat-80-${catName}-${currentMonth}`
        list.push({
          id,
          type: 'budget',
          title: `Budget alert: ${catName} at 80%`,
          description: `You've used ${formattedCategorySpent} of your ${formattedCategoryBudget} ${catName} budget this month.`,
          read: readIds.has(id),
          timestamp: new Date().toISOString(),
          href: '/dashboard/expenses/budget',
        })
      }
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
