'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal } from '@/components/shared/modal'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

interface OtpDialogProps {
  open: boolean
  pendingRegistrationId: string
  email: string
  onClose: () => void
}

const OTP_LENGTH = 6
const EXPIRY_SECONDS = 5 * 60 // 5 minutes
const RESEND_COOLDOWN = 60 // 60 seconds

export function OtpDialog({ open, pendingRegistrationId, email, onClose }: OtpDialogProps) {
  const { verifyEmail, resendOtp } = useAuth()

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [expired, setExpired] = useState(false)

  // Timers
  const [expiryLeft, setExpiryLeft] = useState(EXPIRY_SECONDS)
  const [resendLeft, setResendLeft] = useState(RESEND_COOLDOWN)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // -----------------------------------------------------------------------
  // Reset state when dialog opens
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (open) {
      setDigits(Array(OTP_LENGTH).fill(''))
      setError(null)
      setSubmitting(false)
      setExpired(false)
      setExpiryLeft(EXPIRY_SECONDS)
      setResendLeft(RESEND_COOLDOWN)
      // Focus first input after animation
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [open])

  // -----------------------------------------------------------------------
  // Countdown timers
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setExpiryLeft((prev) => {
        if (prev <= 1) {
          setExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [open])

  useEffect(() => {
    if (!open || resendLeft <= 0) return
    const id = setInterval(() => {
      setResendLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [open, resendLeft])

  // -----------------------------------------------------------------------
  // Input handling
  // -----------------------------------------------------------------------
  const handleChange = useCallback((index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    setError(null)

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [])

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [digits])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i]
    }
    setDigits(next)
    setError(null)
    // Focus the input after the last pasted digit
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[focusIdx]?.focus()
  }, [])

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    const otp = digits.join('')
    if (otp.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await verifyEmail(pendingRegistrationId, otp)
      // Success — verifyEmail stores tokens, sets user, and redirects.
      // The dialog will unmount as part of navigation.
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = Array.isArray(err.errors) ? err.errors[0] : Object.values(err.errors).flat()[0]

        // Check for max-attempts or expired registration — close dialog
        if (msg?.includes('register again') || msg?.includes('Invalid or expired registration')) {
          setError(msg)
          // Close dialog after a short delay so user can read the message
          setTimeout(() => onClose(), 2500)
        } else {
          setError(msg ?? 'Verification failed.')
        }
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [digits, verifyEmail, pendingRegistrationId, onClose])

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (digits.every((d) => d.length === 1) && !submitting && !expired) {
      handleSubmit()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  // -----------------------------------------------------------------------
  // Resend
  // -----------------------------------------------------------------------
  const handleResend = useCallback(async () => {
    setError(null)
    try {
      await resendOtp(pendingRegistrationId)
      setResendLeft(RESEND_COOLDOWN)
      setExpiryLeft(EXPIRY_SECONDS)
      setExpired(false)
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = Array.isArray(err.errors) ? err.errors[0] : Object.values(err.errors).flat()[0]
        setError(msg ?? 'Failed to resend code.')
      } else {
        setError('Failed to resend code.')
      }
    }
  }, [resendOtp, pendingRegistrationId])

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <Modal open={open} title="Verify your email" onClose={onClose}>
      <div className="space-y-5">
        {/* Instructions */}
        <p className="text-sm text-slate-500">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-slate-700">{email}</span>.
          Enter it below to verify your account.
        </p>

        {/* OTP inputs */}
        <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={submitting || expired}
              aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
              className="h-12 w-11 rounded-xl border border-slate-200 bg-white text-center text-lg font-semibold text-slate-900 transition-colors duration-150 outline-none placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p role="alert" className="text-center text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        {/* Expiry countdown */}
        <p className="text-center text-xs text-slate-400">
          {expired ? (
            <span className="text-red-500">Code expired — request a new one below.</span>
          ) : (
            <>Code expires in <span className="font-medium tabular-nums text-slate-500">{formatTime(expiryLeft)}</span></>
          )}
        </p>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || expired || digits.some((d) => !d)}
          className="h-11 w-full rounded-xl bg-blue-500 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-600 disabled:pointer-events-none disabled:opacity-60"
        >
          {submitting ? 'Verifying…' : 'Verify'}
        </button>

        {/* Resend */}
        <div className="text-center">
          {resendLeft > 0 ? (
            <p className="text-xs text-slate-400">
              Resend code in <span className="font-medium tabular-nums text-slate-500">{resendLeft}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-xs font-medium text-blue-500 transition-colors duration-150 hover:text-blue-600"
            >
              Resend verification code
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
