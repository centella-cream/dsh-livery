/**
 * Support-matrix status machine and release gates.
 *
 * States: draft -> g0-g5-passed -> g6-approved -> released. Only adapters whose
 * formal-matrix entry is `g6-approved` or `released` are generated into the
 * shipped registry, so a merely frozen contract can never leak into a package.
 *
 * Profile statuses are per exact host version: `passed` / `pending` / `failed`
 * are certification evidence states, while `not-supported` is an explicit scope
 * decision for this release line (ignored by the gates, never treated as
 * pending). A shipped entry must therefore have at least one passed profile and
 * no pending/failed profile.
 *
 * The release gate additionally requires the entry to be `released` with a
 * non-empty evidence list. `g6-approved` is the pre-acceptance state: the
 * adapter may be generated for acceptance builds, but a packaged release is
 * blocked until every generated adapter is `released`.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { EvidenceStatus, ProfileStatus, SupportMatrix, SupportMatrixEntry } from './types.js'

export interface GateResult {
  readonly ok: boolean
  readonly version: string
  readonly problems: readonly string[]
  readonly entry?: SupportMatrixEntry
}

/** Certification lifecycle of one adapter. */
export const MATRIX_STATUSES: readonly EvidenceStatus[] = ['draft', 'g0-g5-passed', 'g6-approved', 'released'] as const

/** Adapter statuses that may be generated into the shipped registry. */
export const SHIPPED_STATUSES: readonly EvidenceStatus[] = ['g6-approved', 'released'] as const

/** Per-profile certification states, including the explicit scope decision. */
export const PROFILE_STATUSES: readonly ProfileStatus[] = ['pending', 'passed', 'failed', 'not-supported'] as const

/** Formal release authority (checked into the repo, read by every gate). */
export const FORMAL_MATRIX_PATH = 'contracts/dsh/support-matrix.json'

/** Historical candidate matrix; keeps the certification trail for every snapshot. */
export const PROPOSED_MATRIX_PATH = 'contracts/dsh/support-matrix.proposed.json'

/** True when `status` permits generation/shipping of the adapter. */
export function isShippedStatus(status: EvidenceStatus): status is 'g6-approved' | 'released' {
  return status === 'g6-approved' || status === 'released'
}

/** Repository-relative formal matrix path. */
export function formalMatrixPath(workspace: string): string {
  return join(workspace, FORMAL_MATRIX_PATH)
}

/** Read the formal support matrix (authoritative for generation + gates). */
export async function readFormalMatrix(workspace: string): Promise<SupportMatrix> {
  return readMatrix(formalMatrixPath(workspace))
}

/** Read the historical candidate matrix (evidence trail only). */
export async function readProposedMatrix(workspace: string): Promise<SupportMatrix> {
  return readMatrix(join(workspace, PROPOSED_MATRIX_PATH))
}

export async function readMatrix(path: string): Promise<SupportMatrix> {
  return JSON.parse(await readFile(path, 'utf8')) as SupportMatrix
}

/** One profile name (e.g. `web.chrome`) with its certification state. */
export interface ProfileEntry {
  readonly profile: string
  readonly status: ProfileStatus
}

/** Flatten an entry's profile statuses in a stable order. */
export function profileEntries(entry: SupportMatrixEntry): ProfileEntry[] {
  return [
    { profile: 'desktop.macos', status: entry.profiles.desktop.macos },
    { profile: 'desktop.win32', status: entry.profiles.desktop.win32 },
    { profile: 'web.chrome', status: entry.profiles.web.chrome },
    { profile: 'web.edge', status: entry.profiles.web.edge },
  ]
}

/** Profiles that are in scope for this release line (not `not-supported`). */
export function supportedProfiles(entry: SupportMatrixEntry): string[] {
  return profileEntries(entry)
    .filter((profile) => profile.status !== 'not-supported')
    .map((profile) => profile.profile)
}

/** Profiles explicitly declared outside this release line's scope. */
export function notSupportedProfiles(entry: SupportMatrixEntry): string[] {
  return profileEntries(entry)
    .filter((profile) => profile.status === 'not-supported')
    .map((profile) => profile.profile)
}

/** Gate problems for the in-scope profile set of a shipped entry. */
export function profileGateProblems(entry: SupportMatrixEntry): string[] {
  const problems: string[] = []
  const inScope = profileEntries(entry).filter((profile) => profile.status !== 'not-supported')
  if (inScope.length === 0) {
    problems.push('no supported profile: at least one of desktop/web profiles must be in scope')
    return problems
  }
  const passed = inScope.filter((profile) => profile.status === 'passed')
  if (passed.length === 0) {
    problems.push('profile evidence incomplete: no supported profile has passed certification')
  }
  for (const profile of inScope) {
    if (profile.status === 'pending') problems.push(`profile ${profile.profile}: certification pending`)
    if (profile.status === 'failed') problems.push(`profile ${profile.profile}: certification failed`)
  }
  return problems
}

export function validateMatrix(matrix: SupportMatrix): string[] {
  const problems: string[] = []
  if (matrix.schemaVersion !== 1) problems.push('support matrix schemaVersion must be 1')
  const seen = new Set<string>()
  for (const entry of matrix.entries) {
    if (seen.has(entry.hostVersion)) problems.push(`duplicate version entry: ${entry.hostVersion}`)
    seen.add(entry.hostVersion)
    if (!MATRIX_STATUSES.includes(entry.status)) {
      problems.push(`${entry.hostVersion}: unknown status "${entry.status}"`)
    }
    if (!/^dsh-\d+\.\d+\.\d+-rc\.\d+-r\d+$/u.test(entry.adapterId)) {
      problems.push(`${entry.hostVersion}: adapterId must be exact and revisioned, got "${entry.adapterId}"`)
    }
    if (!/^sha256:[0-9a-f]{64}$/u.test(entry.contractHash)) {
      problems.push(`${entry.hostVersion}: contractHash must be a full sha256 digest`)
    }
    for (const profile of profileEntries(entry)) {
      if (!PROFILE_STATUSES.includes(profile.status)) {
        problems.push(`${entry.hostVersion}: unknown profile status "${String(profile.status)}" for ${profile.profile}`)
      }
    }
    if (entry.status === 'released') {
      // A released entry is a support claim: every in-scope profile must be
      // resolved (passed) and the evidence list must be non-empty.
      problems.push(...profileGateProblems(entry).map((problem) => `${entry.hostVersion}: ${problem}`))
      if (entry.evidence.length === 0) {
        problems.push(`${entry.hostVersion}: released entries require evidence`)
      }
    } else if (isShippedStatus(entry.status)) {
      // g6-approved entries may still carry pending acceptance evidence so the
      // candidate adapter can be generated for acceptance; the support/release
      // gates block claiming support until the pending profile passes and the
      // entry is promoted.
      const inScope = profileEntries(entry).filter((profile) => profile.status !== 'not-supported')
      if (inScope.length === 0) {
        problems.push(`${entry.hostVersion}: no supported profile: at least one of desktop/web profiles must be in scope`)
      }
    }
  }
  return problems
}

/** Versions the formal matrix allows the build to generate/ship, ascending. */
export function shippedVersionsFromMatrix(matrix: SupportMatrix): string[] {
  return matrix.entries
    .filter((entry) => isShippedStatus(entry.status))
    .map((entry) => entry.hostVersion)
    .sort()
}

/** G6 support gate: the exact version is in scope and fully certified. */
export function gateSupportMatrix(matrix: SupportMatrix, version: string): GateResult {
  const problems = validateMatrix(matrix)
  const entry = matrix.entries.find((candidate) => candidate.hostVersion === version)
  if (entry === undefined) {
    problems.push(`no support-matrix entry for DSH ${version}`)
    return { ok: false, version, problems }
  }
  if (!isShippedStatus(entry.status)) {
    problems.push(`status ${entry.status}: run G6 evidence for ${version} before claiming support`)
  } else {
    problems.push(...profileGateProblems(entry))
  }
  return { ok: problems.length === 0, version, problems, entry }
}

/** Release gate: every generated adapter must be a reviewed `released` entry. */
export function gateRelease(matrix: SupportMatrix, version: string): GateResult {
  const base = gateSupportMatrix(matrix, version)
  const problems = [...base.problems]
  if (base.entry !== undefined) {
    if (base.entry.status !== 'released') {
      problems.push(
        `status ${base.entry.status}: Phase 6 must promote a reviewed g6-approved entry to released in the same release transaction`,
      )
    }
    if (base.entry.evidence.length === 0) problems.push('release requires evidence index entries')
  }
  return { ok: problems.length === 0, version, problems, ...(base.entry === undefined ? {} : { entry: base.entry }) }
}

/** Adapter generation guard: only g6-approved/released entries may ship. */
export function approvedEntryFor(matrix: SupportMatrix, version: string): SupportMatrixEntry | undefined {
  const entry = matrix.entries.find((candidate) => candidate.hostVersion === version)
  return entry !== undefined && isShippedStatus(entry.status) ? entry : undefined
}
