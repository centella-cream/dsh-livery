/** Recent online wallpapers: local history store and best-effort disk cache. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_RECENT_WALLPAPERS,
  RECENT_WALLPAPER_KEY,
  addRecentEntry,
  clearRecentWallpapers,
  parseRecentEntry,
  readRecentWallpapers,
  rememberRecentWallpaper,
} from '../../src/client/wallpaper/history.js'
import type { RecentWallpaperEntry, RecentWallpaperStorage } from '../../src/client/wallpaper/history.js'
import {
  REMOTE_CACHE_MAX_BYTES,
  cacheRemoteImage,
  deleteCachedRemote,
  isRemoteCached,
  loadCachedRemote,
  remoteCacheKey,
} from '../../src/client/wallpaper/cache.js'
import { createWallpaperController } from '../../src/client/wallpaper/controller.js'
import type { WallpaperStorage } from '../../src/client/wallpaper/controller.js'
import { DEFAULT_WALLPAPER_EFFECTS, WALLPAPER_STORAGE_KEY } from '../../src/client/wallpaper.js'
import { WALLPAPER_STYLE_ID } from '../../src/client/wallpaper/apply.js'
import type { StoredImageRecord, WallpaperImageStore } from '../../src/client/wallpaper/storage.js'
import { FakeDocument } from './fixtures.js'

class MemoryStorage implements RecentWallpaperStorage, WallpaperStorage {
  readonly map = new Map<string, string>()
  getItem(key: string): string | null { return this.map.get(key) ?? null }
  setItem(key: string, value: string): void { this.map.set(key, value) }
  removeItem(key: string): void { this.map.delete(key) }
}

class FakeImages implements WallpaperImageStore {
  readonly records = new Map<string, StoredImageRecord>()
  put = vi.fn(async (record: StoredImageRecord) => { this.records.set(record.key, record) })
  get = vi.fn(async (key: string) => this.records.get(key))
  delete = vi.fn(async (key: string) => { this.records.delete(key) })
}

const entry = (url: string, extra: Partial<RecentWallpaperEntry> = {}): RecentWallpaperEntry => ({
  url, title: 'Title', source: 'openverse.org', addedAt: 1, ...extra,
})
const blob = (): Blob => new Blob(['image'], { type: 'image/png' })
const flush = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('recent wallpaper history', () => {
  it('adds newest first, dedupes by URL and caps at 24', () => {
    let entries: readonly RecentWallpaperEntry[] = []
    for (let index = 0; index < 30; index += 1) {
      entries = addRecentEntry(entries, entry(`https://cdn.example/${index}.jpg`, { addedAt: index }))
    }
    expect(entries).toHaveLength(MAX_RECENT_WALLPAPERS)
    expect(entries[0]?.url).toBe('https://cdn.example/29.jpg')
    const refreshed = addRecentEntry(entries, entry('https://cdn.example/20.jpg', { title: 'Updated', addedAt: 99 }))
    expect(refreshed[0]).toMatchObject({ url: 'https://cdn.example/20.jpg', title: 'Updated' })
    expect(refreshed.filter(candidate => candidate.url === 'https://cdn.example/20.jpg')).toHaveLength(1)
  })

  it('drops non-https and malformed entries', () => {
    expect(parseRecentEntry({ url: 'http://example.com/a.jpg' })).toBeUndefined()
    expect(parseRecentEntry({ url: 'javascript:alert(1)' })).toBeUndefined()
    expect(parseRecentEntry({ url: 'https://example.com/a.jpg', title: 42, addedAt: 'x' }))
      .toMatchObject({ url: 'https://example.com/a.jpg', addedAt: 0 })
    expect(parseRecentEntry('nope')).toBeUndefined()
  })

  it('persists, reads, and clears (corrupt JSON ignored)', () => {
    const storage = new MemoryStorage()
    expect(readRecentWallpapers(storage)).toEqual([])
    const next = rememberRecentWallpaper(storage, entry('https://cdn.example/a.jpg', { thumbnail: 'https://cdn.example/a-t.jpg' }))
    expect(next).toHaveLength(1)
    expect(readRecentWallpapers(storage)[0]).toMatchObject({ url: 'https://cdn.example/a.jpg' })
    storage.setItem(RECENT_WALLPAPER_KEY, '{broken')
    expect(readRecentWallpapers(storage)).toEqual([])
    rememberRecentWallpaper(storage, entry('https://cdn.example/b.jpg'))
    clearRecentWallpapers(storage)
    expect(storage.getItem(RECENT_WALLPAPER_KEY)).toBeNull()
    expect(readRecentWallpapers(undefined)).toEqual([])
  })
})

describe('remote image cache', () => {
  it('derives a deterministic remote-<hash> key', () => {
    expect(remoteCacheKey('https://cdn.example/a.jpg')).toBe(remoteCacheKey('https://cdn.example/a.jpg'))
    expect(remoteCacheKey('https://cdn.example/a.jpg')).toMatch(/^remote-[0-9a-f]{8}$/)
    expect(remoteCacheKey('https://cdn.example/b.jpg')).not.toBe(remoteCacheKey('https://cdn.example/a.jpg'))
  })

  it('stores an image blob in the existing store; failures are non-fatal', async () => {
    const images = new FakeImages()
    const fetchImpl = vi.fn(async () => new Response(blob(), { status: 200, headers: { 'content-type': 'image/png' } }))
    const result = await cacheRemoteImage('https://cdn.example/a.jpg', { images, fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.key).toBe(remoteCacheKey('https://cdn.example/a.jpg'))
      expect(images.records.get(result.key)?.type).toBe('image/png')
    }
    expect(await isRemoteCached('https://cdn.example/a.jpg', images)).toBe(true)
    expect((await loadCachedRemote('https://cdn.example/a.jpg', images))?.blob).toBeInstanceOf(Blob)
    await deleteCachedRemote('https://cdn.example/a.jpg', images)
    expect(await isRemoteCached('https://cdn.example/a.jpg', images)).toBe(false)

    const notImage = vi.fn(async () => new Response('x', { status: 200, headers: { 'content-type': 'text/html' } }))
    expect(await cacheRemoteImage('https://cdn.example/b.jpg', { images, fetchImpl: notImage as unknown as typeof fetch }))
      .toEqual({ ok: false, reason: 'invalid' })
    const failing = vi.fn(async () => { throw new TypeError('cors') })
    expect(await cacheRemoteImage('https://cdn.example/c.jpg', { images, fetchImpl: failing as unknown as typeof fetch }))
      .toEqual({ ok: false, reason: 'network' })
    const big = vi.fn(async () => new Response(new Blob([new Uint8Array(REMOTE_CACHE_MAX_BYTES + 1)]), { status: 200, headers: { 'content-type': 'image/png' } }))
    expect(await cacheRemoteImage('https://cdn.example/d.jpg', { images, fetchImpl: big as unknown as typeof fetch }))
      .toEqual({ ok: false, reason: 'invalid' })
    expect(await cacheRemoteImage('http://example.com/x.jpg', { images })).toEqual({ ok: false, reason: 'invalid' })
    expect(await cacheRemoteImage('https://cdn.example/e.jpg', { images: undefined })).toEqual({ ok: false, reason: 'unsupported' })
  })
})

describe('controller renders cached remote images', () => {
  it('hydrates a cached blob for a persisted remote selection and revokes it on dispose', async () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      kind: 'remote', url: 'https://cdn.example/a.jpg', ...DEFAULT_WALLPAPER_EFFECTS,
    }))
    const images = new FakeImages()
    images.records.set(remoteCacheKey('https://cdn.example/a.jpg'), {
      key: remoteCacheKey('https://cdn.example/a.jpg'), name: 'a.jpg', type: 'image/png', size: 3, blob: blob(),
    })
    const urls = { create: () => 'blob:fake-1', revoke: vi.fn() }
    const doc = new FakeDocument()
    const controller = createWallpaperController({ storage, document: doc as never, images, objectUrls: urls })
    controller.start()
    await flush()
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain("url('blob:fake-1')")
    expect(controller.getRenderImage()).toBe("url('blob:fake-1')")
    controller.dispose()
    expect(urls.revoke).toHaveBeenCalledWith('blob:fake-1')
  })

  it('falls back to the remote URL when no cache exists and adopts a late blob', async () => {
    const storage = new MemoryStorage()
    const images = new FakeImages()
    const urls: string[] = []
    const doc = new FakeDocument()
    const controller = createWallpaperController({
      storage, document: doc as never, images,
      objectUrls: { create: () => { const url = `blob:${urls.length + 1}`; urls.push(url); return url }, revoke: vi.fn() },
    })
    controller.start()
    controller.setSelection({ kind: 'remote', url: 'https://cdn.example/a.jpg' })
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain("url('https://cdn.example/a.jpg')")
    controller.setSelection({ kind: 'remote', url: 'https://cdn.example/a.jpg' }, blob())
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain("url('blob:1')")
    controller.dispose()
  })
})
