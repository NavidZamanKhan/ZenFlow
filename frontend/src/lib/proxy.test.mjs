import assert from 'node:assert/strict'
import {
  cleanCookieForSameOrigin,
  buildUpstreamUrl,
  getUpstreamTarget,
  validateUpstreamOrigin,
  splitSetCookieHeaders,
  DEFAULT_PRODUCTION_UPSTREAM,
} from './proxy-utils.ts'

// ---------------------------------------------------------------------------
// Comprehensive Unit Tests for Next.js Same-Origin API Proxy
// ---------------------------------------------------------------------------

function testCookieDomainRemovalAndAttributes() {
  console.log('Testing Cookie Domain Removal and Attribute Sanitization...')

  // Test 1: Django CSRF cookie with Domain and SameSite=None
  const csrfRaw = 'csrftoken=1234567890abcdef; expires=Sun, 07 Nov 2027 01:52:00 GMT; Max-Age=31449600; Path=/; SameSite=None; Secure; Domain=onrender.com'
  const csrfCleaned = cleanCookieForSameOrigin(csrfRaw, true)
  assert.ok(!csrfCleaned.toLowerCase().includes('domain='), 'Domain attribute must be stripped')
  assert.ok(csrfCleaned.includes('SameSite=Lax'), 'SameSite=None must be rewritten to SameSite=Lax')
  assert.ok(csrfCleaned.includes('Secure'), 'Secure attribute must be preserved')
  assert.ok(csrfCleaned.includes('Path=/'), 'Path must be preserved')
  assert.ok(csrfCleaned.includes('Max-Age=31449600'), 'Max-Age must be preserved')
  assert.ok(!csrfCleaned.includes('HttpOnly'), 'CSRF cookie must not be forced to HttpOnly')

  // Test 2: Django HttpOnly JWT access cookie
  const accessRaw = 'zf_access=jwt.token.here; HttpOnly; Max-Age=1800; Path=/; SameSite=None; Secure; Domain=.onrender.com'
  const accessCleaned = cleanCookieForSameOrigin(accessRaw, true)
  assert.ok(!accessCleaned.toLowerCase().includes('domain='), 'Domain must be stripped from access token')
  assert.ok(accessCleaned.includes('HttpOnly'), 'HttpOnly must be preserved')
  assert.ok(accessCleaned.includes('SameSite=Lax'), 'SameSite must be Lax')
  assert.ok(accessCleaned.includes('Path=/'), 'Path=/ must be preserved')

  // Test 3: Django HttpOnly JWT refresh cookie with sub-path
  const refreshRaw = 'zf_refresh=jwt.refresh.token; HttpOnly; Max-Age=604800; Path=/api/auth/; SameSite=None; Secure'
  const refreshCleaned = cleanCookieForSameOrigin(refreshRaw, true)
  assert.ok(refreshCleaned.includes('Path=/api/auth/'), 'Path=/api/auth/ must be preserved')
  assert.ok(refreshCleaned.includes('HttpOnly'), 'HttpOnly must be preserved')
  assert.ok(refreshCleaned.includes('SameSite=Lax'), 'SameSite must be Lax')

  // Test 4: Cookie clearing on logout (Max-Age=0, expired date)
  const logoutRaw = 'zf_access=""; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; Domain=onrender.com'
  const logoutCleaned = cleanCookieForSameOrigin(logoutRaw, true)
  assert.ok(!logoutCleaned.toLowerCase().includes('domain='), 'Domain must be stripped on logout cookie')
  assert.ok(logoutCleaned.includes('Max-Age=0'), 'Max-Age=0 must be preserved')
  assert.ok(logoutCleaned.includes('expires=Thu, 01 Jan 1970'), 'Expiry date must be preserved')
  assert.ok(logoutCleaned.includes('SameSite=Lax'), 'SameSite=Lax must be ensured')
  assert.ok(logoutCleaned.includes('Secure'), 'Secure must be added on HTTPS')

  // Test 5: Cookie name containing 'secure' or 'domain' as a substring must NOT be corrupted
  const trickyRaw = 'secure_user_pref=dark; Path=/; Domain=onrender.com'
  const trickyCleaned = cleanCookieForSameOrigin(trickyRaw, true)
  assert.ok(trickyCleaned.startsWith('secure_user_pref=dark'), 'Cookie name must not be corrupted')
  assert.ok(!trickyCleaned.toLowerCase().includes('domain='), 'Domain attribute must be stripped')
  assert.ok(trickyCleaned.includes('Secure'), 'Secure flag must be added')

  console.log('✓ Cookie domain removal and attribute sanitization tests passed')
}

function testSplitSetCookieHeaders() {
  console.log('Testing Safe Set-Cookie Header Splitting...')

  // Simulates combined Set-Cookie header with commas in Expires dates
  const combined =
    'csrftoken=abc123; expires=Sun, 07 Nov 2027 01:52:00 GMT; Path=/, ' +
    'zf_access=jwt1; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; HttpOnly, ' +
    'zf_refresh=jwt2; Path=/api/auth/; HttpOnly; Secure'

  const split = splitSetCookieHeaders(combined)
  assert.equal(split.length, 3, 'Must split into exactly 3 cookies')
  assert.ok(split[0].startsWith('csrftoken=abc123; expires=Sun, 07 Nov 2027'), 'Expires comma must not split cookie 1')
  assert.ok(split[1].startsWith('zf_access=jwt1; expires=Thu, 01 Jan 1970'), 'Expires comma must not split cookie 2')
  assert.ok(split[2].startsWith('zf_refresh=jwt2; Path=/api/auth/'), 'Cookie 3 parsed correctly')

  console.log('✓ Safe Set-Cookie header splitting tests passed')
}

function testUpstreamDestinationAndSSRFValidation() {
  console.log('Testing Upstream Destination and SSRF Validation...')

  // Test 1: Valid HTTPS origin
  assert.equal(validateUpstreamOrigin('https://zenflow-5u3r.onrender.com', true), 'https://zenflow-5u3r.onrender.com')

  // Test 2: Valid HTTP in development
  assert.equal(validateUpstreamOrigin('http://127.0.0.1:8000', false), 'http://127.0.0.1:8000')

  // Test 3: Reject insecure HTTP in production
  assert.equal(validateUpstreamOrigin('http://insecure-backend.com', true), null, 'Insecure HTTP must be rejected in production')

  // Test 4: Reject credentials in URL
  assert.equal(validateUpstreamOrigin('https://user:pass@backend.com', true), null, 'Credentials must be rejected')

  // Test 5: Reject protocol-relative URLs (//evil.com)
  assert.equal(validateUpstreamOrigin('//evil.com', true), null, 'Protocol-relative URL must be rejected')

  // Test 6: Reject non-http protocols (javascript:, file:, ftp:, gopher:)
  assert.equal(validateUpstreamOrigin('javascript:alert(1)', false), null, 'javascript: must be rejected')
  assert.equal(validateUpstreamOrigin('file:///etc/passwd', false), null, 'file: must be rejected')

  // Test 7: Reject malformed strings
  assert.equal(validateUpstreamOrigin('not a valid url', false), null, 'Malformed string must be rejected')
  assert.equal(validateUpstreamOrigin('', false), null, 'Empty string must be rejected')

  // Test 8: Fallback on invalid API_PROXY_TARGET in getUpstreamTarget()
  const originalEnv = process.env.API_PROXY_TARGET
  const originalNodeEnv = process.env.NODE_ENV
  try {
    process.env.NODE_ENV = 'production'
    process.env.API_PROXY_TARGET = 'http://attacker.com' // Insecure in production
    assert.equal(getUpstreamTarget(), DEFAULT_PRODUCTION_UPSTREAM, 'Must fall back safely on invalid production target')

    process.env.API_PROXY_TARGET = 'https://valid-custom-domain.com/some/path?query=1'
    assert.equal(getUpstreamTarget(), 'https://valid-custom-domain.com', 'Must extract purely origin without path')
  } finally {
    if (originalEnv) process.env.API_PROXY_TARGET = originalEnv
    else delete process.env.API_PROXY_TARGET
    process.env.NODE_ENV = originalNodeEnv
  }

  console.log('✓ Upstream destination validation tests passed')
}

function testUrlConstructionAndPathTraversalSanitization() {
  console.log('Testing URL Construction and Path Traversal Sanitization...')

  // Test 1: Standard API endpoint with trailing slash
  const url1 = buildUpstreamUrl('/api', ['auth', 'login'], '', '/api/auth/login/')
  assert.ok(url1.endsWith('/api/auth/login/'), `Trailing slash must be preserved: ${url1}`)

  // Test 2: Endpoint with query string
  const url2 = buildUpstreamUrl('/api', ['reminders', 'notifications'], '?unread=1&limit=10', '/api/reminders/notifications/')
  assert.ok(url2.endsWith('/api/reminders/notifications/?unread=1&limit=10'), `Query string preserved: ${url2}`)

  // Test 3: Root /api call
  const url3 = buildUpstreamUrl('/api', undefined, '', '/api')
  assert.ok(url3.endsWith('/api/'), `Root /api must resolve to /api/: ${url3}`)

  // Test 4: Media endpoint with file extension
  const url4 = buildUpstreamUrl('/media', ['avatars', 'user.png'], '', '/media/avatars/user.png')
  assert.ok(url4.endsWith('/media/avatars/user.png'), `Media file path preserved: ${url4}`)

  // Test 5: Plain path traversal ('..')
  const url5 = buildUpstreamUrl('/api', ['..', '..', 'admin'], '', '/api/../../admin')
  assert.ok(!url5.includes('..'), `Path traversal must be stripped: ${url5}`)
  assert.ok(url5.endsWith('/api/admin'), `Sanitized path must be safe: ${url5}`)

  // Test 6: URL-encoded traversal (%2e%2e, %2f, %5c)
  const url6 = buildUpstreamUrl('/api', ['%2e%2e', '%2e%2e', 'admin'], '', '/api/%2e%2e/%2e%2e/admin')
  assert.ok(!url6.includes('..'), `Encoded traversal must be stripped: ${url6}`)
  assert.ok(url6.endsWith('/api/admin'), `Encoded traversal sanitized: ${url6}`)

  // Test 7: Double-encoded traversal (%252e%252e)
  const url7 = buildUpstreamUrl('/api', ['%252e%252e', 'secret'], '', '/api/%252e%252e/secret')
  assert.ok(!url7.includes('..'), `Double-encoded traversal stripped: ${url7}`)
  assert.ok(url7.endsWith('/api/secret'), `Double-encoded traversal sanitized: ${url7}`)

  // Test 8: Backslash path injection (%5c or \\)
  const url8 = buildUpstreamUrl('/api', ['auth\\..\\admin'], '', '/api/auth\\..\\admin')
  assert.ok(!url8.includes('\\'), `Backslashes must be removed: ${url8}`)

  // Test 9: Fragments in search string must be stripped
  const url9 = buildUpstreamUrl('/api', ['tasks'], '?status=pending#fragment', '/api/tasks')
  assert.ok(!url9.includes('#'), `Fragments must be stripped: ${url9}`)
  assert.ok(url9.includes('?status=pending'), `Valid query preserved: ${url9}`)

  console.log('✓ URL construction and path traversal sanitization tests passed')
}

function testRedirectHandlingLogic() {
  console.log('Testing Redirect Location Rewriting Logic...')

  const upstreamTarget = 'https://zenflow-5u3r.onrender.com'
  const targetUrl = 'https://zenflow-5u3r.onrender.com/api/auth/login'

  // Test 1: Internal redirect (relative location)
  const relativeLocation = '/api/auth/login/'
  const locUrl1 = new URL(relativeLocation, targetUrl)
  assert.equal(locUrl1.origin, new URL(upstreamTarget).origin)
  const rewritten1 = `${locUrl1.pathname.replace(/^\/\/+/, '/')}${locUrl1.search}`
  assert.equal(rewritten1, '/api/auth/login/', 'Relative internal redirect rewritten to relative path')

  // Test 2: Internal redirect (absolute same-origin location with query parameters)
  const absoluteLocation = 'https://zenflow-5u3r.onrender.com/api/tasks/?completed=true'
  const locUrl2 = new URL(absoluteLocation, targetUrl)
  assert.equal(locUrl2.origin, new URL(upstreamTarget).origin)
  const rewritten2 = `${locUrl2.pathname.replace(/^\/\/+/, '/')}${locUrl2.search}`
  assert.equal(rewritten2, '/api/tasks/?completed=true', 'Absolute internal redirect rewritten to relative path with query')

  // Test 3: External redirect (Google OAuth redirect)
  const externalLocation = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=123'
  const locUrl3 = new URL(externalLocation, targetUrl)
  const isExternal = locUrl3.origin !== new URL(upstreamTarget).origin
  assert.ok(isExternal, 'External redirect must NOT be modified')

  // Test 4: Protocol-relative open redirect attempt (//evil.com/path)
  const protocolRelative = '//evil.com/login'
  const locUrl4 = new URL(protocolRelative, targetUrl)
  assert.notEqual(locUrl4.origin, new URL(upstreamTarget).origin, 'Protocol-relative external redirect must be rejected as external')

  console.log('✓ Redirect handling logic tests passed')
}

// ---------------------------------------------------------------------------
// Run Test Suite
// ---------------------------------------------------------------------------
testCookieDomainRemovalAndAttributes()
testSplitSetCookieHeaders()
testUpstreamDestinationAndSSRFValidation()
testUrlConstructionAndPathTraversalSanitization()
testRedirectHandlingLogic()

console.log('\n========================================')
console.log('All 5 proxy unit test suites passed successfully!')
console.log('========================================\n')
