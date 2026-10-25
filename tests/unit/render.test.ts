import { describe, expect, it } from 'vitest'
import {
  computeLiveryCssHash,
  hashCss,
  hashLivery,
  renderBootCss,
  renderLiveryCss,
  renderStyleText,
  sha256Hex,
  styleTextFromFragments,
  typographyDeclarations,
} from '../../src/core/render.js'
import { CAP } from '../../src/core/types.js'
import type { CapabilityMap } from '../../src/core/types.js'
import { FIXTURE_MANIFESTS, OVERRIDE_MANIFEST, V2_STYLE_MANIFESTS, makeManifest } from './fixtures.js'
import {
  ADAPTER_020,
  ADAPTER_021_RC2,
  STOCK_020,
  STOCK_021_RC2,
  buildFixture,
  catalogOf,
  compileFixture,
} from './helpers.js'

const FJORD = FIXTURE_MANIFESTS[0]!

function liveryOf(manifestIndex = 0): ReturnType<typeof compileFixture> {
  return compileFixture(FIXTURE_MANIFESTS[manifestIndex]!)
}

/** Capability map with a synthetic availability override for one capability. */
function capsWith(overrides: Readonly<Record<string, boolean>>, base: CapabilityMap = ADAPTER_020.capabilities): CapabilityMap {
  const result: Record<string, (typeof base)[string]> = {}
  for (const [id, fact] of Object.entries(base)) {
    const override = overrides[id]
    result[id] = override === undefined ? fact : { ...fact, available: override }
  }
  return result
}

const SELECTOR_PATTERN = /([^{};]+)\{/g

function selectorsOf(css: string): string[] {
  const selectors: string[] = []
  SELECTOR_PATTERN.lastIndex = 0
  let match = SELECTOR_PATTERN.exec(css)
  while (match !== null) {
    selectors.push((match[1] as string).trim())
    match = SELECTOR_PATTERN.exec(css)
  }
  return selectors
}

function expectScoped(css: string): void {
  for (const selector of selectorsOf(css)) {
    const allowed =
      selector.startsWith('@media ') ||
      selector.startsWith('@supports ') ||
      /^body\[data-dsh-livery="[^"]*"\]$/.test(selector) ||
      /^body\[data-dsh-livery="[^"]*"\]\[data-ds-dark-theme\]$/.test(selector) ||
      /^:root:lang\((?:zh|en)\) body\[data-dsh-livery="[^"]*"\]$/.test(selector)
    expect(allowed, `unexpected selector: ${selector}`).toBe(true)
  }
}

describe('renderLiveryCss — contract shape (both host generations)', () => {
  it('starts with the exact light token block then the dark block', () => {
    for (const options of [{}, { adapter: ADAPTER_021_RC2 }]) {
      const livery = compileFixture(FJORD, options)
      const tokens = livery.css.tokens
      const lightSelector = `body[data-dsh-livery="${FJORD.id}"]`
      const darkSelector = `${lightSelector}[data-ds-dark-theme]`
      expect(tokens.startsWith(`${lightSelector}{`)).toBe(true)
      expect(tokens).toContain(`${darkSelector}{`)
      expect(tokens.indexOf(lightSelector)).toBeLessThan(tokens.indexOf(darkSelector))
      expect(tokens).toContain('--dsw-alias-bg-base:')
      expect(tokens).toMatch(new RegExp(`^body\\[data-dsh-livery="${FJORD.id}"\\]\\{--dsw-`))
    }
  })

  it('minifies the shipped bytes by default and pretty mode is audit-only', () => {
    const build = buildFixture(FJORD)
    const compact = renderLiveryCss(build.renderable, build.evaluation.map, build.stock)
    const pretty = renderLiveryCss(build.renderable, build.evaluation.map, build.stock, { pretty: true })
    expect(compact.tokens).not.toMatch(/--dsw-[a-z0-9-]+: /)
    expect(compact.tokens).not.toMatch(/rgba\(\d+, /)
    expect(compact.tokens).not.toMatch(/#[0-9a-f]*[A-F]/)
    expect(pretty.tokens.length).toBeGreaterThan(compact.tokens.length)
    expect(compact).toEqual(renderLiveryCss(build.renderable, build.evaluation.map, build.stock))
    expect(pretty).toEqual(renderLiveryCss(build.renderable, build.evaluation.map, build.stock, { pretty: true }))
  })

  it('is safe for <style> embedding', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      for (const options of [{}, { adapter: ADAPTER_021_RC2 }]) {
        const livery = compileFixture(manifest, options)
        const text = styleTextFromFragments(livery.css)
        expect(text).not.toContain('</style')
        expect(text.toLowerCase()).not.toContain('</style')
        expect(text).not.toContain('!important')
        expect(text).not.toContain('http://')
        expect(text).not.toContain('https://')
        expect(text).not.toContain('url(')
        expect(text).not.toContain('@import')
        expect(text).not.toContain('@font-face')
        expect(text).not.toMatch(/\._[A-Za-z0-9-]+_[A-Za-z0-9]{4,}/)
      }
    }
  })

  it('scopes every selector to body[data-dsh-livery] or :root:lang()', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      for (const options of [{}, { adapter: ADAPTER_021_RC2 }]) {
        const livery = compileFixture(manifest, options)
        expectScoped(livery.css.tokens)
        expectScoped(livery.css.typography)
        expectScoped(livery.css.layout)
      }
    }
  })

  it('emits the deterministic compat layer statement in the layout fragment', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      for (const options of [{}, { adapter: ADAPTER_021_RC2 }]) {
        expect(compileFixture(manifest, options).css.layout).toBe('@layer dsh-livery.compat;')
      }
    }
  })

  it('escapes ids in selectors and neutralises a style-closing sequence', () => {
    const build = buildFixture(FJORD)
    const quoted = renderLiveryCss({ ...build.renderable, id: 'a"b' }, build.evaluation.map, build.stock)
    expect(quoted.tokens).toContain('body[data-dsh-livery="a\\"b"]')
    const hostile = renderLiveryCss(
      { ...build.renderable, light: { ...build.light, tokens: { '--dsw-alias-bg-base': '</style>' } } },
      build.evaluation.map,
      build.stock,
    )
    expect(hostile.tokens).not.toContain('</style')
    expect(hostile.tokens).toContain('<\\/style>')
  })
})

describe('typography strategy — capability-driven, never version-string driven', () => {
  it('legacy hosts (0.2.0-rc.2): overrides --dsw-font-family and de-references composites', () => {
    const livery = liveryOf()
    const typography = livery.css.typography
    expect(typography).toContain(`:root:lang(zh) body[data-dsh-livery="${FJORD.id}"]{`)
    expect(typography).toContain(`:root:lang(en) body[data-dsh-livery="${FJORD.id}"]{`)
    expect(typography).toContain('--dsw-font-family:"PingFang SC",')
    expect(typography).toContain('--dsw-font-family-brand:"Montserrat",var(--dsw-font-family)')
    expect(typography).toContain('--dsw-font-markdown-code-font-family:"SFMono-Regular",Consolas')
    expect(typography).toContain('var(--dsw-font-markdown-code-font-family)')
    expect(typography).not.toContain('--dsh-font-family-text')
    expect(typography).not.toContain('--dsh-font-family-code')
    expect(typography.match(/:root:lang\(/g)?.length).toBe(2)
  })

  it('hook hosts (0.2.1+): bind ONLY the documented role hooks, never the composite ladder', () => {
    const livery = compileFixture(FJORD, { adapter: ADAPTER_021_RC2 })
    const typography = livery.css.typography
    expect(typography).toContain(`:root:lang(zh) body[data-dsh-livery="${FJORD.id}"]{`)
    expect(typography).toContain(`:root:lang(en) body[data-dsh-livery="${FJORD.id}"]{`)
    expect(typography.match(/:root:lang\(/g)?.length).toBe(2)
    // Exactly the two documented hooks per locale, nothing else.
    expect(typography.match(/--dsh-font-family-text:/g)?.length).toBe(2)
    expect(typography.match(/--dsh-font-family-code:/g)?.length).toBe(2)
    expect(typography).toContain('--dsh-font-family-text:"PingFang SC",')
    expect(typography).toContain('--dsh-font-family-code:"SFMono-Regular",Consolas')
    expect(typography).not.toContain('--dsw-font-')
    expect(typography).not.toContain('var(--dsw-font-family)')
    expect(typography).not.toContain('--dsw-font-markdown-code-font-family')
  })

  it('hook strategy is chosen by capability facts, not by a version string', () => {
    const build = buildFixture(FJORD, { adapter: ADAPTER_020 })
    const legacyCaps = ADAPTER_020.capabilities
    const syntheticHookCaps = capsWith({ [CAP.hostFontRoleHooks]: true }, legacyCaps)
    const legacy = renderLiveryCss(build.renderable, legacyCaps, STOCK_020)
    const synthetic = renderLiveryCss(build.renderable, syntheticHookCaps, STOCK_020)
    expect(legacy.typography).toContain('--dsw-font-family:')
    expect(synthetic.typography).toContain('--dsh-font-family-text:')
    // A 0.2.1 capability map against the 0.2.0 stock snapshot still selects hooks.
    const mixed = renderLiveryCss(build.renderable, ADAPTER_021_RC2.capabilities, STOCK_020)
    expect(mixed.typography).toBe(synthetic.typography)
  })

  it('hook typography is much smaller than the legacy ladder binding', () => {
    const legacy = compileFixture(FJORD, { adapter: ADAPTER_020 })
    const modern = compileFixture(FJORD, { adapter: ADAPTER_021_RC2 })
    expect(modern.css.typography.length).toBeLessThan(legacy.css.typography.length * 0.6)
    expect(modern.css.typography.length).toBeLessThan(700)
  })

  it('falls back to a concrete content stack only when content differs from UI (legacy hosts)', () => {
    const mixed = makeManifest(
      'fixture-mixed-font',
      { accent: '#445588', secondary: '#88aacc', surface: '#f5f7fa', text: '#101828' },
      { accent: '#88aacc', secondary: '#6688aa', surface: '#12161c', text: '#eef3f8' },
      { uiZh: 'system-cjk', contentZh: 'system-latin', uiEn: 'system-latin', contentEn: 'system-latin' },
    )
    const livery = compileFixture(mixed)
    expect(livery.css.typography).toContain('--dsw-font-markdown-base:')
    expect(livery.css.typography).toContain('system-ui,-apple-system,BlinkMacSystemFont')
    const declarations = typographyDeclarations(livery.typography, 'zh-CN', ADAPTER_020.capabilities, STOCK_020)
    expect(declarations[0]?.[0]).toBe('--dsw-font-family')
    expect(declarations.map(([name]) => name)).toContain('--dsw-font-markdown-base')
    // On hook hosts the single text hook takes the UI stack (no content fork).
    const modern = typographyDeclarations(livery.typography, 'zh-CN', ADAPTER_021_RC2.capabilities, STOCK_021_RC2)
    expect(modern.map(([name]) => name)).toEqual(['--dsh-font-family-text', '--dsh-font-family-code'])
  })
})

describe('renderStyleText / hashing / boot', () => {
  it('is the exact concatenation of the three fragments per version', () => {
    for (const options of [{}, { adapter: ADAPTER_021_RC2 }]) {
      const build = buildFixture(FJORD, options)
      const livery = compileFixture(FJORD, options)
      const css = renderLiveryCss(build.renderable, build.evaluation.map, build.stock)
      const text = styleTextFromFragments(css)
      expect(text).toBe(`${css.tokens}${css.typography}${css.layout}`)
      expect(renderStyleText(livery, build.evaluation.map, build.stock)).toBe(text)
      expect(livery.cssHash).toBe(hashCss(text))
      expect(livery.cssHash).toBe(computeLiveryCssHash(livery.css))
      const { hash, ...base } = livery
      expect(hash).toBe(hashLivery(base))
    }
  })

  it('computes the standard SHA-256 test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256Hex('The quick brown fox jumps over the lazy dog')).toBe(
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
    )
    expect(hashCss('abc')).toBe(`sha256:${sha256Hex('abc')}`)
  })

  it('renderBootCss returns byte-equal css + hash and nothing for stock/unknown', () => {
    for (const options of [{}, { adapter: ADAPTER_021_RC2 }]) {
      const adapter = options.adapter ?? ADAPTER_020
      const stock = options.adapter === undefined ? STOCK_020 : STOCK_021_RC2
      const livery = compileFixture(FJORD, options)
      const catalog = catalogOf([livery], options)
      const boot = renderBootCss(catalog, livery.id, stock)
      expect(boot).toEqual({ css: styleTextFromFragments(livery.css), hash: livery.cssHash })
      expect(boot.hash).toBe(hashCss(boot.css))
      expect(renderBootCss(catalog, 'stock', stock)).toEqual({ css: '', hash: '' })
      expect(renderBootCss(catalog, 'does-not-exist', stock)).toEqual({ css: '', hash: '' })
      expect(adapter.hostVersion.length).toBeGreaterThan(0)
    }
  })

  it('changing id, layout, copy or css changes the catalog identity hash', () => {
    const livery = liveryOf()
    const base: Omit<typeof livery, 'hash'> = {
      id: livery.id,
      meta: livery.meta,
      typography: livery.typography,
      layout: livery.layout,
      requiredCapabilities: livery.requiredCapabilities,
      optionalCapabilities: livery.optionalCapabilities,
      light: livery.light,
      dark: livery.dark,
      css: livery.css,
      cssHash: livery.cssHash,
      audit: livery.audit,
    }
    expect(hashLivery({ ...base, id: 'other' })).not.toBe(hashLivery(base))
    expect(hashLivery({ ...base, layout: { ...base.layout, density: 'compact' } })).not.toBe(hashLivery(base))
    expect(hashLivery({ ...base, css: { ...base.css, tokens: `${base.css.tokens} ` } })).not.toBe(hashLivery(base))
  })
})

describe('explicit manifest token overrides', () => {
  it('serializes an override of an otherwise-unconsumed token into the emitted CSS', () => {
    for (const options of [{}, { adapter: ADAPTER_021_RC2 }]) {
      const livery = compileFixture(OVERRIDE_MANIFEST, options)
      expect(livery.light.tokens['--dsw-specific-tip']).toBe('#f2e8ee')
      expect(livery.dark.tokens['--dsw-specific-tip']).toBe('#2b2027')
      expect(livery.css.tokens).toContain('--dsw-specific-tip:#f2e8ee')
      expect(livery.css.tokens).toContain('--dsw-specific-tip:#2b2027')
      // Without an override the unconsumed token is not emitted at all.
      expect(compileFixture(FJORD, options).css.tokens).not.toContain('--dsw-specific-tip')
    }
  })
})

describe('CSS size budget (§18.8: hard cap 12KiB)', () => {
  it('keeps every shipped livery under the cap on both host generations', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      for (const options of [{}, { adapter: ADAPTER_021_RC2 }]) {
        const livery = compileFixture(manifest, options)
        const bytes = Buffer.byteLength(styleTextFromFragments(livery.css), 'utf8')
        const tokenBytes = Buffer.byteLength(livery.css.tokens, 'utf8')
        const typographyBytes = Buffer.byteLength(livery.css.typography, 'utf8')
        expect(bytes).toBeLessThanOrEqual(12 * 1024)
        expect(tokenBytes).toBeLessThanOrEqual(10 * 1024)
        expect(typographyBytes).toBeLessThanOrEqual(1600)
        expect(livery.css.layout).toBe('@layer dsh-livery.compat;')
      }
    }
  })

  it('keeps the worst-case style system v2 recipe inside the 12KiB budget', () => {
    let worst = { id: '', version: '', bytes: 0 }
    for (const manifest of V2_STYLE_MANIFESTS) {
      for (const options of [{}, { adapter: ADAPTER_021_RC2 }]) {
        const livery = compileFixture(manifest, options)
        const bytes = Buffer.byteLength(styleTextFromFragments(livery.css), 'utf8')
        expect(bytes).toBeLessThanOrEqual(12 * 1024)
        // Style tokens are actually serialized on both host generations (the
        // `solid` recipe is intentionally empty).
        if (manifest.layout.surfaceStyle !== 'solid') {
          const familyTokens = Object.keys(livery.light.tokens).filter((token) => token.startsWith('--dsw-radius-'))
          expect(familyTokens.length).toBeGreaterThan(0)
          expect(livery.css.tokens).toMatch(/--dsw-radius-(?:xs|sm|md|lg|xl|panel):/)
          expect(livery.css.tokens).toMatch(/--dsw-(?:shadow-lv1|elevation-panel):/)
        }
        if (bytes > worst.bytes) worst = { id: livery.id, version: options.adapter?.hostVersion ?? '0.2.0-rc.2', bytes }
      }
    }
    expect(worst.bytes).toBeLessThanOrEqual(12 * 1024)
  })

  it('the 0.2.1 hook strategy shrinks the per-livery CSS', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const legacy = compileFixture(manifest, { adapter: ADAPTER_020 })
      const modern = compileFixture(manifest, { adapter: ADAPTER_021_RC2 })
      const legacyBytes = Buffer.byteLength(styleTextFromFragments(legacy.css), 'utf8')
      const modernBytes = Buffer.byteLength(styleTextFromFragments(modern.css), 'utf8')
      expect(modernBytes).toBeLessThan(legacyBytes)
      expect(modern.css.typography.length).toBeLessThan(legacy.css.typography.length)
      expect(modern.css.tokens).not.toBe(legacy.css.tokens)
    }
  })
})
