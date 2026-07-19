'use client'

import { Greeting } from './greeting'
import { TasksCard } from './cards/tasks-card'
import { ProductivityCard } from './cards/productivity-card'
import { RemindersCard } from './cards/reminders-card'
import { ExpensesCard } from './cards/expenses-card'
import { useTasks } from '@/hooks/use-tasks'
import { useEvents } from '@/hooks/use-events'
import { useExpenses } from '@/hooks/use-expenses'
import { useBudget } from '@/hooks/use-budget'

/**
 * Overview composition. Hooks are lifted here so the four cards share one
 * reactive snapshot — toggling a task updates Tasks, Productivity, Reminders,
 * and the greeting badge together without a remount.
 */
export function ContentGrid() {
  const {
    tasks,
    loading: tasksLoading,
    createTask,
    updateTask,
    toggleTask,
  } = useTasks()
  const {
    events,
    loading: eventsLoading,
    updateEvent,
  } = useEvents()
  const { expenses, loading: expensesLoading } = useExpenses()
  const { budget, hasBudget, loading: budgetLoading } = useBudget()

  const remainingTasks = tasks.filter((task) => !task.completed).length

  return (
    <div className="max-w-full px-4 py-8 sm:px-8">
      <Greeting remainingTasks={remainingTasks} loading={tasksLoading} />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TasksCard
          tasks={tasks}
          loading={tasksLoading}
          onToggle={toggleTask}
          onCreate={createTask}
        />

        <ProductivityCard tasks={tasks} loading={tasksLoading} />

        <RemindersCard
          tasks={tasks}
          events={events}
          loading={tasksLoading || eventsLoading}
          onToggleTask={toggleTask}
          onUpdateTask={updateTask}
          onUpdateEvent={updateEvent}
        />

        <ExpensesCard
          expenses={expenses}
          budget={budget}
          hasBudget={hasBudget}
          loading={expensesLoading || budgetLoading}
        />
      </div>
    </div>
  )
}
