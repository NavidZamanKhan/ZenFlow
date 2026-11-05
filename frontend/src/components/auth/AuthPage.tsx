'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { ZenFlowLogo } from '@/components/zenflow-logo'
import { cn } from '@/lib/utils'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import { DashboardPreview } from './DashboardPreview'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'

const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim()

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

/**
 * Google sign-in. Uses Google's own button so the browser receives a signed
 * *ID token* (the `credential`) rather than an OAuth access token: the backend
 * verifies the ID token's signature, expiry, issuer and - crucially - that it
 * was issued for ZenFlow's client ID before trusting the email inside it.
 */
function GoogleAuthButton() {
  const { loginWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="flex justify-center">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="zf-tap flex h-11 w-full max-w-[368px] items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500"
          title="Google Sign-In is not configured"
        >
          <span>Continue with Google (disabled)</span>
        </button>
      </div>
    )
  }

  const handleCredential = async (credential: string | undefined) => {
    if (!credential) {
      toast.error('Google Sign-In did not return a credential. Please try again.')
      return
    }
    setLoading(true)
    try {
      await loginWithGoogle(credential)
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
  }

  return (
    <div className="relative" aria-busy={loading}>
      <div className={cn('flex justify-center', loading && 'pointer-events-none opacity-60')}>
        <GoogleLogin
          onSuccess={(res) => void handleCredential(res.credential)}
          onError={() => toast.error('Google Sign-In was cancelled or failed.')}
          useOneTap={false}
          text="continue_with"
          shape="pill"
          size="large"
          theme="outline"
          logo_alignment="center"
          width="368"
        />
      </div>
      {loading ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-white/80 text-sm font-semibold text-slate-700 dark:bg-[var(--zf-surface)]/80 dark:text-[var(--zf-text)]"
          role="status"
        >
          <div
            className="size-4 animate-spin rounded-full border-2 border-[var(--zf-accent)] border-t-transparent"
            aria-hidden="true"
          />
          Connecting...
        </div>
      ) : null}
    </div>
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
        className="flex min-w-0 w-full flex-col bg-slate-50 dark:bg-[var(--zf-canvas)] px-6 py-8 sm:px-12 lg:w-[45%] lg:px-14 lg:py-10"
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
  if (!GOOGLE_CLIENT_ID) {
    return <AuthPageInner {...props} />
  }
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthPageInner {...props} />
    </GoogleOAuthProvider>
  )
}
