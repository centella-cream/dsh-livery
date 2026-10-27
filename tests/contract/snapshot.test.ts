import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adapterFrom } from '../../src/contract/cli.js'
import {
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
const HISTORICAL_VERSIONS = ['0.2.0-rc.2', '0.2.1-rc.2', '0.2.1-rc.3']
/** Formal support matrix: these host builds are generated/shipped (0.1.1). */
const SHIPPED_VERSIONS = ['0.2.1-rc.2', '0.2.1-rc.3']

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

describe('formal support matrix (0.1.1: Web rc.2 + Desktop rc.3)', () => {
  it('is the release authority: rc.2 Web/Chrome and rc.3 Desktop/macOS released', async () => {
    const matrix = await readFormalMatrix(workspace)
    expect(validateMatrix(matrix)).toEqual([])
    expect(shippedVersionsFromMatrix(matrix)).toEqual(SHIPPED_VERSIONS)
    expect(matrix.entries.map((entry) => entry.hostVersion)).toEqual(SHIPPED_VERSIONS)

    const web = matrix.entries.find((entry) => entry.hostVersion === '0.2.1-rc.2')!
    expect(web.adapterId).toBe('dsh-0.2.1-rc.2-r1')
    expect(web.contractHash).toBe((await readContract('0.2.1-rc.2')).contractHash)
    expect(web.status).toBe('released')
    expect(web.evidence).toEqual(['contracts/dsh/evidence/0.2.1-rc.2-web-chrome.json'])
    expect(supportedProfiles(web)).toEqual(['web.chrome'])
    expect(notSupportedProfiles(web)).toEqual(['desktop.macos', 'desktop.win32', 'web.edge'])
    expect(web.profiles.web.chrome).toBe('passed')
    expect(web.browserSupport).toEqual([{ family: 'chrome', minVersion: 155 }])

    const desktop = matrix.entries.find((entry) => entry.hostVersion === '0.2.1-rc.3')!
    expect(desktop.adapterId).toBe('dsh-0.2.1-rc.3-r1')
    expect(desktop.contractHash).toBe((await readContract('0.2.1-rc.3')).contractHash)
    // Promoted after the real Electron acceptance.
    expect(desktop.status).toBe('released')
    expect(desktop.evidence).toEqual(['contracts/dsh/evidence/0.2.1-rc.3-desktop-macos.json'])
    expect(desktop.browserSupport).toEqual([])
    expect(supportedProfiles(desktop)).toEqual(['desktop.macos'])
    expect(notSupportedProfiles(desktop)).toEqual(['desktop.win32', 'web.chrome', 'web.edge'])
    expect(desktop.profiles.desktop.macos).toBe('passed')
    expect(desktop.profiles.desktop.win32).toBe('not-supported')
  })

  it('gates in-scope profiles only: both released entries pass and pending blocks', async () => {
    const matrix = await readFormalMatrix(workspace)
    expect(gateSupportMatrix(matrix, '0.2.1-rc.2').ok).toBe(true)
    expect(gateRelease(matrix, '0.2.1-rc.2').ok).toBe(true)
    expect(gateSupportMatrix(matrix, '0.2.1-rc.3').ok).toBe(true)
    expect(gateRelease(matrix, '0.2.1-rc.3').ok).toBe(true)
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

  it('keeps the full historical candidate matrix for the certification trail', async () => {
    const proposed = await readProposedMatrix(workspace)
    expect(validateMatrix(proposed)).toEqual([])
    expect(proposed.entries.map((entry) => entry.hostVersion).sort()).toEqual([...HISTORICAL_VERSIONS].sort())
    for (const entry of proposed.entries) expect(entry.status).not.toBe('released')
    // The formal matrix is the only generation authority; the proposed file must
    // not be read for shipping decisions (asserted by the generation tests).
    expect(existsSync(join(workspace, 'contracts', 'dsh', 'support-matrix.json'))).toBe(true)
  })

  it('keeps shipped adapters in sync with their formal matrix entries', async () => {
    const matrix = await readFormalMatrix(workspace)
    const expectedClaims: Record<string, { profiles: string[]; platforms: string[]; browsers: { family: string; minVersion: number }[] }> = {
      '0.2.1-rc.2': { profiles: ['web'], platforms: ['web'], browsers: [{ family: 'chrome', minVersion: 155 }] },
      '0.2.1-rc.3': { profiles: ['desktop'], platforms: ['darwin'], browsers: [] },
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
    }
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
    expect(registry.DEFAULT_ADAPTER.hostVersion).toBe('0.2.1-rc.3')
    expect(registry.adapterForVersion('0.2.1-rc.2')?.adapterId).toBe('dsh-0.2.1-rc.2-r1')
    expect(registry.adapterForVersion('0.2.1-rc.3')?.adapterId).toBe('dsh-0.2.1-rc.3-r1')
    // Historical 0.2.0-rc.2 stays out of the shipped registry.
    expect(registry.adapterForVersion('0.2.0-rc.2')).toBeUndefined()
    for (const version of SHIPPED_VERSIONS) {
      expect(registry.adapterForVersion(version)!.capabilities['host-font-role-hooks']?.available).toBe(true)
    }
    // rc.2 and rc.3 share the render-affecting token contract → one catalog profile.
    const rc2Adapter = registry.adapterForVersion('0.2.1-rc.2')!
    const rc3Adapter = registry.adapterForVersion('0.2.1-rc.3')!
    expect(rc2Adapter.catalogProfile).toBe(rc3Adapter.catalogProfile)
    expect(rc2Adapter.tokenHash).toBe(rc3Adapter.tokenHash)
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
    expect(profile.sourceAdapters).toEqual(['0.2.1-rc.2', '0.2.1-rc.3'])
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
      dsh?: { client?: { platform?: string; external?: string[] }; compatibility?: { dshReleases?: Record<string, string> } }
    }
    expect(pkg.version).toBe('0.1.1')
    expect(pkg.engines?.dsh).toBe('0.2.1-rc.2 || 0.2.1-rc.3')
    expect(pkg.engines?.node).toBe('^22.23.1 || ^24.21.0')
    expect(pkg.dsh?.client?.platform).toBe('web')
    expect(pkg.dsh?.client?.external).toEqual([])
    expect(pkg.dsh?.compatibility?.dshReleases).toEqual({
      '0.2.1-rc.2': 'compatible',
      '0.2.1-rc.3': 'compatible',
    })
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
