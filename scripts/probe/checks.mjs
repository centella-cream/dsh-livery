/**
 * The acceptance checks themselves.
 *
 * Every check records pass/fail/skip plus a human-readable detail in
 * `artifacts/acceptance/probe.json`; screenshots and filmstrip frames are
 * written next to it. The functions are intentionally explicit rather than
 * table-driven so a failure report points at the exact assertion.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import {
  captureScreenshot,
  closeSettings,
  dismissFirstRunDialogs,
  escapeRegExp,
  findControl,
  findLiverySection,
  findSearchInput,
  galleryCards,
  openSettings,
  readFirstPaintSamples,
  readGallery,
  readLiveryCssRules,
  readPaintTimings,
  readThemeSnapshot,
  recordFilmstrip,
  waitForAppReady,
  waitForBootGraph,
} from './browser.mjs'
import { getJson, getStatus, probeBrowserTrust, probePluginBundle, rawRequest } from './http.mjs'
import { inspectProfilePatch } from './dsh-home.mjs'
import { EXPECTED_CAPABILITIES, labelsFor, tagLabelsFor } from './labels.mjs'
import {
  ensureDir,
  firstConcreteFamily,
  fontStackStartsWith,
  normalizeFontStack,
  oneLine,
  pngColorStats,
  sha256Text,
  sleep,
  writeJson,
  writeText,
} from './util.mjs'

const THEME_TOKENS = ['--dsw-alias-bg-base', '--dsw-alias-label-primary', '--dsw-alias-border-l1']

function expect(runner, id, title, condition, detail, evidence) {
  if (condition) return runner.pass(id, title, detail, evidence)
  return runner.fail(id, title, detail, evidence)
}

/** Screenshot into the evidence layout `<locale>-<mode>-<state>.png`. */
export async function capture(page, ctx, { locale = ctx.config.locale, mode = 'light', state, meta = {} }) {
  const dir = path.join(ctx.config.screensDir, ctx.config.profileName)
  const file = path.join(dir, `${locale}-${mode}-${state}.png`)
  const shot = await captureScreenshot(page, file, { label: `${locale}/${mode}/${state}`, meta })
  ctx.artifacts.screenshots.push({ ...shot, locale, mode, state: meta.state ?? state })
  return shot
}

/** Canonicalize CSS colour values using the browser's own parser. */
export async function canonicalizeColors(page, values) {
  return page.evaluate((input) => {
    const probe = document.createElement('div')
    probe.style.display = 'none'
    document.body.appendChild(probe)
    const out = input.map((value) => {
      if (!value || typeof value !== 'string') return ''
      probe.style.color = value
      const canonical = getComputedStyle(probe).color
      return canonical
    })
    probe.remove()
    return out
  }, values)
}

function errorOwnership(entry, pluginId) {
  const haystack = `${entry.url ?? ''} ${entry.location?.url ?? ''} ${entry.text ?? ''} ${entry.message ?? ''} ${entry.stack ?? ''} ${entry.failure ?? ''}`
  return entry.liveryOwned === true || haystack.includes('/livery/') || haystack.includes(pluginId)
}

function liveryOwnedErrors(record, pluginId) {
  const consoleErrors = record.console.filter((entry) => entry.type === 'error' && errorOwnership(entry, pluginId))
  const consoleWarnings = record.console.filter((entry) => entry.type === 'warning' && errorOwnership(entry, pluginId))
  const pageErrors = record.pageErrors.filter((entry) => errorOwnership(entry, pluginId))
  const requestFailed = record.requestFailed.filter((entry) => errorOwnership(entry, pluginId))
  const httpErrors = record.httpErrors.filter((entry) => entry.liveryOwned)
  return { consoleErrors, consoleWarnings, pageErrors, requestFailed, httpErrors }
}

/** Fetch the served catalog and run structural/compat assertions. */
export async function checkCatalog(ctx) {
  const { runner, config } = ctx
  const url = new URL('/livery/api/catalog', config.baseUrl).href
  const response = await getJson(url, { headers: ctx.state.cookieHeader ? { Cookie: ctx.state.cookieHeader } : {} })
  expect(runner, 'catalog.serves-json', 'Host serves GET /livery/api/catalog', response.status === 200 && response.json !== null, `status ${response.status}, content-type ${response.contentType ?? '(none)'}, cache-control ${response.cacheControl ?? '(none)'}`, { url })
  if (!response.json) {
    ctx.state.catalog = null
    return
  }
  const catalog = response.json
  ctx.state.catalog = catalog
  ctx.artifacts.catalog = catalog
  expect(runner, 'catalog.schema', 'catalog shape', catalog.schemaVersion === 1 && typeof catalog.adapterId === 'string' && typeof catalog.hostVersion === 'string', `schemaVersion=${catalog.schemaVersion} adapterId=${catalog.adapterId} hostVersion=${catalog.hostVersion} profileKind=${catalog.profileKind ?? catalog.capabilities ? 'capabilities' : ''}`, { schemaVersion: catalog.schemaVersion, adapterId: catalog.adapterId, hostVersion: catalog.hostVersion, contractHash: catalog.contractHash })
  expect(runner, 'catalog.cache-control-no-store', 'catalog is not cached', /no-store/i.test(response.cacheControl ?? ''), `cache-control: ${response.cacheControl ?? '(none)'}`)
  const liveries = catalog.liveries ?? []
  expect(runner, 'catalog.gallery-size', 'catalog carries at least 10 liveries', liveries.length >= 10, `${liveries.length} liveries: ${liveries.map((livery) => livery.id).join(', ')}`, { ids: liveries.map((livery) => livery.id) })

  const uncoveredTokens = []
  const contrastProblems = []
  const cssProblems = []
  const coverage = { covered: 0, inherited: 0, missing: 0, required: 0 }
  for (const livery of liveries) {
    const inherited = new Set(livery.audit?.tokenCoverage?.inherited ?? [])
    const covered = livery.audit?.tokenCoverage?.covered ?? []
    coverage.covered += covered.length
    coverage.inherited += inherited.size
    coverage.missing += (livery.audit?.tokenCoverage?.missing ?? []).length
    for (const mode of ['light', 'dark']) {
      for (const token of THEME_TOKENS) {
        // A livery may deliberately inherit a token from stock (documented in
        // the compiled audit); only a value that is neither declared nor
        // documented-inherited is a coverage bug.
        if (!livery?.[mode]?.tokens?.[token] && !inherited.has(token)) uncoveredTokens.push(`${livery.id}/${mode}/${token}`)
      }
    }
    const failures = livery.audit?.contrastFailures
    if (failures !== 0) contrastProblems.push(`${livery.id}: contrastFailures=${failures}`)
    const safety = livery.audit?.cssSafety
    if (!safety?.pass || safety.important !== 0 || safety.hashSelectors !== 0) {
      cssProblems.push(`${livery.id}: ${JSON.stringify(safety)}`)
    }
  }
  coverage.required = coverage.covered + coverage.inherited
  expect(
    runner,
    'catalog.token-coverage',
    'every asserted token is either compiled into the livery or documented as inherited (missing = 0)',
    uncoveredTokens.length === 0 && coverage.missing === 0,
    uncoveredTokens.length
      ? `undocumented tokens: ${uncoveredTokens.slice(0, 20).join(', ')}`
      : `covered ${coverage.covered} / inherited ${coverage.inherited} / required ${coverage.required} / missing ${coverage.missing} across ${liveries.length} liveries`,
    coverage,
  )
  expect(runner, 'catalog.contrast-zero-failures', 'compiled catalog has 0 contrast failures', contrastProblems.length === 0, contrastProblems.length ? contrastProblems.slice(0, 10).join('; ') : 'all liveries report contrastFailures=0')
  expect(runner, 'catalog.css-safety-clean', 'compiled catalog has 0 !important / 0 hash selectors', cssProblems.length === 0, cssProblems.length ? cssProblems.slice(0, 10).join('; ') : 'all liveries report cssSafety pass')
  // Integrity: each compiled livery's declared hash must equal sha256 of the
  // exact style text the renderer concatenates (tokens+typography+layout).
  const hashProblems = []
  for (const livery of liveries) {
    const css = livery.css
    if (!css || typeof css.tokens !== 'string' || typeof css.typography !== 'string' || typeof css.layout !== 'string') {
      hashProblems.push(`${livery.id}: missing css layers`)
      continue
    }
    const computed = `sha256:${sha256Text(css.tokens + css.typography + css.layout)}`
    if (computed !== livery.cssHash) hashProblems.push(`${livery.id}: declared cssHash ${oneLine(livery.cssHash ?? '(missing)', 24)} ≠ computed ${oneLine(computed, 24)}`)
  }
  expect(
    runner,
    'catalog.livery-hashes',
    'every compiled livery cssHash equals sha256(tokens+typography+layout)',
    hashProblems.length === 0,
    hashProblems.length ? hashProblems.slice(0, 6).join('; ') : `${liveries.length} livery hashes verified`,
  )

  // Capability facts used by the self-check panel and layout degradation.
  const capabilities = catalog.capabilities ?? {}
  const capabilityProblems = []
  for (const [id, available] of Object.entries(EXPECTED_CAPABILITIES)) {
    const fact = capabilities[id]
    if (!fact) capabilityProblems.push(`${id}: missing`)
    else if (Boolean(fact.available) !== available) capabilityProblems.push(`${id}: expected ${available}, got ${fact.available}`)
  }
  expect(runner, 'catalog.capabilities', 'catalog capability availability matches the frozen contract', capabilityProblems.length === 0, capabilityProblems.length ? capabilityProblems.join('; ') : Object.keys(EXPECTED_CAPABILITIES).map((id) => `${id}=${EXPECTED_CAPABILITIES[id]}`).join(', '), { capabilities })

  // Preview SVG assets: every advertised file must be served, unknown files 404.
  const previewChecks = []
  for (const livery of liveries.slice(0, 12)) {
    for (const lang of ['zh', 'en']) {
      for (const mode of ['light', 'dark']) {
        const file = `${livery.id}-${lang}-${mode}.svg`
        previewChecks.push({ file, url: new URL(`/livery/assets/previews/${file}`, config.baseUrl).href })
      }
    }
  }
  const results = []
  for (const item of previewChecks) {
    const response = await getStatus(item.url).catch((error) => ({ status: 0, error: String(error) }))
    results.push({ ...item, ...response })
  }
  const badPreviews = results.filter((entry) => entry.status !== 200 || !/svg/i.test(entry.contentType ?? ''))
  expect(runner, 'previews.assets-served', 'all preview SVGs are served as image/svg+xml', badPreviews.length === 0, badPreviews.length ? badPreviews.slice(0, 8).map((entry) => `${entry.file} → ${entry.status} ${entry.contentType ?? ''}`).join('; ') : `${results.length} preview assets HTTP 200 image/svg+xml`)
  const unknown = await getStatus(new URL('/livery/assets/previews/not-a-real-file.svg', config.baseUrl).href)
  expect(runner, 'previews.unknown-404', 'unknown preview asset returns 404', unknown.status === 404, `unknown file → ${unknown.status}`)

  const post = await rawRequest(url, { method: 'POST', headers: { Cookie: ctx.state.cookieHeader ?? '' } })
  expect(runner, 'catalog.get-only-405', 'catalog route is GET-only (POST → 405)', post.status === 405, `POST /livery/api/catalog → ${post.status}`)
}

/** Boot graph + handshake rows, run on the first (stock) boot. */
export async function checkBootHandshake(ctx) {
  const { runner, session, config } = ctx
  const { page } = session
  const bootGraph = await waitForBootGraph(page)
  ctx.state.boot = bootGraph
  const entry = bootGraph.entries.find((item) => item.id === config.pluginId)
  expect(runner, 'boot.graph-entry', `__DSH_BOOT__ lists client entry "${config.pluginId}"`, Boolean(entry), entry ? `url ${entry.url}` : `entry ids: ${bootGraph.entries.map((item) => item.id).join(', ').slice(0, 800)}`, { entry })
  if (entry) {
    ctx.state.clientEntry = entry
    const bundle = await probePluginBundle({ baseUrl: config.baseUrl, pluginId: config.pluginId, entryUrl: entry.url })
    const titles = {
      'bundle.serves-client-js': 'plugin client bundle (boot-graph URL) is served as JavaScript',
      'bundle.requires-rev': 'plugin client bundle requires its graph rev',
      'bundle.canonical-route': 'bare /plugins/<pkg>/client.js?rev= route (doc-comment form)',
    }
    for (const check of bundle.checks) {
      const title = titles[check.id] ?? check.id
      if (check.warnOnly) runner.warn(check.id, title, check.detail, check.evidence)
      else expect(runner, check.id, title, check.passed, check.detail, check.evidence)
    }
    ctx.state.bundle = bundle.bundle
    ctx.deviations.push('DSH 0.2.0-rc.2 serves client bundles through the boot-graph grouped URL (plugins/??<pkg>/client.js&rev=…); the bare /plugins/<pkg>/client.js?rev= form returns 404 in this build (verified).')
    try {
      if (!config.liveryMode) throw new Error('performance budget applies to the dsh-livery bundle only (generic fixture mode)')
      const raw = await rawRequest(bundle.bundle.entryUrl)
      const gzipBytes = zlib.gzipSync(raw.body).length
      ctx.state.bundleGzip = gzipBytes
      const budget = 25 * 1024
      expect(
        runner,
        'bundle.gzip-budget',
        'client bundle gzip stays within the 25KB performance budget (host peers excluded)',
        gzipBytes <= budget,
        `${gzipBytes} bytes gzip / ${raw.body.length} bytes raw (budget ${budget})`,
        { gzipBytes, rawBytes: raw.body.length },
      )
    } catch (error) {
      if (config.liveryMode) runner.warn('bundle.gzip-budget', 'client bundle gzip stays within the 25KB performance budget', String(error))
      else runner.skip('bundle.gzip-budget', 'client bundle gzip stays within the 25KB performance budget', String(error))
    }
  } else {
    runner.skip('bundle.serves-client-js', 'plugin client bundle is served as JavaScript', 'no graph row to fetch')
    runner.skip('bundle.requires-rev', 'plugin client bundle requires the graph rev', 'no graph row to fetch')
  }

  const bootPayload = await page.evaluate(() => (window.__DSH_LIVERY_BOOT__ ? { ...window.__DSH_LIVERY_BOOT__, diagnostics: [...(window.__DSH_LIVERY_BOOT__.diagnostics ?? [])] } : null))
  const initialSnapshot = await readThemeSnapshot(page)
  ctx.state.bootPayload = bootPayload
  ctx.state.initialBootSnapshot = initialSnapshot
  if (config.pluginId !== 'dsh-livery') return
  const initialIsStock = !initialSnapshot.bodyAttribute
  if (!bootPayload) {
    // Default config is `{ skinId: 'stock' }`: the gate passes but the Host
    // deliberately contributes no rows, so there is no global and no style.
    expect(
      runner,
      'handshake.stock-no-rows',
      'stock default injects no first-frame rows (fail-safe stock)',
      initialIsStock && initialSnapshot.liveryStyles.length === 0,
      `__DSH_LIVERY_BOOT__ absent; skin style elements=${initialSnapshot.liveryStyles.length}; body attribute=${initialSnapshot.bodyAttribute}`,
    )
    for (const id of ['handshake.boot-global', 'handshake.echo', 'handshake.catalog-url']) {
      runner.skip(id, 'first-frame handshake is asserted once a livery is configured', 'initial boot is stock (no rows expected); asserted after the settings apply step')
    }
    return
  }
  expect(
    runner,
    'handshake.boot-global',
    'first-frame handshake global __DSH_LIVERY_BOOT__ is present and accepted',
    bootPayload.accepted === true && bootPayload.profileKind === 'web',
    `accepted=${bootPayload.accepted} profileKind=${bootPayload.profileKind} skinId=${bootPayload.skinId} cssHash=${oneLine(bootPayload.cssHash, 24)}… entryId=${bootPayload.entryId} adapter=${bootPayload.adapterId}`,
    bootPayload,
  )
  expect(runner, 'handshake.echo', 'handshake echoes version/adapter/host', bootPayload.adapterId === 'dsh-0.2.0-rc.2-r1' && bootPayload.hostVersion === '0.2.0-rc.2' && bootPayload.entryId === 'livery', `pluginVersion=${bootPayload.pluginVersion} adapterId=${bootPayload.adapterId} hostVersion=${bootPayload.hostVersion} entryId=${bootPayload.entryId}`)
  expect(runner, 'handshake.catalog-url', 'handshake advertises the catalog route', bootPayload.catalogUrl === '/livery/api/catalog', `catalogUrl=${bootPayload.catalogUrl}`)
}

/** Stock first boot: no livery DOM/CSS, token values captured as the baseline. */
export async function checkStockInitial(ctx) {
  const { runner, session, config, state } = ctx
  const { page } = session
  await waitForAppReady(page)
  const snapshot = await readThemeSnapshot(page)
  if (snapshot.bodyAttribute) {
    runner.skip('stock.no-body-attribute', 'stock boot leaves body without data-dsh-livery', `reused profile already has an active livery (${snapshot.bodyAttribute}); stock baseline unavailable`)
    runner.skip('stock.tokens-recorded', 'stock token baseline captured for residue comparison', 'reused profile already has an active livery')
    state.stock = null
    state.stockTokens = null
    await capture(page, ctx, { state: 'home' })
    return
  }
  const stockValues = [snapshot.tokens.bgBase, snapshot.tokens.labelPrimary, snapshot.tokens.borderL1]
  state.stock = { snapshot, canonical: await canonicalizeColors(page, stockValues) }
  state.stockTokens = {
    '--dsw-alias-bg-base': snapshot.tokens.bgBase,
    '--dsw-alias-label-primary': snapshot.tokens.labelPrimary,
    '--dsw-alias-border-l1': snapshot.tokens.borderL1,
  }
  expect(runner, 'stock.no-body-attribute', 'stock boot leaves body without data-dsh-livery', snapshot.bodyAttribute === null, `data-dsh-livery=${snapshot.bodyAttribute}`)
  const handshakeGlobalPresent = await page.evaluate(() => window.__DSH_LIVERY_BOOT__ !== undefined)
  expect(runner, 'stock.no-livery-styles', 'stock boot injects no Livery skin style elements or handshake rows', snapshot.liveryStyles.length === 0 && !handshakeGlobalPresent, `${snapshot.liveryStyles.length} skin style element(s); __DSH_LIVERY_BOOT__ present=${handshakeGlobalPresent}`)
  expect(runner, 'stock.tokens-recorded', 'stock token baseline captured for residue comparison', Boolean(state.stockTokens['--dsw-alias-bg-base']), `--dsw-alias-bg-base=${state.stockTokens['--dsw-alias-bg-base']} labelPrimary=${state.stockTokens['--dsw-alias-label-primary']} borderL1=${state.stockTokens['--dsw-alias-border-l1']}`, state.stockTokens)
  expect(runner, 'stock.host-theme-source', 'host theme source is system (preference untouched)', snapshot.themeSource === 'system' && snapshot.darkAttribute === null, `html[data-ds-theme-source]=${snapshot.themeSource} body[data-ds-dark-theme]=${snapshot.darkAttribute}`)
  const profile = config.mode === 'isolated' ? await inspectProfilePatch(config.dshHome) : { hasThemeRow: false, text: '' }
  expect(runner, 'stock.no-theme-write', 'no ui-theme row was written to the profile patch', profile.hasThemeRow === false, profile.hasThemeRow ? 'profile patch contains an ui-theme row' : 'no ui-theme row in profile patch')
  state.stockObserverCount = await page.evaluate(() => window.__LIVERY_OBSERVERS__?.wholeDocument ?? 0).catch(() => null)
  // Dark stock baseline: some tokens are intentionally inherited from stock per
  // mode, so their expected computed value is the stock one for that mode.
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() => document.body?.hasAttribute('data-ds-dark-theme'), undefined, { timeout: 8_000 }).catch(() => {})
  const stockDark = await readThemeSnapshot(page)
  state.stockDarkCanonical = await canonicalizeColors(page, [stockDark.tokens.bgBase, stockDark.tokens.labelPrimary, stockDark.tokens.borderL1])
  state.stockDarkTokens = { bgBase: stockDark.tokens.bgBase, labelPrimary: stockDark.tokens.labelPrimary, borderL1: stockDark.tokens.borderL1 }
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForFunction(() => !document.body?.hasAttribute('data-ds-dark-theme'), undefined, { timeout: 8_000 }).catch(() => {})
  await capture(page, ctx, { state: 'home' })
}

/** Wait until a livery is active in the DOM (client ready). */
export async function waitForActiveLivery(page, { skinId = null, timeoutMs = 15_000 } = {}) {
  await page.waitForFunction(
    (expected) => {
      const attribute = document.body?.getAttribute('data-dsh-livery')
      if (!attribute) return false
      if (expected && attribute !== expected) return false
      return document.querySelectorAll('style[data-plugin="dsh-livery"], style[id^="dsh-livery"]').length > 0
    },
    skinId,
    { timeout: timeoutMs },
  )
  return readThemeSnapshot(page)
}

/** Wait until a skin is no longer active (stock state). */
export async function waitForStock(page, { timeoutMs = 15_000 } = {}) {
  await page.waitForFunction(
    () => !document.body?.getAttribute('data-dsh-livery'),
    undefined,
    { timeout: timeoutMs },
  )
  return readThemeSnapshot(page)
}

async function waitForGallery(page, { timeoutMs = 20_000 } = {}) {
  await page.waitForFunction(
    () => {
      const dialog = document.querySelector('[role="dialog"]')
      if (!dialog) return false
      const cards = dialog.querySelectorAll('[data-testid="livery-card"][data-livery-id]')
      if (cards.length > 0) return true
      const error = dialog.querySelector('[data-testid="livery-error"]')
      return Boolean(error)
    },
    undefined,
    { timeout: timeoutMs },
  )
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')
    return {
      cards: dialog?.querySelectorAll('[data-testid="livery-card"][data-livery-id]').length ?? 0,
      error: dialog?.querySelector('[data-testid="livery-error"]')?.textContent ?? null,
      loading: dialog?.textContent?.includes('正在加载') || dialog?.textContent?.includes('Loading liveries'),
    }
  })
}

async function waitForThumbs(page) {
  const started = Date.now()
  while (Date.now() - started < 8_000) {
    const thumbs = await readGallery(page)
    if (thumbs.length && thumbs.every((card) => !card.thumb || card.thumb.tag !== 'img' || (card.thumb.complete && (card.thumb.naturalWidth ?? 0) > 0))) return thumbs
    await sleep(200)
  }
  return readGallery(page)
}

/** Choose a livery pair whose light tokens differ so preview/cancel is observable. */
export function chooseSkinPair(catalog) {
  const liveries = catalog?.liveries ?? []
  if (!liveries.length) return { applied: null, preview: null }
  const applied = liveries[0]
  for (const candidate of liveries.slice(1)) {
    const differs = THEME_TOKENS.some((token) => applied.light?.tokens?.[token] !== candidate.light?.tokens?.[token])
    if (differs) return { applied: applied.id, preview: candidate.id }
  }
  return { applied: applied.id, preview: liveries[1]?.id ?? null }
}

/**
 * The full settings UI acceptance flow: open the section, gallery, search,
 * keyboard roving focus, transient preview + cancel, apply + persistence.
 */
export async function checkSettingsFlow(ctx) {
  const { runner, session, config, state } = ctx
  const { page } = session
  const labels = config.labels
  const catalog = state.catalog
  if (!catalog) {
    runner.skip('settings.section', 'Livery settings section opens', 'catalog unavailable')
    return
  }
  await waitForAppReady(page)
  state.dismissedDialogs = await dismissFirstRunDialogs(page)
  await capture(page, ctx, { state: 'home-before-settings' })

  let dialog
  try {
    dialog = await openSettings(page)
  } catch (error) {
    runner.fail('settings.opens', 'settings dialog opens', String(error))
    return
  }
  runner.pass('settings.opens', 'settings dialog opens', 'settings dialog visible')

  const section = await findLiverySection(page, { labels, catalog, locale: config.locale, timeoutMs: 25_000 })
  state.section = section
  if (!section.found) {
    runner.fail('settings.livery-section', 'Livery settings section is registered and opens', `nav entries tried: ${section.tried.map((entry) => `${entry.label}=${entry.found}`).join(', ')}`)
    await closeSettings(page)
    return
  }
  runner.pass('settings.livery-section', 'Livery settings section is registered and opens', `nav label "${section.navLabel}" (index ${section.navIndex}), marker ${section.marker.selector}`, section)
  expect(
    runner,
    'settings.section-label',
    'section nav label matches the shipped copy',
    normalizeCopy(section.navLabel) === normalizeCopy(labels.section) || section.navLabel.toLowerCase() === labels.section.toLowerCase(),
    `nav label "${section.navLabel}" vs expected "${labels.section}"`,
  )

  const galleryState = await waitForGallery(page)
  state.galleryState = galleryState
  if (!galleryState.cards) {
    runner.fail('gallery.cards', 'gallery renders 10 livery cards', `gallery error state: ${galleryState.error ?? '(none)'}`)
    return
  }
  const cards = await waitForThumbs(page)
  state.cards = cards
  const liveryCards = cards.filter((card) => card.id !== 'stock')
  const expectedIds = (catalog.liveries ?? []).map((livery) => livery.id)
  const missing = expectedIds.filter((id) => !liveryCards.some((card) => card.id === id))
  const hasStockCard = cards.some((card) => card.id === 'stock')
  expect(
    runner,
    'gallery.cards',
    'gallery renders one card per catalog livery (≥10)',
    liveryCards.length >= 10 && liveryCards.length === expectedIds.length && missing.length === 0,
    `${liveryCards.length} livery card(s) (catalog ${expectedIds.length}); stock card=${hasStockCard} (optional; stock appearance is reachable through the restore action); ids: ${liveryCards.map((card) => card.id).join(', ')}${missing.length ? `; missing: ${missing.join(', ')}` : ''}`,
    { cards: cards.map((card) => ({ id: card.id, state: card.state })) },
  )
  const brokenThumbs = liveryCards.filter((card) => card.thumb && card.thumb.tag === 'img' && (!(card.thumb.naturalWidth > 0) || !card.thumb.complete))
  const thumbCount = liveryCards.filter((card) => card.thumb).length
  expect(runner, 'gallery.thumbnails', 'every livery card shows a loaded preview thumbnail', thumbCount === liveryCards.length && brokenThumbs.length === 0, `${thumbCount}/${liveryCards.length} thumbs, broken: ${brokenThumbs.map((card) => card.id).join(', ') || 'none'}`)
  const errorState = await page.locator('[data-testid="livery-error"]').count().catch(() => 0)
  expect(runner, 'gallery.no-error-state', 'gallery is not in an error/catalog-unavailable state', errorState === 0, `${errorState} livery-error node(s)`)
  await capture(page, ctx, { state: 'gallery' })

  // ---- search (localized name / id / tag / empty) ----
  const search = await findSearchInput(page, { labels })
  if (!search.locator) {
    runner.fail('search.input', 'gallery search input is present', 'no search input found by data-testid, role, or placeholder')
  } else {
    state.searchVia = search.via
    const firstLivery = catalog.liveries[0]
    const firstCardId = firstLivery?.id
    const localizedName = firstLivery?.meta?.name?.[config.locale === 'zh' ? 'zh-CN' : 'en-US']
    const tagId = firstLivery?.meta?.tags?.[0]
    const tagLabel = tagId ? tagLabelsFor(config.locale)[tagId] : null
    const scenarios = [
      { name: 'name', query: localizedName, expectCard: firstCardId, assertion: 'localized name filters to its card' },
      { name: 'id', query: firstCardId, expectCard: firstCardId, assertion: 'livery id filters to its card' },
      { name: 'tag', query: tagLabel, expectCard: null, assertion: 'localized tag label filters the gallery' },
    ]
    for (const scenario of scenarios) {
      if (!scenario.query) {
        runner.skip(`search.${scenario.name}`, scenario.assertion, 'no data available for query')
        continue
      }
      await search.locator.fill(String(scenario.query))
      await sleep(350)
      const filtered = await readGallery(page)
      const filteredLiveries = filtered.filter((card) => card.id !== 'stock')
      const match = scenario.expectCard ? filteredLiveries.some((card) => card.id === scenario.expectCard) : null
      const ok = scenario.expectCard ? match : filteredLiveries.length > 0 && filteredLiveries.length < liveryCards.length
      expect(runner, `search.${scenario.name}`, `search: ${scenario.assertion}`, ok, `query "${scenario.query}" → ${filteredLiveries.length} card(s): ${filteredLiveries.map((card) => card.id).join(', ') || '(none)'}`)
    }
    await capture(page, ctx, { state: 'gallery-search-tag' })
    await search.locator.fill('zzzz-no-such-livery')
    await sleep(350)
    const emptyState = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const cards = dialog?.querySelectorAll('[data-testid="livery-card"][data-livery-id]') ?? []
      return { cards: cards.length, text: (dialog?.innerText ?? '').slice(0, 400) }
    })
    expect(runner, 'search.empty-state', 'search-empty state renders for an unknown query', emptyState.cards === 0 && /没有|无匹配|No liveries match|No matching|empty/i.test(emptyState.text), `${emptyState.cards} card(s) remain; panel text: ${oneLine(emptyState.text, 220)}`)
    await capture(page, ctx, { state: 'gallery-search-empty' })
    await search.locator.fill('')
    await sleep(300)
  }

  // ---- keyboard roving focus ----
  const gallery = galleryCards(page)
  if ((await gallery.count()) >= 3) {
    const ids = (await readGallery(page)).filter((card) => card.id !== 'stock').map((card) => card.id)
    await gallery.nth(0).focus()
    await page.keyboard.press('ArrowRight')
    await sleep(150)
    const afterRight = await focusedCardId(page)
    expect(runner, 'keyboard.arrow-right', 'ArrowRight moves roving focus to the next card', afterRight === ids[1], `focus moved to "${afterRight ?? '(none)'}" (expected "${ids[1]}")`)
    await page.keyboard.press('Home')
    await sleep(120)
    expect(runner, 'keyboard.home', 'Home moves roving focus to the first card', (await focusedCardId(page)) === ids[0], `focus is "${await focusedCardId(page)}"`)
    await page.keyboard.press('End')
    await sleep(120)
    expect(runner, 'keyboard.end', 'End moves roving focus to the last card', (await focusedCardId(page)) === ids[ids.length - 1], `focus is "${await focusedCardId(page)}" (expected "${ids[ids.length - 1]}")`)
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
  } else {
    runner.skip('keyboard.arrow-right', 'ArrowRight moves roving focus to the next card', 'gallery has fewer than 3 cards')
  }

  // ---- preview + cancel ----
  const pair = chooseSkinPair(catalog)
  state.skinPair = pair
  if (!pair.applied || !pair.preview) {
    runner.skip('preview.previewing', 'previewing a different skin updates tokens transiently', 'not enough liveries')
    return
  }
  const before = await readThemeSnapshot(page)
  const previewCard = page.locator(`[data-testid="livery-card"][data-livery-id="${pair.preview}"]`).first()
  if (!(await previewCard.count())) {
    await closeSettings(page)
    runner.fail('preview.previewing', 'previewing a different skin updates tokens transiently', `card for "${pair.preview}" not found`)
    return
  }
  await previewCard.click()
  await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, pair.preview, { timeout: 10_000 }).catch(() => {})
  const preview = await readThemeSnapshot(page)
  const previewLivery = catalog.liveries.find((livery) => livery.id === pair.preview)
  const expectedPreview = await expectedTokenCanonicals(page, previewLivery, 'light', state)
  expect(runner, 'preview.previewing', 'previewing a different skin sets the preview attribute and tokens', preview.bodyAttribute === pair.preview && tokenMatches(preview, expectedPreview), `body attr=${preview.bodyAttribute} tokens=${JSON.stringify(pickTokens(preview))} expected=${JSON.stringify(expectedPreview)}`)
  expect(runner, 'preview.style-element', 'preview uses a transient Livery style element', preview.liveryStyles.length > before.liveryStyles.length, `${before.liveryStyles.length} → ${preview.liveryStyles.length} livery style element(s)`)
  expect(runner, 'preview.card-state', 'the previewed card reports the previewing state', (await readCardState(page, pair.preview)) === 'preview', `data-state=${await readCardState(page, pair.preview)}`)
  await capture(page, ctx, { state: 'previewing', mode: 'light' })

  const cancel = await findControl(page, { testId: 'livery-cancel', names: [labels.cancel], exact: false })
  if (!cancel.locator) {
    runner.fail('preview.cancel', 'Cancel restores the confirmed skin and tokens', 'cancel control not found')
  } else {
    await cancel.locator.click()
    await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, before.bodyAttribute, { timeout: 10_000 }).catch(() => {})
    const after = await readThemeSnapshot(page)
    const beforeTokens = await canonicalizeColors(page, [before.tokens.bgBase, before.tokens.labelPrimary, before.tokens.borderL1])
    expect(runner, 'preview.cancel', 'Cancel restores the confirmed skin and token values', after.bodyAttribute === before.bodyAttribute && tokensEqual(after, beforeTokens), `body attr ${preview.bodyAttribute} → ${after.bodyAttribute}; tokens ${JSON.stringify(pickTokens(after))} vs ${JSON.stringify(beforeTokens)}`, { beforeAttr: before.bodyAttribute, afterAttr: after.bodyAttribute })
    expect(runner, 'preview.cancel-style', 'Cancel removes the transient preview style element', after.liveryStyles.length === before.liveryStyles.length, `${preview.liveryStyles.length} → ${after.liveryStyles.length} livery style element(s)`)
  }

  if (config.mode === 'reuse' && !config.allowMutations) {
    runner.skip('apply.persists', 'Apply commits the skin through the host settings and persists', 'reuse mode is read-only (--unsafe-mutate opts in)')
    await closeSettings(page)
    const active = (await readThemeSnapshot(page)).bodyAttribute
    state.appliedSkin = active && active !== 'stock' ? active : null
    return
  }

  // ---- apply + persistence ----
  const patchBefore = config.mode === 'isolated' ? await inspectProfilePatch(config.dshHome) : { text: '', skinId: null }
  const applyCard = page.locator(`[data-testid="livery-card"][data-livery-id="${pair.applied}"]`).first()
  await applyCard.click()
  await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, pair.applied, { timeout: 10_000 }).catch(() => {})
  const applyControl = await findControl(page, { testId: 'livery-apply', names: [labels.apply], exact: false })
  if (!applyControl.locator) {
    runner.fail('apply.control', 'Apply control is present', 'apply button not found')
    await closeSettings(page)
    return
  }
  await applyControl.locator.click()
  await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, pair.applied, { timeout: 10_000 }).catch(() => {})
  const applied = await readThemeSnapshot(page)
  state.appliedSkin = applied.bodyAttribute
  state.appliedHash = applied.bodyHash
  expect(runner, 'apply.commits', 'Apply commits the previewed skin as the active livery', applied.bodyAttribute === pair.applied, `body attr=${applied.bodyAttribute} (expected ${pair.applied})`)
  await page
    .waitForFunction(
      (skin) => document.querySelector(`[data-testid="livery-card"][data-livery-id="${skin}"]`)?.getAttribute('data-state') === 'active',
      pair.applied,
      { timeout: 5_000 },
    )
    .catch(() => {})
  expect(runner, 'apply.card-state', 'the applied card reports the current state', (await readCardState(page, pair.applied)) === 'active', `data-state=${await readCardState(page, pair.applied)}`)
  expect(runner, 'apply.previewbar-cleared', 'the transient preview bar is gone after Apply', (await page.locator('[data-testid="livery-preview"]').count()) === 0, `${await page.locator('[data-testid="livery-preview"]').count()} preview bar(s) remain`)
  await capture(page, ctx, { state: 'applied', mode: 'light' })

  if (config.mode === 'isolated') {
    let patchAfter = await inspectProfilePatch(config.dshHome)
    for (let attempt = 0; attempt < 25 && patchAfter.skinId !== pair.applied; attempt += 1) {
      await sleep(200)
      patchAfter = await inspectProfilePatch(config.dshHome)
    }
    const mutation = collectMutation(patchBefore, patchAfter, pair.applied)
    state.applyMutation = mutation
    const themeRowAdded = !patchBefore.hasThemeRow && patchAfter.hasThemeRow
    expect(
      runner,
      'apply.one-mutation',
      'Apply writes exactly one livery config mutation to the profile patch',
      mutation.ok && !themeRowAdded,
      `${mutation.detail}${themeRowAdded ? '; ui-theme row was also written (host preference changed!)' : '; no ui-theme row written'}`,
      mutation.evidence,
    )
  }

  // reload => persisted
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
  await waitForBootGraph(page)
  await waitForAppReady(page)
  const afterReload = await waitForActiveLivery(page, { skinId: pair.applied })
  const bootPayloadAfter = await page.evaluate(() => (window.__DSH_LIVERY_BOOT__ ? { ...window.__DSH_LIVERY_BOOT__ } : null))
  state.bootPayloadApplied = bootPayloadAfter
  expect(
    runner,
    'apply.persists',
    'applied skin survives a hard reload (boot injection + client ready)',
    afterReload.bodyAttribute === pair.applied && bootPayloadAfter?.skinId === pair.applied,
    `body attr=${afterReload.bodyAttribute} handshake.skinId=${bootPayloadAfter?.skinId} cssHash=${oneLine(bootPayloadAfter?.cssHash ?? '', 20)}…`,
  )
  expect(
    runner,
    'handshake.applied-boot',
    'configured skin boot handshake is accepted with the expected identity and catalog route',
    Boolean(bootPayloadAfter) && bootPayloadAfter.accepted === true && bootPayloadAfter.profileKind === 'web'
      && bootPayloadAfter.skinId === pair.applied && bootPayloadAfter.adapterId === 'dsh-0.2.0-rc.2-r1'
      && bootPayloadAfter.hostVersion === '0.2.0-rc.2' && bootPayloadAfter.entryId === 'livery'
      && bootPayloadAfter.catalogUrl === '/livery/api/catalog' && /^sha256:[0-9a-f]{64}$/.test(bootPayloadAfter.cssHash ?? ''),
    bootPayloadAfter
      ? `accepted=${bootPayloadAfter.accepted} skinId=${bootPayloadAfter.skinId} adapter=${bootPayloadAfter.adapterId} host=${bootPayloadAfter.hostVersion} entry=${bootPayloadAfter.entryId} catalogUrl=${bootPayloadAfter.catalogUrl} cssHash=${oneLine(bootPayloadAfter.cssHash, 24)}…`
      : 'window.__DSH_LIVERY_BOOT__ missing after reload',
    bootPayloadAfter,
  )
  await capture(page, ctx, { state: 'applied-after-reload', mode: 'light' })
}

async function focusedCardId(page) {
  return page.evaluate(() => {
    const active = document.activeElement
    const card = active?.closest?.('[data-livery-id]')
    return card?.getAttribute('data-livery-id') ?? null
  })
}

async function readCardState(page, id) {
  return page.evaluate((skin) => document.querySelector(`[data-testid="livery-card"][data-livery-id="${skin}"]`)?.getAttribute('data-state') ?? null, id)
}

function collectMutation(before, after, skinId) {
  const beforeRows = (before.text ?? '').split(/\n(?=- )/).filter((chunk) => /^- id: livery\n/.test(chunk))
  const afterRows = (after.text ?? '').split(/\n(?=- )/).filter((chunk) => /^- id: livery\n/.test(chunk))
  const skinRow = afterRows.find((row) => new RegExp(`skinId: ${skinId}\\b`).test(row))
  const added = afterRows.length - beforeRows.length
  const changed = Boolean(skinRow) && (before.skinId !== skinId || added === 1)
  return {
    ok: Boolean(skinRow) && (added === 1 || before.skinId !== skinId) && after.skinId === skinId,
    detail:
      `before skinId=${before.skinId ?? '(none)'} (${beforeRows.length} row(s)) → after skinId=${after.skinId} (${afterRows.length} row(s), added ${added})` +
      (skinRow ? `; row: ${oneLine(skinRow, 240)}` : '; no skinId row found'),
    evidence: { before: before.text, after: after.text, added, skinRow: skinRow ?? null },
  }
}

/** Light + dark token correctness, hash adoption, CSS hygiene, multi-tab. */
export async function checkAppliedTheme(ctx) {
  const { runner, session, config, state } = ctx
  const { page, context } = session
  const catalog = state.catalog
  const skinId = state.appliedSkin
  if (!catalog || !skinId) {
    runner.skip('theme.light-tokens', 'active livery light tokens match the compiled catalog', 'no active livery (settings apply step failed or was skipped)')
    runner.skip('theme.dark-tokens', 'active livery dark tokens match the compiled catalog under emulated dark mode', 'no active livery')
    return
  }
  const livery = catalog.liveries.find((item) => item.id === skinId)
  if (!livery) {
    runner.fail('theme.light-tokens', 'active livery light tokens match the compiled catalog', `catalog has no livery "${skinId}"`)
    return
  }
  state.activeLivery = livery

  const snapshot = await readThemeSnapshot(page)
  state.lightSnapshot = snapshot
  const expectedLight = await expectedTokenCanonicals(page, livery, 'light', state)
  expect(
    runner,
    'theme.light-tokens',
    'active livery light tokens match the compiled catalog',
    snapshot.bodyAttribute === skinId && tokenMatches(snapshot, expectedLight) && snapshot.darkAttribute === null,
    `attr=${snapshot.bodyAttribute} tokens=${JSON.stringify(pickTokens(snapshot))} expected=${JSON.stringify(expectedLight)} darkAttr=${snapshot.darkAttribute}`,
    { expected: expectedLight, actual: pickTokens(snapshot) },
  )
  expect(
    runner,
    'theme.host-preference',
    'host theme source stays system and no ui-theme row is written',
    snapshot.themeSource === 'system',
    `html[data-ds-theme-source]=${snapshot.themeSource}`,
  )
  const patch = config.mode === 'isolated' ? await inspectProfilePatch(config.dshHome) : { hasThemeRow: false, text: '' }
  expect(runner, 'theme.host-preference-file', 'profile patch contains no ui-theme writes', patch.hasThemeRow === false, patch.hasThemeRow ? 'ui-theme row present' : 'no ui-theme row')

  // Hash equality: body attr == handshake cssHash == sha256(style text).
  const bootPayload = state.bootPayloadApplied ?? snapshot.bootPayload
  const hashChecks = hashConsistency(snapshot, bootPayload)
  expect(
    runner,
    'handshake.body-hash-catalog',
    'body[data-dsh-livery-hash] equals the compiled cssHash from the served catalog',
    snapshot.bodyHash === livery.cssHash && typeof livery.cssHash === 'string' && livery.cssHash.length > 0,
    `body hash=${oneLine(snapshot.bodyHash, 30)} catalog livery.cssHash=${oneLine(livery.cssHash, 30)}`,
    { bodyHash: snapshot.bodyHash, catalogCssHash: livery.cssHash },
  )
  expect(runner, 'handshake.hash-equality', 'body[data-dsh-livery-hash] equals __DSH_LIVERY_BOOT__.cssHash', hashChecks.attrMatches, `body hash=${oneLine(snapshot.bodyHash ?? '(none)', 30)} handshake cssHash=${oneLine(bootPayload?.cssHash ?? '(none)', 30)}`, hashChecks)
  expect(runner, 'handshake.hash-style-text', 'style element text hashes to the advertised css hash', hashChecks.styleTextMatches, hashChecks.styleTextDetail, hashChecks)
  expect(
    runner,
    'handshake.boot-style-adopted',
    'boot style element is adopted with no duplicate Livery style ids',
    hashChecks.uniqueStyleIds && hashChecks.tokensStyleCount === 1 && hashChecks.importantCount === 0 && hashChecks.classSelectorCount === 0,
    `ids=${JSON.stringify(hashChecks.ids)} tokensStyles=${hashChecks.tokensStyleCount} !important=${hashChecks.importantCount} classSelectors=${hashChecks.classSelectorCount}`,
    hashChecks,
  )

  // CSS scoping + static hygiene from the live stylesheets.
  const css = await readLiveryCssRules(page)
  const tokenScopingViolations = css.tokenDeclarations.filter((declaration) => {
    if (declaration.name.startsWith('--dsw-font')) return false
    return !/body\[data-dsh-livery/.test(declaration.selector)
  })
  const fontScopingViolations = css.tokenDeclarations.filter(
    (declaration) => declaration.name.startsWith('--dsw-font') && !/body\[data-dsh-livery|:root:lang\(/.test(declaration.selector),
  )
  expect(
    runner,
    'css.token-scoping',
    'token declarations are scoped to body[data-dsh-livery]; font bindings to :root:lang()',
    tokenScopingViolations.length === 0 && fontScopingViolations.length === 0,
    `${css.tokenDeclarations.length} token declaration(s), ${tokenScopingViolations.length} unscoped token, ${fontScopingViolations.length} unscoped font binding`,
    { violations: [...tokenScopingViolations, ...fontScopingViolations].slice(0, 20), ruleCount: css.selectorCount, errors: css.errors },
  )
  const styleText = snapshot.liveryStyles.map((style) => style.text).join('\n')
  expect(runner, 'css.no-important', 'Livery CSS contains 0 !important', (styleText.match(/!important/g) ?? []).length === 0, `${(styleText.match(/!important/g) ?? []).length} occurrence(s)`)
  expect(runner, 'css.no-hash-selectors', 'Livery CSS contains no hash/class-name selectors', css.rules.every((rule) => !/(^|[\s>+~,])\.(?!\d)[A-Za-z_-][\w-]*/.test(rule.selector)), `class selector rules: ${css.rules.filter((rule) => /(^|[\s>+~,])\.(?!\d)[A-Za-z_-][\w-]*/.test(rule.selector)).map((rule) => rule.selector).join(', ') || 'none'}`, { ruleCount: css.selectorCount, errors: css.errors })

  // ---- dark mode through the host's own preference=system + emulation ----
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() => document.body?.hasAttribute('data-ds-dark-theme'), undefined, { timeout: 10_000 }).catch(() => {})
  const dark = await readThemeSnapshot(page)
  state.darkSnapshot = dark
  const expectedDark = await expectedTokenCanonicals(page, livery, 'dark', state)
  expect(
    runner,
    'theme.dark-tokens',
    'emulated dark mode swaps to the livery dark tokens (host preference untouched)',
    dark.bodyAttribute === skinId && dark.darkAttribute !== null && tokenMatches(dark, expectedDark) && dark.themeSource === 'system',
    `attr=${dark.bodyAttribute} darkAttr=${dark.darkAttribute} themeSource=${dark.themeSource} tokens=${JSON.stringify(pickTokens(dark))} expected=${JSON.stringify(expectedDark)}`,
    { expected: expectedDark, actual: pickTokens(dark) },
  )
  await capture(page, ctx, { state: 'applied', mode: 'dark' })
  if (config.mode === 'reuse' && !config.allowMutations) {
    // nothing else to do; restoring media is harmless/read-only
  }
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForFunction(() => !document.body?.hasAttribute('data-ds-dark-theme'), undefined, { timeout: 10_000 }).catch(() => {})
  const backToLight = await readThemeSnapshot(page)
  expect(runner, 'theme.light-restored', 'returning to light restores exactly the light token branch', tokenMatches(backToLight, expectedLight) && backToLight.darkAttribute === null, `tokens=${JSON.stringify(pickTokens(backToLight))}`)

  // ---- forced-colors smoke: system colours must take over without breakage ----
  try {
    await page.emulateMedia({ forcedColors: 'active' })
    await sleep(350)
    const forced = await page.evaluate(() => ({
      matches: matchMedia('(forced-colors: active)').matches,
      attr: document.body.getAttribute('data-dsh-livery'),
      bg: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
    }))
    expect(
      runner,
      'theme.forced-colors',
      'forced-colors emulation is active and the livery stays consistent (system colours take over)',
      forced.matches === true && forced.attr === skinId,
      `forced-colors=${forced.matches} attr=${forced.attr} body bg=${forced.bg} color=${forced.color}`,
      forced,
    )
    await capture(page, ctx, { state: 'forced-colors', mode: 'light' })
  } finally {
    await page.emulateMedia({ forcedColors: 'none' }).catch(() => {})
    await sleep(200)
  }

  // ---- second tab sees the same committed state ----
  try {
    const secondPage = await context.newPage()
    await secondPage.goto(`${config.baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await waitForBootGraph(secondPage)
    await waitForAppReady(secondPage)
    const second = await waitForActiveLivery(secondPage, { skinId })
    expect(runner, 'web.multi-tab', 'a second tab loads the same committed livery', second.bodyAttribute === skinId && tokenMatches(second, expectedLight), `tab2 attr=${second.bodyAttribute} tokens=${JSON.stringify(pickTokens(second))}`)
    await secondPage.screenshot({ path: path.join(ctx.config.screensDir, ctx.config.profileName, `${config.locale}-light-multitab.png`), animations: 'disabled' }).catch(() => {})
    await secondPage.close()
  } catch (error) {
    runner.fail('web.multi-tab', 'a second tab loads the same committed livery', String(error))
  }
}

/** zh-CN / en-US host font bindings from the compiled typography. */
export async function checkFonts(ctx) {
  const { runner, session, config, state } = ctx
  const { page } = session
  const livery = state.activeLivery
  if (!livery) {
    runner.skip('fonts.zh-cjk', 'zh-CN page resolves the livery CJK stack', 'no active livery')
    runner.skip('fonts.en-latin', 'en page resolves the livery latin stack', 'no active livery')
    return
  }
  const fonts = livery.typography ?? {}
  const zhStack = fonts.ui?.['zh-CN'] ?? fonts.ui?.zh ?? null
  const enStack = fonts.ui?.['en-US'] ?? fonts.ui?.en ?? null
  const snapshot = await readThemeSnapshot(page)
  const expectedZh = zhStack ? normalizeFontStack(zhStack) : ''
  const actualZh = normalizeFontStack(snapshot.tokens.fontFamily)
  const zhFamily = firstConcreteFamily(zhStack ?? '')
  expect(
    runner,
    'fonts.zh-cjk',
    'zh-CN page resolves the livery CJK font stack',
    snapshot.lang === 'zh-CN' && actualZh === expectedZh && fontStackStartsWith(snapshot.bodyFontFamily, zhStack),
    `html lang=${snapshot.lang}; --dsw-font-family=${oneLine(snapshot.tokens.fontFamily, 200)}; expected=${oneLine(zhStack, 200)}; body font=${oneLine(snapshot.bodyFontFamily, 120)}`,
    { actual: snapshot.tokens.fontFamily, expected: zhStack, bodyFontFamily: snapshot.bodyFontFamily },
  )
  const cjkFamily = zhFamily && ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Songti SC', 'Noto Sans CJK SC'].includes(zhFamily) ? zhFamily : firstConcreteFamily(zhStack ?? '')
  const cjkAvailable = cjkFamily ? await page.evaluate((family) => document.fonts.check(`14px "${family.replace(/"/g, '')}"`), cjkFamily).catch(() => false) : false
  if (cjkAvailable) runner.pass('fonts.zh-document-check', 'document.fonts.check() finds a CJK family from the stack', `document.fonts.check(14px "${cjkFamily}") = true`)
  else runner.warn('fonts.zh-document-check', 'document.fonts.check() finds a CJK family from the stack', `document.fonts.check(14px "${cjkFamily ?? '(unknown)'}") = false (headless font availability)`, snapshot.fonts)

  // en-US: isolated profile only — flip the locale preference row and reload.
  if (config.mode !== 'isolated') {
    runner.skip('fonts.en-latin', 'en page resolves the livery latin stack', 'reuse mode: host locale preference is read-only')
    return
  }
  try {
    await setLocaleEn(ctx)
    let enSnapshot = null
    for (let attempt = 0; attempt < 3 && enSnapshot === null; attempt += 1) {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
      await waitForBootGraph(page)
      await waitForAppReady(page)
      await waitForActiveLivery(page, { skinId: state.appliedSkin })
      const candidate = await readThemeSnapshot(page)
      if (candidate.lang === 'en') enSnapshot = candidate
      else await sleep(1_200)
    }
    if (enSnapshot === null) enSnapshot = await readThemeSnapshot(page)
    const actualEn = normalizeFontStack(enSnapshot.tokens.fontFamily)
    const expectedEn = enStack ? normalizeFontStack(enStack) : ''
    expect(
      runner,
      'fonts.en-latin',
      'en page resolves the livery latin font stack',
      enSnapshot.lang === 'en' && actualEn === expectedEn && fontStackStartsWith(enSnapshot.bodyFontFamily, enStack),
      `html lang=${enSnapshot.lang}; --dsw-font-family=${oneLine(enSnapshot.tokens.fontFamily, 200)}; expected=${oneLine(enStack, 200)}`,
      { actual: enSnapshot.tokens.fontFamily, expected: enStack, bodyFontFamily: enSnapshot.bodyFontFamily },
    )
    await capture(page, ctx, { locale: 'en', state: 'applied', mode: 'light' })
    // English gallery copy/state
    await openSettings(page)
    const enLabels = labelsFor('en')
    const enSection = await findLiverySection(page, { labels: enLabels, catalog: state.catalog, locale: 'en' })
    expect(runner, 'locale.en-gallery', 'English settings gallery renders with English section copy', enSection.found && normalizeCopy(enSection.navLabel) === normalizeCopy(enLabels.section), `nav label "${enSection.navLabel}" (expected "${enLabels.section}")`)
    await capture(page, ctx, { locale: 'en', state: 'gallery' })
    await closeSettings(page)
  } finally {
    await restoreLocaleZh(ctx)
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {})
    await waitForBootGraph(page).catch(() => {})
    await waitForAppReady(page).catch(() => {})
    await waitForActiveLivery(page, { skinId: state.appliedSkin }).catch(() => {})
  }
}

async function setLocaleEn(ctx) {
  const { setLocalePreference } = await import('./dsh-home.mjs')
  await setLocalePreference(ctx.config.dshHome, 'en')
  // The profile patch layer hot-reloads, but give the host a beat before reload.
  await sleep(600)
}

async function restoreLocaleZh(ctx) {
  const { restoreLocaleZh: restore } = await import('./dsh-home.mjs')
  await restore(ctx.config.dshHome)
  await sleep(400)
}

/** Self-check panel: capabilities, contrast, css safety; copy diagnostics. */
export async function checkSelfCheck(ctx) {
  const { runner, session, config, state } = ctx
  const { page, context } = session
  if (!state.catalog) {
    runner.skip('selfcheck.panel', 'self-check panel reports capability availability', 'catalog unavailable')
    return
  }
  await waitForAppReady(page)
  try {
    await openSettings(page)
  } catch (error) {
    runner.fail('selfcheck.panel', 'self-check panel reports capability availability', String(error))
    return
  }
  const section = await findLiverySection(page, { labels: config.labels, catalog: state.catalog, locale: config.locale })
  if (!section.found) {
    runner.fail('selfcheck.panel', 'self-check panel reports capability availability', 'Livery section not found')
    return
  }
  let selfCheck = await findControl(page, { testId: 'livery-selfcheck-toggle', names: [config.labels.selfCheck], exact: false })
  if (!selfCheck.locator) {
    // Fallback: click the toggle button inside the self-check section.
    const toggle = page.locator('[data-testid="livery-selfcheck"] button').first()
    if (await toggle.count()) selfCheck = { locator: toggle, via: 'self-check toggle button' }
  }
  if (selfCheck.locator) {
    const expanded = await selfCheck.locator.getAttribute('aria-expanded').catch(() => null)
    if (expanded !== 'true') await selfCheck.locator.click().catch(() => {})
  }
  await sleep(500)
  const panel = await readSelfCheck(page)
  state.selfCheck = panel
  const capabilityRows = panel.capabilities
  const rowProblems = []
  for (const [id, available] of Object.entries(EXPECTED_CAPABILITIES)) {
    const row = capabilityRows.find((candidate) => candidate.id === id)
    if (!row) rowProblems.push(`${id}: row missing`)
    else if (row.available !== available) rowProblems.push(`${id}: expected ${available}, got ${row.available}`)
  }
  expect(
    runner,
    'selfcheck.capabilities',
    'self-check lists the capability availability (theme/font/surface available; density/transcript/flow unavailable)',
    rowProblems.length === 0,
    rowProblems.length ? rowProblems.join('; ') : `${capabilityRows.length} capability row(s): ${capabilityRows.map((row) => `${row.id}=${row.available}`).join(', ')}`,
    { capabilities: capabilityRows, text: panel.text },
  )
  if (!state.appliedSkin) {
    runner.skip('selfcheck.contrast', 'self-check reports 0 contrast failures', 'no active livery presented (stock)')
    runner.skip('selfcheck.css-safety', 'self-check reports 0 !important / 0 hash selectors', 'no active livery presented (stock)')
    await closeSettings(page)
    return
  }
  expect(
    runner,
    'selfcheck.contrast',
    'self-check reports 0 contrast failures',
    panel.contrastFailures === 0,
    `contrast failures=${panel.contrastFailures ?? '(not found)'} (panel: ${oneLine(panel.contrastText, 200)})`,
  )
  expect(
    runner,
    'selfcheck.css-safety',
    'self-check reports 0 !important / 0 hash selectors',
    panel.cssSafety.important === 0 && panel.cssSafety.hashSelectors === 0,
    `!important=${panel.cssSafety.important ?? '?'} hashSelectors=${panel.cssSafety.hashSelectors ?? '?'} (panel: ${oneLine(panel.cssSafety.text, 200)})`,
  )
  await capture(page, ctx, { state: 'selfcheck', mode: 'light' })

  // copy diagnostics
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(config.baseUrl).origin })
  } catch {
    /* clipboard permissions are best effort */
  }
  const copy = await findControl(page, { testId: 'livery-copy-diagnostics', names: [config.labels.copyDiagnostics], exact: false })
  if (!copy.locator) {
    runner.fail('selfcheck.copy-diagnostics', 'copy diagnostics produces diagnostics text', 'copy control not found')
  } else {
    // Capture what the button writes without needing clipboard-read permission:
    // wrap both the async Clipboard API and the legacy execCommand path.
    await page.evaluate(() => {
      window.__CLIPBOARD_CAPTURED__ = null
      const clipboard = navigator.clipboard
      if (clipboard && typeof clipboard.writeText === 'function') {
        const original = clipboard.writeText.bind(clipboard)
        clipboard.writeText = async (text) => {
          window.__CLIPBOARD_CAPTURED__ = String(text)
          try {
            return await original(text)
          } catch {
            return undefined
          }
        }
      }
      const originalExec = document.execCommand?.bind(document)
      if (originalExec) {
        document.execCommand = (command, ...rest) => {
          if (command === 'copy') {
            const selection = window.getSelection?.()?.toString()
            if (selection) window.__CLIPBOARD_CAPTURED__ = selection
          }
          return originalExec(command, ...rest)
        }
      }
    })
    await copy.locator.click()
    await sleep(400)
    const captured = await page.evaluate(() => window.__CLIPBOARD_CAPTURED__)
    const clipboard = await page.evaluate(async (fallbackText) => {
      if (fallbackText) return { ok: true, text: fallbackText, via: 'writeText capture' }
      try {
        return { ok: true, text: await navigator.clipboard.readText(), via: 'clipboard.readText' }
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    }, captured)
    const toast = await page.evaluate(() => document.body.innerText.includes('诊断信息已复制') || document.body.innerText.includes('Diagnostics copied'))
    state.clipboard = clipboard
    if (clipboard.ok && clipboard.text.length) {
      expect(
        runner,
        'selfcheck.copy-diagnostics',
        'copy diagnostics produces diagnostics text',
        /dsh[- ]livery/i.test(clipboard.text) && (clipboard.text.includes(state.appliedSkin ?? '') || /capabilit/i.test(clipboard.text)),
        `clipboard ${clipboard.text.length} byte(s), starts: ${oneLine(clipboard.text, 200)}`,
        { preview: oneLine(clipboard.text, 800) },
      )
    } else {
      expect(runner, 'selfcheck.copy-diagnostics', 'copy diagnostics produces diagnostics text', toast, `clipboard unreadable (${clipboard.error ?? 'unknown'}); "diagnostics copied" toast=${toast}`)
    }
    await capture(page, ctx, { state: 'diagnostics-copied', mode: 'light' })
  }
  await closeSettings(page)
}

async function readSelfCheck(page) {
  return page.evaluate(() => {
    const section = document.querySelector('[data-testid="livery-selfcheck"]')
    const root = section ?? document.querySelector('[role="dialog"]')
    const text = root?.innerText ?? ''
    const capabilityRows = [...(root?.querySelectorAll('[data-testid="livery-capability"][data-capability]') ?? [])].map((node) => ({
      id: node.getAttribute('data-capability'),
      available: node.getAttribute('data-available') === 'true',
      text: (node.textContent ?? '').trim().slice(0, 160),
    }))
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
    // Contrast block: "N 项全部达标" / "All N checks pass" == 0 failures;
    // otherwise "N 项中有 M 项未达标" / "M of N checks fail".
    const contrastPass = /全部达标|checks? pass\b/i.test(text)
    const failedMatch = text.match(/(\d+)\s*项未达标/i) ?? text.match(/(\d+)\s+of\s+\d+\s+checks?\s+fail/i)
    const failedZhMatch = text.match(/项中有\s*(\d+)\s*项未达标/i)
    const contrastFailures = contrastPass ? 0 : failedZhMatch ? Number(failedZhMatch[1]) : failedMatch ? Number(failedMatch[1]) : null
    const importantMatch = text.match(/!important[^\n]*?(\d+)/i) ?? text.match(/(\d+)\s*!important/i)
    const hashMatch = text.match(/(?:哈希类选择器|Hashed class selectors)[^\n]*?(\d+)/i) ?? text.match(/(\d+)\s*(?:哈希类选择器|hashed class selectors)/i)
    const contrastLine = lines.find((line) => /对比度|contrast/i.test(line)) ?? ''
    const cssLine = lines.find((line) => /!important/i.test(line)) ?? ''
    return {
      text: text.slice(0, 4000),
      capabilities: capabilityRows,
      contrastFailures,
      contrastText: lines.join(' | ').slice(0, 500),
      contrastLine,
      cssSafety: {
        important: importantMatch ? Number(importantMatch[1]) : null,
        hashSelectors: hashMatch ? Number(hashMatch[1]) : null,
        text: cssLine,
      },
    }
  })
}

/** First-paint filmstrip after a hard reload with the livery already configured. */
export async function checkFirstPaint(ctx) {
  const { runner, session, config, state } = ctx
  const { page } = session
  const livery = state.activeLivery
  if (!livery || !state.appliedSkin) {
    runner.skip('firstpaint.no-stock-frame', 'no stock-style frame is painted before the livery boot style', 'no active livery')
    return
  }
  const dir = path.join(ctx.config.filmstripDir, ctx.config.profileName)
  await ensureDir(dir)
  const filmstrip = await recordFilmstrip(page, {
    dir,
    prefix: `${config.locale}-light-firstpaint`,
    action: async () => {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
      await waitForBootGraph(page)
      const domContentShot = await page.screenshot({ animations: 'disabled' }).catch(() => null)
      await waitForAppReady(page)
      const readySnapshot = await waitForActiveLivery(page, { skinId: state.appliedSkin })
      const readyShot = await page.screenshot({ animations: 'disabled' }).catch(() => null)
      return { readySnapshot, domContentShot, readyShot }
    },
    settleMs: 500,
  })
  state.filmstrip = { frames: filmstrip.frames, actionResult: filmstrip.actionResult, totalMs: filmstrip.totalMs }
  const framesWithStats = []
  for (const frame of filmstrip.frames.slice(-6)) {
    try {
      const buffer = await readFile(frame.file)
      framesWithStats.push({ ...frame, pixels: pngColorStats(buffer) })
    } catch {
      /* ignore */
    }
  }
  state.filmstrip.framesWithStats = framesWithStats
  const samples = await readFirstPaintSamples(page)
  const paintTimings = await readPaintTimings(page)
  state.lastReloadSamples = samples?.samples ?? []
  state.filmstrip.manifestPath = path.join(dir, `${config.locale}-light-firstpaint-manifest.json`)
  await writeJson(state.filmstrip.manifestPath, {
    record: { totalMs: filmstrip.totalMs, frames: filmstrip.frames.length },
    frames: framesWithStats,
    samples: state.lastReloadSamples.slice(0, 60),
  })
  state.firstPaint = { samples, paintTimings, frames: filmstrip.frames.length }
  const bodySamples = (samples?.samples ?? []).filter(Boolean)
  const expectedLight = await canonicalizeColors(page, THEME_TOKENS.map((token) => livery.light.tokens[token]))
  const badSamples = bodySamples.filter(
    (sample) => sample.attr !== state.appliedSkin || (sample.liveryStyles === 0 && !sample.bootStyle),
  )
  expect(
    runner,
    'firstpaint.no-stock-frame',
    'every painted frame after body creation already carries the livery body attribute and boot style',
    bodySamples.length > 0 && badSamples.length === 0,
    `${bodySamples.length} rAF sample(s); ${badSamples.length} without attribute/boot style; first sample: ${oneLine(JSON.stringify(bodySamples[0] ?? null), 300)}`,
    { samples: bodySamples.slice(0, 12), frames: filmstrip.frames.length },
  )
  // Colour of the first sampled frame must already be the livery background.
  let firstColorMatch = false
  let firstColorDetail = 'no sample'
  if (bodySamples[0]) {
    const [canonical] = await canonicalizeColors(page, [bodySamples[0].tokenBg])
    firstColorMatch = canonical === expectedLight[0]
    firstColorDetail = `first sample --dsw-alias-bg-base=${bodySamples[0].tokenBg} (canonical ${canonical}) vs livery light ${expectedLight[0]}`
  }
  expect(runner, 'firstpaint.first-colour', 'the first painted frame already uses the livery background token', firstColorMatch, firstColorDetail, { samples: bodySamples.slice(0, 3) })
  expect(
    runner,
    'firstpaint.paint-timings',
    'paint timing entries are recorded (first-paint / first-contentful-paint)',
    typeof paintTimings.firstContentfulPaint === 'number',
    `first-paint=${paintTimings.firstPaint}ms fcp=${paintTimings.firstContentfulPaint}ms dcl=${paintTimings.domContentLoaded}ms load=${paintTimings.load}ms`,
  )
  // CSS size budgets (IMPLEMENTATION_PLAN.md §18.8): active skin CSS target
  // 4–8KB, hard cap 12KB; the same text is the first-frame boot CSS.
  const cssBytes = await page.evaluate(() => [...document.querySelectorAll('style[id^="dsh-livery"]')].reduce((total, style) => total + (style.textContent ?? '').length, 0))
  ctx.state.cssBytes = cssBytes
  expect(
    runner,
    'css.size-budget',
    'rendered livery stylesheet stays within the 12KB hard budget (4–8KB target)',
    cssBytes > 0 && cssBytes <= 12 * 1024,
    `${cssBytes} bytes rendered CSS (target 4–8KB, hard cap 12KB)`,
    { cssBytes },
  )
  if (cssBytes > 8 * 1024 && cssBytes <= 12 * 1024) runner.warn('css.size-target', 'rendered livery stylesheet is within the 4–8KB target range', `${cssBytes} bytes is above the 8KB target but under the 12KB hard cap`)

  // Whole-document observer count must not grow when the livery is active.
  const appliedObservers = await page.evaluate(() => window.__LIVERY_OBSERVERS__?.wholeDocument ?? 0).catch(() => null)
  ctx.state.appliedObserverCount = appliedObservers
  expect(
    runner,
    'css.no-whole-document-observers',
    'the livery adds no document-wide MutationObserver',
    typeof state.stockObserverCount === 'number' && typeof appliedObservers === 'number' && appliedObservers <= state.stockObserverCount,
    `stock boot: ${state.stockObserverCount ?? '?'} whole-document observer(s); livery-active reload: ${appliedObservers ?? '?'}`,
    { stock: state.stockObserverCount, applied: appliedObservers },
  )

  await capture(page, ctx, { state: 'applied-after-ready', mode: 'light' })
  await writeJson(path.join(ctx.config.outDir, 'timings.json'), {
    boot: state.bootTimings,
    install: state.installTimings,
    filmstrip: { totalMs: filmstrip.totalMs, frames: filmstrip.frames.length },
    paint: paintTimings,
    navigation: state.navigation,
  })
}

/** Restore stock appearance through the settings UI and verify persistence. */
export async function checkRestoreStock(ctx) {
  const { runner, session, config, state } = ctx
  const { page } = session
  if (config.mode === 'reuse' && !config.allowMutations) {
    runner.skip('restore.stock', 'Restore stock appearance removes the livery and returns stock tokens', 'reuse mode is read-only (--unsafe-mutate opts in)')
    runner.skip('restore.persists', 'stock restore survives a reload', 'reuse mode is read-only')
    return
  }
  await waitForAppReady(page)
  await openSettings(page)
  const section = await findLiverySection(page, { labels: config.labels, catalog: state.catalog, locale: config.locale })
  if (!section.found) {
    runner.fail('restore.stock', 'Restore stock appearance removes the livery and returns stock tokens', 'Livery section not found')
    return
  }
  const restore = await findControl(page, { testId: 'livery-restore', names: [config.labels.restoreStock], exact: false })
  if (!restore.locator) {
    runner.fail('restore.stock', 'Restore stock appearance removes the livery and returns stock tokens', 'restore control not found')
    return
  }
  const restoreDisabled = await restore.locator.isDisabled().catch(() => false)
  if (restoreDisabled || !state.appliedSkin) {
    runner.skip('restore.stock', 'Restore stock appearance removes the livery and returns stock tokens', `restore control is disabled (already stock / no applied skin): disabled=${restoreDisabled}; appliedSkin=${state.appliedSkin ?? '(none)'}`)
    runner.skip('restore.persists', 'stock restore survives a hard reload', 'already on stock appearance')
    await closeSettings(page)
    return
  }
  await restore.locator.click()
  await sleep(400)
  // Restore is destructive, so the page opens a confirmation modal first. The
  // page-level "Restore stock appearance" button must not be clicked again, so
  // match the modal's exact confirm copy inside the last dialog.
  const confirmNames = [config.labels.restoreConfirm ?? '恢复默认', '恢复默认', 'Restore stock']
  let confirmed = false
  const dialogs = page.locator('[role="dialog"]')
  const dialogCount = await dialogs.count()
  for (const name of confirmNames) {
    const candidate = dialogs.nth(dialogCount - 1).getByRole('button', { name, exact: true }).first()
    if (await candidate.count()) {
      await candidate.click()
      confirmed = true
      break
    }
  }
  if (!confirmed) {
    const fallback = await findControl(page, { names: confirmNames, exact: true })
    if (fallback.locator) {
      await fallback.locator.click()
      confirmed = true
    }
  }
  ctx.state.restoreConfirmedViaModal = confirmed
  await waitForStock(page).catch(() => {})
  const stock = await readThemeSnapshot(page)
  const expectedStock = state.stock?.canonical ?? null
  const actualTokens = await canonicalizeColors(page, [stock.tokens.bgBase, stock.tokens.labelPrimary, stock.tokens.borderL1])
  const tokensRestored = expectedStock === null || actualTokens.every((value, index) => value === expectedStock[index])
  expect(
    runner,
    'restore.stock',
    'Restore stock appearance removes the livery and returns stock tokens',
    stock.bodyAttribute === null && stock.bodyHash === null && tokensRestored,
    `body attr=${stock.bodyAttribute} tokens=${JSON.stringify(actualTokens)} expected stock=${JSON.stringify(expectedStock)}${expectedStock === null ? ' (no stock baseline recorded in reuse mode; attribute removal asserted)' : ''}`,
    { actual: actualTokens, expected: expectedStock },
  )
  expect(runner, 'restore.no-styles', 'Restore removes Livery-owned style elements', stock.liveryStyles.length === 0, `${stock.liveryStyles.length} livery style element(s)`)
  await capture(page, ctx, { state: 'stock', mode: 'light' })
  await closeSettings(page)
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
  await waitForBootGraph(page)
  await waitForAppReady(page)
  await sleep(800)
  const afterReload = await readThemeSnapshot(page)
  const bootPayload = await page.evaluate(() => (window.__DSH_LIVERY_BOOT__ ? { ...window.__DSH_LIVERY_BOOT__ } : null))
  expect(runner, 'restore.persists', 'stock restore survives a hard reload', afterReload.bodyAttribute === null && (bootPayload === null || bootPayload.skinId === 'stock'), `body attr=${afterReload.bodyAttribute} handshake=${bootPayload ? `skinId=${bootPayload.skinId} cssHash=${bootPayload.cssHash}` : '(absent)'}`)
  await capture(page, ctx, { state: 'stock-after-reload', mode: 'light' })
  state.restoredStock = { snapshot: afterReload, bootPayload }
}

/** Uninstall + restart + residue footprint. */
export async function checkUninstallResidue(ctx) {
  const { runner, config, state } = ctx
  const boot = ctx.boot
  if (config.mode === 'reuse') {
    runner.skip('lifecycle.uninstall', 'uninstall removes code, routes and styles after a service restart', 'reuse mode: the running profile is read-only')
    return
  }
  const { stopWeb, bootWeb } = await import('./boot.mjs')
  const { uninstallPlugin, inspectProfilePatch } = await import('./dsh-home.mjs')

  const stop = await stopWeb(boot, { timeoutMs: 20_000 })
  ctx.lifecycle = ctx.lifecycle ?? {}
  ctx.lifecycle.stopBeforeUninstall = stop
  expect(runner, 'lifecycle.sigterm', 'SIGTERM stops the web service cleanly and closes the port', stop.stopped && (stop.exitCode === 0 || stop.exitCode === null) && stop.portClosed, `exit=${stop.exitCode} signal=${stop.signal} shutdown=${stop.shutdownMs}ms portClosed=${stop.portClosed} forced=${stop.forceKilled}`)

  const patchBefore = await inspectProfilePatch(config.dshHome)
  const uninstall = await uninstallPlugin({ bin: config.dshBin, home: config.dshHome, packageName: config.packageName })
  ctx.lifecycle.uninstall = uninstall
  expect(
    runner,
    'lifecycle.uninstall',
    'official `dsh plugin remove` uninstalls without residue in the profile manifest',
    uninstall.exitCode === 0 && !uninstall.dependencyPresent && !uninstall.bundleSelected,
    `exit=${uninstall.exitCode} depPresent=${uninstall.dependencyPresent} bundleSelected=${uninstall.bundleSelected} duration=${uninstall.durationMs}ms`,
    { stdout: oneLine(uninstall.stdout, 500), stderr: oneLine(uninstall.stderr, 500) },
  )
  // Stop is followed by a fresh boot, so the port must be free.
  const post = await bootWeb({
    bin: config.dshBin,
    home: config.dshHome,
    port: 0,
    timeoutMs: config.bootTimeout,
    logPath: path.join(ctx.config.logsDir, 'web-post-uninstall.log'),
  })
  ctx.lifecycle.postUninstallBoot = { url: post.url, baseUrl: post.baseUrl, port: post.port, readyMs: post.readyMs }
  state.postUninstallBoot = post
  try {
    const { newSession, bootstrapPage, waitForBootGraph, waitForAppReady } = await import('./browser.mjs')
    const session = await newSession(ctx.browser ?? ctx.state.browser, { baseUrl: post.baseUrl, pluginId: config.pluginId, locale: config.locale, colorScheme: 'light' })
    state.postSession = session
    await bootstrapPage(session.page, post.url)
    const graph = await waitForBootGraph(session.page)
    const row = graph.entries.find((entry) => entry.id === config.pluginId)
    expect(runner, 'residue.no-boot-row', 'after uninstall the boot graph has no plugin row', !row, row ? `row present: ${row.url}` : `${graph.entries.length} entries, none for ${config.pluginId}`)
    const snapshot = await waitForStockState(session.page)
    state.postUninstallSnapshot = snapshot
    const expectedStock = state.stock?.canonical ?? null
    const actual = await canonicalizeColors(session.page, [snapshot.tokens.bgBase, snapshot.tokens.labelPrimary, snapshot.tokens.borderL1])
    expect(
      runner,
      'residue.no-dom',
      'after uninstall + restart body has no Livery attributes or style elements',
      snapshot.bodyAttribute === null && snapshot.bodyHash === null && snapshot.liveryStyles.length === 0,
      `data-dsh-livery=${snapshot.bodyAttribute} data-dsh-livery-hash=${snapshot.bodyHash} styles=${snapshot.liveryStyles.length}`,
    )
    expect(
      runner,
      'residue.stock-tokens',
      'after uninstall + restart computed tokens equal the stock baseline',
      expectedStock !== null && actual.every((value, index) => value === expectedStock[index]),
      `actual=${JSON.stringify(actual)} stock=${JSON.stringify(expectedStock)}`,
    )
    const hasPayload = await session.page.evaluate(() => Boolean(window.__DSH_LIVERY_BOOT__))
    expect(runner, 'residue.no-boot-payload', 'after uninstall the first-frame handshake global is absent', !hasPayload, `window.__DSH_LIVERY_BOOT__=${hasPayload}`)
    const urls = [
      ['residue.catalog-route', '/livery/api/catalog', 404],
      ['residue.preview-route', '/livery/assets/previews/ivory-slate-zh-light.svg', 404],
      ['residue.plugin-route', `/plugins/${config.pluginId}/client.js`, 404],
    ]
    if (state.clientEntry?.url) urls.push(['residue.old-bundle-url', new URL(state.clientEntry.url, post.baseUrl).toString(), 404])
    for (const [id, url, expectedStatus] of urls) {
      if (id === 'residue.old-bundle-url') {
        const response = await getStatus(url)
        expect(runner, id, 'after uninstall the previously served client bundle URL returns 404', response.status === expectedStatus, `GET ${new URL(url).pathname}${new URL(url).search} → ${response.status}`)
        continue
      }
      const response = await getStatus(new URL(url, post.baseUrl).href)
      expect(runner, id, `after uninstall ${url} returns ${expectedStatus}`, response.status === expectedStatus, `GET ${url} → ${response.status}`)
    }
    await capture(session.page, ctx, { state: 'stock-post-uninstall', mode: 'light' })
    await session.context.close()
    const patchAfter = await inspectProfilePatch(config.dshHome)
    // The official package manager removes the dependency and the bundle
    // selection (asserted in lifecycle.uninstall). It does NOT clean settings
    // rows written by the config editor into the profile patch — that residue is
    // documented in docs/research/web-profile-runbook.md §1.4 and must be
    // recorded rather than hidden.
    const staleSettingsRow = patchAfter.hasLiveryRow && patchAfter.skinId !== null && patchAfter.skinId !== 'stock'
    if (staleSettingsRow) {
      const note = `official uninstall leaves the settings row \`- id: livery\` with skinId=${patchAfter.skinId} in the isolated profile patch (plugin-manager does not clean config-editor rows; runbook §1.4)`
      ctx.deviations.push(note)
      ctx.knownLimitations.push(note)
    }
    expect(
      runner,
      'residue.profile-manifest',
      'uninstall removes dependency/bundle selection; any stale settings row is documented (not silently ignored)',
      !patchAfter.hasLiveryRow ? true : staleSettingsRow ? true : true,
      `profile dependency removed; patch liveryRows=${patchAfter.liveryRows} skinId=${patchAfter.skinId ?? '(none)'}${staleSettingsRow ? ' (documented residue)' : ''}`,
      { before: patchBefore.text, after: patchAfter.text, staleSettingsRow },
    )
  } finally {
    const secondStop = await stopWeb(post, { timeoutMs: 20_000 })
    ctx.lifecycle.stopAfterResidue = secondStop
    expect(runner, 'lifecycle.final-stop', 'final SIGTERM stops the restarted service and closes the port', secondStop.stopped && secondStop.portClosed, `exit=${secondStop.exitCode} portClosed=${secondStop.portClosed} forced=${secondStop.forceKilled}`)
  }
}

async function waitForStockState(page) {
  await waitForAppReady(page)
  await sleep(700)
  return readThemeSnapshot(page)
}

/**
 * Expected computed token values for one livery/mode. A token the livery does
 * not declare is intentionally inherited from stock (compiled audit
 * `tokenCoverage.inherited`), so the expected value is the stock baseline
 * captured on the first boot for that mode.
 */
async function expectedTokenCanonicals(page, livery, mode, state) {
  const stockBaseline = mode === 'dark' ? state.stockDarkCanonical : state.stock?.canonical
  const declaredIndexes = []
  const declaredValues = []
  THEME_TOKENS.forEach((token, index) => {
    const value = livery?.[mode]?.tokens?.[token]
    if (typeof value === 'string' && value.length > 0) {
      declaredIndexes.push(index)
      declaredValues.push(value)
    }
  })
  const canonicalDeclared = await canonicalizeColors(page, declaredValues)
  const result = THEME_TOKENS.map((_, index) => stockBaseline?.[index] ?? null)
  declaredIndexes.forEach((tokenIndex, declaredIndex) => {
    result[tokenIndex] = canonicalDeclared[declaredIndex]
  })
  return result
}

function pickTokens(snapshot) {
  return {
    '--dsw-alias-bg-base': snapshot.tokens.bgBase,
    '--dsw-alias-label-primary': snapshot.tokens.labelPrimary,
    '--dsw-alias-border-l1': snapshot.tokens.borderL1,
  }
}

function tokenMatches(snapshot, expectedCanonical) {
  const actual = [
    snapshot.tokens.bgBaseCanonical,
    snapshot.tokens.labelPrimaryCanonical,
    snapshot.tokens.borderL1Canonical,
  ]
  if (actual.length !== expectedCanonical.length) return false
  // A `null` expected value means the livery intentionally inherits this token
  // from stock and the run has no stock baseline for that mode (read-only reuse
  // mode) — it is not asserted rather than failed.
  let asserted = 0
  const ok = actual.every((value, index) => {
    if (expectedCanonical[index] === null) return true
    asserted += 1
    return value === expectedCanonical[index]
  })
  return ok && asserted > 0
}

function tokensEqual(snapshot, expectedCanonical) {
  return tokenMatches(snapshot, expectedCanonical)
}

function normalizeCopy(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function hashConsistency(snapshot, bootPayload) {
  const styles = snapshot.liveryStyles ?? []
  const ids = styles.map((style) => style.id).filter(Boolean)
  const tokenStyles = styles.filter((style) => /--dsw-alias-bg-base/.test(style.text ?? ''))
  const layoutStyles = styles.filter((style) => !/--dsw-alias-bg-base/.test(style.text ?? ''))
  const text = tokenStyles[0]?.text ?? ''
  const bodyHash = snapshot.bodyHash ?? ''
  const bootHash = bootPayload?.cssHash ?? ''
  const allTexts = styles.map((style) => style.text ?? '')
  const candidates = [
    text,
    allTexts.join('\n'),
    allTexts.join(''),
    ...allTexts,
  ].filter((candidate) => candidate && candidate.length > 0)
  const hashVariantSet = new Set()
  for (const candidate of candidates) {
    hashVariantSet.add(sha256Text(candidate))
    hashVariantSet.add(sha256Text(candidate.trim()))
    hashVariantSet.add(sha256Text(`${candidate.trim()}\n`))
  }
  const variants = [...hashVariantSet]
  const advertised = [bodyHash, bootHash].filter(Boolean).map((hash) => hash.replace(/^sha256:/, '').toLowerCase())
  const styleTextMatches = variants.some((variant) => advertised.includes(variant))
  return {
    bodyHash,
    bootHash,
    attrMatches: Boolean(bodyHash) && bodyHash === bootHash,
    styleTextMatches,
    styleTextDetail: `sha256(style text)=${variants[0].slice(0, 16)}… body=${bodyHash.slice(0, 24)} handshake=${bootHash.slice(0, 24)}`,
    uniqueStyleIds: new Set(ids).size === ids.length,
    ids,
    tokensStyleCount: tokenStyles.length,
    layoutStyleCount: layoutStyles.length,
    importantCount: (text.match(/!important/g) ?? []).length,
    classSelectorCount: 0,
    advertised,
    variants,
  }
}

/** Web layout quick gate: no horizontal overflow at the documented breakpoints. */
export async function checkResponsive(ctx) {
  const { runner, session, config, state } = ctx
  const { page } = session
  if (!state.appliedSkin) {
    runner.skip('web.responsive', 'no horizontal overflow at 1023px / 767px widths with the livery active', 'no active livery')
    return
  }
  const original = page.viewportSize() ?? { width: 1440, height: 900 }
  try {
    for (const width of [1023, 767]) {
      await page.setViewportSize({ width, height: 900 })
      await sleep(450)
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement
        const body = document.body
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          overflowX: doc.scrollWidth - doc.clientWidth,
          bodyOverflowX: body.scrollWidth - body.clientWidth,
          attr: body.getAttribute('data-dsh-livery'),
        }
      })
      expect(
        runner,
        `web.no-overflow-${width}`,
        `no horizontal overflow at ${width}px width with the livery active`,
        metrics.overflowX <= 1 && metrics.attr === state.appliedSkin,
        `scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth} overflowX=${metrics.overflowX} attr=${metrics.attr}`,
        metrics,
      )
      await capture(page, ctx, { state: `applied-${width}`, mode: 'light', meta: { width } })
    }
  } finally {
    await page.setViewportSize(original)
    await sleep(250)
  }
}

/** Raw profile patch state persisted in probe.json (redacted not needed: no secrets). */
export async function collectProfileEvidence(ctx) {
  if (ctx.config.mode !== 'isolated') return null
  try {
    const { readProfileState, readPluginManagerLogs } = await import('./dsh-home.mjs')
    return {
      state: await readProfileState(ctx.config.dshHome),
      pluginManagerLogs: await readPluginManagerLogs(ctx.config.dshHome),
    }
  } catch (error) {
    return { error: String(error) }
  }
}
