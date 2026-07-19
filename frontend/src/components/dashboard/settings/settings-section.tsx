'use client'

import { useId, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const SETTINGS_CARD_CLASS =
  'bg-white rounded-3xl border border-slate-100/80 shadow-sm'

export const SETTINGS_INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D70E8]/30 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all'

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string
  icon: LucideIcon
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`}>
      <div className="flex items-start gap-2 mb-4">
        <Icon size={18} className="text-[#1D70E8] mt-0.5 flex-shrink-0" />
        <div>
          <h2
            id={`${id}-heading`}
            className="text-base font-bold text-slate-800"
          >
            {title}
          </h2>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className={`${SETTINGS_CARD_CLASS} p-5 sm:p-6`}>{children}</div>
    </section>
  )
}

export function SettingsField({
  label,
  error,
  helper,
  children,
}: {
  label: string
  error?: string
  helper?: string
  children: ReactNode
}) {
  const errorId = useId()

  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </span>
      {children}
      {error ? (
        <span id={errorId} role="alert" className="block mt-1.5 text-xs text-red-600">
          {error}
        </span>
      ) : helper ? (
        <span className="block mt-1.5 text-xs text-slate-500">{helper}</span>
      ) : null}
    </label>
  )
}

export function SettingsSelect({
  value,
  onValueChange,
  options,
  disabled = false,
  ariaLabel,
}: {
  value: string
  onValueChange: (value: string) => void
  options: readonly { value: string; label: string }[]
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange(String(nextValue))
      }}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-[42px] w-full rounded-xl border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-transparent focus-visible:ring-[#1D70E8]/30 disabled:bg-slate-50"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function SettingsNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#D7E7FA] bg-[#F5F9FE] px-4 py-3 text-xs leading-relaxed text-slate-500">
      {children}
    </div>
  )
}
