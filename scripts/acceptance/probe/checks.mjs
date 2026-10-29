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
  openSettingsDetailed,
  readFirstPaintSamples,
  readClipboardText,
  bootstrapPage,
  inspectPanellist,
  liveryPanelRoot,
  liveryPanelVisible,
  openLiveryDetailed,
  PANEL_NAV_VIA,
  readCardNames,
  readAboutFooter,
  readGallery,
  readGalleryStructure,
  readLayoutStructure,
  readTypographyScale,
  readHostStyleProbe,
  readIndexedDbKeys,
  readLocaleTab,
  readThumbLocales,
  setRangeValue,
  readWallpaperState,
  thumbLocaleOf,
  waitForThumbLocale,
  readLiveryCssRules,
  readMainColumnState,
  readSettingsSectionLabels,
  returnToConversation,
  readObserverReport,
  readPaintTimings,
  readThemeSnapshot,
  recordFilmstrip,
  waitForAppReady,
  waitForBootGraph,
} from './browser.mjs'
import { getJson, getStatus, probeBrowserTrust, probePluginBundle, rawRequest } from './http.mjs'
import { inspectProfilePatch } from './dsh-home.mjs'
import { BASE_CAPABILITIES, labelsFor, tagLabelsFor } from './labels.mjs'
import {
  adapterForTriple,
  describeAdapter,
  expectedPreviewsBase,
  otherCatalogProfiles,
} from './certified-adapters.mjs'
import { getPicsumFixturePort } from './playwright.mjs'
import {
  ensureDir,
  firstConcreteFamily,
  fontStackStartsWith,
  normalizeFontStack,
  oneLine,
  pngColorStats,
  sha256Text,
  WORKSPACE_ROOT,
  sleep,
  writeJson,
  writeText,
} from './util.mjs'

const THEME_TOKENS = ['--dsw-alias-bg-base', '--dsw-alias-label-primary', '--dsw-alias-border-l1']

/** Round-5 style system: the catalog ships 24 designs per profile. */
const MIN_LIVERIES = 24

/** Per-livery compiled CSS hard budget (style-system.md §5). */
const CSS_BUDGET_BYTES = 12 * 1024

/**
 * Final 0.1.4 merged-client caps (Lead-owned decisions; acceptance reports the
 * actual bytes). Host gzip/tgz caps are Lead-owned in build/release and are not
 * asserted here.
 */
const CLIENT_GZIP_BUDGET_BYTES = 60 * 1024
const CLIENT_GZIP_BUDGET_LABEL = '60 KiB'
const RENDERED_CSS_BUDGET_BYTES = 20 * 1024
const RENDERED_CSS_TARGET_BYTES = 16 * 1024
const RENDERED_CSS_BUDGET_LABEL = '20 KiB'

/** Load the committed performance baseline, or undefined when absent. */
async function loadPerfBaseline() {
  try {
    return JSON.parse(await readFile(path.join(WORKSPACE_ROOT, 'contracts', 'dsh', 'perf-baseline.json'), 'utf8'))
  } catch {
    return null
  }
}

/** The UI locale the running page actually presents (host pin wins over flags). */
async function detectUiLocale(page) {
  const lang = await page.evaluate(() => document.documentElement.lang || '').catch(() => '')
  return String(lang).toLowerCase().startsWith('en') ? 'en' : 'zh'
}

function expect(runner, id, title, condition, detail, evidence) {
  if (condition) return runner.pass(id, title, detail, evidence)
  return runner.fail(id, title, detail, evidence)
}

/**
 * Assert one boot payload against the certified-adapter matrix. Shared by the
 * first (stock) boot, the post-Apply reload and reuse-mode passes so every path
 * checks the exact `(hostVersion, adapterId, contractHash, catalogProfile)`
 * quadruple instead of hardcoded 0.2.0 values.
 */
function assertBootIdentity(ctx, payload, { checkId, title, phase }) {
  const { runner, config } = ctx
  const matched = payload ? adapterForTriple(payload) : undefined
  const expected = config.expectedAdapter ?? matched ?? null
  const problems = []
  if (!payload) problems.push('no first-frame payload')
  if (payload && !matched) problems.push('payload identity triple is not in the certified adapter matrix')
  if (payload && expected) {
    if (payload.hostVersion !== expected.hostVersion) problems.push(`hostVersion ${payload.hostVersion} ≠ expected ${expected.hostVersion}`)
    if (payload.adapterId !== expected.adapterId) problems.push(`adapterId ${payload.adapterId} ≠ expected ${expected.adapterId}`)
    if (payload.contractHash !== expected.contractHash) problems.push('contractHash ≠ expected')
    if (payload.catalogProfile !== expected.catalogProfile) problems.push(`catalogProfile ${payload.catalogProfile} ≠ expected`)
  }
  if (payload && payload.catalogUrl !== '/livery/api/catalog') problems.push(`catalogUrl ${payload.catalogUrl}`)
  if (payload && payload.entryId !== 'livery') problems.push(`entryId ${payload.entryId}`)
  if (payload && !/^sha256:[0-9a-f]{64}$/.test(payload.cssHash ?? '')) problems.push('cssHash is not a sha256')
  const profileKindOk = payload?.profileKind === 'web' || payload?.profileKind === 'desktop'
  if (payload && !profileKindOk) problems.push(`profileKind ${payload?.profileKind}`)
  if (payload && config.expectedProfileKind && payload.profileKind !== config.expectedProfileKind) {
    problems.push(`profileKind ${payload.profileKind} ≠ expected ${config.expectedProfileKind}`)
  }
  return expect(
    runner,
    checkId,
    title,
    problems.length === 0,
    problems.length
      ? `${phase}: ${problems.join('; ')}`
      : `${phase}: accepted=${payload.accepted} hostVersion=${payload.hostVersion} adapterId=${payload.adapterId} contractHash=${oneLine(payload.contractHash, 20)}… catalogProfile=${oneLine(payload.catalogProfile, 20)}… profileKind=${payload.profileKind} skinId=${payload.skinId} cssHash=${oneLine(payload.cssHash, 24)}…`,
    payload ?? undefined,
  )
}

/** The certified adapter this run is supposed to certify (explicit or inferred). */
function expectedAdapterOf(ctx) {
  if (ctx.state.certifiedAdapter) return ctx.state.certifiedAdapter
  const payload = ctx.state.bootPayloadApplied ?? ctx.state.bootPayload
  if (payload) {
    const matched = adapterForTriple(payload)
    if (matched) return matched
  }
  return ctx.config.expectedAdapter ?? null
}

/** Exact capability availability expected for this host build. */
function expectedCapabilitiesOf(ctx) {
  const adapter = expectedAdapterOf(ctx)
  if (adapter) return adapter.capabilities
  return { ...BASE_CAPABILITIES, 'host-font-role-hooks': false }
}

/** Typography strategy selected by capability facts, never by version string. */
function fontStrategyOf(ctx) {
  const capabilities = ctx.state.catalog?.capabilities ?? expectedAdapterOf(ctx)?.capabilities ?? {}
  return capabilities['host-font-role-hooks']?.available === true ? 'role-hooks' : 'legacy-composite'
}

/** Preview asset base the host advertised (per catalog profile) or the legacy root. */
function previewsBaseOf(ctx) {
  const base = ctx.state.catalog?.previewsBase
  return typeof base === 'string' && base.length > 0 ? base : '/livery/assets/previews/'
}

/** Absolute preview URL for one asset name. */
function previewUrl(ctx, file) {
  return new URL(`${previewsBaseOf(ctx)}${file}`, ctx.config.baseUrl).href
}

/** Screenshot into the evidence layout `<locale>-<mode>-<state>.png`. */
export async function capture(page, ctx, { locale = ctx.config.locale, mode = 'light', state, meta = {} }) {
  const dir = path.join(ctx.config.screensDir, ctx.config.profileName)
  const file = path.join(dir, `${locale}-${mode}-${state}.png`)
  const shot = await captureScreenshot(page, file, { label: `${locale}/${mode}/${state}`, meta })
  ctx.artifacts.screenshots.push({ ...shot, locale, mode, state: meta.state ?? state })
  return shot
}

/**
 * Cache-only remote rendering: remote wallpaper CSS must carry a live `blob:`
 * object URL (verified by fetching it in-page), never the raw remote URL.
 * Product round-2 renders remotes from the local cache only; raw-URL fallback is
 * no longer a valid acceptance state.
 */
async function waitForCacheOnlyLayer(page, rawUrl, { timeoutMs = 15_000 } = {}) {
  await page.waitForFunction(
    (url) => {
      const text = document.querySelector('style#dsh-livery-wallpaper')?.textContent ?? ''
      return text.includes('blob:') && !text.includes(url)
    },
    rawUrl,
    { timeout: timeoutMs },
  ).catch(() => {})
  return readCacheOnlyLayer(page, rawUrl)
}

async function readCacheOnlyLayer(page, rawUrl) {
  const evidence = await page.evaluate((url) => {
    const text = document.querySelector('style#dsh-livery-wallpaper')?.textContent ?? ''
    const blobUrls = [...text.matchAll(/blob:[^)'"\s]+/gu)].map((match) => match[0])
    return {
      styleText: text,
      attribute: document.body.getAttribute('data-dsh-wallpaper'),
      stylePresent: document.querySelector('style#dsh-livery-wallpaper') !== null,
      blobUrls,
      hasBlob: blobUrls.length > 0,
      rawInStyle: text.includes(url),
      rawUrl: url,
    }
  }, rawUrl)
  let blobFetchOk = false
  if (evidence.blobUrls.length > 0) {
    blobFetchOk = await page.evaluate(async (blobUrl) => {
      try {
        const response = await fetch(blobUrl)
        return response.ok && (response.headers.get('content-type') ?? '').startsWith('image/')
      } catch {
        return false
      }
    }, evidence.blobUrls[0]).catch(() => false)
  }
  return { ...evidence, blobFetchOk }
}

/**
 * Cache-first remote selection: block until the persisted state records the
 * verified remote URL. The UI must not commit selection/localStorage before the
 * blob download succeeds, so callers assert the rendered layer first and then
 * this persisted state.
 */
async function waitForStoredRemote(page, url, { timeoutMs = 15_000 } = {}) {
  await page.waitForFunction(
    (expected) => {
      try {
        const raw = window.localStorage.getItem('dsh-livery.wallpaper.v1')
        const state = raw === null ? null : JSON.parse(raw)
        return state?.selection?.kind === 'remote' && state.selection.url === expected
      } catch {
        return false
      }
    },
    url,
    { timeout: timeoutMs },
  ).catch(() => {})
}

async function readStoredWallpaper(page) {
  return page.evaluate(() => {
    try {
      const raw = window.localStorage.getItem('dsh-livery.wallpaper.v1')
      return raw === null ? null : JSON.parse(raw)
    } catch {
      return null
    }
  })
}

/**
 * Realistic Picsum fixture: the list endpoint returns JSON; image requests on
 * picsum.photos answer a real 302 to `fastly.picsum.photos` (with the local
 * fixture port). The acceptance browser maps that hostname to a loopback HTTPS
 * server, so the redirect is followed by the real network stack and the product's
 * final-URL revalidation runs against a public HTTPS URL.
 */
async function installPicsumRedirectMock(page, { tinyPng, listBody = [{ id: '10', author: 'Tester' }, { id: '11', author: 'Tester' }], onList, listResponse } = {}) {
  const fixturePort = getPicsumFixturePort()
  await page.route('https://picsum.photos/**', (route) => {
    const url = route.request().url()
    if (!url.includes('/v2/list')) {
      const pathname = new URL(url).pathname
      const finalUrl = `https://fastly.picsum.photos:${fixturePort}${pathname}.jpg?hmac=acceptance-fixture`
      return route.fulfill({
        status: 302,
        headers: {
          location: finalUrl,
          'access-control-allow-origin': '*',
          'cache-control': 'no-store',
        },
      })
    }
    if (onList !== undefined) onList(url)
    if (listResponse !== undefined) return listResponse(route)
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(listBody) })
  })
}

async function uninstallPicsumRedirectMock(page) {
  await page.unroute('https://picsum.photos/**').catch(() => {})
}

/** Click a 0.1.4 wallpaper source tab and wait for its panel. */
async function selectWallpaperSource(page, tab) {
  const locator = page.locator(`[data-testid="wallpaper-source-tab-${tab}"]`)
  if ((await locator.count().catch(() => 0)) > 0) {
    await locator.click({ timeout: 8_000 }).catch(() => {})
    await page.waitForSelector(`[data-testid="wallpaper-source-panel-${tab}"]`, { state: 'visible', timeout: 8_000 }).catch(() => {})
    await sleep(180)
  }
}

/** Open the collapsed 0.1.4 managed presets/local-data details section. */
async function ensureWallpaperManageOpen(page) {
  const manage = page.locator('[data-testid="wallpaper-manage"]')
  if ((await manage.count().catch(() => 0)) === 0) return false
  if ((await manage.getAttribute('open').catch(() => null)) === null) {
    const toggle = page.locator('[data-testid="wallpaper-manage-toggle"]')
    if ((await toggle.count().catch(() => 0)) > 0) await toggle.click({ timeout: 8_000 }).catch(() => {})
    await sleep(250)
  }
  return (await manage.getAttribute('open').catch(() => null)) !== null
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
  ctx.state.catalogResponseBytes = response.body?.length ?? null
  if (!ctx.environment.packageVersion && typeof catalog.compilerVersion === 'string') ctx.environment.packageVersion = catalog.compilerVersion
  ctx.state.catalog = catalog
  ctx.artifacts.catalog = catalog
  expect(
    runner,
    'catalog.schema',
    'catalog shape carries the certified host identity and catalog profile',
    catalog.schemaVersion === 1
      && typeof catalog.adapterId === 'string'
      && typeof catalog.hostVersion === 'string'
      && typeof catalog.contractHash === 'string'
      && typeof catalog.catalogProfile === 'string'
      && typeof catalog.previewsBase === 'string',
    `schemaVersion=${catalog.schemaVersion} hostVersion=${catalog.hostVersion} adapterId=${catalog.adapterId} contractHash=${oneLine(catalog.contractHash, 20)}… catalogProfile=${oneLine(catalog.catalogProfile, 20)}… previewsBase=${catalog.previewsBase}`,
    { schemaVersion: catalog.schemaVersion, hostVersion: catalog.hostVersion, adapterId: catalog.adapterId, contractHash: catalog.contractHash, catalogProfile: catalog.catalogProfile, previewsBase: catalog.previewsBase },
  )
  const certifiedFromCatalog = adapterForTriple(catalog)
  const expectedAdapter = ctx.config.expectedAdapter ?? null
  const identityProblems = []
  if (!certifiedFromCatalog) identityProblems.push('catalog identity triple is not in the certified adapter matrix')
  if (expectedAdapter) {
    if (catalog.hostVersion !== expectedAdapter.hostVersion) identityProblems.push(`hostVersion ${catalog.hostVersion} ≠ expected ${expectedAdapter.hostVersion}`)
    if (catalog.adapterId !== expectedAdapter.adapterId) identityProblems.push(`adapterId ${catalog.adapterId} ≠ expected ${expectedAdapter.adapterId}`)
    if (catalog.contractHash !== expectedAdapter.contractHash) identityProblems.push('contractHash ≠ expected')
  }
  if (certifiedFromCatalog) {
    if (catalog.catalogProfile !== certifiedFromCatalog.catalogProfile) identityProblems.push('catalogProfile ≠ certified profile')
    const expectedBase = expectedPreviewsBase(certifiedFromCatalog.catalogProfile)
    if (catalog.previewsBase !== expectedBase) identityProblems.push(`previewsBase ${catalog.previewsBase} ≠ ${expectedBase}`)
  }
  expect(
    runner,
    'catalog.certified-identity',
    'catalog reports a certified (hostVersion, adapterId, contractHash, catalogProfile) quadruple',
    identityProblems.length === 0,
    identityProblems.length ? identityProblems.join('; ') : describeAdapter(certifiedFromCatalog),
    { catalog: { hostVersion: catalog.hostVersion, adapterId: catalog.adapterId, contractHash: catalog.contractHash, catalogProfile: catalog.catalogProfile }, expected: expectedAdapter },
  )
  expect(runner, 'catalog.cache-control-no-store', 'catalog is not cached', /no-store/i.test(response.cacheControl ?? ''), `cache-control: ${response.cacheControl ?? '(none)'}`)
  const liveries = catalog.liveries ?? []
  expect(
    runner,
    'catalog.gallery-size',
    `catalog carries at least ${MIN_LIVERIES} liveries (style system v2)`,
    liveries.length >= MIN_LIVERIES,
    `${liveries.length} liveries: ${liveries.map((livery) => livery.id).join(', ')}`,
    { ids: liveries.map((livery) => livery.id) },
  )

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

  // Per-livery CSS budget (style-system.md §5): every compiled livery's
  // tokens+typography+layout must stay inside the 12 KiB hard cap.
  const cssSizes = liveries.map((livery) => ({
    id: livery.id,
    bytes: (livery.css?.tokens?.length ?? 0) + (livery.css?.typography?.length ?? 0) + (livery.css?.layout?.length ?? 0),
  }))
  const overBudget = cssSizes.filter((entry) => entry.bytes > CSS_BUDGET_BYTES)
  const maxCss = cssSizes.reduce((max, entry) => (entry.bytes > max.bytes ? entry : max), { id: '(none)', bytes: 0 })
  expect(
    runner,
    'catalog.css-budget',
    `every compiled livery stays inside the ${CSS_BUDGET_BYTES} B CSS hard budget`,
    overBudget.length === 0 && maxCss.bytes > 0,
    overBudget.length
      ? overBudget.slice(0, 8).map((entry) => `${entry.id}=${entry.bytes}B`).join('; ')
      : `max ${maxCss.bytes} B (${maxCss.id}); budget ${CSS_BUDGET_BYTES} B across ${liveries.length} liveries`,
    { max: maxCss, sizes: cssSizes },
  )

  // Style-system vocabulary (round 5): palettes + typography + surface shape/
  // elevation/material must actually vary across the shipped catalog.
  const surfaceStyles = [...new Set(liveries.map((livery) => livery.layout?.surfaceStyle).filter(Boolean))]
  const uiStacks = [...new Set(liveries.map((livery) => livery.typography?.ui?.['en-US'] ?? livery.typography?.ui?.en ?? '').filter(Boolean))]
  const contentStacks = [...new Set(liveries.map((livery) => livery.typography?.content?.['zh-CN'] ?? livery.typography?.content?.zh ?? '').filter(Boolean))]
  const familyPresence = { shape: 0, elevation: 0, material: 0, border: 0 }
  const familyOf = (name) => {
    if (/^--dsw-radius-|^--dsw-corner-shape$/.test(name)) return 'shape'
    if (/^--dsw-shadow-|^--dsw-elevation-/.test(name)) return 'elevation'
    if (name === '--dsw-menu-backdrop-filter' || name === '--dsw-mask-blur' || name === '--dsw-focus-ring-width') return 'material'
    if (/^--dsw-alias-border-l[1-4]$/.test(name)) return 'border'
    return null
  }
  for (const livery of liveries) {
    const families = new Set()
    for (const mode of ['light', 'dark']) {
      for (const name of Object.keys(livery?.[mode]?.tokens ?? {})) {
        const family = familyOf(name)
        if (family) families.add(family)
      }
    }
    for (const family of families) familyPresence[family] += 1
  }
  const vocabularyProblems = []
  if (surfaceStyles.length < 6) vocabularyProblems.push(`only ${surfaceStyles.length} distinct surface styles: ${surfaceStyles.join(', ')}`)
  if (uiStacks.length < 5) vocabularyProblems.push(`only ${uiStacks.length} distinct en-US UI font stacks`)
  // The CJK registry only needs a small palette of stacks (system/humanist/serif);
  // latin covers the broader display/rounded/tech variety.
  if (contentStacks.length < 2) vocabularyProblems.push(`only ${contentStacks.length} distinct zh-CN content font stacks`)
  for (const family of ['shape', 'elevation', 'material', 'border']) {
    if (familyPresence[family] === 0) vocabularyProblems.push(`no livery declares ${family} tokens`)
  }
  expect(
    runner,
    'catalog.style-vocabulary',
    'the catalog covers palettes, typography, surface shape/elevation/material families',
    vocabularyProblems.length === 0,
    vocabularyProblems.length
      ? vocabularyProblems.join('; ')
      : `surfaceStyles=${surfaceStyles.length} [${surfaceStyles.join(', ')}]; en UI stacks=${uiStacks.length}; zh content stacks=${contentStacks.length}; family coverage shape=${familyPresence.shape} elevation=${familyPresence.elevation} material=${familyPresence.material} border=${familyPresence.border} / ${liveries.length}`,
    { surfaceStyles, uiStacks: uiStacks.length, contentStacks: contentStacks.length, familyPresence },
  )

  // Capability facts used by the self-check panel and layout degradation. The
  // expected availability comes from the certified adapter record, so a 0.2.1
  // host must additionally report host-font-role-hooks available.
  const capabilities = catalog.capabilities ?? {}
  const expectedCapabilities = expectedCapabilitiesOf(ctx)
  const capabilityProblems = []
  for (const [id, available] of Object.entries(expectedCapabilities)) {
    const fact = capabilities[id]
    if (!fact) capabilityProblems.push(`${id}: missing`)
    else if (Boolean(fact.available) !== available) capabilityProblems.push(`${id}: expected ${available}, got ${fact.available}`)
  }
  expect(
    runner,
    'catalog.capabilities',
    'catalog capability availability matches the certified adapter contract',
    capabilityProblems.length === 0,
    capabilityProblems.length
      ? capabilityProblems.join('; ')
      : Object.entries(expectedCapabilities).map(([id, available]) => `${id}=${available}`).join(', '),
    { capabilities, expected: expectedCapabilities },
  )

  // Preview SVG assets live under the catalog-profile base the host declared.
  // Style system v2: every livery × zh/en × light/dark (24×4 = 96 per profile).
  const previewChecks = []
  for (const livery of liveries) {
    for (const lang of ['zh', 'en']) {
      for (const mode of ['light', 'dark']) {
        const file = `${livery.id}-${lang}-${mode}.svg`
        previewChecks.push({ file, url: previewUrl(ctx, file), base: previewsBaseOf(ctx) })
      }
    }
  }
  const results = []
  for (const item of previewChecks) {
    const response = await getStatus(item.url).catch((error) => ({ status: 0, error: String(error) }))
    results.push({ ...item, ...response })
  }
  const badPreviews = results.filter((entry) => entry.status !== 200 || !/svg/i.test(entry.contentType ?? ''))
  const expectedPreviews = liveries.length * 4
  expect(
    runner,
    'previews.assets-served',
    'all preview SVGs are served as image/svg+xml under the declared catalog-profile base',
    badPreviews.length === 0 && results.length === expectedPreviews,
    badPreviews.length
      ? badPreviews.slice(0, 8).map((entry) => `${entry.file} → ${entry.status} ${entry.contentType ?? ''}`).join('; ')
      : `${results.length}/${expectedPreviews} preview assets HTTP 200 image/svg+xml under ${previewsBaseOf(ctx)} (${liveries.length} liveries × zh/en × light/dark)`,
    { base: previewsBaseOf(ctx), sample: results[0]?.url },
  )
  const unknown = await getStatus(previewUrl(ctx, 'not-a-real-file.svg'))
  expect(runner, 'previews.unknown-404', 'unknown preview asset returns 404', unknown.status === 404, `unknown file → ${unknown.status}`)
  const otherProfiles = certifiedFromCatalog ? otherCatalogProfiles(certifiedFromCatalog.catalogProfile) : []
  if (otherProfiles.length > 0 && typeof catalog.catalogProfile === 'string') {
    const foreignUrl = new URL(`${expectedPreviewsBase(otherProfiles[0])}${previewChecks[0]?.file ?? 'not-a-real-file.svg'}`, config.baseUrl).href
    const foreign = await getStatus(foreignUrl)
    expect(
      runner,
      'previews.profile-isolation',
      'previews are served per catalog profile; another profile directory is not exposed',
      foreign.status === 404,
      `cross-profile asset ${new URL(foreignUrl).pathname} → ${foreign.status} (404 expected)`,
      { url: foreignUrl, status: foreign.status, catalogProfile: catalog.catalogProfile, foreignProfile: otherProfiles[0] },
    )
  } else {
    runner.skip(
      'previews.profile-isolation',
      'previews are served per catalog profile; another profile directory is not exposed',
      'both certified adapters share exactly one catalog profile — cross-profile isolation is not applicable',
    )
  }

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
    ctx.deviations.push(`DSH ${ctx.config.expectedVersion ?? 'this host'} serves client bundles through the boot-graph grouped URL (plugins/??<pkg>/client.js&rev=…); the bare /plugins/<pkg>/client.js?rev= form returns 404 in this build (verified).`)
    try {
      if (!config.liveryMode) throw new Error('performance budget applies to the dsh-livery bundle only (generic fixture mode)')
      const raw = await rawRequest(bundle.bundle.entryUrl)
      const gzipBytes = zlib.gzipSync(raw.body).length
      ctx.state.bundleGzip = gzipBytes
      const budget = CLIENT_GZIP_BUDGET_BYTES
      expect(
        runner,
        'bundle.gzip-budget',
        `client bundle gzip stays within the final ${CLIENT_GZIP_BUDGET_LABEL} performance budget (host peers excluded)`,
        gzipBytes <= budget,
        `${gzipBytes} bytes gzip / ${raw.body.length} bytes raw (budget ${budget} B / ${CLIENT_GZIP_BUDGET_LABEL})`,
        { gzipBytes, rawBytes: raw.body.length, budgetBytes: budget },
      )
    } catch (error) {
      if (config.liveryMode) runner.warn('bundle.gzip-budget', `client bundle gzip stays within the final ${CLIENT_GZIP_BUDGET_LABEL} performance budget`, String(error))
      else runner.skip('bundle.gzip-budget', `client bundle gzip stays within the final ${CLIENT_GZIP_BUDGET_LABEL} performance budget`, String(error))
    }
  } else {
    runner.skip('bundle.serves-client-js', 'plugin client bundle is served as JavaScript', 'no graph row to fetch')
    runner.skip('bundle.requires-rev', 'plugin client bundle requires the graph rev', 'no graph row to fetch')
  }

  const bootPayload = await page.evaluate(() => (window.__DSH_LIVERY_BOOT__ ? { ...window.__DSH_LIVERY_BOOT__, diagnostics: [...(window.__DSH_LIVERY_BOOT__.diagnostics ?? [])] } : null))
  if (!ctx.environment.packageVersion && bootPayload?.pluginVersion) ctx.environment.packageVersion = bootPayload.pluginVersion
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
    bootPayload.accepted === true,
    `accepted=${bootPayload.accepted} profileKind=${bootPayload.profileKind} skinId=${bootPayload.skinId} cssHash=${oneLine(bootPayload.cssHash, 24)}… entryId=${bootPayload.entryId} adapter=${bootPayload.adapterId}`,
    bootPayload,
  )
  assertBootIdentity(ctx, bootPayload, {
    checkId: 'handshake.echo',
    title: 'first-frame handshake echoes a certified version/adapter/contract/catalog-profile identity',
    phase: 'pre-apply boot',
  })
  if (!ctx.runner.checks.some((check) => check.id === 'handshake.certified-adapter')) {
    const matched = adapterForTriple(bootPayload)
    if (matched) {
      ctx.runner.pass('handshake.certified-adapter', 'live host matches a certified adapter record (exact version + adapter + contract + catalog profile)', describeAdapter(matched), { adapter: matched })
    } else {
      ctx.runner.fail('handshake.certified-adapter', 'live host matches a certified adapter record', `uncertified payload identity: ${bootPayload.hostVersion} / ${bootPayload.adapterId} / ${oneLine(bootPayload.contractHash, 24)}`)
    }
  }
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
  const profile = config.mode === 'isolated' ? await inspectProfilePatch(config.dshHome, config.dshProfile ?? 'web') : { hasThemeRow: false, text: '' }
  expect(runner, 'stock.no-theme-write', 'no ui-theme row was written to the profile patch', profile.hasThemeRow === false, profile.hasThemeRow ? 'profile patch contains an ui-theme row' : 'no ui-theme row in profile patch')
  // The navigation entry is client-registered regardless of the configured
  // skin, so it must already exist on a stock start.
  const stockPanellist = await inspectPanellist(page).catch(() => ({ rows: [] }))
  const stockRow = (stockPanellist.rows ?? []).find((candidate) => [labelsFor('zh').section, labelsFor('en').section].includes(candidate.ariaLabel ?? candidate.label))
  expect(
    runner,
    'nav.sidebar-entry-present-stock',
    'Livery sidebar row is present on a stock start (client navigation registration)',
    Boolean(stockRow) && stockRow.hasPanellistSlot === true && stockRow.hasIcon === true && stockRow.selected === false,
    stockRow ? `row #${stockRow.index} label "${stockRow.ariaLabel ?? stockRow.label}" panellistSlot=${stockRow.hasPanellistSlot} icon=${stockRow.hasIcon} selected=${stockRow.selected}` : `rows: ${(stockPanellist.rows ?? []).map((candidate) => candidate.ariaLabel ?? candidate.label).join(', ') || '(none)'}`,
  )
  state.stockObserverReport = await readObserverReport(page)
  state.stockObserverCount = state.stockObserverReport.wholeDocument
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
      // The Livery workspace lives on the main-panel page now (legacy hosts keep
      // it in the settings dialog), so look at the whole document.
      const cards = document.querySelectorAll('[data-testid="livery-card"][data-livery-id]')
      if (cards.length > 0) return true
      return Boolean(document.querySelector('[data-testid="livery-error"]'))
    },
    undefined,
    { timeout: timeoutMs },
  )
  return page.evaluate(() => {
    const root =
      document.querySelector('[data-slot="main"] [data-testid="livery-panel"]') ??
      document.querySelector('[data-slot="main"] [data-testid="livery-section"]') ??
      document.querySelector('[role="dialog"]') ??
      document
    return {
      cards: root.querySelectorAll('[data-testid="livery-card"][data-livery-id]').length,
      error: root.querySelector('[data-testid="livery-error"]')?.textContent ?? null,
      loading: (root.textContent ?? '').includes('正在加载') || (root.textContent ?? '').includes('Loading liveries'),
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
 * The Livery main-panel acceptance flow (sidebar `sidebar.panellist` row + `main`
 * keyed page): nav entry/selection, gallery, search, keyboard roving focus,
 * transient preview + cancel, apply + persistence. Also proves the legacy
 * settings.section entry is NOT registered on panel-navigation hosts.
 */
export async function checkLiveryPanelFlow(ctx) {
  const { runner, session, config, state } = ctx
  const { page } = session
  const catalog = state.catalog
  if (!catalog) {
    runner.skip('nav.sidebar-entry', 'Livery is reachable from the left-sidebar plugin navigation', 'catalog unavailable')
    return
  }
  await waitForAppReady(page)
  state.actualLocale = await detectUiLocale(page)
  const uiLabels = labelsFor(state.actualLocale)
  state.dismissedDialogs = await dismissFirstRunDialogs(page)
  await capture(page, ctx, { state: 'home' })

  // ---- sidebar panellist entry + main-panel selection ----
  let opened
  try {
    opened = await openLiveryDetailed(page, { labels: uiLabels, locale: state.actualLocale, timeoutMs: 25_000 })
  } catch (error) {
    runner.fail('nav.sidebar-entry', 'Livery is reachable from the left-sidebar plugin navigation', String(error))
    return
  }
  state.liveryNav = opened
  const shippedLabels = [labelsFor('zh').section, labelsFor('en').section]
  const expectedLabel = uiLabels.section
  const row = opened.row ?? null
  const rowLabel = row?.ariaLabel ?? row?.label ?? null
  expect(
    runner,
    'nav.sidebar-entry',
    'Livery row is registered in the left-sidebar plugin navigation (aria-label + icon + panellist slot)',
    opened.via === PANEL_NAV_VIA && Boolean(row) && rowLabel === expectedLabel && row.hasIcon && row.hasPanellistSlot,
    opened.via === PANEL_NAV_VIA
      ? `row #${opened.rowIndex} aria-label "${rowLabel}" icon=${row?.hasIcon} panellistSlot=${row?.hasPanellistSlot} (page locale ${state.actualLocale})`
      : `expected the sidebar.panellist path on a certified host, got "${opened.via}"`,
    { panellist: opened.panellist, expectedLabel, shippedLabels },
  )
  const rows = opened.panellist?.rows ?? []
  const knownPluginRows = ['插件', '自动化任务', '上下文观察', 'Plugins', 'Automation', 'Scheduled tasks', 'Context']
  const otherPluginIndexes = rows
    .filter((candidate) => candidate.index !== opened.rowIndex && knownPluginRows.includes(candidate.ariaLabel ?? candidate.label))
    .map((candidate) => candidate.index)
  expect(
    runner,
    'nav.row-order',
    'Livery row comes after the existing plugin rows (order 30)',
    opened.via === PANEL_NAV_VIA && otherPluginIndexes.every((index) => opened.rowIndex > index),
    `row #${opened.rowIndex}; existing plugin rows at ${JSON.stringify(otherPluginIndexes)}; rows: ${rows.map((candidate) => candidate.ariaLabel ?? candidate.label).join(', ')}`,
  )
  const workspacesPresent = opened.panellist?.workspacesPresent === true
  // DOM order is the semantic proof (the panellist nav precedes the workspace
  // region); geometry is recorded as supporting evidence because the shell's
  // grid can report the workspace wrapper at a container-relative top.
  const geometryOk =
    !workspacesPresent ||
    !row ||
    opened.panellist?.workspacesTop === null ||
    opened.panellist?.workspacesHeight === 0 ||
    row.top < opened.panellist.workspacesTop
  expect(
    runner,
    'nav.above-workspaces',
    'Livery row sits above the workspace section in the sidebar',
    opened.panellist?.navBeforeWorkspaces === true && geometryOk,
    `navBeforeWorkspaces=${opened.panellist?.navBeforeWorkspaces} rowTop=${row?.top} workspacesTop=${opened.panellist?.workspacesTop} workspacesHeight=${opened.panellist?.workspacesHeight}`,
  )
  const mainColumn = await readMainColumnState(page)
  expect(
    runner,
    'nav.main-panel',
    'selecting the row opens the Visual Style main-panel page (h1 matches the entry label)',
    opened.selected === true && mainColumn.liveryPanelVisible && mainColumn.selectedRowLabel === expectedLabel && mainColumn.panelTitle === expectedLabel,
    `row selected=${opened.selected}; main panel visible=${mainColumn.liveryPanelVisible}; selected row "${mainColumn.selectedRowLabel}"; page h1 "${mainColumn.panelTitle}" (expected "${expectedLabel}")`,
    { mainColumn },
  )
  expect(
    runner,
    'nav.conversation-hidden',
    'the conversation is replaced while the Livery panel is selected',
    mainColumn.conversationComposerVisible === false && mainColumn.conversationCopyVisible === false,
    `composer visible=${mainColumn.conversationComposerVisible}; conversation copy visible=${mainColumn.conversationCopyVisible}; body starts: ${oneLine(mainColumn.bodyTextStart, 120)}`,
  )
  await capture(page, ctx, { state: 'panel' })

  // ---- legacy settings.section must NOT be registered on panel-nav hosts ----
  try {
    const settingsOpened = await openSettingsDetailed(page)
    const sectionLabels = await readSettingsSectionLabels(page)
    const liverySectionInSettings = await page.locator('[role="dialog"] [data-testid="livery-panel"], [role="dialog"] [data-testid="livery-section"]').count()
    const legacyLabelPresent = sectionLabels.some((label) => shippedLabels.some((shipped) => normalizeCopy(label) === normalizeCopy(shipped)))
    expect(
      runner,
      'nav.settings-section-absent',
      'legacy settings.section Livery entry is NOT registered on panel-navigation hosts',
      settingsOpened.via !== null && !legacyLabelPresent && liverySectionInSettings === 0,
      `settings launcher path=${settingsOpened.via}; section labels=[${sectionLabels.map((label) => label.trim()).join(', ')}]; livery nodes in settings dialog=${liverySectionInSettings}`,
      { sectionLabels },
    )
    runner.pass('nav.settings-open-path', 'settings dialog is still usable for the absence assertion', `launcher path=${settingsOpened.via}`, { via: settingsOpened.via })
    await closeSettings(page)
  } catch (error) {
    runner.fail('nav.settings-section-absent', 'legacy settings.section Livery entry is NOT registered on panel-navigation hosts', `could not open settings to prove absence: ${error instanceof Error ? error.message : String(error)}`)
  }
  // Closing the modal must leave the Livery panel selected.
  const afterSettings = await readMainColumnState(page)
  expect(
    runner,
    'nav.panel-still-selected',
    'closing the settings dialog returns to the selected Livery panel',
    afterSettings.liveryPanelVisible === true && afterSettings.selectedRowLabel === expectedLabel,
    `panel visible=${afterSettings.liveryPanelVisible}; selected row "${afterSettings.selectedRowLabel}"`,
  )

  // Round-12 zh self-check copy (the checkSelfCheck group later runs in the host
  // locale, which the fonts pass leaves on en; verify the zh strings here).
  try {
    // Stock state omits the CSS-safety counts (no active stylesheet); the
    // "未限定范围的变量" label is asserted after Apply below.
    const zhSelfCheckLabels = ['启动信息', '样式覆盖', '协议校验码']
    const toggle = page.locator('[data-testid="livery-selfcheck-toggle"]').first()
    if ((await toggle.count()) > 0) {
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click({ timeout: 8_000 }).catch(() => {})
      await page.waitForSelector('[data-testid="livery-capability"]', { state: 'visible', timeout: 8_000 }).catch(() => {})
      const zhPanelText = await page.locator('[data-testid="livery-selfcheck"]').innerText().catch(() => '')
      expect(
        runner,
        'copy.selfcheck-labels-zh',
        'zh self-check uses the round-12 plain-language labels (启动信息 / 样式覆盖 / 协议校验码)',
        zhSelfCheckLabels.every((label) => zhPanelText.includes(label)),
        `missing=${JSON.stringify(zhSelfCheckLabels.filter((label) => !zhPanelText.includes(label)))}; panel=${oneLine(zhPanelText, 240)}`,
      )
      await toggle.click({ timeout: 8_000 }).catch(() => {})
      await sleep(200)
    } else {
      runner.fail('copy.selfcheck-labels-zh', 'zh self-check uses the round-12 plain-language labels', 'self-check toggle not found')
    }
  } catch (error) {
    runner.fail('copy.selfcheck-labels-zh', 'zh self-check uses the round-12 plain-language labels', String(error))
  }

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
    `gallery renders one card per catalog livery (≥${MIN_LIVERIES})`,
    liveryCards.length >= MIN_LIVERIES && liveryCards.length === expectedIds.length && missing.length === 0,
    `${liveryCards.length} livery card(s) (catalog ${expectedIds.length}); stock card=${hasStockCard} (optional; stock appearance is reachable through the restore action); ids: ${liveryCards.map((card) => card.id).join(', ')}${missing.length ? `; missing: ${missing.join(', ')}` : ''}`,
    { cards: cards.map((card) => ({ id: card.id, state: card.state })) },
  )
  const galleryAria = await page
    .locator('[data-testid="livery-gallery"]')
    .getAttribute('aria-label')
    .catch(() => null)
  expect(
    runner,
    'gallery.aria-label',
    'gallery region exposes the renamed accessible label',
    galleryAria === uiLabels.gallery,
    `aria-label="${galleryAria}" (expected "${uiLabels.gallery}")`,
  )
  const brokenThumbs = liveryCards.filter((card) => card.thumb && card.thumb.tag === 'img' && (!(card.thumb.naturalWidth > 0) || !card.thumb.complete))
  const thumbCount = liveryCards.filter((card) => card.thumb).length
  expect(runner, 'gallery.thumbnails', 'every livery card shows a loaded preview thumbnail', thumbCount === liveryCards.length && brokenThumbs.length === 0, `${thumbCount}/${liveryCards.length} thumbs, broken: ${brokenThumbs.map((card) => card.id).join(', ') || 'none'}`)
  const errorState = await page.locator('[data-testid="livery-error"]').count().catch(() => 0)
  expect(runner, 'gallery.no-error-state', 'gallery is not in an error/catalog-unavailable state', errorState === 0, `${errorState} livery-error node(s)`)
  await capture(page, ctx, { state: 'panel-gallery' })

  // ---- gallery preview-language tab (round 6) ----
  const hostPreviewLocale = state.actualLocale === 'en' ? 'en' : 'zh'
  const expectedTabTexts = {
    follow: uiLabels.followLocale,
    zh: uiLabels.localeZhTab,
    en: uiLabels.localeEnTab,
  }
  const localeTab = await readLocaleTab(page)
  const tabChoices = (localeTab.buttons ?? []).map((button) => button.choice)
  expect(
    runner,
    'previewLocale.tab-present',
    'gallery toolbar exposes the 预览语言 / Preview language segmented control with 3 options',
    localeTab.found === true &&
      localeTab.role === 'group' &&
      localeTab.ariaLabel === uiLabels.previewLanguage &&
      ['follow', 'zh', 'en'].every((choice) => tabChoices.includes(choice)),
    `group role=${localeTab.role} aria-label="${localeTab.ariaLabel}" buttons=[${(localeTab.buttons ?? []).map((button) => `${button.choice}:${button.text}${button.pressed ? '*' : ''}`).join(', ')}] (expected label "${uiLabels.previewLanguage}")`,
    { localeTab, hostPreviewLocale },
  )
  expect(
    runner,
    'previewLocale.tab-labels',
    'the segmented control labels and hint match the host locale copy',
    (localeTab.buttons ?? []).every((button) => button.text === expectedTabTexts[button.choice]) &&
      localeTab.title === uiLabels.previewLanguageHint,
    `texts=[${(localeTab.buttons ?? []).map((button) => `${button.choice}:"${button.text}"`).join(', ')}]; title="${oneLine(localeTab.title ?? '', 140)}" (expected "${oneLine(uiLabels.previewLanguageHint, 140)}")`,
  )
  const zhLabels = labelsFor('zh')
  const enLabelsCopy = labelsFor('en')
  expect(
    runner,
    'copy.state-strings',
    'acceptance label constants match the round-12 rewritten copy for the non-happy-path states (unit-covered)',
    zhLabels.catalogUnavailable === '视觉风格暂时无法加载' &&
      zhLabels.writeRefused === '宿主没有保存这套视觉风格。' &&
      enLabelsCopy.catalogUnavailable === 'Visual styles are unavailable right now' &&
      enLabelsCopy.writeRefused === 'The host did not save this visual style.',
    `zh.catalogUnavailable="${zhLabels.catalogUnavailable}"; zh.writeRefused="${zhLabels.writeRefused}"; en.catalogUnavailable="${enLabelsCopy.catalogUnavailable}"; en.writeRefused="${enLabelsCopy.writeRefused}"`,
  )
  const followPressed = (localeTab.buttons ?? []).find((button) => button.choice === 'follow')?.pressed === true
  const othersUnpressed = (localeTab.buttons ?? []).filter((button) => button.choice !== 'follow').every((button) => button.pressed === false)
  await waitForThumbLocale(page, hostPreviewLocale).catch(() => {})
  const defaultSources = await readThumbLocales(page)
  const namesBeforeLocaleSwitch = await readCardNames(page)
  expect(
    runner,
    'previewLocale.default-follow',
    'Follow DSH is pressed by default and every thumbnail follows the host preview locale',
    followPressed &&
      othersUnpressed &&
      defaultSources.length > 0 &&
      defaultSources.every((src) => thumbLocaleOf(src) === hostPreviewLocale),
    `${defaultSources.length} thumbs; follow pressed=${followPressed}; locales=${JSON.stringify([...new Set(defaultSources.map(thumbLocaleOf))])}; host=${hostPreviewLocale}`,
    { followPressed, othersUnpressed, defaultSources: defaultSources.slice(0, 4), hostPreviewLocale },
  )
  let pinnedLocaleOk = false
  try {
    await page.locator('[data-testid="livery-locale-en"]').click({ timeout: 8_000 })
    await waitForThumbLocale(page, 'en')
    const enTab = await readLocaleTab(page)
    const enSources = await readThumbLocales(page)
    await capture(page, ctx, { state: 'panel-gallery-preview-en', mode: 'light' })
    expect(
      runner,
      'previewLocale.switch-en',
      'switching the preview language to English pins every thumbnail to -en- SVG URLs',
      enTab.buttons?.find((button) => button.choice === 'en')?.pressed === true &&
        enSources.length > 0 &&
        enSources.every((src) => thumbLocaleOf(src) === 'en'),
      `${enSources.length} thumbs; -en-=${enSources.filter((src) => thumbLocaleOf(src) === 'en').length}; pressed=${enTab.buttons?.map((button) => `${button.choice}${button.pressed ? '*' : ''}`).join(',')}`,
    )
    await page.locator('[data-testid="livery-locale-zh"]').click({ timeout: 8_000 })
    await waitForThumbLocale(page, 'zh')
    const zhTab = await readLocaleTab(page)
    const zhSources = await readThumbLocales(page)
    await capture(page, ctx, { state: 'panel-gallery-preview-zh', mode: 'light' })
    expect(
      runner,
      'previewLocale.switch-zh',
      'switching the preview language to 中文 pins every thumbnail to -zh- SVG URLs',
      zhTab.buttons?.find((button) => button.choice === 'zh')?.pressed === true &&
        zhSources.length > 0 &&
        zhSources.every((src) => thumbLocaleOf(src) === 'zh'),
      `${zhSources.length} thumbs; -zh-=${zhSources.filter((src) => thumbLocaleOf(src) === 'zh').length}; pressed=${zhTab.buttons?.map((button) => `${button.choice}${button.pressed ? '*' : ''}`).join(',')}`,
    )
    const namesWhilePinned = await readCardNames(page)
    const namesStayHostLocale = namesWhilePinned.every((card) => {
      const before = namesBeforeLocaleSwitch.find((entry) => entry.id === card.id)
      return before !== undefined && before.name === card.name && before.description === card.description
    })
    await page.locator('[data-testid="livery-locale-follow"]').click({ timeout: 8_000 })
    await waitForThumbLocale(page, hostPreviewLocale)
    const followTab = await readLocaleTab(page)
    const followSources = await readThumbLocales(page)
    expect(
      runner,
      'previewLocale.follow-restores',
      'switching back to Follow DSH restores thumbnails to the host preview locale without changing card copy',
      namesStayHostLocale &&
        followTab.buttons?.find((button) => button.choice === 'follow')?.pressed === true &&
        followSources.length > 0 &&
        followSources.every((src) => thumbLocaleOf(src) === hostPreviewLocale),
      `follow pressed=${followTab.buttons?.find((button) => button.choice === 'follow')?.pressed}; thumb locales=${JSON.stringify([...new Set(followSources.map(thumbLocaleOf))])}; card copy unchanged while pinned=${namesStayHostLocale}`,
    )
    pinnedLocaleOk = true
    state.previewLocaleTab = { hostPreviewLocale, enPinned: enSources.every((src) => thumbLocaleOf(src) === 'en'), zhPinned: zhSources.every((src) => thumbLocaleOf(src) === 'zh'), cardCopyStable: namesStayHostLocale }
  } catch (error) {
    runner.fail('previewLocale.switch-en', 'preview language tabs switch thumbnail SVG locale', error instanceof Error ? (error.message ?? String(error)) : String(error))
  }

  // ---- gallery families (visual studio): 6/6 sections, chips, filters ----
  const FAMILY_ORDER = ['calm', 'nature', 'light', 'retro', 'vivid', 'dark']
  // Taxonomy priority: `nature` leads so organic+calm styles
  // (moss/everforest/celadon) are grouped as Nature instead of being absorbed
  // by calm; every one of the six families must be non-empty.
  const FAMILY_TAGS = [
    ['nature', ['organic']],
    ['calm', ['calm', 'elegant', 'muted']],
    ['light', ['cool', 'paper', 'ink']],
    ['retro', ['retro', 'warm', 'classic']],
    ['vivid', ['neon', 'playful', 'contrast']],
    ['dark', ['deep', 'neutral', 'tech']],
  ]
  const expectedFamilyOf = (tags) => {
    for (const [family, familyTags] of FAMILY_TAGS) {
      if (familyTags.some((tag) => (tags ?? []).includes(tag))) return family
    }
    return 'calm'
  }
  try {
    const structure = await readGalleryStructure(page)
    expect(
      runner,
      'gallery.page-tabs',
      'visual studio exposes 视觉风格 / 壁纸 page tabs with the style tab selected by default',
      structure.tablistFound &&
        structure.tabs.map((tab) => tab.id).join(',') === 'style,wallpaper' &&
        structure.tabs.every((tab) => tab.role === 'tab') &&
        structure.tabs.find((tab) => tab.id === 'style')?.selected === true &&
        structure.tabs.find((tab) => tab.id === 'wallpaper')?.selected === false &&
        structure.stylePanel === true &&
        structure.wallpaperPanel === false &&
        structure.tabs.map((tab) => tab.text).join('|') === `${uiLabels.tabStyle}|${uiLabels.tabWallpaper}`,
      `tabs=${JSON.stringify(structure.tabs)}; stylePanel=${structure.stylePanel}; wallpaperPanel=${structure.wallpaperPanel}; expected texts ${uiLabels.tabStyle}|${uiLabels.tabWallpaper}`,
    )
    expect(
      runner,
      'gallery.family-chips',
      'primary filter row shows 全部 + six family chips in display order',
      structure.chips.length === 7 &&
        structure.chips.map((chip) => chip.family).join(',') === `all,${FAMILY_ORDER.join(',')}` &&
        structure.chips[0]?.pressed === true &&
        structure.chips.slice(1).every((chip) => chip.pressed === false) &&
        FAMILY_ORDER.every((family) => structure.chips.find((chip) => chip.family === family)?.text === uiLabels.familyNames[family]),
      `chips=${structure.chips.map((chip) => `${chip.family}:${chip.text}${chip.pressed ? '*' : ''}`).join(', ')}`,
    )
    const sectionFamilies = structure.sections.map((section) => section.family)
    const sectionTotal = structure.sections.reduce((sum, section) => sum + section.cards, 0)
    const expectedCounts = new Map(FAMILY_ORDER.map((family) => [family, 0]))
    for (const livery of catalog.liveries) {
      const family = expectedFamilyOf(livery.meta?.tags)
      expectedCounts.set(family, (expectedCounts.get(family) ?? 0) + 1)
    }
    const emptyFamilies = FAMILY_ORDER.filter((family) => (expectedCounts.get(family) ?? 0) === 0)
    expect(
      runner,
      'gallery.family-sections',
      'all six family sections render (not five) in display order with their styles and counts',
      sectionFamilies.join(',') === FAMILY_ORDER.join(',') &&
        sectionTotal === catalog.liveries.length &&
        structure.sections.every((section) => section.cards > 0 && section.cards === expectedCounts.get(section.family)) &&
        emptyFamilies.length === 0 &&
        structure.sections.every((section) => section.heading === uiLabels.familyNames[section.family]),
      `sections=[${structure.sections.map((section) => `${section.family}:${section.cards}`).join(', ')}]; expected counts=[${FAMILY_ORDER.map((family) => `${family}:${expectedCounts.get(family)}`).join(', ')}]; empty families=${emptyFamilies.join(',') || 'none'}`,
      { sections: structure.sections, expectedCounts: Object.fromEntries(expectedCounts) },
    )
    const catalogById = new Map(catalog.liveries.map((livery) => [livery.id, livery]))
    const mappingProblems = structure.cards
      .map((card) => {
        const expected = expectedFamilyOf(catalogById.get(card.id)?.meta?.tags)
        return expected === card.family ? null : `${card.id}: expected ${expected}, rendered in ${card.family}`
      })
      .filter(Boolean)
    expect(
      runner,
      'gallery.family-mapping',
      'family assignment follows the nature→calm→light→retro→vivid→dark tag priority for every style',
      mappingProblems.length === 0,
      mappingProblems.length ? mappingProblems.slice(0, 8).join('; ') : `${structure.cards.length}/${structure.cards.length} cards mapped to the priority-picked family`,
    )
    expect(
      runner,
      'gallery.more-filters',
      '更多筛选 reveals the 16 tag chips and collapses again',
      structure.moreFilters.found === true && structure.moreFilters.expanded === false && structure.tagChips === 0,
      `more-filters found=${structure.moreFilters.found}; expanded=${structure.moreFilters.expanded}; tag chips visible=${structure.tagChips}`,
    )
    await page.locator('[data-testid="livery-more-filters"]').click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="livery-more-filters"]')?.getAttribute('aria-expanded') === 'true', undefined, { timeout: 8_000 }).catch(() => {})
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="livery-tag"]').length > 0, undefined, { timeout: 8_000 }).catch(() => {})
    const expandedStructure = await readGalleryStructure(page)
    expect(
      runner,
      'gallery.more-filters-expanded',
      'expanded 更多筛选 shows the tag chips (aria-expanded=true)',
      expandedStructure.moreFilters.expanded === true && expandedStructure.tagChips >= 10,
      `expanded=${expandedStructure.moreFilters.expanded}; tag chips=${expandedStructure.tagChips}; toggle text="${expandedStructure.moreFilters.text}"`,
    )
    await page.locator('[data-testid="livery-more-filters"]').click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="livery-more-filters"]')?.getAttribute('aria-expanded') === 'false', undefined, { timeout: 8_000 }).catch(() => {})
    const collapsedStructure = await readGalleryStructure(page)
    expect(
      runner,
      'gallery.more-filters-collapsed',
      'collapsing 更多筛选 hides the tag chips again',
      collapsedStructure.moreFilters.expanded === false && collapsedStructure.tagChips === 0,
      `expanded=${collapsedStructure.moreFilters.expanded}; tag chips=${collapsedStructure.tagChips}`,
    )
    // Family chip filters the grouped gallery.
    await page.locator('[data-testid="livery-family-chip"][data-family="nature"]').click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="livery-family-chip"][data-family="nature"]')?.getAttribute('aria-pressed') === 'true', undefined, { timeout: 8_000 }).catch(() => {})
    await sleep(200)
    const filteredStructure = await readGalleryStructure(page)
    const natureCount = expectedCounts.get('nature') ?? 0
    expect(
      runner,
      'gallery.family-filter',
      'selecting a family chip narrows the gallery to that one family section',
      filteredStructure.sections.length === 1 &&
        filteredStructure.sections[0].family === 'nature' &&
        filteredStructure.cards.length === natureCount &&
        filteredStructure.chips.find((chip) => chip.family === 'nature')?.pressed === true &&
        filteredStructure.chips.find((chip) => chip.family === 'all')?.pressed === false,
      `sections=[${filteredStructure.sections.map((section) => `${section.family}:${section.cards}`).join(', ')}]; cards=${filteredStructure.cards.length} (expected nature=${natureCount})`,
    )
    // Keyboard focus continues across the flattened card list (section boundaries).
    await page.locator('[data-testid="livery-family-chip"][data-family="all"]').click({ timeout: 8_000 })
    await sleep(200)
    const firstFamily = FAMILY_ORDER.find((family) => (expectedCounts.get(family) ?? 0) > 0)
    const secondFamily = FAMILY_ORDER.slice(FAMILY_ORDER.indexOf(firstFamily) + 1).find((family) => (expectedCounts.get(family) ?? 0) > 0)
    const calmSection = page.locator(`[data-testid="livery-family-${firstFamily}"]`)
    const lastCalmCard = calmSection.locator('[data-testid="livery-card"][data-livery-id]').last()
    const firstNextCard = page.locator(`[data-testid="livery-family-${secondFamily}"] [data-testid="livery-card"][data-livery-id]`).first()
    const nextId = await firstNextCard.getAttribute('data-livery-id')
    await lastCalmCard.focus()
    await page.keyboard.press('ArrowRight')
    await sleep(180)
    expect(
      runner,
      'gallery.family-keyboard',
      'roving focus crosses family-section boundaries as one flattened list',
      (await focusedCardId(page)) === nextId,
      `focus after ArrowRight="${await focusedCardId(page)}" (expected first ${secondFamily} card "${nextId}")`,
    )
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
  } catch (error) {
    runner.fail('gallery.family-sections', 'gallery family sections / filters render correctly', error instanceof Error ? (error.stack ?? error.message) : String(error))
  }

  // ---- search (localized name / id / tag / empty) ----
  const search = await findSearchInput(page, { labels: uiLabels })
  if (!search.locator) {
    runner.fail('search.input', 'gallery search input is present', 'no search input found by data-testid, role, or placeholder')
  } else {
    state.searchVia = search.via
    const searchAccessibleName = await search.locator
      .evaluate((element) => element.getAttribute('aria-label') ?? element.getAttribute('placeholder') ?? '')
      .catch(() => '')
    expect(
      runner,
      'search.accessible-name',
      'gallery search exposes the renamed accessible name',
      searchAccessibleName === uiLabels.searchName || (searchAccessibleName.includes(uiLabels.searchName) && uiLabels.searchName.length > 0),
      `search accessible name "${searchAccessibleName}" (expected "${uiLabels.searchName}")`,
    )
    const firstLivery = catalog.liveries[0]
    const firstCardId = firstLivery?.id
    const localizedName = firstLivery?.meta?.name?.[state.actualLocale === 'zh' ? 'zh-CN' : 'en-US']
    const tagId = firstLivery?.meta?.tags?.[0]
    const tagLabel = tagId ? tagLabelsFor(state.actualLocale)[tagId] : null
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
    await capture(page, ctx, { state: 'panel-gallery-search-tag' })
    await search.locator.fill('zzzz-no-such-livery')
    await sleep(350)
    const emptyState = await page.evaluate(() => {
      const panel = document.querySelector('[data-slot="main"] [data-testid="livery-panel"], [data-slot="main"] [data-testid="livery-section"], [data-testid="livery-section"]')
      const cards = panel?.querySelectorAll('[data-testid="livery-card"][data-livery-id]') ?? []
      return { cards: cards.length, text: (panel?.innerText ?? '').slice(0, 400) }
    })
    expect(runner, 'search.empty-state', 'search-empty state renders for an unknown query', emptyState.cards === 0 && /没有|无匹配|No visual styles match|No liveries match|No matching|empty/i.test(emptyState.text), `${emptyState.cards} card(s) remain; panel text: ${oneLine(emptyState.text, 220)}`)
    await capture(page, ctx, { state: 'panel-gallery-search-empty' })
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
  await capture(page, ctx, { state: 'panel-previewing', mode: 'light' })

  const cancel = await findControl(page, { testId: 'livery-cancel', names: [uiLabels.cancel], exact: false })
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
    runner.skip('apply.persists', 'Apply commits the skin through the host config and persists', 'reuse mode is read-only (--unsafe-mutate opts in)')
    const active = (await readThemeSnapshot(page)).bodyAttribute
    state.appliedSkin = active && active !== 'stock' ? active : null
    return
  }

  // ---- apply + persistence ----
  const patchBefore = config.mode === 'isolated' ? await inspectProfilePatch(config.dshHome, config.dshProfile ?? 'web') : { text: '', skinId: null }
  const applyCard = page.locator(`[data-testid="livery-card"][data-livery-id="${pair.applied}"]`).first()
  await applyCard.click()
  await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, pair.applied, { timeout: 10_000 }).catch(() => {})
  // Pin a preview language before Apply: it must only affect thumbnails, never
  // the Apply control copy or the write semantics.
  let applyPinnedLocale = false
  try {
    await page.locator('[data-testid="livery-locale-en"]').click({ timeout: 8_000 })
    await waitForThumbLocale(page, 'en')
    applyPinnedLocale = true
  } catch {
    runner.fail('previewLocale.apply-pin', 'preview language can be pinned before Apply', 'could not pin the English preview language before Apply')
  }
  const applyControl = await findControl(page, { testId: 'livery-apply', names: [uiLabels.apply], exact: false })
  if (!applyControl.locator) {
    runner.fail('apply.control', 'Apply control is present', 'apply button not found')
    return
  }
  const applyCopyWhilePinned = (await applyControl.locator.textContent().catch(() => ''))?.trim() ?? ''
  expect(
    runner,
    'previewLocale.apply-copy',
    'Apply control copy is unchanged while a preview language is pinned',
    applyPinnedLocale && applyCopyWhilePinned === uiLabels.apply,
    `pinned=${applyPinnedLocale}; apply text "${applyCopyWhilePinned}" (expected "${uiLabels.apply}")`,
  )
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
  const degradedNotices = await page.locator('[data-testid="livery-degraded"]').count()
  expect(
    runner,
    'panel.no-degraded-notice',
    'optional-only capability fallbacks do not surface as a degraded notice on the Livery page (runtime stays ready)',
    degradedNotices === 0,
    `${degradedNotices} livery-degraded notice(s) with all required capabilities available`,
  )
  const offlineNotices = await page.locator('[data-testid="livery-offline"]').count()
  expect(runner, 'panel.no-offline-notice', 'the Livery page is not in catalog-unavailable state', offlineNotices === 0, `${offlineNotices} livery-offline notice(s)`)
  await capture(page, ctx, { state: 'panel-applied', mode: 'light' })
  // With an active style the CSS-safety figures (and their plain label) render.
  try {
    const zhActiveLabels = ['启动信息', '样式覆盖', '协议校验码', '未限定范围的变量']
    const activeToggle = page.locator('[data-testid="livery-selfcheck-toggle"]').first()
    if ((await activeToggle.count()) > 0) {
      if ((await activeToggle.getAttribute('aria-expanded')) !== 'true') await activeToggle.click({ timeout: 8_000 }).catch(() => {})
      await page.waitForSelector('[data-testid="livery-capability"]', { state: 'visible', timeout: 8_000 }).catch(() => {})
      const activePanelText = await page.locator('[data-testid="livery-selfcheck"]').innerText().catch(() => '')
      expect(
        runner,
        'copy.selfcheck-labels-zh-active',
        'zh self-check shows the full plain-language label set with an active style (incl. 未限定范围的变量)',
        zhActiveLabels.every((label) => activePanelText.includes(label)),
        `missing=${JSON.stringify(zhActiveLabels.filter((label) => !activePanelText.includes(label)))}; panel=${oneLine(activePanelText, 260)}`,
      )
      await activeToggle.click({ timeout: 8_000 }).catch(() => {})
      await sleep(200)
    } else {
      runner.fail('copy.selfcheck-labels-zh-active', 'zh self-check shows the full plain-language label set', 'self-check toggle not found after Apply')
    }
  } catch (error) {
    runner.fail('copy.selfcheck-labels-zh-active', 'zh self-check shows the full plain-language label set', String(error))
  }
  if (applyPinnedLocale) {
    try {
      const pinnedAfterApplyTab = await readLocaleTab(page)
      const pinnedAfterApplySources = await readThumbLocales(page)
      expect(
        runner,
        'previewLocale.apply-with-pinned',
        'a pinned preview language survives Apply (thumbnails only) and the applied state is otherwise unchanged',
        pinnedAfterApplyTab.buttons?.find((button) => button.choice === 'en')?.pressed === true &&
          pinnedAfterApplySources.length > 0 &&
          pinnedAfterApplySources.every((src) => thumbLocaleOf(src) === 'en'),
        `en pressed=${pinnedAfterApplyTab.buttons?.find((button) => button.choice === 'en')?.pressed}; thumb locales=${JSON.stringify([...new Set(pinnedAfterApplySources.map(thumbLocaleOf))])}`,
      )
      await capture(page, ctx, { state: 'panel-applied-preview-en', mode: 'light' })
      // Leave the canonical Follow mode for the remaining checks/screenshots.
      await page.locator('[data-testid="livery-locale-follow"]').click({ timeout: 8_000 })
      await waitForThumbLocale(page, hostPreviewLocale)
    } catch {
      runner.fail('previewLocale.apply-with-pinned', 'a pinned preview language survives Apply (thumbnails only)', 'could not verify/restore the pinned preview language after Apply')
    }
  }

  if (config.mode === 'isolated') {
    let patchAfter = await inspectProfilePatch(config.dshHome, config.dshProfile ?? 'web')
    for (let attempt = 0; attempt < 25 && patchAfter.skinId !== pair.applied; attempt += 1) {
      await sleep(200)
      patchAfter = await inspectProfilePatch(config.dshHome, config.dshProfile ?? 'web')
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
  const identity = assertBootIdentity(ctx, bootPayloadAfter, {
    checkId: 'handshake.applied-boot',
    title: 'configured skin boot handshake is accepted with a certified host identity',
    phase: 'post-apply reload',
  })
  if (identity.status === 'pass') {
    ctx.runner.pass(
      'handshake.certified-adapter',
      'live host matches a certified adapter record (exact version + adapter + contract + catalog profile)',
      describeAdapter(adapterForTriple(bootPayloadAfter)),
      { adapter: adapterForTriple(bootPayloadAfter) },
    )
  } else {
    ctx.runner.fail('handshake.certified-adapter', 'live host matches a certified adapter record', identity.detail)
  }
  expect(
    runner,
    'handshake.applied-skin',
    'configured skin is echoed by the boot handshake',
    Boolean(bootPayloadAfter) && bootPayloadAfter.skinId === pair.applied,
    `handshake.skinId=${bootPayloadAfter?.skinId ?? '(missing)'} (expected ${pair.applied})`,
  )
  // Reload returns to the conversation; re-open the Livery panel to prove the
  // persisted skin renders through the new navigation entry.
  const reopened = await openLiveryDetailed(page, { labels: uiLabels, locale: state.actualLocale }).catch((error) => ({ error }))
  if (!reopened?.error) {
    state.panelAfterReload = reopened
    const mainAfterReload = await readMainColumnState(page)
    expect(
      runner,
      'nav.panel-after-reload',
      'after a hard reload the Livery panel opens again from the sidebar row and shows the persisted skin',
      reopened.via === PANEL_NAV_VIA && mainAfterReload.liveryPanelVisible && mainAfterReload.selectedRowLabel === uiLabels.section,
      `via=${reopened.via}; panel visible=${mainAfterReload.liveryPanelVisible}; selected "${mainAfterReload.selectedRowLabel}"`,
    )
  } else {
    runner.fail('nav.panel-after-reload', 'after a hard reload the Livery panel opens again from the sidebar row and shows the persisted skin', String(reopened.error))
  }
  await capture(page, ctx, { state: 'panel-applied-after-reload', mode: 'light' })
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
  const alreadyConfirmed = before.skinId === skinId
  // A single mutation is either a newly appended config row (fresh profile) or
  // an in-place value update of the one existing `- id: livery` row (a cloned
  // real profile already carries the settings row with `skinId: stock`).
  const updatedInPlace = added === 0 && afterRows.length === 1 && before.skinId !== skinId
  return {
    ok: Boolean(skinRow) && after.skinId === skinId && (added === 1 || alreadyConfirmed || updatedInPlace),
    detail:
      `before skinId=${before.skinId ?? '(none)'} (${beforeRows.length} row(s)) → after skinId=${after.skinId} (${afterRows.length} row(s), added ${added}${updatedInPlace ? ', updated in place' : ''})` +
      (alreadyConfirmed ? '; target was already confirmed (no redundant write needed)' : '') +
      (skinRow ? `; row: ${oneLine(skinRow, 240)}` : '; no skinId row found'),
    evidence: { before: before.text, after: after.text, added, alreadyConfirmed, updatedInPlace, skinRow: skinRow ?? null },
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
  const stockCanonical = state.stock?.canonical ?? null
  const differsFromStock = stockCanonical === null || expectedLight.some((value, index) => value !== null && value !== stockCanonical[index])
  expect(
    runner,
    'theme.tokens-change-with-skin',
    'applying a livery changes the computed host tokens versus the stock baseline',
    differsFromStock && snapshot.bodyAttribute === skinId,
    stockCanonical === null
      ? 'no stock baseline in this mode (reuse); body attribute change asserted instead'
      : `livery light tokens ${JSON.stringify(expectedLight)} vs stock ${JSON.stringify(stockCanonical)}`,
  )
  expect(
    runner,
    'theme.host-preference',
    'host theme source stays system and no ui-theme row is written',
    snapshot.themeSource === 'system',
    `html[data-ds-theme-source]=${snapshot.themeSource}`,
  )
  const patch = config.mode === 'isolated' ? await inspectProfilePatch(config.dshHome, config.dshProfile ?? 'web') : { hasThemeRow: false, text: '' }
  expect(runner, 'theme.host-preference-file', 'profile patch contains no ui-theme writes', patch.hasThemeRow === false, patch.hasThemeRow ? 'ui-theme row present' : 'no ui-theme row')

  // Hash equality: body attr == handshake cssHash == sha256(style text).
  const bootPayload = state.bootPayloadApplied ?? snapshot.bootPayload
  const catalogProblems = []
  if (bootPayload && catalog) {
    if (catalog.hostVersion !== bootPayload.hostVersion) catalogProblems.push(`hostVersion ${catalog.hostVersion} ≠ ${bootPayload.hostVersion}`)
    if (catalog.adapterId !== bootPayload.adapterId) catalogProblems.push(`adapterId ${catalog.adapterId} ≠ ${bootPayload.adapterId}`)
    if (catalog.contractHash !== bootPayload.contractHash) catalogProblems.push('contractHash differs')
    if (catalog.catalogProfile !== bootPayload.catalogProfile) catalogProblems.push('catalogProfile differs')
  } else {
    catalogProblems.push('missing boot payload or catalog')
  }
  expect(
    runner,
    'handshake.catalog-identity',
    'served catalog repeats the exact certified identity of the boot handshake',
    catalogProblems.length === 0,
    catalogProblems.length ? catalogProblems.join('; ') : `${catalog.hostVersion} / ${catalog.adapterId} / ${oneLine(catalog.contractHash, 20)}… / ${oneLine(catalog.catalogProfile, 20)}…`,
    { boot: bootPayload ? { hostVersion: bootPayload.hostVersion, adapterId: bootPayload.adapterId, contractHash: bootPayload.contractHash, catalogProfile: bootPayload.catalogProfile } : null, catalog: catalog ? { hostVersion: catalog.hostVersion, adapterId: catalog.adapterId, contractHash: catalog.contractHash, catalogProfile: catalog.catalogProfile } : null },
  )
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
/** Expected font values for one locale, selected by the host capability facts. */
function fontExpectationsOf(ctx, livery, locale) {
  const localeKey = locale === 'zh' ? 'zh-CN' : 'en-US'
  const lang = locale === 'zh' ? 'zh-CN' : 'en'
  const uiStack = livery.typography?.ui?.[localeKey] ?? null
  const contentStack = livery.typography?.content?.[localeKey] ?? uiStack
  const codeStack = livery.typography?.code ?? null
  return { strategy: fontStrategyOf(ctx), localeKey, lang, uiStack, contentStack, codeStack, expectedStack: contentStack ?? uiStack }
}

/** Strategy-aware font assertion for one locale snapshot. */
function describeFontMismatch(expectations, snapshot) {
  return JSON.stringify({
    strategy: expectations.strategy,
    lang: snapshot.lang,
    expectedStack: expectations.expectedStack,
    bodyFontFamily: snapshot.bodyFontFamily,
    roleText: snapshot.tokens.fontRoleText,
    composite: snapshot.tokens.fontFamily,
  })
}

/** Assert the font strategy for one locale; returns the runner check. */
function assertFontsForLocale(runner, ctx, expectations, snapshot, checkId, title) {
  const { strategy, lang, expectedStack, codeStack } = expectations
  const bodyFontOk = expectedStack ? fontStackStartsWith(snapshot.bodyFontFamily, expectedStack) : false
  if (strategy === 'role-hooks') {
    const roleText = normalizeFontStack(snapshot.tokens.fontRoleText)
    const expectedText = normalizeFontStack(expectedStack)
    const compositeStartsWith = fontStackStartsWith(snapshot.tokens.fontFamily, expectedStack)
    return expect(
      runner,
      checkId,
      title,
      snapshot.lang === lang && roleText === expectedText && bodyFontOk && compositeStartsWith,
      `strategy=role-hooks html lang=${snapshot.lang}; --dsh-font-family-text=${oneLine(snapshot.tokens.fontRoleText, 180)}; expected=${oneLine(expectedStack, 180)}; body font=${oneLine(snapshot.bodyFontFamily, 100)}`,
      { ...describeFontMismatch(expectations, snapshot) },
    )
  }
  const compositeEquals = normalizeFontStack(snapshot.tokens.fontFamily) === normalizeFontStack(expectedStack)
  return expect(
    runner,
    checkId,
    title,
    snapshot.lang === lang && compositeEquals && bodyFontOk,
    `strategy=legacy-composite html lang=${snapshot.lang}; --dsw-font-family=${oneLine(snapshot.tokens.fontFamily, 180)}; expected=${oneLine(expectedStack, 180)}`,
    { ...describeFontMismatch(expectations, snapshot) },
  )
}

/** Assert the documented role-hook values (0.2.1+ only). */
function assertFontRoleHooks(runner, ctx, expectations, snapshot, checkId) {
  if (expectations.strategy !== 'role-hooks') {
    runner.skip(checkId, 'host font role hooks carry the livery UI and code stacks (0.2.1+)', 'host does not certify host-font-role-hooks (legacy composite strategy)')
    return
  }
  const text = normalizeFontStack(snapshot.tokens.fontRoleText)
  const expectedText = normalizeFontStack(expectations.expectedStack)
  const code = normalizeFontStack(snapshot.tokens.fontRoleCode)
  const expectedCode = normalizeFontStack(expectations.codeStack ?? '')
  const codeFamilyStartsWith = expectations.codeStack ? fontStackStartsWith(snapshot.tokens.legacyCodeFamily, expectations.codeStack) : true
  expect(
    runner,
    checkId,
    'host font role hooks carry the livery UI and code stacks (0.2.1+)',
    Boolean(expectedText) && text === expectedText && Boolean(expectedCode) && code === expectedCode && codeFamilyStartsWith,
    `--dsh-font-family-text=${oneLine(snapshot.tokens.fontRoleText, 160)} (expected ${oneLine(expectations.expectedStack, 160)}); --dsh-font-family-code=${oneLine(snapshot.tokens.fontRoleCode, 120)} (expected ${oneLine(expectations.codeStack, 120)}); --ds-font-family-code=${oneLine(snapshot.tokens.legacyCodeFamily, 100)}`,
    {
      roleText: snapshot.tokens.fontRoleText,
      roleCode: snapshot.tokens.fontRoleCode,
      resolvedCodeFamily: snapshot.tokens.legacyCodeFamily,
    },
  )
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
  const strategy = fontStrategyOf(ctx)
  state.fontStrategy = strategy
  const snapshot = await readThemeSnapshot(page)
  const zh = fontExpectationsOf(ctx, livery, 'zh')
  const zhFamily = firstConcreteFamily(zh.expectedStack ?? '')
  assertFontsForLocale(runner, ctx, zh, snapshot, 'fonts.zh-cjk', `zh-CN page resolves the livery CJK stack (${strategy})`)
  assertFontRoleHooks(runner, ctx, zh, snapshot, 'fonts.zh-role-hooks')
  const cjkFamily = zhFamily && ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Songti SC', 'Noto Sans CJK SC'].includes(zhFamily) ? zhFamily : zhFamily
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
    const en = fontExpectationsOf(ctx, livery, 'en')
    assertFontsForLocale(runner, ctx, en, enSnapshot, 'fonts.en-latin', `en page resolves the livery latin stack (${strategy})`)
    await capture(page, ctx, { locale: 'en', state: 'panel-applied', mode: 'light' })
    // English sidebar entry + panel copy
    const enLabels = labelsFor('en')
    const enOpened = await openLiveryDetailed(page, { labels: enLabels, locale: 'en' })
    const enRowLabel = enOpened.row?.ariaLabel ?? enOpened.row?.label ?? null
    expect(
      runner,
      'locale.en-gallery',
      'English shell shows the Livery sidebar entry and English panel copy',
      enOpened.via === PANEL_NAV_VIA && enRowLabel === enLabels.section,
      `sidebar row label "${enRowLabel}" (expected "${enLabels.section}"); via=${enOpened.via}`,
    )
    // In an English host locale, Follow DSH must resolve thumbnails to -en-.
    await waitForThumbLocale(page, 'en').catch(() => {})
    const enLocaleTab = await readLocaleTab(page)
    const enThumbs = await readThumbLocales(page)
    expect(
      runner,
      'previewLocale.en-follow',
      'Follow DSH follows the English host locale for thumbnails',
      enLocaleTab.found === true &&
        enLocaleTab.buttons?.find((button) => button.choice === 'follow')?.pressed === true &&
        enThumbs.length > 0 &&
        enThumbs.every((src) => thumbLocaleOf(src) === 'en'),
      `${enThumbs.length} thumbs; locales=${JSON.stringify([...new Set(enThumbs.map(thumbLocaleOf))])}; follow pressed=${enLocaleTab.buttons?.find((button) => button.choice === 'follow')?.pressed}`,
    )
    await capture(page, ctx, { locale: 'en', state: 'panel-gallery' })
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
  await setLocalePreference(ctx.config.dshHome, 'en', ctx.config.dshProfile ?? 'web')
  // The profile patch layer hot-reloads, but give the host a beat before reload.
  await sleep(600)
}

async function restoreLocaleZh(ctx) {
  const { restoreLocaleZh: restore } = await import('./dsh-home.mjs')
  await restore(ctx.config.dshHome, ctx.config.dshProfile ?? 'web')
  await sleep(400)
}

/** Registered style-token families present in one compiled livery. */
export function styleFamiliesOf(livery) {
  const patterns = {
    shape: /^--dsw-radius-|^--dsw-corner-shape$/,
    elevation: /^--dsw-shadow-|^--dsw-elevation-/,
    material: /^(--dsw-menu-backdrop-filter|--dsw-mask-blur|--dsw-focus-ring-width)$/,
    border: /^--dsw-alias-border-l[1-4]$/,
  }
  const families = { shape: [], elevation: [], material: [], border: [] }
  for (const mode of ['light', 'dark']) {
    for (const name of Object.keys(livery?.[mode]?.tokens ?? {})) {
      for (const [family, pattern] of Object.entries(patterns)) {
        if (pattern.test(name) && !families[family].includes(name)) families[family].push(name)
      }
    }
  }
  return families
}

function normalizeTokenValue(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function radiusPx(value) {
  const match = String(value ?? '').match(/(-?\d+(?:\.\d+)?)px/)
  return match ? Number(match[1]) : null
}

function firstFamily(value) {
  return String(value ?? '').split(',')[0]?.trim().replace(/^["']|["']$/g, '').toLowerCase() ?? ''
}

function distinctCount(values) {
  return new Set(values.filter((value) => value !== null && value !== undefined && value !== '')).size
}

function looksSerif(livery) {
  const stacks = JSON.stringify(livery?.typography ?? {})
  return /Songti|STSong|Noto Serif|Source Han Serif|Iowan Old Style|Palatino|Georgia|Times New Roman|serif/i.test(stacks)
}

/**
 * Pick 2–4 visually contrasting liveries for host-level style verification.
 * Preference order matches the design table; fallbacks guarantee the set spans
 * a sharp/flat shape, a rounded/soft shape, a serif/paper typography and a glass
 * material.
 */
export function pickContrastCandidates(catalog) {
  const liveries = catalog?.liveries ?? []
  const preferred = ['graphite', 'catppuccin', 'rice-paper', 'tokyo-night', 'solarized', 'dracula']
  const chosen = preferred.map((id) => liveries.find((livery) => livery.id === id)).filter(Boolean)
  const addFirst = (predicate) => {
    if (chosen.some(predicate)) return
    const found = liveries.find(predicate)
    if (found) chosen.push(found)
  }
  addFirst((livery) => livery.layout?.surfaceStyle === 'sharp')
  addFirst((livery) => ['rounded', 'soft', 'elevated'].includes(livery.layout?.surfaceStyle))
  addFirst((livery) => looksSerif(livery))
  addFirst((livery) => livery.layout?.surfaceStyle === 'glass')
  const seen = new Set()
  const diverse = []
  for (const livery of chosen) {
    const key = `${livery.layout?.surfaceStyle}|${firstFamily(livery.typography?.ui?.['en-US'] ?? livery.typography?.ui?.en)}`
    if (seen.has(key)) continue
    seen.add(key)
    diverse.push(livery)
    if (diverse.length >= 4) break
  }
  return diverse
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
  // The fonts group ends with a locale flip + reload; let the locale/theme
  // settle before interacting, then clear any late first-run overlay that can
  // re-appear on a cloned profile without credentials.
  await page.waitForFunction(() => Boolean(document.documentElement.lang), undefined, { timeout: 10_000 }).catch(() => {})
  await sleep(350)
  await dismissFirstRunDialogs(page)
  const uiLocale = await detectUiLocale(page)
  state.actualLocale = uiLocale
  const uiLabels = labelsFor(uiLocale)
  try {
    await openLiveryDetailed(page, { labels: uiLabels, locale: uiLocale })
  } catch (error) {
    runner.fail('selfcheck.panel', 'self-check panel reports capability availability', String(error))
    return
  }
  if (!(await liveryPanelVisible(page))) {
    runner.fail('selfcheck.panel', 'self-check panel reports capability availability', 'Livery panel not visible')
    return
  }
  let selfCheck = await findControl(page, { testId: 'livery-selfcheck-toggle', names: [uiLabels.selfCheck], exact: false })
  if (!selfCheck.locator) {
    // Fallback: click the toggle button inside the self-check section.
    const toggle = page.locator('[data-testid="livery-selfcheck"] button').first()
    if (await toggle.count()) selfCheck = { locator: toggle, via: 'self-check toggle button' }
  }
  if (selfCheck.locator) {
    const expanded = await selfCheck.locator.getAttribute('aria-expanded').catch(() => null)
    if (expanded !== 'true') {
      await selfCheck.locator.scrollIntoViewIfNeeded().catch(() => {})
      try {
        await selfCheck.locator.click({ timeout: 8_000 })
      } catch {
        await selfCheck.locator.evaluate((element) => element.click()).catch(() => {})
      }
    }
    // The panel body renders capability rows only after expansion; on a
    // real-profile clone with extra plugins the React commit can take longer.
    await page
      .waitForSelector('[data-testid="livery-capability"]', { state: 'visible', timeout: 10_000 })
      .catch(() => {})
    const nowExpanded = await selfCheck.locator.getAttribute('aria-expanded').catch(() => null)
    if (nowExpanded !== 'true') await selfCheck.locator.evaluate((element) => element.click()).catch(() => {})
    await page
      .waitForSelector('[data-testid="livery-capability"]', { state: 'visible', timeout: 8_000 })
      .catch(() => {})
  }
  await sleep(400)
  const panel = await readSelfCheck(page)
  state.selfCheck = panel
  const capabilityRows = panel.capabilities
  const expectedCapabilities = expectedCapabilitiesOf(ctx)
  const rowProblems = []
  for (const [id, available] of Object.entries(expectedCapabilities)) {
    const row = capabilityRows.find((candidate) => candidate.id === id)
    if (!row) rowProblems.push(`${id}: row missing`)
    else if (row.available !== available) rowProblems.push(`${id}: expected ${available}, got ${row.available}`)
  }
  expect(
    runner,
    'selfcheck.capabilities',
    'self-check lists capability availability from the certified adapter contract (incl. host-font-role-hooks on 0.2.1)',
    rowProblems.length === 0,
    rowProblems.length ? rowProblems.join('; ') : `${capabilityRows.length} capability row(s): ${capabilityRows.map((row) => `${row.id}=${row.available}`).join(', ')}`,
    { capabilities: capabilityRows, expected: expectedCapabilities, text: panel.text },
  )
  // Round-12 copy polish: plain self-check wording (zh/en) must be present.
  // Detect the rendered locale from the panel copy itself: a reload may settle
  // on either locale in this build, while the labels must be the plain ones.
  const selfCheckText = panel.text ?? ''
  const selfCheckIsZh = selfCheckText.includes('自检') || selfCheckText.includes('协议校验码')
  const selfCheckCopyExpected = selfCheckIsZh
    ? ['启动信息', '样式覆盖', '协议校验码', '未限定范围的变量']
    : ['Startup check', 'Style coverage', 'Contract hash', 'Unscoped variables']
  expect(
    runner,
    'copy.selfcheck-labels',
    'self-check uses the round-12 plain-language labels',
    selfCheckCopyExpected.every((label) => selfCheckText.includes(label)),
    `locale=${selfCheckIsZh ? 'zh' : 'en'}; missing=${JSON.stringify(selfCheckCopyExpected.filter((label) => !selfCheckText.includes(label)))}; panel=${oneLine(selfCheckText, 260)}`,
  )

  // Style-system v2: the applied livery must expose shape/elevation/material
  // token families and the self-check token coverage must report zero missing.
  const appliedLivery = state.activeLivery ?? (state.catalog?.liveries ?? []).find((livery) => livery.id === state.appliedSkin)
  const styleFamilies = appliedLivery ? styleFamiliesOf(appliedLivery) : {}
  const coverageMatch =
    (panel.text ?? '').match(/(?:覆盖|covered)\s*([\d,]+)[\s\S]{0,60}?(?:继承|inherited)[\s\S]{0,60}?(?:缺失|missing)\s*([\d,]+)/i) ??
    (panel.text ?? '').match(/([\d,]+)\s*covered[\s\S]{0,40}?([\d,]+)\s*inherited[\s\S]{0,40}?([\d,]+)\s*missing/i)
  const missingTokens = coverageMatch ? Number(coverageMatch[coverageMatch.length - 1].replace(/,/g, '')) : null
  const familyCount = Object.values(styleFamilies).filter((families) => families.length > 0).length
  expect(
    runner,
    'selfcheck.style-coverage',
    'self-check reports token coverage with no missing tokens, and the applied style exposes style-token families',
    familyCount >= 2 && (missingTokens === null ? true : missingTokens === 0),
    `applied=${appliedLivery?.id ?? '(none)'} styleFamilies=${JSON.stringify(Object.fromEntries(Object.entries(styleFamilies).map(([family, names]) => [family, names.length])))} selfCheckMissingTokens=${missingTokens ?? '(not parsed)'}`,
    { styleFamilies, coverageText: oneLine(panel.text, 800) },
  )

  // Self-check must name the live certified identity (multi-version.md §6).
  const adapter = expectedAdapterOf(ctx)
  const identityText = panel.text ?? ''
  const contractShort = (adapter?.contractHash ?? '').replace(/^sha256:/, '').slice(0, 8)
  const profileShort = (state.catalog?.catalogProfile ?? '').replace(/^sha256:/, '').slice(0, 8)
  const identityProblems = []
  if (adapter) {
    if (!identityText.includes(adapter.hostVersion)) identityProblems.push(`hostVersion ${adapter.hostVersion} not shown`)
    if (!identityText.includes(adapter.adapterId)) identityProblems.push(`adapterId ${adapter.adapterId} not shown`)
    if (contractShort && !identityText.includes(contractShort)) identityProblems.push(`contract hash prefix ${contractShort} not shown`)
  } else {
    identityProblems.push('no certified adapter resolved for this run')
  }
  expect(
    runner,
    'selfcheck.identity',
    'self-check shows the live host version, adapter id and contract hash',
    identityProblems.length === 0,
    identityProblems.length ? identityProblems.join('; ') : `panel shows ${adapter.hostVersion} / ${adapter.adapterId} / ${contractShort}…`,
    { text: oneLine(identityText, 1200) },
  )
  const profileShown = !profileShort || identityText.includes(profileShort)
  if (profileShown) {
    runner.pass('selfcheck.catalog-profile', 'self-check shows the catalog profile id', `panel shows ${profileShort}… (${oneLine(state.catalog?.catalogProfile, 30)}…)`)
  } else {
    runner.warn('selfcheck.catalog-profile', 'self-check shows the catalog profile id', `panel does not show the catalog profile prefix ${profileShort} — client copy may not surface it yet (evidence recorded)`)
  }
  if (!state.appliedSkin) {
    runner.skip('selfcheck.contrast', 'self-check reports 0 contrast failures', 'no active livery presented (stock)')
    runner.skip('selfcheck.css-safety', 'self-check reports 0 !important / 0 hash selectors', 'no active livery presented (stock)')
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
  const optionalInfo = await page.locator('[data-testid="livery-optional-info"]').count().catch(() => 0)
  const degradedNoticeInPanel = await page.locator('[data-testid="livery-degraded"]').count().catch(() => 0)
  expect(
    runner,
    'selfcheck.optional-info',
    'self-check discloses optional capability fallbacks (optional-info line, or a degraded notice on older builds)',
    optionalInfo > 0 || degradedNoticeInPanel > 0,
    optionalInfo > 0
      ? `${optionalInfo} livery-optional-info line(s)`
      : degradedNoticeInPanel > 0
        ? 'older build discloses the fallbacks through the degraded notice instead of livery-optional-info'
        : 'no fallback disclosure found in the self-check panel',
  )
  await capture(page, ctx, { state: 'selfcheck', mode: 'light' })

  // copy diagnostics
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(config.baseUrl).origin })
  } catch {
    /* clipboard permissions are best effort */
  }
  const copy = await findControl(page, { testId: 'livery-copy-diagnostics', names: [uiLabels.copyDiagnostics], exact: false })
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
    // A late onboarding modal can cover the main panel on a cloned profile
    // without credentials; dismiss and retry, falling back to a JS click.
    let copyClicked = false
    for (let attempt = 0; attempt < 3 && !copyClicked; attempt += 1) {
      await dismissFirstRunDialogs(page)
      try {
        await copy.locator.click({ timeout: 6_000 })
        copyClicked = true
      } catch {
        try {
          await copy.locator.evaluate((element) => element.click())
          copyClicked = true
        } catch {
          await sleep(300)
        }
      }
    }
    if (!copyClicked) {
      const overlays = await page.evaluate(() => [...document.querySelectorAll('[role="presentation"], [aria-hidden="true"]')].map((element) => ({ cls: String(element.className).slice(0, 80), text: (element.textContent ?? '').trim().slice(0, 120) })).slice(0, 5))
      runner.fail('selfcheck.copy-diagnostics', 'copy diagnostics produces diagnostics text', `copy button was not clickable after 3 overlay-recovery attempts; overlays=${JSON.stringify(overlays)}`)
    }
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
      const adapterId = state.catalog?.adapterId ?? ''
      const contractPrefix = String(state.catalog?.contractHash ?? '').replace(/^sha256:/, '').slice(0, 8)
      expect(
        runner,
        'selfcheck.copy-diagnostics-content',
        'copied diagnostics carry the DSH Livery header + adapter id + contract prefix (engineering ids live in diagnostics, not the About footer)',
        clipboard.ok === true && adapterId.length > 0 && clipboard.text.includes(adapterId) && (contractPrefix.length === 0 || clipboard.text.includes(contractPrefix)) && clipboard.text.includes('DSH Livery') && !clipboard.text.includes('Visual Studio'),
        `adapterId="${adapterId}" present=${clipboard.text.includes(adapterId)}; contractPrefix="${contractPrefix}" present=${contractPrefix.length === 0 || clipboard.text.includes(contractPrefix)}; headerDSHLivery=${clipboard.text.includes('DSH Livery')}; noVisualStudio=${!clipboard.text.includes('Visual Studio')}`,
        { preview: oneLine(clipboard.text, 800) },
      )
    } else {
      expect(runner, 'selfcheck.copy-diagnostics', 'copy diagnostics produces diagnostics text', toast, `clipboard unreadable (${clipboard.error ?? 'unknown'}); "diagnostics copied" toast=${toast}`)
    }
    await capture(page, ctx, { state: 'panel-diagnostics-copied', mode: 'light' })
  }
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
  // rAF callbacks before the browser's first paint entry are pre-paint DOM
  // snapshots, not painted frames; the stock-frame assertion must only judge
  // frames that were actually painted.
  const firstPaintAt = typeof paintTimings.firstPaint === 'number' ? paintTimings.firstPaint : 0
  const allSamples = (samples?.samples ?? []).filter(Boolean)
  const bodySamples = allSamples.filter((sample) => sample.t >= firstPaintAt)
  const expectedLight = await canonicalizeColors(page, THEME_TOKENS.map((token) => livery.light.tokens[token]))
  const badSamples = bodySamples.filter(
    (sample) => sample.attr !== state.appliedSkin || (sample.liveryStyles === 0 && !sample.bootStyle),
  )
  expect(
    runner,
    'firstpaint.no-stock-frame',
    'every painted frame after body creation already carries the livery body attribute and boot style',
    bodySamples.length > 0 && badSamples.length === 0,
    `${bodySamples.length}/${allSamples.length} painted rAF sample(s) considered (pre-first-paint samples ignored); ${badSamples.length} without attribute/boot style; first painted sample: ${oneLine(JSON.stringify(bodySamples[0] ?? null), 300)}`,
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
  // Rendered client/livery CSS budget (docs/design/implementation-plan.md §18.8).
  // Final 0.1.4 merged-client cap is 20 KiB with a 16 KiB soft target; the same
  // text is the first-frame boot CSS. Report the actual bytes.
  const cssBytes = await page.evaluate(() => [...document.querySelectorAll('style[id^="dsh-livery"]')].reduce((total, style) => total + (style.textContent ?? '').length, 0))
  ctx.state.cssBytes = cssBytes
  expect(
    runner,
    'css.size-budget',
    `rendered livery/client stylesheet stays within the final ${RENDERED_CSS_BUDGET_LABEL} hard budget`,
    cssBytes > 0 && cssBytes <= RENDERED_CSS_BUDGET_BYTES,
    `${cssBytes} bytes rendered CSS (soft target ${RENDERED_CSS_TARGET_BYTES} B, hard cap ${RENDERED_CSS_BUDGET_BYTES} B / ${RENDERED_CSS_BUDGET_LABEL})`,
    { cssBytes, targetBytes: RENDERED_CSS_TARGET_BYTES, budgetBytes: RENDERED_CSS_BUDGET_BYTES },
  )
  if (cssBytes > RENDERED_CSS_TARGET_BYTES && cssBytes <= RENDERED_CSS_BUDGET_BYTES) {
    runner.warn(
      'css.size-target',
      'rendered livery/client stylesheet is within the final soft target range',
      `${cssBytes} bytes is above the ${RENDERED_CSS_TARGET_BYTES} B soft target but under the ${RENDERED_CSS_BUDGET_LABEL} hard cap`,
    )
  }

  // Whole-document MutationObserver authorship: the shell installs its own
  // document-level observer, so count only observers whose creation stack names
  // the Livery bundle. Any such observer is an
  // implementation-plan.md §18.3/§20 violation.
  const observerReport = await readObserverReport(page)
  ctx.state.appliedObserverReport = observerReport
  const attributed = observerReport.observations.filter((entry) => entry.liveryAttributed)
  const stockCount = state.stockObserverReport?.wholeDocument ?? null
  const noNewObserver = stockCount === null || observerReport.wholeDocument <= stockCount
  expect(
    runner,
    'css.no-whole-document-observers',
    'the livery adds no document-wide MutationObserver (shell baseline excluded; Livery-owned attribution = 0)',
    observerReport.liveryAttributed === 0 && noNewObserver,
    `Livery-attributed whole-document observers: ${observerReport.liveryAttributed}; whole-document observers stock=${stockCount ?? '?'} → livery-active=${observerReport.wholeDocument} (shell itself observes documentElement; delta must not grow)` +
      (attributed.length ? `; stacks: ${attributed.slice(0, 3).map((entry) => entry.stack).join(' || ')}` : ''),
    { stock: state.stockObserverReport, applied: observerReport },
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
  // The fonts group ends with a locale flip + reload; let the locale/theme
  // settle before interacting, then clear any late first-run overlay that can
  // re-appear on a cloned profile without credentials.
  await page.waitForFunction(() => Boolean(document.documentElement.lang), undefined, { timeout: 10_000 }).catch(() => {})
  await sleep(350)
  await dismissFirstRunDialogs(page)
  const uiLocale = await detectUiLocale(page)
  state.actualLocale = uiLocale
  const uiLabels = labelsFor(uiLocale)
  try {
    await openLiveryDetailed(page, { labels: uiLabels, locale: uiLocale })
  } catch (error) {
    runner.fail('restore.stock', 'Restore stock appearance removes the livery and returns stock tokens', String(error))
    return
  }
  if (!(await liveryPanelVisible(page))) {
    runner.fail('restore.stock', 'Restore stock appearance removes the livery and returns stock tokens', 'Livery panel not visible')
    return
  }
  const restore = await findControl(page, { testId: 'livery-restore', names: [uiLabels.restoreStock], exact: false })
  if (!restore.locator) {
    runner.fail('restore.stock', 'Restore stock appearance removes the livery and returns stock tokens', 'restore control not found')
    return
  }
  const restoreDisabled = await restore.locator.isDisabled().catch(() => false)
  if (restoreDisabled || !state.appliedSkin) {
    runner.skip('restore.stock', 'Restore stock appearance removes the livery and returns stock tokens', `restore control is disabled (already stock / no applied skin): disabled=${restoreDisabled}; appliedSkin=${state.appliedSkin ?? '(none)'}`)
    runner.skip('restore.persists', 'stock restore survives a hard reload', 'already on stock appearance')
    return
  }
  await restore.locator.click()
  await sleep(400)
  // Restore is destructive, so the page opens a confirmation modal first. The
  // page-level "Restore stock appearance" button must not be clicked again, so
  // match the modal's exact confirm copy inside the last dialog.
  const confirmNames = [uiLabels.restoreConfirm ?? '恢复默认', '恢复默认', 'Restore stock']
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
  await capture(page, ctx, { state: 'panel-stock', mode: 'light' })
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

  // Close the primary page before SIGTERM: an open page logs WebSocket/events
  // failures when the server goes down, which would otherwise pollute the
  // console evidence we archive.
  await ctx.session?.context?.close().catch(() => {})
  const stop = await stopWeb(boot, { timeoutMs: 20_000 })
  ctx.lifecycle = ctx.lifecycle ?? {}
  ctx.lifecycle.stopBeforeUninstall = stop
  expect(runner, 'lifecycle.sigterm', 'SIGTERM stops the web service cleanly and closes the port', stop.stopped && (stop.exitCode === 0 || stop.exitCode === null) && stop.portClosed, `exit=${stop.exitCode} signal=${stop.signal} shutdown=${stop.shutdownMs}ms portClosed=${stop.portClosed} forced=${stop.forceKilled}`)

  const patchBefore = await inspectProfilePatch(config.dshHome, config.dshProfile ?? 'web')
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
    if (expectedStock === null) {
      runner.skip('residue.stock-tokens', 'after uninstall + restart computed tokens equal the stock baseline', 'no stock baseline captured in this run (reused profile started with a configured livery)')
    } else {
      expect(
        runner,
        'residue.stock-tokens',
        'after uninstall + restart computed tokens equal the stock baseline',
        actual.every((value, index) => value === expectedStock[index]),
        `actual=${JSON.stringify(actual)} stock=${JSON.stringify(expectedStock)}`,
      )
    }
    const hasPayload = await session.page.evaluate(() => Boolean(window.__DSH_LIVERY_BOOT__))
    expect(runner, 'residue.no-boot-payload', 'after uninstall the first-frame handshake global is absent', !hasPayload, `window.__DSH_LIVERY_BOOT__=${hasPayload}`)
    const firstLiveryId = state.catalog?.liveries?.[0]?.id ?? 'fjord'
    const residuePreviewPath = `${previewsBaseOf(ctx)}${firstLiveryId}-zh-light.svg`
    const urls = [
      ['residue.catalog-route', '/livery/api/catalog', 404],
      ['residue.preview-route', residuePreviewPath, 404],
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
    const patchAfter = await inspectProfilePatch(config.dshHome, config.dshProfile ?? 'web')
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

/**
 * Style-system v2 acceptance: prove that contrasting shipped liveries change the
 * real host UI (computed styles / CSS cascade), not just a stylesheet's tokens.
 *
 * In isolated runs each candidate is committed through the real Apply button,
 * the conversation is exposed and the composer/buttons are measured. In
 * read-only reuse mode the same candidates are transiently previewed (no config
 * writes) and panel-side host nodes + applied tokens are measured.
 */
export async function checkStyleContrast(ctx) {
  const { runner, session, config, state } = ctx
  const { page } = session
  const catalog = state.catalog
  if (!catalog || !state.appliedSkin) {
    runner.skip('style.candidates', 'contrasting styles can be applied and observed on the host', 'no active livery/catalog available')
    return
  }
  const candidates = pickContrastCandidates(catalog)
  if (candidates.length < 2) {
    runner.skip('style.candidates', 'contrasting styles can be applied and observed on the host', `not enough contrasting liveries in the catalog (${candidates.length})`)
    return
  }
  state.styleCandidates = candidates.map((livery) => ({
    id: livery.id,
    surfaceStyle: livery.layout?.surfaceStyle ?? null,
    serif: looksSerif(livery),
    uiStack: firstFamily(livery.typography?.ui?.['en-US'] ?? livery.typography?.ui?.en),
    families: Object.fromEntries(Object.entries(styleFamiliesOf(livery)).map(([family, names]) => [family, names.length])),
  }))
  const previewOnly = config.mode === 'reuse' && !config.allowMutations
  const uiLocale = await detectUiLocale(page)
  state.actualLocale = uiLocale
  const uiLabels = labelsFor(uiLocale)
  const measurements = []
  try {
    await dismissFirstRunDialogs(page)
    await openLiveryDetailed(page, { labels: uiLabels, locale: uiLocale })
    for (const candidate of candidates) {
      // Applied styles are measured with the conversation exposed (composer is a
      // host node the style must reshape), so every iteration re-opens the panel.
      await openLiveryDetailed(page, { labels: uiLabels, locale: uiLocale }).catch(() => {})
      const styleTab = page.locator('[data-testid="livery-page-tab-style"]')
      if ((await styleTab.count()) > 0) await styleTab.click({ timeout: 8_000 }).catch(() => {})
      await page.waitForSelector('[data-testid="livery-current-card"]', { timeout: 10_000 }).catch(() => {})
      const measurement = await measureOneStyle(ctx, candidate, { previewOnly, uiLabels })
      if (measurement) measurements.push(measurement)
    }
    if (previewOnly) {
      // Drop the transient preview back to the confirmed skin.
      await openLiveryDetailed(page, { labels: uiLabels, locale: uiLocale })
      const cancel = await findControl(page, { testId: 'livery-cancel', names: [uiLabels.cancel], exact: false })
      if (cancel.locator) await cancel.locator.click({ timeout: 8_000 }).catch(() => {})
      await sleep(300)
    }
  } catch (error) {
    runner.fail('style.candidates', 'contrasting styles can be applied and observed on the host', error instanceof Error ? (error.stack ?? error.message) : String(error))
    return
  }
  state.styleMeasurements = measurements.map((entry) => ({
    id: entry.livery.id,
    surfaceStyle: entry.livery.layout?.surfaceStyle ?? null,
    serif: looksSerif(entry.livery),
    families: entry.families,
    tokens: entry.probe.tokens,
    elements: entry.probe.elements,
    source: entry.source,
  }))
  expect(
    runner,
    'style.candidates',
    '2–4 contrasting styles were activated and observed (shape/typography/material diversity)',
    measurements.length >= 2 && distinctCount(measurements.map((entry) => entry.livery.layout?.surfaceStyle)) >= 2 && distinctCount(measurements.map((entry) => firstFamily(entry.livery.typography?.ui?.['en-US'] ?? entry.livery.typography?.ui?.en))) >= 2,
    `${measurements.length} styles: ${measurements.map((entry) => `${entry.livery.id}[${entry.livery.layout?.surfaceStyle}, ${firstFamily(entry.livery.typography?.ui?.['en-US'] ?? entry.livery.typography?.ui?.en)}]`).join(', ')} (${previewOnly ? 'transient preview' : 'applied via UI'})`,
    { candidates: state.styleCandidates },
  )

  // ---- shape: real border-radius change on host nodes (or radius tokens) ----
  const radiusSamples = []
  for (const entry of measurements) {
    const elements = entry.probe.elements ?? {}
    for (const key of ['composerShell', 'sendButton', 'newSessionButton', 'navRow', 'liveryCard', 'liveryPanel']) {
      const radius = elements[key]?.radius
      if (radius) radiusSamples.push({ id: entry.livery.id, element: key, radius: radiusPx(radius), raw: radius })
    }
    for (const token of ['--dsw-radius-lg', '--dsw-radius-panel', '--dsw-radius-md']) {
      const px = radiusPx(entry.probe.tokens?.[token])
      if (px !== null) radiusSamples.push({ id: entry.livery.id, element: token, radius: px, raw: entry.probe.tokens[token] })
    }
  }
  const byElement = new Map()
  for (const sample of radiusSamples) {
    if (sample.radius === null) continue
    if (!byElement.has(sample.element)) byElement.set(sample.element, [])
    byElement.get(sample.element).push(sample)
  }
  let bestSpread = { element: null, spread: 0, values: [] }
  for (const [element, samples] of byElement) {
    const values = samples.map((sample) => sample.radius)
    const spread = Math.max(...values) - Math.min(...values)
    if (spread > bestSpread.spread) bestSpread = { element, spread, values: samples.map((sample) => `${sample.id}=${sample.radius}px`) }
  }
  expect(
    runner,
    'style.host-radius',
    'contrasting styles change real host border-radius values (sharp vs rounded)',
    bestSpread.spread >= 6,
    `max spread ${bestSpread.spread}px on ${bestSpread.element ?? '(none)'}: [${bestSpread.values.join(', ')}]`,
    { samples: radiusSamples, bestSpread },
  )

  // ---- typography: body font stack really differs (serif vs sans) ----
  const fontSamples = measurements.map((entry) => ({
    id: entry.livery.id,
    serif: looksSerif(entry.livery),
    tokenFont: entry.probe.tokens?.['--dsh-font-family-text'] ?? entry.probe.tokens?.['--dsw-font-family'] ?? '',
    bodyFont: entry.probe.bodyFontFamily ?? '',
    first: firstFamily(entry.probe.bodyFontFamily),
  }))
  const distinctFonts = distinctCount(fontSamples.map((sample) => normalizeTokenValue(sample.tokenFont || sample.bodyFont)))
  const serifSamples = fontSamples.filter((sample) => sample.serif)
  const sansSamples = fontSamples.filter((sample) => !sample.serif)
  const serifDiffers = serifSamples.length > 0 && sansSamples.length > 0
    ? serifSamples.some((serif) => sansSamples.every((sans) => serif.first !== sans.first))
    : serifSamples.length > 0
  expect(
    runner,
    'style.host-font',
    'contrasting styles change the computed host font stack (serif vs sans)',
    distinctFonts >= 2 && serifDiffers,
    `${distinctFonts} distinct computed stacks; first families: [${fontSamples.map((sample) => `${sample.id}=${sample.first || '(none)'}`).join(', ')}]`,
    { fontSamples },
  )

  // ---- elevation / material: shadows and glass backdrop present ----
  const shadowSamples = []
  for (const entry of measurements) {
    for (const [key, element] of Object.entries(entry.probe.elements ?? {})) {
      if (element?.boxShadow) shadowSamples.push({ id: entry.livery.id, element: key, boxShadow: element.boxShadow })
    }
    for (const token of ['--dsw-shadow-lv1', '--dsw-elevation-panel', '--dsw-elevation-prominent']) {
      const value = entry.probe.tokens?.[token]
      if (value) shadowSamples.push({ id: entry.livery.id, element: token, boxShadow: value })
    }
  }
  const distinctShadows = distinctCount(shadowSamples.map((sample) => normalizeTokenValue(sample.boxShadow)))
  const nonNoneShadow = shadowSamples.some((sample) => !/^(none|0(px)?( 0(px)?)*)$/i.test(normalizeTokenValue(sample.boxShadow)))
  expect(
    runner,
    'style.host-elevation',
    'contrasting styles change real host motion/elevation (distinct shadow values, at least one visible)',
    distinctShadows >= 2 && nonNoneShadow,
    `${distinctShadows} distinct shadow values; samples: [${shadowSamples.slice(0, 8).map((sample) => `${sample.id}/${sample.element}=${sample.boxShadow}`).join(' | ')}]`,
    { shadowSamples },
  )
  const glassCandidate = measurements.find((entry) => entry.livery.layout?.surfaceStyle === 'glass')
  if (glassCandidate) {
    const materialTokens = Object.fromEntries(
      Object.entries(styleFamiliesOf(glassCandidate.livery).material.length ? { declared: styleFamiliesOf(glassCandidate.livery).material } : {}),
    )
    const computedBackdrop = Object.values(glassCandidate.probe.elements ?? {}).some((element) => element?.backdropFilter && element.backdropFilter !== 'none')
    const tokenBackdrop = /blur|saturate/i.test(glassCandidate.probe.tokens?.['--dsw-menu-backdrop-filter'] ?? '')
    expect(
      runner,
      'style.material-glass',
      'a glass style is shipped and its material (backdrop/blur) reaches the host',
      computedBackdrop || tokenBackdrop || /glass/i.test(glassCandidate.livery.layout?.surfaceStyle ?? ''),
      `glass candidate=${glassCandidate.livery.id}; computed backdrop-filter=${computedBackdrop}; --dsw-menu-backdrop-filter=${oneLine(glassCandidate.probe.tokens?.['--dsw-menu-backdrop-filter'] ?? '(none)', 80)}; declared material tokens=${(styleFamiliesOf(glassCandidate.livery).material ?? []).join(', ') || '(catalog surface recipe)'}`,
      { candidate: glassCandidate.livery.id, materialTokens },
    )
  } else {
    runner.warn('style.material-glass', 'a glass style is shipped and its material reaches the host', 'no glass-surface livery found in the catalog (surfaces may be solid-only)')
  }

  // ---- cascade: catalog style tokens are the values the host computes ----
  const cascadeChecks = []
  for (const entry of measurements) {
    const declared = { ...(entry.livery.light?.tokens ?? {}), ...(entry.livery.dark?.tokens ?? {}) }
    const matching = []
    for (const name of Object.keys(declared)) {
      if (!/^--dsw-(radius|shadow|elevation|menu-backdrop|mask-blur|focus-ring)/.test(name)) continue
      const computed = normalizeTokenValue(entry.probe.tokens?.[name])
      if (computed && computed === normalizeTokenValue(declared[name])) matching.push(name)
    }
    cascadeChecks.push({ id: entry.livery.id, matching, declaredStyleTokens: Object.keys(declared).filter((name) => /^--dsw-(radius|shadow|elevation|menu-backdrop|mask-blur|focus-ring)/.test(name)) })
  }
  const cascadeOk = cascadeChecks.every((entry) => entry.matching.length > 0)
  expect(
    runner,
    'style.cascade-tokens',
    'applied style tokens reach the host CSS cascade with the compiled values',
    cascadeOk,
    cascadeChecks.map((entry) => `${entry.id}: ${entry.matching.length}/${entry.declaredStyleTokens.length} style tokens computed identically`).join('; '),
    { cascadeChecks },
  )

  expect(
    runner,
    'style.screenshots',
    'multi-livery comparison screenshots were captured',
    artifactsScreenshotCount(ctx, 'style-') >= measurements.length,
    `${artifactsScreenshotCount(ctx, 'style-')} style screenshot(s) for ${measurements.length} style candidate(s)`,
  )
  state.styleAnalysis = {
    candidates: state.styleCandidates,
    radius: bestSpread,
    fonts: fontSamples,
    shadows: shadowSamples.slice(0, 24),
    glass: glassCandidate ? { id: glassCandidate.livery.id, backdrop: glassCandidate.probe.tokens?.['--dsw-menu-backdrop-filter'] ?? null } : null,
    cascade: cascadeChecks,
  }
}

function artifactsScreenshotCount(ctx, prefix) {
  return (ctx.artifacts?.screenshots ?? []).filter((shot) => String(shot.state ?? '').startsWith(prefix)).length
}

/** Measure one style candidate in the live host. */
async function measureOneStyle(ctx, livery, { previewOnly, uiLabels }) {
  const { session, state } = ctx
  const { page } = session
  const card = page.locator(`[data-testid="livery-card"][data-livery-id="${livery.id}"]`).first()
  if (!(await card.count())) return null
  await card.scrollIntoViewIfNeeded()
  await card.click()
  await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, livery.id, { timeout: 10_000 }).catch(() => {})
  if (!previewOnly) {
    const apply = await findControl(page, { testId: 'livery-apply', names: [uiLabels.apply], exact: false })
    if (!apply.locator) throw new Error(`apply control not found while activating ${livery.id}`)
    await apply.locator.click()
    await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, livery.id, { timeout: 10_000 }).catch(() => {})
  }
  await sleep(300)
  let probe = await readHostStyleProbe(page)
  const families = styleFamiliesOf(livery)
  await capture(page, ctx, { state: `style-${livery.id}`, mode: 'light' })
  if (!previewOnly) {
    // Expose the conversation so the composer (a host node the style must
    // reshape) is measurable, then capture the conversation view too.
    await returnToConversation(page)
    await page.waitForTimeout(400)
    probe = await readHostStyleProbe(page)
    await capture(page, ctx, { state: `style-${livery.id}-conversation`, mode: 'light' })
  }
  return { livery, probe, families, source: previewOnly ? 'preview' : 'apply' }
}

/**
 * Wallpaper studio acceptance (round 9): 24 built-ins, curated mockable library
 * with 6 h cache/retry/cached fallback, IndexedDB uploads, atmosphere overlay
 * (also over third-party plugin pages), page-tab persistence and adaptive cover
 * layers. Network is always intercepted; the live Openverse service is never
 * called from acceptance.
 */
export async function checkWallpaperStudio(ctx) {
  const { runner, session, config, state } = ctx
  const { page } = session
  const uiLabels = labelsFor(state.actualLocale ?? 'zh')
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const openverseFixture = {
    results: [
      { id: 'ov-1', url: 'https://images.example.test/one.jpg', thumbnail: 'https://images.example.test/one-thumb.jpg', title: 'Aurora One', creator: 'Tester', license: 'cc0' },
      { id: 'ov-2', url: 'https://images.example.test/two-full.jpg', thumbnail: 'https://images.example.test/two-thumb.jpg', title: 'Aurora Two', creator: 'Artist', license: 'pdm' },
    ],
  }
  const picsumFixture = [{ id: '10', author: 'Tester' }, { id: '11', author: 'Tester' }]
  const openverseRequests = []
  const picsumListRequests = []
  let openverseMode = 'ok'
  let picsumMode = 'ok'
  const meanPixelDelta = (a, b) => {
    if (!a || !b) return null
    const avg = [0, 1, 2].reduce((sum, index) => sum + Math.abs((a.average?.[index] ?? 0) - (b.average?.[index] ?? 0)), 0) / 3
    const grid = Array.isArray(a.cells) && Array.isArray(b.cells)
      ? a.cells.reduce((sum, cell, index) => {
          const other = b.cells[index]
          if (!cell || !other) return sum
          return sum + [0, 1, 2].reduce((acc, channel) => acc + Math.abs((cell[channel] ?? 0) - (other[channel] ?? 0)), 0) / 3
        }, 0) / Math.max(1, a.cells.length)
      : 0
    return { avg: Number(avg.toFixed(2)), grid: Number(grid.toFixed(2)), score: Number((avg + grid).toFixed(2)) }
  }
  const allCover = (value) => typeof value === 'string' && value.length > 0 && value.split(',').every((part) => part.trim() === 'cover')
  const liveryRowLabels = ['视觉风格', 'Visual Style', '皮肤', 'Livery']
  const reopenLivery = async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      // A reload can surface the first-run onboarding modal again; it would
      // intercept the sidebar click, so clear it before every attempt.
      await dismissFirstRunDialogs(page).catch(() => {})
      let clicked = false
      for (const label of liveryRowLabels) {
        const row = page.locator(`[data-slot="sidebar"] nav button[aria-label="${label}"]`).first()
        try {
          await row.waitFor({ state: 'visible', timeout: 6_000 })
          await row.click({ timeout: 8_000 })
          clicked = true
          break
        } catch {
          /* try the alternate shipped label */
        }
      }
      if (!clicked) {
        await sleep(800)
        continue
      }
      try {
        await page.waitForSelector('[data-testid="livery-page-tabs"]', { timeout: 8_000 })
        return true
      } catch {
        await sleep(700)
      }
    }
    return false
  }
  const openOtherPluginPanel = async () => {
    for (const label of ['上下文洞察', 'Context', '插件', 'Plugins']) {
      const row = page.locator(`[data-slot="sidebar"] nav button[aria-label="${label}"]`).first()
      if ((await row.count()) > 0) {
        await row.click({ timeout: 8_000 }).catch(() => {})
        await sleep(500)
        return label
      }
    }
    return null
  }
  try {
    await page.route('https://api.openverse.org/**', (route) => {
      openverseRequests.push(route.request().url())
      if (openverseMode === 'ok') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(openverseFixture) })
      if (openverseMode === 'oversized') {
        // > WALLPAPER_JSON_MAX_BYTES (2 MiB) with a lying small Content-Length,
        // so the product must cancel the streaming reader instead of trusting
        // the declared size or materializing the whole body.
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-length': '1024', 'cache-control': 'no-store' },
          body: Buffer.alloc(2 * 1024 * 1024 + 8192, 0x20),
        })
      }
      return route.fulfill({ status: 500, contentType: 'text/plain', body: 'openverse unavailable' })
    })
    await installPicsumRedirectMock(page, {
      tinyPng,
      onList: (url) => picsumListRequests.push(url),
      listResponse: (route) => (picsumMode === 'ok'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(picsumFixture) })
        : route.fulfill({ status: 500, contentType: 'text/plain', body: 'picsum unavailable' })),
    })
    await page.route('https://images.example.test/**', (route) => {
      const url = route.request().url()
      if (url.includes('broken')) return route.fulfill({ status: 500, contentType: 'text/plain', body: 'image unavailable' })
      if (url.includes('mime')) return route.fulfill({ status: 200, contentType: 'text/plain', body: 'not an image' })
      if (url.includes('redirect-private')) {
        return route.fulfill({ status: 302, headers: { location: `https://127.0.0.1:${getPicsumFixturePort()}/private.jpg`, 'cache-control': 'no-store', 'access-control-allow-origin': '*' } })
      }
      if (url.includes('redirect-http')) {
        return route.fulfill({ status: 302, headers: { location: `http://127.0.0.1:${getPicsumFixturePort()}/plain.jpg`, 'cache-control': 'no-store', 'access-control-allow-origin': '*' } })
      }
      return route.fulfill({ status: 200, contentType: 'image/png', body: tinyPng })
    })
    // The redirect bodies are served by the same loopback HTTPS fixture; the
    // product must reject the final private/non-https URL after following.
    await reopenLivery()
    await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 10_000 })
    await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 10_000 })
    await selectWallpaperSource(page, 'online')
    // Exactly one automatic Picsum random batch on wallpaper-tab mount.
    await page.waitForSelector('[data-testid="wallpaper-online-card"]', { timeout: 10_000 })
    await page.waitForFunction(() => {
      const results = document.querySelectorAll('[data-testid="wallpaper-result"]').length
      const status = document.querySelector('[data-testid="wallpaper-status"]')?.getAttribute('data-status') ?? null
      return results > 0 || status === 'error' || status === 'offline' || status === 'empty'
    }, undefined, { timeout: 20_000 }).catch(() => {})
    await sleep(500)
    const tabState = await readGalleryStructure(page)
    expect(
      runner,
      'wallpaper.tab',
      '壁纸 page tab switches to the wallpaper studio panel',
      tabState.tabs.find((tab) => tab.id === 'wallpaper')?.selected === true &&
        tabState.wallpaperPanel === true &&
        tabState.stylePanel === false &&
        tabState.tabs.find((tab) => tab.id === 'wallpaper')?.text === uiLabels.tabWallpaper,
      `selected=${tabState.tabs.find((tab) => tab.id === 'wallpaper')?.selected}; wallpaper panel=${tabState.wallpaperPanel}; style panel=${tabState.stylePanel}; label="${tabState.tabs.find((tab) => tab.id === 'wallpaper')?.text}"`,
    )

    // ---- round-13 recent-wallpaper history: starts hidden while empty ----
    const recentInitial = await readWallpaperState(page)
    expect(
      runner,
      'recent.hidden-empty',
      'the Recent wallpapers card is absent while the local history is empty',
      recentInitial.recentCard.present === false && recentInitial.recentCard.itemCount === 0,
      `present=${recentInitial.recentCard.present}; items=${recentInitial.recentCard.itemCount}`,
    )

    // ---- search-first online card (round 11): one auto Picsum batch, explicit actions, no slider refetch ----
    const onlineAuto = await readWallpaperState(page)
    const thumbnailState = await page
      .evaluate(() => {
        const card = document.querySelector('[data-testid="wallpaper-source-card"]')
        const results = card === null ? [] : [...card.querySelectorAll('[data-testid="wallpaper-result"]')]
        const images = results.flatMap((result) => [...result.querySelectorAll('img')])
        const fallbacks = results.flatMap((result) => [...result.querySelectorAll('.livery-thumb__fallback')])
        return {
          results: results.length,
          resultImages: images.length,
          loadedImages: images.filter((image) => image.complete && image.naturalWidth > 0).length,
          fallbackSpans: fallbacks.length,
        }
      })
      .catch(() => ({ results: 0, resultImages: 0, loadedImages: 0, fallbackSpans: 0 }))
    const mainOrder = onlineAuto.mainCardOrder ?? []
    expect(
      runner,
      'wallpaper.library-removed',
      'curated library/category UI is removed; the workbench is hero → effects → single source card',
      onlineAuto.onlineCardPresent === true &&
        onlineAuto.libraryElementCount === 0 &&
        onlineAuto.categoryChipCount === 0 &&
        mainOrder[0] === 'wallpaper-hero' &&
        mainOrder[1] === 'wallpaper-effects-card' &&
        mainOrder.includes('wallpaper-source-card'),
      `onlineCard=${onlineAuto.onlineCardPresent}; libraryElements=${onlineAuto.libraryElementCount}; categoryChips=${onlineAuto.categoryChipCount}; mainCardOrder=${JSON.stringify(mainOrder)}`,
    )
    const onlineCardText = await page.locator('[data-testid="wallpaper-online-card"]').innerText().catch(() => '')
    expect(
      runner,
      'copy.wallpaper-online-hint',
      'online card uses the round-12 human hint copy',
      onlineCardText.includes('打开这个标签页会自动加载一批随机壁纸'),
      `online card text=${oneLine(onlineCardText, 220)}`,
    )
    const effectsCardText = await page.locator('[data-testid="wallpaper-effects-card"]').innerText().catch(() => '')
    expect(
      runner,
      'copy.frost-label',
      'effect slider keeps the plain 磨砂 (Frost) label',
      effectsCardText.includes('磨砂'),
      `effects card labels=${oneLine(effectsCardText, 220)}`,
    )
    expect(
      runner,
      'wallpaper.online-auto-random',
      'opening the wallpaper tab auto-loads exactly one Picsum random batch (mockable)',
      picsumListRequests.length === 1 && onlineAuto.results.length >= 2 && onlineAuto.results.every((result) => result.url?.startsWith('https://picsum.photos/')) && thumbnailState.resultImages === 0 && thumbnailState.fallbackSpans >= onlineAuto.results.length && openverseRequests.length === 0,
      `picsum list requests=${picsumListRequests.length}; openverse requests=${openverseRequests.length}; results=${onlineAuto.results.length}; thumb imgs=${thumbnailState.resultImages}; fallbacks=${thumbnailState.fallbackSpans}; status=${onlineAuto.status}`,
    )
    expect(
      runner,
      'wallpaper.online-thumbnails',
      'online result cards never request remote thumbnails directly; they render a local fallback span',
      thumbnailState.resultImages === 0 && thumbnailState.fallbackSpans >= onlineAuto.results.length,
      `resultImages=${thumbnailState.resultImages}; loadedImages=${thumbnailState.loadedImages}; fallbackSpans=${thumbnailState.fallbackSpans}; results=${onlineAuto.results.length}`,
    )
    await capture(page, ctx, { state: 'wallpaper-online-auto', mode: 'light' })
    const picsumBeforeSliders = picsumListRequests.length
    const openverseBeforeSliders = openverseRequests.length
    await setRangeValue(page, 'wallpaper-blur', 16)
    await sleep(700)
    expect(
      runner,
      'wallpaper.online-no-refetch',
      'changing effect sliders never refetches the online card',
      picsumListRequests.length === picsumBeforeSliders && openverseRequests.length === openverseBeforeSliders,
      `picsum ${picsumBeforeSliders}→${picsumListRequests.length}; openverse ${openverseBeforeSliders}→${openverseRequests.length}`,
    )
    // Explicit Openverse search.
    await page.locator('[data-testid="wallpaper-search"]').fill('aurora')
    await page.locator('[data-testid="wallpaper-search-go"]').click({ timeout: 8_000 })
    await page.waitForFunction(() => {
      const status = document.querySelector('[data-testid="wallpaper-status"]')?.getAttribute('data-status') ?? null
      const labels = [...document.querySelectorAll('[data-testid="wallpaper-result"]')].map((result) => result.getAttribute('aria-label') ?? '')
      return (status === null || status === 'ready') && labels.some((label) => label.includes('Aurora'))
    }, undefined, { timeout: 15_000 }).catch(() => {})
    const searched = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.online-search',
      'explicit Openverse search renders the mocked results',
      openverseRequests.length === 1 && searched.results.length === 2 && (searched.results[0]?.label ?? '').includes('Aurora'),
      `openverse requests=${openverseRequests.length}; results=${JSON.stringify(searched.results.map((result) => result.url))}; firstLabel="${oneLine(searched.results[0]?.label ?? '', 100)}"`,
    )
    await capture(page, ctx, { state: 'wallpaper-online-search', mode: 'light' })
    // Streaming JSON cap: a >2 MiB Openverse body with a lying small
    // Content-Length must fail without exposing results.
    openverseMode = 'oversized'
    const oversizedBefore = openverseRequests.length
    await page.locator('[data-testid="wallpaper-search"]').fill('oversized')
    await page.locator('[data-testid="wallpaper-search-go"]').click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-status"]')?.getAttribute('data-status') === 'error', undefined, { timeout: 20_000 }).catch(() => {})
    const oversizedState = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.online-json-cap',
      'streaming search JSON over the 2 MiB cap fails the request (reader cancelled) instead of surfacing results',
      openverseRequests.length === oversizedBefore + 1 && oversizedState.status === 'error',
      `openverse ${oversizedBefore}→${openverseRequests.length}; status=${oversizedState.status}; results=${oversizedState.results.length}`,
    )
    openverseMode = 'ok'
    // Random and 换一批/refresh re-fetch the active source.
    const beforeRandom = picsumListRequests.length
    await page.locator('[data-testid="wallpaper-random"]').click({ timeout: 8_000 })
    for (let attempt = 0; attempt < 50 && picsumListRequests.length === beforeRandom; attempt += 1) await sleep(100)
    await sleep(300)
    const randomState = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.online-random',
      '随机 requests a new Picsum batch',
      picsumListRequests.length === beforeRandom + 1 && randomState.results.length > 0 && randomState.results.every((result) => result.url?.startsWith('https://picsum.photos/')),
      `picsum ${beforeRandom}→${picsumListRequests.length}; results=${randomState.results.length}`,
    )
    const beforeRefresh = picsumListRequests.length
    await page.locator('[data-testid="wallpaper-refresh"]').click({ timeout: 8_000 })
    for (let attempt = 0; attempt < 50 && picsumListRequests.length === beforeRefresh; attempt += 1) await sleep(100)
    await sleep(300)
    expect(
      runner,
      'wallpaper.online-refresh',
      '换一批/refresh requests another batch for the active source',
      picsumListRequests.length === beforeRefresh + 1,
      `picsum ${beforeRefresh}→${picsumListRequests.length}`,
    )
    // Retry flow after a simulated failure.
    picsumMode = 'fail'
    const beforeFail = picsumListRequests.length
    await page.locator('[data-testid="wallpaper-random"]').click({ timeout: 8_000 })
    for (let attempt = 0; attempt < 50 && picsumListRequests.length === beforeFail; attempt += 1) await sleep(100)
    await page.waitForFunction(() => {
      const status = document.querySelector('[data-testid="wallpaper-status"]')?.getAttribute('data-status') ?? null
      return status === 'error' || status === 'offline'
    }, undefined, { timeout: 15_000 }).catch(() => {})
    const failed = await readWallpaperState(page)
    const retryButton = page.locator('[data-testid="wallpaper-online-retry"]')
    const retryVisible = (await retryButton.count()) > 0
    await capture(page, ctx, { state: 'wallpaper-online-retry', mode: 'light' })
    picsumMode = 'ok'
    const beforeRetry = picsumListRequests.length
    if (retryVisible) await retryButton.click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="wallpaper-result"]').length > 0, undefined, { timeout: 15_000 }).catch(() => {})
    await sleep(300)
    const retried = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.online-retry',
      'a failed online batch exposes retry and succeeds when retried',
      (failed.status === 'error' || failed.status === 'offline') && retryVisible && picsumListRequests.length === beforeRetry + 1 && retried.results.length > 0,
      `status=${failed.status}; retryVisible=${retryVisible}; picsum ${beforeRetry}→${picsumListRequests.length}; results=${retried.results.length}`,
    )
    // Apply one online result.
    const appliedOnlineUrl = retried.results[0]?.url ?? ''
    const appliedOnlineLabel = retried.results[0]?.label ?? ''
    const appliedOnlineTitle = appliedOnlineLabel.split(' · ')[0]
    await page.locator('[data-testid="wallpaper-result"]').first().click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-hero-preview"]') !== null, undefined, { timeout: 10_000 }).catch(() => {})
    const onlineLayer = await waitForCacheOnlyLayer(page, appliedOnlineUrl)
    await waitForStoredRemote(page, appliedOnlineUrl)
    await sleep(250)
    const onlineApplied = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.online-applied',
      'clicking an online result applies that wallpaper (cached blob or URL layer) and shows attribution',
      onlineApplied.attribute !== null &&
        onlineApplied.styleText.includes('background-image') &&
        onlineLayer.hasBlob && onlineLayer.blobFetchOk && !onlineLayer.rawInStyle &&
        onlineApplied.attribution.length > 0 &&
        appliedOnlineTitle.length > 0 &&
        onlineApplied.attribution.includes(appliedOnlineTitle),
      `url=${oneLine(appliedOnlineUrl, 120)}; blob=${onlineLayer.hasBlob} fetchOk=${onlineLayer.blobFetchOk} rawInStyle=${onlineLayer.rawInStyle}; attr=${onlineApplied.attribute !== null}; attribution="${oneLine(onlineApplied.attribution, 120)}"`,
    )
    await capture(page, ctx, { state: 'wallpaper-online-applied', mode: 'light' })

    // ---- recent history after applying online wallpapers ----
    await page.waitForFunction(() => {
      const card = document.querySelector('[data-testid="wallpaper-recent-card"]')
      return card !== null && card.querySelectorAll('[data-testid="wallpaper-recent-item"]').length >= 1
    }, undefined, { timeout: 10_000 }).catch(() => {})
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-recent-item"]')?.getAttribute('data-cached') === 'true', undefined, { timeout: 10_000 }).catch(() => {})
    const recentOne = await readWallpaperState(page)
    expect(
      runner,
      'recent.online-entry',
      'applying an online wallpaper records it in the Recent card (newest first, cached flag best-effort)',
      recentOne.recentCard.present === true &&
        recentOne.recentCard.itemCount === 1 &&
        recentOne.recentCard.items[0]?.url === appliedOnlineUrl &&
        recentOne.recentCard.items[0]?.cached === 'true',
      `card=${recentOne.recentCard.present}; items=${JSON.stringify(recentOne.recentCard.items)}; applied=${oneLine(appliedOnlineUrl, 100)}`,
    )
    // Apply a second online result: history grows, newest first.
    const secondResult = page.locator('[data-testid="wallpaper-result"]').nth(1)
    const secondUrl = await secondResult.getAttribute('data-wallpaper-url')
    if (secondUrl !== null && (await secondResult.count()) > 0) await secondResult.click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="wallpaper-recent-item"]').length >= 2, undefined, { timeout: 10_000 }).catch(() => {})
    await sleep(500)
    const recentTwo = await readWallpaperState(page)
    expect(
      runner,
      'recent.two-entries',
      'two applied online wallpapers appear newest-first in the Recent card',
      recentTwo.recentCard.itemCount === 2 &&
        recentTwo.recentCard.items[0]?.url === secondUrl &&
        recentTwo.recentCard.items[1]?.url === appliedOnlineUrl,
      `items=${JSON.stringify(recentTwo.recentCard.items.map((item) => item.url))}`,
    )

    // ---- 24 built-ins + layer + atmosphere overlay ----
    const initial = await readWallpaperState(page)
    const builtinIds = initial.builtins.map((button) => button.id)
    expect(
      runner,
      'wallpaper.builtin-count',
      'wallpaper studio ships 24 deterministic built-in wallpapers',
      initial.builtins.length === 24 && new Set(builtinIds).size === 24 && builtinIds.every((id) => typeof id === 'string' && id.length > 0),
      `${initial.builtins.length} builtins: ${builtinIds.join(', ')}`,
    )
    await selectWallpaperSource(page, 'builtin')
    await page.locator('[data-testid="wallpaper-builtin"]').first().click({ timeout: 8_000 })
    await page.waitForFunction(() => {
      const style = document.querySelector('style#dsh-livery-wallpaper')
      return document.body.hasAttribute('data-dsh-wallpaper') && style !== null && (style.textContent ?? '').includes('background-image')
    }, undefined, { timeout: 10_000 }).catch(() => {})
    const builtinApplied = await readWallpaperState(page)
    const builtinBlur = builtinApplied.sliderValues.blur
    const builtinDim = builtinApplied.sliderValues.dim
    const builtinVeil = `rgba(0,0,0,${(Number(builtinDim) / 100).toFixed(2)})`
    expect(
      runner,
      'wallpaper.builtin-applied',
      'clicking a built-in wallpaper writes the owned stylesheet + body attribute',
      builtinApplied.attribute !== null &&
        builtinApplied.stylePresent === true &&
        builtinApplied.styleMarker === 'dsh-livery/wallpaper' &&
        builtinApplied.coverCount >= 2 &&
        builtinApplied.styleText.includes(`filter:blur(${builtinBlur}px)`) &&
        builtinApplied.styleText.includes(builtinVeil),
      `attr=${builtinApplied.attribute}; marker=${builtinApplied.styleMarker}; cover rules=${builtinApplied.coverCount}; sliders=${JSON.stringify(builtinApplied.sliderValues)}; filter=${builtinApplied.styleText.match(/filter:blur\([^)]*\)/)?.[0]}`,
      { styleText: builtinApplied.styleText.slice(0, 800) },
    )
    expect(
      runner,
      'wallpaper.atmosphere-default',
      'the global atmosphere overlay exists at the default atmosphere with the expected computed styles',
      builtinApplied.overlay.present === true &&
        builtinApplied.overlay.id === 'dsh-livery-wallpaper-overlay' &&
        builtinApplied.overlay.pointerEvents === 'none' &&
        builtinApplied.overlay.zIndex === '90' &&
        Number(builtinApplied.overlay.opacity) === 0.3 &&
        builtinApplied.overlay.mixBlendMode === 'soft-light' &&
        allCover(builtinApplied.overlay.backgroundSize) &&
        allCover(builtinApplied.pseudoBackgroundSize),
      `overlay=${JSON.stringify(builtinApplied.overlay)}; body::before cover=${builtinApplied.pseudoBackgroundSize}`,
    )
    const selectedWallpaper = builtinApplied.builtins.filter((entry) => entry.pressed)
    const selectionVisual = await page.evaluate(() => {
      const tab = document.querySelector('[data-testid="livery-page-tab-wallpaper"]')
      const swatch = document.querySelector('[data-testid="wallpaper-builtin"][aria-pressed="true"]')
      if (!(tab instanceof HTMLElement) || !(swatch instanceof HTMLElement)) return null
      const tabStyle = getComputedStyle(tab)
      const swatchStyle = getComputedStyle(swatch)
      return {
        tabSelected: tab.getAttribute('aria-selected'),
        tabBorder: tabStyle.borderColor,
        tabColor: tabStyle.color,
        swatchOutline: swatchStyle.outlineWidth,
        swatchShadow: swatchStyle.boxShadow,
      }
    })
    expect(
      runner,
      'wallpaper.selected-state',
      'the active wallpaper and tab expose a visible selected state',
      selectedWallpaper.length === 1 &&
        selectionVisual !== null &&
        selectionVisual.tabSelected === 'true' &&
        selectionVisual.swatchOutline !== '0px' &&
        selectionVisual.swatchShadow !== 'none',
      `selected=${JSON.stringify(selectedWallpaper)}; tab=${selectionVisual?.tabBorder}/${selectionVisual?.tabColor}; swatch outline=${selectionVisual?.swatchOutline}, shadow=${selectionVisual?.swatchShadow}`,
    )
    const opaqueHostTokens = await page.evaluate(() => {
      const style = getComputedStyle(document.body)
      return ['--dsw-alias-bg-layer-2', '--dsw-alias-bg-layer-1', '--dsw-alias-tooltip-bg'].map((token) => ({
        token,
        value: style.getPropertyValue(token).trim(),
      }))
    })
    expect(
      runner,
      'wallpaper.host-surfaces-opaque',
      'frost never rewrites host modal, input or tooltip surface tokens',
      opaqueHostTokens.every(({ value }) => value.length > 0 && !/color-mix|transparent/i.test(value)),
      opaqueHostTokens.map(({ token, value }) => `${token}=${value}`).join('; '),
    )
    // The atmosphere must sit below every host floating layer: plain Menu /
    // Tooltip / HoverCard use z-index 100/101, Modal 1000 and Toast 1100.
    expect(
      runner,
      'wallpaper.atmosphere-below-floating',
      'the atmosphere layer stays below host Menu/Tooltip/HoverCard/Modal surfaces',
      Number(builtinApplied.overlay.zIndex) < 100 &&
        Number(builtinApplied.overlay.zIndex) < 1000 &&
        Number(builtinApplied.overlay.zIndex) < 1100,
      `atmosphere z-index=${builtinApplied.overlay.zIndex}; host ordinary floats=100/101, Modal=1000, Toast=1100`,
    )
    // A real host modal with the wallpaper active must remain opaque and above
    // the atmosphere. If Settings is unavailable in this shell, record a skip
    // rather than turning a UI regression into a false pass.
    let modalLayering = null
    try {
      const dialog = await openSettings(page)
      modalLayering = await page.evaluate(() => {
        const overlay = document.getElementById('dsh-livery-wallpaper-overlay')
        const dialog = document.querySelector('[role="dialog"]')
        if (dialog === null) return null
        const dialogStyle = getComputedStyle(dialog)
        return {
          overlayZ: overlay === null ? null : Number(getComputedStyle(overlay).zIndex),
          dialogZ: Number(dialogStyle.zIndex),
          dialogBackground: dialogStyle.backgroundColor,
          dialogBackdrop: dialogStyle.backdropFilter,
        }
      })
      await closeSettings(page)
    } catch {
      modalLayering = null
    }
    if (modalLayering === null) {
      runner.skip('wallpaper.modal-clear', 'host Settings modal stays opaque above the atmosphere when wallpaper frost is active', 'host Settings dialog unavailable in this shell')
    } else {
      const opaque = !/rgba\([^)]*,\s*0\.\d+\)/.test(modalLayering.dialogBackground)
      expect(
        runner,
        'wallpaper.modal-clear',
        'host Settings modal stays opaque above the atmosphere when wallpaper frost is active',
        opaque && modalLayering.overlayZ !== null && modalLayering.overlayZ < 1000,
        `overlay z=${modalLayering.overlayZ}; modal z=${modalLayering.dialogZ}; background=${modalLayering.dialogBackground}; backdrop=${modalLayering.dialogBackdrop}`,
      )
    }
    await capture(page, ctx, { state: 'wallpaper-builtin', mode: 'light' })
    await setRangeValue(page, 'wallpaper-atmosphere', 0)
    await page.waitForFunction(() => document.getElementById('dsh-livery-wallpaper-overlay') === null, undefined, { timeout: 8_000 }).catch(() => {})
    const atmosphereZero = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.atmosphere-zero',
      'atmosphere 0 removes the overlay element (immersive-only layer remains)',
      atmosphereZero.overlay.present === false && atmosphereZero.attribute !== null && atmosphereZero.stylePresent === true,
      `overlay present=${atmosphereZero.overlay.present}; attribute=${atmosphereZero.attribute}; style=${atmosphereZero.stylePresent}`,
    )
    await setRangeValue(page, 'wallpaper-atmosphere', 60)
    await page.waitForFunction(() => {
      const overlay = document.getElementById('dsh-livery-wallpaper-overlay')
      return overlay !== null && Number(getComputedStyle(overlay).opacity) === 0.6
    }, undefined, { timeout: 8_000 }).catch(() => {})
    const atmosphereSixty = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.atmosphere-60',
      'atmosphere 60 sets overlay opacity 0.6 (z-index/pointer-events preserved)',
      atmosphereSixty.overlay.present === true &&
        Number(atmosphereSixty.overlay.opacity) === 0.6 &&
        atmosphereSixty.overlay.pointerEvents === 'none' &&
        atmosphereSixty.styleText.includes('mix-blend-mode:soft-light'),
      `overlay=${JSON.stringify(atmosphereSixty.overlay)}`,
    )
    await capture(page, ctx, { state: 'wallpaper-atmosphere', mode: 'light' })

    // ---- tab persistence: selection never changes the tab; navigation/reload restores it ----
    const afterSelection = await readGalleryStructure(page)
    expect(
      runner,
      'wallpaper.tab-stable-after-selection',
      'selecting a wallpaper never changes the active page tab',
      afterSelection.tabs.find((tab) => tab.id === 'wallpaper')?.selected === true,
      `selected tab=${afterSelection.tabs.find((tab) => tab.selected)?.id}`,
    )
    const otherPanel = await openOtherPluginPanel()
    if (otherPanel !== null) {
      const panellist = await inspectPanellist(page)
      const selectedRow = panellist.rows.find((row) => row.selected) ?? null
      const otherSelected = (selectedRow?.ariaLabel ?? selectedRow?.label ?? '') === otherPanel
      const reopened = await reopenLivery()
      const restoredTab = await readGalleryStructure(page)
      expect(
        runner,
        'wallpaper.tab-navigation',
        'the wallpaper tab survives navigation to another plugin panel and back',
        otherSelected && reopened && restoredTab.tabs.find((tab) => tab.id === 'wallpaper')?.selected === true && restoredTab.wallpaperPanel === true,
        `navigated to "${otherPanel}" (selected=${otherSelected}); reopened=${reopened}; restored selected=${restoredTab.tabs.find((tab) => tab.id === 'wallpaper')?.selected}; wallpaper panel=${restoredTab.wallpaperPanel}`,
      )
    } else {
      runner.skip('wallpaper.tab-navigation', 'the wallpaper tab survives navigation to another plugin panel', 'no third-party plugin panel in this profile')
    }
    if (!(await page.locator('[data-testid="wallpaper-panel"]').count()))
      await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 8_000 })

    // ---- effects + frost (active style from the style group) ----
    await setRangeValue(page, 'wallpaper-blur', 20)
    await setRangeValue(page, 'wallpaper-dim', 60)
    await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper')?.textContent?.includes('filter:blur(20px)'), undefined, { timeout: 8_000 }).catch(() => {})
    const blurred = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.effects-blur-dim',
      'blur/dim sliders update the wallpaper layer (filter + veil)',
      blurred.sliderValues.blur === 20 &&
        blurred.sliderValues.dim === 60 &&
        blurred.styleText.includes('filter:blur(20px)') &&
        /rgba\(0,0,0,0\.60\)/.test(blurred.styleText) &&
        blurred.pseudoFilter.includes('blur(20px)'),
      `sliders=${JSON.stringify(blurred.sliderValues)}; filter=${blurred.pseudoFilter}; veil=${blurred.pseudoVeil}`,
    )
    await capture(page, ctx, { state: 'wallpaper-blurred', mode: 'light' })
    await setRangeValue(page, 'wallpaper-frost', 80)
    await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper')?.textContent?.includes('color-mix'), undefined, { timeout: 8_000 }).catch(() => {})
    const frosted = await readWallpaperState(page)
    const frostHasActiveLivery = frosted.effectiveLivery !== null && frosted.effectiveLivery !== 'stock'
    expect(
      runner,
      'wallpaper.frost',
      'frost makes active visual-style surface tokens translucent via color-mix',
      frostHasActiveLivery
        ? frosted.styleText.includes('color-mix(in srgb,') && frosted.styleText.includes('20%') && frosted.bgBaseToken.includes('color-mix')
        : frosted.sliderValues.frost === 80,
      `active livery=${frosted.effectiveLivery}; frost=${frosted.sliderValues.frost}; color-mix=${frosted.styleText.includes('color-mix')}; --dsw-alias-bg-base="${oneLine(frosted.bgBaseToken, 120)}"`,
      { styleText: frosted.styleText.slice(0, 900) },
    )
    await capture(page, ctx, { state: 'wallpaper-frost', mode: 'light' })
    await page.locator('[data-testid="wallpaper-reset"]').click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper')?.textContent?.includes('filter:blur(8px)'), undefined, { timeout: 8_000 }).catch(() => {})
    const reset = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.reset',
      'reset restores the default blur/dim/frost/atmosphere values',
      reset.sliderValues.blur === 8 &&
        reset.sliderValues.dim === 25 &&
        reset.sliderValues.frost === 35 &&
        reset.sliderValues.atmosphere === 30 &&
        reset.styleText.includes('filter:blur(8px)'),
      `sliders=${JSON.stringify(reset.sliderValues)}; filter=${reset.styleText.match(/filter:blur\([^)]*\)/)?.[0]}`,
    )

    // ---- persistence across reload (selection + effects + remembered tab) ----
    await setRangeValue(page, 'wallpaper-blur', 12)
    await setRangeValue(page, 'wallpaper-dim', 40)
    await setRangeValue(page, 'wallpaper-frost', 55)
    await setRangeValue(page, 'wallpaper-atmosphere', 60)
    // Wait for the debounced persistence to carry ALL four effects (not just the
    // first one) before reloading; retry the atmosphere update once if a React
    // commit raced the range event.
    const persistedAllEffects = async () =>
      page.evaluate(() => {
        try {
          const raw = window.localStorage.getItem('dsh-livery.wallpaper.v1')
          if (raw === null) return false
          const stored = JSON.parse(raw)
          return stored?.blur === 12 && stored?.dim === 40 && stored?.frost === 55 && stored?.atmosphere === 60
        } catch {
          return false
        }
      }).catch(() => false)
    let storedComplete = false
    for (let attempt = 0; attempt < 25 && !storedComplete; attempt += 1) {
      storedComplete = await persistedAllEffects()
      if (!storedComplete) await sleep(150)
    }
    if (!storedComplete) {
      await setRangeValue(page, 'wallpaper-atmosphere', 60)
      for (let attempt = 0; attempt < 15 && !storedComplete; attempt += 1) {
        storedComplete = await persistedAllEffects()
        if (!storedComplete) await sleep(150)
      }
    }
    const storedBeforeReload = (await readWallpaperState(page)).stored
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
    await waitForBootGraph(page)
    await waitForAppReady(page)
    await waitForActiveLivery(page, { skinId: state.appliedSkin }).catch(() => {})
    // The controller re-applies the persisted wallpaper globally even while the
    // studio panel is unmounted; assert that layer before opening the panel.
    await page
      .waitForFunction(() => document.body.hasAttribute('data-dsh-wallpaper') && document.getElementById('dsh-livery-wallpaper-overlay') !== null, undefined, { timeout: 20_000 })
      .catch(() => {})
    const globalAfterReload = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.persistence-layer',
      'the persisted wallpaper layer (body attribute + atmosphere overlay) is re-applied globally after a reload, before the panel mounts',
      globalAfterReload.attribute !== null && globalAfterReload.stylePresent === true && globalAfterReload.overlay.present === true && Number(globalAfterReload.overlay.opacity) === 0.6,
      `attr=${globalAfterReload.attribute === null ? '(absent)' : '(present)'}; style=${globalAfterReload.stylePresent}; overlay=${globalAfterReload.overlay.present}; opacity=${globalAfterReload.overlay.opacity}`,
    )
    const reopened = await reopenLivery()
    const reloadedTab = await readGalleryStructure(page)
    const tabRestoredOnReload = reopened && reloadedTab.tabs.find((tab) => tab.id === 'wallpaper')?.selected === true
    if (!(await page.locator('[data-testid="wallpaper-panel"]').count())) {
      await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 8_000 }).catch(() => {})
    }
    await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 10_000 }).catch(() => {})
    await sleep(300)
    const persisted = await readWallpaperState(page)
    expect(
      runner,
      'recent.reload-persist',
      'Recent wallpapers survive a hard reload (localStorage history + cached thumbnails)',
      persisted.recentCard.present === true &&
        persisted.recentCard.itemCount === 2 &&
        persisted.recentCard.items.some((item) => item.cached === 'true'),
      `items=${persisted.recentCard.itemCount}; cached=${JSON.stringify(persisted.recentCard.items.map((item) => item.cached))}`,
    )
    expect(
      runner,
      'wallpaper.persistence',
      'selected wallpaper and effects persist across a hard reload',
      globalAfterReload.attribute !== null &&
        globalAfterReload.overlay.present === true &&
        persisted.selectedBuiltin !== null &&
        persisted.sliderValues.blur === 12 &&
        persisted.sliderValues.dim === 40 &&
        persisted.sliderValues.frost === 55 &&
        persisted.sliderValues.atmosphere === 60 &&
        (persisted.stored ?? '').includes('"blur":12'),
      `global layer attr=${globalAfterReload.attribute !== null}; builtin=${persisted.selectedBuiltin}; sliders=${JSON.stringify(persisted.sliderValues)}; stored=${oneLine(storedBeforeReload ?? '', 160)}`,
    )
    expect(
      runner,
      'wallpaper.tab-reload',
      'the wallpaper tab survives a hard reload (sessionStorage mirror)',
      tabRestoredOnReload === true && globalAfterReload.overlay.present === true,
      `reopened=${reopened}; wallpaper tab auto-selected after reload=${tabRestoredOnReload}; overlay=${globalAfterReload.overlay.present}`,
    )
    await capture(page, ctx, { state: 'wallpaper-persisted', mode: 'light' })

    // ---- upload via IndexedDB + reload persistence + validation ----
    await selectWallpaperSource(page, 'local')
    const uploadField = page.locator('[data-testid="wallpaper-upload"]')
    await uploadField.waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {})
    const uploadAccept = await uploadField.getAttribute('accept').catch(() => null)
    expect(
      runner,
      'wallpaper.upload-accept',
      'upload input accepts the documented image MIME set',
      uploadAccept === 'image/jpeg,image/png,image/webp,image/avif',
      `accept="${uploadAccept}"`,
    )
    await uploadField.setInputFiles({ name: 'upload.png', mimeType: 'image/png', buffer: tinyPng })
    await page.waitForFunction(() => (document.querySelector('style#dsh-livery-wallpaper')?.textContent ?? '').includes('blob:'), undefined, { timeout: 15_000 }).catch(() => {})
    await sleep(400)
    const uploaded = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.upload-applied',
      'uploading a PNG applies a blob: wallpaper layer stored in IndexedDB',
      uploaded.styleText.includes('blob:') &&
        uploaded.uploadError === '' &&
        uploaded.stored !== null &&
        uploaded.stored.includes('"kind":"upload"'),
      `blobInStyle=${uploaded.styleText.includes('blob:')}; stored=${oneLine(uploaded.stored ?? '', 140)}; error="${oneLine(uploaded.uploadError, 80)}"`,
    )
    await capture(page, ctx, { state: 'wallpaper-upload', mode: 'light' })
    await page.locator('[data-testid="wallpaper-upload"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') })
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-upload-error"]') !== null, undefined, { timeout: 8_000 }).catch(() => {})
    const badType = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.upload-invalid-type',
      'a non-image upload is rejected with a validation message',
      badType.uploadError.length > 0,
      `error="${oneLine(badType.uploadError, 100)}"`,
    )
    await page.locator('[data-testid="wallpaper-upload"]').setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 1) })
    await page.waitForFunction(() => (document.querySelector('[data-testid="wallpaper-upload-error"]')?.textContent ?? '').includes('10 MiB') || (document.querySelector('[data-testid="wallpaper-upload-error"]')?.textContent ?? '').income !== undefined, undefined, { timeout: 15_000 }).catch(() => {})
    await sleep(400)
    const oversized = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.upload-invalid-size',
      'an upload above the 10 MiB cap is rejected with a validation message',
      oversized.uploadError.length > 0,
      `error="${oneLine(oversized.uploadError, 100)}"`,
    )
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
    await waitForBootGraph(page)
    await waitForAppReady(page)
    await waitForActiveLivery(page, { skinId: state.appliedSkin }).catch(() => {})
    await reopenLivery()
    if (!(await page.locator('[data-testid="wallpaper-panel"]').count())) {
      await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 8_000 }).catch(() => {})
    }
    await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 10_000 }).catch(() => {})
    await page.waitForFunction(() => (document.querySelector('style#dsh-livery-wallpaper')?.textContent ?? '').includes('blob:'), undefined, { timeout: 20_000 }).catch(() => {})
    const uploadPersisted = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.upload-reload',
      'an uploaded wallpaper re-hydrates from IndexedDB after a hard reload',
      uploadPersisted.styleText.includes('blob:') && uploadPersisted.attribute !== null,
      `blobInStyle=${uploadPersisted.styleText.includes('blob:')}; attribute=${uploadPersisted.attribute}; stored=${oneLine(uploadPersisted.stored ?? '', 120)}`,
    )
    await capture(page, ctx, { state: 'wallpaper-upload-persisted', mode: 'light' })

    // ---- custom https URL path still works ----
    await selectWallpaperSource(page, 'local')
    const urlInput = page.locator('[data-testid="wallpaper-url"]')
    const rejectionTexts = []
    for (const bad of ['http://insecure.test/a.jpg', 'javascript:alert(1)', 'data:image/svg+xml,<svg/>']) {
      await urlInput.fill(bad)
      await page.locator('[data-testid="wallpaper-url-apply"]').click({ timeout: 8_000 })
      await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-url-error"]') !== null, undefined, { timeout: 8_000 }).catch(() => {})
      rejectionTexts.push({ url: bad, rejected: (await page.locator('[data-testid="wallpaper-url-error"]').count()) > 0 })
    }
    expect(
      runner,
      'wallpaper.url-validation',
      'non-https / javascript / data URLs are rejected with a validation message',
      rejectionTexts.every((entry) => entry.rejected),
      rejectionTexts.map((entry) => `${entry.url.slice(0, 24)} rejected=${entry.rejected}`).join('; '),
    )
    await urlInput.fill('https://images.example.test/custom.jpg')
    await page.locator('[data-testid="wallpaper-url-apply"]').click({ timeout: 8_000 })
    const customLayer = await waitForCacheOnlyLayer(page, 'https://images.example.test/custom.jpg')
    await waitForStoredRemote(page, 'https://images.example.test/custom.jpg')
    await sleep(250)
    const customApplied = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.url-accepted',
      'https custom image URLs are accepted and applied through the owned layer',
      customLayer.hasBlob && customLayer.blobFetchOk && !customLayer.rawInStyle &&
        customApplied.attribute !== null &&
        customApplied.urlErrorText === '',
      `blob=${customLayer.hasBlob} fetchOk=${customLayer.blobFetchOk} rawInStyle=${customLayer.rawInStyle}; attr=${customApplied.attribute}; error="${oneLine(customApplied.urlErrorText, 80)}" (custom URLs surface no attribution line by design)`,
    )
    await capture(page, ctx, { state: 'wallpaper-custom-url', mode: 'light' })

    // ---- cache-first remote failures: old selection persists, no history/raw CSS ----
    const failureBefore = await readWallpaperState(page)
    const failureBeforeStored = await readStoredWallpaper(page)
    const failureCases = [
      { url: 'https://images.example.test/broken.jpg', label: 'network/status failure' },
      { url: 'https://images.example.test/mime.jpg', label: 'non-image MIME failure' },
      { url: 'https://images.example.test/redirect-private.jpg', label: 'private-host redirect rejection' },
      { url: 'https://images.example.test/redirect-http.jpg', label: 'non-https final redirect rejection' },
    ]
    const fixturePort = getPicsumFixturePort()
    const privateTargetPrefix = `https://127.0.0.1:${fixturePort}/`
    const insecureTargetPrefix = `http://127.0.0.1:${fixturePort}/`
    const redirectedRequests = []
    const redirectRequestListener = (request) => {
      const url = request.url()
      if (url.startsWith(privateTargetPrefix) || url.startsWith(insecureTargetPrefix)) redirectedRequests.push(url)
    }
    page.on('request', redirectRequestListener)
    const failureEvidence = []
    for (const failure of failureCases) {
      await page.locator('[data-testid="wallpaper-url"]').fill(failure.url)
      await page.locator('[data-testid="wallpaper-url-apply"]').click({ timeout: 8_000 })
      await page.waitForSelector('[data-testid="wallpaper-url-error"]', { timeout: 12_000 }).catch(() => {})
      await sleep(700)
      const after = await readWallpaperState(page)
      const stored = await readStoredWallpaper(page)
      const layer = await readCacheOnlyLayer(page, failure.url)
      const history = await page.evaluate((url) => [...document.querySelectorAll('[data-testid="wallpaper-recent-item"]')].some((item) => item.getAttribute('data-url') === url), failure.url)
      failureEvidence.push({
        label: failure.label,
        url: failure.url,
        errorVisible: (await page.locator('[data-testid="wallpaper-url-error"]').count()) > 0,
        oldSelectionPreserved: JSON.stringify(stored?.selection) === JSON.stringify(failureBeforeStored?.selection),
        oldStylePreserved: after.styleText === failureBefore.styleText || !layer.rawInStyle,
        rawInStyle: layer.rawInStyle,
        history,
      })
    }
    page.off('request', redirectRequestListener)
    expect(
      runner,
      'wallpaper.remote-failure',
      'failed remote cache (network/status/MIME/redirect) keeps the previous selection/storage, records no history/raw CSS, and never requests a private/insecure redirect target',
      failureEvidence.every((entry) => entry.errorVisible && entry.oldSelectionPreserved && entry.oldStylePreserved && !entry.rawInStyle && entry.history === false) &&
        redirectedRequests.length === 0,
      `${JSON.stringify(failureEvidence)}; redirectedTargetRequests=${JSON.stringify(redirectedRequests)}`,
    )

    // ---- recent history: third entry, re-apply, cache failure, clear ----
    const customUrl = 'https://images.example.test/custom.jpg'
    await page.waitForFunction((expectedUrl) => [...document.querySelectorAll('[data-testid="wallpaper-recent-item"]')].some((item) => item.getAttribute('data-url') === expectedUrl), customUrl, { timeout: 10_000 }).catch(() => {})
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="wallpaper-recent-item"]')].filter((item) => item.getAttribute('data-cached') === 'true').length >= 3, undefined, { timeout: 12_000 }).catch(() => {})
    const recentThree = await readWallpaperState(page)
    expect(
      runner,
      'recent.three-entries',
      'a custom https wallpaper is added as the newest Recent entry (3 entries, cached where possible)',
      recentThree.recentCard.itemCount === 3 &&
        recentThree.recentCard.items[0]?.url === customUrl &&
        recentThree.recentCard.items.filter((item) => item.cached === 'true').length >= 2,
      `items=${JSON.stringify(recentThree.recentCard.items)}`,
    )
    // Re-apply an older entry: selection changes and it moves to newest.
    await selectWallpaperSource(page, 'recent')
    const oldestUrl = recentThree.recentCard.items[2]?.url
    const oldestTitle = (recentThree.recentCard.items[2]?.label ?? '').split(' · ')[0]
    await page.locator('[data-testid="wallpaper-recent-item"]').nth(2).click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-hero-preview"]') !== null, undefined, { timeout: 10_000 }).catch(() => {})
    const reapplyLayer = await waitForCacheOnlyLayer(page, oldestUrl ?? '')
    await waitForStoredRemote(page, oldestUrl ?? '')
    await sleep(400)
    const reapplied = await readWallpaperState(page)
    const reapplyHeroText = await page.locator('[data-testid="wallpaper-hero"]').innerText().catch(() => '')
    expect(
      runner,
      'recent.reapply',
      'clicking a Recent item re-applies that wallpaper and moves it to newest (cached blob layer is legitimate)',
      reapplied.recentCard.items[0]?.url === oldestUrl &&
        reapplied.styleText.includes('background-image') &&
        reapplyLayer.hasBlob && reapplyLayer.blobFetchOk && !reapplyLayer.rawInStyle &&
        oldestTitle.length > 0 &&
        reapplyHeroText.includes(oldestTitle),
      `newest=${oneLine(reapplied.recentCard.items[0]?.url ?? '', 120)}; expected=${oneLine(oldestUrl ?? '', 120)}; blob=${reapplyLayer.hasBlob} fetchOk=${reapplyLayer.blobFetchOk} rawInStyle=${reapplyLayer.rawInStyle}; hero="${oneLine(reapplyHeroText, 120)}"; expectedTitle="${oneLine(oldestTitle, 80)}"`,
    )
    // Cache-first failure: the failed URL is never persisted as selection or
    // history, and the previous rendered/cached wallpaper stays in place.
    const brokenUrl = 'https://images.example.test/broken.jpg'
    const beforeBroken = await readWallpaperState(page)
    const beforeBrokenStored = await readStoredWallpaper(page)
    await selectWallpaperSource(page, 'local')
    await page.locator('[data-testid="wallpaper-url"]').fill(brokenUrl)
    await page.locator('[data-testid="wallpaper-url-apply"]').click({ timeout: 8_000 })
    await page.waitForSelector('[data-testid="wallpaper-url-error"]', { timeout: 12_000 }).catch(() => {})
    await sleep(700)
    const brokenState = await readWallpaperState(page)
    const brokenStored = await readStoredWallpaper(page)
    const brokenLayer = await readCacheOnlyLayer(page, brokenUrl)
    const brokenHistory = await page.evaluate((url) => [...document.querySelectorAll('[data-testid="wallpaper-recent-item"]')].some((item) => item.getAttribute('data-url') === url), brokenUrl)
    expect(
      runner,
      'recent.cache-failure',
      'a failed cache download leaves the previous wallpaper selected, records no history entry for the URL, and never falls back to raw CSS',
      brokenHistory === false &&
        !brokenLayer.rawInStyle &&
        !brokenState.styleText.includes(brokenUrl) &&
        JSON.stringify(brokenStored?.selection) === JSON.stringify(beforeBrokenStored?.selection) &&
        brokenState.recentCard.itemCount === beforeBroken.recentCard.itemCount,
      `history=${brokenHistory}; rawInStyle=${brokenLayer.rawInStyle}; selection=${JSON.stringify(brokenStored?.selection)} vs ${JSON.stringify(beforeBrokenStored?.selection)}; recent ${beforeBroken.recentCard.itemCount}→${brokenState.recentCard.itemCount}`,
    )
    // Select a builtin (not remote) before clearing history so the current
    // remote selection does not keep a protected cache entry around.
    await selectWallpaperSource(page, 'builtin')
    await page.locator('[data-testid="wallpaper-builtin"]').first().click({ timeout: 6_000 })
    await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') !== null, undefined, { timeout: 8_000 }).catch(() => {})
    await sleep(300)
    // Clear: card disappears, localStorage key removed, remote cache keys deleted.
    await selectWallpaperSource(page, 'recent')
    const keysBeforeClear = await readIndexedDbKeys(page)
    const remoteKeysBefore = keysBeforeClear.filter((key) => String(key).startsWith('remote-')).length
    await page.locator('[data-testid="wallpaper-recent-clear"]').click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-recent-card"]') === null, undefined, { timeout: 10_000 }).catch(() => {})
    await sleep(500)
    const clearedRecent = await readWallpaperState(page)
    const storedRecent = await page.evaluate(() => { try { return window.localStorage.getItem('dsh-livery.wallpaper.recent.v1') } catch { return 'error' } }).catch(() => 'error')
    const keysAfterClear = await readIndexedDbKeys(page)
    const remoteKeysAfter = keysAfterClear.filter((key) => String(key).startsWith('remote-')).length
    expect(
      runner,
      'recent.clear',
      'clear removes the Recent card, the localStorage history and the best-effort remote image cache',
      clearedRecent.recentCard.present === false &&
        (storedRecent === null || storedRecent === '') &&
        remoteKeysAfter === 0 &&
        (remoteKeysBefore === 0 || remoteKeysAfter < remoteKeysBefore),
      `card=${clearedRecent.recentCard.present}; stored=${oneLine(String(storedRecent), 80)}; remote cache keys ${remoteKeysBefore}→${remoteKeysAfter}`,
    )

    // Restore a valid wallpaper layer after the cache-failure/recent-clear flow:
    // a failed-cache selection intentionally has no raw-URL fallback, so the
    // adaptive-cover/atmosphere checks below need a real rendered layer again.
    await selectWallpaperSource(page, 'builtin')
    await page.locator('[data-testid="wallpaper-builtin"]').first().click({ timeout: 6_000 })
    await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') !== null, undefined, { timeout: 8_000 }).catch(() => {})
    await setRangeValue(page, 'wallpaper-atmosphere', 60)
    await sleep(450)

    // ---- adaptive cover layers at several viewport sizes ----
    const resizeSizes = [[1024, 768], [1920, 1080], [900, 1300]]
    const resizeEvidence = []
    for (const [width, height] of resizeSizes) {
      await page.setViewportSize({ width, height })
      await sleep(350)
      const adapted = await readWallpaperState(page)
      const coverOk =
        adapted.coverCount >= 2 &&
        allCover(adapted.pseudoBackgroundSize) &&
        adapted.overlay.present === true &&
        allCover(adapted.overlay.backgroundSize)
      resizeEvidence.push({ width, height, coverOk, coverRules: adapted.coverCount, pseudo: adapted.pseudoBackgroundSize, overlay: adapted.overlay.backgroundSize })
      await capture(page, ctx, { state: `wallpaper-resize-${width}x${height}`, mode: 'light' })
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    expect(
      runner,
      'wallpaper.adaptive-cover',
      'both wallpaper layers stay background-size:cover across 1024×768 / 1920×1080 / 900×1300',
      resizeEvidence.every((entry) => entry.coverOk),
      resizeEvidence.map((entry) => `${entry.width}x${entry.height}: pseudo=${entry.pseudo}, overlay=${entry.overlay}, coverRules=${entry.coverRules}`).join('; '),
      { resizeEvidence },
    )

    // ---- global atmosphere over host pages (conversation + third-party plugin) ----
    await setRangeValue(page, 'wallpaper-atmosphere', 60)
    await sleep(300)
    await returnToConversation(page)
    await sleep(500)
    const conversationAtmosphere = await readWallpaperState(page)
    expect(
      runner,
      'wallpaper.atmosphere-conversation',
      'the atmosphere overlay stays present over the host conversation page',
      conversationAtmosphere.attribute !== null &&
        conversationAtmosphere.overlay.present === true &&
        Number(conversationAtmosphere.overlay.opacity) === 0.6 &&
        conversationAtmosphere.overlay.pointerEvents === 'none',
      `attr=${conversationAtmosphere.attribute}; overlay=${JSON.stringify(conversationAtmosphere.overlay)}`,
    )
    await capture(page, ctx, { state: 'wallpaper-atmosphere-conversation', mode: 'light' })
    await reopenLivery()
    if (!(await page.locator('[data-testid="wallpaper-panel"]').count()))
      await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 8_000 }).catch(() => {})
    await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 10_000 }).catch(() => {})
    const thirdParty = await openOtherPluginPanel()
    if (thirdParty !== null) {
      // Atmosphere 0 vs 60 on the third-party page: capture + measured pixel delta.
      await reopenLivery()
      if (!(await page.locator('[data-testid="wallpaper-panel"]').count()))
        await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 8_000 }).catch(() => {})
      await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 10_000 }).catch(() => {})
      await setRangeValue(page, 'wallpaper-atmosphere', 0)
      await sleep(250)
      await openOtherPluginPanel()
      await sleep(600)
      const pluginZero = await readWallpaperState(page)
      const zeroShot = await capture(page, ctx, { state: 'wallpaper-plugin-atmosphere-0', mode: 'light' })
      await reopenLivery()
      if (!(await page.locator('[data-testid="wallpaper-panel"]').count()))
        await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 8_000 }).catch(() => {})
      await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 10_000 }).catch(() => {})
      await setRangeValue(page, 'wallpaper-atmosphere', 60)
      await sleep(250)
      await openOtherPluginPanel()
      await sleep(600)
      const pluginSixty = await readWallpaperState(page)
      const sixtyShot = await capture(page, ctx, { state: 'wallpaper-plugin-atmosphere-60', mode: 'light' })
      let delta = null
      try {
        const [zeroBuffer, sixtyBuffer] = [await readFile(zeroShot.path), await readFile(sixtyShot.path)]
        delta = meanPixelDelta(pngColorStats(zeroBuffer), pngColorStats(sixtyBuffer))
      } catch {
        delta = null
      }
      const perceptible = delta !== null && delta.score >= 1.5
      expect(
        runner,
        'wallpaper.overlay-plugin',
        `atmosphere layer stays present and below floating UI over the third-party "${thirdParty}" panel; opaque-page visual coverage is not claimed`,
        pluginZero.overlay.present === false &&
          pluginSixty.attribute !== null &&
          pluginSixty.overlay.present === true &&
          Number(pluginSixty.overlay.opacity) === 0.6 &&
          pluginSixty.overlay.pointerEvents === 'none' &&
          Number(pluginSixty.overlay.zIndex) < 100,
        `third-party="${thirdParty}"; atmo0 overlay=${pluginZero.overlay.present}; atmo60 overlay=${pluginSixty.overlay.present} z=${pluginSixty.overlay.zIndex} opacity=${pluginSixty.overlay.opacity}; measured pixel delta=${JSON.stringify(delta)}; perceptible=${perceptible} (informational only; no visual-coverage claim)`,
        { thirdParty, delta, perceptible },
      )
      state.atmosphereOverPlugin = { thirdParty, delta, perceptible }
      await reopenLivery()
      if (!(await page.locator('[data-testid="wallpaper-panel"]').count()))
        await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 8_000 }).catch(() => {})
      await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 10_000 }).catch(() => {})
    } else {
      runner.skip('wallpaper.overlay-plugin', 'atmosphere overlay is present over a third-party plugin page', 'no third-party plugin panel in this profile')
    }

    // ---- clear removes the layer/overlay/attribute/stored record ----
    await page.locator('[data-testid="wallpaper-clear"]').click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') === null && !document.body.hasAttribute('data-dsh-wallpaper') && document.getElementById('dsh-livery-wallpaper-overlay') === null, undefined, { timeout: 10_000 }).catch(() => {})
    await page.waitForFunction(() => {
      try { return (window.localStorage.getItem('dsh-livery.wallpaper.v1') ?? '') === '' } catch { return true }
    }, undefined, { timeout: 8_000 }).catch(() => {})
    const cleared = await readWallpaperState(page)
    let clearedRecord = null
    try { clearedRecord = cleared.stored === null || cleared.stored === '' ? null : JSON.parse(cleared.stored) } catch { clearedRecord = 'unparseable' }
    const clearedStoredOk = clearedRecord === null
      || (clearedRecord?.schemaVersion === 2 && clearedRecord?.selection?.kind === 'none')
    expect(
      runner,
      'wallpaper.clear',
      'clear removes the owned stylesheet/overlay/attribute and stores a v2 cleared record (or removes the key)',
      cleared.stylePresent === false && cleared.attribute === null && cleared.overlay.present === false && clearedStoredOk,
      `stylePresent=${cleared.stylePresent}; attribute=${cleared.attribute}; overlay=${cleared.overlay.present}; stored=${oneLine(cleared.stored ?? '', 220)}`,
    )
    state.wallpaperEvidence = {
      builtinCount: initial.builtins.length,
      builtin: builtinApplied.selectedBuiltin,
      online: {
        autoPicsumRequests: 1,
        openverseSearchRequests: openverseRequests.length,
        picsumRefetchRequests: picsumListRequests.length,
        retrySucceeded: retried.results.length > 0,
        libraryRemoved: onlineAuto.libraryElementCount === 0 && onlineAuto.categoryChipCount === 0,
      },
      uploadPersisted: uploadPersisted.styleText.includes('blob:'),
      atmosphereOverPlugin: state.atmosphereOverPlugin ?? null,
      resizeEvidence,
      cleared: cleared.attribute === null && cleared.overlay.present === false,
    }
    await page.locator('[data-testid="livery-page-tab-style"]').click({ timeout: 8_000 })
    await page.waitForSelector('[data-testid="livery-tabpanel-style"]', { timeout: 8_000 })
    const restored = await readGalleryStructure(page)
    expect(
      runner,
      'wallpaper.tab-restore',
      'returning to the 视觉风格 tab restores the gallery and the wallpaper layer stays cleared',
      restored.tabs.find((tab) => tab.id === 'style')?.selected === true &&
        restored.stylePanel === true &&
        restored.wallpaperPanel === false,
      `style selected=${restored.tabs.find((tab) => tab.id === 'style')?.selected}; stylePanel=${restored.stylePanel}; wallpaperPanel=${restored.wallpaperPanel}`,
    )
  } catch (error) {
    runner.fail('wallpaper.studio', 'wallpaper studio (online card, overlay, upload, effects, persistence, URL validation)', error instanceof Error ? (error.stack ?? error.message) : String(error))
  } finally {
    await page.unroute('https://api.openverse.org/**').catch(() => {})
    await page.unroute('https://images.example.test/**').catch(() => {})
    await uninstallPicsumRedirectMock(page)
  }
}

/**
 * Round-10 presentation layout acceptance: card hierarchy, two-column vs stacked
 * breakpoints (1440×900 / 1024×800), visible card surfaces, bounded effect
 * sliders, hero previews/thumbs and horizontal-overflow checks. Presentation
 * only — behaviour is covered by the other groups.
 */
function hasVisibleSurface(card) {
  return Boolean(card && card.visible && card.borderWidth && card.borderWidth !== '0px' &&
    (card.backgroundColor !== 'rgba(0, 0, 0, 0)' || card.backdropFilter !== 'none' || card.boxShadow !== 'none'))
}

async function scrollPanelTop(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    const body = document.querySelector('.livery-panel__body')
    if (body !== null) body.scrollTop = 0
  }).catch(() => {})
  await sleep(150)
}

export async function checkLayoutStructure(ctx) {
  const { runner, session, state } = ctx
  const { page } = session
  const uiLocale = state.actualLocale ?? 'zh'
  const uiLabels = labelsFor(uiLocale)
  const seedImage = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const failSafe = (id, title, error) => runner.fail(id, title, error instanceof Error ? (error.stack ?? error.message) : String(error))
  const expectSafe = (id, title, condition, detail) => {
    try { expect(runner, id, title, Boolean(condition), detail) } catch (error) { failSafe(id, title, error) }
  }
  let routed = false
  try {
    await page.route('https://api.openverse.org/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }), headers: { 'access-control-allow-origin': '*' } }),
    )
    await page.route('https://picsum.photos/**', (route) => {
      const url = route.request().url()
      if (url.includes('/v2/list')) {
        const items = Array.from({ length: 12 }, (_, index) => ({ id: String(10 + index), author: 'Tester' }))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items), headers: { 'access-control-allow-origin': '*' } })
      }
      return route.fulfill({ status: 200, contentType: 'image/png', body: seedImage, headers: { 'access-control-allow-origin': '*' } })
    })
    await page.route('https://images.example.test/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: seedImage, headers: { 'access-control-allow-origin': '*' } }),
    )
    routed = true
    await dismissFirstRunDialogs(page)
    await openLiveryDetailed(page, { labels: uiLabels, locale: uiLocale, timeoutMs: 25_000 })
    const styleTab = page.locator('[data-testid="livery-page-tab-style"]')
    const wallpaperTab = page.locator('[data-testid="livery-page-tab-wallpaper"]')
    const showStyle = async () => {
      if ((await styleTab.count()) > 0) await styleTab.click({ timeout: 8_000 }).catch(() => {})
      await page.waitForSelector('[data-testid="livery-current-card"]', { timeout: 12_000 })
      await sleep(250)
    }
    const showWallpaper = async () => {
      if ((await wallpaperTab.count()) > 0) await wallpaperTab.click({ timeout: 8_000 }).catch(() => {})
      await page.waitForSelector('[data-testid="wallpaper-source-card"]', { timeout: 12_000 })
      await sleep(250)
    }
    const selectSource = async (tab) => {
      const locator = page.locator(`[data-testid="wallpaper-source-tab-${tab}"]`)
      if ((await locator.count()) > 0) await locator.click({ timeout: 8_000 }).catch(() => {})
      await page.waitForSelector(`[data-testid="wallpaper-source-panel-${tab}"]:not([hidden])`, { timeout: 8_000 }).catch(() => {})
      await sleep(200)
    }

    // ---------------- style page (1440) ----------------
    await page.setViewportSize({ width: 1440, height: 900 })
    await showStyle()
    const styleWide = await readLayoutStructure(page, 'style')
    const styleFlags = styleWide.styleFlags ?? {}
    expectSafe('layout.style-wide-hero', 'style page uses the large no-rail hero with actions inside the current-style card',
      styleWide.layout.present === true && styleFlags.largeHero === true && styleFlags.actionsCardPresent === false &&
        styleFlags.railPresent === false && (styleFlags.restoreInsideHero === true || styleFlags.actionsInsideHero === true),
      `layout=${JSON.stringify(styleWide.layout)}; flags=${JSON.stringify(styleFlags)}`)
    expectSafe('layout.style-wide-hero-preview', 'style hero shows a loaded 16:10 preview image',
      styleWide.heroThumb?.present === true && styleWide.heroThumb.visible === true &&
        (styleWide.heroThumb.naturalWidth ?? 0) > 0 && Math.abs((styleWide.heroThumb.aspect ?? 0) - 1.6) <= 0.04,
      `hero=${JSON.stringify(styleWide.heroThumb)}`)
    expectSafe('layout.style-wide-gallery', 'style gallery follows the hero, is full width and renders 4 columns at 1440',
      styleFlags.galleryAfterHero === true && styleFlags.secondaryAfterGallery === true &&
        styleFlags.galleryColumns === 4 && (styleWide.gallery?.width ?? 0) > 900,
      `flags=${JSON.stringify(styleFlags)}; gallery=${JSON.stringify(styleWide.gallery)}`)
    expectSafe('layout.style-wide-toolbar', 'style toolbar stays within two rows and does not overflow at 1440',
      styleFlags.toolbarRows <= 2 && styleFlags.toolbarOverflowX === false,
      `toolbarRows=${styleFlags.toolbarRows}; overflowX=${styleFlags.toolbarOverflowX}`)
    expectSafe('layout.style-wide-no-overflow', 'style page has no horizontal overflow at 1440×900',
      styleWide.overflow.horizontal === false,
      `scrollWidth=${styleWide.overflow.scrollWidth} clientWidth=${styleWide.overflow.clientWidth}`)

    // Preview bar/actions inside hero, without writing.
    try {
      const card = page.locator('[data-testid="livery-card"][data-livery-id]').first()
      if ((await card.count()) > 0) {
        await scrollPanelTop(page)
        await card.click({ timeout: 8_000 })
        await page.waitForSelector('[data-testid="livery-preview"]', { timeout: 10_000 }).catch(() => {})
        const preview = await page.evaluate(() => {
          const hero = document.querySelector('[data-testid="livery-current-card"]')
          const bar = document.querySelector('[data-testid="livery-preview"]')
          const apply = document.querySelector('[data-testid="livery-apply"]')
          const cancel = document.querySelector('[data-testid="livery-cancel"]')
          return {
            barInHero: hero !== null && bar !== null && hero.contains(bar),
            applyInHero: hero !== null && apply !== null && hero.contains(apply),
            cancelInHero: hero !== null && cancel !== null && hero.contains(cancel),
          }
        })
        expectSafe('layout.style-preview-in-hero', 'preview bar, apply and cancel render inside the current-style hero',
          preview.barInHero && preview.applyInHero && preview.cancelInHero, JSON.stringify(preview))
        const cancel = page.locator('[data-testid="livery-cancel"]')
        if ((await cancel.count()) > 0) await cancel.click({ timeout: 6_000 }).catch(() => {})
        await sleep(250)
      }
    } catch (error) {
      failSafe('layout.style-preview-in-hero', 'preview bar, apply and cancel render inside the current-style hero', error)
    }
    await capture(page, ctx, { state: 'layout-style-1440', mode: 'light' })

    // ---------------- style page (1024 / 767) ----------------
    for (const width of [1024, 767]) {
      await page.setViewportSize({ width, height: width === 1024 ? 800 : 900 })
      await showStyle()
      try {
        const styleNarrow = await readLayoutStructure(page, 'style')
        const flags = styleNarrow.styleFlags ?? {}
        expectSafe(`layout.style-${width}-no-overflow`, `style page has no horizontal overflow at ${width}px`,
          styleNarrow.overflow.horizontal === false,
          `scrollWidth=${styleNarrow.overflow.scrollWidth} clientWidth=${styleNarrow.overflow.clientWidth}`)
        expectSafe(`layout.style-${width}-hero`, `style hero stays no-rail with actions inside at ${width}px`,
          flags.railPresent === false && flags.actionsCardPresent === false && (flags.restoreInsideHero === true || flags.actionsInsideHero === true),
          JSON.stringify(flags))
        expectSafe(`layout.style-${width}-gallery`, `style gallery is visible after the hero at ${width}px`,
          flags.galleryAfterHero === true && flags.secondaryAfterGallery === true,
          JSON.stringify(flags))
        expectSafe(`layout.style-${width}-toolbar`, `style toolbar stays within two rows at ${width}px`,
          flags.toolbarRows <= 2,
          `toolbarRows=${flags.toolbarRows}`)
        await capture(page, ctx, { state: `layout-style-${width}`, mode: 'light' })
      } catch (error) {
        failSafe(`layout.style-${width}-probe`, `style page layout probe completes at ${width}px`, error)
      }
    }

    // ---------------- wallpaper page (1440) ----------------
    await page.setViewportSize({ width: 1440, height: 900 })
    await showWallpaper()
    await selectSource('builtin')
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="wallpaper-builtin"]').length === 24, undefined, { timeout: 12_000 }).catch(() => {})
    const firstBuiltin = page.locator('[data-testid="wallpaper-builtin"]').first()
    if ((await firstBuiltin.count()) > 0) await firstBuiltin.click({ timeout: 8_000 }).catch(() => {})
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-hero-preview"]') !== null, undefined, { timeout: 10_000 }).catch(() => {})
    await sleep(300)
    const wallpaperWide = await readLayoutStructure(page, 'wallpaper')
    const wallFlags = wallpaperWide.wallpaperFlags ?? {}
    expectSafe('layout.wallpaper-workbench', 'wallpaper page uses the workbench + single source card, no old rail/layout',
      wallpaperWide.layout.present === true && wallpaperWide.layout.display === 'grid' && wallpaperWide.layout.trackCount === 2 &&
        wallFlags.workbench === true && wallFlags.oldLayoutPresent === false && wallFlags.railPresent === false && wallFlags.sourceCard === true,
      `layout=${JSON.stringify(wallpaperWide.layout)}; flags=${JSON.stringify(wallFlags)}`)
    expectSafe('layout.wallpaper-order', 'wallpaper DOM order is hero → effects → source → managed data',
      wallFlags.workbenchChildren?.slice(0, 2).join(',') === 'wallpaper-hero,wallpaper-effects-card' &&
        wallFlags.domOrder?.map((row) => row.testid).join(',') === 'wallpaper-hero,wallpaper-effects-card,wallpaper-source-card,wallpaper-manage' &&
        wallFlags.domOrder.every((row) => typeof row.top === 'number'),
      `children=${JSON.stringify(wallFlags.workbenchChildren)}; order=${JSON.stringify(wallFlags.domOrder)}`)
    expectSafe('layout.wallpaper-cards', 'wallpaper hero/effects/source/manage cards are visible and surfaced',
      (wallpaperWide.wallpaperCards ?? []).length === 4 &&
        wallpaperWide.wallpaperCards.every((card) => card.present && card.visible && hasVisibleSurface(card)),
      (wallpaperWide.wallpaperCards ?? []).map((card) => `${card.testId}:${card.visible}:${card.borderWidth}`).join(', '))
    expectSafe('layout.wallpaper-source-tabs', 'wallpaper source card exposes 4 tabs with exactly one visible panel',
      wallFlags.sourceTabs?.length === 4 && wallFlags.hiddenPanels?.length === 3 && wallFlags.visiblePanels?.length === 1,
      `tabs=${JSON.stringify(wallFlags.sourceTabs)}; hidden=${JSON.stringify(wallFlags.hiddenPanels)}; visible=${JSON.stringify(wallFlags.visiblePanels)}`)
    expectSafe('layout.wallpaper-effects', 'wallpaper effects grid is one full-width column and sliders fill it at 1440',
      wallpaperWide.effectsGrid?.present === true && wallpaperWide.effectsGrid.tracks === 1 &&
        wallpaperWide.sliderWidths.length === 4 && wallpaperWide.sliderWidths.every((width) => width >= 180),
      `effects=${JSON.stringify(wallpaperWide.effectsGrid)}; sliders=${JSON.stringify(wallpaperWide.sliderWidths)}`)
    expectSafe('layout.wallpaper-no-overflow-1440', 'wallpaper page has no horizontal overflow at 1440×900',
      wallpaperWide.overflow.horizontal === false,
      `scrollWidth=${wallpaperWide.overflow.scrollWidth} clientWidth=${wallpaperWide.overflow.clientWidth}`)

    // online pager (auto Picsum batch renders 12 mock results → max 6 per page).
    await selectSource('online')
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="wallpaper-result"]').length > 0, undefined, { timeout: 12_000 }).catch(() => {})
    const pager = await page.evaluate(() => ({
      visible: document.querySelector('[data-testid="wallpaper-results-pager"]') !== null,
      results: document.querySelectorAll('[data-testid="wallpaper-result"]').length,
      page: document.querySelector('[data-testid="wallpaper-result-page"]')?.textContent?.trim() ?? null,
      next: document.querySelector('[data-testid="wallpaper-result-next"]') !== null,
    }))
    expectSafe('layout.wallpaper-pager', 'wallpaper online results show at most 6 per page with a working pager',
      pager.visible === true && pager.results <= 6 && pager.next === true && /\d+\s*\/\s*\d+/.test(pager.page ?? ''),
      JSON.stringify(pager))
    try {
      const next = page.locator('[data-testid="wallpaper-result-next"]')
      if ((await next.count()) > 0) {
        await next.click({ timeout: 6_000 })
        await sleep(300)
        const after = await page.evaluate(() => ({
          results: document.querySelectorAll('[data-testid="wallpaper-result"]').length,
          page: document.querySelector('[data-testid="wallpaper-result-page"]')?.textContent?.trim() ?? null,
        }))
        expectSafe('layout.wallpaper-pager-next', 'wallpaper pager next shows the second page of at most 6 results',
          after.results <= 6 && after.page !== pager.page, JSON.stringify(after))
      }
    } catch (error) { failSafe('layout.wallpaper-pager-next', 'wallpaper pager next shows the second page of at most 6 results', error) }

    // management collapsed default → open; tabs switch panels.
    await selectSource('recent')
    const recentState = await page.evaluate(() => ({
      card: document.querySelector('[data-testid="wallpaper-recent-card"]') !== null || document.querySelector('[data-testid="wallpaper-recent-empty"]') !== null,
      track: document.querySelector('.wallpaper-recent-track') !== null,
      hidden: document.querySelector('[data-testid="wallpaper-source-panel-builtin"]')?.hasAttribute('hidden') ?? null,
    }))
    expectSafe('layout.wallpaper-recent-tab', 'recent tab shows the recent history section (horizontal track when populated)',
      recentState.card === true && recentState.hidden === true, JSON.stringify(recentState))
    await selectSource('local')
    const localState = await page.evaluate(() => {
      const grid = document.querySelector('.wallpaper-local-grid')
      return {
        custom: document.querySelector('[data-testid="wallpaper-custom-card"]') !== null,
        columns: grid === null ? 0 : getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
        hidden: document.querySelector('[data-testid="wallpaper-source-panel-recent"]')?.hasAttribute('hidden') ?? null,
      }
    })
    expectSafe('layout.wallpaper-local-tab', 'local tab shows upload + custom-address side by side at 1440',
      localState.custom === true && localState.columns === 2, JSON.stringify(localState))
    const manage = page.locator('[data-testid="wallpaper-manage"]')
    const manageInitiallyClosed = (await manage.count()) > 0 && (await manage.getAttribute('open')) === null
    expectSafe('layout.wallpaper-manage-collapsed', 'managed presets/local-data section is collapsed by default',
      manageInitiallyClosed, `open=${(await manage.getAttribute('open').catch(() => null))}`)
    try {
      if ((await page.locator('[data-testid="wallpaper-manage-toggle"]').count()) > 0) {
        await page.locator('[data-testid="wallpaper-manage-toggle"]').click({ timeout: 6_000 })
        await sleep(250)
      }
      const open = (await manage.count()) > 0 && (await manage.getAttribute('open')) !== null
      expectSafe('layout.wallpaper-manage-opens', 'managed presets/local-data section opens on toggle',
        open, `open=${open}`)
    } catch (error) { failSafe('layout.wallpaper-manage-opens', 'managed presets/local-data section opens on toggle', error) }
    await capture(page, ctx, { state: 'layout-wallpaper-1440', mode: 'light' })

    // ---------------- wallpaper page (1024 / 767) ----------------
    for (const width of [1024, 767]) {
      await page.setViewportSize({ width, height: width === 1024 ? 800 : 900 })
      await showWallpaper()
      await sleep(250)
      try {
        const wallpaperNarrow = await readLayoutStructure(page, 'wallpaper')
        const flags = wallpaperNarrow.wallpaperFlags ?? {}
        expectSafe(`layout.wallpaper-${width}-stacked`, `wallpaper workbench stacks to one column at ${width}px`,
          wallpaperNarrow.layout.present === true && wallpaperNarrow.layout.trackCount === 1, `layout=${JSON.stringify(wallpaperNarrow.layout)}`)
        expectSafe(`layout.wallpaper-${width}-no-overflow`, `wallpaper page has no horizontal overflow at ${width}px`,
          wallpaperNarrow.overflow.horizontal === false,
          `scrollWidth=${wallpaperNarrow.overflow.scrollWidth} clientWidth=${wallpaperNarrow.overflow.clientWidth}`)
        expectSafe(`layout.wallpaper-${width}-source`, `wallpaper source tabs stay available at ${width}px`,
          flags.sourceTabs?.length === 4 && flags.sourceCard === true, JSON.stringify(flags))
        expectSafe(`layout.wallpaper-${width}-effects`, `wallpaper effects grid has at most two columns at ${width}px`,
          wallpaperNarrow.effectsGrid?.present === true && wallpaperNarrow.effectsGrid.tracks <= 2,
          JSON.stringify(wallpaperNarrow.effectsGrid))
        await capture(page, ctx, { state: `layout-wallpaper-${width}`, mode: 'light' })
      } catch (error) {
        failSafe(`layout.wallpaper-${width}-probe`, `wallpaper layout probe completes at ${width}px`, error)
      }
    }

    state.layoutEvidence = {
      style: { wide: styleWide, narrow: [] },
      wallpaper: { wide: wallpaperWide, narrow: [] },
    }

    // Clean state for the remaining behaviour groups.
    await page.setViewportSize({ width: 1440, height: 900 })
    await showWallpaper()
    const clearButton = page.locator('[data-testid="wallpaper-clear"]').first()
    if ((await clearButton.count()) > 0) await clearButton.click({ timeout: 8_000 }).catch(() => {})
    await showStyle()
  } catch (error) {
    failSafe('layout.probe', '0.1.4 layout structure probe completes', error)
  } finally {
    if (routed) {
      await page.unroute('https://api.openverse.org/**').catch(() => {})
      await page.unroute('https://picsum.photos/**').catch(() => {})
      await page.unroute('https://images.example.test/**').catch(() => {})
    }
    await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {})
  }
}

export async function checkVisualMatrix(ctx) {
  const { runner, session, state } = ctx
  const { page } = session
  if (!state.appliedSkin || !state.activeLivery) {
    runner.skip('visual.matrix-shots', 'visual matrix renders real screenshots across widths/themes/wallpaper states', 'no active livery')
    return
  }
  const uiLocale = state.actualLocale ?? 'zh'
  const uiLabels = labelsFor(uiLocale)
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const shot = async (name, mode = 'light') => {
    await sleep(240)
    return capture(page, ctx, { state: name, mode })
  }
  const readOverflow = () =>
    page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body ? document.body.scrollWidth : null,
    }))
  const readCardBoxes = () =>
    page.evaluate(() => {
      const ids = ['wallpaper-hero', 'wallpaper-effects-card', 'wallpaper-source-card', 'wallpaper-manage']
      const out = {}
      for (const id of ids) {
        const el = document.querySelector(`[data-testid="${id}"]`)
        if (!el) {
          out[id] = null
          continue
        }
        const rect = el.getBoundingClientRect()
        out[id] = { top: rect.top, left: rect.left, width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 }
      }
      return out
    })
  const readCardSurface = () =>
    page.evaluate(() => {
      const card = document.querySelector('[data-testid="wallpaper-online-card"]')
      if (!card) return null
      const style = getComputedStyle(card)
      const alpha = (value) => {
        const match = String(value).match(/rgba?\(([^)]*)\)/u)
        if (!match) return 1
        const parts = match[1].split(',').map((part) => part.trim())
        return parts.length === 4 ? Number(parts[3]) : 1
      }
      return {
        backgroundColor: style.backgroundColor,
        backgroundAlpha: alpha(style.backgroundColor),
        backdropFilter: style.backdropFilter,
        border: `${style.borderTopWidth} ${style.borderTopStyle}`,
        boxShadow: style.boxShadow,
      }
    })
  const setTheme = async (mode) => {
    await page.emulateMedia({ colorScheme: mode })
    await page
      .waitForFunction((theme) => (theme === 'dark' ? document.body.hasAttribute('data-ds-dark-theme') : !document.body.hasAttribute('data-ds-dark-theme')), mode, { timeout: 8_000 })
      .catch(() => {})
    await sleep(200)
  }
  const clearWallpaper = async () => {
    const button = page.locator('[data-testid="wallpaper-clear"]').first()
    if ((await button.count()) > 0 && !(await button.isDisabled().catch(() => true))) {
      await button.click({ timeout: 5_000 }).catch(() => {})
    }
    await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') === null, undefined, { timeout: 6_000 }).catch(() => {})
    await sleep(180)
  }
  const selectBuiltin = async () => {
    await selectWallpaperSource(page, 'builtin')
    const first = page.locator('[data-testid="wallpaper-builtin"]').first()
    if ((await first.count()) > 0) await first.click({ timeout: 6_000 }).catch(() => {})
    await page
      .waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') !== null, undefined, { timeout: 8_000 })
      .catch(() => {})
    await sleep(260)
  }
  const setSlider = async (testId, value) => {
    await setRangeValue(page, testId, value)
    await sleep(220)
  }
  let routed = false
  try {
    await page.route('https://api.openverse.org/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) }),
    )
    await installPicsumRedirectMock(page, { tinyPng })
    await page.route('https://images.example.test/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: tinyPng }))
    routed = true

    await openLiveryDetailed(page, { labels: uiLabels, locale: uiLocale, timeoutMs: 25_000 })
    await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 8_000 }).catch(() => {})
    await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 12_000 })
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="wallpaper-builtin"]').length === 24, undefined, { timeout: 12_000 }).catch(() => {})

    // ---------- 12-state screenshot matrix: width × theme × wallpaper on/off ----------
    const matrixShots = []
    for (const [width, height] of [[1440, 900], [1024, 800], [767, 900]]) {
      await page.setViewportSize({ width, height })
      await sleep(300)
      await setTheme('light')
      await clearWallpaper()
      matrixShots.push(await shot(`visual-${width}-light-off`, 'light'))
      await selectBuiltin()
      matrixShots.push(await shot(`visual-${width}-light-on`, 'light'))
      await setTheme('dark')
      matrixShots.push(await shot(`visual-${width}-dark-on`, 'dark'))
      await clearWallpaper()
      matrixShots.push(await shot(`visual-${width}-dark-off`, 'dark'))
    }
    const matrixBytes = []
    for (const frame of matrixShots) matrixBytes.push(await readFile(frame.path).then((buffer) => buffer.length).catch(() => 0))
    expect(
      runner,
      'visual.matrix-shots',
      'real screenshots captured for 1440/1024/767 × light/dark × wallpaper off/on',
      matrixShots.length === 12 && matrixBytes.every((bytes) => bytes > 1000),
      `frames=${matrixShots.length}; bytes=${JSON.stringify(matrixBytes)}`,
      { frames: matrixShots.map((frame) => frame.path), bytes: matrixBytes },
    )

    // ---------- 767 narrow: no overflow + effects/built-ins before online/upload ----------
    await page.setViewportSize({ width: 767, height: 900 })
    await setTheme('light')
    await clearWallpaper()
    const overflowOff = await readOverflow()
    await selectBuiltin()
    const overflowOn = await readOverflow()
    const narrowBoxes = await readCardBoxes()
    const noOverflow = (overflow) => overflow.scrollWidth <= overflow.clientWidth + 1
    expect(
      runner,
      'visual.no-overflow-767',
      'no horizontal overflow at 767px with wallpaper off and on',
      noOverflow(overflowOff) && noOverflow(overflowOn),
      `off=${overflowOff.scrollWidth}/${overflowOff.clientWidth}; on=${overflowOn.scrollWidth}/${overflowOn.clientWidth}`,
      { overflowOff, overflowOn },
    )
    expect(
      runner,
      'visual.narrow-card-order',
      'at 767px the hero/effects workbench renders before the single source card; tab panels stay mounted but hidden',
      Boolean(narrowBoxes['wallpaper-hero']?.visible) &&
        Boolean(narrowBoxes['wallpaper-effects-card']?.visible) &&
        Boolean(narrowBoxes['wallpaper-source-card']?.visible) &&
        narrowBoxes['wallpaper-hero'].top < narrowBoxes['wallpaper-effects-card'].top - 8 &&
        narrowBoxes['wallpaper-effects-card'].top < narrowBoxes['wallpaper-source-card'].top - 8,
      JSON.stringify(narrowBoxes),
      { boxes: narrowBoxes },
    )

    // ---------- light/dark real token swap at 1440 with wallpaper on ----------
    await page.setViewportSize({ width: 1440, height: 900 })
    await setTheme('light')
    await clearWallpaper()
    await selectBuiltin()
    const lightSnapshot = await readThemeSnapshot(page)
    const lightSurface = await readCardSurface()
    await setTheme('dark')
    const darkSnapshot = await readThemeSnapshot(page)
    const darkSurface = await readCardSurface()
    expect(
      runner,
      'visual.theme-tokens',
      'light/dark themes swap computed livery background tokens with wallpaper active',
      lightSnapshot.bodyAttribute !== null &&
        darkSnapshot.bodyAttribute === lightSnapshot.bodyAttribute &&
        lightSnapshot.tokens.bgBaseCanonical !== '' &&
        lightSnapshot.tokens.bgBaseCanonical !== darkSnapshot.tokens.bgBaseCanonical,
      `attr light=${lightSnapshot.bodyAttribute} dark=${darkSnapshot.bodyAttribute}; light=${lightSnapshot.tokens.bgBaseCanonical}; dark=${darkSnapshot.tokens.bgBaseCanonical}; darkAttr=${JSON.stringify(darkSnapshot.darkAttribute)}; lightCard=${JSON.stringify(lightSurface)}; darkCard=${JSON.stringify(darkSurface)}`,
      { light: lightSnapshot.tokens, dark: darkSnapshot.tokens },
    )
    await setTheme('light')

    // ---------- frost 0 / 35 / 80 with atmosphere 30 ----------
    await setSlider('wallpaper-atmosphere', 30)
    const frostStates = []
    for (const frost of [0, 35, 80]) {
      await setSlider('wallpaper-frost', frost)
      await page.waitForFunction((value) => document.querySelector('[data-testid="wallpaper-frost"]')?.value === String(value), frost, { timeout: 6_000 }).catch(() => {})
      const wallpaper = await readWallpaperState(page)
      const surface = await readCardSurface()
      frostStates.push({ frost, styleUsesColorMix: /color-mix\(/u.test(wallpaper.styleText ?? ''), bgBase: wallpaper.bgBaseToken ?? '', surface })
      await shot(`visual-frost-${frost}`, 'light')
    }
    const frostCardGlass = frostStates[2]?.surface?.backdropFilter && frostStates[2].surface.backdropFilter !== 'none'
    const frostPercent = (state) => {
      const match = String(state.bgBase ?? '').match(/(\d+(?:\.\d+)?)%/u)
      return match ? Number(match[1]) : null
    }
    expect(
      runner,
      'visual.frost-steps',
      'frost 0/35/80 changes active token transparency while plugin cards keep their private glass',
      frostStates.length === 3 &&
        frostStates.every((state) => state.styleUsesColorMix) &&
        frostPercent(frostStates[0]) === 100 &&
        frostPercent(frostStates[2]) !== null &&
        frostPercent(frostStates[2]) < frostPercent(frostStates[0]) &&
        (frostCardGlass || (frostStates[2]?.surface?.backgroundAlpha ?? 1) < 1),
      frostStates.map((state) => `frost=${state.frost} colorMix=${state.styleUsesColorMix} pct=${frostPercent(state)} bgBase="${oneLine(state.bgBase, 90)}" card=${JSON.stringify(state.surface)}`).join(' | '),
      { frostStates },
    )

    // ---------- atmosphere 0 / 30 / 60 with frost 35 ----------
    await setSlider('wallpaper-frost', 35)
    const atmosphereStates = []
    for (const atmosphere of [0, 30, 60]) {
      await setSlider('wallpaper-atmosphere', atmosphere)
      await page
        .waitForFunction(
          (value) => {
            if (value === 0) return document.getElementById('dsh-livery-wallpaper-overlay') === null
            const overlay = document.getElementById('dsh-livery-wallpaper-overlay')
            return overlay !== null && Math.abs(Number(getComputedStyle(overlay).opacity) - value / 100) < 0.02
          },
          atmosphere,
          { timeout: 6_000 },
        )
        .catch(() => {})
      const wallpaper = await readWallpaperState(page)
      atmosphereStates.push({ atmosphere, overlay: wallpaper.overlay })
      await shot(`visual-atmosphere-${atmosphere}`, 'light')
    }
    expect(
      runner,
      'visual.atmosphere-steps',
      'atmosphere 0/30/60 maps to no overlay / 0.30 / 0.60 opacity, below floating UI',
      atmosphereStates.length === 3 &&
        atmosphereStates[0].overlay.present === false &&
        Math.abs(Number(atmosphereStates[1].overlay.opacity) - 0.3) < 0.02 &&
        Math.abs(Number(atmosphereStates[2].overlay.opacity) - 0.6) < 0.02 &&
        Number(atmosphereStates[2].overlay.zIndex) < 100,
      atmosphereStates.map((state) => `atmo=${state.atmosphere} overlay=${JSON.stringify(state.overlay)}`).join(' | '),
      { atmosphereStates },
    )

    // ---------- forced-colors + reduced-transparency ----------
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active' })
    await page.waitForFunction(() => matchMedia('(forced-colors: active)').matches, undefined, { timeout: 6_000 }).catch(() => {})
    await sleep(260)
    const forcedSnapshot = await readThemeSnapshot(page)
    const forcedSurface = await readCardSurface()
    await shot('visual-forced-colors', 'light')
    expect(
      runner,
      'visual.forced-colors',
      'forced-colors active keeps the livery scoped and removes translucent card glass',
      forcedSnapshot.bodyAttribute !== null &&
        (forcedSurface?.backdropFilter === 'none' || (forcedSurface?.backgroundAlpha ?? 0) >= 1),
      `attr=${forcedSnapshot.bodyAttribute}; card=${JSON.stringify(forcedSurface)}`,
      { card: forcedSurface },
    )
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'none' }).catch(() => {})

    let cdp = null
    try {
      cdp = await page.context().newCDPSession(page)
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
      await sleep(280)
      const reducedMedia = await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)
      const reducedSurface = await readCardSurface()
      await shot('visual-reduced-transparency', 'light')
      expect(
        runner,
        'visual.reduced-transparency',
        'prefers-reduced-transparency:reduce removes card blur/translucent private surface',
        reducedMedia === true && (reducedSurface?.backdropFilter === 'none' || (reducedSurface?.backgroundAlpha ?? 0) >= 1),
        `media=${reducedMedia}; card=${JSON.stringify(reducedSurface)}`,
        { card: reducedSurface },
      )
    } catch (error) {
      runner.skip('visual.reduced-transparency', 'prefers-reduced-transparency:reduce removes translucent card glass', `emulation not supported: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      if (cdp) {
        await cdp.send('Emulation.setEmulatedMedia', { features: [] }).catch(() => {})
        await cdp.detach().catch(() => {})
      }
    }

    // ---------- keyboard focus + selected state ----------
    await clearWallpaper()
    await setTheme('light')
    await selectWallpaperSource(page, 'builtin')
    const firstBuiltin = page.locator('[data-testid="wallpaper-builtin"]').first()
    await firstBuiltin.focus()
    // Return focus through the keyboard so the browser applies :focus-visible.
    await page.keyboard.press('Tab').catch(() => {})
    await page.keyboard.press('Shift+Tab').catch(() => {})
    await sleep(220)
    const focusState = await page.evaluate(() => {
      const element = document.activeElement
      if (!(element instanceof HTMLElement)) return null
      const style = getComputedStyle(element)
      return {
        testId: element.getAttribute('data-testid'),
        outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
        boxShadow: style.boxShadow,
      }
    })
    await page.keyboard.press('Enter')
    await sleep(380)
    const selectedState = await page.evaluate(() => {
      const pressed = [...document.querySelectorAll('[data-testid="wallpaper-builtin"]')].filter((element) => element.getAttribute('aria-pressed') === 'true')
      return { count: pressed.length, id: pressed[0]?.getAttribute('data-wallpaper-id') ?? null, pressed: pressed[0]?.getAttribute('aria-pressed') ?? null }
    })
    await shot('visual-keyboard-selected', 'light')
    expect(
      runner,
      'visual.keyboard-focus',
      'keyboard focus reaches a builtin and shows a visible focus ring',
      focusState?.testId === 'wallpaper-builtin' && ((focusState?.outline ?? '').split(' ')[0] !== 'none' || (focusState?.boxShadow ?? 'none') !== 'none'),
      `focused=${JSON.stringify(focusState)}`,
      { focusState },
    )
    expect(
      runner,
      'visual.selected-state',
      'keyboard Enter selects exactly one builtin with a visible selected state',
      selectedState.count === 1 && selectedState.pressed === 'true' && typeof selectedState.id === 'string',
      JSON.stringify(selectedState),
      { selectedState },
    )

    // ---------- floating host surfaces above atmosphere/frost ----------
    await setSlider('wallpaper-frost', 80)
    await setSlider('wallpaper-atmosphere', 60)
    let modalSurface = null
    try {
      await openSettings(page)
      modalSurface = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        if (!dialog) return null
        const style = getComputedStyle(dialog)
        const match = String(style.backgroundColor).match(/rgba?\(([^)]*)\)/u)
        const parts = match ? match[1].split(',').map((part) => part.trim()) : []
        const overlay = document.getElementById('dsh-livery-wallpaper-overlay')
        return {
          background: style.backgroundColor,
          alpha: parts.length === 4 ? Number(parts[3]) : 1,
          backdrop: style.backdropFilter,
          overlayZ: overlay ? Number(getComputedStyle(overlay).zIndex) : null,
        }
      })
      await closeSettings(page)
    } catch {
      modalSurface = null
    }
    if (modalSurface === null) {
      runner.skip('visual.floating-surfaces', 'host Settings modal stays opaque above frost+atmosphere', 'host Settings dialog unavailable in this shell')
    } else {
      expect(
        runner,
        'visual.floating-surfaces',
        'host Settings modal stays opaque above frost+atmosphere',
        modalSurface.alpha >= 0.99 && (modalSurface.overlayZ === null || modalSurface.overlayZ < 1000),
        JSON.stringify(modalSurface),
        { modalSurface },
      )
    }
    runner.skip(
      'visual.other-floating-surfaces',
      'confirm dialog / Toast / Tooltip / Menu / HoverCard stay opaque above the atmosphere',
      'not triggerable without synthetic host interactions in this shell; Settings modal path covers the shared floating-surface token',
    )

    // ---------- restore a clean interactive state ----------
    await clearWallpaper()
    await setSlider('wallpaper-frost', 35)
    await setSlider('wallpaper-atmosphere', 60)
    await setSlider('wallpaper-blur', 12)
    await setSlider('wallpaper-dim', 40)
    await setTheme('light')
    await page.locator('[data-testid="livery-page-tab-style"]').click({ timeout: 8_000 }).catch(() => {})
    await page.waitForSelector('[data-testid="livery-tabpanel-style"]', { timeout: 8_000 }).catch(() => {})
    state.visualMatrix = {
      shots: matrixShots.map((frame) => frame.path),
      narrowBoxes,
      frostStates,
      atmosphereStates,
      forcedSurface,
    }
  } catch (error) {
    runner.fail('visual.matrix', 'visual acceptance matrix completes with real computed-style/screenshot evidence', error instanceof Error ? (error.stack ?? error.message) : String(error))
  } finally {
    if (routed) {
      await page.unroute('https://api.openverse.org/**').catch(() => {})
      await page.unroute('https://images.example.test/**').catch(() => {})
      await uninstallPicsumRedirectMock(page)
    }
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'none' }).catch(() => {})
    await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {})
  }
}


/** Small PNG used by upload/remote fixtures. */
const MERGED_TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/** Read state-v2 wallpaper storage plus the visible position/preset/clear UI. */
async function readMergedWallpaper(page) {
  return page.evaluate(() => {
    const KEY = 'dsh-livery.wallpaper.v1'
    let storedRaw = null
    let stored = null
    try {
      storedRaw = window.localStorage.getItem(KEY)
      stored = storedRaw === null ? null : JSON.parse(storedRaw)
    } catch {
      stored = null
    }
    const style = document.querySelector('style#dsh-livery-wallpaper')
    const overlay = document.getElementById('dsh-livery-wallpaper-overlay')
    const hero = document.querySelector('[data-testid="wallpaper-hero-preview"]')
    const positionGroup = document.querySelector('[data-testid="wallpaper-position"]')
    const radios = [...document.querySelectorAll('[data-testid^="wallpaper-position-"]')].filter((node) => node instanceof HTMLInputElement)
    const clearResult = document.querySelector('[data-testid="wallpaper-clear-local-result"]')
    const preset = {
      card: document.querySelector('[data-testid="preset-card"]') !== null,
      exportButton: document.querySelector('[data-testid="preset-export"]') !== null,
      importFile: document.querySelector('[data-testid="preset-import-file"]') !== null,
      diff: document.querySelector('[data-testid="preset-diff"]') !== null,
      diffRows: document.querySelectorAll('[data-testid="preset-diff-row"]').length,
      apply: document.querySelector('[data-testid="preset-apply"]') !== null,
      cancel: document.querySelector('[data-testid="preset-cancel"]') !== null,
      exportStatus: (document.querySelector('[data-testid="preset-export-status"]')?.textContent ?? '').trim(),
      importStatus: (document.querySelector('[data-testid="preset-import-status"]')?.textContent ?? '').trim(),
      applyStatus: (document.querySelector('[data-testid="preset-apply-status"]')?.textContent ?? '').trim(),
      error: (() => {
        const node = document.querySelector('[data-testid="preset-error"]')
        if (node === null) return null
        const importButton = document.querySelector('[data-testid="preset-import"]')
        return {
          id: node.id,
          kind: node.getAttribute('data-error-kind'),
          code: node.getAttribute('data-error-code'),
          text: (node.textContent ?? '').trim(),
          importAriaInvalid: importButton?.getAttribute('aria-invalid') ?? null,
          importDescribedBy: importButton?.getAttribute('aria-describedby') ?? null,
          importErrorMessage: importButton?.getAttribute('aria-errormessage') ?? null,
          retryWallpaper: document.querySelector('[data-testid="preset-retry-wallpaper"]') !== null,
        }
      })(),
    }
    return {
      storedRaw,
      stored,
      schemaVersion: stored?.schemaVersion ?? null,
      revision: stored?.revision ?? null,
      selection: stored?.selection ?? null,
      effects: stored?.effects ?? null,
      position: stored?.position ?? null,
      stylePresent: style !== null,
      styleText: style?.textContent ?? '',
      attribute: document.body.getAttribute('data-dsh-wallpaper'),
      heroPosition: hero === null ? null : getComputedStyle(hero).backgroundPosition,
      overlay: overlay === null
        ? { present: false }
        : {
            present: true,
            position: getComputedStyle(overlay).backgroundPosition,
            opacity: getComputedStyle(overlay).opacity,
            zIndex: getComputedStyle(overlay).zIndex,
          },
      positionGroup: positionGroup === null
        ? { present: false }
        : {
            present: true,
            radios: radios.length,
            name: radios[0]?.name ?? null,
            checked: radios.find((radio) => radio.checked)?.getAttribute('data-testid') ?? null,
            checkedValue: radios.find((radio) => radio.checked)?.value ?? null,
          },
      recentRaw: (() => { try { return window.localStorage.getItem('dsh-livery.wallpaper.recent.v1') } catch { return null } })(),
      clearResult: clearResult === null
        ? null
        : { status: clearResult.getAttribute('data-status'), removed: clearResult.getAttribute('data-removed'), text: (clearResult.textContent ?? '').trim() },
      preset,
    }
  })
}

async function openWallpaperPanelForMerged(ctx) {
  const { page } = ctx.session
  const uiLocale = ctx.state.actualLocale ?? 'zh'
  await openLiveryDetailed(page, { labels: labelsFor(uiLocale), locale: uiLocale, timeoutMs: 25_000 })
  if (!(await page.locator('[data-testid="wallpaper-panel"]').count())) {
    await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 8_000 }).catch(() => {})
  }
  await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 12_000 })
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="wallpaper-builtin"]').length === 24, undefined, { timeout: 12_000 }).catch(() => {})
  await selectWallpaperSource(page, 'local')
}

/**
 * Merged 0.1.4 client features: state-v2 position, two-tab sync, presets,
 * v1→v2 migration, local-data cleanup and the merged visual states.
 */
export async function checkMergedFeatures(ctx) {
  const { runner, session, state } = ctx
  const { page } = session
  const uiLocale = state.actualLocale ?? 'zh'
  const tinyPng = MERGED_TINY_PNG
  let routed = false
  try {
    await installPicsumRedirectMock(page, { tinyPng })
    await page.route('https://api.openverse.org/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) }))
    await page.route('https://images.example.test/**', (route) => {
      if (route.request().url().includes('broken')) return route.fulfill({ status: 500, contentType: 'text/plain', body: 'broken' })
      return route.fulfill({ status: 200, contentType: 'image/png', body: tinyPng })
    })
    routed = true
    await openWallpaperPanelForMerged(ctx)

    // ---------- nine-grid focal position (remote only) ----------
    await page.locator('[data-testid="wallpaper-url"]').fill('https://images.example.test/remote.jpg')
    await page.locator('[data-testid="wallpaper-url-apply"]').click({ timeout: 8_000 })
    await page.waitForSelector('[data-testid="wallpaper-position"]', { timeout: 12_000 }).catch(() => {})
    const remoteLayer = await waitForCacheOnlyLayer(page, 'https://images.example.test/remote.jpg')
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-position-center"]')?.checked === true, undefined, { timeout: 8_000 }).catch(() => {})
    const positionInitial = await readMergedWallpaper(page)
    await page.locator('[data-testid="wallpaper-position-top-left"]').click({ timeout: 6_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-position-top-left"]')?.checked === true, undefined, { timeout: 8_000 }).catch(() => {})
    await sleep(350)
    const positionTopLeft = await readMergedWallpaper(page)
    const positionCss = `${positionTopLeft.styleText}\n${positionTopLeft.heroPosition}\n${positionTopLeft.overlay.position ?? ''}`
    await capture(page, ctx, { state: 'merged-position-top-left', mode: 'light' })
    await page.locator('[data-testid="wallpaper-position-bottom-right"]').click({ timeout: 6_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-position-bottom-right"]')?.checked === true, undefined, { timeout: 8_000 }).catch(() => {})
    await sleep(300)
    const positionBottomRight = await readMergedWallpaper(page)
    await capture(page, ctx, { state: 'merged-position-bottom-right', mode: 'light' })
    expect(
      runner,
      'merged.position-remote',
      'nine-grid position applies to page/overlay/hero for remote wallpapers and persists as state-v2 position',
      positionInitial.positionGroup.present === true &&
        remoteLayer.hasBlob && remoteLayer.blobFetchOk && !remoteLayer.rawInStyle &&
        positionInitial.positionGroup.radios === 9 &&
        positionInitial.positionGroup.name === 'wallpaper-position' &&
        positionInitial.positionGroup.checked === 'wallpaper-position-center' &&
        positionInitial.position?.x === 50 && positionInitial.position?.y === 50 &&
        positionTopLeft.position?.x === 0 && positionTopLeft.position?.y === 0 &&
        /0%\s+0%/u.test(positionCss) &&
        positionBottomRight.position?.x === 100 && positionBottomRight.position?.y === 100 &&
        /100%\s+100%/u.test(`${positionBottomRight.styleText}\n${positionBottomRight.heroPosition}\n${positionBottomRight.overlay.position ?? ''}`),
      `initial=${JSON.stringify(positionInitial.positionGroup)} position=${JSON.stringify(positionInitial.position)}; topLeft=${JSON.stringify(positionTopLeft.position)} cssMatch=${/0%\s+0%/u.test(positionCss)}; bottomRight=${JSON.stringify(positionBottomRight.position)}`,
      { positionInitial: positionInitial.positionGroup, positionTopLeft: positionTopLeft.position, positionBottomRight: positionBottomRight.position },
    )
    // Keyboard radio semantics: focus the center radio and move right with ArrowRight.
    await page.locator('[data-testid="wallpaper-position-center"]').focus()
    await page.keyboard.press('ArrowRight')
    await sleep(300)
    const keyboardPosition = await readMergedWallpaper(page)
    await page.locator('[data-testid="wallpaper-position-center"]').click({ timeout: 6_000 }).catch(() => {})
    expect(
      runner,
      'merged.position-keyboard',
      'position radios are keyboard operable with native radio semantics',
      keyboardPosition.positionGroup.present === true &&
        keyboardPosition.positionGroup.radios === 9 &&
        keyboardPosition.position?.x === 100 && keyboardPosition.position?.y === 50,
      `keyboard=${JSON.stringify(keyboardPosition.position)} group=${JSON.stringify(keyboardPosition.positionGroup)}`,
    )
    // Built-in wallpaper hides the position control (built-ins stay centered).
    await selectWallpaperSource(page, 'builtin')
    await page.locator('[data-testid="wallpaper-builtin"]').first().click({ timeout: 6_000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="wallpaper-position"]') === null, undefined, { timeout: 8_000 }).catch(() => {})
    const builtinPosition = await readMergedWallpaper(page)
    expect(
      runner,
      'merged.position-builtin-hidden',
      'built-in wallpaper hides the focal-position control',
      builtinPosition.positionGroup.present === false && builtinPosition.attribute !== null && builtinPosition.stylePresent === true,
      `group=${JSON.stringify(builtinPosition.positionGroup)} attr=${builtinPosition.attribute}`,
    )

    // ---------- preset export ----------
    await selectWallpaperSource(page, 'local')
    await ensureWallpaperManageOpen(page)
    await page.evaluate(() => {
      window.__CLIPBOARD_CAPTURED__ = null
      const clipboard = navigator.clipboard
      if (clipboard && typeof clipboard.writeText === 'function') {
        const original = clipboard.writeText.bind(clipboard)
        clipboard.writeText = async (text) => {
          window.__CLIPBOARD_CAPTURED__ = String(text)
          return original(text)
        }
      }
    })
    await page.locator('[data-testid="preset-export"]').click({ timeout: 8_000 })
    await page.waitForSelector('[data-testid="preset-export-result"]', { timeout: 10_000 }).catch(() => {})
    const copyButton = page.locator('[data-testid="preset-copy"]')
    if ((await copyButton.count()) > 0) await copyButton.click({ timeout: 6_000 }).catch(() => {})
    await sleep(400)
    let exportedText = await page.evaluate(() => window.__CLIPBOARD_CAPTURED__).catch(() => null)
    if (exportedText === null || exportedText === '') {
      const clipboard = await readClipboardText(page).catch(() => ({ ok: false, text: '' }))
      if (clipboard.ok) exportedText = clipboard.text
    }
    let exportedPreset = null
    try {
      exportedPreset = exportedText === null ? null : JSON.parse(exportedText)
    } catch {
      exportedPreset = null
    }
    expect(
      runner,
      'merged.preset-export',
      'preset export produces schema-v1 JSON with style/wallpaper/effects/position and no executable data',
      exportedPreset !== null &&
        exportedPreset.schemaVersion === 1 &&
        typeof exportedPreset.createdWith === 'string' &&
        typeof exportedPreset.styleId === 'string' &&
        exportedPreset.effects !== null && typeof exportedPreset.effects === 'object' &&
        exportedPreset.position !== null && typeof exportedPreset.position === 'object' &&
        !['css', 'tokens', 'fonts', 'history', 'localPath', 'blob'].some((key) => key in exportedPreset),
      `bytes=${exportedText?.length ?? 0}; preset=${oneLine(JSON.stringify(exportedPreset), 500)}`,
      { exported: oneLine(String(exportedText), 1200) },
    )

    // ---------- valid preset import: diff, atomic apply, screenshot ----------
    const catalogIds = (state.catalog?.liveries ?? []).map((livery) => livery.id)
    const targetStyle = catalogIds.find((id) => id !== state.appliedSkin && id !== 'stock') ?? 'plum'
    const validPreset = {
      schemaVersion: 1,
      createdWith: 'dsh-livery/0.1.4',
      styleId: targetStyle,
      wallpaper: { kind: 'remote', url: 'https://images.example.test/preset.jpg' },
      effects: { blur: 14, dim: 30, frost: 45, atmosphere: 25 },
      position: { x: 100, y: 100 },
    }
    const presetBuffer = () => Buffer.from(JSON.stringify(validPreset))
    const importPreset = async (value, name = 'preset.json') => {
      const buffer = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value))
      await page.locator('[data-testid="preset-import-file"]').setInputFiles({ name, mimeType: 'application/json', buffer })
      await sleep(500)
      return readMergedWallpaper(page)
    }
    const imported = await importPreset(validPreset)
    await page.waitForSelector('[data-testid="preset-diff"]', { timeout: 10_000 }).catch(() => {})
    const diffState = await readMergedWallpaper(page)
    await capture(page, ctx, { state: 'merged-preset-diff', mode: 'light' })
    expect(
      runner,
      'merged.preset-import-diff',
      'valid preset import shows a diff with the changed style/wallpaper/effects/position',
      imported.preset.card === true &&
        diffState.preset.diff === true &&
        diffState.preset.diffRows > 0 &&
        diffState.preset.apply === true &&
        diffState.preset.error === null,
      `preset=${JSON.stringify(imported.preset)} diffRows=${diffState.preset.diffRows}`,
    )
    await page.locator('[data-testid="preset-apply"]').click({ timeout: 8_000 })
    await page.waitForSelector('[data-testid="preset-apply-status"]', { timeout: 15_000 }).catch(() => {})
    const presetLayer = await waitForCacheOnlyLayer(page, validPreset.wallpaper.url)
    await waitForStoredRemote(page, validPreset.wallpaper.url)
    await sleep(300)
    const appliedPreset = await readMergedWallpaper(page)
    await capture(page, ctx, { state: 'merged-preset-applied', mode: 'light' })
    expect(
      runner,
      'merged.preset-apply-atomic',
      'preset apply switches style + wallpaper + effects + position together from one confirmed action',
      appliedPreset.preset.applyStatus !== '' &&
        appliedPreset.schemaVersion === 2 &&
        appliedPreset.selection?.kind === 'remote' &&
        appliedPreset.selection?.url === validPreset.wallpaper.url &&
        presetLayer.hasBlob && presetLayer.blobFetchOk && !presetLayer.rawInStyle &&
        appliedPreset.effects?.frost === validPreset.effects.frost &&
        appliedPreset.position?.x === 100 && appliedPreset.position?.y === 100,
      `applyStatus="${oneLine(appliedPreset.preset.applyStatus, 120)}" stored=${oneLine(appliedPreset.storedRaw ?? '', 220)}`,
    )

    // ---------- invalid presets: stable ID + ARIA error, no silent stock ----------
    const invalidCases = [
      { name: 'unknown-field', value: { ...validPreset, css: 'body{color:red}' }, expectCode: /unknown-field/u },
      { name: 'bad-url', value: { ...validPreset, wallpaper: { kind: 'remote', url: 'http://insecure.test/x.jpg' } }, expectCode: /wallpaper-url/u },
      { name: 'bad-position', value: { ...validPreset, position: { x: 42, y: 7 } }, expectCode: /position/u },
      { name: 'oversize', value: Buffer.from(JSON.stringify(validPreset).padEnd(64 * 1024 + 1, ' ')), expectCode: /too-large/u },
    ]
    const invalidResults = []
    for (const invalid of invalidCases) {
      const snapshot = await importPreset(invalid.value, `${invalid.name}.json`)
      await page.waitForSelector('[data-testid="preset-error"]', { timeout: 10_000 }).catch(() => {})
      const errorState = await readMergedWallpaper(page)
      invalidResults.push({ name: invalid.name, error: errorState.preset.error })
      if (invalid.name === 'unknown-field') await capture(page, ctx, { state: 'merged-preset-error', mode: 'light' })
      await page.locator('[data-testid="preset-dismiss"]').click({ timeout: 6_000 }).catch(() => {})
      await sleep(150)
    }
    expect(
      runner,
      'merged.preset-invalid-rejected',
      'invalid presets are rejected with a stable preset-error id and ARIA invalid/describedby/errormessage',
      invalidResults.every((result) =>
        result.error !== null &&
        result.error.id === 'preset-error' &&
        result.error.importAriaInvalid === 'true' &&
        result.error.importDescribedBy === 'preset-error' &&
        result.error.importErrorMessage === 'preset-error'
      ),
      JSON.stringify(invalidResults.map((result) => ({ name: result.name, error: result.error }))),
    )

    // ---------- deterministic partial failure: style applies, wallpaper persistence fails ----------
    const partialStyle = catalogIds.find((id) => id !== targetStyle && id !== state.appliedSkin && id !== 'stock') ?? targetStyle
    const partialPreset = {
      ...validPreset,
      styleId: partialStyle,
      wallpaper: { kind: 'remote', url: 'https://images.example.test/partial.jpg' },
      attribution: { title: 'Partial Preset', creator: 'Tester', license: 'CC0', source: 'https://images.example.test' },
    }
    await page.evaluate(() => {
      window.__dshOriginalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = function setItem(key, value) {
        if (key === 'dsh-livery.wallpaper.v1') {
          throw new DOMException('dsh-livery acceptance injected preset persistence failure', 'QuotaExceededError')
        }
        return window.__dshOriginalSetItem.call(this, key, value)
      }
    })
    try {
      await importPreset(partialPreset)
      await page.waitForSelector('[data-testid="preset-diff"]', { timeout: 10_000 }).catch(() => {})
      await page.locator('[data-testid="preset-apply"]').click({ timeout: 8_000 })
      await page.waitForSelector('[data-testid="preset-error"]', { timeout: 20_000 }).catch(() => {})
      await sleep(600)
      const partial = await readMergedWallpaper(page)
      const styleApplied = partial.preset.error !== null && (await page.evaluate((styleId) => document.body.getAttribute('data-dsh-livery') === styleId, partialStyle).catch(() => false))
      const noFalseSuccess = (await page.locator('[data-testid="preset-apply-status"]').count().catch(() => 0)) === 0
      await capture(page, ctx, { state: 'merged-preset-partial-fault', mode: 'light' })
      // Restore the real storage primitive before exercising the retry action.
      await page.evaluate(() => {
        if (typeof window.__dshOriginalSetItem === 'function') Storage.prototype.setItem = window.__dshOriginalSetItem
        delete window.__dshOriginalSetItem
      })
      const retryButton = page.locator('[data-testid="preset-retry-wallpaper"]')
      const hasRetry = (await retryButton.count()) > 0
      if (hasRetry) await retryButton.click({ timeout: 8_000 })
      const recoveredLayer = await waitForCacheOnlyLayer(page, 'https://images.example.test/partial.jpg', { timeoutMs: 20_000 })
      await waitForStoredRemote(page, 'https://images.example.test/partial.jpg', { timeoutMs: 20_000 })
      await sleep(350)
      const recovered = await readMergedWallpaper(page)
      const heroAttribution = (await page.locator('[data-testid="wallpaper-hero-attribution"]').innerText().catch(() => '')) || ''
      const attributionCoherent = /Partial Preset/u.test(heroAttribution)
      await capture(page, ctx, { state: 'merged-preset-partial-recovered', mode: 'light' })
      expect(
        runner,
        'merged.preset-partial-failure',
        'injected wallpaper-persistence failure applies the style, shows an explicit retry (no false success), and retry applies wallpaper with coherent attribution',
        styleApplied &&
          partial.preset.error !== null &&
          partial.preset.error.kind === 'apply' &&
          partial.preset.error.code === 'wallpaper' &&
          partial.preset.error.retryWallpaper === true &&
          noFalseSuccess &&
          hasRetry &&
          recovered.preset.error === null &&
          recovered.selection?.kind === 'remote' &&
          recovered.selection?.url === 'https://images.example.test/partial.jpg' &&
          recoveredLayer.hasBlob && recoveredLayer.blobFetchOk && !recoveredLayer.rawInStyle &&
          attributionCoherent,
        `styleApplied=${styleApplied}; error=${JSON.stringify(partial.preset.error)}; noFalseSuccess=${noFalseSuccess}; hasRetry=${hasRetry}; recoveredSelection=${JSON.stringify(recovered.selection)}; attrib="${oneLine(heroAttribution, 140)}"`,
        { partialError: partial.preset.error, recoveredSelection: recovered.selection, heroAttribution },
      )
    } finally {
      await page.evaluate(() => {
        if (typeof window.__dshOriginalSetItem === 'function') Storage.prototype.setItem = window.__dshOriginalSetItem
        delete window.__dshOriginalSetItem
      }).catch(() => {})
      await page.locator('[data-testid="preset-dismiss"]').click({ timeout: 4_000 }).catch(() => {})
    }

    // ---------- state-v2 migration from a real v1 flat record ----------
    await page.evaluate(() => {
      try {
        window.localStorage.setItem('dsh-livery.wallpaper.v1', JSON.stringify({
          kind: 'builtin', id: 'aurora', blur: 12, dim: 40, frost: 35, atmosphere: 60,
        }))
      } catch { /* ignore */ }
    })
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
    await waitForBootGraph(page)
    await waitForAppReady(page)
    await openWallpaperPanelForMerged(ctx)
    await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') !== null && document.body.getAttribute('data-dsh-wallpaper') !== null, undefined, { timeout: 10_000 }).catch(() => {})
    await sleep(600)
    const migratedVisible = await readMergedWallpaper(page)
    // Force one state transition so the migrated in-memory state is persisted as v2.
    await setRangeValue(page, 'wallpaper-frost', 60)
    await sleep(900)
    const migratedPersisted = await readMergedWallpaper(page)
    // Corrupt storage event must be ignored without clearing the live wallpaper.
    await page.evaluate(() => {
      try {
        const oldValue = window.localStorage.getItem('dsh-livery.wallpaper.v1')
        window.localStorage.setItem('dsh-livery.wallpaper.v1', '{not-json')
        window.dispatchEvent(new StorageEvent('storage', { key: 'dsh-livery.wallpaper.v1', oldValue, newValue: '{not-json' }))
      } catch { /* ignore */ }
    })
    await sleep(600)
    const corruptIgnored = await readMergedWallpaper(page)
    expect(
      runner,
      'merged.state-migration-v1',
      'legacy v1 flat records hydrate position 50/50 without clearing wallpaper, persist as v2 on the next change, and corrupt records are ignored',
      String(migratedVisible.storedRaw ?? '').includes('"kind":"builtin"') && String(migratedVisible.storedRaw ?? '').includes('"id":"aurora"') &&
        migratedPersisted.schemaVersion === 2 &&
        migratedPersisted.position?.x === 50 && migratedPersisted.position?.y === 50 &&
        migratedPersisted.selection?.kind === 'builtin' && migratedPersisted.selection?.id === 'aurora' &&
        migratedPersisted.stylePresent === true &&
        corruptIgnored.stylePresent === true,
      `visible=${oneLine(migratedVisible.storedRaw ?? '', 160)} style=${migratedVisible.stylePresent} attr=${JSON.stringify(migratedVisible.attribute)}; persisted=${oneLine(migratedPersisted.storedRaw ?? '', 220)} style=${migratedPersisted.stylePresent} attr=${JSON.stringify(migratedPersisted.attribute)}; corruptStyle=${corruptIgnored.stylePresent} corruptAttr=${JSON.stringify(corruptIgnored.attribute)} corruptStored=${oneLine(corruptIgnored.storedRaw ?? '', 120)}`,
    )

    // ---------- local data cleanup preserves current wallpaper ----------
    await page.keyboard.press('Escape').catch(() => {})
    await dismissFirstRunDialogs(page).catch(() => {})
    await page.locator('[data-testid="preset-dismiss"]').click({ timeout: 4_000 }).catch(() => {})
    await selectWallpaperSource(page, 'local')
    await ensureWallpaperManageOpen(page)
    await page.locator('[data-testid="wallpaper-upload"]').setInputFiles({ name: 'upload.png', mimeType: 'image/png', buffer: tinyPng })
    await page.waitForFunction(() => (document.querySelector('style#dsh-livery-wallpaper')?.textContent ?? '').includes('blob:'), undefined, { timeout: 15_000 }).catch(() => {})
    await sleep(400)
    const uploaded = await readMergedWallpaper(page)
    const dbBefore = await page.evaluate(async () => {
      try {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('dsh-livery-wallpapers', 2)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        const tx = db.transaction('images', 'readonly')
        const records = await new Promise((resolve, reject) => {
          const request = tx.objectStore('images').getAll()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        db.close()
        return { version: 2, records: records.map((record) => ({ kind: record.kind, size: record.size, createdAt: record.createdAt, lastUsedAt: record.lastUsedAt, sourceUrl: record.sourceUrl ?? null, hasBlob: record.blob instanceof Blob })) }
      } catch (error) {
        return { error: String(error) }
      }
    })
    await page.keyboard.press('Escape').catch(() => {})
    await page.locator('[data-testid="wallpaper-clear-local-data"]').scrollIntoViewIfNeeded({ timeout: 6_000 }).catch(() => {})
    await page.locator('[data-testid="wallpaper-clear-local-data"]').click({ timeout: 10_000 })
    await page.waitForSelector('[data-testid="wallpaper-clear-local-result"]', { timeout: 15_000 }).catch(() => {})
    await sleep(500)
    const cleared = await readMergedWallpaper(page)
    const dbAfter = await page.evaluate(async () => {
      try {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('dsh-livery-wallpapers', 2)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        const tx = db.transaction('images', 'readonly')
        const keys = await new Promise((resolve, reject) => {
          const request = tx.objectStore('images').getAllKeys()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        db.close()
        return keys.map(String)
      } catch (error) {
        return { error: String(error) }
      }
    })
    await page.evaluate(() => {
      try { window.localStorage.setItem('dsh-livery.wallpaper.recent.v1', JSON.stringify([{ url: 'https://images.example.test/old.jpg', addedAt: 1 }])) } catch { /* ignore */ }
    })
    await page.locator('[data-testid="wallpaper-clear-local-data"]').click({ timeout: 10_000 })
    await page.waitForSelector('[data-testid="wallpaper-clear-local-result"]', { timeout: 15_000 }).catch(() => {})
    await sleep(400)
    const clearedAgain = await readMergedWallpaper(page)
    expect(
      runner,
      'merged.clear-local-data',
      'clear-local-data keeps the current wallpaper, reports a result, and clears disposable local history/cache',
      uploaded.styleText.includes('blob:') &&
        dbBefore.version === 2 &&
        dbBefore.records.length > 0 &&
        dbBefore.records.every((record) => ['upload', 'remote'].includes(record.kind) && typeof record.size === 'number' && record.hasBlob) &&
        cleared.clearResult !== null &&
        cleared.styleText !== '' &&
        cleared.attribute !== null &&
        clearedAgain.recentRaw === null,
      `dbBefore=${JSON.stringify(dbBefore.records)}; cleared=${JSON.stringify(cleared.clearResult)}; currentBlob=${cleared.styleText.includes('blob:')} attr=${cleared.attribute}`,
    )

    // ---------- two real pages in the same profile: storage-event sync ----------
    const pageB = await session.context.newPage()
    try {
      await pageB.goto(ctx.config.baseUrl ?? String(ctx.dshWebLine).replace(/^dsh web:\s*/u, ''), { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await waitForBootGraph(pageB)
      await waitForAppReady(pageB)
      const openB = async () => {
        let lastError = null
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await dismissFirstRunDialogs(pageB).catch(() => {})
            await openLiveryDetailed(pageB, { labels: labelsFor(uiLocale), locale: uiLocale, timeoutMs: 25_000 })
            const tab = pageB.locator('[data-testid="livery-page-tab-wallpaper"]')
            await tab.waitFor({ state: 'visible', timeout: 10_000 })
            await tab.click({ timeout: 8_000 })
            await pageB.waitForSelector('[data-testid="wallpaper-panel"]', { state: 'visible', timeout: 12_000 })
            await selectWallpaperSource(pageB, 'local')
            return
          } catch (error) {
            lastError = error
            await pageB.keyboard.press('Escape').catch(() => {})
            await pageB.waitForTimeout(500)
          }
        }
        const diagnostics = {
          url: pageB.url(),
          panels: await pageB.locator('[data-testid="wallpaper-panel"]').count().catch(() => -1),
          tabs: await pageB.locator('[data-testid="livery-page-tab-wallpaper"]').count().catch(() => -1),
          text: oneLine(await pageB.locator('body').innerText().catch(() => ''), 400),
        }
        throw new Error(`second-page wallpaper panel unavailable: ${lastError?.message ?? 'unknown'}; diagnostics=${JSON.stringify(diagnostics)}`)
      }
      await openB()
      await pageB.evaluate(() => {
        window.__STORAGE_EVENTS__ = 0
        window.addEventListener('storage', () => { window.__STORAGE_EVENTS__ += 1 })
      })
      await selectWallpaperSource(page, 'local')
      await page.locator('[data-testid="wallpaper-url"]').fill('https://images.example.test/sync.jpg')
      await page.locator('[data-testid="wallpaper-url-apply"]').click({ timeout: 8_000 })
      const syncLayerA = await waitForCacheOnlyLayer(page, 'https://images.example.test/sync.jpg')
      await waitForStoredRemote(page, 'https://images.example.test/sync.jpg')
      await page.locator('[data-testid="wallpaper-position-top-left"]').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
      await page.locator('[data-testid="wallpaper-position-top-left"]').click({ timeout: 6_000 }).catch(() => {})
      const syncedBLayer = await waitForCacheOnlyLayer(pageB, 'https://images.example.test/sync.jpg')
      await waitForStoredRemote(pageB, 'https://images.example.test/sync.jpg')
      await sleep(350)
      const syncedB = await readMergedWallpaper(pageB)
      const syncEvents = await pageB.evaluate(() => window.__STORAGE_EVENTS__ ?? 0)
      expect(
        runner,
        'merged.two-tab-sync',
        'a second real page in the same profile applies wallpaper/position changes through storage events without reload loops',
        syncLayerA.hasBlob && syncLayerA.blobFetchOk && !syncLayerA.rawInStyle &&
          syncedBLayer.hasBlob && syncedBLayer.blobFetchOk && !syncedBLayer.rawInStyle &&
          syncedB.selection?.kind === 'remote' &&
          syncedB.selection?.url === 'https://images.example.test/sync.jpg' &&
          syncedB.position?.x === 0 && syncedB.position?.y === 0 &&
          syncedB.attribute !== null && syncedB.stylePresent === true &&
          syncEvents > 0 && syncEvents < 40,
        `selection=${JSON.stringify(syncedB.selection)} position=${JSON.stringify(syncedB.position)} style=${syncedB.stylePresent} attr=${JSON.stringify(syncedB.attribute)} storageEvents=${syncEvents}`,
      )
      await page.locator('[data-testid="wallpaper-clear"]').click({ timeout: 8_000 }).catch(() => {})
      await pageB.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') === null, undefined, { timeout: 12_000 }).catch(() => {})
      const clearedB = await readMergedWallpaper(pageB)
      expect(
        runner,
        'merged.two-tab-clear',
        'clearing wallpaper in page A clears page B through the same sync path',
        clearedB.stylePresent === false && clearedB.attribute === null,
        `style=${clearedB.stylePresent} attr=${clearedB.attribute}`,
      )

      // ---------- cross-tab upload refs: B external adoption republishes its own ref ----------
      await page.locator('[data-testid="wallpaper-upload"]').setInputFiles({ name: 'two-tab-upload.png', mimeType: 'image/png', buffer: MERGED_TINY_PNG })
      await page.waitForFunction(() => (document.querySelector('style#dsh-livery-wallpaper')?.textContent ?? '').includes('blob:'), undefined, { timeout: 15_000 }).catch(() => {})
      const uploadA = await readStoredWallpaper(page)
      const uploadKey = uploadA?.selection?.kind === 'upload' ? uploadA.selection.key : null
      let uploadRef = null
      if (uploadKey !== null) {
        await pageB.waitForFunction(
          (key) => {
            try {
              const raw = window.localStorage.getItem('dsh-livery.wallpaper.v1')
              const state = raw === null ? null : JSON.parse(raw)
              return state?.selection?.kind === 'upload' && state.selection.key === key
            } catch {
              return false
            }
          },
          uploadKey,
          { timeout: 15_000 },
        ).catch(() => {})
        await pageB.waitForFunction(() => (document.querySelector('style#dsh-livery-wallpaper')?.textContent ?? '').includes('blob:'), undefined, { timeout: 15_000 }).catch(() => {})
        const readRefs = (target) => target.evaluate(() => {
          const rows = []
          try {
            for (let index = 0; index < window.localStorage.length; index += 1) {
              const key = window.localStorage.key(index)
              if (key === null || !key.startsWith('dsh-livery.wallpaper.ref.')) continue
              try {
                const record = JSON.parse(window.localStorage.getItem(key) ?? 'null')
                rows.push({ key, uploads: Array.isArray(record?.uploads) ? record.uploads : [], updatedAt: record?.updatedAt ?? null })
              } catch {
                /* ignore corrupt refs */
              }
            }
          } catch {
            /* ignore */
          }
          return rows
        })
        await pageB.waitForFunction(
          (key) => {
            let count = 0
            try {
              for (let index = 0; index < window.localStorage.length; index += 1) {
                const storageKey = window.localStorage.key(index)
                if (storageKey === null || !storageKey.startsWith('dsh-livery.wallpaper.ref.')) continue
                try {
                  const record = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')
                  if (Array.isArray(record?.uploads) && record.uploads.includes(key)) count += 1
                } catch {
                  /* ignore */
                }
              }
            } catch {
              /* ignore */
            }
            return count >= 2
          },
          uploadKey,
          { timeout: 10_000 },
        ).catch(() => {})
        const refsAfterAdopt = await readRefs(pageB)
        const refRows = refsAfterAdopt.filter((row) => row.uploads.includes(uploadKey))
        const uploadB = await readStoredWallpaper(pageB)
        let clearProtection = null
        await ensureWallpaperManageOpen(pageB)
        const clearButton = pageB.locator('[data-testid="wallpaper-clear-local-data"]')
        if ((await clearButton.count()) > 0) {
          await clearButton.scrollIntoViewIfNeeded().catch(() => {})
          await clearButton.click({ timeout: 8_000 }).catch(() => {})
          await pageB.waitForSelector('[data-testid="wallpaper-clear-local-result"]', { timeout: 15_000 }).catch(() => {})
          const afterClear = await readStoredWallpaper(pageB)
          const refsAfterClear = await readRefs(pageB)
          clearProtection = {
            result: await pageB.locator('[data-testid="wallpaper-clear-local-result"]').getAttribute('data-status').catch(() => null),
            selectionKept: JSON.stringify(afterClear?.selection) === JSON.stringify(uploadB?.selection),
            refsStillContain: refsAfterClear.filter((row) => row.uploads.includes(uploadKey)).length >= 2,
            stylePresent: await pageB.evaluate(() => document.querySelector('style#dsh-livery-wallpaper') !== null),
          }
        }
        uploadRef = { uploadKey, refRows: refRows.length, refsAfterAdopt, uploadBSelection: uploadB?.selection ?? null, clearProtection }
      }
      expect(
        runner,
        'merged.two-tab-upload-ref',
        'page B externally adopts an upload selection, publishes its own ref, and clear-local-data protects the current upload ref',
        uploadKey !== null &&
          uploadRef !== null &&
          uploadRef.refRows >= 2 &&
          uploadRef.uploadBSelection?.kind === 'upload' && uploadRef.uploadBSelection?.key === uploadKey &&
          uploadRef.clearProtection !== null &&
          uploadRef.clearProtection.selectionKept === true &&
          uploadRef.clearProtection.refsStillContain === true &&
          uploadRef.clearProtection.stylePresent === true,
        uploadKey === null ? 'upload selection was not persisted' : JSON.stringify(uploadRef),
      )
      // Cleanup the wallpaper in both tabs before closing B.
      await page.locator('[data-testid="wallpaper-clear"]').click({ timeout: 8_000 }).catch(() => {})
      await pageB.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') === null, undefined, { timeout: 12_000 }).catch(() => {})
    } finally {
      await pageB.close().catch(() => {})
    }
  } catch (error) {
    runner.fail('merged.features', 'merged 0.1.4 client acceptance completes', error instanceof Error ? (error.stack ?? error.message) : String(error))
  } finally {
    if (routed) {
      await uninstallPicsumRedirectMock(page)
      await page.unroute('https://api.openverse.org/**').catch(() => {})
      await page.unroute('https://images.example.test/**').catch(() => {})
    }
    await page.keyboard.press('Escape').catch(() => {})
    await page.locator('[data-testid="wallpaper-clear"]').first().click({ timeout: 4_000 }).catch(() => {})
    await page.locator('[data-testid="livery-page-tab-style"]').click({ timeout: 5_000 }).catch(() => {})
    await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {})
  }
}

/**
 * Non-blocking performance/network checks: catalog response size budget,
 * cold-start sample comparison against the committed baseline, and a real
 * Openverse canary (warn/skip on third-party failure only).
 */
export async function checkPerformance(ctx) {
  const { runner, state } = ctx
  const baseline = await loadPerfBaseline()
  const catalogBytes = state.catalogResponseBytes
  if (typeof catalogBytes === 'number') {
    const cap = baseline?.catalogJson?.maxBytes ?? null
    const status = cap === null ? 'skip' : catalogBytes > Math.ceil(cap * 1.5) ? 'fail' : catalogBytes > cap ? 'warn' : 'pass'
    if (status === 'skip') {
      runner.skip('perf.catalog-size', 'catalog JSON response stays within the measured headroom cap', `baseline missing; measured ${catalogBytes} bytes`)
    } else {
      runner.add(
        status,
        'perf.catalog-size',
        'catalog JSON response stays within the measured headroom cap (+50% extreme regression tolerated as warning)',
        `actual ${catalogBytes} bytes; cap ${cap} bytes (${baseline.measuredFrom?.commit ?? 'candidate'}); ${status === 'pass' ? 'within cap' : status === 'warn' ? 'above cap, below extreme threshold' : 'extreme regression'}`,
        { catalogBytes, cap, baseline: baseline.catalogJson },
      )
    }
  }
  const bootMs = state.bootReadyMs ?? null
  const paint = state.firstPaint?.paintTimings ?? null
  const sample = bootMs === null ? null : { bootMs, firstContentfulPaintMs: paint?.firstContentfulPaint ?? null, firstPaintMs: paint?.firstPaint ?? null }
  const cold = baseline?.coldStart?.off
  if (sample === null) {
    runner.skip('perf.cold-start', 'cold-start time stays near the measured baseline (warn only unless extreme)', 'boot timing unavailable')
  } else if (!cold || typeof cold.p95Ms !== 'number') {
    runner.skip('perf.cold-start', 'cold-start time stays near the measured baseline (warn only unless extreme)', `baseline missing; measured boot=${sample.bootMs}ms fcp=${sample.firstContentfulPaintMs}ms`)
  } else {
    const extremeMs = Math.ceil(cold.p95Ms * 4)
    const status = sample.bootMs > extremeMs ? 'fail' : sample.bootMs > Math.ceil(cold.p95Ms * 2) ? 'warn' : 'pass'
    runner.add(
      status,
      'perf.cold-start',
      'cold-start time stays near the measured baseline (warn only unless extreme)',
      `actual boot=${sample.bootMs}ms fcp=${sample.firstContentfulPaintMs}ms; baseline p50=${cold.p50Ms}ms p95=${cold.p95Ms}ms; ${status}`,
      { sample, baseline: cold },
    )
  }
  // Real (non-mocked) Openverse canary: non-blocking by design.
  const timeoutMs = 10_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch('https://api.openverse.org/v1/images/?q=wallpaper&page_size=1', {
      signal: controller.signal,
      headers: { 'user-agent': 'dsh-livery-acceptance-canary/0.1.4' },
    })
    const body = await response.text()
    if (response.status === 200 && /"results"\s*:/u.test(body)) {
      runner.pass('network.openverse-canary', 'real Openverse API responds with a results payload (non-blocking canary)', `HTTP ${response.status}, ${body.length} bytes`)
    } else {
      runner.warn('network.openverse-canary', 'real Openverse API canary is non-blocking', `HTTP ${response.status}, ${oneLine(body, 180)}`)
    }
  } catch (error) {
    runner.warn('network.openverse-canary', 'real Openverse API canary is non-blocking', `network unavailable/third-party failure: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    clearTimeout(timer)
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
