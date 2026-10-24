/**
 * Evidence assembly: probe.json, console.json, timings.json and the auto-filled
 * Markdown acceptance report under docs/verification/.
 */

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { oneLine, redact, writeJson, writeText } from './util.mjs'

const CHECK_AREA_TITLES = {
  env: 'Environment',
  boot: 'Boot graph & handshake',
  bundle: 'Client bundle route',
  trust: 'Browser trust / auth fence',
  catalog: 'Catalog route',
  previews: 'Preview assets',
  handshake: 'First-frame handshake',
  stock: 'Stock baseline',
  settings: 'Settings section',
  gallery: 'Gallery',
  search: 'Search',
  keyboard: 'Keyboard navigation',
  preview: 'Preview',
  apply: 'Apply & persistence',
  theme: 'Theme tokens',
  css: 'CSS safety',
  web: 'Web surface',
  fonts: 'Fonts / locale',
  selfcheck: 'Self-check & diagnostics',
  firstpaint: 'First paint',
  restore: 'Stock restore',
  lifecycle: 'Lifecycle',
  residue: 'Uninstall residue',
}

function checkArea(id) {
  return id.split('.')[0] ?? 'other'
}

function statusIcon(status) {
  return status === 'pass' ? '✅' : status === 'fail' ? '❌' : status === 'warn' ? '⚠️' : '⏭️'
}

function formatDuration(ms) {
  if (typeof ms !== 'number') return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

/** Condense the catalog into evidence-friendly facts (tokens for all liveries kept). */
function summarizeCatalog(catalog) {
  if (!catalog) return null
  return {
    schemaVersion: catalog.schemaVersion,
    compilerVersion: catalog.compilerVersion,
    adapterId: catalog.adapterId,
    hostVersion: catalog.hostVersion,
    contractHash: catalog.contractHash,
    capabilities: catalog.capabilities,
    liveries: (catalog.liveries ?? []).map((livery) => ({
      id: livery.id,
      name: livery.meta?.name,
      tags: livery.meta?.tags,
      order: livery.meta?.order,
      layout: livery.layout,
      typography: livery.typography,
      light: livery.light?.tokens,
      dark: livery.dark?.tokens,
      audit: livery.audit,
      hash: livery.hash,
    })),
  }
}

export function buildProbeReport(ctx) {
  const environment = {
    date: new Date().toISOString(),
    dshVersion: ctx.environment?.dshVersion,
    nodeVersion: process.version,
    platform: process.platform,
    osRelease: ctx.environment?.osRelease,
    arch: process.arch,
    chromeVersion: ctx.environment?.chromeVersion,
    playwrightVersion: ctx.environment?.playwrightVersion,
  }
  const target = {
    packageName: ctx.config.packageName,
    pluginId: ctx.config.pluginId,
    packageVersion: ctx.environment?.packageVersion ?? null,
    tarball: ctx.install?.spec ?? ctx.config.tgz ?? null,
    tarballSha256: ctx.install?.tarballSha256 ?? null,
  }
  const summary = ctx.runner.summary
  const report = {
    schemaVersion: 1,
    runId: ctx.runId,
    mode: ctx.config.mode,
    ok: ctx.runner.ok,
    startedAt: ctx.startedAt,
    finishedAt: new Date().toISOString(),
    summary,
    environment,
    target,
    config: {
      profileName: ctx.config.profileName,
      dshHome: redact(ctx.config.dshHome ?? ''),
      reuseUrl: ctx.config.reuseUrl ? redact(ctx.config.reuseUrl) : null,
      locale: ctx.config.locale,
      bootTimeoutMs: ctx.config.bootTimeout,
      artifactsDir: ctx.config.outDir,
      reportPath: ctx.config.reportPath,
      readOnly: ctx.config.mode === 'reuse' && !ctx.config.allowMutations,
    },
    dshWebLine: redact(ctx.dshWebLine ?? ''),
    boot: {
      readyMs: ctx.state.bootTimings?.readyMs ?? null,
      installMs: ctx.install?.durationMs ?? null,
      port: ctx.state.bootTimings?.port ?? null,
    },
    phases: ctx.phases,
    checks: ctx.runner.checks,
    artifacts: {
      screenshots: ctx.artifacts.screenshots.map((shot) => ({ path: shot.path, label: shot.label, locale: shot.locale, mode: shot.mode, state: shot.state })),
      filmstrip: {
        dir: ctx.config.filmstripDir,
        frames: (ctx.state.filmstrip?.frames ?? []).map((frame) => ({ path: frame.file, index: frame.index, t: frame.t })),
        manifest: ctx.state.filmstrip?.manifestPath ?? null,
      },
      consoleJson: path.join(ctx.config.outDir, 'console.json'),
      timingsJson: path.join(ctx.config.outDir, 'timings.json'),
      htmlDir: ctx.config.htmlDir,
      probeJson: ctx.config.jsonPath,
      reportMarkdown: ctx.config.reportPath,
    },
    evidence: {
      catalog: summarizeCatalog(ctx.state.catalog),
      stockTokens: ctx.state.stockTokens ?? null,
      appliedSkin: ctx.state.appliedSkin ?? null,
      previewSkin: ctx.state.skinPair?.preview ?? null,
      applyMutation: ctx.state.applyMutation ?? null,
      selfCheck: ctx.state.selfCheck ?? null,
      firstPaint: ctx.state.firstPaint
        ? { frames: ctx.state.firstPaint.frames, paintTimings: ctx.state.firstPaint.paintTimings, samples: (ctx.state.firstPaint.samples?.samples ?? []).slice(0, 20) }
        : null,
      clipboard: ctx.state.clipboard ?? null,
      lifecycle: ctx.lifecycle ?? null,
      profile: ctx.profileEvidence ?? null,
      deviations: ctx.deviations ?? [],
      knownLimitations: ctx.knownLimitations ?? [],
    },
  }
  return report
}

/** Persist console.json, timings.json (if not already), and probe.json. */
export async function writeEvidence(ctx) {
  const record = ctx.session?.record ?? {}
  const snapshot = ctx.state.consoleSnapshot
  const consoleEvidence = snapshot
    ? {
        runId: ctx.runId,
        capturedBeforeShutdown: true,
        urls: { baseUrl: redact(ctx.config.baseUrl ?? ''), reuse: ctx.config.reuseUrl ? redact(ctx.config.reuseUrl) : null },
        ...snapshot,
        liveryOwnedErrorCount: (snapshot.console ?? []).filter((entry) => entry.type === 'error' && entry.liveryOwned).length,
      }
    : {
        runId: ctx.runId,
        urls: { baseUrl: redact(ctx.config.baseUrl ?? ''), reuse: ctx.config.reuseUrl ? redact(ctx.config.reuseUrl) : null },
        console: (record.console ?? []).filter((entry) => entry.type !== 'log' && entry.type !== 'info' && entry.type !== 'debug'),
        pageErrors: record.pageErrors ?? [],
        requestFailed: record.requestFailed ?? [],
        httpErrors: record.httpErrors ?? [],
        liveryResponses: (record.liveryResponses ?? []).filter((entry) => entry.status >= 400),
        liveryOwnedErrorCount: (record.console ?? []).filter((entry) => entry.type === 'error' && entry.liveryOwned).length,
      }
  await writeJson(path.join(ctx.config.outDir, 'console.json'), consoleEvidence)
  if (!ctx.state.timingsWritten && ctx.state.firstPaint) {
    await writeJson(path.join(ctx.config.outDir, 'timings.json'), {
      boot: ctx.state.bootTimings,
      install: ctx.state.installTimings,
      paint: ctx.state.firstPaint.paintTimings,
      navigation: ctx.state.navigation,
    })
  }
  const report = buildProbeReport(ctx)
  const probeJson = ctx.config.jsonPath
  await writeJson(probeJson, report)
  await writeJson(path.join(ctx.config.outDir, 'last-run.json'), {
    runId: report.runId,
    ok: report.ok,
    summary: report.summary,
    probeJson,
    report: ctx.config.reportPath,
    finishedAt: report.finishedAt,
    mode: report.mode,
  })
  return report
}

function evidenceTableRows(report) {
  const rows = ['| check | title | result | detail |', '|---|---|---|---|']
  for (const check of report.checks) {
    rows.push(`| \`${check.id}\` | ${escapeCell(check.title)} | ${statusIcon(check.status)} ${check.status} | ${escapeCell(check.detail ?? '')} |`)
  }
  return rows.join('\n')
}

function escapeCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n+/g, ' ')
    .slice(0, 400)
}

function groupedChecks(report) {
  const areas = new Map()
  for (const check of report.checks) {
    const area = checkArea(check.id)
    if (!areas.has(area)) areas.set(area, [])
    areas.get(area).push(check)
  }
  return areas
}

/**
 * IMPLEMENTATION_PLAN.md §20 criteria mapped to the checks that prove them in
 * this Web-profile run. Rows without checks are out of scope or an honest gap
 * and are reported as such, never faked.
 */
export const PLAN20_ROWS = [
  {
    criterion: 'Exact DSH 0.2.0-rc.2 install + certified contract hash',
    checks: ['boot.graph-entry', 'bundle.serves-client-js', 'handshake.applied-boot', 'catalog.schema', 'catalog.livery-hashes'],
  },
  {
    criterion: 'zh-CN + en-US settings UI and previews complete',
    checks: ['settings.livery-section', 'settings.section-label', 'gallery.cards', 'search.name', 'keyboard.arrow-right', 'fonts.en-latin', 'locale.en-gallery', 'preview.previewing'],
  },
  {
    criterion: 'At least 10 double-mode liveries',
    checks: ['catalog.gallery-size', 'gallery.cards', 'previews.assets-served'],
  },
  {
    criterion: 'Colour + host-level font-family actually effective (not just the settings page)',
    checks: ['theme.light-tokens', 'theme.dark-tokens', 'fonts.zh-cjk', 'css.token-scoping'],
  },
  {
    criterion: 'At least one safe layout capability actually effective',
    checks: [],
    note: 'HONEST GAP: DSH 0.2.0-rc.2 exposes no public density / transcript-width / message-flow hook. Livery degrades layout to host/stock and lists the unavailable capabilities in the self-check; no fake compensation is shipped. Wallpaper is removed from schema v1.',
  },
  {
    criterion: 'Follows host light/dark without changing host preference',
    checks: ['theme.dark-tokens', 'theme.light-restored', 'theme.host-preference', 'theme.host-preference-file'],
  },
  {
    criterion: 'Startup filmstrip has no stock-style frame / no takeover flash',
    checks: ['firstpaint.no-stock-frame', 'firstpaint.first-colour', 'handshake.body-hash-catalog'],
  },
  {
    criterion: '0 !important, 0 hash-class selectors, 0 whole-document observers',
    checks: ['css.no-important', 'css.no-hash-selectors', 'css.no-whole-document-observers', 'selfcheck.css-safety'],
  },
  {
    criterion: 'All contrast gates pass',
    checks: ['catalog.contrast-zero-failures', 'selfcheck.contrast'],
  },
  {
    criterion: 'Preview is transient; Apply is one durable mutation; restore stock works',
    checks: ['preview.cancel', 'apply.one-mutation', 'apply.persists', 'restore.stock', 'restore.persists'],
  },
  {
    criterion: 'Browser trust / Origin / CSRF fence',
    checks: ['boot.token-exchange', 'trust.bad-host-api-403', 'trust.cross-origin-403', 'trust.cross-site-403'],
  },
  {
    criterion: 'Hard reload, multi-tab and service restart consistency',
    checks: ['apply.persists', 'web.multi-tab', 'lifecycle.sigterm', 'lifecycle.final-stop'],
  },
  {
    criterion: 'Uninstall leaves no runtime residue after restart',
    checks: ['residue.no-boot-row', 'residue.no-dom', 'residue.no-boot-payload', 'residue.catalog-route', 'residue.old-bundle-url'],
  },
  {
    criterion: 'Web layout at 1023px / 767px widths',
    checks: ['web.no-overflow-1023', 'web.no-overflow-767'],
  },
  {
    criterion: 'Performance budgets (bundle gzip, active CSS bytes, first paint)',
    checks: ['bundle.gzip-budget', 'css.size-budget', 'firstpaint.paint-timings'],
  },
  {
    criterion: 'Desktop / Windows / native chrome / wallpaper',
    checks: [],
    note: 'Out of scope: the Web harness has no Electron surface. Desktop/Windows certification belongs to the desktop rows of §18.9/§20.',
  },
]

function plan20RowStatus(checkById, row) {
  if (!row.checks.length) return { icon: '—', text: row.note ?? 'out of scope' }
  const states = row.checks.map((id) => checkById.get(id)?.status)
  if (states.some((status) => status === 'fail')) return { icon: '❌', text: row.note ?? 'failed checks present' }
  if (states.some((status) => status === 'undefined' || status === 'skip')) {
    return { icon: '⏭', text: row.note ?? 'not fully exercised in this run' }
  }
  return { icon: '✅', text: row.note ?? 'all mapped checks passed' }
}

/** Render the Markdown evidence report written into docs/verification/. */
export function renderMarkdown(report, { title } = {}) {
  const { summary, environment, target } = report
  const lines = []
  lines.push(`# ${title ?? 'Web-profile acceptance evidence — DSH Livery'}`)
  lines.push('')
  lines.push(
    `Run \`${report.runId}\` · ${report.mode === 'isolated' ? 'isolated DSH_HOME' : 'reuse of a running profile'} · ` +
      `**${summary.pass} passed / ${summary.fail} failed / ${summary.skip} skipped / ${summary.warn} warnings** · ` +
      `${report.ok ? 'RESULT: PASS' : 'RESULT: FAIL'}`,
  )
  lines.push('')
  lines.push('## Environment')
  lines.push('')
  lines.push('| item | value |')
  lines.push('|---|---|')
  lines.push(`| date | ${environment.date} |`)
  lines.push(`| DSH | ${environment.dshVersion ?? '—'} |`)
  lines.push(`| Node | ${environment.nodeVersion} |`)
  lines.push(`| OS | ${environment.platform} ${environment.osRelease ?? ''} (${environment.arch}) |`)
  lines.push(`| Chrome | ${environment.chromeVersion ?? '—'} (system Chrome via playwright-core, \`channel: 'chrome'\`) |`)
  lines.push(`| playwright-core | ${environment.playwrightVersion ?? '—'} |`)
  lines.push(`| target package | ${target.packageName}@${target.packageVersion ?? '?'} (\`${target.tarball ?? '—'}\`) |`)
  lines.push(`| tarball sha256 | ${target.tarballSha256 ?? '—'} |`)
  lines.push(`| browser | headless Chrome, viewport 1440×900 |`)
  lines.push('')
  lines.push('## Boot')
  lines.push('')
  lines.push('```text')
  lines.push(report.dshWebLine || '(reuse mode: no harness boot)')
  lines.push('```')
  lines.push('')
  lines.push(`- boot ready: ${formatDuration(report.boot.readyMs)}; install via official profile package manager: ${formatDuration(report.boot.installMs)}`)
  lines.push('')
  lines.push('## IMPLEMENTATION_PLAN.md §20 coverage (Web profile)')
  lines.push('')
  const checkById = new Map(report.checks.map((check) => [check.id, check]))
  lines.push('| §20 criterion | result | mapped checks |')
  lines.push('|---|---|---|')
  for (const row of PLAN20_ROWS) {
    const status = plan20RowStatus(checkById, row)
    const mapped = row.checks.length ? row.checks.map((id) => `\`${id}\``).join(', ') : '—'
    lines.push(`| ${escapeCell(row.criterion)} | ${status.icon} ${escapeCell(status.text)} | ${mapped} |`)
  }
  lines.push('')
  lines.push('## Checks')
  lines.push('')
  lines.push('')
  const areas = groupedChecks(report)
  for (const [area, checks] of areas) {
    lines.push(`### ${CHECK_AREA_TITLES[area] ?? area}`)
    lines.push('')
    lines.push('| check | title | result | detail |')
    lines.push('|---|---|---|---|')
    for (const check of checks) {
      lines.push(`| \`${check.id}\` | ${escapeCell(check.title)} | ${statusIcon(check.status)} ${check.status} | ${escapeCell(check.detail ?? '')} |`)
    }
    lines.push('')
  }
  lines.push('## Screenshots')
  lines.push('')
  if (report.artifacts.screenshots.length) {
    lines.push('| file | locale | mode | state |')
    lines.push('|---|---|---|---|')
    for (const shot of report.artifacts.screenshots) {
      lines.push(`| \`${relativeToWorkspace(shot.path)}\` | ${shot.locale} | ${shot.mode} | ${shot.state} |`)
    }
  } else {
    lines.push('_no screenshots captured_')
  }
  lines.push('')
  lines.push('## Artifacts')
  lines.push('')
  lines.push(`- probe: \`${relativeToWorkspace(report.artifacts.probeJson)}\``)
  lines.push(`- console/network: \`${relativeToWorkspace(report.artifacts.consoleJson)}\``)
  lines.push(`- timings: \`${relativeToWorkspace(report.artifacts.timingsJson)}\``)
  lines.push(`- filmstrip frames: \`${relativeToWorkspace(report.artifacts.filmstrip.dir)}\` (${report.artifacts.filmstrip.frames.length} frames)`)
  lines.push(`- HTML snapshots: \`${relativeToWorkspace(report.artifacts.htmlDir)}\``)
  lines.push('')
  const lifecycle = report.evidence.lifecycle
  if (lifecycle) {
    lines.push('## Lifecycle')
    lines.push('')
    const stop1 = lifecycle.stopBeforeUninstall ?? {}
    const uninstall = lifecycle.uninstall ?? {}
    const boot2 = lifecycle.postUninstallBoot ?? {}
    const stop2 = lifecycle.stopAfterResidue ?? {}
    lines.push('| step | result |')
    lines.push('|---|---|')
    lines.push(`| SIGTERM stop before uninstall | exit ${stop1.exitCode ?? '?'}, port closed: ${stop1.portClosed}, ${formatDuration(stop1.shutdownMs)} |`)
    lines.push(`| official \`dsh plugin remove\` | exit ${uninstall.exitCode ?? '?'}, dependency removed: ${uninstall.dependencyPresent === false}, bundle deselected: ${uninstall.bundleSelected === false}, ${formatDuration(uninstall.durationMs)} |`)
    lines.push(`| fresh boot after uninstall | ready in ${formatDuration(boot2.readyMs)}, port ${boot2.port ?? '?'} |`)
    lines.push(`| residue sweep (boot graph / DOM / routes / tokens) | see residue checks above |`)
    lines.push(`| final SIGTERM | exit ${stop2.exitCode ?? '?'}, port closed: ${stop2.portClosed} |`)
    lines.push('')
  }
  const knownLimitations = report.evidence.knownLimitations ?? []
  if (knownLimitations.length) {
    lines.push('## Deviations / known limitations')
    lines.push('')
    for (const limitation of knownLimitations) lines.push(`- ${limitation}`)
    lines.push('')
  }
  lines.push('## Evidence details')
  lines.push('')
  if (report.evidence.stockTokens) {
    lines.push('Stock baseline tokens:')
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(report.evidence.stockTokens, null, 2))
    lines.push('```')
    lines.push('')
  }
  if (report.evidence.appliedSkin) {
    const livery = report.evidence.catalog?.liveries?.find((item) => item.id === report.evidence.appliedSkin)
    lines.push(`Active livery: \`${report.evidence.appliedSkin}\` (${livery ? livery.name?.['zh-CN'] + ' / ' + livery.name?.['en-US'] : 'not in catalog summary'})`)
    lines.push('')
  }
  if (report.evidence.applyMutation) {
    lines.push('Apply mutation (profile patch):')
    lines.push('')
    lines.push('```text')
    lines.push(report.evidence.applyMutation.detail ?? '')
    lines.push('```')
    lines.push('')
  }
  if (report.evidence.selfCheck?.capabilities?.length) {
    lines.push('Self-check capabilities:')
    lines.push('')
    lines.push('| capability | available |')
    lines.push('|---|---|')
    for (const row of report.evidence.selfCheck.capabilities) lines.push(`| ${row.id} | ${row.available} |`)
    lines.push('')
  }
  if (report.evidence.firstPaint?.paintTimings) {
    const paint = report.evidence.firstPaint.paintTimings
    lines.push('First paint timings:')
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(paint, null, 2))
    lines.push('```')
    lines.push('')
  }
  if (report.evidence.lifecycle) {
    lines.push('Lifecycle:')
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(report.evidence.lifecycle, null, 2))
    lines.push('```')
    lines.push('')
  }
  lines.push('---')
  lines.push('')
  lines.push('_Generated by `scripts/acceptance-web.mjs`. The command is listed in `docs/verification/README.md`;')
  lines.push('the checklist mapping to IMPLEMENTATION_PLAN.md §20 lives there too._')
  lines.push('')
  return lines.join('\n')
}

function relativeToWorkspace(file) {
  if (!file) return '—'
  return path.isAbsolute(file) ? path.relative(process.cwd(), file) : file
}

export async function writeMarkdownReport(report, file, options) {
  await writeText(file, renderMarkdown(report, options))
  return file
}

export { summarizeCatalog, formatDuration, statusIcon, CHECK_AREA_TITLES }
