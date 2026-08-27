export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export interface Task {
  id: string
  title: string
  description: string
  /** ISO date string (yyyy-mm-dd) or null when no due date is set */
  dueDate: string | null
  /** Local time (HH:mm) or null when no due time is set */
  dueTime: string | null
  priority: TaskPriority
  category: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>

export type TaskStatusFilter = 'all' | 'active' | 'completed'
export type TaskSortKey = 'dueDate' | 'priority' | 'createdAt'
