'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Mail, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormInput } from './FormInput'

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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
    defaultValues: { terms: false },
  })

  const onSubmit = (values: SignupValues) => {
    // TODO: wire to the authentication API
    console.log('signup', values)
  }

  return (
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
        <label className="flex items-start gap-2.5 text-sm text-slate-500">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-blue-500"
            {...register('terms')}
          />
          <span>
            I agree to the{' '}
            <a
              href="#"
              className="text-blue-500 transition-colors duration-150 hover:text-blue-600"
            >
              Terms
            </a>{' '}
            and{' '}
            <a
              href="#"
              className="text-blue-500 transition-colors duration-150 hover:text-blue-600"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {errors.terms && <p className="mt-1.5 text-xs text-red-500">{errors.terms.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-blue-500 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-600 disabled:pointer-events-none disabled:opacity-60"
      >
        Create account
      </button>
    </form>
  )
}
