import { Focus, LayoutGrid, TrendingUp, Wind } from 'lucide-react'
import { Reveal } from '@/components/reveal'

const points = [
  {
    icon: Wind,
    title: 'Less distraction',
    description: 'A quiet interface with no clutter or noise, so your attention stays where it matters.',
  },
  {
    icon: LayoutGrid,
    title: 'Better organization',
    description: 'Tasks, calendar, and expenses live together in one coherent, searchable space.',
  },
  {
    icon: TrendingUp,
    title: 'Improved productivity',
    description: 'Gentle structure and insights help you build a rhythm you can actually sustain.',
  },
  {
    icon: Focus,
    title: 'Clean workspace',
    description: 'Spacious layouts and soft surfaces make focused work feel calm and effortless.',
  },
]

export function WhyZenFlow() {
  return (
    <section id="about" className="px-4 py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <span className="text-sm font-medium text-primary">Why ZenFlow</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            A workspace designed to help you breathe
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Most productivity tools add pressure. ZenFlow removes it. We focus on calm defaults,
            generous space, and only the features that genuinely help you do your best work.
          </p>
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Focus className="size-5" aria-hidden="true" />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Focus mode</span> hides everything but the
              task in front of you — one thing at a time.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {points.map((point, i) => (
            <Reveal key={point.title} delay={i * 90} as="div">
              <div className="glass h-full rounded-3xl border border-border/60 p-6 transition-transform duration-300 hover:-translate-y-1.5">
                <point.icon className="size-6 text-primary" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {point.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
