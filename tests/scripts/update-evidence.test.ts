import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without TypeScript declarations
import { REQUIRED_UPDATE_CHECKS, UPDATE_EVIDENCE_SCHEMA_VERSION, UPDATE_MANAGER_OUTCOMES, UPDATE_TRANSITION_FIELDS, UPDATE_TRANSITION_TRIGGERS, findAcceptedArtifactEvidence, requiredCheckProblems, validateTransition } from '../../scripts/release-lib.mjs'

/** Exact 0.2.1 artifact identity recorded in contracts/dsh/evidence/0.2.1/. */
const FROM = Object.freeze({
  version: '0.2.1',
  sha256: '78f1c8d108e5647dd666f6489b7766b11877f812c42519e314f8174dbb9b55a7',
  bytes: 3_529_494,
})
const TO_SHA = 'b'.repeat(64)

function transition(overrides: Record<string, unknown> = {}) {
  return {
    fromVersion: FROM.version,
    fromSha256: FROM.sha256,
    fromBytes: FROM.bytes,
    toVersion: '0.2.2',
    toSha256: TO_SHA,
    trigger: 'host-install-dialog',
    pageReloaded: false,
    staleBootObserved: true,
    catalogReadopted: true,
    managerOutcome: 'applied',
    ...overrides,
  }
}

const CANDIDATE = { toSha256: TO_SHA, toVersion: '0.2.2' }

describe('update evidence schema v3', () => {
  it('is a versioned, frozen transition contract', () => {
    expect(UPDATE_EVIDENCE_SCHEMA_VERSION).toBe(3)
    expect([...UPDATE_TRANSITION_TRIGGERS]).toEqual(['host-install-dialog'])
    expect([...UPDATE_MANAGER_OUTCOMES]).toContain('restart-required')
    expect([...UPDATE_TRANSITION_FIELDS]).toEqual([
      'fromVersion',
      'fromSha256',
      'fromBytes',
      'toVersion',
      'toSha256',
      'trigger',
      'pageReloaded',
      'staleBootObserved',
      'catalogReadopted',
      'managerOutcome',
    ])
    expect([...REQUIRED_UPDATE_CHECKS]).toEqual(expect.arrayContaining([
      'update.from-artifact-verified',
      'update.no-page-navigation',
      'update.stale-boot-observed',
      'update.catalog-refetched',
      'update.catalog-applied',
      'update.detail-section-renders',
      'update.manager-outcome',
    ]))
  })

  it('accepts a real 0.2.1 → 0.2.2 in-process transition', () => {
    expect(validateTransition(transition(), CANDIDATE)).toEqual([])
  })

  it('fails closed on a page reload', () => {
    const problems = validateTransition(transition({ pageReloaded: true }), CANDIDATE)
    expect(problems.join('; ')).toContain('pageReloaded must be false')
  })

  it('requires the stale startup frame and catalog re-adoption to be observed', () => {
    expect(validateTransition(transition({ staleBootObserved: false }), CANDIDATE).join('; ')).toContain('staleBootObserved')
    expect(validateTransition(transition({ catalogReadopted: false }), CANDIDATE).join('; ')).toContain('catalogReadopted')
  })

  it('rejects a restart-required manager outcome for acceptance', () => {
    expect(validateTransition(transition({ managerOutcome: 'restart-required' }), CANDIDATE).join('; '))
      .toContain('managerOutcome must be applied')
    // Shape-valid but not accepted: the schema still knows the outcome word.
    expect(validateTransition(transition({ managerOutcome: 'restart-required' }), { ...CANDIDATE, requireAccepted: false }))
      .toEqual([])
  })

  it('rejects unknown manager outcomes and triggers', () => {
    expect(validateTransition(transition({ managerOutcome: 'hot' }), CANDIDATE).join('; ')).toContain('managerOutcome')
    expect(validateTransition(transition({ trigger: 'local-registry' }), CANDIDATE).join('; ')).toContain('trigger')
  })

  it('binds both artifacts exactly and rejects a candidate/from version collision', () => {
    expect(validateTransition(transition({ toSha256: 'c'.repeat(64) }), CANDIDATE).join('; ')).toContain('candidate sha256')
    expect(validateTransition(transition({ toVersion: '0.2.3' }), CANDIDATE).join('; ')).toContain('candidate package version')
    expect(validateTransition(transition({ fromVersion: '0.2.2' }), CANDIDATE).join('; ')).toContain('must differ')
    expect(validateTransition(transition({ fromSha256: FROM.sha256.toUpperCase() }), CANDIDATE).join('; ')).toContain('fromSha256')
    expect(validateTransition(transition({ fromBytes: 0 }), CANDIDATE).join('; ')).toContain('fromBytes')
  })

  it('requires exactly the frozen transition fields', () => {
    const missing: Record<string, unknown> = transition()
    delete missing.trigger
    expect(validateTransition(missing, CANDIDATE).join('; ')).toContain('missing: trigger')
    expect(validateTransition(transition({ extra: true }), CANDIDATE).join('; ')).toContain('unexpected: extra')
    expect(validateTransition(null, CANDIDATE)).toEqual(['transition must be an object'])
  })

  it('ties the from artifact to previously committed evidence, never a rebuild', () => {
    const accepted = findAcceptedArtifactEvidence(FROM)
    expect(accepted.length).toBeGreaterThan(0)
    expect(accepted.every((entry: { packageVersion: string }) => entry.packageVersion === FROM.version)).toBe(true)
    expect(accepted.every((entry: { tarballSha256: string }) => entry.tarballSha256 === FROM.sha256)).toBe(true)
    expect(accepted.some((entry: { file: string }) => entry.file.startsWith('contracts/dsh/evidence/0.2.1/'))).toBe(true)
    expect(findAcceptedArtifactEvidence({ version: FROM.version, sha256: 'd'.repeat(64) })).toEqual([])
    expect(findAcceptedArtifactEvidence({ version: FROM.version, sha256: FROM.sha256, bytes: 1 })).toEqual([])
  })

  it('enforces the required update check set from a raw probe', () => {
    const passing = REQUIRED_UPDATE_CHECKS.map((id: string) => ({ id, status: 'pass' }))
    expect(requiredCheckProblems(passing, REQUIRED_UPDATE_CHECKS)).toEqual([])
    expect(requiredCheckProblems(passing.filter((check: { id: string }) => check.id !== 'update.no-page-navigation'), REQUIRED_UPDATE_CHECKS).join('; '))
      .toContain('required check missing: update.no-page-navigation')
    const failed = passing.map((check: { id: string; status: string }) => check.id === 'update.stale-boot-observed' ? { ...check, status: 'fail' } : check)
    expect(requiredCheckProblems(failed, REQUIRED_UPDATE_CHECKS).join('; ')).toContain('required check not pass: update.stale-boot-observed (fail)')
  })
})
