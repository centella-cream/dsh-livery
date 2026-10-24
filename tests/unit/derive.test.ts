import { describe, expect, it } from 'vitest'
import {
  DELIBERATELY_INHERITED_TOKENS,
  DIRECT_CONSUMED_STATIC_TOKEN_NAMES,
  EMITTED_TOKEN_NAMES,
  GRADIENT_TOKEN_NAMES,
  MATERIAL_LAYER_TOKENS,
  REQUIRED_COLOR_TOKEN_NAMES,
  deriveLivery,
} from '../../src/core/derive.js'
import { formatHex, parseColor, parseColorWithAlpha } from '../../src/core/color.js'
import { summarizeContrast } from '../../src/core/contrast.js'
import { STOCK_TOKENS } from '../../src/generated/stock.js'
import { LIVERIES } from '../../src/generated/liveries.js'
import { hashCss, hashLivery, styleTextFromFragments } from '../../src/core/render.js'
import { FIXTURE_MANIFESTS, OVERRIDE_MANIFEST } from './fixtures.js'
import { isConcreteColorValue } from './helpers.js'

const MODES = ['light', 'dark'] as const

function tokenNamesFor(variantTokens: Readonly<Record<string, string>>): readonly string[] {
  return Object.keys(variantTokens).sort()
}

describe('deriveLivery — determinism and coverage', () => {
  it('is byte-identical across repeated runs for every fixture', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const first = deriveLivery(manifest)
      const second = deriveLivery(manifest)
      expect(JSON.stringify(second)).toBe(JSON.stringify(first))
    }
  })

  it('emits concrete, CSS-safe values for every fixture and mode', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const derived = deriveLivery(manifest)
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
  })

  it('only emits consumed/approved token names', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const derived = deriveLivery(manifest)
      for (const mode of MODES) {
        for (const name of tokenNamesFor(derived[mode].tokens)) {
          const declaration = STOCK_TOKENS[name]
          expect(declaration).toBeDefined()
          const isAliasLike = declaration?.category === 'alias' || declaration?.category === 'specific'
          if (isAliasLike) {
            const consumed = (declaration?.referencedBy.length ?? 0) > 0
            expect(consumed || EMITTED_TOKEN_NAMES.has(name)).toBe(true)
          }
          expect(DELIBERATELY_INHERITED_TOKENS.includes(name)).toBe(false)
        }
      }
    }
  })

  it('maps the neutral ramp endpoints to the surface/text seeds', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const derived = deriveLivery(manifest)
      for (const mode of MODES) {
        const seeds = manifest.variants[mode].seeds
        const bgBase = derived[mode].tokens['--dsw-alias-bg-base']
        expect(bgBase).toBeDefined()
        // Light bg-base uses bluish-00 (surface pole); dark uses bluish-950.
        expect(bgBase).toBe(formatHex(parseColor(seeds.surface)))
      }
    }
  })

  it('keeps the semantic amber/green/red statics out of the emitted overlay', () => {
    const derived = deriveLivery(FIXTURE_MANIFESTS[0]!)
    for (const mode of MODES) {
      const names = tokenNamesFor(derived[mode].tokens)
      expect(names.some((name) => /^--dsw-static-(amber|green|red)-/.test(name))).toBe(false)
    }
  })

  it('emits the directly consumed static steps and no theme-only statics', () => {
    const derived = deriveLivery(FIXTURE_MANIFESTS[0]!)
    const emittedStatics = tokenNamesFor(derived.light.tokens).filter((name) => name.startsWith('--dsw-static-'))
    expect(emittedStatics.length).toBeGreaterThan(0)
    for (const name of emittedStatics) {
      expect(DIRECT_CONSUMED_STATIC_TOKEN_NAMES).toContain(name)
    }
    const themeOnly = Object.entries(STOCK_TOKENS)
      .filter(
        ([name, declaration]) =>
          name.startsWith('--dsw-static-') &&
          declaration.referencedBy.length > 0 &&
          declaration.referencedBy.every((pkg) => pkg === 'dsh-client-ui-theme'),
      )
      .map(([name]) => name)
    for (const name of themeOnly) expect(derived.light.tokens[name]).toBeUndefined()
  })

  it('keeps every contrast assertion passing in both modes', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const derived = deriveLivery(manifest)
      for (const mode of MODES) {
        const summary = summarizeContrast(derived[mode].contrast)
        expect(summary.failures).toBe(0)
        expect(summary.total).toBeGreaterThan(40)
      }
    }
  })

  it('does not invert dark from light: both modes are derived independently', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const derived = deriveLivery(manifest)
      const lightBg = derived.light.tokens['--dsw-alias-bg-base']
      const darkBg = derived.dark.tokens['--dsw-alias-bg-base']
      expect(lightBg).not.toBe(darkBg)
      expect(lightBg).toBe(formatHex(parseColor(manifest.variants.light.seeds.surface)))
      expect(darkBg).toBe(formatHex(parseColor(manifest.variants.dark.seeds.surface)))
    }
  })

  it('lets explicit manifest overrides win and leaves them out of repair', () => {
    const derived = deriveLivery(OVERRIDE_MANIFEST)
    expect(derived.light.tokens['--dsw-alias-label-secondary']).toBe('#654321')
    expect(derived.dark.tokens['--dsw-alias-label-secondary']).toBeDefined()
    expect(derived.light.tokens['--dsw-alias-label-secondary']).not.toBe(
      deriveLivery(FIXTURE_MANIFESTS[0]!).light.tokens['--dsw-alias-label-secondary'],
    )
  })

  it('applies the glass material as translucent tokens and soft as opaque shifts', () => {
    const glass = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-slate-glass')
    const solid = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-fjord')
    expect(glass).toBeDefined()
    expect(solid).toBeDefined()
    for (const manifest of [glass!, solid!]) {
      const derived = deriveLivery(manifest)
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

  it('re-stops the host think gradients on the neutral ramp', () => {
    const manifest = FIXTURE_MANIFESTS[0]!
    const derived = deriveLivery(manifest)
    const surface = formatHex(parseColor(manifest.variants.light.seeds.surface))
    const think = derived.light.tokens['--dsw-linear-gradient-think']
    expect(think).toBeDefined()
    expect(think?.startsWith('linear-gradient(')).toBe(true)
    expect(think?.includes(surface)).toBe(true)
    const select = derived.light.tokens['--dsw-linear-think-select']
    expect(select).toBeDefined()
    expect(select?.startsWith('linear-gradient(')).toBe(true)
    // think-select starts from the bluish-60 step, not the page surface.
    expect(select).not.toContain('#fff')
    for (const name of GRADIENT_TOKEN_NAMES) expect(derived.light.tokens[name]).toBeDefined()
  })

  it('exposes the frozen emission sets used by the compiler audit', () => {
    expect(REQUIRED_COLOR_TOKEN_NAMES.length).toBeGreaterThan(80)
    expect(DIRECT_CONSUMED_STATIC_TOKEN_NAMES).toEqual([
      '--dsw-static-blue-400',
      '--dsw-static-blue-450',
      '--dsw-static-blue-500',
      '--dsw-static-blue-600',
      '--dsw-static-neutral-00',
      '--dsw-static-neutral-100',
      '--dsw-static-neutral-200',
      '--dsw-static-neutral-400',
      '--dsw-static-neutral-50',
      '--dsw-static-neutral-700',
      '--dsw-static-neutral-800',
      '--dsw-static-neutral-850',
      '--dsw-static-neutral-bluish-400',
    ])
    expect(EMITTED_TOKEN_NAMES.size).toBeGreaterThanOrEqual(REQUIRED_COLOR_TOKEN_NAMES.length)
  })
})

describe('compiled catalog (generated/liveries.ts)', () => {
  it('all shipped liveries keep concrete tokens, passing contrast and budget', () => {
    if (LIVERIES.length === 0) return
    for (const livery of LIVERIES) {
      for (const variant of [livery.light, livery.dark]) {
        for (const value of Object.values(variant.tokens)) {
          expect(isConcreteColorValue(value)).toBe(true)
        }
        expect(summarizeContrast(variant.contrast).failures).toBe(0)
      }
      const cssText = styleTextFromFragments(livery.css)
      expect(Buffer.byteLength(cssText, 'utf8')).toBeLessThanOrEqual(12288)
      expect(livery.cssHash).toBe(hashCss(cssText))
      const { hash, ...base } = livery
      expect(hash).toBe(hashLivery(base))
    }
  })
})
