import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error the acceptance probe is plain ESM without shipped declarations
import { plan20RowStatus } from '../../scripts/acceptance/probe/report.mjs'

const row = { criterion: 'fixture', checks: ['a'], note: 'fixture note' }

describe('plan20 report mapping', () => {
  it('marks a missing mapped check as not verified instead of passing', () => {
    const status = plan20RowStatus(new Map([['b', { id: 'b', status: 'pass' }]]), row)
    expect(status.icon).toBe('❌')
    expect(status.text).toContain('missing mapped checks')
    expect(status.text).toContain('a')
  })

  it('reports pass, fail and skip classes distinctly', () => {
    expect(plan20RowStatus(new Map([['a', { id: 'a', status: 'pass' }]]), row).icon).toBe('✅')
    expect(plan20RowStatus(new Map([['a', { id: 'a', status: 'fail' }]]), row).icon).toBe('❌')
    expect(plan20RowStatus(new Map([['a', { id: 'a', status: 'skip' }]]), row).icon).toBe('⏭')
  })

  it('keeps the renamed online-copy check referenced in the report', () => {
    const report = readFileSync('scripts/acceptance/probe/report.mjs', 'utf8')
    expect(report).toContain("'copy.wallpaper-online-controls'")
    expect(report).not.toContain("'copy.wallpaper-online-hint'")
  })
})
