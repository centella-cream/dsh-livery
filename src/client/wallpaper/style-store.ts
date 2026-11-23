/**
 * Style sidecar persistence — `kind: 'style'` survives a 0.2.1 downgrade.
 *
 * The main wallpaper record (`WALLPAPER_STORAGE_KEY`) must stay byte-compatible
 * with 0.2.1, so a style selection is **never** written into it: the main record
 * holds the revisioned `{kind:'none'}` tombstone and this additive sidecar key
 * holds the variant plus the identity of the main-record write it belongs to.
 *
 * 0.2.1 does not know the sidecar key, so it never deletes it; instead, it moves
 * the main `(revision, sourceId)` identity on (any effects/position/selection
 * write does), which makes the sidecar stale. Hydration therefore adopts style
 * only when the sidecar parses **and** its identity exactly equals the current
 * main record's identity and the main selection is cleared.
 *
 * The main record is the only ordering signal. The sidecar is never adopted from
 * a storage event by itself, and every style write re-reads the main record
 * first (the write guard) so a behind tab cannot overwrite a newer tab's style.
 */
import {
  normalizeWallpaperRevision,
  WALLPAPER_STORAGE_KEY,
  WALLPAPER_STYLE_SCHEMA_VERSION,
  WALLPAPER_STYLE_STORAGE_KEY,
} from '../wallpaper.js'
import type { StoredWallpaperStyle, WallpaperStateIdentity } from '../wallpaper.js'
import { parseExternalWallpaperState } from './sync.js'
import { isStyleWallpaperVariant } from './style.js'
import type { StyleWallpaperVariant } from './style.js'

export { WALLPAPER_STYLE_SCHEMA_VERSION, WALLPAPER_STYLE_STORAGE_KEY } from '../wallpaper.js'
export type { StoredWallpaperStyle, WallpaperStateIdentity } from '../wallpaper.js'

/** Minimal storage faces used by the sidecar helpers (injectable in tests). */
export interface WallpaperStyleReadStorage {
  getItem(key: string): string | null
}
export interface WallpaperStyleWriteStorage extends WallpaperStyleReadStorage {
  setItem(key: string, value: string): void
}
export interface WallpaperStyleRemoveStorage extends WallpaperStyleReadStorage {
  removeItem(key: string): void
}

/**
 * Normalize one identity half for comparison: an unpublished/legacy record has
 * no source id, which compares equal to the sidecar's empty string.
 * @param value - source id or undefined.
 * @returns a comparable string.
 */
function identitySourceId(value: string | undefined): string {
  return value ?? ''
}

/**
 * Structural equality of two `(revision, sourceId)` identities.
 * @param a - one identity.
 * @param b - the other identity.
 * @returns true when both halves are exactly equal.
 */
export function sameWallpaperStateIdentity(a: WallpaperStateIdentity, b: WallpaperStateIdentity): boolean {
  return a.revision === b.revision && identitySourceId(a.sourceId) === identitySourceId(b.sourceId)
}

/**
 * Build the identity of one parsed main record.
 * @param revision - parsed main-record revision.
 * @param sourceId - parsed per-tab source id.
 * @returns the identity used for sidecar reads/writes.
 */
export function wallpaperStateIdentityOf(
  revision: number,
  sourceId: string | undefined,
): WallpaperStateIdentity {
  return { revision: normalizeWallpaperRevision(revision), ...(sourceId === undefined ? {} : { sourceId }) }
}

/**
 * Parse one untrusted sidecar value. Unknown variants/schema versions and
 * malformed fields are rejected (the main record then wins).
 * @param raw - `JSON.parse`d sidecar value.
 * @returns the validated record, or undefined.
 */
export function parseStoredWallpaperStyle(raw: unknown): StoredWallpaperStyle | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const record = raw as Record<string, unknown>
  if (record.schemaVersion !== WALLPAPER_STYLE_SCHEMA_VERSION) return undefined
  if (!isStyleWallpaperVariant(record.variant)) return undefined
  if (typeof record.revision !== 'number' || !Number.isFinite(record.revision) || record.revision < 0) return undefined
  if (typeof record.sourceId !== 'string') return undefined
  return {
    schemaVersion: WALLPAPER_STYLE_SCHEMA_VERSION,
    variant: record.variant,
    revision: normalizeWallpaperRevision(record.revision),
    sourceId: record.sourceId,
  }
}

/**
 * Build the sidecar record for one style write.
 * @param variant - style variant.
 * @param identity - identity of the main-record tombstone just written.
 * @returns the sidecar record.
 */
export function serializeStoredWallpaperStyle(
  variant: StyleWallpaperVariant,
  identity: WallpaperStateIdentity,
): StoredWallpaperStyle {
  return {
    schemaVersion: WALLPAPER_STYLE_SCHEMA_VERSION,
    variant,
    revision: normalizeWallpaperRevision(identity.revision),
    sourceId: identitySourceId(identity.sourceId),
  }
}

/**
 * Read the sidecar and return its variant only when it parses and its identity
 * exactly equals the caller's winning main-record identity. The caller has
 * already established that the main selection is cleared; this helper compares
 * only the `(revision, sourceId)` halves so hydration and adoption share one
 * rule.
 * @param storage - localStorage subset (undefined reads nothing).
 * @param identity - identity of the parsed main record.
 * @returns the style variant, or undefined for absent/corrupt/mismatched sidecars.
 */
export function readStoredWallpaperStyle(
  storage: WallpaperStyleReadStorage | undefined,
  identity: WallpaperStateIdentity,
): StyleWallpaperVariant | undefined {
  if (storage === undefined) return undefined
  let raw: unknown
  try {
    const text = storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)
    if (text === null || text.length === 0) return undefined
    raw = JSON.parse(text)
  } catch {
    return undefined
  }
  const stored = parseStoredWallpaperStyle(raw)
  if (stored === undefined) return undefined
  if (!sameWallpaperStateIdentity(wallpaperStateIdentityOf(stored.revision, stored.sourceId), identity)) {
    return undefined
  }
  return stored.variant
}

/**
 * Write/refresh the sidebar for one style write, guarded by the main record.
 *
 * The writer must already have written the main tombstone for `identity`, then
 * this function re-reads the current main raw and writes the sidecar only when
 * the re-read identity still equals `identity`. A newer tab's write therefore
 * wins: the sidecar is left untouched and that tab's style is not erased. A
 * sidecar write failure is swallowed (the main tombstone leaves "no wallpaper",
 * never a half-style).
 * @param storage - localStorage subset (undefined is a silent no-op/failure).
 * @param write - variant + identity of the main-record write.
 * @returns true only when the sidecar bytes were written.
 */
export function writeStoredWallpaperStyle(
  storage: WallpaperStyleWriteStorage | undefined,
  write: { readonly variant: StyleWallpaperVariant; readonly identity: WallpaperStateIdentity },
): boolean {
  if (storage === undefined) return false
  try {
    // Write guard: the main record must still be this writer's tombstone.
    const current = parseExternalWallpaperState(storage.getItem(WALLPAPER_STORAGE_KEY))
    if (current === undefined) return false
    const currentIdentity = wallpaperStateIdentityOf(current.state.revision, current.sourceId)
    if (!sameWallpaperStateIdentity(currentIdentity, write.identity)) return false
    storage.setItem(
      WALLPAPER_STYLE_STORAGE_KEY,
      JSON.stringify(serializeStoredWallpaperStyle(write.variant, write.identity)),
    )
    return true
  } catch {
    return false
  }
}

/**
 * Remove the sidecar only when the current main record still belongs to the
 * writer. This is the removal counterpart of the write guard: a behind tab that
 * writes an image or a clear must not delete a newer tab's style sidecar.
 * @param storage - localStorage subset.
 * @param identity - identity of the main-record write just performed.
 * @returns true when the sidecar was removed or was already absent under this
 * identity; false when another tab's newer main record won or storage failed.
 */
export function removeStoredWallpaperStyleIfOwn(
  storage: WallpaperStyleRemoveStorage | undefined,
  identity: WallpaperStateIdentity,
): boolean {
  if (storage === undefined) return false
  try {
    const current = parseExternalWallpaperState(storage.getItem(WALLPAPER_STORAGE_KEY))
    if (current === undefined) return false
    const currentIdentity = wallpaperStateIdentityOf(current.state.revision, current.sourceId)
    if (!sameWallpaperStateIdentity(currentIdentity, identity)) return false
    storage.removeItem(WALLPAPER_STYLE_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

/**
 * Remove the sidecar unconditionally (best effort). Only for teardown/reset
 * paths, never for the versioned persist path.
 * @param storage - localStorage subset.
 */
export function removeStoredWallpaperStyle(storage: WallpaperStyleRemoveStorage | undefined): void {
  if (storage === undefined) return
  try {
    storage.removeItem(WALLPAPER_STYLE_STORAGE_KEY)
  } catch {
    /* quota/disabled storage: the stale sidecar is ignored by the identity rule */
  }
}
