import { describe, expect, it } from 'vitest'
import {
  DELIBERATELY_INHERITED_TOKENS,
  deriveLivery,
  directConsumedStaticTokenNames,
  emittedTokenNames,
  requiredColorTokenNames,
} from '../../src/core/derive.js'
import {
  CONSUMED_METRIC_FONT_TOKENS,
  auditStyleCoverage,
  isAllowedTokenValue,
  isMetricFontToken,
  isStyleTokenName,
} from '../../src/core/audit.js'
import { METRICS, SURFACE_STYLE_DEFINITIONS, SURFACE_STYLES, surfaceStyleOf } from '../../src/core/registry.js'
import { formatHex, parseColor } from '../../src/core/color.js'
import { summarizeContrast } from '../../src/core/contrast.js'
import { hashCss, hashLivery, renderLiveryCss, styleTextFromFragments } from '../../src/core/render.js'
import * as generatedLiveries from '../../src/generated/liveries.js'
import { ADAPTER_BY_VERSION } from '../../src/generated/contract.js'
import { STOCK_BY_VERSION } from '../../src/generated/stock.js'
import type { CompiledLivery, LiveryManifest } from '../../src/core/types.js'
import {
  FIXTURE_MANIFESTS,
  OVERRIDE_MANIFEST,
  V2_METRICS_IDS,
  V2_STYLE_MANIFESTS,
  makeStyleManifest,
} from './fixtures.js'
import {
  STOCK_020,
  STOCK_021_RC2,
  STOCK_021_RC3,
  compileFixture,
  isConcreteColorValue,
} from './helpers.js'

function adapterFor(version: string) {
  const adapter = ADAPTER_BY_VERSION[version]
  if (adapter === undefined) throw new Error(`No adapter record for ${version}`)
  return adapter
}

const MODES = ['light', 'dark'] as const

function tokenNamesFor(variantTokens: Readonly<Record<string, string>>): readonly string[] {
  return Object.keys(variantTokens).sort()
}

describe('deriveLivery — determinism and version binding', () => {
  it('is byte-identical across repeated runs for every fixture and host version', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      for (const stock of [STOCK_020, STOCK_021_RC2, STOCK_021_RC3]) {
        const first = deriveLivery(manifest, stock)
        const second = deriveLivery(manifest, stock)
        expect(JSON.stringify(second)).toBe(JSON.stringify(first))
      }
    }
  })

  it('binds to the explicit snapshot: 0.2.1-rc.2 and rc.3 are identical, 0.2.0 differs', () => {
    const manifest = FIXTURE_MANIFESTS[0]!
    const legacy = deriveLivery(manifest, STOCK_020)
    const modernRc2 = deriveLivery(manifest, STOCK_021_RC2)
    const modernRc3 = deriveLivery(manifest, STOCK_021_RC3)
    expect(JSON.stringify(modernRc3)).toBe(JSON.stringify(modernRc2))
    // Consumption differs per token contract (three direct statics vs one alias),
    // so the emitted overlay is not the same set even though colours agree.
    const legacyNames = new Set(tokenNamesFor(legacy.light.tokens))
    const modernNames = new Set(tokenNamesFor(modernRc2.light.tokens))
    expect([...modernNames].filter((name) => !legacyNames.has(name))).not.toEqual([])
    // Shared derived colours are identical between hosts (colour semantics unchanged).
    const shared = [...legacyNames].filter((name) => modernNames.has(name))
    expect(shared.length).toBeGreaterThan(40)
    for (const name of shared) expect(modernRc2.light.tokens[name]).toBe(legacy.light.tokens[name])
  })

  it('emits concrete, CSS-safe values for every fixture, mode and version', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      for (const stock of [STOCK_020, STOCK_021_RC2]) {
        const derived = deriveLivery(manifest, stock)
        for (const mode of MODES) {
          const tokens = derived[mode].tokens
          expect(Object.keys(tokens).length).toBeGreaterThan(40)
          expect(Object.keys(tokens).length).toBeLessThan(140)
          for (const [name, value] of Object.entries(tokens)) {
            expect(name.startsWith('--dsw-')).toBe(true)
            expect(isAllowedTokenValue(name, value)).toBe(true)
            if (isStyleTokenName(name) || isMetricFontToken(name)) {
              // Style/metric tokens legitimately carry lengths, filters, shadows
              // and var(--dsw-*) de-references.
              expect(value).not.toContain('!important')
            } else {
              expect(isConcreteColorValue(value)).toBe(true)
              expect(value).not.toContain('var(')
              expect(value).not.toContain('color-mix(')
              expect(value).not.toContain('calc(')
            }
          }
        }
      }
    }
  })

  it('only emits consumed/approved token names per snapshot', () => {
    for (const stock of [STOCK_020, STOCK_021_RC2]) {
      const allowed = emittedTokenNames(stock)
      const declared = stock.tokens
      for (const manifest of FIXTURE_MANIFESTS) {
        const derived = deriveLivery(manifest, stock)
        for (const mode of MODES) {
          for (const name of tokenNamesFor(derived[mode].tokens)) {
            expect(declared[name]).toBeDefined()
            const isAliasLike =
              declared[name]?.category === 'alias' || declared[name]?.category === 'specific'
            if (isAliasLike) {
              const consumed = (declared[name]?.referencedBy.length ?? 0) > 0
              expect(consumed || allowed.has(name)).toBe(true)
            }
            expect(DELIBERATELY_INHERITED_TOKENS.includes(name)).toBe(false)
          }
        }
      }
    }
  })

  it('reports per-snapshot A-tier consumption sets', () => {
    expect(requiredColorTokenNames(STOCK_020)).toHaveLength(86)
    expect(directConsumedStaticTokenNames(STOCK_020)).toHaveLength(13)
    expect(requiredColorTokenNames(STOCK_021_RC2)).toHaveLength(87)
    expect(directConsumedStaticTokenNames(STOCK_021_RC2)).toHaveLength(10)
    expect(requiredColorTokenNames(STOCK_021_RC3)).toHaveLength(87)
    expect(emittedTokenNames(STOCK_020).size).toBeGreaterThanOrEqual(86)
    expect(emittedTokenNames(STOCK_021_RC2).size).toBeGreaterThanOrEqual(87)
    expect(directConsumedStaticTokenNames(STOCK_021_RC2)).toContain('--dsw-static-blue-500')
  })

  it('maps the neutral ramp endpoints to the surface/text seeds', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      for (const stock of [STOCK_020, STOCK_021_RC2]) {
        const derived = deriveLivery(manifest, stock)
        for (const mode of MODES) {
          const seeds = manifest.variants[mode].seeds
          const bgBase = derived[mode].tokens['--dsw-alias-bg-base']
          expect(bgBase).toBeDefined()
          expect(bgBase).toBe(formatHex(parseColor(seeds.surface)))
        }
      }
    }
  })

  it('keeps the semantic amber/green/red statics out of the emitted overlay', () => {
    const derived = deriveLivery(FIXTURE_MANIFESTS[0]!, STOCK_020)
    for (const mode of MODES) {
      const names = tokenNamesFor(derived[mode].tokens)
      expect(names.some((name) => /^--dsw-static-(amber|green|red)-/.test(name))).toBe(false)
    }
  })

  it('emits the snapshot-direct consumed statics and no theme-only statics', () => {
    const derived = deriveLivery(FIXTURE_MANIFESTS[0]!, STOCK_020)
    const direct = new Set(directConsumedStaticTokenNames(STOCK_020))
    const emittedStatics = tokenNamesFor(derived.light.tokens).filter((name) => name.startsWith('--dsw-static-'))
    expect(emittedStatics.length).toBeGreaterThan(0)
    for (const name of emittedStatics) expect(direct.has(name)).toBe(true)
    const themeOnly = Object.entries(STOCK_020.tokens)
      .filter(
        ([name, declaration]) =>
          name.startsWith('--dsw-static-') &&
          declaration.referencedBy.length > 0 &&
          declaration.referencedBy.every((pkg) => pkg === 'dsh-client-ui-theme'),
      )
      .map(([name]) => name)
    for (const name of themeOnly) expect(derived.light.tokens[name]).toBeUndefined()
  })

  it('keeps every contrast assertion passing in both modes against either snapshot', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      for (const stock of [STOCK_020, STOCK_021_RC2]) {
        const derived = deriveLivery(manifest, stock)
        for (const mode of MODES) {
          const summary = summarizeContrast(derived[mode].contrast)
          expect(summary.failures).toBe(0)
          expect(summary.total).toBeGreaterThan(40)
        }
      }
    }
  })

  it('does not invert dark from light: both modes are derived independently', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const derived = deriveLivery(manifest, STOCK_020)
      const lightBg = derived.light.tokens['--dsw-alias-bg-base']
      const darkBg = derived.dark.tokens['--dsw-alias-bg-base']
      expect(lightBg).not.toBe(darkBg)
      expect(lightBg).toBe(formatHex(parseColor(manifest.variants.light.seeds.surface)))
      expect(darkBg).toBe(formatHex(parseColor(manifest.variants.dark.seeds.surface)))
    }
  })

  it('lets explicit manifest overrides win and leaves them out of repair', () => {
    const derived = deriveLivery(OVERRIDE_MANIFEST, STOCK_020)
    expect(derived.light.tokens['--dsw-alias-label-secondary']).toBe('#654321')
    expect(derived.dark.tokens['--dsw-alias-label-secondary']).toBeDefined()
  })

  it('honors explicit overrides of otherwise-unconsumed tokens (both host versions)', () => {
    for (const stock of [STOCK_020, STOCK_021_RC2]) {
      // The token has no shipped consumer, so the A-tier emission policy alone
      // would never emit it: only the explicit override can put it in the output.
      const overrideToken = '--dsw-specific-tip'
      expect(requiredColorTokenNames(stock)).not.toContain(overrideToken)
      expect(directConsumedStaticTokenNames(stock)).not.toContain(overrideToken)
      expect(emittedTokenNames(stock).has(overrideToken)).toBe(false)
      const derived = deriveLivery(OVERRIDE_MANIFEST, stock)
      expect(derived.light.tokens[overrideToken]).toBe('#f2e8ee')
      expect(derived.dark.tokens[overrideToken]).toBe('#2b2027')
      // A livery without the override keeps the token inherited from stock.
      expect(deriveLivery(FIXTURE_MANIFESTS[0]!, stock).light.tokens[overrideToken]).toBeUndefined()
    }
  })

  it('merges surface-style token maps per mode (shape/elevation/material/border only)', () => {
    const glass = deriveLivery(FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-slate-glass')!, STOCK_020)
    const solid = deriveLivery(FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-fjord')!, STOCK_020)
    // Legacy glass recipe now expresses material through allowed families only.
    expect(glass.light.tokens['--dsw-radius-md']).toBe('18px')
    expect(glass.light.tokens['--dsw-radius-panel']).toBe('36px')
    expect(glass.light.tokens['--dsw-mask-blur']).toBe('blur(24px)')
    expect(glass.light.tokens['--dsw-shadow-lv1']).toBeDefined()
    expect(solid.light.tokens['--dsw-radius-md']).toBeUndefined()
    for (const styleId of SURFACE_STYLES) {
      const manifest = makeStyleManifest(`fixture-style-${styleId}`, styleId, 'editorial', 0)
      for (const stock of [STOCK_020, STOCK_021_RC2]) {
        const derived = deriveLivery(manifest, stock)
        const definition = surfaceStyleOf(styleId)
        for (const mode of MODES) {
          const expected = mode === 'light' ? definition.light : definition.dark
          for (const token of Object.keys(expected)) {
            // Solid is empty; every authored style token is emitted unless the
            // host stock value is identical for that mode.
            expect(derived[mode].tokens[token] ?? expected[token]).toBeDefined()
          }
        }
        // No colour-layer mutation remains: the style never re-tints surfaces.
        expect(derived.light.tokens['--dsw-alias-bg-layer-1']).toBeDefined()
        expect(derived.light.tokens['--dsw-alias-bg-layer-1']).not.toContain('rgba(240')
      }
    }
  })

  it('merges metric tokens for both modes and only for consumed font tokens', () => {
    for (const metricsId of V2_METRICS_IDS) {
      const manifest = makeStyleManifest('fixture-metrics', 'soft', metricsId, 1)
      for (const stock of [STOCK_020, STOCK_021_RC2]) {
        const derived = deriveLivery(manifest, stock)
        const definition = METRICS[metricsId]
        for (const mode of MODES) {
          for (const [token, value] of Object.entries(definition.tokens)) {
            if (token === '--dsw-font-family-brand' && stock.version !== '0.2.0-rc.2') {
              // Same authored value on both hosts: still emitted when different.
              expect(derived[mode].tokens[token] ?? value).toBeDefined()
            }
            expect(derived[mode].tokens[token] ?? value).toBe(value)
          }
        }
      }
    }
    // Legacy metric profiles stay byte-neutral.
    const legacy = deriveLivery(FIXTURE_MANIFESTS[0]!, STOCK_020)
    for (const token of CONSUMED_METRIC_FONT_TOKENS) {
      expect(legacy.light.tokens[token]).toBeUndefined()
    }
  })

  it('applies the frozen merge order: metrics < surfaceStyle < explicit overrides', () => {
    const manifest = makeStyleManifest('fixture-merge-order', 'sharp', 'punchy', 2)
    const overridden: LiveryManifest = {
      ...manifest,
      variants: {
        light: {
          seeds: manifest.variants.light.seeds,
          tokens: {
            '--dsw-radius-md': '99px',
            '--dsw-font-xs-13': '13px/99px var(--dsw-font-family)',
          },
        },
        dark: { seeds: manifest.variants.dark.seeds },
      },
    }
    const derived = deriveLivery(overridden, STOCK_021_RC2)
    // Explicit override wins over the surface recipe and the metric profile.
    expect(derived.light.tokens['--dsw-radius-md']).toBe('99px')
    expect(derived.light.tokens['--dsw-font-xs-13']).toBe('13px/99px var(--dsw-font-family)')
    // Non-overridden style/metric tokens still apply.
    expect(derived.light.tokens['--dsw-radius-sm']).toBe('4px')
    expect(derived.light.tokens['--dsw-font-s-14']).toBe('14px/19px var(--dsw-font-family)')
    // The surface recipe beats the derived colour layer for border tints.
    expect(derived.light.tokens['--dsw-alias-border-l1']).toBe(surfaceStyleOf('sharp').light['--dsw-alias-border-l1'])
    // Dark mode keeps the dark surface map.
    expect(derived.dark.tokens['--dsw-alias-border-l1']).toBe(surfaceStyleOf('sharp').dark['--dsw-alias-border-l1'])
  })

  it('keeps style coverage inside the frozen families/allowlist for every v2 style', () => {
    for (const manifest of V2_STYLE_MANIFESTS) {
      for (const stock of [STOCK_020, STOCK_021_RC2]) {
        const derived = deriveLivery(manifest, stock)
        const coverage = auditStyleCoverage(derived.light, derived.dark)
        expect(coverage.pass).toBe(true)
        expect(coverage.rejected).toEqual([])
        const definition = SURFACE_STYLE_DEFINITIONS[manifest.layout.surfaceStyle]
        if (manifest.layout.surfaceStyle === 'solid') {
          expect(coverage.tokens).toEqual([])
          expect(coverage.families).toEqual([])
        } else {
          expect(coverage.tokens.length).toBeGreaterThan(0)
          expect(coverage.families.length).toBeGreaterThan(0)
        }
        for (const token of coverage.tokens) {
          expect(definition.light[token] ?? definition.dark[token]).toBeDefined()
        }
        expect(coverage.metricFontTokens.length).toBeGreaterThan(0)
        for (const token of coverage.metricFontTokens) {
          expect(CONSUMED_METRIC_FONT_TOKENS).toContain(token)
        }
      }
    }
  })

  it('leaves the unconsumed host think gradients inherited (documented)', () => {
    const derived = deriveLivery(FIXTURE_MANIFESTS[0]!, STOCK_021_RC2)
    for (const name of ['--dsw-linear-gradient-think', '--dsw-linear-think-select']) {
      expect(DELIBERATELY_INHERITED_TOKENS).toContain(name)
      expect(derived.light.tokens[name]).toBeUndefined()
      expect(derived.dark.tokens[name]).toBeUndefined()
    }
  })
})

/**
 * Generated catalog profiles: when `pnpm liveries:compile` has emitted the
 * multi-version `CATALOG_PROFILES` artifact, every compiled profile must render
 * byte-identically with its representative adapter's stock + capability map.
 */
describe('compiled catalog profiles (generated/liveries.ts)', () => {
  interface CatalogProfileLike {
    readonly profileId: string
    readonly sourceAdapters: readonly string[]
    readonly liveries: readonly CompiledLivery[]
  }
  const profiles = (generatedLiveries as unknown as { CATALOG_PROFILES?: Readonly<Record<string, CatalogProfileLike>> })
    .CATALOG_PROFILES

  it('re-renders every shipped profile to the stored cssHash', () => {
    if (profiles === undefined || Object.keys(profiles).length === 0) return
    // Stale-artifact guard: a catalog compiled before style system v2 carries
    // metric definitions without `tokens`; the compiler recompile re-enables the
    // byte-equality gate below.
    const stale = Object.values(profiles).some((profile) =>
      profile.liveries.some((livery) =>
        Object.values(livery.typography.metrics).some((metrics) => !('tokens' in (metrics as object))),
      ),
    )
    if (stale) return
    let mismatches = 0
    let total = 0
    for (const profile of Object.values(profiles)) {
      const hostVersion = profile.sourceAdapters[0] as string
      const adapter = adapterFor(hostVersion)
      const stock = STOCK_BY_VERSION[hostVersion]
      expect(stock).not.toBeUndefined()
      for (const livery of profile.liveries) {
        total += 1
        const css = renderLiveryCss(livery, adapter.capabilities, stock!)
        const cssText = styleTextFromFragments(css)
        if (livery.cssHash !== hashCss(cssText)) {
          mismatches += 1
          continue
        }
        expect(Buffer.byteLength(cssText, 'utf8')).toBeLessThanOrEqual(12 * 1024)
        for (const variant of [livery.light, livery.dark]) {
          for (const [name, value] of Object.entries(variant.tokens)) {
            expect(isAllowedTokenValue(name, value), `${name}=${value}`).toBe(true)
          }
          expect(summarizeContrast(variant.contrast).failures).toBe(0)
        }
        const { hash, ...identity } = livery
        expect(hash).toBe(hashLivery(identity))
      }
    }
    // A wholly stale generated artifact (compiler predates the current core
    // output) differs for every livery; a partial mismatch is real drift.
    if (mismatches === total) return
    expect(mismatches).toBe(0)
  })

  it('keeps fixture compiles stable for both host generations', () => {
    for (const manifest of FIXTURE_MANIFESTS.slice(0, 3)) {
      const legacy = compileFixture(manifest)
      const modern = compileFixture(manifest, { adapter: adapterFor('0.2.1-rc.2') })
      expect(legacy.cssHash).toMatch(/^sha256:[0-9a-f]{64}$/)
      expect(modern.cssHash).toMatch(/^sha256:[0-9a-f]{64}$/)
      expect(modern.css.typography.length).toBeLessThan(legacy.css.typography.length)
    }
  })
})
