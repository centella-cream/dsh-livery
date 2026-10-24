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
import { HOST_CAPABILITIES } from '../../src/generated/contract.js'
import type { LiveryCss } from '../../src/core/types.js'
import { FIXTURE_MANIFESTS, makeManifest } from './fixtures.js'
import { buildFixture, catalogOf, compileFixture } from './helpers.js'

const FJORD = FIXTURE_MANIFESTS[0]!

function liveryOf(manifestIndex = 0): ReturnType<typeof compileFixture> {
  return compileFixture(FIXTURE_MANIFESTS[manifestIndex]!)
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

describe('renderLiveryCss — contract shape', () => {
  it('starts with the exact light token block then the dark block', () => {
    const livery = liveryOf()
    const tokens = livery.css.tokens
    const lightSelector = `body[data-dsh-livery="${FJORD.id}"]`
    const darkSelector = `${lightSelector}[data-ds-dark-theme]`
    expect(tokens.startsWith(`${lightSelector}{`)).toBe(true)
    expect(tokens).toContain(`${darkSelector}{`)
    expect(tokens.indexOf(lightSelector)).toBeLessThan(tokens.indexOf(darkSelector))
    expect(tokens).toContain('--dsw-alias-bg-base:')
    expect(tokens).toMatch(new RegExp(`^body\\[data-dsh-livery="${FJORD.id}"\\]\\{--dsw-`))
  })

  it('minifies the shipped bytes by default and pretty mode is audit-only', () => {
    const build = buildFixture(FJORD)
    const compact = renderLiveryCss(build.renderable, build.evaluation.map)
    const pretty = renderLiveryCss(build.renderable, build.evaluation.map, { pretty: true })
    // no space after a token colon in compact declarations
    expect(compact.tokens).not.toMatch(/--dsw-[a-z0-9-]+: /)
    expect(compact.tokens).not.toMatch(/rgba\(\d+, /)
    expect(compact.tokens).not.toMatch(/#[0-9a-f]*[A-F]/)
    expect(pretty.tokens.length).toBeGreaterThan(compact.tokens.length)
    expect(compact).toEqual(renderLiveryCss(build.renderable, build.evaluation.map))
    expect(pretty).toEqual(renderLiveryCss(build.renderable, build.evaluation.map, { pretty: true }))
  })

  it('is safe for <style> embedding', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const livery = compileFixture(manifest)
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
  })

  it('scopes every selector to body[data-dsh-livery] or :root:lang()', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const livery = compileFixture(manifest)
      expectScoped(livery.css.tokens)
      expectScoped(livery.css.typography)
      expectScoped(livery.css.layout)
    }
  })

  it('emits the deterministic compat layer statement in the layout fragment', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const livery = compileFixture(manifest)
      expect(livery.css.layout).toBe('@layer dsh-livery.compat;')
    }
  })

  it('escapes ids in selectors and neutralises a style-closing sequence', () => {
    const build = buildFixture(FJORD)
    const quoted = renderLiveryCss({ ...build.renderable, id: 'a"b' }, build.evaluation.map)
    expect(quoted.tokens).toContain('body[data-dsh-livery="a\\"b"]')
    const hostile = renderLiveryCss(
      { ...build.renderable, light: { ...build.light, tokens: { '--dsw-alias-bg-base': '</style>' } } },
      build.evaluation.map,
    )
    expect(hostile.tokens).not.toContain('</style')
    expect(hostile.tokens).toContain('<\\/style>')
  })
})

describe('renderLiveryCss — typography', () => {
  it('binds font families per locale without repeating the ladder stacks', () => {
    const livery = liveryOf()
    const typography = livery.css.typography
    expect(typography).toContain(`:root:lang(zh) body[data-dsh-livery="${FJORD.id}"]{`)
    expect(typography).toContain(`:root:lang(en) body[data-dsh-livery="${FJORD.id}"]{`)
    expect(typography).toContain('--dsw-font-family:"PingFang SC",')
    expect(typography).toContain('--dsw-font-family-brand:"Montserrat",var(--dsw-font-family)')
    expect(typography).toContain('--dsw-font-markdown-code-font-family:"SFMono-Regular",Consolas')
    expect(typography).toContain('var(--dsw-font-markdown-code-font-family)')
    // The host Markdown/UI ladder is body-scoped with var(--dsw-font-family), so
    // no redundant re-declaration is emitted when content == UI font.
    expect(typography).not.toContain('--dsw-font-markdown-base:')
    expect(typography).not.toContain('--dsw-font-xs-13:')
    expect(typography.match(/:root:lang\(/g)?.length).toBe(2)
  })

  it('falls back to a concrete content stack only when content differs from UI', () => {
    const mixed = makeManifest(
      'fixture-mixed-font',
      { accent: '#445588', secondary: '#88aacc', surface: '#f5f7fa', text: '#101828' },
      { accent: '#88aacc', secondary: '#6688aa', surface: '#12161c', text: '#eef3f8' },
      { uiZh: 'system-cjk', contentZh: 'system-latin', uiEn: 'system-latin', contentEn: 'system-latin' },
    )
    const livery = compileFixture(mixed)
    expect(livery.css.typography).toContain('--dsw-font-markdown-base:')
    expect(livery.css.typography).toContain('system-ui,-apple-system,BlinkMacSystemFont')
    // per-locale ordering is deterministic
    const declarations = typographyDeclarations(livery.typography, 'zh-CN')
    expect(declarations[0]?.[0]).toBe('--dsw-font-family')
    expect(declarations.map(([name]) => name)).toContain('--dsw-font-markdown-base')
  })
})

describe('renderStyleText / hashing / boot', () => {
  it('is the exact concatenation of the three fragments', () => {
    const livery = liveryOf()
    expect(livery.cssHash).toBe(hashCss(styleTextFromFragments(livery.css)))
    expect(livery.cssHash).toBe(computeLiveryCssHash(livery.css))
    expect(renderStyleText(livery, HOST_CAPABILITIES)).toBe(styleTextFromFragments(livery.css))
    const { hash, ...base } = livery
    expect(hash).toBe(hashLivery(base))
    expect(hashCss('abc')).toBe(`sha256:${sha256Hex('abc')}`)
  })

  it('computes the standard SHA-256 test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256Hex('The quick brown fox jumps over the lazy dog')).toBe(
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
    )
  })

  it('renderBootCss returns byte-equal css + hash and nothing for stock/unknown', () => {
    const livery = liveryOf()
    const catalog = catalogOf([livery])
    const boot = renderBootCss(catalog, livery.id)
    expect(boot).toEqual({ css: styleTextFromFragments(livery.css), hash: livery.cssHash })
    expect(boot.hash).toBe(hashCss(boot.css))
    expect(renderBootCss(catalog, 'stock')).toEqual({ css: '', hash: '' })
    expect(renderBootCss(catalog, 'does-not-exist')).toEqual({ css: '', hash: '' })
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
    const renamed: Omit<typeof livery, 'hash'> = { ...base, id: 'other' }
    const reflowed: Omit<typeof livery, 'hash'> = { ...base, layout: { ...base.layout, density: 'compact' } }
    const different: LiveryCss = { ...base.css, tokens: `${base.css.tokens} ` }
    expect(hashLivery(renamed)).not.toBe(hashLivery(base))
    expect(hashLivery(reflowed)).not.toBe(hashLivery(base))
    expect(hashLivery({ ...base, css: different })).not.toBe(hashLivery(base))
  })
})

describe('CSS size budget (§18.8: hard cap 12KiB)', () => {
  it('keeps every shipped livery under the cap', () => {
    for (const manifest of FIXTURE_MANIFESTS) {
      const livery = compileFixture(manifest)
      const bytes = Buffer.byteLength(styleTextFromFragments(livery.css), 'utf8')
      const tokenBytes = Buffer.byteLength(livery.css.tokens, 'utf8')
      const typographyBytes = Buffer.byteLength(livery.css.typography, 'utf8')
      expect(bytes).toBeLessThanOrEqual(12 * 1024)
      expect(tokenBytes).toBeLessThanOrEqual(9 * 1024)
      expect(typographyBytes).toBeLessThanOrEqual(1600)
      expect(livery.css.layout).toBe('@layer dsh-livery.compat;')
    }
  })
})
