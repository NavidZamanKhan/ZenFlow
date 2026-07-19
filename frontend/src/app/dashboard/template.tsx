import type { ReactNode } from 'react'

/**
 * Remounts on every dashboard route change, giving each page a subtle fade-in.
 * CSS-only (`.zf-route-fade` in globals.css) and disabled under
 * prefers-reduced-motion. A content-only crossfade would require moving the
 * sidebar shell into a shared layout.tsx — intentionally out of scope.
 */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return <div className="zf-route-fade">{children}</div>
}
