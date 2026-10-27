/**
 * IndexedDB schema v2: v1 upload migration, list/clear APIs, defensive reads and
 * upload-key recovery, exercised through an injectable fake IndexedDB factory
 * (no browser/jsdom dependency).
 */
import { describe, expect, it } from 'vitest'
import {
  WALLPAPER_DB_NAME,
  WALLPAPER_DB_STORE,
  WALLPAPER_DB_VERSION,
  createIndexedDbImageStore,
  imageKindForKey,
  isUploadImageKey,
  migrateLegacyImageRecord,
  normalizeStoredImageRecord,
} from '../../src/client/wallpaper/storage.js'
import type { IdbFactoryLike } from '../../src/client/wallpaper/storage.js'

interface FakeRequest<T = unknown> {
  onsuccess: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  result?: T
}

interface FakeUpgradeRequest<T> extends FakeRequest<T> {
  onupgradeneeded: ((event: { oldVersion?: number }) => void) | null
}

const blob = (bytes = 8): Blob => new Blob([new Uint8Array(bytes)], { type: 'image/png' })

/** Minimal object store over a Map, delivering events asynchronously. */
class FakeObjectStore {
  constructor(
    private readonly transaction: FakeTransaction,
    private readonly rows: Map<string, unknown>,
  ) {}

  put(value: unknown, key: string): FakeRequest {
    return this.transaction.enqueue(() => { this.rows.set(key, value) })
  }

  get(key: string): FakeRequest {
    return this.transaction.enqueue(request => { request.result = this.rows.get(key) })
  }

  delete(key: string): FakeRequest {
    return this.transaction.enqueue(() => { this.rows.delete(key) })
  }

  getAll(): FakeRequest {
    return this.transaction.enqueue(request => { request.result = [...this.rows.values()] })
  }

  getAllKeys(): FakeRequest {
    return this.transaction.enqueue(request => {
      if (this.transaction.factory.failNextGetAllKeys) {
        this.transaction.factory.failNextGetAllKeys = false
        throw new Error('read failed')
      }
      request.result = [...this.rows.keys()]
    })
  }

  clear(): FakeRequest {
    return this.transaction.enqueue(() => { this.rows.clear() })
  }
}

/** Minimal transaction: settles after every queued fake request completed. */
class FakeTransaction {
  oncomplete: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onabort: ((event: unknown) => void) | null = null
  readonly store: FakeObjectStore
  private pending = 0
  private settled = false

  constructor(
    readonly factory: FakeFactory,
    rows: Map<string, unknown>,
    readonly mode: 'readonly' | 'readwrite' = 'readwrite',
  ) {
    this.store = new FakeObjectStore(this, rows)
    queueMicrotask(() => queueMicrotask(() => this.settleIfIdle()))
  }

  objectStore(_name: string): FakeObjectStore {
    return this.store
  }

  enqueue(task: (request: FakeRequest) => void): FakeRequest {
    const request: FakeRequest = { onsuccess: null, onerror: null }
    this.pending += 1
    queueMicrotask(() => {
      try {
        task(request)
        request.onsuccess?.({})
      } catch (error) {
        request.onerror?.(error)
      } finally {
        this.pending -= 1
        this.settleIfIdle()
      }
    })
    return request
  }

  private settleIfIdle(): void {
    if (this.settled || this.pending > 0) return
    this.settled = true
    queueMicrotask(() => this.oncomplete?.({}))
  }
}

/** Minimal database whose stores persist in the factory. */
class FakeDatabase {
  constructor(private readonly factory: FakeFactory) {}

  transaction(name: string, mode: 'readonly' | 'readwrite' = 'readonly'): FakeTransaction {
    const rows = this.factory.stores.get(name)
    if (rows === undefined) throw new Error(`missing object store: ${name}`)
    return new FakeTransaction(this.factory, rows, mode)
  }

  createObjectStore(name: string): unknown {
    if (this.factory.stores.has(name)) throw new Error('object store already exists')
    this.factory.stores.set(name, new Map())
    return {}
  }
}

/** Injectable IndexedDB factory fake with version + upgrade semantics. */
class FakeFactory {
  version: number | undefined
  readonly stores = new Map<string, Map<string, unknown>>()
  readonly requestedVersions: Array<number | undefined> = []
  readonly requestedNames: string[] = []
  failOpen = false
  failNextGetAllKeys = false

  constructor(initial?: { version: number; rows?: Record<string, unknown> }) {
    if (initial !== undefined) {
      this.version = initial.version
      this.stores.set(WALLPAPER_DB_STORE, new Map(Object.entries(initial.rows ?? {})))
    }
  }

  open(name: string, version?: number): FakeUpgradeRequest<FakeDatabase> {
    this.requestedVersions.push(version)
    this.requestedNames.push(name)
    const request: FakeUpgradeRequest<FakeDatabase> = {
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: new FakeDatabase(this),
    }
    const previous = this.version ?? 0
    const target = version ?? 1
    queueMicrotask(() => {
      try {
        if (this.failOpen) throw new Error('open blocked')
        if (target > previous) {
          this.version = target
          request.onupgradeneeded?.({ oldVersion: previous })
        }
        queueMicrotask(() => request.onsuccess?.({}))
      } catch {
        request.onerror?.({})
      }
    })
    return request
  }
}

const factoryAsIdb = (factory: FakeFactory): IdbFactoryLike => factory as unknown as IdbFactoryLike

const uploadKey = 'upload-1700000000000-abc'

describe('IndexedDB v2 store basics', () => {
  it('opens a fresh database at schema v2 and round-trips list/get/put/delete/clear', async () => {
    const factory = new FakeFactory()
    const store = createIndexedDbImageStore(factoryAsIdb(factory))
    expect(store).toBeDefined()
    await store!.put({
      key: uploadKey,
      kind: 'upload',
      size: 8,
      createdAt: 10,
      lastUsedAt: 20,
      blob: blob(),
    })
    await store!.put({
      key: 'remote-1234abcd',
      kind: 'remote',
      size: 8,
      createdAt: 11,
      lastUsedAt: 21,
      sourceUrl: 'https://cdn.example/a.jpg',
      blob: blob(),
    })
    expect(factory.requestedNames).toEqual([WALLPAPER_DB_NAME])
    expect(factory.requestedVersions).toEqual([WALLPAPER_DB_VERSION])
    expect(factory.version).toBe(WALLPAPER_DB_VERSION)

    const listed = await store!.list()
    expect(listed.map(record => record.key)).toEqual(['remote-1234abcd', uploadKey])
    expect(listed[0]).toMatchObject({ kind: 'remote', sourceUrl: 'https://cdn.example/a.jpg' })
    expect(listed[1]).toMatchObject({ kind: 'upload', createdAt: 10, lastUsedAt: 20 })

    // The primary key is the recovery link for uploads.
    expect((await store!.get(uploadKey))?.key).toBe(uploadKey)
    expect(await store!.get('upload-missing')).toBeUndefined()

    await store!.delete(uploadKey)
    expect(await store!.get(uploadKey)).toBeUndefined()

    await store!.clear()
    expect(await store!.list()).toEqual([])
  })

  it('returns undefined when no IndexedDB factory exists', () => {
    expect(createIndexedDbImageStore(undefined)).toBeUndefined()
  })

  it('rejects operations when the database cannot open', async () => {
    const factory = new FakeFactory()
    factory.failOpen = true
    const store = createIndexedDbImageStore(factoryAsIdb(factory))
    await expect(store!.list()).rejects.toThrow(/failed to open/)
  })
})

describe('v1 → v2 migration', () => {
  it('rewrites legacy upload rows, keeping the upload key and stamping timestamps', async () => {
    const rows = {
      [uploadKey]: { name: 'photo.png', type: 'image/png', size: 8, blob: blob() },
      'remote-deadbeef': { name: 'cached.jpg', type: 'image/jpeg', size: 8, blob: blob() },
      'upload-1700000000001-broken': { name: 'broken.png', type: 'image/png', size: 8 },
    }
    const factory = new FakeFactory({ version: 1, rows })
    const store = createIndexedDbImageStore(factoryAsIdb(factory))!
    const before = Date.now()
    const listed = await store.list()
    const after = Date.now()
    expect(factory.version).toBe(WALLPAPER_DB_VERSION)

    const byKey = new Map(listed.map(record => [record.key, record]))
    const upload = byKey.get(uploadKey)
    expect(upload).toMatchObject({ kind: 'upload', size: 8 })
    expect(upload?.createdAt).toBeGreaterThanOrEqual(before)
    expect(upload?.createdAt).toBeLessThanOrEqual(after)
    expect(upload?.lastUsedAt).toBe(upload?.createdAt)
    // No sourceUrl can be recovered for a legacy remote row: it stays a cache
    // miss for verification rather than being trusted blindly.
    const remote = byKey.get('remote-deadbeef')
    expect(remote?.kind).toBe('remote')
    expect(remote?.sourceUrl).toBeUndefined()
    // Unusable rows (no blob) are dropped so they cannot poison list/clear.
    expect(byKey.has('upload-1700000000001-broken')).toBe(false)
    // Upload key recovery: the migrated record can still resolve the selection.
    expect((await store.get(uploadKey))?.kind).toBe('upload')
  })

  it('keeps legacy rows readable when the migration rewrite fails (non-fatal)', async () => {
    const factory = new FakeFactory({
      version: 1,
      rows: { [uploadKey]: { name: 'photo.png', type: 'image/png', size: 8, blob: blob() } },
    })
    factory.failNextGetAllKeys = true
    const store = createIndexedDbImageStore(factoryAsIdb(factory))!
    // Migration could not read; the store still opens and normalizes on read.
    const listed = await store.list()
    expect(listed).toHaveLength(1)
    expect(listed[0]).toMatchObject({ key: uploadKey, kind: 'upload', size: 8 })
  })

  it('normalizes legacy-shaped rows inserted after the upgrade (defensive read)', async () => {
    const factory = new FakeFactory()
    const store = createIndexedDbImageStore(factoryAsIdb(factory))!
    await store.list()
    // Simulate a foreign/older writer pushing a v1 row into the v2 store.
    factory.stores.get(WALLPAPER_DB_STORE)!.set(uploadKey, { name: 'a.png', type: 'image/png', size: 8, blob: blob() })
    factory.stores.get(WALLPAPER_DB_STORE)!.set('remote-1234abcd', { sourceUrl: 'https://cdn.example/x.jpg', blob: blob() })
    const listed = await store.list()
    const byKey = new Map(listed.map(record => [record.key, record]))
    expect(byKey.get(uploadKey)).toMatchObject({ kind: 'upload', size: 8, createdAt: 0, lastUsedAt: 0 })
    expect(byKey.get('remote-1234abcd')).toMatchObject({ kind: 'remote', sourceUrl: 'https://cdn.example/x.jpg' })
  })
})

describe('record normalization helpers', () => {
  it('infers kind from the key prefix and never trusts stored size/type metadata', () => {
    expect(imageKindForKey('upload-1-abc')).toBe('upload')
    expect(imageKindForKey('remote-1234abcd')).toBe('remote')
    const record = normalizeStoredImageRecord(uploadKey, {
      name: 'photo.png', type: 'text/html', size: 1, kind: 'upload', blob: blob(9),
    })
    expect(record).toMatchObject({ key: uploadKey, kind: 'upload', size: 9 })
    expect(record && 'name' in record).toBe(false)
  })

  it('rejects rows without usable image bytes', () => {
    expect(normalizeStoredImageRecord(uploadKey, undefined)).toBeUndefined()
    expect(normalizeStoredImageRecord(uploadKey, 'nope')).toBeUndefined()
    expect(normalizeStoredImageRecord(uploadKey, { blob: new Blob([]) })).toBeUndefined()
    expect(normalizeStoredImageRecord('', { blob: blob() })).toBeUndefined()
  })

  it('stamps migration time only for rows without timestamps', () => {
    const migrated = migrateLegacyImageRecord(uploadKey, { blob: blob() }, 1234)
    expect(migrated).toMatchObject({ createdAt: 1234, lastUsedAt: 1234 })
    const existing = migrateLegacyImageRecord(uploadKey, { blob: blob(), createdAt: 5, lastUsedAt: 7 }, 1234)
    expect(existing).toMatchObject({ createdAt: 5, lastUsedAt: 7 })
  })

  it('validates upload keys for recovery', () => {
    expect(isUploadImageKey('upload-1700000000000-abc')).toBe(true)
    expect(isUploadImageKey('upload-')).toBe(false)
    expect(isUploadImageKey('remote-1234abcd')).toBe(false)
    expect(isUploadImageKey('upload-bad key')).toBe(false)
  })
})
