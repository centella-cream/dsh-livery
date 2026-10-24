/**
 * Diagnostics tests: a closed gate explains itself in stable, copyable strings,
 * and an accepted gate says nothing.
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
import { CONTRACT_FACTS, HOST_CAPABILITIES } from '../../src/generated/contract.js'

/** Closed-gate fixture; overrides describe the specific failure under test. */
function closedGate(overrides: Partial<GateResult> = {}): GateResult {
  return {
    accepted: false,
    codes: [GATE_CODE.versionMismatch],
    profileKind: 'web',
    observedHostVersion: '0.2.1-rc.2',
    expectedHostVersion: CONTRACT_FACTS.dshVersion,
    adapterId: CONTRACT_FACTS.adapterId,
    expectedAdapterId: CONTRACT_FACTS.adapterId,
    contractHash: CONTRACT_FACTS.contractHash,
    expectedContractHash: CONTRACT_FACTS.contractHash,
    missingCapabilities: [],
    activeSkinId: 'ivory-slate',
    renderError: null,
    ...overrides,
  }
}

describe('buildDiagnostics', () => {
  it('returns nothing for an accepted gate', () => {
    expect(buildDiagnostics(closedGate({ accepted: true, codes: [] }), HOST_CAPABILITIES, CONTRACT_FACTS))
      .toEqual([])
  })

  it('reports the code, observed vs certified identity and an action', () => {
    const lines = buildDiagnostics(closedGate(), HOST_CAPABILITIES, CONTRACT_FACTS)
    const joined = lines.join('\n')
    expect(joined).toContain(GATE_CODE.versionMismatch)
    expect(joined).toContain('observed DSH 0.2.1-rc.2')
    expect(joined).toContain(`certified ${CONTRACT_FACTS.dshVersion}`)
    expect(joined).toContain('profile: web')
    expect(joined).toContain('adapter:')
    expect(joined).toContain(`contract: ${shortHash(CONTRACT_FACTS.contractHash)}`)
    expect(joined).toContain('action: keep the stock appearance')
    expect(joined).toContain('contract.facts:')
  })

  it('reports an unknown version without inventing one', () => {
    const lines = buildDiagnostics(
      closedGate({ codes: [GATE_CODE.versionUnknown], observedHostVersion: null }),
      HOST_CAPABILITIES,
      CONTRACT_FACTS,
    )
    expect(lines.join('\n')).toContain(`${GATE_CODE.versionUnknown}`)
    expect(lines.join('\n')).toContain('observed DSH unknown')
  })

  it('reports every missing capability with its host detail and code', () => {
    const gate = closedGate({
      codes: [`${CAPABILITY_MISSING_PREFIX}host-font-family`, GATE_CODE.versionMismatch],
      missingCapabilities: ['host-font-family'],
    })
    const lines = buildDiagnostics(gate, HOST_CAPABILITIES, CONTRACT_FACTS)
    const line = lines.find((entry) => entry.startsWith(`${CAPABILITY_MISSING_PREFIX}host-font-family:`))
    expect(line).toBeDefined()
    expect(line).toContain(HOST_CAPABILITIES['host-font-family']?.detail ?? '')
  })

  it('reports an unknown skin only when that code is the reason', () => {
    const lines = buildDiagnostics(
      closedGate({ codes: [GATE_CODE.skinUnknown], activeSkinId: 'deleted-livery' }),
      HOST_CAPABILITIES,
      CONTRACT_FACTS,
    )
    expect(lines.join('\n')).toContain(`${GATE_CODE.skinUnknown}: "deleted-livery"`)
  })

  it('reports render failures on one line', () => {
    const lines = buildDiagnostics(
      closedGate({
        codes: [GATE_CODE.renderFailed],
        renderError: 'renderStyleText\n  threw',
      }),
      HOST_CAPABILITIES,
      CONTRACT_FACTS,
    )
    expect(lines.join('\n')).toContain(`${GATE_CODE.renderFailed}: renderStyleText threw`)
  })
})

describe('formatGateLogLine', () => {
  it('emits exactly one structured line with the fields a report needs', () => {
    const line = formatGateLogLine(closedGate({
      codes: [GATE_CODE.adapterMismatch],
      profileKind: 'desktop',
      observedHostVersion: null,
    }))
    expect(line.includes('\n')).toBe(false)
    expect(line.startsWith('dsh-livery: boot gate closed ')).toBe(true)
    expect(line).toContain(`codes=[${GATE_CODE.adapterMismatch}]`)
    expect(line).toContain('profile=desktop')
    expect(line).toContain('observedHostVersion=unknown')
    expect(line).toContain(`expectedHostVersion=${CONTRACT_FACTS.dshVersion}`)
    expect(line).toContain(`expectedAdapter=${CONTRACT_FACTS.adapterId}`)
    expect(line).toContain('contract=sha256:')
    expect(line).toContain('action=keep-stock-and-install-a-certified-livery-build')
  })

  it('collapses a multi-line render error onto the same line', () => {
    const line = formatGateLogLine(closedGate({
      codes: [GATE_CODE.renderFailed],
      renderError: 'first\nsecond',
    }))
    expect(line.includes('\n')).toBe(false)
    expect(line).toContain('renderError=first second')
  })
})

describe('shortHash', () => {
  it('keeps short hashes and truncates long ones', () => {
    expect(shortHash('sha256:abc')).toBe('sha256:abc')
    expect(shortHash(CONTRACT_FACTS.contractHash)).toBe(`${CONTRACT_FACTS.contractHash.slice(0, 20)}…`)
    expect(shortHash('')).toBe('<none>')
  })
})
