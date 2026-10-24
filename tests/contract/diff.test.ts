import { describe, expect, it } from 'vitest'
import { diffContracts, renderDiffMarkdown } from '../../src/contract/diff.js'
import { gateRelease, gateSupportMatrix, validateMatrix } from '../../src/contract/matrix.js'
import type { ContractSnapshot, SupportMatrix } from '../../src/contract/types.js'

function makeSnapshot(overrides: {
  version?: string
  tokens?: Array<{ name: string; light: string; dark?: string }>
  consumed?: string[]
  modules?: string[]
} = {}): ContractSnapshot {
  const tokens = (overrides.tokens ?? [
    { name: '--dsw-alias-bg-base', light: '#ffffff' },
    { name: '--dsw-alias-label-primary', light: '#111111' },
  ]).map((token) => ({
    name: token.name,
    category: token.name.includes('-alias-') ? 'alias' : 'other',
    light: token.light,
    dark: token.dark ?? token.light,
    selector: 'body',
    darkSelector: 'body[data-ds-dark-theme]',
    referencedBy: [],
  }))
  const hashes = {
    loaderAbi: 'sha256:a',
    hostApi: 'sha256:b',
    clientApi: 'sha256:c',
    token: 'sha256:d',
    layout: 'sha256:e',
    profileSchema: 'sha256:f',
  }
  return {
    schemaVersion: 1,
    adapterId: 'dsh-0.2.0-rc.2-r1',
    hostVersion: overrides.version ?? '0.2.0-rc.2',
    capturedAt: '2026-10-24T00:00:00.000Z',
    source: { kind: 'installed-package', dshPackage: '@deepseek-ai/dsh@0.2.0-rc.2', nodeRange: '^22.23.1', nodeRangeSource: 'target-declares-none; certified on node v22.23.1', clientTarget: 'chrome120' },
    loaderAbi: {
      hash: hashes.loaderAbi,
      globals: ['__ModuleLoader__'],
      envelope: { call: 'load', moduleFormat: 'cjs-factory', idEqualsPackageName: true, singleFile: true },
      servePath: '/plugins/',
      platformModules: {
        hash: 'sha256:aa',
        modules: overrides.modules ?? ['react', 'react-dom'],
        chunkProtocol: 'require.async',
        evidence: [],
      },
      evidence: [],
    },
    hostApi: { hash: hashes.hostApi, services: [{ service: 'webServer', members: ['register'], from: 'x.d.ts' }], events: {}, evidence: [] },
    clientApi: {
      hash: hashes.clientApi,
      services: ['configForms'],
      slots: { settingsSection: { kind: 'list', scope: 'root', owner: 'SettingsSectionOwnerProps' }, localeNamespace: 'dsh-livery' },
      theme: { darkAttribute: 'data-ds-dark-theme', themeSourceAttribute: 'data-ds-theme-source', observer: 'theme/change' },
      locale: { ids: ['zh', 'en'], langAttribute: 'html[lang]' },
      configForms: { entryKey: 'entry', sharedForm: 'get' },
      evidence: [],
    },
    tokens: { hash: hashes.token, count: tokens.length, consumed: overrides.consumed ?? ['--dsw-alias-bg-base'], tokens, undeclaredButRead: [] },
    layout: { hash: hashes.layout, darkAttribute: 'data-ds-dark-theme', documentedAttributes: ['data-ds-dark-theme'], rootVariables: [], capabilityFacts: {}, evidence: [] },
    profileSchema: { hash: hashes.profileSchema, patchKeys: ['insert'], bundleFields: ['patch'], peerGate: 'peers', evidence: [] },
    capabilities: {
      themeCss: true,
      hostFontFamily: true,
      surfaceMaterial: true,
      hostDensityTokens: false,
      hostTranscriptWidth: false,
      hostMessageFlow: false,
    },
    hashes,
    contractHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  }
}

describe('contract diff', () => {
  it('reports a required diff when a consumed token is removed', () => {
    const base = makeSnapshot({ consumed: ['--dsw-alias-bg-base', '--dsw-alias-label-primary'] })
    const candidate = makeSnapshot({
      consumed: ['--dsw-alias-bg-base'],
      tokens: [{ name: '--dsw-alias-bg-base', light: '#ffffff' }],
    })
    const diff = diffContracts(base, candidate)
    expect(diff.required).toBe(1)
    expect(diff.entries[0]?.kind).toBe('token-removed')
    expect(diff.entries[0]?.subject).toBe('--dsw-alias-label-primary')
  })

  it('treats unconsumed token changes as diagnostic only', () => {
    const base = makeSnapshot({
      consumed: [],
      tokens: [
        { name: '--dsw-alias-bg-base', light: '#ffffff' },
        { name: '--dsw-alias-unused', light: '#000000' },
      ],
    })
    const candidate = makeSnapshot({
      consumed: [],
      tokens: [
        { name: '--dsw-alias-bg-base', light: '#ffffff' },
        { name: '--dsw-alias-unused', light: '#111111' },
      ],
    })
    const diff = diffContracts(base, candidate)
    expect(diff.required).toBe(0)
    expect(diff.diagnosticOnly).toBe(1)
  })

  it('markets a removed platform module as required', () => {
    const base = makeSnapshot()
    const candidate = makeSnapshot({ modules: ['react'] })
    const diff = diffContracts(base, candidate)
    expect(diff.entries.some((entry) => entry.kind === 'platform-module-removed' && entry.impact === 'required')).toBe(true)
  })

  it('renders a markdown report', () => {
    const markdown = renderDiffMarkdown(diffContracts(makeSnapshot(), makeSnapshot({ version: '0.2.1-rc.2' })))
    expect(markdown).toContain('# Contract diff: 0.2.0-rc.2 → 0.2.1-rc.2')
    expect(markdown).toContain('| impact |')
  })
})

function makeMatrix(status: SupportMatrix['entries'][number]['status']): SupportMatrix {
  return {
    schemaVersion: 1,
    updatedAt: '2026-10-24T00:00:00.000Z',
    entries: [
      {
        hostVersion: '0.2.0-rc.2',
        adapterId: 'dsh-0.2.0-rc.2-r1',
        contractHash: 'sha256:42abf8ebc5ec1df1e6abd6760680ec82fd062db650036e5e9f2a052138b6b2ce',
        status,
        profiles: {
          desktop: { macos: status === 'draft' ? 'pending' : 'passed', win32: status === 'draft' ? 'pending' : 'passed' },
          web: { chrome: 'passed', edge: 'passed' },
        },
        browserSupport: [{ family: 'chrome', minVersion: 120 }],
        clientTarget: 'chrome120',
        evidence: status === 'draft' ? [] : ['artifacts/acceptance/probe.json'],
        notes: [],
      },
    ],
  }
}

describe('support-matrix gates', () => {
  it('accepts a fully certified g6-approved entry', () => {
    const result = gateSupportMatrix(makeMatrix('g6-approved'), '0.2.0-rc.2')
    expect(result.problems).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('blocks draft entries and incomplete profile evidence', () => {
    const draft = gateSupportMatrix(makeMatrix('draft'), '0.2.0-rc.2')
    expect(draft.ok).toBe(false)
    const incomplete = makeMatrix('g6-approved')
    const entry = incomplete.entries[0]!
    const patched: SupportMatrix = {
      ...incomplete,
      entries: [{ ...entry, profiles: { ...entry.profiles, desktop: { macos: 'pending', win32: 'pending' } } }],
    }
    const result = gateSupportMatrix(patched, '0.2.0-rc.2')
    expect(result.ok).toBe(false)
    expect(result.problems.some((problem) => problem.includes('profile evidence incomplete'))).toBe(true)
  })

  it('requires Phase 6 release promotion and evidence', () => {
    expect(gateRelease(makeMatrix('g6-approved'), '0.2.0-rc.2').ok).toBe(false)
    expect(gateRelease(makeMatrix('released'), '0.2.0-rc.2').ok).toBe(true)
  })

  it('rejects malformed matrices', () => {
    const malformed: SupportMatrix = {
      ...makeMatrix('draft'),
      entries: [
        {
          ...makeMatrix('draft').entries[0]!,
          adapterId: 'dsh-0.2.x',
          contractHash: 'not-a-hash',
          status: 'released',
        },
      ],
    }
    const problems = validateMatrix(malformed)
    expect(problems.some((problem) => problem.includes('adapterId must be exact'))).toBe(true)
    expect(problems.some((problem) => problem.includes('contractHash must be a full sha256'))).toBe(true)
    expect(problems.some((problem) => problem.includes('released entries require evidence'))).toBe(true)
  })
})
