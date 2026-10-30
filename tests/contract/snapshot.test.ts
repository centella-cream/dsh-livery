import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adapterFrom } from '../../src/contract/cli.js'
import {
  CLAIM_TIERS,
  DISTRIBUTION_CHANNELS,
  MATRIX_SCHEMA_VERSION,
  gateRelease,
  gateSupportMatrix,
  notSupportedProfiles,
  readFormalMatrix,
  readProposedMatrix,
  shippedVersionsFromMatrix,
  supportedProfiles,
  validateMatrix,
} from '../../src/contract/matrix.js'
import { renderGeneratedRegistry, resolveDshInstall, shippedSnapshots } from '../../src/contract/snapshot.js'
import type { AdapterManifest, ContractSnapshot, SupportMatrix } from '../../src/contract/types.js'

const workspace = process.cwd()

/** Every frozen contract snapshot stays on disk for audit/diff. */
const HISTORICAL_VERSIONS = ['0.2.0-rc.2', '0.2.1-rc.2', '0.2.1-rc.3', '0.2.1-rc.4', '0.2.1-rc.5']
/** Formal support matrix: these host builds are generated/shipped (0.1.3). */
const SHIPPED_VERSIONS = ['0.2.1-rc.2', '0.2.1-rc.3', '0.2.1-rc.4', '0.2.1-rc.5']

// Optional local verification: set DSH_INSTALL to a matching @deepseek-ai/dsh
// package root (e.g. `.../node_modules/@deepseek-ai/dsh`). CI skips these checks.
const installCandidates = [process.env.DSH_INSTALL].filter(
  (value): value is string => typeof value === 'string' && value !== '',
)

async function readContract(version: string): Promise<ContractSnapshot> {
  return JSON.parse(await readFile(join(workspace, 'contracts', 'dsh', version, 'contract.json'), 'utf8')) as ContractSnapshot
}

async function findInstall(): Promise<string | undefined> {
  for (const candidate of installCandidates) {
    try {
      const install = await resolveDshInstall(candidate)
      if (existsSync(join(install.dshRoot, 'package.json'))) return candidate
    } catch {
      // try the next candidate
    }
  }
  return undefined
}

const installRoot = await findInstall()

describe('frozen historical contracts', () => {
  it('keeps the six contract hashes for every frozen host snapshot', async () => {
    for (const version of HISTORICAL_VERSIONS) {
      const contract = await readContract(version)
      expect(contract.hostVersion).toBe(version)
      expect(contract.adapterId).toBe(`dsh-${version}-r1`)
      for (const hash of Object.values(contract.hashes)) {
        expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/u)
      }
      expect(contract.contractHash).toMatch(/^sha256:[0-9a-f]{64}$/u)
      expect(contract.tokens.count).toBeGreaterThanOrEqual(400)
    }
  })

  it('records the exact 0.2.1 contract changes', async () => {
    const old = await readContract('0.2.0-rc.2')
    const next = await readContract('0.2.1-rc.2')
    const nextRc3 = await readContract('0.2.1-rc.3')

    // Loader ABI: 0.2.1 seeds two extra modules.
    expect(old.loaderAbi.platformModules.modules).toHaveLength(9)
    expect(next.loaderAbi.platformModules.modules).toEqual(
      expect.arrayContaining(['zod', '@tanstack/react-virtual', '@deepseek-ai/dsh-client-ui-slots']),
    )
    expect(nextRc3.loaderAbi.platformModules.modules).toEqual(next.loaderAbi.platformModules.modules)

    // Font role hooks: absent on 0.2.0, present on 0.2.1.
    expect(old.capabilities.fontRoleHooks).not.toBe(true)
    expect(next.capabilities.fontRoleHooks).toBe(true)
    expect(nextRc3.capabilities.fontRoleHooks).toBe(true)

    // Token contract changed on 0.2.1 (font ladder through host hooks).
    expect(next.hashes.token).not.toBe(old.hashes.token)
    expect(next.tokens.consumed.length).toBe(176)
    // Host/Client/profile-schema contracts did not change.
    expect(next.hashes.hostApi).toBe(old.hashes.hostApi)
    expect(next.hashes.clientApi).toBe(old.hashes.clientApi)
    expect(next.hashes.profileSchema).toBe(old.hashes.profileSchema)
    // rc.2 and rc.3 share the render-affecting token contract.
    expect(nextRc3.hashes.token).toBe(next.hashes.token)
  })

  it('certifies the desktop packaged-app snapshot honestly', async () => {
    const desktop = await readContract('0.2.1-rc.3')
    expect(desktop.source.kind).toBe('packaged-app')
    expect(desktop.source.nodeRange).toBe('^24.21.0')
    expect(desktop.source.prepared?.extractor).toBe('scripts/prepare-desktop-contract.mjs')
    expect(desktop.source.prepared?.archiveSha256).toMatch(/^sha256:[0-9a-f]{64}$/u)
    expect(desktop.source.prepared?.supplements).toContain('dsh-client-ui-slots@0.2.1-rc.3')
    const web = await readContract('0.2.1-rc.2')
    expect(web.source.kind).toBe('installed-package')
    expect(web.source.nodeRange).toBe('^22.23.1')
  })
})

describe('formal support matrix schema v2 (0.1.3 exact certification claims)', () => {
  it('is the release authority: exact stable/preview claims with browser/runtime/upstream provenance', async () => {
    const matrix = await readFormalMatrix(workspace)
    expect(matrix.schemaVersion).toBe(MATRIX_SCHEMA_VERSION)
    expect(validateMatrix(matrix)).toEqual([])
    expect(shippedVersionsFromMatrix(matrix)).toEqual(SHIPPED_VERSIONS)
    expect(matrix.entries.map((entry) => entry.hostVersion)).toEqual(SHIPPED_VERSIONS)

    // Schema v1's family/minVersion table is gone everywhere.
    for (const entry of matrix.entries) {
      expect('browserSupport' in (entry as unknown as Record<string, unknown>)).toBe(false)
      expect(CLAIM_TIERS).toContain(entry.claimTier)
      expect(DISTRIBUTION_CHANNELS).toContain(entry.distributionChannel)
    }

    // 0.2.1-rc.2: stable Web/Chrome on npm latest, exact full versions.
    const web = matrix.entries.find((entry) => entry.hostVersion === '0.2.1-rc.2')!
    expect(web.adapterId).toBe('dsh-0.2.1-rc.2-r1')
    expect(web.contractHash).toBe((await readContract('0.2.1-rc.2')).contractHash)
    expect(web.status).toBe('released')
    expect(web.claimTier).toBe('stable')
    expect(web.distributionChannel).toBe('latest')
    expect(web.certifiedBrowserVersions).toEqual(['156.0.8078.48'])
    expect(web.certifiedRuntimeVersions).toEqual(['22.23.1'])
    expect(web.upstream).toEqual({ githubTag: 'dsh-v0.2.1-rc.2', npmVersion: '0.2.1-rc.2' })
    expect(web.evidence).toEqual(['contracts/dsh/evidence/0.1.4/0.2.1-rc.2-web-chrome.json'])
    expect(supportedProfiles(web)).toEqual(['web.chrome'])
    expect(notSupportedProfiles(web)).toEqual(['desktop.macos', 'desktop.win32', 'web.edge'])
    expect(web.profiles.web.chrome).toBe('passed')

    // 0.2.1-rc.3: stable Desktop app, Electron Chromium + Node 24 exact versions.
    const desktop = matrix.entries.find((entry) => entry.hostVersion === '0.2.1-rc.3')!
    expect(desktop.adapterId).toBe('dsh-0.2.1-rc.3-r1')
    expect(desktop.contractHash).toBe((await readContract('0.2.1-rc.3')).contractHash)
    expect(desktop.status).toBe('released')
    expect(desktop.claimTier).toBe('stable')
    expect(desktop.distributionChannel).toBe('desktop-app')
    expect(desktop.certifiedBrowserVersions).toEqual(['152.0.7977.130'])
    expect(desktop.certifiedRuntimeVersions).toEqual(['24.21.0'])
    expect(desktop.upstream).toEqual({ githubTag: 'dsh-v0.2.1-rc.3', npmVersion: '0.2.1-rc.3' })
    expect(desktop.evidence).toEqual(['contracts/dsh/evidence/0.1.4/0.2.1-rc.3-desktop-macos.json'])
    expect(supportedProfiles(desktop)).toEqual(['desktop.macos'])
    expect(notSupportedProfiles(desktop)).toEqual(['desktop.win32', 'web.chrome', 'web.edge'])
    expect(desktop.profiles.desktop.macos).toBe('passed')

    // 0.2.1-rc.4: next-channel preview, no upstream GitHub tag.
    const preview = matrix.entries.find((entry) => entry.hostVersion === '0.2.1-rc.4')!
    expect(preview.adapterId).toBe('dsh-0.2.1-rc.4-r1')
    expect(preview.contractHash).toBe((await readContract('0.2.1-rc.4')).contractHash)
    expect(preview.status).toBe('released')
    expect(preview.claimTier).toBe('preview')
    expect(preview.distributionChannel).toBe('next')
    expect(preview.certifiedBrowserVersions).toEqual(['156.0.8078.48'])
    expect(preview.certifiedRuntimeVersions).toEqual(['22.23.1'])
    expect(preview.upstream).toEqual({ githubTag: 'dsh-v0.2.1-rc.4', npmVersion: '0.2.1-rc.4' })
    expect(preview.evidence).toEqual(['contracts/dsh/evidence/0.1.4/0.2.1-rc.4-web-chrome.json'])
    expect(supportedProfiles(preview)).toEqual(['web.chrome'])
    expect(preview.profiles.web.chrome).toBe('passed')
    expect(preview.profiles.desktop.macos).toBe('not-supported')
  })

  it('rejects schema-v1 matrices, legacy browserSupport and non-exact claims', async () => {
    const matrix = await readFormalMatrix(workspace)
    const schema1 = { ...matrix, schemaVersion: 1 } as unknown as SupportMatrix
    expect(validateMatrix(schema1).some((problem) => problem.includes('schemaVersion must be 2'))).toBe(true)

    const legacy: SupportMatrix = {
      ...matrix,
      entries: matrix.entries.map((entry) => ({
        ...entry,
        ...({ browserSupport: [{ family: 'chrome', minVersion: 155 }] } as Record<string, unknown>),
      })),
    }
    expect(validateMatrix(legacy).some((problem) => problem.includes('legacy browserSupport'))).toBe(true)

    const looseVersions: SupportMatrix = {
      ...matrix,
      entries: matrix.entries.map((entry) =>
        entry.hostVersion === '0.2.1-rc.2'
          ? { ...entry, certifiedBrowserVersions: ['156'], certifiedRuntimeVersions: ['22.23'] }
          : entry,
      ),
    }
    const loose = validateMatrix(looseVersions)
    expect(loose.some((problem) => problem.includes('FULL certifiedBrowserVersions'))).toBe(true)
    expect(loose.some((problem) => problem.includes('certifiedRuntimeVersions entry "22.23" is not an exact Node version'))).toBe(true)

    const missingArrays: SupportMatrix = {
      ...matrix,
      entries: matrix.entries.map((entry) =>
        entry.hostVersion === '0.2.1-rc.2'
          ? { ...entry, certifiedBrowserVersions: [], certifiedRuntimeVersions: [] }
          : entry,
      ),
    }
    expect(validateMatrix(missingArrays).some((problem) => problem.includes('at least one exact certifiedBrowserVersions'))).toBe(true)
  })

  it('requires stable claims to have an upstream tag and a non-next channel; preview may be tagged', async () => {
    const matrix = await readFormalMatrix(workspace)
    const taglessStable: SupportMatrix = {
      ...matrix,
      entries: matrix.entries.map((entry) =>
        entry.hostVersion === '0.2.1-rc.2'
          ? { ...entry, upstream: { githubTag: null, npmVersion: '0.2.1-rc.2' } }
          : entry,
      ),
    }
    expect(validateMatrix(taglessStable).some((problem) => problem.includes('stable claims require a non-null upstream.githubTag'))).toBe(true)

    const nextStable: SupportMatrix = {
      ...matrix,
      entries: matrix.entries.map((entry) =>
        entry.hostVersion === '0.2.1-rc.2' ? { ...entry, distributionChannel: 'next' as const } : entry,
      ),
    }
    expect(validateMatrix(nextStable).some((problem) => problem.includes('stable claims cannot use the next distribution channel'))).toBe(true)

    // Preview with a null tag is valid (the rc.4 entry already proves it), and a
    // mismatched npm version is rejected.
    const mismatched: SupportMatrix = {
      ...matrix,
      entries: matrix.entries.map((entry) =>
        entry.hostVersion === '0.2.1-rc.4'
          ? { ...entry, upstream: { githubTag: null, npmVersion: '0.2.1-rc.5' } }
          : entry,
      ),
    }
    expect(validateMatrix(mismatched).some((problem) => problem.includes('must equal the host version'))).toBe(true)
    const previewEntry = matrix.entries.find((entry) => entry.hostVersion === '0.2.1-rc.4')!
    expect(previewEntry.claimTier).toBe('preview')
    expect(previewEntry.upstream.githubTag).toBe('dsh-v0.2.1-rc.4')
    expect(validateMatrix(matrix)).toEqual([])
  })

  it('gates in-scope profiles only: both released entries pass and pending blocks', async () => {
    const matrix = await readFormalMatrix(workspace)
    expect(gateSupportMatrix(matrix, '0.2.1-rc.2').ok).toBe(true)
    expect(gateRelease(matrix, '0.2.1-rc.2').ok).toBe(true)
    expect(gateSupportMatrix(matrix, '0.2.1-rc.3').ok).toBe(true)
    expect(gateRelease(matrix, '0.2.1-rc.3').ok).toBe(true)
    expect(gateSupportMatrix(matrix, '0.2.1-rc.4').ok).toBe(true)
    expect(gateRelease(matrix, '0.2.1-rc.4').ok).toBe(true)
    // Historical snapshot is not in the formal matrix and cannot ship.
    expect(gateSupportMatrix(matrix, '0.2.0-rc.2').ok).toBe(false)
    expect(gateRelease(matrix, '0.2.0-rc.2').ok).toBe(false)

    // Pre-acceptance: pending desktop.macos + no evidence blocks both gates.
    const pending: SupportMatrix = {
      ...matrix,
      entries: matrix.entries.map((entry) =>
        entry.hostVersion === '0.2.1-rc.3'
          ? {
              ...entry,
              status: 'g6-approved',
              profiles: { ...entry.profiles, desktop: { macos: 'pending', win32: 'not-supported' } },
              evidence: [],
            }
          : entry,
      ),
    }
    const support = gateSupportMatrix(pending, '0.2.1-rc.3')
    expect(support.ok).toBe(false)
    expect(support.problems.some((problem) => problem.includes('desktop.macos: certification pending'))).toBe(true)
    expect(gateRelease(pending, '0.2.1-rc.3').ok).toBe(false)
  })

  it('keeps the full historical candidate matrix on schema v2 for the certification trail', async () => {
    const proposed = await readProposedMatrix(workspace)
    expect(proposed.schemaVersion).toBe(MATRIX_SCHEMA_VERSION)
    expect(validateMatrix(proposed)).toEqual([])
    expect(proposed.entries.map((entry) => entry.hostVersion).sort()).toEqual([...HISTORICAL_VERSIONS].sort())
    for (const entry of proposed.entries) expect(entry.status).not.toBe('released')
    // The historical 0.2.0 claim keeps the exact legacy browser version, and the
    // rc.4 preview keeps its tagless next-channel provenance.
    const legacy = proposed.entries.find((entry) => entry.hostVersion === '0.2.0-rc.2')!
    expect(legacy.certifiedBrowserVersions).toEqual(['120'])
    expect(legacy.certifiedRuntimeVersions).toEqual(['22.23.1'])
    expect(legacy.upstream).toEqual({ githubTag: 'dsh-v0.2.0-rc.2', npmVersion: '0.2.0-rc.2' })
    const preview = proposed.entries.find((entry) => entry.hostVersion === '0.2.1-rc.4')!
    expect(preview.claimTier).toBe('preview')
    expect(preview.upstream.githubTag).toBeNull()
    // The formal matrix is the only generation authority; the proposed file must
    // not be read for shipping decisions (asserted by the generation tests).
    expect(existsSync(join(workspace, 'contracts', 'dsh', 'support-matrix.json'))).toBe(true)
  })

  it('keeps shipped adapters in sync with their formal matrix entries', async () => {
    const matrix = await readFormalMatrix(workspace)
    const expectedClaims: Record<
      string,
      { profiles: string[]; platforms: string[]; browsers: { family: string; versions: string[] }[] }
    > = {
      '0.2.1-rc.2': {
        profiles: ['web'],
        platforms: ['web'],
        browsers: [{ family: 'chrome', versions: ['156.0.8078.48'] }],
      },
      '0.2.1-rc.3': {
        profiles: ['desktop'],
        platforms: ['darwin'],
        // Desktop certifies the Electron renderer's embedded Chromium version.
        browsers: [{ family: 'chromium', versions: ['152.0.7977.130'] }],
      },
      '0.2.1-rc.4': {
        profiles: ['web'],
        platforms: ['web'],
        browsers: [{ family: 'chrome', versions: ['156.0.8078.48'] }],
      },
      '0.2.1-rc.5': {
        profiles: ['web', 'desktop'],
        platforms: ['web', 'darwin'],
        browsers: [
          { family: 'chrome', versions: ['156.0.8078.48', '152.0.7977.130'] },
          { family: 'chromium', versions: ['156.0.8078.48', '152.0.7977.130'] },
        ],
      },
    }
    for (const version of SHIPPED_VERSIONS) {
      const contract = await readContract(version)
      const adapter = JSON.parse(
        await readFile(join(workspace, 'contracts', 'dsh', version, 'adapter.json'), 'utf8'),
      ) as AdapterManifest
      expect(adapter).toEqual(adapterFrom(contract, matrix))
      expect(adapter.adapterId).toBe(contract.adapterId)
      expect(adapter.contractHash).toBe(contract.contractHash)
      expect(adapter.verifiedProfiles).toEqual(expectedClaims[version]!.profiles)
      expect(adapter.verifiedPlatforms).toEqual(expectedClaims[version]!.platforms)
      expect(adapter.verifiedBrowsers).toEqual(expectedClaims[version]!.browsers)
      // Certification claims are exact versions only: no minVersion fallback.
      for (const browser of adapter.verifiedBrowsers) {
        expect(browser.versions.length).toBeGreaterThan(0)
        expect('minVersion' in (browser as unknown as Record<string, unknown>)).toBe(false)
      }
    }
  })

  it('keeps the historical 0.2.0-rc.2 adapter claim exact without shipping it', async () => {
    const adapter = JSON.parse(
      await readFile(join(workspace, 'contracts', 'dsh', '0.2.0-rc.2', 'adapter.json'), 'utf8'),
    ) as AdapterManifest
    expect(adapter.verifiedBrowsers).toEqual([{ family: 'chrome', versions: ['120'] }])
    const registry = await import('../../src/generated/contract.js')
    expect(registry.adapterForVersion('0.2.0-rc.2')).toBeUndefined()
    expect(registry.SUPPORTED_HOST_VERSIONS).not.toContain('0.2.0-rc.2')
  })
})

describe('generated shipped registry', () => {
  it('generates only formal-matrix approved adapters and matching stock snapshots', async () => {
    const registry = await import('../../src/generated/contract.js')
    const matrix = await readFormalMatrix(workspace)
    const shipped = await shippedSnapshots(workspace)
    expect(registry.ADAPTERS.map((adapter) => adapter.hostVersion)).toEqual(SHIPPED_VERSIONS)
    expect(registry.ADAPTER_IDENTITIES.map((identity) => identity.hostVersion)).toEqual(SHIPPED_VERSIONS)
    expect(registry.SUPPORTED_HOST_VERSIONS).toEqual(SHIPPED_VERSIONS)
    expect(registry.SUPPORTED_HOST_VERSIONS_LITE).toEqual(SHIPPED_VERSIONS)
    expect(registry.DEFAULT_ADAPTER.hostVersion).toBe('0.2.1-rc.5')
    expect(registry.adapterForVersion('0.2.1-rc.2')?.adapterId).toBe('dsh-0.2.1-rc.2-r1')
    expect(registry.adapterForVersion('0.2.1-rc.3')?.adapterId).toBe('dsh-0.2.1-rc.3-r1')
    expect(registry.adapterForVersion('0.2.1-rc.4')?.adapterId).toBe('dsh-0.2.1-rc.4-r1')
    // Historical 0.2.0-rc.2 stays out of the shipped registry.
    expect(registry.adapterForVersion('0.2.0-rc.2')).toBeUndefined()
    for (const version of SHIPPED_VERSIONS) {
      expect(registry.adapterForVersion(version)!.capabilities['host-font-role-hooks']?.available).toBe(true)
    }
    // rc.2 and rc.3 share the render-affecting token contract → one catalog profile.
    const rc2Adapter = registry.adapterForVersion('0.2.1-rc.2')!
    const rc3Adapter = registry.adapterForVersion('0.2.1-rc.3')!
    const rc4Adapter = registry.adapterForVersion('0.2.1-rc.4')!
    expect(rc2Adapter.catalogProfile).toBe(rc3Adapter.catalogProfile)
    expect(rc2Adapter.catalogProfile).toBe(rc4Adapter.catalogProfile)
    expect(rc2Adapter.tokenHash).toBe(rc3Adapter.tokenHash)
    expect(rc2Adapter.tokenHash).toBe(rc4Adapter.tokenHash)
    // Every generated adapter is a formal-matrix shipped entry.
    expect(shipped.map((snapshot) => snapshot.hostVersion)).toEqual(SHIPPED_VERSIONS)
    for (const adapter of registry.ADAPTERS) {
      const entry = matrix.entries.find((candidate) => candidate.hostVersion === adapter.hostVersion)
      expect(entry?.status === 'g6-approved' || entry?.status === 'released').toBe(true)
    }

    const stock = await import('../../src/generated/stock.js')
    expect(stock.STOCK_VERSIONS).toEqual(SHIPPED_VERSIONS)
    expect(stock.stockForVersion('0.2.0-rc.2')).toBeUndefined()
    for (const version of SHIPPED_VERSIONS) {
      expect(stock.stockForVersion(version)!.tokenContractHash).toBe((await readContract(version)).hashes.token)
      expect(stock.stockForVersion(version)!.tokens['--dsw-font-family']?.light).toContain('--dsh-font-family-text')
    }

    // Catalog profile dedupe: both adapters serve ONE generated profile.
    const liveries = await import('../../src/generated/liveries.js')
    expect(liveries.CATALOG_PROFILE_IDS).toHaveLength(1)
    const profile = liveries.CATALOG_PROFILES[liveries.CATALOG_PROFILE_IDS[0]!]!
    expect(profile.sourceAdapters).toEqual(['0.2.1-rc.2', '0.2.1-rc.3', '0.2.1-rc.4', '0.2.1-rc.5'])
    expect(profile.liveries).toHaveLength(24)
  })

  it('is byte-reproducible from the formal matrix + committed snapshots', async () => {
    const shipped = await shippedSnapshots(workspace)
    const generated = await readFile(join(workspace, 'src', 'generated', 'contract.ts'), 'utf8')
    expect(generated).toBe(renderGeneratedRegistry(shipped))
    const header = generated.slice(0, 900)
    expect(header).toContain('Shipped adapter registry')
    expect(header).toContain('support-matrix.json')
    // Historical contracts remain on disk even though they are not generated.
    for (const version of HISTORICAL_VERSIONS) {
      expect(existsSync(join(workspace, 'contracts', 'dsh', version, 'contract.json'))).toBe(true)
    }
  })

  it('keeps the exact narrowed support declarations in package metadata', async () => {
    const pkg = JSON.parse(await readFile(join(workspace, 'package.json'), 'utf8')) as {
      version?: string
      engines?: { dsh?: string; node?: string }
      files?: string[]
      dsh?: { client?: { platform?: string; external?: string[] }; compatibility?: { dshReleases?: Record<string, string> } }
    }
    expect(pkg.version).toBe('0.1.5')
    expect(pkg.engines?.dsh).toBe('0.2.1-rc.2 || 0.2.1-rc.3 || 0.2.1-rc.4 || 0.2.1-rc.5')
    expect(pkg.engines?.node).toBe('^22.23.1 || ^24.21.0')
    expect(pkg.dsh?.client?.platform).toBe('web')
    expect(pkg.dsh?.client?.external).toEqual([])
    expect(pkg.dsh?.compatibility?.dshReleases).toEqual({
      '0.2.1-rc.2': 'compatible',
      '0.2.1-rc.3': 'compatible',
      '0.2.1-rc.4': 'compatible',
      '0.2.1-rc.5': 'compatible',
    })
    expect(pkg.files).toContain('contracts/dsh/0.2.1-rc.4')
    expect(pkg.files).toContain('contracts/dsh/0.2.1-rc.5')
    expect(pkg.files).not.toContain('contracts/dsh/0.2.0-rc.2')
  })
})

describe.skipIf(installRoot === undefined)('installed host verification', () => {
  it('verifies the installed CLI contract against its committed snapshot', async () => {
    const install = await resolveDshInstall(installRoot!)
    const version = (JSON.parse(await readFile(join(install.dshRoot, 'package.json'), 'utf8')) as { version: string }).version
    if (!HISTORICAL_VERSIONS.includes(version)) return
    const committed = await readContract(version)
    expect(committed.hostVersion).toBe(version)
  })
})
