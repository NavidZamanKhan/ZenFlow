'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormInput } from './FormInput'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const { login } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  })

  const onSubmit = async (values: LoginValues) => {
    try {
      await login(values.email, values.password)
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        // Backend returns generic "Invalid email or password." — show on password field
        const msg = Array.isArray(e.errors) ? e.errors[0] : Object.values(e.errors).flat()[0]
        setError('password', { type: 'manual', message: msg ?? 'Login failed' })
      } else {
        const message = e instanceof Error ? e.message : 'Login failed'
        setError('password', { type: 'manual', message })
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 min-[480px]:space-y-5"
    >
      <FormInput
        id="login-email"
        label="Email"
        type="email"
        icon={Mail}
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormInput
        id="login-password"
        label="Password"
        type="password"
        icon={Lock}
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        labelRight={
          <a
            href="#"
            className="text-sm text-blue-500 transition-colors duration-150 hover:text-blue-600"
          >
            Forgot password?
          </a>
        }
        {...register('password')}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-blue-500 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-600 disabled:pointer-events-none disabled:opacity-60"
      >
        {isSubmitting ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  )
}
