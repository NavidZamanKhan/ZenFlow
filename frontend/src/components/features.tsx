import { ListTodo, CalendarDays, Bell, Wallet } from 'lucide-react'
import { Reveal } from '@/components/reveal'

const features = [
  {
    icon: ListTodo,
    title: 'Task Management',
    description:
      'Create tasks with priorities and categories, then filter and sort so what matters stays on top.',
  },
  {
    icon: CalendarDays,
    title: 'Calendar Planning',
    description:
      'Plan events in day, week, or month views, and drag to reschedule when plans change.',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description:
      'Upcoming tasks and events surface on your Overview so you catch what is due next.',
  },
  {
    icon: Wallet,
    title: 'Expense Tracking',
    description:
      'Log spending, set a budget, and review Insights so you can see where money goes.',
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
