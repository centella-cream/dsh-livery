/**
 * Local history of applied online wallpapers.
 *
 * Stored in localStorage (never uploaded, independent of the DSH profile):
 * newest first, deduped by URL, capped at 24, https-only, corrupt records ignored.
 */
import { validateWallpaperUrl } from '../wallpaper.js'

/** One remembered online wallpaper. */
export interface RecentWallpaperEntry {
  readonly url: string
  readonly thumbnail?: string | undefined
  readonly title?: string | undefined
  readonly creator?: string | undefined
  readonly license?: string | undefined
  readonly source?: string | undefined
  readonly addedAt: number
}

/** localStorage key. */
export const RECENT_WALLPAPER_KEY = 'dsh-livery.wallpaper.recent.v1'
/** Maximum remembered entries. */
export const MAX_RECENT_WALLPAPERS = 24
/** Max length of a stored display string. */
const MAX_TEXT = 160

/** localStorage subset (injectable in tests). */
export interface RecentWallpaperStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, MAX_TEXT)
  return trimmed.length === 0 ? undefined : trimmed
}

function https(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const check = validateWallpaperUrl(value)
  return check.ok ? check.url : undefined
}

/**
 * Parse one persisted entry; invalid/foreign records are dropped.
 * @param raw - unknown record from JSON.
 * @returns a sanitized entry or undefined.
 */
export function parseRecentEntry(raw: unknown): RecentWallpaperEntry | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const row = raw as Record<string, unknown>
  const url = https(row.url)
  if (url === undefined) return undefined
  const addedAt = typeof row.addedAt === 'number' && Number.isFinite(row.addedAt) ? row.addedAt : 0
  return {
    url,
    ...(https(row.thumbnail) === undefined ? {} : { thumbnail: https(row.thumbnail) }),
    ...(text(row.title) === undefined ? {} : { title: text(row.title) }),
    ...(text(row.creator) === undefined ? {} : { creator: text(row.creator) }),
    ...(text(row.license) === undefined ? {} : { license: text(row.license) }),
    ...(text(row.source) === undefined ? {} : { source: text(row.source) }),
    addedAt,
  }
}

/**
 * Read the persisted history, newest first, https-only, max 24.
 * @param storage - localStorage subset (undefined returns []).
 * @returns valid entries.
 */
export function readRecentWallpapers(storage: RecentWallpaperStorage | undefined): readonly RecentWallpaperEntry[] {
  if (storage === undefined) return []
  try {
    const raw: unknown = JSON.parse(storage.getItem(RECENT_WALLPAPER_KEY) ?? 'null')
    if (!Array.isArray(raw)) return []
    return raw
      .map(parseRecentEntry)
      .filter((entry): entry is RecentWallpaperEntry => entry !== undefined)
      .slice(0, MAX_RECENT_WALLPAPERS)
  } catch {
    return []
  }
}

/**
 * Insert/refresh one entry: dedupe by URL, newest first, capped.
 * @param entries - current entries.
 * @param entry - newly applied wallpaper.
 * @returns the next entries.
 */
export function addRecentEntry(
  entries: readonly RecentWallpaperEntry[],
  entry: RecentWallpaperEntry,
): readonly RecentWallpaperEntry[] {
  const sanitized = parseRecentEntry(entry)
  if (sanitized === undefined) return entries
  const previous = entries.find(candidate => candidate.url === sanitized.url)
  // Same URL with sparse new metadata (e.g. pasted again in the custom field)
  // must not erase an earlier Openverse title/creator/license/thumbnail.
  const merged: RecentWallpaperEntry = {
    url: sanitized.url,
    addedAt: Math.max(previous?.addedAt ?? 0, sanitized.addedAt),
    ...(sanitized.thumbnail ?? previous?.thumbnail) === undefined ? {} : { thumbnail: sanitized.thumbnail ?? previous?.thumbnail },
    ...(sanitized.title ?? previous?.title) === undefined ? {} : { title: sanitized.title ?? previous?.title },
    ...(sanitized.creator ?? previous?.creator) === undefined ? {} : { creator: sanitized.creator ?? previous?.creator },
    ...(sanitized.license ?? previous?.license) === undefined ? {} : { license: sanitized.license ?? previous?.license },
    ...(sanitized.source ?? previous?.source) === undefined ? {} : { source: sanitized.source ?? previous?.source },
  }
  return [merged, ...entries.filter(candidate => candidate.url !== sanitized.url)]
    .slice(0, MAX_RECENT_WALLPAPERS)
}

/**
 * Merge two history lists by URL (used when a storage event races a local add).
 * Existing metadata is retained field-by-field; callback order is not trusted.
 * @param left - local entries.
 * @param right - external entries.
 * @returns a deduped, newest-first list capped at 24.
 */
export function mergeRecentEntries(
  left: readonly RecentWallpaperEntry[],
  right: readonly RecentWallpaperEntry[],
): readonly RecentWallpaperEntry[] {
  const byUrl = new Map<string, RecentWallpaperEntry>()
  for (const entry of [...left, ...right]) {
    const parsed = parseRecentEntry(entry)
    if (parsed === undefined) continue
    const previous = byUrl.get(parsed.url)
    byUrl.set(parsed.url, previous === undefined
      ? parsed
      : parseRecentEntry({
        ...previous,
        ...parsed,
        addedAt: Math.max(previous.addedAt, parsed.addedAt),
      }) as RecentWallpaperEntry)
  }
  return [...byUrl.values()].sort((a, b) => b.addedAt - a.addedAt).slice(0, MAX_RECENT_WALLPAPERS)
}

/** Write one complete recent list (used by cross-tab merge). */
export function writeRecentWallpapers(
  storage: RecentWallpaperStorage | undefined,
  entries: readonly RecentWallpaperEntry[],
): void {
  if (storage === undefined) return
  try {
    storage.setItem(RECENT_WALLPAPER_KEY, JSON.stringify(entries.slice(0, MAX_RECENT_WALLPAPERS)))
  } catch {
    /* quota/disabled storage: keep the in-memory result */
  }
}

/** Persist one added entry and return the next history. */
export function rememberRecentWallpaper(
  storage: RecentWallpaperStorage | undefined,
  entry: RecentWallpaperEntry,
): readonly RecentWallpaperEntry[] {
  const next = addRecentEntry(readRecentWallpapers(storage), entry)
  if (storage !== undefined) {
    try {
      storage.setItem(RECENT_WALLPAPER_KEY, JSON.stringify(next))
    } catch {
      /* quota/disabled storage: keep the in-memory result */
    }
  }
  return next
}

/** Clear the history record. */
export function clearRecentWallpapers(storage: RecentWallpaperStorage | undefined): void {
  if (storage === undefined) return
  try {
    storage.removeItem(RECENT_WALLPAPER_KEY)
  } catch {
    /* storage can be disabled */
  }
}
