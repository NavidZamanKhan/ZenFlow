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
import { EXPENSE_CATEGORY_META } from '@/lib/expense-meta'
import { formatCurrency, formatDisplayDate } from '@/lib/format'
import { buildInsightsAnalytics, type SpendingPoint } from '@/lib/insights-stats'

const CARD_CLASS = 'bg-white rounded-3xl border border-slate-100/80 shadow-sm'
const PRIMARY_BLUE = '#1D70E8'
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
  border: '1px solid #E8EDF3',
  borderRadius: '14px',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  color: '#334155',
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

function compactCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function hasSpending(points: SpendingPoint[]): boolean {
  return points.some((point) => point.amount > 0)
}

export function InsightsPage() {
  const { expenses, loading } = useExpenses()
  const analytics = useMemo(() => buildInsightsAnalytics(expenses), [expenses])

  if (loading) return <InsightsLoading />

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <p className="text-slate-400 text-sm font-medium mb-0.5">
          Understand your spending patterns
        </p>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Insights</h1>
      </div>

      {expenses.length === 0 ? (
        <EmptyInsights />
      ) : (
        <>
          <section aria-labelledby="summary-heading" className="mb-6">
            <h2 id="summary-heading" className="sr-only">
              Spending summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <SummaryCard icon={Wallet} label="Total expenses" value={formatCurrency(analytics.total)} />
              <SummaryCard icon={CalendarDays} label="This month" value={formatCurrency(analytics.thisMonth)} />
              <SummaryCard icon={Clock3} label="Last month" value={formatCurrency(analytics.lastMonth)} />
              <SummaryCard icon={Activity} label="Average daily" value={formatCurrency(analytics.averageDaily)} />
              <SummaryCard icon={TrendingUp} label="Average monthly" value={formatCurrency(analytics.averageMonthly)} />
              <SummaryCard
                icon={PieChartIcon}
                label="Highest category"
                value={analytics.highestCategory?.category ?? '—'}
                compact
              />
              <SummaryCard
                icon={Receipt}
                label="Total transactions"
                value={analytics.totalTransactions.toLocaleString()}
              />
            </div>
          </section>

          <section aria-labelledby="charts-heading" className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-[#1D70E8]" />
              <h2 id="charts-heading" className="text-base font-bold text-slate-800">
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
                    <CartesianGrid stroke="#EEF2F6" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="key" tickFormatter={monthLabel} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compactCurrency} tick={AXIS_TICK} axisLine={false} tickLine={false} width={58} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label) => monthLabel(String(label))}
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ stroke: '#D7E7FA', strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Spending"
                      stroke={PRIMARY_BLUE}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#FFFFFF', stroke: PRIMARY_BLUE, strokeWidth: 2 }}
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
                          formatter={(value) => formatCurrency(Number(value))}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Pie
                          data={analytics.categoryBreakdown}
                          dataKey="amount"
                          nameKey="category"
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
                    <CartesianGrid stroke="#EEF2F6" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="key" tickFormatter={weekdayLabel} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compactCurrency} tick={AXIS_TICK} axisLine={false} tickLine={false} width={58} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label) => dayLabel(String(label))}
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: '#F5F8FC' }}
                    />
                    <Bar dataKey="amount" name="Spending" fill={SOFT_BLUE} radius={[7, 7, 2, 2]} maxBarSize={34} />
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
                    <CartesianGrid stroke="#EEF2F6" strokeDasharray="3 3" vertical={false} />
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
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label) => dayLabel(String(label))}
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ stroke: '#D7E7FA', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Spending"
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
                          formatter={(value) => formatCurrency(Number(value))}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Pie
                          data={analytics.paymentDistribution}
                          dataKey="amount"
                          nameKey="paymentMethod"
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
              <PieChartIcon size={18} className="text-[#1D70E8]" />
              <h2 id="breakdown-heading" className="text-base font-bold text-slate-800">
                Spending breakdown
              </h2>
            </div>
            <div className="space-y-1">
              {analytics.categoryBreakdown.map((item) => {
                const meta = EXPENSE_CATEGORY_META[item.category]
                const Icon = meta.icon
                return (
                  <div key={item.category} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50/50 transition-colors">
                    <div
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: meta.softBg, color: meta.color }}
                      aria-hidden="true"
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <p className="text-sm font-medium text-slate-700 truncate">{item.category}</p>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs font-medium text-slate-400 tabular-nums">
                            {item.percentage.toFixed(1)}%
                          </span>
                          <span className="text-sm font-bold text-slate-800 tabular-nums">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
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
              <Sparkles size={18} className="text-[#1D70E8]" />
              <h2 id="analytics-heading" className="text-base font-bold text-slate-800">
                Smart analytics
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InsightCard text={monthComparisonText(analytics.monthChangePercentage)} />
              <InsightCard
                text={`${analytics.highestCategory?.category ?? 'No category'} is your highest spending category at ${formatCurrency(analytics.highestCategory?.amount ?? 0)}.`}
              />
              <InsightCard
                text={`${analytics.lowestCategory?.category ?? 'No category'} is your lowest active category at ${formatCurrency(analytics.lowestCategory?.amount ?? 0)}.`}
              />
              <InsightCard
                text={`Average spending is ${formatCurrency(analytics.averageDaily)} per active spending day.`}
              />
              <InsightCard
                text={`${analytics.currentMonthTransactions.toLocaleString()} ${analytics.currentMonthTransactions === 1 ? 'transaction was' : 'transactions were'} recorded this month.`}
              />
            </div>
          </section>

          <section aria-labelledby="trends-heading">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-[#1D70E8]" />
              <h2 id="trends-heading" className="text-base font-bold text-slate-800">
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
                    ? `${formatCurrency(analytics.biggestCategoryIncrease.amount)} more than last month`
                    : 'No category increased month over month'
                }
              />
              <TrendCard
                icon={ArrowDownRight}
                label="Biggest category decrease"
                value={analytics.biggestCategoryDecrease?.category ?? 'Not enough data'}
                detail={
                  analytics.biggestCategoryDecrease
                    ? `${formatCurrency(Math.abs(analytics.biggestCategoryDecrease.amount))} less than last month`
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
                detail={formatCurrency(analytics.mostExpensiveDay?.amount ?? 0)}
              />
              <TrendCard
                icon={CircleDollarSign}
                label="Largest single expense"
                value={analytics.largestExpense?.title ?? '—'}
                detail={formatCurrency(analytics.largestExpense?.amount ?? 0)}
              />
              <TrendCard
                icon={Receipt}
                label="Average transaction value"
                value={formatCurrency(analytics.averageTransactionValue)}
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
        <Icon size={18} className="text-[#1D70E8]" />
        <h2 className="text-sm font-bold text-slate-800">{label}</h2>
      </div>
      <p
        className={`${compact ? 'text-xl' : 'text-2xl'} font-extrabold text-slate-800 tracking-tight tabular-nums truncate`}
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
        <Icon size={18} className="text-[#1D70E8] mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
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
      <div className="w-10 h-10 rounded-2xl bg-[#E2EEFC] flex items-center justify-center mb-3">
        <BarChart3 size={18} className="text-[#1D70E8]" />
      </div>
      <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">{message}</p>
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
            <span className="text-xs font-medium text-slate-500 truncate">{item.label}</span>
          </span>
          <span className="text-xs font-bold text-slate-700 tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function InsightCard({ text }: { text: string }) {
  return (
    <div className={`${CARD_CLASS} p-4 flex items-start gap-3`}>
      <div className="w-8 h-8 rounded-xl bg-[#E2EEFC] flex items-center justify-center flex-shrink-0">
        <Sparkles size={15} className="text-[#1D70E8]" />
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
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
        <Icon size={17} className="text-[#1D70E8]" />
        <p className="text-xs font-semibold text-slate-400">{label}</p>
      </div>
      <p className="text-sm font-bold text-slate-800 truncate" title={value}>{value}</p>
      <p className="text-xs text-slate-400 mt-1 tabular-nums">{detail}</p>
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
      <div className="flex flex-col items-center py-14 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#E2EEFC] flex items-center justify-center mb-4">
          <BarChart3 size={22} className="text-[#1D70E8]" />
        </div>
        <p className="text-sm font-semibold text-slate-700 mb-1">No insights yet</p>
        <p className="text-xs text-slate-400 mb-5 max-w-[280px]">
          Your spending patterns will take shape as you add expenses.
        </p>
        <Link
          href="/dashboard/expenses"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1D70E8] hover:bg-[#1660CC] transition-colors"
        >
          <Wallet size={16} />
          Go to Expenses
        </Link>
      </div>
    </div>
  )
}

function InsightsLoading() {
  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl" aria-label="Loading insights">
      <div className="mb-6">
        <div className="h-3 w-48 rounded-full bg-slate-100 animate-pulse mb-2" />
        <div className="h-7 w-24 rounded-lg bg-slate-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className={`${CARD_CLASS} p-5`}>
            <div className="h-4 w-28 rounded-full bg-slate-100 animate-pulse mb-4" />
            <div className="h-7 w-32 rounded-lg bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((index) => (
          <div key={index} className={`${CARD_CLASS} p-5 h-[350px]`}>
            <div className="h-4 w-36 rounded-full bg-slate-100 animate-pulse mb-5" />
            <div className="h-[260px] rounded-2xl bg-slate-50 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
