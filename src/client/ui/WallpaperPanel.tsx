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
import { createIndexedDbImageStore, validateUploadFile } from '../wallpaper/storage.js'
import type { UploadProblem } from '../wallpaper/storage.js'
import { getWallpaperController } from '../wallpaper/controller.js'
import type { WallpaperState } from '../wallpaper/controller.js'
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
const EMPTY: WallpaperState = { selection: undefined, effects: { ...DEFAULT_WALLPAPER_EFFECTS } }

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
  readonly title: string
  readonly creator: string
  readonly license: string
  readonly source: string
  readonly context: 'online' | 'custom'
}

/** Props of the wallpaper studio panel. */
export interface WallpaperPanelProps {
  readonly t: LiveryTranslate
  readonly snapshot: LiveryRuntimeSnapshot
}

/**
 * Render the wallpaper studio tab.
 * @param props - locale `t` seat and the runtime snapshot (unused by layout).
 * @returns the wallpaper controls, online card and attribution.
 */
export function WallpaperPanel({ t }: WallpaperPanelProps): JSX.Element {
  const controller = getWallpaperController()
  const imageStore = useMemo(() => createIndexedDbImageStore(), [])
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
  const [online, setOnline] = useState<OnlineState>(IDLE_ONLINE)
  const [attribution, setAttribution] = useState<Attribution | undefined>(undefined)
  const mounted = useRef(true)
  const seq = useRef(0)
  const autoLoader = useRef(createAutoRandomLoader(page => { void run('picsum', '', page) }))
  const fileInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
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

  const selectBuiltin = (id: BuiltinWallpaperId): void => {
    controller?.setSelection({ kind: 'builtin', id })
    setAttribution(undefined)
    setProblem(undefined)
    setUploadProblem(undefined)
  }
  const selectResult = (result: WallpaperRemoteResult): void => {
    controller?.setSelection({ kind: 'remote', url: result.url })
    setAttribution({
      title: result.title,
      creator: result.creator,
      license: result.license,
      source: result.source,
      context: 'online',
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

  const statusKey = online.status === 'loading'
    ? 'wallpaper.loading'
    : online.status === 'empty'
      ? 'wallpaper.empty'
      : online.status === 'offline'
        ? 'wallpaper.offline'
        : online.status === 'error'
          ? 'wallpaper.error'
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
                    <p className="livery-ui-card__hint" data-testid="wallpaper-hero-attribution">{attributionLine}</p>
                  )}
                </>
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
