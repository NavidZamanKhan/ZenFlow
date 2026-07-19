import type { Task } from '@/types/task'

/** Local Monday (inclusive) → next Monday (exclusive) for a reference date. */
export function weekBounds(reference = new Date()): { start: Date; end: Date } {
  const day = reference.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = new Date(reference)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return { start, end }
}

function toLocalDate(isoDate: string): Date {
  return new Date(isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate)
}

function inRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date < end
}

/**
 * Transparent weekly productivity score:
 * completed-this-week ÷ due-this-week (or completed÷active when no due dates).
 * Completion timing uses updatedAt when completed=true (no completedAt field yet).
 */
export function weekProductivity(
  tasks: Task[],
  reference = new Date(),
): {
  score: number | null
  completed: number
  due: number
  dueCompleted: number
  dailyCompleted: number[]
} {
  const { start, end } = weekBounds(reference)
  const dueThisWeek = tasks.filter(
    (task) => task.dueDate !== null && inRange(toLocalDate(task.dueDate), start, end),
  )
  const completedThisWeek = tasks.filter(
    (task) =>
      task.completed && inRange(toLocalDate(task.updatedAt), start, end),
  )

  const due = dueThisWeek.length
  const dueCompleted = dueThisWeek.filter((task) => task.completed).length
  const completed = completedThisWeek.length

  let score: number | null = null
  if (due > 0) {
    score = Math.round((dueCompleted / due) * 100)
  } else if (completed > 0 || tasks.some((task) => !task.completed)) {
    const activePool =
      completed + tasks.filter((task) => !task.completed).length
    score = activePool > 0 ? Math.round((completed / activePool) * 100) : null
  }

  const dailyCompleted = Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(start)
    dayStart.setDate(start.getDate() + index)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayStart.getDate() + 1)
    return tasks.filter(
      (task) =>
        task.completed && inRange(toLocalDate(task.updatedAt), dayStart, dayEnd),
    ).length
  })

  return { score, completed, due, dueCompleted, dailyCompleted }
}

export function weekOverWeekChange(
  thisScore: number | null,
  lastScore: number | null,
): number | null {
  if (thisScore === null || lastScore === null) return null
  return thisScore - lastScore
}

/** Map daily counts to SVG polyline points inside the existing chart viewBox. */
export function dailyCountsToPath(
  counts: number[],
  width = 280,
  height = 90,
  left = 20,
  top = 20,
): { pathD: string; areaD: string; endX: number; endY: number } {
  const max = Math.max(...counts, 1)
  const step = width / Math.max(counts.length - 1, 1)
  const points = counts.map((count, index) => {
    const x = left + index * step
    const y = top + height - (count / max) * height
    return { x, y }
  })

  if (points.length === 0) {
    return { pathD: '', areaD: '', endX: left, endY: top + height }
  }

  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const last = points[points.length - 1]
  const first = points[0]
  const areaD = `${pathD} L ${last.x} ${top + height} L ${first.x} ${top + height} Z`

  return { pathD, areaD, endX: last.x, endY: last.y }
}
