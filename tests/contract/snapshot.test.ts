import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adapterFrom } from '../../src/contract/cli.js'
import { validateMatrix } from '../../src/contract/matrix.js'
import { resolveDshInstall } from '../../src/contract/snapshot.js'
import type { AdapterManifest, ContractSnapshot, SupportMatrix } from '../../src/contract/types.js'

const workspace = process.cwd()
const CERTIFIED_VERSIONS = ['0.2.0-rc.2', '0.2.1-rc.2', '0.2.1-rc.3']
const installCandidates = [
  process.env.DSH_INSTALL,
  '/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh',
].filter((value): value is string => typeof value === 'string' && value !== '')

async function readContract(version: string): Promise<ContractSnapshot> {
  return JSON.parse(await readFile(join(workspace, 'contracts', 'dsh', version, 'contract.json'), 'utf8')) as ContractSnapshot
}

async function readMatrix(): Promise<SupportMatrix> {
  return JSON.parse(
    await readFile(join(workspace, 'contracts', 'dsh', 'support-matrix.proposed.json'), 'utf8'),
  ) as SupportMatrix
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

describe('frozen multi-version contracts', () => {
  it('freezes the six contract hashes for every certified host version', async () => {
    for (const version of CERTIFIED_VERSIONS) {
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
    const linux = await readContract('0.2.1-rc.2')
    expect(linux.source.kind).toBe('installed-package')
    expect(linux.source.nodeRange).toBe('^22.23.1')
  })

  it('keeps adapters in sync with contracts and the support matrix', async () => {
    const matrix = await readMatrix()
    for (const version of CERTIFIED_VERSIONS) {
      const contract = await readContract(version)
      const adapter = JSON.parse(
        await readFile(join(workspace, 'contracts', 'dsh', version, 'adapter.json'), 'utf8'),
      ) as AdapterManifest
      const expected = adapterFrom(contract, matrix)
      expect(adapter).toEqual(expected)
      expect(adapter.adapterId).toBe(contract.adapterId)
      expect(adapter.contractHash).toBe(contract.contractHash)
      expect(adapter.loaderAbi).toBe(contract.hashes.loaderAbi)
      expect(adapter.hostApiContract).toBe(contract.hashes.hostApi)
      expect(adapter.clientApiContract).toBe(contract.hashes.clientApi)
      expect(adapter.tokenContract).toBe(contract.hashes.token)
      expect(adapter.layoutContract).toBe(contract.hashes.layout)
      expect(adapter.profileSchema).toBe(contract.hashes.profileSchema)
    }
    expect(validateMatrix(matrix)).toEqual([])
    expect(matrix.entries.map((entry) => entry.hostVersion).sort()).toEqual([...CERTIFIED_VERSIONS].sort())
    for (const entry of matrix.entries) expect(entry.status).not.toBe('released')
    expect(existsSync(join(workspace, 'contracts', 'dsh', 'support-matrix.json'))).toBe(false)
  })

  it('emits a deterministic multi-adapter registry with shared catalog profiles', async () => {
    const registry = await import('../../src/generated/contract.js')
    expect(registry.ADAPTERS.map((adapter) => adapter.hostVersion)).toEqual([...CERTIFIED_VERSIONS].sort())
    expect(registry.SUPPORTED_HOST_VERSIONS).toEqual([...CERTIFIED_VERSIONS].sort())
    expect(registry.adapterForVersion('0.2.1-rc.2')?.adapterId).toBe('dsh-0.2.1-rc.2-r1')
    expect(registry.adapterForVersion('0.2.1-rc.9')).toBeUndefined()
    const oldProfile = registry.adapterForVersion('0.2.0-rc.2')!.catalogProfile
    const webProfile = registry.adapterForVersion('0.2.1-rc.2')!.catalogProfile
    const desktopProfile = registry.adapterForVersion('0.2.1-rc.3')!.catalogProfile
    expect(webProfile).toBe(desktopProfile)
    expect(webProfile).not.toBe(oldProfile)
    expect(registry.adapterForVersion('0.2.1-rc.2')!.capabilities['host-font-role-hooks']?.available).toBe(true)
    expect(registry.adapterForVersion('0.2.0-rc.2')!.capabilities['host-font-role-hooks']?.available).toBe(false)

    const stock = await import('../../src/generated/stock.js')
    expect(stock.STOCK_VERSIONS).toEqual([...CERTIFIED_VERSIONS].sort())
    expect(stock.stockForVersion('0.2.1-rc.2')!.tokenContractHash).toBe(
      (await readContract('0.2.1-rc.2')).hashes.token,
    )
    expect(stock.stockForVersion('0.2.1-rc.3')!.tokens['--dsw-font-family']?.light).toContain('--dsh-font-family-text')
    expect(stock.stockForVersion('0.2.0-rc.2')!.tokens['--dsw-font-family']?.light).not.toContain('--dsh-font-family-text')
  })

  it('keeps the exact support declarations in package metadata', async () => {
    const pkg = JSON.parse(await readFile(join(workspace, 'package.json'), 'utf8')) as {
      engines?: { dsh?: string; node?: string }
      dsh?: { client?: { platform?: string; external?: string[] } }
    }
    expect(pkg.engines?.dsh).toBe(CERTIFIED_VERSIONS.join(' || '))
    expect(pkg.engines?.node).toBe('^22.23.1 || ^24.21.0')
    expect(pkg.dsh?.client?.platform).toBe('web')
    expect(pkg.dsh?.client?.external).toEqual([])
  })
})

describe.skipIf(installRoot === undefined)('installed host verification', () => {
  it('verifies the installed CLI contract against its committed snapshot', async () => {
    const install = await resolveDshInstall(installRoot!)
    const version = (JSON.parse(await readFile(join(install.dshRoot, 'package.json'), 'utf8')) as { version: string }).version
    if (!CERTIFIED_VERSIONS.includes(version)) return
    const committed = await readContract(version)
    expect(committed.hostVersion).toBe(version)
  })
})
