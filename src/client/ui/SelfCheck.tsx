/**
 * Expandable self-check panel: host capabilities, contrast/coverage/CSS-safety
 * audit of the presented livery, degraded capabilities, the first-frame
 * handshake facts, and the copyable diagnostics report.
 *
 * Localized labels; the technical values (ids, hashes, raw reasons) stay
 * verbatim because that is what a report needs.
 */
import { useMemo, useState } from 'react'
import type { CompiledLivery } from '../../core/types.js'
import { formatNumber, formatList, formatRatio } from '../../i18n/index.js'
import { writeClipboard, Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { formatDiagnostics } from '../diagnostics.js'
import {
  countCapabilities,
  isStock,
  liveryAvailability,
  missingContractCapabilities,
  shortHash,
} from '../model.js'
import type { LiveryRuntimeSnapshot } from '../model.js'
import type { LiveryTranslate } from '../platform.js'
import { capabilityLabel } from './capability-names.js'

/** Props of the self-check panel. */
export interface SelfCheckProps {
  readonly t: LiveryTranslate
  readonly snapshot: LiveryRuntimeSnapshot
  /** Report whether a copy attempt succeeded (the page owns the toast). */
  readonly onCopyResult: (ok: boolean) => void
  readonly copyFailed: boolean
  /** Start expanded (tests and future deep links); the page keeps it collapsed. */
  readonly defaultOpen?: boolean
}

function findPresented(snapshot: LiveryRuntimeSnapshot): CompiledLivery | undefined {
  const catalog = snapshot.catalog
  const id = snapshot.effectiveId
  if (catalog === undefined || id === undefined || isStock(id)) return undefined
  return catalog.liveries.find(livery => livery.id === id)
}

/**
 * Render the self-check panel.
 * @param props - panel properties; see {@link SelfCheckProps}.
 * @returns the panel element.
 */
export function SelfCheck({ t, snapshot, onCopyResult, copyFailed, defaultOpen = false }: SelfCheckProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const presented = useMemo(() => findPresented(snapshot), [snapshot])
  const counts = useMemo(() => countCapabilities(snapshot.capabilities), [snapshot.capabilities])
  const contractMissing = useMemo(
    () => missingContractCapabilities(snapshot.capabilities),
    [snapshot.capabilities],
  )
  const degraded = useMemo(() => {
    if (presented !== undefined) return liveryAvailability(presented, snapshot.capabilities).degraded
    return snapshot.degraded
  }, [presented, snapshot.capabilities, snapshot.degraded])
  const diagnostics = useMemo(
    () => formatDiagnostics(t, snapshot, snapshot.locale),
    [t, snapshot],
  )
  const locale = snapshot.locale

  const copy = async (): Promise<void> => {
    const ok = await writeClipboard(diagnostics)
    onCopyResult(ok)
  }

  return (
    <section className="livery-check" data-testid="livery-selfcheck" aria-label={t('check.title')}>
      <button
        type="button"
        className="livery-check__toggle"
        data-testid="livery-selfcheck-toggle"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span>{t('check.title')}</span>
        <span>{t(open ? 'check.hide' : 'check.show')}</span>
      </button>
      {open && (
        <div className="livery-check__body">
          <div className="livery-check__grid">
            <div className="livery-check__block">
              <h4 className="livery-check__title">{t('check.boot')}</h4>
              <p className="livery-check__value">
                {snapshot.bootStatus === 'valid'
                  ? t('check.bootAccepted')
                  : snapshot.bootStatus === 'absent'
                    ? t('check.bootAbsent')
                    : t('check.bootRejected')}
              </p>
              {snapshot.bootReason !== undefined && (
                <p className="livery-check__value">{snapshot.bootReason}</p>
              )}
              <p className="livery-check__value">
                {t('check.adapter')}: {snapshot.identity.adapterId}
              </p>
              <p className="livery-check__value">
                {t('check.contract')}: {shortHash(snapshot.identity.contractHash)}
              </p>
              <p className="livery-check__value">
                {t('check.plugin')}: {snapshot.identity.pluginVersion}
              </p>
              <p className="livery-check__value">
                {t('check.host')}: {snapshot.identity.hostVersion}
              </p>
              <p className="livery-check__value">
                {t('check.mode')}: {t(snapshot.themeMode === 'dark' ? 'mode.dark' : 'mode.light')}
              </p>
              <p className="livery-check__value">
                {t('check.locale')}: {locale}
              </p>
              <p className="livery-check__value">
                {t('check.catalog')}: {snapshot.catalogStatus === 'ready'
                  ? t('check.catalogLoaded')
                  : t('check.catalogUnavailable')}
              </p>
              <p className="livery-check__value">
                {t('check.profile')}: {snapshot.catalogProfile ?? t('check.none')}
              </p>
              <p className="livery-check__value">
                {t('check.configured')}: {snapshot.confirmedId ?? t('check.none')}
              </p>
              <p className="livery-check__value">
                {t('check.effective')}: {snapshot.effectiveId ?? t('check.none')}
              </p>
            </div>

            <div className="livery-check__block">
              <h4 className="livery-check__title">{t('check.capabilities')}</h4>
              <p className="livery-check__value">
                {t('check.capabilitiesValue', {
                  available: formatNumber(locale, counts.available),
                  total: formatNumber(locale, counts.total),
                })}
              </p>
              <ul className="livery-caps">
                {Object.values(snapshot.capabilities)
                  .sort((a, b) => a.id.localeCompare(b.id))
                  .map(capability => (
                    <li
                      key={capability.id}
                      className="livery-caps__row"
                      data-testid="livery-capability"
                      data-capability={capability.id}
                      data-available={String(capability.available)}
                    >
                      <code className="livery-caps__id">{capability.id}</code>
                      <Tag tone={capability.available ? 'success' : 'warning'}>
                        {t(capability.available ? 'check.available' : 'check.unavailable')}
                      </Tag>
                      {capability.required && <Tag tone="outline">{t('check.required')}</Tag>}
                    </li>
                  ))}
                {counts.total === 0 && <li className="livery-caps__row">{t('check.none')}</li>}
              </ul>
              {contractMissing.length > 0 && (
                <p className="livery-check__value">{contractMissing.join(', ')}</p>
              )}
            </div>

            <div className="livery-check__block">
              <h4 className="livery-check__title">{t('check.contrast')}</h4>
              {presented === undefined
                ? <p className="livery-check__value">{t('check.none')}</p>
                : (
                  <>
                    <p className="livery-check__value">
                      {presented.audit.contrastFailures === 0
                        ? t('check.contrastPass', {
                          total: formatNumber(locale, presented.audit.contrast.length),
                        })
                        : t('check.contrastValue', {
                          failed: formatNumber(locale, presented.audit.contrastFailures),
                          total: formatNumber(locale, presented.audit.contrast.length),
                        })}
                    </p>
                    {presented.audit.contrast
                      .filter(entry => !entry.pass)
                      .slice(0, 8)
                      .map(entry => (
                        <p key={`${entry.role}-${entry.foreground}-${entry.background}`} className="livery-check__value">
                          {entry.role}: {t('diag.ratio', { value: formatRatio(locale, entry.ratio) })}
                          {' < '}
                          {t('diag.ratio', { value: formatRatio(locale, entry.min) })}
                        </p>
                      ))}
                  </>
                )}
              <h4 className="livery-check__title">{t('check.coverage')}</h4>
              <p className="livery-check__value">
                {presented === undefined
                  ? t('check.none')
                  : t('check.coverageValue', {
                    covered: formatNumber(locale, presented.audit.tokenCoverage.covered.length),
                    inherited: formatNumber(locale, presented.audit.tokenCoverage.inherited.length),
                    missing: formatNumber(locale, presented.audit.tokenCoverage.missing.length),
                  })}
              </p>
              <h4 className="livery-check__title">{t('check.cssSafety')}</h4>
              {presented === undefined
                ? <p className="livery-check__value">{t('check.none')}</p>
                : (
                  <>
                    <p className="livery-check__value">
                      {t(presented.audit.cssSafety.pass ? 'check.pass' : 'check.fail')}
                    </p>
                    <p className="livery-check__value">
                      {t('check.important', { count: formatNumber(locale, presented.audit.cssSafety.important) })}
                      {' · '}
                      {t('check.hashSelectors', { count: formatNumber(locale, presented.audit.cssSafety.hashSelectors) })}
                      {' · '}
                      {t('check.remoteUrls', { count: formatNumber(locale, presented.audit.cssSafety.remoteUrls) })}
                      {' · '}
                      {t('check.unscopedTokens', { count: formatNumber(locale, presented.audit.cssSafety.unscopedTokens) })}
                      {' · '}
                      {t('check.fixedZIndexes', { count: formatNumber(locale, presented.audit.cssSafety.fixedZIndexes.length) })}
                    </p>
                  </>
                )}
            </div>
          </div>

          <div className="livery-check__block">
            <h4 className="livery-check__title">{t('check.degraded')}</h4>
            {degraded.length === 0
              ? <p className="livery-check__value">{t('check.none')}</p>
              : degraded.map(entry => (
                <p key={`${entry.id}-${entry.fallback}`} className="livery-check__value">
                  {capabilityLabel(t, entry.id)} ({entry.id}): {entry.fallback}
                </p>
              ))}
            {degraded.length > 0 && snapshot.missingRequired.length === 0 && (
              <p className="livery-check__value" data-testid="livery-optional-info">
                {t('check.optionalInfo', {
                  items: formatList(locale, degraded.map(entry => capabilityLabel(t, entry.id))),
                })}
              </p>
            )}
          </div>

          <div className="livery-check__block">
            <h4 className="livery-check__title">{t('check.diagnostics')}</h4>
            <div className="livery-actions">
              <Button
                variant="outline"
                size="sm"
                data-testid="livery-copy-diagnostics"
                onClick={() => { void copy() }}
              >
                {t('check.copy')}
              </Button>
            </div>
            {copyFailed && (
              <p className="livery-notice__body" data-testid="livery-copy-error">
                {t('check.copyFailed')}. {t('check.copyFailedHint')}
              </p>
            )}
            <pre className="livery-diag">{diagnostics}</pre>
          </div>

          {snapshot.bootDiagnostics.length > 0 && (
            <div className="livery-check__block">
              <h4 className="livery-check__title">{t('diag.diagnostics')}</h4>
              {snapshot.bootDiagnostics.map(diagnostic => (
                <p key={diagnostic} className="livery-check__value">{diagnostic}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
