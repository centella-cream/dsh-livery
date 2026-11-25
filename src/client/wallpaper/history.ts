/**
 * Local history of applied online wallpapers.
 *
 * Stored in localStorage (never uploaded, independent of the DSH profile):
 * newest first, deduped by URL, capped at 24, https-only, corrupt records ignored.
 *
 * The persisted remote selection's provenance is the authoritative credit; this
 * history is only a display mirror. It may therefore lack attribution links that
 * the selection carries, and old entries without the optional URL fields stay
 * valid.
 */
import { normalizeWallpaperProvenanceUrl, validateWallpaperUrl } from '../wallpaper.js'
import { safeRemoteImageUrl } from './host-safety.js'

/** One remembered online wallpaper. */
export interface RecentWallpaperEntry {
  readonly url: string
  readonly thumbnail?: string | undefined
  /** Registered provider id for the provenance-to-notice path. */
  readonly providerId?: string | undefined
  readonly title?: string | undefined
  readonly creator?: string | undefined
  readonly license?: string | undefined
  readonly source?: string | undefined
  /** Direct-provider entries live only in the v2 key; 0.2.2 never sees them. */
  readonly delivery?: 'direct' | undefined
  /** Optional credit links (schema-compatible additive fields; old entries lack them). */
  readonly creatorUrl?: string | undefined
  readonly licenseUrl?: string | undefined
  readonly sourceUrl?: string | undefined
  readonly addedAt: number
}

/** localStorage key. */
export const RECENT_WALLPAPER_KEY = 'dsh-livery.wallpaper.recent.v1'
/** Direct-only history key; 0.2.2 reads only the v1 key. */
export const DIRECT_RECENT_WALLPAPER_KEY = 'dsh-livery.wallpaper.recent.v2'
/** Clear tombstone: survives the entries-key removal and wins over stale tabs. */
export const RECENT_WALLPAPER_CLEAR_KEY = 'dsh-livery.wallpaper.recent.clear.v1'
/** Maximum remembered entries. */
export const MAX_RECENT_WALLPAPERS = 24
/** Max length of a stored display string. */
const MAX_TEXT = 200

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
  if (url === undefined || safeRemoteImageUrl(url) === undefined) return undefined
  const addedAt = typeof row.addedAt === 'number' && Number.isFinite(row.addedAt) ? row.addedAt : 0
  const thumbnail = safeRemoteImageUrl(row.thumbnail)
  const providerIdValue = text(row.providerId)
  const providerId = providerIdValue !== undefined && /^[a-z0-9][a-z0-9-]{0,63}$/u.test(providerIdValue)
    ? providerIdValue
    : undefined
  const title = text(row.title)
  const creator = text(row.creator)
  const license = text(row.license)
  const source = text(row.source)
  const creatorUrl = normalizeWallpaperProvenanceUrl(row.creatorUrl)
  const licenseUrl = normalizeWallpaperProvenanceUrl(row.licenseUrl)
  const sourceUrl = normalizeWallpaperProvenanceUrl(row.sourceUrl)
  const delivery = row.delivery === 'direct' ? 'direct' as const : undefined
  return {
    url,
    ...(providerId === undefined ? {} : { providerId }),
    ...(thumbnail === undefined ? {} : { thumbnail }),
    ...(title === undefined ? {} : { title }),
    ...(creator === undefined ? {} : { creator }),
    ...(license === undefined ? {} : { license }),
    ...(source === undefined ? {} : { source }),
    ...(creatorUrl === undefined ? {} : { creatorUrl }),
    ...(licenseUrl === undefined ? {} : { licenseUrl }),
    ...(sourceUrl === undefined ? {} : { sourceUrl }),
    ...(delivery === undefined ? {} : { delivery }),
    addedAt,
  }
}

/**
 * Read the persisted history, newest first, https-only, max 24.
 * @param storage - localStorage subset (undefined returns []).
 * @returns valid entries.
 */
export function readRecentWallpapers(
  storage: RecentWallpaperStorage | undefined,
  key = RECENT_WALLPAPER_KEY,
): readonly RecentWallpaperEntry[] {
  if (storage === undefined) return []
  try {
    const raw: unknown = JSON.parse(storage.getItem(key) ?? 'null')
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
    ...(sanitized.providerId ?? previous?.providerId) === undefined ? {} : { providerId: sanitized.providerId ?? previous?.providerId },
    ...(sanitized.thumbnail ?? previous?.thumbnail) === undefined ? {} : { thumbnail: sanitized.thumbnail ?? previous?.thumbnail },
    ...(sanitized.title ?? previous?.title) === undefined ? {} : { title: sanitized.title ?? previous?.title },
    ...(sanitized.creator ?? previous?.creator) === undefined ? {} : { creator: sanitized.creator ?? previous?.creator },
    ...(sanitized.license ?? previous?.license) === undefined ? {} : { license: sanitized.license ?? previous?.license },
    ...(sanitized.source ?? previous?.source) === undefined ? {} : { source: sanitized.source ?? previous?.source },
    ...(sanitized.creatorUrl ?? previous?.creatorUrl) === undefined ? {} : { creatorUrl: sanitized.creatorUrl ?? previous?.creatorUrl },
    ...(sanitized.licenseUrl ?? previous?.licenseUrl) === undefined ? {} : { licenseUrl: sanitized.licenseUrl ?? previous?.licenseUrl },
    ...(sanitized.sourceUrl ?? previous?.sourceUrl) === undefined ? {} : { sourceUrl: sanitized.sourceUrl ?? previous?.sourceUrl },
    ...(sanitized.delivery ?? previous?.delivery) === undefined ? {} : { delivery: sanitized.delivery ?? previous?.delivery },
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
    if (previous === undefined) {
      byUrl.set(parsed.url, parsed)
      continue
    }
    const parsedNewer = parsed.addedAt > previous.addedAt
      || (parsed.addedAt === previous.addedAt && JSON.stringify(parsed) >= JSON.stringify(previous))
    const newer = parsedNewer ? parsed : previous
    const older = parsedNewer ? previous : parsed
    const merged: RecentWallpaperEntry = {
      url: newer.url,
      addedAt: Math.max(previous.addedAt, parsed.addedAt),
      ...(newer.providerId ?? older.providerId) === undefined ? {} : { providerId: newer.providerId ?? older.providerId },
      ...(newer.thumbnail ?? older.thumbnail) === undefined ? {} : { thumbnail: newer.thumbnail ?? older.thumbnail },
      ...(newer.title ?? older.title) === undefined ? {} : { title: newer.title ?? older.title },
      ...(newer.creator ?? older.creator) === undefined ? {} : { creator: newer.creator ?? older.creator },
      ...(newer.license ?? older.license) === undefined ? {} : { license: newer.license ?? older.license },
      ...(newer.source ?? older.source) === undefined ? {} : { source: newer.source ?? older.source },
      ...(newer.creatorUrl ?? older.creatorUrl) === undefined ? {} : { creatorUrl: newer.creatorUrl ?? older.creatorUrl },
      ...(newer.licenseUrl ?? older.licenseUrl) === undefined ? {} : { licenseUrl: newer.licenseUrl ?? older.licenseUrl },
      ...(newer.sourceUrl ?? older.sourceUrl) === undefined ? {} : { sourceUrl: newer.sourceUrl ?? older.sourceUrl },
      ...(newer.delivery ?? older.delivery) === undefined ? {} : { delivery: newer.delivery ?? older.delivery },
    }
    byUrl.set(parsed.url, parseRecentEntry(merged) as RecentWallpaperEntry)
  }
  return [...byUrl.values()].sort((a, b) => b.addedAt - a.addedAt).slice(0, MAX_RECENT_WALLPAPERS)
}

/** Write one complete recent list (used by cross-tab merge). */
export function writeRecentWallpapers(
  storage: RecentWallpaperStorage | undefined,
  entries: readonly RecentWallpaperEntry[],
  key = RECENT_WALLPAPER_KEY,
): void {
  if (storage === undefined) return
  try {
    storage.setItem(key, JSON.stringify(entries.slice(0, MAX_RECENT_WALLPAPERS)))
  } catch {
    /* quota/disabled storage: keep the in-memory result */
  }
}

/** Persist one added entry and return the next history. */
export function rememberRecentWallpaper(
  storage: RecentWallpaperStorage | undefined,
  entry: RecentWallpaperEntry,
  key = RECENT_WALLPAPER_KEY,
): readonly RecentWallpaperEntry[] {
  const next = addRecentEntry(readRecentWallpapers(storage, key), entry)
  if (storage !== undefined) {
    try {
      storage.removeItem(RECENT_WALLPAPER_CLEAR_KEY)
      storage.setItem(key, JSON.stringify(next))
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
    // Versioned tombstone first, then remove entries. A tab that only sees the
    // key removal treats it as an authoritative clear; the tombstone prevents a
    // stale tab from re-adding its old list.
    storage.setItem(RECENT_WALLPAPER_CLEAR_KEY, JSON.stringify({ schemaVersion: 2, revision: Date.now() }))
    storage.removeItem(RECENT_WALLPAPER_KEY)
    storage.removeItem(DIRECT_RECENT_WALLPAPER_KEY)
  } catch {
    /* storage can be disabled */
  }
}
