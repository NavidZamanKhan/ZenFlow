import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardMockup } from '@/components/dashboard-mockup'
import { Reveal } from '@/components/reveal'

export function Hero() {
  return (
    <section id="top" className="relative px-4 pt-36 pb-20 sm:pt-40 lg:pt-44 lg:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.3fr] lg:gap-12">
        {/* copy */}
        <div className="max-w-xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              One calm workspace for everything
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Bring clarity to your workday.
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty">
              ZenFlow helps professionals organize tasks, manage reminders, track expenses, and stay
              focused with one clean, quiet dashboard.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="rounded-full px-7 text-base shadow-sm transition-transform hover:-translate-y-0.5"
                render={<Link href="/register" />}
              >
                Get Started
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-border/70 bg-card/50 px-7 text-base backdrop-blur transition-transform hover:-translate-y-0.5 hover:bg-accent/60"
                render={<Link href="#features" />}
              >
                Learn More
              </Button>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-10 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-6">
              <p className="font-medium text-foreground">Free to start</p>
              <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
              <p>No credit card required</p>
            </div>
          </Reveal>
        </div>

        {/* dashboard */}
        <Reveal delay={200} className="relative min-w-0 overflow-hidden">
          <div
            className="absolute -inset-3 -z-10 rounded-[2rem] bg-primary/10 blur-2xl sm:-inset-6 sm:rounded-[2.5rem] sm:blur-3xl"
            aria-hidden="true"
          />
          <div className="animate-float">
            <DashboardMockup className="w-full" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
