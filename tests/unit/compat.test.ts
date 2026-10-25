import { describe, expect, it } from 'vitest'
import {
  compareDshVersions,
  isCompatibleHostVersion,
} from '../../src/core/compat.js'

describe('compatibility range (>=0.2.0-rc.2 <1.0.0)', () => {
  it('orders prereleases below their release', () => {
    expect(compareDshVersions('0.2.0-rc.1', '0.2.0-rc.2')).toBeLessThan(0)
    expect(compareDshVersions('0.2.0-rc.2', '0.2.0')).toBeLessThan(0)
    expect(compareDshVersions('0.2.0', '0.2.1')).toBeLessThan(0)
    expect(compareDshVersions('0.2.1-rc.2', '0.2.1-rc.3')).toBeLessThan(0)
    expect(compareDshVersions('0.2.1', '0.2.1-rc.3')).toBeGreaterThan(0)
  })

  it('accepts the certified builds and future in-range versions', () => {
    for (const version of ['0.2.0-rc.2', '0.2.1-rc.2', '0.2.1-rc.3', '0.2.2-rc.1', '0.2.1-rc.4', '0.2.0', '0.3.0-rc.1', '0.9.9']) {
      expect(isCompatibleHostVersion(version), version).toBe(true)
    }
  })

  it('rejects older, future-major and unparseable versions', () => {
    for (const version of ['0.2.0-rc.1', '0.1.9', '0.2.0-alpha.1', '1.0.0', '1.0.0-rc.1', '9.9.9', 'not-a-version', '']) {
      expect(isCompatibleHostVersion(version), version).toBe(false)
    }
  })
})
