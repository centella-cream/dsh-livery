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
    // livery adds no document-wide observer (IMPLEMENTATION_PLAN.md §18.3/§20).
    const NativeObserver = window.MutationObserver
    const observerStats = { wholeDocument: 0, observations: [] }
    window.__LIVERY_OBSERVERS__ = observerStats
    if (typeof NativeObserver === 'function') {
      window.MutationObserver = class LiveryTrackedMutationObserver extends NativeObserver {
        observe(target, options) {
          try {
            if (target === document || target === document.documentElement || target === document.body) {
              observerStats.wholeDocument += 1
              observerStats.observations.push({
                target: target === document ? 'document' : target === document.documentElement ? 'html' : 'body',
                t: Math.round(performance.now()),
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
  const words = ['继续', '稍后配置', '关闭', '稍后', '跳过', 'Continue', 'Configure later', 'Later', 'Skip', 'Close', 'Got it']
  for (let round = 0; round < maxRounds; round += 1) {
    const clicked = await page.evaluate((candidateWords) => {
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      }
      // Only dismiss things rendered above an aria-hidden mask: never click
      // application buttons that happen to share these words.
      const masks = [...document.querySelectorAll('[aria-hidden="true"]')].filter((element) => /mask|overlay|backdrop/i.test(String(element.className)))
      const scopes = masks.length ? masks.map((mask) => mask.parentElement).filter(Boolean) : [document]
      for (const scope of scopes) {
        const button = [...scope.querySelectorAll('button, [role="button"]')].find((candidate) => {
          if (!isVisible(candidate)) return false
          const text = (candidate.textContent ?? '').trim()
          return candidateWords.includes(text)
        })
        if (button) {
          button.click()
          return (button.textContent ?? '').trim()
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

/** Open the settings dialog; returns a locator for it. */
export async function openSettings(page, { timeoutMs = 20_000 } = {}) {
  await dismissFirstRunDialogs(page)
  await clearOverlayDialogs(page)
  const existing = settingsDialog(page).first()
  if (await existing.count()) {
    if (await existing.isVisible().catch(() => false)) return existing
  }
  const trigger = settingsTrigger(page)
  if (!(await trigger.count())) throw new Error('settings trigger button not found')
  await trigger.click({ timeout: timeoutMs })
  const dialog = settingsDialog(page).first()
  await dialog.waitFor({ state: 'visible', timeout: timeoutMs })
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
