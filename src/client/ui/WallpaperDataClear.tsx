/**
 * "Clear local wallpaper data" control.
 *
 * Standalone so the wallpaper panel can mount it with a single line (the panel
 * is concurrently owned by the state-v2 work) and so the acceptance harness gets
 * stable test hooks: `wallpaper-clear-local-data` for the button and
 * `wallpaper-clear-local-result` for the localized outcome.
 *
 * The operation only removes disposable local data (non-current cached/upload
 * blobs, recent wallpaper history and the remote-cache mirror). The current
 * wallpaper selection and the image blob it needs are always preserved.
 */
import { useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LiveryKey } from '../../i18n/index.js'
import type { LiveryTranslate } from '../platform.js'
import type { WallpaperSelection } from '../wallpaper.js'
import { getWallpaperController } from '../wallpaper/controller.js'
import { hasCrossTabGcLock, withWallpaperGcLock } from '../wallpaper/gc-lock.js'
import { readReferencedUploadKeys } from '../wallpaper/refs.js'
import { createIndexedDbImageStore } from '../wallpaper/storage.js'
import { clearAllLocalWallpaperData } from '../wallpaper/lifecycle.js'
import type {
  ClearLocalWallpaperDataOptions,
  ClearLocalWallpaperDataResult,
  ClearLocalWallpaperDataStatus,
  WallpaperLocalStorage,
} from '../wallpaper/lifecycle.js'

/** Props of the standalone clear-local-data card. */
export interface WallpaperDataClearProps {
  readonly t: LiveryTranslate
  /**
   * Optional post-cleanup hook: the panel can drop its in-memory recent list /
   * thumbnail object URLs instead of showing history that no longer exists.
   */
  readonly onCleared?: ((result: ClearLocalWallpaperDataResult) => void) | undefined
  /** Invalidate in-flight remote commits before destructive cleanup. */
  readonly onBeforeClear?: (() => void) | undefined
}

/** Browser localStorage, or undefined in SSR/private mode. */
function browserStorage(): WallpaperLocalStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/**
 * Run the cleanup with real defaults: IndexedDB image store, browser
 * localStorage and the current controller selection. Injected options win, so
 * tests can pass fakes and a fixed selection.
 * @param options - optional dependency/selection overrides.
 * @returns the cleanup result (never throws).
 */
export async function runWallpaperDataClear(
  options: ClearLocalWallpaperDataOptions = {},
): Promise<ClearLocalWallpaperDataResult> {
  const selection: WallpaperSelection = options.selection ?? getWallpaperController()?.getSnapshot().selection
  try {
    return await withWallpaperGcLock(() => clearAllLocalWallpaperData({
      images: options.images ?? createIndexedDbImageStore(),
      storage: options.storage ?? browserStorage(),
      selection,
      getSelection: () => getWallpaperController()?.getSnapshot().selection ?? selection,
      getDurableSelection: () => getWallpaperController()?.getDurableSelection() ?? selection,
      getPersistedSelection: () => getWallpaperController()?.getPersistedSelection() ?? selection,
      getReferencedUploadKeys: options.getReferencedUploadKeys ?? (() => readReferencedUploadKeys(browserStorage())),
    }))
  } catch {
    // The operation itself is defensive; this is the last-resort guard so a
    // broken platform API can never crash the panel.
    return {
      status: 'partial',
      removedImages: 0,
      keptImages: 0,
      clearedHistory: false,
      clearedIndex: false,
      errors: ['unexpected'],
    }
  }
}

/**
 * i18n key for one cleanup status.
 * @param status - cleanup status.
 * @returns the dictionary key carrying that outcome copy.
 */
export function wallpaperDataClearStatusKey(status: ClearLocalWallpaperDataStatus): LiveryKey {
  if (status === 'partial') return 'wallpaper.clearLocal.partial'
  if (status === 'empty') return 'wallpaper.clearLocal.empty'
  return 'wallpaper.clearLocal.done'
}

/**
 * Localized outcome line for a cleanup run.
 * @param t - locale translate seat.
 * @param result - cleanup result.
 * @returns the localized sentence (with the removed-file count when relevant).
 */
export function wallpaperDataClearMessage(
  t: LiveryTranslate,
  result: ClearLocalWallpaperDataResult,
): string {
  return t(wallpaperDataClearStatusKey(result.status), { count: result.removedImages })
}

/**
 * Render the local wallpaper data cleanup card.
 * @param props - locale seat.
 * @returns the card with the stable control/result hooks.
 */
export function WallpaperDataClear({ t, onCleared, onBeforeClear }: WallpaperDataClearProps): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ClearLocalWallpaperDataResult | undefined>(undefined)
  const run = async (): Promise<void> => {
    if (busy) return
    if (!hasCrossTabGcLock()) {
      setResult({ status: 'partial', removedImages: 0, keptImages: 0, clearedHistory: false, clearedIndex: false, errors: ['cross-tab-lock'] })
      return
    }
    setBusy(true)
    try {
      onBeforeClear?.()
      const next = await runWallpaperDataClear()
      setResult(next)
      try {
        onCleared?.(next)
      } catch {
        /* a broken host callback must not hide the cleanup result */
      }
    } finally {
      setBusy(false)
    }
  }
  const message = result === undefined ? undefined : wallpaperDataClearMessage(t, result)
  return (
    <section className="livery-ui-card" data-testid="wallpaper-clear-local-card">
      <div className="livery-ui-card__head">
        <h3 className="livery-ui-card__title">{t('wallpaper.clearLocal.title')}</h3>
      </div>
      <p className="livery-ui-card__hint">{t('wallpaper.clearLocal.hint')}</p>
      <div className="livery-actions">
        <Button
          variant="outline"
          size="sm"
          data-testid="wallpaper-clear-local-data"
          disabled={busy}
          onClick={() => { void run() }}
        >
          {busy ? t('wallpaper.clearLocal.working') : t('wallpaper.clearLocal.button')}
        </Button>
      </div>
      {message !== undefined && result !== undefined && (
        <p
          id="wallpaper-clear-local-result"
          className="livery-ui-card__hint"
          data-testid="wallpaper-clear-local-result"
          data-status={result.status}
          data-removed={result.removedImages}
          role="status"
        >
          {message}
        </p>
      )}
    </section>
  )
}
