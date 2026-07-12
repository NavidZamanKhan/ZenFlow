import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'

export function CallToAction() {
  return (
    <section id="contact" className="px-4 py-20 lg:py-28">
      <Reveal className="mx-auto max-w-4xl">
        <div className="glass-strong relative overflow-hidden rounded-[2.5rem] border border-border/60 px-6 py-16 text-center shadow-[0_30px_80px_-40px_rgba(56,89,140,0.45)] sm:px-16">
          <div
            className="absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
            aria-hidden="true"
          />
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ready to organize your day?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
            Join thousands of professionals who trade the chaos for calm. Start free — no credit card
            required.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              render={<Link href="/register" />}
              className="rounded-full px-7 text-base shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Create Account
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/login" />}
              className="rounded-full border-border/70 bg-card/50 px-7 text-base backdrop-blur transition-transform hover:-translate-y-0.5 hover:bg-accent/60"
            >
              Login
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
