import type { Notification } from '@/types/notification'

/**
 * Hardcoded ZenFlow-relevant notifications.
 * Timestamps are offset from `now` so relative labels stay meaningful in demos.
 * Replace this factory with an API fetch later — keep the `Notification` shape.
 */
export function createDummyNotifications(now = Date.now()): Notification[] {
  const minutesAgo = (minutes: number) =>
    new Date(now - minutes * 60_000).toISOString()

  return [
    {
      id: 'n-budget-food-90',
      type: 'budget',
      title: 'Budget alert: Food category at 90%',
      description: "You've used $450 of your $500 Food budget this month.",
      read: false,
      timestamp: minutesAgo(18),
    },
    {
      id: 'n-task-client-sync',
      type: 'task',
      title: 'Task due tomorrow: Client sync',
      description: 'Prep talking points before the 10:00 AM call.',
      read: false,
      timestamp: minutesAgo(95),
    },
    {
      id: 'n-reminder-invoice',
      type: 'reminder',
      title: 'Reminder: Send invoice #402',
      description: 'Client payment window closes Friday.',
      read: false,
      timestamp: minutesAgo(60 * 5),
    },
    {
      id: 'n-task-review-docs',
      type: 'task',
      title: 'Task completed: Review Q3 docs',
      description: 'Marked complete earlier today — nice work.',
      read: true,
      timestamp: minutesAgo(60 * 26),
    },
    {
      id: 'n-budget-travel',
      type: 'budget',
      title: 'Budget tip: Travel is under pace',
      description: "You're at 42% of Travel with two weeks left.",
      read: true,
      timestamp: minutesAgo(60 * 50),
    },
  ]
}
