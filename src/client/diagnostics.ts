/**
 * Build the copyable self-check report. Pure: takes the runtime snapshot plus a
 * translate function, returns plain text. Every label is localized; ids,
 * hashes, and capability names stay verbatim because they are the values a
 * maintainer needs when filing a report.
 */
import type { CompiledLivery } from '../core/types.js'
import { formatNumber, formatRatio } from '../i18n/index.js'
import type { LiveryKey } from './platform.js'
import {
  countCapabilities,
  isStock,
  liveryAvailability,
  missingContractCapabilities,
  shortHash,
} from './model.js'
import type { LiveryLocaleId, LiveryRuntimeSnapshot } from './model.js'

/** Dictionary-bound translate function (the slot `t` seat has this shape). */
export type DiagnosticsTranslate = (key: LiveryKey, params?: Record<string, unknown>) => string

function line(t: DiagnosticsTranslate, label: string, value: string): string {
  return t('diag.line', { label, value })
}

function section(title: string, lines: readonly string[]): readonly string[] {
  return ['', `## ${title}`, ...lines]
}

function findPresented(snapshot: LiveryRuntimeSnapshot): CompiledLivery | undefined {
  const catalog = snapshot.catalog
  const id = snapshot.effectiveId
  if (catalog === undefined || id === undefined || isStock(id)) return undefined
  return catalog.liveries.find(livery => livery.id === id)
}

function capabilityState(t: DiagnosticsTranslate, available: boolean): string {
  return t(available ? 'check.available' : 'check.unavailable')
}

function contrastSection(
  t: DiagnosticsTranslate,
  livery: CompiledLivery | undefined,
  locale: LiveryLocaleId,
): readonly string[] {
  if (livery === undefined) return [line(t, t('check.contrast'), t('diag.none'))]
  const audit = livery.audit
  const total = audit.contrast.length
  const failures = audit.contrastFailures
  const contrastLine = failures === 0
    ? t('check.contrastPass', { total: formatNumber(locale, total) })
    : t('check.contrastValue', {
      failed: formatNumber(locale, failures),
      total: formatNumber(locale, total),
    })
  const failureLines = audit.contrast
    .filter(entry => !entry.pass)
    .slice(0, 20)
    .map(entry => `${entry.role}: ${t('diag.ratio', { value: formatRatio(locale, entry.ratio) })} < ${t('diag.ratio', { value: formatRatio(locale, entry.min) })}`)
  return [
    line(t, t('check.contrast'), contrastLine),
    ...failureLines,
    line(t, t('check.coverage'), t('check.coverageValue', {
      covered: formatNumber(locale, audit.tokenCoverage.covered.length),
      inherited: formatNumber(locale, audit.tokenCoverage.inherited.length),
      missing: formatNumber(locale, audit.tokenCoverage.missing.length),
    })),
    line(t, t('check.cssSafety'), t(audit.cssSafety.pass ? 'check.pass' : 'check.fail')),
    line(t, '', t('check.important', { count: formatNumber(locale, audit.cssSafety.important) })),
    line(t, '', t('check.hashSelectors', { count: formatNumber(locale, audit.cssSafety.hashSelectors) })),
    line(t, '', t('check.remoteUrls', { count: formatNumber(locale, audit.cssSafety.remoteUrls) })),
    line(t, '', t('check.unscopedTokens', { count: formatNumber(locale, audit.cssSafety.unscopedTokens) })),
  ]
}

/**
 * Render the complete diagnostics report copied by the self-check panel.
 * @param t - dictionary-bound translate.
 * @param snapshot - current runtime snapshot.
 * @param locale - active locale for `Intl` number formatting.
 * @returns the report text.
 */
export function formatDiagnostics(
  t: DiagnosticsTranslate,
  snapshot: LiveryRuntimeSnapshot,
  locale: LiveryLocaleId,
): string {
  const livery = findPresented(snapshot)
  const counts = countCapabilities(snapshot.capabilities)
  const contractMissing = missingContractCapabilities(snapshot.capabilities)
  const availability = livery === undefined
    ? undefined
    : liveryAvailability(livery, snapshot.capabilities)
  const lines: string[] = [t('diag.header')]

  lines.push(...section(t('diag.environment'), [
    line(t, t('check.plugin'), snapshot.identity.pluginVersion),
    line(t, t('check.adapter'), snapshot.identity.adapterId),
    line(t, t('check.contract'), shortHash(snapshot.identity.contractHash)),
    line(t, t('check.host'), snapshot.identity.hostVersion),
    line(t, t('check.locale'), snapshot.locale),
    line(t, t('check.mode'), snapshot.themeMode === 'dark' ? t('mode.dark') : t('mode.light')),
  ]))

  lines.push(...section(t('diag.boot'), [
    line(t, t('check.boot'), snapshot.bootStatus === 'valid'
      ? t('check.bootAccepted')
      : snapshot.bootStatus === 'absent'
        ? t('check.bootAbsent')
        : t('check.bootRejected')),
    ...(snapshot.bootReason === undefined ? [] : [`  ${snapshot.bootReason}`]),
    ...snapshot.bootDiagnostics.map(diagnostic => `  ${diagnostic}`),
  ]))

  lines.push(...section(t('diag.catalog'), [
    line(t, t('check.catalog'), snapshot.catalogStatus === 'ready'
      ? t('check.catalogLoaded')
      : t('check.catalogUnavailable')),
  ]))

  lines.push(...section(t('diag.configuration'), [
    line(t, t('check.configured'), snapshot.confirmedId ?? t('diag.none')),
    line(t, t('check.effective'), snapshot.effectiveId ?? t('diag.none')),
    ...(snapshot.invalidSkinId === undefined
      ? []
      : [`  ${t('current.incompatible')}: ${snapshot.invalidSkinId}`]),
    ...(snapshot.writeFailure === undefined ? [] : [`  ${snapshot.writeFailure}`]),
  ]))

  lines.push(...section(t('diag.capabilities'),
    Object.values(snapshot.capabilities)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(capability => t('diag.capabilityLine', {
        id: capability.id,
        state: capabilityState(t, capability.available),
        required: ` [${capability.required ? t('check.required') : t('check.optional')}]`,
      }))
      .concat(`  ${t('check.capabilitiesValue', {
        available: formatNumber(locale, counts.available),
        total: formatNumber(locale, counts.total),
      })}`),
  ))

  const degraded = availability?.degraded ?? snapshot.degraded
  lines.push(...section(t('diag.degraded'),
    degraded.length === 0
      ? [t('diag.none')]
      : degraded.map(entry => t('diag.degradedLine', {
        id: entry.id,
        reason: entry.reason,
        fallback: entry.fallback,
      })),
  ))

  if (contractMissing.length > 0) {
    lines.push(line(t, t('check.required'), contractMissing.join(', ')))
  }

  lines.push(...section(t('diag.contrast'), contrastSection(t, livery, locale)))

  lines.push(...section(t('diag.diagnostics'), snapshot.notes.length === 0 ? [t('diag.none')] : snapshot.notes))

  return lines.join('\n')
}
