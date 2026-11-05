'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { FormInput } from './FormInput'
import { RecoveryShell } from './RecoveryShell'
import { ApiError, apiConfirmPasswordRecovery, apiValidateRecoveryToken } from '@/lib/api'

const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/\d/, 'Password must contain at least one digit.')
      .regex(PASSWORD_SPECIAL, 'Password must contain at least one special character.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type Values = z.infer<typeof schema>

type LinkState =
  | { kind: 'checking' }
  | { kind: 'valid'; email?: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'done' }

const INVALID_LINK_MESSAGE = 'This reset link is invalid or has expired. Request a new one to continue.'

export function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const uid = params.get('uid') ?? ''
  const token = params.get('token') ?? ''
  const [link, setLink] = useState<LinkState>(() =>
    uid && token ? { kind: 'checking' } : { kind: 'invalid', message: INVALID_LINK_MESSAGE },
  )

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched' })

  // Validate the link up front so the user gets a clear message before typing.
  useEffect(() => {
    if (!uid || !token) return
    let cancelled = false
    apiValidateRecoveryToken({ uid, token })
      .then((res) => {
        if (cancelled) return
        setLink(res.valid ? { kind: 'valid', email: res.email } : { kind: 'invalid', message: INVALID_LINK_MESSAGE })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const message =
          e instanceof ApiError && e.status !== 0 && e.status < 500 ? INVALID_LINK_MESSAGE : 'Could not verify the reset link. Please try again.'
        setLink({ kind: 'invalid', message })
      })
    return () => {
      cancelled = true
    }
  }, [uid, token])

  const onSubmit = async (values: Values) => {
    try {
      await apiConfirmPasswordRecovery({
        uid,
        token,
        new_password: values.password,
        confirm_password: values.confirmPassword,
      })
      setLink({ kind: 'done' })
      toast.success('Password updated. Please log in with your new password.')
      setTimeout(() => router.push('/login'), 1800)
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 429) {
          setError('confirmPassword', { type: 'manual', message: 'Too many attempts. Please wait and try again.' })
          return
        }
        const flat = Array.isArray(e.errors) ? e.errors : Object.values(e.errors).flat()
        const message = flat[0] ?? 'Could not reset the password.'
        if (/link|token|expired|invalid/i.test(message)) {
          setLink({ kind: 'invalid', message })
        } else {
          setError('password', { type: 'manual', message })
        }
      } else {
        setError('confirmPassword', { type: 'manual', message: 'Could not reset the password. Please try again.' })
      }
    }
  }

  const backToLogin = (
    <>
      Back to{' '}
      <Link href="/login" className="font-medium text-[var(--zf-accent)] hover:opacity-80">
        log in
      </Link>
    </>
  )

  if (link.kind === 'checking') {
    return (
      <RecoveryShell badge="Account recovery" heading="Checking your link…" subheading="One moment while we verify the reset link.">
        <div className="flex items-center justify-center py-6" role="status">
          <div className="size-8 animate-spin rounded-full border-4 border-[var(--zf-accent)] border-t-transparent" aria-hidden="true" />
          <span className="sr-only">Verifying reset link</span>
        </div>
      </RecoveryShell>
    )
  }

  if (link.kind === 'invalid') {
    return (
      <RecoveryShell badge="Account recovery" heading="Link not valid" subheading={link.message} footer={backToLogin}>
        <Link
          href="/forgot-password"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--zf-accent)] text-sm font-semibold text-white transition-colors duration-150 hover:bg-[var(--zf-accent-hover)]"
        >
          Request a new link
        </Link>
      </RecoveryShell>
    )
  }

  if (link.kind === 'done') {
    return (
      <RecoveryShell badge="All set" heading="Password updated" subheading="You've been signed out everywhere. Log in with your new password to continue." footer={backToLogin}>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <ShieldCheck className="size-5 shrink-0" aria-hidden="true" />
          Redirecting you to the login page…
        </div>
      </RecoveryShell>
    )
  }

  return (
    <RecoveryShell
      badge="Account recovery"
      heading="Choose a new password"
      subheading={link.email ? `Resetting the password for ${link.email}.` : 'Pick something strong and memorable.'}
      footer={backToLogin}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 min-[480px]:space-y-5">
        {link.email ? <input type="email" value={link.email} readOnly hidden autoComplete="username" /> : null}
        <FormInput
          id="reset-password"
          label="New password"
          type="password"
          icon={Lock}
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <FormInput
          id="reset-confirm-password"
          label="Confirm new password"
          type="password"
          icon={Lock}
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-[var(--zf-accent)] text-sm font-semibold text-white transition-colors duration-150 hover:bg-[var(--zf-accent-hover)] disabled:pointer-events-none disabled:opacity-60"
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </RecoveryShell>
  )
}
