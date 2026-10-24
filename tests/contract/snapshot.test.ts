import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveDshInstall } from '../../src/contract/snapshot.js'
import { validateMatrix } from '../../src/contract/matrix.js'
import type { AdapterManifest, ContractSnapshot, SupportMatrix } from '../../src/contract/types.js'

const workspace = process.cwd()
const installCandidates = [
  process.env.DSH_INSTALL,
  '/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh',
].filter((value): value is string => typeof value === 'string' && value !== '')

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

describe.skipIf(installRoot === undefined)('frozen contract snapshot', () => {
  it('matches the committed contract on the target host build', async () => {
    const committed = JSON.parse(
      await readFile(join(workspace, 'contracts', 'dsh', '0.2.0-rc.2', 'contract.json'), 'utf8'),
    ) as ContractSnapshot
    expect(committed.hostVersion).toBe('0.2.0-rc.2')
    expect(committed.adapterId).toBe('dsh-0.2.0-rc.2-r1')
    for (const hash of Object.values(committed.hashes)) {
      expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/u)
    }
    expect(committed.contractHash).toMatch(/^sha256:[0-9a-f]{64}$/u)

    // Token contract: complete alias/specific families and a non-trivial consumed set.
    expect(committed.tokens.count).toBeGreaterThanOrEqual(400)
    expect(committed.tokens.consumed.length).toBeGreaterThan(100)
    const names = new Set(committed.tokens.tokens.map((token) => token.name))
    for (const required of [
      '--dsw-alias-bg-base',
      '--dsw-alias-label-primary',
      '--dsw-alias-border-l1',
      '--dsw-font-family',
      '--dsw-static-neutral-bluish-00',
    ]) {
      expect(names.has(required), `${required} missing from committed contract`).toBe(true)
    }

    // Loader ABI: the exact seeded module table.
    expect(committed.loaderAbi.platformModules.modules).toEqual([
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-client-store',
      '@deepseek-ai/dsh-client-ui-slots',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-client-ui-dockkit',
    ])

    // Locale ids and dark attribute are frozen client API facts.
    expect(committed.clientApi.locale.ids).toEqual(['zh', 'en'])
    expect(committed.clientApi.theme.darkAttribute).toBe('data-ds-dark-theme')

    // Layout capability facts: DSH 0.2.0-rc.2 exposes no public layout recipes.
    expect(committed.capabilities.themeCss).toBe(true)
    expect(committed.capabilities.hostFontFamily).toBe(true)
    expect(committed.capabilities.hostDensityTokens).toBe(false)
    expect(committed.capabilities.hostTranscriptWidth).toBe(false)
    expect(committed.capabilities.hostMessageFlow).toBe(false)
  })

  it('keeps adapter.json in sync with contract.json', async () => {
    const contract = JSON.parse(
      await readFile(join(workspace, 'contracts', 'dsh', '0.2.0-rc.2', 'contract.json'), 'utf8'),
    ) as ContractSnapshot
    const adapter = JSON.parse(
      await readFile(join(workspace, 'contracts', 'dsh', '0.2.0-rc.2', 'adapter.json'), 'utf8'),
    ) as AdapterManifest
    expect(adapter.hostVersion).toBe(contract.hostVersion)
    expect(adapter.adapterId).toBe(contract.adapterId)
    expect(adapter.contractHash).toBe(contract.contractHash)
    expect(adapter.loaderAbi).toBe(contract.hashes.loaderAbi)
    expect(adapter.hostApiContract).toBe(contract.hashes.hostApi)
    expect(adapter.clientApiContract).toBe(contract.hashes.clientApi)
    expect(adapter.tokenContract).toBe(contract.hashes.token)
    expect(adapter.layoutContract).toBe(contract.hashes.layout)
    expect(adapter.profileSchema).toBe(contract.hashes.profileSchema)
    expect(adapter.nodeRange).toBe(contract.source.nodeRange)
    expect(adapter.clientTarget).toBe('chrome120')
  })

  it('validates the proposed support matrix and keeps it out of `released`', async () => {
    const matrix = JSON.parse(
      await readFile(join(workspace, 'contracts', 'dsh', 'support-matrix.proposed.json'), 'utf8'),
    ) as SupportMatrix
    expect(validateMatrix(matrix)).toEqual([])
    for (const entry of matrix.entries) {
      expect(entry.status).not.toBe('released')
    }
    const formalExists = existsSync(join(workspace, 'contracts', 'dsh', 'support-matrix.json'))
    expect(formalExists).toBe(false)
  })

  it('keeps the exact support declaration in package metadata', async () => {
    const pkg = JSON.parse(await readFile(join(workspace, 'package.json'), 'utf8')) as {
      engines?: { dsh?: string }
      dsh?: { client?: { platform?: string; external?: string[] } }
    }
    expect(pkg.engines?.dsh).toBe('0.2.0-rc.2')
    expect(pkg.dsh?.client?.platform).toBe('web')
    expect(pkg.dsh?.client?.external).toEqual([])
  })
})
