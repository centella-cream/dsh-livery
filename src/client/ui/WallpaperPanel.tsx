/** One online result thumbnail; a failed remote image falls back to the skeleton. */
function ResultThumbnail({ src }: { readonly src: string }): JSX.Element {
  const [failed, setFailed] = useState(false)
  return (
    <span className={THUMB}>
      <span className="livery-thumb__fallback" aria-hidden="true" />
      {!failed && (
        <img
          className="livery-thumb__img"
          data-testid="wallpaper-result-thumb"
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(event) => {
            const image = event.currentTarget
            if (image.naturalWidth * image.naturalHeight > 40_000_000) setFailed(true)
          }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}

/**
 * Wallpaper studio panel: two background-preset cards (`No wallpaper`,
 * `Follow style`), the unchanged four image-source tabs, the curated built-in
 * gallery with its collapsed Classic group, online wallpapers with a provider
 * selector and explicit request states, effect sliders, uploaded images and a
 * custom https URL.
 *
 * Client-only: changes go through the wallpaper controller (localStorage +
 * IndexedDB uploads + one owned stylesheet); no host config or boot payload is
 * touched. Opening the page performs **no** network request: the default image
 * tab is Built-in, and only the first Online-tab activation starts one batch.
 * Search/Random/Refresh/Retry are the only other request triggers.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LiveryKey } from '../../i18n/index.js'
import { STOCK_ID } from '../../core/types.js'
import { localizedName } from '../model.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from '../model.js'
import type { LiveryTranslate } from '../platform.js'
import {
  BUILTIN_WALLPAPERS,
  CLASSIC_BUILTIN_IDS,
  DEFAULT_WALLPAPER_EFFECTS,
  DEFAULT_WALLPAPER_POSITION,
  WALLPAPER_EFFECT_BOUNDS,
  WALLPAPER_POSITION_OPTIONS,
  backgroundPositionValue,
  builtinGalleryVisibility,
  canRepositionWallpaper,
  normalizeWallpaperProvenance,
  validateWallpaperUrl,
} from '../wallpaper.js'
import type {
  BuiltinWallpaperId,
  WallpaperEffects,
  WallpaperPositionId,
  WallpaperProvenance,
  WallpaperSelection,
  WallpaperUrlProblem,
} from '../wallpaper.js'
import { OFFERED_PROVIDERS, providerById, providerImagePolicy } from '../wallpaper/providers.js'
import type { ImageHostPolicy, ProviderFailure, ProviderId, WallpaperProviderResult } from '../wallpaper/providers.js'
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
import { cacheRemoteImage, createRemoteCacheCancellation, deleteCachedRemote, isDecodableImage, loadCachedRemote, pruneRemoteCache } from '../wallpaper/cache.js'
import { isCurrentRemoteSelection } from '../wallpaper/selection-guard.js'
import { matchesPresetWallpaperState } from '../wallpaper/preset.js'
import { isLocalOrPrivateHost } from '../wallpaper/host-safety.js'
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
import { createOnlineStudio, onlineCapability, onlineFailureOf } from './wallpaper-online.js'
import type { OnlineStudio, ProviderChoice } from './wallpaper-online.js'
import { migrateLegacyAttribution, resolveWallpaperCredit, wallpaperCreditLinks } from './wallpaper-credit.js'
import type { WallpaperCreditLinkKind } from './wallpaper-credit.js'

const GRID = 'livery-grid'
const CARD = 'livery-card'
const THUMB = 'livery-thumb'
const NAME = 'livery-card__name'
const SEARCH = 'livery-search'

/** Stable id of the visible Follow-style disabled reason. */
export const STYLE_DISABLED_REASON_ID = 'wallpaper-style-disabled-reason'
/** Stable id of the capability-gated action reason. */
export const CAPABILITY_REASON_ID = 'wallpaper-capability-reason'

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
  invalid: 'wallpaper.uploadError.invalid',
}
const SOURCE_TABS = ['online', 'builtin', 'recent', 'local'] as const
type SourceTab = typeof SOURCE_TABS[number]
const RESULT_PAGE_SIZE = 6
const SOURCE_TAB_KEYS: Record<SourceTab, LiveryKey> = {
  online: 'wallpaper.sourceOnline',
  builtin: 'wallpaper.sourceBuiltin',
  recent: 'wallpaper.sourceRecent',
  local: 'wallpaper.sourceLocal',
}
/** Localized copy of each settled online provider failure. */
const ONLINE_FAILURE_KEYS: Record<ProviderFailure, LiveryKey> = {
  timeout: 'wallpaper.status.timeout',
  'rate-limited': 'wallpaper.status.rateLimited',
  'auth-required': 'wallpaper.status.authRequired',
  unavailable: 'wallpaper.status.unavailable',
  'invalid-response': 'wallpaper.status.invalidResponse',
}
/** Localized labels of the attribution links. */
const CREDIT_LINK_KEYS: Record<WallpaperCreditLinkKind, LiveryKey> = {
  creator: 'wallpaper.credit.creator',
  license: 'wallpaper.credit.license',
  source: 'wallpaper.credit.source',
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

/**
 * Roving-tabindex key map of the four image-source tabs.
 * @param current - currently selected tab.
 * @param key - React keyboard key.
 * @returns the next tab, or undefined when the key is not handled.
 */
export function sourceTabForKeyboard(current: SourceTab, key: string): SourceTab | undefined {
  const index = SOURCE_TABS.indexOf(current)
  let next: number | undefined
  if (key === 'ArrowRight' || key === 'ArrowDown') next = (index + 1) % SOURCE_TABS.length
  else if (key === 'ArrowLeft' || key === 'ArrowUp') next = (index - 1 + SOURCE_TABS.length) % SOURCE_TABS.length
  else if (key === 'Home') next = 0
  else if (key === 'End') next = SOURCE_TABS.length - 1
  if (next === undefined) return undefined
  return SOURCE_TABS[next]
}

/** Localized display name of one registered provider. */
function providerDisplayName(
  id: ProviderId | undefined,
  locale: LiveryRuntimeSnapshot['locale'],
): string | undefined {
  if (id === undefined) return undefined
  const provider = providerById(id)
  if (provider === undefined) return undefined
  return provider.label[locale === 'zh' ? 'zh-CN' : 'en-US']
}

/** Normalize a recent-history mirror entry into selection provenance. */
function provenanceOfRecentEntry(entry: RecentWallpaperEntry): WallpaperProvenance | undefined {
  return normalizeWallpaperProvenance({
    providerId: entry.providerId,
    title: entry.title,
    creator: entry.creator,
    creatorUrl: entry.creatorUrl,
    license: entry.license,
    licenseUrl: entry.licenseUrl,
    source: entry.source,
    sourceUrl: entry.sourceUrl,
  })
}

/** Normalize one online result into the authoritative selection provenance. */
function provenanceOfProviderResult(result: WallpaperProviderResult): WallpaperProvenance | undefined {
  const provider = providerById(result.providerId)
  return normalizeWallpaperProvenance({
    providerId: result.providerId,
    title: result.title,
    creator: result.creator,
    creatorUrl: result.creatorUrl,
    license: result.license?.name,
    licenseUrl: result.license?.url,
    // The English label is the stable display source carried by the record; the
    // panel localizes provider names at render time from `providerId`.
    source: provider?.label['en-US'] ?? result.providerId,
    sourceUrl: result.sourceUrl,
  })
}

/** Host policy of the provider a selection came from (undefined for legacy/custom). */
function policyOfSelection(selection: WallpaperSelection): ImageHostPolicy | undefined {
  if (selection === undefined || selection.kind !== 'remote') return undefined
  const providerId = selection.provenance?.providerId
  if (providerId === undefined) return undefined
  const provider = providerById(providerId)
  return provider === undefined ? undefined : providerImagePolicy(provider.id)
}

/** Props of the wallpaper studio panel. */
export interface WallpaperPanelProps {
  readonly t: LiveryTranslate
  readonly snapshot: LiveryRuntimeSnapshot
  readonly runtime: LiveryRuntimeApi
  /**
   * Test seam: inject an Online studio (its snapshot/actions drive the online
   * card). The default is a fresh studio owned by this panel instance.
   */
  readonly onlineStudio?: OnlineStudio | undefined
}

/**
 * Render the wallpaper studio tab.
 * @param props - locale `t` seat, runtime snapshot and optional studio seam.
 * @returns the wallpaper controls, presets, sources, online card and attribution.
 */
export function WallpaperPanel({ t, snapshot, runtime, onlineStudio: injectedStudio }: WallpaperPanelProps): JSX.Element {
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
  // One studio per mounted panel; the injected seam is owned by its caller.
  const studioRef = useRef<OnlineStudio | undefined>(injectedStudio)
  if (studioRef.current === undefined) studioRef.current = createOnlineStudio()
  const studio = studioRef.current
  const online = useSyncExternalStore(studio.subscribe, studio.getSnapshot, studio.getSnapshot)
  useEffect(() => {
    if (injectedStudio !== undefined) return undefined
    return () => { studio.dispose() }
  }, [studio, injectedStudio])
  const [urlText, setUrlText] = useState('')
  const [problem, setProblem] = useState<WallpaperUrlProblem | undefined>(undefined)
  const [remoteFailed, setRemoteFailed] = useState(false)
  const [uploadProblem, setUploadProblem] = useState<UploadProblem | undefined>(undefined)
  const [activeResult, setActiveResult] = useState(0)
  const [uploadSessionOnly, setUploadSessionOnly] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  // No request on mount: Built-in is the default image tab.
  const [sourceTab, setSourceTab] = useState<SourceTab>('builtin')
  const [resultPage, setResultPage] = useState(0)
  const [manageOpen, setManageOpen] = useState(false)
  const [recent, setRecent] = useState<readonly RecentWallpaperEntry[]>(() => readRecentWallpapers(recentStorage))
  const recentRef = useRef(recent)
  recentRef.current = recent
  const [cachedUrls, setCachedUrls] = useState<Record<string, string>>({})
  const resultPageCount = Math.max(1, Math.ceil(online.results.length / RESULT_PAGE_SIZE))
  const safeResultPage = Math.min(resultPage, resultPageCount - 1)
  const boundedResults = online.results.slice(
    safeResultPage * RESULT_PAGE_SIZE,
    (safeResultPage + 1) * RESULT_PAGE_SIZE,
  )
  useEffect(() => { setResultPage(0); setActiveResult(0) }, [online.results])
  useEffect(() => { setActiveResult(0) }, [safeResultPage])

  const objectUrlsRef = useRef<Map<string, string>>(new Map())
  const pendingUploadDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const remoteCommitTicket = useRef(0)
  const presetApplyStartVersion = useRef<number | undefined>(undefined)
  const presetApplyStartRevision = useRef<number | undefined>(undefined)
  const sourceTabRefs = useRef<Partial<Record<SourceTab, HTMLButtonElement | null>>>({})
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
  const uploadTickets = useRef(createAsyncTicket())
  const fileInput = useRef<HTMLInputElement | null>(null)
  const cacheCancellation = useRef(createRemoteCacheCancellation())

  const activateSourceTab = (tab: SourceTab): void => {
    setSourceTab(tab)
    // First Online activation performs exactly one batch; later switches are
    // no-ops because the studio has already settled.
    if (tab === 'online') void studio.activate()
  }

  const onSourceTabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const next = sourceTabForKeyboard(sourceTab, event.key)
    if (next === undefined) return
    event.preventDefault()
    activateSourceTab(next)
    requestAnimationFrame(() => { sourceTabRefs.current[next]?.focus() })
  }

  // One-shot migration of the retired panel-owned attribution key. Nothing in
  // this panel writes that key again; the selection provenance is authoritative.
  useEffect(() => {
    if (controller === undefined) return
    migrateLegacyAttribution({
      storage: recentStorage,
      selection: controller.getSnapshot().selection,
      save: (selection) => {
        controller.setSelection(selection)
        return controller.flushState() === true
      },
    })
    // Mount-only: later selections carry provenance themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const selectWallpaper = (selection: WallpaperSelection, blob?: Blob, persist = true): void => {
    cacheCancellation.current.cancel()
    if (selection?.kind !== 'upload') setUploadSessionOnly(false)
    const previous = controller?.getSnapshot().selection
    commitSelection(uploadTickets.current, () => controller?.setState(
      { selection },
      { ...(blob === undefined ? {} : { blob }), persist },
    ))
    // Only delete the old upload after the NEW state is confirmed written to
    // localStorage. A session-only selection must never displace the durable one.
    const persisted = persist && controller?.flushState() === true
    const obsolete = persisted ? obsoleteUploadKey(previous, selection) : undefined
    scheduleUploadDelete(obsolete, 'previous upload')
  }
  const clearWallpaper = (): void => {
    cacheCancellation.current.cancel()
    setUploadSessionOnly(false)
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
   * object URL, provenance and history. A failed download leaves the previous
   * wallpaper in place (no persisted remote selection with no renderable image).
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
    provenance?: WallpaperProvenance,
    policy?: ImageHostPolicy,
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
      ...(policy === undefined ? {} : { policy }),
    })
    if (!mounted.current || ticket !== remoteCommitTicket.current
      || (selectionVersion !== undefined && controller?.getSelectionVersion() !== selectionVersion)) return false
    if (!result.ok) return false
    rememberBlob(entry.url, result.record.blob)
    recordRemoteHistory(entry)
    selectWallpaper(provenance === undefined
      ? { kind: 'remote', url: entry.url }
      : { kind: 'remote', url: entry.url, provenance }, result.record.blob)
    if (controller?.flushState() === true) {
      void pruneRemoteCache({ images: imageStore, storage: recentStorage, protectedUrl: entry.url })
    }
    return true
  }

  const reapplyRecent = (entry: RecentWallpaperEntry): void => {
    setRemoteFailed(false)
    void (async () => {
      const ticket = ++remoteCommitTicket.current
      const selectionVersion = controller?.getSelectionVersion()
      const record = await loadCachedRemote(entry.url, imageStore)
      if (!mounted.current || ticket !== remoteCommitTicket.current
        || (selectionVersion !== undefined && controller?.getSelectionVersion() !== selectionVersion)) return
      const provenance = provenanceOfRecentEntry(entry)
      if (record !== undefined) {
        rememberBlob(entry.url, record.blob)
        recordRemoteHistory(entry)
        selectWallpaper(provenance === undefined
          ? { kind: 'remote', url: entry.url }
          : { kind: 'remote', url: entry.url, provenance }, record.blob)
        return
      }
      if (!(await commitRemote(entry, provenance)) && mounted.current) setRemoteFailed(true)
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
    if (controller?.getRenderImage(snapshot.themeMode) !== undefined) return
    const url = state.selection.url
    const policy = policyOfSelection(state.selection)
    const abort = typeof AbortController === 'undefined' ? undefined : new AbortController()
    let cancelled = false
    void cacheRemoteImage(url, {
      images: imageStore,
      storage: recentStorage,
      protectedUrl: url,
      protectedUrls: protectedRemoteUrls(),
      signal: abort?.signal,
      deferPrune: true,
      ...(policy === undefined ? {} : { policy }),
    }).then(result => {
      if (cancelled || !result.ok || !mounted.current) return
      if (!isCurrentRemoteSelection(controller?.getSnapshot().selection, url)) return
      rememberBlob(url, result.record.blob)
      const selection = controller?.getSnapshot().selection
      selectWallpaper(selection === undefined || selection.kind !== 'remote'
        ? { kind: 'remote', url }
        : selection, result.record.blob)
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
    setProblem(undefined)
    setUploadProblem(undefined)
  }
  const selectStyle = (): void => {
    selectWallpaper({ kind: 'style', variant: 'mesh' })
    setProblem(undefined)
    setUploadProblem(undefined)
  }
  const chooseNone = (): void => {
    clearWallpaper()
    setProblem(undefined)
    setUploadProblem(undefined)
  }
  const selectResult = (result: WallpaperProviderResult): void => {
    if (result.license === null) return
    setProblem(undefined)
    setRemoteFailed(false)
    void commitRemote({
      url: result.fullUrl,
      thumbnail: result.thumbUrl,
      providerId: result.providerId,
      title: result.title,
      creator: result.creator,
      license: result.license.name,
      source: providerDisplayName(result.providerId, snapshot.locale) ?? result.providerId,
      creatorUrl: result.creatorUrl,
      licenseUrl: result.license.url,
      sourceUrl: result.sourceUrl,
    }, provenanceOfProviderResult(result), providerImagePolicy(result.providerId))
      .then(ok => { if (!ok && mounted.current) setRemoteFailed(true) })
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
    const provenance = normalizeWallpaperProvenance({ title: t('wallpaper.customSelected'), source: host })
    void commitRemote({ url: check.url, title: t('wallpaper.customSelected'), source: host }, provenance)
      .then(ok => { if (!ok) setProblem('invalid') })
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
    if (!(await isDecodableImage(file))) {
      setUploadProblem('invalid')
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
      selectWallpaper({ kind: 'upload', key }, file, !sessionOnly)
      if (!sessionOnly && controller !== undefined && controller.flushState() !== true) {
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
  // Hero + style card preview use the mode-specific render image. Built-ins,
  // remote/upload images ignore the mode; a style selection resolves the recipe
  // against the active livery's light/dark token map.
  const renderImage = controller?.getRenderImage(snapshot.themeMode)
  const styleSelected = selection?.kind === 'style'
  const activeLivery = snapshot.effectiveId === undefined || snapshot.effectiveId === STOCK_ID
    ? undefined
    : snapshot.catalog?.liveries.find(livery => livery.id === snapshot.effectiveId)
  // The controller only receives catalog tokens for a non-stock applied livery,
  // so this is exactly "can Follow style generate a layer right now?".
  const styleTokensAvailable = activeLivery !== undefined
  const styleDisabled = styleSelected ? renderImage === undefined : !styleTokensAvailable
  const styleSwatchImage = styleSelected ? renderImage : undefined

  // Authoritative credit: selection provenance first, then the history mirror
  // (which legacy 0.2.1 records rely on and may carry URL fields).
  const credit = resolveWallpaperCredit(selection, recent)
  const creditLinks = wallpaperCreditLinks(credit)
  const creditProviderName = providerDisplayName(credit?.providerId, snapshot.locale)
  const creditSource = creditProviderName ?? credit?.source
  const creditText = credit === undefined
    ? undefined
    : t('wallpaper.attribution', {
      title: credit.title ?? (selection?.kind === 'remote' ? t('wallpaper.customSelected') : t('wallpaper.attributionUnknown')),
      creator: credit.creator ?? t('wallpaper.attributionUnknown'),
      license: credit.license ?? t('wallpaper.licenseUnknown'),
      source: creditSource ?? t('wallpaper.attributionUnknown'),
    })

  // Focal position applies to remote/upload images only; everything else is
  // centered (the generated style layer and built-ins are fixed recipes).
  const canReposition = canRepositionWallpaper(selection)
  const heroPosition = backgroundPositionValue(selection, state.position)

  const heroName = selection === undefined
    ? undefined
    : selection.kind === 'builtin'
      ? t(BUILTIN_KEYS[selection.id])
      : selection.kind === 'upload'
        ? t('wallpaper.uploadTitle')
        : selection.kind === 'style'
          ? t('wallpaper.presetStyle')
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
      : selection?.kind === 'style'
        ? t('wallpaper.styleKind')
        : selection?.kind === 'remote'
          ? (creditSource ?? heroName)
          : undefined

  // Online card derived state. `idle` renders no state at all: a request that
  // never ran must never look like loading/ready/failed.
  const gallery = builtinGalleryVisibility(selection)
  const pinnedClassic = gallery.pinnedClassic
  const onlineFailure = onlineFailureOf(online.status)
  const searchCapability = onlineCapability(online.provider, 'search')
  const randomCapability = onlineCapability(online.provider, 'random')
  const refreshEnabled = online.lastRequest !== undefined && online.status !== 'loading'
  const capabilityReason = (() => {
    const reasons: string[] = []
    if (!searchCapability.enabled) reasons.push(t('wallpaper.searchUnavailable'))
    if (!randomCapability.enabled) reasons.push(t('wallpaper.randomUnavailable'))
    return reasons.length === 0 ? undefined : reasons.join(' ')
  })()
  const statusText = online.status === 'idle'
    ? undefined
    : online.status === 'loading'
      ? t('wallpaper.status.loading')
      : online.status === 'ready'
        ? t('wallpaper.status.ready', { count: online.results.length })
        : online.status === 'empty'
          ? t('wallpaper.status.empty')
          : t('wallpaper.status.failed')
  const providerOptions: readonly { id: ProviderChoice; label: string }[] = [
    { id: 'auto', label: t('wallpaper.providerAuto') },
    ...OFFERED_PROVIDERS.map(provider => ({
      id: provider.id as ProviderChoice,
      label: provider.label[snapshot.locale === 'zh' ? 'zh-CN' : 'en-US'],
    })),
  ]
  const presetWallpaperTarget = async (target: PresetWallpaperTarget): Promise<boolean> => {
    const active = controller
    if (active === undefined) return false
    const applyStartVersion = presetApplyStartVersion.current
    const applyStartRevision = presetApplyStartRevision.current
    if (applyStartVersion !== undefined && active.getSelectionVersion() !== applyStartVersion) return false
    if (applyStartRevision !== undefined && active.getSnapshot().revision !== applyStartRevision) return false
    const selectionVersion = active.getSelectionVersion()
    const startRevision = active.getSnapshot().revision
    let blob: Blob | undefined
    if (target.selection?.kind === 'remote') {
      const policy = policyOfSelection(target.selection)
      const result = await cacheRemoteImage(target.selection.url, {
        images: imageStore,
        storage: recentStorage,
        protectedUrl: target.selection.url,
        protectedUrls: protectedRemoteUrls(),
        signal: cacheCancellation.current.reset(),
        deferPrune: true,
        ...(policy === undefined ? {} : { policy }),
      })
      if (!mounted.current || !result.ok
        || active.getSelectionVersion() !== selectionVersion
        || active.getSnapshot().revision !== startRevision) return false
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
  const presetAttribution: PresetAttribution | undefined = credit === undefined
    ? undefined
    : {
      ...(credit.providerId === undefined ? {} : { providerId: credit.providerId }),
      ...(credit.title === undefined ? {} : { title: credit.title }),
      ...(credit.creator === undefined ? {} : { creator: credit.creator }),
      ...(credit.license === undefined ? {} : { license: credit.license }),
      ...(credit.source === undefined ? {} : { source: credit.source }),
      ...(credit.creatorUrl === undefined ? {} : { creatorUrl: credit.creatorUrl }),
      ...(credit.licenseUrl === undefined ? {} : { licenseUrl: credit.licenseUrl }),
      ...(credit.sourceUrl === undefined ? {} : { sourceUrl: credit.sourceUrl }),
    }
  const onPresetApplied = (result: PresetApplyResult, preset: LiveryPreset): void => {
    if (result.status !== 'applied') return
    if (preset.wallpaper?.kind !== 'remote') return
    const provenance = normalizeWallpaperProvenance(preset.attribution)
    recordRemoteHistory({
      url: preset.wallpaper.url,
      providerId: preset.attribution?.providerId,
      title: preset.attribution?.title,
      creator: preset.attribution?.creator,
      license: preset.attribution?.license,
      source: preset.attribution?.source,
      creatorUrl: preset.attribution?.creatorUrl,
      licenseUrl: preset.attribution?.licenseUrl,
      sourceUrl: preset.attribution?.sourceUrl,
    })
    // Adopt the preset credit as selection provenance (the authoritative store);
    // the recent-history mirror above is display-only.
    const active = controller
    const current = active?.getSnapshot().selection
    if (provenance !== undefined && current?.kind === 'remote'
      && current.url === preset.wallpaper.url && current.provenance === undefined) {
      active?.setState({ selection: { kind: 'remote', url: current.url, provenance } }, { flush: true })
    }
  }

  return (
    <div data-testid="wallpaper-panel">
      <div className="wallpaper-workbench" data-testid="wallpaper-workbench">
        <section className="livery-ui-card wallpaper-hero" data-testid="wallpaper-hero">
          <div className="livery-ui-card__head">
            <h3 className="livery-ui-card__title">{t('wallpaper.currentTitle')}</h3>
            <div className="livery-actions">
              <Button
                variant="ghost"
                size="sm"
                data-testid="wallpaper-clear"
                disabled={selection === undefined}
                onClick={chooseNone}
              >
                {t('wallpaper.clear')}
              </Button>
            </div>
          </div>
          {selection === undefined || renderImage === undefined
            ? (
              <div className="wallpaper-hero__empty" data-testid="wallpaper-hero-empty">
                {/* A persisted style without catalog tokens paints nothing: name
                    the reason instead of pretending no wallpaper is selected. */}
                <span>{selection?.kind === 'style' ? t('wallpaper.styleDisabledReason') : t('wallpaper.currentEmpty')}</span>
              </div>
            )
            : (
              <>
                <div
                  className="wallpaper-hero__preview"
                  data-testid="wallpaper-hero-preview"
                  data-kind={selection.kind}
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
              </>
            )}
          {creditText !== undefined && (
            <p className="livery-ui-card__hint" data-testid="wallpaper-hero-attribution">{creditText}</p>
          )}
          {creditLinks.length > 0 && (
            <ul className="wallpaper-attribution-links" data-testid="wallpaper-attribution-links">
              {creditLinks.map(link => (
                <li key={link.kind} className="wallpaper-attribution-links__item">
                  <span className="wallpaper-attribution-links__label">{t(CREDIT_LINK_KEYS[link.kind])}</span>{' '}
                  <a
                    className="wallpaper-attribution-links__link"
                    data-testid="wallpaper-attribution-link"
                    data-kind={link.kind}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {link.kind === 'source' && creditProviderName !== undefined ? creditProviderName : link.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
          {remoteFailed && (
            <p id="wallpaper-download-error" className="livery-notice livery-notice--error" data-testid="wallpaper-download-error" role="alert">
              {t('wallpaper.downloadFailed')}
            </p>
          )}
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
      </div>

      <section className="livery-ui-card wallpaper-source-card" data-testid="wallpaper-source-card">
        <div className="livery-ui-card__head">
          <div>
            <h3 className="livery-ui-card__title">{t('wallpaper.sourceTitle')}</h3>
            <p className="livery-ui-card__hint">{t('wallpaper.sourceHint')}</p>
          </div>
        </div>

        <div className="wallpaper-presets" data-testid="wallpaper-presets">
          <h4 className="livery-ui-card__title">{t('wallpaper.presetsTitle')}</h4>
          <div className="wallpaper-preset-grid" role="group" aria-label={t('wallpaper.presetsTitle')}>
            <button
              type="button"
              className="wallpaper-preset-card"
              data-testid="wallpaper-preset-none"
              aria-pressed={selection === undefined}
              onClick={chooseNone}
            >
              <span className="livery-ui-card__title">{t('wallpaper.presetNone')}</span>
              <span className="wallpaper-preset-card__hint">{t('wallpaper.presetNoneHint')}</span>
            </button>
            <button
              type="button"
              className="wallpaper-preset-card"
              data-testid="wallpaper-preset-style"
              aria-pressed={styleSelected}
              disabled={styleDisabled}
              aria-describedby={styleDisabled ? STYLE_DISABLED_REASON_ID : undefined}
              onClick={selectStyle}
            >
              <span
                className="wallpaper-preset-card__swatch wallpaper-preset-style__swatch"
                aria-hidden="true"
                style={styleSwatchImage === undefined ? undefined : { backgroundImage: styleSwatchImage }}
              />
              <span className="livery-ui-card__title">{t('wallpaper.presetStyle')}</span>
              <span className="wallpaper-preset-card__hint">
                {styleSelected ? t('wallpaper.presetStyleSelected') : t('wallpaper.presetStyleHint')}
              </span>
            </button>
          </div>
          {styleDisabled && (
            <p id={STYLE_DISABLED_REASON_ID} className="livery-ui-card__hint" data-testid="wallpaper-style-disabled">
              {t('wallpaper.styleDisabledReason')}
            </p>
          )}
        </div>

        <div className="wallpaper-sources">
          <h4 className="livery-ui-card__title">{t('wallpaper.imageSourcesTitle')}</h4>
          <div className="wallpaper-source-tabs" data-testid="wallpaper-source-tabs" role="tablist" aria-label={t('wallpaper.sourceTitle')} onKeyDown={onSourceTabKeyDown}>
            {SOURCE_TABS.map(tab => (
              <button
                key={tab}
                type="button"
                id={`wallpaper-source-tab-${tab}`}
                role="tab"
                className="wallpaper-source-tab"
                data-testid={`wallpaper-source-tab-${tab}`}
                aria-selected={sourceTab === tab}
                aria-controls={`wallpaper-source-panel-${tab}`}
                tabIndex={sourceTab === tab ? 0 : -1}
                ref={element => { sourceTabRefs.current[tab] = element }}
                onClick={() => activateSourceTab(tab)}
              >
                {t(SOURCE_TAB_KEYS[tab])}
              </button>
            ))}
          </div>
          <div
            id="wallpaper-source-panel-online"
            role="tabpanel"
            aria-labelledby="wallpaper-source-tab-online"
            className="wallpaper-source-panel"
            data-testid="wallpaper-source-panel-online"
            hidden={sourceTab !== 'online'}
          >
            <section className="wallpaper-source-section" data-testid="wallpaper-online-card">
              <h3 className="livery-ui-card__title">{t('wallpaper.onlineTitle')}</h3>
              <p className="livery-ui-card__hint">{t('wallpaper.onlineHint')}</p>
              <div className="wallpaper-provider">
                <label className="wallpaper-provider__label" htmlFor="wallpaper-provider">{t('wallpaper.providerLabel')}</label>
                <select
                  id="wallpaper-provider"
                  className="wallpaper-provider__select"
                  data-testid="wallpaper-provider"
                  value={online.provider}
                  onChange={event => studio.setProvider(event.target.value)}
                >
                  {providerOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
              <p className="livery-ui-card__hint">{t('wallpaper.providerHint')}</p>

              <div className={SEARCH}>
                <Input
                  data-testid="wallpaper-search"
                  type="search"
                  value={online.query}
                  aria-label={t('wallpaper.onlineTitle')}
                  placeholder={t('wallpaper.searchPlaceholder')}
                  aria-invalid={onlineFailure !== undefined}
                  aria-describedby={onlineFailure === undefined ? undefined : 'wallpaper-online-error'}
                  aria-errormessage={onlineFailure === undefined ? undefined : 'wallpaper-online-error'}
                  onChange={event => studio.setQuery(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') void studio.search() }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="wallpaper-search-go"
                  disabled={!searchCapability.enabled}
                  aria-describedby={searchCapability.enabled ? undefined : CAPABILITY_REASON_ID}
                  onClick={() => { void studio.search() }}
                >
                  {t('wallpaper.search')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="wallpaper-random"
                  disabled={!randomCapability.enabled}
                  aria-describedby={randomCapability.enabled ? undefined : CAPABILITY_REASON_ID}
                  onClick={() => { void studio.random() }}
                >
                  {t('wallpaper.random')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="wallpaper-refresh"
                  disabled={!refreshEnabled}
                  onClick={() => { void studio.refresh() }}
                >
                  {t('wallpaper.refresh')}
                </Button>
              </div>
              {capabilityReason !== undefined && (
                <p id={CAPABILITY_REASON_ID} className="livery-ui-card__hint" data-testid="wallpaper-capability-reason">
                  {capabilityReason}
                </p>
              )}
              {statusText !== undefined && (
                <p
                  className="livery-ui-card__hint"
                  data-testid="wallpaper-status"
                  data-status={online.status}
                  role="status"
                  aria-live="polite"
                >
                  {statusText}
                </p>
              )}
              {online.status === 'ready' && online.servedBy !== undefined && (
                <p className="livery-ui-card__hint" data-testid="wallpaper-served-by" role="status" aria-live="polite">
                  {t('wallpaper.online.servedBy', {
                    provider: providerDisplayName(online.servedBy, snapshot.locale) ?? online.servedBy,
                  })}
                </p>
              )}
              {onlineFailure !== undefined && (
                <div id="wallpaper-online-error" className="livery-notice livery-notice--error" data-testid="wallpaper-online-error" role="alert">
                  <span className="livery-notice__body">{t(ONLINE_FAILURE_KEYS[onlineFailure])}</span>
                  {onlineFailure === 'rate-limited' && online.retryAfterMs !== undefined && (
                    <span className="livery-notice__body" data-testid="wallpaper-retry-after">
                      {t('wallpaper.online.retryAfter', { seconds: Math.max(1, Math.ceil(online.retryAfterMs / 1000)) })}
                    </span>
                  )}
                  <div className="livery-actions">
                    <Button variant="outline" size="sm" data-testid="wallpaper-online-retry" onClick={() => { void studio.retry() }}>
                      {t('action.retry')}
                    </Button>
                    <Button variant="ghost" size="sm" data-testid="wallpaper-online-builtin" onClick={() => activateSourceTab('builtin')}>
                      {t('wallpaper.online.builtin')}
                    </Button>
                    <Button variant="ghost" size="sm" data-testid="wallpaper-online-none" onClick={chooseNone}>
                      {t('wallpaper.online.none')}
                    </Button>
                  </div>
                </div>
              )}
              {online.status === 'empty' && (
                <div className="livery-notice livery-notice--info" data-testid="wallpaper-online-empty" role="status">
                  <span className="livery-notice__body">{t('wallpaper.online.emptyBody')}</span>
                  <div className="livery-actions">
                    <Button variant="outline" size="sm" data-testid="wallpaper-online-empty-builtin" onClick={() => activateSourceTab('builtin')}>
                      {t('wallpaper.online.builtin')}
                    </Button>
                    <Button variant="ghost" size="sm" data-testid="wallpaper-online-empty-none" onClick={chooseNone}>
                      {t('wallpaper.online.none')}
                    </Button>
                  </div>
                </div>
              )}
              {online.results.length > 0 && (
                <div
                  className={GRID}
                  role="listbox"
                  aria-label={t('wallpaper.resultsLabel')}
                  onKeyDown={(event) => {
                    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')]
                    const index = buttons.indexOf(event.target as HTMLButtonElement)
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? index - 1 : index
                    if (next !== index && buttons[next] !== undefined) { event.preventDefault(); setActiveResult(next); buttons[next]!.focus() }
                  }}
                >
                  {boundedResults.map((result, index) => {
                    const selectable = result.license !== null
                    return (
                      <button
                        key={`${result.providerId}:${result.id}`}
                        type="button"
                        className={CARD}
                        role="option"
                        tabIndex={index === activeResult ? 0 : -1}
                        aria-selected={selectedRemote === result.fullUrl}
                        aria-disabled={!selectable}
                        data-testid="wallpaper-result"
                        data-provider={result.providerId}
                        data-wallpaper-url={result.fullUrl}
                        data-selectable={selectable ? 'true' : 'false'}
                        aria-label={t('wallpaper.attribution', {
                          title: result.title,
                          creator: result.creator ?? t('wallpaper.attributionUnknown'),
                          license: result.license?.name ?? t('wallpaper.licenseUnknown'),
                          source: providerDisplayName(result.providerId, snapshot.locale) ?? result.providerId,
                        })}
                        onFocus={() => setActiveResult(index)}
                        onClick={() => selectResult(result)}
                      >
                        <ResultThumbnail src={result.thumbUrl} />
                        <span className="livery-card__body">
                          <span className={NAME}>{result.title}</span>
                        </span>
                        {!selectable && (
                          <span className="livery-ui-card__hint">{t('wallpaper.unselectable')}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
              {online.results.length > RESULT_PAGE_SIZE && (
                <div className="wallpaper-pager" data-testid="wallpaper-results-pager">
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="wallpaper-result-prev"
                    disabled={safeResultPage === 0}
                    onClick={() => setResultPage(Math.max(0, safeResultPage - 1))}
                  >
                    {t('wallpaper.resultPrev')}
                  </Button>
                  <span className="wallpaper-pager__label" data-testid="wallpaper-result-page">
                    {t('wallpaper.resultPage', { page: safeResultPage + 1, pages: resultPageCount })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="wallpaper-result-next"
                    disabled={safeResultPage >= resultPageCount - 1}
                    onClick={() => setResultPage(Math.min(resultPageCount - 1, safeResultPage + 1))}
                  >
                    {t('wallpaper.resultNext')}
                  </Button>
                </div>
              )}
            </section>
          </div>
          <div
            id="wallpaper-source-panel-builtin"
            role="tabpanel"
            aria-labelledby="wallpaper-source-tab-builtin"
            className="wallpaper-source-panel"
            data-testid="wallpaper-source-panel-builtin"
            hidden={sourceTab !== 'builtin'}
          >
            <p className="livery-ui-card__hint">{t('wallpaper.builtinHint')}</p>
            <section className="wallpaper-source-section" data-testid="wallpaper-builtins-card">
              <div className="livery-ui-card__head">
                <h3 className="livery-ui-card__title">{t('wallpaper.builtinTitle')}</h3>
              </div>
              {pinnedClassic !== undefined && (
                <div className="wallpaper-builtin-pinned" data-testid="wallpaper-builtin-pinned">
                  <p className="livery-ui-card__hint">{t('wallpaper.builtinCurrentClassic')}</p>
                  <div className="wallpaper-swatches">
                    <button
                      type="button"
                      className={`${CARD} wallpaper-swatch`}
                      data-testid="wallpaper-builtin-pinned-swatch"
                      data-wallpaper-id={pinnedClassic}
                      aria-pressed="true"
                      aria-label={t(BUILTIN_KEYS[pinnedClassic])}
                      style={{ backgroundImage: BUILTIN_WALLPAPERS[pinnedClassic] }}
                      onClick={() => selectBuiltin(pinnedClassic)}
                    >
                      <span className={NAME}>{t(BUILTIN_KEYS[pinnedClassic])}</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="wallpaper-swatches" data-testid="wallpaper-builtin-grid">
                {gallery.visible.map(id => (
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
              <details className="wallpaper-classic" data-testid="wallpaper-builtin-classic">
                <summary className="wallpaper-classic__summary">
                  {pinnedClassic === undefined
                    ? t('wallpaper.classicSummary', { count: CLASSIC_BUILTIN_IDS.length })
                    : t('wallpaper.classicSummaryPinned', { count: CLASSIC_BUILTIN_IDS.length })}
                </summary>
                <div className="wallpaper-swatches">
                  {gallery.classic.map(id => (
                    <button
                      key={id}
                      type="button"
                      className={`${CARD} wallpaper-swatch`}
                      data-testid="wallpaper-builtin-classic-swatch"
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
              </details>
              <p className="livery-ui-card__hint" data-testid="wallpaper-no-request-hint">
                {t('wallpaper.noRequestHint')}
              </p>
            </section>
          </div>
          <div
            id="wallpaper-source-panel-recent"
            role="tabpanel"
            aria-labelledby="wallpaper-source-tab-recent"
            className="wallpaper-source-panel"
            data-testid="wallpaper-source-panel-recent"
            hidden={sourceTab !== 'recent'}
          >
            {recent.length > 0
              ? <section className="wallpaper-source-section wallpaper-recent-section" data-testid="wallpaper-recent-card">
                <div className="livery-ui-card__head">
                  <h3 className="livery-ui-card__title">{t('wallpaper.recentTitle')}</h3>
                  <Button variant="ghost" size="sm" data-testid="wallpaper-recent-clear" onClick={clearRecent}>
                    {t('wallpaper.recentClear')}
                  </Button>
                </div>
                <p className="livery-ui-card__hint">{t('wallpaper.recentHint')}</p>
                <div className="wallpaper-recent-track">
                  {recent.map(entry => (
                    <button
                      key={entry.url}
                      type="button"
                      className="wallpaper-recent-item"
                      data-testid="wallpaper-recent-item"
                      data-url={entry.url}
                      data-cached={cachedUrls[entry.url] !== undefined ? 'true' : 'false'}
                      aria-pressed={selectedRemote === entry.url}
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
              : <p className="livery-ui-card__hint" data-testid="wallpaper-recent-empty">{t('wallpaper.recentEmpty')}</p>}
          </div>
          <div
            id="wallpaper-source-panel-local"
            role="tabpanel"
            aria-labelledby="wallpaper-source-tab-local"
            className="wallpaper-source-panel"
            data-testid="wallpaper-source-panel-local"
            hidden={sourceTab !== 'local'}
          >
            <p className="livery-ui-card__hint">{t('wallpaper.localHint')}</p>
            <section className="wallpaper-source-section" data-testid="wallpaper-custom-card">
              <div className="livery-ui-card__head">
                <h3 className="livery-ui-card__title">{t('wallpaper.uploadTitle')}</h3>
              </div>
              <div className="wallpaper-local-grid">
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
              </div>
            </section>
          </div>
        </div>
      </section>

      <details
        className="livery-ui-card wallpaper-manage"
        data-testid="wallpaper-manage"
        open={manageOpen}
        onToggle={event => setManageOpen(event.currentTarget.open)}
      >
        <summary className="wallpaper-manage__toggle" data-testid="wallpaper-manage-toggle">
          <span>{t('wallpaper.manageTitle')}</span>
          <span className="livery-ui-card__hint">{t('wallpaper.manageHint')}</span>
        </summary>
        <div className="wallpaper-manage__body">
          <PresetCard
            t={t}
            currentStyleId={snapshot.effectiveId ?? snapshot.confirmedId ?? STOCK_ID}
            currentWallpaper={{ selection: state.selection, effects: state.effects, position: state.position }}
            catalogIds={(snapshot.catalog?.liveries ?? []).map(livery => livery.id)}
            pluginVersion={snapshot.identity.pluginVersion}
            applyStyle={id => runtime.applyStyle(id)}
            applyWallpaper={presetWallpaperTarget}
            currentAttribution={presetAttribution}
            styleAvailable={styleTokensAvailable}
            styleLabel={id => {
              const livery = snapshot.catalog?.liveries.find(candidate => candidate.id === id)
              return livery === undefined ? id : localizedName(livery, snapshot.locale)
            }}
            onApplyResult={(result, preset) => {
              onPresetApplied(result, preset)
              if (result.status !== 'applied') setManageOpen(true)
            }}
            onApplyStart={() => {
              presetApplyStartVersion.current = controller?.getSelectionVersion()
              presetApplyStartRevision.current = controller?.getSnapshot().revision
            }}
          />
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
      </details>
    </div>
  )
}
