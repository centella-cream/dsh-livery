/**
 * Curated online wallpaper library: URL/category mapping, cache TTL + pruning,
 * dedupe, one retry on transient failure, and cached offline fallback.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  LIBRARY_BATCH_SIZE,
  LIBRARY_CACHE_KEY,
  LIBRARY_CACHE_MAX_BYTES,
  LIBRARY_CACHE_TTL_MS,
  LIBRARY_CATEGORIES,
  buildLibraryUrl,
  cachedBatch,
  fetchLibraryBatch,
  mergeLibraryResults,
  readLibraryCache,
  writeLibraryCache,
} from '../../src/client/wallpaper/library.js'
import type { LibraryBatch, LibraryCache } from '../../src/client/wallpaper/library.js'

class MemoryStorage {
  readonly map = new Map<string, string>()
  getItem(key: string): string | null { return this.map.get(key) ?? null }
  setItem(key: string, value: string): void { this.map.set(key, value) }
  removeItem(key: string): void { this.map.delete(key) }
}

const result = (id: string) => ({
  id, url: `https://cdn.example/${id}.jpg`, thumbnail: `https://cdn.example/${id}-t.jpg`,
  title: `Title ${id}`, creator: 'Ann', license: 'cc0', source: 'openverse.org',
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('curated library categories', () => {
  it('maps eight localized categories to license-safe Openverse URLs', () => {
    expect(LIBRARY_CATEGORIES).toHaveLength(8)
    expect(new Set(LIBRARY_CATEGORIES.map(category => category.id)).size).toBe(8)
    for (const category of LIBRARY_CATEGORIES) {
      expect(category.labelKey.startsWith('wallpaper.category.')).toBe(true)
      const url = new URL(buildLibraryUrl(category.id, 2))
      expect(url.origin + url.pathname).toBe('https://api.openverse.org/v1/images/')
      expect(url.searchParams.get('license')).toBe('cc0,pdm')
      expect(url.searchParams.get('page_size')).toBe(String(LIBRARY_BATCH_SIZE))
      expect(url.searchParams.get('page')).toBe('2')
      expect(url.searchParams.get('q')).toBe(category.query)
    }
  })
})

describe('library cache', () => {
  const batch = (fetchedAt: number, results = [result('a')]): LibraryBatch => ({ fetchedAt, page: 1, results })

  it('roundtrips a cache and reports freshness against the 6h TTL', () => {
    const storage = new MemoryStorage()
    const cache: LibraryCache = { nature: batch(1_000) }
    writeLibraryCache(cache, storage)
    const parsed = readLibraryCache(storage)
    expect(parsed.nature?.results).toHaveLength(1)
    expect(cachedBatch(parsed, 'nature', 1_000 + LIBRARY_CACHE_TTL_MS)?.fresh).toBe(true)
    expect(cachedBatch(parsed, 'nature', 1_001 + LIBRARY_CACHE_TTL_MS)?.fresh).toBe(false)
  })

  it('ignores corrupt cache data and foreign shapes', () => {
    const storage = new MemoryStorage()
    storage.setItem(LIBRARY_CACHE_KEY, '{not json')
    expect(readLibraryCache(storage)).toEqual({})
    storage.setItem(LIBRARY_CACHE_KEY, JSON.stringify({ nature: { results: 'nope' }, unknown: batch(1) }))
    expect(readLibraryCache(storage)).toEqual({})
  })

  it('keeps only the two newest categories and enforces the size cap', () => {
    const storage = new MemoryStorage()
    const cache: LibraryCache = {
      nature: batch(1), city: batch(2), space: batch(3),
    }
    writeLibraryCache(cache, storage)
    expect(Object.keys(readLibraryCache(storage)).sort()).toEqual(['city', 'space'])
    // Oversized batches get dropped until the serialized cache fits.
    const huge = Array.from({ length: 24 }, (_value, index) => ({
      ...result(`huge-${index}`),
      title: 'x'.repeat(1200),
      thumbnail: `https://cdn.example/${'y'.repeat(1200)}`,
    }))
    storage.setItem(LIBRARY_CACHE_KEY, JSON.stringify({ nature: { fetchedAt: 1, page: 1, results: huge } }))
    const written = readLibraryCache(storage)
    writeLibraryCache(written, storage)
    expect((storage.getItem(LIBRARY_CACHE_KEY) ?? '').length).toBeLessThanOrEqual(LIBRARY_CACHE_MAX_BYTES)
  })

  it('dedupes results by URL/id and caps one batch', () => {
    const merged = mergeLibraryResults([result('a'), result('b')], [result('b'), result('c')])
    expect(merged.map(entry => entry.id)).toEqual(['a', 'b', 'c'])
    const many = Array.from({ length: 30 }, (_value, index) => result(`r${index}`))
    expect(mergeLibraryResults([], many)).toHaveLength(LIBRARY_BATCH_SIZE)
  })
})

describe('library fetching', () => {
  it('returns a fresh batch on success and caches nothing itself', async () => {
    const storage = new MemoryStorage()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ results: [result('a'), result('b')] }), { status: 200 }))
    const outcome = await fetchLibraryBatch('nature', 1, { fetchImpl: fetchImpl as unknown as typeof fetch, storage, now: () => 100 })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.results.map(entry => entry.id)).toEqual(['a', 'b'])
      expect(outcome.cached).toBe(false)
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries once on a transient failure before giving up', async () => {
    const first = new Response('nope', { status: 503 })
    const second = new Response(JSON.stringify({ results: [result('ok')] }), { status: 200 })
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second)
    const outcome = await fetchLibraryBatch('city', 1, { fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(outcome.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('falls back to the cached batch when the network fails', async () => {
    const storage = new MemoryStorage()
    storage.setItem(LIBRARY_CACHE_KEY, JSON.stringify({
      sky: { fetchedAt: 5, page: 2, results: [result('cached')] },
    }))
    const fetchImpl = vi.fn(async () => { throw new TypeError('offline') })
    const outcome = await fetchLibraryBatch('sky', 3, {
      fetchImpl: fetchImpl as unknown as typeof fetch, storage, now: () => 10,
    })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.reason).toBe('offline')
      expect(outcome.cached?.page).toBe(2)
      expect(outcome.cached?.results.map(entry => entry.id)).toEqual(['cached'])
    }
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('reports offline/error with no cache and never throws', async () => {
    vi.stubGlobal('fetch', undefined)
    const offline = await fetchLibraryBatch('nature', 1, { storage: new MemoryStorage() })
    expect(offline).toEqual({ ok: false, reason: 'offline' })
    const throwing = vi.fn(async () => { throw new TypeError('offline') })
    const error = await fetchLibraryBatch('nature', 2, { fetchImpl: throwing as unknown as typeof fetch, storage: new MemoryStorage() })
    expect(error.ok).toBe(false)
    if (!error.ok) expect(error.reason).toBe('error')
  })

  it('filters non-https rows from the served JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      results: [result('a'), { ...result('b'), url: 'http://insecure.example/b.jpg' }],
    }), { status: 200 }))
    const outcome = await fetchLibraryBatch('nature', 1, { fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.results.map(entry => entry.id)).toEqual(['a'])
  })
})
