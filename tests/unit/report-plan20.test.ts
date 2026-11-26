import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error the acceptance probe is plain ESM without shipped declarations
import { PLAN20_ROWS, plan20RowStatus } from '../../scripts/acceptance/probe/report.mjs'

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

  it('references only check ids that appear in the acceptance probe sources', () => {
    const registered = new Set()
    const walk = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const full = join(directory, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.mjs')) {
          const source = readFileSync(full, 'utf8')
          for (const match of source.matchAll(/['"]([A-Za-z0-9]+(?:\.[A-Za-z0-9-]+)+)['"]/g)) registered.add(match[1])
        }
      }
    }
    walk('scripts/acceptance')
    for (const row of PLAN20_ROWS) {
      for (const id of row.checks) expect(registered.has(id), `${row.criterion}: ${id}`).toBe(true)
    }
  })
})
