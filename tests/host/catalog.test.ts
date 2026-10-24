/**
 * Catalog and preview-binding tests: the served document has the frozen shape,
 * and the preview whitelist is derived only from safe flat filenames.
 */

import { describe, expect, it } from 'vitest'
import {
  bindPreviews,
  buildCatalog,
  collectPreviewFiles,
  liveryIdsOf,
  parsePreviewsIndex,
  serializeCatalog,
} from '../../src/host/catalog.js'
import {
  BODY_ATTRIBUTE,
  CATALOG_ROUTE,
  DSH_VERSION,
  ENTRY_ID,
  LIVERY_VERSION,
  SCHEMA_VERSION,
  type LiveryCatalog,
} from '../../src/core/types.js'
import { CONTRACT_FACTS, HOST_CAPABILITIES } from '../../src/generated/contract.js'
import { makeCatalogMeta, makeLivery } from './fixtures.js'

/** Assert one parsed JSON value is the frozen catalog shape. */
function expectCatalogShape(value: unknown): asserts value is LiveryCatalog {
  expect(value).toBeTypeOf('object')
  expect(value).not.toBeNull()
  const catalog = value as Record<string, unknown>
  expect(catalog.schemaVersion).toBe(SCHEMA_VERSION)
  expect(catalog.compilerVersion).toBe(LIVERY_VERSION)
  expect(catalog.adapterId).toBe(CONTRACT_FACTS.adapterId)
  expect(catalog.hostVersion).toBe(DSH_VERSION)
  expect(catalog.contractHash).toBe(CONTRACT_FACTS.contractHash)
  expect(catalog.capabilities).toBeTypeOf('object')
  expect(Array.isArray(catalog.liveries)).toBe(true)
  for (const livery of catalog.liveries as Array<Record<string, unknown>>) {
    expect(typeof livery.id).toBe('string')
    expect(typeof livery.hash).toBe('string')
    expect(livery.light).toBeTypeOf('object')
    expect(livery.dark).toBeTypeOf('object')
    expect(livery.meta).toBeTypeOf('object')
    expect(livery.layout).toBeTypeOf('object')
  }
}

describe('buildCatalog', () => {
  it('assembles the frozen catalog fields from generated inputs', () => {
    const catalog = buildCatalog({
      liveries: [makeLivery()],
      catalogMeta: makeCatalogMeta(),
      capabilities: HOST_CAPABILITIES,
      contractFacts: CONTRACT_FACTS,
    })
    expect(catalog.schemaVersion).toBe(SCHEMA_VERSION)
    expect(catalog.compilerVersion).toBe(LIVERY_VERSION)
    expect(catalog.adapterId).toBe(CONTRACT_FACTS.adapterId)
    expect(catalog.hostVersion).toBe(DSH_VERSION)
    expect(catalog.contractHash).toBe(CONTRACT_FACTS.contractHash)
    expect(catalog.capabilities).toBe(HOST_CAPABILITIES)
    expect(catalog.liveries).toHaveLength(1)
    expect(catalog.liveries[0]?.id).toBe('ivory-slate')
  })

  it('serializes to JSON that parses back into the catalog shape', () => {
    const catalog = buildCatalog({ liveries: [makeLivery()], catalogMeta: makeCatalogMeta() })
    const parsed: unknown = JSON.parse(serializeCatalog(catalog))
    expectCatalogShape(parsed)
    expect((parsed as LiveryCatalog).liveries).toHaveLength(1)
  })

  it('is pure: equal inputs give equal catalogues', () => {
    const inputs = { liveries: [makeLivery()], catalogMeta: makeCatalogMeta() }
    expect(buildCatalog(inputs)).toEqual(buildCatalog(inputs))
  })

  it('survives an empty catalog (placeholder build) without throwing', () => {
    const catalog = buildCatalog({ liveries: [], catalogMeta: makeCatalogMeta() })
    expect(catalog.liveries).toEqual([])
    expect(() => serializeCatalog(catalog)).not.toThrow()
  })

  it('derives the known-id set for normalization', () => {
    const ids = liveryIdsOf([makeLivery(), makeLivery({ id: 'ocean-mist' })])
    expect(ids.has('ivory-slate')).toBe(true)
    expect(ids.has('ocean-mist')).toBe(true)
    expect(ids.has('deleted')).toBe(false)
  })
})

describe('collectPreviewFiles', () => {
  it('accepts a plain array of filenames', () => {
    expect(collectPreviewFiles(['b-zh-light.svg', 'a-en-dark.svg']))
      .toEqual(['a-en-dark.svg', 'b-zh-light.svg'])
  })

  it('accepts a files array and de-duplicates/sorts', () => {
    expect(collectPreviewFiles({ files: ['b.svg', 'a.svg', 'a.svg'] })).toEqual(['a.svg', 'b.svg'])
  })

  it('accepts object keys and mapping values', () => {
    expect(collectPreviewFiles({ 'a-zh-light.svg': { hash: 'x' }, id: 'b-en-dark.svg' }))
      .toEqual(['a-zh-light.svg', 'b-en-dark.svg'])
  })

  it('accepts nested generated metadata', () => {
    const parsed = {
      generatedAt: '2026-01-01',
      previews: [{ name: 'a.svg', bytes: 12 }, { name: 'nested/b.svg' }],
    }
    expect(collectPreviewFiles(parsed)).toEqual(['a.svg'])
  })

  it('ignores traversal, absolute paths, separators and non-svg names', () => {
    const parsed = [
      '../secret.svg',
      '/etc/passwd.svg',
      'a/b.svg',
      'a\\b.svg',
      '.svg',
      '..svg',
      '',
      'readme.txt',
      'ok-name_1.svg',
    ]
    expect(collectPreviewFiles(parsed)).toEqual(['ok-name_1.svg'])
  })

  it('returns [] for malformed documents', () => {
    expect(parsePreviewsIndex('not json')).toEqual([])
    expect(parsePreviewsIndex('')).toEqual([])
    expect(parsePreviewsIndex('null')).toEqual([])
    expect(parsePreviewsIndex('42')).toEqual([])
  })
})

describe('bindPreviews', () => {
  it('resolves generated names against the built module, deterministically', () => {
    const bindings = bindPreviews({
      moduleUrl: new URL('file:///virtual/lib/index.js'),
      readIndexText: () => JSON.stringify({ files: ['b.svg', 'a.svg'] }),
    })
    expect([...bindings.keys()]).toEqual(['a.svg', 'b.svg'])
    expect(bindings.get('a.svg')).toBe('/virtual/lib/previews/a.svg')
    expect(bindings.get('b.svg')).toBe('/virtual/lib/previews/b.svg')
  })

  it('yields a deterministic empty map when the index is missing or unreadable', () => {
    const missing = bindPreviews({
      moduleUrl: new URL('file:///virtual/lib/index.js'),
      readIndexText: () => {
        throw new Error('ENOENT')
      },
    })
    expect(missing.size).toBe(0)
    const invalid = bindPreviews({
      moduleUrl: new URL('file:///virtual/lib/index.js'),
      readIndexText: () => 'not json',
    })
    expect(invalid.size).toBe(0)
    const badUrl = bindPreviews({ moduleUrl: 'not a url' })
    expect(badUrl.size).toBe(0)
  })

  it('produces a map without files for a real missing generated index with no seams', () => {
    // Source tests run from src/host, where `previews/index.json` does not exist.
    const bindings = bindPreviews()
    expect(bindings.size).toBe(0)
  })
})

describe('route constants used by the catalog contract', () => {
  it('exposes the frozen public names', () => {
    expect(CATALOG_ROUTE).toBe('/livery/api/catalog')
    expect(ENTRY_ID).toBe('livery')
    expect(BODY_ATTRIBUTE).toBe('data-dsh-livery')
  })
})
