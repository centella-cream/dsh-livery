#!/usr/bin/env node
/**
 * DSH Livery compiler CLI.
 *
 * Commands (also reachable through `pnpm liveries:compile`, `pnpm liveries:check`,
 * `pnpm audit:tokens|css|contrast`):
 *
 *   compile         validate → compile → emit catalog + previews + audits
 *   check           recompile in memory and fail on any drift in generated files
 *   audit:tokens    token-coverage gate over the compiled catalog
 *   audit:css       CSS safety + size-budget gate over every rendered sheet + boot CSS
 *   audit:contrast  WCAG contrast gate over both modes of every livery
 *
 * Exit codes: 0 = pass, 1 = gate failure, 2 = usage error. Flags such as
 * `--version <v>` / `--dsh-install <path>` are accepted and ignored so the fixed
 * command interface in IMPLEMENTATION_PLAN §18.10 keeps working.
 *
 * `main(argv, ctx)` is the stable entry point used by `scripts/cli.mjs` and by
 * `node lib/cli/compiler.js <command>` after `scripts/build.mjs` bundles this file.
 */
import { existsSync, readdirSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CompileResult } from './compile.js'
import {
  ARTIFACT_DIR,
  PREVIEW_DIR,
  compareGeneratedFiles,
  compileFromDisk,
  describeCompileResult,
  findRepoRoot,
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
 * `--dsh-install`, `--check`, …), and everything after a literal `--` is accepted
 * as the command position too.
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

function describeProblems(error: (line: string) => void, prefix: string, problems: readonly { code: string; path: string; message: string }[]): void {
  for (const problem of problems) {
    error(`${prefix} FAIL ${problem.code} ${problem.path}: ${problem.message}`)
  }
}

function reportCatalogGates(prefix: string, result: CompileResult, log: (line: string) => void): void {
  if (result.report !== null) {
    const gates = result.report.gates
    log(
      `${prefix} gates validation=${gates.validation} contrast=${gates.contrast} ` +
        `tokens=${gates.tokenCoverage} css=${gates.cssSafety} size=${gates.sizeBudget} capabilities=${gates.capabilities}`,
    )
  }
}

function expectedPreviewNames(result: CompileResult): string[] {
  return [...result.files.keys()]
    .filter((file) => file.startsWith(`${PREVIEW_DIR}/`) && file.endsWith('.svg'))
    .map((file) => file.slice(PREVIEW_DIR.length + 1))
}

/** Remove stale preview SVGs left by an older catalog (never touches index.json). */
function prunePreviewDirectory(rootDir: string, result: CompileResult, log: (line: string) => void): number {
  const directory = resolve(rootDir, PREVIEW_DIR)
  if (!existsSync(directory)) return 0
  const expected = new Set(expectedPreviewNames(result))
  let removed = 0
  for (const name of readdirSync(directory)) {
    if (!name.endsWith('.svg')) continue
    if (expected.has(name)) continue
    unlinkSync(resolve(directory, name))
    removed += 1
  }
  if (removed > 0) log(`${PREFIX.compile} pruned ${removed} stale preview file(s)`)
  return removed
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
  prunePreviewDirectory(rootDir, result, log)
  log(`${prefix} validated ${result.report?.counts.liveries ?? 0} manifests`)
  for (const line of describeCompileResult(result)) log(`${prefix} ${line}`)
  log(`${prefix} wrote ${result.files.size} files (catalog + ${result.previewCount} previews + audits)`)
  reportCatalogGates(prefix, result, log)
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
    log(`${prefix} ok — ${result.files.size} generated files match the manifests`)
    return 0
  }
  for (const entry of drift) error(`${prefix} DRIFT ${entry.kind} ${entry.file}`)
  error(`${prefix} FAIL ${drift.length} generated file(s) drift from the manifests; run \`pnpm liveries:compile\``)
  return 1
}

function compileForAudit(rootDir: string, prefix: string, error: (line: string) => void): CompileResult | null {
  const result = compileFromDisk(rootDir, { enforceGates: false })
  if (result.catalog === null) {
    describeProblems(error, prefix, result.problems)
    error(`${prefix} FAIL manifests did not validate`)
    return null
  }
  return result
}

function writeAuditArtifact(rootDir: string, name: string, content: string): string {
  const file = `${ARTIFACT_DIR}/${name}`
  writeGeneratedFiles(rootDir, new Map([[file, content]]))
  return file
}

function runAuditTokens(rootDir: string, log: (line: string) => void, error: (line: string) => void): number {
  const prefix = PREFIX['audit:tokens']
  const result = compileForAudit(rootDir, prefix, error)
  if (result === null || result.tokenCoverage === null) return 1
  const artifact = result.tokenCoverage
  const file = writeAuditArtifact(rootDir, 'token-coverage.json', serializeJson(artifact))
  log(`${prefix} required ${artifact.counts.required} host-consumed alias/specific tokens`)
  log(`${prefix} covered ${artifact.counts.covered}, inherited ${artifact.counts.inherited}, missing ${artifact.counts.missing}`)
  if (artifact.inherited.length > 0) log(`${prefix} inherited (documented): ${artifact.inherited.join(', ')}`)
  log(`${prefix} wrote ${file}`)
  if (!artifact.pass) {
    for (const token of artifact.missing) error(`${prefix} FAIL required token uncovered: ${token}`)
    return 1
  }
  log(`${prefix} ok`)
  return 0
}

function runAuditCss(rootDir: string, log: (line: string) => void, error: (line: string) => void): number {
  const prefix = PREFIX['audit:css']
  const result = compileForAudit(rootDir, prefix, error)
  if (result === null || result.cssSafety === null || result.catalog === null) return 1
  const artifact = result.cssSafety
  const file = writeAuditArtifact(rootDir, 'css-safety.json', serializeJson(artifact))
  const liveryCss = artifact.liveries
  const maxBytes = Math.max(0, ...liveryCss.map((entry) => entry.bytes.total))
  const maxBoot = Math.max(0, ...artifact.boot.map((entry) => entry.bytes))
  log(`${prefix} ${liveryCss.length} livery CSS sheets + ${artifact.boot.length} boot CSS snapshots`)
  log(`${prefix} budgets max livery ${maxBytes}B / ${artifact.budgets.liveryBytes}B, max boot ${maxBoot}B / ${artifact.budgets.bootBytes}B`)
  log(`${prefix} wrote ${file}`)
  if (artifact.pass) {
    log(`${prefix} ok`)
    return 0
  }
  for (const entry of liveryCss) {
    for (const violation of entry.details.violations) error(`${prefix} FAIL ${entry.id}: ${violation}`)
  }
  for (const entry of artifact.boot) {
    for (const violation of cssViolations(entry.safety)) error(`${prefix} FAIL boot ${entry.id}: ${violation}`)
  }
  return 1
}

function cssViolations(report: { readonly important: number; readonly hashSelectors: number; readonly elementSelectors: readonly string[]; readonly remoteUrls: number; readonly unscopedTokens: number; readonly fixedZIndexes: readonly number[] }): string[] {
  const violations: string[] = []
  if (report.important > 0) violations.push(`${report.important} !important`)
  if (report.hashSelectors > 0) violations.push(`${report.hashSelectors} hash selector(s)`)
  if (report.elementSelectors.length > 0) violations.push(`${report.elementSelectors.length} unscoped selector(s)`)
  if (report.remoteUrls > 0) violations.push(`${report.remoteUrls} remote URL(s)`)
  if (report.unscopedTokens > 0) violations.push(`${report.unscopedTokens} unscoped token(s)`)
  if (report.fixedZIndexes.length > 0) violations.push(`${report.fixedZIndexes.length} fixed z-index value(s)`)
  return violations
}

function runAuditContrast(rootDir: string, log: (line: string) => void, error: (line: string) => void): number {
  const prefix = PREFIX['audit:contrast']
  const result = compileForAudit(rootDir, prefix, error)
  if (result === null || result.contrast === null) return 1
  const artifact = result.contrast
  const file = writeAuditArtifact(rootDir, 'contrast.json', serializeJson(artifact))
  log(
    `${prefix} ${artifact.liveries.length} liveries × 2 modes, ${artifact.summary.total} WCAG assertions, ` +
      `${artifact.summary.failures} failure(s)`,
  )
  log(
    `${prefix} light ${artifact.summary.byMode.light.failures}/${artifact.summary.byMode.light.total} failed, ` +
      `dark ${artifact.summary.byMode.dark.failures}/${artifact.summary.byMode.dark.total} failed`,
  )
  log(`${prefix} wrote ${file}`)
  if (artifact.pass) {
    log(`${prefix} ok`)
    return 0
  }
  for (const failure of artifact.failures.slice(0, 40)) {
    error(
      `${prefix} FAIL ${failure.id} ${failure.mode} ${failure.entry.role}: ` +
        `${failure.entry.foreground} on ${failure.entry.background} = ${failure.entry.ratio} < ${failure.entry.min}`,
    )
  }
  return 1
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
