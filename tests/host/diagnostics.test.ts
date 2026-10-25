/**
 * Diagnostics tests: a closed multi-adapter gate explains itself in stable,
 * copyable strings (observed version, certified allowlist, adapter identity,
 * catalog profile, capability gaps), and an accepted gate says nothing.
 */

import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_MISSING_PREFIX,
  GATE_CODE,
  buildDiagnostics,
  formatGateLogLine,
  shortHash,
} from '../../src/host/diagnostics.js'
import type { GateResult } from '../../src/host/boot.js'
import { makeCapabilities } from './fixtures.js'

const SUPPORTED = ['0.2.0-rc.2', '0.2.1-rc.2', '0.2.1-rc.3'] as const
const CONTRACT_HASH = `sha256:${'a'.repeat(64)}`

/** Closed-gate fixture; overrides describe the specific failure under test. */
function closedGate(overrides: Partial<GateResult> = {}): GateResult {
  return {
    accepted: false,
    codes: [GATE_CODE.versionMismatch],
    profileKind: 'web',
    observedHostVersion: '9.9.9',
    supportedHostVersions: SUPPORTED,
    adapterId: '',
    hostVersion: '',
    contractHash: '',
    catalogProfile: '',
    missingCapabilities: [],
    activeSkinId: 'ivory-slate',
    renderError: null,
    ...overrides,
  }
}

/** Closed gate after a resolved adapter (render/capability/skin failures). */
function resolvedGate(overrides: Partial<GateResult> = {}): GateResult {
  return closedGate({
    codes: [GATE_CODE.renderFailed],
    observedHostVersion: '0.2.1-rc.2',
    adapterId: 'dsh-0.2.1-rc.2-r1',
    hostVersion: '0.2.1-rc.2',
    contractHash: CONTRACT_HASH,
    catalogProfile: 'sha256:profile-021',
    ...overrides,
  })
}

describe('buildDiagnostics', () => {
  it('returns nothing for an accepted gate', () => {
    expect(buildDiagnostics(closedGate({ accepted: true, codes: [] }), makeCapabilities())).toEqual([])
  })

  it('reports an uncertified version with the certified allowlist and an action', () => {
    const lines = buildDiagnostics(closedGate(), makeCapabilities())
    const joined = lines.join('\n')
    expect(joined).toContain(GATE_CODE.versionMismatch)
    expect(joined).toContain('observed DSH 9.9.9')
    for (const version of SUPPORTED) expect(joined).toContain(version)
    expect(joined).toContain('adapter: unresolved')
    expect(joined).toContain('catalog profile unknown')
    expect(joined).toContain('action: keep the stock appearance')
  })

  it('reports an unreadable version without inventing one', () => {
    const lines = buildDiagnostics(
      closedGate({ codes: [GATE_CODE.versionUnknown], observedHostVersion: null }),
      makeCapabilities(),
    )
    const joined = lines.join('\n')
    expect(joined).toContain(GATE_CODE.versionUnknown)
    expect(joined).toContain('observed DSH unknown')
  })

  it('reports adapter identity, host version, catalog profile and contract hash', () => {
    const lines = buildDiagnostics(resolvedGate(), makeCapabilities())
    const joined = lines.join('\n')
    expect(joined).toContain('adapter: dsh-0.2.1-rc.2-r1')
    expect(joined).toContain('host 0.2.1-rc.2')
    expect(joined).toContain('catalog profile sha256:profile-021')
    expect(joined).toContain(`contract: ${shortHash(CONTRACT_HASH)}`)
    expect(joined).toContain('profile: web')
  })

  it('reports every missing capability with its host detail and code', () => {
    const capabilities = makeCapabilities(['host-font-family'])
    const gate = resolvedGate({
      codes: [`${CAPABILITY_MISSING_PREFIX}host-font-family`, GATE_CODE.renderFailed],
      missingCapabilities: ['host-font-family'],
    })
    const lines = buildDiagnostics(gate, capabilities)
    const line = lines.find((entry) => entry.startsWith(`${CAPABILITY_MISSING_PREFIX}host-font-family:`))
    expect(line).toBeDefined()
    expect(line).toContain('fixture capability host-font-family')
  })

  it('reports an unknown skin only when that code is the reason', () => {
    const lines = buildDiagnostics(
      resolvedGate({ codes: [GATE_CODE.skinUnknown], activeSkinId: 'deleted-livery' }),
      makeCapabilities(),
    )
    expect(lines.join('\n')).toContain(`${GATE_CODE.skinUnknown}: "deleted-livery"`)
  })

  it('does not report an unknown skin when the gate closed for another reason', () => {
    const lines = buildDiagnostics(closedGate({ activeSkinId: 'deleted-livery' }), makeCapabilities())
    expect(lines.join('\n')).not.toContain(`${GATE_CODE.skinUnknown}:`)
  })

  it('reports render failures on one line', () => {
    const lines = buildDiagnostics(
      resolvedGate({ renderError: 'compiled css\n  missing' }),
      makeCapabilities(),
    )
    expect(lines.join('\n')).toContain(`${GATE_CODE.renderFailed}: compiled css missing`)
  })
})

describe('formatGateLogLine', () => {
  it('emits exactly one structured line with the multi-version fields', () => {
    const line = formatGateLogLine(closedGate({
      codes: [GATE_CODE.versionMismatch],
      profileKind: 'desktop',
      observedHostVersion: null,
    }))
    expect(line.includes('\n')).toBe(false)
    expect(line.startsWith('dsh-livery: boot gate closed ')).toBe(true)
    expect(line).toContain(`codes=[${GATE_CODE.versionMismatch}]`)
    expect(line).toContain('profile=desktop')
    expect(line).toContain('observedHostVersion=unknown')
    expect(line).toContain(`supported=[${SUPPORTED.join(',')}]`)
    expect(line).toContain('adapter=unresolved')
    expect(line).toContain('hostVersion=unknown')
    expect(line).toContain('catalogProfile=unknown')
    expect(line).toContain('action=keep-stock-and-install-a-certified-livery-build')
  })

  it('includes the resolved adapter identity and profile when there is one', () => {
    const line = formatGateLogLine(resolvedGate())
    expect(line).toContain('adapter=dsh-0.2.1-rc.2-r1')
    expect(line).toContain('hostVersion=0.2.1-rc.2')
    expect(line).toContain('catalogProfile=sha256:profile-021')
    expect(line).toContain(`contract=${shortHash(CONTRACT_HASH)}`)
  })

  it('collapses a multi-line render error onto the same line', () => {
    const line = formatGateLogLine(resolvedGate({ renderError: 'first\nsecond' }))
    expect(line.includes('\n')).toBe(false)
    expect(line).toContain('renderError=first second')
  })
})

describe('shortHash', () => {
  it('keeps short hashes and truncates long ones', () => {
    expect(shortHash('sha256:abc')).toBe('sha256:abc')
    expect(shortHash(CONTRACT_HASH)).toBe(`${CONTRACT_HASH.slice(0, 20)}…`)
    expect(shortHash('')).toBe('<none>')
  })
})
