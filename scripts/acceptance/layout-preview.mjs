#!/usr/bin/env node
/**
 * 0.1.4 layout-preview review (verifier-owned, not release evidence).
 *
 * Installs one exact preview tarball through the official plugin manager, boots
 * the DSH 0.2.1-rc.2 Web profile in an isolated home, drives the real Chrome
 * renderer, captures 1440/1024/767 light/dark wallpaper-off/on style+wallpaper
 * screenshots and records DOM/computed layout metrics for the new 0.1.4
 * information architecture.
 */
import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { installPlugin } from './probe/dsh-home.mjs'
import { bootWeb, stopWeb } from './probe/boot.mjs'
import { launchChrome } from './probe/playwright.mjs'
import {
  bootstrapPage,
  dismissFirstRunDialogs,
  newSession,
  openLiveryDetailed,
  waitForAppReady,
  waitForBootGraph,
} from './probe/browser.mjs'
import { ensureDir, sleep } from './probe/util.mjs'

const argv = process.argv.slice(2)
const flag = (name, fallback = undefined) => {
  const index = argv.indexOf(name)
  return index === -1 ? fallback : argv[index + 1]
}
const tgz = path.resolve(flag('--tgz', '.tmp/dsh-livery-0.1.3-layout-preview.tgz'))
const home = path.resolve(flag('--dsh-home', '.tmp/acceptance/layout-preview-home'))
const outDir = path.resolve(flag('--out', 'artifacts/acceptance/0.1.4-layout-preview'))
const chromeBinary = path.resolve(flag('--chrome-binary', '.tmp/acceptance/browsers/chrome-156.0.8078.48/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'))
const expectVersion = flag('--expect-version', '0.2.1-rc.2')

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 800 },
  { width: 767, height: 900 },
]
const THEMES = ['light', 'dark']
const STRIP_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const PICSUM_FIXTURE = Array.from({ length: 12 }, (_, index) => ({ id: String(10 + index), author: 'Tester' }))

const metrics = { generatedAt: new Date().toISOString(), candidate: path.basename(tgz), widths: {}, screenshots: [], checks: [] }
const issues = []
const recordIssue = (severity, id, detail) => issues.push({ severity, id, detail })

await ensureDir(path.join(outDir, 'screens'))
let boot
let browser
let session
try {
  const install = await installPlugin({ home, tgz })
  if (install.exitCode !== 0) throw new Error(`plugin install failed: ${install.stderr || install.stdout}`)
  boot = await bootWeb({ home, port: 0, timeoutMs: 120_000, logPath: path.join(outDir, 'logs', 'web.log') })
  const launched = await launchChrome({ executablePath: chromeBinary })
  browser = launched.browser
  metrics.environment = {
    hostVersion: expectVersion,
    chromeVersion: launched.chromeVersion,
    tarballSha256: install.tarballSha256,
    tarball: path.basename(tgz),
    isolatedHome: path.basename(home),
  }
  session = await newSession(browser, { baseUrl: boot.baseUrl, pluginId: 'dsh-livery', locale: 'zh', viewport: WIDTHS[0] })
  const { page } = session

  // Deterministic, offline online-card fixture with 12 Picsum results (pager).
  await page.route('https://picsum.photos/**', (route) => {
    const url = route.request().url()
    if (url.includes('/v2/list')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PICSUM_FIXTURE), headers: { 'access-control-allow-origin': '*' } })
    }
    return route.fulfill({ status: 200, contentType: 'image/png', body: STRIP_PNG, headers: { 'access-control-allow-origin': '*' } })
  })
  await page.route('https://api.openverse.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }), headers: { 'access-control-allow-origin': '*' } }),
  )
  await page.route('https://images.example.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: STRIP_PNG, headers: { 'access-control-allow-origin': '*' } }),
  )

  await bootstrapPage(page, boot.url)
  await waitForBootGraph(page)
  await waitForAppReady(page)
  await dismissFirstRunDialogs(page)
  await openLiveryDetailed(page, { locale: 'zh' })
  await page.waitForSelector('[data-testid="livery-section"]', { timeout: 20_000 })

  // Apply a livery so the new large hero preview is representative.
  const card = page.locator('[data-testid="livery-card"][data-livery-id="tokyo-night"]').first()
  if ((await card.count()) > 0) {
    await card.click({ timeout: 8_000 })
    await page.waitForSelector('[data-testid="livery-preview"]', { timeout: 10_000 }).catch(() => {})
    // Prove the preview bar + actions live inside the hero before applying.
    const previewMetrics = await page.evaluate(() => {
      const hero = document.querySelector('[data-testid="livery-current-card"]')
      const preview = document.querySelector('[data-testid="livery-preview"]')
      const apply = document.querySelector('[data-testid="livery-apply"]')
      const cancel = document.querySelector('[data-testid="livery-cancel"]')
      return {
        heroContainsPreview: hero !== null && preview !== null && hero.contains(preview),
        heroContainsApply: hero !== null && apply !== null && hero.contains(apply),
        heroContainsCancel: hero !== null && cancel !== null && hero.contains(cancel),
        previewText: (preview?.innerText ?? '').slice(0, 300),
      }
    })
    metrics.previewBar = previewMetrics
    if (!(previewMetrics.heroContainsPreview && previewMetrics.heroContainsApply && previewMetrics.heroContainsCancel)) {
      recordIssue('high', 'preview-actions-outside-hero', 'Preview bar/apply/cancel are not all inside the large current-style hero.')
    }
    await page.setViewportSize(WIDTHS[0])
    await page.evaluate(() => {
      window.scrollTo(0, 0)
      const body = document.querySelector('.livery-panel__body')
      if (body !== null) body.scrollTop = 0
    }).catch(() => {})
    await sleep(200)
    await page.screenshot({ path: path.join(outDir, 'screens', '1440-light-style-preview-bar.png'), animations: 'disabled' });
    metrics.screenshots.push({ file: path.relative(process.cwd(), path.join(outDir, 'screens', '1440-light-style-preview-bar.png')) })
    await page.locator('[data-testid="livery-apply"]').click({ timeout: 8_000 }).catch(() => {})
    await page.waitForFunction(() => document.body.getAttribute('data-dsh-livery') === 'tokyo-night', undefined, { timeout: 20_000 }).catch(() => {})
    await sleep(500)
  }

  const tabStyle = page.locator('[data-testid="livery-page-tab-style"]')
  const tabWallpaper = page.locator('[data-testid="livery-page-tab-wallpaper"]')
  const showStyle = async () => {
    if ((await tabStyle.count()) > 0) await tabStyle.click({ timeout: 8_000 }).catch(() => {})
    await page.waitForSelector('[data-testid="livery-current-card"]', { timeout: 10_000 })
    await sleep(250)
  }
  const showWallpaper = async () => {
    if ((await tabWallpaper.count()) > 0) await tabWallpaper.click({ timeout: 8_000 }).catch(() => {})
    await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 12_000 })
    await sleep(250)
  }
  const setWallpaper = async (on) => {
    await showWallpaper()
    if (on) {
      await page.locator('[data-testid="wallpaper-source-tab-builtin"]').click({ timeout: 8_000 }).catch(() => {})
      await page.locator('[data-testid="wallpaper-builtin"][data-wallpaper-id="aurora"]').click({ timeout: 8_000 })
      await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') !== null, undefined, { timeout: 10_000 }).catch(() => {})
    } else {
      await page.locator('[data-testid="wallpaper-clear"]').click({ timeout: 8_000 }).catch(() => {})
      await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') === null, undefined, { timeout: 10_000 }).catch(() => {})
    }
    await sleep(350)
  }

  const scrollPanelTo = async (selector) => {
    await page.evaluate((sel) => {
      const target = document.querySelector(sel)
      const body = document.querySelector('.livery-panel__body')
      if (target === null || body === null) return
      const bodyTop = body.getBoundingClientRect().top
      body.scrollTop += target.getBoundingClientRect().top - bodyTop - 12
    }, selector).catch(() => {})
    await sleep(300)
  }

  const scrollTop = async () => {
    await page.evaluate(() => {
      window.scrollTo(0, 0)
      const body = document.querySelector('.livery-panel__body')
      if (body !== null) body.scrollTop = 0
    }).catch(() => {})
    await sleep(150)
  }

  const collectStyleMetrics = () => page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector)
      if (element === null) return null
      const box = element.getBoundingClientRect()
      return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) }
    }
    const countRows = (element) => {
      if (element === null) return 0
      const tops = [...element.children].filter((child) => child.getBoundingClientRect().height > 0).map((child) => Math.round(child.getBoundingClientRect().top))
      return new Set(tops).size
    }
    const galleryGrid = document.querySelector('[data-testid="livery-gallery"] .livery-grid')
    const galleryColumns = galleryGrid === null ? [] : getComputedStyle(galleryGrid).gridTemplateColumns.split(' ').filter(Boolean)
    const toolbar = document.querySelector('[data-testid="livery-gallery-toolbar"]')
    const order = ['livery-current-card', 'livery-gallery-card', 'livery-secondary']
      .map((testid) => ({ testid, element: document.querySelector(`[data-testid="${testid}"]`) }))
    const preview = document.querySelector('.livery-hero__preview')
    const previewRect = preview?.getBoundingClientRect() ?? null
    return {
      viewport: { width: innerWidth, height: innerHeight },
      bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      oldRailPresent: document.querySelector('.livery-rail, .livery-actions-card, [data-testid="livery-actions-card"]') !== null,
      layoutClass: document.querySelector('[data-testid="livery-layout"]')?.className ?? null,
      currentCard: rect('[data-testid="livery-current-card"]'),
      heroPreview: previewRect === null ? null : {
        width: Math.round(previewRect.width),
        height: Math.round(previewRect.height),
        aspect: Number((previewRect.width / Math.max(1, previewRect.height)).toFixed(3)),
      },
      galleryCard: rect('[data-testid="livery-gallery-card"]'),
      galleryColumns: galleryColumns.length,
      galleryTop: Math.round(galleryGrid?.getBoundingClientRect().top ?? 0),
      galleryVisibleInFirstViewport: (galleryGrid?.getBoundingClientRect().top ?? Infinity) < innerHeight,
      galleryWidth: rect('[data-testid="livery-gallery"]')?.width ?? null,
      toolbar: rect('[data-testid="livery-gallery-toolbar"]'),
      toolbarRows: (() => {
        const parts = ['livery-gallery-toolbar__search', 'livery-gallery-toolbar__filters', 'livery-gallery-toolbar__tags', 'livery-gallery-toolbar__locale']
          .map((className) => document.querySelector(`.${className}`))
          .filter((element) => element !== null && element.getBoundingClientRect().height > 0)
        return new Set(parts.map((element) => Math.round(element.getBoundingClientRect().top))).size
      })(),
      toolbarOverflowX: toolbar === null ? null : toolbar.scrollWidth > toolbar.clientWidth + 1,
      domOrder: order.map((entry) => ({ testid: entry.testid, top: entry.element === null ? null : Math.round(entry.element.getBoundingClientRect().top) })),
      selfCheckAfterGallery: (() => {
        const gallery = document.querySelector('[data-testid="livery-gallery-card"]')
        const selfcheck = document.querySelector('[data-testid="livery-selfcheck"]')
        return gallery !== null && selfcheck !== null && (gallery.compareDocumentPosition(selfcheck) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      })(),
      footerAfterGallery: (() => {
        const gallery = document.querySelector('[data-testid="livery-gallery-card"]')
        const footer = document.querySelector('.livery-about')
        return gallery !== null && footer !== null && (gallery.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      })(),
    }
  })

  const collectWallpaperMetrics = () => page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector)
      if (element === null) return null
      const box = element.getBoundingClientRect()
      return { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) }
    }
    const workbench = document.querySelector('[data-testid="wallpaper-workbench"]')
    const order = [...(workbench?.children ?? [])].map((child) => child.getAttribute('data-testid') ?? child.className)
    const sourceCard = document.querySelector('[data-testid="wallpaper-source-card"]')
    const manage = document.querySelector('[data-testid="wallpaper-manage"]')
    const effectsGrid = document.querySelector('[data-testid="wallpaper-effects-grid"]')
    const effectInputs = [...document.querySelectorAll('[data-testid="wallpaper-effects-grid"] input[type="range"]')]
    const tabs = [...document.querySelectorAll('[data-testid^="wallpaper-source-tab-"]')]
    const panels = [...document.querySelectorAll('[data-testid^="wallpaper-source-panel-"]')]
    const pager = document.querySelector('[data-testid="wallpaper-results-pager"]')
    const recentTrack = document.querySelector('.wallpaper-recent-track')
    return {
      viewport: { width: innerWidth, height: innerHeight },
      bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      oldRailPresent: document.querySelector('.wallpaper-rail, [data-testid="wallpaper-layout"]') !== null,
      workbench: rect('[data-testid="wallpaper-workbench"]'),
      workbenchClass: workbench?.className ?? null,
      workbenchChildren: order,
      hero: rect('[data-testid="wallpaper-hero"]'),
      effects: rect('[data-testid="wallpaper-effects-card"]'),
      source: rect('[data-testid="wallpaper-source-card"]'),
      sourceTabsTop: Math.round(document.querySelector('.wallpaper-source-tabs')?.getBoundingClientRect().top ?? Infinity),
      sourceVisibleInFirstViewport: (document.querySelector('[data-testid="wallpaper-source-card"]')?.getBoundingClientRect().top ?? Infinity) < innerHeight,
      manage: rect('[data-testid="wallpaper-manage"]'),
      domOrder: ['wallpaper-hero', 'wallpaper-effects-card', 'wallpaper-source-card', 'wallpaper-manage'].map((testid) => ({ testid, top: rect(`[data-testid="${testid}"]`)?.top ?? null })),
      sourceTabs: tabs.map((tab) => ({ testid: tab.getAttribute('data-testid'), selected: tab.getAttribute('aria-selected'), hiddenPanel: document.querySelector(`[data-testid="${tab.getAttribute('aria-controls')}"]`)?.hasAttribute('hidden') ?? null })),
      hiddenPanels: panels.filter((panel) => panel.hasAttribute('hidden')).map((panel) => panel.getAttribute('data-testid')),
      effectsColumns: effectsGrid === null ? 0 : getComputedStyle(effectsGrid).gridTemplateColumns.split(' ').filter(Boolean).length,
      effectInputWidths: effectInputs.map((input) => Math.round(input.getBoundingClientRect().width)),
      effectsCardWidth: rect('[data-testid="wallpaper-effects-card"]')?.width ?? null,
      positionPresent: document.querySelector('[data-testid="wallpaper-position"]') !== null,
      positionInsideEffects: (() => {
        const effects = document.querySelector('[data-testid="wallpaper-effects-card"]')
        const position = document.querySelector('[data-testid="wallpaper-position"]')
        return effects === null || position === null ? null : effects.contains(position)
      })(),
      resultCount: document.querySelectorAll('[data-testid="wallpaper-result"]').length,
      pagerPresent: pager !== null,
      pagerLabel: document.querySelector('[data-testid="wallpaper-result-page"]')?.textContent?.trim() ?? null,
      manageOpen: manage?.hasAttribute('open') ?? null,
      manageToggle: document.querySelector('[data-testid="wallpaper-manage-toggle"]') !== null,
      recentTrack: recentTrack !== null,
      sourceCardContainsPanels: sourceCard !== null && panels.length > 0 && panels.every((panel) => sourceCard.contains(panel)),
    }
  })

  const capture = async (name) => {
    await scrollTop()
    const file = path.join(outDir, 'screens', name)
    await page.screenshot({ path: file, animations: 'disabled' })
    metrics.screenshots.push({ file: path.relative(process.cwd(), file), width: await page.evaluate(() => innerWidth) })
  }

  for (const viewport of WIDTHS) {
    await page.setViewportSize(viewport)
    for (const theme of THEMES) {
      await page.emulateMedia({ colorScheme: theme })
      await sleep(300)
      const key = `${viewport.width}`
      metrics.widths[key] ??= {}
      for (const wallpaperOn of [false, true]) {
        await setWallpaper(wallpaperOn)
        await showStyle()
        const styleMetrics = await collectStyleMetrics()
        metrics.widths[key][`${theme}-wallpaper-${wallpaperOn ? 'on' : 'off'}-style`] = styleMetrics
        await capture(`${viewport.width}-${theme}-wallpaper-${wallpaperOn ? 'on' : 'off'}-style.png`)
        if (wallpaperOn && viewport.width === 1440 && theme === 'light') {
          if (styleMetrics.galleryColumns !== 4) recordIssue('medium', 'style-gallery-columns', `1440 gallery renders ${styleMetrics.galleryColumns} columns (expected 4).`)
          if (styleMetrics.toolbarRows > 2) recordIssue('medium', 'style-toolbar-rows', `Style toolbar renders ${styleMetrics.toolbarRows} rows (expected ≤2).`)
          if (styleMetrics.toolbarOverflowX) recordIssue('medium', 'style-toolbar-overflow', 'Style toolbar overflows horizontally.')
          if (styleMetrics.oldRailPresent) recordIssue('high', 'style-old-rail', 'Old style rail/actions card is still present.')
          if (styleMetrics.heroPreview !== null && Math.abs(styleMetrics.heroPreview.aspect - 1.6) > 0.03) recordIssue('medium', 'style-hero-aspect', `Hero preview aspect ${styleMetrics.heroPreview.aspect} (expected ~1.6).`)
          if (!styleMetrics.selfCheckAfterGallery) recordIssue('medium', 'style-secondary-order', 'Self-check does not follow the gallery in document order.')
          if (!styleMetrics.footerAfterGallery) recordIssue('medium', 'style-footer-order', 'Footer does not follow the gallery in document order.')
        }
        if (styleMetrics.bodyOverflow) recordIssue('high', `${viewport.width}-${theme}-${wallpaperOn ? 'on' : 'off'}-style-overflow`, 'Style page has horizontal document overflow.')
        if (styleMetrics.toolbarRows > 2) recordIssue('medium', `style-toolbar-rows-${viewport.width}`, `Style toolbar renders ${styleMetrics.toolbarRows} rows at ${viewport.width}px (expected ≤2).`)
        if (viewport.width < 1440 && !styleMetrics.galleryVisibleInFirstViewport) recordIssue('medium', `style-gallery-below-fold-${viewport.width}`, `Style gallery starts at ${styleMetrics.galleryTop}px, below the ${viewport.height}px first viewport; the large hero consumes the whole first screen.`)
        await showWallpaper()
        const wallpaperMetrics = await collectWallpaperMetrics()
        metrics.widths[key][`${theme}-wallpaper-${wallpaperOn ? 'on' : 'off'}-wallpaper`] = wallpaperMetrics
        await capture(`${viewport.width}-${theme}-wallpaper-${wallpaperOn ? 'on' : 'off'}-wallpaper.png`)
        if (wallpaperOn && viewport.width === 1440 && theme === 'light') {
          if (wallpaperMetrics.oldRailPresent) recordIssue('high', 'wallpaper-old-rail', 'Old wallpaper rail/layout is still present.')
          if (wallpaperMetrics.sourceTabs.length !== 4) recordIssue('high', 'wallpaper-source-tabs', `Wallpaper source tab count ${wallpaperMetrics.sourceTabs.length} (expected 4).`)
          if (wallpaperMetrics.hiddenPanels.length !== 3) recordIssue('medium', 'wallpaper-hidden-panels', `Hidden source panels ${wallpaperMetrics.hiddenPanels.length} (expected 3).`)
          if (!wallpaperMetrics.sourceCardContainsPanels) recordIssue('high', 'wallpaper-tabs-not-in-source-card', 'Source panels are not contained by the source card.')
          if (wallpaperMetrics.positionPresent && wallpaperMetrics.positionInsideEffects === false) recordIssue('medium', 'wallpaper-position', 'Remote/upload position control exists but is not inside the effects card.')
          if (wallpaperMetrics.effectsColumns !== 1) recordIssue('medium', 'wallpaper-effects-columns', `Effects grid renders ${wallpaperMetrics.effectsColumns} columns at 1440 (expected 1 full-width column).`)
          if (wallpaperMetrics.pagerPresent && wallpaperMetrics.resultCount > 6) recordIssue('high', 'wallpaper-pager-size', `Pager visible but ${wallpaperMetrics.resultCount} results rendered (expected max 6).`)
          if (!wallpaperMetrics.manageToggle) recordIssue('high', 'wallpaper-manage', 'Management section toggle is missing.')
          if (wallpaperMetrics.manageOpen !== false) recordIssue('medium', 'wallpaper-manage-open', 'Management section is not collapsed by default.')
        }
        if (wallpaperMetrics.bodyOverflow) recordIssue('high', `${viewport.width}-${theme}-${wallpaperOn ? 'on' : 'off'}-wallpaper-overflow`, 'Wallpaper page has horizontal document overflow.')
        if (wallpaperMetrics.sourceTabsTop >= viewport.height) recordIssue('medium', `wallpaper-source-below-fold-${viewport.width}`, `Wallpaper source tabs start at ${wallpaperMetrics.sourceTabsTop}px, below the ${viewport.height}px first viewport.`)
      }
    }
  }

  // Extra structural captures: pager next page, recent horizontal track, management open.
  await page.setViewportSize(WIDTHS[0])
  await page.emulateMedia({ colorScheme: 'light' })
  await showWallpaper()
  await page.locator('[data-testid="wallpaper-source-tab-online"]').click({ timeout: 8_000 }).catch(() => {})
  await sleep(500)
  if ((await page.locator('[data-testid="wallpaper-result-next"]').count()) > 0) {
    await page.locator('[data-testid="wallpaper-result-next"]').click({ timeout: 8_000 })
    await sleep(400)
    await capture('1440-light-wallpaper-pager-page2.png')
  }
  // Apply the first online result to create a Recent entry, then open the Recent tab.
  if ((await page.locator('[data-testid="wallpaper-result"]').count()) > 0) {
    await page.locator('[data-testid="wallpaper-result"]').first().click({ timeout: 8_000 }).catch(() => {})
    await page.waitForFunction(() => (document.querySelector('style#dsh-livery-wallpaper')?.textContent ?? '').includes('blob:'), undefined, { timeout: 15_000 }).catch(() => {})
    await sleep(500)
    await page.locator('[data-testid="wallpaper-source-tab-recent"]').click({ timeout: 8_000 }).catch(() => {})
    await sleep(350)
    metrics.recent = await page.evaluate(() => ({
      tabSelected: document.querySelector('[data-testid="wallpaper-source-tab-recent"]')?.getAttribute('aria-selected') ?? null,
      recentCard: document.querySelector('[data-testid="wallpaper-recent-card"]') !== null,
      trackPresent: document.querySelector('.wallpaper-recent-track') !== null,
      itemCount: document.querySelectorAll('[data-testid="wallpaper-recent-item"]').length,
    }))
    await capture('1440-light-wallpaper-recent-track.png')
  }
  await page.locator('[data-testid="wallpaper-source-tab-local"]').click({ timeout: 8_000 }).catch(() => {})
  await sleep(300)
  metrics.local = await page.evaluate(() => ({
    tabSelected: document.querySelector('[data-testid="wallpaper-source-tab-local"]')?.getAttribute('aria-selected') ?? null,
    customCard: document.querySelector('[data-testid="wallpaper-custom-card"]') !== null,
    localGridColumns: (() => {
      const grid = document.querySelector('.wallpaper-local-grid')
      return grid === null ? 0 : getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length
    })(),
  }))
  await capture('1440-light-wallpaper-local-tab.png')
  const manage = page.locator('[data-testid="wallpaper-manage"]')
  if ((await manage.count()) > 0 && !(await manage.getAttribute('open'))) {
    await page.locator('[data-testid="wallpaper-manage-toggle"]').click({ timeout: 8_000 }).catch(() => {})
    await sleep(300)
    metrics.manageOpen = await manage.getAttribute('open') !== null
    await capture('1440-light-wallpaper-manage-open.png')
  }

  // Focused scrolled captures for the responsive toolbar/source tabs.
  for (const width of [1024, 767]) {
    await page.setViewportSize({ width, height: width === 1024 ? 800 : 900 })
    await page.emulateMedia({ colorScheme: 'light' })
    await showStyle()
    await scrollPanelTo('[data-testid="livery-gallery-card"]')
    await page.screenshot({ path: path.join(outDir, 'screens', `${width}-light-style-gallery-toolbar.png`), animations: 'disabled' })
    metrics.screenshots.push({ file: path.relative(process.cwd(), path.join(outDir, 'screens', `${width}-light-style-gallery-toolbar.png`)), width })
    await showWallpaper()
    await page.locator('[data-testid="wallpaper-source-tab-online"]').click({ timeout: 8_000 }).catch(() => {})
    await scrollPanelTo('[data-testid="wallpaper-source-card"]')
    await page.screenshot({ path: path.join(outDir, 'screens', `${width}-light-wallpaper-source-tabs.png`), animations: 'disabled' })
    metrics.screenshots.push({ file: path.relative(process.cwd(), path.join(outDir, 'screens', `${width}-light-wallpaper-source-tabs.png`)), width })
  }
} catch (error) {
  metrics.fatal = String(error?.stack ?? error).slice(0, 4000)
} finally {
  try { if (session?.context) await session.context.close() } catch { /* best effort */ }
  try { if (browser) await browser.close() } catch { /* best effort */ }
  try { if (boot) await stopWeb(boot) } catch { /* best effort */ }
}

const uniqueIssues = [...new Map(issues.map((issue) => [issue.id, issue])).values()]
metrics.issues = uniqueIssues
const high = uniqueIssues.filter((issue) => issue.severity === 'high')
const medium = uniqueIssues.filter((issue) => issue.severity === 'medium')
const lines = [
  '# 0.1.4 layout preview — verifier screenshots and metrics',
  '',
  `- candidate: \`${path.basename(tgz)}\`${metrics.environment?.tarballSha256 ? ` (sha256 ${metrics.environment.tarballSha256})` : ''}`,
  `- host: DSH ${metrics.environment?.hostVersion ?? expectVersion}; Chrome ${metrics.environment?.chromeVersion ?? 'unknown'}`,
  `- screenshots: ${metrics.screenshots.length} in \`${path.join(path.basename(outDir), 'screens')}/\``,
  `- issues: ${high.length} high / ${medium.length} medium`,
  '',
  '## Issues',
  ...(uniqueIssues.length === 0 ? ['- none detected by structural metrics'] : uniqueIssues.map((issue) => `- **${issue.severity}** \`${issue.id}\`: ${issue.detail}`)),
  '',
  '## Screenshots',
  ...metrics.screenshots.map((shot) => `- \`${shot.file}\``),
  '',
  '## Metrics',
  '```json',
  JSON.stringify(metrics, null, 2),
  '```',
  '',
]
await mkdir(outDir, { recursive: true })
await writeFile(path.join(outDir, 'layout-metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`)
await writeFile(path.join(outDir, 'layout-report.md'), `${lines.join('\n')}\n`)
console.log(JSON.stringify({ report: path.join(outDir, 'layout-report.md'), screenshots: metrics.screenshots.length, high: high.length, medium: medium.length, fatal: metrics.fatal ?? null }, null, 2))
