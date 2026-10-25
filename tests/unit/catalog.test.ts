import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  catalogProfileOf,
  findLivery,
  isKnownSkinId,
  liveryCssHash,
  normalizeSkinId,
  previewsBaseOf,
  renderBootCssFromCatalog,
  resolveActiveLivery,
  resolveSkinForBoot,
  styleTextOf,
} from '../../src/core/catalog.js'
import { hashCss, renderStyleText } from '../../src/core/render.js'
import { STOCK_ID } from '../../src/core/types.js'
import { FIXTURE_MANIFESTS } from './fixtures.js'
import { ADAPTER_020, ADAPTER_021_RC2, STOCK_020, catalogOf, compileFixture } from './helpers.js'

const FIRST = compileFixture(FIXTURE_MANIFESTS[0]!)
const SECOND = compileFixture(FIXTURE_MANIFESTS[1]!)
const CATALOG = catalogOf([FIRST, SECOND])
const CATALOG_021 = catalogOf([compileFixture(FIXTURE_MANIFESTS[0]!, { adapter: ADAPTER_021_RC2 })], {
  adapter: ADAPTER_021_RC2,
})

describe('catalog lookup', () => {
  it('finds compiled liveries by id', () => {
    expect(findLivery(CATALOG, FIRST.id)).toBe(FIRST)
    expect(findLivery(CATALOG, SECOND.id)).toBe(SECOND)
    expect(findLivery(CATALOG, 'missing')).toBeUndefined()
    expect(findLivery(CATALOG, STOCK_ID)).toBeUndefined()
    expect(findLivery([FIRST, SECOND], FIRST.id)).toBe(FIRST)
  })

  it('treats stock as a known skin id', () => {
    expect(isKnownSkinId(CATALOG, STOCK_ID)).toBe(true)
    expect(isKnownSkinId(CATALOG, FIRST.id)).toBe(true)
    expect(isKnownSkinId(CATALOG, 'nope')).toBe(false)
    expect(isKnownSkinId([FIRST], 'nope')).toBe(false)
  })

  it('resolves the active livery with a normalised id', () => {
    expect(resolveActiveLivery(CATALOG, FIRST.id)).toEqual({ livery: FIRST, normalizedId: FIRST.id })
    expect(resolveActiveLivery(CATALOG, 'deleted-livery')).toEqual({ normalizedId: STOCK_ID })
    expect(resolveActiveLivery(CATALOG, STOCK_ID)).toEqual({ normalizedId: STOCK_ID })
    expect(normalizeSkinId(CATALOG, FIRST.id)).toBe(FIRST.id)
    expect(normalizeSkinId(CATALOG, 'deleted-livery')).toBe(STOCK_ID)
    expect(normalizeSkinId(CATALOG, STOCK_ID)).toBe(STOCK_ID)
  })

  it('resolves compiled boot bytes for a real skin and nothing for stock/unknown', () => {
    expect(resolveSkinForBoot(CATALOG, FIRST.id)).toEqual({
      livery: FIRST,
      css: styleTextOf(FIRST),
      hash: FIRST.cssHash,
    })
    expect(resolveSkinForBoot(CATALOG, STOCK_ID)).toEqual({ css: '', hash: '' })
    expect(resolveSkinForBoot(CATALOG, 'deleted')).toEqual({ css: '', hash: '' })
  })

  it('exposes the catalog profile identity and preview base', () => {
    expect(catalogProfileOf(CATALOG)).toBe(ADAPTER_020.catalogProfile)
    expect(previewsBaseOf(CATALOG)).toBe(`/livery/assets/previews/${ADAPTER_020.catalogProfile}/`)
    expect(catalogProfileOf(CATALOG_021)).toBe(ADAPTER_021_RC2.catalogProfile)
  })
})

describe('runtime stylesheet bytes', () => {
  it('styleTextOf is the exact fragment concatenation', () => {
    expect(styleTextOf(FIRST)).toBe(`${FIRST.css.tokens}${FIRST.css.typography}${FIRST.css.layout}`)
    expect(styleTextOf(FIRST)).toBe(renderStyleText(FIRST, CATALOG.capabilities, STOCK_020))
  })

  it('liveryCssHash is the compiled cssHash', () => {
    expect(liveryCssHash(FIRST)).toBe(FIRST.cssHash)
    expect(liveryCssHash(FIRST)).toBe(hashCss(styleTextOf(FIRST)))
  })

  it('renderBootCssFromCatalog serves compiled bytes without rendering', () => {
    const boot = renderBootCssFromCatalog(CATALOG, FIRST.id)
    expect(boot).toEqual({ css: styleTextOf(FIRST), hash: FIRST.cssHash })
    expect(boot.hash).toBe(hashCss(boot.css))
    // even with an empty capability map the runtime must not re-render
    const cold = { ...CATALOG, capabilities: {} }
    expect(renderBootCssFromCatalog(cold, FIRST.id)).toEqual(boot)
  })

  it('returns empty boot for stock, unknown, empty and missing ids', () => {
    expect(renderBootCssFromCatalog(CATALOG, STOCK_ID)).toEqual({ css: '', hash: '' })
    expect(renderBootCssFromCatalog(CATALOG, '')).toEqual({ css: '', hash: '' })
    expect(renderBootCssFromCatalog(CATALOG, 'deleted')).toEqual({ css: '', hash: '' })
    expect(renderBootCssFromCatalog({ ...CATALOG, liveries: [] }, FIRST.id)).toEqual({ css: '', hash: '' })
  })
})

describe('runtime import graph', () => {
  it('catalog.ts imports only types (no stock/derive/render/generated data)', () => {
    const source = readFileSync(new URL('../../src/core/catalog.ts', import.meta.url), 'utf8')
    const importSpecifiers = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
    expect(importSpecifiers.length).toBeGreaterThan(0)
    for (const specifier of importSpecifiers) expect(specifier).toBe('./types.js')
    expect(source).not.toMatch(/import[^;]*from\s+['"][^'"]*generated\//)
    expect(source).not.toMatch(/import[^;]*from\s+['"]\.\/(?:derive|render|contrast|capabilities|registry)\.js/)
  })

  it('compiled catalog values are concrete (no runtime resolution needed)', () => {
    for (const livery of [FIRST, SECOND]) {
      expect(livery.cssHash).toMatch(/^sha256:[0-9a-f]{64}$/)
      expect(livery.css.tokens.length).toBeGreaterThan(0)
      expect(livery.css.typography.length).toBeGreaterThan(0)
      expect(livery.css.layout).toBe('@layer dsh-livery.compat;')
    }
  })
})
