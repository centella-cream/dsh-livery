/**
 * Uploaded-wallpaper persistence (IndexedDB) and file validation.
 *
 * Blobs live in IndexedDB DB `dsh-livery-wallpapers`, store `images`, while the
 * selection/effects live in localStorage (see wallpaper.ts). The store is an
 * injectable interface so the controller/UI are testable with an in-memory fake;
 * when IndexedDB is unavailable the UI keeps a session-only object URL.
 */

/** One stored upload: PNG/JPEG/WebP/AVIF blob plus display metadata. */
export interface StoredImageRecord {
  readonly key: string
  readonly name: string
  readonly type: string
  readonly size: number
  readonly blob: Blob
}

/** IndexedDB database/store names owned by the plugin. */
export const WALLPAPER_DB_NAME = 'dsh-livery-wallpapers'
export const WALLPAPER_DB_STORE = 'images'
/** Upload size cap (10 MiB). */
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024
/** Accepted upload MIME types (JPEG/PNG/WebP/AVIF). */
export const UPLOAD_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

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

/** Persistent image store used by the wallpaper controller/UI. */
export interface WallpaperImageStore {
  put(record: StoredImageRecord): Promise<void>
  get(key: string): Promise<StoredImageRecord | undefined>
  delete(key: string): Promise<void>
}

interface IdbRequestLike<T> {
  onsuccess: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  result?: T
}

interface IdbStoreLike {
  put(value: unknown, key: string): IdbRequestLike<unknown>
  get(key: string): IdbRequestLike<unknown>
  delete(key: string): IdbRequestLike<unknown>
}

interface IdbDatabaseLike {
  transaction(store: string, mode: 'readonly' | 'readwrite'): { objectStore(name: string): IdbStoreLike }
}

interface IdbOpenRequestLike {
  onupgradeneeded: ((event: unknown) => void) | null
  onsuccess: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  readonly result: IdbDatabaseLike & { createObjectStore(name: string): unknown }
}

/** IndexedDB factory subset (injectable). */
export interface IdbFactoryLike {
  open(name: string, version?: number): IdbOpenRequestLike
}

function defaultFactory(): IdbFactoryLike | undefined {
  try {
    return typeof indexedDB === 'undefined' ? undefined : indexedDB as unknown as IdbFactoryLike
  } catch {
    return undefined
  }
}

/**
 * Create the IndexedDB-backed image store, or undefined when IndexedDB is not
 * available (private mode / tests). Operations reject if the DB cannot open.
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
      try {
        const request = factory.open(WALLPAPER_DB_NAME, 1)
        request.onupgradeneeded = () => {
          try {
            request.result.createObjectStore(WALLPAPER_DB_STORE)
          } catch {
            /* store already exists */
          }
        }
        request.onsuccess = () => resolve(request.result)
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
      const objectStore = await store('readwrite')
      await new Promise<void>((resolve, reject) => {
        const request = objectStore.put(
          { name: record.name, type: record.type, size: record.size, blob: record.blob },
          record.key,
        )
        request.onsuccess = () => resolve()
        request.onerror = () => reject(new Error('wallpaper upload could not be stored'))
      })
    },
    get: async (key) => {
      const objectStore = await store('readonly')
      return new Promise<StoredImageRecord | undefined>((resolve, reject) => {
        const request = objectStore.get(key)
        request.onsuccess = () => {
          const raw = request.result
          if (typeof raw !== 'object' || raw === null) {
            resolve(undefined)
            return
          }
          const row = raw as Record<string, unknown>
          const blob = row.blob
          if (typeof Blob === 'undefined' || !(blob instanceof Blob)) {
            resolve(undefined)
            return
          }
          resolve({
            key,
            name: typeof row.name === 'string' ? row.name : 'wallpaper',
            type: typeof row.type === 'string' ? row.type : 'image',
            size: typeof row.size === 'number' ? row.size : blob.size,
            blob,
          })
        }
        request.onerror = () => reject(new Error('wallpaper upload could not be read'))
      })
    },
    delete: async (key) => {
      const objectStore = await store('readwrite')
      await new Promise<void>((resolve, reject) => {
        const request = objectStore.delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(new Error('wallpaper upload could not be deleted'))
      })
    },
  }
}
