/**
 * Human-readable diagnostics for the multi-adapter pre-loader gate.
 *
 * The gate itself is deliberately silent data ({@link GateResult}); this module
 * turns a closed gate into stable, structured strings for three consumers:
 *
 * 1. `BootPayload.diagnostics` — the Client shows the same strings in its
 *    self-check panel, so a mismatch and the reason for it travel together.
 * 2. one `ctx.logger.warn` line in the Host (see {@link formatGateLogLine}).
 * 3. the copyable support text a user pastes into a bug report.
 *
 * Strings are English and machine-oriented ("code: detail") on purpose: the
 * Client localizes its own UI, and a translated diagnostic is not reproducible
 * in a report. No secrets, paths or URLs are included — observed version, the
 * certified allowlist, adapter id, host version, contract hash prefix, catalog
 * profile, capability ids and an action.
 */

import type { CapabilityMap } from '../core/types.js'
import type { GateResult } from './boot.js'

/** Codes the gate can raise. Kept stable: they are copied into reports. */
export const GATE_CODE = {
  versionUnknown: 'gate.version-unknown',
  versionMismatch: 'gate.version-mismatch',
  adapterMismatch: 'gate.adapter-mismatch',
  contractMismatch: 'gate.contract-mismatch',
  catalogProfileMismatch: 'gate.catalog-profile-mismatch',
  skinUnknown: 'gate.skin-unknown',
  renderFailed: 'gate.render-failed',
} as const

/** Prefix for one missing capability code, e.g. `capability.missing:host-font-family`. */
export const CAPABILITY_MISSING_PREFIX = 'capability.missing:'

/**
 * Shorten a contract hash for a single-line diagnostic.
 *
 * Full 64-hex hashes bury every other field in a log line; the prefix is still
 * enough to tell two builds apart, and `artifacts/contracts/**` owns the full
 * value.
 * @param hash - full `sha256:<hex>` (or any string).
 * @returns a display prefix of at most 20 characters.
 */
export function shortHash(hash: string): string {
  const trimmed = hash.trim()
  if (trimmed === '') return '<none>'
  return trimmed.length <= 20 ? trimmed : `${trimmed.slice(0, 20)}…`
}

/**
 * Collapse a value onto one log line.
 * @param value - possibly multi-line diagnostic fragment.
 * @returns the value with every whitespace run replaced by one space.
 */
function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * The supported-version allowlist as one phrase.
 * @param versions - exact certified host versions.
 * @returns e.g. `0.2.0-rc.2, 0.2.1-rc.2, 0.2.1-rc.3`.
 */
function versionList(versions: readonly string[]): string {
  return versions.length === 0 ? '<none>' : versions.join(', ')
}

/**
 * Build the structured diagnostic list for one gate evaluation.
 *
 * An accepted gate has nothing to report and yields `[]` (a successful boot is
 * not a warning). A closed gate always carries the codes, the observed vs.
 * certified identity, the deployment profile, the capability gaps that closed
 * it and an action a user can take — in that order.
 * @param gate - gate outcome from `computeBootState`.
 * @param capabilities - capability map the gate evaluated (for gap details).
 * @returns diagnostic lines, empty when the gate accepted.
 */
export function buildDiagnostics(gate: GateResult, capabilities: CapabilityMap): string[] {
  if (gate.accepted) return []

  const lines: string[] = []
  lines.push(`gate.closed: ${gate.codes.join(', ')}`)
  lines.push(
    `version: observed DSH ${gate.observedHostVersion ?? 'unknown'}, certified ${versionList(gate.supportedHostVersions)}`,
  )
  lines.push(`profile: ${gate.profileKind}`)
  lines.push(
    `adapter: ${gate.adapterId === '' ? 'unresolved' : gate.adapterId}`
    + `, host ${gate.hostVersion === '' ? 'unknown' : gate.hostVersion}`
    + `, catalog profile ${gate.catalogProfile === '' ? 'unknown' : gate.catalogProfile}`,
  )
  lines.push(`contract: ${shortHash(gate.contractHash)}`)

  for (const id of gate.missingCapabilities) {
    const fact = capabilities[id]
    const detail = fact === undefined || fact.detail === ''
      ? 'required by the active livery but not available on this host'
      : fact.detail
    lines.push(`${CAPABILITY_MISSING_PREFIX}${id}: ${detail}`)
  }

  if (gate.activeSkinId !== '' && gate.activeSkinId !== 'stock'
    && gate.codes.includes(GATE_CODE.skinUnknown)) {
    lines.push(
      `${GATE_CODE.skinUnknown}: "${gate.activeSkinId}" is not a confirmed id in this build's catalog; `
      + 'it may have been deleted, or this profile carries a newer config',
    )
  }

  if (gate.renderError !== null && gate.renderError !== '') {
    lines.push(`${GATE_CODE.renderFailed}: ${oneLine(gate.renderError)}`)
  }

  lines.push(
    `action: keep the stock appearance; this build styles only DSH ${versionList(gate.supportedHostVersions)} `
    + '— install a dsh-livery release certified for this host build',
  )
  return lines
}

/**
 * Render one closed gate as a single structured log line.
 *
 * `ctx.logger.warn` already prefixes the logger name; this string is the whole
 * message, with field=value pairs so a log search can filter a mismatch type
 * without parsing prose.
 * @param gate - gate outcome from `computeBootState`.
 * @returns one line, never containing a newline.
 */
export function formatGateLogLine(gate: GateResult): string {
  const observed = gate.observedHostVersion ?? 'unknown'
  const fields = [
    `codes=[${gate.codes.join(',')}]`,
    `profile=${gate.profileKind}`,
    `observedHostVersion=${observed}`,
    `supported=[${gate.supportedHostVersions.join(',')}]`,
    `adapter=${gate.adapterId === '' ? 'unresolved' : gate.adapterId}`,
    `hostVersion=${gate.hostVersion === '' ? 'unknown' : gate.hostVersion}`,
    `contract=${shortHash(gate.contractHash)}`,
    `catalogProfile=${gate.catalogProfile === '' ? 'unknown' : gate.catalogProfile}`,
    `skin=${gate.activeSkinId}`,
    'action=keep-stock-and-install-a-certified-livery-build',
  ]
  if (gate.missingCapabilities.length > 0) {
    fields.push(`missingCapabilities=[${gate.missingCapabilities.join(',')}]`)
  }
  if (gate.renderError !== null && gate.renderError !== '') {
    fields.push(`renderError=${oneLine(gate.renderError)}`)
  }
  return oneLine(`dsh-livery: boot gate closed ${fields.join(' ')}`)
}
