/**
 * End-to-end compiler tests: determinism, catalog shape, emitted artifacts,
 * check-mode drift detection and CLI behaviour (all against an isolated
 * repo-shaped fixture under .tmp/ so the working tree is never mutated).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ContrastEntry, LiveryManifest } from '../../src/core/types.js'
import {
  ADAPTER_ID,
  CAP,
  DSH_VERSION,
  LIVERY_VERSION,
  SCHEMA_VERSION,
} from '../../src/core/types.js'
import { CONTRACT_FACTS, HOST_CAPABILITIES } from '../../src/generated/contract.js'
import { FONT_STACKS } from '../../src/core/registry.js'
import {
  ARTIFACT_DIR,
  CATALOG_MODULE_PATH,
  PREVIEW_DIR,
  compileCatalog,
  compileFromDisk,
  deriveCompiledAt,
  expectedPreviewFiles,
  serializeCatalogModule,
  writeGeneratedFiles,
} from '../../src/compiler/compile.js'
import { EMITTED_TOKEN_NAMES, REQUIRED_TOKENS, auditLiveryCss } from '../../src/compiler/audit.js'
import { main } from '../../src/compiler/cli.js'
import { REPO_ROOT, createFixtureRoot, liveryIds, readManifest } from './helpers.js'

const compileOnce = () => compileFromDisk(REPO_ROOT)

function collectLogs(): { readonly lines: string[]; readonly errors: string[]; readonly log: (line: string) => void; readonly error: (line: string) => void } {
  const lines: string[] = []
  const errors: string[] = []
  return { lines, errors, log: (line) => lines.push(line), error: (line) => errors.push(line) }
}

describe('compileCatalog', () => {
  const first = compileOnce()

  it('compiles the 10 shipped liveries with every gate green', () => {
    expect(first.problems, JSON.stringify(first.problems, null, 2)).toEqual([])
    expect(first.ok).toBe(true)
    expect(first.catalog?.liveries).toHaveLength(10)
    expect(first.report?.gates).toEqual({
      validation: true,
      contrast: true,
      tokenCoverage: true,
      cssSafety: true,
      sizeBudget: true,
      capabilities: true,
    })
  })

  it('is deterministic: same sources produce byte-identical outputs', () => {
    const second = compileOnce()
    expect(second.ok).toBe(true)
    expect(second.sourceHash).toBe(first.sourceHash)
    expect(second.compiledAt).toBe(first.compiledAt)
    expect([...second.files.keys()].sort()).toEqual([...first.files.keys()].sort())
    for (const [file, content] of first.files) {
      expect(second.files.get(file), file).toBe(content)
    }
  })

  it('derives compiledAt from the source hash, never the wall clock', () => {
    expect(first.sourceHash).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(first.compiledAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(first.compiledAt).toBe(deriveCompiledAt(first.sourceHash))
    const second = compileOnce()
    expect(second.compiledAt).toBe(first.compiledAt)
  })

  it('emits a catalog with the frozen LiveryCatalog shape', () => {
    const catalog = first.catalog
    if (catalog === null) throw new Error('catalog missing')
    expect(catalog.schemaVersion).toBe(SCHEMA_VERSION)
    expect(catalog.compilerVersion).toBe(LIVERY_VERSION)
    expect(catalog.adapterId).toBe(ADAPTER_ID)
    expect(catalog.hostVersion).toBe(DSH_VERSION)
    expect(catalog.contractHash).toBe(CONTRACT_FACTS.contractHash)
    expect(catalog.capabilities).toEqual(HOST_CAPABILITIES)
    expect(first.meta?.capabilities).toEqual(HOST_CAPABILITIES)
    expect(first.meta?.contractHash).toBe(CONTRACT_FACTS.contractHash)
    expect(first.meta?.sourceHash).toBe(first.sourceHash)
    expect(first.meta?.compiledAt).toBe(first.compiledAt)

    const orders = catalog.liveries.map((livery) => livery.meta.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    // Gallery order is manifest meta.order, not directory name order.
    expect([...catalog.liveries.map((livery) => livery.id)].sort()).toEqual(liveryIds())
  })

  it('applies capability fallbacks to the effective layout and records degradation', () => {
    const catalog = first.catalog
    if (catalog === null) throw new Error('catalog missing')
    for (const livery of catalog.liveries) {
      const declared = readManifest(livery.id)
      // density / conversationWidth / messageFlow capabilities are absent on the
      // certified host; surface-material is available.
      expect(livery.layout.density, livery.id).toBe('host')
      expect(livery.layout.conversationWidth, livery.id).toBe('host')
      expect(livery.layout.messageFlow, livery.id).toBe('stock')
      expect(livery.layout.surfaceStyle, livery.id).toBe(declared.layout.surfaceStyle)
      for (const degrade of livery.audit.degraded) {
        expect(degrade.fallback).not.toBe('none')
        if (degrade.id === CAP.hostDensity) expect(degrade.fallback).toBe('host')
        if (degrade.id === CAP.hostTranscriptWidth) expect(degrade.fallback).toBe('host')
        if (degrade.id === CAP.hostMessageFlow) expect(degrade.fallback).toBe('stock')
      }
    }
  })

  it('emits resolved typography, concrete token values and safe CSS', () => {
    const catalog = first.catalog
    if (catalog === null) throw new Error('catalog missing')
    for (const livery of catalog.liveries) {
      expect(livery.typography.ui['zh-CN']).toBe(FONT_STACKS['system-cjk'].stack)
      expect(livery.typography.ui['en-US']).toBe(FONT_STACKS['system-latin'].stack)
      expect(livery.typography.code).toBe(FONT_STACKS['system-mono'].stack)
      for (const variant of [livery.light, livery.dark]) {
        for (const [name, value] of Object.entries(variant.tokens)) {
          expect(EMITTED_TOKEN_NAMES.has(name), `${livery.id}: ${name}`).toBe(true)
          expect(value, `${livery.id}: ${name}`).toMatch(/^(?:#[0-9a-f]{6,8}|rgba?\(|linear-gradient\()/i)
        }
      }
      expect(livery.css.tokens).toContain(`body[data-dsh-livery="${livery.id}"]`)
      expect(livery.css.typography).toContain(':root:lang(')
      expect(livery.css.layout).toContain('@layer dsh-livery.compat')
      for (const fragment of [livery.css.tokens, livery.css.typography, livery.css.layout]) {
        expect(fragment).not.toContain('!important')
        expect(fragment).not.toContain('url(')
      }
      const cssAudit = auditLiveryCss(livery)
      expect(cssAudit.safety.pass, JSON.stringify(cssAudit.details.violations)).toBe(true)
      expect(cssAudit.overBudget).toBe(false)
      expect(livery.hash).toMatch(/^sha256:[0-9a-f]{64}$/)
      expect(livery.audit.contrastFailures).toBe(0)
      expect(livery.audit.tokenCoverage.missing).toEqual([])
    }
  })

  it('keeps the required-token coverage complete and documents inherited tokens', () => {
    const coverage = first.tokenCoverage
    if (coverage === null) throw new Error('coverage artifact missing')
    expect(coverage.counts.required).toBe(REQUIRED_TOKENS.length)
    expect(coverage.counts.missing).toBe(0)
    expect(coverage.pass).toBe(true)
    expect(coverage.emissionPolicy.mode).toBe('consumed-only')
    expect(coverage.emissionPolicy.inheritedUnconsumedCount).toBeGreaterThan(0)
    expect(coverage.exemptions.length).toBe(coverage.inherited.length)
  })

  it('emits catalog module, preview index and audit artifacts', () => {
    const contrast = first.contrast
    const cssSafety = first.cssSafety
    if (contrast === null || cssSafety === null) throw new Error('artifacts missing')
    expect(contrast.pass).toBe(true)
    expect(contrast.summary.failures).toBe(0)
    expect(cssSafety.pass).toBe(true)
    expect(first.files.get(CATALOG_MODULE_PATH)).toBeDefined()
    expect(first.files.get(`${PREVIEW_DIR}/index.json`)).toBeDefined()
    for (const name of ['report.json', 'contrast.json', 'token-coverage.json', 'css-safety.json']) {
      expect(first.files.get(`${ARTIFACT_DIR}/${name}`), name).toBeDefined()
    }
    expect(first.previewCount).toBe(40)
    const index = JSON.parse(first.files.get(`${PREVIEW_DIR}/index.json`) ?? '{}') as {
      files: string[]
      count: number
    }
    expect(index.count).toBe(40)
    expect(index.files).toHaveLength(40)
    expect([...index.files].sort()).toEqual(index.files)
    for (const file of index.files) {
      expect(first.files.has(`${PREVIEW_DIR}/${file}`), file).toBe(true)
    }
    expect(expectedPreviewFiles(first.catalog?.liveries ?? [])).toHaveLength(40)
  })

  it('serializes a typed, importable generated module', () => {
    const catalog = first.catalog
    const meta = first.meta
    if (catalog === null || meta === null) throw new Error('catalog missing')
    const text = serializeCatalogModule(catalog, meta)
    expect(text).toContain("import type { CapabilityMap, CompiledLivery } from '../core/types.js'")
    expect(text).toContain('export interface CatalogMeta {')
    expect(text).toContain('export const LIVERIES: readonly CompiledLivery[] = [')
    expect(text).toContain('export const CATALOG_META: CatalogMeta = {')
    expect(text).toContain(meta.sourceHash)
    expect(text).toContain(meta.contractHash)
    expect(text.endsWith('\n')).toBe(true)
    expect(text).not.toMatch(/\bundefined\b/)
  })

  it('matches the committed src/generated/liveries.ts (committed catalog is current)', async () => {
    const generated = (await import('../../src/generated/liveries.js')) as {
      LIVERIES: unknown
      CATALOG_META: { sourceHash: string; contractHash: string; compiledAt: string }
    }
    expect(generated.CATALOG_META.contractHash).toBe(CONTRACT_FACTS.contractHash)
    expect(generated.CATALOG_META.sourceHash).toBe(first.sourceHash)
    expect(generated.CATALOG_META.compiledAt).toBe(first.compiledAt)
    expect(generated.LIVERIES).toEqual(first.catalog?.liveries)
  })

  it('fails closed on a manifest that does not validate', () => {
    const bad: LiveryManifest = readManifest('fjord')
    const result = compileCatalog({
      manifests: [{ file: 'liveries/fjord/manifest.json', raw: { ...structuredClone(bad), id: 'Fjord!' } }],
    })
    expect(result.ok).toBe(false)
    expect(result.catalog).toBeNull()
    expect(result.problems[0]?.code).toMatch(/^validation\./)
    expect(result.files.size).toBe(0)
  })
})

describe('generated catalog on disk', () => {
  it('is registered as a typed catalog with 10 liveries and the frozen contract hash', async () => {
    const generated = (await import('../../src/generated/liveries.js')) as {
      LIVERIES: readonly { id: string; hash: string }[]
      CATALOG_META: { contractHash: string; adapterId: string; hostVersion: string; capabilities: Record<string, unknown>; compiledAt: string }
    }
    expect(generated.LIVERIES).toHaveLength(10)
    expect(generated.CATALOG_META.contractHash).toBe(CONTRACT_FACTS.contractHash)
    expect(generated.CATALOG_META.adapterId).toBe(ADAPTER_ID)
    expect(generated.CATALOG_META.hostVersion).toBe(DSH_VERSION)
    expect(Object.keys(generated.CATALOG_META.capabilities).sort()).toEqual(Object.keys(HOST_CAPABILITIES).sort())
    for (const livery of generated.LIVERIES) expect(livery.hash).toMatch(/^sha256:/)
  })

  it('has 40 preview SVGs on disk with a whitelist index', () => {
    const previewDir = join(REPO_ROOT, PREVIEW_DIR)
    const index = JSON.parse(readFileSync(join(previewDir, 'index.json'), 'utf8')) as {
      files: string[]
      count: number
    }
    expect(index.count).toBe(40)
    expect(existsSync(join(previewDir, index.files[0] ?? ''))).toBe(true)
    expect(existsSync(join(REPO_ROOT, CATALOG_MODULE_PATH))).toBe(true)
  })
})

describe('CLI compile / check drift detection', () => {
  it('compiles into an isolated fixture, then passes check, then detects drift', async () => {
    const fixture = createFixtureRoot()
    try {
      const compileLogs = collectLogs()
      const compileCode = await main(['liveries:compile', '--version', '0.2.0-rc.2', '--dsh-install', '/nonexistent'], {
        cwd: fixture.dir,
        log: compileLogs.log,
        error: compileLogs.error,
      })
      expect(compileCode, compileLogs.errors.join('\n')).toBe(0)
      expect(compileLogs.errors).toEqual([])
      expect(compileLogs.lines.some((line) => line.startsWith('livery:compile:'))).toBe(true)
      expect(compileLogs.lines.some((line) => line.includes('previews'))).toBe(true)
      expect(existsSync(join(fixture.dir, CATALOG_MODULE_PATH))).toBe(true)
      expect(existsSync(join(fixture.dir, PREVIEW_DIR, 'index.json'))).toBe(true)
      expect(existsSync(join(fixture.dir, ARTIFACT_DIR, 'report.json'))).toBe(true)

      const checkLogs = collectLogs()
      expect(await main(['liveries:check'], { cwd: fixture.dir, log: checkLogs.log, error: checkLogs.error })).toBe(0)
      expect(checkLogs.errors).toEqual([])
      expect(checkLogs.lines.some((line) => line.includes('match the manifests'))).toBe(true)

      // Byte drift in the generated catalog is detected.
      const catalogPath = join(fixture.dir, CATALOG_MODULE_PATH)
      writeFileSync(catalogPath, `${readFileSync(catalogPath, 'utf8')}\n// tampered\n`, 'utf8')
      const driftLogs = collectLogs()
      expect(await main(['check'], { cwd: fixture.dir, log: driftLogs.log, error: driftLogs.error })).toBe(1)
      expect(driftLogs.errors.some((line) => line.includes('DRIFT changed') && line.includes(CATALOG_MODULE_PATH))).toBe(true)

      // Missing preview and stale extra preview are both drift.
      writeFileSync(join(fixture.dir, PREVIEW_DIR, 'index.json'), '{"files":[],"count":0}\n', 'utf8')
      writeFileSync(join(fixture.dir, PREVIEW_DIR, 'zzz-stale.svg'), '<svg/>', 'utf8')
      const staleLogs = collectLogs()
      expect(await main(['check'], { cwd: fixture.dir, log: staleLogs.log, error: staleLogs.error })).toBe(1)
      expect(staleLogs.errors.some((line) => line.includes('unexpected') && line.includes('zzz-stale.svg'))).toBe(true)
    } finally {
      fixture.cleanup()
    }
  })

  it('returns usage error for an unknown command and exit 1 for invalid manifests', async () => {
    const fixture = createFixtureRoot()
    try {
      const usage = collectLogs()
      expect(await main(['nonsense'], { cwd: fixture.dir, log: usage.log, error: usage.error })).toBe(2)
      expect(usage.errors.some((line) => line.includes('unknown command'))).toBe(true)

      const manifestPath = join(fixture.dir, 'liveries', 'fjord', 'manifest.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>
      writeFileSync(manifestPath, JSON.stringify({ ...manifest, id: 'Fjord!' }, null, 2), 'utf8')
      const invalid = collectLogs()
      expect(await main(['compile'], { cwd: fixture.dir, log: invalid.log, error: invalid.error })).toBe(1)
      expect(invalid.errors.some((line) => line.includes('FAIL'))).toBe(true)
    } finally {
      fixture.cleanup()
    }
  })

  it('runs every audit command green against the fixture and writes artifacts', async () => {
    const fixture = createFixtureRoot()
    try {
      const compileLogs = collectLogs()
      expect(await main(['compile'], { cwd: fixture.dir, log: compileLogs.log, error: compileLogs.error })).toBe(0)
      for (const command of ['audit:tokens', 'audit:css', 'audit:contrast'] as const) {
        const logs = collectLogs()
        const code = await main([command], { cwd: fixture.dir, log: logs.log, error: logs.error })
        expect(code, `${command}: ${logs.errors.join('\n')}`).toBe(0)
        expect(logs.lines.some((line) => line.startsWith(`livery:${command}:`))).toBe(true)
      }
      expect(existsSync(join(fixture.dir, ARTIFACT_DIR, 'token-coverage.json'))).toBe(true)
      expect(existsSync(join(fixture.dir, ARTIFACT_DIR, 'css-safety.json'))).toBe(true)
      const contrast = JSON.parse(readFileSync(join(fixture.dir, ARTIFACT_DIR, 'contrast.json'), 'utf8')) as {
        summary: { failures: number; byMode: Record<string, { failures: number }> }
      }
      expect(contrast.summary.failures).toBe(0)
      expect(contrast.summary.byMode.light?.failures).toBe(0)
    } finally {
      fixture.cleanup()
    }
  })
})

describe('artifact contents', () => {
  const result = compileOnce()

  it('report.json records counts, gates, previews and emission policy', () => {
    const report = result.report
    if (report === null) throw new Error('report missing')
    expect(report.counts.liveries).toBe(10)
    expect(report.counts.previews).toBe(40)
    expect(report.counts.contrastFailures).toBe(0)
    expect(report.counts.tokenMissing).toBe(0)
    expect(report.previews.width).toBe(640)
    expect(report.previews.height).toBe(400)
    expect(report.previews.files).toHaveLength(40)
    expect(report.emissionPolicy.mode).toBe('consumed-only')
    expect(report.emissionPolicy.inheritedUnconsumedCount).toBeGreaterThan(0)
    expect(report.liveries).toHaveLength(10)
    for (const entry of report.liveries) {
      expect(entry.css.total).toBeLessThanOrEqual(12 * 1024)
      expect(entry.name['zh-CN'].length).toBeGreaterThan(0)
      expect(entry.name['en-US'].length).toBeGreaterThan(0)
    }
  })

  it('contrast.json contains both modes per livery with concrete ratios', () => {
    const contrast = result.contrast
    if (contrast === null) throw new Error('contrast missing')
    expect(contrast.liveries).toHaveLength(10)
    for (const livery of contrast.liveries) {
      for (const mode of [livery.light, livery.dark]) {
        expect(mode.total).toBeGreaterThan(20)
        expect(mode.failures).toBe(0)
        expect(mode.smallestRatio).toBeGreaterThanOrEqual(3)
        for (const entry of mode.entries) {
          expect(entry.ratio).toBeGreaterThan(0)
          expect(entry.pass).toBe(entry.ratio >= entry.min)
        }
      }
    }
    const entries: ContrastEntry[] = contrast.liveries.flatMap((livery) => [...livery.light.entries])
    expect(entries.length).toBeGreaterThan(0)
  })

  it('css-safety.json proves the shipped bytes stay inside the budgets', () => {
    const cssSafety = result.cssSafety
    if (cssSafety === null) throw new Error('css safety missing')
    expect(cssSafety.pass).toBe(true)
    expect(cssSafety.budgets.liveryBytes).toBe(12 * 1024)
    expect(cssSafety.budgets.bootBytes).toBe(12 * 1024)
    for (const entry of cssSafety.liveries) {
      expect(entry.safety.pass).toBe(true)
      expect(entry.overBudget).toBe(false)
      expect(entry.bytes.total).toBeLessThanOrEqual(12 * 1024)
      expect(entry.details.important).toBe(0)
    }
    for (const boot of cssSafety.boot) {
      expect(boot.overBudget).toBe(false)
      expect(boot.bytes).toBeLessThanOrEqual(12 * 1024)
    }
  })

  it('writeGeneratedFiles writes the same bytes compareGeneratedFiles expects', () => {
    const fixture = createFixtureRoot()
    try {
      writeGeneratedFiles(fixture.dir, result.files)
      for (const [file, content] of result.files) {
        expect(readFileSync(join(fixture.dir, file), 'utf8'), file).toBe(content)
      }
    } finally {
      fixture.cleanup()
    }
  })
})
