/**
 * Explicit cross-tab upload reference table.
 *
 * Each tab writes its own localStorage key containing the upload keys its live
 * and durable selections need. GC reads the whole table before deleting a blob,
 * so a delayed delete cannot race a tab that still points at it. Per-tab keys
 * avoid read-modify-write lost updates between tabs.
 */
import type { WallpaperSelection } from '../wallpaper.js'

/** localStorage key prefix for one tab's refs. */
export const WALLPAPER_REFS_PREFIX = 'dsh-livery.wallpaper.ref.'
/** Refs older than this are treated as crashed-tab leftovers. */
export const WALLPAPER_REF_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** localStorage subset used by refs (enumeration is optional in tests). */
export interface WallpaperRefStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  readonly length?: number
  key?(index: number): string | null
}

/** One tab's live/durable upload references. */
interface RefRecord {
  readonly uploads: readonly string[]
  readonly updatedAt: number
}

function parseRef(raw: string | null): RefRecord | undefined {
  if (raw === null) return undefined
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return undefined
    const record = value as Record<string, unknown>
    if (!Array.isArray(record.uploads) || typeof record.updatedAt !== 'number') return undefined
    const uploads = record.uploads.filter((key): key is string => typeof key === 'string' && /^upload-/u.test(key))
    return { uploads, updatedAt: record.updatedAt }
  } catch {
    return undefined
  }
}

function refKeys(storage: WallpaperRefStorage): string[] {
  if (typeof storage.key === 'function' && typeof storage.length === 'number') {
    const keys: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key !== null && key.startsWith(WALLPAPER_REFS_PREFIX)) keys.push(key)
    }
    return keys
  }
  return []
}

/**
 * Publish one tab's referenced upload keys.
 * @param storage - localStorage subset.
 * @param sourceId - tab identity.
 * @param selections - live and durable selections.
 */
export function writeWallpaperRefs(
  storage: WallpaperRefStorage | undefined,
  sourceId: string,
  selections: readonly WallpaperSelection[],
): void {
  if (storage === undefined) return
  const uploads = new Set<string>()
  for (const selection of selections) {
    if (selection?.kind === 'upload') uploads.add(selection.key)
  }
  const record: RefRecord = { uploads: [...uploads], updatedAt: Date.now() }
  try {
    storage.setItem(`${WALLPAPER_REFS_PREFIX}${encodeURIComponent(sourceId)}`, JSON.stringify(record))
  } catch {
    /* refs are best effort; durable state remains the primary protection */
  }
}

/** Remove one tab's ref (clean tab close/unmount). */
export function removeWallpaperRefs(storage: WallpaperRefStorage | undefined, sourceId: string): void {
  if (storage === undefined) return
  try {
    storage.removeItem(`${WALLPAPER_REFS_PREFIX}${encodeURIComponent(sourceId)}`)
  } catch {
    /* best effort */
  }
}

/**
 * Upload keys referenced by any live tab. Stale entries are ignored but never
 * let an unknown live tab lose protection for a fresh ref.
 * @param storage - localStorage subset.
 * @param now - current epoch milliseconds.
 * @returns protected upload keys.
 */
export function readReferencedUploadKeys(
  storage: WallpaperRefStorage | undefined,
  now: number = Date.now(),
): ReadonlySet<string> | undefined {
  if (storage === undefined) return undefined
  const keys = refKeys(storage)
  // No enumeration support is UNKNOWN, not empty: destructive GC must fail closed.
  if (typeof storage.key !== 'function' || typeof storage.length !== 'number') return undefined
  const protectedKeys = new Set<string>()
  for (const key of keys) {
    const record = parseRef(storage.getItem(key))
    if (record === undefined) continue
    if (now - record.updatedAt > WALLPAPER_REF_TTL_MS) continue
    for (const upload of record.uploads) protectedKeys.add(upload)
  }
  return protectedKeys
}
