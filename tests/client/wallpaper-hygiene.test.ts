/** 0.1.3 client hygiene: upload lifecycle, remote LRU cache, streaming cap, a11y helpers. */
import { describe, expect, it, vi } from 'vitest'
import { REMOTE_CACHE_MAX_BYTES, cacheRemoteImage, pruneRemoteCache, readRemoteCacheIndex, remoteCacheKey, writeRemoteCacheIndex } from '../../src/client/wallpaper/cache.js'
import type { RemoteCacheStorage } from '../../src/client/wallpaper/cache.js'
import { clearableRecentUrls, deleteStoredImage, evictedRecentUrls, obsoleteUploadKey } from '../../src/client/wallpaper/lifecycle.js'
import { shouldOpenFileDialog } from '../../src/client/wallpaper/upload-a11y.js'
import type { StoredImageRecord, WallpaperImageStore } from '../../src/client/wallpaper/storage.js'
import { CLIENT_CSS } from '../../src/styles/client.js'

class MemoryStorage implements RemoteCacheStorage {
  readonly map = new Map<string, string>()
  getItem(key: string): string | null { return this.map.get(key) ?? null }
  setItem(key: string, value: string): void { this.map.set(key, value) }
  removeItem(key: string): void { this.map.delete(key) }
}

class FakeImages implements WallpaperImageStore {
  readonly records = new Map<string, StoredImageRecord>()
  readonly deleted: string[] = []
  put = vi.fn(async (record: StoredImageRecord) => { this.records.set(record.key, record) })
  get = vi.fn(async (key: string) => this.records.get(key))
  delete = vi.fn(async (key: string) => { this.deleted.push(key); this.records.delete(key) })
  deleteIfGeneration = vi.fn(async (key: string, generation: string) => {
    const record = this.records.get(key)
    if (record === undefined || record.generation !== generation) return false
    const withDeleted = this as unknown as { deleted?: string[] }
    withDeleted.deleted?.push(key)
    this.records.delete(key)
    return true
  })
  list = vi.fn(async () => [...this.records.values()])
  clear = vi.fn(async () => { this.records.clear() })
  touch = vi.fn(async (key: string, now: number) => {
    const record = this.records.get(key)
    if (record === undefined) return undefined
    const touched = { ...record, lastUsedAt: Math.max(now, record.lastUsedAt) }
    this.records.set(key, touched)
    return touched
  })
}

const png = (bytes = 4): Blob => new Blob([new Uint8Array(bytes)], { type: 'image/png' })
const response = (body: Blob, headers: Record<string, string> = { 'content-type': 'image/png' }): Response =>
  new Response(body, { status: 200, headers })
const imageFetch = (make: () => Response): typeof fetch => vi.fn(async () => make()) as unknown as typeof fetch

/** One remote cache record as schema v2 stores it. */
const remoteRecord = (url: string, overrides: Partial<StoredImageRecord> = {}): StoredImageRecord => ({
  key: remoteCacheKey(url),
  kind: 'remote',
  size: 10,
  createdAt: 1,
  lastUsedAt: 1,
  sourceUrl: url,
  generation: 'gen-test',
  blob: png(10),
  ...overrides,
})

describe('upload lifecycle helpers', () => {
  const upload = (key: string) => ({ kind: 'upload' as const, key })

  it('deletes the old upload on replace, switch and clear but not on same-key re-apply', () => {
    expect(obsoleteUploadKey(upload('a'), upload('b'))).toBe('a')
    expect(obsoleteUploadKey(upload('a'), { kind: 'builtin', id: 'aurora' })).toBe('a')
    expect(obsoleteUploadKey(upload('a'), { kind: 'remote', url: 'https://cdn.example/a.jpg' })).toBe('a')
    expect(obsoleteUploadKey(upload('a'), undefined)).toBe('a')
    expect(obsoleteUploadKey(upload('a'), upload('a'))).toBeUndefined()
    expect(obsoleteUploadKey({ kind: 'builtin', id: 'aurora' }, upload('a'))).toBeUndefined()
  })

  it('reports delete failures as non-fatal diagnostics', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const failing: WallpaperImageStore = {
      put: async () => undefined,
      get: async () => undefined,
      delete: async () => { throw new Error('quota') },
      list: async () => [],
      clear: async () => undefined,
      touch: async () => undefined,
    }
    await expect(deleteStoredImage(failing, 'upload-1-a', 'previous upload')).resolves.toBe(false)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not delete previous upload'), expect.any(Error))
    expect(await deleteStoredImage(undefined, 'upload-1-a', 'x')).toBe(false)
    warn.mockRestore()
  })

  it('only evicts history blobs that are not the current remote wallpaper', () => {
    const previous = [{ url: 'https://cdn.example/a.jpg' }, { url: 'https://cdn.example/b.jpg' }]
    const next = [{ url: 'https://cdn.example/a.jpg' }]
    expect(evictedRecentUrls(previous, next, undefined)).toEqual(['https://cdn.example/b.jpg'])
    expect(evictedRecentUrls(previous, next, 'https://cdn.example/b.jpg')).toEqual([])
    expect(clearableRecentUrls(previous, 'https://cdn.example/a.jpg')).toEqual(['https://cdn.example/b.jpg'])
  })
})

describe('remote image streaming cap', () => {
  it('stores a normal image under the cap', async () => {
    const images = new FakeImages()
    const storage = new MemoryStorage()
    const result = await cacheRemoteImage('https://cdn.example/a.jpg', { images, storage, fetchImpl: imageFetch(() => response(png())) })
    expect(result.ok).toBe(true)
    expect(images.records.size).toBe(1)
    expect(readRemoteCacheIndex(storage)).toHaveLength(1)
  })

  it('accepts exactly 15 MiB', async () => {
    const images = new FakeImages()
    const body = new Blob([new Uint8Array(REMOTE_CACHE_MAX_BYTES)], { type: 'image/png' })
    const result = await cacheRemoteImage('https://cdn.example/exact.jpg', {
      images,
      fetchImpl: imageFetch(() => new Response(body, { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(REMOTE_CACHE_MAX_BYTES) } })),
    })
    expect(result.ok).toBe(true)
  })

  it('rejects a trusted Content-Length over 15 MiB before reading the body', async () => {
    const images = new FakeImages()
    const result = await cacheRemoteImage('https://cdn.example/big.jpg', {
      images,
      fetchImpl: imageFetch(() => new Response(png(), { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(REMOTE_CACHE_MAX_BYTES + 1) } })),
    })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(images.put).not.toHaveBeenCalled()
  })

  it('stops a chunked/missing-length body once the cumulative cap is exceeded', async () => {
    const images = new FakeImages()
    const chunk = new Uint8Array(REMOTE_CACHE_MAX_BYTES)
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk)
        controller.enqueue(chunk)
        controller.close()
      },
    })
    const result = await cacheRemoteImage('https://cdn.example/chunked-big.jpg', {
      images,
      fetchImpl: imageFetch(() => new Response(body, { status: 200, headers: { 'content-type': 'image/png' } })),
    })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(images.put).not.toHaveBeenCalled()
  })

  it('does not trust a lying small Content-Length', async () => {
    const images = new FakeImages()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(REMOTE_CACHE_MAX_BYTES))
        controller.enqueue(new Uint8Array(1024))
        controller.close()
      },
    })
    const result = await cacheRemoteImage('https://cdn.example/lying.jpg', {
      images,
      fetchImpl: imageFetch(() => new Response(body, { status: 200, headers: { 'content-type': 'image/png', 'content-length': '1000' } })),
    })
    expect(result.ok).toBe(false)
    expect(images.put).not.toHaveBeenCalled()
  })

  it('accepts a chunked body within the cap', async () => {
    const images = new FakeImages()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024))
        controller.enqueue(new Uint8Array(1024))
        controller.close()
      },
    })
    const result = await cacheRemoteImage('https://cdn.example/chunked-ok.jpg', {
      images,
      fetchImpl: imageFetch(() => new Response(body, { status: 200, headers: { 'content-type': 'image/png' } })),
    })
    expect(result.ok).toBe(true)
  })

  it('aborts on timeout without writing IndexedDB', async () => {
    const images = new FakeImages()
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })) as unknown as typeof fetch
    const result = await cacheRemoteImage('https://cdn.example/slow.jpg', { images, fetchImpl, timeoutMs: 10 })
    expect(result).toEqual({ ok: false, reason: 'network' })
    expect(images.put).not.toHaveBeenCalled()
  })

  it('rejects non-image content types without writing', async () => {
    const images = new FakeImages()
    const result = await cacheRemoteImage('https://cdn.example/page.jpg', {
      images,
      fetchImpl: imageFetch(() => response(png(), { 'content-type': 'text/html' })),
    })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(images.put).not.toHaveBeenCalled()
  })
})

describe('remote cache LRU', () => {
  it('evicts the oldest entries past the count cap, protecting the current wallpaper', async () => {
    const images = new FakeImages()
    const entries = Array.from({ length: 5 }, (_v, index) => ({ url: `https://cdn.example/${index}.jpg`, size: 10, usedAt: index }))
    for (const entry of entries) images.records.set(remoteCacheKey(entry.url), remoteRecord(entry.url, { size: entry.size, lastUsedAt: entry.usedAt }))
    const evicted = await pruneRemoteCache({ images, protectedUrl: entries[0]!.url, maxEntries: 2 })
    // Entries 1,2,3 evicted; oldest (0) protected; newest (4) kept.
    expect([...evicted].sort()).toEqual([entries[1]!.url, entries[2]!.url, entries[3]!.url])
    expect(images.deleted).toHaveLength(3)
  })

  it('keeps failed evictions tracked for a later retry', async () => {
    const images: WallpaperImageStore = {
      put: async () => undefined,
      get: async () => undefined,
      delete: async () => { throw new Error('locked') },
      list: async () => [remoteRecord('https://cdn.example/a.jpg'), remoteRecord('https://cdn.example/b.jpg')],
      clear: async () => undefined,
      touch: async () => undefined,
    }
    const evicted = await pruneRemoteCache({ images, maxEntries: 1 })
    expect(evicted).toEqual([])
  })

  it('evicts by total byte cap (128 MiB) with LRU order', async () => {
    const images = new FakeImages()
    const big = 60 * 1024 * 1024
    const entries = [
      { url: 'https://cdn.example/a.jpg', size: big, usedAt: 1 },
      { url: 'https://cdn.example/b.jpg', size: big, usedAt: 2 },
      { url: 'https://cdn.example/c.jpg', size: big, usedAt: 3 },
    ]
    for (const entry of entries) images.records.set(remoteCacheKey(entry.url), remoteRecord(entry.url, { size: entry.size, lastUsedAt: entry.usedAt }))
    const evicted = await pruneRemoteCache({ images, protectedUrl: entries[2]!.url })
    expect(evicted).toEqual([entries[0]!.url])
  })

  it('never evicts the current wallpaper even when it is the oldest entry', async () => {
    const images = new FakeImages()
    const current = remoteRecord('https://cdn.example/current.jpg', { lastUsedAt: 1 })
    const others = [2, 3, 4].map(index => remoteRecord(`https://cdn.example/${index}.jpg`, { lastUsedAt: index }))
    images.records.set(current.key, current)
    for (const record of others) images.records.set(record.key, record)
    const evicted = await pruneRemoteCache({ images, protectedUrl: current.sourceUrl, maxEntries: 2 })
    expect(evicted).not.toContain(current.sourceUrl)
    expect(images.records.has(current.key)).toBe(true)
  })
})

describe('dropzone keyboard', () => {
  it('opens the file dialog once per Enter/Space and ignores auto-repeat', () => {
    expect(shouldOpenFileDialog({ key: 'Enter' })).toBe(true)
    expect(shouldOpenFileDialog({ key: ' ' })).toBe(true)
    expect(shouldOpenFileDialog({ key: 'Enter', repeat: true })).toBe(false)
    expect(shouldOpenFileDialog({ key: 'a' })).toBe(false)
    expect(shouldOpenFileDialog({ key: 'Escape' })).toBe(false)
  })

  it('ships a visible focus ring for the dropzone', () => {
    expect(CLIENT_CSS).toContain('.wallpaper-dropzone:focus-visible{outline:2px solid var(--lw-brand);outline-offset:2px}')
  })
})

describe('remote cache index mirror', () => {
  it('rebuilds the mirror from the authoritative record list after pruning', async () => {
    const images = new FakeImages()
    const storage = new MemoryStorage()
    writeRemoteCacheIndex(storage, [{ url: 'https://stale.example/old.jpg', key: 'remote-deadbeef', size: 1, usedAt: 1 }])
    const a = remoteRecord('https://cdn.example/a.jpg', { lastUsedAt: 1 })
    const b = remoteRecord('https://cdn.example/b.jpg', { lastUsedAt: 2 })
    images.records.set(a.key, a)
    images.records.set(b.key, b)
    await pruneRemoteCache({ images, storage, maxEntries: 1 })
    expect(readRemoteCacheIndex(storage).map(entry => entry.url)).toEqual([b.sourceUrl])
  })
})
