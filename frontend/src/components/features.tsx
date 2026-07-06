import { ListTodo, CalendarDays, Bell, Wallet } from 'lucide-react'
import { Reveal } from '@/components/reveal'

const features = [
  {
    icon: ListTodo,
    title: 'Task Management',
    description:
      'Capture, group, and prioritize your work with a gentle drag-and-drop board that keeps everything in view.',
  },
  {
    icon: CalendarDays,
    title: 'Calendar Planning',
    description:
      'See your week at a glance. Schedule deep-focus blocks and let ZenFlow protect your time.',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description:
      'Timely, unobtrusive nudges that surface the right thing at the right moment — never noisy.',
  },
  {
    icon: Wallet,
    title: 'Expense Analytics',
    description:
      'Track spending and understand where your money goes with clean, readable insights.',
  },
]

export function Features() {
  return (
    <section id="features" className="px-4 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium text-primary">Features</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Thoughtfully designed tools that work together so your day feels lighter.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 90} as="div">
              <article className="glass group h-full rounded-3xl border border-border/60 p-6 shadow-[0_18px_50px_-30px_rgba(56,89,140,0.35)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_-30px_rgba(56,89,140,0.45)]">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
