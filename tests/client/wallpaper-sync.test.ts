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

  it('orders by revision first and then by the current winner source id (never the own id)', () => {
    const base = {
      currentRevision: 1,
      winnerSourceId: 'tab-w',
      incomingRevision: 2,
      incomingSourceId: 'tab-b',
      ownSourceId: 'tab-a',
      lastPublishedRaw: undefined,
      incomingRaw: 'x',
    }
    expect(shouldApplyExternalState(base)).toBe(true)
    expect(shouldApplyExternalState({ ...base, incomingRevision: 3 })).toBe(true)
    expect(shouldApplyExternalState({ ...base, incomingRevision: 1 })).toBe(false)
    expect(shouldApplyExternalState({ ...base, incomingRevision: 0 })).toBe(false)
    // Own echoes are ignored even when their revision is newer.
    expect(shouldApplyExternalState({ ...base, incomingSourceId: 'tab-a' })).toBe(false)
    // The local tab's last published bytes are ignored.
    expect(shouldApplyExternalState({ ...base, lastPublishedRaw: 'x' })).toBe(false)
    // Equal revision: compare the incoming source against the CURRENT WINNER,
    // not the receiving tab's own id (three-tab convergence).
    expect(shouldApplyExternalState({
      ...base, currentRevision: 2, incomingRevision: 2, winnerSourceId: 'tab-b', incomingSourceId: 'tab-c',
    })).toBe(true)
    expect(shouldApplyExternalState({
      ...base, currentRevision: 2, incomingRevision: 2, winnerSourceId: 'tab-c', incomingSourceId: 'tab-b',
    })).toBe(false)
    expect(shouldApplyExternalState({
      ...base, currentRevision: 2, incomingRevision: 2, winnerSourceId: 'tab-b', incomingSourceId: 'tab-b',
    })).toBe(false)
    // An incoming record without a source id can never beat a known winner, but
    // a known source id beats an unknown hydrated winner deterministically.
    expect(shouldApplyExternalState({
      ...base, currentRevision: 2, incomingRevision: 2, winnerSourceId: 'tab-b', incomingSourceId: undefined,
    })).toBe(false)
    expect(shouldApplyExternalState({
      ...base, currentRevision: 2, incomingRevision: 2, winnerSourceId: undefined, incomingSourceId: 'tab-b',
    })).toBe(true)
    expect(shouldApplyExternalState({
      ...base, currentRevision: 2, incomingRevision: 2, winnerSourceId: undefined, incomingSourceId: undefined,
    })).toBe(false)
    // A non-integer revision is not a usable ordering key.
    expect(shouldApplyExternalState({ ...base, incomingRevision: 2.5 })).toBe(false)
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

  it('breaks equal-revision concurrent writes deterministically by source id', async () => {
    const { storage, events, controller } = setup()
    const contender = JSON.stringify({
      ...serializeWallpaperState({ kind: 'remote', url: 'https://cdn.example/winner.jpg' }, DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, 6),
      sourceId: 'tab-z',
    })
    storage.map.set(WALLPAPER_STORAGE_KEY, contender)
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: contender })
    expect(controller.getSnapshot().revision).toBe(6)
    expect(controller.getSnapshot().selection).toEqual({ kind: 'remote', url: 'https://cdn.example/winner.jpg' })
    expect(JSON.parse(storage.map.get(WALLPAPER_STORAGE_KEY) ?? '{}').sourceId).toBe('tab-z')
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

  it('bumps the selection version only when the effective selection identity changes', () => {
    const { events, controller } = setup()
    expect(controller.getSelectionVersion()).toBe(0)
    // Effects/position changes bump the revision but never the selection version.
    controller.setEffects({ blur: 20 })
    controller.setPosition({ x: 0, y: 0 })
    expect(controller.getSelectionVersion()).toBe(0)
    controller.setSelection({ kind: 'remote', url: 'https://cdn.example/a.jpg' })
    expect(controller.getSelectionVersion()).toBe(1)
    // Re-selecting the same identity is not a change.
    controller.setSelection({ kind: 'remote', url: 'https://cdn.example/a.jpg' })
    controller.setEffects({ frost: 10 })
    expect(controller.getSelectionVersion()).toBe(1)
    // External adoption of a different identity bumps it, so async commits that
    // captured the version before the event can detect the change and abort.
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(5, 'https://cdn.example/b.jpg', 'tab-b') })
    expect(controller.getSelectionVersion()).toBe(2)
    // A newer revision carrying the SAME selection is not an identity change.
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(6, 'https://cdn.example/b.jpg', 'tab-b') })
    expect(controller.getSelectionVersion()).toBe(2)
    // A clear tombstone changes the effective identity.
    const clear = JSON.stringify({
      ...serializeWallpaperState(undefined, DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, 7),
      sourceId: 'tab-b',
    })
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: clear })
    expect(controller.getSnapshot().selection).toBeUndefined()
    expect(controller.getSelectionVersion()).toBe(3)
  })

  it('tie-breaks equal revisions against the current winner, not the own source id', () => {
    const { events, controller } = setup()
    // First the tab adopts revision 4 from tab-b, so tab-b is the current winner.
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(4, 'https://cdn.example/base.jpg', 'tab-b') })
    expect(controller.getSnapshot().revision).toBe(4)
    // A concurrent revision-4 write from tab-a loses against the current winner…
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(4, 'https://cdn.example/loser-a.jpg', 'tab-a') })
    expect(controller.getSnapshot().selection).toEqual({ kind: 'remote', url: 'https://cdn.example/base.jpg' })
    // …while a concurrent revision-4 write from tab-c beats it.
    events.emit({ key: WALLPAPER_STORAGE_KEY, newValue: record(4, 'https://cdn.example/winner-c.jpg', 'tab-c') })
    expect(controller.getSnapshot().selection).toEqual({ kind: 'remote', url: 'https://cdn.example/winner-c.jpg' })
    expect(controller.getSnapshot().revision).toBe(4)
  })

  it('converges three tabs to the max (revision, sourceId) for equal-revision writes in any delivery order', () => {
    const sourceIdOf = (raw: string): string | undefined => {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        return typeof parsed.sourceId === 'string' ? parsed.sourceId : undefined
      } catch {
        return undefined
      }
    }
    const run = (deliveryOrder: readonly number[]): void => {
      const map = new Map<string, string>([[WALLPAPER_STORAGE_KEY, record(5, 'https://cdn.example/base.jpg', 'tab-0')]])
      const pending: { tab: FakeEventTarget; event: { key: string; newValue: string } }[] = []
      const tabs: { sourceId: string; events: FakeEventTarget; controller: ReturnType<typeof createWallpaperController> }[] = []
      const storage: WallpaperStorage = {
        getItem: key => map.get(key) ?? null,
        setItem: (key, value) => {
          map.set(key, value)
          // Like real storage events: fan out to every document (the controller
          // still filters own echoes and identical published bytes).
          for (const tab of tabs) pending.push({ tab: tab.events, event: { key, newValue: value } })
        },
        removeItem: key => { map.delete(key) },
      }
      for (const sourceId of ['tab-a', 'tab-b', 'tab-c']) {
        const events = new FakeEventTarget()
        const controller = createWallpaperController({
          storage, document: new FakeDocument() as never, images: undefined, objectUrls: undefined,
          sourceId, eventTarget: events,
        })
        tabs.push({ sourceId, events, controller })
        controller.start()
      }
      // All three tabs write locally from the same persisted revision 5, so all
      // three produce revision 6 with a different source id.
      for (const tab of tabs) {
        tab.controller.setSelection({ kind: 'remote', url: `https://cdn.example/${tab.sourceId}.jpg` })
        expect(tab.controller.flushState()).toBe(true)
      }
      const first = pending.splice(0)
      expect(first).toHaveLength(9)
      for (const index of deliveryOrder) first[index]?.tab.emit(first[index]!.event)
      // Drain the convergence echoes in FIFO order; the guard catches loops.
      let guard = 0
      while (pending.length > 0 && guard < 100) {
        guard += 1
        const entry = pending.shift()
        entry?.tab.emit(entry.event)
      }
      expect(guard).toBeLessThan(100)
      for (const tab of tabs) {
        const snapshot = tab.controller.getSnapshot()
        expect(snapshot.revision, tab.sourceId).toBe(6)
        expect(snapshot.selection, tab.sourceId).toEqual({ kind: 'remote', url: 'https://cdn.example/tab-c.jpg' })
      }
      // The persisted winner is the deterministic maximum so a reload agrees.
      const stored = map.get(WALLPAPER_STORAGE_KEY) ?? ''
      expect(sourceIdOf(stored)).toBe('tab-c')
      expect(JSON.parse(stored).selection).toEqual({ kind: 'remote', url: 'https://cdn.example/tab-c.jpg' })
      for (const tab of tabs) tab.controller.dispose()
    }
    const orders: readonly number[][] = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
      [8, 7, 6, 5, 4, 3, 2, 1, 0],
      [0, 8, 1, 7, 2, 6, 3, 5, 4],
      [4, 2, 0, 5, 3, 1, 6, 7, 8],
    ]
    for (const order of orders) run(order)
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
      touch: vi.fn(async () => undefined),
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
    // The stale upload restore must not paint its blob URL over the winner.
    // (Remote URLs are never put in CSS directly; only a verified cache blob is.)
    const text = doc.getElementById(WALLPAPER_STYLE_ID)?.textContent ?? ''
    expect(text).not.toContain('blob:late')
    expect(text).not.toContain('upload-1-a')
  })
})
