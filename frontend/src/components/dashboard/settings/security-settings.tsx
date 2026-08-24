'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/shared/modal'
import { useAuth } from '@/lib/auth'
import {
  apiDeleteAccount,
  apiResetPasswordWithOtp,
  apiSendDeleteAccountOtp,
  apiSendPasswordResetOtp,
  apiSetPassword,
  ApiError,
} from '@/lib/api'
import {
  SETTINGS_INPUT_CLASS,
  SettingsSection,
} from './settings-section'

// ---------------------------------------------------------------------------
// Set Password Modal (For Google OAuth users who never set a password)
// ---------------------------------------------------------------------------

function SetPasswordModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { refreshUser } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    setSubmitting(true)
    try {
      await apiSetPassword({
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      await refreshUser()
      toast.success('Password set successfully! You can now log in with email and password.')
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Could not set password. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title="Set account password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-500">
          Create a password so you can sign in using your email address in addition to Google One-Click login.
        </p>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            New password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className={SETTINGS_INPUT_CLASS}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Confirm new password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-type new password"
            className={SETTINGS_INPUT_CLASS}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
          Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a digit, and a special character.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-slate-500"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="h-10 rounded-xl bg-[#1D70E8] px-5 font-medium text-white hover:bg-blue-600"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={15} className="animate-spin" />
                Setting password...
              </span>
            ) : (
              'Set password'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Change / Reset Password Modal (Requires 6-Digit Email OTP)
// ---------------------------------------------------------------------------

function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user } = useAuth()
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSendOtp = async () => {
    setSendingOtp(true)
    try {
      const res = await apiSendPasswordResetOtp()
      toast.success(res.message || 'Verification code sent to your email.')
      setOtpSent(true)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Could not send verification code.')
      }
    } finally {
      setSendingOtp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.')
      return
    }
    if (!newPassword || !confirmPassword) {
      toast.error('Please enter and confirm your new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const res = await apiResetPasswordWithOtp({
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      toast.success(res.message || 'Password updated successfully!')
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
      setOtpSent(false)
      onClose()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Could not update password. Check your code and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title="Change password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-500">
          For your security, a 6-digit verification code will be sent to{' '}
          <strong className="font-semibold text-slate-700">{user?.email}</strong>.
        </p>

        {!otpSent ? (
          <div className="pt-2">
            <Button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp}
              className="h-11 w-full rounded-xl bg-[#1D70E8] font-medium text-white hover:bg-blue-600"
            >
              {sendingOtp ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Sending code...
                </span>
              ) : (
                'Send verification code'
              )}
            </Button>
          </div>
        ) : (
          <>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Verification code
                </label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
                >
                  {sendingOtp ? 'Sending...' : 'Resend code'}
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit code"
                className={`${SETTINGS_INPUT_CLASS} text-center font-mono text-base tracking-widest`}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className={SETTINGS_INPUT_CLASS}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Confirm new password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className={SETTINGS_INPUT_CLASS}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-10 rounded-xl px-4 text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-xl bg-[#1D70E8] px-5 font-medium text-white hover:bg-blue-600"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" />
                    Updating...
                  </span>
                ) : (
                  'Update password'
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Delete Account Modal (Requires Password + 6-Digit Email OTP + Confirmation)
// ---------------------------------------------------------------------------

function DeleteAccountModal({
  open,
  onClose,
  onOpenSetPassword,
}: {
  open: boolean
  onClose: () => void
  onOpenSetPassword: () => void
}) {
  const { user, logout } = useAuth()
  const hasPassword = Boolean(user?.hasPassword)

  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Reset internal state when modal closes
  useEffect(() => {
    if (!open) {
      setOtpSent(false)
      setSendingOtp(false)
      setOtp('')
      setPassword('')
      setShowPassword(false)
      setConfirmStep(false)
      setSubmitting(false)
    }
  }, [open])

  const handleSendOtp = async () => {
    setSendingOtp(true)
    try {
      const res = await apiSendDeleteAccountOtp()
      toast.success(res.message || 'Verification code sent to your email.')
      setOtpSent(true)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Could not send deletion verification code.')
      }
    } finally {
      setSendingOtp(false)
    }
  }

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.')
      return
    }
    if (!password) {
      toast.error('Please enter your password.')
      return
    }
    setConfirmStep(true)
  }

  const handleFinalDelete = async () => {
    setSubmitting(true)
    try {
      const res = await apiDeleteAccount({
        otp,
        password,
      })
      toast.success(res.message || 'Account permanently deleted.')
      onClose()
      await logout()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Could not delete account. Check your password and code.')
      }
      setConfirmStep(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title={confirmStep ? 'Confirm deletion' : 'Delete account'} onClose={onClose}>
      <div className="space-y-4">
        {!hasPassword ? (
          // Google user without password -> prompt to set password first
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-rose-900">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-rose-600" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold">Password required for deletion</p>
                <p className="mt-0.5 text-rose-700">
                  For your security, you must set up an account password before proceeding with account deletion.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                onClose()
                onOpenSetPassword()
              }}
              className="h-11 w-full rounded-xl bg-[#1D70E8] font-medium text-white hover:bg-blue-600"
            >
              <KeyRound size={16} className="mr-2" />
              Set password first
            </Button>
          </div>
        ) : confirmStep ? (
          // Step 3: Final "Are you sure?" Confirmation
          <div className="space-y-5 pt-1">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle size={28} />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Are you absolutely sure?
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                This will immediately and permanently delete your account for{' '}
                <strong className="font-semibold text-slate-700">{user?.email}</strong>.
                All tasks, calendar events, expenses, and budgets will be wiped forever.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setConfirmStep(false)}
                className="h-11 flex-1 rounded-xl border-slate-200 text-xs font-semibold text-slate-700"
              >
                <ArrowLeft size={14} className="mr-1.5" />
                Back
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={handleFinalDelete}
                className="h-11 flex-1 rounded-xl bg-rose-600 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Yes, delete everything'
                )}
              </Button>
            </div>
          </div>
        ) : !otpSent ? (
          // Step 1: Send OTP
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-rose-900">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-rose-600" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold">This action is permanent and irreversible.</p>
                <p className="mt-0.5 text-rose-700">
                  All your tasks, calendar events, expenses, and budgets will be permanently deleted.
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              To verify your identity, we will send an account deletion code to{' '}
              <strong className="font-semibold text-slate-700">{user?.email}</strong>.
            </p>
            <Button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp}
              className="h-11 w-full rounded-xl bg-rose-600 font-medium text-white hover:bg-rose-700"
            >
              {sendingOtp ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Sending code...
                </span>
              ) : (
                'Send verification code'
              )}
            </Button>
          </div>
        ) : (
          // Step 2: Fill OTP & Password
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Verification code
                </label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="text-[11px] font-medium text-rose-600 hover:text-rose-700 disabled:opacity-60"
                >
                  {sendingOtp ? 'Sending...' : 'Resend code'}
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit code"
                className={`${SETTINGS_INPUT_CLASS} text-center font-mono text-base tracking-widest`}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Confirm your password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter current password"
                  className={SETTINGS_INPUT_CLASS}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-10 rounded-xl px-4 text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-rose-600 px-5 font-medium text-white hover:bg-rose-700"
              >
                Continue to confirmation
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Main Security Settings Section (Placed at the bottom of Settings page)
// ---------------------------------------------------------------------------

export function SecuritySettingsSection() {
  const { user, refreshUser } = useAuth()
  const [setPasswordModalOpen, setSetPasswordModalOpen] = useState(false)
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false)
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false)

  // Re-validate user credentials on mount
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  return (
    <>
      <SettingsSection
        id="security"
        icon={Lock}
        title="Security & Account"
        description="Manage your authentication credentials, password, and account deletion."
      >
        <div className="space-y-6">
          {/* Password & Security Card */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E2EEFC] text-[#1D70E8]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Password</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {user?.hasPassword
                    ? 'Your account is secured with a password.'
                    : 'You signed in with Google OAuth. Set a password to also log in with email.'}
                </p>
              </div>
            </div>

            {user?.hasPassword ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setChangePasswordModalOpen(true)}
                className="h-10 rounded-xl border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <KeyRound size={14} className="mr-2" />
                Change password
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setSetPasswordModalOpen(true)}
                className="h-10 rounded-xl bg-[#1D70E8] px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-600"
              >
                <KeyRound size={14} className="mr-2" />
                Set password
              </Button>
            )}
          </div>

          {/* Danger Zone: Delete Account */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-rose-900">Danger Zone</p>
                  <p className="mt-0.5 text-xs text-rose-700">
                    Permanently delete your ZenFlow account and all workspace data.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setDeleteAccountModalOpen(true)}
                className="h-10 rounded-xl border border-rose-300 bg-white px-4 text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50"
              >
                <Trash2 size={14} className="mr-2" />
                Delete account
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Modals */}
      <SetPasswordModal
        open={setPasswordModalOpen}
        onClose={() => setSetPasswordModalOpen(false)}
      />
      <ChangePasswordModal
        open={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
      <DeleteAccountModal
        open={deleteAccountModalOpen}
        onClose={() => setDeleteAccountModalOpen(false)}
        onOpenSetPassword={() => setSetPasswordModalOpen(true)}
      />
    </>
  )
}
