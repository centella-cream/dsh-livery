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
  buildContractSnapshot,
  canonicalJson,
  hashCanonical,
  resolveDshInstall,
  sha256Bytes,
  writeSnapshotArtifacts,
} from './snapshot.js'
import { diffContracts, renderDiffMarkdown } from './diff.js'
import { gateRelease, gateSupportMatrix, readMatrix } from './matrix.js'
import type { AdapterManifest, ContractSnapshot } from './types.js'

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
  const contractsRoot = join(workspace, 'contracts', 'dsh')
  if (version !== undefined) return readJson<ContractSnapshot>(join(contractsRoot, version, 'contract.json'))
  const matrix = await readJson<{ entries: Array<{ hostVersion: string }> }>(join(contractsRoot, 'support-matrix.proposed.json'))
  const first = matrix.entries[0]
  if (first === undefined) throw new Error('support-matrix.proposed.json has no entries')
  return readJson<ContractSnapshot>(join(contractsRoot, first.hostVersion, 'contract.json'))
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
  context.log(`contract:snapshot: ${snapshot.hostVersion} (${snapshot.adapterId})`)
  context.log(`contract:snapshot: contractHash ${snapshot.contractHash}`)
  context.log(`contract:snapshot: ${snapshot.tokens.count} tokens (${snapshot.tokens.consumed.length} consumed)`)
  context.log(`contract:snapshot: platform modules: ${snapshot.loaderAbi.platformModules.modules.join(', ')}`)
  context.log(`contract:snapshot: capabilities ${canonicalJson(snapshot.capabilities)}`)
  context.log(`contract:snapshot: wrote ${written.contractPath}`)
  context.log(`contract:snapshot: wrote ${written.adapterPath}`)
  context.log(`contract:snapshot: wrote ${written.matrixPath}`)
  return 0
}

async function commandVerify(context: CliContext, parsed: ParsedArgs): Promise<number> {
  const dshInstall = await resolveInstallFlag(parsed.flags)
  const version = typeof parsed.flags.version === 'string' ? parsed.flags.version : '0.2.0-rc.2'
  const committed = await readJson<ContractSnapshot>(join(context.cwd, 'contracts', 'dsh', version, 'contract.json'))
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
  if (problems.length > 0) {
    for (const problem of problems) context.error(`contract:verify: FAIL ${problem}`)
    return 1
  }
  context.log(`contract:verify: OK ${version} contractHash=${observed.contractHash}`)
  return 0
}

async function commandDiff(context: CliContext, parsed: ParsedArgs): Promise<number> {
  const baseVersion = typeof parsed.flags.base === 'string' ? parsed.flags.base : '0.2.0-rc.2'
  const candidateVersion = typeof parsed.flags.candidate === 'string' ? parsed.flags.candidate : baseVersion
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
  const version = typeof parsed.flags.version === 'string' ? parsed.flags.version : '0.2.0-rc.2'
  const snapshot = await readJson<ContractSnapshot>(join(context.cwd, 'contracts', 'dsh', version, 'contract.json'))
  const adapter = adapterFrom(snapshot)
  const path = join(context.cwd, 'contracts', 'dsh', version, 'adapter.json')
  await writeFile(path, `${JSON.stringify(adapter, null, 2)}\n`)
  context.log(`adapter:generate: wrote ${path} (${adapter.adapterId})`)
  return 0
}

export function adapterFrom(snapshot: ContractSnapshot): AdapterManifest {
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
    verifiedProfiles: ['desktop', 'web'],
    verifiedPlatforms: ['darwin', 'win32', 'web'],
    verifiedBrowsers: [
      { family: 'chrome', minVersion: 120 },
      { family: 'edge', minVersion: 120 },
    ],
  }
}

async function commandAdapterCheck(context: CliContext, parsed: ParsedArgs): Promise<number> {
  const version = typeof parsed.flags.version === 'string' ? parsed.flags.version : '0.2.0-rc.2'
  const snapshot = await readJson<ContractSnapshot>(join(context.cwd, 'contracts', 'dsh', version, 'contract.json'))
  const adapter = await readJson<AdapterManifest>(join(context.cwd, 'contracts', 'dsh', version, 'adapter.json'))
  const expected = adapterFrom(snapshot)
  const problems: string[] = []
  for (const key of Object.keys(expected) as Array<keyof AdapterManifest>) {
    const before = JSON.stringify(expected[key])
    const after = JSON.stringify(adapter[key])
    if (before !== after) problems.push(`${key}: expected ${before} got ${after}`)
  }
  // The adapter must fail closed: package engines.dsh must equal the exact host version.
  const pkg = await readJson<{ engines?: { dsh?: string } }>(join(context.cwd, 'package.json'))
  if (pkg.engines?.dsh !== version) {
    problems.push(`package.json engines.dsh must be exactly "${version}", got "${String(pkg.engines?.dsh)}"`)
  }
  if (problems.length > 0) {
    for (const problem of problems) context.error(`adapter:check: FAIL ${problem}`)
    return 1
  }
  context.log(`adapter:check: OK ${adapter.adapterId} contractHash=${adapter.contractHash}`)
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

function isPlatformModule(request: string): boolean {
  const platformModules = [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-store',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-ui-primitives',
    '@deepseek-ai/dsh-client-ui-dockkit',
  ]
  return platformModules.includes(request)
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
      context.error('commands: contract:snapshot contract:verify contract:diff adapter:generate adapter:check test:loader-abi gate:support-matrix gate:release')
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
