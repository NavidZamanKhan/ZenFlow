'use client'

import { Search } from 'lucide-react'

export function TopBar() {
  return (
    <div className="bg-zenflow-card border-b border-zenflow-border px-8 py-5 flex items-center justify-between">
      {/* macOS Window Controls */}
      <div className="flex items-center gap-3 w-12">
        <div className="w-3 h-3 rounded-full bg-red-400"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
        <div className="w-3 h-3 rounded-full bg-green-400"></div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-sm mx-auto">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zenflow-text-secondary"
          />
          <input
            type="text"
            placeholder="Search ZenFlow..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-zenflow-bg border border-zenflow-border text-sm text-zenflow-text placeholder:text-zenflow-text-secondary focus:outline-none focus:ring-2 focus:ring-zenflow-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Right spacer for symmetry */}
      <div className="w-12"></div>
    </div>
  )
}
