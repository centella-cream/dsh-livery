/**
 * Uploaded wallpapers: file validation, IndexedDB-backed hydration into an
 * object URL, persistence schema and object-URL revocation on replace/dispose.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_WALLPAPER_EFFECTS,
  DEFAULT_WALLPAPER_POSITION,
  WALLPAPER_STORAGE_KEY,
  parseStoredWallpaper,
  serializeWallpaperState,
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
    images.records.set('upload-1-abc', { key: 'upload-1-abc', kind: 'upload', size: 3, createdAt: 1, lastUsedAt: 1, blob: blob() })
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
    // Let the debounced save persist the cleared selection as a revisioned tombstone.
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')).toMatchObject({
      schemaVersion: 2,
      selection: { kind: 'none' },
    })
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

describe('session-only selections', () => {
  it('keeps effects/position changes in memory and does not persist a non-recoverable upload', () => {
    vi.useFakeTimers()
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2, revision: 1, selection: { kind: 'builtin', id: 'mist' },
      effects: DEFAULT_WALLPAPER_EFFECTS, position: { x: 50, y: 50 },
    }))
    const controller = createWallpaperController({ storage, document: new FakeDocument() as never, images: new FakeImages(), saveDelayMs: 200 })
    controller.start()
    controller.setState({ selection: { kind: 'upload', key: 'upload-session-only' } }, { persist: false })
    controller.setEffects({ blur: 20 })
    controller.setPosition({ x: 0, y: 100 })
    vi.advanceTimersByTime(500)
    const stored = JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')
    expect(stored.selection).toEqual({ kind: 'builtin', id: 'mist' })
    expect(controller.flushState()).toBe(false)
    expect(controller.getSnapshot().selection).toEqual({ kind: 'upload', key: 'upload-session-only' })
    expect(controller.getDurableSelection()).toEqual({ kind: 'builtin', id: 'mist' })
    controller.dispose()
  })
})

describe('persistence safety', () => {
  it('reports a failed localStorage write instead of pretending it was saved', () => {
    const storage = new MemoryStorage()
    const failing = Object.assign(storage, {
      setItem: (): void => { throw new Error('quota') },
    })
    const controller = createWallpaperController({
      storage: failing, document: new FakeDocument() as never, images: new FakeImages(), saveDelayMs: 0,
    })
    controller.start()
    controller.setSelection({ kind: 'remote', url: 'https://cdn.example/a.jpg' })
    expect(controller.flushState()).toBe(false)
    expect(controller.getSnapshot().selection).toEqual({ kind: 'remote', url: 'https://cdn.example/a.jpg' })
    controller.dispose()
  })

  it('keeps an upload selection when IndexedDB read fails (read error is not proof of deletion)', async () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      revision: 1,
      selection: { kind: 'upload', key: 'upload-1-abc' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      position: { x: 50, y: 50 },
    }))
    const images = new FakeImages()
    images.get = vi.fn(async () => { throw new Error('db read failed') })
    const controller = createWallpaperController({
      storage, document: new FakeDocument() as never, images, objectUrls: fakeObjectUrls(),
    })
    controller.start()
    await flush()
    expect(controller.getSnapshot().selection).toEqual({ kind: 'upload', key: 'upload-1-abc' })
    controller.dispose()
  })
})

/** Durable/persisted selection + selection-version contract (reviewer round 2). */
describe('durable selection and selection version', () => {
  const v2Record = (
    selection: { readonly kind: 'remote'; readonly url: string } | undefined,
    revision: number,
    sourceId = 'tab-a',
  ): string => JSON.stringify({
    ...serializeWallpaperState(selection, DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, revision),
    sourceId,
  })

  /** Storage whose writes fail on demand (quota/disabled simulation). */
  class FlakyStorage implements WallpaperStorage {
    readonly inner = new MemoryStorage()
    fail = false
    getItem = (key: string): string | null => this.inner.getItem(key)
    setItem = (key: string, value: string): void => {
      if (this.fail) throw new Error('quota')
      this.inner.setItem(key, value)
    }

    removeItem = (key: string): void => this.inner.removeItem(key)
  }

  it('seeds the durable selection from the stored record on start', () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, v2Record({ kind: 'remote', url: 'https://cdn.example/a.jpg' }, 4))
    const controller = createWallpaperController({
      storage, document: new FakeDocument() as never, images: new FakeImages(), objectUrls: fakeObjectUrls(),
    })
    expect(controller.getDurableSelection()).toBeUndefined()
    // The persisted reader works before start as well.
    expect(controller.getPersistedSelection()).toEqual({ kind: 'remote', url: 'https://cdn.example/a.jpg' })
    controller.start()
    expect(controller.getDurableSelection()).toEqual({ kind: 'remote', url: 'https://cdn.example/a.jpg' })
    expect(controller.getPersistedSelection()).toEqual({ kind: 'remote', url: 'https://cdn.example/a.jpg' })
    expect(controller.getSelectionVersion()).toBe(1)
    controller.dispose()
  })

  it('reads the persisted selection defensively (absent/corrupt/legacy/tombstone)', () => {
    const storage = new MemoryStorage()
    const controller = createWallpaperController({
      storage, document: new FakeDocument() as never, images: new FakeImages(), objectUrls: fakeObjectUrls(),
    })
    expect(controller.getPersistedSelection()).toBeUndefined()
    storage.setItem(WALLPAPER_STORAGE_KEY, '{broken')
    expect(controller.getPersistedSelection()).toBeUndefined()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({ schemaVersion: 99, selection: { kind: 'none' } }))
    expect(controller.getPersistedSelection()).toBeUndefined()
    // A legacy v1 flat record migrates on read.
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      kind: 'remote', url: 'https://cdn.example/legacy.jpg', blur: 8, dim: 25, frost: 35, atmosphere: 30,
    }))
    expect(controller.getPersistedSelection()).toEqual({ kind: 'remote', url: 'https://cdn.example/legacy.jpg' })
    // A revisioned clear tombstone has no persisted selection.
    storage.setItem(WALLPAPER_STORAGE_KEY, v2Record(undefined, 5))
    expect(controller.getPersistedSelection()).toBeUndefined()
    controller.dispose()
  })

  it('keeps the previous durable selection when the new write fails, and advances it after recovery', () => {
    const storage = new FlakyStorage()
    storage.inner.setItem(WALLPAPER_STORAGE_KEY, v2Record({ kind: 'remote', url: 'https://cdn.example/a.jpg' }, 4))
    const controller = createWallpaperController({
      storage, document: new FakeDocument() as never, images: new FakeImages(), objectUrls: fakeObjectUrls(),
    })
    controller.start()
    expect(controller.getDurableSelection()).toEqual({ kind: 'remote', url: 'https://cdn.example/a.jpg' })

    storage.fail = true
    controller.setSelection({ kind: 'remote', url: 'https://cdn.example/b.jpg' })
    expect(controller.flushState()).toBe(false)
    // Live state moved on, but only the confirmed-old selection is recoverable.
    expect(controller.getSnapshot().selection).toEqual({ kind: 'remote', url: 'https://cdn.example/b.jpg' })
    expect(controller.getDurableSelection()).toEqual({ kind: 'remote', url: 'https://cdn.example/a.jpg' })
    expect(controller.getPersistedSelection()).toEqual({ kind: 'remote', url: 'https://cdn.example/a.jpg' })

    storage.fail = false
    expect(controller.flushState()).toBe(true)
    expect(controller.getDurableSelection()).toEqual({ kind: 'remote', url: 'https://cdn.example/b.jpg' })
    expect(controller.getPersistedSelection()).toEqual({ kind: 'remote', url: 'https://cdn.example/b.jpg' })
    controller.dispose()
  })

  it('increments the selection version only when the selection identity changes', () => {
    const controller = createWallpaperController({
      storage: new MemoryStorage(),
      document: new FakeDocument() as never,
      images: new FakeImages(),
      objectUrls: fakeObjectUrls(),
    })
    controller.start()
    expect(controller.getSelectionVersion()).toBe(0)
    controller.setEffects({ blur: 22 })
    controller.setPosition({ x: 0, y: 0 })
    expect(controller.getSelectionVersion()).toBe(0)
    controller.setSelection({ kind: 'builtin', id: 'aurora' })
    expect(controller.getSelectionVersion()).toBe(1)
    controller.setEffects({ frost: 12 })
    controller.setSelection({ kind: 'builtin', id: 'aurora' })
    expect(controller.getSelectionVersion()).toBe(1)
    controller.clear()
    expect(controller.getSelectionVersion()).toBe(2)
    controller.setSelection({ kind: 'remote', url: 'https://cdn.example/c.jpg' })
    expect(controller.getSelectionVersion()).toBe(3)
    controller.dispose()
  })

  it('applies an async upload restore when only effects changed during the IndexedDB read', async () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      ...serializeWallpaperState(
        { kind: 'upload', key: 'upload-1-abc' },
        DEFAULT_WALLPAPER_EFFECTS,
        DEFAULT_WALLPAPER_POSITION,
        3,
      ),
      sourceId: 'tab-a',
    }))
    const images = new FakeImages()
    let resolveGet: ((value: StoredImageRecord | undefined) => void) | undefined
    images.get = vi.fn(() => new Promise<StoredImageRecord | undefined>(resolve => { resolveGet = resolve }))
    const doc = new FakeDocument()
    const controller = createWallpaperController({
      storage, document: doc as never, images, objectUrls: fakeObjectUrls(),
    })
    controller.start()
    // Effects/position bump the revision but not the selection identity, so the
    // upload restore must still commit its blob when it resolves.
    controller.setEffects({ blur: 22 })
    resolveGet?.({
      key: 'upload-1-abc', kind: 'upload', size: 3, createdAt: 1, lastUsedAt: 1, blob: blob(),
    })
    await flush()
    expect(controller.getSnapshot().selection).toEqual({ kind: 'upload', key: 'upload-1-abc' })
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent ?? '').toContain("url('blob:fake-1')")
    controller.dispose()
  })

  it('aborts an async upload commit when the selection changed during the IndexedDB read', async () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      ...serializeWallpaperState(
        { kind: 'upload', key: 'upload-1-abc' },
        DEFAULT_WALLPAPER_EFFECTS,
        DEFAULT_WALLPAPER_POSITION,
        3,
      ),
      sourceId: 'tab-a',
    }))
    const images = new FakeImages()
    let resolveGet: ((value: StoredImageRecord | undefined) => void) | undefined
    images.get = vi.fn(() => new Promise<StoredImageRecord | undefined>(resolve => { resolveGet = resolve }))
    const doc = new FakeDocument()
    const controller = createWallpaperController({
      storage, document: doc as never, images, objectUrls: fakeObjectUrls(),
    })
    controller.start()
    // A newer selection (e.g. adopted from another tab) owns the state now.
    controller.setSelection({ kind: 'remote', url: 'https://cdn.example/new.jpg' })
    resolveGet?.({
      key: 'upload-1-abc', kind: 'upload', size: 3, createdAt: 1, lastUsedAt: 1, blob: blob(),
    })
    await flush()
    expect(controller.getSnapshot().selection).toEqual({ kind: 'remote', url: 'https://cdn.example/new.jpg' })
    // The late upload blob must never be painted over the winning selection.
    const text = doc.getElementById(WALLPAPER_STYLE_ID)?.textContent ?? ''
    expect(text).not.toContain("url('blob:fake-1')")
    expect(text).not.toContain('upload-1-abc')
    controller.dispose()
  })
})
