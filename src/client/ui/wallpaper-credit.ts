/**
 * Wallpaper credit resolution and the one-shot legacy attribution migration
 * (0.2.2).
 *
 * The persisted remote selection's `provenance` is the authoritative store for
 * the current image's creator/licence/source; recent history is only a display
 * mirror (and legacy entries may lack the additive URL fields). The wallpaper
 * panel therefore resolves the visible credit here instead of owning a second
 * attribution localStorage key.
 *
 * 0.2.1/early-0.2.2 builds stored `dsh-livery.wallpaper.attribution.v1`. This
 * module migrates that record exactly once, only when its `identity` still names
 * the current remote selection and the selection has no provenance, writes the
 * normalized provenance back through the controller, and then deletes the
 * legacy key. It never writes that key again.
 */
import {
  normalizeWallpaperProvenance,
  normalizeWallpaperProvenanceUrl,
  provenanceOfSelection,
} from '../wallpaper.js'
import type { WallpaperProvenance, WallpaperSelection } from '../wallpaper.js'
import { providerById } from '../wallpaper/providers.js'
import type { ProviderId } from '../wallpaper/providers.js'
import type { RecentWallpaperEntry } from '../wallpaper/history.js'

/** Legacy panel-owned attribution key (migrated once, then removed). */
export const LEGACY_ATTRIBUTION_STORAGE_KEY = 'dsh-livery.wallpaper.attribution.v1'

/** One resolved credit of the current remote wallpaper. */
export interface WallpaperCredit {
  readonly providerId: ProviderId | undefined
  readonly title: string | undefined
  readonly creator: string | undefined
  readonly creatorUrl: string | undefined
  readonly license: string | undefined
  readonly licenseUrl: string | undefined
  readonly source: string | undefined
  readonly sourceUrl: string | undefined
}

/** One safe clickable attribution link. */
export interface WallpaperCreditLink {
  readonly kind: WallpaperCreditLinkKind
  readonly href: string
  readonly text: string
}

/** Which credit field a link belongs to. */
export type WallpaperCreditLinkKind = 'creator' | 'license' | 'source'

/** Hostname of one validated URL, or the URL itself when parsing fails. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * Resolve the visible credit of the current selection.
 *
 * Fields come from the selection provenance first, then from the matching
 * recent-history entry (legacy records predate provenance). URLs are re-validated
 * as https public-host links; invalid ones are dropped rather than rendered.
 * @param selection - current wallpaper selection.
 * @param recent - recent-history display mirror.
 * @returns the credit, or undefined when nothing usable is known.
 */
export function resolveWallpaperCredit(
  selection: WallpaperSelection,
  recent: readonly RecentWallpaperEntry[],
): WallpaperCredit | undefined {
  if (selection === undefined || selection.kind !== 'remote') return undefined
  const provenance = provenanceOfSelection(selection)
  const entry = recent.find(candidate => candidate.url === selection.url)
  if (provenance === undefined && entry === undefined) return undefined
  const provider = provenance?.providerId === undefined
    ? undefined
    : providerById(provenance.providerId)
  const credit: WallpaperCredit = {
    providerId: provider?.id,
    title: provenance?.title ?? entry?.title,
    creator: provenance?.creator ?? entry?.creator,
    creatorUrl: normalizeWallpaperProvenanceUrl(provenance?.creatorUrl ?? entry?.creatorUrl),
    license: provenance?.license ?? entry?.license,
    licenseUrl: normalizeWallpaperProvenanceUrl(provenance?.licenseUrl ?? entry?.licenseUrl),
    source: provenance?.source ?? entry?.source,
    sourceUrl: normalizeWallpaperProvenanceUrl(provenance?.sourceUrl ?? entry?.sourceUrl),
  }
  return hasWallpaperCredit(credit) ? credit : undefined
}

/**
 * Whether one credit carries any displayable text or safe link.
 * @param credit - resolved credit.
 * @returns true when at least one field is present.
 */
export function hasWallpaperCredit(credit: WallpaperCredit): boolean {
  return credit.title !== undefined
    || credit.creator !== undefined
    || credit.license !== undefined
    || credit.source !== undefined
    || credit.creatorUrl !== undefined
    || credit.licenseUrl !== undefined
    || credit.sourceUrl !== undefined
}

/**
 * Build the clickable attribution links of one credit in a stable order
 * (creator, licence, source). Only normalized https public-host URLs are kept.
 * @param credit - resolved credit.
 * @returns safe links (possibly empty).
 */
export function wallpaperCreditLinks(credit: WallpaperCredit | undefined): readonly WallpaperCreditLink[] {
  if (credit === undefined) return []
  const links: WallpaperCreditLink[] = []
  // Defence in depth: every href is re-validated here, so a caller-constructed
  // credit can never put a non-portable URL into an anchor.
  const creatorUrl = normalizeWallpaperProvenanceUrl(credit.creatorUrl)
  if (creatorUrl !== undefined) {
    links.push({ kind: 'creator', href: creatorUrl, text: credit.creator ?? hostOf(creatorUrl) })
  }
  const licenseUrl = normalizeWallpaperProvenanceUrl(credit.licenseUrl)
  if (licenseUrl !== undefined) {
    links.push({ kind: 'license', href: licenseUrl, text: credit.license ?? hostOf(licenseUrl) })
  }
  const sourceUrl = normalizeWallpaperProvenanceUrl(credit.sourceUrl)
  if (sourceUrl !== undefined) {
    links.push({ kind: 'source', href: sourceUrl, text: credit.source ?? hostOf(sourceUrl) })
  }
  return links
}

/** Legacy attribution record written by the old panel (validated subset). */
export interface LegacyAttributionRecord {
  readonly identity: string
  readonly title: string
  readonly creator: string
  readonly license: string
  readonly source: string
  readonly context: 'online' | 'custom'
}

/** Normalize one legacy display string (the old writer always used strings). */
function legacyText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

/**
 * Parse one legacy attribution value defensively. Unknown/corrupt records are
 * rejected so the caller can remove the obsolete key.
 * @param raw - `JSON.parse`d value of the legacy key.
 * @returns the validated record, or undefined.
 */
export function parseLegacyAttribution(raw: unknown): LegacyAttributionRecord | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const row = raw as Record<string, unknown>
  if (typeof row.identity !== 'string' || row.identity.length === 0 || row.identity.length > 2048) return undefined
  if (row.context !== 'online' && row.context !== 'custom') return undefined
  return {
    identity: row.identity,
    title: legacyText(row.title, 200),
    creator: legacyText(row.creator, 120),
    license: legacyText(row.license, 120),
    source: legacyText(row.source, 200),
    context: row.context,
  }
}

/**
 * Map a legacy record to normalized selection provenance (drops empty fields and
 * any non-portable value).
 * @param record - validated legacy record.
 * @returns the provenance, or undefined when every field is empty.
 */
export function legacyAttributionProvenance(
  record: LegacyAttributionRecord,
): WallpaperProvenance | undefined {
  return normalizeWallpaperProvenance({
    title: record.title,
    creator: record.creator,
    license: record.license,
    source: record.source,
  })
}

/** Outcome of one legacy-key migration attempt. */
export type LegacyAttributionMigration = 'migrated' | 'removed' | 'none'

/** Options of {@link migrateLegacyAttribution}. */
export interface LegacyAttributionMigrationOptions {
  readonly storage: {
    getItem(key: string): string | null
    removeItem(key: string): void
  } | undefined
  /** Current live selection (the only selection the key may describe). */
  readonly selection: WallpaperSelection
  /**
   * Re-save the selection with provenance. Returning false means the write did
   * not land, so the legacy key is kept for a later mount.
   */
  readonly save: (selection: WallpaperSelection) => boolean
}

/**
 * Migrate the legacy panel attribution key exactly once.
 *
 * - Only a remote selection whose `identity === 'remote:<url>'` may consume it.
 * - When the selection already carries provenance, or the record has no usable
 *   text, the obsolete key is removed without a write.
 * - Otherwise the selection is re-saved with normalized provenance and the key
 *   is removed only after that write succeeded.
 * @param options - storage, live selection and persistence port.
 * @returns what happened (`migrated`, obsolete `removed`, or left `none`).
 */
export function migrateLegacyAttribution(
  options: LegacyAttributionMigrationOptions,
): LegacyAttributionMigration {
  const storage = options.storage
  if (storage === undefined) return 'none'
  let raw: string | null
  try {
    raw = storage.getItem(LEGACY_ATTRIBUTION_STORAGE_KEY)
  } catch {
    return 'none'
  }
  if (raw === null || raw.length === 0) return 'none'
  const remove = (): void => {
    try {
      storage.removeItem(LEGACY_ATTRIBUTION_STORAGE_KEY)
    } catch {
      /* storage can be disabled; the key is obsolete either way */
    }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    remove()
    return 'removed'
  }
  const record = parseLegacyAttribution(parsed)
  if (record === undefined) {
    remove()
    return 'removed'
  }
  const selection = options.selection
  if (selection === undefined || selection.kind !== 'remote'
    || record.identity !== `remote:${selection.url}`) return 'none'
  // The selection is authoritative: an obsolete duplicate key can go.
  if (selection.provenance !== undefined) {
    remove()
    return 'removed'
  }
  const provenance = legacyAttributionProvenance(record)
  if (provenance === undefined) {
    remove()
    return 'removed'
  }
  let saved = false
  try {
    saved = options.save({ kind: 'remote', url: selection.url, provenance })
  } catch {
    saved = false
  }
  if (!saved) return 'none'
  remove()
  return 'migrated'
}
