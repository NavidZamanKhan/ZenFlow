import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { WhyZenFlow } from '@/components/why-zenflow'
import { DashboardPreview } from '@/components/dashboard-preview'
import { CallToAction } from '@/components/cta'
import { SiteFooter } from '@/components/site-footer'

export default function Page() {
  return (
    <div className="page-canvas min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <WhyZenFlow />
        <DashboardPreview />
        <CallToAction />
      </main>
      <SiteFooter />
    </div>
  )
}
