import withBundleAnalyzerFactory from '@next/bundle-analyzer'
import type { NextConfig } from "next";

const withBundleAnalyzer = withBundleAnalyzerFactory({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
})

// Same-origin API proxying for `/api/*` and `/media/*` is handled programmatically
// by App Router Route Handlers in `src/app/api/[[...path]]/route.ts` and
// `src/app/media/[[...path]]/route.ts`. This provides full control over `Set-Cookie`
// domain and SameSite rewriting, ensuring Safari ITP does not drop first-party session cookies.
const nextConfig: NextConfig = {};

export default withBundleAnalyzer(nextConfig);
