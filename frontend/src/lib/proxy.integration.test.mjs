import assert from 'node:assert/strict'
import http from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { NextRequest } = require('next/server')
const { proxyRequest } = await import('./proxy.ts')

// ---------------------------------------------------------------------------
// End-to-End Proxy Integration Test with Mock Upstream Backend
// ---------------------------------------------------------------------------

async function runIntegrationTests() {
  console.log('Starting End-to-End Proxy Integration Tests...')

  let lastUpstreamRequest = null

  // Create local mock Django backend server
  const mockServer = http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      lastUpstreamRequest = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body,
      }

      // Endpoint: GET /api/auth/csrf/
      if (req.method === 'GET' && req.url === '/api/auth/csrf/') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': 'csrftoken=csrf_token_12345; Domain=onrender.com; Path=/; SameSite=None; Secure',
        })
        res.end(JSON.stringify({ csrfToken: 'csrf_token_12345' }))
        return
      }

      // Endpoint: POST /api/auth/login/
      if (req.method === 'POST' && req.url === '/api/auth/login/') {
        // Return 3 Set-Cookie headers: csrftoken, zf_access, zf_refresh
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': [
            'csrftoken=csrf_token_new; Domain=onrender.com; Path=/; SameSite=None; Secure',
            'zf_access=jwt_access_token; Domain=onrender.com; Path=/; HttpOnly; SameSite=None; Secure',
            'zf_refresh=jwt_refresh_token; Domain=onrender.com; Path=/api/auth/; HttpOnly; SameSite=None; Secure',
          ],
        })
        res.end(JSON.stringify({ user: { email: 'test@example.com' } }))
        return
      }

      // Endpoint: POST /api/auth/refresh/
      if (req.method === 'POST' && req.url === '/api/auth/refresh/') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': 'zf_access=jwt_access_rotated; Domain=onrender.com; Path=/; HttpOnly; SameSite=None; Secure',
        })
        res.end(JSON.stringify({ detail: 'Token rotated' }))
        return
      }

      // Endpoint: POST /api/auth/logout/
      if (req.method === 'POST' && req.url === '/api/auth/logout/') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': [
            'zf_access=""; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/; Domain=onrender.com',
            'zf_refresh=""; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/api/auth/; Domain=onrender.com',
          ],
        })
        res.end(JSON.stringify({ detail: 'Successfully logged out.' }))
        return
      }

      // Endpoint: GET /api/health/
      if (req.method === 'GET' && req.url === '/api/health/') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', database: 'ok' }))
        return
      }

      // Endpoint: GET /api/reminders/?unread=1&limit=5 (Query string test)
      if (req.method === 'GET' && req.url === '/api/reminders/?unread=1&limit=5') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ results: [] }))
        return
      }

      // Endpoint: GET /media/avatars/user.png (Media proxy test)
      if (req.method === 'GET' && req.url === '/media/avatars/user.png') {
        res.writeHead(200, { 'Content-Type': 'image/png' })
        res.end('FAKE_PNG_BINARY_DATA')
        return
      }

      // Endpoint: GET /api/redirect-test/ (Upstream internal redirect simulation)
      if (req.method === 'GET' && req.url === '/api/redirect-test/') {
        const port = mockServer.address().port
        res.writeHead(302, {
          Location: `http://127.0.0.1:${port}/api/tasks/`,
        })
        res.end()
        return
      }

      // Endpoint: POST /api/tasks/ (Error simulation)
      if (req.method === 'POST' && req.url === '/api/tasks/') {
        res.writeHead(400, {
          'Content-Type': 'application/json',
        })
        res.end(JSON.stringify({ title: ['This field is required.'] }))
        return
      }

      // If upstream ever receives a non-trailing-slash API request, Django issues 301.
      // We simulate this to prove that the proxy avoids triggering Django's APPEND_SLASH 301.
      if (req.url === '/api/auth/csrf' || req.url === '/api/health' || req.url === '/api/tasks') {
        res.writeHead(301, {
          Location: `${req.url}/`,
        })
        res.end()
        return
      }

      // Default fallback
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ detail: 'Not found' }))
    })
  })

  await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve))
  const port = mockServer.address().port
  const mockBaseUrl = `http://127.0.0.1:${port}`
  process.env.API_PROXY_TARGET = mockBaseUrl

  try {
    // -------------------------------------------------------------------------
    // Test 1: CSRF Bootstrap returns first-party cookie & no-store cache header
    // -------------------------------------------------------------------------
    {
      const req = new NextRequest('http://localhost:3000/api/auth/csrf/', {
        method: 'GET',
        headers: {
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
        },
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['auth', 'csrf'] }),
      })

      assert.equal(res.status, 200, 'CSRF bootstrap status must be 200')
      const cookies = res.headers.getSetCookie()
      assert.equal(cookies.length, 1, 'Must return 1 Set-Cookie header')
      assert.ok(!cookies[0].toLowerCase().includes('domain='), 'Domain must be stripped from CSRF cookie')
      assert.ok(cookies[0].includes('SameSite=Lax'), 'Must be Lax')
      assert.equal(
        res.headers.get('cache-control'),
        'no-store, no-cache, must-revalidate, private',
        'Must enforce no-store on sensitive API response'
      )
      console.log('✓ Integration Test 1 passed: CSRF bootstrap first-party cookie')
    }

    // -------------------------------------------------------------------------
    // Test 2: Subsequent request forwards cookie, X-CSRFToken, Origin, and body
    // -------------------------------------------------------------------------
    {
      const payload = JSON.stringify({ email: 'test@example.com', password: 'password123' })
      const req = new NextRequest('http://localhost:3000/api/auth/login/', {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          Origin: 'https://zenflowbd.vercel.app',
          Cookie: 'csrftoken=csrf_token_12345',
          'X-CSRFToken': 'csrf_token_12345',
          'Content-Type': 'application/json',
        },
        body: payload,
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['auth', 'login'] }),
      })

      assert.equal(res.status, 200, 'Login status must be 200')
      assert.ok(lastUpstreamRequest, 'Upstream must have received request')
      assert.equal(lastUpstreamRequest.method, 'POST')
      assert.equal(lastUpstreamRequest.headers['x-csrftoken'], 'csrf_token_12345', 'X-CSRFToken forwarded')
      assert.equal(lastUpstreamRequest.headers['cookie'], 'csrftoken=csrf_token_12345', 'Cookie forwarded')
      assert.equal(lastUpstreamRequest.headers['origin'], 'https://zenflowbd.vercel.app', 'Origin forwarded')
      assert.equal(lastUpstreamRequest.body, payload, 'Request body forwarded intact')

      // Verify all 3 Set-Cookie headers returned independently
      const setCookies = res.headers.getSetCookie()
      assert.equal(setCookies.length, 3, 'Must return 3 independent Set-Cookie headers')
      assert.ok(setCookies.some((c) => c.startsWith('csrftoken=') && !c.includes('Domain=')), 'csrftoken preserved')
      assert.ok(setCookies.some((c) => c.startsWith('zf_access=') && c.includes('HttpOnly')), 'zf_access preserved')
      assert.ok(
        setCookies.some((c) => c.startsWith('zf_refresh=') && c.includes('Path=/api/auth/')),
        'zf_refresh preserved with sub-path'
      )
      console.log('✓ Integration Test 2 passed: Cookie & body forwarding and 3 Set-Cookie headers')
    }

    // -------------------------------------------------------------------------
    // Test 3: Token Refresh updates zf_access
    // -------------------------------------------------------------------------
    {
      const req = new NextRequest('http://localhost:3000/api/auth/refresh/', {
        method: 'POST',
        headers: {
          Cookie: 'zf_refresh=jwt_refresh_token',
        },
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['auth', 'refresh'] }),
      })

      assert.equal(res.status, 200, 'Refresh status must be 200')
      const cookies = res.headers.getSetCookie()
      assert.equal(cookies.length, 1)
      assert.ok(cookies[0].startsWith('zf_access=jwt_access_rotated'), 'Rotated access token returned')
      assert.ok(cookies[0].includes('HttpOnly'), 'HttpOnly preserved on rotated token')
      console.log('✓ Integration Test 3 passed: Token refresh cookie update')
    }

    // -------------------------------------------------------------------------
    // Test 4: Logout clears authentication cookies with Max-Age=0
    // -------------------------------------------------------------------------
    {
      const req = new NextRequest('http://localhost:3000/api/auth/logout/', {
        method: 'POST',
        headers: {
          Cookie: 'zf_access=jwt_access_token; zf_refresh=jwt_refresh_token',
        },
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['auth', 'logout'] }),
      })

      assert.equal(res.status, 200, 'Logout status must be 200')
      const cookies = res.headers.getSetCookie()
      assert.equal(cookies.length, 2, 'Must clear 2 cookies on logout')
      assert.ok(cookies.every((c) => c.includes('Max-Age=0')), 'All logout cookies must have Max-Age=0')
      assert.ok(cookies.every((c) => !c.toLowerCase().includes('domain=')), 'Domain stripped on logout')
      console.log('✓ Integration Test 4 passed: Logout clears cookies')
    }

    // -------------------------------------------------------------------------
    // Test 5: Backend 400 error preserves status and body
    // -------------------------------------------------------------------------
    {
      const req = new NextRequest('http://localhost:3000/api/tasks/', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['tasks'] }),
      })

      assert.equal(res.status, 400, 'Error status must be 400')
      const data = await res.json()
      assert.deepEqual(data, { title: ['This field is required.'] }, 'Backend error payload preserved')
      console.log('✓ Integration Test 5 passed: Backend error handling preserved')
    }

    // -------------------------------------------------------------------------
    // Test 6: Unreachable upstream returns safe 502 without leaking secrets
    // -------------------------------------------------------------------------
    {
      // Point proxy to a closed port on localhost
      process.env.API_PROXY_TARGET = 'http://127.0.0.1:49999'

      const req = new NextRequest('http://localhost:3000/api/tasks/', {
        method: 'GET',
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['tasks'] }),
      })

      assert.equal(res.status, 502, 'Unreachable backend must return 502')
      const data = await res.json()
      assert.equal(
        data.detail,
        'Backend service temporarily unavailable. Please try again later.',
        'Safe generic error message'
      )
      console.log('✓ Integration Test 6 passed: Safe 502 response on unreachable backend')
    }

    // Restore mock upstream target for regression tests
    process.env.API_PROXY_TARGET = mockBaseUrl

    // -------------------------------------------------------------------------
    // Test 7: API request WITHOUT trailing slash is normalized to trailing slash
    // -------------------------------------------------------------------------
    {
      const req = new NextRequest('http://localhost:3000/api/auth/csrf', {
        method: 'GET',
        headers: {
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
        },
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['auth', 'csrf'] }),
      })

      assert.equal(res.status, 200, 'CSRF without trailing slash must return 200 directly')
      assert.ok(lastUpstreamRequest, 'Upstream must have received request')
      assert.equal(
        lastUpstreamRequest.url,
        '/api/auth/csrf/',
        'Upstream request URL MUST be normalized to canonical trailing slash'
      )
      console.log('✓ Integration Test 7 passed: Request without trailing slash normalized to /api/auth/csrf/')
    }

    // -------------------------------------------------------------------------
    // Test 8: API request WITH trailing slash preserves trailing slash on upstream
    // -------------------------------------------------------------------------
    {
      const req = new NextRequest('http://localhost:3000/api/auth/csrf/', {
        method: 'GET',
        headers: {
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
        },
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['auth', 'csrf'] }),
      })

      assert.equal(res.status, 200, 'CSRF with trailing slash must return 200')
      assert.equal(lastUpstreamRequest.url, '/api/auth/csrf/', 'Upstream request URL must preserve trailing slash')
      console.log('✓ Integration Test 8 passed: Request with trailing slash sent as /api/auth/csrf/')
    }

    // -------------------------------------------------------------------------
    // Test 9: GET request without trailing slash on /api/health
    // -------------------------------------------------------------------------
    {
      const req = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['health'] }),
      })

      assert.equal(res.status, 200, 'Health endpoint must return 200')
      assert.equal(lastUpstreamRequest.method, 'GET')
      assert.equal(lastUpstreamRequest.url, '/api/health/', 'Health upstream URL must have trailing slash')
      const data = await res.json()
      assert.equal(data.status, 'ok')
      console.log('✓ Integration Test 9 passed: GET /api/health normalized to /api/health/')
    }

    // -------------------------------------------------------------------------
    // Test 10: POST request with body WITHOUT trailing slash preserves method & body
    // -------------------------------------------------------------------------
    {
      const payload = JSON.stringify({ email: 'test@example.com', password: 'password123' })
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          'Content-Type': 'application/json',
          Cookie: 'csrftoken=csrf_token_12345',
          'X-CSRFToken': 'csrf_token_12345',
        },
        body: payload,
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['auth', 'login'] }),
      })

      assert.equal(res.status, 200, 'POST /api/auth/login without slash must succeed with 200')
      assert.equal(lastUpstreamRequest.method, 'POST', 'POST method must be preserved')
      assert.equal(lastUpstreamRequest.url, '/api/auth/login/', 'POST upstream URL must be normalized to trailing slash')
      assert.equal(lastUpstreamRequest.body, payload, 'POST request body must be forwarded intact')
      assert.equal(lastUpstreamRequest.headers['x-csrftoken'], 'csrf_token_12345', 'CSRF header forwarded')
      console.log('✓ Integration Test 10 passed: POST /api/auth/login normalized with body & headers preserved')
    }

    // -------------------------------------------------------------------------
    // Test 11: Query string preservation on non-trailing slash request
    // -------------------------------------------------------------------------
    {
      const req = new NextRequest('http://localhost:3000/api/reminders?unread=1&limit=5', {
        method: 'GET',
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['reminders'] }),
      })

      assert.equal(res.status, 200, 'Query request must return 200')
      assert.equal(
        lastUpstreamRequest.url,
        '/api/reminders/?unread=1&limit=5',
        'Upstream URL must normalize slash before query string'
      )
      console.log('✓ Integration Test 11 passed: Query string preserved with normalized slash')
    }

    // -------------------------------------------------------------------------
    // Test 12: Media proxy preserves file extension without appending trailing slash
    // -------------------------------------------------------------------------
    {
      const req = new NextRequest('http://localhost:3000/media/avatars/user.png', {
        method: 'GET',
      })

      const res = await proxyRequest(req, '/media', {
        params: Promise.resolve({ path: ['avatars', 'user.png'] }),
      })

      assert.equal(res.status, 200, 'Media request must return 200')
      assert.equal(
        lastUpstreamRequest.url,
        '/media/avatars/user.png',
        'Media file URL must strictly NOT have a trailing slash appended'
      )
      assert.equal(res.headers.get('content-type'), 'image/png')
      console.log('✓ Integration Test 12 passed: Media proxy preserves file extensions')
    }

    // -------------------------------------------------------------------------
    // Test 13: Upstream redirect rewriting & prevention of infinite redirect loops
    // -------------------------------------------------------------------------
    {
      const req = new NextRequest('http://localhost:3000/api/redirect-test', {
        method: 'GET',
      })

      const res = await proxyRequest(req, '/api', {
        params: Promise.resolve({ path: ['redirect-test'] }),
      })

      assert.equal(res.status, 302, 'Upstream 302 redirect status preserved')
      assert.equal(
        res.headers.get('location'),
        '/api/tasks/',
        'Upstream internal redirect location rewritten to safe relative path'
      )
      assert.equal(lastUpstreamRequest.url, '/api/redirect-test/', 'Upstream requested with canonical slash')
      console.log('✓ Integration Test 13 passed: Upstream redirect rewritten & infinite loop prevented')
    }
  } finally {
    await new Promise((resolve) => mockServer.close(resolve))
    delete process.env.API_PROXY_TARGET
  }

  console.log('\n========================================')
  console.log('All 13 End-to-End Proxy Integration Tests Passed!')
  console.log('========================================\n')
}

runIntegrationTests().catch((err) => {
  console.error('Integration test failure:', err)
  process.exit(1)
})
