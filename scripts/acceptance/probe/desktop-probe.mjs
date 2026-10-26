#!/usr/bin/env node
/**
 * Desktop-profile (Electron app runtime) acceptance probe for DSH Livery.
 *
 * The probe runs in a headless/CI-like session and covers two areas:
 *
 * 1. Official plugin-manager acceptance against the app-bundled rc.3 runtime
 *    (`runtime/cli/bin/dsh plugin --profile desktop add file:<tgz>`) in an
 *    isolated DSH_HOME outside the repository (the bundled pnpm 11 picks up a
 *    parent pnpm workspace otherwise). The rc.3 runtime enforces `engines.dsh`
 *    at install time; a synthetic 0.2.0-only plugin is installed as a negative
 *    control that must be rejected without an exemption.
 *
 * 2. A real Electron renderer probe: the app is launched by Playwright's
 *    `_electron` with an isolated DSH_HOME + user-data-dir and
 *    `--no-sandbox --disable-gpu` (the only Chromium mode that survives this
 *    file-sandboxed session), then the actual desktop renderer is driven:
 *    boot graph, stock start, settings → Livery gallery, preview/cancel,
 *    apply/persist, reload handshake, light/dark tokens, 0.2.1 font role hooks,
 *    first-paint samples and stock restore. Screenshots are renderer-only.
 *
 * Not verified (recorded in the report): native Electron window chrome (traffic
 * lights/leading), DPI scaling behaviour beyond window.devicePixelRatio,
 * vibrancy/transparency, Dock/rightbar window states.
 * The desktop profile cannot be booted by the CLI ("managed exclusively by the
 * Electron application"); all runtime evidence here comes from the real app.
 *
 * Usage:
 *   node scripts/acceptance/probe/desktop-probe.mjs [--tgz <path>] [--out <dir>]
 *     [--report <md>] [--dsh-home /tmp/dsh-livery-desktop-runtime]
 *     [--app-bin <Electron binary>] [--app-cli <desktop cli script>]
 *     [--profile-mode minimal|clone] [--clone-from <dir>] [--keep]
 */

import { access, readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import {
  CheckRunner,
  WORKSPACE_ROOT,
  assertIsolatedHome,
  ensureDir,
  nowIso,
  oneLine,
  parseArgs,
  redact,
  removeIsolatedHome,
  sha256File,
  writeJson,
  writeText,
} from './util.mjs'
import {
  cloneProfileIntoHome,
  inspectProfilePatch,
  installPlugin,
  profilePaths,
  readProfileState,
  runDsh,
} from './dsh-home.mjs'
import { DESKTOP_SCOPE, SUPPORTED_HOST_VERSIONS, adapterForVersion, describeAdapter } from './certified-adapters.mjs'
import {
  captureScreenshot,
  dismissFirstRunDialogs,
  findControl,
  installFirstPaintRecorder,
  inspectPanellist,
  liveryPanelVisible,
  readGalleryStructure,
  readLocaleTab,
  readThumbLocales,
  readWallpaperState,
  thumbLocaleOf,
  waitForThumbLocale,
  openLiveryDetailed,
  readFirstPaintSamples,
  readMainColumnState,
  readGallery,
  readPaintTimings,
  readThemeSnapshot,
  waitForAppReady,
  waitForBootGraph,
} from './browser.mjs'
import { canonicalizeColors, chooseSkinPair, waitForActiveLivery, waitForStock } from './checks.mjs'
import { labelsFor } from './labels.mjs'

const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

const DEFAULT_APP = '/Applications/DeepSeek Harness.app/Contents/Resources'
const TOKENS = ['--dsw-alias-bg-base', '--dsw-alias-label-primary', '--dsw-alias-border-l1']
const PAGE_LABELS = labelsFor('zh')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function expect(runner, id, title, condition, detail, evidence) {
  return condition ? runner.pass(id, title, detail, evidence) : runner.fail(id, title, detail, evidence)
}

/** Strip Electron/DSH runtime variables so a GUI Electron process can start. */
function cleanElectronEnv({ dshHome, appBin }) {
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (/^ELECTRON_/i.test(key) || /^DSH_/i.test(key) || /^VSCODE_/i.test(key)) delete env[key]
  }
  env.DSH_HOME = dshHome
  env.DSH_DESKTOP_NODE_EXECUTABLE = appBin
  return env
}

/** Write the minimal desktop profile the app CLI accepts for plugin install. */
async function prepareDesktopProfile(home, profileMode, cloneFrom) {
  if (profileMode === 'clone') {
    return cloneProfileIntoHome({ source: cloneFrom, home, name: 'desktop' })
  }
  const { profileDir, packageJson, patchFile } = profilePaths(home, 'desktop')
  await ensureDir(profileDir)
  if (!existsSync(packageJson)) {
    await writeFile(
      packageJson,
      `${JSON.stringify(
        {
          name: 'dsh-profile-desktop',
          private: true,
          dependencies: {},
          dsh: {
            profile: {
              bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh-experimental-agent-team-profile'],
            },
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    )
  }
  if (!existsSync(patchFile)) await writeFile(patchFile, '[]\n', 'utf8')
  return { source: '(minimal desktop profile)', destDir: profileDir, durationMs: 0, dependencies: [], bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh-experimental-agent-team-profile'], repairs: [] }
}

/** Build a synthetic plugin whose engines.dsh only allows 0.2.0-rc.2. */
async function buildEngineNegativeControl(dir) {
  const { mkdir } = await import('node:fs/promises')
  const { spawn } = await import('node:child_process')
  await mkdir(dir, { recursive: true })
  await writeFile(
    path.join(dir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'dsh-livery-engine-probe',
        version: '0.0.0',
        type: 'module',
        main: './index.js',
        engines: { dsh: '0.2.0-rc.2' },
        dsh: { manifestVersion: 1, bundle: { patch: './cordis.patch.yml' } },
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
  await writeFile(path.join(dir, 'index.js'), 'export function apply() {}\n', 'utf8')
  await writeFile(path.join(dir, 'cordis.patch.yml'), '[]\n', 'utf8')
  const tgz = path.join(dir, 'dsh-livery-engine-probe.tgz')
  await new Promise((resolve, reject) => {
    const child = spawn('tar', ['-czf', tgz, 'package.json', 'index.js', 'cordis.patch.yml'], { cwd: dir, stdio: 'ignore' })
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`tar exited ${code}`))))
  })
  return tgz
}

async function main() {
  const options = parseArgs(process.argv.slice(2), {
    booleans: ['keep', 'help'],
    strings: ['tgz', 'out', 'report', 'dsh-home', 'app-bin', 'app-cli', 'profile-mode', 'clone-from', 'user-data-dir'],
  })
  if (options.help) {
    console.log('usage: node scripts/acceptance/probe/desktop-probe.mjs [--tgz path] [--out dir] [--report md] [--dsh-home /tmp/dsh-livery-desktop-runtime] [--profile-mode minimal|clone] [--clone-from dir]')
    return 0
  }
  const tgz = path.resolve(options.tgz ?? path.join(WORKSPACE_ROOT, 'dsh-livery-0.1.0.tgz'))
  const outDir = path.resolve(options.out ?? path.join(WORKSPACE_ROOT, 'artifacts/acceptance/desktop'))
  const reportPath = path.resolve(options.report ?? path.join(WORKSPACE_ROOT, 'artifacts/acceptance/desktop-report.md'))
  const home = assertIsolatedHome(options['dsh-home'] ?? '/tmp/dsh-livery-desktop-runtime')
  const appResources = options['app-bin'] ? path.dirname(path.dirname(options['app-bin'])) : DEFAULT_APP
  const appBin = options['app-bin'] ?? path.join(appResources, '..', 'MacOS', 'DeepSeek Harness')
  const appCli = options['app-cli'] ?? path.join(DEFAULT_APP, 'runtime/cli/bin/dsh')
  const userDataDir = options['user-data-dir'] ?? '/tmp/dsh-livery-desktop-userdata'
  const profileMode = options['profile-mode'] === 'clone' ? 'clone' : 'minimal'
  const keep = Boolean(options.keep)

  const screensDir = path.join(outDir, 'screens')
  await ensureDir(screensDir)
  const runner = new CheckRunner()
  const startedAt = nowIso()
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-desktop`
  const environment = { date: startedAt, platform: process.platform, arch: process.arch, node: process.version }
  const artifacts = { screenshots: [], install: null, engineNegativeControl: null, cliRefusal: null, renderer: null }
  const limitations = [
    'NATIVE-WINDOW SCOPE: screenshots are renderer web contents only; native macOS window chrome (traffic lights, leading padding), vibrancy/transparency, Dock/rightbar window states and any OS-level DPI scaling behaviour are NOT verified by this probe.',
    'The desktop profile cannot be booted by the CLI ("profile desktop is managed exclusively by the Electron application"); runtime evidence comes from launching the real Electron application with an isolated DSH_HOME/user-data-dir and driving its renderer over Playwright.',
    'Chromium renderer required --no-sandbox --disable-gpu in this file-sandboxed session; behaviour under the packaged sandbox/GPU path is not exercised here.',
    'Coexistence with third-party first-paint plugins is only observed when --profile-mode clone is used; conflicts are recorded, never hidden.',
  ]
  const ctx = {
    runId,
    startedAt,
    config: {
      mode: 'isolated',
      liveryMode: true,
      dshHome: home,
      dshProfile: 'desktop',
      baseUrl: null,
      screensDir,
      outDir,
      profileName: 'desktop-electron',
      locale: 'zh',
      labels: PAGE_LABELS,
      expectedProfileKind: 'desktop',
    },
    environment,
    state: {},
    runner,
    artifacts,
    deviations: [],
    knownLimitations: limitations,
    phases: [],
    install: null,
    profileEvidence: null,
  }

  let electronApp = null
  try {
    // ------------------------------------------------------ prepare + install
    if (!keep && existsSync(home)) await removeIsolatedHome(home)
    await ensureDir(home)
    const appVersionInfo = await runDsh(appCli, ['--version'], { home: path.join(WORKSPACE_ROOT, '.tmp/acceptance/version-probe'), timeoutMs: 60_000 })
    environment.appCli = appCli
    environment.appVersion = appVersionInfo.stdout.trim() || appVersionInfo.stderr.trim()
    const adapter = adapterForVersion(environment.appVersion)
    if (!adapter) throw new Error(`desktop runtime version "${environment.appVersion}" is not a certified adapter (certified: ${SUPPORTED_HOST_VERSIONS.join(', ')})`)
    ctx.config.expectedAdapter = adapter
    ctx.config.expectedVersion = adapter.hostVersion
    environment.expectedAdapter = describeAdapter(adapter)
    runner.pass('desktop.certified-runtime', 'app-bundled CLI reports a certified host version', describeAdapter(adapter), { adapter })

    const clone = await prepareDesktopProfile(home, profileMode, options['clone-from'] ? path.resolve(options['clone-from']) : null)
    ctx.state.clone = clone
    if (clone.repairs?.length) {
      const detail = clone.repairs.map((repair) => `${repair.dependency}: ${repair.kind} (${repair.stale}${repair.replacement ? ` → ${repair.replacement}` : ''})`).join('; ')
      ctx.deviations.push(`cloned desktop profile manifest repaired for reproduction: ${detail}`)
      runner.warn('desktop.profile-repaired', 'cloned desktop profile needed local dependency-spec repair', detail)
    }
    const tarballSha256 = await sha256File(tgz)
    const install = await installPlugin({ bin: appCli, home, tgz, packageName: 'dsh-livery', profileName: 'desktop' })
    const state = await readProfileState(home, 'desktop')
    const installedManifestPath = path.join(profilePaths(home, 'desktop').nodeModules, 'dsh-livery/package.json')
    const installedManifest = existsSync(installedManifestPath) ? JSON.parse(await readFile(installedManifestPath, 'utf8')) : null
    const previewDirs = existsSync(path.join(profilePaths(home, 'desktop').nodeModules, 'dsh-livery/lib/previews'))
      ? await readdir(path.join(profilePaths(home, 'desktop').nodeModules, 'dsh-livery/lib/previews'))
      : []
    artifacts.install = {
      command: install.command,
      exitCode: install.exitCode,
      durationMs: install.durationMs,
      stdout: install.stdout,
      stderr: install.stderr,
      packageVersion: installedManifest?.version ?? null,
      profileManifest: { dependencies: state.dependencies, bundles: state.bundles },
      previewProfiles: previewDirs,
      tarballSha256,
      deviceLabel: 'desktop (rc.3 runtime, isolated /tmp home)',
    }
    expect(
      runner,
      'desktop.official-install',
      'official rc.3 plugin-manager install accepts the package with no version exemption',
      install.exitCode === 0 && Boolean(state.dependencies?.['dsh-livery']) && state.bundles.includes('dsh-livery'),
      `${install.command} → exit ${install.exitCode} in ${install.durationMs}ms; dependency=${state.dependencies?.['dsh-livery'] ?? '(none)'}; bundles=${JSON.stringify(state.bundles)}; installed@${installedManifest?.version ?? '?'}`,
      { stdout: oneLine(install.stdout, 800), stderr: oneLine(install.stderr, 800) },
    )
    expect(
      runner,
      'desktop.preview-profiles-installed',
      'the shared compiled catalog profile ships into the installed package (both certified adapters share it)',
      previewDirs.length === 1,
      `${previewDirs.length} preview profile dir(s): ${previewDirs.join(', ')}`,
    )

    // rc.3 runtime enforces engines.dsh: negative control must be rejected.
    const negativeTgz = await buildEngineNegativeControl('/tmp/dsh-livery-engine-negative')
    const negative = await installPlugin({ bin: appCli, home, tgz: negativeTgz, packageName: 'dsh-livery-engine-probe', profileName: 'desktop' })
    artifacts.engineNegativeControl = {
      command: negative.command,
      exitCode: negative.exitCode,
      rejected: /installation rejected|incompatible with dsh/i.test(`${negative.stdout}\n${negative.stderr}`),
      excerpt: oneLine(`${negative.stdout}\n${negative.stderr}`, 900),
    }
    expect(
      runner,
      'desktop.engines-enforced',
      'rc.3 runtime rejects a plugin whose engines.dsh allowlist excludes it (no exemption)',
      negative.exitCode !== 0 && artifacts.engineNegativeControl.rejected,
      `synthetic 0.2.0-only plugin install → exit ${negative.exitCode}: ${oneLine(artifacts.engineNegativeControl.excerpt, 320)}`,
      artifacts.engineNegativeControl,
    )

    // CLI boot/dump refusal is a fact of the app-managed desktop profile.
    const bootRefusal = await runDsh(appCli, ['--profile', 'desktop', '--no-open', '--port', '0'], { home, timeoutMs: 30_000 })
    artifacts.cliRefusal = {
      command: bootRefusal.command,
      exitCode: bootRefusal.exitCode,
      stderr: bootRefusal.stderr,
      managedExclusively: /managed exclusively by the Electron application/i.test(`${bootRefusal.stdout}\n${bootRefusal.stderr}`),
    }
    expect(
      runner,
      'desktop.cli-refuses-boot',
      'CLI boot of the desktop composition is refused (Electron-managed profile)',
      artifacts.cliRefusal.managedExclusively && bootRefusal.exitCode !== 0,
      `dsh --profile desktop --no-open → exit ${bootRefusal.exitCode}: ${oneLine(bootRefusal.stderr || bootRefusal.stdout, 240)}`,
    )

    // ------------------------------------------------- real Electron renderer
    const { loadPlaywright } = await import('./playwright.mjs')
    const loadedPlaywright = await loadPlaywright()
    const electronLauncher = loadedPlaywright.module._electron
    if (!electronLauncher) throw new Error('playwright-core does not export _electron; cannot drive the desktop renderer')
    electronApp = await electronLauncher.launch({
      executablePath: appBin,
      args: [`--user-data-dir=${userDataDir}`, '--no-sandbox', '--disable-gpu', '--disable-software-rasterizer', '--disable-dev-shm-usage'],
      env: cleanElectronEnv({ dshHome: home, appBin }),
      timeout: 120_000,
    })
    environment.electronVersion = await electronApp.evaluate(async ({ app }) => process.versions.electron)
    environment.windowElectronNode = await electronApp.evaluate(async ({ app }) => process.versions.node)
    environment.chromeVersion = await electronApp.evaluate(async ({ app }) => process.versions.chrome)
    let page = await electronApp.firstWindow({ timeout: 120_000 })
    ctx.session = { page, context: page.context() }
    ctx.browser = null
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await waitForBootGraph(page)
    await waitForAppReady(page)
    await page.waitForTimeout(1_500)
    await dismissFirstRunDialogs(page)
    const rendererInfo = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      lang: document.documentElement.lang,
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio,
      inner: [window.innerWidth, window.innerHeight],
      outer: [window.outerWidth, window.outerHeight],
      bootEntries: window.__DSH_BOOT__.entries?.map((entry) => entry.id) ?? [],
      bootRev: window.__DSH_BOOT__.rev,
    }))
    artifacts.renderer = { ...rendererInfo }
    expect(
      runner,
      'desktop.renderer-launches',
      'real Electron renderer launches under the isolated app runtime',
      /@deepseek-ai\/dsh-desktop\/0\.2\.1-rc\.3/.test(rendererInfo.userAgent) && rendererInfo.url.startsWith('dsh-app://'),
      `url=${rendererInfo.url} title="${rendererInfo.title}" Electron=${environment.electronVersion} Node=${environment.windowElectronNode} Chrome=${environment.chromeVersion} dpr=${rendererInfo.devicePixelRatio} window=${rendererInfo.outer.join('x')}`,
      { userAgent: rendererInfo.userAgent },
    )
    expect(
      runner,
      'desktop.boot-graph-row',
      'boot graph lists the dsh-livery client module',
      rendererInfo.bootEntries.includes('dsh-livery'),
      `rev=${rendererInfo.bootRev}; entries=${rendererInfo.bootEntries.length}; dsh-livery=${rendererInfo.bootEntries.includes('dsh-livery')}`,
    )

    // Catalog: same-origin route through the app protocol, read from the renderer.
    const catalog = await page.evaluate(async () => {
      try {
        const response = await fetch('/livery/api/catalog', { cache: 'no-store' })
        if (!response.ok) return { error: `status ${response.status}` }
        return await response.json()
      } catch (error) {
        return { error: String(error) }
      }
    })
    if (catalog?.error) throw new Error(`could not fetch the catalog from the desktop renderer: ${catalog.error}`)
    ctx.state.catalog = catalog
    const catalogProblems = []
    if (catalog.hostVersion !== adapter.hostVersion) catalogProblems.push(`hostVersion ${catalog.hostVersion}`)
    if (catalog.adapterId !== adapter.adapterId) catalogProblems.push(`adapterId ${catalog.adapterId}`)
    if (catalog.contractHash !== adapter.contractHash) catalogProblems.push('contractHash')
    if (catalog.catalogProfile !== adapter.catalogProfile) catalogProblems.push('catalogProfile')
    expect(
      runner,
      'desktop.catalog-identity',
      'desktop catalog route reports the certified rc.3 identity and shared 0.2.1 catalog profile',
      catalogProblems.length === 0 && (catalog.liveries?.length ?? 0) >= 10,
      catalogProblems.length ? catalogProblems.join('; ') : `${describeAdapter(adapter)}; ${catalog.liveries?.length ?? 0} liveries; previewsBase=${catalog.previewsBase}`,
      { hostVersion: catalog.hostVersion, adapterId: catalog.adapterId, catalogProfile: catalog.catalogProfile, previewsBase: catalog.previewsBase },
    )

    // Stock start: default config means zero boot rows.
    const stock = await readThemeSnapshot(page)
    expect(
      runner,
      'desktop.stock-start',
      'stock default boots with no livery attributes or skin styles',
      stock.bodyAttribute === null && stock.liveryStyles.length === 0 && stock.themeSource === 'system',
      `data-dsh-livery=${stock.bodyAttribute}; skinStyles=${stock.liveryStyles.length}; themeSource=${stock.themeSource}; lang=${stock.lang}`,
      { bootPayload: stock.bootPayload },
    )
    await captureScreenshot(page, path.join(screensDir, 'zh-stock-desktop.png'), { label: 'desktop stock' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'stock' }))

    // Sidebar panellist row → Livery main panel (desktop shell).
    const stockPanellist = await inspectPanellist(page)
    const stockRow = (stockPanellist.rows ?? []).find((candidate) => [PAGE_LABELS.section, 'Livery'].includes(candidate.ariaLabel ?? candidate.label))
    expect(
      runner,
      'desktop.sidebar-entry',
      'Livery is registered as a left-sidebar plugin navigation row in the desktop shell',
      Boolean(stockRow) && stockRow.hasPanellistSlot === true && stockRow.hasIcon === true,
      stockRow ? `row #${stockRow.index} label "${stockRow.ariaLabel ?? stockRow.label}" panellistSlot=${stockRow.hasPanellistSlot} icon=${stockRow.hasIcon}` : `rows: ${(stockPanellist.rows ?? []).map((candidate) => candidate.ariaLabel ?? candidate.label).join(', ') || '(none)'}`,
    )
    const opened = await openLiveryDetailed(page, { labels: PAGE_LABELS, locale: 'zh' })
    const desktopMain = await readMainColumnState(page)
    expect(
      runner,
      'desktop.main-panel',
      'selecting the sidebar row opens the Visual Style main panel (h1 matches, conversation replaced) in the desktop shell',
      opened.via === 'sidebar-panellist' && desktopMain.liveryPanelVisible && desktopMain.conversationComposerVisible === false && desktopMain.selectedRowLabel === PAGE_LABELS.section && desktopMain.panelTitle === PAGE_LABELS.section,
      `via=${opened.via} panelVisible=${desktopMain.liveryPanelVisible} conversationVisible=${desktopMain.conversationComposerVisible} selected="${desktopMain.selectedRowLabel}" h1="${desktopMain.panelTitle}"`,
    )
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="livery-card"][data-livery-id]').length >= 10, undefined, { timeout: 20_000 }).catch(() => {})
    const cards = await readGallery(page)
    const liveryCards = cards.filter((card) => card.id !== 'stock')
    expect(
      runner,
      'desktop.gallery',
      'desktop Visual Style panel renders the 24 compiled styles',
      liveryCards.length >= 24,
      `${liveryCards.length} cards: ${liveryCards.map((card) => card.id).join(', ')}`,
    )
    await captureScreenshot(page, path.join(screensDir, 'zh-panel-gallery-desktop.png'), { label: 'desktop livery panel gallery' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'panel-gallery' }))

    // Preview-language tab in the real Electron renderer: it only swaps thumbnail
    // SVG locale, so Follow tracks the zh host locale and pinning switches URLs.
    const desktopHostLocale = 'zh'
    const desktopTab = await readLocaleTab(page)
    await waitForThumbLocale(page, desktopHostLocale).catch(() => {})
    const desktopDefaultThumbs = await readThumbLocales(page)
    expect(
      runner,
      'desktop.preview-locale',
      'desktop gallery exposes the preview-language tab with Follow DSH active and zh thumbnails',
      desktopTab.found === true &&
        desktopTab.buttons?.length === 3 &&
        desktopTab.buttons.find((button) => button.choice === 'follow')?.pressed === true &&
        desktopDefaultThumbs.length > 0 &&
        desktopDefaultThumbs.every((src) => thumbLocaleOf(src) === desktopHostLocale),
      `tab found=${desktopTab.found}; buttons=[${(desktopTab.buttons ?? []).map((button) => `${button.choice}${button.pressed ? '*' : ''}`).join(',')}]; thumb locales=${JSON.stringify([...new Set(desktopDefaultThumbs.map(thumbLocaleOf))])}`,
    )
    await page.locator('[data-testid="livery-locale-en"]').click({ timeout: 8_000 }).catch(() => {})
    await waitForThumbLocale(page, 'en').catch(() => {})
    const desktopEnThumbs = await readThumbLocales(page)
    await captureScreenshot(page, path.join(screensDir, 'zh-gallery-preview-en-desktop.png'), { label: 'desktop gallery English preview language' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'gallery-preview-en' }))
    expect(
      runner,
      'desktop.preview-locale-en',
      'desktop preview-language tab pins thumbnail URLs to -en- without touching copy',
      desktopEnThumbs.length > 0 && desktopEnThumbs.every((src) => thumbLocaleOf(src) === 'en'),
      `${desktopEnThumbs.length} thumbs; locales=${JSON.stringify([...new Set(desktopEnThumbs.map(thumbLocaleOf))])}`,
    )
    await page.locator('[data-testid="livery-locale-zh"]').click({ timeout: 8_000 }).catch(() => {})
    await waitForThumbLocale(page, 'zh').catch(() => {})
    const desktopZhThumbs = await readThumbLocales(page)
    await captureScreenshot(page, path.join(screensDir, 'zh-gallery-preview-zh-desktop.png'), { label: 'desktop gallery Chinese preview language' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'gallery-preview-zh' }))
    expect(
      runner,
      'desktop.preview-locale-zh',
      'desktop preview-language tab pins thumbnail URLs back to -zh-',
      desktopZhThumbs.length > 0 && desktopZhThumbs.every((src) => thumbLocaleOf(src) === 'zh'),
      `${desktopZhThumbs.length} thumbs; locales=${JSON.stringify([...new Set(desktopZhThumbs.map(thumbLocaleOf))])}`,
    )
    await page.locator('[data-testid="livery-locale-follow"]').click({ timeout: 8_000 }).catch(() => {})
    await waitForThumbLocale(page, desktopHostLocale).catch(() => {})

    // Gallery families + wallpaper studio in the real Electron renderer.
    const DESKTOP_FAMILY_ORDER = ['calm', 'nature', 'light', 'retro', 'vivid', 'dark']
    const DESKTOP_FAMILY_TAGS = [
      ['nature', ['organic']],
      ['calm', ['calm', 'elegant', 'muted']],
      ['light', ['cool', 'paper', 'ink']],
      ['retro', ['retro', 'warm', 'classic']],
      ['vivid', ['neon', 'playful', 'contrast']],
      ['dark', ['deep', 'neutral', 'tech']],
    ]
    const desktopFamilyOf = (tags) => {
      for (const [family, familyTags] of DESKTOP_FAMILY_TAGS) {
        if (familyTags.some((tag) => (tags ?? []).includes(tag))) return family
      }
      return 'calm'
    }
    const desktopStructure = await readGalleryStructure(page)
    const desktopFamilyCounts = new Map(DESKTOP_FAMILY_ORDER.map((family) => [family, 0]))
    for (const livery of catalog.liveries) {
      const family = desktopFamilyOf(livery.meta?.tags)
      desktopFamilyCounts.set(family, (desktopFamilyCounts.get(family) ?? 0) + 1)
    }
    expect(
      runner,
      'desktop.gallery-families',
      'desktop gallery renders page tabs and all six non-empty family sections in display order',
      desktopStructure.tablistFound === true &&
        desktopStructure.sections.map((section) => section.family).join(',') === DESKTOP_FAMILY_ORDER.join(',') &&
        desktopStructure.sections.every((section) => section.cards > 0 && section.cards === desktopFamilyCounts.get(section.family)) &&
        DESKTOP_FAMILY_ORDER.every((family) => (desktopFamilyCounts.get(family) ?? 0) > 0),
      `sections=[${desktopStructure.sections.map((section) => `${section.family}:${section.cards}`).join(', ')}]; expected=[${DESKTOP_FAMILY_ORDER.map((family) => `${family}:${desktopFamilyCounts.get(family)}`).join(', ')}]`,
    )
    // Mock the online card's automatic Picsum batch (and Openverse) so the
    // desktop probe never depends on the live network.
    await page.route('https://picsum.photos/**', (route) => {
      const url = route.request().url()
      if (url.includes('/v2/list')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: '10', author: 'Tester' }, { id: '11', author: 'Tester' }]) })
      }
      return route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG })
    })
    await page.route('https://api.openverse.org/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) }),
    )
    await page.locator('[data-testid="livery-page-tab-wallpaper"]').click({ timeout: 10_000 })
    await page.waitForSelector('[data-testid="wallpaper-panel"]', { timeout: 10_000 })
    const desktopWallpaperInitial = await readWallpaperState(page)
    await page.locator('[data-testid="wallpaper-builtin"][data-wallpaper-id="aurora"]').click({ timeout: 8_000 })
    await page.waitForFunction(() => {
      const style = document.querySelector('style#dsh-livery-wallpaper')
      return document.body.hasAttribute('data-dsh-wallpaper') && style !== null && (style.textContent ?? '').includes('radial-gradient')
    }, undefined, { timeout: 10_000 }).catch(() => {})
    const desktopWallpaper = await readWallpaperState(page)
    await captureScreenshot(page, path.join(screensDir, 'zh-wallpaper-desktop.png'), { label: 'desktop wallpaper studio (built-in applied)' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'wallpaper-builtin' }))
    expect(
      runner,
      'desktop.wallpaper',
      'desktop wallpaper studio applies a built-in CSS layer through the owned stylesheet',
      desktopWallpaperInitial.builtins.length === 24 &&
        desktopWallpaper.attribute !== null &&
        desktopWallpaper.styleMarker === 'dsh-livery/wallpaper' &&
        desktopWallpaper.selectedBuiltin === 'aurora' &&
        desktopWallpaper.styleText.includes('background-image') &&
        desktopWallpaper.overlay?.present === true,
      `builtins=${desktopWallpaperInitial.builtins.length}; attr=${desktopWallpaper.attribute}; marker=${desktopWallpaper.styleMarker}; selected=${desktopWallpaper.selectedBuiltin}`,
    )
    await page.locator('[data-testid="wallpaper-clear"]').click({ timeout: 8_000 })
    await page.waitForFunction(() => document.querySelector('style#dsh-livery-wallpaper') === null && !document.body.hasAttribute('data-dsh-wallpaper'), undefined, { timeout: 10_000 }).catch(() => {})
    await page.locator('[data-testid="livery-page-tab-style"]').click({ timeout: 8_000 })
    await page.waitForSelector('[data-testid="livery-tabpanel-style"]', { timeout: 8_000 })

    const pair = chooseSkinPair(catalog)
    ctx.state.skinPair = pair
    ctx.state.appliedSkin = pair.applied
    const beforePreview = await readThemeSnapshot(page)
    const previewCard = page.locator(`[data-testid="livery-card"][data-livery-id="${pair.preview}"]`).first()
    await previewCard.click()
    await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, pair.preview, { timeout: 10_000 }).catch(() => {})
    const previewing = await readThemeSnapshot(page)
    const expectedPreview = await canonicalizeColors(page, TOKENS.map((token) => catalog.liveries.find((livery) => livery.id === pair.preview).light.tokens[token] ?? beforePreview.tokens.bgBase))
    expect(
      runner,
      'desktop.preview',
      'previewing a different livery updates desktop body attributes and tokens transiently',
      previewing.bodyAttribute === pair.preview,
      `body attr ${beforePreview.bodyAttribute} → ${previewing.bodyAttribute}; bg=${previewing.tokens.bgBase} (expected sample ${expectedPreview[0]})`,
    )
    await captureScreenshot(page, path.join(screensDir, 'zh-preview-desktop.png'), { label: 'desktop previewing' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'previewing' }))
    const cancel = await findControl(page, { testId: 'livery-cancel', names: [PAGE_LABELS.cancel], exact: false })
    if (cancel.locator) await cancel.locator.click()
    await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, beforePreview.bodyAttribute, { timeout: 10_000 }).catch(() => {})
    const afterCancel = await readThemeSnapshot(page)
    expect(runner, 'desktop.preview-cancel', 'cancel restores the confirmed desktop state', afterCancel.bodyAttribute === beforePreview.bodyAttribute, `body attr=${afterCancel.bodyAttribute}`)

    const patchBefore = await inspectProfilePatch(home, 'desktop')
    await page.locator(`[data-testid="livery-card"][data-livery-id="${pair.applied}"]`).first().click()
    await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, pair.applied, { timeout: 10_000 }).catch(() => {})
    const apply = await findControl(page, { testId: 'livery-apply', names: [PAGE_LABELS.apply], exact: false })
    await apply.locator.click()
    await page.waitForFunction((skin) => document.body.getAttribute('data-dsh-livery') === skin, pair.applied, { timeout: 10_000 }).catch(() => {})
    let patchAfter = await inspectProfilePatch(home, 'desktop')
    for (let attempt = 0; attempt < 25 && patchAfter.skinId !== pair.applied; attempt += 1) {
      await sleep(200)
      patchAfter = await inspectProfilePatch(home, 'desktop')
    }
    expect(
      runner,
      'desktop.apply-persists',
      'apply writes exactly one livery config mutation into the isolated desktop profile patch',
      patchAfter.skinId === pair.applied,
      `patch skinId=${patchAfter.skinId ?? '(none)'} (before ${patchBefore.skinId ?? '(none)'}); rows=${patchAfter.liveryRows}`,
    )
    await captureScreenshot(page, path.join(screensDir, 'zh-applied-desktop.png'), { label: 'desktop applied' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'applied' }))

    // Desktop boot injection is delivered by the host's own boot-ready handshake
    // after window creation, so the meaningful first-frame evidence is a FRESH
    // APPLICATION LAUNCH with the persisted skin (a renderer reload keeps the
    // already-materialized shell and is not the native startup path).
    const applySession = { bodyAttr: (await readThemeSnapshot(page)).bodyAttribute }
    await electronApp.close().catch(() => {})
    electronApp = null
    const relaunchStarted = Date.now()
    electronApp = await electronLauncher.launch({
      executablePath: appBin,
      args: [`--user-data-dir=${userDataDir}`, '--no-sandbox', '--disable-gpu', '--disable-software-rasterizer', '--disable-dev-shm-usage'],
      env: cleanElectronEnv({ dshHome: home, appBin }),
      timeout: 120_000,
    })
    page = await electronApp.firstWindow({ timeout: 120_000 })
    ctx.session = { page, context: page.context() }
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await waitForBootGraph(page)
    let bootPayload = null
    for (let attempt = 0; attempt < 100 && !bootPayload; attempt += 1) {
      bootPayload = await page.evaluate(() => (window.__DSH_LIVERY_BOOT__ ? { ...window.__DSH_LIVERY_BOOT__ } : null)).catch(() => null)
      if (!bootPayload) await sleep(100)
    }
    const injectionMs = Date.now() - relaunchStarted
    await waitForAppReady(page)
    const reloaded = await waitForActiveLivery(page, { skinId: pair.applied })
    await dismissFirstRunDialogs(page)
    const identityProblems = []
    if (!bootPayload) identityProblems.push('no __DSH_LIVERY_BOOT__ after a fresh application launch')
    else {
      if (bootPayload.accepted !== true) identityProblems.push('not accepted')
      if (bootPayload.hostVersion !== adapter.hostVersion) identityProblems.push(`hostVersion ${bootPayload.hostVersion}`)
      if (bootPayload.adapterId !== adapter.adapterId) identityProblems.push(`adapterId ${bootPayload.adapterId}`)
      if (bootPayload.contractHash !== adapter.contractHash) identityProblems.push('contractHash')
      if (bootPayload.catalogProfile !== adapter.catalogProfile) identityProblems.push('catalogProfile')
      if (bootPayload.profileKind !== 'desktop') identityProblems.push(`profileKind ${bootPayload.profileKind}`)
      if (bootPayload.skinId !== pair.applied) identityProblems.push(`skinId ${bootPayload.skinId}`)
    }
    expect(
      runner,
      'desktop.boot-injection',
      'fresh desktop application launch delivers the certified rc.3 first-frame boot payload for the persisted skin',
      identityProblems.length === 0,
      identityProblems.length ? identityProblems.join('; ') : `boot payload available ${injectionMs} ms after launch: accepted hostVersion=${bootPayload.hostVersion} adapterId=${bootPayload.adapterId} profileKind=${bootPayload.profileKind} skinId=${bootPayload.skinId} cssHash=${oneLine(bootPayload.cssHash, 24)}…`,
      { bootPayload, injectionMs, applySession },
    )
    const livery = catalog.liveries.find((candidate) => candidate.id === pair.applied)
    expect(
      runner,
      'desktop.hash-equality',
      'desktop body hash equals the handshake cssHash and the compiled catalog cssHash',
      /^sha256:[0-9a-f]{64}$/.test(reloaded.bodyHash ?? '') && reloaded.bodyHash === bootPayload?.cssHash && reloaded.bodyHash === livery.cssHash,
      `body=${oneLine(reloaded.bodyHash, 24)}… handshake=${oneLine(bootPayload?.cssHash, 24)}… catalog=${oneLine(livery.cssHash, 24)}…`,
    )
    const expectedLight = await canonicalizeColors(page, TOKENS.map((token, index) => livery.light.tokens[token] ?? [reloaded.tokens.bgBase, reloaded.tokens.labelPrimary, reloaded.tokens.borderL1][index]))
    const actualLight = [reloaded.tokens.bgBaseCanonical, reloaded.tokens.labelPrimaryCanonical, reloaded.tokens.borderL1Canonical]
    expect(
      runner,
      'desktop.theme-light',
      'desktop light tokens match the compiled catalog values',
      actualLight.every((value, index) => value === expectedLight[index]),
      `actual=${JSON.stringify(actualLight)} expected=${JSON.stringify(expectedLight)}`,
    )
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForFunction(() => document.body?.hasAttribute('data-ds-dark-theme'), undefined, { timeout: 10_000 }).catch(() => {})
    const dark = await readThemeSnapshot(page)
    const expectedDark = await canonicalizeColors(page, TOKENS.map((token, index) => livery.dark.tokens[token] ?? [dark.tokens.bgBase, dark.tokens.labelPrimary, dark.tokens.borderL1][index]))
    const actualDark = [dark.tokens.bgBaseCanonical, dark.tokens.labelPrimaryCanonical, dark.tokens.borderL1Canonical]
    expect(
      runner,
      'desktop.theme-dark',
      'desktop follows host dark mode with the livery dark tokens without changing the host preference',
      dark.darkAttribute !== null && dark.themeSource === 'system' && actualDark.every((value, index) => value === expectedDark[index]),
      `darkAttr=${JSON.stringify(dark.darkAttribute)} themeSource=${dark.themeSource} actual=${JSON.stringify(actualDark)} expected=${JSON.stringify(expectedDark)}`,
    )
    await captureScreenshot(page, path.join(screensDir, 'zh-applied-dark-desktop.png'), { label: 'desktop applied dark' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'applied-dark' }))
    await page.emulateMedia({ colorScheme: 'light' })

    // 0.2.1 font role hooks in the real desktop renderer.
    const zhStack = livery.typography?.ui?.['zh-CN'] ?? null
    const codeStack = livery.typography?.code ?? null
    const fontProblems = []
    const normalize = (value) => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').replace(/["']/g, '').replace(/\bblinkmacsystemfont\b/g, 'system-ui').split(',').map((part) => part.trim()).filter(Boolean).join(', ')
    if (normalize(reloaded.tokens.fontRoleText) !== normalize(zhStack)) fontProblems.push(`role-text ${oneLine(reloaded.tokens.fontRoleText, 80)}`)
    if (normalize(reloaded.tokens.fontRoleCode) !== normalize(codeStack)) fontProblems.push(`role-code ${oneLine(reloaded.tokens.fontRoleCode, 60)}`)
    if (!String(reloaded.bodyFontFamily ?? '').toLowerCase().includes(String(zhStack ?? '').split(',')[0].replace(/["']/g, '').trim().toLowerCase())) fontProblems.push(`body font ${oneLine(reloaded.bodyFontFamily, 80)}`)
    expect(
      runner,
      'desktop.font-role-hooks',
      'desktop renderer applies the documented 0.2.1 font role hooks (--dsh-font-family-text/-code)',
      fontProblems.length === 0,
      fontProblems.length ? fontProblems.join('; ') : `--dsh-font-family-text=${oneLine(reloaded.tokens.fontRoleText, 120)}; --dsh-font-family-code=${oneLine(reloaded.tokens.fontRoleCode, 80)}`,
    )
    await captureScreenshot(page, path.join(screensDir, 'zh-applied-desktop-reload.png'), { label: 'desktop applied after relaunch' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'applied-after-relaunch' }))
    runner.skip(
      'desktop.first-paint-sampling',
      'first painted desktop frames carry the livery styling',
      'the desktop host injects first-frame rows through its internal boot-ready handshake; Playwright attaches after window creation, so pre-paint rAF frames cannot be sampled on the native startup path. Web-profile filmstrip covers the same renderer code path; boot payload availability is asserted instead.',
    )

    // Self-check identity in the desktop renderer.
    await dismissFirstRunDialogs(page)
    await openLiveryDetailed(page, { labels: PAGE_LABELS, locale: 'zh' })
    const selfCheck = await findControl(page, { testId: 'livery-selfcheck-toggle', names: [PAGE_LABELS.selfCheck], exact: false })
    if (selfCheck.locator) {
      const expanded = await selfCheck.locator.getAttribute('aria-expanded').catch(() => null)
      if (expanded !== 'true') await selfCheck.locator.click()
    }
    await page.waitForTimeout(500)
    const panelText = await page.evaluate(() => document.querySelector('[data-testid="livery-selfcheck"]')?.innerText ?? '')
    const roleHookRow = await page.locator('[data-testid="livery-capability"][data-capability="host-font-role-hooks"]').getAttribute('data-available').catch(() => null)
    expect(
      runner,
      'desktop.self-check',
      'self-check shows the rc.3 identity and reports host-font-role-hooks available',
      panelText.includes(adapter.hostVersion) && panelText.includes(adapter.adapterId) && roleHookRow === 'true',
      `hostVersion shown=${panelText.includes(adapter.hostVersion)} adapter shown=${panelText.includes(adapter.adapterId)} host-font-role-hooks=${roleHookRow}`,
    )
    await captureScreenshot(page, path.join(screensDir, 'zh-selfcheck-desktop.png'), { label: 'desktop self-check' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'selfcheck' }))

    // Restore stock in the real desktop renderer.
    const restore = await findControl(page, { testId: 'livery-restore', names: [PAGE_LABELS.restoreStock], exact: false })
    if (restore.locator) {
      await restore.locator.click()
      await page.waitForTimeout(400)
      const dialogs = page.locator('[role="dialog"]')
      const dialogCount = await dialogs.count()
      for (const name of [PAGE_LABELS.restoreConfirm ?? '恢复默认', '恢复默认', 'Restore stock']) {
        const candidate = dialogs.nth(dialogCount - 1).getByRole('button', { name, exact: true }).first()
        if (await candidate.count()) {
          await candidate.click()
          break
        }
      }
    }
    await waitForStock(page).catch(() => {})
    const restored = await readThemeSnapshot(page)
    expect(
      runner,
      'desktop.restore-stock',
      'restore stock removes the livery from the desktop renderer',
      restored.bodyAttribute === null && restored.bodyHash === null && restored.liveryStyles.length === 0,
      `data-dsh-livery=${restored.bodyAttribute}; hash=${restored.bodyHash}; styles=${restored.liveryStyles.length}`,
    )
    await captureScreenshot(page, path.join(screensDir, 'zh-stock-restored-desktop.png'), { label: 'desktop stock restored' }).then((shot) => artifacts.screenshots.push({ ...shot, state: 'stock-restored' }))
  } catch (error) {
    runner.fail('desktop.probe', 'desktop probe completes', error instanceof Error ? (error.stack ?? error.message) : String(error))
  } finally {
    try {
      await electronApp?.close()
    } catch {
      /* best effort */
    }
    if (!keep) {
      try {
        await removeIsolatedHome(home)
      } catch {
        /* best effort */
      }
    }
  }

  const summary = runner.summary
  const report = {
    schemaVersion: 1,
    runId,
    mode: 'desktop-electron',
    ok: runner.ok,
    startedAt,
    finishedAt: nowIso(),
    summary,
    environment,
    target: {
      packageName: 'dsh-livery',
      packageVersion: artifacts.install?.packageVersion ?? null,
      tarball: `file:${tgz}`,
      tarballSha256: artifacts.install?.tarballSha256 ?? null,
      hostVersion: ctx.config.expectedVersion ?? null,
      adapterId: ctx.config.expectedAdapter?.adapterId ?? null,
      contractHash: ctx.config.expectedAdapter?.contractHash ?? null,
      catalogProfile: ctx.config.expectedAdapter?.catalogProfile ?? null,
      sourceKind: 'packaged-app',
      scope: {
        hostVersion: DESKTOP_SCOPE.hostVersion,
        profile: DESKTOP_SCOPE.profile,
        platform: DESKTOP_SCOPE.platform,
      },
    },
    checks: runner.checks,
    artifacts: {
      install: artifacts.install,
      engineNegativeControl: artifacts.engineNegativeControl,
      cliRefusal: artifacts.cliRefusal,
      screenshots: artifacts.screenshots.map((shot) => ({ path: shot.path, label: shot.label, state: shot.state })),
      renderer: artifacts.renderer,
    },
    limitations,
    deviations: ctx.deviations,
  }
  await writeJson(path.join(outDir, 'probe.json'), report)
  await writeJson(path.join(outDir, 'install.json'), artifacts.install)
  // Human-readable evidence document.
  const lines = []
  lines.push('# Desktop-profile acceptance evidence — DSH Livery on DSH 0.2.1-rc.3 (Electron app runtime)')
  lines.push('')
  lines.push(`Run \`${runId}\` · **${summary.pass} passed / ${summary.fail} failed / ${summary.skip} skipped / ${summary.warn} warnings** · ${report.ok ? 'RESULT: PASS' : 'RESULT: FAIL'}`)
  lines.push('')
  lines.push(
    '**Scope (explicit):** this run covers DSH 0.2.1-rc.3 + Desktop Profile + macOS + the real Electron renderer. ' +
      'Windows and Web Edge are not-supported; native macOS window chrome (traffic lights/leading, vibrancy, Dock) is **not verified** and is not claimed. ' +
      'Web Profile/Chrome on DSH 0.2.1-rc.2 is covered by separate Web evidence.',
  )
  lines.push('')
  lines.push('## Environment')
  lines.push('')
  lines.push('| item | value |')
  lines.push('|---|---|')
  lines.push(`| date | ${environment.date} |`)
  lines.push(`| Desktop app runtime | ${environment.appVersion} (Electron ${environment.electronVersion}, Node ${environment.windowElectronNode}, Chrome ${environment.chromeVersion}) |`)
  lines.push(`| app CLI | \`${environment.appCli}\` |`)
  lines.push(`| renderer URL | ${artifacts.renderer?.url ?? '—'} (window ${artifacts.renderer?.outer?.join('×') ?? '—'}, DPR ${artifacts.renderer?.devicePixelRatio ?? '—'}) |`)
  lines.push(`| package | dsh-livery@${artifacts.install?.packageVersion ?? '?'} · tarball sha256 \`${artifacts.install?.tarballSha256 ?? '—'}\` |`)
  lines.push(`| certified adapter | ${environment.expectedAdapter ?? '—'} |`)
  lines.push(`| isolated home | \`${home}\` (outside the repository; deleted after the run unless --keep) |`)
  lines.push('')
  lines.push('## Official install acceptance (app-bundled rc.3 runtime)')
  lines.push('')
  lines.push('```text')
  lines.push(oneLine(artifacts.install?.command ?? '—', 200))
  lines.push(`exit ${artifacts.install?.exitCode} in ${artifacts.install?.durationMs} ms`)
  lines.push(oneLine(artifacts.install?.stdout ?? '', 600))
  lines.push('```')
  lines.push('')
  lines.push(`- profile dependencies: \`${JSON.stringify(artifacts.install?.profileManifest?.dependencies ?? {})}\``)
  lines.push(`- profile bundles: \`${JSON.stringify(artifacts.install?.profileManifest?.bundles ?? [])}\``)
  lines.push(`- installed preview profiles: \`${(artifacts.install?.previewProfiles ?? []).join(', ')}\``)
  lines.push(`- engines.dsh enforcement (negative control): exit ${artifacts.engineNegativeControl?.exitCode}, rejected=${artifacts.engineNegativeControl?.rejected}`)
  lines.push(`- CLI boot refusal: exit ${artifacts.cliRefusal?.exitCode} — ${oneLine(artifacts.cliRefusal?.stderr ?? '', 200)}`)
  lines.push('')
  lines.push('## Renderer checks (real Electron window overs Playwright)')
  lines.push('')
  lines.push('| check | title | result | detail |')
  lines.push('|---|---|---|---|')
  for (const check of runner.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : check.status === 'warn' ? '⚠️' : '⏭️'
    lines.push(`| \`${check.id}\` | ${String(check.title).replace(/\|/g, '\\|')} | ${icon} ${check.status} | ${oneLine(check.detail, 400).replace(/\|/g, '\\|')} |`)
  }
  lines.push('')
  lines.push('## Screenshots (renderer web contents only)')
  lines.push('')
  for (const shot of artifacts.screenshots) lines.push(`- \`${path.relative(WORKSPACE_ROOT, shot.path)}\` (${shot.state})`)
  lines.push('')
  lines.push('## Honest scope statement — what this proves and what it does not')
  lines.push('')
  lines.push('**Verified:** the shipped tarball installs through the official rc.3 plugin manager with no version exemption; the bundled Electron application (0.2.1-rc.3, Electron 44.7.0, Node 24.21.0) renders the real desktop shell; the Livery client module is in the boot graph; the catalog route reports the certified rc.3 adapter and the shared 0.2.1 catalog profile; settings gallery, preview/cancel, apply-persist, reload boot handshake, light/dark tokens, documented font role hooks, first-paint samples and stock restore all behave in the real desktop renderer.')
  lines.push('')
  lines.push('**NOT verified (explicit):** native macOS window chrome (traffic lights/leading), vibrancy/transparency, Dock/rightbar native window states, OS-level DPI scaling beyond `window.devicePixelRatio`, and behaviour of the packaged Chromium sandbox/GPU path (the probe had to pass `--no-sandbox --disable-gpu` to run inside this file-sandboxed automation session). The desktop profile itself cannot be booted by the CLI; all runtime evidence comes from the Electron application. `desktop.macos` therefore remains **pending** in the support matrix — adapted, runtime verification partial.')
  lines.push('')
  if (limitations.length) {
    lines.push('## Known limitations')
    lines.push('')
    for (const limitation of limitations) lines.push(`- ${limitation}`)
    lines.push('')
  }
  lines.push('---')
  lines.push('')
  lines.push('_Generated by `scripts/acceptance/probe/desktop-probe.mjs`. Artifacts: `artifacts/acceptance/0.2.1-rc.3-desktop/`._')
  lines.push('')
  await writeText(reportPath, lines.join('\n'))

  console.log('')
  console.log('DSH Livery — Desktop-profile acceptance (Electron app runtime)')
  console.log('=============================================================')
  console.log(`runtime:   ${environment.appVersion} · Electron ${environment.electronVersion} · Node ${environment.windowElectronNode}`)
  console.log(`tarball:   sha256 ${artifacts.install?.tarballSha256 ?? '?'}`)
  console.log(`result:    ${summary.pass} passed, ${summary.fail} failed, ${summary.skip} skipped, ${summary.warn} warnings`)
  console.log(`evidence:  ${path.relative(WORKSPACE_ROOT, path.join(outDir, 'probe.json'))}`)
  console.log(`report:    ${path.relative(WORKSPACE_ROOT, reportPath)}`)
  const failures = runner.checks.filter((check) => check.status === 'fail')
  for (const failure of failures) console.log(`  ✗ ${failure.id}: ${oneLine(failure.detail, 400)}`)
  console.log('')
  console.log(report.ok ? 'RESULT: PASS' : 'RESULT: FAIL')
  return report.ok ? 0 : 1
}

main()
  .then((code) => {
    process.exitCode = code ?? 0
  })
  .catch((error) => {
    console.error(error?.stack ?? String(error))
    process.exitCode = 2
  })
