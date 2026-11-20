import { describe, expect, it } from 'vitest'
import { compositeSurfaceTokens, resolveRuntimeAxis } from '../../src/core/presentation.js'

describe('v2 independent surface axes', () => {
  it('composes geometry, border, elevation and material token families when no exact style exists', () => {
    const tokens = compositeSurfaceTokens({
      geometry: 'square', border: 'strong', elevation: 'flat', material: 'glass',
    } as unknown as Parameters<typeof compositeSurfaceTokens>[0])
    expect(tokens.light['--dsw-radius-xs']).toBe('4px')
    expect(tokens.light['--dsw-alias-border-l1']).toBe('rgba(0, 0, 0, 0.2)')
    expect(tokens.light['--dsw-menu-backdrop-filter']).toContain('blur(')
  })
})

describe('runtime axis resolver', () => {
  it('does not cast plain axis ids to recipes', () => {
    expect(() => resolveRuntimeAxis({ declared: 'hairline', effective: 'hairline', status: 'Full', missingCapabilities: [] }, 1200, { forcedColors: false, reducedTransparency: false, reducedMotion: false })).not.toThrow()
  })
})
