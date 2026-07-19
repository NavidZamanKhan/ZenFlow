'use client'

import { memo, useCallback } from 'react'
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

// The lifted stores update independently. Memoized card boundaries let an
// expense change skip task/productivity/reminder renders, and vice versa.
const MemoGreeting = memo(Greeting)
const MemoTasksCard = memo(TasksCard)
const MemoProductivityCard = memo(ProductivityCard)
const MemoRemindersCard = memo(RemindersCard)
const MemoExpensesCard = memo(ExpensesCard)

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

  const snoozeTask = useCallback(
    (id: string, patch: Parameters<typeof updateTask>[1]) =>
      updateTask(id, patch, { successMessage: 'Snoozed by 1 day' }),
    [updateTask],
  )

  const snoozeEvent = useCallback(
    (id: string, patch: Parameters<typeof updateEvent>[1]) =>
      updateEvent(id, patch, { successMessage: 'Snoozed by 1 day' }),
    [updateEvent],
  )

  const retryAll = () => {
    if (tasksError) reloadTasks()
    if (eventsError) reloadEvents()
    if (expensesError) reloadExpenses()
  }

  return (
    <div className="max-w-full px-4 py-8 sm:px-8">
      <MemoGreeting remainingTasks={remainingTasks} loading={tasksLoading} />

      {loadError && !tasksLoading && !eventsLoading && !expensesLoading ? (
        <div className="mb-6">
          <ErrorState
            description={loadError}
            onRetry={retryAll}
          />
        </div>
      ) : null}

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <MemoTasksCard
          tasks={tasks}
          loading={tasksLoading}
          onToggle={toggleTask}
          onCreate={createTask}
        />

        <MemoProductivityCard tasks={tasks} loading={tasksLoading} />

        <MemoRemindersCard
          tasks={tasks}
          events={events}
          loading={tasksLoading || eventsLoading}
          onToggleTask={toggleTask}
          onUpdateTask={snoozeTask}
          onUpdateEvent={snoozeEvent}
        />

        <MemoExpensesCard
          expenses={expenses}
          budget={budget}
          hasBudget={hasBudget}
          loading={expensesLoading || budgetLoading}
        />
      </div>
    </div>
  )
}
