/**
 * Multi-tab synchronization helpers for wallpaper state and recent history.
 *
 * A persisted v2 record carries a monotonic `revision` and a per-tab `sourceId`.
 * External storage events are adopted only when their revision is newer; own
 * echoes / older revisions are ignored, which prevents write loops.
 */
import { parseWallpaperState } from '../wallpaper.js'
import type { HydratedWallpaperState } from '../wallpaper.js'
import { RECENT_WALLPAPER_KEY, readRecentWallpapers } from './history.js'
import type { RecentWallpaperEntry, RecentWallpaperStorage } from './history.js'

/** The subset of the DOM StorageEvent the sync layer consumes. */
export interface StorageEventLike {
  readonly key: string | null
  readonly newValue: string | null
}

/** Minimal event target (injectable in tests). */
export interface StorageEventTarget {
  addEventListener(type: 'storage', listener: (event: StorageEventLike) => void): void
  removeEventListener(type: 'storage', listener: (event: StorageEventLike) => void): void
}

/** One parsed external wallpaper record. */
export interface ExternalWallpaperState {
  readonly state: HydratedWallpaperState
  readonly sourceId: string | undefined
  readonly raw: string
}

/**
 * Generate a unique per-tab source id (browser tab session scope).
 * @returns opaque id.
 */
export function createTabSourceId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    /* fall through */
  }
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Parse a storage-event value for the wallpaper state key.
 * @param newValue - raw localStorage value (null when removed).
 * @returns parsed state, or undefined for absent/invalid/unknown-version data.
 */
export function parseExternalWallpaperState(newValue: string | null): ExternalWallpaperState | undefined {
  if (newValue === null || newValue.length === 0) return undefined
  let raw: unknown
  try {
    raw = JSON.parse(newValue)
  } catch {
    return undefined
  }
  const state = parseWallpaperState(raw)
  if (state === undefined) return undefined
  const sourceId = typeof (raw as Record<string, unknown>).sourceId === 'string'
    ? (raw as Record<string, string>).sourceId
    : undefined
  return { state, sourceId, raw: newValue }
}

/**
 * Whether an external record may replace the local state.
 * @param args - revisions, source ids and last published raw value.
 * @returns true only for a strictly newer, non-own record.
 */
export function shouldApplyExternalState(args: {
  readonly currentRevision: number
  readonly incomingRevision: number
  readonly incomingSourceId: string | undefined
  readonly ownSourceId: string | undefined
  readonly lastPublishedRaw: string | undefined
  readonly incomingRaw: string
}): boolean {
  if (args.lastPublishedRaw !== undefined && args.lastPublishedRaw === args.incomingRaw) return false
  if (args.incomingSourceId !== undefined && args.ownSourceId !== undefined
    && args.incomingSourceId === args.ownSourceId) return false
  if (!Number.isInteger(args.incomingRevision)) return false
  if (args.incomingRevision > args.currentRevision) return true
  // Concurrent writes can produce the same local counter in two tabs. Break
  // the tie deterministically by source id so both tabs converge on one state.
  if (args.incomingRevision === args.currentRevision
    && args.incomingSourceId !== undefined && args.ownSourceId !== undefined) {
    return args.incomingSourceId > args.ownSourceId
  }
  return false
}

/**
 * Read recent history from a storage event (undefined when the key is unrelated).
 * @param event - storage event.
 * @param storage - localStorage-like reader for fallback.
 * @returns next history entries, or undefined to ignore the event.
 */
export function readRecentFromStorageEvent(
  event: StorageEventLike,
  storage: RecentWallpaperStorage | undefined,
): readonly RecentWallpaperEntry[] | undefined {
  if (event.key !== RECENT_WALLPAPER_KEY) return undefined
  if (event.newValue === null) return []
  // Re-read through the shared parser so corrupt data is ignored consistently.
  return readRecentWallpapers(storage)
}

/**
 * Subscribe to wallpaper-state storage events.
 * @param deps - event target, key, and handler.
 * @returns unsubscribe.
 */
export function createWallpaperStorageSync(deps: {
  readonly eventTarget: StorageEventTarget | undefined
  readonly key: string
  readonly onExternal: (newValue: string | null) => void
}): () => void {
  const target = deps.eventTarget
  if (target === undefined) return () => undefined
  const listener = (event: StorageEventLike): void => {
    if (event.key !== deps.key) return
    deps.onExternal(event.newValue)
  }
  target.addEventListener('storage', listener)
  return () => target.removeEventListener('storage', listener)
}
