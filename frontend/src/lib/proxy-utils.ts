/**
 * Pure utility functions for the same-origin API proxy.
 *
 * Handles upstream URL construction, environment resolution, and Set-Cookie
 * adaptation for same-origin first-party compliance on Safari (WebKit ITP).
 */

export const DEFAULT_PRODUCTION_UPSTREAM = 'https://zenflow-5u3r.onrender.com'
export const DEFAULT_DEV_UPSTREAM = 'http://127.0.0.1:8000'

/**
 * Validates and normalizes an upstream backend origin.
 *
 * Enforces strict security constraints:
 * - Must be a valid HTTP or HTTPS URL.
 * - In production, must be HTTPS (no insecure plaintext HTTP).
 * - Must NOT contain embedded credentials (user:password@host).
 * - Must have a valid, well-formed hostname.
 * - Strips any paths, query strings, or fragments to return purely the origin.
 *
 * If validation fails, returns null so the proxy falls back safely rather than
 * routing traffic to an unintended destination.
 */
export function validateUpstreamOrigin(rawUrl: string, isProduction: boolean = process.env.NODE_ENV === 'production'): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  // Reject protocol-relative URLs (e.g. //evil.com)
  if (trimmed.startsWith('//')) return null

  try {
    const parsed = new URL(trimmed)

    // Only allow http: and https: protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }

    // In production, reject insecure plain http:
    if (isProduction && parsed.protocol === 'http:') {
      return null
    }

    // Reject URLs containing user credentials (SSRF / credential leakage risk)
    if (parsed.username || parsed.password) {
      return null
    }

    // Validate hostname format (must not contain control characters or spaces)
    if (!parsed.hostname || /[\s\x00-\x1f\x7f\\]/.test(parsed.hostname)) {
      return null
    }

    return parsed.origin
  } catch {
    return null
  }
}

/**
 * Target backend URL for the same-origin proxy.
 *
 * Defaults to the production Render backend when deployed, or localhost in development.
 * Can be overridden via API_PROXY_TARGET or BACKEND_API_URL at build/runtime.
 *
 * Validates that the target is a valid HTTP/HTTPS URL to prevent SSRF and misconfigurations.
 */
export function getUpstreamTarget(): string {
  const isProd = process.env.NODE_ENV === 'production'
  const envTarget = process.env.API_PROXY_TARGET || process.env.BACKEND_API_URL

  if (envTarget) {
    const validated = validateUpstreamOrigin(envTarget, isProd)
    if (validated) {
      return validated
    }
    // If misconfigured in production, do not send to unexpected destination: fall back safely
    console.warn(`[API Proxy] Invalid API_PROXY_TARGET: "${envTarget}". Falling back to default.`)
  }

  if (!isProd) {
    const devUrl = process.env.NEXT_PUBLIC_API_URL
    if (devUrl && !devUrl.startsWith('/')) {
      const validatedDev = validateUpstreamOrigin(devUrl, false)
      if (validatedDev) {
        return validatedDev
      }
    }
    return DEFAULT_DEV_UPSTREAM
  }

  return DEFAULT_PRODUCTION_UPSTREAM
}

/**
 * Clean and adapt an upstream `Set-Cookie` header for same-origin delivery.
 *
 * 1. Strips foreign `Domain=...` attributes so the cookie becomes Host-Only on the
 *    frontend domain (e.g. zenflowbd.vercel.app or localhost). Safari ITP blocks
 *    cookies carrying third-party domain attributes.
 * 2. Rewrites `SameSite=None` to `SameSite=Lax`. When served from the same origin,
 *    `SameSite=Lax` is the gold standard for authentication cookies: fully accepted
 *    by Safari, protecting against CSRF, and reliably sent across all same-origin calls.
 * 3. Preserves `HttpOnly`, `Path`, `Max-Age`, and `Expires`.
 * 4. Ensures `Secure` is present on HTTPS connections.
 */
export function cleanCookieForSameOrigin(cookie: string, isHttps: boolean): string {
  // 1. Remove foreign domain attributes (e.g. Domain=onrender.com or Domain=.onrender.com)
  let cleaned = cookie.replace(/;\s*domain=[^;]+/gi, '')

  // 2. Rewrite SameSite=None to SameSite=Lax for same-origin first-party safety
  cleaned = cleaned.replace(/;\s*samesite=none/gi, '; SameSite=Lax')

  // 3. Ensure SameSite is specified if missing (uses word boundaries to prevent matching cookie values)
  if (!/(?:^|;\s*)samesite(?:\s*=|;|$)/i.test(cleaned)) {
    cleaned += '; SameSite=Lax'
  }

  // 4. Ensure Secure is present on HTTPS (word boundary prevents matching 'secure_something')
  if (isHttps && !/(?:^|;\s*)secure(?:\s*;|\s*$)/i.test(cleaned)) {
    cleaned += '; Secure'
  }

  return cleaned
}

/**
 * Split a potentially combined Set-Cookie string safely into individual cookies.
 * Handles commas in Expires attributes (e.g. 'expires=Wed, 21 Oct 2026 07:28:00 GMT')
 * without splitting them prematurely.
 */
export function splitSetCookieHeaders(combined: string): string[] {
  if (!combined) return []

  const cookies: string[] = []
  let start = 0
  let inExpires = false

  for (let i = 0; i < combined.length; i++) {
    const substr = combined.substring(i).toLowerCase()
    if (substr.startsWith('expires=')) {
      inExpires = true
    } else if (inExpires && combined[i] === ';') {
      inExpires = false
    } else if (!inExpires && combined[i] === ',') {
      // Lookahead: is the next part an attribute or a new cookie (<name>=<val>)?
      const nextSegment = combined.substring(i + 1).trim()
      // If next segment contains an '=' before any ';', it's a new cookie
      const eqIdx = nextSegment.indexOf('=')
      const semiIdx = nextSegment.indexOf(';')
      if (eqIdx !== -1 && (semiIdx === -1 || eqIdx < semiIdx)) {
        cookies.push(combined.substring(start, i).trim())
        start = i + 1
      }
    }
  }

  const last = combined.substring(start).trim()
  if (last) {
    cookies.push(last)
  }

  return cookies
}

/**
 * Safely construct the upstream URL from base path, route parameters, and query string.
 * Strictly prevents open-proxy, SSRF, and path-traversal behavior.
 */
export function buildUpstreamUrl(
  basePath: string, // e.g. '/api' or '/media'
  pathSegments: string[] | undefined,
  search: string,
  pathname: string,
): string {
  const upstreamBase = getUpstreamTarget()
  const upstreamObj = new URL(upstreamBase)

  // 1. Sanitize base path (must be strictly '/api' or '/media')
  const cleanBasePath = basePath === '/media' ? '/media' : '/api'

  // 2. Decode and sanitize path segments
  const safeSegments: string[] = []
  if (pathSegments && Array.isArray(pathSegments)) {
    for (const rawSeg of pathSegments) {
      if (!rawSeg || typeof rawSeg !== 'string') continue

      // Multi-decode to catch double/triple encoded traversal like %252e%252e
      let decoded = rawSeg
      for (let i = 0; i < 3; i++) {
        try {
          const next = decodeURIComponent(decoded)
          if (next === decoded) break
          decoded = next
        } catch {
          break
        }
      }

      // Drop directory traversal tokens
      if (decoded === '..' || decoded === '.' || decoded.includes('..')) {
        continue
      }

      // Strip dangerous characters: slashes, backslashes, colons, control chars, null bytes, hash, at-sign
      const sanitized = decoded.replace(/[/\\:\x00-\x1f\x7f#@]/g, '').trim()
      if (sanitized && sanitized !== '..' && sanitized !== '.') {
        safeSegments.push(encodeURIComponent(sanitized))
      }
    }
  }

  // 3. Preserve trailing slash if the original incoming request had one
  const cleanPathname = pathname.split('?')[0].split('#')[0]
  const trailingSlash = cleanPathname.endsWith('/') ? '/' : ''

  const subpath = safeSegments.length > 0 ? safeSegments.join('/') + trailingSlash : ''
  const finalPath = subpath ? `${cleanBasePath}/${subpath}` : `${cleanBasePath}/`

  // 4. Construct URL using WHATWG URL constructor to guarantee protocol, host, port cannot be altered
  const resultUrl = new URL(finalPath, upstreamObj)

  // 5. Sanitize search/query string (strip fragments '#' to prevent URL injection)
  if (search && search.startsWith('?')) {
    const cleanSearch = search.split('#')[0]
    resultUrl.search = cleanSearch
  }

  // 6. Security assertion: target origin must strictly equal the upstream base origin
  if (resultUrl.origin !== upstreamObj.origin) {
    throw new Error('SSRF attempt detected: target origin mismatch')
  }

  return resultUrl.toString()
}
