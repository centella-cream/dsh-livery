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
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Button, Modal, Tag, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  isStock,
  localizedDescription,
  localizedName,
  shortHash,
  sortLiveries,
} from '../model.js'
import type { LiveryRuntimeApi } from '../model.js'
import type { LiveryTranslate } from '../platform.js'
import { capabilityList } from './capability-names.js'
import { Gallery } from './Gallery.js'
import { SelfCheck } from './SelfCheck.js'

/** Toast state; `seq` remounts the banner so the same text can re-show. */
interface ToastState {
  readonly seq: number
  readonly text: string
}

/** Props of the shared workspace. */
export interface LiveryWorkspaceProps {
  readonly t: LiveryTranslate
  readonly runtime: LiveryRuntimeApi
}

/**
 * Render the Livery workspace.
 * @param props - locale `t` seat and the runtime face.
 * @returns the workspace element, wrapping summary through self-check.
 */
export function LiveryWorkspace({ runtime, t }: LiveryWorkspaceProps): JSX.Element {
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
        <>
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
            <div className="livery-summary__side">
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

          {previewing && (
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
            <Gallery
              t={t}
              snapshot={snapshot}
              filter={filter}
              onFilterChange={next => setFilter({ query: next.query, tagId: next.tagId })}
              onPreview={onPreview}
            />
          )}

          {emptyCatalog && (
            <div className="livery-empty" data-testid="livery-empty" role="status">
              <span className="livery-empty__title">{t('state.catalogEmpty')}</span>
            </div>
          )}

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

          <SelfCheck
            t={t}
            snapshot={snapshot}
            onCopyResult={onCopyResult}
            copyFailed={copyFailed}
          />

          <footer className="livery-about" aria-label={t('about.title')}>
            <span>{t('about.plugin', { version: snapshot.identity.pluginVersion })}</span>
            <span>{t('about.contract', { hash: shortHash(snapshot.identity.contractHash) })}</span>
            <span>{t('about.adapter', { adapter: snapshot.identity.adapterId })}</span>
            <span className="livery-about__note">{t('about.note')}</span>
          </footer>
        </>
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
