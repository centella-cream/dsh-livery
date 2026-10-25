/**
 * Livery compiler orchestration — multi-version host support.
 *
 * The same package styles three exact certified host builds. Host versions that
 * share a `catalogProfile` render byte-identical stylesheets, so the compiler:
 *
 *   1. validates the manifests against *every* profile's capabilities + stock,
 *   2. compiles each catalog profile **once** using its representative adapter's
 *      stock snapshot (`stockForVersion`) and capability map,
 *   3. re-derives + re-renders every livery against every other adapter in the
 *      group and fails the build unless the CSS fragments and `cssHash` match
 *      byte-for-byte,
 *   4. emits per-profile previews and per-profile audit artifacts plus a
 *      cross-profile `summary.json` that maps adapters to profiles.
 *
 * Nothing here reads the wall clock: `compiledAt` is derived from the canonical
 * source hash (which includes the profile id, token-contract hash and registry),
 * so two compiles of the same sources are byte-identical. `--check` regenerates
 * every file in memory and compares it with the committed tree.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import type {
  CapabilityMap,
  CatalogProfileData,
  CompiledLivery,
  CompiledVariant,
  ContractCapabilityFacts,
  LiveryAuditReport,
  LiveryCatalog,
  LiveryCss,
  LiveryManifest,
  ResolvedTypography,
} from '../core/types.js'
import { LIVERY_VERSION, PREVIEW_ROUTE_PREFIX, SCHEMA_VERSION } from '../core/types.js'
import { deriveLivery } from '../core/derive.js'
import { evaluateCapabilities } from '../core/capabilities.js'
import { computeLiveryCssHash, hashCss, hashLivery, renderBootCss, renderLiveryCss, styleTextFromFragments } from '../core/render.js'
import { FONT_STACKS, METRICS, TAGS, resolveTypography } from '../core/registry.js'
import type { AdapterRecord } from '../generated/contract.js'
import { ADAPTERS } from '../generated/contract.js'
import { stockForVersion } from '../generated/stock.js'
import type { StockSnapshot } from '../generated/stock.js'
import {
  auditLiveryCss,
  auditStyleCoverage,
  buildCatalogReport,
  buildContrastArtifact,
  buildCssSafetyArtifact,
  buildSummaryArtifact,
  buildTokenCoverageArtifact,
  coverTokens,
  inheritedUnconsumedTokens,
  liveryTokenNames,
  summarizeLiveryContrast,
  tokenSetsFor,
  type AdapterEntry,
  type ArtifactContext,
  type CatalogReport,
  type CompileProblem,
  type ContrastArtifact,
  type ManifestStyleInfo,
  type CssSafetyArtifact,
  type StockTokenSets,
  type SummaryArtifact,
  type SummaryProfileSource,
  type TokenCoverageArtifact,
} from './audit.js'
import type { Diagnostic, ManifestSource } from './validate.js'
import { validateCatalog } from './validate.js'
import type { PreviewLivery } from './previews.js'
import {
  PREVIEW_HEIGHT,
  PREVIEW_LOCALES,
  PREVIEW_MODES,
  PREVIEW_WIDTH,
  previewFileName,
  renderPreviewSet,
} from './previews.js'

/** Repo-relative path of the generated multi-profile catalog module. */
export const CATALOG_MODULE_PATH = 'src/generated/liveries.ts'
/** Repo-relative preview directory root (one subdirectory per catalog profile). */
export const PREVIEW_DIR = 'lib/previews'
/** Repo-relative audit artifact root (one subdirectory per catalog profile). */
export const ARTIFACT_DIR = 'artifacts/liveries'
/** Repo-relative cross-profile summary artifact. */
export const SUMMARY_PATH = `${ARTIFACT_DIR}/summary.json`
/** Directories whose contents are fully generated and may be pruned/reported on. */
export const MANAGED_DIRS: readonly string[] = [PREVIEW_DIR, ARTIFACT_DIR]

export interface CompileOptions {
  readonly manifests: readonly ManifestSource[]
  /** Adapter registry to compile for (defaults to the frozen `ADAPTERS`). */
  readonly adapters?: readonly AdapterRecord[]
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

export interface PreviewIndexFile {
  readonly files: readonly string[]
  readonly count: number
}

export interface ProfileCompileResult {
  readonly profile: CatalogProfileData
  readonly adapters: readonly AdapterRecord[]
  readonly representative: AdapterRecord
  readonly stock: StockSnapshot
  readonly tokenSets: StockTokenSets
  readonly report: CatalogReport
  readonly contrast: ContrastArtifact
  readonly tokenCoverage: TokenCoverageArtifact
  readonly cssSafety: CssSafetyArtifact
  readonly previewCount: number
}

export interface CompileResult {
  readonly ok: boolean
  readonly problems: readonly CompileProblem[]
  readonly profiles: readonly ProfileCompileResult[]
  readonly summary: SummaryArtifact | null
  /** Repo-relative path → exact UTF-8 file content, only when `ok`. */
  readonly files: ReadonlyMap<string, string>
  readonly previewCount: number
  readonly profileCount: number
  readonly adapterCount: number
}

/** One compiled livery plus the compile-time evidence the artifacts need. */
interface CompiledCore {
  readonly livery: CompiledLivery
  readonly typography: ResolvedTypography
  readonly css: LiveryCss
  readonly light: CompiledVariant
  readonly dark: CompiledVariant
  readonly declaredLayout: LiveryManifest['layout']
  readonly prettyBytes: { readonly tokens: number; readonly typography: number; readonly layout: number; readonly total: number }
  readonly derivedTokenNames: readonly string[]
  readonly problems: readonly CompileProblem[]
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
 * Per-profile source hash over the canonical manifests + core registry + profile
 * identity (profile id and token-contract hash). Any manifest, registry or host
 * token contract change rehashes that profile's generated catalog.
 */
export function computeSourceHash(
  manifests: readonly LiveryManifest[],
  profileId: string,
  tokenContractHash: string,
): string {
  const sorted = [...manifests].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return sha256(
    canonicalJson({
      schemaVersion: SCHEMA_VERSION,
      compilerVersion: LIVERY_VERSION,
      profileId,
      tokenContractHash,
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
/* Profile grouping                                                    */
/* ------------------------------------------------------------------ */

export interface AdapterGroup {
  readonly profileId: string
  readonly adapters: readonly AdapterRecord[]
}

/** Group adapters by `catalogProfile`, preserving registry (ascending) order. */
export function groupAdaptersByProfile(adapters: readonly AdapterRecord[]): AdapterGroup[] {
  const groups = new Map<string, AdapterRecord[]>()
  for (const adapter of adapters) {
    const group = groups.get(adapter.catalogProfile)
    if (group === undefined) groups.set(adapter.catalogProfile, [adapter])
    else group.push(adapter)
  }
  return [...groups.entries()].map(([profileId, group]) => ({
    profileId,
    adapters: [...group].sort((a, b) => (a.hostVersion < b.hostVersion ? -1 : a.hostVersion > b.hostVersion ? 1 : 0)),
  }))
}

function adapterEntryOf(adapter: AdapterRecord, stock: StockSnapshot): AdapterEntry {
  return {
    hostVersion: adapter.hostVersion,
    adapterId: adapter.adapterId,
    contractHash: adapter.contractHash,
    tokenContractHash: stock.tokenContractHash,
    sourceKind: adapter.sourceKind,
    nodeRange: adapter.nodeRange,
    catalogProfile: adapter.catalogProfile,
  }
}

/* ------------------------------------------------------------------ */
/* Per-livery compilation                                              */
/* ------------------------------------------------------------------ */

function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8')
}

function compileOne(
  manifest: LiveryManifest,
  stock: StockSnapshot,
  capabilities: CapabilityMap,
  tokenSets: StockTokenSets,
): CompiledCore {
  const problems: CompileProblem[] = []
  const typography = resolveTypography(manifest)
  const evaluation = evaluateCapabilities(capabilities as ContractCapabilityFacts, manifest)
  const effectiveManifest: LiveryManifest = { ...manifest, layout: evaluation.effectiveLayout }
  const derived = deriveLivery(effectiveManifest, stock)
  // Emission policy is core-owned (docs/implementation/style-system.md): derive
  // already emits exactly the A-tier colour set + registered style/metric tokens +
  // explicit author overrides. The compiler must not filter that map again, or a
  // private typography binding / non-colour style token could be dropped.
  const variants = derived
  const derivedTokenNames = [...new Set([...Object.keys(derived.light.tokens), ...Object.keys(derived.dark.tokens)])].sort()
  const renderable = {
    id: manifest.id,
    light: variants.light,
    dark: variants.dark,
    typography,
    layout: evaluation.effectiveLayout,
    requiredCapabilities: manifest.compat.requiredCapabilities,
    optionalCapabilities: manifest.compat.optionalCapabilities,
  }
  const css = renderLiveryCss(renderable, evaluation.map, stock)
  const prettyCss = renderLiveryCss(renderable, evaluation.map, stock, { pretty: true })
  const prettyBytes = {
    tokens: byteLength(prettyCss.tokens),
    typography: byteLength(prettyCss.typography),
    layout: byteLength(prettyCss.layout),
    total: byteLength(prettyCss.tokens) + byteLength(prettyCss.typography) + byteLength(prettyCss.layout),
  }

  const cssAudit = auditLiveryCss({ id: manifest.id, css })
  const coverage = coverTokens(liveryTokenNames(variants), tokenSets)
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
  // Client hash against this exact concatenation.
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

  const styleCoverage = auditStyleCoverage(variants.light, variants.dark)
  if (!styleCoverage.pass) {
    problems.push({
      code: 'style.unsafe',
      path: `liveries/${manifest.id}/manifest.json`,
      message: `style-system token value(s) outside the frozen grammar: ${styleCoverage.rejected
        .slice(0, 6)
        .map((issue) => `${issue.token} ${issue.reason}`)
        .join(', ')}`,
    })
  }

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
    problems.push({ code: 'css.unsafe', path: `liveries/${manifest.id}`, message: cssAudit.details.violations.join('; ') })
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

  return { livery, typography, css, light: variants.light, dark: variants.dark, declaredLayout: manifest.layout, prettyBytes, derivedTokenNames, problems }
}

/** Render one livery for an arbitrary adapter (used for byte-identity checks). */
function renderCssForAdapter(
  manifest: LiveryManifest,
  stock: StockSnapshot,
  capabilities: CapabilityMap,
): { readonly css: LiveryCss; readonly cssHash: string } {
  const evaluation = evaluateCapabilities(capabilities as ContractCapabilityFacts, manifest)
  const derived = deriveLivery({ ...manifest, layout: evaluation.effectiveLayout }, stock)
  const variants = derived
  const css = renderLiveryCss(
    {
      id: manifest.id,
      light: variants.light,
      dark: variants.dark,
      typography: resolveTypography(manifest),
      layout: evaluation.effectiveLayout,
      requiredCapabilities: manifest.compat.requiredCapabilities,
      optionalCapabilities: manifest.compat.optionalCapabilities,
    },
    evaluation.map,
    stock,
  )
  return { css, cssHash: computeLiveryCssHash(css) }
}

/* ------------------------------------------------------------------ */
/* Preview generation                                                  */
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

function buildPreviewIndex(files: readonly string[]): PreviewIndexFile {
  const sorted = [...files].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return { files: sorted, count: sorted.length }
}

function buildPreviewSvgs(
  liveries: readonly CompiledLivery[],
  stock: StockSnapshot,
): readonly { readonly file: string; readonly content: string }[] {
  const svgs: { file: string; content: string }[] = []
  for (const livery of liveries) {
    svgs.push(...renderPreviewSet(previewSourceOf(livery), stock))
  }
  return svgs
}

/* ------------------------------------------------------------------ */
/* Generated module                                                    */
/* ------------------------------------------------------------------ */

/**
 * Deterministic TypeScript module for the built-in catalog profiles. The banner
 * is assembled line by line and any literal block-comment terminator is escaped,
 * so manifest-driven text can never break the generated module.
 */
export function serializeCatalogModule(profiles: readonly CatalogProfileData[]): string {
  const bannerLines: readonly string[] = [
    'GENERATED — do not edit by hand.',
    '',
    'Built-in livery catalogs for DSH Livery, generated by `liveries:compile`.',
    'One entry per catalog profile (render-equivalent host versions); every',
    'adapter in `sourceAdapters` serves these exact CSS bytes and previews.',
    'Source manifests: `liveries/<id>/manifest.json`.',
    '',
    `compilerVersion: ${LIVERY_VERSION}`,
    `profiles: ${profiles.map((profile) => profile.profileId).join(', ')}`,
    '',
    '`liveries:check` fails the build if this file drifts from the manifests.',
  ]
  const banner = bannerLines.map((line) => ` * ${line.replace(/\*\//g, '*\\/')}`).join('\n')
  const header = `/**
${banner}
 */
import type { CatalogProfileData } from '../core/types.js'

/** One render-equivalent catalog profile (see docs/implementation/multi-version.md §4). */
export type CatalogProfile = CatalogProfileData
`
  return `${header}
export const CATALOG_PROFILES: Readonly<Record<string, CatalogProfile>> = ${serializeJson(
    Object.fromEntries(profiles.map((profile) => [profile.profileId, profile])),
  )}

export const CATALOG_PROFILE_IDS: readonly string[] = ${serializeJson(profiles.map((profile) => profile.profileId))}
`
}

/* ------------------------------------------------------------------ */
/* Compilation                                                         */
/* ------------------------------------------------------------------ */

function dedupeProblems(problems: readonly CompileProblem[]): CompileProblem[] {
  const seen = new Set<string>()
  const out: CompileProblem[] = []
  for (const problem of problems) {
    const key = `${problem.code}|${problem.path}|${problem.message}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(problem)
  }
  return out
}

interface ProfileDraft {
  readonly group: AdapterGroup
  readonly representative: AdapterRecord
  readonly stock: StockSnapshot
  readonly tokenSets: StockTokenSets
  readonly tokenCoverage: TokenCoverageArtifact
  readonly contrast: ContrastArtifact
  readonly cssSafety: CssSafetyArtifact
  readonly report: CatalogReport
  readonly cores: readonly CompiledCore[]
  readonly adapterRenderIdentity: boolean
  readonly problems: readonly CompileProblem[]
  readonly catalog: LiveryCatalog
  readonly previews: readonly { readonly file: string; readonly content: string }[]
  readonly previewDirectory: string
  readonly artifactDirectory: string
}

/**
 * Compile every manifest once per catalog profile. Deterministic: identical
 * inputs always produce byte-identical outputs.
 */
export function compileCatalog(options: CompileOptions): CompileResult {
  const adapters = options.adapters ?? ADAPTERS
  const enforceGates = options.enforceGates ?? true
  const groups = groupAdaptersByProfile(adapters)

  if (groups.length === 0) {
    return {
      ok: false,
      problems: [{ code: 'adapters.empty', path: 'src/generated/contract.ts', message: 'adapter registry is empty' }],
      profiles: [],
      summary: null,
      files: new Map<string, string>(),
      previewCount: 0,
      profileCount: 0,
      adapterCount: 0,
    }
  }

  // 1. Validate the manifests against every profile (multi-version safety).
  const validationProblems: CompileProblem[] = []
  let manifests: readonly LiveryManifest[] = []
  let validationOk = true
  for (const group of groups) {
    const representative = group.adapters[0]
    if (representative === undefined) continue
    const stock = stockForVersion(representative.hostVersion)
    if (stock === undefined) {
      validationProblems.push({
        code: 'adapter.stock-missing',
        path: 'src/generated/stock.ts',
        message: `no stock snapshot for certified host ${representative.hostVersion}`,
      })
      validationOk = false
      continue
    }
    const validation = validateCatalog(options.manifests, { capabilities: representative.capabilities, stock })
    for (const diagnostic of validation.diagnostics) {
      validationProblems.push({
        code: `validation.${diagnostic.code}`,
        path: `[${representative.hostVersion}] ${diagnostic.path}`,
        message: diagnostic.message,
      })
    }
    if (!validation.ok) validationOk = false
    else manifests = validation.manifests
  }
  if (!validationOk) {
    return {
      ok: false,
      problems: dedupeProblems(validationProblems),
      profiles: [],
      summary: null,
      files: new Map<string, string>(),
      previewCount: 0,
      profileCount: groups.length,
      adapterCount: adapters.length,
    }
  }
  if (manifests.length === 0) {
    return {
      ok: false,
      problems: [{ code: 'catalog.empty', path: 'liveries/', message: 'no livery manifests found' }],
      profiles: [],
      summary: null,
      files: new Map<string, string>(),
      previewCount: 0,
      profileCount: groups.length,
      adapterCount: adapters.length,
    }
  }

  const manifestStyles = new Map<string, ManifestStyleInfo>(
    manifests.map((manifest) => [
      manifest.id,
      {
        surfaceStyle: manifest.layout.surfaceStyle,
        metrics: { 'zh-CN': manifest.typography.metrics['zh-CN'], 'en-US': manifest.typography.metrics['en-US'] },
        fonts: {
          ui: { 'zh-CN': manifest.typography.ui['zh-CN'], 'en-US': manifest.typography.ui['en-US'] },
          content: { 'zh-CN': manifest.typography.content['zh-CN'], 'en-US': manifest.typography.content['en-US'] },
          code: manifest.typography.code,
        },
      },
    ]),
  )
  const explicitOverrideNames = new Set<string>(
    manifests.flatMap((manifest) => [
      ...Object.keys(manifest.variants.light.tokens ?? {}),
      ...Object.keys(manifest.variants.dark.tokens ?? {}),
    ]),
  )

  const sortedManifests = [...manifests].sort((a, b) =>
    a.meta.order === b.meta.order ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.meta.order - b.meta.order,
  )

  // 2. Compile each profile once + verify adapter-group byte identity.
  const drafts: ProfileDraft[] = []
  const problems: CompileProblem[] = []

  for (const group of groups) {
    const representative = group.adapters[0]
    if (representative === undefined) continue
    const stock = stockForVersion(representative.hostVersion)
    if (stock === undefined) continue
    const tokenSets = tokenSetsFor(stock)
    const profileId = group.profileId
    const capabilities = representative.capabilities
    const previewDirectory = `${PREVIEW_DIR}/${profileId}`
    const artifactDirectory = `${ARTIFACT_DIR}/${profileId}`
    const sourceHash = computeSourceHash(sortedManifests, profileId, stock.tokenContractHash)
    const compiledAt = deriveCompiledAt(sourceHash)
    const context: ArtifactContext = {
      profileId,
      sourceHash,
      compiledAt,
      sourceAdapters: group.adapters.map((adapter) => adapter.hostVersion),
      adapterIds: group.adapters.map((adapter) => adapter.adapterId),
      contractHash: representative.contractHash,
      hostVersion: representative.hostVersion,
      adapterId: representative.adapterId,
      tokenSets,
    }
    const adapterEntries = group.adapters.map((adapter) => {
      const adapterStock = stockForVersion(adapter.hostVersion)
      return adapterEntryOf(adapter, adapterStock ?? stock)
    })

    const cores: CompiledCore[] = []
    const profileProblems: CompileProblem[] = []
    for (const manifest of sortedManifests) {
      let compiled: CompiledCore
      try {
        compiled = compileOne(manifest, stock, capabilities, tokenSets)
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        profileProblems.push({
          code: 'compile.failed',
          path: `[${profileId}] liveries/${manifest.id}/manifest.json`,
          message: `compilation failed: ${reason}`,
        })
        continue
      }
      cores.push(compiled)
      profileProblems.push(...compiled.problems.map((problem) => ({ ...problem, path: `[${profileId}] ${problem.path}` })))
    }
    const liveries = cores.map((core) => core.livery)
    const catalog: LiveryCatalog = {
      schemaVersion: SCHEMA_VERSION,
      compilerVersion: LIVERY_VERSION,
      adapterId: representative.adapterId,
      hostVersion: representative.hostVersion,
      contractHash: representative.contractHash,
      catalogProfile: profileId,
      capabilities,
      previewsBase: `${PREVIEW_ROUTE_PREFIX}${profileId}/`,
      liveries,
    }

    // Frozen equality: the stored cssHash, the boot bytes and the frozen
    // `renderBootCss` helper must agree for every livery.
    const bootCss = liveries.map((livery) => {
      const boot = renderBootCss(catalog, livery.id, stock)
      return { id: livery.id, css: boot.css, hash: boot.hash }
    })
    for (const livery of liveries) {
      const boot = bootCss.find((entry) => entry.id === livery.id)
      if (boot === undefined) continue
      const styleText = styleTextFromFragments(livery.css)
      if (livery.cssHash !== hashCss(styleText) || boot.hash !== livery.cssHash || boot.css !== styleText) {
        profileProblems.push({
          code: 'hash.mismatch',
          path: `[${profileId}] liveries/${livery.id}`,
          message: 'stored css/cssHash does not equal renderBootCss(catalog, id, stock) — the host first frame would desynchronise from the compiled artifact',
        })
      }
    }

    // Verify every adapter in the group renders the exact same bytes.
    let adapterRenderIdentity = true
    for (const adapter of group.adapters) {
      if (adapter.hostVersion === representative.hostVersion) continue
      const adapterStock = stockForVersion(adapter.hostVersion)
      if (adapterStock === undefined) {
        adapterRenderIdentity = false
        profileProblems.push({
          code: 'adapter.stock-missing',
          path: `[${profileId}] ${adapter.hostVersion}`,
          message: 'certified adapter has no stock snapshot',
        })
        continue
      }
      for (const manifest of sortedManifests) {
        const expected = cores.find((core) => core.livery.id === manifest.id)
        if (expected === undefined) continue
        let rendered: { css: LiveryCss; cssHash: string }
        try {
          rendered = renderCssForAdapter(manifest, adapterStock, adapter.capabilities)
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error)
          adapterRenderIdentity = false
          profileProblems.push({
            code: 'profile.render-mismatch',
            path: `[${profileId}] ${adapter.hostVersion}/${manifest.id}`,
            message: `re-render failed: ${reason}`,
          })
          continue
        }
        const sameCss =
          rendered.css.tokens === expected.css.tokens &&
          rendered.css.typography === expected.css.typography &&
          rendered.css.layout === expected.css.layout
        if (!sameCss || rendered.cssHash !== expected.livery.cssHash) {
          adapterRenderIdentity = false
          profileProblems.push({
            code: 'profile.render-mismatch',
            path: `[${profileId}] ${adapter.hostVersion}/${manifest.id}`,
            message: 'profile group is not render-equivalent: adapters produce different CSS bytes/hashes',
          })
        }
      }
    }

    const tokenCoverage = buildTokenCoverageArtifact(
      liveries,
      context,
      [...new Set(cores.flatMap((core) => core.derivedTokenNames))].sort(),
      explicitOverrideNames,
    )
    const cssSafety = buildCssSafetyArtifact(
      catalog,
      bootCss,
      context,
      new Map(cores.map((core) => [core.livery.id, core.prettyBytes])),
    )
    const contrast = buildContrastArtifact(liveries, context)
    const declaredLayouts = new Map(cores.map((core) => [core.livery.id, core.declaredLayout]))
    const previews = buildPreviewSvgs(liveries, stock)
    const report = buildCatalogReport({
      catalog,
      context,
      declaredLayouts,
      previewFiles: previews.map((preview) => preview.file),
      previewDirectory,
      bootCss: bootCss.map((entry) => ({ id: entry.id, css: entry.css })),
      maxLiveryCssBytes: Math.max(0, ...cssSafety.liveries.map((entry) => entry.bytes.total)),
      adapterEntries,
      derivedTokenNames: [...new Set(cores.flatMap((core) => core.derivedTokenNames))].sort(),
      adapterRenderIdentity,
      manifestStyles,
      explicitOverrideNames,
    })

    const derivedUnconsumed = inheritedUnconsumedTokens(
      cores.flatMap((core) => core.derivedTokenNames),
      tokenSets,
      explicitOverrideNames,
    )
    const mandatoryProblems: CompileProblem[] = []
    if (!contrast.pass) {
      mandatoryProblems.push({
        code: 'contrast.gate',
        path: `[${profileId}] ${ARTIFACT_DIR}/${profileId}/contrast.json`,
        message: `${contrast.summary.failures} contrast assertion(s) failed across ${contrast.summary.total}`,
      })
    }
    if (!tokenCoverage.pass) {
      mandatoryProblems.push({
        code: 'token.gate',
        path: `[${profileId}] ${ARTIFACT_DIR}/${profileId}/token-coverage.json`,
        message: `${tokenCoverage.counts.missing} required token(s) uncovered: ${tokenCoverage.missing.join(', ')}`,
      })
    }
    if (!cssSafety.pass) {
      mandatoryProblems.push({
        code: 'css.gate',
        path: `[${profileId}] ${ARTIFACT_DIR}/${profileId}/css-safety.json`,
        message: 'CSS safety or size budget gate failed',
      })
    }
    if (!report.gates.styleTokens) {
      mandatoryProblems.push({
        code: 'style.gate',
        path: `[${profileId}] ${ARTIFACT_DIR}/${profileId}/report.json`,
        message: `${report.counts.styleTokenViolations} style-system token value(s) outside the frozen grammar`,
      })
    }
    if (liveries.some((livery) => livery.audit.degraded.some((entry) => entry.fallback === 'none'))) {
      mandatoryProblems.push({
        code: 'capability.gate',
        path: `[${profileId}] liveries/`,
        message: 'at least one livery declares a required capability the certified host does not provide',
      })
    }
    if (derivedUnconsumed.length === 0 && tokenCoverage.emissionPolicy.inheritedUnconsumedCount === 0) {
      // Non-blocking diagnostic only: kept out of `problems` on purpose.
    }
    profileProblems.push(...mandatoryProblems)
    problems.push(...profileProblems)

    drafts.push({
      group,
      representative,
      stock,
      tokenSets,
      tokenCoverage,
      contrast,
      cssSafety,
      report,
      cores,
      adapterRenderIdentity,
      problems: profileProblems,
      catalog,
      previews,
      previewDirectory,
      artifactDirectory,
    })
  }

  const deduped = dedupeProblems(problems)
  const ok = enforceGates ? deduped.length === 0 : true

  // 3. Build the file map (only when the compile is accepted).
  const files = new Map<string, string>()
  const profileData: CatalogProfileData[] = drafts.map((draft) => ({
    profileId: draft.group.profileId,
    compiledAt: draft.report.compiledAt,
    sourceHash: draft.report.sourceHash,
    sourceAdapters: draft.group.adapters.map((adapter) => adapter.hostVersion),
    liveries: draft.cores.map((core) => core.livery),
  }))
  const summarySources: SummaryProfileSource[] = drafts.map((draft, index) => ({
    profile: profileData[index] as CatalogProfileData,
    report: draft.report,
    contrast: draft.contrast,
    tokenCoverage: draft.tokenCoverage,
    cssSafety: draft.cssSafety,
    adapters: draft.report.adapters,
    previewDirectory: draft.previewDirectory,
  }))
  const summary = buildSummaryArtifact(summarySources)

  if (!ok) {
    const summaryPass = summary.pass
    if (enforceGates && !summaryPass && deduped.length === 0) {
      deduped.push({ code: 'summary.gate', path: SUMMARY_PATH, message: 'cross-profile summary gate failed' })
    }
    return {
      ok: false,
      problems: deduped,
      profiles: drafts.map(profileResultOf),
      summary,
      files: new Map<string, string>(),
      previewCount: drafts.reduce((total, draft) => total + draft.previews.length, 0),
      profileCount: drafts.length,
      adapterCount: adapters.length,
    }
  }

  files.set(CATALOG_MODULE_PATH, serializeCatalogModule(profileData))
  for (const draft of drafts) {
    for (const preview of draft.previews) {
      files.set(`${draft.previewDirectory}/${preview.file}`, preview.content)
    }
    files.set(
      `${draft.previewDirectory}/index.json`,
      serializeJson(buildPreviewIndex(draft.previews.map((preview) => preview.file))),
    )
    files.set(`${draft.artifactDirectory}/report.json`, serializeJson(draft.report))
    files.set(`${draft.artifactDirectory}/contrast.json`, serializeJson(draft.contrast))
    files.set(`${draft.artifactDirectory}/token-coverage.json`, serializeJson(draft.tokenCoverage))
    files.set(`${draft.artifactDirectory}/css-safety.json`, serializeJson(draft.cssSafety))
  }
  files.set(SUMMARY_PATH, serializeJson(summary))

  const profilesFinal = drafts.map(profileResultOf)
  const finalProblems = enforceGates ? [] : deduped
  return {
    ok: finalProblems.length === 0,
    problems: finalProblems,
    profiles: profilesFinal,
    summary,
    files,
    previewCount: profilesFinal.reduce((total, profile) => total + profile.previewCount, 0),
    profileCount: profilesFinal.length,
    adapterCount: adapters.length,
  }
}

function profileResultOf(draft: ProfileDraft): ProfileCompileResult {
  return {
    profile: {
      profileId: draft.group.profileId,
      compiledAt: draft.report.compiledAt,
      sourceHash: draft.report.sourceHash,
      sourceAdapters: draft.group.adapters.map((adapter) => adapter.hostVersion),
      liveries: draft.cores.map((core) => core.livery),
    },
    adapters: draft.group.adapters,
    representative: draft.representative,
    stock: draft.stock,
    tokenSets: draft.tokenSets,
    report: draft.report,
    contrast: draft.contrast,
    tokenCoverage: draft.tokenCoverage,
    cssSafety: draft.cssSafety,
    previewCount: draft.previews.length,
  }
}

/** Compile from the on-disk `liveries/` tree at `rootDir`. */
export function compileFromDisk(rootDir: string, options: Omit<CompileOptions, 'manifests'> = {}): CompileResult {
  return compileCatalog({ ...options, manifests: loadManifestSources(rootDir) })
}

/* ------------------------------------------------------------------ */
/* Emit / check / prune                                                */
/* ------------------------------------------------------------------ */

/** Write every generated file (repo-relative paths under `rootDir`). */
export function writeGeneratedFiles(rootDir: string, files: ReadonlyMap<string, string>): void {
  for (const [file, content] of files) {
    const absolute = join(rootDir, file)
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, content, 'utf8')
  }
}

function walkFiles(rootDir: string, directory: string): string[] {
  const absolute = join(rootDir, directory)
  if (!existsSync(absolute)) return []
  const out: string[] = []
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = `${directory}/${entry.name}`
    if (entry.isDirectory()) out.push(...walkFiles(rootDir, child))
    else out.push(child)
  }
  return out
}

/** Compare expected generated files against the working tree (incl. stale files). */
export function compareGeneratedFiles(rootDir: string, files: ReadonlyMap<string, string>): DriftEntry[] {
  const drift: DriftEntry[] = []
  for (const [file, expected] of files) {
    const absolute = join(rootDir, file)
    if (!existsSync(absolute)) {
      drift.push({ file, kind: 'missing' })
      continue
    }
    if (readFileSync(absolute, 'utf8') !== expected) drift.push({ file, kind: 'changed' })
  }
  const expected = new Set(files.keys())
  for (const directory of MANAGED_DIRS) {
    for (const file of walkFiles(rootDir, directory)) {
      if (!expected.has(file)) drift.push({ file, kind: 'unexpected' })
    }
  }
  return drift
}

/**
 * Remove generated files that the current compile no longer produces (e.g. the
 * old single-profile `lib/previews/*.svg` layout) and empty directories. Only
 * files under the managed generated directories are touched.
 */
export function pruneGeneratedDirs(rootDir: string, files: ReadonlyMap<string, string>): string[] {
  const expected = new Set(files.keys())
  const removed: string[] = []
  for (const directory of MANAGED_DIRS) {
    const existing = walkFiles(rootDir, directory)
    for (const file of existing) {
      if (expected.has(file)) continue
      unlinkSync(join(rootDir, file))
      removed.push(file)
    }
  }
  const pruneEmpty = (directory: string): void => {
    const absolute = join(rootDir, directory)
    if (!existsSync(absolute)) return
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const child = `${directory}/${entry.name}`
      pruneEmpty(child)
      const childAbsolute = join(rootDir, child)
      if (existsSync(childAbsolute) && readdirSync(childAbsolute).length === 0) {
        rmdirSync(childAbsolute)
        removed.push(`${child}/`)
      }
    }
  }
  for (const directory of MANAGED_DIRS) pruneEmpty(directory)
  return removed.sort()
}

/** Convenience helper: all expected preview paths for one profile. */
export function expectedPreviewFiles(profileId: string, liveries: readonly Pick<CompiledLivery, 'id'>[]): string[] {
  const files: string[] = []
  for (const livery of liveries) {
    for (const locale of PREVIEW_LOCALES) {
      for (const mode of PREVIEW_MODES) files.push(`${PREVIEW_DIR}/${profileId}/${previewFileName(livery.id, locale, mode)}`)
    }
  }
  return files
}

/** Structured summary lines for CLI stdout. */
export function describeCompileResult(result: CompileResult): string[] {
  const lines: string[] = []
  for (const profile of result.profiles) {
    const short = profile.profile.profileId.slice('sha256:'.length, 'sha256:'.length + 12)
    lines.push(
      `profile ${short} — ${profile.adapters.map((adapter) => adapter.hostVersion).join(', ')} ` +
        `(representative ${profile.representative.hostVersion}, ${
          profile.adapters.length > 1 ? 'byte-identical across adapters' : 'single adapter'
        })`,
    )
    lines.push(
      `  ${profile.report.counts.liveries} liveries, ${profile.previewCount} previews (${PREVIEW_WIDTH}x${PREVIEW_HEIGHT}), ` +
        `${profile.report.counts.contrastEntries} contrast assertions / ${profile.report.counts.contrastFailures} failures`,
    )
    lines.push(
      `  tokens consumed ${profile.report.counts.tokenConsumed}, required ${profile.report.counts.tokenRequired}, ` +
        `covered ${profile.report.counts.tokenCovered}, inherited ${profile.report.counts.tokenInherited}, ` +
        `missing ${profile.report.counts.tokenMissing} (token contract ${profile.stock.tokenContractHash.slice(7, 19)}…)`,
    )
    lines.push(
      `  css total ${profile.report.counts.cssBytes} bytes, max livery ${profile.report.counts.maxLiveryCssBytes}, ` +
        `max boot ${profile.report.counts.maxBootCssBytes}, sourceHash ${profile.report.sourceHash.slice(0, 22)}…`,
    )
  }
  if (result.summary !== null) {
    lines.push(
      `profiles ${result.summary.counts.profiles}, adapters ${result.summary.counts.adapters}, ` +
        `liveries ${result.summary.counts.liveries}, previews ${result.summary.counts.previews}`,
    )
  }
  return lines
}

/** Relative path helper used by tests to assert emitted locations. */
export function relativePath(rootDir: string, file: string): string {
  return relative(rootDir, join(rootDir, file)).split(sep).join('/')
}

export type { Diagnostic }
