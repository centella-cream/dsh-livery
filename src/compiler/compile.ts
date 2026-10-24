/**
 * Livery compiler orchestration.
 *
 * `compileCatalog` is the single code path that turns on-disk manifests into the
 * shipped artifacts:
 *
 *   validate (schema + semantics)
 *     → deriveLivery light/dark
 *     → evaluateCapabilities (effective layout + degradation)
 *     → renderLiveryCss
 *     → audit (contrast, token coverage, CSS safety, size budgets)
 *     → hashLivery
 *     → emit src/generated/liveries.ts, lib/previews/**, artifacts/liveries/**
 *
 * Nothing here reads the wall clock: `compiledAt` is derived from the canonical
 * source hash, so two compiles of the same sources are byte-identical. `--check`
 * uses the same in-memory output and compares it with the committed files.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type {
  CapabilityMap,
  CompiledLivery,
  CompiledVariant,
  ContractCapabilityFacts,
  LiveryAuditReport,
  LiveryCatalog,
  LiveryCss,
  LiveryManifest,
  ResolvedTypography,
} from '../core/types.js'
import { ADAPTER_ID, DSH_VERSION, LIVERY_VERSION, SCHEMA_VERSION } from '../core/types.js'
import { deriveLivery } from '../core/derive.js'
import { evaluateCapabilities } from '../core/capabilities.js'
import { computeLiveryCssHash, hashCss, hashLivery, renderBootCss, renderLiveryCss, styleTextFromFragments } from '../core/render.js'
import { resolveTypography, FONT_STACKS, METRICS, TAGS } from '../core/registry.js'
import type { ContractFacts } from '../generated/contract.js'
import { CONTRACT_FACTS, HOST_CAPABILITIES } from '../generated/contract.js'
import type { CatalogMeta } from '../generated/liveries.js'
import {
  auditLiveryCss,
  buildCatalogReport,
  buildContrastArtifact,
  buildCssSafetyArtifact,
  buildTokenCoverageArtifact,
  coverTokens,
  liveryTokenNames,
  selectEmittedVariant,
  summarizeLiveryContrast,
  type ArtifactContext,
  type CatalogReport,
  type CompileProblem,
  type ContrastArtifact,
  type CssSafetyArtifact,
  type TokenCoverageArtifact,
} from './audit.js'
import type { ManifestSource } from './validate.js'
import { validateCatalog } from './validate.js'
import type { PreviewLivery } from './previews.js'
import { PREVIEW_HEIGHT, PREVIEW_LOCALES, PREVIEW_MODES, PREVIEW_WIDTH, previewFileName, renderPreviewSet } from './previews.js'

/** Repo-relative path of the generated catalog module (host/client import this). */
export const CATALOG_MODULE_PATH = 'src/generated/liveries.ts'
/** Repo-relative preview directory. */
export const PREVIEW_DIR = 'lib/previews'
/** Repo-relative audit artifact directory. */
export const ARTIFACT_DIR = 'artifacts/liveries'

export interface CompileOptions {
  readonly manifests: readonly ManifestSource[]
  readonly capabilities?: CapabilityMap
  readonly contractFacts?: ContractFacts
  /**
   * When false, gate failures are reported in `problems` but do not make the
   * result fail — used by `audit:*` commands for their own artifact generation.
   * `compile` itself always enforces gates.
   */
  readonly enforceGates?: boolean
}

export interface DriftEntry {
  readonly file: string
  readonly kind: 'missing' | 'changed' | 'unexpected'
}

/**
 * `lib/previews/index.json` — FROZEN shape consumed by the Host preview-asset
 * route: exact whitelist of relative SVG filenames, sorted, plus the count.
 * Richer per-file metadata lives in `artifacts/liveries/report.json`.
 */
export interface PreviewIndexFile {
  readonly files: readonly string[]
  readonly count: number
}

export interface CompileResult {
  readonly ok: boolean
  readonly sourceHash: string
  readonly compiledAt: string
  readonly problems: readonly CompileProblem[]
  readonly catalog: LiveryCatalog | null
  readonly meta: CatalogMeta | null
  readonly report: CatalogReport | null
  readonly contrast: ContrastArtifact | null
  readonly tokenCoverage: TokenCoverageArtifact | null
  readonly cssSafety: CssSafetyArtifact | null
  readonly previewCount: number
  /** Repo-relative path → exact UTF-8 file content, only when `ok`. */
  readonly files: ReadonlyMap<string, string>
}

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                                */
/* ------------------------------------------------------------------ */

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => sortDeep(entry))
  if (typeof value === 'object' && value !== null) {
    const source = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) out[key] = sortDeep(source[key])
    return out
  }
  return value
}

/** Canonical JSON (recursively sorted object keys, stable array order). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value))
}

/** Pretty canonical JSON used for generated files. */
export function serializeJson(value: unknown): string {
  return `${JSON.stringify(sortDeep(value), null, 2)}\n`
}

function sha256(text: string): string {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`
}

/**
 * Deterministic `compiledAt`: a timestamp derived from the canonical source hash
 * inside a fixed one-year window. Never the wall clock, never random.
 */
export function deriveCompiledAt(sourceHash: string): string {
  const epoch = Date.UTC(2026, 0, 1, 0, 0, 0)
  const hex = sourceHash.startsWith('sha256:') ? sourceHash.slice('sha256:'.length) : sourceHash
  const offsetSeconds = Number.parseInt(hex.slice(0, 8), 16) % (365 * 24 * 60 * 60)
  return new Date(epoch + offsetSeconds * 1000).toISOString()
}

/**
 * Source hash over the canonical manifests plus the core registry snapshot. Any
 * manifest edit, registry id/label change or font/metrics change rehashes the
 * whole generated catalog.
 */
export function computeSourceHash(manifests: readonly LiveryManifest[]): string {
  const sorted = [...manifests].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return sha256(
    canonicalJson({
      schemaVersion: SCHEMA_VERSION,
      compilerVersion: LIVERY_VERSION,
      registry: {
        fonts: FONT_STACKS,
        metrics: METRICS,
        tags: TAGS,
      },
      manifests: sorted,
    }),
  )
}

/* ------------------------------------------------------------------ */
/* Manifest discovery                                                   */
/* ------------------------------------------------------------------ */

/** Read `liveries/<id>/manifest.json` for every livery directory, sorted by id. */
export function loadManifestSources(rootDir: string): ManifestSource[] {
  const liveriesDir = join(rootDir, 'liveries')
  const entries = readdirSync(liveriesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  const sources: ManifestSource[] = []
  for (const id of entries) {
    const manifestPath = join(liveriesDir, id, 'manifest.json')
    if (!existsSync(manifestPath)) continue
    const raw: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
    sources.push({ file: `liveries/${id}/manifest.json`, raw })
  }
  return sources
}

/** Walk up from `startDir` until a directory with package.json + schemas/ is found. */
export function findRepoRoot(startDir: string): string {
  let current = resolve(startDir)
  for (let depth = 0; depth < 12; depth += 1) {
    if (existsSync(join(current, 'package.json')) && existsSync(join(current, 'schemas', 'livery.schema.json'))) {
      return current
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return resolve(startDir)
}

/* ------------------------------------------------------------------ */
/* Compilation                                                         */
/* ------------------------------------------------------------------ */

function previewSourceOf(livery: CompiledLivery): PreviewLivery {
  return {
    id: livery.id,
    meta: livery.meta,
    layout: livery.layout,
    typography: livery.typography,
    light: { tokens: livery.light.tokens },
    dark: { tokens: livery.dark.tokens },
  }
}

interface CompiledCore {
  readonly livery: CompiledLivery
  readonly typography: ResolvedTypography
  readonly css: LiveryCss
  readonly light: CompiledVariant
  readonly dark: CompiledVariant
  readonly declaredLayout: LiveryManifest['layout']
  /** Pretty-printed byte counts (artifacts only; the shipped CSS is compact). */
  readonly prettyBytes: { readonly tokens: number; readonly typography: number; readonly layout: number; readonly total: number }
  /** Union of light+dark token names produced by derive, before the emission policy. */
  readonly derivedTokenNames: readonly string[]
  readonly problems: readonly CompileProblem[]
}

function compileOne(manifest: LiveryManifest, capabilities: CapabilityMap): CompiledCore {
  const problems: CompileProblem[] = []
  const typography = resolveTypography(manifest)
  const evaluation = evaluateCapabilities(capabilities as ContractCapabilityFacts, manifest)
  const effectiveManifest: LiveryManifest = { ...manifest, layout: evaluation.effectiveLayout }
  const derived = deriveLivery(effectiveManifest)
  // Emission policy (plan §8.2): ship only tokens a shipped package consumes;
  // unconsumed derived tokens stay at their stock value and are reported.
  const variants = {
    light: selectEmittedVariant(derived.light),
    dark: selectEmittedVariant(derived.dark),
  }
  const derivedTokenNames = [...new Set([...Object.keys(derived.light.tokens), ...Object.keys(derived.dark.tokens)])].sort()
  const css = renderLiveryCss(
    {
      id: manifest.id,
      light: variants.light,
      dark: variants.dark,
      typography,
      layout: evaluation.effectiveLayout,
      requiredCapabilities: manifest.compat.requiredCapabilities,
      optionalCapabilities: manifest.compat.optionalCapabilities,
    },
    evaluation.map,
  )

  const prettyCss = renderLiveryCss(
    {
      id: manifest.id,
      light: variants.light,
      dark: variants.dark,
      typography,
      layout: evaluation.effectiveLayout,
      requiredCapabilities: manifest.compat.requiredCapabilities,
      optionalCapabilities: manifest.compat.optionalCapabilities,
    },
    evaluation.map,
    { pretty: true },
  )
  const byteLength = (text: string): number => Buffer.byteLength(text, 'utf8')
  const prettyBytes = {
    tokens: byteLength(prettyCss.tokens),
    typography: byteLength(prettyCss.typography),
    layout: byteLength(prettyCss.layout),
    total: byteLength(prettyCss.tokens) + byteLength(prettyCss.typography) + byteLength(prettyCss.layout),
  }
  const cssAudit = auditLiveryCss({ id: manifest.id, css })
  const coverage = coverTokens(liveryTokenNames(variants))
  const light = summarizeLiveryContrast({ id: manifest.id, light: variants.light, dark: variants.dark }).light
  const dark = summarizeLiveryContrast({ id: manifest.id, light: variants.light, dark: variants.dark }).dark
  const audit: LiveryAuditReport = {
    contrast: [...variants.light.contrast, ...variants.dark.contrast],
    contrastFailures: light.failures.length + dark.failures.length,
    tokenCoverage: coverage,
    cssSafety: cssAudit.safety,
    degraded: evaluation.degraded,
  }

  // The runtime never re-renders: Host injects `css.*` verbatim and compares the
  // Client hash against this exact concatenation. Keep the byte-for-byte hash.
  const cssHash = computeLiveryCssHash(css)
  const base: Omit<CompiledLivery, 'hash'> = {
    id: manifest.id,
    meta: manifest.meta,
    typography,
    layout: evaluation.effectiveLayout,
    requiredCapabilities: manifest.compat.requiredCapabilities,
    optionalCapabilities: manifest.compat.optionalCapabilities,
    light: variants.light,
    dark: variants.dark,
    css,
    cssHash,
    audit,
  }
  const livery: CompiledLivery = { ...base, hash: hashLivery(base) }

  const failureRoles = audit.contrast.filter((entry) => !entry.pass).map((entry) => `${entry.role} (${entry.ratio} < ${entry.min})`)
  if (failureRoles.length > 0) {
    problems.push({
      code: 'contrast.failure',
      path: `liveries/${manifest.id}/manifest.json`,
      message: `${failureRoles.length} contrast assertion(s) failed: ${failureRoles.slice(0, 6).join(', ')}${failureRoles.length > 6 ? ', …' : ''}`,
    })
  }
  if (coverage.missing.length > 0) {
    problems.push({
      code: 'token.missing',
      path: `liveries/${manifest.id}/manifest.json`,
      message: `required host tokens not covered and not exempt: ${coverage.missing.join(', ')}`,
    })
  }
  if (!cssAudit.safety.pass) {
    problems.push({
      code: 'css.unsafe',
      path: `liveries/${manifest.id}`,
      message: cssAudit.details.violations.join('; '),
    })
  }
  if (cssAudit.overBudget) {
    problems.push({
      code: 'css.budget',
      path: `liveries/${manifest.id}`,
      message: `rendered CSS is ${cssAudit.bytes.total} bytes, above the ${12 * 1024} byte budget`,
    })
  }
  const requiredUnavailable = evaluation.degraded.filter((entry) => entry.fallback === 'none')
  if (requiredUnavailable.length > 0) {
    problems.push({
      code: 'capability.required-unavailable',
      path: `liveries/${manifest.id}/manifest.json`,
      message: `required capabilities unavailable: ${requiredUnavailable.map((entry) => entry.id).join(', ')}`,
    })
  }

  return {
    livery,
    typography,
    css,
    light: variants.light,
    dark: variants.dark,
    declaredLayout: manifest.layout,
    prettyBytes,
    derivedTokenNames,
    problems,
  }
}

function buildPreviewIndex(files: readonly string[]): PreviewIndexFile {
  const sorted = [...files].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return { files: sorted, count: sorted.length }
}

function buildPreviewSvgs(
  liveries: readonly CompiledLivery[],
): readonly { readonly file: string; readonly content: string }[] {
  const svgs: { file: string; content: string }[] = []
  for (const livery of liveries) {
    const previewSource = previewSourceOf(livery)
    svgs.push(...renderPreviewSet(previewSource))
  }
  return svgs
}

/**
 * Deterministic TypeScript module for the built-in catalog. The banner is
 * assembled line by line and any literal block-comment terminator is escaped, so
 * manifest-driven text can never break the generated module.
 */
export function serializeCatalogModule(catalog: LiveryCatalog, meta: CatalogMeta): string {
  const bannerLines: readonly string[] = [
    'GENERATED — do not edit by hand.',
    '',
    'Built-in livery catalog for DSH Livery, generated by `pnpm liveries:compile`',
    'from `liveries/<id>/manifest.json` + the frozen DSH contract snapshot.',
    '',
    `sourceHash: ${meta.sourceHash}`,
    `contractHash: ${meta.contractHash}`,
    `compiledAt: ${meta.compiledAt} (derived from sourceHash, never wall clock)`,
    '',
    '`pnpm liveries:check` fails the build if this file drifts from the manifests.',
  ]
  const banner = bannerLines.map((line) => ` * ${line.replace(/\*\//g, '*\\/')}`).join('\n')
  const header = `/**\n${banner}\n */\nimport type { CapabilityMap, CompiledLivery } from '../core/types.js'

export interface CatalogMeta {
  readonly compiledAt: string
  readonly sourceHash: string
  readonly contractHash: string
  readonly adapterId: string
  readonly hostVersion: string
  readonly capabilities: CapabilityMap
}
`
  return `${header}
export const LIVERIES: readonly CompiledLivery[] = ${serializeJson(catalog.liveries)}

export const CATALOG_META: CatalogMeta = ${serializeJson(meta)}
`
}

export function compileCatalog(options: CompileOptions): CompileResult {
  const capabilities = options.capabilities ?? HOST_CAPABILITIES
  const contractFacts = options.contractFacts ?? CONTRACT_FACTS
  const enforceGates = options.enforceGates ?? true

  const validation = validateCatalog(options.manifests, { capabilities })
  if (!validation.ok) {
    return {
      ok: false,
      sourceHash: '',
      compiledAt: '',
      problems: validation.diagnostics.map((diagnostic) => ({
        code: `validation.${diagnostic.code}`,
        path: diagnostic.path,
        message: diagnostic.message,
      })),
      catalog: null,
      meta: null,
      report: null,
      contrast: null,
      tokenCoverage: null,
      cssSafety: null,
      previewCount: 0,
      files: new Map<string, string>(),
    }
  }

  const sortedManifests = [...validation.manifests].sort((a, b) =>
    a.meta.order === b.meta.order ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.meta.order - b.meta.order,
  )
  const sourceHash = computeSourceHash(sortedManifests)
  const compiledAt = deriveCompiledAt(sourceHash)

  const problems: CompileProblem[] = []
  const cores: CompiledCore[] = []
  for (const manifest of sortedManifests) {
    let compiled: CompiledCore
    try {
      compiled = compileOne(manifest, capabilities)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      problems.push({
        code: 'compile.failed',
        path: `liveries/${manifest.id}/manifest.json`,
        message: `compilation failed: ${reason}`,
      })
      continue
    }
    cores.push(compiled)
    problems.push(...compiled.problems)
  }

  const liveries = cores.map((core) => core.livery)
  const meta: CatalogMeta = {
    compiledAt,
    sourceHash,
    contractHash: contractFacts.contractHash,
    adapterId: ADAPTER_ID,
    hostVersion: DSH_VERSION,
    capabilities,
  }
  const catalog: LiveryCatalog = {
    schemaVersion: SCHEMA_VERSION,
    compilerVersion: LIVERY_VERSION,
    adapterId: ADAPTER_ID,
    hostVersion: DSH_VERSION,
    contractHash: contractFacts.contractHash,
    capabilities,
    liveries,
  }
  const context: ArtifactContext = {
    sourceHash,
    compiledAt,
    contractHash: contractFacts.contractHash,
    adapterId: ADAPTER_ID,
    hostVersion: DSH_VERSION,
  }

  const bootCss = liveries.map((livery) => {
    const boot = renderBootCss(catalog, livery.id)
    return { id: livery.id, css: boot.css, hash: boot.hash }
  })
  // Frozen equality (docs/implementation/interfaces.md §2): the stored cssHash,
  // the boot CSS bytes the Host injects and the text the Client compares must all
  // be the same concatenation. Verify it at compile time so a renderer change can
  // never silently desynchronise the first frame from the stored artifact.
  for (const livery of liveries) {
    const boot = bootCss.find((entry) => entry.id === livery.id)
    if (boot === undefined) continue
    const styleText = styleTextFromFragments(livery.css)
    if (livery.cssHash !== hashCss(styleText) || boot.hash !== livery.cssHash || boot.css !== styleText) {
      problems.push({
        code: 'hash.mismatch',
        path: `liveries/${livery.id}`,
        message: 'stored css/cssHash does not equal renderBootCss(catalog, id) — host first frame would desynchronise from the compiled artifact',
      })
    }
  }

  const derivedTokenNames = [...new Set(cores.flatMap((core) => core.derivedTokenNames))].sort()
  const tokenCoverage = buildTokenCoverageArtifact(liveries, context, derivedTokenNames)
  const cssSafety = buildCssSafetyArtifact(
    catalog,
    bootCss,
    context,
    new Map(cores.map((core) => [core.livery.id, core.prettyBytes])),
  )
  const contrast = buildContrastArtifact(liveries, context)
  const declaredLayouts = new Map(cores.map((core) => [core.livery.id, core.declaredLayout]))
  const previews = buildPreviewSvgs(liveries)
  const previewIndex = buildPreviewIndex(previews.map((preview) => preview.file))

  const report = buildCatalogReport({
    catalog,
    context,
    declaredLayouts,
    previewFiles: previews.map((preview) => preview.file),
    bootCss: bootCss.map((entry) => ({ id: entry.id, css: entry.css })),
    maxLiveryCssBytes: Math.max(0, ...cssSafety.liveries.map((entry) => entry.bytes.total)),
    derivedTokenNames,
  })

  // Aggregate gates. The catalog is only emitted when every gate passes; the
  // individual problems above make failures actionable.
  if (!contrast.pass) {
    problems.push({ code: 'contrast.gate', path: 'artifacts/liveries/contrast.json', message: `${contrast.summary.failures} contrast assertion(s) failed across ${contrast.summary.total}` })
  }
  if (!tokenCoverage.pass) {
    problems.push({ code: 'token.gate', path: 'artifacts/liveries/token-coverage.json', message: `${tokenCoverage.counts.missing} required token(s) uncovered: ${tokenCoverage.missing.join(', ')}` })
  }
  if (!cssSafety.pass) {
    problems.push({ code: 'css.gate', path: 'artifacts/liveries/css-safety.json', message: 'CSS safety or size budget gate failed' })
  }
  const degradedRequired = liveries.some((livery) => livery.audit.degraded.some((entry) => entry.fallback === 'none'))
  if (degradedRequired) {
    problems.push({ code: 'capability.gate', path: 'liveries/', message: 'at least one livery declares a required capability the certified host does not provide' })
  }

  const ok = enforceGates ? problems.length === 0 : true
  if (!ok) {
    return {
      ok: false,
      sourceHash,
      compiledAt,
      problems,
      catalog,
      meta,
      report,
      contrast,
      tokenCoverage,
      cssSafety,
      previewCount: previews.length,
      files: new Map<string, string>(),
    }
  }

  const files = new Map<string, string>()
  files.set(CATALOG_MODULE_PATH, serializeCatalogModule(catalog, meta))
  for (const preview of previews) files.set(`${PREVIEW_DIR}/${preview.file}`, preview.content)
  files.set(`${PREVIEW_DIR}/index.json`, serializeJson(previewIndex))
  files.set(`${ARTIFACT_DIR}/report.json`, serializeJson(report))
  files.set(`${ARTIFACT_DIR}/contrast.json`, serializeJson(contrast))
  files.set(`${ARTIFACT_DIR}/token-coverage.json`, serializeJson(tokenCoverage))
  files.set(`${ARTIFACT_DIR}/css-safety.json`, serializeJson(cssSafety))

  return {
    ok,
    sourceHash,
    compiledAt,
    problems,
    catalog,
    meta,
    report,
    contrast,
    tokenCoverage,
    cssSafety,
    previewCount: previews.length,
    files,
  }
}

/** Compile from the on-disk `liveries/` tree at `rootDir`. */
export function compileFromDisk(rootDir: string, options: Omit<CompileOptions, 'manifests'> = {}): CompileResult {
  return compileCatalog({ ...options, manifests: loadManifestSources(rootDir) })
}

/* ------------------------------------------------------------------ */
/* Emit / check                                                         */
/* ------------------------------------------------------------------ */

/** Write every generated file (repo-relative paths under `rootDir`). */
export function writeGeneratedFiles(rootDir: string, files: ReadonlyMap<string, string>): void {
  for (const [file, content] of files) {
    const absolute = join(rootDir, file)
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, content, 'utf8')
  }
}

/** Compare expected generated files against the working tree. */
export function compareGeneratedFiles(rootDir: string, files: ReadonlyMap<string, string>): DriftEntry[] {
  const drift: DriftEntry[] = []
  for (const [file, expected] of files) {
    const absolute = join(rootDir, file)
    if (!existsSync(absolute)) {
      drift.push({ file, kind: 'missing' })
      continue
    }
    const actual = readFileSync(absolute, 'utf8')
    if (actual !== expected) drift.push({ file, kind: 'changed' })
  }
  const previewDir = join(rootDir, PREVIEW_DIR)
  if (existsSync(previewDir)) {
    const expectedNames = new Set<string>()
    for (const file of files.keys()) {
      if (file.startsWith(`${PREVIEW_DIR}/`)) expectedNames.add(file.slice(PREVIEW_DIR.length + 1))
    }
    for (const name of readdirSync(previewDir)) {
      if (!name.endsWith('.svg')) continue
      if (!expectedNames.has(name)) drift.push({ file: `${PREVIEW_DIR}/${name}`, kind: 'unexpected' })
    }
  }
  return drift.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
}

/** Convenience helper: all expected preview filenames for a catalog. */
export function expectedPreviewFiles(liveries: readonly Pick<CompiledLivery, 'id'>[]): string[] {
  const files: string[] = []
  for (const livery of liveries) {
    for (const locale of PREVIEW_LOCALES) {
      for (const mode of PREVIEW_MODES) files.push(previewFileName(livery.id, locale, mode))
    }
  }
  return files
}

/** Structured summary of a successful compile for CLI stdout. */
export function describeCompileResult(result: CompileResult): string[] {
  const report = result.report
  const contrast = result.contrast
  const coverage = result.tokenCoverage
  const lines: string[] = []
  lines.push(`sourceHash ${result.sourceHash}`)
  lines.push(`compiledAt ${result.compiledAt} (derived from sourceHash)`)
  if (report !== null) {
    lines.push(
      `${report.counts.liveries} liveries, ${report.counts.previews} previews (${PREVIEW_WIDTH}x${PREVIEW_HEIGHT}), ` +
        `${report.counts.contrastEntries} contrast assertions, ${report.counts.contrastFailures} failures`,
    )
    lines.push(
      `tokens required ${report.counts.tokenRequired}, covered ${report.counts.tokenCovered}, ` +
        `inherited ${report.counts.tokenInherited}, missing ${report.counts.tokenMissing}`,
    )
    lines.push(
      `css total ${report.counts.cssBytes} bytes, max livery ${report.counts.maxLiveryCssBytes}, max boot ${report.counts.maxBootCssBytes}`,
    )
  }
  if (contrast !== null) lines.push(`contrast smallest ratio ${minSmallestRatio(contrast)}`)
  if (coverage !== null) lines.push(`token coverage ${coverage.counts.covered}/${coverage.counts.required} covered + ${coverage.counts.inherited} inherited`)
  return lines
}

function minSmallestRatio(artifact: ContrastArtifact): string {
  let smallest = Number.POSITIVE_INFINITY
  for (const livery of artifact.liveries) {
    smallest = Math.min(smallest, livery.light.smallestRatio, livery.dark.smallestRatio)
  }
  return Number.isFinite(smallest) ? smallest.toFixed(2) : 'n/a'
}
