/**
 * Real `0.2.1 → 0.2.2` update probe for the Web profile.
 *
 * This is the executable form of `docs/design/0.2.2-plan.md` §5.4: an isolated
 * `DSH_HOME` first installs the exact previously accepted tarball (the `0.2.1`
 * fixture) through the official plugin path, the declared Host is booted, and
 * the candidate tarball is then installed through the **running Host's own
 * plugin manager**: Plugins → "Add plugin" → the absolute `file:` path of the
 * exact candidate tarball. The Host must apply the change in process (its HMR
 * loop replaces the client bundle), so the browser must not navigate or reload:
 * the first-frame payload still says `0.2.1` while the live client build is
 * `0.2.2`, the client classifies the startup frame as `stale`, re-fetches and
 * re-applies the catalog, and the plugin-detail surface renders that state.
 *
 * Nothing here mutates the user's real profile: the caller passes an isolated
 * `DSH_HOME` under `.tmp/acceptance/`, and the from/candidate tarballs must be
 * exact files (the from side must match a committed evidence artifact).
 *
 * If the Host dialog cannot be driven (page/dialog selectors change, install
 * refused, restart required) the probe records the standard `update.*` checks as
 * failures/skips with the real reason. There is no fallback that bypasses the
 * Host's plugin manager and no synthetic pass.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  REQUIRED_UPDATE_CHECKS,
  UPDATE_MANAGER_OUTCOMES,
  UPDATE_TRANSITION_TRIGGERS,
  findAcceptedArtifactEvidence,
  validateTransition,
} from '../../release-lib.mjs'
import { labelsFor } from './labels.mjs'
import { WORKSPACE_ROOT, oneLine, redact, sleep } from './util.mjs'
import { profilePaths } from './dsh-home.mjs'
import {
  openLiveryDetailed,
  openPluginBundleDetail,
  openPluginsPanel,
  readPluginDetail,
  readThemeSnapshot,
  waitForAppReady,
} from './browser.mjs'

export { REQUIRED_UPDATE_CHECKS }

/** Global key carrying the update-run window sentinel. */
export const UPDATE_SENTINEL_GLOBAL = '__LIVERY_UPDATE_SENTINEL__'

/** Version whose first-frame payload the newer client must accept as `stale`. */
export const STALE_BOOT_FROM_VERSION = '0.2.1'

/** Baselines the update probe pins so a page reload cannot pass silently. */
const NAVIGATION_ENTRY_TYPE = 'navigation'
const CATALOG_PATH = '/livery/api/catalog'
const CLIENT_BUNDLE_PATTERN = /\/dsh-livery\/client\.js|\?\?dsh-livery\/client\.(?:js|css)/

/** Frozen plugin-detail copy of the shipped 0.2.2 dictionaries (zh/en). */
const COPY = {
  zh: {
    addPlugin: '添加插件',
    installSpec: '包名或地址',
    installButton: /^安装$/u,
    closeButton: /^(关闭|完成)$/u,
    closeDialog: /^(关闭|完成)$/u,
    staleHandshake: '已热更新',
    catalogReady: '已加载',
    staleBoundary: '已热更新；启动画面来自上一构建。',
    restartNotice: /重启\s*DSH|restart\s*DSH/iu,
    dialogTitle: /^(添加插件|安装插件)$/u,
  },
  en: {
    addPlugin: 'Add plugin',
    installSpec: 'Package name or address',
    installButton: /^Install$/u,
    closeButton: /^(Close|Done)$/u,
    closeDialog: /^(Close|Done)$/u,
    staleHandshake: 'Updated in place',
    catalogReady: 'Loaded',
    staleBoundary: 'Updated in place; startup frame from previous build.',
    restartNotice: /restart\s*DSH/iu,
    dialogTitle: /^(Add plugin|Install plugin)$/u,
  },
}

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Read one local plugin tarball's exact identity: package name/version from its
 * packaged `package.json`, plus sha256 and byte count of the file itself.
 * @param tarball - path to a `.tgz` produced by `pnpm pack`/`npm pack`.
 * @returns exact artifact identity.
 */
export function readTarballIdentity(tarball) {
  const resolved = path.resolve(tarball)
  const bytes = readFileSync(resolved)
  let manifest
  try {
    manifest = JSON.parse(execFileSync('tar', ['-xOzf', resolved, 'package/package.json'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }))
  } catch (error) {
    throw new Error(`update probe: ${resolved} is not a readable packed plugin tarball: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (typeof manifest?.name !== 'string' || typeof manifest?.version !== 'string') {
    throw new Error(`update probe: ${resolved} has no package name/version`)
  }
  return {
    path: resolved,
    name: manifest.name,
    version: manifest.version,
    sha256: sha256Bytes(bytes),
    bytes: bytes.length,
  }
}

/**
 * Verify the `--update-from` artifact against committed acceptance evidence.
 *
 * The transition's `from` side is not any local build: it must be the exact
 * artifact an earlier committed evidence document already accepted. A fixture
 * whose sha256/bytes/version do not match any committed evidence file is
 * refused with the concrete reason.
 * @param options - tarball path and repository root.
 * @returns from artifact identity plus the committed evidence files binding it.
 */
export function verifyUpdateSource({ fromTgz, root = WORKSPACE_ROOT }) {
  const from = readTarballIdentity(fromTgz)
  const matches = findAcceptedArtifactEvidence(
    { version: from.version, sha256: from.sha256, bytes: from.bytes },
    { root },
  )
  if (matches.length === 0) {
    throw new Error(
      `update probe: --update-from ${from.path} (${from.name}@${from.version}, ${from.bytes} B, sha256 ${from.sha256}) `
      + 'matches no committed contracts/dsh/evidence/**/*.json artifact; the from side must be a previously accepted tarball',
    )
  }
  return {
    from,
    evidence: matches.map((match) => match.file),
  }
}

/**
 * Pre-seed the isolated profile with an active Livery configuration before boot.
 *
 * An update probe needs the previous build's first-frame payload to survive into
 * the updated page (that payload is what the new client classifies as `stale`),
 * and the payload only exists when Livery is active at boot. Writing the same
 * `- id: livery` config row the Host's own config editor writes makes the
 * transition realistic: a user who runs 0.2.1 with a style then updates it. The
 * row lives in the isolated profile patch only.
 * @param options - isolated home, package name and the livery to configure.
 * @returns the patch file and whether a row was added.
 */
export async function writeUpdateBaselineConfig({ home, packageName = 'dsh-livery', liveryId = 'fjord', profileName = 'web' }) {
  const paths = profilePaths(home, profileName)
  const { readFile: readPatch, writeFile: writePatch } = await import('node:fs/promises')
  const existing = await readPatch(paths.patchFile, 'utf8').catch(() => '')
  if (/^- id: livery\b/m.test(existing)) {
    const updated = existing.replace(/(^- id: livery\b[\s\S]*?skinId\s*:\s*)[^\s#]+/m, `$1${liveryId}`)
    if (updated !== existing) await writePatch(paths.patchFile, updated, 'utf8')
    return { patchFile: paths.patchFile, added: false, liveryId }
  }
  const row = `- id: livery\n  name: ${packageName}\n  config:\n    skinId: ${liveryId}\n`
  const separator = existing.length === 0 || existing.endsWith('\n') ? '' : '\n'
  await writePatch(paths.patchFile, `${existing}${separator}${row}`, 'utf8')
  return { patchFile: paths.patchFile, added: true, liveryId }
}

/**
 * Install the candidate through the running Host's "Add plugin" dialog.
 *
 * The dialog accepts an absolute local path (the Host parses it as a tarball
 * spec), so the probe never touches the profile files itself. The install runs
 * pnpm inside the Host process; the returned `managerOutcome` is the Host's own
 * application answer: `applied` (published into the live process),
 * `restart-required`, `failed`, `unconfirmed` or `cancelled`.
 * @param page - Playwright page already showing the Plugins panel.
 * @param candidate - exact candidate identity from {@link readTarballIdentity}.
 * @param context - locale + timeout options.
 * @returns observed dialog phases and the manager outcome.
 */
export async function installCandidateThroughHostDialog(page, candidate, { locale = 'zh', timeoutMs = 300_000 } = {}) {
  const copy = COPY[locale === 'en' ? 'en' : 'zh']
  const phases = []
  const startedAt = Date.now()
  const addButton = page
    .locator(`[data-plugin-panel] button[aria-label="${copy.addPlugin}"]`)
    .first()
  await addButton.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {})
  if ((await addButton.count()) === 0) {
    throw new Error(`plugin-manager "Add plugin" button (${copy.addPlugin}) not found on the Plugins page`)
  }
  await addButton.click({ timeout: 15_000 })
  const specInput = page
    .locator(`input[aria-label="${copy.installSpec}"]`)
    .first()
  await specInput.waitFor({ state: 'visible', timeout: 20_000 })
  const spec = `file:${candidate.path}`
  await specInput.fill(spec)
  const installButton = page.getByRole('button', { name: copy.installButton }).last()
  await installButton.waitFor({ state: 'visible', timeout: 15_000 })
  await installButton.click({ timeout: 15_000 })

  // The dialog spends a moment inspecting the spec, then hands it to pnpm and
  // finally reports the application outcome. Poll the dialog's own phase marker.
  let phase = null
  let heading = ''
  let dialogText = ''
  let failureText = null
  let restartRequired = false
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const snapshot = await page
      .evaluate(() => {
        const wizard = document.querySelector('[data-install-phase]')
        const body = document.querySelector('[role="dialog"]')
        const alert = document.querySelector('[role="dialog"] [role="alert"]')
        return {
          phase: wizard?.getAttribute('data-install-phase') ?? null,
          heading: (wizard?.querySelector('h2')?.textContent ?? body?.querySelector('h2')?.textContent ?? '').trim(),
          text: (wizard?.innerText ?? body?.innerText ?? '').slice(0, 4_000),
          alert: alert?.textContent?.trim() ?? null,
          closed: body === null,
        }
      })
      .catch(() => ({ phase: null, heading: '', text: '', alert: null, closed: false }))
    if (snapshot.phase !== null && snapshot.phase !== phase) {
      phase = snapshot.phase
      phases.push(phase)
    }
    if (snapshot.heading.length > 0) heading = snapshot.heading
    if (snapshot.text.length > 0) dialogText = snapshot.text
    if (phase === 'done' || phase === 'failed') break
    if (snapshot.closed && phase === null) {
      throw new Error(`plugin-manager install dialog closed before any phase was observed (alert: ${snapshot.alert ?? '(none)'})`)
    }
    if (snapshot.alert !== null && phase === null && Date.now() - startedAt > 20_000) {
      throw new Error(`plugin-manager refused the candidate install: ${snapshot.alert}`)
    }
    await sleep(400)
  }
  if (phase === 'done' && dialogText.length > 0) restartRequired = copy.restartNotice.test(dialogText)
  const managerOutcome = phase === 'done'
    ? (restartRequired ? 'restart-required' : 'applied')
    : phase === 'failed'
      ? 'failed'
      : phase === 'cancelled'
        ? 'cancelled'
        : 'unconfirmed'
  if (phase === 'failed') {
    failureText = dialogText.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 4).join(' | ')
  }
  // Close the dialog without enabling/retrying anything: the bundle was already
  // selected in the profile before the update.
  await page.keyboard.press('Escape').catch(() => {})
  await sleep(400)
  const stillOpen = await page.locator('[role="dialog"] [data-install-phase]').count().catch(() => 0)
  if (stillOpen > 0) {
    const close = page.getByRole('button', { name: copy.closeDialog }).last()
    await close.click({ timeout: 8_000 }).catch(() => {})
  }
  return {
    trigger: UPDATE_TRANSITION_TRIGGERS[0],
    spec: spec.replace(candidate.path, `<candidate:${pname(candidate.path)}>`),
    phases,
    phase,
    managerOutcome,
    restartRequired,
    heading: redact(heading),
    failureText: failureText === null ? null : redact(failureText),
    dialogTail: oneLine(redact(dialogText), 600),
    durationMs: Date.now() - startedAt,
    expectedOutcomes: UPDATE_MANAGER_OUTCOMES,
  }
}

function pname(file) {
  return path.basename(String(file ?? ''))
}

/**
 * Apply one catalogue livery through the Livery panel so the update has a saved
 * configuration to re-apply: the probe proves the stale client re-applies the
 * confirmed style after it re-fetches the updated catalog.
 * @param page - Playwright page on the Livery panel.
 * @param liveryId - catalog livery id to apply.
 * @returns applied snapshot (body attribute + css hash) and panel version text.
 */
export async function applyBaselineLivery(page, liveryId = 'fjord') {
  const card = page.locator(`[data-testid="livery-card"][data-livery-id="${liveryId}"]`).first()
  await card.waitFor({ state: 'visible', timeout: 20_000 })
  await card.click({ timeout: 10_000 })
  await page.waitForFunction(
    (id) => document.body.getAttribute('data-dsh-livery') === id,
    liveryId,
    { timeout: 15_000 },
  )
  const apply = page.locator('[data-testid="livery-apply"]').first()
  await apply.waitFor({ state: 'visible', timeout: 15_000 })
  await apply.click({ timeout: 10_000 })
  await page.waitForFunction(
    (id) => document.body.getAttribute('data-dsh-livery') === id
      && (document.body.getAttribute('data-dsh-livery-hash') ?? '').length > 0,
    liveryId,
    { timeout: 20_000 },
  )
  const snapshot = await readThemeSnapshot(page)
  return {
    liveryId,
    bodyAttribute: snapshot.bodyAttribute,
    bodyHash: snapshot.bodyHash,
    panelVersion: (await page.locator('[data-testid="livery-version"]').first().textContent().catch(() => ''))?.trim() ?? null,
  }
}

/**
 * Read the update-run sentinel and the current in-page facts without navigating.
 * @param page - Playwright page.
 * @returns sentinel snapshot, boot payload and resource counts.
 */
export async function readUpdateObservations(page) {
  return page.evaluate((sentinelKey) => {
    const countResources = (pattern) => performance
      .getEntriesByType('resource')
      .filter((entry) => new RegExp(pattern).test(entry.name))
      .length
    const boot = globalThis.__DSH_LIVERY_BOOT__
    const sentinel = globalThis[sentinelKey]
    return {
      sentinel: sentinel === undefined || sentinel === null ? null : { ...sentinel },
      navigationEntries: performance.getEntriesByType('navigation').length,
      timeOrigin: performance.timeOrigin,
      historyLength: history.length,
      clientBundleResources: countResources(String.raw`dsh-livery\/client\.(?:js|css)|\?\?dsh-livery`),
      catalogResources: countResources('/livery/api/catalog'),
      boot: boot === undefined || boot === null
        ? null
        : {
            pluginVersion: boot.pluginVersion ?? null,
            hostVersion: boot.hostVersion ?? null,
            adapterId: boot.adapterId ?? null,
            contractHash: boot.contractHash ?? null,
            catalogProfile: boot.catalogProfile ?? null,
            accepted: boot.accepted ?? null,
          },
      panelVersion: (document.querySelector('[data-testid="livery-version"]')?.textContent ?? '').trim() || null,
      bodyAttribute: document.body?.getAttribute('data-dsh-livery') ?? null,
      bodyHash: document.body?.getAttribute('data-dsh-livery-hash') ?? null,
    }
  }, UPDATE_SENTINEL_GLOBAL)
}

/**
 * Observe the updated client's own catalog request without relying on the
 * Playwright response lifecycle (the in-page module reload can invalidate a
 * response handle before its body is read). The wrapper records the fetch the
 * client actually makes, then returns the original response untouched.
 * @param page - Playwright page.
 */
export async function installCatalogFetchRecorder(page) {
  await page.evaluate(() => {
    const original = globalThis.fetch
    globalThis.__LIVERY_UPDATE_CATALOGS__ = []
    globalThis.fetch = async (...args) => {
      const response = await original(...args)
      try {
        const input = args[0]
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url
        if (String(url ?? '').includes('/livery/api/catalog') && response.ok) {
          const clone = response.clone()
          const text = await clone.text()
          let payload = null
          try { payload = JSON.parse(text) } catch { /* recorded as unparsable */ }
          globalThis.__LIVERY_UPDATE_CATALOGS__.push({
            at: Date.now(),
            status: response.status,
            bytes: text.length,
            compilerVersion: payload?.compilerVersion ?? null,
            catalogHash: payload?.catalogHash ?? null,
            hostVersion: payload?.hostVersion ?? null,
            adapterId: payload?.adapterId ?? null,
            contractHash: payload?.contractHash ?? null,
            catalogProfile: payload?.catalogProfile ?? null,
            liveryCount: Array.isArray(payload?.liveries) ? payload.liveries.length : null,
            liveryCssHashes: Array.isArray(payload?.liveries)
              ? Object.fromEntries(payload.liveries.filter((livery) => typeof livery?.id === 'string').map((livery) => [livery.id, livery.cssHash ?? null]))
              : null,
          })
        }
      } catch {
        /* recording must never break the product request */
      }
      return response
    }
  })
}

/** Read the catalogs the updated client fetched. */
export async function readCatalogCaptures(page) {
  return page.evaluate(() => (Array.isArray(globalThis.__LIVERY_UPDATE_CATALOGS__) ? [...globalThis.__LIVERY_UPDATE_CATALOGS__] : []))
}

/**
 * Wait until the Host plugin-detail page has mounted Livery's contributed
 * section and the runtime snapshot has settled, then read it.
 * @param page - Playwright page showing the dsh-livery bundle detail.
 * @param packageName - exact bundle package name.
 * @param options - readiness bounds.
 * @returns the read detail surface.
 */
export async function waitForPluginDetail(page, packageName, { timeoutMs = 30_000 } = {}) {
  await page.waitForSelector('[data-testid="livery-detail-section"]', { timeout: timeoutMs })
  const deadline = Date.now() + timeoutMs
  let detail = await readPluginDetail(page)
  while (Date.now() < deadline) {
    const fact = (id) => detail.section?.facts?.find((entry) => entry.id === id)?.value ?? ''
    if (fact('client-build').length > 0 && fact('handshake').length > 0 && detail.bundle === packageName) break
    await sleep(300)
    detail = await readPluginDetail(page).catch(() => detail)
  }
  return detail
}

function panelVersionOf(version) {
  return `v${version}`
}

/** The UI locale the running page presents (host pin wins over CLI flags). */
async function detectUiLocale(page) {
  const lang = await page.evaluate(() => document.documentElement.lang || '').catch(() => '')
  return String(lang).toLowerCase().startsWith('en') ? 'en' : 'zh'
}

/**
 * Drive the whole update probe and record its checks on the harness runner.
 *
 * Preconditions: `ctx.config.mode === 'isolated'`, `ctx.state.updateSource` and
 * `ctx.state.updateCandidate` were produced by the caller, the 0.2.1 tarball is
 * installed and the declared Host is booted and authenticated.
 *
 * Required-check ids come from {@link REQUIRED_UPDATE_CHECKS}; every one is
 * recorded here, with the recorded `transition` block (schema v3) in
 * `ctx.state.update.transition`.
 * @param ctx - harness context.
 * @returns the update evidence block (also stored on `ctx.state.update`).
 */
export async function checkUpdateProbe(ctx) {
  const { runner, session, config, state } = ctx
  const { page } = session
  const source = state.updateSource
  const candidate = state.updateCandidate
  if (source === undefined || candidate === undefined) {
    throw new Error('update probe called without updateSource/updateCandidate')
  }
  state.update = {
    from: { version: source.from.version, sha256: source.from.sha256, bytes: source.from.bytes, evidence: source.evidence },
    to: { version: candidate.version, sha256: candidate.sha256, bytes: candidate.bytes },
    startedAt: new Date().toISOString(),
    trigger: UPDATE_TRANSITION_TRIGGERS[0],
    requiredChecks: [...REQUIRED_UPDATE_CHECKS],
    responses: [],
    phases: [],
    observations: {},
    transition: null,
  }
  const update = state.update
  const record = (status, id, title, detail, evidence) => runner.add(status, id, title, detail === undefined ? undefined : oneLine(detail, 1_000), evidence)

  record(
    'pass',
    'update.from-artifact-verified',
    'the --update-from tarball is the exact artifact bound by committed acceptance evidence',
    `${source.from.name}@${source.from.version}, ${source.from.bytes} B, sha256 ${source.from.sha256}; committed evidence: ${source.evidence.join(', ')}`,
    { from: update.from, evidence: source.evidence },
  )

  await waitForAppReady(page)
  const uiLocale = await detectUiLocale(page).catch(() => state.actualLocale ?? config.locale)
  state.actualLocale = uiLocale
  const copy = COPY[uiLocale === 'en' ? 'en' : 'zh']
  const labels = labelsFor(uiLocale)

  // ── baseline: the installed 0.2.1 client, booted and accepted ───────────────
  await openLiveryDetailed(page, { labels, locale: uiLocale, timeoutMs: 30_000 })
  const baselineObservations = await readUpdateObservations(page)
  const baselineSnapshot = await readThemeSnapshot(page).catch(() => null)
  const installedManifest = await readFile(
    path.join(profilePaths(config.dshHome).nodeModules, config.packageName, 'package.json'),
    'utf8',
  ).then((text) => JSON.parse(text)).catch(() => null)
  const baselineOk = baselineObservations.boot?.pluginVersion === source.from.version
    && baselineObservations.panelVersion === panelVersionOf(source.from.version)
    && installedManifest?.version === source.from.version
  record(
    baselineOk ? 'pass' : 'fail',
    'update.from-installed',
    'the isolated profile runs the exact previous artifact: boot payload, live client build and installed package are the from version',
    `boot pluginVersion=${baselineObservations.boot?.pluginVersion ?? '(none)'} panel=${baselineObservations.panelVersion ?? '(none)'} installed package=${installedManifest?.version ?? '(none)'} (expected ${source.from.version})`,
    { boot: baselineObservations.boot, panelVersion: baselineObservations.panelVersion, installedVersion: installedManifest?.version ?? null },
  )

  // The pre-seeded style is the saved configuration the stale client must
  // re-apply after its catalog refetch; it must already be live on the 0.2.1 page.
  const baselineStyle = {
    liveryId: state.updateBaselineLivery ?? 'paper',
    bodyAttribute: baselineSnapshot?.bodyAttribute ?? null,
    bodyHash: baselineSnapshot?.bodyHash ?? null,
    panelVersion: baselineObservations.panelVersion,
  }
  const baselineStyleOk = baselineStyle.bodyAttribute === baselineStyle.liveryId
    && typeof baselineStyle.bodyHash === 'string'
    && baselineStyle.bodyHash.length > 0
  record(
    baselineStyleOk ? 'pass' : 'fail',
    'update.baseline-style-applied',
    'the isolated profile boots with an active style, so the 0.2.1 first-frame payload exists and there is a saved config to re-apply',
    `body data-dsh-livery=${baselineStyle.bodyAttribute ?? '(none)'} hash=${oneLine(baselineStyle.bodyHash ?? '', 24)} (expected ${baselineStyle.liveryId})`,
    baselineStyle,
  )
  state.baselineStyle = baselineStyle

  const baseline = await page.evaluate((sentinelKey) => {
    const countResources = (pattern) => performance
      .getEntriesByType('resource')
      .filter((entry) => new RegExp(pattern).test(entry.name))
      .length
    const sentinel = {
      id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
      installedAt: Date.now(),
      timeOrigin: performance.timeOrigin,
      navigationEntries: performance.getEntriesByType('navigation').length,
      historyLength: history.length,
      clientBundleResources: countResources(String.raw`dsh-livery\/client\.(?:js|css)|\?\?dsh-livery`),
      catalogResources: countResources('/livery/api/catalog'),
      bootPluginVersion: globalThis.__DSH_LIVERY_BOOT__?.pluginVersion ?? null,
      bodyAttribute: document.body?.getAttribute('data-dsh-livery') ?? null,
      bodyHash: document.body?.getAttribute('data-dsh-livery-hash') ?? null,
      panelVersion: (document.querySelector('[data-testid="livery-version"]')?.textContent ?? '').trim() || null,
    }
    globalThis[sentinelKey] = sentinel
    return sentinel
  }, UPDATE_SENTINEL_GLOBAL)
  update.baseline = baseline

  // Observe the updated client's own catalog fetch (and, below, its module
  // reload) from inside the page. Response handles can be invalidated by the
  // in-page module reload, so the in-page wrapper is the reliable record.
  await installCatalogFetchRecorder(page)

  // ── update through the running Host's plugin manager ───────────────────────
  let manager = null
  let dialogAvailable = false
  try {
    await openPluginsPanel(page, { timeoutMs: 30_000 })
    manager = await installCandidateThroughHostDialog(page, candidate, { locale: uiLocale, timeoutMs: 300_000 })
    dialogAvailable = true
    update.phases = manager.phases
    update.manager = manager
    record(
      'pass',
      'update.dialog-available',
      'the running Host plugin-manager page exposes the Add plugin install dialog for a local tarball path',
      `dialog phases=${JSON.stringify(manager.phases)}; spec=${manager.spec}`,
      { trigger: manager.trigger, phases: manager.phases, spec: manager.spec },
    )
  } catch (error) {
    const reason = error instanceof Error ? (error.message ?? String(error)) : String(error)
    update.managerError = redact(reason)
    record(
      'fail',
      'update.dialog-available',
      'the running Host plugin-manager page exposes the Add plugin install dialog for a local tarball path',
      `could not drive the Host install dialog: ${reason}`,
    )
    record('skip', 'update.dialog-install-completed', 'the Host install dialog settles with an applied installation', `dialog unavailable: ${oneLine(reason, 400)}`)
    record('skip', 'update.manager-outcome', 'the Host plugin manager reports the update as applied (not restart-required)', `dialog unavailable: ${oneLine(reason, 400)}`)
  }

  if (dialogAvailable) {
    const completed = manager.phase === 'done'
    record(
      completed ? 'pass' : 'fail',
      'update.dialog-install-completed',
      'the Host install dialog settles with an applied installation',
      `manager phase=${manager.phase ?? '(none)'} outcome=${manager.managerOutcome} heading="${manager.heading}" restart=${manager.restartRequired}${manager.failureText === null ? '' : ` failure="${manager.failureText}"`}`,
      { phases: manager.phases, heading: manager.heading, failureText: manager.failureText },
    )
    const applied = manager.managerOutcome === 'applied'
    record(
      applied ? 'pass' : 'fail',
      'update.manager-outcome',
      'the Host plugin manager reports the update as applied (not restart-required)',
      `managerOutcome=${manager.managerOutcome}; restart copy=${manager.restartRequired}; tail="${manager.dialogTail}"`,
      { managerOutcome: manager.managerOutcome, restartRequired: manager.restartRequired, phases: manager.phases },
    )
  }

  // ── wait for the in-process client replacement (no reload) ─────────────────
  const waitDeadline = Date.now() + 120_000
  let current = await readUpdateObservations(page)
  let catalogCaptures = await readCatalogCaptures(page).catch(() => [])
  while (Date.now() < waitDeadline) {
    catalogCaptures = await readCatalogCaptures(page).catch(() => [])
    const catalogSeen = catalogCaptures.some((capture) => capture.status === 200)
    const clientReloaded = current.clientBundleResources > baseline.clientBundleResources
    if (catalogSeen && clientReloaded) break
    await sleep(500)
    current = await readUpdateObservations(page).catch(() => current)
  }
  const post = await readUpdateObservations(page)
  catalogCaptures = await readCatalogCaptures(page).catch(() => [])
  update.observations.pre = post
  update.catalogCaptures = catalogCaptures
  update.observations.clientReloaded = post.clientBundleResources > baseline.clientBundleResources

  const clientReloaded = post.clientBundleResources > baseline.clientBundleResources
  record(
    clientReloaded ? 'pass' : 'fail',
    'update.new-client-bundle-loaded',
    'the running Host delivers the new client bundle through its in-page module reloader',
    `client-bundle resource entries ${baseline.clientBundleResources} → ${post.clientBundleResources}; updated-client catalog fetches=${catalogCaptures.length}`,
    { baseline: baseline.clientBundleResources, after: post.clientBundleResources, catalogs: catalogCaptures },
  )

  const navigationEvents = ctx.state.navEvents ?? { mainFrameNavigations: 0, loads: 0 }
  const noReload = post.sentinel?.id === baseline.id
    && post.timeOrigin === baseline.timeOrigin
    && post.navigationEntries === baseline.navigationEntries
    && post.historyLength === baseline.historyLength
    && navigationEvents.loads === 0
  update.pageReloaded = !noReload
  record(
    noReload ? 'pass' : 'fail',
    'update.no-page-navigation',
    'the update happens without any page navigation or reload (window sentinel, timeOrigin, navigation count, load events)',
    `sentinel=${post.sentinel?.id === baseline.id ? 'intact' : 'replaced'}; timeOrigin=${post.timeOrigin === baseline.timeOrigin ? 'unchanged' : 'changed'}; navigation entries ${baseline.navigationEntries}→${post.navigationEntries}; history ${baseline.historyLength}→${post.historyLength}; load events=${navigationEvents.loads}`,
    { baseline, post, navigationEvents },
  )

  const bootStillPrevious = post.boot?.pluginVersion === source.from.version
  record(
    bootStillPrevious ? 'pass' : 'fail',
    'update.boot-payload-previous',
    'the first-frame boot payload is still the previous build (no page reload injected a new one)',
    `boot pluginVersion=${post.boot?.pluginVersion ?? '(none)'} (expected ${source.from.version}); accepted=${post.boot?.accepted ?? '(none)'}`,
    post.boot,
  )

  // ── live client build: reopened Livery panel and plugin detail must say 0.2.2
  let panelVersion = null
  let panelError = null
  try {
    await openLiveryDetailed(page, { labels, locale: uiLocale, timeoutMs: 30_000 })
    panelVersion = (await page.locator('[data-testid="livery-version"]').first().textContent({ timeout: 10_000 }).catch(() => ''))?.trim() ?? null
    const deadline = Date.now() + 20_000
    while (panelVersion !== panelVersionOf(candidate.version) && Date.now() < deadline) {
      await sleep(300)
      panelVersion = (await page.locator('[data-testid="livery-version"]').first().textContent({ timeout: 5_000 }).catch(() => ''))?.trim() ?? null
    }
  } catch (error) {
    panelError = error instanceof Error ? (error.message ?? String(error)) : String(error)
  }
  const liveBuildOk = panelVersion === panelVersionOf(candidate.version)
  record(
    liveBuildOk ? 'pass' : 'fail',
    'update.live-client-build-candidate',
    'the live client build is the candidate version while the boot payload stays the previous version',
    `panel version=${panelVersion ?? '(none)'} (expected v${candidate.version})${panelError === null ? '' : `; panel error: ${oneLine(panelError, 300)}`}`,
    { panelVersion, expected: panelVersionOf(candidate.version), error: panelError },
  )

  const versionedCatalog = catalogCaptures.find((capture) => capture.status === 200 && capture.compilerVersion === candidate.version) ?? null
  const catalogRefetched = versionedCatalog !== null
  const latestCatalog = versionedCatalog ?? catalogCaptures.filter((capture) => capture.status === 200).at(-1) ?? null
  record(
    catalogRefetched ? 'pass' : 'fail',
    'update.catalog-refetched',
    'the updated client re-fetches a catalog compiled by the candidate version after the in-process update',
    `${catalogCaptures.length} catalog fetch(es) by the updated client; last=${latestCatalog === null ? '(none)' : `status=${latestCatalog.status} compilerVersion=${String(latestCatalog.compilerVersion ?? '?')} bytes=${latestCatalog.bytes} catalogHash=${oneLine(latestCatalog.catalogHash ?? '', 24)} liveries=${String(latestCatalog.liveryCount ?? '?')}`}`,
    { catalogs: catalogCaptures, expectedCompilerVersion: candidate.version },
  )

  await sleep(1_500)
  const appliedSnapshot = await readThemeSnapshot(page).catch(() => null)
  const expectedCssHash = latestCatalog?.liveryCssHashes?.[baselineStyle.liveryId] ?? null
  const appliedHashOk = latestCatalog !== null
    && typeof expectedCssHash === 'string'
    && appliedSnapshot?.bodyHash === expectedCssHash
  const configReapplied = appliedSnapshot?.bodyAttribute === baselineStyle.liveryId
    && typeof appliedSnapshot?.bodyHash === 'string'
    && appliedSnapshot.bodyHash.length > 0
  const catalogApplied = catalogRefetched && configReapplied && appliedHashOk
  record(
    catalogApplied ? 'pass' : 'fail',
    'update.catalog-applied',
    'the updated client re-applies the saved style from the re-fetched catalog',
    `body data-dsh-livery=${appliedSnapshot?.bodyAttribute ?? '(none)'} body hash=${oneLine(appliedSnapshot?.bodyHash ?? '', 24)}; updated-client catalog ${baselineStyle.liveryId} cssHash=${oneLine(expectedCssHash ?? '', 24)}; baseline=${baselineStyle.liveryId}/${oneLine(baselineStyle.bodyHash ?? '', 24)}; hash match=${appliedHashOk}`,
    { bodyAttribute: appliedSnapshot?.bodyAttribute ?? null, bodyHash: appliedSnapshot?.bodyHash ?? null, catalog: latestCatalog, baselineStyle },
  )

  // ── stale handshake through the plugin-detail surface ──────────────────────
  let detail = null
  let detailError = null
  try {
    await openPluginsPanel(page, { timeoutMs: 30_000 })
    await openPluginBundleDetail(page, config.packageName, { timeoutMs: 30_000 })
    detail = await waitForPluginDetail(page, config.packageName, { timeoutMs: 30_000 })
  } catch (error) {
    detailError = error instanceof Error ? (error.message ?? String(error)) : String(error)
  }
  const fact = (id) => detail?.section?.facts?.find((entry) => entry.id === id)?.value ?? ''
  const reason = fact('handshake-reason')
  const staleObserved = detail !== null
    && fact('handshake') === copy.staleHandshake
    && /stale boot payload/iu.test(reason)
    && detail.section.boundary === copy.staleBoundary
  update.observations.detail = detail === null
    ? { error: detailError }
    : {
        bundle: detail.bundle,
        badge: detail.badge,
        facts: detail.section.facts,
        boundary: detail.section.boundary,
        actions: detail.actions,
      }
  record(
    staleObserved ? 'pass' : 'fail',
    'update.stale-boot-observed',
    'the updated client classifies the surviving startup frame as stale (handshake reason + truthful boundary copy)',
    detail === null
      ? `plugin detail unavailable: ${oneLine(detailError ?? '', 500)}`
      : `handshake="${fact('handshake')}" (expected "${copy.staleHandshake}"); reason="${oneLine(reason, 220)}"; boundary="${oneLine(detail.section.boundary, 260)}"`,
    update.observations.detail,
  )

  const detailRenders = detail !== null
    && detail.bundle === config.packageName
    && detail.badge.present === true
    && detail.section.present === true
    && fact('client-build') === candidate.version
    && fact('installed') === candidate.version
    && fact('catalog') === copy.catalogReady
    && fact('handshake') === copy.staleHandshake
    && baselineStyle !== null
    && fact('confirmed') === baselineStyle.bodyAttribute
  record(
    detailRenders ? 'pass' : 'fail',
    'update.detail-section-renders',
    'the plugin-detail badge and facts section render the candidate build and stale handshake after the update',
    detail === null
      ? `plugin detail unavailable: ${oneLine(detailError ?? '', 500)}`
      : `bundle=${detail.bundle}; badge="${detail.badge.text}"; client-build=${fact('client-build')}; installed=${fact('installed')}; catalog=${fact('catalog')}; handshake=${fact('handshake')}; confirmed=${fact('confirmed')}; boundary="${oneLine(detail.section.boundary, 200)}"`,
    update.observations.detail,
  )

  // ── the evidence transition record (schema v3) ─────────────────────────────
  await sleep(1_000)
  const catalogReadopted = catalogRefetched && catalogApplied && staleObserved && liveBuildOk
  const transition = {
    fromVersion: source.from.version,
    fromSha256: source.from.sha256,
    fromBytes: source.from.bytes,
    toVersion: candidate.version,
    toSha256: candidate.sha256,
    trigger: UPDATE_TRANSITION_TRIGGERS[0],
    pageReloaded: update.pageReloaded === true,
    staleBootObserved: staleObserved,
    catalogReadopted,
    managerOutcome: manager?.managerOutcome ?? 'unconfirmed',
  }
  update.transition = transition
  const transitionProblems = validateTransition(transition, {
    toSha256: candidate.sha256,
    toVersion: candidate.version,
  })
  record(
    transitionProblems.length === 0 ? 'pass' : 'fail',
    'update.transition-recorded',
    'the schema-v3 update transition records both exact artifacts, the Host-dialog trigger and the observed in-process outcome',
    transitionProblems.length === 0
      ? `from=${transition.fromVersion}/${transition.fromSha256.slice(0, 12)}… (${transition.fromBytes} B); to=${transition.toVersion}/${transition.toSha256.slice(0, 12)}…; trigger=${transition.trigger}; pageReloaded=${transition.pageReloaded}; stale=${transition.staleBootObserved}; catalogReadopted=${transition.catalogReadopted}; managerOutcome=${transition.managerOutcome}`
      : transitionProblems.join('; '),
    transition,
  )
  update.finishedAt = new Date().toISOString()
  return update
}
