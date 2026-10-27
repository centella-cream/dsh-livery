/**
 * Remote cache v2: sourceUrl verification (32-bit key collision rejection),
 * cancellation of in-flight downloads, and the clear-all-local-data operation
 * with its UI result contract.
 */
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', async () => {
  const React = await import('react')
  type AnyProps = Record<string, unknown>
  const passthrough = (tag: string) => (props: AnyProps) =>
    React.createElement(tag, props as never)
  return {
    Button: passthrough('button'),
    Input: passthrough('input'),
    Tag: passthrough('span'),
    Modal: () => null,
    Toast: () => null,
    writeClipboard: async () => true,
  }
})

import {
  REMOTE_CACHE_INDEX_KEY,
  cacheRemoteImage,
  createRemoteCacheCancellation,
  deleteCachedRemote,
  loadCachedRemote,
  readRemoteCacheIndex,
  remoteCacheKey,
  touchCachedRemote,
} from '../../src/client/wallpaper/cache.js'
import type { RemoteCacheStorage } from '../../src/client/wallpaper/cache.js'
import {
  clearAllLocalWallpaperData,
  clearableRecentUrls,
  createUploadRecord,
  evictedRecentUrls,
  pruneStaleUploads,
} from '../../src/client/wallpaper/lifecycle.js'
import type { WallpaperLocalStorage } from '../../src/client/wallpaper/lifecycle.js'
import { RECENT_WALLPAPER_KEY } from '../../src/client/wallpaper/history.js'
import { WALLPAPER_STORAGE_KEY } from '../../src/client/wallpaper.js'
import type { StoredImageRecord, WallpaperImageStore } from '../../src/client/wallpaper/storage.js'
import { WallpaperDataClear, wallpaperDataClearMessage, wallpaperDataClearStatusKey, runWallpaperDataClear } from '../../src/client/ui/WallpaperDataClear.js'
import { enUS, zhCN } from '../../src/i18n/index.js'

class MemoryStorage implements RemoteCacheStorage, WallpaperLocalStorage {
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
  list = vi.fn(async () => [...this.records.values()])
  clear = vi.fn(async () => { this.records.clear() })
}

const blob = (bytes = 8, type = 'image/png'): Blob => new Blob([new Uint8Array(bytes)], { type })
const pngResponse = (body: Blob): Response => new Response(body, { status: 200, headers: { 'content-type': 'image/png' } })

const translate = (dict: Record<string, string>) =>
  (key: string, params?: Record<string, unknown>): string => {
    const template = dict[key] ?? `!${key}`
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? `{${name}}`))
  }

const uploadRecord = (key: string, extra: Partial<StoredImageRecord> = {}): StoredImageRecord => ({
  ...createUploadRecord(key, blob(), 5),
  ...extra,
})
const remoteRecord = (url: string, extra: Partial<StoredImageRecord> = {}): StoredImageRecord => ({
  key: remoteCacheKey(url),
  kind: 'remote',
  size: 8,
  createdAt: 5,
  lastUsedAt: 5,
  sourceUrl: url,
  blob: blob(),
  ...extra,
})

describe('remote cache sourceUrl verification', () => {
  it('stores the source URL and v2 metadata, and load returns the verified record', async () => {
    const images = new FakeImages()
    const storage = new MemoryStorage()
    const result = await cacheRemoteImage('https://cdn.example/a.jpg', {
      images,
      storage,
      fetchImpl: vi.fn(async () => pngResponse(blob())) as unknown as typeof fetch,
    })
    expect(result.ok).toBe(true)
    const stored = images.records.get(remoteCacheKey('https://cdn.example/a.jpg'))
    expect(stored).toMatchObject({
      kind: 'remote',
      sourceUrl: 'https://cdn.example/a.jpg',
      size: 8,
    })
    expect(stored?.createdAt).toBeGreaterThan(0)
    expect(stored?.lastUsedAt).toBe(stored?.createdAt)
    expect(readRemoteCacheIndex(storage)[0]).toMatchObject({ url: 'https://cdn.example/a.jpg' })
    expect(await loadCachedRemote('https://cdn.example/a.jpg', images)).toBe(stored)
    // Touching refreshes the LRU timestamp without dropping the record.
    const touched = await touchCachedRemote('https://cdn.example/a.jpg', images)
    expect(touched?.sourceUrl).toBe('https://cdn.example/a.jpg')
  })

  it('rejects a key collision instead of showing another URL’s image', async () => {
    const images = new FakeImages()
    const urlA = 'https://cdn.example/collision-a.jpg'
    const urlB = 'https://cdn.example/collision-b.jpg'
    const keyA = remoteCacheKey(urlA)
    // Simulate the 32-bit hash colliding: the record under A's key carries B's URL.
    images.records.set(keyA, remoteRecord(urlB, { key: keyA }))
    expect(await loadCachedRemote(urlA, images)).toBeUndefined()
    // Deleting A must not delete B's colliding (mismatched) blob.
    await deleteCachedRemote(urlA, images)
    expect(images.records.get(keyA)?.sourceUrl).toBe(urlB)
    // A real B record under B's own key still loads and verifies.
    images.records.set(remoteCacheKey(urlB), remoteRecord(urlB))
    expect((await loadCachedRemote(urlB, images))?.sourceUrl).toBe(urlB)
  })

  it('deletes cached blobs on history eviction/clear but keeps the current wallpaper', async () => {
    const images = new FakeImages()
    const storage = new MemoryStorage()
    const a = 'https://cdn.example/a.jpg'
    const b = 'https://cdn.example/b.jpg'
    images.records.set(remoteCacheKey(a), remoteRecord(a))
    images.records.set(remoteCacheKey(b), remoteRecord(b))
    const previous = [{ url: a }, { url: b }]
    const next = [{ url: a }]
    for (const url of evictedRecentUrls(previous, next, a)) {
      await deleteCachedRemote(url, images, storage)
    }
    expect(await loadCachedRemote(a, images)).toBeDefined()
    expect(await loadCachedRemote(b, images)).toBeUndefined()
    await deleteCachedRemote(a, images, storage)
    expect(await loadCachedRemote(a, images)).toBeUndefined()

    // Clearing history keeps the blob backing the applied remote wallpaper.
    images.records.set(remoteCacheKey(a), remoteRecord(a))
    const clearable = clearableRecentUrls([{ url: a }], a)
    expect(clearable).toEqual([])
    for (const url of clearable) await deleteCachedRemote(url, images, storage)
    expect(await loadCachedRemote(a, images)).toBeDefined()
  })

  it('treats legacy remote rows without a source URL as cache misses', async () => {
    const images = new FakeImages()
    const key = remoteCacheKey('https://cdn.example/a.jpg')
    images.records.set(key, { key, kind: 'remote', size: 8, createdAt: 1, lastUsedAt: 1, blob: blob() })
    expect(await loadCachedRemote('https://cdn.example/a.jpg', images)).toBeUndefined()
  })
})

describe('remote cache cancellation', () => {
  it('returns cancelled for an already-aborted signal without fetching or writing', async () => {
    const images = new FakeImages()
    const fetchImpl = vi.fn(async () => pngResponse(blob())) as unknown as typeof fetch
    const controller = new AbortController()
    controller.abort()
    const result = await cacheRemoteImage('https://cdn.example/a.jpg', { images, fetchImpl, signal: controller.signal })
    expect(result).toEqual({ ok: false, reason: 'cancelled' })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(images.put).not.toHaveBeenCalled()
  })

  it('aborts an in-flight download when the selection changes (no IndexedDB write)', async () => {
    const images = new FakeImages()
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })) as unknown as typeof fetch
    const controller = new AbortController()
    const pending = cacheRemoteImage('https://cdn.example/slow.jpg', { images, fetchImpl, signal: controller.signal })
    controller.abort()
    expect(await pending).toEqual({ ok: false, reason: 'cancelled' })
    expect(images.put).not.toHaveBeenCalled()
  })

  it('provides a reusable cancellation handle for the panel/controller', () => {
    const handle = createRemoteCacheCancellation()
    const first = handle.reset()
    expect(first?.aborted).toBe(false)
    const second = handle.reset()
    expect(first?.aborted).toBe(true)
    expect(second?.aborted).toBe(false)
    expect(handle.signal).toBe(second)
    handle.cancel()
    expect(second?.aborted).toBe(true)
    expect(handle.signal).toBeUndefined()
    handle.cancel()
  })
})

describe('upload lifecycle v2', () => {
  it('creates a v2 upload record from the validated file/blob', () => {
    const record = createUploadRecord('upload-1700000000000-abc', blob(12), 77)
    expect(record).toEqual({
      key: 'upload-1700000000000-abc',
      kind: 'upload',
      size: 12,
      createdAt: 77,
      lastUsedAt: 77,
      blob: expect.any(Blob),
    })
  })

  it('prunes every upload except the currently applied one', async () => {
    const images = new FakeImages()
    images.records.set('upload-current', uploadRecord('upload-current'))
    images.records.set('upload-stale-a', uploadRecord('upload-stale-a'))
    images.records.set('upload-stale-b', uploadRecord('upload-stale-b'))
    images.records.set('remote-keep', remoteRecord('https://cdn.example/a.jpg'))
    const result = await pruneStaleUploads(images, 'upload-current')
    expect([...result.removed].sort()).toEqual(['upload-stale-a', 'upload-stale-b'])
    expect(result.errors).toEqual([])
    expect([...images.records.keys()].sort()).toEqual(['remote-keep', 'upload-current'])
  })

  it('reports failed stale-upload deletions without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const images: WallpaperImageStore = {
      put: async () => undefined,
      get: async () => undefined,
      delete: async () => { throw new Error('locked') },
      list: async () => [uploadRecord('upload-a'), uploadRecord('upload-b')],
      clear: async () => undefined,
    }
    const result = await pruneStaleUploads(images, 'upload-b')
    expect(result.removed).toEqual([])
    expect(result.errors).toEqual(['upload-a'])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
    expect(await pruneStaleUploads(undefined, undefined)).toEqual({ removed: [], errors: [] })
  })
})

describe('clear all local wallpaper data', () => {
  it('removes non-current images and history but keeps the current wallpaper image/state', async () => {
    const images = new FakeImages()
    const storage = new MemoryStorage()
    const current = uploadRecord('upload-current')
    images.records.set(current.key, current)
    images.records.set('upload-stale', uploadRecord('upload-stale'))
    images.records.set(remoteCacheKey('https://cdn.example/a.jpg'), remoteRecord('https://cdn.example/a.jpg'))
    storage.setItem(RECENT_WALLPAPER_KEY, JSON.stringify([{ url: 'https://cdn.example/a.jpg', addedAt: 1 }]))
    storage.setItem(REMOTE_CACHE_INDEX_KEY, JSON.stringify([{ url: 'https://cdn.example/a.jpg', key: 'remote-x', size: 8, usedAt: 1 }]))
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({ kind: 'upload', key: 'upload-current' }))

    const result = await clearAllLocalWallpaperData({
      images,
      storage,
      selection: { kind: 'upload', key: 'upload-current' },
    })
    expect(result.status).toBe('cleared')
    expect(result.removedImages).toBe(2)
    expect(result.keptImages).toBe(1)
    expect(result.clearedHistory).toBe(true)
    expect(result.clearedIndex).toBe(true)
    expect(result.errors).toEqual([])
    expect([...images.records.keys()]).toEqual(['upload-current'])
    expect(storage.getItem(WALLPAPER_STORAGE_KEY)).not.toBeNull()
  })

  it('protects the current remote cache entry and reports an empty store', async () => {
    const images = new FakeImages()
    const storage = new MemoryStorage()
    const currentUrl = 'https://cdn.example/current.jpg'
    images.records.set(remoteCacheKey(currentUrl), remoteRecord(currentUrl))
    storage.setItem(RECENT_WALLPAPER_KEY, JSON.stringify([{ url: currentUrl, addedAt: 1 }]))
    const kept = await clearAllLocalWallpaperData({ images, storage, selection: { kind: 'remote', url: currentUrl } })
    expect(kept.status).toBe('cleared')
    expect(kept.clearedHistory).toBe(true)
    expect(kept.removedImages).toBe(0)
    expect(kept.keptImages).toBe(1)
    expect([...images.records.keys()]).toEqual([remoteCacheKey(currentUrl)])

    const empty = await clearAllLocalWallpaperData({
      images: new FakeImages(),
      storage: new MemoryStorage(),
      selection: { kind: 'builtin', id: 'aurora' },
    })
    expect(empty.status).toBe('empty')
    expect(empty.errors).toEqual([])
  })

  it('reports partial failures without losing the surviving record', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const failing: WallpaperImageStore = {
      put: async () => undefined,
      get: async () => undefined,
      delete: async (key: string) => {
        if (key === 'upload-locked') throw new Error('locked')
      },
      list: async () => [uploadRecord('upload-locked'), uploadRecord('upload-ok')],
      clear: async () => undefined,
    }
    const result = await clearAllLocalWallpaperData({ images: failing, storage: new MemoryStorage(), selection: undefined })
    expect(result.status).toBe('partial')
    expect(result.removedImages).toBe(1)
    expect(result.errors).toEqual(['upload-locked'])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('runs with injected defaults and exposes the localized result copy', async () => {
    const images = new FakeImages()
    const storage = new MemoryStorage()
    images.records.set('upload-stale', uploadRecord('upload-stale'))
    const result = await runWallpaperDataClear({
      images,
      storage,
      selection: undefined,
    })
    expect(result.status).toBe('cleared')
    expect(result.removedImages).toBe(1)

    const en = translate(enUS as unknown as Record<string, string>)
    const zh = translate(zhCN as unknown as Record<string, string>)
    expect(wallpaperDataClearStatusKey('cleared')).toBe('wallpaper.clearLocal.done')
    expect(wallpaperDataClearStatusKey('empty')).toBe('wallpaper.clearLocal.empty')
    expect(wallpaperDataClearStatusKey('partial')).toBe('wallpaper.clearLocal.partial')
    expect(wallpaperDataClearMessage(en, result)).toContain('1')
    expect(wallpaperDataClearMessage(zh, result)).toContain('1')
    expect(wallpaperDataClearMessage(en, { ...result, status: 'empty', removedImages: 0 })).toBe(enUS['wallpaper.clearLocal.empty'])
  })
})

describe('clear-local-data UI contract', () => {
  it('server-renders the stable control hook and localized copy', () => {
    const html = renderToStaticMarkup(
      <WallpaperDataClear t={translate(enUS as unknown as Record<string, string>)} />,
    )
    expect(html).toContain('data-testid="wallpaper-clear-local-data"')
    expect(html).toContain(enUS['wallpaper.clearLocal.button'])
    expect(html).toContain(enUS['wallpaper.clearLocal.hint'])
    expect(html).not.toContain('data-testid="wallpaper-clear-local-result"')

    const zhHtml = renderToStaticMarkup(
      <WallpaperDataClear t={translate(zhCN as unknown as Record<string, string>)} />,
    )
    expect(zhHtml).toContain(zhCN['wallpaper.clearLocal.button'])
  })
})
