/**
 * Best-effort local cache of online wallpaper images.
 *
 * Blobs live in the existing IndexedDB store under `remote-<hash(url)>`. The
 * download is streamed and capped before it can be materialized in memory; all
 * failures are non-fatal and never write to IndexedDB. A small localStorage
 * index drives LRU cleanup (24 entries / 128 MiB, current remote protected).
 */
import { validateWallpaperUrl } from '../wallpaper.js'
import { createIndexedDbImageStore } from './storage.js'
import type { StoredImageRecord, WallpaperImageStore } from './storage.js'

/** Key prefix used in the upload image store. */
export const REMOTE_CACHE_PREFIX = 'remote-'
/** Largest remote image accepted into the cache (15 MiB). */
export const REMOTE_CACHE_MAX_BYTES = 15 * 1024 * 1024
/** LRU entry cap for cached remote images. */
export const REMOTE_CACHE_MAX_ENTRIES = 24
/** LRU byte cap for cached remote images (128 MiB). */
export const REMOTE_CACHE_MAX_TOTAL_BYTES = 128 * 1024 * 1024
/** Fetch timeout for the cache attempt. */
export const REMOTE_CACHE_TIMEOUT_MS = 8000
/** localStorage key of the LRU metadata index. */
export const REMOTE_CACHE_INDEX_KEY = 'dsh-livery.wallpaper.remote-cache.v1'

/** One LRU index record. */
export interface RemoteCacheIndexEntry {
  readonly url: string
  readonly key: string
  readonly size: number
  readonly usedAt: number
}

/** localStorage subset used by the LRU index (injectable in tests). */
export interface RemoteCacheStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * Deterministic FNV-1a cache key for one URL.
 * @param url - validated https image URL.
 * @returns `remote-<8 hex chars>`.
 */
export function remoteCacheKey(url: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < url.length; index += 1) {
    hash ^= url.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `${REMOTE_CACHE_PREFIX}${hash.toString(16).padStart(8, '0')}`
}

/** Result of one cache attempt. */
export type RemoteCacheResult =
  | { readonly ok: true; readonly key: string; readonly record: StoredImageRecord }
  | { readonly ok: false; readonly reason: 'unsupported' | 'network' | 'invalid' }

function defaultFetch(): typeof fetch | undefined {
  return typeof fetch === 'undefined' ? undefined : fetch
}

/**
 * Read the LRU index (corrupt data ignored).
 * @param storage - localStorage subset.
 * @returns valid index entries.
 */
export function readRemoteCacheIndex(storage: RemoteCacheStorage | undefined): readonly RemoteCacheIndexEntry[] {
  if (storage === undefined) return []
  try {
    const raw: unknown = JSON.parse(storage.getItem(REMOTE_CACHE_INDEX_KEY) ?? 'null')
    if (!Array.isArray(raw)) return []
    return raw.flatMap(value => {
      if (typeof value !== 'object' || value === null) return []
      const row = value as Record<string, unknown>
      if (typeof row.url !== 'string' || typeof row.key !== 'string') return []
      if (typeof row.size !== 'number' || typeof row.usedAt !== 'number') return []
      return [{ url: row.url, key: row.key, size: Math.max(0, row.size), usedAt: row.usedAt }]
    })
  } catch {
    return []
  }
}

/**
 * Persist the LRU index, newest first.
 * @param storage - localStorage subset.
 * @param entries - entries to store.
 */
export function writeRemoteCacheIndex(storage: RemoteCacheStorage | undefined, entries: readonly RemoteCacheIndexEntry[]): void {
  if (storage === undefined) return
  try {
    storage.setItem(REMOTE_CACHE_INDEX_KEY, JSON.stringify(entries))
  } catch {
    /* index is best effort */
  }
}

/**
 * Record one cached image in the LRU index (dedupe by URL, newest first).
 * @param storage - localStorage subset.
 * @param entry - cached image metadata.
 * @returns the next index.
 */
export function touchRemoteCacheIndex(
  storage: RemoteCacheStorage | undefined,
  entry: RemoteCacheIndexEntry,
): readonly RemoteCacheIndexEntry[] {
  const next = [entry, ...readRemoteCacheIndex(storage).filter(candidate => candidate.url !== entry.url)]
  writeRemoteCacheIndex(storage, next)
  return next
}

/** Drop one URL from the LRU index. */
export function forgetRemoteCacheIndex(storage: RemoteCacheStorage | undefined, url: string): readonly RemoteCacheIndexEntry[] {
  const next = readRemoteCacheIndex(storage).filter(entry => entry.url !== url)
  writeRemoteCacheIndex(storage, next)
  return next
}

/**
 * Evict oldest cache entries until the entry/byte caps hold; the current
 * wallpaper is never evicted.
 * @param deps - store/index/protected URL.
 * @returns URLs whose blobs were evicted.
 */
export async function pruneRemoteCache(deps: {
  readonly images?: WallpaperImageStore | undefined
  readonly storage?: RemoteCacheStorage | undefined
  readonly protectedUrl?: string | undefined
  readonly maxEntries?: number | undefined
  readonly maxBytes?: number | undefined
} = {}): Promise<readonly string[]> {
  const images = deps.images ?? createIndexedDbImageStore()
  if (images === undefined) return []
  const maxEntries = deps.maxEntries ?? REMOTE_CACHE_MAX_ENTRIES
  const maxBytes = deps.maxBytes ?? REMOTE_CACHE_MAX_TOTAL_BYTES
  const entries = [...readRemoteCacheIndex(deps.storage)].sort((a, b) => a.usedAt - b.usedAt)
  let total = entries.reduce((sum, entry) => sum + entry.size, 0)
  const evicted: string[] = []
  const keep = new Set<string>()
  for (const entry of entries) {
    const overCount = entries.length - evicted.length > maxEntries
    const overBytes = total > maxBytes
    if ((overCount || overBytes) && entry.url !== deps.protectedUrl) {
      try {
        await images.delete(entry.key)
        evicted.push(entry.url)
        total -= entry.size
      } catch {
        // Keep the entry indexed so a later prune retries instead of leaking an
        // untracked blob.
        keep.add(entry.url)
      }
    } else {
      keep.add(entry.url)
    }
  }
  writeRemoteCacheIndex(deps.storage, readRemoteCacheIndex(deps.storage).filter(entry => keep.has(entry.url)))
  return evicted
}

/**
 * Try to download + store one remote image blob. Never throws. The response is
 * streamed with a cumulative cap, so an absent/lying Content-Length cannot
 * allocate more than 15 MiB; nothing is written to IndexedDB on failure.
 * @param url - remote https URL.
 * @param deps - injected store/fetch/timeout/index (defaults: IndexedDB + fetch).
 * @returns ok with the stored record, or a non-fatal failure reason.
 */
export async function cacheRemoteImage(
  url: string,
  deps: {
    readonly images?: WallpaperImageStore | undefined
    readonly fetchImpl?: typeof fetch | undefined
    readonly timeoutMs?: number | undefined
    readonly key?: string | undefined
    readonly storage?: RemoteCacheStorage | undefined
    readonly protectedUrl?: string | undefined
  } = {},
): Promise<RemoteCacheResult> {
  const check = validateWallpaperUrl(url)
  if (!check.ok) return { ok: false, reason: 'invalid' }
  const fetchImpl = deps.fetchImpl ?? defaultFetch()
  const images = deps.images ?? createIndexedDbImageStore()
  if (fetchImpl === undefined || images === undefined) return { ok: false, reason: 'unsupported' }
  const controller = typeof AbortController === 'undefined' ? undefined : new AbortController()
  const timer = controller === undefined
    ? undefined
    : setTimeout(() => { controller.abort() }, deps.timeoutMs ?? REMOTE_CACHE_TIMEOUT_MS)
  try {
    const response = await fetchImpl(check.url, {
      method: 'GET',
      cache: 'force-cache',
      credentials: 'omit',
      ...(controller === undefined ? {} : { signal: controller.signal }),
    })
    if (!response.ok) return { ok: false, reason: 'network' }
    const type = (response.headers.get('content-type') ?? '').toLowerCase()
    if (!type.startsWith('image/')) return { ok: false, reason: 'invalid' }
    // Trusted oversized Content-Length: abort before materializing the body.
    const declared = Number(response.headers.get('content-length') ?? '')
    if (Number.isFinite(declared) && declared > REMOTE_CACHE_MAX_BYTES) {
      controller?.abort()
      return { ok: false, reason: 'invalid' }
    }
    const blob = await readCappedBody(response)
    if (blob === undefined || blob.size <= 0) return { ok: false, reason: 'invalid' }
    const key = deps.key ?? remoteCacheKey(check.url)
    const record: StoredImageRecord = {
      key,
      name: check.url.split('/').pop()?.slice(0, 80) ?? 'wallpaper',
      type,
      size: blob.size,
      blob,
    }
    await images.put(record)
    touchRemoteCacheIndex(deps.storage, { url: check.url, key, size: blob.size, usedAt: Date.now() })
    await pruneRemoteCache({
      images,
      storage: deps.storage,
      protectedUrl: deps.protectedUrl ?? check.url,
    })
    return { ok: true, key, record }
  } catch {
    return { ok: false, reason: 'network' }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * Stream-read a body into a Blob without exceeding the per-image cap.
 * @param response - image response.
 * @returns the blob, or undefined when the cumulative size exceeds the cap.
 */
async function readCappedBody(response: Response): Promise<Blob | undefined> {
  const body = response.body
  if (body === null || typeof body.getReader !== 'function') {
    const blob = await response.blob()
    return blob.size > REMOTE_CACHE_MAX_BYTES ? undefined : blob
  }
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value === undefined) continue
      total += value.byteLength
      if (total > REMOTE_CACHE_MAX_BYTES) {
        await reader.cancel().catch(() => undefined)
        return undefined
      }
      chunks.push(value)
    }
  } catch {
    return undefined
  }
  return new Blob(chunks as BlobPart[], { type: 'image/*' })
}

/**
 * Load a previously cached remote image.
 * @param url - remote https URL.
 * @param images - image store (defaults to IndexedDB).
 * @returns the stored record if present.
 */
export async function loadCachedRemote(
  url: string,
  images: WallpaperImageStore | undefined = createIndexedDbImageStore(),
): Promise<StoredImageRecord | undefined> {
  if (images === undefined) return undefined
  try {
    return await images.get(remoteCacheKey(url))
  } catch {
    return undefined
  }
}

/** Whether the URL has a cached blob. */
export async function isRemoteCached(
  url: string,
  images: WallpaperImageStore | undefined = createIndexedDbImageStore(),
): Promise<boolean> {
  return (await loadCachedRemote(url, images)) !== undefined
}

/**
 * Delete the cached blob for one URL (best effort) and drop it from the index.
 * @param url - remote https URL.
 * @param images - image store.
 * @param storage - LRU index storage.
 */
export async function deleteCachedRemote(
  url: string,
  images: WallpaperImageStore | undefined = createIndexedDbImageStore(),
  storage?: RemoteCacheStorage | undefined,
): Promise<void> {
  forgetRemoteCacheIndex(storage, url)
  if (images === undefined) return
  try {
    await images.delete(remoteCacheKey(url))
  } catch {
    /* cache deletion is best effort */
  }
}
