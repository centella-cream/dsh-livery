/**
 * Shared Livery workspace: everything below the page header.
 *
 * Rendered inside both compositions — the keyed `main` panel page on certified
 * hosts (sidebar plugin navigation) and the legacy `settings.section` page on
 * older/foreign compositions — so preview/apply/restore/self-check behavior,
 * locale handling and the black-box `data-testid` hooks stay identical
 * regardless of where the host mounts the feature.
 *
 * Owns only local view state (search query, expanded panels, dialog
 * visibility); every skin decision lives in the runtime and every DOM write
 * outside React lives in the presenter.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Button, Modal, Tag, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  isStock,
  localizedDescription,
  localizedName,
  previewUrl,
  resolvePreviewLocale,
  sortLiveries,
} from '../model.js'
import type { LiveryRuntimeApi, PreviewLocaleChoice } from '../model.js'
import type { LiveryTranslate } from '../platform.js'
import { capabilityList } from './capability-names.js'
import { rememberedPageTab, rememberPageTab } from './tabs.js'
import type { PageTab } from './tabs.js'
import { Gallery } from './Gallery.js'
import { SelfCheck } from './SelfCheck.js'
import { WallpaperPanel } from './WallpaperPanel.js'

/** Toast state; `seq` remounts the banner so the same text can re-show. */
interface ToastState {
  readonly seq: number
  readonly text: string
}

/** Props of the shared workspace. */
export interface LiveryWorkspaceProps {
  readonly t: LiveryTranslate
  readonly runtime: LiveryRuntimeApi
  /** Initial top-level tab (tests/deep links); defaults to the visual styles tab. */
  readonly initialTab?: 'style' | 'wallpaper'
}

/**
 * Render the Livery workspace.
 * @param props - locale `t` seat and the runtime face.
 * @returns the workspace element, wrapping summary through self-check.
 */
export function LiveryWorkspace({ runtime, t, initialTab }: LiveryWorkspaceProps): JSX.Element {
  // Bound wrappers: `subscribe`/`getSnapshot` are class methods and would lose
  // `this` if passed straight through; the wrappers are stable per runtime.
  const subscribe = useCallback(
    (listener: () => void) => runtime.subscribe(listener),
    [runtime],
  )
  const getSnapshot = useCallback(() => runtime.getSnapshot(), [runtime])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [filter, setFilter] = useState<{ query: string; tagId: string | undefined }>({
    query: '',
    tagId: undefined,
  })
  const [copyFailed, setCopyFailed] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [toast, setToast] = useState<ToastState | undefined>(undefined)
  const [previewLocaleChoice, setPreviewLocaleChoice] = useState<PreviewLocaleChoice>('follow')
  const [tab, setTabState] = useState<PageTab>(() => initialTab ?? rememberedPageTab() ?? 'style')
  const tabIdBase = useId()
  const tabRefs = useRef<Record<PageTab, HTMLButtonElement | null>>({ style: null, wallpaper: null })
  const setTab = (next: PageTab): void => {
    setTabState(next)
    rememberPageTab(next)
  }
  const activateTab = (next: PageTab): void => {
    // Preview controls live on the style tab; leaving it must cancel the
    // preview instead of keeping an invisible style change active.
    if (next !== 'style' && runtime.getSnapshot().phase === 'previewing') runtime.cancelPreview()
    setTab(next)
  }
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    const order: PageTab[] = ['style', 'wallpaper']
    const index = order.indexOf(tab)
    let next: PageTab | undefined
    if (event.key === 'ArrowRight') next = order[(index + 1) % order.length]
    else if (event.key === 'ArrowLeft') next = order[(index + order.length - 1) % order.length]
    else if (event.key === 'Home') next = order[0]
    else if (event.key === 'End') next = order[order.length - 1]
    if (next === undefined) return
    event.preventDefault()
    activateTab(next)
    tabRefs.current[next]?.focus()
  }

  // Theme observation and preview rollback live exactly as long as the page.
  useEffect(() => runtime.observeTheme(), [runtime])
  useEffect(() => () => { runtime.cancelPreview() }, [runtime])

  const locale = snapshot.locale
  const liveries = useMemo(
    () => sortLiveries(snapshot.catalog?.liveries ?? []),
    [snapshot.catalog],
  )
  const displayName = useCallback((id: string | undefined): string => {
    if (id === undefined || isStock(id)) return t('current.stockName')
    const livery = liveries.find(candidate => candidate.id === id)
    return livery === undefined ? id : localizedName(livery, locale)
  }, [liveries, locale, t])

  const previewLocale = resolvePreviewLocale(previewLocaleChoice, snapshot.locale)
  const previewing = snapshot.phase === 'previewing'
  const loading = snapshot.phase === 'boot' || snapshot.phase === 'loading'
  const mismatch = snapshot.bootStatus === 'mismatch'
  const offline = !mismatch && !loading && snapshot.catalogStatus === 'unavailable'
  const emptyCatalog = !mismatch && !loading && !offline && liveries.length === 0
  const configUnavailable = !mismatch && snapshot.configStatus === 'unavailable'
  const readOnly = snapshot.configStatus === 'ready' && !snapshot.writable
  const busy = snapshot.writing
  const degraded = snapshot.phase === 'degraded' && !offline && !mismatch
  const shownId = previewing ? snapshot.previewId : snapshot.confirmedId
  const shownLivery = shownId === undefined || isStock(shownId)
    ? undefined
    : liveries.find(candidate => candidate.id === shownId)
  const shownName = displayName(shownId)
  const shownDescription = shownLivery === undefined
    ? t('current.stockDescription')
    : localizedDescription(shownLivery, locale)
  const canWrite = snapshot.configStatus === 'ready' && snapshot.writable

  const onPreview = useCallback((id: string): void => {
    runtime.preview(id)
  }, [runtime])

  const applyPreview = useCallback(async (): Promise<void> => {
    await runtime.commitPreview()
  }, [runtime])

  const restoreStock = useCallback(async (): Promise<void> => {
    setConfirmRestore(false)
    await runtime.restoreStock()
  }, [runtime])

  const onCopyResult = useCallback((ok: boolean): void => {
    setCopyFailed(!ok)
    if (ok) setToast({ seq: Date.now(), text: t('check.copied') })
  }, [t])

  return (
    <div className="livery-workspace" data-testid="livery-section">
      <div className="livery-filters" role="tablist" aria-label={t('tab.label')} data-testid="livery-page-tabs">
        {(['style', 'wallpaper'] as const).map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            className="livery-chip"
            id={`${tabIdBase}-tab-${id}`}
            data-testid={`livery-page-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`${tabIdBase}-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            ref={element => { tabRefs.current[id] = element }}
            onClick={() => activateTab(id)}
            onKeyDown={onTabKeyDown}
          >
            {t(id === 'style' ? 'tab.style' : 'tab.wallpaper')}
          </button>
        ))}
      </div>

      {tab === 'wallpaper'
        ? (
          <div
            role="tabpanel"
            id={`${tabIdBase}-panel-wallpaper`}
            aria-labelledby={`${tabIdBase}-tab-wallpaper`}
            data-testid="livery-tabpanel-wallpaper"
          >
            <WallpaperPanel t={t} snapshot={snapshot} runtime={runtime} />
          </div>
        )
        : (
          <div
            role="tabpanel"
            id={`${tabIdBase}-panel-style`}
            aria-labelledby={`${tabIdBase}-tab-style`}
            data-testid="livery-tabpanel-style"
          >
      {loading && (
        <div className="livery-loading" data-testid="livery-loading" role="status">
          {t('state.loading')}
        </div>
      )}

      {mismatch && (
        <div className="livery-notice livery-notice--error" data-testid="livery-error" role="alert">
          <div className="livery-notice__copy">
            <span className="livery-notice__title">{t('state.incompatibleTitle')}</span>
            <span className="livery-notice__body">{t('state.incompatibleBody')}</span>
            {snapshot.bootReason !== undefined && (
              <span className="livery-notice__body">{snapshot.bootReason}</span>
            )}
          </div>
        </div>
      )}

      {!loading && !mismatch && (
        <div className="livery-layout" data-testid="livery-layout">
          <div className="livery-main">
            <section className="livery-ui-card livery-hero" data-testid="livery-current-card">
              <div className="livery-ui-card__head">
                <h3 className="livery-ui-card__title">{t('layout.currentStyle')}</h3>
                <div className="livery-hero__meta">
                  {shownLivery !== undefined && snapshot.catalog !== undefined && (
                    <img
                      className="livery-hero__thumb"
                      data-testid="livery-hero-thumb"
                      src={previewUrl(snapshot.catalog.previewsBase, shownLivery.id, previewLocale, snapshot.themeMode)}
                      alt=""
                      decoding="async"
                    />
                  )}
                  <div className="livery-meta">
                  <Tag tone="neutral">{t('current.modes')}</Tag>
                  {previewing && (
                    <Tag tone="warning">{t('current.previewing', { name: shownName })}</Tag>
                  )}
                  {degraded && <Tag tone="warning">{t('current.degraded')}</Tag>}
                  {snapshot.invalidSkinId !== undefined && (
                    <Tag tone="danger">{t('current.incompatible')}</Tag>
                  )}
                  </div>
                </div>
              </div>
              <div className="livery-summary" data-testid="livery-current">
                <div className="livery-summary__body">
                  <span className="livery-summary__kicker">{t('current.title')}</span>
                  <span className="livery-summary__name">{shownName}</span>
                  <span className="livery-summary__desc">{shownDescription}</span>
                  <div className="livery-meta">
                    <span className="livery-meta__label">{t('current.idLabel')}</span>
                    <code className="livery-id">{shownId ?? t('current.stockName')}</code>
                    {shownLivery?.meta.tags.map(tag => (
                      <Tag key={tag} tone="quiet">{tag}</Tag>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {previewing && (
              <section className="livery-ui-card" data-testid="livery-preview-card">
                <div className="livery-previewbar" data-testid="livery-preview">
                  <div className="livery-previewbar__copy">
                    <span className="livery-previewbar__title">
                      {t('preview.title', { name: shownName })}
                    </span>
                    <span className="livery-previewbar__body">{t('preview.body')}</span>
                  </div>
                  <div className="livery-previewbar__actions">
                    <Button
                      variant="primary"
                      size="sm"
                      data-testid="livery-apply"
                      disabled={busy || !canWrite}
                      onClick={() => { void applyPreview() }}
                    >
                      {busy ? t('write.applying') : t('preview.apply')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="livery-cancel"
                      disabled={busy}
                      onClick={() => runtime.cancelPreview()}
                    >
                      {t('preview.cancel')}
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {busy && !previewing && (
              <div className="livery-notice" role="status">{t('write.applying')}</div>
            )}

            {snapshot.writeFailure !== undefined && (
              <div className="livery-notice livery-notice--error" data-testid="livery-error" role="alert">
                <div className="livery-notice__copy">
                  <span className="livery-notice__title">
                    {t(snapshot.writeFailure === 'transport' ? 'write.transport' : 'write.refused')}
                  </span>
                  <span className="livery-notice__body">{t('write.rolledBack')}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="livery-retry"
                  disabled={busy}
                  onClick={() => { void runtime.retryLastWrite() }}
                >
                  {t('action.retry')}
                </Button>
              </div>
            )}

            {configUnavailable && (
              <div className="livery-notice livery-notice--warn" data-testid="livery-config-unavailable">
                <span className="livery-notice__body">{t('state.configUnavailable')}</span>
              </div>
            )}

            {readOnly && (
              <div className="livery-notice livery-notice--warn" data-testid="livery-readonly">
                <span className="livery-notice__body">{t('state.readOnly')}</span>
              </div>
            )}

            {offline && (
              <div className="livery-notice livery-notice--error" data-testid="livery-offline" role="alert">
                <div className="livery-notice__copy">
                  <span className="livery-notice__title">{t('state.offlineTitle')}</span>
                  <span className="livery-notice__body">{t('state.offlineBody')}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="livery-retry-catalog"
                  onClick={() => { void runtime.retryCatalog() }}
                >
                  {t('action.retry')}
                </Button>
              </div>
            )}

            {degraded && (
              <div className="livery-notice livery-notice--info" data-testid="livery-degraded" role="status">
                <div className="livery-notice__copy">
                  <span className="livery-notice__title">{t('state.degradedTitle')}</span>
                  <span className="livery-notice__body">{t('state.degradedBody')}</span>
                  {snapshot.invalidSkinId !== undefined && (
                    <span className="livery-notice__body">
                      {t('current.incompatible')}: {snapshot.invalidSkinId}
                    </span>
                  )}
                  {snapshot.missingRequired.length > 0 && (
                    <span className="livery-notice__body">
                      {t('check.capabilities')}: {capabilityList(t, locale, snapshot.missingRequired)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {!offline && !emptyCatalog && (
              <section className="livery-ui-card livery-gallery-card" data-testid="livery-gallery-card">
                <Gallery
                  t={t}
                  snapshot={snapshot}
                  filter={filter}
                  onFilterChange={next => setFilter({ query: next.query, tagId: next.tagId })}
                  onPreview={onPreview}
                  previewLocaleChoice={previewLocaleChoice}
                  previewLocale={previewLocale}
                  onPreviewLocaleChange={setPreviewLocaleChoice}
                />
              </section>
            )}

            {emptyCatalog && (
              <div className="livery-ui-card livery-empty" data-testid="livery-empty" role="status">
                <span className="livery-empty__title">{t('state.catalogEmpty')}</span>
              </div>
            )}
          </div>

          <aside className="livery-rail">
            <section className="livery-ui-card" data-testid="livery-actions-card">
              <div className="livery-ui-card__head">
                <h3 className="livery-ui-card__title">{t('layout.actions')}</h3>
              </div>
              <div className="livery-actions">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="livery-restore"
                  disabled={busy || isStock(snapshot.confirmedId) || !canWrite}
                  onClick={() => setConfirmRestore(true)}
                >
                  {t('action.restoreStock')}
                </Button>
              </div>
            </section>

            <SelfCheck
              t={t}
              snapshot={snapshot}
              onCopyResult={onCopyResult}
              copyFailed={copyFailed}
            />

            <footer className="livery-about" aria-label={t('about.title')}>
              <span>
                {t('about.plugin', { version: snapshot.identity.pluginVersion })}
                {' · '}
                {t('about.certified', { hostVersion: snapshot.identity.hostVersion })}
              </span>
              <span className="livery-about__note">{t('about.note')}</span>
            </footer>
          </aside>
        </div>
      )}
          </div>
        )}

      <Modal
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        title={t('action.restoreTitle')}
        closeLabel={t('action.close')}
        description={t('action.restoreBody')}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setConfirmRestore(false)}>
              {t('action.cancel')}
            </Button>
            <Button variant="primary" onClick={() => { void restoreStock() }}>
              {t('action.restoreConfirm')}
            </Button>
          </>
        )}
      >
        <p className="livery-hint">{t('action.restoreBody')}</p>
      </Modal>

      {toast !== undefined && (
        <Toast
          key={toast.seq}
          text={toast.text}
          tone="success"
          onDone={() => setToast(undefined)}
        />
      )}
    </div>
  )
}
