/**
 * Playwright browser helpers for the Web-profile acceptance harness.
 *
 * The app performs its own auth on the single `GET /?token=…`: Playwright must
 * navigate to the printed URL exactly once, then everything else is same-origin
 * (fetch/XHR/WebSocket) and the signed cookie is carried by the context.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { LABELS, labelsFor } from './labels.mjs'
import { ensureDir, oneLine, pngColorStats, redact, sleep } from './util.mjs'

/** Attach network/console recorders; every array is plain JSON. */
export function attachRecorders(page, { baseUrl, pluginId }) {
  const record = {
    console: [],
    pageErrors: [],
    requestFailed: [],
    httpErrors: [],
    liveryResponses: [],
    allResponses: [],
    requests: [],
    startedAt: new Date().toISOString(),
  }
  const isLiveryOwned = (url) => {
    try {
      const pathname = new URL(url).pathname
      return pathname.startsWith('/livery/') || pathname.startsWith(`/plugins/${pluginId}/`) || pathname.includes('dsh-livery')
    } catch {
      return false
    }
  }
  page.on('console', (message) => {
    const entry = {
      type: message.type(),
      text: oneLine(redact(message.text()), 800),
      location: message.location(),
      liveryOwned: isLiveryOwned(message.location()?.url ?? ''),
    }
    record.console.push(entry)
  })
  page.on('pageerror', (error) => {
    record.pageErrors.push({ message: oneLine(redact(error?.message ?? String(error)), 1200), stack: redact(error?.stack ?? '') })
  })
  page.on('requestfailed', (request) => {
    record.requestFailed.push({
      url: redact(request.url()),
      method: request.method(),
      failure: request.failure()?.errorText ?? null,
      liveryOwned: isLiveryOwned(request.url()),
    })
  })
  page.on('request', (request) => {
    if (record.requests.length < 4000) record.requests.push({ url: redact(request.url()), method: request.method(), resourceType: request.resourceType() })
  })
  page.on('response', (response) => {
    const url = response.url()
    const status = response.status()
    const entry = { url: redact(url), status, contentType: response.headers()['content-type'] ?? null }
    if (record.allResponses.length < 4000) record.allResponses.push(entry)
    if (status >= 400) record.httpErrors.push({ ...entry, liveryOwned: isLiveryOwned(url) })
    if (isLiveryOwned(url)) record.liveryResponses.push(entry)
  })
  return record
}

/** Create an isolated browser context + page for one locale/colour-scheme pass. */
export async function newSession(browser, {
  baseUrl,
  pluginId = 'dsh-livery',
  locale = 'zh',
  colorScheme = 'light',
  viewport = { width: 1440, height: 900 },
  recordFirstPaint = true,
  extraHTTPHeaders = undefined,
} = {}) {
  const context = await browser.newContext({
    viewport,
    locale: locale === 'zh' ? 'zh-CN' : 'en-US',
    colorScheme,
    extraHTTPHeaders,
    permissions: [],
  })
  const page = await context.newPage()
  const record = attachRecorders(page, { baseUrl, pluginId })
  if (recordFirstPaint) await installFirstPaintRecorder(page)
  return { context, page, record }
}

/**
 * Sample `body` computed state on every animation frame from the very first
 * one. This is the colour evidence for the "no stock-style first frame" check:
 * the rAF callback can only run after the frame that produced it was painted.
 */
export async function installFirstPaintRecorder(page) {
  await page.addInitScript(() => {
    // Track whole-document MutationObservers created by any plugin. Comparing
    // the count between the stock boot and the livery-active boot proves the
    // livery adds no document-wide observer (docs/design/implementation-plan.md §18.3/§20).
    const NativeObserver = window.MutationObserver
    const observerStats = { wholeDocument: 0, liveryAttributed: 0, materializing: false, observations: [] }
    window.__LIVERY_OBSERVERS__ = observerStats
    // Multiple client modules ship inside one combined batch script URL, so a
    // stack frame cannot name the owning package. Wrap the loader registration
    // instead: observers created synchronously while the Livery factory
    // materializes are attributable even with shared batch URLs.
    try {
      let loaderValue
      Object.defineProperty(window, '__ModuleLoader__', {
        configurable: true,
        get() { return loaderValue },
        set(value) {
          loaderValue = value
          try {
            if (value && typeof value.load === 'function' && !value.__liveryAttributionWrapped) {
              const originalLoad = value.load.bind(value)
              value.load = (registration) => {
                let wrapped = registration
                try {
                  const id = typeof registration?.id === 'string' ? registration.id.replace(/\/client$/, '') : ''
                  if (id === 'dsh-livery' && typeof registration.factory === 'function') {
                    const factory = registration.factory
                    wrapped = {
                      ...registration,
                      factory: (require) => {
                        observerStats.materializing = true
                        try {
                          return factory(require)
                        } finally {
                          observerStats.materializing = false
                        }
                      },
                    }
                  }
                } catch {
                  wrapped = registration
                }
                return originalLoad(wrapped)
              }
              value.__liveryAttributionWrapped = true
            }
          } catch {
            /* wrapping is diagnostics only */
          }
        },
      })
    } catch {
      /* non-configurable loader in a future host build: delta check still works */
    }
    if (typeof NativeObserver === 'function') {
      window.MutationObserver = class LiveryTrackedMutationObserver extends NativeObserver {
        observe(target, options) {
          try {
            if (target === document || target === document.documentElement || target === document.body) {
              // Attribute the observer to its creator: the shell itself installs
              // document-level observers, so only a stack naming the Livery
              // bundle counts against the livery.
              const stack = String(new Error().stack ?? '')
              const liveryAttributed = observerStats.materializing === true
                || /\/plugins\/\?\?dsh-livery\/client\.js/.test(stack)
                || /\/plugins\/dsh-livery\/client\.js/.test(stack)
              if (liveryAttributed) observerStats.liveryAttributed += 1
              observerStats.wholeDocument += 1
              observerStats.observations.push({
                target: target === document ? 'document' : target === document.documentElement ? 'html' : 'body',
                t: Math.round(performance.now()),
                liveryAttributed,
                stack: stack.split('\n').slice(1, 6).map((line) => line.trim()).join(' | ').slice(0, 500),
              })
            }
          } catch {
            /* tracking must never break the page */
          }
          return super.observe(target, options)
        }
      }
    }
    const samples = []
    const recorder = { samples, startedAt: performance.now() }
    window.__LIVERY_FIRST_PAINT__ = recorder
    const sample = (timestamp) => {
      if (document.body) {
        const computed = getComputedStyle(document.body)
        const styleElements = [...document.querySelectorAll('style[id^="dsh-livery"]')]
        samples.push({
          t: Math.round(timestamp),
          htmlLang: document.documentElement.lang || null,
          themeSource: document.documentElement.getAttribute('data-ds-theme-source'),
          dark: document.body.hasAttribute('data-ds-dark-theme'),
          attr: document.body.getAttribute('data-dsh-livery'),
          hash: document.body.getAttribute('data-dsh-livery-hash'),
          tokenBg: computed.getPropertyValue('--dsw-alias-bg-base').trim(),
          bg: computed.backgroundColor,
          bootStyle: Boolean(document.getElementById('dsh-livery-boot')),
          liveryStyles: styleElements.length,
        })
      }
      if (samples.length < 240) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
}

/** Read the first-paint rAF samples recorded for the current document. */
export async function readFirstPaintSamples(page) {
  return page.evaluate(() => window.__LIVERY_FIRST_PAINT__ ?? null)
}

/** Whole-document MutationObserver attribution recorded for this document. */
export async function readObserverReport(page) {
  return page
    .evaluate(() => {
      const stats = window.__LIVERY_OBSERVERS__
      if (!stats) return { wholeDocument: 0, liveryAttributed: 0, observations: [] }
      return { wholeDocument: stats.wholeDocument, liveryAttributed: stats.liveryAttributed, observations: stats.observations }
    })
    .catch(() => ({ wholeDocument: 0, liveryAttributed: 0, observations: [] }))
}

/** Navigation timing + paint entries for the current document. */
export async function readPaintTimings(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const paint = Object.fromEntries(performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime]))
    return {
      timeOrigin: performance.timeOrigin,
      responseStart: nav?.responseStart ?? null,
      domContentLoaded: nav?.domContentLoadedEventEnd ?? null,
      load: nav?.loadEventEnd ?? null,
      firstPaint: paint['first-paint'] ?? null,
      firstContentfulPaint: paint['first-contentful-paint'] ?? null,
      duration: nav?.duration ?? null,
    }
  })
}

/** Navigate to the printed token URL exactly once. */
export async function bootstrapPage(page, tokenUrl, { timeoutMs = 60_000 } = {}) {
  const started = Date.now()
  await page.goto(tokenUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
  return {
    requestedUrl: redact(tokenUrl),
    finalUrl: page.url(),
    tokenDropped: !page.url().includes('token='),
    navigationMs: Date.now() - started,
  }
}

/** Wait until the shell has published its boot graph. */
export async function waitForBootGraph(page, { timeoutMs = 30_000 } = {}) {
  await page.waitForFunction(
    () => typeof window.__DSH_BOOT__ === 'object' && window.__DSH_BOOT__ !== null,
    undefined,
    { timeout: timeoutMs },
  )
  return page.evaluate(() => {
    const boot = window.__DSH_BOOT__
    return {
      rev: boot.rev ?? null,
      entries: (boot.entries ?? []).map((entry) => ({ id: entry.id, url: entry.url ?? null })),
      batches: (boot.batches ?? []).map((batch) => ({ entries: (batch.entries ?? []).map((entry) => entry.id ?? entry) })),
      raw: JSON.stringify(boot).length,
    }
  })
}

/** Dismiss the first-run welcome notice / API-key onboarding overlays. */
export async function dismissFirstRunDialogs(page, { maxRounds = 8 } = {}) {
  const dismissed = []
  const words = [
    '继续', '稍后配置', '保存并继续', '关闭', '取消', '稍后', '跳过',
    'Continue', 'Configure later', 'Save and continue', 'Later', 'Skip', 'Close', 'Cancel', 'Got it', 'Dismiss',
  ]
  const maskCount = () =>
    page
      .evaluate(() => {
        const isVisible = (element) => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
        }
        return [...document.querySelectorAll('[aria-hidden="true"], [role="presentation"]')].filter((element) => {
          if (!isVisible(element)) return false
          return Boolean(element.querySelector('button, [role="button"]'))
        }).length
      })
      .catch(() => 0)
  for (let round = 0; round < maxRounds; round += 1) {
    if ((await maskCount()) === 0) break
    // Escape is the least invasive dismissal for onboarding/notice modals; only
    // fall back to clicking known dismiss labels when it does not work.
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(250)
    if ((await maskCount()) === 0) {
      dismissed.push('Escape')
      continue
    }
    const clicked = await page.evaluate((candidateWords) => {
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      }
      const matches = (element) => {
        const texts = [
          (element.textContent ?? '').trim(),
          element.getAttribute('aria-label') ?? '',
          element.getAttribute('title') ?? '',
        ]
        return texts.some((text) => candidateWords.includes(text.trim()))
      }
      const masks = [...document.querySelectorAll('[aria-hidden="true"], [role="presentation"]')].filter(isVisible)
      const scopes = masks.length ? masks.map((mask) => mask.parentElement).filter(Boolean) : [document]
      for (const scope of scopes) {
        const button = [...scope.querySelectorAll('button, [role="button"]')].find((candidate) => isVisible(candidate) && matches(candidate))
        if (button) {
          button.click()
          return (button.textContent ?? '').trim() || button.getAttribute('aria-label') || 'button'
        }
      }
      return null
    }, words)
    if (!clicked) break
    dismissed.push(clicked)
    await sleep(500)
  }
  return dismissed
}

/** Wait for the application shell to mount. */
export async function waitForAppReady(page, { timeoutMs = 30_000 } = {}) {
  await page.waitForFunction(
    () => Boolean(document.querySelector('button[aria-label], main, [data-slot]')) && (document.body?.innerText ?? '').length > 0,
    undefined,
    { timeout: timeoutMs },
  )
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    bodyTextLength: document.body.innerText.length,
    themeSource: document.documentElement.getAttribute('data-ds-theme-source'),
  }))
}

/** The shell's settings trigger button. */
export function settingsTrigger(page) {
  return page.locator('button[aria-label="设置"], button[aria-label="Settings"]').first()
}

/**
 * The settings dialog specifically: the shell renders it as a `role=dialog`
 * containing the section `<nav>`. Onboarding/preview modals are also dialogs but
 * have no nav, so matching on `:has(nav)` keeps automation from grabbing them.
 */
export function settingsDialog(page) {
  return page.locator('[role="dialog"]').filter({ has: page.locator('nav') })
}

/** Dismiss stray overlay dialogs (onboarding / welcome) that would block clicks. */
async function clearOverlayDialogs(page) {
  for (let round = 0; round < 3; round += 1) {
    const stray = page.locator('[role="dialog"]')
    if (!(await stray.count())) return
    const withoutNav = page.locator('[role="dialog"]').filter({ hasNot: page.locator('nav') })
    if (!(await withoutNav.count())) return
    await dismissFirstRunDialogs(page)
    await sleep(250)
  }
}

/**
 * Keyboard shortcut recorded by the settings launcher (Alt+Meta+, on the shell).
 * Kept as a last-resort path for shells that move Settings behind a menu.
 */
const SETTINGS_SHORTCUT_MAC = 'Meta+,';

/**
 * Open the settings dialog, trying the launcher shapes used across certified
 * shell versions and recording which path succeeded.
 *
 * 0.2.0-rc.2 exposed a direct `settings.trigger` button (aria-label 设置/Settings).
 * 0.2.1 moved Settings behind the sidebar account menu
 * (`[data-slot="sidebar.settings"] button[aria-haspopup="menu"]`, aria-label 账号菜单).
 */
export async function openSettingsDetailed(page, { timeoutMs = 20_000 } = {}) {
  await dismissFirstRunDialogs(page)
  await clearOverlayDialogs(page)
  const existing = settingsDialog(page).first()
  if (await existing.count()) {
    if (await existing.isVisible().catch(() => false)) return { dialog: existing, via: 'already-open' }
  }

  const tryDirectTrigger = async () => {
    const trigger = settingsTrigger(page)
    if (!(await trigger.count())) return false
    try {
      await trigger.click({ timeout: Math.min(timeoutMs, 6_000) })
    } catch {
      await trigger.evaluate((element) => element.click()).catch(() => {})
    }
    return await waitForSettingsDialog(page, timeoutMs)
  }

  const accountMenuTrigger = page
    .locator('[data-slot="sidebar.settings"] button[aria-haspopup="menu"], button[aria-label="账号菜单"], button[aria-label="Account menu"]')
    .first()
  const tryAccountMenu = async () => {
    if (!(await accountMenuTrigger.count())) return false
    try {
      await accountMenuTrigger.click({ timeout: Math.min(timeoutMs, 6_000) })
    } catch {
      await accountMenuTrigger.evaluate((element) => element.click()).catch(() => {})
    }
    await sleep(400)
    const menuItem = page
      .getByRole('menuitem', { name: /设置|Settings/ })
      .first()
    const textItem = page.locator('[role="menu"] >> text=/设置|Settings/').first()
    for (const candidate of [menuItem, textItem]) {
      if (await candidate.count().catch(() => 0)) {
        try {
          await candidate.click({ timeout: Math.min(timeoutMs, 6_000) })
        } catch {
          await candidate.evaluate((element) => element.click()).catch(() => {})
        }
        if (await waitForSettingsDialog(page, timeoutMs)) return true
      }
    }
    // Menu opened but no matching item: close it before the next strategy.
    await page.keyboard.press('Escape').catch(() => {})
    return false
  }

  const tryKeyboardShortcut = async () => {
    await page.keyboard.press(SETTINGS_SHORTCUT_MAC).catch(() => {})
    return waitForSettingsDialog(page, Math.min(timeoutMs, 8_000))
  }

  for (const [via, attempt] of [
    ['account-menu', tryAccountMenu],
    ['direct-trigger', tryDirectTrigger],
    ['keyboard-shortcut', tryKeyboardShortcut],
  ]) {
    if (await attempt()) return { dialog: settingsDialog(page).first(), via }
  }
  throw new Error('settings trigger button not found (tried account menu, direct settings trigger and keyboard shortcut)')
}

async function waitForSettingsDialog(page, timeoutMs) {
  const dialog = settingsDialog(page).first()
  try {
    await dialog.waitFor({ state: 'visible', timeout: Math.min(timeoutMs, 10_000) })
    return true
  } catch {
    return false
  }
}

/** Open the settings dialog; returns a locator for it. */
export async function openSettings(page, options = {}) {
  const { dialog } = await openSettingsDetailed(page, options)
  return dialog
}

/** Close the settings dialog if it is open. */
export async function closeSettings(page) {
  const dialog = settingsDialog(page).first()
  if (!(await dialog.count())) return false
  const close = dialog.getByRole('button', { name: /^(关闭|Close)$/ }).first()
  if (await close.count()) await close.click().catch(() => {})
  await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 10_000 }).catch(() => {})
  return true
}

/** Settings dialog navigation buttons. */
export function settingsNav(page) {
  const dialog = settingsDialog(page).first()
  const nav = dialog.locator('nav').first()
  return { dialog, nav }
}

const LIVERY_MARKERS = [
  '[data-testid="livery-section"]',
  '[data-testid="livery-gallery"]',
  '[data-livery-id]',
  '[data-testid="livery-card"]',
  'img[src*="/livery/assets/previews/"]',
]

/**
 * Find and open the Livery section inside the settings dialog.
 *
 * Strategy: click the nav entry whose label matches the documented copy, then
 * fall back to probing every nav entry for Livery-specific DOM markers (this
 * keeps the check working if the localized label drifts).
 */
export async function findLiverySection(page, { labels = LABELS.zh, catalog, locale = 'zh', timeoutMs = 20_000 } = {}) {
  const { dialog, nav } = settingsNav(page)
  const navCount = await nav.count()
  if (!navCount) throw new Error('settings dialog has no <nav> element')
  const buttons = nav.locator('button')
  const count = await buttons.count()
  const tried = []
  const marker = async () =>
    page.evaluate((markers) => {
      const dialogElement = [...document.querySelectorAll('[role="dialog"]')].find((element) => element.querySelector('nav')) ?? null
      if (!dialogElement) return null
      for (const selector of markers) {
        const nodes = dialogElement.querySelectorAll(selector)
        if (nodes.length) {
          const section = nodes[0].closest('[data-testid="livery-section"]') ?? nodes[0]
          return { selector, count: nodes.length, text: (section.textContent ?? '').slice(0, 200) }
        }
      }
      const firstLiveryName = window.__LIVERY_SECTION_PROBE__?.name
      if (firstLiveryName && (dialogElement.textContent ?? '').includes(firstLiveryName)) {
        return { selector: 'text:' + firstLiveryName, count: 1, text: firstLiveryName }
      }
      return null
    }, LIVERY_MARKERS)

  // Priority 1: documented localized label.
  for (let i = 0; i < count; i += 1) {
    const text = oneLine(await buttons.nth(i).innerText().catch(() => ''), 80)
    if (text === labels.section) {
      await buttons.nth(i).click()
      await sleep(250)
      const found = await marker()
      tried.push({ index: i, label: text, found: Boolean(found) })
      if (found) return { found: true, navIndex: i, navLabel: text, marker: found }
    }
  }
  // Priority 2: probe every nav entry for Livery markers.
  for (let i = 0; i < count; i += 1) {
    const text = oneLine(await buttons.nth(i).innerText().catch(() => ''), 80)
    if (tried.some((entry) => entry.index === i)) continue
    await buttons.nth(i).click()
    await sleep(300)
    const found = await marker()
    tried.push({ index: i, label: text, found: Boolean(found) })
    if (found) return { found: true, navIndex: i, navLabel: text, marker: found }
  }
  return { found: false, tried }
}

// ---------------------------------------------------------------------------
// Main-panel navigation (sidebar.panellist + `main` keyed panel page)
//
// Layout shell (verified DSH 0.2.1-rc.2 base install):
//   <div data-slot="sidebar">
//     <nav class="…_panelList" aria-label="全局面板">
//       <button class="…_panelRow" aria-label="插件"><div data-slot="sidebar.panellist">…</div>…</button>
//     </nav>
//     <div data-slot="sidebar.workspaces">…</div>
//   </div>
// Selected row: aria-current="page" + active class. The `main` keyed slot
// replaces the conversation under <div data-slot="main">.
// ---------------------------------------------------------------------------

/** The left sidebar root. */
export function sidebarRoot(page) {
  return page.locator('[data-slot="sidebar"]').first()
}

/** The global panel list navigation inside the sidebar. */
export function sidebarPanelNav(page) {
  return page.locator('[data-slot="sidebar"] nav[aria-label="全局面板"], [data-slot="sidebar"] nav[aria-label="Global panels"]').first()
}

/** Every registered panellist row (buttons inside the panel list nav). */
export function sidebarPanellistRows(page) {
  return sidebarPanelNav(page).locator('button')
}

/** The Livery main-panel page root (new marker, legacy settings content root, or shell marker). */
export function liveryPanelRoot(page) {
  return page
    .locator('[data-slot="main"] [data-testid="livery-panel"], [data-slot="main"] [data-testid="livery-section"], [data-slot="main"] [data-plugin-panel="true"]')
    .first()
}

/** Structured snapshot of the sidebar panel list plus the workspace section. */
export async function inspectPanellist(page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector('[data-slot="sidebar"]')
    if (!sidebar) return { found: false, rows: [] }
    const nav = sidebar.querySelector('nav[aria-label="全局面板"], nav[aria-label="Global panels"], nav')
    const workspaces = sidebar.querySelector('[data-slot="sidebar.workspaces"]')
    const rows = [...(nav?.querySelectorAll('button') ?? [])].map((button, index) => {
      const rect = button.getBoundingClientRect()
      return {
        index,
        label: (button.textContent ?? '').trim(),
        ariaLabel: button.getAttribute('aria-label'),
        selected: button.getAttribute('aria-current') === 'page',
        hasPanellistSlot: Boolean(button.querySelector('[data-slot="sidebar.panellist"]')),
        hasIcon: Boolean(button.querySelector('svg')),
        top: Math.round(rect.top),
        height: Math.round(rect.height),
      }
    })
    const workspacesRect = workspaces?.getBoundingClientRect()
    return {
      found: true,
      rows,
      workspacesPresent: Boolean(workspaces),
      workspacesTop: workspacesRect ? Math.round(workspacesRect.top) : null,
      workspacesHeight: workspacesRect ? Math.round(workspacesRect.height) : null,
      /** DOM order: does the panellist nav precede the workspace section? */
      navBeforeWorkspaces: Boolean(nav && workspaces && (nav.compareDocumentPosition(workspaces) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0),
    }
  })
}

/** `openLiveryDetailed` path value for the sidebar panellist entry. */
export const PANEL_NAV_VIA = 'sidebar-panellist'

/** Candidate labels for the Livery row in either shipped locale. */
function panellistLabels(labels, locale) {
  const candidates = [labels?.section, LABELS.zh.section, LABELS.en.section].filter(Boolean)
  return [...new Set(candidates)]
}

/** Whether the main column currently shows the Livery panel page. */
export async function liveryPanelVisible(page) {
  const root = liveryPanelRoot(page)
  return (await root.count().catch(() => 0)) > 0 && (await root.isVisible().catch(() => false))
}

/**
 * Open the Livery main panel through the sidebar panellist row.
 *
 * Records which path succeeded (`sidebar-panellist` for certified hosts, or
 * `settings-fallback` for pre-panel-navigation hosts), the row order, the
 * resolved locale label and whether the conversation was replaced.
 */
export async function openLiveryDetailed(page, { labels = LABELS.zh, locale = 'zh', timeoutMs = 25_000 } = {}) {
  await dismissFirstRunDialogs(page)
  await clearOverlayDialogs(page)
  if (await liveryPanelVisible(page)) {
    const panellist = await inspectPanellist(page)
    const selected = panellist.rows.find((row) => row.selected) ?? null
    return { via: 'already-open', row: selected, panellist }
  }
  const before = await inspectPanellist(page)
  const candidates = panellistLabels(labels, locale)
  const nav = sidebarPanelNav(page)
  let rowIndex = -1
  let rowLabel = null
  if ((await nav.count().catch(() => 0)) > 0) {
    const buttons = nav.locator('button')
    const count = await buttons.count().catch(() => 0)
    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index)
      const aria = await button.getAttribute('aria-label').catch(() => null)
      const text = ((await button.innerText().catch(() => '')) || '').trim()
      const matches = candidates.some((candidate) => aria === candidate || text === candidate)
      if (!matches) continue
      rowIndex = index
      rowLabel = aria ?? text
      try {
        await button.click({ timeout: Math.min(timeoutMs, 8_000) })
      } catch {
        await button.evaluate((element) => element.click()).catch(() => {})
      }
      break
    }
  }
  if (rowIndex === -1) {
    // Legacy hosts without panel navigation register a settings.section page.
    if (!(await settingsDialog(page).count())) {
      try {
        await openSettingsDetailed(page)
        const section = await findLiverySection(page, { labels, locale, timeoutMs })
        if (section.found) return { via: 'settings-fallback', row: null, panellist: before, section }
      } catch {
        /* fall through to the error below */
      }
    }
    throw new Error(`Livery panellist row not found in the sidebar (labels tried: ${candidates.join(' / ')}); rows: ${before.rows.map((row) => row.ariaLabel ?? row.label).join(', ') || '(none)'}`)
  }
  // Selected row state and the main column swap are both observable shell facts.
  const selected = await page
    .waitForFunction(
      (index) => {
        const sidebar = document.querySelector('[data-slot="sidebar"]')
        const buttons = [...(sidebar?.querySelectorAll('nav button') ?? [])]
        return buttons[index]?.getAttribute('aria-current') === 'page'
      },
      rowIndex,
      { timeout: Math.min(timeoutMs, 10_000) },
    )
    .then(() => true)
    .catch(() => false)
  await page
    .waitForFunction(
      () => Boolean(document.querySelector('[data-slot="main"] [data-testid="livery-panel"], [data-slot="main"] [data-testid="livery-section"]')),
      undefined,
      { timeout: Math.min(timeoutMs, 15_000) },
    )
    .catch(() => {})
  const after = await inspectPanellist(page)
  return {
    via: 'sidebar-panellist',
    row: after.rows[rowIndex] ?? null,
    rowIndex,
    rowLabel,
    selected,
    panellistBefore: before,
    panellist: after,
  }
}

/** Open the Livery main panel; returns the page locator. */
export async function openLivery(page, options = {}) {
  const opened = await openLiveryDetailed(page, options)
  if (opened.via === 'settings-fallback') {
    return page.locator('[role="dialog"] [data-testid="livery-section"]').first()
  }
  return liveryPanelRoot(page)
}

/** Return from the Livery panel to the conversation (New Session / 新会话). */
export async function returnToConversation(page) {
  const button = page.locator('button[aria-label="新建会话"], button[aria-label="New session"], button[aria-label="新会话"]').first()
  if (await button.count().catch(() => 0)) {
    await button.click({ timeout: 8_000 }).catch(() => {})
    await sleep(400)
  }
}

/** Renderer facts proving the panel replaced the conversation in the main column. */
export async function readMainColumnState(page) {
  return page.evaluate(() => {
    const main = document.querySelector('[data-slot="main"]')
    const livery = document.querySelector('[data-slot="main"] [data-testid="livery-panel"], [data-slot="main"] [data-testid="livery-section"]')
    const selectedRow = [...document.querySelectorAll('[data-slot="sidebar"] nav button')].find((button) => button.getAttribute('aria-current') === 'page')
    const mainText = main?.innerText ?? ''
    const editables = [...(main?.querySelectorAll('textarea, input, [contenteditable="true"], [role="textbox"]') ?? [])].filter((element) => {
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    const composerHint = editables.some((element) =>
      /描述你想要构建|构建的内容|What do you want to build|Describe (what|your)|Send a message/i.test(
        `${element.getAttribute('placeholder') ?? ''} ${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('data-placeholder') ?? ''}`,
      ),
    )
    // The conversation surface shows the empty-new-session copy when no session
    // content exists; panel pages replace it entirely.
    const conversationCopy = /探索未至之境|Start exploring|描述你想要构建的内容|What do you want to build/i.test(mainText)
    return {
      mainPresent: Boolean(main),
      mainChildCount: main ? main.children.length : 0,
      liveryPanelVisible: Boolean(livery) && (livery.getBoundingClientRect().width > 0),
      selectedRowLabel: selectedRow ? (selectedRow.getAttribute('aria-label') ?? (selectedRow.textContent ?? '').trim()) : null,
      conversationComposerVisible: composerHint || conversationCopy,
      conversationCopyVisible: conversationCopy,
      editableCount: editables.length,
      liveryPanelCount: document.querySelectorAll('[data-slot="main"] [data-testid="livery-panel"], [data-slot="main"] [data-testid="livery-section"]').length,
      panelTitle: (document.querySelector('[data-slot="main"] [data-testid="livery-panel"] h1')?.textContent ?? document.querySelector('[data-slot="main"] h1')?.textContent ?? '').trim(),
      bodyTextStart: (document.body.innerText ?? '').slice(0, 160),
    }
  })
}

/** Labels rendered by the settings dialog navigation (used to prove the old section is gone). */
export async function readSettingsSectionLabels(page) {
  const { nav } = settingsNav(page)
  if (!(await nav.count().catch(() => 0))) return []
  return nav.locator('button').allInnerTexts().catch(() => [])
}

/**
 * Host-level style probe (style-system v2 acceptance).
 *
 * Reads the documented style token families from the CSS cascade on `body` plus
 * the computed shape/elevation/material/font facts of stable host nodes
 * (composer shell, send button, new-session button, sidebar panel row, the
 * Livery panel/card). Used to prove that visually distinct liveries really
 * change the host UI, not just a stylesheet's token text.
 */
export async function readHostStyleProbe(page) {
  return page.evaluate(() => {
    const STYLE_TOKENS = [
      '--dsw-radius-xs', '--dsw-radius-sm', '--dsw-radius-md', '--dsw-radius-lg', '--dsw-radius-xl',
      '--dsw-radius-panel', '--dsw-corner-shape',
      '--dsw-shadow-lv1', '--dsw-shadow-lv1-blur', '--dsw-shadow-lv2', '--dsw-shadow-lv3',
      '--dsw-elevation-panel', '--dsw-elevation-prominent', '--dsw-elevation-soft',
      '--dsw-elevation-stroke', '--dsw-elevation-stroke-color',
      '--dsw-menu-backdrop-filter', '--dsw-mask-blur', '--dsw-focus-ring-width',
      '--dsw-font-family', '--dsh-font-family-text', '--dsh-font-family-code',
      '--dsw-font-s-14', '--dsw-font-l-20', '--dsw-font-family-brand',
    ]
    const bodyStyle = getComputedStyle(document.body)
    const tokens = {}
    for (const name of STYLE_TOKENS) tokens[name] = bodyStyle.getPropertyValue(name).trim()
    const isVisible = (element) => {
      if (!element) return false
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    const describe = (element, label) => {
      if (!element || !isVisible(element)) return null
      const style = getComputedStyle(element)
      return {
        label,
        tag: element.tagName.toLowerCase(),
        radius: style.borderRadius,
        boxShadow: style.boxShadow,
        backdropFilter: style.backdropFilter,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
      }
    }
    const firstVisible = (selector) => [...document.querySelectorAll(selector)].find((element) => isVisible(element)) ?? null
    const elements = {}
    const composer = firstVisible('textarea, [contenteditable="true"], [role="textbox"]')
    elements.composer = describe(composer, 'composer')
    if (composer) {
      let shell = composer
      for (let depth = 0; depth < 5 && shell; depth += 1) {
        const radius = getComputedStyle(shell).borderRadius
        if (radius && radius !== '0px' && radius !== '0') break
        shell = shell.parentElement
      }
      elements.composerShell = describe(shell, 'composerShell')
    }
    elements.sendButton = describe(firstVisible('button[aria-label="发送消息"], button[aria-label="Send message"]'), 'sendButton')
    elements.newSessionButton = describe(firstVisible('button[aria-label="新建会话"], button[aria-label="New session"], button[aria-label="新会话"]'), 'newSessionButton')
    elements.navRow = describe(firstVisible('[data-slot="sidebar"] nav button'), 'navRow')
    elements.liveryPanel = describe(firstVisible('[data-testid="livery-panel"]'), 'liveryPanel')
    elements.liveryCard = describe(firstVisible('[data-testid="livery-card"]'), 'liveryCard')
    return {
      url: location.href,
      bodyFontFamily: bodyStyle.fontFamily,
      bodyBackground: bodyStyle.backgroundColor,
      tokens,
      elements,
    }
  })
}

/** Gallery cards (stock card included), via the stable test hooks. */
export function galleryCards(page) {
  const cards = page.locator('[data-testid="livery-card"][data-livery-id]')
  return cards
}

/** Card ids/states/thumb state for the current gallery. */
export async function readGallery(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid="livery-card"][data-livery-id]')]
    return cards.map((card) => {
      const thumb = card.querySelector('[data-testid="livery-thumb"], img')
      return {
        id: card.getAttribute('data-livery-id'),
        state: card.getAttribute('data-state'),
        selected: card.getAttribute('aria-selected'),
        tagText: (card.textContent ?? '').trim().slice(0, 160),
        thumb: thumb
          ? {
              tag: thumb.tagName.toLowerCase(),
              src: thumb.getAttribute('src'),
              complete: thumb.complete ?? null,
              naturalWidth: thumb.naturalWidth ?? null,
            }
          : null,
        focusable: card.tabIndex >= 0 || card.hasAttribute('tabindex') || card.matches('[role="option"], [role="radio"], button'),
      }
    })
  })
}

/**
 * Gallery preview-language tab (round 6): group + segmented buttons with
 * `aria-pressed`, and the thumbnail URLs the tab controls.
 */
export async function readLocaleTab(page) {
  return page.evaluate(() => {
    const group = document.querySelector('[data-testid="livery-locale-tab"]')
    if (!group) return { found: false }
    const buttons = [...group.querySelectorAll('button[data-testid^="livery-locale-"]')].map((button) => ({
      choice: (button.getAttribute('data-testid') ?? '').replace(/^livery-locale-/, ''),
      text: (button.textContent ?? '').trim(),
      pressed: button.getAttribute('aria-pressed') === 'true',
    }))
    return {
      found: true,
      role: group.getAttribute('role'),
      ariaLabel: group.getAttribute('aria-label'),
      title: group.getAttribute('title'),
      buttons,
    }
  })
}

/** Visible gallery thumbnail `src` values (one per mounted card). */
export async function readThumbLocales(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="livery-thumb"]')]
      .filter((image) => {
        const rect = image.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
      .map((image) => image.getAttribute('src') ?? ''),
  )
}

/** The `zh`/`en` locale encoded in a preview filename, or null. */
export function thumbLocaleOf(src) {
  const match = String(src ?? '').match(/-(zh|en)-(light|dark)\.svg(?:\?|$)/)
  return match ? match[1] : null
}

/** Wait until every mounted thumbnail points at the requested preview locale. */
export async function waitForThumbLocale(page, locale, { timeoutMs = 12_000 } = {}) {
  await page.waitForFunction(
    (wanted) =>
      [...document.querySelectorAll('[data-testid="livery-thumb"]')]
        .filter((image) => {
          const rect = image.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        })
        .every((image) => new RegExp(`-${wanted}-(light|dark)\\.svg`).test(image.getAttribute('src') ?? '')),
    locale,
    { timeout: timeoutMs },
  )
}

/** Card names/descriptions as rendered (host locale copy must not change). */
export async function readCardNames(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="livery-card"][data-livery-id]')].map((card) => ({
      id: card.getAttribute('data-livery-id'),
      name: (card.querySelector('.livery-card__name')?.textContent ?? '').trim(),
      description: (card.querySelector('.livery-card__desc')?.textContent ?? '').trim(),
    })),
  )
}

/** Locate a control by data-testid and fall back to accessible names. */
export async function findControl(page, { testId, names = [], exact = false, role = 'button' } = {}) {
  if (testId) {
    const byTestId = page.locator(`[data-testid="${testId}"]`).first()
    if (await byTestId.count()) return { locator: byTestId, via: `data-testid=${testId}` }
  }
  for (const name of names) {
    const locator = page.getByRole(role, { name: exact ? name : new RegExp(escapeRegExp(name), 'i') }).first()
    if (await locator.count()) return { locator, via: `role+name "${name}"` }
  }
  return { locator: null, via: null }
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Locate the gallery search input. */
export async function findSearchInput(page, { labels = LABELS.zh } = {}) {
  const byTestId = page.locator('[data-testid="livery-search"]').first()
  if (await byTestId.count()) {
    const tag = await byTestId.evaluate((element) => element.tagName).catch(() => '')
    if (tag === 'INPUT') return { locator: byTestId, via: 'data-testid=livery-search' }
    const inner = byTestId.locator('input').first()
    if (await inner.count()) return { locator: inner, via: 'data-testid=livery-search (inner input)' }
  }
  const candidates = [
    page.getByRole('searchbox').first(),
    page.getByRole('textbox', { name: new RegExp(escapeRegExp(labels.searchName), 'i') }).first(),
    page.getByPlaceholder(labels.searchPlaceholder).first(),
    page.locator('input[type="search"], input[placeholder]').first(),
  ]
  for (const locator of candidates) {
    if (await locator.count()) return { locator, via: 'role/placeholder fallback' }
  }
  return { locator: null, via: null }
}

/** Screenshot helper that records a manifest entry. */
export async function captureScreenshot(page, file, { label, meta = {} } = {}) {
  await ensureDir(path.dirname(file))
  await page.screenshot({ path: file, animations: 'disabled', caret: 'hide' })
  const { readFile } = await import('node:fs/promises')
  const buffer = await readFile(file)
  return { path: file, label, bytes: buffer.length, pixels: pngColorStats(buffer), meta }
}

/**
 * Filmstrip via CDP screencast: real painted frames from before navigation to
 * after ready. Frames are written as PNGs; the returned manifest carries the
 * timestamps so the report can show the first visible paint order.
 */
export async function recordFilmstrip(page, { dir, prefix, action, settleMs = 600, timeoutMs = 60_000 } = {}) {
  await ensureDir(dir)
  const session = await page.context().newCDPSession(page)
  const frames = []
  const startedAt = Date.now()
  let frameIndex = 0
  let stopped = false
  const onFrame = async (frame) => {
    if (stopped) return
    const index = frameIndex
    frameIndex += 1
    const file = path.join(dir, `${prefix}-${String(index).padStart(3, '0')}.png`)
    try {
      await writeFile(file, Buffer.from(frame.data, 'base64'))
      frames.push({ index, file, t: Date.now() - startedAt, timestamp: frame.metadata?.timestamp ?? null })
    } catch {
      /* frame dropped */
    }
    try {
      await session.send('Page.screencastFrameAck', { sessionId: frame.sessionId })
    } catch {
      /* session closed */
    }
  }
  session.on('Page.screencastFrame', (frame) => {
    void onFrame(frame)
  })
  await session.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 1440, maxHeight: 900, quality: 80 })
  let actionResult
  try {
    actionResult = await Promise.race([
      action(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`filmstrip action timed out after ${timeoutMs}ms`)), timeoutMs)),
    ])
    await sleep(settleMs)
  } finally {
    stopped = true
    await session.send('Page.stopScreencast').catch(() => {})
    await session.detach().catch(() => {})
  }
  return {
    prefix,
    dir,
    frames,
    actionResult,
    totalMs: Date.now() - startedAt,
  }
}

/** Snapshot the theme/token state the acceptance checks assert on. */
export async function readThemeSnapshot(page) {
  return page.evaluate(() => {
    const body = document.body
    const canonical = (value) => {
      if (!value) return ''
      const probe = document.createElement('div')
      probe.style.color = value
      probe.style.display = 'none'
      body.appendChild(probe)
      const computed = getComputedStyle(probe).color
      probe.remove()
      return computed
    }
    const computed = getComputedStyle(body)
    const root = getComputedStyle(document.documentElement)
    const readVar = (name) => computed.getPropertyValue(name).trim()
    return {
      url: location.href,
      lang: document.documentElement.lang || null,
      title: document.title,
      themeSource: document.documentElement.getAttribute('data-ds-theme-source'),
      darkAttribute: body.getAttribute('data-ds-dark-theme'),
      bodyAttribute: body.getAttribute('data-dsh-livery'),
      bodyHash: body.getAttribute('data-dsh-livery-hash'),
      attributes: Object.fromEntries([...body.attributes].map((attribute) => [attribute.name, attribute.value])),
      tokens: {
        bgBase: readVar('--dsw-alias-bg-base'),
        bgBaseCanonical: canonical(readVar('--dsw-alias-bg-base')),
        labelPrimary: readVar('--dsw-alias-label-primary'),
        labelPrimaryCanonical: canonical(readVar('--dsw-alias-label-primary')),
        borderL1: readVar('--dsw-alias-border-l1'),
        borderL1Canonical: canonical(readVar('--dsw-alias-border-l1')),
        fontFamily: readVar('--dsw-font-family'),
        fontFamilyCanonical: canonical('inherit') === 'inherit' ? readVar('--dsw-font-family') : '',
        // 0.2.1+ documented role hooks (host-font-role-hooks capability).
        fontRoleText: readVar('--dsh-font-family-text'),
        fontRoleCode: readVar('--dsh-font-family-code'),
        // 0.2.1+ host-resolved code family on body; legacy hosts expose --ds-font-family-code too.
        legacyCodeFamily: readVar('--ds-font-family-code'),
        contentFontSize: readVar('--dsh-content-font-size'),
      },
      bodyFontFamily: computed.fontFamily,
      rootFontFamily: root.fontFamily,
      colorScheme: computed.colorScheme,
      bodyBackgroundColor: computed.backgroundColor,
      // Skin styles are the boot/token/layout/preview elements the Host and
      // Client own by id. The Client bundle's own CSS rides on a style with
      // `data-plugin-css` and no id: it is UI styling, not livery tokens, so it
      // must not be folded into livery-CSS assertions.
      liveryStyles: [...document.querySelectorAll('style[id^="dsh-livery"]')].map((style) => ({
        id: style.id || null,
        plugin: style.getAttribute('data-plugin'),
        css: style.getAttribute('data-plugin-css'),
        bytes: (style.textContent ?? '').length,
        importantCount: ((style.textContent ?? '').match(/!important/g) ?? []).length,
        hashAttribute: style.getAttribute('data-dsh-livery-hash'),
        text: style.textContent ?? '',
      })),
      clientCssStyles: [...document.querySelectorAll('style[data-plugin="dsh-livery"]')]
        .filter((style) => !style.id)
        .map((style) => ({ bytes: (style.textContent ?? '').length, css: style.getAttribute('data-plugin-css') })),
      stockStyleCount: [...document.querySelectorAll('style')].length,
      // Coexistence evidence: every other plugin-owned style element and every
      // body data-* attribute that is neither host-known nor Livery-owned.
      otherPluginStyles: [...document.querySelectorAll('style[data-plugin]')]
        .filter((style) => style.getAttribute('data-plugin') !== 'dsh-livery')
        .map((style) => ({
          plugin: style.getAttribute('data-plugin'),
          id: style.id || null,
          bytes: (style.textContent ?? '').length,
          firstRule: (style.textContent ?? '').slice(0, 160),
        })),
      otherBodyAttributes: [...document.body.attributes]
        .map((attribute) => attribute.name)
        .filter((name) => name.startsWith('data-') && name !== 'data-dsh-livery' && name !== 'data-dsh-livery-hash' && name !== 'data-ds-dark-theme' && name !== 'data-dsh-theme'),
      fonts: {
        cjkPingFang: document.fonts.check('14px "PingFang SC"'),
        cjkHiragino: document.fonts.check('14px "Hiragino Sans GB"'),
        cjkMicrosoftYaHei: document.fonts.check('14px "Microsoft YaHei"'),
        latinHelvetica: document.fonts.check('14px Helvetica'),
        latinSegoeUI: document.fonts.check('14px "Segoe UI"'),
      },
      bootPayload: (() => {
        const payload = window.__DSH_LIVERY_BOOT__
        if (!payload) return null
        return { ...payload, diagnostics: [...(payload.diagnostics ?? [])] }
      })(),
    }
  })
}

/** CSS rules of Livery-owned style elements, analysed in the page's CSSOM. */
export async function readLiveryCssRules(page) {
  return page.evaluate(() => {
    const result = { rules: [], selectorCount: 0, tokenDeclarations: [], errors: [] }
    const styles = [...document.querySelectorAll('style[id^="dsh-livery"]')]
    const walk = (list, sheetLabel) => {
      for (const rule of list) {
        if (rule.cssRules) {
          walk(rule.cssRules, sheetLabel)
          continue
        }
        if (!rule.selectorText || !rule.style) continue
        const selector = rule.selectorText
        const declarations = []
        for (let i = 0; i < rule.style.length; i += 1) {
          const name = rule.style[i]
          if (name.startsWith('--')) declarations.push({ name, value: rule.style.getPropertyValue(name) })
        }
        result.selectorCount += 1
        result.rules.push({ selector, declarations })
        for (const declaration of declarations) result.tokenDeclarations.push({ selector, ...declaration })
      }
    }
    for (const style of styles) {
      try {
        const sheet = style.sheet
        if (!sheet) {
          result.errors.push({ id: style.id, error: 'style.sheet is null' })
          continue
        }
        walk(sheet.cssRules, style.id || style.getAttribute('data-plugin'))
      } catch (error) {
        result.errors.push({ id: style.id, error: String(error) })
      }
    }
    return result
  })
}

/** Clipboard text with permission; falls back to a DOM/toast probe. */
export async function readClipboardText(page) {
  return page.evaluate(async () => {
    try {
      const text = await navigator.clipboard.readText()
      return { ok: true, text }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })
}

export { labelsFor }
