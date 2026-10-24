/**
 * Unit-test helpers: build compiled liveries from fixture manifests without the
 * compiler (the compiler owns `src/compiler/**`; these helpers exercise the
 * same core pipeline the compiler uses).
 */

import type {
  CapabilityMap,
  CompiledLivery,
  LiveryAuditReport,
  LiveryManifest,
  ResolvedTypography,
  CompiledVariant,
} from '../../src/core/types.js'
import { HOST_CAPABILITIES } from '../../src/generated/contract.js'
import { evaluateCapabilities, type CapabilityEvaluation } from '../../src/core/capabilities.js'
import { deriveLivery } from '../../src/core/derive.js'
import { resolveTypography } from '../../src/core/registry.js'
import { renderLiveryCss, hashCss, hashLivery, styleTextFromFragments, type RenderableLivery } from '../../src/core/render.js'
import { auditContrast, summarizeContrast } from '../../src/core/contrast.js'

export interface FixtureBuild {
  readonly manifest: LiveryManifest
  readonly renderable: RenderableLivery
  readonly light: CompiledVariant
  readonly dark: CompiledVariant
  readonly typography: ResolvedTypography
  readonly evaluation: CapabilityEvaluation
}

/** Run derive + typography resolution + capability evaluation for one manifest. */
export function buildFixture(
  manifest: LiveryManifest,
  capabilities: CapabilityMap = HOST_CAPABILITIES,
): FixtureBuild {
  const typography = resolveTypography(manifest)
  const evaluation = evaluateCapabilities(capabilities, manifest)
  const effectiveManifest: LiveryManifest = { ...manifest, layout: evaluation.effectiveLayout }
  const variants = deriveLivery(effectiveManifest)
  return {
    manifest,
    typography,
    evaluation,
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

/** Full CompiledLivery (css + cssHash + hash + audit) from a fixture manifest. */
export function compileFixture(manifest: LiveryManifest, capabilities: CapabilityMap = HOST_CAPABILITIES): CompiledLivery {
  const build = buildFixture(manifest, capabilities)
  const css = renderLiveryCss(build.renderable, build.evaluation.map)
  const cssText = styleTextFromFragments(css)
  const audit: LiveryAuditReport = {
    contrast: [...build.light.contrast, ...build.dark.contrast],
    contrastFailures: summarizeContrast(build.light.contrast).failures + summarizeContrast(build.dark.contrast).failures,
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

/** Concatenated mock catalog for catalog/render tests. */
export function catalogOf(liveries: readonly CompiledLivery[]): {
  readonly schemaVersion: 1
  readonly compilerVersion: '0.1.0'
  readonly adapterId: 'dsh-0.2.0-rc.2-r1'
  readonly hostVersion: '0.2.0-rc.2'
  readonly contractHash: string
  readonly capabilities: CapabilityMap
  readonly liveries: readonly CompiledLivery[]
} {
  return {
    schemaVersion: 1,
    compilerVersion: '0.1.0',
    adapterId: 'dsh-0.2.0-rc.2-r1',
    hostVersion: '0.2.0-rc.2',
    contractHash: 'sha256:test',
    capabilities: HOST_CAPABILITIES,
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

/** Audited entries for one fixture build (both modes). */
export function auditFixture(build: FixtureBuild): {
  readonly light: ReturnType<typeof auditContrast>
  readonly dark: ReturnType<typeof auditContrast>
} {
  return {
    light: auditContrast(build.light, 'light'),
    dark: auditContrast(build.dark, 'dark'),
  }
}
