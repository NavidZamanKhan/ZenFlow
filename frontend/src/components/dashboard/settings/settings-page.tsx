'use client'

import { useSettings } from '@/hooks/use-settings'
import { ErrorState } from '@/components/shared/state-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { AppearanceSettingsSection } from './appearance-settings'
import { ExpensePreferenceSettingsSection } from './expense-preference-settings'
import { ProfileSettingsSection } from './profile-settings'
import { SETTINGS_CARD_CLASS } from './settings-section'

export function SettingsPage() {
  const { settings, loading, error, reload, updateSection } = useSettings()

  if (loading) return <SettingsLoading />

  return (
    <div className="max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-6">
        <p className="mb-0.5 text-sm font-medium text-slate-400">
          Shape your ZenFlow experience
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          Settings
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

      <div className="space-y-8">
        <ProfileSettingsSection
          profile={settings.profile}
          onSave={(profile) => updateSection('profile', profile)}
        />
        <AppearanceSettingsSection
          appearance={settings.appearance}
          onSave={(appearance) => updateSection('appearance', appearance)}
        />
        <ExpensePreferenceSettingsSection
          preferences={settings.expensePreferences}
          onSave={(preferences) =>
            updateSection('expensePreferences', preferences)
          }
        />
      </div>
    </div>
  )
}

function SettingsLoading() {
  return (
    <div
      className="max-w-5xl px-4 py-8 sm:px-8"
      aria-label="Loading settings"
    >
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-48 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
      <div className="space-y-8">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <Skeleton className="mb-4 h-4 w-36 rounded-full" />
            <div className={`${SETTINGS_CARD_CLASS} h-64 p-6`}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-11 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
