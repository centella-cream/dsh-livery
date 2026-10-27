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
}

const png = (bytes = 4): Blob => new Blob([new Uint8Array(bytes)], { type: 'image/png' })
const response = (body: Blob, headers: Record<string, string> = { 'content-type': 'image/png' }): Response =>
  new Response(body, { status: 200, headers })
const imageFetch = (make: () => Response): typeof fetch => vi.fn(async () => make()) as unknown as typeof fetch

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
  const seedIndex = (storage: MemoryStorage, entries: Array<{ url: string; size: number; usedAt: number }>): void => {
    writeRemoteCacheIndex(storage, entries.map(entry => ({ ...entry, key: remoteCacheKey(entry.url) })))
  }

  it('evicts the oldest entries past the count cap, protecting the current wallpaper', async () => {
    const images = new FakeImages()
    const storage = new MemoryStorage()
    const entries = Array.from({ length: 5 }, (_v, index) => ({ url: `https://cdn.example/${index}.jpg`, size: 10, usedAt: index }))
    seedIndex(storage, entries)
    for (const entry of entries) images.records.set(remoteCacheKey(entry.url), { key: remoteCacheKey(entry.url), name: 'x', type: 'image/png', size: 10, blob: png() })
    const evicted = await pruneRemoteCache({ images, storage, protectedUrl: entries[0]!.url, maxEntries: 2 })
    // Entries 1,2,3 evicted; oldest (0) protected; newest (4) kept.
    expect([...evicted].sort()).toEqual([entries[1]!.url, entries[2]!.url, entries[3]!.url])
    expect(readRemoteCacheIndex(storage).map(entry => entry.url)).toEqual([entries[0]!.url, entries[4]!.url].map(url => url))
    expect(images.deleted).toHaveLength(3)
  })

  it('keeps failed evictions tracked for a later retry', async () => {
    const storage = new MemoryStorage()
    const entries = [
      { url: 'https://cdn.example/a.jpg', size: 10, usedAt: 1 },
      { url: 'https://cdn.example/b.jpg', size: 10, usedAt: 2 },
    ]
    writeRemoteCacheIndex(storage, entries.map(entry => ({ ...entry, key: remoteCacheKey(entry.url) })))
    const images: WallpaperImageStore = {
      put: async () => undefined,
      get: async () => undefined,
      delete: async () => { throw new Error('locked') },
    }
    const evicted = await pruneRemoteCache({ images, storage, maxEntries: 1 })
    expect(evicted).toEqual([])
    expect(readRemoteCacheIndex(storage).map(entry => entry.url)).toContain('https://cdn.example/a.jpg')
  })

  it('evicts by total byte cap (128 MiB) with LRU order', async () => {
    const images = new FakeImages()
    const storage = new MemoryStorage()
    const big = 60 * 1024 * 1024
    const entries = [
      { url: 'https://cdn.example/a.jpg', size: big, usedAt: 1 },
      { url: 'https://cdn.example/b.jpg', size: big, usedAt: 2 },
      { url: 'https://cdn.example/c.jpg', size: big, usedAt: 3 },
    ]
    seedIndex(storage, entries)
    for (const entry of entries) images.records.set(remoteCacheKey(entry.url), { key: remoteCacheKey(entry.url), name: 'x', type: 'image/png', size: big, blob: png() })
    const evicted = await pruneRemoteCache({ images, storage, protectedUrl: entries[2]!.url })
    expect(evicted).toEqual([entries[0]!.url])
    expect(readRemoteCacheIndex(storage).map(entry => entry.url)).toEqual([entries[1]!.url, entries[2]!.url])
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
