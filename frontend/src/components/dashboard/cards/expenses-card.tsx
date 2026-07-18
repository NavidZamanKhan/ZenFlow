'use client'

import { CreditCard } from 'lucide-react'

interface ExpenseCategory {
  name: string
  amount: number
  percentage: number
  color: string
}

const expenses: ExpenseCategory[] = [
  {
    name: 'Software',
    amount: 1240,
    percentage: 50,
    color: 'bg-[#1D70E8]',
  },
  {
    name: 'Travel',
    amount: 868,
    percentage: 35,
    color: 'bg-[#67B2F5]',
  },
  {
    name: 'Other',
    amount: 372,
    percentage: 15,
    color: 'bg-[#7EDCD6]',
  },
]

export function ExpensesCard() {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CreditCard size={18} className="text-[#1D70E8]" />
        <h2 className="text-base font-bold text-slate-800">Expenses</h2>
      </div>

      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          ${totalExpenses.toLocaleString()}
        </h2>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">
          Spent this month
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2.5 bg-slate-50 border border-slate-100/30 rounded-full flex overflow-hidden">
          {expenses.map((expense) => (
            <div
              key={expense.name}
              className={`${expense.color} transition-all duration-300`}
              style={{ width: `${expense.percentage}%` }}
            ></div>
          ))}
        </div>
      </div>

      {/* Legend - Horizontal Row */}
      <div className="flex items-center gap-4 px-1">
        {expenses.map((expense) => (
          <div
            key={expense.name}
            className="flex items-center gap-2"
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${expense.color}`}
            ></div>
            <p className="text-xs font-semibold text-slate-400">
              {expense.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

