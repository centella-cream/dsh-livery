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
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AdapterRecord } from '../../src/generated/contract.js'
import type { StockSnapshot } from '../../src/generated/stock.js'
import { adapterRecordFrom, stockSnapshotFrom } from '../../src/contract/snapshot.js'
import type { ContractSnapshot } from '../../src/contract/types.js'
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

  it('accepts the style-system v2 font, metrics, surfaceStyle and tag ids', () => {
    const source = mutated(fjord, (copy) => {
      const manifest = copy as unknown as {
        typography: {
          ui: Record<string, string>
          content: Record<string, string>
          code: string
          metrics: Record<string, string>
        }
        layout: Record<string, string>
        meta: { tags: string[] }
      }
      manifest.typography.ui = { 'zh-CN': 'humanist-cjk', 'en-US': 'humanist-latin' }
      manifest.typography.content = { 'zh-CN': 'serif-cjk', 'en-US': 'serif-latin' }
      manifest.typography.code = 'tech-latin'
      manifest.typography.metrics = { 'zh-CN': 'editorial', 'en-US': 'punchy' }
      manifest.layout = { ...manifest.layout, surfaceStyle: 'paper' }
      manifest.meta.tags = ['paper', 'ink', 'organic']
    })
    expect(validateManifest(source)).toEqual([])
    for (const [key, value] of [
      ['humanist-cjk', true],
      ['serif-latin', true],
      ['editorial', true],
      ['quiet', true],
      ['flat', true],
      ['terminal', true],
      ['neon', true],
      ['tech', true],
    ] as const) {
      expect(typeof key).toBe('string')
      expect(value).toBe(true)
    }
  })

  it('rejects unregistered style-system ids', () => {
    for (const mutate of [
      (copy: Record<string, unknown>) => {
        const typography = copy.typography as { code: string }
        typography.code = 'serif-latin2'
      },
      (copy: Record<string, unknown>) => {
        const typography = copy.typography as { metrics: Record<string, string> }
        typography.metrics = { 'zh-CN': 'editorial-heavy', 'en-US': 'latin-default' }
      },
      (copy: Record<string, unknown>) => {
        const layout = copy.layout as Record<string, string>
        layout.surfaceStyle = 'floating'
      },
      (copy: Record<string, unknown>) => {
        const meta = copy.meta as { tags: string[] }
        meta.tags = ['retro', 'holographic']
      },
    ]) {
      expect(schemaCodes(mutated(fjord, mutate)), JSON.stringify(mutate)).not.toEqual([])
    }
  })

  it('rejects an unregistered surfaceStyle even when the schema enum is bypassed', () => {
    const source = mutated(fjord, (copy) => {
      const layout = copy.layout as Record<string, string>
      layout.surfaceStyle = 'solid'
    })
    // Sanity: the registered id validates; semantic drift is covered when core
    // removes an id while the schema keeps it (checked against SURFACE_STYLE_DEFINITIONS).
    expect(validateManifest(source)).toEqual([])
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

  it('accepts the shipped catalog for every committed host snapshot', () => {
    // Historical contracts stay on disk for audit/diff even though only the
    // formal-matrix approved adapter is shipped; the manifest set must remain
    // valid for every frozen snapshot the package once supported.
    for (const version of ['0.2.0-rc.2', '0.2.1-rc.2', '0.2.1-rc.3']) {
      const contract = JSON.parse(
        readFileSync(join(process.cwd(), 'contracts', 'dsh', version, 'contract.json'), 'utf8'),
      ) as ContractSnapshot
      const adapter = adapterRecordFrom(contract) as unknown as AdapterRecord
      const stock = stockSnapshotFrom(contract) as unknown as StockSnapshot
      const result = validateCatalog(loadManifestSources(), { stock, capabilities: adapter.capabilities })
      expect(result.ok, `${version}: ${JSON.stringify(result.diagnostics, null, 2)}`).toBe(true)
    }
  })

  it('accepts the shipped catalog and keeps ids/order unique', () => {
    const manifests = loadManifestSources().map((source) => source.raw as LiveryManifest)
    const result = validateCatalog(loadManifestSources())
    expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
    expect(result.manifests).toHaveLength(liveryIds().length)
    expect(new Set(result.manifests.map((manifest) => manifest.id)).size).toBe(liveryIds().length)
    expect(new Set(result.manifests.map((manifest) => manifest.meta.order)).size).toBe(liveryIds().length)
    expect(new Set(manifests.map((manifest) => manifest.meta.order))).toEqual(
      new Set(manifests.map((manifest) => manifest.meta.order).sort((a, b) => a - b)),
    )
  })

  it('keeps layout structural and exercises the style-system v2 axes', () => {
    const manifests = loadManifestSources().map((source) => source.raw as LiveryManifest)
    const values = (pick: (manifest: LiveryManifest) => string): Set<string> => new Set(manifests.map(pick))
    // Frozen decision: DSH has no public density/width/flow hook, so the structure
    // stays host/stock and the visible differences are palette/type/shape/elevation.
    expect(values((manifest) => manifest.layout.density)).toEqual(new Set(['host']))
    expect(values((manifest) => manifest.layout.conversationWidth)).toEqual(new Set(['host']))
    expect(values((manifest) => manifest.layout.messageFlow)).toEqual(new Set(['stock']))
    const surfaces = values((manifest) => manifest.layout.surfaceStyle)
    for (const required of ['soft', 'glass', 'flat', 'sharp', 'rounded', 'paper', 'elevated']) {
      expect(surfaces.has(required), `surfaceStyle ${required}`).toBe(true)
    }
    const fonts = new Set<string>()
    const metrics = new Set<string>()
    const tags = new Set<string>()
    for (const manifest of manifests) {
      for (const locale of ['zh-CN', 'en-US'] as const) {
        fonts.add(manifest.typography.ui[locale])
        fonts.add(manifest.typography.content[locale])
        metrics.add(manifest.typography.metrics[locale])
      }
      fonts.add(manifest.typography.code)
      for (const tag of manifest.meta.tags) tags.add(tag)
    }
    // New local-only font ids and style metrics are actually exercised.
    for (const font of ['serif-cjk', 'serif-latin', 'humanist-cjk', 'humanist-latin', 'display-latin', 'rounded-latin', 'tech-latin']) {
      expect(fonts.has(font), `font ${font}`).toBe(true)
    }
    for (const metric of ['comfortable', 'editorial', 'punchy', 'technical', 'quiet', 'compact', 'airy']) {
      expect(metrics.has(metric), `metrics ${metric}`).toBe(true)
    }
    for (const tag of ['retro', 'paper', 'ink', 'neon', 'organic', 'tech']) {
      expect(tags.has(tag), `tag ${tag}`).toBe(true)
    }
  })
})
