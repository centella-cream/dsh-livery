/**
 * Resolve a `playwright-core` installation without downloading any browser.
 *
 * Priority:
 *   1. `--pw-core` / `PW_CORE` explicit module path
 *   2. the checkout's own `node_modules/playwright-core` (pnpm-linked in the workspace)
 *   3. a bare `import('playwright-core')` if the package is resolvable anyway
 *
 * The harness launches either the system Chrome (`channel: 'chrome'`) or an
 * explicit Chrome-for-Testing executable (--chrome-binary) that must match the
 * frozen certified full version; Playwright browser downloads are never used
 * automatically.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import https from 'node:https'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { WORKSPACE_ROOT } from './util.mjs'

export function playwrightCandidates(explicit) {
  const candidates = []
  if (explicit) candidates.push(path.resolve(explicit))
  if (process.env.PW_CORE) candidates.push(path.resolve(process.env.PW_CORE))
  candidates.push(path.join(WORKSPACE_ROOT, 'node_modules/playwright-core/index.mjs'))
  return [...new Set(candidates)]
}

let cached = null

/** Load and cache the playwright-core module. */
export async function loadPlaywright(explicit) {
  if (cached && !explicit) return cached
  const failures = []
  for (const candidate of playwrightCandidates(explicit)) {
    if (!candidate.endsWith('.mjs') && !existsSync(candidate)) continue
    if (!existsSync(candidate)) {
      failures.push(`${candidate} (missing)`)
      continue
    }
    try {
      const module = await import(pathToFileURL(candidate).href)
      if (typeof module.chromium?.launch !== 'function') throw new Error('module does not export chromium.launch')
      let version = 'unknown'
      const packageJson = path.join(path.dirname(candidate), 'package.json')
      try {
        version = JSON.parse(await readFile(packageJson, 'utf8')).version ?? 'unknown'
      } catch {
        /* version is informational */
      }
      cached = { module, path: candidate, version }
      return cached
    } catch (error) {
      failures.push(`${candidate} (${error instanceof Error ? error.message : String(error)})`)
    }
  }
  throw new Error(
    `playwright-core is not available. Tried:\n${failures.join('\n')}\n` +
      'Install it into the checkout (`pnpm install`) or pass --pw-core <path-to-playwright-core/index.mjs>.',
  )
}

const PICSUM_FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
let picsumFixture = null

/**
 * Local HTTPS target for the real 302 Picsum redirect fixture.
 *
 * Chrome maps only `fastly.picsum.photos` to this loopback server via
 * --host-resolver-rules; the mock 302 keeps the hostname but appends the local
 * port. This exercises a real browser redirect + final-URL revalidation while
 * remaining deterministic/offline. The self-signed cert is accepted only by the
 * acceptance browser (--ignore-certificate-errors) and never affects the app.
 */
async function startPicsumFixture() {
  if (picsumFixture !== null) return picsumFixture
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dsh-picsum-fixture-'))
  const keyPath = path.join(dir, 'key.pem')
  const certPath = path.join(dir, 'cert.pem')
  try {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', keyPath, '-out', certPath, '-days', '1',
      '-subj', '/CN=fastly.picsum.photos',
      '-addext', 'subjectAltName=DNS:fastly.picsum.photos',
    ], { stdio: 'ignore' })
  } catch (error) {
    throw new Error(`picsum fixture certificate generation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  const server = https.createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, (req, res) => {
    res.writeHead(200, { 'content-type': 'image/png', 'access-control-allow-origin': '*', 'cache-control': 'no-store' })
    res.end(PICSUM_FIXTURE_PNG)
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const port = server.address()?.port
  if (typeof port !== 'number') throw new Error('picsum fixture server failed to bind')
  server.unref()
  const close = () => {
    try { server.close() } catch { /* best effort */ }
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* best effort */ }
    picsumFixture = null
  }
  picsumFixture = { port, close }
  process.once('exit', close)
  return picsumFixture
}

/** Local port of the HTTPS fixture that receives the `fastly.picsum.photos` redirect. */
export function getPicsumFixturePort() {
  if (picsumFixture === null) throw new Error('picsum fixture server is not running; launchChrome must run first')
  return picsumFixture.port
}

/** Launch Chrome through playwright-core (headless by default). */
export async function launchChrome({ explicitPlaywright, executablePath, headless = true, viewport = { width: 1440, height: 900 } } = {}) {
  const { module, version, path: modulePath } = await loadPlaywright(explicitPlaywright)
  if (executablePath !== undefined && !existsSync(executablePath)) {
    throw new Error(`Chrome executable not found: ${executablePath}`)
  }
  const fixture = await startPicsumFixture()
  const browser = await module.chromium.launch({
    ...(executablePath === undefined ? { channel: 'chrome' } : { executablePath }),
    headless,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-crash-reporter',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--force-color-profile=srgb',
      '--ignore-certificate-errors',
      // A system HTTP(S) proxy must not capture the loopback redirect fixture.
      // This is a local-only acceptance run; the Openverse canary stays warn-only.
      '--no-proxy-server',
      `--host-resolver-rules=MAP fastly.picsum.photos 127.0.0.1:${fixture.port}`,
    ],
  })
  const chromeVersion = browser.version()
  return { browser, playwrightVersion: version, playwrightPath: modulePath, chromeVersion, defaultViewport: viewport }
}
