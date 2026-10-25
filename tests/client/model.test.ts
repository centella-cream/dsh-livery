import { describe, expect, it } from 'vitest'
import {
  PHASE_TRANSITIONS,
  bootDiagnosticsOf,
  bootMatchesExpected,
  canTransition,
  collectTagIds,
  countCapabilities,
  createInitialSnapshot,
  filterLiveries,
  isStock,
  liveryAvailability,
  localizedDescription,
  localizedName,
  missingContractCapabilities,
  normalizeSkinId,
  previewFileName,
  previewSeeds,
  previewAssetUrl,
  previewUrl,
  shortHash,
  sortLiveries,
} from '../../src/client/model.js'
import type { LiveryRuntimeSnapshot } from '../../src/client/model.js'
import { makeCatalog, makeLivery, TEST_ADAPTER, TEST_CAPABILITIES, TEST_PREVIEWS_BASE } from './fixtures.js'
import type { CapabilityMap } from '../../src/core/types.js'

const CATALOG = makeCatalog()
const LABELS = { calm: '安静', deep: '深邃', elegant: '雅致' }

describe('lifecycle transitions', () => {
  it('declares the plan §6.3 state machine', () => {
    expect(PHASE_TRANSITIONS.boot).toContain('loading')
    expect(PHASE_TRANSITIONS.loading).toContain('ready')
    expect(PHASE_TRANSITIONS.ready).toContain('previewing')
    expect(PHASE_TRANSITIONS.ready).toContain('degraded')
    expect(PHASE_TRANSITIONS.previewing).toContain('ready')
    expect(PHASE_TRANSITIONS.degraded).toContain('previewing')
    expect(PHASE_TRANSITIONS.disposed).toEqual([])
  })

  it('rejects illegal transitions', () => {
    expect(canTransition('boot', 'boot')).toBe(true)
    expect(canTransition('boot', 'ready')).toBe(false)
    expect(canTransition('loading', 'previewing')).toBe(false)
    expect(canTransition('previewing', 'loading')).toBe(false)
    expect(canTransition('disposed', 'ready')).toBe(false)
    expect(canTransition('ready', 'degraded')).toBe(true)
  })
})

describe('catalog ordering and tags', () => {
  it('sorts by manifest order then id', () => {
    const sorted = sortLiveries([
      makeLivery('z', { order: 20 }),
      makeLivery('a', { order: 10 }),
      makeLivery('b', { order: 10 }),
    ])
    expect(sorted.map(livery => livery.id)).toEqual(['a', 'b', 'z'])
  })

  it('collects unique tag ids in first-appearance order', () => {
    const tags = collectTagIds([
      makeLivery('a', { order: 10, tags: ['calm', 'cool'] }),
      makeLivery('b', { order: 20, tags: ['cool', 'deep'] }),
    ])
    expect(tags).toEqual(['calm', 'cool', 'deep'])
  })
})

describe('localized metadata fallback chain', () => {
  it('uses the active full locale first', () => {
    expect(localizedName(CATALOG.liveries[0]!, 'zh')).toContain('风格')
    expect(localizedName(CATALOG.liveries[0]!, 'en')).toContain('Visual Style')
    expect(localizedDescription(CATALOG.liveries[0]!, 'zh')).toContain('描述')
  })

  it('falls back to the other shipped locale, then the id', () => {
    const missingEn = {
      ...makeLivery('x'),
      meta: { ...makeLivery('x').meta, name: { 'zh-CN': '只有中文', 'en-US': '' } },
    }
    expect(localizedName(missingEn, 'en')).toBe('只有中文')
    const emptyBoth = {
      ...makeLivery('x'),
      meta: { ...makeLivery('x').meta, name: { 'zh-CN': '', 'en-US': '' } },
    }
    expect(localizedName(emptyBoth, 'zh')).toBe('x')
  })
})

describe('gallery search and tag filter', () => {
  const fjord = CATALOG.liveries[0]!
  const midnight = CATALOG.liveries[1]!

  it('returns everything for an empty filter', () => {
    expect(filterLiveries(CATALOG.liveries, { query: '', tagId: undefined }, LABELS)).toHaveLength(2)
  })

  it('matches the localized name of either shipped locale', () => {
    const byZh = filterLiveries(CATALOG.liveries, { query: '风格-fjord', tagId: undefined }, LABELS)
    expect(byZh.map(livery => livery.id)).toEqual(['fjord'])
    const byEn = filterLiveries(CATALOG.liveries, { query: 'Visual Style midnight', tagId: undefined }, LABELS)
    expect(byEn.map(livery => livery.id)).toEqual(['midnight'])
  })

  it('matches the id and tag ids', () => {
    expect(filterLiveries(CATALOG.liveries, { query: 'FJORD', tagId: undefined }, LABELS)).toHaveLength(1)
    expect(filterLiveries(CATALOG.liveries, { query: 'elegant', tagId: undefined }, LABELS)).toHaveLength(1)
  })

  it('matches active-locale tag labels', () => {
    const byTagLabel = filterLiveries(CATALOG.liveries, { query: '安静', tagId: undefined }, LABELS)
    expect(byTagLabel.map(livery => livery.id)).toEqual(['fjord'])
    const byDeep = filterLiveries(CATALOG.liveries, { query: '深邃', tagId: undefined }, LABELS)
    expect(byDeep.map(livery => livery.id)).toEqual(['midnight'])
  })

  it('filters by tag id', () => {
    const only = filterLiveries(CATALOG.liveries, { query: '', tagId: 'calm' }, LABELS)
    expect(only.map(livery => livery.id)).toEqual(['fjord'])
    expect(filterLiveries(CATALOG.liveries, { query: '', tagId: 'absent' }, LABELS)).toHaveLength(0)
    expect(midnight.meta.tags).toContain('deep')
    expect(fjord.meta.tags).toContain('calm')
  })

  it('trims whitespace before matching', () => {
    expect(filterLiveries(CATALOG.liveries, { query: '  fjord  ', tagId: undefined }, LABELS)).toHaveLength(1)
  })
})

describe('availability under the live capability map', () => {
  it('marks a livery applicable when its required capabilities exist', () => {
    const availability = liveryAvailability(CATALOG.liveries[0]!, TEST_CAPABILITIES)
    expect(availability.applicable).toBe(true)
    expect(availability.missingRequired).toEqual([])
  })

  it('marks it inapplicable when a required capability is absent', () => {
    const capabilities: CapabilityMap = {
      ...TEST_CAPABILITIES,
      'theme-css': { ...TEST_CAPABILITIES['theme-css']!, available: false },
    }
    const availability = liveryAvailability(CATALOG.liveries[0]!, capabilities)
    expect(availability.applicable).toBe(false)
    expect(availability.missingRequired).toEqual(['theme-css'])
  })

  it('reports runtime degradation for unavailable optional capabilities', () => {
    const capabilities: CapabilityMap = {
      'theme-css': TEST_CAPABILITIES['theme-css']!,
    }
    const availability = liveryAvailability(CATALOG.liveries[0]!, capabilities)
    expect(availability.applicable).toBe(true)
    expect(availability.degraded.map(entry => entry.id)).toContain('reduced-motion')
  })

  it('lists contract-level required capabilities that are unavailable', () => {
    const capabilities: CapabilityMap = {
      ...TEST_CAPABILITIES,
      'host-font-family': { ...TEST_CAPABILITIES['host-font-family']!, available: false },
    }
    expect(missingContractCapabilities(capabilities)).toEqual(['host-font-family'])
  })
})

describe('boot adoption hash comparison', () => {
  const facts = {
    expectedId: 'fjord',
    expectedHash: 'sha256:abc',
    bootId: 'fjord',
    bootHash: 'sha256:abc',
    bodyId: 'fjord',
    bodyHash: 'sha256:abc',
  }

  it('adopts only when every id and hash agrees', () => {
    expect(bootMatchesExpected(facts)).toBe(true)
    expect(bootMatchesExpected({ ...facts, bodyHash: 'sha256:other' })).toBe(false)
    expect(bootMatchesExpected({ ...facts, bodyId: 'midnight' })).toBe(false)
    expect(bootMatchesExpected({ ...facts, bootHash: undefined })).toBe(false)
    expect(bootMatchesExpected({ ...facts, expectedHash: '' })).toBe(false)
  })
})

describe('config normalization and helpers', () => {
  it('normalizes the config section defensively', () => {
    expect(normalizeSkinId({ skinId: 'fjord' })).toBe('fjord')
    expect(normalizeSkinId({})).toBeUndefined()
    expect(normalizeSkinId({ skinId: 42 })).toBeUndefined()
    expect(normalizeSkinId(null)).toBeUndefined()
    expect(normalizeSkinId('fjord')).toBeUndefined()
  })

  it('recognizes the stock id', () => {
    expect(isStock('stock')).toBe(true)
    expect(isStock(undefined)).toBe(true)
    expect(isStock('fjord')).toBe(false)
  })

  it('builds the frozen preview filename convention', () => {
    expect(previewFileName('fjord', 'zh', 'light')).toBe('fjord-zh-light.svg')
    expect(previewFileName('fjord', 'en', 'dark')).toBe('fjord-en-dark.svg')
  })

  it('joins preview URLs onto the catalog-declared base, never a hardcoded path', () => {
    // The profile-scoped base comes from the fetched catalog (multi-version.md §6).
    expect(previewUrl(TEST_PREVIEWS_BASE, 'fjord', 'zh', 'dark')).toBe(`${TEST_PREVIEWS_BASE}fjord-zh-dark.svg`)
    expect(previewUrl(`${TEST_PREVIEWS_BASE}`, 'fjord', 'en', 'light'))
      .toBe(`${TEST_PREVIEWS_BASE}fjord-en-light.svg`)
    // Trailing slash is optional and normalized exactly once.
    const withoutSlash = TEST_PREVIEWS_BASE.slice(0, -1)
    expect(previewAssetUrl(withoutSlash, 'a.svg')).toBe(`${TEST_PREVIEWS_BASE}a.svg`)
    expect(previewAssetUrl(TEST_PREVIEWS_BASE, 'a.svg')).toBe(`${TEST_PREVIEWS_BASE}a.svg`)
    expect(previewUrl('/livery/assets/previews/other-profile/', 'x', 'zh', 'light'))
      .toBe('/livery/assets/previews/other-profile/x-zh-light.svg')
  })

  it('shortens hashes for display', () => {
    expect(shortHash('sha256:0123456789abcdef0123')).toBe('0123456789ab')
    expect(shortHash('plain')).toBe('plain')
  })

  it('exposes seeds per mode for the fallback mockup', () => {
    const livery = CATALOG.liveries[0]!
    expect(previewSeeds(livery, 'light').accent).toBe('#aa2222')
    expect(previewSeeds(livery, 'dark').accent).toBe('#2222aa')
  })

  it('counts capabilities', () => {
    expect(countCapabilities(TEST_CAPABILITIES)).toEqual({ available: 3, total: 3 })
  })

  it('creates the boot-phase snapshot', () => {
    const snapshot = createInitialSnapshot(
      { adapterId: TEST_ADAPTER.adapterId, contractHash: TEST_ADAPTER.contractHash, pluginVersion: '1', hostVersion: TEST_ADAPTER.hostVersion },
      { status: 'absent', reason: undefined, diagnostics: ['x'] },
    )
    expect(snapshot.phase).toBe('boot')
    expect(snapshot.bootStatus).toBe('absent')
    expect(snapshot.revision).toBe(0)
    expect(snapshot.configStatus).toBe('loading')
    expect(snapshot.locale).toBe('en')
    expect(snapshot.catalogProfile).toBeUndefined()
  })

  it('seeds the catalog profile from the handshake when one is known', () => {
    const snapshot = createInitialSnapshot(
      { adapterId: TEST_ADAPTER.adapterId, contractHash: TEST_ADAPTER.contractHash, pluginVersion: '1', hostVersion: TEST_ADAPTER.hostVersion },
      { status: 'valid', reason: undefined, diagnostics: [], catalogProfile: TEST_ADAPTER.catalogProfile },
    )
    expect(snapshot.catalogProfile).toBe(TEST_ADAPTER.catalogProfile)
  })
})

describe('boot diagnostics helper', () => {
  it('returns host diagnostics or an empty list', () => {
    expect(bootDiagnosticsOf(undefined)).toEqual([])
    const snapshot: LiveryRuntimeSnapshot = createInitialSnapshot(
      { adapterId: 'a', contractHash: 'c', pluginVersion: 'p', hostVersion: 'h' },
      { status: 'valid', reason: undefined, diagnostics: [] },
    )
    expect(snapshot.bootDiagnostics).toEqual([])
  })
})
