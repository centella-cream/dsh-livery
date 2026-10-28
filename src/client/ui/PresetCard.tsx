/**
 * Preset card: export the current visual setup as a portable JSON preset, and
 * import one with a diff preview + explicit confirm.
 *
 * Standalone by design (the wallpaper panel integrates it later): the runtime
 * style write and the state-v2 wallpaper batch arrive as two injected ports, so
 * this component needs no Cordis context, no module singleton and no host
 * config access. All file validation happens in `../wallpaper/preset.js`
 * (pure); this file only maps stable problem codes to localized copy and owns
 * the local view state (loaded preset, diff, apply result).
 *
 * Accessibility contract: one stable error region (`id="preset-error"`) plus
 * `aria-invalid` / `aria-describedby` / `aria-errormessage` on the control that
 * caused the error, the visually hidden file input is out of the tab order
 * (`tabIndex={-1}`), and the diff preview is a labelled region.
 */
import { useEffect, useRef, useState } from 'react'
import { Button, writeClipboard as writeClipboardPrimitive } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LiveryKey } from '../../i18n/index.js'
import { STOCK_ID } from '../../core/types.js'
import type { StyleApplyFailure, StyleApplyOutcome } from '../model.js'
import type { LiveryTranslate } from '../platform.js'
import { WALLPAPER_POSITION_OPTIONS } from '../wallpaper.js'
import type { WallpaperEffects, WallpaperPositionId, WallpaperSelection } from '../wallpaper.js'
import {
  PRESET_FILE_MAX_BYTES,
  applyPreset,
  applyPresetWallpaper,
  currentPresetOf,
  diffPreset,
  exportPreset,
  importPresetFile,
} from '../wallpaper/preset.js'
import type {
  LiveryPreset,
  PresetApplyResult,
  PresetAttribution,
  PresetChange,
  PresetCurrentWallpaper,
  PresetExportProblem,
  PresetProblem,
  PresetWallpaperTarget,
} from '../wallpaper/preset.js'

/** Stable id of the single preset error region (ARIA wiring + acceptance). */
export const PRESET_ERROR_ID = 'preset-error'
/** Stable id of the diff-preview region. */
export const PRESET_DIFF_ID = 'preset-diff'
/** Stable id of the visually hidden file input. */
export const PRESET_FILE_INPUT_ID = 'preset-import-file'

/** Which action produced a preset error. */
export type PresetCardErrorKind = 'import' | 'export' | 'copy' | 'download' | 'apply'

/** One preset-card error: stable kind + stable problem code (+ technical detail). */
export interface PresetCardError {
  readonly kind: PresetCardErrorKind
  /** Problem code within the kind (`too-large`, `style-refused`, `wallpaper`, …). */
  readonly code: string
  /** Offending field/pattern name for copy that names it. */
  readonly detail?: string | undefined
}

/** Live wallpaper subsystem state (subset of the state-v2 controller snapshot). */
export interface PresetWallpaperView {
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
  /** State-v2 `WallpaperPosition` (normalized here for export/diff). */
  readonly position: unknown
}

/** Props of the preset card. */
export interface PresetCardProps {
  readonly t: LiveryTranslate
  /** Currently applied livery id from the runtime snapshot (`stock` allowed). */
  readonly currentStyleId: string | undefined
  /** Live wallpaper state from the state-v2 controller snapshot. */
  readonly currentWallpaper: PresetWallpaperView
  /** Livery ids in the live catalog, for strict `styleId` validation on import. */
  readonly catalogIds: readonly string[]
  /** Running plugin version, written into `createdWith` on export. */
  readonly pluginVersion: string
  /**
   * Direct runtime style apply (`LiveryRuntimeApi.applyStyle`). The wallpaper
   * panel integration must pass this through from the workspace.
   */
  readonly applyStyle: (styleId: string) => Promise<StyleApplyOutcome>
  /**
   * One batch wallpaper apply. Expected wrapper:
   * `target => matchesPresetWallpaperState(controller.setState(target, {flush: true}), target)`.
   */
  readonly applyWallpaper: (target: PresetWallpaperTarget) => boolean | Promise<boolean>
  /** Live image credit of the current wallpaper, when one is shown. */
  readonly currentAttribution?: PresetAttribution | undefined
  /** Optional localized livery name for readable diff rows. */
  readonly styleLabel?: ((id: string) => string) | undefined
  /** Clipboard writer (injectable in tests); defaults to the primitives helper. */
  readonly writeClipboard?: ((text: string) => Promise<boolean>) | undefined
  /**
   * Called after each apply attempt with the preset that was applied (panel
   * toast/refresh/attribution hook; a partial result keeps the style applied).
   */
  readonly onApplyResult?: ((result: PresetApplyResult, preset: LiveryPreset) => void) | undefined
  /** Test/deep-link seam: start with a loaded preset. */
  readonly initialPreset?: LiveryPreset | undefined
  /** Test/deep-link seam: start with a visible error region. */
  readonly initialError?: PresetCardError | undefined
}

/** Localized copy for one import problem code. */
const IMPORT_ERROR_KEYS: Record<PresetProblem, LiveryKey> = {
  unreadable: 'preset.error.unreadable',
  'too-large': 'preset.error.tooLarge',
  'invalid-json': 'preset.error.invalidJson',
  'not-object': 'preset.error.notObject',
  'schema-version': 'preset.error.schemaVersion',
  'created-with': 'preset.error.createdWith',
  'unknown-field': 'preset.error.unknownField',
  'style-id': 'preset.error.styleId',
  'unknown-style': 'preset.error.unknownStyle',
  'catalog-unavailable': 'preset.error.catalogUnavailable',
  'wallpaper-kind': 'preset.error.wallpaperKind',
  'wallpaper-id': 'preset.error.wallpaperId',
  'wallpaper-url': 'preset.error.wallpaperUrl',
  effects: 'preset.error.effects',
  position: 'preset.error.position',
  attribution: 'preset.error.attribution',
  'forbidden-content': 'preset.error.forbiddenContent',
}

/** Localized copy for one export problem code. */
const EXPORT_ERROR_KEYS: Record<PresetExportProblem, LiveryKey> = {
  upload: 'preset.exportError.upload',
  'invalid-url': 'preset.exportError.invalidUrl',
  'invalid-wallpaper': 'preset.exportError.invalidWallpaper',
  'invalid-style': 'preset.exportError.invalidStyle',
  'invalid-version': 'preset.exportError.invalidVersion',
}

/** Localized copy for one apply failure code (`wallpaper` = partial failure). */
const APPLY_ERROR_KEYS: Record<StyleApplyFailure | 'wallpaper', LiveryKey> = {
  refused: 'preset.applyError.refused',
  transport: 'preset.applyError.transport',
  unknown: 'preset.applyError.unknown',
  unavailable: 'preset.applyError.unavailable',
  busy: 'preset.applyError.busy',
  wallpaper: 'preset.applyError.wallpaper',
}

/** Localized labels of the nine focal-point cells (shared with the wallpaper UI). */
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

/** Locale key of one preset-card error. */
export function presetErrorKey(error: PresetCardError): LiveryKey {
  if (error.kind === 'copy') return 'preset.copyError'
  if (error.kind === 'download') return 'preset.downloadError'
  if (error.kind === 'import') {
    return IMPORT_ERROR_KEYS[error.code as PresetProblem] ?? 'preset.error.generic'
  }
  if (error.kind === 'export') {
    return EXPORT_ERROR_KEYS[error.code as PresetExportProblem] ?? 'preset.error.generic'
  }
  return APPLY_ERROR_KEYS[error.code as StyleApplyFailure | 'wallpaper'] ?? 'preset.error.generic'
}

/** Localized message of one preset-card error. */
function presetErrorMessage(t: LiveryTranslate, error: PresetCardError): string {
  return t(presetErrorKey(error), {
    max: String(Math.round(PRESET_FILE_MAX_BYTES / 1024)),
    field: error.detail ?? '?',
  })
}

/** Localized wallpaper label for the diff preview. */
function wallpaperLabel(t: LiveryTranslate, wallpaper: PresetCurrentWallpaper): string {
  if (wallpaper === null) return t('preset.wallpaper.none')
  if (wallpaper.kind === 'upload') return t('preset.wallpaper.upload')
  if (wallpaper.kind === 'builtin') return t(`wallpaper.builtin.${wallpaper.id}` as LiveryKey)
  try {
    return new URL(wallpaper.url).hostname
  } catch {
    return wallpaper.url
  }
}

/** Localized effects summary for the diff preview. */
function effectsLabel(t: LiveryTranslate, effects: WallpaperEffects): string {
  return t('preset.effectsValue', {
    blur: effects.blur,
    dim: effects.dim,
    frost: effects.frost,
    atmosphere: effects.atmosphere,
  })
}

/** Localized focal-point label for the diff preview. */
function positionLabel(t: LiveryTranslate, position: { readonly x: number; readonly y: number }): string {
  const match = WALLPAPER_POSITION_OPTIONS.find(option => option.x === position.x && option.y === position.y)
  const id: WallpaperPositionId = match?.id ?? 'center'
  return t(POSITION_LABEL_KEYS[id])
}

/** Human-readable image credit for the diff preview. */
function attributionLabel(t: LiveryTranslate, attribution: PresetAttribution | undefined): string {
  if (attribution === undefined) return t('preset.creditNone')
  return attribution.title ?? attribution.creator ?? attribution.source ?? t('preset.creditNone')
}

/** Render one changed field as `{field}: {from} → {to}`. */
function changeLine(
  t: LiveryTranslate,
  change: PresetChange,
  styleLabel: (id: string) => string,
): string {
  const params: Record<string, string> = {}
  if (change.field === 'style') {
    params.field = t('preset.field.style')
    params.from = styleLabel(change.from)
    params.to = styleLabel(change.to)
  } else if (change.field === 'wallpaper') {
    params.field = t('preset.field.wallpaper')
    params.from = wallpaperLabel(t, change.from)
    params.to = wallpaperLabel(t, change.to)
  } else if (change.field === 'effects') {
    params.field = t('preset.field.effects')
    params.from = effectsLabel(t, change.from)
    params.to = effectsLabel(t, change.to)
  } else if (change.field === 'position') {
    params.field = t('preset.field.position')
    params.from = positionLabel(t, change.from)
    params.to = positionLabel(t, change.to)
  } else {
    params.field = t('preset.field.attribution')
    params.from = attributionLabel(t, change.from)
    params.to = attributionLabel(t, change.to)
  }
  return t('preset.diff.line', params)
}

/** Sanitize one livery id into a download filename segment. */
function fileSafeId(id: string): string {
  const safe = id.replace(/[^a-z0-9-]/gi, '').slice(0, 48)
  return safe.length > 0 ? safe : 'preset'
}

/** Trigger a browser download for one text file (no-op in SSR). */
function downloadText(fileName: string, text: string): void {
  if (typeof document === 'undefined'
    || typeof Blob === 'undefined'
    || typeof URL === 'undefined'
    || typeof URL.createObjectURL !== 'function') {
    throw new Error('download unavailable')
  }
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* the download already started */
    }
  }
}

/**
 * Render the preset card.
 * @param props - locale seat, live setup, injected ports and test seams.
 * @returns export/import/diff/confirm UI.
 */
export function PresetCard({
  t,
  currentStyleId,
  currentWallpaper,
  catalogIds,
  pluginVersion,
  applyStyle,
  applyWallpaper,
  currentAttribution,
  styleLabel,
  writeClipboard,
  onApplyResult,
  initialPreset,
  initialError,
}: PresetCardProps): JSX.Element {
  const [preset, setPreset] = useState<LiveryPreset | undefined>(initialPreset)
  const [error, setError] = useState<PresetCardError | undefined>(initialError)
  const [exported, setExported] = useState<{ readonly json: string; readonly bytes: number } | undefined>(undefined)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [applyResult, setApplyResult] = useState<PresetApplyResult | undefined>(undefined)
  const [applying, setApplying] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const mounted = useRef(true)
  const operationId = useRef(0)
  const copyTicket = useRef(0)
  const presetRef = useRef<LiveryPreset | undefined>(preset)
  presetRef.current = preset

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const current = currentPresetOf({
    styleId: currentStyleId,
    selection: currentWallpaper.selection,
    effects: currentWallpaper.effects,
    position: currentWallpaper.position,
    attribution: currentAttribution,
  })
  const diff = preset === undefined ? undefined : diffPreset(current, preset)
  const label = (id: string): string => {
    if (id === STOCK_ID) return t('current.stockName')
    return styleLabel?.(id) ?? id
  }
  const clipboardWriter = writeClipboard ?? (async (text: string) => writeClipboardPrimitive(text))

  const clearImportState = (): void => {
    setPreset(undefined)
    setApplyResult(undefined)
    setCopyState('idle')
  }

  const dismissError = (): void => {
    setError(undefined)
    setApplyResult(undefined)
  }

  const onPickFile = (): void => {
    fileInput.current?.click()
  }

  const onFilePicked = async (file: File | undefined): Promise<void> => {
    if (file === undefined || applying) return
    const ticket = ++operationId.current
    setError(undefined)
    setExported(undefined)
    setCopyState('idle')
    copyTicket.current += 1
    let result
    try {
      result = await importPresetFile(file, { catalogIds })
    } catch {
      if (mounted.current && ticket === operationId.current) {
        setError({ kind: 'import', code: 'unreadable' })
      }
      return
    }
    if (!mounted.current || ticket !== operationId.current) return
    if (!result.ok) {
      clearImportState()
      setError({ kind: 'import', code: result.problem, detail: result.detail })
      return
    }
    setPreset(result.preset)
    setApplyResult(undefined)
  }

  const onExport = (): void => {
    copyTicket.current += 1
    setError(undefined)
    setCopyState('idle')
    const result = exportPreset({
      styleId: currentStyleId,
      selection: currentWallpaper.selection,
      effects: currentWallpaper.effects,
      position: currentWallpaper.position,
      attribution: currentAttribution,
      pluginVersion,
    })
    if (!result.ok) {
      setExported(undefined)
      setError({ kind: 'export', code: result.problem })
      return
    }
    setExported({ json: result.json, bytes: result.bytes })
  }

  const onCopy = async (): Promise<void> => {
    if (exported === undefined) return
    const targetJson = exported.json
    const ticket = ++copyTicket.current
    let ok = false
    try {
      ok = await clipboardWriter(targetJson)
    } catch {
      ok = false
    }
    if (!mounted.current || ticket !== copyTicket.current || exported.json !== targetJson) return
    setCopyState(ok ? 'copied' : 'failed')
    if (!ok) setError({ kind: 'copy', code: 'clipboard' })
    else setError(undefined)
  }

  const onDownload = (): void => {
    if (exported === undefined) return
    try {
      downloadText(`dsh-livery-preset-${fileSafeId(preset?.styleId ?? current.styleId)}.json`, exported.json)
      setCopyState('idle')
      setError(undefined)
    } catch {
      setError({ kind: 'download', code: 'unavailable' })
    }
  }

  const reportError = (result: PresetApplyResult): void => {
    if (result.status === 'applied') {
      setError(undefined)
      return
    }
    if (result.status === 'partial') {
      setError({ kind: 'apply', code: 'wallpaper' })
      return
    }
    setError({ kind: 'apply', code: result.failure })
  }

  const applyWallpaperWhileMounted = (target: PresetWallpaperTarget): boolean | Promise<boolean> => {
    // Never start a wallpaper write after the card unmounted; the style write
    // may already be in flight, but the wallpaper half must be cancelled.
    if (!mounted.current) return false
    return applyWallpaper(target)
  }

  const onApply = async (): Promise<void> => {
    const targetPreset = preset
    if (targetPreset === undefined || applying) return
    const ticket = ++operationId.current
    setApplying(true)
    setError(undefined)
    const result = await applyPreset(targetPreset, { applyStyle, applyWallpaper: applyWallpaperWhileMounted })
    // A newer operation or a different imported preset must not receive this
    // operation's result, and this operation must not clear/overwrite it.
    if (!mounted.current || ticket !== operationId.current || presetRef.current !== targetPreset) {
      if (mounted.current) setApplying(false)
      return
    }
    setApplying(false)
    setApplyResult(result)
    reportError(result)
    if (result.status === 'applied') {
      clearImportState()
      setApplyResult({ status: 'applied' })
    }
    onApplyResult?.(result, targetPreset)
  }

  const onRetryWallpaper = async (): Promise<void> => {
    if (preset === undefined || applying) return
    setApplying(true)
    setError(undefined)
    const ok = await applyPresetWallpaper(preset, { applyWallpaper: applyWallpaperWhileMounted })
    if (!mounted.current) return
    setApplying(false)
    if (ok) {
      setApplyResult({ status: 'applied' })
      clearImportState()
      setApplyResult({ status: 'applied' })
      onApplyResult?.({ status: 'applied' }, preset)
      return
    }
    setApplyResult({ status: 'partial', styleId: preset.styleId })
    setError({ kind: 'apply', code: 'wallpaper' })
    onApplyResult?.({ status: 'partial', styleId: preset.styleId }, preset)
  }

  const onCancel = (): void => {
    if (applying) return
    operationId.current += 1
    clearImportState()
    setError(undefined)
  }

  const importInvalid = error?.kind === 'import' ? true : undefined
  const exportInvalid = error !== undefined && error.kind !== 'import' && error.kind !== 'apply' ? true : undefined
  const applyInvalid = error?.kind === 'apply' ? true : undefined

  return (
    <section className="livery-ui-card" data-testid="preset-card" aria-label={t('preset.title')}>
      <div className="livery-ui-card__head">
        <h3 className="livery-ui-card__title">{t('preset.title')}</h3>
      </div>
      <p className="livery-ui-card__hint">{t('preset.hint')}</p>

      <div className="livery-actions">
        <Button
          variant="outline"
          size="sm"
          data-testid="preset-export"
          disabled={applying}
          aria-invalid={exportInvalid}
          aria-describedby={exportInvalid === true ? PRESET_ERROR_ID : undefined}
          aria-errormessage={exportInvalid === true ? PRESET_ERROR_ID : undefined}
          onClick={onExport}
        >
          {t('preset.export')}
        </Button>
        <input
          ref={fileInput}
          id={PRESET_FILE_INPUT_ID}
          type="file"
          accept=".json,application/json"
          className="wallpaper-file-input"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="preset-import-file"
          onChange={event => {
            const file = event.target.files?.item(0) ?? undefined
            event.target.value = ''
            void onFilePicked(file)
          }}
        />
        <Button
          variant="outline"
          size="sm"
          data-testid="preset-import"
          disabled={applying}
          aria-invalid={importInvalid}
          aria-describedby={importInvalid === true ? PRESET_ERROR_ID : undefined}
          aria-errormessage={importInvalid === true ? PRESET_ERROR_ID : undefined}
          onClick={onPickFile}
        >
          {t('preset.import')}
        </Button>
      </div>
      <p className="livery-ui-card__hint">
        {t('preset.importHint', { max: String(Math.round(PRESET_FILE_MAX_BYTES / 1024)) })}
      </p>

      {error !== undefined && (
        <div
          id={PRESET_ERROR_ID}
          data-testid="preset-error"
          data-error-kind={error.kind}
          data-error-code={error.code}
          className="livery-notice livery-notice--error"
          role="alert"
        >
          <span className="livery-notice__body">{presetErrorMessage(t, error)}</span>
          <span className="livery-actions">
            {error.kind === 'apply' && error.code === 'wallpaper' && (
              <Button
                variant="outline"
                size="sm"
                data-testid="preset-retry-wallpaper"
                disabled={applying}
                onClick={() => { void onRetryWallpaper() }}
              >
                {t('preset.retryWallpaper')}
              </Button>
            )}
            {error.kind === 'apply' && error.code !== 'wallpaper' && (
              <Button
                variant="outline"
                size="sm"
                data-testid="preset-retry"
                disabled={applying || preset === undefined}
                onClick={() => { void onApply() }}
              >
                {t('preset.retry')}
              </Button>
            )}
            <Button variant="ghost" size="sm" data-testid="preset-dismiss" onClick={dismissError}>
              {t('preset.dismiss')}
            </Button>
          </span>
        </div>
      )}

      {exported !== undefined && (
        <div className="wallpaper-subrow" data-testid="preset-export-result">
          <p className="livery-ui-card__hint" data-testid="preset-export-status" role="status">
            {copyState === 'copied' ? t('preset.copied') : t('preset.exportReady', { bytes: exported.bytes })}
          </p>
          <div className="livery-actions">
            <Button
              variant="outline"
              size="sm"
              data-testid="preset-copy"
              aria-invalid={error?.kind === 'copy' ? true : undefined}
              aria-describedby={error?.kind === 'copy' ? PRESET_ERROR_ID : undefined}
              aria-errormessage={error?.kind === 'copy' ? PRESET_ERROR_ID : undefined}
              onClick={() => { void onCopy() }}
            >
              {t('preset.copy')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="preset-download"
              aria-invalid={error?.kind === 'download' ? true : undefined}
              aria-describedby={error?.kind === 'download' ? PRESET_ERROR_ID : undefined}
              aria-errormessage={error?.kind === 'download' ? PRESET_ERROR_ID : undefined}
              onClick={onDownload}
            >
              {t('preset.download')}
            </Button>
          </div>
        </div>
      )}

      {preset !== undefined && diff !== undefined && (
        <>
          <p className="livery-ui-card__hint" data-testid="preset-import-status" role="status">
            {t('preset.imported', { createdWith: preset.createdWith })}
          </p>
          <div
            id={PRESET_DIFF_ID}
            data-testid="preset-diff"
            className="livery-preset-diff"
            role="region"
            aria-label={t('preset.diff.title')}
          >
            <h4 className="livery-ui-card__title">{t('preset.diff.title')}</h4>
            {diff.changed
              ? (
                <ul className="livery-preset-diff__list">
                  {diff.changes.map(change => (
                    <li
                      key={change.field}
                      className="livery-check__value"
                      data-testid="preset-diff-row"
                      data-field={change.field}
                    >
                      {changeLine(t, change, label)}
                    </li>
                  ))}
                </ul>
              )
              : <p className="livery-ui-card__hint">{t('preset.diff.same')}</p>}
          </div>
          <div className="livery-actions">
            <Button
              variant="primary"
              size="sm"
              data-testid="preset-apply"
              disabled={applying}
              aria-invalid={applyInvalid}
              aria-describedby={applyInvalid === true ? `${PRESET_ERROR_ID} ${PRESET_DIFF_ID}` : PRESET_DIFF_ID}
              aria-errormessage={applyInvalid === true ? PRESET_ERROR_ID : undefined}
              onClick={() => { void onApply() }}
            >
              {applying ? t('preset.applying') : t('preset.apply')}
            </Button>
            <Button variant="ghost" size="sm" data-testid="preset-cancel" disabled={applying} onClick={onCancel}>
              {t('preset.cancel')}
            </Button>
          </div>
        </>
      )}

      {applyResult?.status === 'applied' && (
        <div className="livery-notice livery-notice--info" data-testid="preset-apply-status" role="status">
          <span className="livery-notice__body">{t('preset.applied')}</span>
          <Button variant="ghost" size="sm" data-testid="preset-dismiss" onClick={dismissError}>
            {t('preset.dismiss')}
          </Button>
        </div>
      )}
    </section>
  )
}
