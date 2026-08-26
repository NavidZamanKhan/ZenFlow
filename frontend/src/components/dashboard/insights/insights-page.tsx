'use client'

import Link from 'next/link'
import { useMemo, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  CreditCard,
  PieChart as PieChartIcon,
  Receipt,
  Sparkles,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useExpenses } from '@/hooks/use-expenses'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { EmptyState, ErrorState } from '@/components/shared/state-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { EXPENSE_CATEGORY_META } from '@/lib/expense-meta'
import { formatDisplayDate } from '@/lib/format'
import { useCurrency } from '@/lib/currency-context'
import { useSettings } from '@/hooks/use-settings'
import { buildInsightsAnalytics, type SpendingPoint } from '@/lib/insights-stats'

const CARD_CLASS = 'bg-white dark:bg-[var(--zf-surface)] rounded-3xl border border-slate-100/80 dark:border-[var(--zf-border)] shadow-sm'
const SOFT_BLUE = '#67B2F5'
const SOFT_TEAL = '#7EDCD6'
const PAYMENT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]
const AXIS_TICK = { fill: '#94A3B8', fontSize: 11, fontWeight: 500 }
const TOOLTIP_STYLE = {
  backgroundColor: 'var(--zf-surface, #FFFFFF)',
  borderColor: 'var(--zf-border, #E8EDF3)',
  borderRadius: '14px',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
  color: 'var(--zf-text, #334155)',
  fontSize: '12px',
}

function monthLabel(key: string): string {
  const date = new Date(`${key}-01T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function dayLabel(key: string): string {
  const date = new Date(`${key}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function weekdayLabel(key: string): string {
  const date = new Date(`${key}T00:00:00`)
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function hasSpending(points: SpendingPoint[]): boolean {
  return points.some((point) => point.amount > 0)
}

export function InsightsPage() {
  const { expenses, loading, error, reload } = useExpenses()
  const { format, meta, convert } = useCurrency()
  const { settings } = useSettings()
  const accentColor = useMemo(() => {
    const palettes: Record<string, string> = {
      blue: '#1D70E8', teal: '#14B8A6', violet: '#8B5CF6', coral: '#F97316',
    }
    return palettes[settings.appearance.accentColor] || palettes.blue
  }, [settings.appearance.accentColor])
  const analytics = useMemo(
    () => buildInsightsAnalytics(expenses, undefined, convert),
    [expenses, convert],
  )
  // Recharts animates entrances by default — disable under prefers-reduced-motion.
  const animateCharts = !usePrefersReducedMotion()

  const compactCurrency = (value: number): string => {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  if (loading) return <InsightsLoading />

  if (error) {
    return (
      <div className="max-w-5xl px-4 py-8 sm:px-8">
        <ErrorState description={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-0.5">
          Clarity on where your money flows
        </p>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-[var(--zf-text)] tracking-tight">Insights</h1>
      </div>

      {expenses.length === 0 ? (
        <EmptyInsights />
      ) : (
        <>
          <section aria-labelledby="summary-heading" className="mb-6">
            <h2 id="summary-heading" className="sr-only">
              Expense summary cards
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <SummaryCard icon={Wallet} label="Total spending" value={format(analytics.total)} />
              <SummaryCard icon={Receipt} label="This month" value={format(analytics.thisMonth)} />
              <SummaryCard icon={Clock3} label="Daily average" value={format(analytics.averageDaily)} />
              <SummaryCard icon={CreditCard} label="Total transactions" value={analytics.totalTransactions.toLocaleString()} />
            </div>
          </section>

          <section aria-labelledby="charts-heading" className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-[var(--zf-accent)]" />
              <h2 id="charts-heading" className="text-base font-bold text-slate-800 dark:text-[var(--zf-text)]">
                Spending charts
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard
                icon={TrendingUp}
                title="Monthly expense trend"
                description="Spending totals across recorded months"
                empty={analytics.monthlyTrend.length < 2}
                emptyMessage="Add expenses across at least two months to see a monthly trend."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.monthlyTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#EEF2F6" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="key" tickFormatter={monthLabel} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compactCurrency} tick={AXIS_TICK} axisLine={false} tickLine={false} width={58} />
                    <Tooltip
                      formatter={(value) => format(Number(value))}
                      labelFormatter={(label) => monthLabel(String(label))}
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ stroke: 'var(--zf-accent-light-border, #D7E7FA)', strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Spending"
                      isAnimationActive={animateCharts}
                      stroke={accentColor}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#FFFFFF', stroke: accentColor, strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                icon={PieChartIcon}
                title="Expenses by category"
                description="Your all-time category mix"
                empty={analytics.categoryBreakdown.length === 0}
                emptyMessage="Category activity will appear after you add an expense."
              >
                <div className="h-full flex flex-col sm:flex-row items-center gap-2">
                  <div className="w-full sm:w-[58%] h-full min-h-[210px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(value) => format(Number(value))}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Pie
                          data={analytics.categoryBreakdown}
                          dataKey="amount"
                          nameKey="category"
                          isAnimationActive={animateCharts}
                          innerRadius="58%"
                          outerRadius="82%"
                          paddingAngle={2}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        >
                          {analytics.categoryBreakdown.map((item) => (
                            <Cell
                              key={item.category}
                              fill={EXPENSE_CATEGORY_META[item.category].color}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ChartLegend
                    items={analytics.categoryBreakdown.slice(0, 5).map((item) => ({
                      label: item.category,
                      value: `${item.percentage.toFixed(1)}%`,
                      color: EXPENSE_CATEGORY_META[item.category].color,
                    }))}
                  />
                </div>
              </ChartCard>

              <ChartCard
                icon={CalendarDays}
                title="Weekly spending"
                description="The last seven calendar days"
                empty={!hasSpending(analytics.weeklySpending)}
                emptyMessage="No spending was recorded in the last seven days."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.weeklySpending} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#EEF2F6" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="key" tickFormatter={weekdayLabel} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compactCurrency} tick={AXIS_TICK} axisLine={false} tickLine={false} width={58} />
                    <Tooltip
                      formatter={(value) => format(Number(value))}
                      labelFormatter={(label) => dayLabel(String(label))}
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: 'rgba(29, 112, 232, 0.08)' }}
                    />
                    <Bar dataKey="amount" name="Spending" isAnimationActive={animateCharts} fill={SOFT_BLUE} radius={[7, 7, 2, 2]} maxBarSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                icon={Activity}
                title="Daily spending"
                description="Day-by-day activity this month"
                empty={!hasSpending(analytics.dailySpending)}
                emptyMessage="No spending was recorded this month."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dailySpending} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dailySpendingFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SOFT_TEAL} stopOpacity={0.45} />
                        <stop offset="95%" stopColor={SOFT_TEAL} stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#EEF2F6" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="key"
                      tickFormatter={(key) => String(Number(String(key).slice(8, 10)))}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={14}
                    />
                    <YAxis tickFormatter={compactCurrency} tick={AXIS_TICK} axisLine={false} tickLine={false} width={58} />
                    <Tooltip
                      formatter={(value) => format(Number(value))}
                      labelFormatter={(label) => dayLabel(String(label))}
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ stroke: 'var(--zf-accent-light-border, #D7E7FA)', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Spending"
                      isAnimationActive={animateCharts}
                      stroke={SOFT_TEAL}
                      strokeWidth={2.5}
                      fill="url(#dailySpendingFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                icon={CreditCard}
                title="Payment methods"
                description="Distribution by amount spent"
                empty={analytics.paymentDistribution.length === 0}
                emptyMessage="Payment method activity will appear here."
                className="lg:col-span-2"
              >
                <div className="h-full flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-1/2 h-full min-h-[210px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(value) => format(Number(value))}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Pie
                          data={analytics.paymentDistribution}
                          dataKey="amount"
                          nameKey="paymentMethod"
                          isAnimationActive={animateCharts}
                          innerRadius="52%"
                          outerRadius="80%"
                          paddingAngle={2}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        >
                          {analytics.paymentDistribution.map((item, index) => (
                            <Cell
                              key={item.paymentMethod}
                              fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ChartLegend
                    items={analytics.paymentDistribution.map((item, index) => ({
                      label: item.paymentMethod,
                      value: `${item.percentage.toFixed(1)}%`,
                      color: PAYMENT_COLORS[index % PAYMENT_COLORS.length],
                    }))}
                    wide
                  />
                </div>
              </ChartCard>
            </div>
          </section>

          <section className={`${CARD_CLASS} p-6 mb-6`} aria-labelledby="breakdown-heading">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon size={18} className="text-[var(--zf-accent)]" />
              <h2 id="breakdown-heading" className="text-base font-bold text-slate-800 dark:text-[var(--zf-text)]">
                Spending breakdown
              </h2>
            </div>
            <div className="space-y-1">
              {analytics.categoryBreakdown.map((item) => {
                const meta = EXPENSE_CATEGORY_META[item.category]
                const Icon = meta.icon
                return (
                  <div key={item.category} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <div
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: meta.softBg, color: meta.color }}
                      aria-hidden="true"
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{item.category}</p>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                            {item.percentage.toFixed(1)}%
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                            {format(item.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${item.percentage}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mb-6" aria-labelledby="analytics-heading">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-[var(--zf-accent)]" />
              <h2 id="analytics-heading" className="text-base font-bold text-slate-800 dark:text-[var(--zf-text)]">
                Smart analytics
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InsightCard text={monthComparisonText(analytics.monthChangePercentage)} />
              <InsightCard
                text={`${analytics.highestCategory?.category ?? 'No category'} is your highest spending category at ${format(analytics.highestCategory?.amount ?? 0)}.`}
              />
              <InsightCard
                text={`${analytics.lowestCategory?.category ?? 'No category'} is your lowest active category at ${format(analytics.lowestCategory?.amount ?? 0)}.`}
              />
              <InsightCard
                text={`Average spending is ${format(analytics.averageDaily)} per active spending day.`}
              />
              <InsightCard
                text={`${analytics.currentMonthTransactions.toLocaleString()} ${analytics.currentMonthTransactions === 1 ? 'transaction was' : 'transactions were'} recorded this month.`}
              />
            </div>
          </section>

          <section aria-labelledby="trends-heading">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-[var(--zf-accent)]" />
              <h2 id="trends-heading" className="text-base font-bold text-slate-800 dark:text-[var(--zf-text)]">
                Trends
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <TrendCard
                icon={ArrowUpRight}
                label="Biggest category increase"
                value={analytics.biggestCategoryIncrease?.category ?? 'Not enough data'}
                detail={
                  analytics.biggestCategoryIncrease
                    ? `${format(analytics.biggestCategoryIncrease.amount)} more than last month`
                    : 'No category increased month over month'
                }
              />
              <TrendCard
                icon={ArrowDownRight}
                label="Biggest category decrease"
                value={analytics.biggestCategoryDecrease?.category ?? 'Not enough data'}
                detail={
                  analytics.biggestCategoryDecrease
                    ? `${format(Math.abs(analytics.biggestCategoryDecrease.amount))} less than last month`
                    : 'No category decreased month over month'
                }
              />
              <TrendCard
                icon={Activity}
                label="Most active spending day"
                value={analytics.mostActiveDay ? formatDisplayDate(analytics.mostActiveDay.date) : '—'}
                detail={`${analytics.mostActiveDay?.transactions ?? 0} transactions`}
              />
              <TrendCard
                icon={CalendarDays}
                label="Most expensive day"
                value={analytics.mostExpensiveDay ? formatDisplayDate(analytics.mostExpensiveDay.date) : '—'}
                detail={format(analytics.mostExpensiveDay?.amount ?? 0)}
              />
              <TrendCard
                icon={CircleDollarSign}
                label="Largest single expense"
                value={analytics.largestExpense?.title ?? '—'}
                detail={format(analytics.largestExpense?.amount ?? 0)}
              />
              <TrendCard
                icon={Receipt}
                label="Average transaction value"
                value={format(analytics.averageTransactionValue)}
                detail={`Across ${analytics.totalTransactions.toLocaleString()} transactions`}
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  compact = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className={`${CARD_CLASS} p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-[var(--zf-accent)]" />
        <h2 className="text-sm font-bold text-slate-800 dark:text-[var(--zf-text)]">{label}</h2>
      </div>
      <p
        className={`${compact ? 'text-xl' : 'text-2xl'} font-extrabold text-slate-800 dark:text-[var(--zf-text)] tracking-tight tabular-nums truncate`}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}

function ChartCard({
  icon: Icon,
  title,
  description,
  empty,
  emptyMessage,
  className = '',
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  empty: boolean
  emptyMessage: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`${CARD_CLASS} p-5 ${className}`}>
      <div className="flex items-start gap-2 mb-4">
        <Icon size={18} className="text-[var(--zf-accent)] mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-[var(--zf-text)]">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="h-[270px]" role="img" aria-label={title}>
        {empty ? <ChartEmpty message={emptyMessage} /> : children}
      </div>
    </div>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--zf-accent-soft)]">
        <BarChart3 size={18} className="text-[var(--zf-accent)]" />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[240px]">{message}</p>
    </div>
  )
}

function ChartLegend({
  items,
  wide = false,
}: {
  items: { label: string; value: string; color: string }[]
  wide?: boolean
}) {
  return (
    <div className={`${wide ? 'w-full sm:w-1/2 sm:grid sm:grid-cols-2' : 'w-full sm:w-[42%]'} gap-x-5 space-y-2 sm:space-y-0`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 py-1">
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{item.label}</span>
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function InsightCard({ text }: { text: string }) {
  return (
    <div className={`${CARD_CLASS} p-4 flex items-start gap-3`}>
      <div className="w-8 h-8 rounded-xl bg-[var(--zf-accent-soft)] flex items-center justify-center flex-shrink-0">
        <Sparkles size={15} className="text-[var(--zf-accent)]" />
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{text}</p>
    </div>
  )
}

function TrendCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
}) {
  return (
    <div className={`${CARD_CLASS} p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={17} className="text-[var(--zf-accent)]" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="text-sm font-bold text-slate-800 dark:text-[var(--zf-text)] truncate" title={value}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">{detail}</p>
    </div>
  )
}

function monthComparisonText(change: number | null): string {
  if (change === null) return 'There is no last-month baseline for a percentage comparison yet.'
  if (change === 0) return 'Spending is unchanged from last month.'
  return `Spending is ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% from last month.`
}

function EmptyInsights() {
  return (
    <div className={`${CARD_CLASS} p-6`}>
      <EmptyState
        icon={BarChart3}
        title="No insights yet"
        description="Your spending patterns will take shape as you add expenses."
        action={
          <Link
            href="/dashboard/expenses"
            className="flex items-center gap-1.5 rounded-xl bg-[var(--zf-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--zf-accent-hover)]"
          >
            <Wallet size={16} />
            Go to Expenses
          </Link>
        }
      />
    </div>
  )
}

function InsightsLoading() {
  return (
    <div className="max-w-5xl px-4 py-8 sm:px-8" aria-label="Loading insights">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-48 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className={`${CARD_CLASS} p-5`}>
            <Skeleton className="mb-4 h-4 w-28 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className={`${CARD_CLASS} h-[350px] p-5`}>
            <Skeleton className="mb-5 h-4 w-36 rounded-full" />
            <Skeleton className="h-[260px] rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
