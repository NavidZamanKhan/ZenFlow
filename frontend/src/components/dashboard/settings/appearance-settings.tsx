'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Laptop, Moon, Palette, Save, Sun } from 'lucide-react'
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

/** Only Light is interactive until dark/system theming ships. */
const THEME_OPTIONS = [
  {
    value: 'light',
    label: 'Light',
    description: 'ZenFlow’s current appearance',
    icon: Sun,
    disabled: false,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Full theme support coming soon',
    icon: Moon,
    disabled: true,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Automatic switching coming soon',
    icon: Laptop,
    disabled: true,
  },
] as const

function formValuesFromAppearance(
  appearance: AppearanceSettings,
): AppearanceFormValues {
  // Coerce legacy dark/system saves onto Light so the only enabled option is selected.
  return {
    ...appearance,
    theme:
      appearance.theme === 'dark' || appearance.theme === 'system'
        ? 'light'
        : appearance.theme,
  }
}

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
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceSchema),
    mode: 'onTouched',
    defaultValues: formValuesFromAppearance(appearance),
  })

  useEffect(() => {
    reset(formValuesFromAppearance(appearance))
  }, [appearance, reset])

  const submitAppearance = (values: AppearanceFormValues) => {
    // Theme radios for dark/system are disabled; never persist those stubs.
    const next: AppearanceSettings = { ...values, theme: 'light' }
    if (onSave(next)) {
      applyAccentColor(next.accentColor)
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
      description="Choose how you want your workspace to look in future updates."
    >
      <form onSubmit={handleSubmit(submitAppearance)} noValidate>
        <SettingsField label="Theme">
          <Controller
            control={control}
            name="theme"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  if (value === 'light') field.onChange(value)
                }}
                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isDisabled = option.disabled
                  return (
                    <label
                      key={option.value}
                      aria-disabled={isDisabled || undefined}
                      className={cn(
                        'flex items-start gap-3 rounded-2xl border border-slate-200 p-3 transition-colors sm:p-4',
                        isDisabled
                          ? 'cursor-not-allowed bg-slate-50/80 opacity-55'
                          : 'cursor-pointer has-[[data-checked]]:border-[#1D70E8] has-[[data-checked]]:bg-[#F5F9FE] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1D70E8]/30',
                      )}
                    >
                      <RadioGroupItem
                        value={option.value}
                        disabled={isDisabled}
                        className={cn(
                          'mt-0.5',
                          !isDisabled &&
                            'focus-visible:border-[#1D70E8] focus-visible:ring-2 focus-visible:ring-[#1D70E8]/30',
                        )}
                      />
                      <span>
                        <span
                          className={cn(
                            'flex items-center gap-1.5 text-sm font-semibold',
                            isDisabled ? 'text-slate-500' : 'text-slate-700',
                          )}
                        >
                          <Icon
                            size={15}
                            className={
                              isDisabled ? 'text-slate-400' : 'text-[#1D70E8]'
                            }
                            aria-hidden="true"
                          />
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">
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
            helper="Saved for future app-wide personalization."
          >
            <Controller
              control={control}
              name="accentColor"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-2"
                >
                  {ACCENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 has-[[data-checked]]:border-[var(--zf-accent)] has-[[data-checked]]:bg-[var(--zf-accent-soft)]"
                    >
                      <RadioGroupItem value={option.value} />
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                      <span className="text-xs font-medium text-slate-600">
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
                  onValueChange={field.onChange}
                  options={DENSITY_OPTIONS}
                  ariaLabel="Display density"
                />
              )}
            />
          </SettingsField>
        </div>

        <div className="mt-5">
          <SettingsNote>
            Preferences are saved locally. Accent color currently updates dashboard
            chrome (navigation, brand mark, focus rings, and Settings save actions).
            Page CTAs, charts, and category colors still use the default blue until a
            future pass. Dark mode and density remain forthcoming.
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
