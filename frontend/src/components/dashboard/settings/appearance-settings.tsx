'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Laptop, Moon, Palette, Save, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { applyAccentColor } from '@/lib/accent'
import { cn } from '@/lib/utils'
import type { AppearanceSettings } from '@/types/settings'
import {
  SettingsField,
  SettingsNote,
  SettingsSection,
  SettingsSelect,
} from './settings-section'

const appearanceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  accentColor: z.enum(['blue', 'teal', 'violet', 'coral']),
  density: z.enum(['comfortable', 'compact']),
})

type AppearanceFormValues = z.infer<typeof appearanceSchema>

const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright workspace with light surfaces',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Dimmed surfaces for low-light focus',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Match your device appearance setting',
    icon: Laptop,
  },
] as const

const ACCENT_OPTIONS = [
  { value: 'blue', label: 'ZenFlow blue', color: '#1D70E8' },
  { value: 'teal', label: 'Soft teal', color: '#14B8A6' },
  { value: 'violet', label: 'Violet', color: '#8B5CF6' },
  { value: 'coral', label: 'Coral', color: '#F97316' },
] as const

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
] as const

export function AppearanceSettingsSection({
  appearance,
  onSave,
}: {
  appearance: AppearanceSettings
  onSave: (appearance: AppearanceSettings) => boolean
}) {
  const { theme: activeTheme, setTheme, resolvedTheme } = useTheme()
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting },
  } = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceSchema),
    mode: 'onTouched',
    defaultValues: {
      ...appearance,
      theme: (activeTheme as AppearanceFormValues['theme']) || appearance.theme || 'light',
    },
  })

  useEffect(() => {
    reset({
      ...appearance,
      theme: (activeTheme as AppearanceFormValues['theme']) || appearance.theme || 'light',
    })
  }, [appearance, activeTheme, reset])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setValue('theme', newTheme, { shouldDirty: true })
    setTheme(newTheme)
    const currentAccent = getValues('accentColor')
    const themeForAccent =
      newTheme === 'dark'
        ? 'dark'
        : newTheme === 'light'
          ? 'light'
          : resolvedTheme === 'dark'
            ? 'dark'
            : 'light'
    applyAccentColor(currentAccent, themeForAccent)
    onSave({ ...getValues(), theme: newTheme })
  }

  const handleAccentChange = (
    newAccent: 'blue' | 'teal' | 'violet' | 'coral',
  ) => {
    setValue('accentColor', newAccent, { shouldDirty: true })
    const currentTheme = getValues('theme')
    const themeForAccent =
      currentTheme === 'dark'
        ? 'dark'
        : currentTheme === 'light'
          ? 'light'
          : resolvedTheme === 'dark'
            ? 'dark'
            : 'light'
    applyAccentColor(newAccent, themeForAccent)
    onSave({ ...getValues(), accentColor: newAccent })
  }

  const handleDensityChange = (newDensity: 'comfortable' | 'compact') => {
    setValue('density', newDensity, { shouldDirty: true })
    onSave({ ...getValues(), density: newDensity })
  }

  const submitAppearance = (values: AppearanceFormValues) => {
    if (onSave(values)) {
      setTheme(values.theme)
      const themeForAccent =
        values.theme === 'dark'
          ? 'dark'
          : values.theme === 'light'
            ? 'light'
            : resolvedTheme === 'dark'
              ? 'dark'
              : 'light'
      applyAccentColor(values.accentColor, themeForAccent)
      toast.success('Appearance preferences saved.')
    } else {
      toast.error('Could not save appearance preferences.')
    }
  }

  return (
    <SettingsSection
      id="appearance"
      icon={Palette}
      title="Appearance"
      description="Choose how you want your workspace to look."
    >
      <form onSubmit={handleSubmit(submitAppearance)} noValidate>
        <SettingsField label="Theme">
          <Controller
            control={control}
            name="theme"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(val) =>
                  handleThemeChange(val as 'light' | 'dark' | 'system')
                }
                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3 transition-colors sm:p-4 dark:border-[var(--zf-border)]',
                        'has-[[data-checked]]:border-[var(--zf-accent)] has-[[data-checked]]:bg-[var(--zf-accent-soft)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[color-mix(in_srgb,var(--zf-accent)_30%,transparent)]',
                      )}
                    >
                      <RadioGroupItem
                        value={option.value}
                        className="mt-0.5 focus-visible:border-[var(--zf-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--zf-accent)_30%,transparent)]"
                      />
                      <span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-[var(--zf-text)]">
                          <Icon
                            size={15}
                            className="text-[var(--zf-accent)]"
                            aria-hidden="true"
                          />
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-[var(--zf-text-muted)]">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </RadioGroup>
            )}
          />
        </SettingsField>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SettingsField
            label="Accent color"
            helper="Instantly personalizes dashboard chrome and branding."
          >
            <Controller
              control={control}
              name="accentColor"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(val) =>
                    handleAccentChange(
                      val as 'blue' | 'teal' | 'violet' | 'coral',
                    )
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  {ACCENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 has-[[data-checked]]:border-[var(--zf-accent)] has-[[data-checked]]:bg-[var(--zf-accent-soft)] dark:border-[var(--zf-border)]"
                    >
                      <RadioGroupItem value={option.value} />
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-[var(--zf-text)]">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
          </SettingsField>

          <SettingsField
            label="Display density"
            helper="Saved now; global spacing support is coming soon."
          >
            <Controller
              control={control}
              name="density"
              render={({ field }) => (
                <SettingsSelect
                  value={field.value}
                  onValueChange={(val) =>
                    handleDensityChange(val as 'comfortable' | 'compact')
                  }
                  options={DENSITY_OPTIONS}
                  ariaLabel="Display density"
                />
              )}
            />
          </SettingsField>
        </div>

        <div className="mt-5">
          <SettingsNote>
            Appearance changes apply live immediately. Accent color updates dashboard chrome
            (navigation, brand mark, focus rings, and Settings actions).
          </SettingsNote>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-xl bg-[var(--zf-accent)] px-4 text-white hover:bg-[var(--zf-accent-hover)]"
          >
            <Save size={15} />
            Save appearance
          </Button>
        </div>
      </form>
    </SettingsSection>
  )
}
