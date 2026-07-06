import { DashboardMockup } from '@/components/dashboard-mockup'
import { Reveal } from '@/components/reveal'

export function DashboardPreview() {
  return (
    <section className="px-4 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium text-primary">The dashboard</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Your whole day, beautifully in one place
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Sidebar navigation, today&apos;s tasks, calendar, expenses, reminders, and productivity —
            organized into a single, polished workspace.
          </p>
        </Reveal>

        <Reveal delay={120} className="relative mt-14">
          <div
            className="absolute -inset-8 -z-10 rounded-[3rem] bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <DashboardMockup className="mx-auto max-w-5xl" />
        </Reveal>
      </div>
    </section>
  )
}
