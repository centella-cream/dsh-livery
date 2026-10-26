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
/** Formal support matrix: only this host build is generated/shipped. */
const SHIPPED_VERSIONS = ['0.2.1-rc.2']

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

describe('formal support matrix (round 15 narrowed release line)', () => {
  it('is the release authority: 0.2.1-rc.2 + Web/Chrome only, everything else explicitly not-supported', async () => {
    const matrix = await readFormalMatrix(workspace)
    expect(validateMatrix(matrix)).toEqual([])
    expect(shippedVersionsFromMatrix(matrix)).toEqual(SHIPPED_VERSIONS)
    expect(matrix.entries.map((entry) => entry.hostVersion)).toEqual(SHIPPED_VERSIONS)
    const entry = matrix.entries[0]!
    expect(entry.adapterId).toBe('dsh-0.2.1-rc.2-r1')
    expect(entry.contractHash).toBe((await readContract('0.2.1-rc.2')).contractHash)
    // g6-approved while acceptance evidence is collected; promotion to released
    // happens only in the release transaction with evidence.
    expect(entry.status).toBe('g6-approved')
    expect(entry.evidence).toEqual([])
    expect(supportedProfiles(entry)).toEqual(['web.chrome'])
    expect(notSupportedProfiles(entry)).toEqual(['desktop.macos', 'desktop.win32', 'web.edge'])
    expect(entry.profiles.web.chrome).toBe('passed')
    expect(entry.profiles.web.edge).toBe('not-supported')
    expect(entry.profiles.desktop).toEqual({ macos: 'not-supported', win32: 'not-supported' })
  })

  it('gates in-scope profiles only: g6-approved supports, missing/pending/failed fail, release needs released+evidence', async () => {
    const matrix = await readFormalMatrix(workspace)
    expect(gateSupportMatrix(matrix, '0.2.1-rc.2').ok).toBe(true)
    // g6-approved may be generated for acceptance builds, but not released.
    expect(gateRelease(matrix, '0.2.1-rc.2').ok).toBe(false)
    expect(gateRelease(matrix, '0.2.1-rc.2').problems.some((problem) => problem.includes('Phase 6'))).toBe(true)
    // Historical snapshots are not in the formal matrix and cannot ship.
    for (const version of ['0.2.0-rc.2', '0.2.1-rc.3']) {
      expect(gateSupportMatrix(matrix, version).ok).toBe(false)
      expect(gateRelease(matrix, version).ok).toBe(false)
    }

    const released: SupportMatrix = {
      ...matrix,
      entries: [{ ...matrix.entries[0]!, status: 'released', evidence: ['artifacts/acceptance/probe.json'] }],
    }
    expect(gateRelease(released, '0.2.1-rc.2').ok).toBe(true)
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

  it('keeps shipped adapters in sync with the formal matrix entry', async () => {
    const matrix = await readFormalMatrix(workspace)
    for (const version of SHIPPED_VERSIONS) {
      const contract = await readContract(version)
      const adapter = JSON.parse(
        await readFile(join(workspace, 'contracts', 'dsh', version, 'adapter.json'), 'utf8'),
      ) as AdapterManifest
      expect(adapter).toEqual(adapterFrom(contract, matrix))
      expect(adapter.adapterId).toBe(contract.adapterId)
      expect(adapter.contractHash).toBe(contract.contractHash)
      // Narrowed release line: only the web platform is claimed, with Chrome.
      expect(adapter.verifiedProfiles).toEqual(['web'])
      expect(adapter.verifiedPlatforms).toEqual(['web'])
      expect(adapter.verifiedBrowsers).toEqual([{ family: 'chrome', minVersion: 120 }])
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
    expect(registry.DEFAULT_ADAPTER.hostVersion).toBe('0.2.1-rc.2')
    expect(registry.adapterForVersion('0.2.1-rc.2')?.adapterId).toBe('dsh-0.2.1-rc.2-r1')
    for (const version of ['0.2.0-rc.2', '0.2.1-rc.3']) expect(registry.adapterForVersion(version)).toBeUndefined()
    expect(registry.adapterForVersion('0.2.1-rc.2')!.capabilities['host-font-role-hooks']?.available).toBe(true)
    // Every generated adapter is a formal-matrix shipped entry.
    expect(shipped.map((snapshot) => snapshot.hostVersion)).toEqual(SHIPPED_VERSIONS)
    for (const adapter of registry.ADAPTERS) {
      const entry = matrix.entries.find((candidate) => candidate.hostVersion === adapter.hostVersion)
      expect(entry?.status === 'g6-approved' || entry?.status === 'released').toBe(true)
    }

    const stock = await import('../../src/generated/stock.js')
    expect(stock.STOCK_VERSIONS).toEqual(SHIPPED_VERSIONS)
    expect(stock.stockForVersion('0.2.0-rc.2')).toBeUndefined()
    expect(stock.stockForVersion('0.2.1-rc.3')).toBeUndefined()
    expect(stock.stockForVersion('0.2.1-rc.2')!.tokenContractHash).toBe((await readContract('0.2.1-rc.2')).hashes.token)
    expect(stock.stockForVersion('0.2.1-rc.2')!.tokens['--dsw-font-family']?.light).toContain('--dsh-font-family-text')
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
      engines?: { dsh?: string; node?: string }
      dsh?: { client?: { platform?: string; external?: string[] }; compatibility?: { dshReleases?: Record<string, string> } }
    }
    expect(pkg.engines?.dsh).toBe('0.2.1-rc.2')
    expect(pkg.engines?.node).toBe('^22.23.1 || ^24.21.0')
    expect(pkg.dsh?.client?.platform).toBe('web')
    expect(pkg.dsh?.client?.external).toEqual([])
    expect(pkg.dsh?.compatibility?.dshReleases).toEqual({ '0.2.1-rc.2': 'compatible' })
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
