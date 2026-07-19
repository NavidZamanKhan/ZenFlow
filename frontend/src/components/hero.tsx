import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardMockup } from '@/components/dashboard-mockup'
import { Reveal } from '@/components/reveal'

export function Hero() {
  return (
    <section id="top" className="relative px-4 pt-36 pb-20 sm:pt-40 lg:pt-44 lg:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1.15fr] lg:gap-10">
        {/* copy */}
        <div className="max-w-xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              One calm workspace for everything
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">
              Bring clarity to your workday.
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty">
              ZenFlow helps professionals organize tasks, manage reminders, track expenses, and stay
              focused — all with one clean, quiet dashboard.
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
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                <span className="block text-2xl font-semibold text-foreground">12k+</span>
                calm professionals
              </div>
              <div className="h-8 w-px bg-border" aria-hidden="true" />
              <div>
                <span className="block text-2xl font-semibold text-foreground">4.9</span>
                average rating
              </div>
            </div>
          </Reveal>
        </div>

        {/* dashboard */}
        <Reveal delay={200} className="relative">
          <div
            className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="animate-float">
            <DashboardMockup />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
