'use client'

import { Bell } from 'lucide-react'

interface Reminder {
  id: string
  title: string
  time: string
}

const reminders: Reminder[] = [
  {
    id: '1',
    title: 'Standup with team',
    time: '9:30 AM',
  },
  {
    id: '2',
    title: 'Dentist appointment',
    time: '2:00 PM',
  },
  {
    id: '3',
    title: 'Send invoice #402',
    time: '5:15 PM',
  },
]

export function RemindersCard() {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-2 mb-6">
        <Bell size={18} className="text-[#1D70E8]" />
        <h2 className="text-base font-bold text-slate-800">
          Reminders
        </h2>
      </div>

      <div className="space-y-4 px-1">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-center justify-between py-1 group"
          >
            {/* Icon and Title */}
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1D70E8] flex-shrink-0" />
              <p className="text-sm font-medium text-slate-700">
                {reminder.title}
              </p>
            </div>

            {/* Time */}
            <p className="text-sm font-semibold text-slate-400">
              {reminder.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

