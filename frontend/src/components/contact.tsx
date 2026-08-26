import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'

const CONTACT_EMAIL = 'sanur1314@gmail.com'

export function Contact() {
  return (
    <section id="contact" className="px-4 py-20 lg:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-medium text-primary">Contact</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Get in touch
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          Questions, feedback, or partnership ideas? Send us a note and we&apos;ll get back to you.
        </p>
        <div className="mt-8">
          <Button
            size="lg"
            render={<a href={`mailto:${CONTACT_EMAIL}`} />}
            className="rounded-full px-7 text-base shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <Mail className="size-4" aria-hidden="true" />
            Email us
          </Button>
        </div>
      </Reveal>
    </section>
  )
}
