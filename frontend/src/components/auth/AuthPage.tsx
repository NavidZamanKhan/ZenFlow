'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { ZenFlowLogo } from '@/components/zenflow-logo'
import { cn } from '@/lib/utils'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import { DashboardPreview } from './DashboardPreview'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '680417209345-e220tanmhq34htb6dhs61glak7gc2n87.apps.googleusercontent.com'

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
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--zf-accent-soft)] px-3.5 py-1.5 text-xs font-medium text-[var(--zf-accent)]">
      <span className="size-1.5 rounded-full bg-[var(--zf-accent)]" aria-hidden="true" />
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

function GoogleAuthButton() {
  const { loginWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      try {
        await loginWithGoogle({ accessToken: tokenResponse.access_token })
        toast.success('Successfully authenticated with Google!')
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error(err.message)
        } else {
          toast.error('Google authentication failed. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    },
    onError: () => {
      toast.error('Google Sign-In was cancelled or failed.')
    },
  })

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => handleGoogleLogin()}
      className="zf-tap flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zf-accent)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <div
          className="size-4 animate-spin rounded-full border-2 border-[var(--zf-accent)] border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        <GoogleIcon />
      )}
      <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
    </button>
  )
}

function AuthPageInner({ defaultTab = 'login' }: { defaultTab?: AuthTab }) {
  const [tab, setTab] = useState<AuthTab>(defaultTab)
  const { badge, heading, subheading, footerPrompt, footerAction } = copy[tab]
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-4 border-[var(--zf-accent)] border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-slate-600">Connecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="zf-screen-min-h flex">
      <a href="#auth-main" className="zf-skip-link">
        Skip to authentication form
      </a>
      {/* LEFT - auth panel */}
      <main
        id="auth-main"
        className="flex w-full flex-col bg-slate-50 dark:bg-[var(--zf-canvas)] px-6 py-8 sm:px-12 lg:w-[45%] lg:px-14 lg:py-10"
      >
        {/* logo */}
        <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="ZenFlow home">
          <ZenFlowLogo className="size-8 rounded-full bg-[var(--zf-accent)] text-white" />
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-[var(--zf-text)]">ZenFlow</span>
        </Link>

        {/* centered content */}
        <div className="flex flex-1 flex-col justify-center py-8 min-[480px]:py-10">
          <div className="mx-auto w-full max-w-[420px]">
            <PillBadge>{badge}</PillBadge>

            <div className="mt-4 rounded-2xl border border-slate-100 dark:border-[var(--zf-border)] bg-white dark:bg-[var(--zf-surface)] p-6 shadow-lg shadow-slate-200/60 dark:shadow-black/40 min-[480px]:mt-5 min-[480px]:p-8">
              {/* tab switcher */}
              <div
                className="relative grid grid-cols-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1"
                role="tablist"
                aria-label="Authentication"
              >
                <span
                  className={cn(
                    'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white dark:bg-[var(--zf-surface)] shadow-sm transition-transform duration-150 ease-out',
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
                      tab === value ? 'font-semibold text-slate-900 dark:text-[var(--zf-text)]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                    )}
                  >
                    {value === 'login' ? 'Log in' : 'Sign up'}
                  </button>
                ))}
              </div>

              <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-[var(--zf-text)] min-[480px]:text-2xl">
                {heading}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subheading}</p>

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
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400 dark:text-slate-500">or continue with</span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* Google One-Click Button */}
              <div>
                <GoogleAuthButton />
              </div>

              <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400 min-[480px]:mt-6">
                {footerPrompt}{' '}
                <button
                  type="button"
                  onClick={() => setTab(tab === 'login' ? 'signup' : 'login')}
                  className="font-medium text-[var(--zf-accent)] transition-colors duration-150 hover:opacity-80"
                >
                  {footerAction}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* footer */}
        <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          <span>© 2026 ZenFlow</span>
          <a href="#" className="transition-colors duration-150 hover:text-slate-700 dark:hover:text-slate-200">
            Terms
          </a>
          <a href="#" className="transition-colors duration-150 hover:text-slate-700 dark:hover:text-slate-200">
            Privacy
          </a>
          <a href="#" className="transition-colors duration-150 hover:text-slate-700 dark:hover:text-slate-200">
            Help center
          </a>
        </footer>
      </main>

      {/* RIGHT - decorative panel */}
      <div className="hidden w-[55%] flex-col justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-12 py-14 xl:px-16 dark:from-[var(--zf-canvas)] dark:to-[var(--zf-surface)] lg:flex">
        <div className="mx-auto w-full max-w-[640px]">
          <PillBadge>One calm workspace for everything</PillBadge>
          <h2 className="mt-5 text-3xl leading-tight font-bold text-balance text-slate-900 xl:text-4xl dark:text-[var(--zf-text)]">
            Your whole day, beautifully in one place.
          </h2>
          <p className="mt-3 max-w-[460px] text-sm text-slate-500 xl:text-base dark:text-[var(--zf-text-muted)]">
            Tasks, calendar, reminders, and expenses, organized into a single, quiet workspace
            built for focus.
          </p>

          <div className="mt-7">
            <DashboardPreview />
          </div>

          <div className="mt-7 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:gap-6 dark:text-[var(--zf-text-muted)]">
            <p className="font-medium text-slate-900 dark:text-[var(--zf-text)]">Free to start</p>
            <span className="hidden h-8 w-px bg-slate-300/70 sm:block dark:bg-[var(--zf-border)]" aria-hidden="true" />
            <p>No credit card required</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AuthPage(props: { defaultTab?: AuthTab }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthPageInner {...props} />
    </GoogleOAuthProvider>
  )
}
