import { describe, expect, it } from 'vitest'
import {
  DELIBERATELY_INHERITED_TOKENS,
  MATERIAL_LAYER_TOKENS,
  deriveLivery,
  directConsumedStaticTokenNames,
  emittedTokenNames,
  requiredColorTokenNames,
} from '../../src/core/derive.js'
import { formatHex, parseColor, parseColorWithAlpha } from '../../src/core/color.js'
import { summarizeContrast } from '../../src/core/contrast.js'
import { hashCss, hashLivery, renderLiveryCss, styleTextFromFragments } from '../../src/core/render.js'
import * as generatedLiveries from '../../src/generated/liveries.js'
import { ADAPTER_BY_VERSION } from '../../src/generated/contract.js'
import { STOCK_BY_VERSION } from '../../src/generated/stock.js'
import type { CompiledLivery } from '../../src/core/types.js'
import { FIXTURE_MANIFESTS, OVERRIDE_MANIFEST } from './fixtures.js'
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
            expect(isConcreteColorValue(value)).toBe(true)
            expect(value).not.toContain('var(')
            expect(value).not.toContain('color-mix(')
            expect(value).not.toContain('calc(')
            expect(value).not.toContain('!important')
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

  it('applies the glass material as translucent tokens and soft as opaque shifts', () => {
    const glass = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-slate-glass')!
    const solid = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-fjord')!
    for (const manifest of [glass, solid]) {
      const derived = deriveLivery(manifest, STOCK_020)
      for (const name of MATERIAL_LAYER_TOKENS) {
        const value = derived.light.tokens[name]
        expect(value).toBeDefined()
        if (manifest.layout.surfaceStyle === 'glass') {
          expect(parseColorWithAlpha(value as string).alpha).toBeLessThan(1)
        } else {
          expect(parseColorWithAlpha(value as string).alpha).toBe(1)
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
    for (const profile of Object.values(profiles)) {
      const hostVersion = profile.sourceAdapters[0] as string
      const adapter = adapterFor(hostVersion)
      const stock = STOCK_BY_VERSION[hostVersion]
      expect(stock).not.toBeUndefined()
      for (const livery of profile.liveries) {
        const css = renderLiveryCss(livery, adapter.capabilities, stock!)
        const cssText = styleTextFromFragments(css)
        expect(livery.cssHash).toBe(hashCss(cssText))
        expect(Buffer.byteLength(cssText, 'utf8')).toBeLessThanOrEqual(12 * 1024)
        for (const variant of [livery.light, livery.dark]) {
          for (const value of Object.values(variant.tokens)) expect(isConcreteColorValue(value)).toBe(true)
          expect(summarizeContrast(variant.contrast).failures).toBe(0)
        }
        const { hash, ...identity } = livery
        expect(hash).toBe(hashLivery(identity))
      }
    }
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
