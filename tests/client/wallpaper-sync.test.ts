/** Multi-tab wallpaper/recent sync: revision/sourceId rules + controller integration. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createTabSourceId,
  parseExternalWallpaperState,
  readRecentFromStorageEvent,
  shouldApplyExternalState,
} from '../../src/client/wallpaper/sync.js'
import { createWallpaperController } from '../../src/client/wallpaper/controller.js'
import type { WallpaperStorage } from '../../src/client/wallpaper/controller.js'
import { DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, serializeWallpaperState, WALLPAPER_STORAGE_KEY } from '../../src/client/wallpaper.js'
import { RECENT_WALLPAPER_KEY } from '../../src/client/wallpaper/history.js'
import { WALLPAPER_STYLE_ID } from '../../src/client/wallpaper/apply.js'
import { FakeDocument, flush } from './fixtures.js'

class MemoryStorage implements WallpaperStorage {
  readonly map = new Map<string, string>()
  writes = 0
  getItem(key: string): string | null { return this.map.get(key) ?? null }
  setItem(key: string, value: string): void { this.writes += 1; this.map.set(key, value) }
  removeItem(key: string): void { this.map.delete(key) }
}

class FakeEventTarget {
  readonly listeners = new Set<(event: { key: string | null; newValue: string | null }) => void>()
  addEventListener(_type: 'storage', listener: (event: { key: string | null; newValue: string | null }) => void): void { this.listeners.add(listener) }
  removeEventListener(_type: 'storage', listener: (event: { key: string | null; newValue: string | null }) => void): void { this.listeners.delete(listener) }
  emit(event: { key: string | null; newValue: string | null }): void { for (const listener of this.listeners) listener(event) }
}

const record = (revision: number, url: string, sourceId?: string): string => JSON.stringify({
  ...serializeWallpaperState({ kind: 'remote', url }, DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, revision),
  ...(sourceId === undefined ? {} : { sourceId }),
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('sync helpers', () => {
  it('generates distinct tab source ids', () => {
    const first = createTabSourceId()
    const second = createTabSourceId()
    expect(first.length).toBeGreaterThan(0)
    expect(second.length).toBeGreaterThan(0)
    expect(first).not.toBe(second)
  })

  it('parses valid external records and rejects invalid/absent ones', () => {
    const parsed = parseExternalWallpaperState(record(4, 'https://cdn.example/a.jpg', 'tab-b'))
    expect(parsed?.state.revision).toBe(4)
    expect(parsed?.sourceId).toBe('tab-b')
    expect(parseExternalWallpaperState(null)).toBeUndefined()
    expect(parseExternalWallpaperState('{broken')).toBeUndefined()
    expect(parseExternalWallpaperState(JSON.stringify({ schemaVersion: 99 }))).toBeUndefined()
  })

  it('adopts only strictly newer revisions from another tab, ignoring own echoes', () => {
    const base = { incomingSourceId: 'tab-b', ownSourceId: 'tab-a', lastPublishedRaw: undefined, incomingRaw: 'x' }
    expect(shouldApplyExternalState({ ...base, currentRevision: 1, incomingRevision: 2 })).toBe(true)
    expect(shouldApplyExternalState({ ...base, currentRevision: 2, incomingRevision: 2 })).toBe(false)
    expect(shouldApplyExternalState({ ...base, currentRevision: 2, incomingRevision: 1 })).toBe(false)
    expect(shouldApplyExternalState({ ...base, currentRevision: 1, incomingRevision: 2, incomingSourceId: 'tab-a' })).toBe(false)
    expect(shouldApplyExternalState({ ...base, currentRevision: 1, incomingRevision: 2, lastPublishedRaw: 'x' })).toBe(false)
  })

  it('reads recent history only for its own key', () => {
    const storage = new MemoryStorage()
    storage.setItem(RECENT_WALLPAPER_KEY, JSON.stringify([{ url: 'https://cdn.example/a.jpg', addedAt: 1 }]))
    expect(readRecentFromStorageEvent({ key: 'other', newValue: 'x' }, storage)).toBeUndefined()
    expect(readRecentFromStorageEvent({ key: RECENT_WALLPAPER_KEY, newValue: '[]' }, storage)?.[0]?.url)
      .toBe('https://cdn.example/a.jpg')
    expect(readRecentFromStorageEvent({ key: RECENT_WALLPAPER_KEY, newValue: null }, storage)).toEqual([])
  })
})

describe('controller multi-tab sync', () => {
  function setup() {
    const storage = new MemoryStorage()
    const events = new FakeEventTarget()
    const doc = new FakeDocument()
    const controller = createWallpaperController({
      storage, document: doc as never, images: undefined, objectUrls: undefined, sourceId: 'tab-a', eventTarget: events,
    })
    controller.start()
    return { storage, events, doc, controller }
  }

  it('applies newer external revisions in one transition without echoing a save', async () => {
    const { storage, events, controller } = setup()
    storage.map.set(WALLPAPER_STORAGE_KEY, record(7, 'https://cdn.example/b.jpg', 'tab-b'))
    const writesBefore = storage.writes
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(7, 'https://cdn.example/b.jpg', 'tab-b') })
    await flush()
    const snapshot = controller.getSnapshot()
    expect(snapshot.revision).toBe(7)
    expect(snapshot.selection).toEqual({ kind: 'remote', url: 'https://cdn.example/b.jpg' })
    expect(storage.writes).toBe(writesBefore) // external adoption does not write back
  })

  it('applies a cross-tab clear tombstone with its revision', async () => {
    const { events, controller } = setup()
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(6, 'https://cdn.example/a.jpg', 'tab-b') })
    const clearRecord = JSON.stringify({
      ...serializeWallpaperState(undefined, DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, 7),
      sourceId: 'tab-b',
    })
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: clearRecord })
    expect(controller.getSnapshot().selection).toBeUndefined()
    expect(controller.getSnapshot().revision).toBe(7)
  })

  it('ignores older revisions and own-source echoes', async () => {
    const { events, controller } = setup()
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(5, 'https://cdn.example/a.jpg', 'tab-b') })
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(4, 'https://cdn.example/old.jpg', 'tab-b') })
    expect(controller.getSnapshot().revision).toBe(5)
    expect(controller.getSnapshot().selection).toEqual({ kind: 'remote', url: 'https://cdn.example/a.jpg' })
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(9, 'https://cdn.example/own.jpg', 'tab-a') })
    expect(controller.getSnapshot().revision).toBe(5)
  })

  it('cancels a pending debounce save when a newer external state arrives', async () => {
    vi.useFakeTimers()
    const { storage, events, controller } = setup()
    controller.setEffects({ blur: 20 })
    storage.map.set(WALLPAPER_STORAGE_KEY, record(11, 'https://cdn.example/b.jpg', 'tab-b'))
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(11, 'https://cdn.example/b.jpg', 'tab-b') })
    vi.advanceTimersByTime(500)
    expect(controller.getSnapshot().revision).toBe(11)
    expect(JSON.parse(storage.map.get(WALLPAPER_STORAGE_KEY) ?? '{}').revision).toBe(11)
  })

  it('does not let a stale async upload restore override a newer external revision', async () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      ...serializeWallpaperState({ kind: 'upload', key: 'upload-1-a' }, DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, 3),
      sourceId: 'tab-a',
    }))
    let resolveGet: ((value: undefined) => void) | undefined
    const images = {
      put: vi.fn(async () => undefined),
      get: vi.fn(() => new Promise<undefined>(resolve => { resolveGet = resolve })),
      delete: vi.fn(async () => undefined),
      list: vi.fn(async () => []),
      clear: vi.fn(async () => undefined),
    }
    const events = new FakeEventTarget()
    const doc = new FakeDocument()
    const controller = createWallpaperController({
      storage, document: doc as never, images, objectUrls: { create: () => 'blob:late', revoke: vi.fn() },
      sourceId: 'tab-a', eventTarget: events,
    })
    controller.start()
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(8, 'https://cdn.example/new.jpg', 'tab-b') })
    resolveGet?.(undefined)
    await flush()
    const snapshot = controller.getSnapshot()
    expect(snapshot.revision).toBe(8)
    expect(snapshot.selection).toEqual({ kind: 'remote', url: 'https://cdn.example/new.jpg' })
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent ?? '').toContain('https://cdn.example/new.jpg')
  })
})
