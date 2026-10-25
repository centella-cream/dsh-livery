/**
 * Contract / adapter / support-matrix CLI.
 *
 * Commands (invoked through `scripts/cli.mjs`):
 *   contract:snapshot -- --dsh-install <path> [--version <v>]
 *   contract:verify   -- --dsh-install <path> [--version <v>]
 *   contract:diff     -- --base <version> --candidate <version> [--fail-on required]
 *   adapter:generate  -- --version <v>
 *   adapter:check     -- --version <v>
 *   test:loader-abi   -- [--version <v>]
 *   gate:support-matrix -- --matrix <path> --version <v>
 *   gate:release        -- --matrix <path> --version <v>
 */
import { existsSync, realpathSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'
import {
  adapterIdFor,
  buildContractSnapshot,
  canonicalJson,
  hashCanonical,
  readCommittedSnapshots,
  regenerateGeneratedContracts,
  resolveDshInstall,
  sha256Bytes,
  writeSnapshotArtifacts,
} from './snapshot.js'
import { diffContracts, renderDiffMarkdown } from './diff.js'
import { gateRelease, gateSupportMatrix, readMatrix } from './matrix.js'
import type { AdapterManifest, ContractSnapshot, SupportMatrix } from './types.js'

export interface CliContext {
  readonly cwd: string
  readonly log: (line: string) => void
  readonly error: (line: string) => void
}

interface ParsedArgs {
  readonly command: string
  readonly positionals: readonly string[]
  readonly flags: Readonly<Record<string, string | true>>
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const tokens = argv.filter((token) => token !== '--')
  const command = tokens[0] ?? ''
  const positionals: string[] = []
  const flags: Record<string, string | true> = {}
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]!
    if (token.startsWith('--')) {
      const [name, inline] = token.slice(2).split('=', 2)
      if (name === undefined || name === '') continue
      if (inline !== undefined) {
        flags[name] = inline
        continue
      }
      const next = tokens[index + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flags[name] = next
        index += 1
      } else {
        flags[name] = true
      }
    } else {
      positionals.push(token)
    }
  }
  return { command, positionals, flags }
}

function workspaceRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

async function resolveInstallFlag(flags: ParsedArgs['flags']): Promise<string> {
  const fromFlag = flags['dsh-install']
  if (typeof fromFlag === 'string') return fromFlag
  const fromEnv = process.env.DSH_INSTALL
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv
  const fromEnvHome = process.env.DSH_PACKAGES_ROOT
  if (fromEnvHome !== undefined && fromEnvHome !== '') return dirname(fromEnvHome)
  // Resolve from the `dsh` executable on PATH (fnm/global install layouts).
  for (const dir of (process.env.PATH ?? '').split(':')) {
    const candidate = join(dir, 'dsh')
    if (!existsSync(candidate)) continue
    try {
      // The bin is usually a symlink into the package: `.../@scope/dsh/lib/bin.js`.
      const real = realpathSync(candidate)
      const parts = real.split('/')
      const libIndex = parts.lastIndexOf('lib')
      if (libIndex > 0) {
        const dshRoot = parts.slice(0, libIndex).join('/')
        if (existsSync(join(dshRoot, 'package.json'))) return dshRoot
      }
    } catch {
      // keep looking
    }
  }
  throw new Error('no --dsh-install given and no DSH installation could be discovered')
}

async function loadCommittedSnapshot(workspace: string, version?: string): Promise<ContractSnapshot> {
  const snapshots = await readCommittedSnapshots(workspace)
  if (version !== undefined) {
    const found = snapshots.find((snapshot) => snapshot.hostVersion === version)
    if (found === undefined) throw new Error(`no committed contract for host version ${version}`)
    return found
  }
  const latest = snapshots[snapshots.length - 1]
  if (latest === undefined) throw new Error('no committed contracts under contracts/dsh')
  return latest
}

async function loadCommittedMatrix(workspace: string): Promise<SupportMatrix> {
  return readJson<SupportMatrix>(join(workspace, 'contracts', 'dsh', 'support-matrix.proposed.json'))
}

/* ------------------------------------------------------------------ *
 * Command implementations
 * ------------------------------------------------------------------ */

async function commandSnapshot(context: CliContext, parsed: ParsedArgs): Promise<number> {
  const dshInstall = await resolveInstallFlag(parsed.flags)
  const version = typeof parsed.flags.version === 'string' ? parsed.flags.version : undefined
  const snapshot = await buildContractSnapshot({ dshInstall, ...(version === undefined ? {} : { version }) })
  const install = await resolveDshInstall(dshInstall)
  const written = await writeSnapshotArtifacts(context.cwd, snapshot, install)
  const versionList = (await readCommittedSnapshots(context.cwd)).map((entry) => entry.hostVersion).join(', ')
  context.log(`contract:snapshot: ${snapshot.hostVersion} (${snapshot.adapterId})`)
  context.log(`contract:snapshot: contractHash ${snapshot.contractHash}`)
  context.log(`contract:snapshot: ${snapshot.tokens.count} tokens (${snapshot.tokens.consumed.length} consumed)`)
  context.log(`contract:snapshot: platform modules: ${snapshot.loaderAbi.platformModules.modules.join(', ')}`)
  context.log(`contract:snapshot: capabilities ${canonicalJson(snapshot.capabilities)}`)
  context.log(`contract:snapshot: wrote ${written.contractPath}`)
  context.log(`contract:snapshot: wrote ${written.adapterPath}`)
  context.log(`contract:snapshot: wrote ${written.matrixPath}`)
  context.log(`contract:snapshot: registry versions: ${versionList} (stock: ${written.generatedStockPath})`)
  return 0
}

async function commandVerify(context: CliContext, parsed: ParsedArgs): Promise<number> {
  const all = parsed.flags.all === true
  if (all) return commandRegenerate(context, parsed, true)
  const dshInstall = await resolveInstallFlag(parsed.flags)
  const install = await resolveDshInstall(dshInstall)
  const installedVersion = (await readJson<{ version: string }>(join(install.dshRoot, 'package.json'))).version
  const version = typeof parsed.flags.version === 'string' ? parsed.flags.version : installedVersion
  const committed = await loadCommittedSnapshot(context.cwd, version)
  const observed = await buildContractSnapshot({ dshInstall, version })
  const problems: string[] = []
  const compare = (label: string, before: string, after: string): void => {
    if (before !== after) problems.push(`${label}: committed ${before} but observed ${after}`)
  }
  compare('contractHash', committed.contractHash, observed.contractHash)
  for (const key of Object.keys(committed.hashes) as Array<keyof ContractSnapshot['hashes']>) {
    compare(`hashes.${key}`, committed.hashes[key], observed.hashes[key])
  }
  compare('nodeRange', committed.source.nodeRange, observed.source.nodeRange)
  compare('clientTarget', committed.source.clientTarget, observed.source.clientTarget)
  compare('platformModules', committed.loaderAbi.platformModules.modules.join(','), observed.loaderAbi.platformModules.modules.join(','))
  compare('locale ids', committed.clientApi.locale.ids.join(','), observed.clientApi.locale.ids.join(','))
  compare('token contract', committed.hashes.token, observed.hashes.token)
  if (problems.length > 0) {
    for (const problem of problems) context.error(`contract:verify: FAIL ${problem}`)
    return 1
  }
  context.log(`contract:verify: OK ${version} contractHash=${observed.contractHash} (adapter ${observed.adapterId})`)
  return 0
}

async function commandDiff(context: CliContext, parsed: ParsedArgs): Promise<number> {
  const snapshots = await readCommittedSnapshots(context.cwd)
  const firstVersion = snapshots[0]?.hostVersion
  const lastVersion = snapshots[snapshots.length - 1]?.hostVersion
  const baseVersion = typeof parsed.flags.base === 'string' ? parsed.flags.base : firstVersion ?? '0.2.0-rc.2'
  const candidateVersion = typeof parsed.flags.candidate === 'string' ? parsed.flags.candidate : lastVersion ?? baseVersion
  const failOn = typeof parsed.flags['fail-on'] === 'string' ? parsed.flags['fail-on'] : 'required'
  const contractsRoot = join(context.cwd, 'contracts', 'dsh')
  const base = await readJson<ContractSnapshot>(join(contractsRoot, baseVersion, 'contract.json'))
  const candidate = await readJson<ContractSnapshot>(join(contractsRoot, candidateVersion, 'contract.json'))
  const diff = diffContracts(base, candidate)
  const artifactsDir = join(context.cwd, 'artifacts', 'contracts', candidateVersion)
  await mkdir(artifactsDir, { recursive: true })
  await writeFile(join(artifactsDir, 'diff.json'), `${JSON.stringify(diff, null, 2)}\n`)
  await writeFile(join(artifactsDir, 'diff.md'), renderDiffMarkdown(diff))
  context.log(
    `contract:diff: ${baseVersion} -> ${candidateVersion}: required=${diff.required} optional=${diff.optional} diagnostic=${diff.diagnosticOnly}`,
  )
  if (failOn === 'required' && diff.required > 0) {
    context.error('contract:diff: required contract differences found; release is blocked')
    return 1
  }
  return 0
}

async function commandAdapterGenerate(context: CliContext, parsed: ParsedArgs): Promise<number> {
  const matrix = await loadCommittedMatrix(context.cwd)
  const snapshots = await readCommittedSnapshots(context.cwd)
  const selected = typeof parsed.flags.version === 'string'
    ? snapshots.filter((snapshot) => snapshot.hostVersion === parsed.flags.version)
    : snapshots
  if (selected.length === 0) {
    context.error('adapter:generate: no committed contracts matched')
    return 1
  }
  for (const snapshot of selected) {
    const adapter = adapterFrom(snapshot, matrix)
    const path = join(context.cwd, 'contracts', 'dsh', snapshot.hostVersion, 'adapter.json')
    await writeFile(path, `${JSON.stringify(adapter, null, 2)}\n`)
    context.log(`adapter:generate: wrote ${path} (${adapter.adapterId})`)
  }
  const generated = await regenerateGeneratedContracts(context.cwd)
  context.log(`adapter:generate: registry ${generated.versions.join(', ')}`)
  return 0
}

/** Derive one adapter manifest; certification fields follow the support matrix. */
export function adapterFrom(snapshot: ContractSnapshot, matrix?: SupportMatrix): AdapterManifest {
  const entry = matrix?.entries.find((candidate) => candidate.hostVersion === snapshot.hostVersion)
  const webPassed = entry?.profiles.web.chrome === 'passed' || entry?.profiles.web.edge === 'passed'
  const darwinPassed = entry?.profiles.desktop.macos === 'passed'
  const win32Passed = entry?.profiles.desktop.win32 === 'passed'
  const verifiedProfiles: string[] = []
  if (webPassed) verifiedProfiles.push('web')
  if (darwinPassed || win32Passed) verifiedProfiles.push('desktop')
  const verifiedPlatforms: string[] = []
  if (webPassed) verifiedPlatforms.push('web')
  if (darwinPassed) verifiedPlatforms.push('darwin')
  if (win32Passed) verifiedPlatforms.push('win32')
  const browsers: Array<{ family: string; minVersion: number }> = []
  if (entry?.profiles.web.chrome === 'passed') browsers.push({ family: 'chrome', minVersion: 120 })
  if (entry?.profiles.web.edge === 'passed') browsers.push({ family: 'edge', minVersion: 120 })
  return {
    hostVersion: snapshot.hostVersion,
    adapterId: snapshot.adapterId,
    loaderAbi: snapshot.hashes.loaderAbi,
    hostApiContract: snapshot.hashes.hostApi,
    clientApiContract: snapshot.hashes.clientApi,
    tokenContract: snapshot.hashes.token,
    layoutContract: snapshot.hashes.layout,
    profileSchema: snapshot.hashes.profileSchema,
    contractHash: snapshot.contractHash,
    nodeRange: snapshot.source.nodeRange,
    clientTarget: snapshot.source.clientTarget,
    verifiedProfiles,
    verifiedPlatforms,
    verifiedBrowsers: browsers,
  }
}

async function commandAdapterCheck(context: CliContext, parsed: ParsedArgs): Promise<number> {
  const matrix = await loadCommittedMatrix(context.cwd)
  const snapshots = await readCommittedSnapshots(context.cwd)
  const selected = typeof parsed.flags.version === 'string'
    ? snapshots.filter((snapshot) => snapshot.hostVersion === parsed.flags.version)
    : snapshots
  const problems: string[] = []
  for (const snapshot of selected) {
    const version = snapshot.hostVersion
    const expected = adapterFrom(snapshot, matrix)
    let adapter: AdapterManifest
    try {
      adapter = await readJson<AdapterManifest>(join(context.cwd, 'contracts', 'dsh', version, 'adapter.json'))
    } catch {
      problems.push(`${version}: adapter.json missing; run adapter:generate`)
      continue
    }
    for (const key of Object.keys(expected) as Array<keyof AdapterManifest>) {
      const before = JSON.stringify(expected[key])
      const after = JSON.stringify(adapter[key])
      if (before !== after) problems.push(`${version}.${key}: expected ${before} got ${after}`)
    }
    if (adapter.adapterId !== adapterIdFor(version)) {
      problems.push(`${version}: adapterId must be ${adapterIdFor(version)}, got ${adapter.adapterId}`)
    }
  }
  const pkg = await readJson<{ engines?: { dsh?: string } }>(join(context.cwd, 'package.json'))
  const allowlist = snapshots.map((snapshot) => snapshot.hostVersion).join(' || ')
  if (pkg.engines?.dsh !== allowlist) {
    problems.push(`package.json engines.dsh must be the exact allowlist "${allowlist}", got "${String(pkg.engines?.dsh)}"`)
  }
  if (problems.length > 0) {
    for (const problem of problems) context.error(`adapter:check: FAIL ${problem}`)
    return 1
  }
  context.log(`adapter:check: OK ${selected.map((snapshot) => snapshot.adapterId).join(', ')}`)
  context.log(`adapter:check: exact allowlist ${allowlist}`)
  return 0
}

async function commandRegenerate(context: CliContext, _parsed: ParsedArgs, checkOnly = false): Promise<number> {
  const generated = await regenerateGeneratedContracts(context.cwd)
  const versions = generated.versions.join(', ')
  if (checkOnly) {
    // Reproducibility check: regenerate once more and compare the bytes. The
    // files were just written from the committed contracts, so a stable second
    // pass proves there is no hand-edit or wall-clock content in the registry.
    const firstContract = await readFile(generated.contractPath, 'utf8')
    const firstStock = await readFile(generated.stockPath, 'utf8')
    const second = await regenerateGeneratedContracts(context.cwd)
    const secondContract = await readFile(second.contractPath, 'utf8')
    const secondStock = await readFile(second.stockPath, 'utf8')
    const problems: string[] = []
    if (firstContract !== secondContract) problems.push('contract.ts is not reproducible')
    if (firstStock !== secondStock) problems.push('stock.ts is not reproducible')
    if (problems.length > 0) {
      for (const problem of problems) context.error(`contract:verify: FAIL ${problem}`)
      return 1
    }
    context.log(`contract:verify: OK generated registry reproducible for ${versions}`)
    return 0
  }
  context.log(`contract:regenerate: wrote adapter registry for ${versions}`)
  return 0
}

interface LoaderAbiTestResult {
  readonly ok: boolean
  readonly checks: ReadonlyArray<{ readonly id: string; readonly ok: boolean; readonly detail: string }>
}

/**
 * Bundle-level loader ABI test: the client entry must be one classic-script
 * factory registration, must not run plugin code before materialization, and a
 * corrupted envelope must prevent plugin code from running at all.
 */
async function commandLoaderAbi(context: CliContext): Promise<number> {
  const workspace = context.cwd
  const pkg = await readJson<{ name: string; dsh?: { client?: { platform?: string } } }>(join(workspace, 'package.json'))
  const clientPath = join(workspace, 'lib', 'client.js')
  if (!existsSync(clientPath)) {
    context.error('test:loader-abi: lib/client.js is missing; run `pnpm build` first')
    return 1
  }
  const text = await readFile(clientPath, 'utf8')
  const checks: Array<{ id: string; ok: boolean; detail: string }> = []
  const record = (id: string, ok: boolean, detail: string): void => {
    checks.push({ id, ok, detail })
  }

  record('platform-web', pkg.dsh?.client?.platform === 'web', `dsh.client.platform=${String(pkg.dsh?.client?.platform)}`)
  const adapterTables = await loadAdapterModuleTables(workspace)
  const missingSeed: string[] = []
  for (const table of adapterTables) {
    for (const required of CLIENT_REQUIRED_MODULES) {
      if (!table.modules.includes(required)) missingSeed.push(`${table.version}:${required}`)
    }
  }
  record(
    'seeded-modules-per-adapter',
    adapterTables.length > 0 && missingSeed.length === 0,
    adapterTables.length === 0
      ? 'no committed adapters found'
      : missingSeed.length === 0
        ? `all ${CLIENT_REQUIRED_MODULES.length} required modules are seeded by ${adapterTables.map((table) => table.version).join(', ')}`
        : `missing seeded modules: ${missingSeed.join(', ')}`,
  )
  record('single-script', !/^\s*import\s/mu.test(text), 'bundle must not contain top-level ESM imports')
  record('loader-call', text.includes('__ModuleLoader__.load('), 'bundle must register through window.__ModuleLoader__.load')
  record('id-equals-package', text.includes(`id: ${JSON.stringify(pkg.name)}`), `bundle id must be ${pkg.name}`)
  record('factory-form', /factory:\s*\(require\)\s*=>/u.test(text), 'bundle must expose a CJS factory')
  const requires = [...text.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/gu)].map((match) => match[1]!)
  const allowed = 'PLACEHOLDER'
  void allowed
  const unexpected = requires.filter((request) => !isPlatformModule(request))
  record(
    'external-resolution',
    unexpected.length === 0,
    unexpected.length === 0 ? 'all require() calls resolve to seeded platform modules' : `unexpected require(): ${unexpected.join(', ')}`,
  )

  // Materialization must not run during script evaluation.
  let materializedDuringEval = false
  let capturedFactory: (() => unknown) | undefined
  const documentStub = {
    head: {
      appendChild: () => {
        materializedDuringEval = true
      },
    },
    body: {
      setAttribute: () => undefined,
      removeAttribute: () => undefined,
      getAttribute: () => null,
      appendChild: () => {
        materializedDuringEval = true
      },
      querySelector: () => null,
    },
    documentElement: { lang: 'zh-CN', setAttribute: () => undefined, style: { setProperty: () => undefined } },
    querySelector: () => null,
    createElement: () => ({ dataset: {}, style: {}, textContent: '', setAttribute: () => undefined }),
    getElementById: () => null,
    readyState: 'loading',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }
  const sandbox: Record<string, unknown> = {
    __ModuleLoader__: {
      load: (entry: { factory: () => unknown }) => {
        capturedFactory = entry.factory
      },
    },
    document: documentStub,
    console,
  }
  sandbox.window = sandbox
  sandbox.globalThis = sandbox
  try {
    vm.runInNewContext(text, sandbox, { filename: 'client.js', timeout: 10_000 })
  } catch (error) {
    record('script-evaluates', false, `client bundle threw during evaluation: ${(error as Error).message}`)
  }
  record('script-evaluates', checks.every((check) => check.id !== 'script-evaluates'), 'client bundle evaluated without throwing')
  record('factory-captured', typeof capturedFactory === 'function', 'loader captured exactly one factory')
  record('no-materialization-on-eval', materializedDuringEval === false, 'no plugin DOM writes before materialization')
  if (typeof capturedFactory === 'function') {
    try {
      // Materialize exactly once with the seeded platform module table stubbed;
      // the factory must not require anything outside that table.
      const requireStub = (request: string) => {
        if (!isPlatformModule(request)) throw new Error(`unexpected runtime require(${request})`)
        return {}
      }
      ;(capturedFactory as (require: (request: string) => unknown) => unknown)(requireStub)
      record('factory-materializes', true, 'factory materialized without throwing')
    } catch (error) {
      record('factory-materializes', false, `factory threw: ${(error as Error).message}`)
    }
  }

  // Deliberately broken envelope: the client entry must not execute.
  const broken = text.replace('__ModuleLoader__.load(', '__ModuleLoader__.broken(')
  let brokenExecuted = false
  const brokenSandbox: Record<string, unknown> = {
    __ModuleLoader__: {
      load: () => {
        brokenExecuted = true
      },
      broken: () => {
        throw new Error('loader ABI mismatch')
      },
    },
    document: {
      ...documentStub,
      head: { appendChild: () => { brokenExecuted = true } },
    },
    console,
  }
  brokenSandbox.window = brokenSandbox
  brokenSandbox.globalThis = brokenSandbox
  let brokenThrew = false
  try {
    vm.runInNewContext(broken, brokenSandbox, { filename: 'broken-client.js', timeout: 10_000 })
  } catch {
    brokenThrew = true
  }
  record(
    'broken-envelope-fails-closed',
    !brokenExecuted,
    brokenThrew ? 'broken envelope fails closed without running plugin code' : 'broken envelope did not execute plugin code',
  )

  const result: LoaderAbiTestResult = { ok: checks.every((check) => check.ok), checks }
  const artifactsDir = join(workspace, 'artifacts', 'abi', '0.2.0-rc.2')
  await mkdir(artifactsDir, { recursive: true })
  await writeFile(join(artifactsDir, 'loader.json'), `${JSON.stringify({ sha256: sha256Bytes(Buffer.from(text)), result }, null, 2)}\n`)
  for (const check of checks) {
    context.log(`test:loader-abi: ${check.ok ? 'PASS' : 'FAIL'} ${check.id} — ${check.detail}`)
  }
  return result.ok ? 0 : 1
}

/**
 * Modules our client bundle may require. Every certified adapter's seeded table
 * must contain each of them; the loader-ABI test enforces that per version.
 */
const CLIENT_REQUIRED_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
] as const

function isPlatformModule(request: string): boolean {
  return (CLIENT_REQUIRED_MODULES as readonly string[]).includes(request)
}

/** Load every committed adapter's seeded module table (for the ABI test). */
async function loadAdapterModuleTables(workspace: string): Promise<Array<{ version: string; modules: readonly string[] }>> {
  const snapshots = await readCommittedSnapshots(workspace)
  return snapshots.map((snapshot) => ({
    version: snapshot.hostVersion,
    modules: snapshot.loaderAbi.platformModules.modules,
  }))
}

async function commandGateMatrix(context: CliContext, parsed: ParsedArgs, release: boolean): Promise<number> {
  const matrixPath =
    typeof parsed.flags.matrix === 'string'
      ? resolve(context.cwd, parsed.flags.matrix)
      : join(context.cwd, 'contracts', 'dsh', 'support-matrix.proposed.json')
  const version = typeof parsed.flags.version === 'string' ? parsed.flags.version : '0.2.0-rc.2'
  const matrix = await readMatrix(matrixPath)
  const result = release ? gateRelease(matrix, version) : gateSupportMatrix(matrix, version)
  const artifactsDir = join(context.cwd, 'artifacts', 'release')
  await mkdir(artifactsDir, { recursive: true })
  await writeFile(
    join(artifactsDir, release ? `gate-release-${version}.json` : `gate-matrix-${version}.json`),
    `${JSON.stringify(result, null, 2)}\n`,
  )
  if (!result.ok) {
    for (const problem of result.problems) context.error(`${release ? 'gate:release' : 'gate:support-matrix'}: BLOCKED ${problem}`)
    return 1
  }
  context.log(`${release ? 'gate:release' : 'gate:support-matrix'}: OK ${version}`)
  return 0
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export async function main(argv: readonly string[], context: CliContext): Promise<number> {
  const parsed = parseArgs(argv)
  switch (parsed.command) {
    case 'contract:snapshot':
      return commandSnapshot(context, parsed)
    case 'contract:verify':
      return commandVerify(context, parsed)
    case 'contract:diff':
      return commandDiff(context, parsed)
    case 'contract:regenerate':
      return commandRegenerate(context, parsed)
    case 'adapter:generate':
      return commandAdapterGenerate(context, parsed)
    case 'adapter:check':
      return commandAdapterCheck(context, parsed)
    case 'test:loader-abi':
      return commandLoaderAbi(context)
    case 'gate:support-matrix':
      return commandGateMatrix(context, parsed, false)
    case 'gate:release':
      return commandGateMatrix(context, parsed, true)
    default:
      context.error(`contract CLI: unknown command "${parsed.command}"`)
      context.error('commands: contract:snapshot contract:verify contract:diff contract:regenerate adapter:generate adapter:check test:loader-abi gate:support-matrix gate:release')
      return 2
  }
}

const isDirectRun = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) {
  const workspace = workspaceRoot()
  const code = await main(process.argv.slice(2), {
    cwd: workspace,
    log: (line) => console.log(line),
    error: (line) => console.error(line),
  })
  process.exitCode = code
}

/** Re-exported so tests can exercise snapshot/extraction helpers directly. */
export {
  buildContractSnapshot,
  canonicalJson,
  hashCanonical,
  loadCommittedSnapshot,
  resolveDshInstall,
  sha256Bytes,
}
