'use client'

import { useSettings } from '@/hooks/use-settings'
import { ErrorState } from '@/components/shared/state-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileSettingsSection } from '@/components/dashboard/settings/profile-settings'
import { SETTINGS_CARD_CLASS } from '@/components/dashboard/settings/settings-section'

export function ProfilePage() {
  const { settings, loading, error, reload, updateSection } = useSettings()

  if (loading) return <ProfileLoading />

  return (
    <div className="max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-6">
        <p className="mb-0.5 text-sm font-medium text-slate-500">
          Your personal information
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          My Profile
        </h1>
      </div>

      {error ? (
        <div className="mb-6">
          <ErrorState
            description={`${error} Showing defaults until you retry or save.`}
            onRetry={reload}
          />
        </div>
      ) : null}

      <ProfileSettingsSection
        profile={settings.profile}
        onSave={(profile) => updateSection('profile', profile)}
      />
    </div>
  )
}

function ProfileLoading() {
  return (
    <div
      className="max-w-5xl px-4 py-8 sm:px-8"
      aria-label="Loading profile"
    >
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-44 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-lg" />
      </div>
      <div>
        <Skeleton className="mb-4 h-4 w-24 rounded-full" />
        <div className={`${SETTINGS_CARD_CLASS} h-64 p-6`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-11 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
