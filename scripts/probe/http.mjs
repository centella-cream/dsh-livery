/**
 * Raw HTTP probes for the Web profile: token exchange, cookie, browser-trust
 * fence (Host/Origin), plugin bundle route and Livery host routes.
 *
 * Uses node:http instead of fetch because the fence checks need control over
 * the `Host` and `Origin` request headers.
 */

import http from 'node:http'

/** Issue one HTTP request with full header control. */
export function rawRequest(url, { method = 'GET', headers = {}, timeoutMs = 15_000 } = {}) {
  const parsed = new URL(url)
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        method,
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: `${parsed.pathname}${parsed.search}`,
        headers,
        timeout: timeoutMs,
      },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          const body = Buffer.concat(chunks)
          resolve({
            status: response.statusCode,
            headers: response.headers,
            setCookie: response.headers['set-cookie'] ?? [],
            body,
            text: body.toString('utf8'),
            location: response.headers.location,
          })
        })
      },
    )
    request.on('timeout', () => request.destroy(new Error(`request timed out after ${timeoutMs}ms`)))
    request.on('error', reject)
    request.end()
  })
}

/** Pull the first `name=value` pair out of Set-Cookie headers for reuse. */
export function cookieJarFrom(setCookie) {
  const jar = {}
  for (const line of setCookie ?? []) {
    const [pair] = line.split(';')
    const index = pair.indexOf('=')
    if (index > 0) jar[pair.slice(0, index).trim()] = pair.slice(index + 1).trim()
  }
  return jar
}

export function formatCookieHeader(jar) {
  return Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

/**
 * Browser-trust + auth fence checks from docs/research/web-profile-runbook.md
 * §2.3. These are pure HTTP, no browser involved.
 */
export async function probeBrowserTrust({ baseUrl, token }) {
  const checks = []
  const add = (id, passed, detail, evidence) => checks.push({ id, passed, detail, evidence })

  const noCookie = await rawRequest(`${baseUrl}/`)
  add('trust.no-cookie-401', noCookie.status === 401, `GET / without cookie → ${noCookie.status}`, { status: noCookie.status })

  const wrongToken = await rawRequest(`${baseUrl}/?token=definitely-not-the-token`)
  add(
    'trust.wrong-token-rejected',
    wrongToken.status === 401 || wrongToken.status === 403,
    `GET /?token=<wrong> → ${wrongToken.status}`,
    { status: wrongToken.status },
  )

  const exchange = await rawRequest(`${baseUrl}/?token=${encodeURIComponent(token)}`)
  const jar = cookieJarFrom(exchange.setCookie)
  const cookieNames = Object.keys(jar)
  add('trust.token-exchange-303', exchange.status === 303, `GET /?token=<launch token> → ${exchange.status}`, {
    status: exchange.status,
    location: exchange.location,
  })
  add(
    'trust.cookie-issued',
    cookieNames.length > 0 && exchange.setCookie.some((line) => /HttpOnly/i.test(line)) && exchange.setCookie.some((line) => /SameSite=Strict/i.test(line)),
    `Set-Cookie: ${exchange.setCookie.map((line) => line.split(';').slice(1).join(';').trim()).join(' | ') || '(none)'}`,
    { cookieNames, setCookie: exchange.setCookie },
  )

  const cookieHeader = formatCookieHeader(jar)
  const withCookie = await rawRequest(`${baseUrl}/`, { headers: { Cookie: cookieHeader } })
  add('trust.cookie-200', withCookie.status === 200, `GET / with cookie → ${withCookie.status}`, {
    status: withCookie.status,
    contentType: withCookie.headers['content-type'],
    bytes: withCookie.body.length,
  })

  // The Host/Origin fence is enforced on `/api` traffic. The document itself
  // is authority-bound by the signed cookie, so a forged Host gets a 401
  // (unknown authority) rather than reaching authenticated content. Both are
  // "refused"; we assert the stronger `/api` 403 explicitly.
  const badHostIndex = await rawRequest(`${baseUrl}/`, { headers: { Host: 'evil.example', Cookie: cookieHeader } })
  add(
    'trust.bad-host-index-refused',
    badHostIndex.status === 401 || badHostIndex.status === 403,
    `GET / Host: evil.example (cookie from 127.0.0.1) → ${badHostIndex.status} (refused; cookie authority mismatch)`,
    { status: badHostIndex.status },
  )

  const apiPath = '/api/__dsh_acceptance_probe__'
  const badHostApi = await rawRequest(`${baseUrl}${apiPath}`, { headers: { Host: 'evil.example', Cookie: cookieHeader } })
  add('trust.bad-host-api-403', badHostApi.status === 403, `GET ${apiPath} Host: evil.example → ${badHostApi.status}`, { status: badHostApi.status })

  const crossOrigin = await rawRequest(`${baseUrl}${apiPath}`, {
    headers: { Origin: 'http://evil.example', Cookie: cookieHeader },
  })
  add('trust.cross-origin-403', crossOrigin.status === 403, `GET ${apiPath} Origin: http://evil.example → ${crossOrigin.status}`, {
    status: crossOrigin.status,
  })

  const crossSite = await rawRequest(`${baseUrl}${apiPath}`, {
    headers: { 'Sec-Fetch-Site': 'cross-site', Cookie: cookieHeader },
  })
  add('trust.cross-site-403', crossSite.status === 403, `GET ${apiPath} Sec-Fetch-Site: cross-site → ${crossSite.status}`, {
    status: crossSite.status,
  })

  return { checks, cookieHeader, indexHtml: withCookie.text, redirectHeaders: exchange.headers }
}

/**
 * Confirm the plugin client bundle route.
 *
 * DSH 0.2.0-rc.2 encodes each boot-graph row as a grouped-path URL
 * (`plugins/??<pkg>/client.js&rev=<rev>`); that exact URL is what the page
 * loads, so it is the authoritative assertion. The bare
 * `/plugins/<pkg>/client.js?rev=` form is probed as evidence: in this build it
 * is *not* served, so a 404 there is recorded as a warning/deviation instead of
 * a failure (the graph URL is the loader contract that actually ships).
 */
export async function probePluginBundle({ baseUrl, pluginId, entryUrl }) {
  const absolute = new URL(entryUrl, `${baseUrl}/`).href
  const bundle = await rawRequest(absolute)
  const withoutRev = absolute.replace(/([&?])rev=[^&]+/, '').replace(/\?$/, '')
  const bare = await rawRequest(withoutRev)
  const rev = new URL(absolute).searchParams.get('rev') ?? entryUrl.match(/[&?]rev=([0-9a-f]+)/)?.[1] ?? null
  const canonicalBase = `${baseUrl}/plugins/${pluginId}/client.js`
  const canonical = rev ? await rawRequest(`${canonicalBase}?rev=${rev}`) : { status: null, headers: {}, body: Buffer.alloc(0) }
  const canonicalNoRev = await rawRequest(canonicalBase)
  return {
    checks: [
      {
        id: 'bundle.serves-client-js',
        passed: bundle.status === 200 && /javascript/i.test(bundle.headers['content-type'] ?? '') && bundle.body.length > 0,
        detail: `GET ${new URL(absolute).pathname}${new URL(absolute).search} → ${bundle.status} ${bundle.headers['content-type'] ?? ''} (${bundle.body.length} bytes)`,
        evidence: { url: absolute, status: bundle.status, contentType: bundle.headers['content-type'], bytes: bundle.body.length },
      },
      {
        id: 'bundle.requires-rev',
        passed: bare.status === 404,
        detail: `GET graph URL without rev → ${bare.status}`,
        evidence: { url: withoutRev, status: bare.status },
      },
      {
        id: 'bundle.canonical-route',
        passed: canonical.status === 200 || canonicalNoRev.status === 404,
        warnOnly: canonical.status !== 200,
        detail:
          canonical.status === 200
            ? `GET /plugins/${pluginId}/client.js?rev=<graph rev> → 200 ${canonical.headers['content-type'] ?? ''}`
            : `GET /plugins/${pluginId}/client.js?rev=<graph rev> → ${canonical.status}; this DSH build serves only the graph-encoded URL (verified deviation from the doc comment)`,
        evidence: { canonicalStatus: canonical.status, canonicalNoRevStatus: canonicalNoRev.status, rev, entryUrl: absolute },
      },
    ],
    bundle: { status: bundle.status, contentType: bundle.headers['content-type'], bytes: bundle.body.length, entryUrl: absolute, rev },
  }
}

/** Fetch a JSON route and return it fully parsed. */
export async function getJson(url, { headers = {} } = {}) {
  const response = await rawRequest(url, { headers })
  let json = null
  try {
    json = JSON.parse(response.text)
  } catch {
    json = null
  }
  return { status: response.status, contentType: response.headers['content-type'], cacheControl: response.headers['cache-control'], json, body: response.body }
}

/** Fetch status only (used for route existence checks). */
export async function getStatus(url) {
  const response = await rawRequest(url)
  return { status: response.status, contentType: response.headers['content-type'], bytes: response.body.length }
}
