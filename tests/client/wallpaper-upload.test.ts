/**
 * Uploaded wallpapers: file validation, IndexedDB-backed hydration into an
 * object URL, persistence schema and object-URL revocation on replace/dispose.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_WALLPAPER_EFFECTS,
  WALLPAPER_STORAGE_KEY,
  parseStoredWallpaper,
  toStoredWallpaper,
} from '../../src/client/wallpaper.js'
import { createWallpaperController } from '../../src/client/wallpaper/controller.js'
import type { WallpaperStorage } from '../../src/client/wallpaper/controller.js'
import { UPLOAD_MAX_BYTES, validateUploadFile } from '../../src/client/wallpaper/storage.js'
import type { StoredImageRecord, WallpaperImageStore } from '../../src/client/wallpaper/storage.js'
import { WALLPAPER_STYLE_ID } from '../../src/client/wallpaper/apply.js'
import { FakeDocument } from './fixtures.js'

class MemoryStorage implements WallpaperStorage {
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

function fakeObjectUrls(): { create: (blob: Blob) => string; revoke: (url: string) => void } {
  let counter = 0
  return {
    create: () => `blob:fake-${++counter}`,
    revoke: vi.fn(),
  }
}

const flush = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
}

const blob = (): Blob => new Blob(['image-bytes'], { type: 'image/png' })

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('upload validation', () => {
  it('accepts JPEG/PNG/WebP/AVIF within 10 MiB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/avif']) {
      expect(validateUploadFile({ name: 'a', type, size: 1024 })).toEqual({ ok: true })
    }
    expect(validateUploadFile({ name: 'a', type: 'image/png', size: UPLOAD_MAX_BYTES })).toEqual({ ok: true })
  })

  it('rejects wrong types, oversized and empty files', () => {
    expect(validateUploadFile({ type: 'image/gif', size: 10 })).toEqual({ ok: false, problem: 'type' })
    expect(validateUploadFile({ type: 'image/png', size: UPLOAD_MAX_BYTES + 1 })).toEqual({ ok: false, problem: 'size' })
    expect(validateUploadFile({ type: 'image/png', size: 0 })).toEqual({ ok: false, problem: 'empty' })
  })
})

describe('upload persistence schema', () => {
  it('roundtrips an upload selection and rejects malformed keys', () => {
    const stored = toStoredWallpaper({ kind: 'upload', key: 'upload-123-abc' }, DEFAULT_WALLPAPER_EFFECTS)
    expect(stored).toMatchObject({ kind: 'upload', key: 'upload-123-abc' })
    expect(parseStoredWallpaper(stored)?.selection).toEqual({ kind: 'upload', key: 'upload-123-abc' })
    expect(parseStoredWallpaper({ kind: 'upload', key: 'not-an-upload' })).toBeUndefined()
    expect(parseStoredWallpaper({ kind: 'upload' })).toBeUndefined()
  })
})

describe('upload controller lifecycle', () => {
  it('hydrates an upload blob into an object URL and revokes it on dispose', async () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      kind: 'upload', key: 'upload-1-abc', blur: 8, dim: 25, frost: 35, atmosphere: 30,
    }))
    const images = new FakeImages()
    images.records.set('upload-1-abc', { key: 'upload-1-abc', name: 'a.png', type: 'image/png', size: 3, blob: blob() })
    const urls = fakeObjectUrls()
    const doc = new FakeDocument()
    const controller = createWallpaperController({
      storage, document: doc as never, images, objectUrls: urls,
    })
    controller.start()
    await flush()
    expect(controller.getSnapshot().selection).toEqual({ kind: 'upload', key: 'upload-1-abc' })
    const text = doc.getElementById(WALLPAPER_STYLE_ID)?.textContent ?? ''
    expect(text).toContain("url('blob:fake-1')")
    expect(doc.body.getAttribute('data-dsh-wallpaper')).toBe('')
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).not.toBeNull()
    controller.dispose()
    expect(urls.revoke).toHaveBeenCalledWith('blob:fake-1')
  })

  it('clears a stale upload record when the blob is missing', async () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      kind: 'upload', key: 'upload-9-gone', blur: 8, dim: 25, frost: 35, atmosphere: 30,
    }))
    const images = new FakeImages()
    const doc = new FakeDocument()
    const controller = createWallpaperController({
      storage, document: doc as never, images, objectUrls: fakeObjectUrls(), saveDelayMs: 0,
    })
    controller.start()
    await flush()
    expect(controller.getSnapshot().selection).toBeUndefined()
    expect(doc.body.getAttribute('data-dsh-wallpaper')).toBeNull()
    // Let the debounced save persist the cleared selection.
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(storage.getItem(WALLPAPER_STORAGE_KEY)).toBeNull()
    controller.dispose()
  })

  it('applies a fresh upload immediately and revokes object URLs on replace', async () => {
    const storage = new MemoryStorage()
    const urls = fakeObjectUrls()
    const doc = new FakeDocument()
    const controller = createWallpaperController({
      storage, document: doc as never, images: new FakeImages(), objectUrls: urls,
    })
    controller.start()
    controller.setSelection({ kind: 'upload', key: 'upload-1-abc' }, blob())
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain("url('blob:fake-1')")
    controller.setSelection({ kind: 'builtin', id: 'forest' })
    expect(urls.revoke).toHaveBeenCalledWith('blob:fake-1')
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).not.toContain('blob:fake-1')
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('linear-gradient')
    controller.dispose()
  })

  it('keeps an upload session-only when no image store is available', async () => {
    const storage = new MemoryStorage()
    const urls = fakeObjectUrls()
    const doc = new FakeDocument()
    const controller = createWallpaperController({
      storage, document: doc as never, images: undefined, objectUrls: urls,
    })
    controller.start()
    controller.setSelection({ kind: 'upload', key: 'upload-2-session' }, blob())
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain("url('blob:fake-1')")
    // The selection still persists by key; hydration without a store leaves it
    // pending instead of crashing (session-only hint is the UI's job).
    expect(controller.getSnapshot().selection).toEqual({ kind: 'upload', key: 'upload-2-session' })
    controller.dispose()
  })
})
