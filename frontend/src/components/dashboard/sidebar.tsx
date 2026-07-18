'use client'

import { useState } from 'react'
import {
  Grid3x3,
  LayoutDashboard,
  CheckSquare2,
  Calendar,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Search,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

const navItems = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    id: 'overview',
  },
  {
    label: 'Tasks',
    icon: CheckSquare2,
    id: 'tasks',
  },
  {
    label: 'Calendar',
    icon: Calendar,
    id: 'calendar',
  },
  {
    label: 'Expenses',
    icon: Wallet,
    id: 'expenses',
  },
  {
    label: 'Insights',
    icon: BarChart3,
    id: 'insights',
  },
  {
    label: 'Settings',
    icon: Settings,
    id: 'settings',
  },
]

export function Sidebar() {
  const [activeItem, setActiveItem] = useState('overview')
  const { logout } = useAuth()

  return (
    <div className="w-72 bg-white border-r border-slate-100 flex flex-col h-full">
      {/* macOS Controls & Search Bar Row */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-4">
        {/* macOS Window Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search ZenFlow..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D70E8] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Logo */}
      <div className="px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-[#1D70E8] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Grid3x3 size={18} className="text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">ZenFlow</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id

            return (
              <button
                key={item.id}
                onClick={() => setActiveItem(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-[#E2EEFC] text-[#1D70E8]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-[#1D70E8]' : 'text-slate-400'} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Logout button at the bottom */}
      <div className="p-4 border-t border-slate-50">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium text-sm"
        >
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}

