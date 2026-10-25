#!/usr/bin/env node
/**
 * DSH Livery compiler CLI — multi-version.
 *
 * Commands (also reachable through `pnpm liveries:compile`, `pnpm liveries:check`,
 * `pnpm audit:tokens|css|contrast`):
 *
 *   compile         validate → compile every catalog profile → emit catalog,
 *                   per-profile previews + audits, cross-profile summary
 *   check           recompile in memory and fail on any drift in generated files
 *   audit:tokens    token-coverage gate per profile/token contract
 *   audit:css       CSS safety + size-budget gate per profile
 *   audit:contrast  WCAG contrast gate per profile × both modes × every livery
 *
 * Exit codes: 0 = pass, 1 = gate failure, 2 = usage error. Flags such as
 * `--version <v>` / `--dsh-install <path>` are accepted and ignored so the fixed
 * command interface in IMPLEMENTATION_PLAN §18.10 keeps working.
 *
 * `main(argv, ctx)` is the stable entry point used by `scripts/cli.mjs` and by
 * `node lib/cli/compiler.js <command>` after `scripts/build.mjs` bundles this file.
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CompileProblem } from './audit.js'
import type { CompileResult, ProfileCompileResult } from './compile.js'
import {
  ARTIFACT_DIR,
  PREVIEW_DIR,
  SUMMARY_PATH,
  compareGeneratedFiles,
  compileFromDisk,
  describeCompileResult,
  findRepoRoot,
  pruneGeneratedDirs,
  serializeJson,
  writeGeneratedFiles,
} from './compile.js'

export interface CliContext {
  readonly cwd: string
  readonly log: (line: string) => void
  readonly error: (line: string) => void
}

type Command = 'compile' | 'check' | 'audit:tokens' | 'audit:css' | 'audit:contrast'

const COMMAND_ALIASES: Readonly<Record<string, Command>> = {
  compile: 'compile',
  'liveries:compile': 'compile',
  check: 'check',
  'liveries:check': 'check',
  'audit:tokens': 'audit:tokens',
  'audit:css': 'audit:css',
  'audit:contrast': 'audit:contrast',
}

const PREFIX: Readonly<Record<Command, string>> = {
  compile: 'livery:compile:',
  check: 'livery:check:',
  'audit:tokens': 'livery:audit:tokens:',
  'audit:css': 'livery:audit:css:',
  'audit:contrast': 'livery:audit:contrast:',
}

interface ParsedArguments {
  readonly command: Command | null
  readonly unknownCommand: string | null
}

/**
 * Locate the command token. Flags and their values are ignored (`--version`,
 * `--dsh-install`, …), and everything after a literal `--` is accepted as the
 * command position too.
 */
export function parseCommand(argv: readonly string[]): ParsedArguments {
  const candidates: string[] = []
  let sawSeparator = false
  for (const token of argv) {
    if (token === '--') {
      sawSeparator = true
      continue
    }
    if (token.startsWith('-')) continue
    candidates.push(token)
    if (sawSeparator) break
  }
  for (const candidate of candidates) {
    const command = COMMAND_ALIASES[candidate]
    if (command !== undefined) return { command, unknownCommand: null }
  }
  return { command: null, unknownCommand: candidates[0] ?? null }
}

function describeProblems(error: (line: string) => void, prefix: string, problems: readonly CompileProblem[]): void {
  for (const problem of problems) {
    error(`${prefix} FAIL ${problem.code} ${problem.path}: ${problem.message}`)
  }
}

function profileGateLine(profile: ProfileCompileResult): string {
  const gates = profile.report.gates
  const short = profile.profile.profileId.slice('sha256:'.length, 'sha256:'.length + 12)
  return (
    `profile ${short} gates validation=${gates.validation} contrast=${gates.contrast} tokens=${gates.tokenCoverage} ` +
    `css=${gates.cssSafety} size=${gates.sizeBudget} capabilities=${gates.capabilities} adapterIdentity=${gates.adapterRenderIdentity}`
  )
}

function writePerProfileArtifact(
  result: CompileResult,
  rootDir: string,
  command: 'audit:tokens' | 'audit:css' | 'audit:contrast',
): string[] {
  const written: string[] = []
  for (const profile of result.profiles) {
    const profileId = profile.profile.profileId
    const directory = `${ARTIFACT_DIR}/${profileId}`
    const artifact =
      command === 'audit:tokens'
        ? profile.tokenCoverage
        : command === 'audit:css'
          ? profile.cssSafety
          : profile.contrast
    const name = command === 'audit:tokens' ? 'token-coverage.json' : command === 'audit:css' ? 'css-safety.json' : 'contrast.json'
    const file = `${directory}/${name}`
    writeGeneratedFiles(rootDir, new Map([[file, serializeJson(artifact)]]))
    written.push(file)
  }
  return written
}

async function runCompile(rootDir: string, log: (line: string) => void, error: (line: string) => void): Promise<number> {
  const prefix = PREFIX.compile
  const result = compileFromDisk(rootDir)
  if (!result.ok) {
    describeProblems(error, prefix, result.problems)
    error(`${prefix} FAIL ${result.problems.length} problem(s); catalog was not emitted`)
    return 1
  }
  writeGeneratedFiles(rootDir, result.files)
  const removed = pruneGeneratedDirs(rootDir, result.files)
  if (removed.length > 0) log(`${prefix} pruned ${removed.length} stale generated file(s)`)
  log(`${prefix} validated ${result.profiles[0]?.report.counts.liveries ?? 0} manifests × ${result.profileCount} catalog profile(s) / ${result.adapterCount} adapter(s)`)
  for (const line of describeCompileResult(result)) log(`${prefix} ${line}`)
  for (const profile of result.profiles) log(`${prefix} ${profileGateLine(profile)}`)
  log(
    `${prefix} wrote ${result.files.size} files (catalog + ${result.previewCount} previews + per-profile audits + summary)`,
  )
  if (result.summary !== null && !result.summary.pass) {
    error(`${prefix} FAIL cross-profile summary gate failed (${SUMMARY_PATH})`)
    return 1
  }
  log(`${prefix} ok`)
  return 0
}

function runCheck(rootDir: string, log: (line: string) => void, error: (line: string) => void): number {
  const prefix = PREFIX.check
  const result = compileFromDisk(rootDir)
  if (!result.ok) {
    describeProblems(error, prefix, result.problems)
    error(`${prefix} FAIL recompilation failed; fix the manifests before checking drift`)
    return 1
  }
  const drift = compareGeneratedFiles(rootDir, result.files)
  if (drift.length === 0) {
    log(`${prefix} ok — ${result.files.size} generated files across ${result.profileCount} profile(s) match the manifests`)
    return 0
  }
  for (const entry of drift) error(`${prefix} DRIFT ${entry.kind} ${entry.file}`)
  error(`${prefix} FAIL ${drift.length} generated file(s) drift from the manifests; run \`pnpm liveries:compile\``)
  return 1
}

function compileForAudit(rootDir: string, prefix: string, error: (line: string) => void): CompileResult | null {
  const result = compileFromDisk(rootDir, { enforceGates: false })
  if (result.profiles.length === 0) {
    describeProblems(error, prefix, result.problems)
    error(`${prefix} FAIL manifests did not validate for the certified host versions`)
    return null
  }
  return result
}

function runAuditTokens(rootDir: string, log: (line: string) => void, error: (line: string) => void): number {
  const prefix = PREFIX['audit:tokens']
  const result = compileForAudit(rootDir, prefix, error)
  if (result === null) return 1
  const written = writePerProfileArtifact(result, rootDir, 'audit:tokens')
  for (const profile of result.profiles) {
    const artifact = profile.tokenCoverage
    const short = profile.profile.profileId.slice('sha256:'.length, 'sha256:'.length + 12)
    log(
      `${prefix} profile ${short} (${profile.adapters.map((adapter) => adapter.hostVersion).join(', ')}): ` +
        `consumed ${artifact.counts.consumed}, required ${artifact.counts.required}, covered ${artifact.counts.covered}, ` +
        `inherited ${artifact.counts.inherited}, missing ${artifact.counts.missing}`,
    )
    if (!artifact.pass) {
      for (const token of artifact.missing) error(`${prefix} FAIL profile ${short}: required token uncovered: ${token}`)
    }
  }
  for (const file of written) log(`${prefix} wrote ${file}`)
  const pass = result.profiles.every((profile) => profile.tokenCoverage.pass)
  if (!pass) return 1
  log(`${prefix} ok`)
  return 0
}

function cssViolations(report: {
  readonly important: number
  readonly hashSelectors: number
  readonly elementSelectors: readonly string[]
  readonly remoteUrls: number
  readonly unscopedTokens: number
  readonly fixedZIndexes: readonly number[]
}): string[] {
  const violations: string[] = []
  if (report.important > 0) violations.push(`${report.important} !important`)
  if (report.hashSelectors > 0) violations.push(`${report.hashSelectors} hash selector(s)`)
  if (report.elementSelectors.length > 0) violations.push(`${report.elementSelectors.length} unscoped selector(s)`)
  if (report.remoteUrls > 0) violations.push(`${report.remoteUrls} remote URL(s)`)
  if (report.unscopedTokens > 0) violations.push(`${report.unscopedTokens} unscoped token(s)`)
  if (report.fixedZIndexes.length > 0) violations.push(`${report.fixedZIndexes.length} fixed z-index value(s)`)
  return violations
}

function runAuditCss(rootDir: string, log: (line: string) => void, error: (line: string) => void): number {
  const prefix = PREFIX['audit:css']
  const result = compileForAudit(rootDir, prefix, error)
  if (result === null) return 1
  const written = writePerProfileArtifact(result, rootDir, 'audit:css')
  for (const profile of result.profiles) {
    const artifact = profile.cssSafety
    const short = profile.profile.profileId.slice('sha256:'.length, 'sha256:'.length + 12)
    const maxBytes = Math.max(0, ...artifact.liveries.map((entry) => entry.bytes.total))
    const maxBoot = Math.max(0, ...artifact.boot.map((entry) => entry.bytes))
    log(
      `${prefix} profile ${short}: ${artifact.liveries.length} livery sheets + ${artifact.boot.length} boot snapshots, ` +
        `max livery ${maxBytes}B / ${artifact.budgets.liveryBytes}B, max boot ${maxBoot}B / ${artifact.budgets.bootBytes}B`,
    )
    if (!artifact.pass) {
      for (const entry of artifact.liveries) {
        for (const violation of entry.details.violations) error(`${prefix} FAIL profile ${short} ${entry.id}: ${violation}`)
      }
      for (const entry of artifact.boot) {
        for (const violation of cssViolations(entry.safety)) error(`${prefix} FAIL profile ${short} boot ${entry.id}: ${violation}`)
      }
    }
  }
  for (const file of written) log(`${prefix} wrote ${file}`)
  const pass = result.profiles.every((profile) => profile.cssSafety.pass)
  if (!pass) return 1
  log(`${prefix} ok`)
  return 0
}

function runAuditContrast(rootDir: string, log: (line: string) => void, error: (line: string) => void): number {
  const prefix = PREFIX['audit:contrast']
  const result = compileForAudit(rootDir, prefix, error)
  if (result === null) return 1
  const written = writePerProfileArtifact(result, rootDir, 'audit:contrast')
  for (const profile of result.profiles) {
    const artifact = profile.contrast
    const short = profile.profile.profileId.slice('sha256:'.length, 'sha256:'.length + 12)
    log(
      `${prefix} profile ${short}: ${artifact.liveries.length} liveries × 2 modes, ${artifact.summary.total} assertions, ` +
        `${artifact.summary.failures} failure(s) (light ${artifact.summary.byMode.light.failures}/${artifact.summary.byMode.light.total}, ` +
        `dark ${artifact.summary.byMode.dark.failures}/${artifact.summary.byMode.dark.total})`,
    )
    if (!artifact.pass) {
      for (const failure of artifact.failures.slice(0, 40)) {
        error(
          `${prefix} FAIL profile ${short} ${failure.id} ${failure.mode} ${failure.entry.role}: ` +
            `${failure.entry.foreground} on ${failure.entry.background} = ${failure.entry.ratio} < ${failure.entry.min}`,
        )
      }
    }
  }
  for (const file of written) log(`${prefix} wrote ${file}`)
  const pass = result.profiles.every((profile) => profile.contrast.pass)
  if (!pass) return 1
  log(`${prefix} ok`)
  return 0
}

/**
 * Stable CLI entry point. Returns the process exit code instead of calling
 * `process.exit`, so it is safe to import from tests and wrappers.
 */
export async function main(argv: readonly string[], context: Partial<CliContext> = {}): Promise<number> {
  const cwd = context.cwd ?? process.cwd()
  const log = context.log ?? ((line: string) => console.log(line))
  const error = context.error ?? ((line: string) => console.error(line))
  const rootDir = findRepoRoot(cwd)
  const parsed = parseCommand(argv)
  if (parsed.command === null) {
    error(`livery:cli: FAIL unknown command ${parsed.unknownCommand === null ? '(none)' : JSON.stringify(parsed.unknownCommand)}`)
    error('livery:cli: usage: <compile|check|audit:tokens|audit:css|audit:contrast> [--version <v>] [--dsh-install <path>]')
    return 2
  }
  try {
    switch (parsed.command) {
      case 'compile':
        return await runCompile(rootDir, log, error)
      case 'check':
        return runCheck(rootDir, log, error)
      case 'audit:tokens':
        return runAuditTokens(rootDir, log, error)
      case 'audit:css':
        return runAuditCss(rootDir, log, error)
      case 'audit:contrast':
        return runAuditContrast(rootDir, log, error)
    }
  } catch (cause) {
    const message = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause)
    error(`${PREFIX[parsed.command]} FAIL ${message}`)
    return 1
  }
}

function isDirectExecution(): boolean {
  const entry = process.argv[1]
  if (entry === undefined || entry.length === 0) return false
  try {
    return resolve(fileURLToPath(import.meta.url)) === resolve(entry)
  } catch {
    return false
  }
}

if (isDirectExecution()) {
  const code = await main(process.argv.slice(2))
  process.exitCode = code
}

export { ARTIFACT_DIR, PREVIEW_DIR }
