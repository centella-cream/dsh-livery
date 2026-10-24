/**
 * Support-matrix status machine and release gates.
 *
 * States: draft -> g0-g5-passed -> g6-approved -> released. Only `released`
 * entries may appear in the formal `support-matrix.json`; Phase 4 may only
 * promote a `g6-approved` candidate entry in `support-matrix.proposed.json`.
 */
import { readFile } from 'node:fs/promises'
import type { SupportMatrix, SupportMatrixEntry } from './types.js'

export interface GateResult {
  readonly ok: boolean
  readonly version: string
  readonly problems: readonly string[]
  readonly entry?: SupportMatrixEntry
}

export const MATRIX_STATUSES = ['draft', 'g0-g5-passed', 'g6-approved', 'released'] as const

export function validateMatrix(matrix: SupportMatrix): string[] {
  const problems: string[] = []
  if (matrix.schemaVersion !== 1) problems.push('support matrix schemaVersion must be 1')
  const seen = new Set<string>()
  for (const entry of matrix.entries) {
    if (seen.has(entry.hostVersion)) problems.push(`duplicate version entry: ${entry.hostVersion}`)
    seen.add(entry.hostVersion)
    if (!(MATRIX_STATUSES as readonly string[]).includes(entry.status)) {
      problems.push(`${entry.hostVersion}: unknown status "${entry.status}"`)
    }
    if (!/^dsh-\d+\.\d+\.\d+-rc\.\d+-r\d+$/u.test(entry.adapterId)) {
      problems.push(`${entry.hostVersion}: adapterId must be exact and revisioned, got "${entry.adapterId}"`)
    }
    if (!/^sha256:[0-9a-f]{64}$/u.test(entry.contractHash)) {
      problems.push(`${entry.hostVersion}: contractHash must be a full sha256 digest`)
    }
    if (entry.status === 'released' && entry.evidence.length === 0) {
      problems.push(`${entry.hostVersion}: released entries require evidence`)
    }
  }
  return problems
}

export async function readMatrix(path: string): Promise<SupportMatrix> {
  return JSON.parse(await readFile(path, 'utf8')) as SupportMatrix
}

function allProfilesPassed(entry: SupportMatrixEntry): boolean {
  return (
    entry.profiles.desktop.macos === 'passed' &&
    entry.profiles.desktop.win32 === 'passed' &&
    entry.profiles.web.chrome === 'passed' &&
    entry.profiles.web.edge === 'passed'
  )
}

/** G6: the exact version must be fully certified before it may be called supported. */
export function gateSupportMatrix(matrix: SupportMatrix, version: string): GateResult {
  const problems = validateMatrix(matrix)
  const entry = matrix.entries.find((candidate) => candidate.hostVersion === version)
  if (entry === undefined) {
    problems.push(`no support-matrix entry for DSH ${version}`)
    return { ok: false, version, problems }
  }
  if (entry.status === 'draft' || entry.status === 'g0-g5-passed') {
    problems.push(`status ${entry.status}: run G6 evidence for ${version} before claiming support`)
  }
  if (!allProfilesPassed(entry)) {
    problems.push(
      `profile evidence incomplete: desktop.macos=${entry.profiles.desktop.macos}, desktop.win32=${entry.profiles.desktop.win32}, web.chrome=${entry.profiles.web.chrome}, web.edge=${entry.profiles.web.edge}`,
    )
  }
  if (entry.status === 'g6-approved' && entry.evidence.length === 0) {
    problems.push('g6-approved requires a non-empty evidence list')
  }
  return { ok: problems.length === 0, version, problems, entry }
}

/** Release gate: only a reviewed `released` entry with evidence may ship. */
export function gateRelease(matrix: SupportMatrix, version: string): GateResult {
  const base = gateSupportMatrix(matrix, version)
  const problems = [...base.problems]
  if (base.entry !== undefined) {
    if (base.entry.status !== 'released') {
      problems.push(`status ${base.entry.status}: Phase 6 must promote a reviewed g6-approved entry to released in the same release transaction`)
    }
    if (base.entry.evidence.length === 0) problems.push('release requires evidence index entries')
  }
  return { ok: problems.length === 0, version, problems, ...(base.entry === undefined ? {} : { entry: base.entry }) }
}

/** Phase-4 promotion guard: G6 approval must be scoped to one exact version. */
export function approvedEntryFor(matrix: SupportMatrix, version: string): SupportMatrixEntry | undefined {
  const entry = matrix.entries.find((candidate) => candidate.hostVersion === version)
  return entry?.status === 'g6-approved' || entry?.status === 'released' ? entry : undefined
}
