'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Mail, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormInput } from './FormInput'
import { OtpDialog } from './OtpDialog'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

const signupSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    terms: z.boolean().refine((v) => v, 'You must agree to the Terms and Privacy Policy'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupValues = z.infer<typeof signupSchema>

export function SignupForm() {
  const { signup } = useAuth()
  const [otpOpen, setOtpOpen] = useState(false)
  const [pendingId, setPendingId] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
    defaultValues: { terms: false },
  })

  const onSubmit = async (values: SignupValues) => {
    try {
      const result = await signup(values.fullName, values.email, values.password, values.confirmPassword)
      setPendingId(result.pendingRegistrationId)
      setPendingEmail(values.email)
      setOtpOpen(true)
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (Array.isArray(e.errors)) {
          // Flat list of errors — show on the form generically
          setError('confirmPassword', { type: 'manual', message: e.errors[0] })
        } else {
          // Field-level errors from DRF serializer
          const fieldMap: Record<string, keyof SignupValues> = {
            full_name: 'fullName',
            email: 'email',
            password: 'password',
            confirm_password: 'confirmPassword',
          }
          for (const [backendField, messages] of Object.entries(e.errors)) {
            const formField = fieldMap[backendField]
            if (formField) {
              setError(formField, { type: 'manual', message: messages[0] })
            }
          }
        }
      } else {
        const message = e instanceof Error ? e.message : 'Signup failed'
        setError('confirmPassword', { type: 'manual', message })
      }
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4 min-[480px]:space-y-5"
      >
        <FormInput
          id="signup-name"
          label="Full name"
          type="text"
          icon={User}
          placeholder="Maya Chen"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <FormInput
          id="signup-email"
          label="Email"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormInput
          id="signup-password"
          label="Password"
          type="password"
          icon={Lock}
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <FormInput
          id="signup-confirm-password"
          label="Confirm password"
          type="password"
          icon={Lock}
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <div>
          <label htmlFor="signup-terms" className="flex items-start gap-2.5 text-sm text-slate-600">
            <input
              id="signup-terms"
              type="checkbox"
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? 'signup-terms-error' : undefined}
              className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-blue-500"
              {...register('terms')}
            />
            <span>
              I agree to the{' '}
              <a
                href="#"
                className="text-blue-600 transition-colors duration-150 hover:text-blue-700"
              >
                Terms
              </a>{' '}
              and{' '}
              <a
                href="#"
                className="text-blue-600 transition-colors duration-150 hover:text-blue-700"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>
          {errors.terms ? (
            <p id="signup-terms-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.terms.message}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-blue-500 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-600 disabled:pointer-events-none disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <OtpDialog
        open={otpOpen}
        pendingRegistrationId={pendingId}
        email={pendingEmail}
        onClose={() => setOtpOpen(false)}
      />
    </>
  )
}
