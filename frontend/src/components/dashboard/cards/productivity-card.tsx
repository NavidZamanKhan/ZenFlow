'use client'

import { LineChart } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  dailyCountsToPath,
  weekBounds,
  weekOverWeekChange,
  weekProductivity,
} from '@/lib/productivity'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { Skeleton } from '@/components/ui/skeleton'
import type { Task } from '@/types/task'

type ProductivityCardProps = {
  tasks: Task[]
  loading: boolean
}

export function ProductivityCard({ tasks, loading }: ProductivityCardProps) {
  // pathLength isn't a transform, so MotionConfig's reducedMotion="user"
  // doesn't cover it — gate explicitly.
  const reducedMotion = usePrefersReducedMotion()
  const thisWeek = weekProductivity(tasks)
  const lastWeekRef = new Date()
  lastWeekRef.setDate(lastWeekRef.getDate() - 7)
  const lastWeek = weekProductivity(tasks, lastWeekRef)
  const delta = weekOverWeekChange(thisWeek.score, lastWeek.score)

  const { pathD, areaD, endX, endY } = dailyCountsToPath(thisWeek.dailyCompleted)
  const { start } = weekBounds()
  const weekLabel = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const subtitle =
    thisWeek.due > 0
      ? `${thisWeek.dueCompleted}/${thisWeek.due} due this week completed`
      : thisWeek.completed > 0
        ? `${thisWeek.completed} completed this week`
        : 'Complete tasks due this week to score'

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100/80 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <LineChart size={18} className="text-[#1D70E8]" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-800">Productivity</h2>
        </div>
        <Skeleton className="mb-2 h-3 w-40" />
        <Skeleton className="mb-4 h-9 w-24" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="mt-3 flex justify-between px-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-3" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-100/80 bg-white p-6 shadow-sm transition-[transform,box-shadow] duration-200 ease-out hover:shadow-md motion-safe:hover:-translate-y-0.5">
      <div className="mb-4">
        <div className="mb-1 flex items-center gap-2">
          <LineChart size={18} className="text-[#1D70E8]" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-800">Productivity</h2>
        </div>
        <p className="text-xs font-medium text-slate-400">
          Week of {weekLabel}
          {delta !== null
            ? ` · ${delta > 0 ? '+' : ''}${delta}% vs last week`
            : ' · Not enough data yet'}
        </p>
      </div>

      <div className="mb-1 flex flex-wrap items-end gap-3">
        <p className="text-3xl font-extrabold tracking-tight text-slate-800 tabular-nums">
          {thisWeek.score === null ? '—' : `${thisWeek.score}%`}
        </p>
        <p className="pb-1 text-xs font-medium text-slate-400">{subtitle}</p>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-slate-400">
        Score = tasks completed ÷ tasks due this week
        {thisWeek.due === 0
          ? ' (falls back to completions ÷ active tasks when nothing is due).'
          : '.'}{' '}
        Completion timing uses last update while marked complete.
      </p>

      <div className="relative mt-2 h-36 w-full">
        <svg
          viewBox="0 0 320 120"
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label="Daily task completions this week"
        >
          <defs>
            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D70E8" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#1D70E8" stopOpacity={0} />
            </linearGradient>
          </defs>

          <line x1="20" y1="30" x2="300" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="20" y1="60" x2="300" y2="60" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="20" y1="90" x2="300" y2="90" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />

          {pathD ? (
            <>
              <motion.path
                d={areaD}
                fill="url(#chart-grad)"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
              />
              <motion.path
                d={pathD}
                fill="none"
                stroke="#1D70E8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reducedMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
              />
              <circle cx={endX} cy={endY} r="4" fill="#1D70E8" />
              <circle
                cx={endX}
                cy={endY}
                r="8"
                fill="#1D70E8"
                fillOpacity={0.2}
                className="animate-ping"
              />
            </>
          ) : null}
        </svg>
      </div>

      <div className="mt-3 flex justify-between px-4 text-xs font-semibold text-slate-400">
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
