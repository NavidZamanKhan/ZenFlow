'use client'

import { LineChart } from 'lucide-react'

export function ProductivityCard() {
  // SVG Path coordinates for the curved line chart matching mockup
  const pathD = `M 20 70 
                 C 43 55, 43 50, 66.67 50 
                 C 90 50, 90 40, 113.33 40 
                 C 136.67 40, 136.67 60, 160 60 
                 C 183.33 60, 183.33 30, 206.67 30 
                 C 230 30, 230 90, 253.33 90 
                 C 276.67 90, 276.67 80, 300 80`

  const areaD = `${pathD} L 300 120 L 20 120 Z`

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <LineChart size={18} className="text-[#1D70E8]" />
          <h2 className="text-base font-bold text-slate-800">Productivity</h2>
        </div>
        <p className="text-xs text-slate-400 font-medium">This week • +18%</p>
      </div>

      {/* SVG Chart Area */}
      <div className="relative h-36 w-full mt-6">
        <svg
          viewBox="0 0 320 120"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D70E8" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#1D70E8" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          <line x1="20" y1="30" x2="300" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="20" y1="60" x2="300" y2="60" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="20" y1="90" x2="300" y2="90" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />

          {/* Gradient Fill under curve */}
          <path d={areaD} fill="url(#chart-grad)" />

          {/* Main Curved Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#1D70E8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Endpoint/Pulse indicator */}
          <circle cx="300" cy="80" r="4" fill="#1D70E8" />
          <circle cx="300" cy="80" r="8" fill="#1D70E8" fillOpacity={0.2} className="animate-ping" />
        </svg>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs font-semibold text-slate-400 px-4 mt-3">
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
        <span>S</span>
      </div>
    </div>
  )
}

