import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset password | ZenFlow',
  description: 'Choose a new password for your ZenFlow account.',
}

export default function ResetPasswordPage() {
  // useSearchParams() requires a Suspense boundary for static rendering.
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
