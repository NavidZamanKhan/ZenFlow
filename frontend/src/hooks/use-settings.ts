'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  createDefaultSettings,
  type ZenFlowSettings,
} from '@/types/settings'

export function settingsStorageKey(userEmail: string): string {
  return `zenflow:settings:${userEmail}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeStoredSettings(
  stored: unknown,
  defaults: ZenFlowSettings,
): ZenFlowSettings {
  if (!isRecord(stored)) return defaults

  return {
    profile: isRecord(stored.profile)
      ? { ...defaults.profile, ...stored.profile }
      : defaults.profile,
    appearance: isRecord(stored.appearance)
      ? { ...defaults.appearance, ...stored.appearance }
      : defaults.appearance,
    expensePreferences: isRecord(stored.expensePreferences)
      ? { ...defaults.expensePreferences, ...stored.expensePreferences }
      : defaults.expensePreferences,
  } as ZenFlowSettings
}

export function useSettings() {
  const { user } = useAuth()
  const userEmail = user?.email ?? ''
  const [settings, setSettings] = useState<ZenFlowSettings>(() =>
    createDefaultSettings(),
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userEmail) return

    let cancelled = false
    queueMicrotask(() => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const defaults = createDefaultSettings(
        userEmail,
        user?.fullName ?? '',
        timeZone,
      )

      try {
        const raw = localStorage.getItem(settingsStorageKey(userEmail))
        const stored: unknown = raw ? JSON.parse(raw) : null
        if (!cancelled) setSettings(mergeStoredSettings(stored, defaults))
      } catch {
        if (!cancelled) setSettings(defaults)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userEmail, user?.fullName])

  const updateSection = useCallback(
    <Section extends keyof ZenFlowSettings>(
      section: Section,
      value: ZenFlowSettings[Section],
    ): boolean => {
      if (!userEmail) return false

      try {
        const next = { ...settings, [section]: value }
        localStorage.setItem(settingsStorageKey(userEmail), JSON.stringify(next))
        setSettings(next)
        return true
      } catch {
        return false
      }
    },
    [settings, userEmail],
  )

  return { settings, loading, updateSection }
}
