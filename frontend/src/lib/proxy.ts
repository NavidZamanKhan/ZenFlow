import { NextRequest, NextResponse } from 'next/server.js'
import {
  buildUpstreamUrl,
  cleanCookieForSameOrigin,
  getUpstreamTarget,
  splitSetCookieHeaders,
} from './proxy-utils'

export { buildUpstreamUrl, cleanCookieForSameOrigin, getUpstreamTarget, splitSetCookieHeaders }

/** Headers that should not be forwarded directly from client to upstream. */
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  // Strip client-provided forwarding headers to prevent spoofing
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
  'x-forwarded-ssl',
])

/** Headers that should not be copied verbatim from upstream response to client. */
const STRIP_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'set-cookie', // Processed and appended separately
  'transfer-encoding',
])

/**
 * Forward an incoming Next.js request to the Django upstream backend,
 * adapting headers, cookies, and status codes for same-origin security.
 */
export async function proxyRequest(
  req: NextRequest,
  basePath: string,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const { path: pathSegments } = await ctx.params
  const search = req.nextUrl.search || ''
  const pathname = req.nextUrl.pathname
  const targetUrl = buildUpstreamUrl(basePath, pathSegments, search, pathname)

  const isHttps =
    req.nextUrl.protocol === 'https:' ||
    req.headers.get('x-forwarded-proto') === 'https' ||
    process.env.NODE_ENV === 'production'

  // Build upstream request headers
  const upstreamHeaders = new Headers()
  for (const [key, value] of req.headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      upstreamHeaders.set(key, value)
    }
  }

  // Set verified forwarding headers from server environment
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  if (clientIp) {
    upstreamHeaders.set('x-forwarded-for', clientIp)
  }

  // Forward verified host and protocol
  const verifiedHost = req.nextUrl.host || req.headers.get('host') || 'localhost'
  upstreamHeaders.set('x-forwarded-host', verifiedHost)
  upstreamHeaders.set('x-forwarded-proto', isHttps ? 'https' : 'http')

  // Forward Origin and Referer so Django's CsrfViewMiddleware
  // validates against CSRF_TRUSTED_ORIGINS (e.g. https://zenflowbd.vercel.app)
  const origin = req.headers.get('origin') || req.nextUrl.origin
  if (origin) {
    upstreamHeaders.set('origin', origin)
  }

  const referer = req.headers.get('referer')
  if (referer) {
    upstreamHeaders.set('referer', referer)
  }

  // Read body for mutating requests
  let reqBody: ArrayBuffer | undefined = undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    reqBody = await req.arrayBuffer()
  }

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: reqBody,
      redirect: 'manual', // Intercept redirects to rewrite location headers
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[API Proxy] Failed to reach upstream backend: ${msg}`)
    return NextResponse.json(
      { detail: 'Backend service temporarily unavailable. Please try again later.' },
      { status: 502 },
    )
  }

  // Build client response headers
  const responseHeaders = new Headers()
  for (const [key, value] of upstreamRes.headers.entries()) {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  }

  // Prevent caching of sensitive API and authentication responses by intermediaries or browsers
  if (basePath === '/api' && !responseHeaders.has('cache-control')) {
    responseHeaders.set('cache-control', 'no-store, no-cache, must-revalidate, private')
  }

  // Rewrite Location header on internal redirects to prevent redirect loops or origin leakage
  const location = responseHeaders.get('location')
  if (location) {
    try {
      const upstreamBaseObj = new URL(getUpstreamTarget())
      const locUrl = new URL(location, targetUrl)
      if (locUrl.origin === upstreamBaseObj.origin) {
        // Prevent protocol-relative open redirects (e.g. //evil.com)
        const cleanPath = locUrl.pathname.replace(/^\/\/+/, '/')
        responseHeaders.set('location', `${cleanPath}${locUrl.search}`)
      }
    } catch {
      // Leave external / non-parseable location unchanged (e.g. external OAuth redirects)
    }
  }

  // Clean and attach all Set-Cookie headers as first-party cookies
  let rawSetCookies: string[] = []
  if (typeof upstreamRes.headers.getSetCookie === 'function') {
    rawSetCookies = upstreamRes.headers.getSetCookie()
  } else {
    const rawHeader = upstreamRes.headers.get('set-cookie')
    if (rawHeader) {
      rawSetCookies = splitSetCookieHeaders(rawHeader)
    }
  }

  for (const cookieStr of rawSetCookies) {
    const cleaned = cleanCookieForSameOrigin(cookieStr, isHttps)
    responseHeaders.append('set-cookie', cleaned)
  }

  const responseBody =
    req.method === 'HEAD' || upstreamRes.status === 204 || upstreamRes.status === 304
      ? null
      : upstreamRes.body

  return new NextResponse(responseBody, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: responseHeaders,
  })
}
