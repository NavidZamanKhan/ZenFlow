'use client'

import { useSettings } from '@/hooks/use-settings'
import { AppearanceSettingsSection } from './appearance-settings'
import { ExpensePreferenceSettingsSection } from './expense-preference-settings'
import { ProfileSettingsSection } from './profile-settings'
import { SETTINGS_CARD_CLASS } from './settings-section'

export function SettingsPage() {
  const { settings, loading, updateSection } = useSettings()

  if (loading) return <SettingsLoading />

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <p className="text-slate-400 text-sm font-medium mb-0.5">
          Shape your ZenFlow experience
        </p>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Settings
        </h1>
      </div>

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
      className="px-4 sm:px-8 py-8 max-w-5xl"
      aria-label="Loading settings"
    >
      <div className="mb-6">
        <div className="h-3 w-48 rounded-full bg-slate-100 animate-pulse mb-2" />
        <div className="h-7 w-28 rounded-lg bg-slate-100 animate-pulse" />
      </div>
      <div className="space-y-8">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <div className="h-4 w-36 rounded-full bg-slate-100 animate-pulse mb-4" />
            <div className={`${SETTINGS_CARD_CLASS} p-6 h-64`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-11 rounded-xl bg-slate-50 animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
