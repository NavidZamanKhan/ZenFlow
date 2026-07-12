import type { Metadata } from 'next'
import { AuthPage } from '@/components/auth/AuthPage'

export const metadata: Metadata = {
  title: 'Sign up — ZenFlow',
  description: 'A few details and your quiet workspace is ready.',
}

export default function RegisterPage() {
  return <AuthPage defaultTab="signup" />
}
