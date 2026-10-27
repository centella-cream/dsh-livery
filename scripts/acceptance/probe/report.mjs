/**
 * Evidence assembly: probe.json, console.json, timings.json and the auto-filled
 * Markdown acceptance report under docs/verification.md.
 */

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { oneLine, redact, writeJson, writeText } from './util.mjs'
import { SUPPORTED_HOST_VERSIONS, adapterForTriple } from './certified-adapters.mjs'

const CHECK_AREA_TITLES = {
  env: 'Environment',
  boot: 'Boot graph & handshake',
  bundle: 'Client bundle route',
  trust: 'Browser trust / auth fence',
  catalog: 'Catalog route',
  previews: 'Preview assets',
  handshake: 'First-frame handshake',
  stock: 'Stock baseline',
  nav: 'Navigation (sidebar panellist + main panel)',
  panel: 'Livery panel page',
  settings: 'Settings dialog (absence assertions)',
  gallery: 'Gallery',
  previewLocale: 'Gallery preview language',
  galleryFamilies: 'Gallery families (taxonomy, chips, sections, filters)',
  wallpaper: 'Wallpaper studio',
  layout: 'Presentation layout & card structure',
  footer: 'About footer (human copy)',
  typography: 'Unified five-step type scale',
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
    dshBin: ctx.environment?.dshBin,
    hostRuntime: ctx.environment?.hostRuntime ?? null,
    nodeVersion: process.version,
    platform: process.platform,
    osRelease: ctx.environment?.osRelease,
    arch: process.arch,
    chromeVersion: ctx.environment?.chromeVersion,
    playwrightVersion: ctx.environment?.playwrightVersion,
  }
  const expectedAdapter = ctx.config.expectedAdapter ?? null
  const observedPayload = ctx.state.bootPayloadApplied ?? ctx.state.bootPayload ?? null
  const observedCatalog = ctx.state.catalog ?? null
  const observedAdapter = observedPayload ? adapterForTriple(observedPayload) ?? null : observedCatalog ? adapterForTriple(observedCatalog) ?? null : null
  const target = {
    packageName: ctx.config.packageName,
    pluginId: ctx.config.pluginId,
    packageVersion: ctx.environment?.packageVersion ?? null,
    tarball: ctx.install?.spec ?? ctx.config.tgz ?? null,
    tarballSha256: ctx.install?.tarballSha256 ?? null,
    hostVersion: ctx.config.expectedVersion ?? observedCatalog?.hostVersion ?? null,
    adapterId: expectedAdapter?.adapterId ?? observedCatalog?.adapterId ?? null,
    contractHash: expectedAdapter?.contractHash ?? observedCatalog?.contractHash ?? null,
    catalogProfile: expectedAdapter?.catalogProfile ?? observedCatalog?.catalogProfile ?? null,
    sourceKind: expectedAdapter?.sourceKind ?? null,
    scope: {
      hostVersion: ctx.config.expectedVersion ?? observedCatalog?.hostVersion ?? null,
      profile: 'web',
      browser: 'chrome',
    },
  }
  const matrix = {
    certifiedVersions: SUPPORTED_HOST_VERSIONS,
    expected: expectedAdapter
      ? {
          hostVersion: expectedAdapter.hostVersion,
          adapterId: expectedAdapter.adapterId,
          contractHash: expectedAdapter.contractHash,
          catalogProfile: expectedAdapter.catalogProfile,
          platformModules: expectedAdapter.platformModules,
          sourceKind: expectedAdapter.sourceKind,
          capabilities: expectedAdapter.capabilities,
        }
      : null,
    observed: observedPayload || observedCatalog
      ? {
          hostVersion: observedPayload?.hostVersion ?? observedCatalog?.hostVersion ?? null,
          adapterId: observedPayload?.adapterId ?? observedCatalog?.adapterId ?? null,
          contractHash: observedPayload?.contractHash ?? observedCatalog?.contractHash ?? null,
          catalogProfile: observedPayload?.catalogProfile ?? observedCatalog?.catalogProfile ?? null,
          profileKind: observedPayload?.profileKind ?? null,
          previewsBase: observedCatalog?.previewsBase ?? null,
          certified: Boolean(observedAdapter),
        }
      : null,
    profileKindExpected: ctx.config.expectedProfileKind ?? null,
    cloneFrom: ctx.config.cloneFrom ? redact(ctx.config.cloneFrom) : null,
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
    matrix,
    config: {
      profileName: ctx.config.profileName,
      dshHome: redact(ctx.config.dshHome ?? ''),
      reuseUrl: ctx.config.reuseUrl ? redact(ctx.config.reuseUrl) : null,
      locale: ctx.config.locale,
      expectedVersion: ctx.config.expectedVersion ?? null,
      expectedProfileKind: ctx.config.expectedProfileKind ?? null,
      cloneFrom: ctx.config.cloneFrom ? redact(ctx.config.cloneFrom) : null,
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
      manualNotes: ctx.config.notesText ?? null,
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
 * docs/design/implementation-plan.md §20 criteria mapped to the checks that
 * prove them in this Web-profile run. Rows without checks are out of scope or a
 * known gap, and are reported as such.
 */
export const PLAN20_ROWS = [
  {
    criterion: 'Exact certified host install + certified contract hash',
    checks: ['boot.graph-entry', 'bundle.serves-client-js', 'handshake.applied-boot', 'catalog.schema', 'catalog.livery-hashes'],
  },
  {
    criterion: 'Live host matches a certified adapter (version + adapter id + contract hash + catalog profile)',
    checks: ['env.certified-host', 'handshake.certified-adapter', 'handshake.applied-boot', 'catalog.certified-identity', 'handshake.catalog-identity'],
  },
  {
    criterion: 'Platform module table / client bundle ABI resolves on this host build',
    checks: ['boot.graph-entry', 'bundle.serves-client-js', 'handshake.certified-adapter'],
  },
  {
    criterion: 'zh-CN + en-US Livery UI and previews complete (sidebar navigation entry)',
    checks: ['nav.sidebar-entry', 'nav.main-panel', 'gallery.cards', 'search.name', 'keyboard.arrow-right', 'fonts.en-latin', 'locale.en-gallery', 'preview.previewing'],
  },
  {
    criterion: 'At least 24 double-mode, visually distinct visual styles (palette + typography + material + shape/elevation)',
    checks: ['catalog.gallery-size', 'gallery.cards', 'previews.assets-served', 'catalog.style-vocabulary', 'catalog.css-budget'],
    note: 'style-system v2: 24 liveries per profile, 96 previews per profile; per-livery CSS ≤ 12 KiB',
  },
  {
    criterion: 'Colour + host-level font-family actually effective (not just the settings page)',
    checks: ['theme.light-tokens', 'theme.dark-tokens', 'fonts.zh-cjk', 'fonts.zh-role-hooks', 'css.token-scoping'],
    note: 'font strategy is capability-selected: this certified host exposes the documented role hooks (--dsh-font-family-text/-code); no legacy composite-token fallback is required',
  },
  {
    criterion: 'At least one safe layout capability actually effective',
    checks: [],
    note: 'HONEST GAP: the certified hosts expose no public density / transcript-width / message-flow hook. Livery degrades layout to host/stock and lists the unavailable capabilities in the self-check; no fake compensation is shipped. Wallpaper is removed from schema v1.',
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
    criterion: 'Applied visual styles change the real host UI (computed styles/CSS cascade)',
    checks: ['style.candidates', 'style.host-radius', 'style.host-font', 'style.host-elevation', 'style.material-glass', 'style.cascade-tokens'],
    note: 'contrasting styles applied through the UI; border-radius, font stack, shadow/material and cascade-resolved style tokens measured on live host nodes',
  },
  {
    criterion: 'Gallery preview-language tab switches only thumbnail preview locale (Follow DSH default / 中文 / English)',
    checks: ['previewLocale.tab-present', 'previewLocale.tab-labels', 'previewLocale.default-follow', 'previewLocale.switch-en', 'previewLocale.switch-zh', 'previewLocale.follow-restores', 'previewLocale.apply-copy', 'previewLocale.apply-with-pinned', 'previewLocale.en-follow'],
    note: 'thumbnail SVG URLs only (<id>-<zh|en>-<light|dark>.svg); names/descriptions/copy stay host-locale and Apply/restore semantics are unchanged',
  },
  {
    criterion: 'Gallery groups styles into six non-empty family sections with compact filters',
    checks: ['gallery.page-tabs', 'gallery.family-chips', 'gallery.family-sections', 'gallery.family-mapping', 'gallery.more-filters', 'gallery.more-filters-expanded', 'gallery.more-filters-collapsed', 'gallery.family-filter', 'gallery.family-keyboard'],
    note: 'display order calm→nature→light→retro→vivid→dark; family priority nature→calm→light→retro→vivid→dark; all six sections non-empty; 16 tag chips behind 更多筛选; roving focus crosses sections',
  },
  {
    criterion: 'Wallpaper studio (client-only layer, effects, validation, online search)',
    checks: ['wallpaper.tab', 'wallpaper.builtin-count', 'wallpaper.builtin-applied', 'wallpaper.effects-blur-dim', 'wallpaper.frost', 'wallpaper.reset', 'wallpaper.persistence', 'wallpaper.url-validation', 'wallpaper.url-accepted', 'wallpaper.search-results', 'wallpaper.search-applied', 'wallpaper.clear', 'wallpaper.tab-restore'],
    note: 'owned <style data-plugin-css="dsh-livery/wallpaper"> + body[data-dsh-wallpaper]; 24 built-ins, search-first online card (auto Picsum batch; mocked Openverse/Picsum), uploads, atmosphere overlay, tab persistence (no live network)',
  },
  {
    criterion: 'Round-11 copy/type/online card: human About footer, unified five-step typography, search-first online card with one auto random batch',
    checks: ['footer.about-copy', 'footer.about-lines', 'footer.about-no-jargon', 'typography.five-step-style', 'typography.root-tokens', 'typography.five-step-wallpaper', 'typography.about-rail', 'wallpaper.library-removed', 'wallpaper.online-auto-random', 'wallpaper.online-no-refetch', 'wallpaper.online-search', 'wallpaper.online-random', 'wallpaper.online-refresh', 'wallpaper.online-retry', 'wallpaper.online-applied', 'selfcheck.copy-diagnostics-content'],
    note: 'About footer: two human lines, engineering ids only in copied diagnostics; visible type sizes ⊆ {11,12,13,15,20}; curated library removed; exactly one mocked Picsum auto batch on tab open; sliders never refetch; explicit Openverse search / random / refresh / retry flows',
  },
  {
    criterion: 'Round-10 card layout: two-column card hierarchy, responsive stacking, bounded sliders, no overflow',
    checks: ['layout.style-2col', 'layout.style-cards', 'layout.style-hero-thumb', 'layout.style-card-surfaces', 'layout.style-stacked-1024', 'layout.style-no-overflow-1440', 'layout.style-no-overflow-1024', 'layout.wallpaper-2col', 'layout.wallpaper-cards', 'layout.wallpaper-card-surfaces', 'layout.effects-sliders-bounded', 'layout.wallpaper-stacked-1024', 'layout.wallpaper-no-overflow-1440', 'layout.wallpaper-no-overflow-1024'],
    note: 'style page: current-style hero + gallery card + 操作/自检 rail; wallpaper page: hero/library/random/custom/effects/builtins cards; 2 tracks ≥1100px, single column below; sliders 80–220px; screenshots at 1440×900 and 1024×800',
  },
  {
    criterion: 'Livery lives in the left-sidebar plugin navigation (main panel), not in Settings',
    checks: ['nav.sidebar-entry', 'nav.row-order', 'nav.above-workspaces', 'nav.conversation-hidden', 'nav.settings-section-absent'],
    note: 'sidebar.panellist row (id/panel key livery, order 30, zh 视觉风格 / en Visual Style) + main keyed page; legacy settings.section must stay unregistered on panel-navigation hosts',
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
    criterion: 'Desktop / Windows / Edge / native chrome',
    checks: [],
    note: 'Not-supported for this release line (explicitly not claimed): Web Profile/Chrome is certified on DSH 0.2.1-rc.2 and 0.2.1-rc.4; DSH 0.2.1-rc.3 Desktop/macOS is covered by separate Electron evidence; Desktop Windows and Web Edge are outside the formal matrix scope.',
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

/** Render the Markdown evidence report written into docs/verification.md. */
export function renderMarkdown(report, { title } = {}) {
  const { summary, environment, target } = report
  const lines = []
  const hostVersion = report.target?.hostVersion ?? report.environment?.dshVersion ?? 'unknown host'
  const sourceKind = report.target?.sourceKind ?? report.environment?.hostRuntime ?? 'unknown-source'
  lines.push(`# ${title ?? `Acceptance evidence — DSH Livery on DSH ${hostVersion} (${sourceKind})`}`)
  lines.push('')
  lines.push(
    `Run \`${report.runId}\` · ${report.mode === 'isolated' ? 'isolated DSH_HOME' : 'reuse of a running profile'} · ` +
      `**${summary.pass} passed / ${summary.fail} failed / ${summary.skip} skipped / ${summary.warn} warnings** · ` +
      `${report.ok ? 'RESULT: PASS' : 'RESULT: FAIL'}`,
  )
  lines.push('')
  lines.push(
    `**Scope (explicit):** this run covers DSH ${report.target?.scope?.hostVersion ?? report.target?.hostVersion ?? report.environment?.dshVersion ?? 'unknown'} + Web Profile + Chrome only. ` +
      'The DSH 0.2.1-rc.3 Desktop/macOS target is covered by separate real-Electron desktop evidence; Windows and Web Edge are not-supported and not claimed.',
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
  lines.push('## Host identity & certification')
  lines.push('')
  const matrix = report.matrix ?? {}
  lines.push('| item | expected (certified) | observed live |')
  lines.push('|---|---|---|')
  const exp = matrix.expected ?? {}
  const obs = matrix.observed ?? {}
  const cell = (value) => (value === undefined || value === null || value === '' ? '—' : String(value))
  lines.push(`| host version | ${cell(exp.hostVersion)} | ${cell(obs.hostVersion)} |`)
  lines.push(`| adapter id | ${cell(exp.adapterId)} | ${cell(obs.adapterId)} |`)
  lines.push(`| contract hash | ${cell(exp.contractHash)} | ${cell(obs.contractHash)} |`)
  lines.push(`| catalog profile | ${cell(exp.catalogProfile)} | ${cell(obs.catalogProfile)} |`)
  lines.push(`| platform module table | ${cell(exp.platformModules)} modules | — (resolved at boot) |`)
  lines.push(`| package source kind | ${cell(exp.sourceKind)} | — |`)
  lines.push(`| BootPayload.profileKind | ${cell(matrix.profileKindExpected)} | ${cell(obs.profileKind)} |`)
  lines.push(`| previews base | — | ${cell(obs.previewsBase)} |`)
  const identityOk = Boolean(obs.certified)
    && (!exp.hostVersion || !obs.hostVersion || exp.hostVersion === obs.hostVersion)
    && (!exp.contractHash || !obs.contractHash || exp.contractHash === obs.contractHash)
  lines.push('')
  lines.push(
    `Certified-adapter match: ${identityOk ? '✅ yes' : obs.hostVersion ? '❌ no' : '⏭ not observed (stock boot / reuse without payload)'}` +
      (obs.catalogProfile ? ` · catalog profile ${String(obs.catalogProfile).slice(0, 19)}…` : ''),
  )
  if (matrix.cloneFrom) lines.push(`\nProfile source: byte-clone of \`${matrix.cloneFrom}\` (isolated copy; source read-only).`)
  lines.push('')
  lines.push('## Boot')
  lines.push('')
  lines.push('```text')
  lines.push(report.dshWebLine || '(reuse mode: no harness boot)')
  lines.push('```')
  lines.push('')
  lines.push(`- boot ready: ${formatDuration(report.boot.readyMs)}; install via official profile package manager: ${formatDuration(report.boot.installMs)}`)
  lines.push('')
  lines.push('## docs/design/implementation-plan.md §20 coverage (Web profile)')
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
  if (report.evidence?.manualNotes) {
    lines.push('## Manual notes / scope caveats')
    lines.push('')
    lines.push(String(report.evidence.manualNotes).trim())
    lines.push('')
  }
  lines.push('---')
  lines.push('')
  lines.push('_Generated by `scripts/acceptance/web.mjs`. The command is listed in `docs/verification.md`;')
  lines.push('the checklist mapping to docs/design/implementation-plan.md §20 lives there too._')
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
