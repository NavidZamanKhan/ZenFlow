'use client'

import { useState, type ComponentPropsWithRef, type ReactNode } from 'react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type FormInputProps = {
  label: string
  icon: LucideIcon
  error?: string
  labelRight?: ReactNode
} & Omit<ComponentPropsWithRef<'input'>, 'className'>

export function FormInput({
  label,
  icon: Icon,
  error,
  labelRight,
  id,
  type,
  ...props
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={id}
          type={inputType}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 text-sm text-slate-900 transition-colors duration-150 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40',
            isPassword ? 'pr-10' : 'pr-3.5',
            error && 'border-red-400',
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-slate-400 transition-colors duration-150 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}
