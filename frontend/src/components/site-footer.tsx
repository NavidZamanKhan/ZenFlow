import { ZenFlowLogo } from '@/components/zenflow-logo'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  )
}

const columns = [
  {
    heading: 'Product',
    links: ['Features', 'Dashboard', 'Pricing', 'Changelog'],
  },
  {
    heading: 'Company',
    links: ['About', 'Careers', 'Blog', 'Contact'],
  },
  {
    heading: 'Resources',
    links: ['Help center', 'Guides', 'Privacy', 'Terms'],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 px-4 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.5fr_2fr]">
          <div>
            <a href="#top" className="flex items-center gap-2.5" aria-label="ZenFlow home">
              <ZenFlowLogo className="size-7" />
              <span className="text-lg font-semibold tracking-tight">ZenFlow</span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A calm, organized workspace for focused professionals.
            </p>
            <a
              href="https://github.com"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <GithubIcon className="size-4" />
              GitHub
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.heading}>
                <h3 className="text-sm font-semibold">{column.heading}</h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} ZenFlow. All rights reserved.</p>
          <p>Made for calm, focused work.</p>
        </div>
      </div>
    </footer>
  )
}
