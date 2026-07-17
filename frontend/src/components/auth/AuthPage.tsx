'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ZenFlowLogo } from '@/components/zenflow-logo'
import { cn } from '@/lib/utils'
import { DashboardPreview } from './DashboardPreview'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'

type AuthTab = 'login' | 'signup'

const copy: Record<
  AuthTab,
  { badge: string; heading: string; subheading: string; footerPrompt: string; footerAction: string }
> = {
  login: {
    badge: 'Welcome back',
    heading: 'Welcome back',
    subheading: 'Log in to get back to your calm workspace.',
    footerPrompt: "Don't have an account?",
    footerAction: 'Sign up',
  },
  signup: {
    badge: 'Get started',
    heading: 'Create your account',
    subheading: 'A few details and your quiet workspace is ready.',
    footerPrompt: 'Already have an account?',
    footerAction: 'Log in',
  },
}

function PillBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-600">
      <span className="size-1.5 rounded-full bg-blue-500" aria-hidden="true" />
      {children}
    </span>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.14 7.14 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-slate-900" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.38.81 1.1.81 2.23v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .3Z" />
    </svg>
  )
}

export function AuthPage({ defaultTab = 'login' }: { defaultTab?: AuthTab }) {
  const [tab, setTab] = useState<AuthTab>(defaultTab)
  const { badge, heading, subheading, footerPrompt, footerAction } = copy[tab]

  return (
    <div className="flex min-h-screen">
      {/* LEFT — auth panel */}
      <div className="flex w-full flex-col bg-slate-50 px-6 py-8 sm:px-12 lg:w-[45%] lg:px-14 lg:py-10">
        {/* logo */}
        <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="ZenFlow home">
          <ZenFlowLogo className="size-8 rounded-full bg-blue-500 text-white" />
          <span className="text-lg font-bold tracking-tight text-slate-900">ZenFlow</span>
        </Link>

        {/* centered content */}
        <div className="flex flex-1 flex-col justify-center py-8 min-[480px]:py-10">
          <div className="mx-auto w-full max-w-[420px]">
            <PillBadge>{badge}</PillBadge>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/60 min-[480px]:mt-5 min-[480px]:p-8">
              {/* tab switcher */}
              <div
                className="relative grid grid-cols-2 rounded-full bg-slate-100 p-1"
                role="tablist"
                aria-label="Authentication"
              >
                <span
                  className={cn(
                    'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-150 ease-out',
                    tab === 'signup' && 'translate-x-full',
                  )}
                  aria-hidden="true"
                />
                {(['login', 'signup'] as const).map((value) => (
                  <button
                    key={value}
                    id={`tab-${value}`}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    aria-controls="auth-tabpanel"
                    onClick={() => setTab(value)}
                    className={cn(
                      'relative z-10 rounded-full py-2.5 text-sm transition-colors duration-150',
                      tab === value ? 'font-semibold text-slate-900' : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {value === 'login' ? 'Log in' : 'Sign up'}
                  </button>
                ))}
              </div>

              <h1 className="mt-6 text-xl font-bold text-slate-900 min-[480px]:text-2xl">
                {heading}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">{subheading}</p>

              <div
                id="auth-tabpanel"
                role="tabpanel"
                aria-labelledby={`tab-${tab}`}
                className="mt-5 min-[480px]:mt-6"
              >
                {tab === 'login' ? <LoginForm /> : <SignupForm />}
              </div>

              {/* divider */}
              <div className="my-5 flex items-center gap-3 min-[480px]:my-6" aria-hidden="true">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">or continue with</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              {/* social buttons */}
              <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                >
                  <GoogleIcon />
                  Google
                </button>
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                >
                  <GitHubIcon />
                  GitHub
                </button>
              </div>

              <p className="mt-5 text-center text-sm text-slate-500 min-[480px]:mt-6">
                {footerPrompt}{' '}
                <button
                  type="button"
                  onClick={() => setTab(tab === 'login' ? 'signup' : 'login')}
                  className="font-medium text-blue-500 transition-colors duration-150 hover:text-blue-600"
                >
                  {footerAction}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* footer */}
        <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
          <span>© 2026 ZenFlow</span>
          <a href="#" className="transition-colors duration-150 hover:text-slate-600">
            Terms
          </a>
          <a href="#" className="transition-colors duration-150 hover:text-slate-600">
            Privacy
          </a>
          <a href="#" className="transition-colors duration-150 hover:text-slate-600">
            Help center
          </a>
        </footer>
      </div>

      {/* RIGHT — decorative panel */}
      <div className="hidden w-[55%] flex-col justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-16 lg:flex">
        <div className="mx-auto w-full max-w-[560px]">
          <PillBadge>One calm workspace for everything</PillBadge>
          <h2 className="mt-5 text-4xl leading-tight font-bold text-slate-900 text-balance">
            Your whole day, beautifully in one place.
          </h2>
          <p className="mt-4 max-w-[460px] text-base text-slate-500">
            Tasks, calendar, reminders, and expenses — organized into a single, quiet workspace
            built for focus.
          </p>

          <div className="mt-8">
            <DashboardPreview />
          </div>

          <div className="mt-8 flex items-center gap-8">
            <div>
              <p className="text-2xl font-bold text-slate-900">12k+</p>
              <p className="text-sm text-slate-500">calm professionals</p>
            </div>
            <span className="h-10 w-px bg-slate-300/70" aria-hidden="true" />
            <div>
              <p className="text-2xl font-bold text-slate-900">4.9</p>
              <p className="text-sm text-slate-500">average rating</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
