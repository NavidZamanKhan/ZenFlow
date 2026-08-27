'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Pencil, Save, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { ProfileSettings } from '@/types/settings'
import { useAuth } from '@/lib/auth'
import {
  SETTINGS_INPUT_CLASS,
  SettingsField,
  SettingsNote,
  SettingsSection,
  SettingsSelect,
} from './settings-section'

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter at least 2 characters.').max(80),
  username: z
    .string()
    .trim()
    .min(3, 'Enter at least 3 characters.')
    .max(30)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      'Use letters, numbers, dots, underscores, or hyphens.',
    ),
  email: z.string().email(),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) => !value || /^[+()\d\s-]+$/.test(value),
      'Enter a valid phone number.',
    ),
  country: z.string(),
  timeZone: z.string().min(1, 'Choose a time zone.'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const COUNTRY_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'Bangladesh', label: 'Bangladesh' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Germany', label: 'Germany' },
  { value: 'India', label: 'India' },
  { value: 'Japan', label: 'Japan' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'United States', label: 'United States' },
] as const

const TIME_ZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Dhaka', label: 'Dhaka (UTC+6)' },
  { value: 'Asia/Kolkata', label: 'Kolkata (UTC+5:30)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
] as const

export function ProfileSettingsSection({
  profile,
  onSave,
}: {
  profile: ProfileSettings
  onSave: (profile: ProfileSettings) => boolean
}) {
  const { user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const effectiveProfile = useMemo(() => ({
    ...profile,
    fullName: user?.fullName || profile.fullName,
    email: user?.email || profile.email,
  }), [profile, user])

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: effectiveProfile,
  })

  useEffect(() => {
    reset(effectiveProfile)
  }, [effectiveProfile, reset])

  const submitProfile = async (values: ProfileFormValues) => {
    try {
      await updateProfile({
        fullName: values.fullName,
        avatar: avatarFile,
      })
      onSave(values)
      setEditing(false)
      setAvatarFile(null)
      toast.success('Profile and avatar saved to your account.')
    } catch {
      toast.error('Could not save your profile changes to server.')
    }
  }

  const cancelEditing = () => {
    reset(effectiveProfile)
    setAvatarPreview(null)
    setAvatarFile(null)
    setEditing(false)
  }

  const previewAvatar = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Choose an image smaller than 2 MB.')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(String(reader.result))
    reader.readAsDataURL(file)
  }

  const currentFullName = user?.fullName || profile.fullName
  const currentEmail = user?.email || profile.email

  const initials =
    currentFullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || currentEmail[0]?.toUpperCase() || 'Z'

  const activeAvatarSrc = avatarPreview || user?.avatarUrl || ''

  return (
    <SettingsSection
      id="profile"
      icon={UserRound}
      title="Profile"
      description="Manage your account profile details and workspace appearance."
    >
      <form onSubmit={handleSubmit(submitProfile)} noValidate>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-fit">
            <Avatar className="size-20">
              {activeAvatarSrc && <AvatarImage src={activeAvatarSrc} alt="" />}
              <AvatarFallback className="bg-[var(--zf-accent-soft)] text-lg font-bold text-[var(--zf-accent-fg)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            {editing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Choose profile image"
                className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-[var(--zf-accent)] text-white shadow-sm dark:border-[var(--zf-surface)]"
              >
                <Camera size={14} />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => previewAvatar(event.target.files?.[0])}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800 dark:text-[var(--zf-text)]">
              {currentFullName || 'ZenFlow user'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-[var(--zf-text-muted)]">
              {currentEmail}
            </p>
          </div>
          {!editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(true)}
              className="h-10 rounded-xl border-slate-200 px-4 text-slate-600 dark:border-[var(--zf-border)] dark:bg-[var(--zf-soft-fill)] dark:text-[var(--zf-text)] dark:hover:bg-[var(--zf-elevated)]"
            >
              <Pencil size={15} />
              Edit profile
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingsField label="Full name" error={errors.fullName?.message}>
            <input
              {...register('fullName')}
              disabled={!editing}
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="Username" error={errors.username?.message}>
            <input
              {...register('username')}
              disabled={!editing}
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField
            label="Email"
            helper="Your email is the current authentication identifier."
          >
            <input
              {...register('email')}
              type="email"
              disabled
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="Phone" error={errors.phone?.message}>
            <input
              {...register('phone')}
              type="tel"
              disabled={!editing}
              placeholder="Optional"
              className={SETTINGS_INPUT_CLASS}
            />
          </SettingsField>
          <SettingsField label="Country">
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <SettingsSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={COUNTRY_OPTIONS}
                  disabled={!editing}
                  ariaLabel="Country"
                />
              )}
            />
          </SettingsField>
          <SettingsField label="Time zone" error={errors.timeZone?.message}>
            <Controller
              control={control}
              name="timeZone"
              render={({ field }) => (
                <SettingsSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={TIME_ZONE_OPTIONS}
                  disabled={!editing}
                  ariaLabel="Time zone"
                />
              )}
            />
          </SettingsField>
        </div>

        <div className="mt-5">
          <SettingsNote>
            Your full name and avatar image are permanently synced with your cloud account across all devices.
          </SettingsNote>
        </div>

        {editing && (
          <div className="flex justify-end gap-2 mt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={cancelEditing}
              className="h-10 rounded-xl px-4 text-slate-500 dark:text-[var(--zf-text-muted)] dark:hover:bg-[var(--zf-hover-fill)] dark:hover:text-[var(--zf-text)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl bg-[var(--zf-accent)] text-white hover:bg-[var(--zf-accent-hover)]"
            >
              <Save size={15} />
              Save changes
            </Button>
          </div>
        )}
      </form>
    </SettingsSection>
  )
}
