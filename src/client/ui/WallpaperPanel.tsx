/**
 * Wallpaper studio panel: curated online library, 24 built-in CSS wallpapers,
 * effect sliders, uploaded images, custom https URLs and user-initiated
 * Openverse/Picsum search.
 *
 * Client-only: changes go through the wallpaper controller (localStorage +
 * IndexedDB uploads + one owned stylesheet); no host config or boot payload is
 * touched. Network requests fire only from explicit user actions.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LiveryKey } from '../../i18n/index.js'
import type { LiveryRuntimeSnapshot } from '../model.js'
import type { LiveryTranslate } from '../platform.js'
import {
  BUILTIN_WALLPAPERS,
  BUILTIN_WALLPAPER_IDS,
  DEFAULT_WALLPAPER_EFFECTS,
  WALLPAPER_EFFECT_BOUNDS,
  requestWallpaperResults,
  validateWallpaperUrl,
} from '../wallpaper.js'
import type { BuiltinWallpaperId, WallpaperEffects, WallpaperRemoteResult, WallpaperRemoteSource, WallpaperUrlProblem } from '../wallpaper.js'
import {
  LIBRARY_CATEGORIES,
  fetchLibraryBatch,
  mergeLibraryResults,
  readLibraryCache,
  writeLibraryCache,
} from '../wallpaper/library.js'
import type { LibraryCategoryId, LibraryStorage } from '../wallpaper/library.js'
import { createIndexedDbImageStore, validateUploadFile } from '../wallpaper/storage.js'
import type { UploadProblem } from '../wallpaper/storage.js'
import { getWallpaperController } from '../wallpaper/controller.js'
import type { WallpaperState } from '../wallpaper/controller.js'

const GRID = 'livery-grid'
const CARD = 'livery-card'
const THUMB = 'livery-thumb'
const THUMB_IMG = 'livery-thumb__img'
const NAME = 'livery-card__name'
const SEARCH = 'livery-search'
const CHIPS = 'livery-filters'

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
const EMPTY: WallpaperState = { selection: undefined, effects: { ...DEFAULT_WALLPAPER_EFFECTS } }
const MAX_LIBRARY_PAGE = 3

type LibraryStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'offline' | 'error' | 'cached'
interface LibraryState {
  readonly status: LibraryStatus
  readonly results: readonly WallpaperRemoteResult[]
  readonly page: number
  readonly cached: boolean
}
const IDLE_LIBRARY: LibraryState = { status: 'idle', results: [], page: 1, cached: false }

interface RemoteState {
  readonly status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'offline'
  readonly results: readonly WallpaperRemoteResult[]
  readonly page: number
  readonly source: WallpaperRemoteSource
  readonly query: string
}
const IDLE_REMOTE: RemoteState = { status: 'idle', results: [], page: 1, source: 'openverse', query: '' }

interface Attribution {
  readonly title: string
  readonly creator: string
  readonly license: string
  readonly source: string
  readonly context: 'library' | 'online' | 'custom'
}

function defaultCacheStorage(): LibraryStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/** Props of the wallpaper studio panel. */
export interface WallpaperPanelProps {
  readonly t: LiveryTranslate
  readonly snapshot: LiveryRuntimeSnapshot
}

/**
 * Render the wallpaper studio tab.
 * @param props - locale `t` seat and the runtime snapshot (for token frost).
 * @returns the wallpaper controls, online library, uploads and attribution.
 */
export function WallpaperPanel({ t }: WallpaperPanelProps): JSX.Element {
  const controller = getWallpaperController()
  const imageStore = useMemo(() => createIndexedDbImageStore(), [])
  const cacheStorage = useMemo(() => defaultCacheStorage(), [])
  const state = useSyncExternalStore(
    listener => controller?.subscribe(listener) ?? (() => undefined),
    () => controller?.getSnapshot() ?? EMPTY,
    () => controller?.getSnapshot() ?? EMPTY,
  )
  const [urlText, setUrlText] = useState('')
  const [problem, setProblem] = useState<WallpaperUrlProblem | undefined>(undefined)
  const [uploadProblem, setUploadProblem] = useState<UploadProblem | undefined>(undefined)
  const [uploadSessionOnly, setUploadSessionOnly] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [remote, setRemote] = useState<RemoteState>(IDLE_REMOTE)
  const [category, setCategory] = useState<LibraryCategoryId>('nature')
  const [library, setLibrary] = useState<LibraryState>(IDLE_LIBRARY)
  const [attribution, setAttribution] = useState<Attribution | undefined>(undefined)
  const mounted = useRef(true)
  const seq = useRef(0)
  const librarySeq = useRef(0)
  const autoLoaded = useRef(false)
  const fileInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const loadLibrary = async (nextCategory: LibraryCategoryId, page: number, append: boolean): Promise<void> => {
    const ticket = ++librarySeq.current
    setLibrary(previous => ({ ...previous, status: 'loading', page }))
    const outcome = await fetchLibraryBatch(nextCategory, page, { storage: cacheStorage })
    if (!mounted.current || librarySeq.current !== ticket) return
    if (outcome.ok) {
      const results = append
        ? mergeLibraryResults(library.results, outcome.results)
        : outcome.results
      setLibrary({ status: results.length === 0 ? 'empty' : 'ready', results, page, cached: false })
      const cache = readLibraryCache(cacheStorage)
      writeLibraryCache({ ...cache, [nextCategory]: { fetchedAt: Date.now(), page, results } }, cacheStorage)
      return
    }
    if (outcome.cached !== undefined) {
      const results = append
        ? mergeLibraryResults(library.results, outcome.cached.results)
        : outcome.cached.results
      setLibrary({ status: 'cached', results, page: outcome.cached.page, cached: true })
      return
    }
    setLibrary({ status: outcome.reason, results: [], page, cached: false })
  }

  // User-initiated: opening the wallpaper tab auto-loads the active category once.
  useEffect(() => {
    if (autoLoaded.current) return
    autoLoaded.current = true
    void loadLibrary(category, 1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectCategory = (next: LibraryCategoryId): void => {
    setCategory(next)
    setAttribution(undefined)
    void loadLibrary(next, 1, false)
  }
  const moreLibrary = (): void => {
    const next = library.page >= MAX_LIBRARY_PAGE ? 1 : library.page + 1
    void loadLibrary(category, next, next > 1)
  }

  const run = async (source: WallpaperRemoteSource, query: string, page: number): Promise<void> => {
    const ticket = ++seq.current
    setRemote(previous => ({ ...previous, status: 'loading', page, source, query }))
    const outcome = await requestWallpaperResults({ source, query, page })
    if (!mounted.current || seq.current !== ticket) return
    setRemote({
      status: outcome.ok ? (outcome.results.length === 0 ? 'empty' : 'ready') : outcome.reason === 'offline' ? 'offline' : 'error',
      results: outcome.ok ? outcome.results : [],
      page,
      source,
      query,
    })
  }

  const search = (): void => {
    const query = remote.query.trim()
    void run('openverse', query.length > 0 ? query : 'landscape', 1)
  }
  const random = (): void => { void run('picsum', '', Math.floor(Math.random() * 8) + 1) }
  const refresh = (): void => {
    if (remote.source === 'picsum') random()
    else if (remote.status === 'ready' || remote.status === 'empty') void run('openverse', remote.query, remote.page + 1)
    else void run('openverse', 'landscape', 1)
  }
  const selectBuiltin = (id: BuiltinWallpaperId): void => {
    controller?.setSelection({ kind: 'builtin', id })
    setAttribution(undefined)
    setProblem(undefined)
    setUploadProblem(undefined)
  }
  const selectResult = (result: WallpaperRemoteResult, context: Attribution['context']): void => {
    controller?.setSelection({ kind: 'remote', url: result.url })
    setAttribution({
      title: result.title,
      creator: result.creator,
      license: result.license,
      source: result.source,
      context,
    })
    setProblem(undefined)
  }
  const applyUrl = (): void => {
    const check = validateWallpaperUrl(urlText)
    if (!check.ok) {
      setProblem(check.problem)
      return
    }
    setProblem(undefined)
    controller?.setSelection({ kind: 'remote', url: check.url })
    setAttribution({
      title: t('wallpaper.customSelected'), creator: '', license: '',
      source: new URL(check.url).hostname, context: 'custom',
    })
  }
  const applyUpload = async (file: File): Promise<void> => {
    const check = validateUploadFile(file)
    if (!check.ok) {
      setUploadProblem(check.problem)
      return
    }
    setUploadProblem(undefined)
    const key = `upload-${Date.now()}-${Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 10)}`
    let sessionOnly = imageStore === undefined
    if (imageStore !== undefined) {
      try {
        await imageStore.put({ key, name: file.name, type: file.type, size: file.size, blob: file })
      } catch {
        sessionOnly = true
      }
    }
    setUploadSessionOnly(sessionOnly)
    setAttribution(undefined)
    controller?.setSelection({ kind: 'upload', key }, file)
  }
  const pickFiles = (files: FileList | null | undefined): void => {
    const file = files?.item(0)
    if (file !== null && file !== undefined) void applyUpload(file)
  }

  const selection = state.selection
  const selectedBuiltin = selection?.kind === 'builtin' ? selection.id : undefined
  const selectedRemote = selection?.kind === 'remote' ? selection.url : undefined

  const statusKey = remote.status === 'loading'
    ? 'wallpaper.loading'
    : remote.status === 'empty'
      ? 'wallpaper.empty'
      : remote.status === 'offline'
        ? 'wallpaper.offline'
        : remote.status === 'error'
          ? 'wallpaper.error'
          : undefined
  const libraryStatusKey = library.status === 'loading'
    ? 'wallpaper.loading'
    : library.status === 'empty'
      ? 'wallpaper.empty'
      : library.status === 'offline'
        ? 'wallpaper.offline'
        : library.status === 'error'
          ? 'wallpaper.error'
          : library.status === 'cached'
            ? 'wallpaper.libraryCached'
            : undefined
  const attributionLine = attribution === undefined
    ? undefined
    : t('wallpaper.attribution', {
      title: attribution.title,
      creator: attribution.context === 'custom'
        ? attribution.source
        : attribution.creator.length > 0 ? attribution.creator : t('wallpaper.attributionUnknown'),
      license: attribution.context === 'custom' || attribution.license.length === 0
        ? t('wallpaper.licenseUnknown')
        : attribution.license,
      source: attribution.source,
    })

  // Hero preview: same image/gradient the layers use, plus the current dim and
  // atmosphere values, rendered in-card (no remote screenshot).
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
        ? (attribution?.source ?? heroName)
        : undefined
  const selectedFromLibrary = attribution !== undefined && attribution.context === 'library'

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
                  onClick={() => { controller?.clear(); setAttribution(undefined) }}
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
                    style={{ backgroundImage: renderImage }}
                    aria-hidden="true"
                  >
                    <div className="wallpaper-hero__dim" style={{ opacity: state.effects.dim / 100 }} />
                    <div
                      className="wallpaper-hero__atmo"
                      style={{ backgroundImage: renderImage, opacity: state.effects.atmosphere / 100 }}
                    />
                  </div>
                  <div className="wallpaper-hero__meta">
                    <span className="wallpaper-hero__name">{heroName}</span>
                    <span className="livery-ui-card__hint">{heroKind}</span>
                  </div>
                  {attributionLine !== undefined && (
                    <p className="livery-ui-card__hint" data-testid="wallpaper-library-attribution">{attributionLine}</p>
                  )}
                </>
              )}
          </section>

          <section className="livery-ui-card" data-testid="wallpaper-library-card">
            <div className="livery-ui-card__head">
              <h3 className="livery-ui-card__title">{t('wallpaper.libraryTitle')}</h3>
              <Button variant="outline" size="sm" data-testid="wallpaper-library-more" onClick={moreLibrary}>
                {t('wallpaper.libraryMore')}
              </Button>
            </div>
            <p className="livery-ui-card__hint">{t('wallpaper.libraryHint')}</p>
            <div className={CHIPS} role="group" aria-label={t('wallpaper.categoryLabel')}>
              {LIBRARY_CATEGORIES.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  className="livery-chip"
                  data-testid="wallpaper-category"
                  data-category={entry.id}
                  aria-pressed={category === entry.id}
                  onClick={() => selectCategory(entry.id)}
                >
                  {t(entry.labelKey)}
                </button>
              ))}
            </div>
            {libraryStatusKey !== undefined && (
              <p
                className="livery-ui-card__hint"
                data-testid="wallpaper-library-status"
                data-status={library.status}
                role="status"
              >
                {t(libraryStatusKey)}
              </p>
            )}
            {library.results.length > 0 && (
              <div className={GRID} role="listbox" aria-label={t('wallpaper.libraryTitle')}>
                {library.results.map(result => (
                  <button
                    key={`${result.source}:${result.id}`}
                    type="button"
                    className={CARD}
                    role="option"
                    aria-selected={selectedRemote === result.url && selectedFromLibrary}
                    aria-label={t('wallpaper.attribution', {
                      title: result.title,
                      creator: result.creator.length > 0 ? result.creator : t('wallpaper.attributionUnknown'),
                      license: result.license.length > 0 ? result.license : t('wallpaper.licenseUnknown'),
                      source: result.source,
                    })}
                    data-testid="wallpaper-library-result"
                    data-wallpaper-url={result.url}
                    onClick={() => selectResult(result, 'library')}
                  >
                    <span className={THUMB}>
                      <img className={THUMB_IMG} src={result.thumbnail} alt="" loading="lazy" decoding="async" />
                    </span>
                    <span className="livery-card__body">
                      <span className={NAME}>{result.title}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="livery-ui-card" data-testid="wallpaper-random-card">
            <div className="livery-ui-card__head">
              <h3 className="livery-ui-card__title">{t('wallpaper.randomTitle')}</h3>
            </div>
            <p className="livery-ui-card__hint">{t('wallpaper.randomHint')}</p>
            <div className={SEARCH}>
              <Input
                data-testid="wallpaper-search"
                type="search"
                value={remote.query}
                aria-label={t('wallpaper.onlineTitle')}
                placeholder={t('wallpaper.searchPlaceholder')}
                onChange={event => setRemote(previous => ({ ...previous, query: event.target.value }))}
                onKeyDown={event => { if (event.key === 'Enter') search() }}
              />
              <Button variant="outline" size="sm" data-testid="wallpaper-search-go" onClick={search}>{t('wallpaper.search')}</Button>
              <Button variant="ghost" size="sm" data-testid="wallpaper-refresh" onClick={refresh}>{t('wallpaper.refresh')}</Button>
              <Button variant="ghost" size="sm" data-testid="wallpaper-random" onClick={random}>{t('wallpaper.random')}</Button>
            </div>
            <p className="livery-ui-card__hint">{t('wallpaper.onlineHint')}</p>
            {statusKey !== undefined && (
              <p className="livery-ui-card__hint" data-testid="wallpaper-status" data-status={remote.status} role="status">{t(statusKey)}</p>
            )}
            {remote.results.length > 0 && (
              <div className={GRID} role="listbox" aria-label={t('wallpaper.resultsLabel')}>
                {remote.results.map(result => (
                  <button
                    key={`${result.source}:${result.id}`}
                    type="button"
                    className={CARD}
                    role="option"
                    aria-selected={selectedRemote === result.url && !selectedFromLibrary}
                    aria-label={t('wallpaper.attribution', {
                      title: result.title,
                      creator: result.creator.length > 0 ? result.creator : t('wallpaper.attributionUnknown'),
                      license: result.license.length > 0 ? result.license : t('wallpaper.licenseUnknown'),
                      source: result.source,
                    })}
                    data-testid="wallpaper-result"
                    data-wallpaper-url={result.url}
                    onClick={() => selectResult(result, 'online')}
                  >
                    <span className={THUMB}>
                      <img className={THUMB_IMG} src={result.thumbnail} alt="" loading="lazy" decoding="async" />
                    </span>
                    <span className="livery-card__body">
                      <span className={NAME}>{result.title}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {attribution !== undefined && attribution.context === 'online' && attributionLine !== undefined && (
              <p className="livery-ui-card__hint" data-testid="wallpaper-attribution">{attributionLine}</p>
            )}
          </section>

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
                  data-testid="wallpaper-upload"
                  aria-label={t('wallpaper.uploadTitle')}
                  onChange={event => { pickFiles(event.target.files); event.target.value = '' }}
                />
                <Button variant="outline" size="sm" data-testid="wallpaper-upload-button" onClick={() => fileInput.current?.click()}>
                  {t('wallpaper.uploadButton')}
                </Button>
              </div>
              <div
                className={`wallpaper-dropzone${dragOver ? ' wallpaper-dropzone--over' : ''}`}
                data-testid="wallpaper-upload-dropzone"
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
                <div className="livery-notice livery-notice--error" data-testid="wallpaper-upload-error" role="alert">
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
                  placeholder={t('wallpaper.customPlaceholder')}
                  onChange={event => { setUrlText(event.target.value); if (problem !== undefined) setProblem(undefined) }}
                />
                <Button variant="outline" size="sm" data-testid="wallpaper-url-apply" onClick={applyUrl}>
                  {t('wallpaper.customApply')}
                </Button>
              </div>
              {problem !== undefined && (
                <div className="livery-notice livery-notice--error" data-testid="wallpaper-url-error" role="alert">
                  <span className="livery-notice__body">{t(PROBLEM_KEYS[problem])}</span>
                </div>
              )}
            </div>
          </section>
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
