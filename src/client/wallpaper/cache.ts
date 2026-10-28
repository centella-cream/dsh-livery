/**
 * Best-effort local cache of online wallpaper images (IndexedDB v2).
 *
 * Cached blobs live in the wallpaper image store under `remote-<hash(url)>`
 * records that carry the original `sourceUrl`. Downloads are streamed and capped
 * before the body can be materialized in memory; every failure is non-fatal and
 * never writes to IndexedDB. The record list itself is the LRU source of truth
 * (`lastUsedAt`), capped at 24 remote entries / 128 MiB with the currently
 * applied wallpaper protected. A small localStorage index mirrors the same data
 * for diagnostics/backward compatibility but is never required to render.
 *
 * Because the key hash is only 32 bits, a key is not proof of identity: a cached
 * record is only adopted when its stored `sourceUrl` equals the requested URL,
 * so two colliding URLs can never display each other's image.
 */
import { validateWallpaperUrl } from '../wallpaper.js'
import { isLocalOrPrivateHost } from './host-safety.js'
import {
  createIndexedDbImageStore,
  REMOTE_IMAGE_KEY_PREFIX,
} from './storage.js'
import type { StoredImageRecord, WallpaperImageStore } from './storage.js'

/** Key prefix used for cached remote images in the image store. */
export const REMOTE_CACHE_PREFIX = REMOTE_IMAGE_KEY_PREFIX
/** Largest remote image accepted into the cache (15 MiB). */
export const REMOTE_CACHE_MAX_BYTES = 15 * 1024 * 1024
/** LRU entry cap for cached remote images. */
export const REMOTE_CACHE_MAX_ENTRIES = 24
/** LRU byte cap for cached remote images (128 MiB). */
export const REMOTE_CACHE_MAX_TOTAL_BYTES = 128 * 1024 * 1024
/** Fetch timeout for the cache attempt. */
export const REMOTE_CACHE_TIMEOUT_MS = 8000
/** localStorage key of the LRU metadata mirror. */
export const REMOTE_CACHE_INDEX_KEY = 'dsh-livery.wallpaper.remote-cache.v1'

/** One mirrored LRU index record (metadata only; never used to adopt a blob). */
export interface RemoteCacheIndexEntry {
  readonly url: string
  readonly key: string
  readonly size: number
  readonly usedAt: number
}

/** localStorage subset used by the LRU mirror (injectable in tests). */
export interface RemoteCacheStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * Deterministic FNV-1a cache key for one URL (32-bit; identity is verified via
 * the stored `sourceUrl` on load).
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
  | { readonly ok: false; readonly reason: 'unsupported' | 'network' | 'invalid' | 'cancelled' }

/** Coordination handle for aborting an in-flight cache download on selection change. */
export interface RemoteCacheCancellation {
  /** Signal for the current download, or undefined when the platform lacks AbortController. */
  readonly signal: AbortSignal | undefined
  /** Abort the current download (if any) without starting another. */
  cancel(): void
  /** Abort any current download and arm a fresh signal for the next one. */
  reset(): AbortSignal | undefined
}

function defaultAbortController(): (() => AbortController) | undefined {
  try {
    return typeof AbortController === 'undefined' ? undefined : () => new AbortController()
  } catch {
    return undefined
  }
}

/**
 * Create a reusable cancellation handle for remote cache downloads: the panel
 * calls {@link RemoteCacheCancellation.reset} before a new download and
 * {@link RemoteCacheCancellation.cancel} whenever the selection changes, so a
 * stale 15 MiB download stops instead of wasting bandwidth.
 * @param createController - AbortController factory (injectable in tests).
 * @returns the cancellation handle.
 */
export function createRemoteCacheCancellation(
  createController: (() => AbortController) | undefined = defaultAbortController(),
): RemoteCacheCancellation {
  let controller: AbortController | undefined
  const fresh = (): AbortSignal | undefined => {
    controller = createController?.()
    return controller?.signal
  }
  return {
    get signal() {
      return controller?.signal
    },
    cancel() {
      try {
        controller?.abort()
      } catch {
        /* abort is best effort */
      }
      controller = undefined
    },
    reset() {
      try {
        controller?.abort()
      } catch {
        /* abort is best effort */
      }
      return fresh()
    },
  }
}

function defaultFetch(): typeof fetch | undefined {
  try {
    return typeof fetch === 'undefined' ? undefined : fetch
  } catch {
    return undefined
  }
}

/** Whether a signal exists and has already been aborted. */
function isAborted(signal: AbortSignal | undefined): boolean {
  return signal !== undefined && signal.aborted
}

/**
 * Latest cache operation token per store key. Overlapping downloads for the same
 * URL race on the same record; a superseded operation must never delete the
 * record a newer operation just wrote (e.g. A cancels after B already stored).
 */
const latestRemoteOperations = new Map<string, number>()
let nextRemoteOperationId = 0

/** Claim the latest-operation token for one cache key. */
function beginRemoteOperation(key: string): number {
  nextRemoteOperationId += 1
  latestRemoteOperations.set(key, nextRemoteOperationId)
  return nextRemoteOperationId
}

/** Whether this operation is still the newest one for the key. */
function isLatestRemoteOperation(key: string, token: number): boolean {
  return latestRemoteOperations.get(key) === token
}

/** Release the token, but never clobber a newer operation's token. */
function finishRemoteOperation(key: string, token: number): void {
  if (latestRemoteOperations.get(key) !== token) return
  latestRemoteOperations.delete(key)
}

/**
 * Read the mirrored LRU index (corrupt data ignored).
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
 * Persist the mirrored LRU index, newest first (best effort).
 * @param storage - localStorage subset.
 * @param entries - entries to store.
 */
export function writeRemoteCacheIndex(storage: RemoteCacheStorage | undefined, entries: readonly RemoteCacheIndexEntry[]): void {
  if (storage === undefined) return
  try {
    storage.setItem(REMOTE_CACHE_INDEX_KEY, JSON.stringify(entries))
  } catch {
    /* index mirror is best effort */
  }
}

/**
 * Record one cached image in the mirrored LRU index (dedupe by URL, newest first).
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

/** Drop one URL from the mirrored LRU index. */
export function forgetRemoteCacheIndex(storage: RemoteCacheStorage | undefined, url: string): readonly RemoteCacheIndexEntry[] {
  const next = readRemoteCacheIndex(storage).filter(entry => entry.url !== url)
  writeRemoteCacheIndex(storage, next)
  return next
}

/**
 * Evict least-recently-used remote cache entries until the entry/byte caps hold.
 * The currently applied wallpaper is never evicted. The image store's record list
 * is the source of truth; the localStorage index is rebuilt from the survivors.
 * @param deps - store/protected URL/caps.
 * @returns URLs (or keys, for unverifiable legacy rows) whose blobs were evicted.
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
  let records: readonly StoredImageRecord[]
  try {
    records = await images.list()
  } catch {
    return []
  }
  const candidates = records
    .filter(record => record.kind === 'remote')
    .sort((a, b) => a.lastUsedAt - b.lastUsedAt || a.createdAt - b.createdAt || a.key.localeCompare(b.key))
  let total = candidates.reduce((sum, record) => sum + record.size, 0)
  let count = candidates.length
  const evicted: string[] = []
  const kept: StoredImageRecord[] = []
  for (const record of candidates) {
    const overCount = count > maxEntries
    const overBytes = total > maxBytes
    const protectedRecord = deps.protectedUrl !== undefined && record.sourceUrl === deps.protectedUrl
    if ((overCount || overBytes) && !protectedRecord) {
      try {
        await images.delete(record.key)
        evicted.push(record.sourceUrl ?? record.key)
        total -= record.size
        count -= 1
        continue
      } catch {
        // Keep the entry tracked so a later prune retries instead of leaking an
        // untracked blob.
      }
    }
    kept.push(record)
  }
  kept.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
  if (deps.storage !== undefined) {
    writeRemoteCacheIndex(deps.storage, kept.flatMap(record => record.sourceUrl === undefined ? [] : [{
      url: record.sourceUrl,
      key: record.key,
      size: record.size,
      usedAt: record.lastUsedAt,
    }]))
  }
  return evicted
}

/**
 * Try to download + store one remote image blob. Never throws. The response is
 * streamed with a cumulative cap, so an absent/lying Content-Length cannot
 * allocate more than 15 MiB; nothing is written to IndexedDB on failure. The
 * record stores the source URL so loads can reject 32-bit key collisions, and an
 * optional external signal cancels a download whose selection is no longer
 * current.
 * @param url - remote https URL.
 * @param deps - injected store/fetch/timeout/signal/index (defaults: IndexedDB + fetch).
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
    readonly signal?: AbortSignal | undefined
  } = {},
): Promise<RemoteCacheResult> {
  const check = validateWallpaperUrl(url)
  if (!check.ok) return { ok: false, reason: 'invalid' }
  let host = ''
  try { host = new URL(check.url).hostname } catch { return { ok: false, reason: 'invalid' } }
  if (isLocalOrPrivateHost(host)) return { ok: false, reason: 'invalid' }
  if (isAborted(deps.signal)) return { ok: false, reason: 'cancelled' }
  const fetchImpl = deps.fetchImpl ?? defaultFetch()
  const images = deps.images ?? createIndexedDbImageStore()
  if (fetchImpl === undefined || images === undefined) return { ok: false, reason: 'unsupported' }
  // The key is known before the download starts, so a newer same-URL operation
  // supersedes this one immediately (even while this one is mid-flight).
  const key = deps.key ?? remoteCacheKey(check.url)
  const operationToken = beginRemoteOperation(key)
  const controller = typeof AbortController === 'undefined' ? undefined : new AbortController()
  let cancelledExternally = false
  const onExternalAbort = (): void => {
    cancelledExternally = true
    try {
      controller?.abort()
    } catch {
      /* abort is best effort */
    }
  }
  if (deps.signal !== undefined && controller !== undefined) {
    deps.signal.addEventListener('abort', onExternalAbort, { once: true })
  }
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
    if (blob === undefined || blob.size <= 0) {
      return { ok: false, reason: cancelledExternally ? 'cancelled' : 'invalid' }
    }
    if (cancelledExternally || isAborted(deps.signal) || !isLatestRemoteOperation(key, operationToken)) {
      return { ok: false, reason: 'cancelled' }
    }
    const now = Date.now()
    const record: StoredImageRecord = {
      key,
      kind: 'remote',
      size: blob.size,
      createdAt: now,
      lastUsedAt: now,
      sourceUrl: check.url,
      blob,
    }
    await images.put(record)
    // Cancellation can arrive while the IDB transaction is in flight. Do not
    // publish/prune after that: delete the just-written stale blob instead.
    if (cancelledExternally || isAborted(deps.signal)) {
      // Only the newest operation may clean up its own record. A newer
      // same-URL download may already have written a fresh blob under this key.
      if (isLatestRemoteOperation(key, operationToken)) {
        try { await images.delete(key) } catch { /* best effort */ }
      }
      return { ok: false, reason: 'cancelled' }
    }
    if (deps.storage !== undefined) {
      touchRemoteCacheIndex(deps.storage, { url: check.url, key, size: blob.size, usedAt: now })
    }
    await pruneRemoteCache({
      images,
      storage: deps.storage,
      protectedUrl: deps.protectedUrl ?? check.url,
    })
    if (cancelledExternally || isAborted(deps.signal)) {
      if (isLatestRemoteOperation(key, operationToken)) {
        try { await images.delete(key) } catch { /* best effort */ }
      }
      return { ok: false, reason: 'cancelled' }
    }
    return { ok: true, key, record }
  } catch {
    return { ok: false, reason: cancelledExternally ? 'cancelled' : 'network' }
  } finally {
    finishRemoteOperation(key, operationToken)
    if (timer !== undefined) clearTimeout(timer)
    if (deps.signal !== undefined && controller !== undefined) {
      try {
        deps.signal.removeEventListener('abort', onExternalAbort)
      } catch {
        /* removing a listener is best effort */
      }
    }
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
 * Load a previously cached remote image, verifying its source URL.
 *
 * The key is a 32-bit hash, so the stored `sourceUrl` must match exactly; a
 * mismatching record is a collision and is treated as a cache miss instead of
 * showing the wrong image.
 * @param url - remote https URL.
 * @param images - image store (defaults to IndexedDB).
 * @returns the verified stored record if present.
 */
export async function loadCachedRemote(
  url: string,
  images: WallpaperImageStore | undefined = createIndexedDbImageStore(),
): Promise<StoredImageRecord | undefined> {
  if (images === undefined) return undefined
  const key = remoteCacheKey(url)
  let record: StoredImageRecord | undefined
  try {
    // One readwrite transaction: the LRU refresh cannot resurrect a record that
    // a concurrent clear() removed between a separate get and put.
    record = await images.touch(key, Date.now())
  } catch {
    // A read-only/quota-blocked store must not hide a valid cached wallpaper:
    // fall back to a plain read (no write, so it still cannot resurrect rows).
    try {
      record = await images.get(key)
    } catch {
      return undefined
    }
  }
  if (record === undefined || record.kind !== 'remote' || record.sourceUrl !== url) return undefined
  return record
}

/**
 * Load a cached remote image and refresh its LRU timestamp (best effort).
 * @param url - remote https URL.
 * @param images - image store.
 * @returns the verified stored record if present.
 */
export async function touchCachedRemote(
  url: string,
  images: WallpaperImageStore | undefined = createIndexedDbImageStore(),
): Promise<StoredImageRecord | undefined> {
  return loadCachedRemote(url, images)
}

/** Whether the URL has a verified cached blob. */
export async function isRemoteCached(
  url: string,
  images: WallpaperImageStore | undefined = createIndexedDbImageStore(),
): Promise<boolean> {
  return (await loadCachedRemote(url, images)) !== undefined
}

/**
 * Delete the cached blob for one URL (best effort) and drop it from the mirror.
 * A colliding record that belongs to a different source URL is left untouched.
 * @param url - remote https URL.
 * @param images - image store.
 * @param storage - LRU mirror storage.
 */
export async function deleteCachedRemote(
  url: string,
  images: WallpaperImageStore | undefined = createIndexedDbImageStore(),
  storage?: RemoteCacheStorage | undefined,
): Promise<void> {
  forgetRemoteCacheIndex(storage, url)
  if (images === undefined) return
  const key = remoteCacheKey(url)
  try {
    const record = await images.get(key)
    if (record !== undefined && record.kind === 'remote' && record.sourceUrl !== undefined && record.sourceUrl !== url) {
      return
    }
    await images.delete(key)
  } catch {
    /* cache deletion is best effort */
  }
}
