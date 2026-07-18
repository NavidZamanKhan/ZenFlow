'use client'

import { useState } from 'react'
import { CheckCircle2, ListTodo } from 'lucide-react'

interface Task {
  id: string
  title: string
  category: string
  completed: boolean
}

const tasks: Task[] = [
  {
    id: '1',
    title: 'Finalize Q3 roadmap',
    category: 'Product',
    completed: true,
  },
  {
    id: '2',
    title: 'Review design handoff',
    category: 'Design',
    completed: true,
  },
  {
    id: '3',
    title: 'Client sync — Northwind',
    category: 'Meeting',
    completed: false,
  },
  {
    id: '4',
    title: 'Draft budget proposal',
    category: 'Finance',
    completed: false,
  },
]

export function TasksCard() {
  // Initialize completed tasks with 1 and 2 to match the screenshot
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set(['1', '2']))

  const toggleTask = (id: string) => {
    const updated = new Set(completedTasks)
    if (updated.has(id)) {
      updated.delete(id)
    } else {
      updated.add(id)
    }
    setCompletedTasks(updated)
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-2 mb-6">
        <ListTodo size={18} className="text-[#1D70E8]" />
        <h2 className="text-base font-bold text-slate-800">
          Tasks
        </h2>
      </div>

      <div className="space-y-1">
        {tasks.map((task) => {
          const isCompleted = completedTasks.has(task.id)
          return (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className="w-full flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-slate-50/50 transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 size={18} className="text-[#1D70E8]" />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full border border-slate-300 group-hover:border-[#1D70E8] transition-colors"></div>
                  )}
                </div>

                {/* Task Title */}
                <p
                  className={`text-sm font-medium transition-all ${
                    isCompleted
                      ? 'line-through text-slate-400'
                      : 'text-slate-700'
                  }`}
                >
                  {task.title}
                </p>
              </div>

              {/* Category Pill */}
              <div className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F3F5] text-slate-500 whitespace-nowrap">
                {task.category}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

