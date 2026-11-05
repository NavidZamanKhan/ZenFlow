'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ZenFlowLogo } from '@/components/zenflow-logo'

/**
 * Minimal centered layout shared by the public password-recovery pages.
 * Visually consistent with AuthPage but without tabs or Google sign-in.
 */
export function RecoveryShell({
  badge,
  heading,
  subheading,
  children,
  footer,
}: {
  badge: string
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="zf-screen-min-h flex flex-col bg-slate-50 px-6 py-8 sm:px-12 dark:bg-[var(--zf-canvas)]">
      <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="ZenFlow home">
        <ZenFlowLogo className="size-8 rounded-full bg-[var(--zf-accent)] text-white" />
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-[var(--zf-text)]">ZenFlow</span>
      </Link>

      <div className="flex flex-1 flex-col justify-center py-8 min-[480px]:py-10">
        <div className="mx-auto w-full max-w-[420px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--zf-accent-soft)] px-3.5 py-1.5 text-xs font-medium text-[var(--zf-accent)]">
            <span className="size-1.5 rounded-full bg-[var(--zf-accent)]" aria-hidden="true" />
            {badge}
          </span>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/60 min-[480px]:mt-5 min-[480px]:p-8 dark:border-[var(--zf-border)] dark:bg-[var(--zf-surface)] dark:shadow-black/40">
            <h1 className="text-xl font-bold text-slate-900 min-[480px]:text-2xl dark:text-[var(--zf-text)]">
              {heading}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subheading}</p>

            <div className="mt-5 min-[480px]:mt-6">{children}</div>

            {footer ? (
              <p className="mt-5 text-center text-sm text-slate-500 min-[480px]:mt-6 dark:text-slate-400">
                {footer}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <footer className="text-xs text-slate-500 dark:text-slate-400">© 2026 ZenFlow</footer>
    </main>
  )
}
