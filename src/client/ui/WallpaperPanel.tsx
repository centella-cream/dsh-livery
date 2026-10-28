/**
 * Wallpaper studio panel: online random/search wallpapers, 24 built-in CSS
 * wallpapers, effect sliders, uploaded images and a custom https URL.
 *
 * Client-only: changes go through the wallpaper controller (localStorage +
 * IndexedDB uploads + one owned stylesheet); no host config or boot payload is
 * touched. Network requests are user-originated (tab open / explicit clicks).
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LiveryKey } from '../../i18n/index.js'
import { STOCK_ID } from '../../core/types.js'
import { localizedName } from '../model.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from '../model.js'
import type { LiveryTranslate } from '../platform.js'
import {
  BUILTIN_WALLPAPERS,
  BUILTIN_WALLPAPER_IDS,
  DEFAULT_WALLPAPER_EFFECTS,
  DEFAULT_WALLPAPER_POSITION,
  WALLPAPER_EFFECT_BOUNDS,
  WALLPAPER_POSITION_OPTIONS,
  backgroundPositionValue,
  requestWallpaperResults,
  validateWallpaperUrl,
} from '../wallpaper.js'
import type { BuiltinWallpaperId, WallpaperEffects, WallpaperPositionId, WallpaperRemoteResult, WallpaperRemoteSource, WallpaperSelection, WallpaperUrlProblem } from '../wallpaper.js'
import { createIndexedDbImageStore, validateUploadFile } from '../wallpaper/storage.js'
import {
  RECENT_WALLPAPER_CLEAR_KEY,
  clearRecentWallpapers,
  mergeRecentEntries,
  readRecentWallpapers,
  rememberRecentWallpaper,
  writeRecentWallpapers,
} from '../wallpaper/history.js'
import type { RecentWallpaperEntry } from '../wallpaper/history.js'
import { cacheRemoteImage, createRemoteCacheCancellation, deleteCachedRemote, loadCachedRemote, pruneRemoteCache } from '../wallpaper/cache.js'
import { isCurrentRemoteSelection } from '../wallpaper/selection-guard.js'
import { matchesPresetWallpaperState } from '../wallpaper/preset.js'
import { isLocalOrPrivateHost, safeRemoteImageUrl } from '../wallpaper/host-safety.js'
import type { LiveryPreset, PresetApplyResult, PresetAttribution, PresetWallpaperTarget } from '../wallpaper/preset.js'
import { readRecentFromStorageEvent } from '../wallpaper/sync.js'
import { commitSelection, createAsyncTicket } from '../wallpaper/async-ticket.js'
import { clearableRecentUrls, deleteStoredImage, evictedRecentUrls, obsoleteUploadKey, createUploadRecord, pruneStaleUploads } from '../wallpaper/lifecycle.js'
import { handleDropzoneKeyDown } from '../wallpaper/upload-a11y.js'
import type { UploadProblem } from '../wallpaper/storage.js'
import { getWallpaperController } from '../wallpaper/controller.js'
import { hasCrossTabGcLock, withWallpaperGcLock } from '../wallpaper/gc-lock.js'
import { readReferencedUploadKeys } from '../wallpaper/refs.js'
import type { WallpaperState } from '../wallpaper/controller.js'
import { PresetCard } from './PresetCard.js'
import { WallpaperDataClear } from './WallpaperDataClear.js'
import { createAutoRandomLoader } from './online-auto.js'

const GRID = 'livery-grid'
const CARD = 'livery-card'
const THUMB = 'livery-thumb'
const THUMB_IMG = 'livery-thumb__img'
const NAME = 'livery-card__name'
const SEARCH = 'livery-search'

const BUILTIN_KEYS: Record<BuiltinWallpaperId, LiveryKey> = {
  aurora: 'wallpaper.builtin.aurora', dusk: 'wallpaper.builtin.dusk',
  mist: 'wallpaper.builtin.mist', paper: 'wallpaper.builtin.paper',
  ink: 'wallpaper.builtin.ink', ember: 'wallpaper.builtin.ember',
  sea: 'wallpaper.builtin.sea', mono: 'wallpaper.builtin.mono',
  forest: 'wallpaper.builtin.forest', desert: 'wallpaper.builtin.desert',
  ocean: 'wallpaper.builtin.ocean', sky: 'wallpaper.builtin.sky',
  snow: 'wallpaper.builtin.snow', bloom: 'wallpaper.builtin.bloom',
  neon: 'wallpaper.builtin.neon', cyber: 'wallpaper.builtin.cyber',
  retro: 'wallpaper.builtin.retro', sand: 'wallpaper.builtin.sand',
  rose: 'wallpaper.builtin.rose', violet: 'wallpaper.builtin.violet',
  midnight: 'wallpaper.builtin.midnight', sunrise: 'wallpaper.builtin.sunrise',
  glacier: 'wallpaper.builtin.glacier', minimal: 'wallpaper.builtin.minimal',
}
const PROBLEM_KEYS: Record<WallpaperUrlProblem, LiveryKey> = {
  empty: 'wallpaper.url.empty',
  'too-long': 'wallpaper.url.tooLong',
  'not-https': 'wallpaper.url.notHttps',
  credentials: 'wallpaper.url.credentials',
  invalid: 'wallpaper.url.invalid',
}
const UPLOAD_PROBLEM_KEYS: Record<UploadProblem, LiveryKey> = {
  type: 'wallpaper.uploadError.type',
  size: 'wallpaper.uploadError.size',
  empty: 'wallpaper.uploadError.empty',
}
const EFFECT_ROWS: readonly { id: keyof WallpaperEffects; label: LiveryKey; format: LiveryKey }[] = [
  { id: 'blur', label: 'wallpaper.blur', format: 'wallpaper.px' },
  { id: 'dim', label: 'wallpaper.dim', format: 'wallpaper.percent' },
  { id: 'frost', label: 'wallpaper.frost', format: 'wallpaper.percent' },
  { id: 'atmosphere', label: 'wallpaper.atmosphere', format: 'wallpaper.percent' },
]
/** Localized label of each nine-grid focal-position option. */
const POSITION_LABEL_KEYS: Record<WallpaperPositionId, LiveryKey> = {
  'top-left': 'wallpaper.position.topLeft',
  top: 'wallpaper.position.top',
  'top-right': 'wallpaper.position.topRight',
  left: 'wallpaper.position.left',
  center: 'wallpaper.position.center',
  right: 'wallpaper.position.right',
  'bottom-left': 'wallpaper.position.bottomLeft',
  bottom: 'wallpaper.position.bottom',
  'bottom-right': 'wallpaper.position.bottomRight',
}
const EMPTY: WallpaperState = {
  selection: undefined,
  effects: { ...DEFAULT_WALLPAPER_EFFECTS },
  position: { ...DEFAULT_WALLPAPER_POSITION },
  revision: 0,
}

type OnlineStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'offline' | 'error'
interface OnlineState {
  readonly status: OnlineStatus
  readonly results: readonly WallpaperRemoteResult[]
  readonly page: number
  readonly source: WallpaperRemoteSource
  readonly query: string
}
const IDLE_ONLINE: OnlineState = { status: 'idle', results: [], page: 1, source: 'picsum', query: '' }

interface Attribution {
  /** Identity of the wallpaper it describes; never used for a different one. */
  readonly identity: string
  readonly title: string
  readonly creator: string
  readonly license: string
  readonly source: string
  readonly context: 'online' | 'custom'
}

const ATTRIBUTION_STORAGE_KEY = 'dsh-livery.wallpaper.attribution.v1'

/** Read the last attribution record (display-only; never trusted for requests). */
function readStoredAttribution(): Attribution | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined
    const raw: unknown = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) ?? 'null')
    if (typeof raw !== 'object' || raw === null) return undefined
    const row = raw as Record<string, unknown>
    if (typeof row.identity !== 'string' || typeof row.title !== 'string'
      || typeof row.creator !== 'string' || typeof row.license !== 'string'
      || typeof row.source !== 'string' || (row.context !== 'online' && row.context !== 'custom')) return undefined
    return {
      identity: row.identity,
      title: row.title.slice(0, 200),
      creator: row.creator.slice(0, 120),
      license: row.license.slice(0, 120),
      source: row.source.slice(0, 200),
      context: row.context,
    }
  } catch {
    return undefined
  }
}

/** Stable wallpaper identity used to bind attribution and cross-tab state. */
function wallpaperIdentity(selection: WallpaperSelection): string {
  if (selection === undefined) return 'none'
  if (selection.kind === 'builtin') return `builtin:${selection.id}`
  if (selection.kind === 'upload') return `upload:${selection.key}`
  return `remote:${selection.url}`
}

/** Props of the wallpaper studio panel. */
export interface WallpaperPanelProps {
  readonly t: LiveryTranslate
  readonly snapshot: LiveryRuntimeSnapshot
  readonly runtime: LiveryRuntimeApi
}

/**
 * Render the wallpaper studio tab.
 * @param props - locale `t` seat and the runtime snapshot (unused by layout).
 * @returns the wallpaper controls, online card and attribution.
 */
export function WallpaperPanel({ t, snapshot, runtime }: WallpaperPanelProps): JSX.Element {
  const controller = getWallpaperController()
  const imageStore = useMemo(() => createIndexedDbImageStore(), [])
  const recentStorage = useMemo(() => {
    try {
      return typeof localStorage === 'undefined' ? undefined : localStorage
    } catch {
      return undefined
    }
  }, [])
  const state = useSyncExternalStore(
    listener => controller?.subscribe(listener) ?? (() => undefined),
    () => controller?.getSnapshot() ?? EMPTY,
    () => controller?.getSnapshot() ?? EMPTY,
  )
  const liveIdentity = wallpaperIdentity(state.selection)
  const [urlText, setUrlText] = useState('')
  const [problem, setProblem] = useState<WallpaperUrlProblem | undefined>(undefined)
  const [uploadProblem, setUploadProblem] = useState<UploadProblem | undefined>(undefined)
  const [uploadSessionOnly, setUploadSessionOnly] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [online, setOnline] = useState<OnlineState>(IDLE_ONLINE)
  const [attribution, setAttribution] = useState<Attribution | undefined>(() => readStoredAttribution())
  useEffect(() => {
    try {
      if (typeof localStorage === 'undefined') return
      if (attribution === undefined) localStorage.removeItem(ATTRIBUTION_STORAGE_KEY)
      else localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution))
    } catch {
      /* attribution persistence is display-only/best effort */
    }
  }, [attribution])
  const localAttribution = attribution !== undefined && attribution.identity === liveIdentity
    ? attribution
    : undefined
  const [recent, setRecent] = useState<readonly RecentWallpaperEntry[]>(() => readRecentWallpapers(recentStorage))
  const recentRef = useRef(recent)
  recentRef.current = recent
  // Attribution also derives from the persisted recent list, so it survives a
  // style-tab remount (and cross-tab selection) even though it is display-only.
  const recentAttribution: Attribution | undefined = (() => {
    if (localAttribution !== undefined) return localAttribution
    if (state.selection?.kind !== 'remote') return undefined
    const remoteUrl = state.selection.url
    const entry = recent.find(candidate => candidate.url === remoteUrl)
    if (entry === undefined) return undefined
    return {
      identity: `remote:${entry.url}`,
      title: entry.title ?? t('wallpaper.customSelected'),
      creator: entry.creator ?? '',
      license: entry.license ?? '',
      source: entry.source ?? (() => { try { return new URL(entry.url).hostname } catch { return entry.url } })(),
      context: entry.source === new URL(entry.url).hostname ? 'custom' : 'online',
    }
  })()
  const effectiveAttribution = recentAttribution
  const [cachedUrls, setCachedUrls] = useState<Record<string, string>>({})
  const objectUrlsRef = useRef<Map<string, string>>(new Map())
  const pendingUploadDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const remoteCommitTicket = useRef(0)
  const rememberObjectUrl = (url: string, objectUrl: string): void => {
    const previous = objectUrlsRef.current.get(url)
    if (previous !== undefined && previous !== objectUrl) {
      try { URL.revokeObjectURL(previous) } catch { /* already gone */ }
    }
    objectUrlsRef.current.set(url, objectUrl)
    setCachedUrls(previousMap => ({ ...previousMap, [url]: objectUrl }))
  }
  const releaseObjectUrl = (url: string): void => {
    const objectUrl = objectUrlsRef.current.get(url)
    if (objectUrl === undefined) return
    objectUrlsRef.current.delete(url)
    try { URL.revokeObjectURL(objectUrl) } catch { /* already gone */ }
    setCachedUrls(previous => {
      if (previous[url] === undefined) return previous
      const next = { ...previous }
      delete next[url]
      return next
    })
  }
  const releaseAllObjectUrls = (): void => {
    for (const objectUrl of objectUrlsRef.current.values()) {
      try { URL.revokeObjectURL(objectUrl) } catch { /* already gone */ }
    }
    objectUrlsRef.current.clear()
    setCachedUrls({})
  }
  const mounted = useRef(true)
  const seq = useRef(0)
  const autoLoader = useRef(createAutoRandomLoader(page => { void run('picsum', '', page) }))
  const uploadTickets = useRef(createAsyncTicket())
  const fileInput = useRef<HTMLInputElement | null>(null)
  const cacheCancellation = useRef(createRemoteCacheCancellation())
  // Every selection-changing action invalidates a pending local upload: a
  // late IndexedDB completion must never roll the visible/persisted selection
  // back to an older upload.
  /**
   * Delete an obsolete upload only after a short cross-tab convergence window and
   * only when the live, durable and currently persisted states all agree that no
   * state still references it. This prevents a losing local write from deleting
   * the blob that another tab's winning state still points at.
   */
  const scheduleUploadDelete = (key: string | undefined, label: string): void => {
    if (key === undefined || imageStore === undefined) return
    // Without a cross-tab Web Lock a delayed delete cannot prove no other tab
    // needs the blob; keep it and let explicit cleanup handle storage pressure.
    if (!hasCrossTabGcLock()) return
    const previous = pendingUploadDeletes.current.get(key)
    if (previous !== undefined) clearTimeout(previous)
    const timer = setTimeout(() => {
      pendingUploadDeletes.current.delete(key)
      if (!mounted.current) return
      void withWallpaperGcLock(async () => {
        const active = getWallpaperController()
        if (active !== undefined) {
          const live = active.getSnapshot().selection
          const durable = active.getDurableSelection()
          const persisted = active.getPersistedSelection()
          for (const candidate of [live, durable, persisted]) {
            if (candidate?.kind === 'upload' && candidate.key === key) return
          }
        }
        const refs = readReferencedUploadKeys(recentStorage as never)
        if (refs === undefined || refs.has(key)) return
        await deleteStoredImage(imageStore, key, label)
      })
    }, 5000)
    pendingUploadDeletes.current.set(key, timer)
  }

  const selectWallpaper = (selection: WallpaperSelection, blob?: Blob): void => {
    cacheCancellation.current.cancel()
    const previous = controller?.getSnapshot().selection
    commitSelection(uploadTickets.current, () => controller?.setSelection(selection, blob))
    // Only delete the old upload after the NEW state is confirmed written to
    // localStorage. A failed write must leave the old blob recoverable.
    const persisted = controller?.flushState() === true
    const obsolete = persisted ? obsoleteUploadKey(previous, selection) : undefined
    scheduleUploadDelete(obsolete, 'previous upload')
  }
  const clearWallpaper = (): void => {
    cacheCancellation.current.cancel()
    const previous = controller?.getSnapshot().selection
    commitSelection(uploadTickets.current, () => controller?.clear())
    const persisted = controller?.flushState() === true
    const obsolete = persisted ? obsoleteUploadKey(previous, undefined) : undefined
    scheduleUploadDelete(obsolete, 'cleared')
  }

  useEffect(() => {
    mounted.current = true
    // Destructive GC is paused unless the browser provides a cross-tab lock.
    if (!hasCrossTabGcLock()) return () => { mounted.current = false }
    // Reclaim upload blobs left behind by an interrupted prior session. This is
    // best effort and protects the currently selected upload key.
    void withWallpaperGcLock(async () => {
      // EVERY protection read happens inside the cross-tab lock: a tab that
      // committed an upload just before us must not be classified as stale.
      const active = getWallpaperController()
      const current = active?.getSnapshot().selection
      const durable = active?.getDurableSelection()
      const persisted = active?.getPersistedSelection()
      const refs = readReferencedUploadKeys(recentStorage as never)
      // Unknown ref state (no storage enumeration) means fail closed: no GC.
      if (refs === undefined) return
      const uploadKeys = new Set<string>(refs)
      for (const candidate of [current, durable, persisted]) {
        if (candidate?.kind === 'upload') uploadKeys.add(candidate.key)
      }
      const [liveKey, durableKey, persistedKey] = [...uploadKeys]
      await pruneStaleUploads(
        imageStore,
        liveKey,
        durableKey,
        persistedKey,
        refs,
        () => {
          const latest = getWallpaperController()
          const keys = new Set<string>(readReferencedUploadKeys(recentStorage as never) ?? [])
          for (const candidate of [latest?.getSnapshot().selection, latest?.getDurableSelection(), latest?.getPersistedSelection()]) {
            if (candidate?.kind === 'upload') keys.add(candidate.key)
          }
          return keys
        },
      )
    })
    return () => {
      mounted.current = false
      cacheCancellation.current.cancel()
    }
  // The sweep is intentionally mount-only; selection changes are handled by the
  // upload/replace lifecycle below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const run = async (source: WallpaperRemoteSource, query: string, page: number): Promise<void> => {
    const ticket = ++seq.current
    setOnline(previous => ({ ...previous, status: 'loading', page, source, query }))
    const outcome = await requestWallpaperResults({ source, query, page })
    if (!mounted.current || seq.current !== ticket) return
    setOnline({
      status: outcome.ok ? (outcome.results.length === 0 ? 'empty' : 'ready') : outcome.reason === 'offline' ? 'offline' : 'error',
      results: outcome.ok ? outcome.results : [],
      page,
      source,
      query,
    })
  }

  // One automatic random batch per wallpaper-tab mount; effects/sliders never re-fetch.
  useEffect(() => {
    autoLoader.current.trigger()
  }, [])

  const search = (): void => {
    const query = online.query.trim()
    void run('openverse', query.length > 0 ? query : 'landscape', 1)
  }
  const random = (): void => { void run('picsum', '', Math.floor(Math.random() * 8) + 1) }
  const refresh = (): void => {
    if (online.source === 'picsum') random()
    else void run('openverse', online.query, online.page + 1)
  }
  const retry = (): void => {
    if (online.source === 'picsum') random()
    else void run('openverse', online.query, Math.max(1, online.page))
  }

  const displayUrlFor = (entry: RecentWallpaperEntry): string | undefined =>
    cachedUrls[entry.url]

  const rememberBlob = (url: string, blob: Blob): void => {
    try {
      if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return
      rememberObjectUrl(url, URL.createObjectURL(blob))
    } catch {
      /* display cache is best effort */
    }
  }

  const recordRemoteHistory = (entry: Omit<RecentWallpaperEntry, 'addedAt'>): void => {
    const previous = recentRef.current
    const next = rememberRecentWallpaper(recentStorage, { ...entry, addedAt: Date.now() })
    setRecent(next)
    const protectedUrls = new Set(protectedRemoteUrls())
    for (const evicted of evictedRecentUrls(previous, next, undefined)) {
      if (!protectedUrls.has(evicted)) void deleteCachedRemote(evicted, imageStore, recentStorage)
    }
  }

  /**
   * Download and VERIFY a remote image first; only then commit the selection,
   * object URL and history. A failed download leaves the previous wallpaper in
   * place (no persisted remote selection with no renderable image).
   */
  const protectedRemoteUrls = (): string[] => {
    const active = controller
    const urls = new Set<string>()
    for (const candidate of [active?.getSnapshot().selection, active?.getDurableSelection(), active?.getPersistedSelection()]) {
      if (candidate?.kind === 'remote') urls.add(candidate.url)
    }
    return [...urls]
  }

  const commitRemote = async (
    entry: Omit<RecentWallpaperEntry, 'addedAt'>,
    attribution?: Attribution,
  ): Promise<boolean> => {
    const ticket = ++remoteCommitTicket.current
    const selectionVersion = controller?.getSelectionVersion()
    const signal = cacheCancellation.current.reset()
    const result = await cacheRemoteImage(entry.url, {
      images: imageStore,
      storage: recentStorage,
      protectedUrl: entry.url,
      protectedUrls: protectedRemoteUrls(),
      signal,
      deferPrune: true,
    })
    if (!mounted.current || ticket !== remoteCommitTicket.current
      || (selectionVersion !== undefined && controller?.getSelectionVersion() !== selectionVersion)) return false
    if (!result.ok) return false
    rememberBlob(entry.url, result.record.blob)
    recordRemoteHistory(entry)
    if (attribution !== undefined) setAttribution(attribution)
    selectWallpaper({ kind: 'remote', url: entry.url }, result.record.blob)
    if (controller?.flushState() === true) {
      void pruneRemoteCache({ images: imageStore, storage: recentStorage, protectedUrl: entry.url })
    }
    return true
  }

  const reapplyRecent = (entry: RecentWallpaperEntry): void => {
    void (async () => {
      const ticket = ++remoteCommitTicket.current
      const selectionVersion = controller?.getSelectionVersion()
      const record = await loadCachedRemote(entry.url, imageStore)
      if (!mounted.current || ticket !== remoteCommitTicket.current
        || (selectionVersion !== undefined && controller?.getSelectionVersion() !== selectionVersion)) return
      if (record !== undefined) {
        rememberBlob(entry.url, record.blob)
        recordRemoteHistory(entry)
        setAttribution({
          identity: `remote:${entry.url}`,
          title: entry.title ?? t('wallpaper.customSelected'),
          creator: entry.creator ?? '',
          license: entry.license ?? '',
          source: entry.source ?? '',
          context: 'online',
        })
        selectWallpaper({ kind: 'remote', url: entry.url }, record.blob)
        return
      }
      await commitRemote(entry, {
        identity: `remote:${entry.url}`,
        title: entry.title ?? t('wallpaper.customSelected'),
        creator: entry.creator ?? '',
        license: entry.license ?? '',
        source: entry.source ?? '',
        context: 'online',
      })
    })()
  }

  const clearRecent = (): void => {
    // Invalidate any in-flight remote commit so a late download cannot restore
    // the history/tombstone we are about to clear.
    remoteCommitTicket.current += 1
    cacheCancellation.current.cancel()
    const entries = recent
    const protectedUrls = new Set(protectedRemoteUrls())
    clearRecentWallpapers(recentStorage)
    setRecent([])
    for (const url of clearableRecentUrls(entries, undefined)) {
      if (!protectedUrls.has(url)) void deleteCachedRemote(url, imageStore, recentStorage)
    }
    releaseAllObjectUrls()
  }

  // Another tab changed the recent history: refresh entries/thumbnail state.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
    const applyExternalClear = (): void => {
      // A clear from another tab must also cancel our in-flight remote commit,
      // otherwise it could finish later and rewrite history/tombstone.
      remoteCommitTicket.current += 1
      cacheCancellation.current.cancel()
      setRecent([])
      releaseAllObjectUrls()
    }
    const listener = (event: StorageEvent): void => {
      if (event.key === RECENT_WALLPAPER_CLEAR_KEY) {
        if (event.newValue !== null) applyExternalClear()
        return
      }
      if (event.key !== 'dsh-livery.wallpaper.recent.v1') return
      if (event.newValue === null) {
        // An explicit clear is authoritative; never merge the old local list
        // back into an empty cross-tab history.
        applyExternalClear()
        return
      }
      const next = readRecentFromStorageEvent(event as unknown as { key: string | null; newValue: string | null }, recentStorage)
      if (next === undefined) return
      const merged = mergeRecentEntries(recentRef.current, next)
      const keep = new Set(merged.map(entry => entry.url))
      setRecent(merged)
      if (JSON.stringify(merged) !== JSON.stringify(next)) {
        // Preserve a concurrently added local entry instead of losing it to the
        // other tab's last write; both tabs eventually converge on the union.
        writeRecentWallpapers(recentStorage, merged)
      }
      for (const url of [...objectUrlsRef.current.keys()]) {
        if (!keep.has(url)) releaseObjectUrl(url)
      }
    }
    window.addEventListener('storage', listener)
    return () => window.removeEventListener('storage', listener)
  }, [recentStorage])

  // Hydrate cached thumbnails for the recent list. Object URLs are owned by the
  // ref map and live until their history entry disappears or the panel unmounts;
  // an effect re-run must NOT revoke URLs that remain visible.
  useEffect(() => {
    if (recent.length === 0) return
    let cancelled = false
    void (async () => {
      for (const entry of recent) {
        if (objectUrlsRef.current.has(entry.url)) continue
        const record = await loadCachedRemote(entry.url, imageStore)
        if (cancelled || record === undefined) continue
        try {
          const objectUrl = URL.createObjectURL(record.blob)
          if (cancelled) {
            try { URL.revokeObjectURL(objectUrl) } catch { /* already gone */ }
            continue
          }
          rememberObjectUrl(entry.url, objectUrl)
        } catch {
          /* thumbnails fall back to remote URLs */
        }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent])

  useEffect(() => () => {
    for (const timer of pendingUploadDeletes.current.values()) clearTimeout(timer)
    pendingUploadDeletes.current.clear()
    for (const objectUrl of objectUrlsRef.current.values()) {
      try { URL.revokeObjectURL(objectUrl) } catch { /* already gone */ }
    }
    objectUrlsRef.current.clear()
  }, [])

  // Remote selections (including cross-tab/preset/hydrated ones) are fetched
  // through the guarded cache before any CSS can reference them. No raw URL is
  // ever handed to the browser's image loader.
  useEffect(() => {
    if (state.selection?.kind !== 'remote') return
    if (controller?.getRenderImage() !== undefined) return
    const url = state.selection.url
    const abort = typeof AbortController === 'undefined' ? undefined : new AbortController()
    let cancelled = false
    void cacheRemoteImage(url, {
      images: imageStore,
      storage: recentStorage,
      protectedUrl: url,
      protectedUrls: protectedRemoteUrls(),
      signal: abort?.signal,
      deferPrune: true,
    }).then(result => {
      if (cancelled || !result.ok || !mounted.current) return
      if (!isCurrentRemoteSelection(controller?.getSnapshot().selection, url)) return
      rememberBlob(url, result.record.blob)
      selectWallpaper({ kind: 'remote', url }, result.record.blob)
      if (controller?.flushState() === true) {
        void pruneRemoteCache({ images: imageStore, storage: recentStorage, protectedUrl: url })
      }
    })
    return () => {
      cancelled = true
      abort?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selection?.kind === 'remote' ? state.selection.url : undefined])

  const selectBuiltin = (id: BuiltinWallpaperId): void => {
    selectWallpaper({ kind: 'builtin', id })
    setAttribution(undefined)
    setProblem(undefined)
    setUploadProblem(undefined)
  }
  const selectResult = (result: WallpaperRemoteResult): void => {
    setProblem(undefined)
    void commitRemote({
      url: result.url,
      thumbnail: result.thumbnail,
      title: result.title,
      creator: result.creator,
      license: result.license,
      source: result.source,
    }, {
      identity: `remote:${result.url}`,
      title: result.title,
      creator: result.creator,
      license: result.license,
      source: result.source,
      context: 'online',
    })
  }
  const applyUrl = (): void => {
    const check = validateWallpaperUrl(urlText)
    if (!check.ok) {
      setProblem(check.problem)
      return
    }
    let host = ''
    try { host = new URL(check.url).hostname } catch { setProblem('invalid'); return }
    if (isLocalOrPrivateHost(host)) { setProblem('invalid'); return }
    setProblem(undefined)
    const source = host
    void commitRemote(
      { url: check.url, title: t('wallpaper.customSelected'), source },
      {
        identity: `remote:${check.url}`,
        title: t('wallpaper.customSelected'), creator: '', license: '',
        source, context: 'custom',
      },
    ).then(ok => { if (!ok) setProblem('invalid') })
  }
  const applyUpload = async (file: File): Promise<void> => {
    // Invalidate any slow upload before validating the new pick: an invalid file
    // must still cancel the previous pending upload.
    const ticket = uploadTickets.current.next()
    const check = validateUploadFile(file)
    if (!check.ok) {
      setUploadProblem(check.problem)
      return
    }
    const startSelectionVersion = controller?.getSelectionVersion()
    const key = `upload-${Date.now()}-${Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 10)}`
    // The IndexedDB put, the ticket/generation check, the selection commit and
    // the localStorage flush are ONE GC critical section: a mount sweep or a
    // concurrent clear can never delete a new blob before the state references it.
    await withWallpaperGcLock(async () => {
      let sessionOnly = imageStore === undefined
      if (imageStore !== undefined) {
        try {
          await imageStore.put(createUploadRecord(key, file))
        } catch {
          sessionOnly = true
        }
      }
      const stateChanged = controller !== undefined
        && startSelectionVersion !== undefined
        && controller.getSelectionVersion() !== startSelectionVersion
      if (!mounted.current || !uploadTickets.current.isCurrent(ticket) || stateChanged) {
        if (imageStore !== undefined) void deleteStoredImage(imageStore, key, 'obsolete upload')
        return
      }
      const previous = controller?.getSnapshot().selection
      setUploadProblem(undefined)
      setUploadSessionOnly(sessionOnly)
      setAttribution(undefined)
      selectWallpaper({ kind: 'upload', key }, file)
      if (controller !== undefined && controller.flushState() !== true) {
        // The state is not recoverable after a failed write: roll the in-memory
        // selection back and remove the new blob instead of persisting a ghost.
        controller.setState({ selection: previous }, { flush: true })
        if (imageStore !== undefined) void deleteStoredImage(imageStore, key, 'failed upload persist')
      }
    })
  }
  const pickFiles = (files: FileList | null | undefined): void => {
    const file = files?.item(0)
    if (file !== null && file !== undefined) void applyUpload(file)
  }

  const selection = state.selection
  const selectedBuiltin = selection?.kind === 'builtin' ? selection.id : undefined
  const selectedRemote = selection?.kind === 'remote' ? selection.url : undefined

  // Focal position applies to remote/upload images only; built-ins stay centered.
  const canReposition = selection !== undefined && selection.kind !== 'builtin'
  const heroPosition = backgroundPositionValue(selection, state.position)

  const renderImage = controller?.getRenderImage()
  const heroName = selection === undefined
    ? undefined
    : selection.kind === 'builtin'
      ? t(BUILTIN_KEYS[selection.id])
      : selection.kind === 'upload'
        ? t('wallpaper.uploadTitle')
        : (() => {
          try {
            return new URL(selection.url).hostname
          } catch {
            return selection.url
          }
        })()
  const heroKind = selection?.kind === 'builtin'
    ? t('wallpaper.builtinKind')
    : selection?.kind === 'upload'
      ? t('wallpaper.uploadTitle')
      : selection?.kind === 'remote'
        ? (effectiveAttribution?.source ?? heroName)
        : undefined

  const statusKey = online.status === 'loading'
    ? 'wallpaper.loading'
    : online.status === 'empty'
      ? 'wallpaper.empty'
      : online.status === 'offline'
        ? 'wallpaper.offline'
        : online.status === 'error'
          ? 'wallpaper.error'
          : undefined
  const attributionLine = effectiveAttribution === undefined
    || (effectiveAttribution.title.length === 0 && effectiveAttribution.creator.length === 0
      && effectiveAttribution.license.length === 0 && effectiveAttribution.source.length === 0)
    ? undefined
    : t('wallpaper.attribution', {
      title: effectiveAttribution.title,
      creator: effectiveAttribution.context === 'custom'
        ? effectiveAttribution.source
        : effectiveAttribution.creator.length > 0 ? effectiveAttribution.creator : t('wallpaper.attributionUnknown'),
      license: effectiveAttribution.context === 'custom' || effectiveAttribution.license.length === 0
        ? t('wallpaper.licenseUnknown')
        : effectiveAttribution.license,
      source: effectiveAttribution.source,
    })

  const presetWallpaperTarget = async (target: PresetWallpaperTarget): Promise<boolean> => {
    const active = controller
    if (active === undefined) return false
    const selectionVersion = active.getSelectionVersion()
    let blob: Blob | undefined
    if (target.selection?.kind === 'remote') {
      const result = await cacheRemoteImage(target.selection.url, {
        images: imageStore,
        storage: recentStorage,
        protectedUrl: target.selection.url,
        protectedUrls: protectedRemoteUrls(),
        signal: cacheCancellation.current.reset(),
        deferPrune: true,
      })
      if (!mounted.current || !result.ok || active.getSelectionVersion() !== selectionVersion) return false
      blob = result.record.blob
      rememberBlob(target.selection.url, blob)
    }
    const previous = active.getSnapshot().selection
    const next = active.setState(
      { selection: target.selection, effects: target.effects, position: target.position },
      { flush: true, ...(blob === undefined ? {} : { blob }) },
    )
    const persisted = active.flushState()
    const ok = persisted && matchesPresetWallpaperState(next, target)
    if (ok) {
      const obsolete = obsoleteUploadKey(previous, target.selection)
      scheduleUploadDelete(obsolete, 'preset')
      if (target.selection?.kind === 'remote') {
        void pruneRemoteCache({ images: imageStore, storage: recentStorage, protectedUrl: target.selection.url })
      }
    }
    return ok
  }
  const presetAttribution: PresetAttribution | undefined = effectiveAttribution === undefined
    ? undefined
    : { title: effectiveAttribution.title, creator: effectiveAttribution.creator, license: effectiveAttribution.license, source: effectiveAttribution.source }
  const onPresetApplied = (result: PresetApplyResult, preset: LiveryPreset): void => {
    if (result.status !== 'applied') return
    const identity = preset.wallpaper === null
      ? 'none'
      : preset.wallpaper.kind === 'builtin'
        ? `builtin:${preset.wallpaper.id}`
        : `remote:${preset.wallpaper.url}`
    if (preset.attribution === undefined) {
      // A preset without attribution must suppress older history metadata for
      // the same remote URL; an explicit empty record still carries identity.
      setAttribution(preset.wallpaper?.kind === 'remote'
        ? { identity, title: '', creator: '', license: '', source: '', context: 'online' }
        : undefined)
      return
    }
    setAttribution({
      identity,
      title: preset.attribution.title ?? '',
      creator: preset.attribution.creator ?? '',
      license: preset.attribution.license ?? '',
      source: preset.attribution.source ?? '',
      context: preset.wallpaper?.kind === 'remote' ? 'online' : 'custom',
    })
    if (preset.wallpaper?.kind === 'remote') {
      recordRemoteHistory({
        url: preset.wallpaper.url,
        title: preset.attribution.title,
        creator: preset.attribution.creator,
        license: preset.attribution.license,
        source: preset.attribution.source,
      })
    }
  }

  return (
    <div data-testid="wallpaper-panel">
      <div className="wallpaper-layout" data-testid="wallpaper-layout">
        <div className="wallpaper-main">
          <section className="livery-ui-card wallpaper-hero" data-testid="wallpaper-hero">
            <div className="livery-ui-card__head">
              <h3 className="livery-ui-card__title">{t('wallpaper.currentTitle')}</h3>
              <div className="livery-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="wallpaper-clear"
                  disabled={selection === undefined}
                  onClick={() => { clearWallpaper(); setAttribution(undefined) }}
                >
                  {t('wallpaper.clear')}
                </Button>
              </div>
            </div>
            {selection === undefined || renderImage === undefined
              ? (
                <div className="wallpaper-hero__empty" data-testid="wallpaper-hero-empty">
                  <span>{t('wallpaper.currentEmpty')}</span>
                </div>
              )
              : (
                <>
                  <div
                    className="wallpaper-hero__preview"
                    data-testid="wallpaper-hero-preview"
                    style={{ backgroundImage: renderImage, backgroundPosition: heroPosition }}
                    aria-hidden="true"
                  >
                    <div className="wallpaper-hero__dim" style={{ opacity: state.effects.dim / 100 }} />
                    <div
                      className="wallpaper-hero__atmo"
                      style={{ backgroundImage: renderImage, backgroundPosition: heroPosition, opacity: state.effects.atmosphere / 100 }}
                    />
                  </div>
                  <div className="wallpaper-hero__meta">
                    <span className="wallpaper-hero__name">{heroName}</span>
                    <span className="livery-ui-card__hint">{heroKind}</span>
                  </div>
                  {attributionLine !== undefined && (
                    <p className="livery-ui-card__hint" data-testid="wallpaper-hero-attribution">{attributionLine}</p>
                  )}
                </>
              )}
            {canReposition && (
              <fieldset className="wallpaper-position" data-testid="wallpaper-position">
                <legend className="livery-ui-card__title">{t('wallpaper.positionTitle')}</legend>
                <p className="livery-ui-card__hint">{t('wallpaper.positionHint')}</p>
                <div className="wallpaper-position__grid">
                  {WALLPAPER_POSITION_OPTIONS.map(option => (
                    <label key={option.id} className="wallpaper-position__option">
                      <input
                        type="radio"
                        name="wallpaper-position"
                        value={`${option.x},${option.y}`}
                        data-testid={`wallpaper-position-${option.id}`}
                        checked={state.position.x === option.x && state.position.y === option.y}
                        onChange={() => controller?.setPosition({ x: option.x, y: option.y })}
                      />
                      <span>{t(POSITION_LABEL_KEYS[option.id])}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </section>

          <section className="livery-ui-card" data-testid="wallpaper-online-card">
            <h3 className="livery-ui-card__title">{t('wallpaper.onlineTitle')}</h3>
            <p className="livery-ui-card__hint">{t('wallpaper.onlineHint')}</p>
            <div className={SEARCH}>
              <Input
                data-testid="wallpaper-search"
                type="search"
                value={online.query}
                aria-label={t('wallpaper.onlineTitle')}
                placeholder={t('wallpaper.searchPlaceholder')}
                onChange={event => setOnline(previous => ({ ...previous, query: event.target.value }))}
                onKeyDown={event => { if (event.key === 'Enter') search() }}
              />
              <Button variant="outline" size="sm" data-testid="wallpaper-search-go" onClick={search}>{t('wallpaper.search')}</Button>
              <Button variant="ghost" size="sm" data-testid="wallpaper-random" onClick={random}>{t('wallpaper.random')}</Button>
              <Button variant="ghost" size="sm" data-testid="wallpaper-refresh" onClick={refresh}>{t('wallpaper.refresh')}</Button>
            </div>
            {statusKey !== undefined && (
              <p className="livery-ui-card__hint" data-testid="wallpaper-status" data-status={online.status} role="status">{t(statusKey)}</p>
            )}
            {(online.status === 'offline' || online.status === 'error') && (
              <div className="livery-actions">
                <Button variant="outline" size="sm" data-testid="wallpaper-online-retry" onClick={retry}>{t('action.retry')}</Button>
              </div>
            )}
            {online.results.length > 0 && (
              <div className={GRID} role="listbox" aria-label={t('wallpaper.resultsLabel')}>
                {online.results.map(result => (
                  <button
                    key={`${result.source}:${result.id}`}
                    type="button"
                    className={CARD}
                    role="option"
                    aria-selected={selectedRemote === result.url}
                    aria-label={t('wallpaper.attribution', {
                      title: result.title,
                      creator: result.creator.length > 0 ? result.creator : t('wallpaper.attributionUnknown'),
                      license: result.license.length > 0 ? result.license : t('wallpaper.licenseUnknown'),
                      source: result.source,
                    })}
                    data-testid="wallpaper-result"
                    data-wallpaper-url={result.url}
                    onClick={() => selectResult(result)}
                  >
                    <span className={THUMB}>
                      {safeRemoteImageUrl(result.thumbnail) !== undefined && (
                        <img className={THUMB_IMG} src={safeRemoteImageUrl(result.thumbnail)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                      )}
                    </span>
                    <span className="livery-card__body">
                      <span className={NAME}>{result.title}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {effectiveAttribution !== undefined && effectiveAttribution.context === 'online' && attributionLine !== undefined && (
              <p className="livery-ui-card__hint" data-testid="wallpaper-attribution">{attributionLine}</p>
            )}
          </section>

          {recent.length > 0 && (
            <section className="livery-ui-card" data-testid="wallpaper-recent-card">
              <div className="livery-ui-card__head">
                <h3 className="livery-ui-card__title">{t('wallpaper.recentTitle')}</h3>
                <Button variant="ghost" size="sm" data-testid="wallpaper-recent-clear" onClick={clearRecent}>
                  {t('wallpaper.recentClear')}
                </Button>
              </div>
              <p className="livery-ui-card__hint">{t('wallpaper.recentHint')}</p>
              <div className="wallpaper-recent-grid">
                {recent.map(entry => (
                  <button
                    key={entry.url}
                    type="button"
                    className="wallpaper-recent-item"
                    data-testid="wallpaper-recent-item"
                    data-url={entry.url}
                    data-cached={cachedUrls[entry.url] !== undefined ? 'true' : 'false'}
                    aria-label={[entry.title ?? entry.source ?? entry.url, cachedUrls[entry.url] !== undefined ? t('wallpaper.recentCached') : ''].filter(Boolean).join(' · ')}
                    onClick={() => reapplyRecent(entry)}
                  >
                    {displayUrlFor(entry) !== undefined && (
                      <img className="wallpaper-recent-thumb" src={displayUrlFor(entry)} alt="" loading="lazy" decoding="async" />
                    )}
                    <span className="wallpaper-recent-title">{entry.title ?? entry.source ?? entry.url}</span>
                    {entry.source !== undefined && <span className="wallpaper-recent-source">{entry.source}</span>}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="livery-ui-card" data-testid="wallpaper-custom-card">
            <div className="livery-ui-card__head">
              <h3 className="livery-ui-card__title">{t('wallpaper.uploadTitle')}</h3>
            </div>
            <div className="wallpaper-subrow">
              <p className="livery-ui-card__hint">{t('wallpaper.uploadHint')}</p>
              <div className={SEARCH}>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="wallpaper-file-input"
                  tabIndex={-1}
                  aria-hidden="true"
                  data-testid="wallpaper-upload"
                  aria-label={t('wallpaper.uploadTitle')}
                  onChange={event => { pickFiles(event.target.files); event.target.value = '' }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="wallpaper-upload-button"
                  aria-invalid={uploadProblem !== undefined}
                  aria-describedby={uploadProblem === undefined ? undefined : 'wallpaper-upload-error'}
                  aria-errormessage={uploadProblem === undefined ? undefined : 'wallpaper-upload-error'}
                  onClick={() => fileInput.current?.click()}
                >
                  {t('wallpaper.uploadButton')}
                </Button>
              </div>
              <div
                className={`wallpaper-dropzone${dragOver ? ' wallpaper-dropzone--over' : ''}`}
                data-testid="wallpaper-upload-dropzone"
                role="button"
                tabIndex={0}
                aria-label={t('wallpaper.uploadButton')}
                aria-invalid={uploadProblem !== undefined}
                aria-describedby={uploadProblem === undefined ? undefined : 'wallpaper-upload-error'}
                aria-errormessage={uploadProblem === undefined ? undefined : 'wallpaper-upload-error'}
                onClick={() => fileInput.current?.click()}
                onKeyDown={event => handleDropzoneKeyDown(event, () => fileInput.current?.click())}
                onDragOver={event => { event.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={event => {
                  event.preventDefault()
                  setDragOver(false)
                  pickFiles(event.dataTransfer.files)
                }}
              >
                {t('wallpaper.uploadDrop')}
              </div>
              {uploadProblem !== undefined && (
                <div id="wallpaper-upload-error" className="livery-notice livery-notice--error" data-testid="wallpaper-upload-error" role="alert">
                  <span className="livery-notice__body">{t(UPLOAD_PROBLEM_KEYS[uploadProblem])}</span>
                </div>
              )}
              {uploadSessionOnly && <p className="livery-ui-card__hint">{t('wallpaper.uploadSessionHint')}</p>}
            </div>
            <div className="wallpaper-subrow">
              <h4 className="livery-ui-card__title">{t('wallpaper.customTitle')}</h4>
              <p className="livery-ui-card__hint">{t('wallpaper.customHint')}</p>
              <div className={SEARCH}>
                <Input
                  data-testid="wallpaper-url"
                  type="url"
                  value={urlText}
                  maxLength={2048}
                  aria-label={t('wallpaper.customTitle')}
                  aria-invalid={problem !== undefined}
                  aria-describedby={problem === undefined ? undefined : 'wallpaper-url-error'}
                  aria-errormessage={problem === undefined ? undefined : 'wallpaper-url-error'}
                  placeholder={t('wallpaper.customPlaceholder')}
                  onChange={event => { setUrlText(event.target.value); if (problem !== undefined) setProblem(undefined) }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="wallpaper-url-apply"
                  aria-invalid={problem !== undefined}
                  aria-describedby={problem === undefined ? undefined : 'wallpaper-url-error'}
                  aria-errormessage={problem === undefined ? undefined : 'wallpaper-url-error'}
                  onClick={applyUrl}
                >
                  {t('wallpaper.customApply')}
                </Button>
              </div>
              {problem !== undefined && (
                <div id="wallpaper-url-error" className="livery-notice livery-notice--error" data-testid="wallpaper-url-error" role="alert">
                  <span className="livery-notice__body">{t(PROBLEM_KEYS[problem])}</span>
                </div>
              )}
            </div>
          </section>

          <WallpaperDataClear
            t={t}
            onBeforeClear={() => {
              remoteCommitTicket.current += 1
              cacheCancellation.current.cancel()
            }}
            onCleared={() => {
              setRecent([])
              releaseAllObjectUrls()
            }}
          />
        </div>

        <aside className="wallpaper-rail">
          <section className="livery-ui-card" data-testid="wallpaper-effects-card">
            <div className="livery-ui-card__head">
              <h3 className="livery-ui-card__title">{t('wallpaper.effects')}</h3>
              <Button
                variant="outline"
                size="sm"
                data-testid="wallpaper-reset"
                onClick={() => controller?.setEffects(DEFAULT_WALLPAPER_EFFECTS)}
              >
                {t('wallpaper.reset')}
              </Button>
            </div>
            <div className="wallpaper-effects-grid" data-testid="wallpaper-effects-grid">
              {EFFECT_ROWS.map(row => {
                const bounds = WALLPAPER_EFFECT_BOUNDS[row.id]
                const value = state.effects[row.id]
                return (
                  <label key={row.id} className="wallpaper-effect">
                    <span>{t(row.label)}</span>
                    <span className="wallpaper-effect__control">
                      <input
                        type="range"
                        data-testid={`wallpaper-${row.id}`}
                        min={bounds.min}
                        max={bounds.max}
                        step={bounds.step}
                        value={value}
                        onChange={event => controller?.setEffects({ [row.id]: Number(event.target.value) })}
                      />
                      <output>{t(row.format, { value })}</output>
                    </span>
                  </label>
                )
              })}
            </div>
            <p className="livery-ui-card__hint">{t('wallpaper.frostHint')}</p>
            <p className="livery-ui-card__hint">{t('wallpaper.atmosphereHint')}</p>
          </section>

          <PresetCard
            t={t}
            currentStyleId={snapshot.effectiveId ?? snapshot.confirmedId ?? STOCK_ID}
            currentWallpaper={{ selection: state.selection, effects: state.effects, position: state.position }}
            catalogIds={(snapshot.catalog?.liveries ?? []).map(livery => livery.id)}
            pluginVersion={snapshot.identity.pluginVersion}
            applyStyle={id => runtime.applyStyle(id)}
            applyWallpaper={presetWallpaperTarget}
            currentAttribution={presetAttribution}
            styleLabel={id => {
              const livery = snapshot.catalog?.liveries.find(candidate => candidate.id === id)
              return livery === undefined ? id : localizedName(livery, snapshot.locale)
            }}
            onApplyResult={onPresetApplied}
          />

          <section className="livery-ui-card" data-testid="wallpaper-builtins-card">
            <div className="livery-ui-card__head">
              <h3 className="livery-ui-card__title">{t('wallpaper.builtinTitle')}</h3>
            </div>
            <div className="wallpaper-swatches">
              {BUILTIN_WALLPAPER_IDS.map(id => (
                <button
                  key={id}
                  type="button"
                  className={`${CARD} wallpaper-swatch`}
                  data-testid="wallpaper-builtin"
                  data-wallpaper-id={id}
                  aria-pressed={selectedBuiltin === id}
                  aria-label={t(BUILTIN_KEYS[id])}
                  style={{ backgroundImage: BUILTIN_WALLPAPERS[id] }}
                  onClick={() => selectBuiltin(id)}
                >
                  <span className={NAME}>{t(BUILTIN_KEYS[id])}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
