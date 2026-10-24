/**
 * Resolve a `playwright-core` installation without downloading any browser.
 *
 * Priority:
 *   1. `--pw-core` / `PW_CORE` explicit module path
 *   2. the checkout's own `node_modules/playwright-core` (pnpm-linked by the Lead)
 *   3. the npx cache path recorded in docs/research/web-profile-runbook.md
 *   4. a bare `import('playwright-core')` if the package is resolvable anyway
 *
 * The system Chrome (`channel: 'chrome'`) is the only browser we ever launch:
 * Playwright's own browser downloads are never needed by this harness.
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { WORKSPACE_ROOT } from './util.mjs'

const NPX_CACHE_CANDIDATES = [
  path.join(process.env.HOME ?? '', '.npm/_npx/dd6c45a6a1785775/node_modules/playwright-core/index.mjs'),
  '/Users/ryanzhang/.npm/_npx/dd6c45a6a1785775/node_modules/playwright-core/index.mjs',
]

export function playwrightCandidates(explicit) {
  const candidates = []
  if (explicit) candidates.push(path.resolve(explicit))
  if (process.env.PW_CORE) candidates.push(path.resolve(process.env.PW_CORE))
  candidates.push(path.join(WORKSPACE_ROOT, 'node_modules/playwright-core/index.mjs'))
  candidates.push(...NPX_CACHE_CANDIDATES)
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

/** Launch the system Chrome through playwright-core (headless by default). */
export async function launchChrome({ explicitPlaywright, headless = true, viewport = { width: 1440, height: 900 } } = {}) {
  const { module, version, path: modulePath } = await loadPlaywright(explicitPlaywright)
  const browser = await module.chromium.launch({
    channel: 'chrome',
    headless,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-crash-reporter',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--force-color-profile=srgb',
    ],
  })
  const chromeVersion = browser.version()
  return { browser, playwrightVersion: version, playwrightPath: modulePath, chromeVersion, defaultViewport: viewport }
}
