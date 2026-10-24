#!/usr/bin/env node
/**
 * DSH Livery — black-box Web-profile acceptance harness.
 *
 * One command proves the shipped plugin works in the real Web profile:
 *
 *   node scripts/acceptance-web.mjs --tgz dist/dsh-livery-0.1.0.tgz
 *   node scripts/acceptance-web.mjs --reuse "http://127.0.0.1:3080/?token=…"   # read-only
 *
 * The isolated path creates its own DSH_HOME under `.tmp/acceptance/`, installs
 * the tarball through the official `dsh plugin --profile web add` path, boots
 * `dsh --profile web --no-open --port 0`, drives the app with system Chrome via
 * playwright-core, then uninstalls through the official path and proves there
 * is no residue after a restart. Nothing outside the workspace is written and
 * the user's real `~/.dsh` is never touched.
 *
 * Exit code 0 = every check passed (skips/warnings allowed); 1 = at least one
 * failed check; 2 = the run could not start (bad arguments, missing tarball,
 * playwright-core unavailable, boot failed before any check ran).
 */

import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  CheckRunner,
  DEFAULT_ARTIFACTS,
  DEFAULT_DSH_HOME,
  TMP_ROOT,
  WORKSPACE_ROOT,
  assertIsolatedHome,
  ensureDir,
  nowIso,
  oneLine,
  parseArgs,
  redact,
  safeRemoveTree,
} from './probe/util.mjs'
import { dshVersion, installPlugin, profilePaths, resolveDshBin, summarizeOperation } from './probe/dsh-home.mjs'
import { bootWeb, stopWeb } from './probe/boot.mjs'
import { launchChrome } from './probe/playwright.mjs'
import { bootstrapPage, newSession } from './probe/browser.mjs'
import {
  checkAppliedTheme,
  checkBootHandshake,
  checkCatalog,
  checkFirstPaint,
  checkFonts,
  checkResponsive,
  checkRestoreStock,
  checkSelfCheck,
  checkSettingsFlow,
  checkStockInitial,
  checkUninstallResidue,
  collectProfileEvidence,
} from './probe/checks.mjs'
import { labelOverrides } from './probe/labels-runtime.mjs'
import { labelsFor } from './probe/labels.mjs'
import { writeEvidence, writeMarkdownReport } from './probe/report.mjs'
import { probeBrowserTrust, probePluginBundle } from './probe/http.mjs'

const USAGE = `DSH Livery Web-profile acceptance harness

Usage:
  node scripts/acceptance-web.mjs [options]

Options:
  --tgz <path>            Plugin tarball to install into an isolated DSH_HOME (required unless --reuse)
  --dsh-home <path>       Isolated Harness home (default: .tmp/acceptance/dsh-home); must live under .tmp/
  --reuse <url>           Drive an already-running dsh web profile (printed dsh web: URL with token); read-only
  --keep                  Keep the isolated home and browser artifacts after the run
  --json <path>           probe.json output (default: artifacts/acceptance/probe.json)
  --report <path>         Markdown evidence report (default: docs/verification/web-acceptance.md)
  --out <dir>             Evidence directory (default: artifacts/acceptance)
  --port <n>              Port for the isolated boot (default: 0 = OS-assigned)
  --boot-timeout <ms>     Readiness timeout (default: 120000)
  --plugin-id <id>        Client module graph id (default: dsh-livery)
  --package <name>        npm package name installed in the profile (default: dsh-livery)
  --profile-name <name>   Screenshot/profile bucket name (default: web-chrome / reuse)
  --locale <zh|en>        Browser locale for the primary pass (default: zh)
  --labels <json>         Override UI label copy (path to JSON, or inline JSON)
  --pw-core <path>        playwright-core index.mjs to import
  --dsh-bin <path>        dsh executable (default: PATH)
  --headed                Show the Chrome window (debugging only)
  --unsafe-mutate         In --reuse mode allow settings writes (apply/restore)
  --no-report             Do not write the Markdown report
  --no-clean              Keep the isolated home even without --keep (alias)
  -h, --help              This help

Exit codes: 0 all checks passed; 1 failed checks; 2 harness could not run.`

function printUsage() {
  process.stdout.write(`${USAGE}\n`)
}

function failStartup(message, details) {
  const error = new Error(message)
  error.details = details
  error.startup = true
  throw error
}

async function main() {
  const argv = process.argv.slice(2)
  let options
  try {
    options = parseArgs(argv, {
      booleans: ['keep', 'headed', 'unsafe-mutate', 'no-report', 'no-clean', 'help'],
      strings: [
        'tgz',
        'dsh-home',
        'reuse',
        'json',
        'report',
        'out',
        'port',
        'boot-timeout',
        'plugin-id',
        'package',
        'profile-name',
        'locale',
        'labels',
        'pw-core',
        'dsh-bin',
        'title',
      ],
      aliases: { h: 'help' },
    })
  } catch (error) {
    printUsage()
    failStartup(`bad arguments: ${error.message}`)
  }
  if (options.help) {
    printUsage()
    return 0
  }

  const reuse = options.reuse ?? null
  const tgz = options.tgz ? path.resolve(options.tgz) : null
  if (!reuse && !tgz) failStartup('either --tgz <path> (isolated run) or --reuse <url> (existing profile) is required')
  if (reuse && tgz) failStartup('--reuse and --tgz are mutually exclusive')

  const outDir = path.resolve(options.out ?? DEFAULT_ARTIFACTS)
  const screensDir = path.join(outDir, 'screens')
  const htmlDir = path.join(outDir, 'html')
  const filmstripDir = path.join(outDir, 'filmstrip')
  const logsDir = path.join(TMP_ROOT, 'logs')
  const dshHome = reuse ? null : assertIsolatedHome(options['dsh-home'] ?? DEFAULT_DSH_HOME)
  const keep = Boolean(options.keep || options['no-clean'])
  const locale = options.locale === 'en' ? 'en' : 'zh'
  const pluginId = options['plugin-id'] ?? 'dsh-livery'
  const packageName = options.package ?? (pluginId === 'dsh-livery' ? 'dsh-livery' : pluginId)
  const mode = reuse ? 'reuse' : 'isolated'
  const profileName = options['profile-name'] ?? (reuse ? 'reuse' : `web-chrome-${packageName}`)
  const bootTimeout = Number(options['boot-timeout'] ?? 120_000)
  const reportPath = options['no-report'] ? null : path.resolve(options.report ?? path.join(WORKSPACE_ROOT, 'docs', 'verification', 'web-acceptance.md'))
  const jsonPath = path.resolve(options.json ?? path.join(outDir, 'probe.json'))

  const ctx = {
    runId: `${new Date().toISOString().replace(/[:.]/g, '-')}-${mode}`,
    startedAt: nowIso(),
    config: {
      mode,
      tgz,
      dshHome,
      reuseUrl: reuse,
      pluginId,
      packageName,
      profileName,
      outDir,
      screensDir,
      htmlDir,
      filmstripDir,
      logsDir,
      jsonPath,
      reportPath,
      locale,
      bootTimeout,
      dshBin: resolveDshBin(options['dsh-bin']),
      keep,
      allowMutations: Boolean(options['unsafe-mutate']),
      headed: Boolean(options.headed),
      pwCore: options['pw-core'],
      labelOverrides: options.labels ?? null,
      title: options.title ?? null,
      liveryMode: pluginId === 'dsh-livery',
      baseUrl: null,
    },
    runner: new CheckRunner(),
    environment: {},
    state: {},
    artifacts: { screenshots: [], filmstrip: [], html: [] },
    phases: [],
    deviations: [],
    knownLimitations: [
      'HONEST GAP — IMPLEMENTATION_PLAN.md §20 "at least one safe layout capability actually effective" cannot be met on DSH 0.2.0-rc.2: the certified contract exposes no public density / transcript-width / message-flow hook (all three capability facts are unavailable). Livery degrades layout to host/stock and reports the unavailable capabilities in the self-check rather than faking them. Wallpaper is removed from schema v1.',
      'Web profile only: Desktop / macOS / Windows native-window criteria from §18.9/§20 (Electron surface, caption, traffic lights, Dock) are out of scope for this harness.',
      'Disable/hot-reload state-machine transitions and unknown-version fail-closed to stock are covered by unit/contract tests; this black-box run proves install → boot → stock start → settings apply → hard reload → restore stock → official uninstall → restart residue.',
      '§18.8 p95/CLS statistics need ≥30 samples per scenario; this run records per-run byte budgets and one cold-start paint trace/filmstrip, not a statistical distribution.',
      'DSH 0.2.0-rc.2 serves client bundles only through boot-graph grouped URLs (`plugins/??<pkg>/client.js&rev=…`); the bare `/plugins/<pkg>/client.js?rev=` form returns 404 in this build (asserted as a documented warning).',
      'No Playwright browser download is used: the harness drives the system Chrome through `channel: \'chrome\'`.',
    ],
  }
  ctx.config.labels = labelsFor(locale)
  if (ctx.config.labelOverrides) {
    try {
      const override = labelOverrides(ctx.config.labelOverrides)
      ctx.config.labels = { ...ctx.config.labels, ...override }
    } catch (error) {
      ctx.deviations.push(`label override ignored: ${error.message}`)
    }
  }

  await ensureDir(outDir)
  await ensureDir(screensDir)
  await ensureDir(htmlDir)
  await ensureDir(filmstripDir)
  await ensureDir(logsDir)

  const phaseStarts = {}
  const phase = (name) => {
    phaseStarts[name] = Date.now()
    return {
      record: (ok, detail) => {
        ctx.phases.push({ name, startedAt: new Date(phaseStarts[name]).toISOString(), durationMs: Date.now() - phaseStarts[name], ok, detail })
      },
    }
  }

  let bootHandle = null
  let postBootHandle = null
  let browserInfo = null

  try {
    // ---------------------------------------------------------------- prepare
    {
      const p = phase('prepare')
      const dshVersionInfo = await dshVersion(ctx.config.dshBin, reuse ? undefined : path.join(dshHome, '.version-probe'))
      ctx.environment.dshVersion = dshVersionInfo.version
      ctx.environment.osRelease = (await import('node:os')).release()
      if (!reuse) {
        if (!(await access(tgz).then(() => true, () => false))) failStartup(`tarball not found: ${tgz}`)
        const manifest = await readTarballManifest(tgz)
        ctx.environment.packageVersion = manifest?.version ?? null
        ctx.environment.packageName = manifest?.name ?? null
        if (manifest && manifest.name !== packageName) {
          ctx.deviations.push(`tarball package name "${manifest.name}" differs from --package "${packageName}"`)
        }
        if (!keep) await safeRemoveTree(dshHome)
        await ensureDir(dshHome)
        ctx.install = await installPlugin({ bin: ctx.config.dshBin, home: dshHome, tgz, packageName })
        ctx.state.installTimings = { durationMs: ctx.install.durationMs, exitCode: ctx.install.exitCode, stdout: oneLine(ctx.install.stdout, 600), stderr: oneLine(ctx.install.stderr, 600) }
        const installedOk = ctx.install.exitCode === 0 && Boolean(ctx.install.dependencies?.[packageName]) && ctx.install.bundles?.includes(packageName)
        ctx.runner.add(
          installedOk ? 'pass' : 'fail',
          'lifecycle.install',
          'official `dsh plugin --profile web add file:<tgz>` installs and selects the bundle',
          `${summarizeOperation(ctx.install)}; dependency=${ctx.install.dependencies?.[packageName] ?? '(none)'}; bundles=${JSON.stringify(ctx.install.bundles ?? [])}`,
          { command: ctx.install.command, stdout: ctx.install.stdout, stderr: ctx.install.stderr },
        )
        if (!installedOk) failStartup('plugin install did not take effect', { install: ctx.install })
        // Read the installed package.json for the version record (post-install truth).
        const installedManifest = await readFile(path.join(profilePaths(dshHome).nodeModules, packageName, 'package.json'), 'utf8').catch(() => null)
        if (installedManifest) {
          try {
            ctx.environment.packageVersion = JSON.parse(installedManifest).version ?? ctx.environment.packageVersion
          } catch {
            /* informational */
          }
        }
        ctx.runner.pass('lifecycle.profile-initialized', 'isolated profile initialized from the shipped web template', `home=${dshHome}; profile=${profilePaths(dshHome).profileDir}; initialized=${ctx.install.initializedProfile}; sha256=${ctx.install.tarballSha256 ?? '?'}`)
      } else {
        const url = new URL(reuse)
        if (!url.searchParams.get('token')) failStartup('--reuse URL must be the printed `dsh web: …/?token=<hex>` URL (token is required for the one-time cookie exchange)')
        if (!/^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname)) failStartup(`--reuse URL must be loopback, got host ${url.hostname}`)
        ctx.config.baseUrl = url.origin
        ctx.dshWebLine = `dsh web: ${reuse}`
        ctx.runner.pass('lifecycle.reuse', 'reusing an already-running web profile (read-only)', `base=${url.origin}; no install, no boot, no uninstall`)
      }
      p.record(true, `dsh ${ctx.environment.dshVersion}; ${reuse ? 'reuse' : summarizeOperation(ctx.install)}`)
    }

    // ------------------------------------------------------------------- boot
    let bootUrl
    let bootBaseUrl
    if (!reuse) {
      const p = phase('boot')
      bootHandle = await bootWeb({
        bin: ctx.config.dshBin,
        home: dshHome,
        port: Number(options.port ?? 0),
        timeoutMs: bootTimeout,
        logPath: path.join(logsDir, 'web.log'),
      })
      ctx.boot = bootHandle
      ctx.state.bootTimings = { readyMs: bootHandle.readyMs, port: bootHandle.port, pid: bootHandle.pid, logPath: bootHandle.logPath }
      ctx.dshWebLine = `dsh web: ${bootHandle.url}`
      bootUrl = bootHandle.url
      bootBaseUrl = bootHandle.baseUrl
      ctx.config.baseUrl = bootHandle.baseUrl
      ctx.runner.pass('lifecycle.boot', '`dsh --profile web --no-open --port 0` boots and prints its authenticated URL', `ready in ${bootHandle.readyMs}ms on port ${bootHandle.port}; log=${bootHandle.logPath}`, { url: redact(bootHandle.url), readyMs: bootHandle.readyMs, pid: bootHandle.pid })
      p.record(true, `ready in ${bootHandle.readyMs}ms port ${bootHandle.port}`)
    } else {
      bootUrl = reuse
      bootBaseUrl = ctx.config.baseUrl
      ctx.dshWebLine = `dsh web: ${reuse}`
    }

    // -------------------------------------------------------------- browser
    {
      const p = phase('browser')
      browserInfo = await launchChrome({ explicitPlaywright: ctx.config.pwCore, headless: !ctx.config.headed })
      ctx.environment.chromeVersion = browserInfo.chromeVersion
      ctx.environment.playwrightVersion = browserInfo.playwrightVersion
      ctx.browser = browserInfo.browser
      ctx.runner.pass('env.browser', 'system Chrome launches through playwright-core (no browser download)', `Chrome ${browserInfo.chromeVersion}; playwright-core ${browserInfo.playwrightVersion} at ${oneLine(browserInfo.playwrightPath, 160)}`)
      p.record(true, `Chrome ${browserInfo.chromeVersion}`)
    }

    // ------------------------------------------------------- primary session
    const session = await newSession(browserInfo.browser, { baseUrl: bootBaseUrl, pluginId, locale, colorScheme: 'light' })
    ctx.session = session
    try {
      const p = phase('boot-handshake')
      const navigation = await bootstrapPage(session.page, bootUrl)
      ctx.state.navigation = navigation
      ctx.runner.add(
        navigation.tokenDropped ? 'pass' : 'fail',
        'boot.token-exchange',
        'launch token is exchanged for the signed cookie and dropped from the URL',
        `final url ${navigation.finalUrl}; navigation ${navigation.navigationMs}ms`,
        navigation,
      )
      const pGraph = phase('boot-graph')
      await checkBootHandshake(ctx)
      pGraph.record(!ctx.runner.checks.some((check) => check.id.startsWith('boot.graph-entry') && check.status === 'fail'), '')
      p.record(true, '')
    } catch (error) {
      ctx.runner.fail('boot.session', 'authenticated browser session reaches the app shell', error instanceof Error ? (error.stack ?? error.message) : String(error))
      throw error
    }

    // ------------------------------------------------------------- probe
    const probeGroups = [
      ['trust', async () => {
        const cookieJar = await session.context.cookies()
        const cookieHeader = cookieJar.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
        ctx.state.cookieHeader = cookieHeader
        const trust = await probeBrowserTrust({ baseUrl: bootBaseUrl, token: new URL(bootUrl).searchParams.get('token') })
        for (const check of trust.checks) {
          ctx.runner.add(check.passed ? 'pass' : 'fail', check.id, check.id.replace(/^trust\./, 'browser trust: ').replace(/-/g, ' '), check.detail, check.evidence)
        }
        ctx.state.indexHtml = trust.indexHtml
        await writeFile(path.join(htmlDir, 'index.html'), trust.indexHtml).catch(() => {})
      }],
      ['stock', async () => checkStockInitial(ctx)],
      ...(ctx.config.liveryMode
        ? [
            ['catalog', async () => checkCatalog(ctx)],
            ['settings', async () => checkSettingsFlow(ctx)],
            ['theme', async () => checkAppliedTheme(ctx)],
            ['fonts', async () => checkFonts(ctx)],
            ['selfcheck', async () => checkSelfCheck(ctx)],
            ['firstpaint', async () => checkFirstPaint(ctx)],
            ['web', async () => checkResponsive(ctx)],
            ['restore', async () => checkRestoreStock(ctx)],
          ]
        : []),
    ]
    const checkAreaOf = (id) => String(id).split('.')[0]
    for (const [name, run] of probeGroups) {
      const p = phase(name)
      const area = checkAreaOf(name)
      try {
        await run()
        p.record(!ctx.runner.checks.some((check) => checkAreaOf(check.id) === area && check.status === 'fail'), '')
      } catch (error) {
        const failure = ctx.runner.fail(`probe.${name}`, `probe group "${name}" completes`, error instanceof Error ? (error.stack ?? error.message) : String(error))
        p.record(false, String(error?.message ?? error))
        // Capture the page as it was when the group blew up: a screenshot, the
        // HTML and whatever modal/overlay was on top, so a UI failure is
        // diagnosable from the artifacts alone.
        try {
          const page = ctx.session?.page
          if (page) {
            const shot = path.join(ctx.config.screensDir, ctx.config.profileName, `failure-${name}.png`)
            await page.screenshot({ path: shot, animations: 'disabled' }).catch(() => {})
            const html = await page.content().catch(() => '')
            const file = path.join(ctx.config.htmlDir, `failure-${name}.html`)
            await writeFile(file, html).catch(() => {})
            const overlays = await page
              .evaluate(() => [...document.querySelectorAll('[role="presentation"], [role="dialog"], [aria-hidden="true"]')].map((element) => ({ role: element.getAttribute('role'), cls: String(element.className).slice(0, 120), text: (element.textContent ?? '').trim().slice(0, 300) })).slice(0, 12))
              .catch(() => [])
            failure.evidence = { screenshot: shot, html: file, overlays }
          }
        } catch {
          /* diagnostics are best effort */
        }
      }
    }

    // console/network ownership assertions
    {
      const pluginErrors = session.record.console.filter((entry) => entry.type === 'error' && entry.liveryOwned)
      const ownedPageErrors = session.record.pageErrors.filter((entry) => /dsh-livery|\/livery\//.test(`${entry.message} ${entry.stack}`))
      const ownedFailed = session.record.requestFailed.filter((entry) => entry.liveryOwned)
      const ownedHttpErrors = session.record.httpErrors.filter((entry) => entry.liveryOwned)
      const preview404 = session.record.liveryResponses.filter((entry) => entry.status === 404 && entry.url.includes('/livery/assets/previews/'))
      ctx.runner.add(
        pluginErrors.length + ownedPageErrors.length + ownedFailed.length + ownedHttpErrors.length === 0 ? 'pass' : 'fail',
        'console.no-livery-errors',
        'no console errors, page errors, failed requests or 4xx/5xx responses for Livery-owned URLs',
        `${pluginErrors.length} console error(s), ${ownedPageErrors.length} page error(s), ${ownedFailed.length} failed request(s), ${ownedHttpErrors.length} HTTP error response(s)` +
          (ownedHttpErrors.length ? `: ${ownedHttpErrors.slice(0, 6).map((entry) => `${entry.status} ${new URL(entry.url).pathname}`).join(', ')}` : ''),
        { pluginErrors, ownedPageErrors, ownedFailed, ownedHttpErrors },
      )
      ctx.runner.add(
        preview404.length === 0 ? 'pass' : 'fail',
        'previews.no-404',
        'no 404 responses for /livery/assets/previews/*',
        `${preview404.length} 404 preview response(s)` + (preview404.length ? `: ${preview404.slice(0, 8).map((entry) => new URL(entry.url).pathname).join(', ')}` : ''),
      )
      const otherWarnings = session.record.console.filter((entry) => entry.type === 'warning' && !entry.liveryOwned)
      if (otherWarnings.length) {
        ctx.runner.warn('console.host-warnings', 'host/plugin console warnings outside Livery ownership', `${otherWarnings.length} warning(s): ${oneLine(otherWarnings.slice(0, 5).map((entry) => entry.text).join(' | '), 600)}`)
      }
    }

    // ----------------------------------------------------------- lifecycle
    {
      const p = phase('lifecycle')
      try {
        await checkUninstallResidue(ctx)
        p.record(!ctx.runner.checks.some((check) => String(check.id).startsWith('residue.') && check.status === 'fail'), '')
      } catch (error) {
        ctx.runner.fail('lifecycle.uninstall', 'uninstall + restart leaves no residue', error instanceof Error ? (error.stack ?? error.message) : String(error))
        p.record(false, String(error?.message ?? error))
      }
    }

    // Snapshot the console/network record while the app is still live (before
    // any shutdown noise) and archive it for evidence.
    ctx.state.consoleSnapshot = {
      console: (session.record.console ?? []).filter((entry) => entry.type !== 'log' && entry.type !== 'info' && entry.type !== 'debug'),
      pageErrors: [...(session.record.pageErrors ?? [])],
      requestFailed: [...(session.record.requestFailed ?? [])],
      httpErrors: [...(session.record.httpErrors ?? [])],
      liveryResponses: (session.record.liveryResponses ?? []).filter((entry) => entry.status >= 400),
      responses: (session.record.allResponses ?? []).filter((entry) => /\/livery\/|dsh-livery/.test(entry.url)),
    }
    // collect profile evidence (before cleanup)
    ctx.profileEvidence = await collectProfileEvidence(ctx)
  } catch (error) {
    if (!ctx.runner.checks.some((check) => check.status === 'fail')) {
      ctx.runner.fail('harness.run', 'acceptance harness completes', error instanceof Error ? (error.stack ?? error.message) : String(error))
    }
    ctx.startupError = error instanceof Error ? error.message : String(error)
    process.exitCode = error.startup ? 2 : 1
    ctx.phases.push({ name: 'aborted', startedAt: new Date().toISOString(), durationMs: 0, ok: false, detail: oneLine(ctx.startupError, 800) })
  } finally {
    // Stop any still-running servers before writing evidence.
    const liveHandles = [bootHandle, ctx.state.postUninstallBoot].filter(Boolean)
    for (const handle of liveHandles) {
      try {
        await stopWeb(handle, { timeoutMs: 15_000 })
      } catch {
        /* best effort */
      }
    }
    if (browserInfo?.browser) await browserInfo.browser.close().catch(() => {})
    if (dshHome && !keep) {
      try {
        await safeRemoveTree(dshHome)
      } catch (error) {
        ctx.deviations.push(`could not remove isolated home: ${error.message}`)
      }
    }
  }

  // --------------------------------------------------------------- report
  let report
  try {
    report = await writeEvidence(ctx)
    if (reportPath) await writeMarkdownReport(report, reportPath, ctx.config.title ? { title: ctx.config.title } : undefined)
    if (ctx.runner.checks.some((check) => check.status === 'fail')) process.exitCode = 1
  } catch (error) {
    console.error(`failed to write evidence: ${error instanceof Error ? error.stack : error}`)
    process.exitCode = 2
  }

  printSummary(ctx, report)
  return process.exitCode ?? (ctx.runner.ok ? 0 : 1)
}

async function readTarballManifest(tgz) {
  try {
    const { spawn } = await import('node:child_process')
    const output = await new Promise((resolve) => {
      const child = spawn('tar', ['-xOf', tgz, 'package/package.json'], { stdio: ['ignore', 'pipe', 'pipe'] })
      const chunks = []
      child.stdout.on('data', (chunk) => chunks.push(chunk))
      child.on('close', () => resolve(Buffer.concat(chunks).toString('utf8')))
      child.on('error', () => resolve(''))
    })
    return JSON.parse(output)
  } catch {
    return null
  }
}

function printSummary(ctx, report) {
  const { runner } = ctx
  const failures = runner.checks.filter((check) => check.status === 'fail')
  const skips = runner.checks.filter((check) => check.status === 'skip')
  const warnings = runner.checks.filter((check) => check.status === 'warn')
  const passed = runner.checks.filter((check) => check.status === 'pass')
  console.log('')
  console.log('DSH Livery — Web-profile acceptance')
  console.log('===================================')
  console.log(`mode:        ${ctx.config.mode}${ctx.config.mode === 'isolated' ? ` (isolated DSH_HOME: ${ctx.config.dshHome})` : ' (read-only reuse)'}`)
  console.log(`target:      ${ctx.config.packageName}@${ctx.environment.packageVersion ?? '?'}  plugin id: ${ctx.config.pluginId}`)
  console.log(`environment: dsh ${ctx.environment.dshVersion ?? '?'} · Chrome ${ctx.environment.chromeVersion ?? '?'} · playwright-core ${ctx.environment.playwrightVersion ?? '?'}`)
  console.log(`result:      ${passed.length} passed, ${failures.length} failed, ${skips.length} skipped, ${warnings.length} warnings`)
  console.log(`evidence:    ${path.relative(WORKSPACE_ROOT, ctx.config.jsonPath)}`)
  if (ctx.config.reportPath) console.log(`report:      ${path.relative(WORKSPACE_ROOT, ctx.config.reportPath)}`)
  if (ctx.state.filmstrip?.frames?.length) console.log(`filmstrip:   ${ctx.state.filmstrip.frames.length} frames in ${path.relative(WORKSPACE_ROOT, ctx.config.filmstripDir)}`)
  if (ctx.state.applyMutation) console.log(`apply:       ${oneLine(ctx.state.applyMutation.detail, 200)}`)
  if (failures.length) {
    console.log('')
    console.log('FAILED checks:')
    for (const failure of failures) console.log(`  ✗ ${failure.id}: ${failure.title}\n      ${oneLine(failure.detail, 500)}`)
  }
  if (skips.length) {
    console.log('')
    console.log('SKIPPED checks:')
    for (const skip of skips) console.log(`  ⏭ ${skip.id}: ${oneLine(skip.detail, 300)}`)
  }
  console.log('')
  console.log(ctx.runner.ok ? 'RESULT: PASS' : 'RESULT: FAIL')
}

main().catch((error) => {
  if (error?.startup || !error?.message) {
    console.error(`harness could not run: ${error?.message ?? error}`)
    if (error?.details) console.error(JSON.stringify(error.details, null, 2).slice(0, 4000))
  } else {
    console.error(error.stack ?? String(error))
  }
  process.exit(2)
})
