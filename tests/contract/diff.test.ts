import { describe, expect, it } from 'vitest'
import { diffContracts, renderDiffMarkdown } from '../../src/contract/diff.js'
import {
  MATRIX_SCHEMA_VERSION,
  gateRelease,
  gateSupportMatrix,
  notSupportedProfiles,
  profileEntries,
  shippedVersionsFromMatrix,
  supportedProfiles,
  validateMatrix,
} from '../../src/contract/matrix.js'
import type {
  ContractSnapshot,
  ProfileStatus,
  SupportMatrix,
  SupportMatrixEntry,
} from '../../src/contract/types.js'

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
      fontRoleHooks: false,
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

type MatrixStatus = SupportMatrixEntry['status']

const PASSED_ALL: SupportMatrixEntry['profiles'] = {
  desktop: { macos: 'passed', win32: 'passed' },
  web: { chrome: 'passed', edge: 'passed' },
}

const NARROWED: SupportMatrixEntry['profiles'] = {
  desktop: { macos: 'not-supported', win32: 'not-supported' },
  web: { chrome: 'passed', edge: 'not-supported' },
}

function makeMatrix(
  status: MatrixStatus,
  profiles: SupportMatrixEntry['profiles'] = PASSED_ALL,
  evidence = status === 'draft' || status === 'g0-g5-passed' ? [] : ['artifacts/acceptance/probe.json'],
): SupportMatrix {
  return {
    schemaVersion: MATRIX_SCHEMA_VERSION,
    updatedAt: '2026-10-24T00:00:00.000Z',
    entries: [
      {
        hostVersion: '0.2.0-rc.2',
        adapterId: 'dsh-0.2.0-rc.2-r1',
        contractHash: 'sha256:42abf8ebc5ec1df1e6abd6760680ec82fd062db650036e5e9f2a052138b6b2ce',
        status,
        profiles,
        claimTier: 'stable',
        distributionChannel: 'latest',
        certifiedBrowserVersions: ['156.0.8078.48'],
        certifiedRuntimeVersions: ['22.23.1'],
        upstream: { githubTag: 'dsh-v0.2.0-rc.2', npmVersion: '0.2.0-rc.2' },
        clientTarget: 'chrome120',
        evidence,
        notes: [],
      },
    ],
  }
}

function withProfiles(matrix: SupportMatrix, profiles: SupportMatrixEntry['profiles']): SupportMatrix {
  return { ...matrix, entries: [{ ...matrix.entries[0]!, profiles }] }
}

describe('support-matrix gates (schema v2 profile semantics)', () => {
  it('accepts a fully certified g6-approved entry', () => {
    const result = gateSupportMatrix(makeMatrix('g6-approved'), '0.2.0-rc.2')
    expect(result.problems).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('accepts a narrowed scope: one passed profile, explicit not-supported for the rest', () => {
    const matrix = makeMatrix('g6-approved', NARROWED, [])
    expect(validateMatrix(matrix)).toEqual([])
    const result = gateSupportMatrix(matrix, '0.2.0-rc.2')
    expect(result.problems).toEqual([])
    expect(result.ok).toBe(true)
    const entry = matrix.entries[0]!
    expect(supportedProfiles(entry)).toEqual(['web.chrome'])
    expect(notSupportedProfiles(entry)).toEqual(['desktop.macos', 'desktop.win32', 'web.edge'])
    expect(profileEntries(entry)).toHaveLength(4)
    expect(shippedVersionsFromMatrix(matrix)).toEqual(['0.2.0-rc.2'])
  })

  it('blocks draft entries and pending/failed in-scope profiles, ignoring not-supported ones', () => {
    expect(gateSupportMatrix(makeMatrix('draft'), '0.2.0-rc.2').ok).toBe(false)
    expect(gateSupportMatrix(makeMatrix('g0-g5-passed'), '0.2.0-rc.2').ok).toBe(false)

    const pending = gateSupportMatrix(
      withProfiles(makeMatrix('g6-approved'), {
        ...NARROWED,
        web: { chrome: 'pending', edge: 'not-supported' },
      }),
      '0.2.0-rc.2',
    )
    expect(pending.ok).toBe(false)
    expect(pending.problems.some((problem) => problem.includes('certification pending'))).toBe(true)

    const failed = gateSupportMatrix(
      makeMatrix('g6-approved', { ...PASSED_ALL, web: { chrome: 'failed', edge: 'not-supported' } }),
      '0.2.0-rc.2',
    )
    expect(failed.ok).toBe(false)
    expect(failed.problems.some((problem) => problem.includes('certification failed'))).toBe(true)

    // All profiles explicitly out of scope is not a supported release line.
    const noneInScope: SupportMatrixEntry['profiles'] = {
      desktop: { macos: 'not-supported', win32: 'not-supported' },
      web: { chrome: 'not-supported', edge: 'not-supported' },
    }
    const empty = gateSupportMatrix(makeMatrix('g6-approved', noneInScope), '0.2.0-rc.2')
    expect(empty.ok).toBe(false)
    expect(empty.problems.some((problem) => problem.includes('no supported profile'))).toBe(true)
  })

  it('requires Phase 6 release promotion plus evidence', () => {
    expect(gateRelease(makeMatrix('g6-approved'), '0.2.0-rc.2').ok).toBe(false)
    expect(gateRelease(makeMatrix('released'), '0.2.0-rc.2').ok).toBe(true)
    // Narrowed-scope release with evidence still passes.
    expect(gateRelease(makeMatrix('released', NARROWED), '0.2.0-rc.2').ok).toBe(true)
    // Released without evidence is blocked even when profiles pass.
    expect(gateRelease(makeMatrix('released', PASSED_ALL, []), '0.2.0-rc.2').ok).toBe(false)
  })

  it('validates exact schema-v2 certification fields (tier/channel/browser/runtime/upstream)', () => {
    const base = makeMatrix('released')
    expect(validateMatrix(base)).toEqual([])
    const entry = base.entries[0]!
    expect(entry.claimTier).toBe('stable')
    expect(entry.distributionChannel).toBe('latest')
    expect(entry.certifiedBrowserVersions).toEqual(['156.0.8078.48'])
    expect(entry.certifiedRuntimeVersions).toEqual(['22.23.1'])
    expect(entry.upstream).toEqual({ githubTag: 'dsh-v0.2.0-rc.2', npmVersion: '0.2.0-rc.2' })

    // Stable claims need a real upstream tag and may not sit on the next channel.
    const taglessStable: SupportMatrix = {
      ...base,
      entries: [{ ...entry, upstream: { githubTag: null, npmVersion: '0.2.0-rc.2' } }],
    }
    expect(validateMatrix(taglessStable).some((problem) => problem.includes('stable claims require a non-null upstream.githubTag'))).toBe(true)
    const nextStable: SupportMatrix = {
      ...base,
      entries: [{ ...entry, distributionChannel: 'next' }],
    }
    expect(validateMatrix(nextStable).some((problem) => problem.includes('stable claims cannot use the next distribution channel'))).toBe(true)

    // Preview claims may be tagless/next-channel.
    const preview: SupportMatrix = {
      ...base,
      entries: [
        {
          ...entry,
          claimTier: 'preview',
          distributionChannel: 'next',
          upstream: { githubTag: null, npmVersion: '0.2.0-rc.2' },
        },
      ],
    }
    expect(validateMatrix(preview)).toEqual([])

    // Exact array + full-version requirements for shipped claims.
    const loose: SupportMatrix = {
      ...base,
      entries: [{ ...entry, certifiedBrowserVersions: ['120'], certifiedRuntimeVersions: [] }],
    }
    expect(validateMatrix(loose).some((problem) => problem.includes('FULL certifiedBrowserVersions'))).toBe(true)
    expect(validateMatrix(loose).some((problem) => problem.includes('at least one exact certifiedRuntimeVersions'))).toBe(true)

    // Legacy schema-1 field is rejected outright.
    const legacy: SupportMatrix = {
      ...base,
      entries: [{ ...entry, ...({ browserSupport: [{ family: 'chrome', minVersion: 120 }] } as Record<string, unknown>) }],
    }
    expect(validateMatrix(legacy).some((problem) => problem.includes('legacy browserSupport'))).toBe(true)

    // Unknown enums and npm-version drift are rejected.
    const unknown: SupportMatrix = {
      ...base,
      entries: [
        {
          ...entry,
          claimTier: 'beta' as unknown as SupportMatrixEntry['claimTier'],
          distributionChannel: 'stable' as unknown as SupportMatrixEntry['distributionChannel'],
          upstream: { githubTag: 'dsh-v0.2.0-rc.2', npmVersion: '0.2.1-rc.2' },
        },
      ],
    }
    const unknownProblems = validateMatrix(unknown)
    expect(unknownProblems.some((problem) => problem.includes('unknown claimTier'))).toBe(true)
    expect(unknownProblems.some((problem) => problem.includes('unknown distributionChannel'))).toBe(true)
    expect(unknownProblems.some((problem) => problem.includes('must equal the host version'))).toBe(true)
    // Schema 1 is no longer accepted.
    expect(validateMatrix({ ...base, schemaVersion: 1 } as unknown as SupportMatrix).some((problem) => problem.includes('schemaVersion must be 2'))).toBe(true)
  })

  it('rejects malformed matrices and unknown profile states', () => {
    const malformed: SupportMatrix = {
      ...makeMatrix('released'),
      entries: [
        {
          ...makeMatrix('released').entries[0]!,
          adapterId: 'dsh-0.2.x',
          contractHash: 'not-a-hash',
          status: 'released',
          evidence: [],
        },
      ],
    }
    const problems = validateMatrix(malformed)
    expect(problems.some((problem) => problem.includes('adapterId must be exact'))).toBe(true)
    expect(problems.some((problem) => problem.includes('contractHash must be a full sha256'))).toBe(true)
    expect(problems.some((problem) => problem.includes('released entries require evidence'))).toBe(true)

    const unknownProfile = makeMatrix('g6-approved')
    const bad = {
      ...unknownProfile,
      entries: [
        {
          ...unknownProfile.entries[0]!,
          profiles: { ...PASSED_ALL, web: { chrome: 'skipped' as unknown as ProfileStatus, edge: 'passed' } },
        },
      ],
    } satisfies SupportMatrix
    expect(validateMatrix(bad).some((problem) => problem.includes('unknown profile status'))).toBe(true)
  })
})
