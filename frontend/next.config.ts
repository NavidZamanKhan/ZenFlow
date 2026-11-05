import withBundleAnalyzerFactory from '@next/bundle-analyzer'
import type { NextConfig } from "next";

const withBundleAnalyzer = withBundleAnalyzerFactory({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
})

// Optional same-origin API proxy. When the frontend and the Django API cannot
// share a registrable domain (e.g. *.netlify.app -> *.onrender.com) the
// httpOnly session cookies become third-party cookies and are dropped by
// Safari/Brave. Setting API_PROXY_TARGET at build time makes Next.js forward
// `/api/*` to the backend so the cookies are first-party; pair it with
// NEXT_PUBLIC_API_URL=/ so the client calls its own origin. See README,
// "Production Deployment".
const apiProxyTarget = (process.env.API_PROXY_TARGET || '').replace(/\/$/, '')

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiProxyTarget) return []
    return [
      { source: '/api/:path*', destination: `${apiProxyTarget}/api/:path*` },
      { source: '/media/:path*', destination: `${apiProxyTarget}/media/:path*` },
    ]
  },
};

export default withBundleAnalyzer(nextConfig);
