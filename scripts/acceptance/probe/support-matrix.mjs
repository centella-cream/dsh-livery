/**
 * Support-matrix reader for the acceptance harness.
 *
 * The formal matrix is the policy source of truth for claim tier, distribution
 * channel, exact certified browser/runtime versions and upstream provenance.
 * The acceptance harness must not guess these fields: when the new schema is
 * present it validates against it and copies it into evidence; when it is
 * absent (legacy 0.1.3 matrix) it falls back to the historical behavior without
 * rewriting old evidence.
 *
 * New schema (0.1.3+, exact vocabulary):
 *   claimTier: "stable" | "preview"
 *   distributionChannel: "latest" | "next" | "desktop-app"
 *   certifiedBrowserVersions: string[]  (exact full browser versions)
 *   certifiedRuntimeVersions: string[]  (Node runtime versions; Electron
 *                                       boundary remains in matrix notes/report)
 *   upstream: { githubTag: string|null, npmVersion: string }
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { WORKSPACE_ROOT } from './util.mjs'

export const SUPPORT_MATRIX_PATH = path.join(WORKSPACE_ROOT, 'contracts', 'dsh', 'support-matrix.json')

export const CERTIFICATION_FIELDS = Object.freeze([
  'claimTier',
  'distributionChannel',
  'certifiedBrowserVersions',
  'certifiedRuntimeVersions',
  'upstream',
])

let cached = null

/** Load and validate the formal support matrix (cached; pass {fresh:true} to bypass). */
export function loadSupportMatrix({ fresh = false } = {}) {
  if (cached !== null && !fresh) return cached
  const matrix = JSON.parse(readFileSync(SUPPORT_MATRIX_PATH, 'utf8'))
  // 0.1.3 used schemaVersion 1; 0.1.3 adds claimTier/distributionChannel/
  // certifiedBrowserVersions/certifiedRuntimeVersions/upstream as schemaVersion 2.
  if (![1, 2].includes(matrix?.schemaVersion) || !Array.isArray(matrix.entries)) {
    throw new Error(`unsupported support-matrix schema at ${SUPPORT_MATRIX_PATH} (schemaVersion ${String(matrix?.schemaVersion)})`)
  }
  for (const entry of matrix.entries) {
    if (typeof entry.hostVersion !== 'string' || entry.hostVersion.length === 0) {
      throw new Error(`support-matrix entry is missing hostVersion at ${SUPPORT_MATRIX_PATH}`)
    }
  }
  cached = matrix
  return matrix
}

/** Find one adapter entry by exact host version. */
export function matrixEntryFor(hostVersion, matrix = loadSupportMatrix()) {
  if (typeof hostVersion !== 'string' || hostVersion.length === 0) return null
  return matrix.entries.find((entry) => entry.hostVersion === hostVersion) ?? null
}

/** Whether an entry already uses the 0.1.3 certification vocabulary. */
export function hasCertificationSchema(entry) {
  if (!entry || typeof entry !== 'object') return false
  return CERTIFICATION_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(entry, field))
}

/** Exact certified browser versions for a host ([] when the schema is absent). */
export function certifiedBrowserVersionsFor(hostVersion, matrix = loadSupportMatrix()) {
  const entry = matrixEntryFor(hostVersion, matrix)
  if (!entry) return []
  const value = entry.certifiedBrowserVersions
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

/** Exact certified runtime (Node) versions for a host ([] when absent). */
export function certifiedRuntimeVersionsFor(hostVersion, matrix = loadSupportMatrix()) {
  const entry = matrixEntryFor(hostVersion, matrix)
  if (!entry) return []
  const value = entry.certifiedRuntimeVersions
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

/**
 * Copy the 0.1.3 certification block out of the matrix for evidence.
 * Always returns exactly the five declared keys (null when the legacy schema
 * has not landed yet) so new 0.1.3 evidence has a stable shape.
 */
export function certificationFor(hostVersion, matrix = loadSupportMatrix()) {
  const entry = matrixEntryFor(hostVersion, matrix)
  const certification = {
    claimTier: entry?.claimTier ?? null,
    distributionChannel: entry?.distributionChannel ?? null,
    certifiedBrowserVersions: Array.isArray(entry?.certifiedBrowserVersions) ? entry.certifiedBrowserVersions.map(String) : [],
    certifiedRuntimeVersions: Array.isArray(entry?.certifiedRuntimeVersions) ? entry.certifiedRuntimeVersions.map(String) : [],
    upstream: entry?.upstream ?? null,
  }
  return {
    entry,
    certification,
    matrixStatus: entry?.status ?? null,
    desktopMacosStatus: entry?.profiles?.desktop?.macos ?? null,
    legacy: !hasCertificationSchema(entry),
  }
}

/**
 * Validate the exact browser version for a Web run.
 *
 * Hard rules:
 * - `--expect-browser-version` must equal the actual full Chrome version.
 * - When the matrix carries certifiedBrowserVersions for the expected host,
 *   the actual full Chrome version must be an exact member of that list.
 * - When `--expect-browser-version` is also given, it must be in that list too.
 *
 * @returns {{ ok: boolean, problems: string[], actual: string|null,
 *   expected: string|null, certified: string[], entry: object|null }}
 */
export function validateBrowserVersion({ hostVersion, actualVersion, expectedVersion = null, matrix = loadSupportMatrix() }) {
  const problems = []
  const actual = typeof actualVersion === 'string' && actualVersion.length > 0 ? actualVersion : null
  if (actual === null) problems.push('actual full Chrome version was not detected')
  if (typeof expectedVersion === 'string' && expectedVersion.length > 0) {
    if (actual !== null && actual !== expectedVersion) {
      problems.push(`actual Chrome ${actual} ≠ --expect-browser-version ${expectedVersion}`)
    }
  }
  const entry = matrixEntryFor(hostVersion, matrix)
  const certified = certifiedBrowserVersionsFor(hostVersion, matrix)
  const schemaPresent = hasCertificationSchema(entry)
  if (schemaPresent) {
    if (certified.length === 0) {
      problems.push(`matrix entry ${hostVersion} has certifiedBrowserVersions vocabulary but no versions`)
    } else if (actual !== null && !certified.includes(actual)) {
      problems.push(`actual Chrome ${actual} is not in matrix certifiedBrowserVersions [${certified.join(', ')}] for ${hostVersion}`)
    }
    if (typeof expectedVersion === 'string' && expectedVersion.length > 0 && certified.length > 0 && !certified.includes(expectedVersion)) {
      problems.push(`--expect-browser-version ${expectedVersion} is not certified for ${hostVersion} (matrix: [${certified.join(', ')}])`)
    }
  }
  return { ok: problems.length === 0, problems, actual, expected: expectedVersion ?? null, certified, entry }
}

/**
 * Desktop matrix status for the automated report-consistency check.
 * @returns {'passed'|'pending'|'not-supported'|null}
 */
export function desktopMacosStatusFor(hostVersion, matrix = loadSupportMatrix()) {
  const entry = matrixEntryFor(hostVersion, matrix)
  return entry?.profiles?.desktop?.macos ?? null
}

/** Human-readable provenance one-liner for reports/console. */
export function describeCertification(hostVersion, matrix = loadSupportMatrix()) {
  const { certification, legacy } = certificationFor(hostVersion, matrix)
  if (legacy) return 'legacy matrix entry (no claimTier/browser/runtime provenance fields)'
  const browsers = certification.certifiedBrowserVersions ?? []
  const runtimes = certification.certifiedRuntimeVersions ?? []
  const upstream = certification.upstream ?? {}
  return [
    `claimTier=${certification.claimTier ?? '?'}`,
    `channel=${certification.distributionChannel ?? '?'}`,
    `browsers=[${browsers.join(', ')}]`,
    `runtimes=[${runtimes.join(', ')}]`,
    `upstream=${upstream.githubTag === null || upstream.githubTag === undefined ? 'no-github-tag' : String(upstream.githubTag)} / npm-${upstream.npmVersion ?? '?'}`,
  ].join(' · ')
}
