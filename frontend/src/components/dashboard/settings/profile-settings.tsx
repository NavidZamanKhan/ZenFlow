'use client'

import { useEffect, useRef, useState } from 'react'
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
  language: z.string().min(1, 'Choose a language.'),
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

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'German', label: 'German' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Spanish', label: 'Spanish' },
] as const

export function ProfileSettingsSection({
  profile,
  onSave,
}: {
  profile: ProfileSettings
  onSave: (profile: ProfileSettings) => boolean
}) {
  const [editing, setEditing] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: profile,
  })

  useEffect(() => {
    reset(profile)
  }, [profile, reset])

  const submitProfile = (values: ProfileFormValues) => {
    if (onSave(values)) {
      setEditing(false)
      toast.success('Profile preferences saved on this device.')
    } else {
      toast.error('Could not save your profile preferences.')
    }
  }

  const cancelEditing = () => {
    reset(profile)
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

    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(String(reader.result))
    reader.readAsDataURL(file)
  }

  const initials =
    profile.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || profile.email[0]?.toUpperCase() || 'Z'

  return (
    <SettingsSection
      id="profile"
      icon={UserRound}
      title="Profile"
      description="Manage the personal details shown in your local workspace."
    >
      <form onSubmit={handleSubmit(submitProfile)} noValidate>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="relative w-fit">
            <Avatar className="size-20">
              {avatarPreview && <AvatarImage src={avatarPreview} alt="" />}
              <AvatarFallback className="bg-[#E2EEFC] text-[#1D70E8] text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {editing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Choose profile image"
                className="absolute -right-1 -bottom-1 w-8 h-8 rounded-xl bg-[#1D70E8] text-white flex items-center justify-center border-2 border-white shadow-sm"
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
            <p className="text-sm font-bold text-slate-800">
              {profile.fullName || 'ZenFlow user'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{profile.email}</p>
            <p className="text-xs text-slate-500 mt-1.5">
              Avatar previews last for this browser session only.
            </p>
          </div>
          {!editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(true)}
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-600"
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
          <SettingsField label="Preferred language">
            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <SettingsSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={LANGUAGE_OPTIONS}
                  disabled={!editing}
                  ariaLabel="Preferred language"
                />
              )}
            />
          </SettingsField>
        </div>

        <div className="mt-5">
          <SettingsNote>
            These profile details are stored locally for Settings. They do not
            update your authentication account or upload an avatar.
          </SettingsNote>
        </div>

        {editing && (
          <div className="flex justify-end gap-2 mt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={cancelEditing}
              className="h-10 px-4 rounded-xl text-slate-500"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl bg-[#1D70E8] text-white hover:bg-[#1660CC]"
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
