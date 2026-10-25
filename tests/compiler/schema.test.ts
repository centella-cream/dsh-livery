/**
 * Strict manifest schema + semantic validation tests.
 *
 * The schema is the public contract for built-in and imported liveries: unknown
 * keys, unregistered registry ids, remote resources and CSS strings must all be
 * rejected here, before anything is derived or emitted.
 */
import { describe, expect, it } from 'vitest'
import type { LiveryManifest } from '../../src/core/types.js'
import {
  defaultStockSnapshot,
  getManifestValidator,
  tokenWhitelist,
  validateCatalog,
  validateManifest,
  type ManifestSource,
} from '../../src/compiler/validate.js'
import { ADAPTERS } from '../../src/generated/contract.js'
import { stockForVersion } from '../../src/generated/stock.js'
import { cloneManifest, liveryIds, loadManifestSources, readManifest } from './helpers.js'

const FJORD_FILE = 'liveries/fjord/manifest.json'

function sourceFor(id: string): ManifestSource {
  return { file: `liveries/${id}/manifest.json`, raw: readManifest(id) }
}

function mutated(manifest: LiveryManifest, mutate: (copy: Record<string, unknown>) => void): ManifestSource {
  const copy = cloneManifest(manifest)
  mutate(copy)
  return { file: FJORD_FILE, raw: copy }
}

function schemaCodes(source: ManifestSource): string[] {
  const validator = getManifestValidator()
  const valid = validator(source.raw)
  return valid ? [] : (validator.errors ?? []).map((error) => error.keyword)
}

describe('livery manifest JSON Schema', () => {
  const fjord = readManifest('fjord')

  it('compiles the schema in strict draft 2020-12 mode', () => {
    expect(() => getManifestValidator()).not.toThrow()
  })

  it('accepts all 10 shipped manifests', () => {
    for (const id of liveryIds()) {
      const source = sourceFor(id)
      expect(validateManifest(source), `${id} should validate`).toEqual([])
      expect(getManifestValidator()(source.raw), `${id} should pass the raw schema`).toBe(true)
    }
  })

  it('rejects unknown top-level fields (no wallpaper / css / fonts)', () => {
    expect(schemaCodes(mutated(fjord, (copy) => (copy.wallpaper = { file: 'x.webp' })))).toContain('additionalProperties')
    expect(schemaCodes(mutated(fjord, (copy) => (copy.css = 'body { color: red }')))).toContain('additionalProperties')
    expect(schemaCodes(mutated(fjord, (copy) => (copy.fonts = ['Inter'])))).toContain('additionalProperties')
  })

  it('rejects an id outside the stable id pattern', () => {
    for (const id of ['Fjord', 'fjord_', 'fjord ', 'a', '1fjord', 'fjord--x'.padEnd(40, 'x')]) {
      expect(schemaCodes(mutated(fjord, (copy) => (copy.id = id))), `id ${JSON.stringify(id)}`).not.toEqual([])
    }
  })

  it('requires both full locales and non-empty native text', () => {
    expect(schemaCodes(mutated(fjord, (copy) => (copy.meta = { ...fjord.meta, name: { 'zh-CN': '峡湾' } })))).toContain('required')
    expect(schemaCodes(mutated(fjord, (copy) => (copy.meta = { ...fjord.meta, name: { 'zh-CN': '   ', 'en-US': 'Fjord' } })))).toContain('pattern')
    expect(schemaCodes(mutated(fjord, (copy) => (copy.meta = { ...fjord.meta, description: { 'zh-CN': '', 'en-US': 'x' } })))).toContain('minLength')
  })

  it('rejects unknown tag ids', () => {
    expect(schemaCodes(mutated(fjord, (copy) => (copy.meta = { ...fjord.meta, tags: ['calm', 'zen'] })))).toContain('enum')
  })

  it('rejects unregistered font and metrics ids', () => {
    expect(
      schemaCodes(mutated(fjord, (copy) => (copy.typography = { ...fjord.typography, code: 'Inter' }))),
    ).toContain('enum')
    expect(
      schemaCodes(
        mutated(fjord, (copy) => (copy.typography = { ...fjord.typography, metrics: { 'zh-CN': 'huge', 'en-US': 'latin-default' } })),
      ),
    ).toContain('enum')
  })

  it('rejects layout recipes outside the registered enums', () => {
    expect(schemaCodes(mutated(fjord, (copy) => (copy.layout = { ...fjord.layout, density: 'ultra-dense' })))).toContain('enum')
    expect(
      schemaCodes(mutated(fjord, (copy) => (copy.layout = { ...fjord.layout, surfaceStyle: 'blurred' }))),
    ).toContain('enum')
  })

  it('rejects remote URLs and font faces anywhere in a manifest', () => {
    expect(
      schemaCodes(
        mutated(fjord, (copy) => {
          const variants = copy.variants as { light: { tokens: Record<string, string> } }
          variants.light.tokens = { '--dsw-alias-bg-base': 'url(https://cdn.example.com/bg.png)' }
        }),
      ),
    ).toContain('pattern')
    expect(
      schemaCodes(
        mutated(fjord, (copy) => {
          const variants = copy.variants as { light: { tokens: Record<string, string> } }
          variants.light.tokens = { '--dsw-alias-bg-base': '@font-face { font-family: x }' }
        }),
      ),
    ).toContain('pattern')
  })

  it('rejects malformed or unsupported seed colours', () => {
    for (const accent of ['blue', '#12345', '#1234567', 'rgb(1 2 3)', '#GGGGGG']) {
      const source = mutated(fjord, (copy) => {
        const variants = copy.variants as { light: { seeds: Record<string, string> } }
        variants.light.seeds = { ...variants.light.seeds, accent }
      })
      expect(schemaCodes(source), `seed ${accent}`).not.toEqual([])
    }
  })

  it('rejects unknown capabilities and capability over-declaration', () => {
    expect(
      schemaCodes(
        mutated(fjord, (copy) => (copy.compat = { requiredCapabilities: ['theme-css', 'magic'], optionalCapabilities: [] })),
      ),
    ).toContain('enum')
    expect(
      schemaCodes(
        mutated(fjord, (copy) => (copy.compat = { requiredCapabilities: ['theme-css', 'theme-css'], optionalCapabilities: [] })),
      ),
    ).toContain('uniqueItems')
  })
})

describe('semantic manifest validation', () => {
  const fjord = readManifest('fjord')

  it('rejects duplicate ids across the catalog', () => {
    const duplicate: ManifestSource = {
      file: 'liveries/fjord/manifest.json',
      raw: { ...structuredClone(fjord), id: 'fjord' },
    }
    const result = validateCatalog([sourceFor('fjord'), duplicate])
    expect(result.ok).toBe(false)
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('id.duplicate')
  })

  it('rejects duplicate order values across the catalog', () => {
    const duplicateOrder: ManifestSource = {
      file: 'liveries/fjord-two/manifest.json',
      raw: { ...structuredClone(fjord), id: 'fjord-two' },
    }
    const result = validateCatalog([sourceFor('fjord'), duplicateOrder, sourceFor('plum')])
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('order.duplicate')
  })

  it('rejects an id that disagrees with its directory', () => {
    const mismatched: ManifestSource = { file: 'liveries/fjord/manifest.json', raw: { ...structuredClone(fjord), id: 'fjord-x' } }
    expect(validateManifest(mismatched).map((diagnostic) => diagnostic.code)).toContain('id.directory-mismatch')
  })

  it('rejects token overrides that are not host-declared alias/specific tokens', () => {
    const source = mutated(fjord, (copy) => {
      const variants = copy.variants as { light: { tokens: Record<string, string> } }
      variants.light.tokens = { '--dsw-alias-not-a-host-token': '#ffffff' }
    })
    const diagnostics = validateManifest(source)
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain('token.not-whitelisted')
    // The schema accepts the *shape*; only the semantic layer knows the host token inventory.
    const whitelist = tokenWhitelist(defaultStockSnapshot())
    expect(whitelist.has('--dsw-alias-bg-base')).toBe(true)
    expect(whitelist.has('--dsw-alias-not-a-host-token')).toBe(false)
    expect(whitelist.has('--dsw-static-neutral-bluish-00')).toBe(false)
  })

  it('rejects unsafe token values even when the raw schema pattern is bypassed', () => {
    const source = mutated(fjord, (copy) => {
      const variants = copy.variants as { light: { tokens: Record<string, string> } }
      variants.light.tokens = { '--dsw-alias-bg-base': 'red; background: url(https://x/y.png)' }
    })
    expect(validateManifest(source).map((diagnostic) => diagnostic.code)).toContain('schema.pattern')
  })

  it('rejects required capabilities the certified host cannot provide', () => {
    const source = mutated(fjord, (copy) => {
      copy.compat = { requiredCapabilities: ['theme-css', 'host-font-family', 'host-density-tokens'], optionalCapabilities: [] }
    })
    const diagnostics = validateManifest(source)
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain('capability.required-unavailable')
  })

  it('rejects a capability declared both required and optional', () => {
    const source = mutated(fjord, (copy) => {
      copy.compat = {
        requiredCapabilities: ['theme-css', 'host-font-family'],
        optionalCapabilities: ['host-font-family'],
      }
    })
    expect(validateManifest(source).map((diagnostic) => diagnostic.code)).toContain('capability.overlap')
  })

  it('accepts the shipped catalog for every certified host version', () => {
    for (const version of ['0.2.0-rc.2', '0.2.1-rc.2', '0.2.1-rc.3']) {
      const adapter = ADAPTERS.find((candidate) => candidate.hostVersion === version)
      const stock = stockForVersion(version)
      if (adapter === undefined || stock === undefined) throw new Error(`fixture missing for ${version}`)
      const result = validateCatalog(loadManifestSources(), { stock, capabilities: adapter.capabilities })
      expect(result.ok, `${version}: ${JSON.stringify(result.diagnostics, null, 2)}`).toBe(true)
    }
  })

  it('accepts the shipped catalog and keeps ids/order unique', () => {
    const result = validateCatalog(loadManifestSources())
    expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
    expect(result.manifests).toHaveLength(10)
    expect(new Set(result.manifests.map((manifest) => manifest.id)).size).toBe(10)
    expect(new Set(result.manifests.map((manifest) => manifest.meta.order)).size).toBe(10)
  })

  it('exercises every layout recipe value across the built-in set', () => {
    const manifests = loadManifestSources().map((source) => source.raw as LiveryManifest)
    const values = (pick: (manifest: LiveryManifest) => string): Set<string> => new Set(manifests.map(pick))
    expect(values((manifest) => manifest.layout.density)).toEqual(new Set(['host', 'compact', 'comfortable']))
    expect(values((manifest) => manifest.layout.conversationWidth)).toEqual(new Set(['host', 'focused', 'wide']))
    expect(values((manifest) => manifest.layout.messageFlow)).toEqual(new Set(['stock', 'separated']))
    expect(values((manifest) => manifest.layout.surfaceStyle)).toEqual(new Set(['solid', 'soft', 'glass']))
  })
})
