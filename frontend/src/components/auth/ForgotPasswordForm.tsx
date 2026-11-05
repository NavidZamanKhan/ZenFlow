'use client'

import { useState } from 'react'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, MailCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormInput } from './FormInput'
import { RecoveryShell } from './RecoveryShell'
import { ApiError, apiForgotPassword } from '@/lib/api'

const schema = z.object({
  email: z.email('Enter a valid email address'),
})

type Values = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched' })

  const onSubmit = async (values: Values) => {
    try {
      await apiForgotPassword({ email: values.email })
      setSentTo(values.email)
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.status === 429
            ? 'Too many attempts. Please wait a while before trying again.'
            : e.message
          : 'Could not send the reset email. Please try again.'
      setError('email', { type: 'manual', message })
    }
  }

  if (sentTo) {
    return (
      <RecoveryShell
        badge="Check your inbox"
        heading="Reset link sent"
        subheading="If an account exists for that address, a password reset link is on its way."
        footer={
          <>
            Back to{' '}
            <Link href="/login" className="font-medium text-[var(--zf-accent)] hover:opacity-80">
              log in
            </Link>
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-[var(--zf-border)] dark:bg-slate-800/60 dark:text-slate-300">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-[var(--zf-accent)]" aria-hidden="true" />
          <div>
            <p>
              We sent instructions to <span className="font-medium text-slate-900 dark:text-slate-100">{sentTo}</span>.
              The link expires in about an hour.
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Didn&apos;t get it? Check your spam folder or{' '}
              <button
                type="button"
                onClick={() => setSentTo(null)}
                className="font-medium text-[var(--zf-accent)] hover:opacity-80"
              >
                try another address
              </button>
              .
            </p>
          </div>
        </div>
      </RecoveryShell>
    )
  }

  return (
    <RecoveryShell
      badge="Account recovery"
      heading="Forgot your password?"
      subheading="Enter the email you signed up with and we'll send you a reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-[var(--zf-accent)] hover:opacity-80">
            Back to log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 min-[480px]:space-y-5">
        <FormInput
          id="forgot-email"
          label="Email"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-[var(--zf-accent)] text-sm font-semibold text-white transition-colors duration-150 hover:bg-[var(--zf-accent-hover)] disabled:pointer-events-none disabled:opacity-60"
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="sr-only" aria-live="polite">
          {isSubmitting ? `Sending reset link to ${getValues('email')}` : ''}
        </p>
      </form>
    </RecoveryShell>
  )
}
