/**
 * Uploaded-wallpaper lifecycle helpers: only the active upload blob should stay
 * in IndexedDB. Cleanup is always best effort — a failed delete is reported as a
 * non-fatal diagnostic and must never break the visible wallpaper.
 */
import type { WallpaperSelection } from '../wallpaper.js'
import type { WallpaperImageStore } from './storage.js'

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
    try {
      console.warn(`[dsh-livery] could not delete ${context} wallpaper image ${key}`, error)
    } catch {
      /* console unavailable */
    }
    return false
  }
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
