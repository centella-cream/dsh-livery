/**
 * Wallpaper controller — owns the client-only wallpaper state and its lifecycle.
 *
 * Mounted once by the client plugin (not by the page), so a wallpaper survives
 * navigation and reloads via `localStorage`. It hydrates the persisted schema v2
 * record (migrating legacy v1 flat records), rebuilds the owned stylesheet
 * whenever selection/effects/position/tokens change, and tears the layer down on
 * plugin dispose. Every selection+effects+position change goes through the batch
 * `setState` transition (one stylesheet write, one debounced save, one notify) so
 * presets/import/sync never render intermediate states. The UI talks to it
 * through the module singleton accessor below; no host config or boot payload is
 * involved.
 */
import type { TokenMap } from '../../core/types.js'
import {
  backgroundImageValue,
  buildWallpaperCss,
  clampEffects,
  DEFAULT_WALLPAPER_EFFECTS,
  DEFAULT_WALLPAPER_POSITION,
  normalizeWallpaperPosition,
  normalizeWallpaperRevision,
  parseWallpaperState,
  serializeWallpaperState,
  WALLPAPER_STORAGE_KEY,
} from '../wallpaper.js'
import type { WallpaperEffects, WallpaperPosition, WallpaperSelection } from '../wallpaper.js'
import { createWallpaperLayer } from './apply.js'
import { createIndexedDbImageStore } from './storage.js'
import { loadCachedRemote } from './cache.js'
import {
  createTabSourceId,
  createWallpaperStorageSync,
  parseExternalWallpaperState,
  shouldApplyExternalState,
} from './sync.js'
import type { StorageEventTarget } from './sync.js'
import type { StoredImageRecord, WallpaperImageStore } from './storage.js'
import type { WallpaperDocument, WallpaperLayer } from './apply.js'

/** Reactive wallpaper state consumed by the studio UI. */
export interface WallpaperState {
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
  /** Focal point of remote/upload wallpapers; built-in designs stay centered. */
  readonly position: WallpaperPosition
  /** Monotonic local revision, bumped once per applied state transition. */
  readonly revision: number
}

/** Partial state replacement applied atomically by {@link WallpaperControllerApi.setState}. */
export interface WallpaperStatePatch {
  /**
   * New wallpaper; omit to keep the current one, pass `undefined` explicitly to
   * clear it (an omitted key and an explicit `undefined` are different here).
   */
  readonly selection?: WallpaperSelection
  /** Effect values merged over the current ones, then clamped. */
  readonly effects?: Partial<WallpaperEffects>
  /** Focal position, normalized to the nine-grid stops. */
  readonly position?: WallpaperPosition
}

/** Options of one batch state transition. */
export interface WallpaperStateOptions {
  /**
   * Fresh local image copy (upload blob / cached remote blob) for the new
   * selection; rendered immediately with a local object URL.
   */
  readonly blob?: Blob | undefined
  /**
   * Adopt this exact revision instead of `current + 1` (external sync/preset
   * application where the origin revision must be preserved).
   */
  readonly revision?: number | undefined
  /** Persist immediately instead of waiting for the debounce window. */
  readonly flush?: boolean | undefined
}

/** localStorage subset used for persistence (injectable in tests). */
export interface WallpaperStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Controller face used by the client entry and the studio UI. */
export interface WallpaperControllerApi {
  getSnapshot(): WallpaperState
  subscribe(listener: () => void): () => void
  /**
   * Apply one wallpaper (builtin, validated remote URL, or upload blob), or
   * clear with undefined. Pass the blob to render a local object URL
   * immediately: uploads use the stored file, remote selections use the
   * best-effort disk cache. Hydration restores it from IndexedDB asynchronously.
   */
  setSelection(selection: WallpaperSelection, blob?: Blob): void
  /** Merge + clamp effects and apply them live. */
  setEffects(effects: Partial<WallpaperEffects>): void
  /** Move the focal point of a remote/upload wallpaper (normalized). */
  setPosition(position: WallpaperPosition): WallpaperState
  /**
   * Replace selection/effects/position in ONE transition: one stylesheet write,
   * one debounced (or flushed) save and one subscriber notification. Omitted
   * fields keep their current value; `{ selection: undefined }` clears the
   * wallpaper. This is the batch API presets/import/sync must use.
   * @returns the new snapshot (never throws).
   */
  setState(patch: WallpaperStatePatch, options?: WallpaperStateOptions): WallpaperState
  /** Alias of {@link WallpaperControllerApi.setState}. */
  applyState(patch: WallpaperStatePatch, options?: WallpaperStateOptions): WallpaperState
  /** Remove the wallpaper layer (effects keep their current values in the UI). */
  clear(): void
  /** Provide the active livery's background-token maps (undefined for stock). */
  setTokens(light: TokenMap | undefined, dark: TokenMap | undefined): void
  /** CSS background-image value of the current selection (hero preview). */
  getRenderImage(): string | undefined
  /** Hydrate from localStorage and apply. */
  start(): void
  /**
   * Synchronously persist the CURRENT snapshot, cancelling a pending debounce.
   * Callers that are about to delete an old upload blob MUST use this and only
   * delete after it returns true; a false result means the localStorage write
   * failed (quota/disabled) and the old blob is still the last recoverable state.
   */
  flushState(): boolean
  /** Remove the DOM layer and flush pending persistence. */
  dispose(): void
}

/** Controller construction options. */
export interface WallpaperControllerOptions {
  readonly document?: WallpaperDocument | undefined
  readonly storage?: WallpaperStorage | undefined
  /** Debounce for persisted writes (ms). */
  readonly saveDelayMs?: number
  /** Upload image store (IndexedDB); undefined keeps uploads session-only. */
  readonly images?: WallpaperImageStore | undefined
  /** Object-URL adapter (injected in tests). */
  readonly objectUrls?: { create(blob: Blob): string; revoke(url: string): void } | undefined
  /** Per-tab id used to ignore own storage echoes (defaults to a random id). */
  readonly sourceId?: string
  /** Injectable `storage` event target (defaults to `window` when available). */
  readonly eventTarget?: StorageEventTarget | undefined
}

const DEFAULT_SAVE_DELAY_MS = 250
const EMPTY_TOKENS = { light: undefined, dark: undefined } as const

/** Browser object-URL adapter, or undefined outside the browser. */
function defaultObjectUrls(): { create(blob: Blob): string; revoke(url: string): void } | undefined {
  try {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return undefined
    return {
      create: (blob: Blob) => URL.createObjectURL(blob),
      revoke: (url: string) => URL.revokeObjectURL(url),
    }
  } catch {
    return undefined
  }
}

/** Resolve the browser localStorage without throwing in restricted contexts. */
function defaultStorage(): WallpaperStorage | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined
    return localStorage
  } catch {
    return undefined
  }
}

/** Structural equality for clamped effect records. */
function sameEffects(a: WallpaperEffects, b: WallpaperEffects): boolean {
  return a.blur === b.blur && a.dim === b.dim && a.frost === b.frost && a.atmosphere === b.atmosphere
}

/** Structural equality for normalized focal positions. */
function samePosition(a: WallpaperPosition, b: WallpaperPosition): boolean {
  return a.x === b.x && a.y === b.y
}

/**
 * Create one wallpaper controller.
 * @param options - document/storage injection and save debounce.
 * @returns the controller (not started).
 */
export function createWallpaperController(options: WallpaperControllerOptions = {}): WallpaperControllerApi {
  const layer: WallpaperLayer = createWallpaperLayer(options.document)
  const storage = options.storage ?? defaultStorage()
  const images = options.images ?? createIndexedDbImageStore()
  const objectUrls = options.objectUrls ?? defaultObjectUrls()
  const saveDelay = options.saveDelayMs ?? DEFAULT_SAVE_DELAY_MS
  const sourceId = options.sourceId ?? createTabSourceId()
  const publishSourceId = options.sourceId !== undefined
  const eventTarget = options.eventTarget ?? (typeof window === 'undefined'
    ? undefined
    : window as unknown as StorageEventTarget)
  let lastPublishedRaw: string | undefined
  let syncUnsubscribe: (() => void) | undefined
  const listeners = new Set<() => void>()
  let selection: WallpaperSelection = undefined
  let effects: WallpaperEffects = { ...DEFAULT_WALLPAPER_EFFECTS }
  let position: WallpaperPosition = { ...DEFAULT_WALLPAPER_POSITION }
  let revision = 0
  let tokens: { light: TokenMap | undefined; dark: TokenMap | undefined } = { ...EMPTY_TOKENS }
  let snapshot: WallpaperState = { selection, effects, position, revision }
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let savePending = false
  let started = false
  let disposed = false
  let localImageUrl: string | undefined

  const notify = (): void => {
    snapshot = { selection, effects, position, revision }
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch {
        /* a broken listener must not break wallpaper application */
      }
    }
  }

  const tokenContext = (): { light: TokenMap; dark: TokenMap; frost: number } | undefined => {
    const { light, dark } = tokens
    if (light === undefined || dark === undefined) return undefined
    return { light, dark, frost: effects.frost }
  }

  const apply = (): void => {
    layer.apply(
      buildWallpaperCss({
        selection,
        effects,
        position,
        tokens: tokenContext(),
        imageOverride: localImageUrl,
      }),
      effects.atmosphere > 0,
    )
  }

  const replaceLocalImageUrl = (blob: Blob | undefined): void => {
    if (localImageUrl !== undefined) {
      try {
        objectUrls?.revoke(localImageUrl)
      } catch {
        /* a stale object URL must not break teardown */
      }
      localImageUrl = undefined
    }
    if (blob === undefined || objectUrls === undefined) return
    try {
      localImageUrl = objectUrls.create(blob)
    } catch {
      localImageUrl = undefined
    }
  }

  const persist = (): boolean => {
    if (storage === undefined) return false
    try {
      // A clear is written as a revisioned tombstone (kind:'none') so other
      // tabs can synchronize the clear through the same revision ordering.
      const record = serializeWallpaperState(selection, effects, position, revision)
      const raw = JSON.stringify(publishSourceId ? { ...record, sourceId } : record)
      storage.setItem(WALLPAPER_STORAGE_KEY, raw)
      lastPublishedRaw = raw
      return true
    } catch {
      /* storage can be quota-blocked/disabled; the live layer still works */
      return false
    }
  }

  const scheduleSave = (): void => {
    savePending = true
    if (saveTimer !== undefined) return
    saveTimer = setTimeout(() => {
      saveTimer = undefined
      if (!savePending) return
      savePending = false
      persist()
    }, saveDelay)
  }

  const flushSave = (): boolean => {
    if (saveTimer !== undefined) {
      clearTimeout(saveTimer)
      saveTimer = undefined
    }
    if (!savePending) return true
    savePending = false
    return persist()
  }

  const flushState = (): boolean => {
    if (disposed || !started) return false
    if (saveTimer !== undefined) {
      clearTimeout(saveTimer)
      saveTimer = undefined
    }
    savePending = false
    return persist()
  }

  const sameSelection = (a: WallpaperSelection, b: WallpaperSelection): boolean => {
    if (a === undefined || b === undefined) return a === b
    if (a.kind !== b.kind) return false
    if (a.kind === 'builtin') return b.kind === 'builtin' && a.id === b.id
    if (a.kind === 'remote') return b.kind === 'remote' && a.url === b.url
    return b.kind === 'upload' && a.key === b.key
  }

  const hydrate = (): void => {
    if (storage === undefined) return
    let raw: unknown
    try {
      const text = storage.getItem(WALLPAPER_STORAGE_KEY)
      if (text === null || text.length === 0) return
      raw = JSON.parse(text)
    } catch {
      return
    }
    // Corrupt or unknown-version records are ignored; the live wallpaper is
    // never cleared just because a stored record failed to parse.
    const stored = parseWallpaperState(raw)
    if (stored === undefined) return
    selection = stored.selection
    effects = stored.effects
    position = stored.position
    revision = stored.revision
  }

  // Uploaded blobs live in IndexedDB: restore the object URL asynchronously once
  // the selection is known. A missing blob clears the wallpaper instead of
  // leaving a broken image; a session-only upload (no store) is left untouched.
  // (Remote selections use the non-destructive restoreRemote helper above.)
  // Online wallpapers may have a cached blob: restore it on hydrate so a
  // remembered remote background renders even when the network is down.
  const restoreRemote = async (): Promise<void> => {
    if (disposed || selection === undefined || selection.kind !== 'remote') return
    const expectedRevision = revision
    const { url } = selection
    const record = await loadCachedRemote(url, images)
    if (disposed || record === undefined || revision !== expectedRevision) return
    if (selection === undefined || selection.kind !== 'remote' || selection.url !== url) return
    replaceLocalImageUrl(record.blob)
    apply()
    notify()
  }

  const restoreUpload = async (): Promise<void> => {
    if (disposed || selection === undefined || selection.kind !== 'upload') return
    const expectedRevision = revision
    const { key } = selection
    if (images === undefined || objectUrls === undefined) return
    let record: StoredImageRecord | undefined
    try {
      record = await images.get(key)
    } catch {
      // A read failure is not proof that the upload is gone. Keep the selection
      // (and its recoverable key) instead of permanently clearing the wallpaper.
      return
    }
    if (disposed || revision !== expectedRevision) return
    if (selection === undefined || selection.kind !== 'upload' || selection.key !== key) return
    if (record === undefined) {
      setState({ selection: undefined })
      return
    }
    replaceLocalImageUrl(record.blob)
    apply()
    notify()
  }

  const cancelPendingSave = (): void => {
    if (saveTimer !== undefined) {
      clearTimeout(saveTimer)
      saveTimer = undefined
    }
    savePending = false
  }

  const adoptExternalState = (newValue: string | null): void => {
    if (disposed) return
    const external = parseExternalWallpaperState(newValue)
    if (external === undefined) return
    if (!shouldApplyExternalState({
      currentRevision: revision,
      incomingRevision: external.state.revision,
      incomingSourceId: external.sourceId,
      ownSourceId: sourceId,
      lastPublishedRaw,
      incomingRaw: external.raw,
    })) return
    // A newer tab wins: drop the pending local save so it cannot overwrite it.
    cancelPendingSave()
    const tie = external.state.revision === revision
    selection = external.state.selection
    effects = external.state.effects
    position = external.state.position
    revision = external.state.revision
    if (tie && storage !== undefined) {
      // Same counter from two tabs: persist the deterministic winner so a
      // later reload cannot resurrect the losing branch.
      try {
        storage.setItem(WALLPAPER_STORAGE_KEY, external.raw)
        lastPublishedRaw = external.raw
      } catch {
        /* convergence write is best effort */
      }
    }
    replaceLocalImageUrl(undefined)
    apply()
    notify()
    void restoreUpload()
    void restoreRemote()
  }

  const setState = (patch: WallpaperStatePatch, stateOptions: WallpaperStateOptions = {}): WallpaperState => {
    if (disposed) return snapshot
    const hasSelection = Object.prototype.hasOwnProperty.call(patch, 'selection')
    const nextSelection = hasSelection ? patch.selection : selection
    const nextEffects = patch.effects === undefined ? effects : clampEffects({ ...effects, ...patch.effects })
    const nextPosition = patch.position === undefined ? position : normalizeWallpaperPosition(patch.position)
    const selectionChanged = !sameSelection(selection, nextSelection)
    const effectsChanged = !sameEffects(effects, nextEffects)
    const positionChanged = !samePosition(position, nextPosition)
    if (!selectionChanged && !effectsChanged && !positionChanged) {
      // Same selection, newly available local copy (e.g. cache finished after
      // apply): switch the rendered image without touching persistence.
      if (stateOptions.blob !== undefined && nextSelection !== undefined && nextSelection.kind !== 'builtin') {
        replaceLocalImageUrl(stateOptions.blob)
        apply()
        notify()
      }
      return snapshot
    }
    selection = nextSelection
    effects = nextEffects
    position = nextPosition
    revision = stateOptions.revision === undefined
      ? revision + 1
      : normalizeWallpaperRevision(stateOptions.revision)
    if (selectionChanged || stateOptions.blob !== undefined) replaceLocalImageUrl(stateOptions.blob)
    apply()
    scheduleSave()
    if (stateOptions.flush === true) flushSave()
    notify()
    return snapshot
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setSelection: (next: WallpaperSelection, blob?: Blob) => {
      if (disposed) return
      setState({ selection: next }, blob === undefined ? {} : { blob })
    },
    setEffects: (patch: Partial<WallpaperEffects>) => {
      if (disposed) return
      setState({ effects: patch })
    },
    setPosition: (next: WallpaperPosition) => setState({ position: next }),
    setState,
    applyState: setState,
    clear: () => {
      if (disposed) return
      setState({ selection: undefined })
    },
    flushState,
    setTokens: (light: TokenMap | undefined, dark: TokenMap | undefined) => {
      if (disposed) return
      if (tokens.light === light && tokens.dark === dark) return
      tokens = { light, dark }
      apply()
    },
    getRenderImage: () => backgroundImageValue(selection, localImageUrl),
    start: () => {
      if (disposed || started) return
      started = true
      hydrate()
      apply()
      notify()
      syncUnsubscribe = createWallpaperStorageSync({
        eventTarget,
        key: WALLPAPER_STORAGE_KEY,
        onExternal: adoptExternalState,
      })
      void restoreUpload()
      void restoreRemote()
    },
    dispose: () => {
      disposed = true
      syncUnsubscribe?.()
      syncUnsubscribe = undefined
      flushSave()
      listeners.clear()
      replaceLocalImageUrl(undefined)
      layer.dispose()
      started = false
    },
  }
}

let activeController: WallpaperControllerApi | undefined

/**
 * Publish the controller mounted by the client plugin (or clear it).
 * @param controller - controller instance or undefined.
 */
export function setWallpaperController(controller: WallpaperControllerApi | undefined): void {
  activeController = controller
}

/** Read the controller published by the client plugin, if any. */
export function getWallpaperController(): WallpaperControllerApi | undefined {
  return activeController
}
