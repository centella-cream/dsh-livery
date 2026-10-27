import { describe, expect, it } from 'vitest'
import { formatDiagnostics } from '../../src/client/diagnostics.js'
import type { DiagnosticsTranslate } from '../../src/client/diagnostics.js'
import { createInitialSnapshot } from '../../src/client/model.js'
import type { LiveryRuntimeSnapshot } from '../../src/client/model.js'
import { dictionaries, enUS, zhCN } from '../../src/i18n/index.js'
import { makeCatalog, TEST_ADAPTER } from './fixtures.js'

const IDENTITY = {
  adapterId: TEST_ADAPTER.adapterId,
  contractHash: TEST_ADAPTER.contractHash,
  pluginVersion: '0.1.3',
  hostVersion: TEST_ADAPTER.hostVersion,
}

/** Dictionary-backed translate with `{name}` template substitution. */
function makeT(dict: Record<string, string>): DiagnosticsTranslate {
  return ((key: string, params?: Record<string, unknown>): string => {
    const template = dict[key] ?? `!${key}`
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? `{${name}}`))
  }) as unknown as DiagnosticsTranslate
}

const catalog = makeCatalog()
const base = createInitialSnapshot(IDENTITY, {
  status: 'valid',
  reason: undefined,
  diagnostics: ['host note'],
  catalogProfile: TEST_ADAPTER.catalogProfile,
})
const READY: LiveryRuntimeSnapshot = {
  ...base,
  phase: 'ready',
  bootStatus: 'valid',
  bootDiagnostics: ['host note'],
  catalogStatus: 'ready',
  catalog,
  capabilities: catalog.capabilities,
  catalogProfile: catalog.catalogProfile,
  configStatus: 'ready',
  writable: true,
  confirmedId: 'fjord',
  effectiveId: 'fjord',
}

describe('formatDiagnostics', () => {
  it('renders an English report with the section labels and live values', () => {
    const text = formatDiagnostics(makeT(enUS), READY, 'en')
    expect(text).toContain(enUS['diag.header'])
    expect(text).toContain(IDENTITY.adapterId)
    expect(text).toContain('fjord')
    expect(text).toContain('theme-css')
    expect(text).toContain(enUS['check.contrast'])
    expect(text).toContain(enUS['check.coverage'])
    expect(text).toContain(enUS['check.profile'])
    expect(text).toContain(TEST_ADAPTER.catalogProfile)
    expect(text).toContain('host note')
    // No unresolved dictionary keys leaked into the report.
    expect(text).not.toMatch(/![a-z]+\.[a-z]/i)
  })

  it('renders a Chinese report whose labels are localized', () => {
    const text = formatDiagnostics(makeT(zhCN), READY, 'zh')
    expect(text).toContain(zhCN['diag.header'])
    expect(text).toContain(zhCN['diag.capabilities'])
    expect(text).toContain(zhCN['check.available'])
    expect(text).not.toContain(enUS['diag.header'])
  })

  it('reports contrast failures and coverage counts of the presented livery', () => {
    const text = formatDiagnostics(makeT(enUS), READY, 'en')
    expect(text).toContain('secondary')
    expect(text).toMatch(/1 of 2 checks fail|2 of 2 checks fail/)
    expect(text).toMatch(/covered|inherited|missing/)
  })

  it('handles a snapshot with no catalog, no capabilities and no livery', () => {
    const empty: LiveryRuntimeSnapshot = {
      ...base,
      phase: 'degraded',
      bootStatus: 'absent',
      catalogStatus: 'unavailable',
      confirmedId: 'stock',
      effectiveId: 'stock',
    }
    const en = formatDiagnostics(makeT(enUS), empty, 'en')
    expect(en).toContain(enUS['diag.header'])
    expect(en).not.toMatch(/![a-z]+\./i)
    const zh = formatDiagnostics(makeT(zhCN), empty, 'zh')
    expect(zh).toContain(zhCN['diag.header'])
  })

  it('lists configured, effective and handshake state', () => {
    const degraded: LiveryRuntimeSnapshot = {
      ...READY,
      phase: 'degraded',
      bootStatus: 'mismatch',
      bootReason: 'adapter mismatch: boot=a build=b',
      invalidSkinId: 'deleted-livery',
      writeFailure: 'refused',
    }
    const text = formatDiagnostics(makeT(enUS), degraded, 'en')
    expect(text).toContain(enUS['check.bootRejected'])
    expect(text).toContain('adapter mismatch')
    expect(text).toContain('deleted-livery')
    expect(text).toContain('refused')
  })

  it('renders the same dictionary for both shipped locale ids', () => {
    const zh = formatDiagnostics(makeT(dictionaries.zh), READY, 'zh')
    const en = formatDiagnostics(makeT(dictionaries.en), READY, 'en')
    expect(zh.length).toBeGreaterThan(0)
    expect(zh).not.toBe(en)
  })
})
