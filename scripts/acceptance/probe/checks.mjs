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
  inspectPanellist,
  liveryPanelRoot,
  liveryPanelVisible,
  openLiveryDetailed,
  PANEL_NAV_VIA,
  readCardNames,
  readGallery,
  readHostStyleProbe,
  readLocaleTab,
  readThumbLocales,
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

/** Round-5 style system: the catalog ships 24 designs per profile. */
const MIN_LIVERIES = 24

/** Per-livery rendered CSS hard budget (style-system.md §5). */
const CSS_BUDGET_BYTES = 12 * 1024

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
    runner.skip('previews.profile-isolation', 'previews are served per catalog profile', 'no catalog profile advertised (legacy single-profile build)')
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
      (localeTab.title ?? '').length > 0,
    `texts=[${(localeTab.buttons ?? []).map((button) => `${button.choice}:"${button.text}"`).join(', ')}]; title="${oneLine(localeTab.title ?? '', 100)}"`,
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

  // Self-check must name the live certified identity (multi-version §6).
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
  // CSS size budgets (docs/design/implementation-plan.md §18.8): active skin CSS target
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

  // Whole-document MutationObserver authorship: the shell installs its own
  // document-level observer, so count only observers whose creation stack names
  // the Livery bundle. Any such observer is a plan §18.3/§20 violation.
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
