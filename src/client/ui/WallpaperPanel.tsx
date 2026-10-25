/**
 * Wallpaper studio panel: built-in CSS wallpapers, effect sliders, a validated
 * custom https URL and user-initiated online search (Openverse / Picsum).
 *
 * Client-only: changes go through the wallpaper controller (localStorage +
 * one owned stylesheet); no host config or boot payload is touched. Requests
 * run only from explicit user actions and resolve to typed panel states.
 */
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LiveryKey } from '../../i18n/index.js'
import type { LiveryRuntimeSnapshot } from '../model.js'
import { isStock } from '../model.js'
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
import { getWallpaperController } from '../wallpaper/controller.js'
import type { WallpaperState } from '../wallpaper/controller.js'

const HINT = 'livery-hint'
const ROW = 'livery-toolbar'
const GRID = 'livery-grid'
const HEAD = 'livery-family__head'
const CARD = 'livery-card'
const THUMB = 'livery-thumb'
const THUMB_IMG = 'livery-thumb__img'
const NAME = 'livery-card__name'
const SEARCH = 'livery-search'
const ACTIONS = 'livery-actions'

const BUILTIN_KEYS: Record<BuiltinWallpaperId, LiveryKey> = {
  aurora: 'wallpaper.builtin.aurora',
  dusk: 'wallpaper.builtin.dusk',
  mist: 'wallpaper.builtin.mist',
  paper: 'wallpaper.builtin.paper',
  ink: 'wallpaper.builtin.ink',
  ember: 'wallpaper.builtin.ember',
  sea: 'wallpaper.builtin.sea',
  mono: 'wallpaper.builtin.mono',
}
const PROBLEM_KEYS: Record<WallpaperUrlProblem, LiveryKey> = {
  empty: 'wallpaper.url.empty',
  'too-long': 'wallpaper.url.tooLong',
  'not-https': 'wallpaper.url.notHttps',
  credentials: 'wallpaper.url.credentials',
  invalid: 'wallpaper.url.invalid',
}
const EFFECT_ROWS: readonly { id: keyof WallpaperEffects; label: LiveryKey; format: LiveryKey }[] = [
  { id: 'blur', label: 'wallpaper.blur', format: 'wallpaper.px' },
  { id: 'dim', label: 'wallpaper.dim', format: 'wallpaper.percent' },
  { id: 'frost', label: 'wallpaper.frost', format: 'wallpaper.percent' },
]
const EMPTY: WallpaperState = { selection: undefined, effects: { ...DEFAULT_WALLPAPER_EFFECTS } }

interface RemoteState {
  readonly status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'offline'
  readonly results: readonly WallpaperRemoteResult[]
  readonly page: number
  readonly source: WallpaperRemoteSource
  readonly query: string
}
const IDLE_REMOTE: RemoteState = { status: 'idle', results: [], page: 1, source: 'openverse', query: '' }

interface Attribution {
  readonly url: string
  readonly title: string
  readonly creator: string
  readonly license: string
  readonly source: string
  readonly custom: boolean
}

/** Props of the wallpaper studio panel. */
export interface WallpaperPanelProps {
  readonly t: LiveryTranslate
  readonly snapshot: LiveryRuntimeSnapshot
}

/**
 * Render the wallpaper studio tab.
 * @param props - locale `t` seat and the runtime snapshot (for token frost).
 * @returns the wallpaper controls, online search and attribution.
 */
export function WallpaperPanel({ t, snapshot }: WallpaperPanelProps): JSX.Element {
  const controller = getWallpaperController()
  const state = useSyncExternalStore(
    listener => controller?.subscribe(listener) ?? (() => undefined),
    () => controller?.getSnapshot() ?? EMPTY,
    () => controller?.getSnapshot() ?? EMPTY,
  )
  const baseId = useId()
  const [urlText, setUrlText] = useState('')
  const [problem, setProblem] = useState<WallpaperUrlProblem | undefined>(undefined)
  const [remote, setRemote] = useState<RemoteState>(IDLE_REMOTE)
  const [attribution, setAttribution] = useState<Attribution | undefined>(undefined)
  const mounted = useRef(true)
  const seq = useRef(0)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const liveryId = snapshot.effectiveId
  const activeLivery = liveryId === undefined || isStock(liveryId)
    ? undefined
    : snapshot.catalog?.liveries.find(candidate => candidate.id === liveryId)

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
  }
  const selectResult = (result: WallpaperRemoteResult): void => {
    controller?.setSelection({ kind: 'remote', url: result.url })
    setAttribution({
      url: result.url, title: result.title, creator: result.creator,
      license: result.license, source: result.source, custom: false,
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
      url: check.url, title: t('wallpaper.customSelected'), creator: '',
      license: '', source: new URL(check.url).hostname, custom: true,
    })
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
  const attributionLine = attribution === undefined
    ? undefined
    : t('wallpaper.attribution', {
      title: attribution.title,
      creator: attribution.custom
        ? attribution.source
        : attribution.creator.length > 0 ? attribution.creator : t('wallpaper.attributionUnknown'),
      license: attribution.custom || attribution.license.length === 0
        ? t('wallpaper.licenseUnknown')
        : attribution.license,
      source: attribution.source,
    })

  return (
    <div className={ROW} data-testid="wallpaper-panel">
      <p className={HINT}>{t('wallpaper.hint')}</p>
      {activeLivery === undefined && <p className={HINT}>{t('wallpaper.stockNote')}</p>}

      <section className={ROW} aria-labelledby={`${baseId}-builtin`}>
        <h4 className={HEAD} id={`${baseId}-builtin`}>{t('wallpaper.builtinTitle')}</h4>
        <div className={GRID}>
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

      <section className={ROW} aria-labelledby={`${baseId}-effects`}>
        <h4 className={HEAD} id={`${baseId}-effects`}>{t('wallpaper.effects')}</h4>
        {EFFECT_ROWS.map(row => {
          const bounds = WALLPAPER_EFFECT_BOUNDS[row.id]
          const value = state.effects[row.id]
          return (
            <label key={row.id} className="wallpaper-effect">
              <span>{t(row.label)}</span>
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
            </label>
          )
        })}
        <p className={HINT}>{t('wallpaper.frostHint')}</p>
        <div className={ACTIONS}>
          <Button variant="outline" size="sm" data-testid="wallpaper-reset" onClick={() => controller?.setEffects(DEFAULT_WALLPAPER_EFFECTS)}>
            {t('wallpaper.reset')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-testid="wallpaper-clear"
            onClick={() => { controller?.clear(); setAttribution(undefined) }}
          >
            {t('wallpaper.clear')}
          </Button>
        </div>
      </section>

      <section className={ROW} aria-labelledby={`${baseId}-custom`}>
        <h4 className={HEAD} id={`${baseId}-custom`}>{t('wallpaper.customTitle')}</h4>
        <p className={HINT}>{t('wallpaper.customHint')}</p>
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
      </section>

      <section className={ROW} aria-labelledby={`${baseId}-online`}>
        <h4 className={HEAD} id={`${baseId}-online`}>{t('wallpaper.onlineTitle')}</h4>
        <p className={HINT}>{t('wallpaper.onlineHint')}</p>
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
        {statusKey !== undefined && (
          <p className={HINT} data-testid="wallpaper-status" data-status={remote.status} role="status">{t(statusKey)}</p>
        )}
        {remote.results.length > 0 && (
          <div className={GRID} role="listbox" aria-label={t('wallpaper.resultsLabel')}>
            {remote.results.map(result => (
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
        {attributionLine !== undefined && (
          <p className={HINT} data-testid="wallpaper-attribution">{attributionLine}</p>
        )}
      </section>
    </div>
  )
}
