/**
 * Catalog and per-profile preview-binding tests: the served document carries
 * the adapter's identity and catalog profile, and the preview whitelist is
 * derived only from safe flat filenames inside the profile's own directory.
 */

import { describe, expect, it } from 'vitest'
import {
  bindPreviews,
  bindProfilePreviews,
  buildCatalog,
  catalogProfileFor,
  collectPreviewFiles,
  isSafeCatalogProfileId,
  liveryIdsOf,
  parsePreviewsIndex,
  previewsBaseFor,
  serializeCatalog,
} from '../../src/host/catalog.js'
import {
  PREVIEW_ROUTE_PREFIX,
  SCHEMA_VERSION,
  LIVERY_VERSION,
  type LiveryCatalog,
} from '../../src/core/types.js'
import {
  SYNTHETIC_PROFILE_A,
  SYNTHETIC_PROFILE_B,
  makeAdapter,
  makeLivery,
  makeProfile,
} from './fixtures.js'

/** Assert one parsed JSON value is the multi-profile catalog shape. */
function expectCatalogShape(value: unknown): asserts value is LiveryCatalog {
  expect(value).toBeTypeOf('object')
  expect(value).not.toBeNull()
  const catalog = value as Record<string, unknown>
  expect(catalog.schemaVersion).toBe(SCHEMA_VERSION)
  expect(catalog.compilerVersion).toBe(LIVERY_VERSION)
  expect(typeof catalog.adapterId).toBe('string')
  expect(typeof catalog.hostVersion).toBe('string')
  expect(typeof catalog.contractHash).toBe('string')
  expect(typeof catalog.catalogProfile).toBe('string')
  expect(catalog.capabilities).toBeTypeOf('object')
  expect(typeof catalog.previewsBase).toBe('string')
  expect(Array.isArray(catalog.liveries)).toBe(true)
}

describe('buildCatalog', () => {
  it("assembles one adapter's identity, profile, capabilities and previews base", () => {
    const adapter = makeAdapter()
    const profile = makeProfile(SYNTHETIC_PROFILE_A, [makeLivery()])
    const catalog = buildCatalog(adapter, profile)
    expect(catalog.schemaVersion).toBe(SCHEMA_VERSION)
    expect(catalog.compilerVersion).toBe(LIVERY_VERSION)
    expect(catalog.adapterId).toBe(adapter.adapterId)
    expect(catalog.hostVersion).toBe(adapter.hostVersion)
    expect(catalog.contractHash).toBe(adapter.contractHash)
    expect(catalog.catalogProfile).toBe(SYNTHETIC_PROFILE_A)
    expect(catalog.capabilities).toBe(adapter.capabilities)
    expect(catalog.previewsBase).toBe(`${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/`)
    expect(catalog.liveries).toHaveLength(1)
    expect(catalog.liveries[0]?.id).toBe('ivory-slate')
  })

  it('serializes identically-named adapters differently when they differ in identity', () => {
    const first = makeAdapter()
    const second = makeAdapter({
      hostVersion: 'test-host-2.0.0',
      adapterId: 'dsh-test-host-2.0.0-r1',
      contractHash: `sha256:${'2'.repeat(64)}`,
      catalogProfile: SYNTHETIC_PROFILE_B,
    })
    const firstCatalog = buildCatalog(first, makeProfile(SYNTHETIC_PROFILE_A))
    const secondCatalog = buildCatalog(second, makeProfile(SYNTHETIC_PROFILE_B))
    expect(firstCatalog.adapterId).not.toBe(secondCatalog.adapterId)
    expect(firstCatalog.hostVersion).not.toBe(secondCatalog.hostVersion)
    expect(firstCatalog.contractHash).not.toBe(secondCatalog.contractHash)
    expect(firstCatalog.catalogProfile).not.toBe(secondCatalog.catalogProfile)
    expect(firstCatalog.previewsBase).not.toBe(secondCatalog.previewsBase)
  })

  it('is pure: equal inputs give equal catalogues', () => {
    const adapter = makeAdapter()
    const profile = makeProfile(SYNTHETIC_PROFILE_A)
    expect(buildCatalog(adapter, profile)).toEqual(buildCatalog(adapter, profile))
  })

  it('yields an empty livery list deterministically when the profile is missing', () => {
    const adapter = makeAdapter({ catalogProfile: 'sha256:not-generated' })
    const catalog = buildCatalog(adapter)
    expect(catalog.liveries).toEqual([])
    expect(catalog.catalogProfile).toBe('sha256:not-generated')
    expect(catalog.previewsBase).toBe(`${PREVIEW_ROUTE_PREFIX}sha256:not-generated/`)
    expect(() => serializeCatalog(catalog)).not.toThrow()
  })

  it('resolves a profile through the generated registry id only', () => {
    const adapter = makeAdapter()
    // Synthetic profiles are not in the generated registry by construction.
    expect(catalogProfileFor(adapter)).toBeUndefined()
  })

  it('serializes to JSON that parses back into the catalog shape', () => {
    const adapter = makeAdapter()
    const catalog = buildCatalog(adapter, makeProfile(SYNTHETIC_PROFILE_A, [makeLivery()]))
    const parsed: unknown = JSON.parse(serializeCatalog(catalog))
    expectCatalogShape(parsed)
    expect((parsed as LiveryCatalog).catalogProfile).toBe(SYNTHETIC_PROFILE_A)
    expect((parsed as LiveryCatalog).liveries).toHaveLength(1)
  })

  it('derives the known-id set for normalization', () => {
    const ids = liveryIdsOf([makeLivery(), makeLivery({ id: 'ocean-mist' })])
    expect(ids.has('ivory-slate')).toBe(true)
    expect(ids.has('ocean-mist')).toBe(true)
    expect(ids.has('deleted')).toBe(false)
  })
})

describe('previewsBase', () => {
  it('is the frozen route prefix plus the profile id plus a slash', () => {
    expect(previewsBaseFor(SYNTHETIC_PROFILE_A)).toBe(
      `/livery/assets/previews/${SYNTHETIC_PROFILE_A}/`,
    )
    expect(previewsBaseFor('sha256:abc')).toBe('/livery/assets/previews/sha256:abc/')
  })

  it('rejects profile ids that could name a path', () => {
    expect(isSafeCatalogProfileId('sha256:abc')).toBe(true)
    expect(isSafeCatalogProfileId('')).toBe(false)
    expect(isSafeCatalogProfileId('../profile')).toBe(false)
    expect(isSafeCatalogProfileId('a/b')).toBe(false)
    expect(isSafeCatalogProfileId('a\\b')).toBe(false)
    expect(isSafeCatalogProfileId('a\0b')).toBe(false)
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
  it('resolves a profile index against the built module, deterministically', () => {
    const paths: string[] = []
    const bindings = bindPreviews(SYNTHETIC_PROFILE_A, {
      moduleUrl: new URL('file:///virtual/lib/index.js'),
      readIndexText: (indexPath) => {
        paths.push(indexPath)
        return JSON.stringify({ files: ['b.svg', 'a.svg'], count: 2 })
      },
    })
    expect(paths).toEqual([`/virtual/lib/previews/${SYNTHETIC_PROFILE_A}/index.json`])
    expect([...bindings.keys()]).toEqual(['a.svg', 'b.svg'])
    expect(bindings.get('a.svg')).toBe(`/virtual/lib/previews/${SYNTHETIC_PROFILE_A}/a.svg`)
    expect(bindings.get('b.svg')).toBe(`/virtual/lib/previews/${SYNTHETIC_PROFILE_A}/b.svg`)
  })

  it('binds each profile into its own directory', () => {
    const bindings = bindPreviews(SYNTHETIC_PROFILE_B, {
      moduleUrl: new URL('file:///virtual/lib/index.js'),
      readIndexText: () => JSON.stringify({ files: ['c.svg'], count: 1 }),
    })
    expect(bindings.get('c.svg')).toBe(`/virtual/lib/previews/${SYNTHETIC_PROFILE_B}/c.svg`)
  })

  it('yields a deterministic empty map for a missing/invalid index', () => {
    const missing = bindPreviews(SYNTHETIC_PROFILE_A, {
      moduleUrl: new URL('file:///virtual/lib/index.js'),
      readIndexText: () => {
        throw new Error('ENOENT')
      },
    })
    expect(missing.size).toBe(0)
    const invalid = bindPreviews(SYNTHETIC_PROFILE_A, {
      moduleUrl: new URL('file:///virtual/lib/index.js'),
      readIndexText: () => 'not json',
    })
    expect(invalid.size).toBe(0)
  })

  it('never resolves an unsafe profile id', () => {
    const paths: string[] = []
    for (const profileId of ['', '../etc', 'a/b', 'sha256:..']) {
      const bindings = bindPreviews(profileId, {
        moduleUrl: new URL('file:///virtual/lib/index.js'),
        readIndexText: (indexPath) => {
          paths.push(indexPath)
          return JSON.stringify({ files: ['a.svg'] })
        },
      })
      expect(bindings.size, profileId).toBe(0)
    }
    expect(paths).toEqual([])
  })

  it('produces an empty map without seams when the generated index is absent', () => {
    // Source tests run from src/host, where `previews/` does not exist.
    expect(bindPreviews(SYNTHETIC_PROFILE_A).size).toBe(0)
  })
})

describe('bindProfilePreviews', () => {
  it('binds each requested profile id', () => {
    const bindings = bindProfilePreviews({
      profileIds: [SYNTHETIC_PROFILE_A, SYNTHETIC_PROFILE_B],
      moduleUrl: new URL('file:///virtual/lib/index.js'),
      readIndexText: () => JSON.stringify({ files: ['a.svg'], count: 1 }),
    })
    expect([...bindings.keys()]).toEqual([SYNTHETIC_PROFILE_A, SYNTHETIC_PROFILE_B])
    expect(bindings.get(SYNTHETIC_PROFILE_A)?.get('a.svg'))
      .toBe(`/virtual/lib/previews/${SYNTHETIC_PROFILE_A}/a.svg`)
    expect(bindings.get(SYNTHETIC_PROFILE_B)?.get('a.svg'))
      .toBe(`/virtual/lib/previews/${SYNTHETIC_PROFILE_B}/a.svg`)
  })
})
