/**
 * Wallpaper lifecycle helpers: only the active upload blob should stay in
 * IndexedDB, a clean-all operation removes disposable local wallpaper data
 * without touching the current wallpaper, and every cleanup failure is reported
 * as a non-fatal diagnostic instead of breaking the visible wallpaper.
 */
import type { WallpaperSelection } from '../wallpaper.js'
import { REMOTE_CACHE_INDEX_KEY } from './cache.js'
import { RECENT_WALLPAPER_CLEAR_KEY, RECENT_WALLPAPER_KEY } from './history.js'
import { createIndexedDbImageStore } from './storage.js'
import type { StoredImageRecord, WallpaperImageStore } from './storage.js'

/** localStorage subset needed for local wallpaper cleanup (injectable in tests). */
export interface WallpaperLocalStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
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
 * Build the v2 IndexedDB record for one freshly uploaded image.
 * @param key - stable `upload-…` key persisted with the selection.
 * @param blob - image bytes (validated by the caller).
 * @param now - timestamp (injectable for tests).
 * @returns the complete upload record.
 */
export function createUploadRecord(key: string, blob: Blob, now: number = Date.now()): StoredImageRecord {
  return {
    key,
    kind: 'upload',
    size: blob.size,
    createdAt: now,
    lastUsedAt: now,
    blob,
  }
}

/**
 * Which stored upload key becomes orphaned when the selection changes.
 * @param previous - selection before the user action.
 * @param next - selection after the user action.
 * @returns the upload key to delete, or undefined when none is orphaned.
 */
export function obsoleteUploadKey(
  previous: WallpaperSelection,
  next: WallpaperSelection,
): string | undefined {
  if (previous === undefined || previous.kind !== 'upload') return undefined
  if (next !== undefined && next.kind === 'upload' && next.key === previous.key) return undefined
  return previous.key
}

/**
 * Delete one stored image, reporting failures without throwing.
 * @param images - image store (undefined = session-only, nothing to delete).
 * @param key - stored record key.
 * @param context - short diagnostic context.
 * @returns whether the record was deleted.
 */
export async function deleteStoredImage(
  images: WallpaperImageStore | undefined,
  key: string,
  context: string,
): Promise<boolean> {
  if (images === undefined) return false
  try {
    await images.delete(key)
    return true
  } catch (error) {
    warnDiagnostic(`could not delete ${context} wallpaper image ${key}`, error)
    return false
  }
}

/** Outcome of a stale-upload sweep. */
export interface StaleUploadCleanupResult {
  readonly removed: readonly string[]
  readonly errors: readonly string[]
}

/**
 * Delete every stored upload except the one backing the current selection.
 * This repairs stores left behind by crashed closes or interrupted replaces
 * ("only the current upload is retained"); failures are non-fatal.
 * @param images - image store (undefined = nothing to do).
 * @param currentUploadKey - upload key to keep, or undefined to remove all.
 * @returns removed keys and failed keys.
 */
export async function pruneStaleUploads(
  images: WallpaperImageStore | undefined,
  currentUploadKey: string | undefined,
  durableUploadKey?: string | undefined,
  persistedUploadKey?: string | undefined,
  extraProtectedUploadKeys?: ReadonlySet<string> | undefined,
): Promise<StaleUploadCleanupResult> {
  if (images === undefined) return { removed: [], errors: [] }
  let records: readonly StoredImageRecord[]
  try {
    records = await images.list()
  } catch (error) {
    warnDiagnostic('could not list wallpaper images for stale-upload cleanup', error)
    return { removed: [], errors: ['list'] }
  }
  const removed: string[] = []
  const errors: string[] = []
  for (const record of records) {
    if (record.kind !== 'upload') continue
    if (currentUploadKey !== undefined && record.key === currentUploadKey) continue
    if (durableUploadKey !== undefined && record.key === durableUploadKey) continue
    if (persistedUploadKey !== undefined && record.key === persistedUploadKey) continue
    if (extraProtectedUploadKeys?.has(record.key) === true) continue
    try {
      await images.delete(record.key)
      removed.push(record.key)
    } catch (error) {
      errors.push(record.key)
      warnDiagnostic(`could not delete stale upload wallpaper image ${record.key}`, error)
    }
  }
  return { removed, errors }
}

/** Local keys owned by the wallpaper studio (the active wallpaper state is NOT cleared). */
export const LOCAL_WALLPAPER_DATA_KEYS = [RECENT_WALLPAPER_KEY, RECENT_WALLPAPER_CLEAR_KEY, REMOTE_CACHE_INDEX_KEY] as const

/** Status of a clean-all-local-wallpaper-data run. */
export type ClearLocalWallpaperDataStatus = 'cleared' | 'empty' | 'partial'

/** Result of {@link clearAllLocalWallpaperData} (mapped to localized UI copy). */
export interface ClearLocalWallpaperDataResult {
  readonly status: ClearLocalWallpaperDataStatus
  /** Non-current image records that were removed. */
  readonly removedImages: number
  /** Images kept because the current selection still needs them. */
  readonly keptImages: number
  /** Whether the recent-wallpaper history record existed and was removed. */
  readonly clearedHistory: boolean
  /** Whether the mirrored remote-cache index existed and was removed. */
  readonly clearedIndex: boolean
  /** Non-fatal failures (keys or operation ids). */
  readonly errors: readonly string[]
}

/** Options of the clear-all-local-wallpaper-data operation. */
export interface ClearLocalWallpaperDataOptions {
  readonly images?: WallpaperImageStore | undefined
  readonly storage?: WallpaperLocalStorage | undefined
  /** Current selection: its upload blob/remote cache entry are preserved. */
  readonly selection?: WallpaperSelection | undefined
  /**
   * Last successfully persisted selection. A failed localStorage write leaves
   * the in-memory selection ahead of the recoverable state; both must survive GC.
   */
  readonly durableSelection?: WallpaperSelection | undefined
  /**
   * Live selection resolver. Cleanup is asynchronous; re-read this before each
   * deletion so a wallpaper selected during cleanup is never removed.
   */
  readonly getSelection?: (() => WallpaperSelection) | undefined
  /** Live durable-selection resolver. */
  readonly getDurableSelection?: (() => WallpaperSelection) | undefined
  /** Current recoverable localStorage selection resolver. */
  readonly getPersistedSelection?: (() => WallpaperSelection) | undefined
  /** Upload keys referenced by any live tab (explicit ref table). */
  readonly getReferencedUploadKeys?: (() => ReadonlySet<string>) | undefined
}

/**
 * Rebuild the mirrored remote-cache index for the remote records that survived a
 * cleanup, so the diagnostic mirror never points at deleted blobs.
 * @param storage - localStorage subset.
 * @param records - remaining records.
 */
function rewriteRemoteCacheIndex(storage: WallpaperLocalStorage | undefined, records: readonly StoredImageRecord[]): void {
  if (storage === undefined) return
  try {
    const entries = records
      .filter(record => record.kind === 'remote' && record.sourceUrl !== undefined)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .map(record => ({
        url: record.sourceUrl as string,
        key: record.key,
        size: record.size,
        usedAt: record.lastUsedAt,
      }))
    storage.setItem(REMOTE_CACHE_INDEX_KEY, JSON.stringify(entries))
  } catch {
    /* the mirror is best effort */
  }
}

/**
 * Remove disposable local wallpaper data: every cached/upload image that the
 * current wallpaper does not need, plus the recent-wallpaper history and the
 * remote-cache mirror. The current wallpaper selection/effects record and its
 * image blob are always preserved, so the visible wallpaper never breaks.
 * Never throws; partial failures are returned for a non-fatal UI message.
 * @param options - injected store/storage and the current selection.
 * @returns counts + status for the UI result.
 */
export async function clearAllLocalWallpaperData(
  options: ClearLocalWallpaperDataOptions = {},
): Promise<ClearLocalWallpaperDataResult> {
  const storage = options.storage
  const images = options.images ?? createIndexedDbImageStore()
  const selection = options.selection
  const liveSelection = (): WallpaperSelection => options.getSelection?.() ?? selection
  const liveDurable = (): WallpaperSelection => options.getDurableSelection?.() ?? options.durableSelection ?? selection
  const livePersisted = (): WallpaperSelection => options.getPersistedSelection?.() ?? selection
  const liveReferencedUploadKeys = (): ReadonlySet<string> => options.getReferencedUploadKeys?.() ?? new Set<string>()
  const errors: string[] = []
  let removedImages = 0
  let keptImages = 0
  let remaining: readonly StoredImageRecord[] = []
  if (images !== undefined) {
    let records: readonly StoredImageRecord[] = []
    try {
      records = await images.list()
    } catch (error) {
      errors.push('list')
      warnDiagnostic('could not list local wallpaper images for cleanup', error)
    }
    const kept: StoredImageRecord[] = []
    for (const record of records) {
      const current = liveSelection()
      const durable = liveDurable()
      const persisted = livePersisted()
      const protectedUploadKeys = new Set<string>(liveReferencedUploadKeys())
      const protectedRemoteUrls = new Set<string>()
      for (const candidate of [current, durable, persisted]) {
        if (candidate?.kind === 'upload') protectedUploadKeys.add(candidate.key)
        if (candidate?.kind === 'remote') protectedRemoteUrls.add(candidate.url)
      }
      const isCurrent = (record.kind === 'upload' && protectedUploadKeys.has(record.key))
        || (record.kind === 'remote' && record.sourceUrl !== undefined && protectedRemoteUrls.has(record.sourceUrl))
      if (isCurrent) {
        keptImages += 1
        kept.push(record)
        continue
      }
      try {
        await images.delete(record.key)
        removedImages += 1
      } catch (error) {
        errors.push(record.key)
        warnDiagnostic(`could not delete local wallpaper image ${record.key}`, error)
        kept.push(record)
      }
    }
    remaining = kept
  }
  const clearKey = (key: string): boolean => {
    if (storage === undefined) return false
    try {
      if (storage.getItem(key) === null) return false
      storage.removeItem(key)
      return true
    } catch (error) {
      errors.push(key)
      warnDiagnostic(`could not clear local wallpaper data ${key}`, error)
      return false
    }
  }
  const clearedHistory = clearKey(RECENT_WALLPAPER_KEY)
  const clearedIndex = clearKey(REMOTE_CACHE_INDEX_KEY)
  // The mirror is disposable: if it survived the clear, rebuild it from the only
  // records still on disk so it cannot reference deleted blobs.
  if (clearedIndex) rewriteRemoteCacheIndex(storage, remaining)
  const status: ClearLocalWallpaperDataStatus = errors.length > 0
    ? 'partial'
    : removedImages > 0 || clearedHistory || clearedIndex
      ? 'cleared'
      : 'empty'
  return { status, removedImages, keptImages, clearedHistory, clearedIndex, errors }
}

/**
 * URLs whose recent-cache blobs should be deleted after a history update,
 * preserving the currently used remote wallpaper.
 * @param previous - history before the update.
 * @param next - history after the update.
 * @param protectedUrl - currently applied remote URL (never evicted).
 * @returns URLs safe to delete.
 */
export function evictedRecentUrls(
  previous: readonly { readonly url: string }[],
  next: readonly { readonly url: string }[],
  protectedUrl: string | undefined,
): readonly string[] {
  const kept = new Set(next.map(entry => entry.url))
  return previous
    .map(entry => entry.url)
    .filter(url => !kept.has(url) && url !== protectedUrl)
}

/**
 * Remote URLs whose cache blobs should be deleted when clearing history,
 * preserving the currently used remote wallpaper.
 * @param entries - history being cleared.
 * @param protectedUrl - currently applied remote URL (never evicted).
 * @returns URLs safe to delete.
 */
export function clearableRecentUrls(
  entries: readonly { readonly url: string }[],
  protectedUrl: string | undefined,
): readonly string[] {
  return entries.map(entry => entry.url).filter(url => url !== protectedUrl)
}
