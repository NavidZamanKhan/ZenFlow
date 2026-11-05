import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Forgot password | ZenFlow',
  description: 'Request a link to reset your ZenFlow password.',
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
