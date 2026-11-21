import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without TypeScript declarations
import { requiresAuditEnvelope } from '../../scripts/version-policy.mjs'

describe('audit envelope version policy', () => {
  it('turns on at 0.2.0 rather than at major 2', () => {
    expect(requiresAuditEnvelope('0.1.9')).toBe(false)
    expect(requiresAuditEnvelope('0.2.0')).toBe(true)
    expect(requiresAuditEnvelope('0.2.0-rc.1')).toBe(true)
    expect(requiresAuditEnvelope('1.0.0')).toBe(true)
  })
})
