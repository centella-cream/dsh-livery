import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error the acceptance probe is plain ESM without shipped declarations
import { PLAN20_ROWS, plan20RowStatus } from '../../scripts/acceptance/probe/report.mjs'

const row = { criterion: 'fixture', checks: ['a'], note: 'fixture note' }
type Rows = readonly { readonly criterion: string; readonly checks: readonly string[] }[]

/** Collect literal check ids and dynamic template patterns from probe sources. */
function registrations(): { readonly literals: ReadonlySet<string>; readonly patterns: readonly RegExp[] } {
  const literals = new Set<string>()
  const patterns: RegExp[] = []
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!entry.name.endsWith('.mjs') || entry.name === 'report.mjs') continue
      const source = readFileSync(full, 'utf8')
      for (const match of source.matchAll(/['"]([A-Za-z0-9]+(?:\.[A-Za-z0-9-]+)+)['"]/g)) literals.add(match[1]!)
      for (const match of source.matchAll(/`([^`]*\$\{[^`]*)`/g)) {
        const template = match[1]!
        if (!template.includes('.')) continue
        const escaped = template
          .split(/\$\{[^}]*\}/)
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('[A-Za-z0-9-]+')
        patterns.push(new RegExp(`^${escaped}$`))
      }
    }
  }
  walk('scripts/acceptance')
  return { literals, patterns }
}

function missingIds(rows: Rows, registry: ReturnType<typeof registrations>): string[] {
  const missing: string[] = []
  for (const entry of rows) {
    for (const id of entry.checks) {
      if (registry.literals.has(id)) continue
      if (registry.patterns.some((pattern) => pattern.test(id))) continue
      missing.push(id)
    }
  }
  return missing
}

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

  it('references only check ids registered by the acceptance probe sources', () => {
    const registry = registrations()
    expect(missingIds(PLAN20_ROWS, registry)).toEqual([])
  })

  it('catches an id that is absent from the signal sources (not tautological)', () => {
    const registry = registrations()
    const stale = [{ criterion: 'stale fixture', checks: ['copy.wallpaper-online-hint'] }]
    expect(missingIds(stale, registry)).toEqual(['copy.wallpaper-online-hint'])
  })
})
