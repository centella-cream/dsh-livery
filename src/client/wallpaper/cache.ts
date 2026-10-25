/**
 * Best-effort local cache of online wallpaper images.
 *
 * Blobs are stored in the existing IndexedDB store under `remote-<hash(url)>`,
 * so a remembered wallpaper can render from disk when the network/CORS fails.
 * Every failure is non-fatal: history still works with the original URL.
 */
import { validateWallpaperUrl } from '../wallpaper.js'
import { createIndexedDbImageStore } from './storage.js'
import type { StoredImageRecord, WallpaperImageStore } from './storage.js'

/** Key prefix used in the upload image store. */
export const REMOTE_CACHE_PREFIX = 'remote-'
/** Largest remote image accepted into the cache (15 MiB). */
export const REMOTE_CACHE_MAX_BYTES = 15 * 1024 * 1024
/** Fetch timeout for the cache attempt. */
export const REMOTE_CACHE_TIMEOUT_MS = 8000

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

/**
 * Default fetch implementation when available.
 * @returns fetch or undefined.
 */
function defaultFetch(): typeof fetch | undefined {
  return typeof fetch === 'undefined' ? undefined : fetch
}

/**
 * Try to download + store one remote image blob. Never throws.
 * @param url - remote https URL.
 * @param deps - injected store/fetch/timeout (defaults: IndexedDB + global fetch).
 * @returns ok with the stored record, or a non-fatal failure reason.
 */
export async function cacheRemoteImage(
  url: string,
  deps: {
    readonly images?: WallpaperImageStore | undefined
    readonly fetchImpl?: typeof fetch | undefined
    readonly timeoutMs?: number | undefined
    readonly key?: string | undefined
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
    const type = response.headers.get('content-type') ?? ''
    if (!type.toLowerCase().startsWith('image/')) return { ok: false, reason: 'invalid' }
    const blob = await response.blob()
    if (blob.size <= 0 || blob.size > REMOTE_CACHE_MAX_BYTES) return { ok: false, reason: 'invalid' }
    const key = deps.key ?? remoteCacheKey(check.url)
    const record: StoredImageRecord = {
      key,
      name: check.url.split('/').pop()?.slice(0, 80) ?? 'wallpaper',
      type,
      size: blob.size,
      blob,
    }
    await images.put(record)
    return { ok: true, key, record }
  } catch {
    return { ok: false, reason: 'network' }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
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

/**
 * Whether the URL has a cached blob.
 * @param url - remote https URL.
 * @param images - image store.
 * @returns true when a record exists.
 */
export async function isRemoteCached(
  url: string,
  images: WallpaperImageStore | undefined = createIndexedDbImageStore(),
): Promise<boolean> {
  return (await loadCachedRemote(url, images)) !== undefined
}

/**
 * Delete the cached blob for one URL (best effort).
 * @param url - remote https URL.
 * @param images - image store.
 */
export async function deleteCachedRemote(
  url: string,
  images: WallpaperImageStore | undefined = createIndexedDbImageStore(),
): Promise<void> {
  if (images === undefined) return
  try {
    await images.delete(remoteCacheKey(url))
  } catch {
    /* cache deletion is best effort */
  }
}
