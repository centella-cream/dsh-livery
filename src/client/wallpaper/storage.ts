/**
 * Wallpaper image persistence (IndexedDB schema v2) and upload validation.
 *
 * Blobs live in IndexedDB DB `dsh-livery-wallpapers`, store `images`. Uploaded
 * images (`upload-…` keys) and best-effort remote-image cache entries
 * (`remote-…` keys) share the store; the selection/effects live in localStorage
 * (see wallpaper.ts). The store is an injectable interface so the controller/UI
 * are testable with an in-memory fake; when IndexedDB is unavailable the UI
 * keeps a session-only object URL.
 *
 * Schema v2 stores explicit metadata per record (`kind`, `size`, `createdAt`,
 * `lastUsedAt`, optional `sourceUrl`) so uploads and remote cache entries can be
 * listed, pruned and verified independently. Version-1 rows — a bare
 * `{name,type,size,blob}` value keyed by the upload key — are migrated
 * defensively when the database upgrades, and normalized on every read, so a
 * partial/interrupted migration can never make a wallpaper disappear. Upload
 * keys are preserved verbatim: they are the only link between the persisted
 * selection and its blob ("upload key recovery").
 */

/** One stored image: an uploaded wallpaper or a cached online image. */
export type StoredImageKind = 'upload' | 'remote'

/** Metadata + blob of one stored wallpaper image (schema v2). */
export interface StoredImageRecord {
  /** Primary key: `upload-…` for local uploads, `remote-<hash>` for cache rows. */
  readonly key: string
  readonly kind: StoredImageKind
  /** Size in bytes (always the blob's own size, never trusted metadata). */
  readonly size: number
  /** Epoch milliseconds when the record was first written (0 when unknown). */
  readonly createdAt: number
  /** Epoch milliseconds when the record was last written/used (0 when unknown). */
  readonly lastUsedAt: number
  /** Original https URL of a cached remote image (absent for uploads). */
  readonly sourceUrl?: string
  readonly blob: Blob
}

/** IndexedDB database/store names owned by the plugin. */
export const WALLPAPER_DB_NAME = 'dsh-livery-wallpapers'
export const WALLPAPER_DB_STORE = 'images'
/** IndexedDB schema version owned by this module (v1 uploads → v2 records). */
export const WALLPAPER_DB_VERSION = 2
/** Key prefix shared by every cached remote image. */
export const REMOTE_IMAGE_KEY_PREFIX = 'remote-'
/** Upload size cap (10 MiB). */
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024
/** Accepted upload MIME types (JPEG/PNG/WebP/AVIF). */
export const UPLOAD_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/** Upload keys are stable, URL-safe and bounded (also used for recovery). */
const UPLOAD_KEY_PATTERN = /^upload-[A-Za-z0-9-]{1,64}$/

/** Minimal blob metadata available without reading the file. */
export interface UploadCandidate {
  readonly name?: string
  readonly type?: string
  readonly size?: number
}

/** Upload validation problem (mapped to i18n copy). */
export type UploadProblem = 'type' | 'size' | 'empty'

/**
 * Validate a picked/dropped file before reading it.
 * @param file - name/type/size metadata.
 * @returns ok, or the problem key.
 */
export function validateUploadFile(file: UploadCandidate): { readonly ok: true } | { readonly ok: false; readonly problem: UploadProblem } {
  if ((file.size ?? 0) <= 0) return { ok: false, problem: 'empty' }
  if ((file.size ?? 0) > UPLOAD_MAX_BYTES) return { ok: false, problem: 'size' }
  if (!UPLOAD_TYPES.includes(file.type ?? '')) return { ok: false, problem: 'type' }
  return { ok: true }
}

/**
 * Whether a string is a valid upload image key (recovery/validation guard).
 * @param value - candidate key.
 * @returns true for `upload-…` keys.
 */
export function isUploadImageKey(value: string): boolean {
  return UPLOAD_KEY_PATTERN.test(value)
}

/**
 * Whether an unknown value is a stored image kind.
 * @param value - untrusted value.
 * @returns true for `upload`/`remote`.
 */
export function isStoredImageKind(value: unknown): value is StoredImageKind {
  return value === 'upload' || value === 'remote'
}

/**
 * Infer the record kind from its key. Version-1 rows had no `kind` field: remote
 * cache keys were never shipped under v1, but the defensive inference keeps a
 * partially migrated store readable.
 * @param key - primary key.
 * @returns `remote` for `remote-…` keys, `upload` otherwise.
 */
export function imageKindForKey(key: string): StoredImageKind {
  return key.startsWith(REMOTE_IMAGE_KEY_PREFIX) ? 'remote' : 'upload'
}

/** Finite non-negative epoch milliseconds, or 0 when unknown. */
function timestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

/**
 * Normalize one stored row (v1 or v2) into a complete v2 record. Unknown/foreign
 * values are rejected instead of throwing; `name`/`type` from v1 are dropped
 * because the blob itself carries the MIME type.
 * @param key - primary key the row is stored under.
 * @param raw - untrusted stored value.
 * @returns the normalized record, or undefined when the row is unusable.
 */
export function normalizeStoredImageRecord(key: string, raw: unknown): StoredImageRecord | undefined {
  if (typeof key !== 'string' || key.length === 0) return undefined
  if (typeof raw !== 'object' || raw === null) return undefined
  const row = raw as Record<string, unknown>
  const blob = row.blob
  // Blob is required: a row without readable image bytes is not a wallpaper.
  if (typeof Blob === 'undefined' || !(blob instanceof Blob) || blob.size <= 0) return undefined
  const kind = isStoredImageKind(row.kind) ? row.kind : imageKindForKey(key)
  const createdAt = timestamp(row.createdAt)
  const lastUsedAt = Math.max(timestamp(row.lastUsedAt), createdAt)
  const sourceUrl = kind === 'remote' && typeof row.sourceUrl === 'string' && row.sourceUrl.length > 0
    ? row.sourceUrl
    : undefined
  return {
    key,
    kind,
    size: blob.size,
    createdAt,
    lastUsedAt,
    ...(sourceUrl === undefined ? {} : { sourceUrl }),
    blob,
  }
}

/**
 * Convert one version-1 row into a v2 record, stamping migration time when the
 * legacy row carried no timestamps. Upload keys are kept unchanged so a
 * persisted upload selection can still find its blob after the upgrade.
 * @param key - legacy primary key.
 * @param raw - legacy stored value.
 * @param now - migration timestamp (injectable for tests).
 * @returns the migrated record, or undefined when the row is unusable.
 */
export function migrateLegacyImageRecord(
  key: string,
  raw: unknown,
  now: number = Date.now(),
): StoredImageRecord | undefined {
  const normalized = normalizeStoredImageRecord(key, raw)
  if (normalized === undefined) return undefined
  return {
    ...normalized,
    createdAt: normalized.createdAt > 0 ? normalized.createdAt : now,
    lastUsedAt: normalized.lastUsedAt > 0 ? normalized.lastUsedAt : now,
  }
}

/** Plain IndexedDB value written for one record (key is the primary key). */
function storedValue(record: StoredImageRecord): Record<string, unknown> {
  return {
    kind: record.kind,
    size: record.size,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
    ...(record.sourceUrl === undefined ? {} : { sourceUrl: record.sourceUrl }),
    blob: record.blob,
  }
}

/** Persistent image store used by the wallpaper controller/UI. */
export interface WallpaperImageStore {
  put(record: StoredImageRecord): Promise<void>
  get(key: string): Promise<StoredImageRecord | undefined>
  delete(key: string): Promise<void>
  /** Every stored record (normalized, newest first). */
  list(): Promise<readonly StoredImageRecord[]>
  /** Remove every stored image (local wallpapers/cache only; not localStorage). */
  clear(): Promise<void>
}

interface IdbRequestLike<T> {
  onsuccess: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  result?: T
}

interface IdbCursorLike {
  readonly value: unknown
  readonly key?: unknown
  update(value: unknown): IdbRequestLike<unknown>
  delete(): IdbRequestLike<unknown>
  continue(): void
}

interface IdbStoreLike {
  put(value: unknown, key: string): IdbRequestLike<unknown>
  get(key: string): IdbRequestLike<unknown>
  delete(key: string): IdbRequestLike<unknown>
  getAll(): IdbRequestLike<unknown[]>
  getAllKeys(): IdbRequestLike<unknown[]>
  clear(): IdbRequestLike<unknown>
  openCursor?(): IdbRequestLike<IdbCursorLike | null>
}

interface IdbTransactionLike {
  objectStore(name: string): IdbStoreLike
  oncomplete: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  onabort: ((event: unknown) => void) | null
}

interface IdbDatabaseLike {
  transaction(store: string, mode: 'readonly' | 'readwrite'): IdbTransactionLike
  close?(): void
  onversionchange?: ((event: unknown) => void) | null
}

/** Minimal `IDBVersionChangeEvent` shape used during the v1 → v2 upgrade. */
export interface IdbUpgradeEventLike {
  readonly oldVersion?: number
}

interface IdbOpenRequestLike {
  onupgradeneeded: ((event: IdbUpgradeEventLike) => void) | null
  onsuccess: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  onblocked?: ((event: unknown) => void) | null
  readonly transaction?: IdbTransactionLike | null
  readonly result: IdbDatabaseLike & { createObjectStore(name: string): unknown }
}

/** IndexedDB factory subset (injectable). */
export interface IdbFactoryLike {
  open(name: string, version?: number): IdbOpenRequestLike
}

/** Resolve one IndexedDB request to its result. */
function requestResult<T>(request: IdbRequestLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T)
    request.onerror = () => reject(new Error('wallpaper database request failed'))
  })
}

/** Resolve after an IndexedDB transaction commits (rejects on abort/error). */
function transactionDone(transaction: IdbTransactionLike): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('wallpaper database transaction failed'))
    transaction.onabort = () => reject(new Error('wallpaper database transaction aborted'))
  })
}

function defaultFactory(): IdbFactoryLike | undefined {
  try {
    return typeof indexedDB === 'undefined' ? undefined : indexedDB as unknown as IdbFactoryLike
  } catch {
    return undefined
  }
}

/** Best-effort non-fatal diagnostic (never throws, even without console). */
function warnDiagnostic(message: string, error?: unknown): void {
  try {
    if (error === undefined) console.warn(`[dsh-livery] ${message}`)
    else console.warn(`[dsh-livery] ${message}`, error)
  } catch {
    /* console unavailable */
  }
}

/**
 * Migrate version-1 rows in place after the upgrade transaction succeeded.
 * Every row is handled independently: usable rows are rewritten as v2 records
 * (keeping their primary key), unusable rows are deleted. The snapshot is read
 * in a readonly transaction first and rewritten in a fresh readwrite transaction
 * so no request is queued after an `await` inside a live transaction. Failures
 * are non-fatal and reported as a diagnostic — reads still normalize legacy rows.
 * @param db - opened database at version 2.
 * @param now - migration timestamp (injectable for tests).
 * @returns number of rows rewritten.
 */
async function migrateLegacyImageRecords(
  db: IdbDatabaseLike,
  now: number = Date.now(),
): Promise<number> {
  let keys: readonly unknown[]
  let values: readonly unknown[]
  try {
    const read = db.transaction(WALLPAPER_DB_STORE, 'readonly').objectStore(WALLPAPER_DB_STORE)
    keys = await requestResult<unknown[]>(read.getAllKeys())
    values = await requestResult<unknown[]>(read.getAll())
  } catch {
    return 0
  }
  let transaction: IdbTransactionLike
  try {
    transaction = db.transaction(WALLPAPER_DB_STORE, 'readwrite')
  } catch {
    return 0
  }
  const completion = new Promise<boolean>(resolve => {
    transaction.oncomplete = () => resolve(true)
    transaction.onerror = () => resolve(false)
    transaction.onabort = () => resolve(false)
  })
  let migrated = 0
  try {
    const objectStore = transaction.objectStore(WALLPAPER_DB_STORE)
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]
      if (typeof key !== 'string' || key.length === 0) continue
      const record = migrateLegacyImageRecord(key, values[index], now)
      if (record === undefined) objectStore.delete(key)
      else {
        objectStore.put(storedValue(record), key)
        migrated += 1
      }
    }
  } catch {
    // A synchronous failure aborts the rewrite; the transaction settles below
    // and legacy rows stay readable through normalizeStoredImageRecord.
    return 0
  }
  const ok = await completion
  if (!ok) return 0
  return migrated
}

/**
 * Create the IndexedDB-backed image store, or undefined when IndexedDB is not
 * available (private mode / tests). The database opens at schema v2; an existing
 * v1 database is migrated defensively during the upgrade. Operations reject if
 * the DB cannot open.
 * @param factory - injected IndexedDB factory (defaults to global indexedDB).
 * @returns the image store or undefined.
 */
export function createIndexedDbImageStore(
  factory: IdbFactoryLike | undefined = defaultFactory(),
): WallpaperImageStore | undefined {
  if (factory === undefined) return undefined
  let dbPromise: Promise<IdbDatabaseLike> | undefined
  const open = (): Promise<IdbDatabaseLike> => {
    if (dbPromise !== undefined) return dbPromise
    dbPromise = new Promise((resolve, reject) => {
      let previousVersion: number | undefined
      let migratedInUpgrade = false
      let migratedCount = 0
      try {
        const request = factory.open(WALLPAPER_DB_NAME, WALLPAPER_DB_VERSION)
        request.onupgradeneeded = event => {
          previousVersion = event.oldVersion
          try {
            request.result.createObjectStore(WALLPAPER_DB_STORE)
          } catch {
            /* store already exists (partial upgrade/foreign writer) */
          }
          // Migrate legacy rows INSIDE the versionchange transaction. A later
          // read/write would race another tab and let it update a row between
          // our snapshot and rewrite.
          const transaction = request.transaction ?? null
          const openCursor = transaction?.objectStore(WALLPAPER_DB_STORE).openCursor
          if (transaction === null || typeof openCursor !== 'function') return
          migratedInUpgrade = true
          const cursorRequest = openCursor.call(transaction.objectStore(WALLPAPER_DB_STORE))
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result
            if (cursor === null || cursor === undefined) return
            const primaryKey = cursor.key
            if (typeof primaryKey !== 'string') { cursor.continue(); return }
            const migrated = migrateLegacyImageRecord(primaryKey, cursor.value)
            if (migrated === undefined) cursor.delete()
            else {
              cursor.update(storedValue(migrated))
              migratedCount += 1
            }
            cursor.continue()
          }
          cursorRequest.onerror = () => warnDiagnostic('legacy wallpaper migration cursor failed')
        }
        request.onblocked = () => reject(new Error('wallpaper database upgrade blocked by another tab'))
        request.onsuccess = () => {
          const db = request.result
          db.onversionchange = () => {
            try { db.close?.() } catch { /* closing is best effort */ }
          }
          // Real IndexedDB provides the upgrade transaction, so migration is
          // atomic there. Fall back only for minimal injected fakes that lack
          // `request.transaction`; production never takes this path.
          if (previousVersion === undefined || previousVersion <= 0 || migratedInUpgrade) {
            if (migratedCount > 0) warnDiagnostic(`migrated ${migratedCount} wallpaper image record(s) to schema v2`)
            resolve(db)
            return
          }
          void migrateLegacyImageRecords(db).then(
            migrated => {
              if (migrated > 0) warnDiagnostic(`migrated ${migrated} wallpaper image record(s) to schema v2`)
              resolve(db)
            },
            error => {
              warnDiagnostic('could not migrate legacy wallpaper image records', error)
              resolve(db)
            },
          )
        }
        request.onerror = () => reject(new Error('wallpaper database failed to open'))
      } catch (error) {
        reject(error instanceof Error ? error : new Error('wallpaper database failed to open'))
      }
    })
    return dbPromise
  }
  const store = async (mode: 'readonly' | 'readwrite'): Promise<IdbStoreLike> => {
    const db = await open()
    return db.transaction(WALLPAPER_DB_STORE, mode).objectStore(WALLPAPER_DB_STORE)
  }
  return {
    put: async (record) => {
      if (typeof record.key !== 'string' || record.key.length === 0) {
        throw new Error('wallpaper image key is invalid')
      }
      if (typeof Blob === 'undefined' || !(record.blob instanceof Blob)) {
        throw new Error('wallpaper image blob is invalid')
      }
      const db = await open()
      const transaction = db.transaction(WALLPAPER_DB_STORE, 'readwrite')
      const objectStore = transaction.objectStore(WALLPAPER_DB_STORE)
      await requestResult(objectStore.put(storedValue(record), record.key))
      await transactionDone(transaction)
    },
    get: async (key) => {
      const objectStore = await store('readonly')
      const raw = await requestResult<unknown>(objectStore.get(key))
      return normalizeStoredImageRecord(key, raw)
    },
    delete: async (key) => {
      const db = await open()
      const transaction = db.transaction(WALLPAPER_DB_STORE, 'readwrite')
      const objectStore = transaction.objectStore(WALLPAPER_DB_STORE)
      await requestResult(objectStore.delete(key))
      await transactionDone(transaction)
    },
    list: async () => {
      const objectStore = await store('readonly')
      const [keys, values] = await Promise.all([
        requestResult<unknown[]>(objectStore.getAllKeys()),
        requestResult<unknown[]>(objectStore.getAll()),
      ])
      const records: StoredImageRecord[] = []
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index]
        if (typeof key !== 'string') continue
        const record = normalizeStoredImageRecord(key, values[index])
        if (record !== undefined) records.push(record)
      }
      return records.sort((a, b) => b.lastUsedAt - a.lastUsedAt || a.key.localeCompare(b.key))
    },
    clear: async () => {
      const db = await open()
      const transaction = db.transaction(WALLPAPER_DB_STORE, 'readwrite')
      const objectStore = transaction.objectStore(WALLPAPER_DB_STORE)
      await requestResult(objectStore.clear())
      await transactionDone(transaction)
    },
  }
}
