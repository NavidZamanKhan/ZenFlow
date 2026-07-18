'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Laptop, Moon, Palette, Save, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
    description: 'ZenFlow’s current appearance',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Full theme support coming soon',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Automatic switching coming soon',
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
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceSchema),
    mode: 'onTouched',
    defaultValues: appearance,
  })

  useEffect(() => {
    reset(appearance)
  }, [appearance, reset])

  const submitAppearance = (values: AppearanceFormValues) => {
    if (onSave(values)) {
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
                onValueChange={field.onChange}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 cursor-pointer has-[[data-checked]]:border-[#1D70E8] has-[[data-checked]]:bg-[#F5F9FE] transition-colors"
                    >
                      <RadioGroupItem value={option.value} className="mt-0.5" />
                      <span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <Icon size={15} className="text-[#1D70E8]" />
                          {option.label}
                        </span>
                        <span className="block text-xs leading-relaxed text-slate-400 mt-1">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
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
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer has-[[data-checked]]:border-[#1D70E8] has-[[data-checked]]:bg-[#F5F9FE]"
                    >
                      <RadioGroupItem value={option.value} />
                      <span
                        className="w-3 h-3 rounded-full"
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
            Preferences are saved locally. ZenFlow currently remains in its
            established light theme; full dark mode, accent, and density
            application require a future app-wide theme pass.
          </SettingsNote>
        </div>

        <div className="flex justify-end mt-5">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-4 rounded-xl bg-[#1D70E8] text-white hover:bg-[#1660CC]"
          >
            <Save size={15} />
            Save appearance
          </Button>
        </div>
      </form>
    </SettingsSection>
  )
}
