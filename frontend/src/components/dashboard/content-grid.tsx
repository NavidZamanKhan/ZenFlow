'use client'

import { Greeting } from './greeting'
import { TasksCard } from './cards/tasks-card'
import { ProductivityCard } from './cards/productivity-card'
import { RemindersCard } from './cards/reminders-card'
import { ExpensesCard } from './cards/expenses-card'
import { ErrorState } from '@/components/shared/state-blocks'
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
    error: tasksError,
    reload: reloadTasks,
    createTask,
    updateTask,
    toggleTask,
  } = useTasks()
  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    reload: reloadEvents,
    updateEvent,
  } = useEvents()
  const {
    expenses,
    loading: expensesLoading,
    error: expensesError,
    reload: reloadExpenses,
  } = useExpenses()
  const { budget, hasBudget, loading: budgetLoading } = useBudget()

  const remainingTasks = tasks.filter((task) => !task.completed).length
  const loadError = tasksError || eventsError || expensesError

  const retryAll = () => {
    if (tasksError) reloadTasks()
    if (eventsError) reloadEvents()
    if (expensesError) reloadExpenses()
  }

  return (
    <div className="max-w-full px-4 py-8 sm:px-8">
      <Greeting remainingTasks={remainingTasks} loading={tasksLoading} />

      {loadError && !tasksLoading && !eventsLoading && !expensesLoading ? (
        <div className="mb-6">
          <ErrorState
            description={loadError}
            onRetry={retryAll}
          />
        </div>
      ) : null}

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
          onUpdateTask={(id, patch) =>
            updateTask(id, patch, { successMessage: 'Snoozed by 1 day' })
          }
          onUpdateEvent={(id, patch) =>
            updateEvent(id, patch, { successMessage: 'Snoozed by 1 day' })
          }
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
