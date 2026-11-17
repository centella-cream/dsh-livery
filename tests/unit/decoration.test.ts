import { describe, expect, it } from 'vitest'
import { STUDIO_DECORATION_PRIMITIVES, auditStudioDecoration, validatePrimitive } from '../../src/core/decoration.js'

describe('L5a decoration primitives', () => {
  it('audits every registered recipe without issues', () => {
    for (const recipe of Object.keys(STUDIO_DECORATION_PRIMITIVES)) {
      const audit = auditStudioDecoration(recipe)
      expect(audit.recipe).toBe(recipe)
      expect(audit.primitiveCount).toBeGreaterThan(0)
      expect(audit.issues).toEqual([])
      expect(audit.decorationAuditHash).toMatch(/^sha256:/)
      expect(audit.pathRegistryHash).toMatch(/^sha256:/)
    }
  })

  it('rejects out-of-range coordinates instead of clamping', () => {
    expect(validatePrimitive({ kind: 'line', x1: -1, y1: 0, x2: 1, y2: 1, stroke: '--dsh-livery-decoration-line', width: 1 })).toContain('x1 out of range')
    expect(validatePrimitive({ kind: 'circle', cx: 1, cy: 1, r: 0, fill: '--dsh-livery-decoration-accent' })).toContain('r out of range')
  })

  it('rejects raw colours and arbitrary paths', () => {
    expect(validatePrimitive({ kind: 'rect', x: 0, y: 0, w: 1, h: 1, fill: '#fff' })).toContain('rect needs a fill or stroke token')
    expect(validatePrimitive({ kind: 'path', pathId: 'arbitrary', x: 0, y: 0, scale: 1 })).toContain('unknown pathId')
  })
})
