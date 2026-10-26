/**
 * Wallpaper controller — owns the client-only wallpaper state and its lifecycle.
 *
 * Mounted once by the client plugin (not by the page), so a wallpaper survives
 * navigation and reloads via `localStorage`. It hydrates the persisted record,
 * rebuilds the owned stylesheet whenever selection/effects/tokens change, and
 * tears the layer down on plugin dispose. The UI talks to it through the module
 * singleton accessor below; no host config or boot payload is involved.
 */
import type { TokenMap } from '../../core/types.js'
import {
  backgroundImageValue,
  buildWallpaperCss,
  clampEffects,
  DEFAULT_WALLPAPER_EFFECTS,
  parseStoredWallpaper,
  WALLPAPER_STORAGE_KEY,
} from '../wallpaper.js'
import type { WallpaperEffects, WallpaperSelection } from '../wallpaper.js'
import { createWallpaperLayer } from './apply.js'
import { createIndexedDbImageStore } from './storage.js'
import { loadCachedRemote } from './cache.js'
import type { StoredImageRecord, WallpaperImageStore } from './storage.js'
import type { WallpaperDocument, WallpaperLayer } from './apply.js'

/** Reactive wallpaper state consumed by the studio UI. */
export interface WallpaperState {
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
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
  /** Remove the wallpaper layer (effects keep their current values in the UI). */
  clear(): void
  /** Provide the active livery's background-token maps (undefined for stock). */
  setTokens(light: TokenMap | undefined, dark: TokenMap | undefined): void
  /** CSS background-image value of the current selection (hero preview). */
  getRenderImage(): string | undefined
  /** Hydrate from localStorage and apply. */
  start(): void
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
  const listeners = new Set<() => void>()
  let selection: WallpaperSelection = undefined
  let effects: WallpaperEffects = { ...DEFAULT_WALLPAPER_EFFECTS }
  let tokens: { light: TokenMap | undefined; dark: TokenMap | undefined } = { ...EMPTY_TOKENS }
  let snapshot: WallpaperState = { selection, effects }
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let savePending = false
  let started = false
  let disposed = false
  let localImageUrl: string | undefined

  const notify = (): void => {
    snapshot = { selection, effects }
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
      buildWallpaperCss({ selection, effects, tokens: tokenContext(), imageOverride: localImageUrl }),
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

  const persist = (): void => {
    if (storage === undefined) return
    try {
      if (selection === undefined) {
        storage.removeItem(WALLPAPER_STORAGE_KEY)
        return
      }
      storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
        kind: selection.kind,
        ...(selection.kind === 'builtin'
          ? { id: selection.id }
          : selection.kind === 'upload'
            ? { key: selection.key }
            : { url: selection.url }),
        ...effects,
      }))
    } catch {
      /* storage can be quota-blocked/disabled; the live layer still works */
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

  const flushSave = (): void => {
    if (saveTimer !== undefined) {
      clearTimeout(saveTimer)
      saveTimer = undefined
    }
    if (savePending) {
      savePending = false
      persist()
    }
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
    const stored = parseStoredWallpaper(raw)
    if (stored === undefined) return
    selection = stored.selection
    effects = stored.effects
  }

  // Uploaded blobs live in IndexedDB: restore the object URL asynchronously once
  // the selection is known. A missing blob clears the wallpaper instead of
  // leaving a broken image; a session-only upload (no store) is left untouched.
  // (Remote selections use the non-destructive restoreRemote helper above.)
  // Online wallpapers may have a cached blob: restore it on hydrate so a
  // remembered remote background renders even when the network is down.
  const restoreRemote = async (): Promise<void> => {
    if (disposed || selection === undefined || selection.kind !== 'remote') return
    const { url } = selection
    const record = await loadCachedRemote(url, images)
    if (disposed || record === undefined) return
    if (selection === undefined || selection.kind !== 'remote' || selection.url !== url) return
    replaceLocalImageUrl(record.blob)
    apply()
    notify()
  }

  const restoreUpload = async (): Promise<void> => {
    if (disposed || selection === undefined || selection.kind !== 'upload') return
    const { key } = selection
    if (images === undefined || objectUrls === undefined) return
    let record: StoredImageRecord | undefined
    try {
      record = await images.get(key)
    } catch {
      record = undefined
    }
    if (disposed) return
    if (selection === undefined || selection.kind !== 'upload' || selection.key !== key) return
    if (record === undefined) {
      selection = undefined
      replaceLocalImageUrl(undefined)
      apply()
      scheduleSave()
      notify()
      return
    }
    replaceLocalImageUrl(record.blob)
    apply()
    notify()
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
      if (sameSelection(selection, next)) {
        // Same wallpaper, newly available local copy (e.g. cache finished after
        // apply): switch the rendered image without touching persistence.
        if (blob !== undefined && selection !== undefined && selection.kind !== 'builtin') {
          replaceLocalImageUrl(blob)
          apply()
          notify()
        }
        return
      }
      selection = next
      replaceLocalImageUrl(blob)
      apply()
      scheduleSave()
      notify()
    },
    setEffects: (patch: Partial<WallpaperEffects>) => {
      const merged = clampEffects({ ...effects, ...patch })
      if (
        merged.blur === effects.blur && merged.dim === effects.dim
        && merged.frost === effects.frost && merged.atmosphere === effects.atmosphere
      ) return
      effects = merged
      apply()
      scheduleSave()
      notify()
    },
    clear: () => {
      if (selection === undefined) return
      selection = undefined
      replaceLocalImageUrl(undefined)
      apply()
      scheduleSave()
      notify()
    },
    setTokens: (light: TokenMap | undefined, dark: TokenMap | undefined) => {
      if (tokens.light === light && tokens.dark === dark) return
      tokens = { light, dark }
      apply()
    },
    getRenderImage: () => backgroundImageValue(selection, localImageUrl),
    start: () => {
      if (started) return
      started = true
      hydrate()
      apply()
      notify()
      void restoreUpload()
      void restoreRemote()
    },
    dispose: () => {
      disposed = true
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
