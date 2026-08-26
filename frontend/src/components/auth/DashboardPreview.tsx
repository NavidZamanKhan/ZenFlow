import { DashboardMockup } from '@/components/dashboard-mockup'

/**
 * Compact Overview stand-in for the auth marketing panel.
 * Reuses the shared mockup so landing + login stay aligned with the real dashboard.
 */
export function DashboardPreview() {
  return <DashboardMockup className="shadow-xl" />
}
