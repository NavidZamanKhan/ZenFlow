import type { Metadata } from 'next'
import { AuthPage } from '@/components/auth/AuthPage'

export const metadata: Metadata = {
  title: 'Log in — ZenFlow',
  description: 'Log in to get back to your calm workspace.',
}

export default function LoginPage() {
  return <AuthPage defaultTab="login" />
}
