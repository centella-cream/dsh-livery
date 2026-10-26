/**
 * Unit-test helpers: build compiled liveries from fixture manifests without the
 * compiler (the compiler owns `src/compiler/**`; these helpers exercise the
 * same core pipeline the compiler uses).
 *
 * Everything is version-explicit: tests can build the same manifest against the
 * 0.2.0-rc.2 legacy stock/capabilities and against the 0.2.1-rc.2 host with
 * font-role hooks, and compare the deterministic output.
 */

import type {
  CapabilityMap,
  CompiledLivery,
  CompiledVariant,
  LiveryAuditReport,
  LiveryCatalog,
  LiveryManifest,
  ResolvedTypography,
} from '../../src/core/types.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AdapterRecord } from '../../src/generated/contract.js'
import type { StockSnapshot } from '../../src/generated/stock.js'
import { adapterRecordFrom, stockSnapshotFrom } from '../../src/contract/snapshot.js'
import type { ContractSnapshot } from '../../src/contract/types.js'
import { evaluateCapabilities, type CapabilityEvaluation } from '../../src/core/capabilities.js'
import { deriveLivery } from '../../src/core/derive.js'
import { resolveTypography } from '../../src/core/registry.js'
import {
  hashCss,
  hashLivery,
  renderLiveryCss,
  styleTextFromFragments,
  type RenderableLivery,
} from '../../src/core/render.js'
import { auditContrast, summarizeContrast } from '../../src/core/contrast.js'

/**
 * Historical adapter/stock fixtures built from the committed contract snapshots.
 * The shipped generated registry now only contains formal-matrix approved
 * adapters, but unit tests still need explicit version fixtures to prove the
 * derivation/renderer is driven by the snapshot, not by a global table.
 */
function historicalFixture(version: string): { adapter: AdapterRecord; stock: StockSnapshot } {
  const path = join(process.cwd(), 'contracts', 'dsh', version, 'contract.json')
  const contract = JSON.parse(readFileSync(path, 'utf8')) as ContractSnapshot
  return {
    adapter: adapterRecordFrom(contract) as unknown as AdapterRecord,
    stock: stockSnapshotFrom(contract) as unknown as StockSnapshot,
  }
}

const FIXTURE_020 = historicalFixture('0.2.0-rc.2')
const FIXTURE_021_RC2 = historicalFixture('0.2.1-rc.2')
const FIXTURE_021_RC3 = historicalFixture('0.2.1-rc.3')

/** Historical adapter records used by the tests. */
export const ADAPTER_020: AdapterRecord = FIXTURE_020.adapter
export const ADAPTER_021_RC2: AdapterRecord = FIXTURE_021_RC2.adapter
export const ADAPTER_021_RC3: AdapterRecord = FIXTURE_021_RC3.adapter

/** Frozen stock snapshots keyed by host version. */
export const STOCK_020: StockSnapshot = FIXTURE_020.stock
export const STOCK_021_RC2: StockSnapshot = FIXTURE_021_RC2.stock
export const STOCK_021_RC3: StockSnapshot = FIXTURE_021_RC3.stock

export interface BuildOptions {
  /** Capability map; defaults to the adapter's certified map. */
  readonly capabilities?: CapabilityMap
  /** Host stock snapshot; defaults to the adapter's snapshot. */
  readonly stock?: StockSnapshot
  /** Adapter used for identity/previews; defaults to 0.2.0-rc.2. */
  readonly adapter?: AdapterRecord
}

function stockForAdapter(adapter: AdapterRecord): StockSnapshot {
  const fixture = [FIXTURE_020, FIXTURE_021_RC2, FIXTURE_021_RC3].find(
    (candidate) => candidate.adapter.hostVersion === adapter.hostVersion,
  )
  if (fixture === undefined) throw new Error(`No stock snapshot for ${adapter.hostVersion}`)
  return fixture.stock
}

export interface FixtureBuild {
  readonly manifest: LiveryManifest
  readonly renderable: RenderableLivery
  readonly light: CompiledVariant
  readonly dark: CompiledVariant
  readonly typography: ResolvedTypography
  readonly evaluation: CapabilityEvaluation
  readonly adapter: AdapterRecord
  readonly stock: StockSnapshot
}

/** Run derive + typography resolution + capability evaluation for one manifest. */
export function buildFixture(manifest: LiveryManifest, options: BuildOptions = {}): FixtureBuild {
  const adapter = options.adapter ?? ADAPTER_020
  const stock = options.stock ?? stockForAdapter(adapter)
  const capabilities = options.capabilities ?? adapter.capabilities
  const typography = resolveTypography(manifest)
  const evaluation = evaluateCapabilities(capabilities, manifest)
  const effectiveManifest: LiveryManifest = { ...manifest, layout: evaluation.effectiveLayout }
  const variants = deriveLivery(effectiveManifest, stock)
  return {
    manifest,
    typography,
    evaluation,
    adapter,
    stock,
    light: variants.light,
    dark: variants.dark,
    renderable: {
      id: manifest.id,
      light: variants.light,
      dark: variants.dark,
      typography,
      layout: evaluation.effectiveLayout,
      requiredCapabilities: manifest.compat.requiredCapabilities,
      optionalCapabilities: manifest.compat.optionalCapabilities,
    },
  }
}

/** Render a fixture build with its adapter capability map + stock snapshot. */
export function renderFixture(
  manifest: LiveryManifest,
  options: BuildOptions = {},
): { readonly build: FixtureBuild; readonly css: ReturnType<typeof renderLiveryCss>; readonly cssText: string } {
  const build = buildFixture(manifest, options)
  const css = renderLiveryCss(build.renderable, build.evaluation.map, build.stock)
  return { build, css, cssText: styleTextFromFragments(css) }
}

/** Full CompiledLivery (css + cssHash + hash + audit) from a fixture manifest. */
export function compileFixture(
  manifest: LiveryManifest,
  options: BuildOptions = {},
): CompiledLivery {
  const build = buildFixture(manifest, options)
  const css = renderLiveryCss(build.renderable, build.evaluation.map, build.stock)
  const cssText = styleTextFromFragments(css)
  const audit: LiveryAuditReport = {
    contrast: [...build.light.contrast, ...build.dark.contrast],
    contrastFailures:
      summarizeContrast(build.light.contrast).failures + summarizeContrast(build.dark.contrast).failures,
    tokenCoverage: {
      covered: [...new Set([...Object.keys(build.light.tokens), ...Object.keys(build.dark.tokens)])].sort(),
      inherited: [],
      missing: [],
    },
    cssSafety: {
      important: 0,
      hashSelectors: 0,
      elementSelectors: [],
      remoteUrls: 0,
      unscopedTokens: 0,
      fixedZIndexes: [],
      pass: true,
    },
    degraded: build.evaluation.degraded,
  }
  const base: Omit<CompiledLivery, 'hash'> = {
    id: manifest.id,
    meta: manifest.meta,
    typography: build.typography,
    layout: build.evaluation.effectiveLayout,
    requiredCapabilities: manifest.compat.requiredCapabilities,
    optionalCapabilities: manifest.compat.optionalCapabilities,
    light: build.light,
    dark: build.dark,
    css,
    cssHash: hashCss(cssText),
    audit,
  }
  return { ...base, hash: hashLivery(base) }
}

/** Mock catalog carrying the adapter identity fields for catalog/render tests. */
export function catalogOf(
  liveries: readonly CompiledLivery[],
  options: BuildOptions = {},
): LiveryCatalog {
  const adapter = options.adapter ?? ADAPTER_020
  return {
    schemaVersion: 1,
    compilerVersion: '0.1.0',
    adapterId: adapter.adapterId,
    hostVersion: adapter.hostVersion,
    contractHash: adapter.contractHash,
    catalogProfile: adapter.catalogProfile,
    capabilities: options.capabilities ?? adapter.capabilities,
    previewsBase: `/livery/assets/previews/${adapter.catalogProfile}/`,
    liveries,
  }
}

/** True when `value` is a concrete colour CSS token value (no expressions). */
export function isConcreteColorValue(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.startsWith('#') || /^rgba?\(/i.test(trimmed)) return true
  if (trimmed.startsWith('linear-gradient(')) return true
  return false
}

/** Contrast roles present in the audit matrix (light and dark share them). */
export function contrastRoleSet(entries: readonly { readonly role: string }[]): ReadonlySet<string> {
  return new Set(entries.map((entry) => entry.role))
}

/** Audited entries for one fixture build (both modes), against its stock. */
export function auditFixture(build: FixtureBuild): {
  readonly light: ReturnType<typeof auditContrast>
  readonly dark: ReturnType<typeof auditContrast>
} {
  return {
    light: auditContrast(build.light, 'light', build.stock),
    dark: auditContrast(build.dark, 'dark', build.stock),
  }
}
