import { Greeting } from './greeting'
import { TasksCard } from './cards/tasks-card'
import { ProductivityCard } from './cards/productivity-card'
import { RemindersCard } from './cards/reminders-card'
import { ExpensesCard } from './cards/expenses-card'

export function ContentGrid() {
  return (
    <div className="px-8 py-8 max-w-full">
      {/* Greeting and Title */}
      <Greeting />

      {/* Main Grid */}
      <div className="grid grid-cols-2 gap-6 mt-10">
        {/* Top Left - Tasks Card */}
        <TasksCard />

        {/* Top Right - Productivity Card */}
        <ProductivityCard />

        {/* Bottom Left - Reminders Card */}
        <RemindersCard />

        {/* Bottom Right - Expenses Card */}
        <ExpensesCard />
      </div>
    </div>
  )
}
