/**
 * Isolated DSH_HOME preparation, official plugin install/uninstall and profile
 * patch edits used by the acceptance harness.
 *
 * Everything here is scoped to `<repo>/.tmp/acceptance/**`; the user's real
 * `~/.dsh` is refused by `assertIsolatedHome`.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertIsolatedHome, ensureDir, nowIso, oneLine, readJsonIfExists, redact, sha256File, tail } from './util.mjs'

/** Marker comments delimit harness-owned global rows in the profile patch. */
export const PATCH_MARKER = '# dsh-livery acceptance harness rows'
export const LOCALE_EN_MARKER = '# dsh-livery acceptance harness: locale=en override'

/** The web profile bundle list from the shipped template (dsh-app-boot PROFILE_TEMPLATES). */
export const WEB_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']

export function profilePaths(home) {
  const profileDir = path.join(home, 'profiles', 'web')
  return {
    home,
    profileDir,
    packageJson: path.join(profileDir, 'package.json'),
    patchFile: path.join(profileDir, 'cordis.patch.yml'),
    lockFile: path.join(profileDir, 'package.json.lock'),
    nodeModules: path.join(profileDir, 'node_modules'),
    pluginManagerDir: path.join(profileDir, '.plugin-manager'),
  }
}

/** PATH-resolved dsh binary, with an env override for unusual checkouts. */
export function resolveDshBin(explicit) {
  if (explicit) return path.resolve(explicit)
  if (process.env.DSH_BIN) return path.resolve(process.env.DSH_BIN)
  return 'dsh'
}

/**
 * Run a `dsh` CLI command inside the isolated home, streaming stdout/stderr
 * into strings (the plugin manager pipes pnpm output through).
 */
export function runDsh(bin, args, { home, cwd = process.cwd(), timeoutMs = 180_000, env } = {}) {
  const started = Date.now()
  const isolatedHome = assertIsolatedHome(home)
  return new Promise((resolve) => {
    const stdout = []
    const stderr = []
    const child = spawn(bin, args, {
      cwd,
      env: { ...process.env, ...env, DSH_HOME: isolatedHome },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 5_000).unref?.()
    }, timeoutMs)
    child.stdout.on('data', (chunk) => stdout.push(chunk))
    child.stderr.on('data', (chunk) => stderr.push(chunk))
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({
        command: `${bin} ${args.join(' ')}`,
        exitCode: null,
        signal: null,
        stdout: redact(Buffer.concat(stdout).toString('utf8')),
        stderr: redact(`${Buffer.concat(stderr).toString('utf8')}\n${error.message}`),
        durationMs: Date.now() - started,
        timedOut,
      })
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({
        command: `${bin} ${args.join(' ')}`,
        exitCode: code,
        signal,
        stdout: redact(Buffer.concat(stdout).toString('utf8')),
        stderr: redact(Buffer.concat(stderr).toString('utf8')),
        durationMs: Date.now() - started,
        timedOut,
      })
    })
  })
}

/** `dsh --version`. */
export async function dshVersion(bin, home = undefined) {
  const result = await runDsh(bin, ['--version'], { home: home ?? path.join(process.cwd(), '.tmp/acceptance/version-probe'), timeoutMs: 30_000 })
  return { version: result.stdout.trim() || result.stderr.trim(), exitCode: result.exitCode }
}

/** Read the profile manifest + harness-owned patch state. */
export async function readProfileState(home) {
  const paths = profilePaths(home)
  const manifest = await readJsonIfExists(paths.packageJson)
  const patch = existsSync(paths.patchFile) ? await readFile(paths.patchFile, 'utf8') : null
  return {
    profileDir: paths.profileDir,
    exists: Boolean(manifest),
    dependencies: manifest?.dependencies ?? {},
    bundles: manifest?.dsh?.profile?.bundles ?? [],
    bundleSelected(bundleName) {
      return (manifest?.dsh?.profile?.bundles ?? []).includes(bundleName)
    },
    patch,
  }
}

/** YAML rows every isolated acceptance profile starts with. */
export function baseProfilePatch() {
  return `${PATCH_MARKER} (isolated acceptance home — safe to discard)
# Pin the locale exactly like the user's real web profile does, and skip the
# first-run welcome notice so settings automation is deterministic.
- id: locale
  config:
    preference: zh
- id: ui-settings-general
  name: '@deepseek-ai/dsh-client-ui-settings-general'
  config:
    welcomeNoticeVersion: 2026-09-28.1
`
}

/**
 * Write the initial profile patch *before* the first `dsh plugin` call.
 * The plugin manager's `initProfile` only writes a patch when the file is
 * missing, so our rows survive profile initialization.
 */
export async function primeProfilePatch(home) {
  assertIsolatedHome(home)
  const paths = profilePaths(home)
  await ensureDir(paths.profileDir)
  await writeFile(paths.patchFile, baseProfilePatch(), 'utf8')
  return paths.patchFile
}

/** Install the plugin tarball through the official profile package manager. */
export async function installPlugin({ bin = 'dsh', home, tgz, packageName = 'dsh-livery' }) {
  const isolated = assertIsolatedHome(home)
  const spec = `file:${path.resolve(tgz)}`
  const paths = profilePaths(isolated)
  const existed = existsSync(paths.packageJson)
  if (!existed) await primeProfilePatch(isolated)
  const result = await runDsh(bin, ['plugin', '--profile', 'web', 'add', spec], { home: isolated, timeoutMs: 300_000 })
  const state = await readProfileState(isolated)
  const tarballSha256 = await sha256File(tgz).catch(() => undefined)
  return {
    phase: 'install',
    command: result.command,
    startedAt: nowIso(),
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr,
    home: isolated,
    packageName,
    profileDir: paths.profileDir,
    initializedProfile: !existed,
    dependency: state.dependencies?.[packageName] ?? null,
    dependencies: state.dependencies,
    bundles: state.bundles,
    tarballSha256,
    spec,
  }
}

/** Uninstall through the official profile package manager. */
export async function uninstallPlugin({ bin = 'dsh', home, packageName }) {
  const isolated = assertIsolatedHome(home)
  const result = await runDsh(bin, ['plugin', '--profile', 'web', 'remove', packageName], { home: isolated, timeoutMs: 180_000 })
  const state = await readProfileState(isolated)
  return {
    phase: 'uninstall',
    command: result.command,
    startedAt: nowIso(),
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr,
    dependencyPresent: Boolean(state.dependencies?.[packageName]),
    bundleSelected: state.bundleSelected(packageName),
  }
}

/** Rewrite the isolated profile patch with an explicit locale preference. */
export async function setLocalePreference(home, preference) {
  const isolated = assertIsolatedHome(home)
  const paths = profilePaths(isolated)
  let patch = existsSync(paths.patchFile) ? await readFile(paths.patchFile, 'utf8') : baseProfilePatch()
  const markerIndex = patch.indexOf(LOCALE_EN_MARKER)
  if (markerIndex !== -1) patch = patch.slice(0, markerIndex)
  patch = patch.replace(/(- id: locale\n(?:  name: .*\n)?  config:\n    preference: )\w+/, `$1${preference}`)
  if (preference !== 'zh') patch = `${patch}${LOCALE_EN_MARKER}\n- id: locale\n  config:\n    preference: ${preference}\n`
  await writeFile(paths.patchFile, patch, 'utf8')
  return paths.patchFile
}

/** Restore the pinned zh locale row and drop any en override. */
export async function restoreLocaleZh(home) {
  return setLocalePreference(home, 'zh')
}

/** Read the profile patch and answer questions the acceptance checks make. */
export async function inspectProfilePatch(home) {
  const paths = profilePaths(home)
  const text = existsSync(paths.patchFile) ? await readFile(paths.patchFile, 'utf8') : ''
  // The DSH config editor writes a `- id: livery` row whose `config:` block (or
  // inline mapping) carries `skinId`. Keep this parser tolerant of both YAML
  // styles so a formatting change does not look like a failed mutation.
  const rows = text.split(/\n(?=- )/)
  const liveryRows = rows.filter((row) => /^- id: livery\b/m.test(row))
  let skinId = null
  for (const row of liveryRows) {
    const match = row.match(/skinId\s*:\s*['"]?([A-Za-z0-9_-]+)/)
    if (match) skinId = match[1]
  }
  const themeRow = /^- id: ui-theme\b/m.test(text)
  const liveryDisabled = liveryRows.some((row) => /^  disabled:\s*true/m.test(row))
  const localeMatch = text.match(/^- id: locale\b[\s\S]*?preference\s*:\s*['"]?([A-Za-z-]+)/m)
  return {
    text,
    hasLiveryRow: liveryRows.length > 0,
    skinId,
    liveryRows: liveryRows.length,
    hasThemeRow: themeRow,
    liveryDisabled,
    locale: localeMatch?.[1] ?? null,
  }
}

/** Keep a diagnostic copy of the pnpm log from the plugin manager, when present. */
export async function readPluginManagerLogs(home, maxFiles = 3) {
  const { pluginManagerDir } = profilePaths(home)
  const logsDir = path.join(pluginManagerDir, 'logs')
  if (!existsSync(logsDir)) return []
  const { readdir } = await import('node:fs/promises')
  const ops = (await readdir(logsDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().slice(-maxFiles)
  const out = []
  for (const op of ops) {
    const pnpmLog = path.join(logsDir, op, 'pnpm.log')
    const runRecord = path.join(logsDir, op, 'run.json')
    out.push({
      operation: op,
      run: await readJsonIfExists(runRecord),
      pnpmLogTail: existsSync(pnpmLog) ? tail(await readFile(pnpmLog, 'utf8'), 40) : null,
    })
  }
  return out
}

/** Human-readable summary line for an install/uninstall result. */
export function summarizeOperation(result) {
  return oneLine(
    `${result.command} → exit ${result.exitCode} in ${result.durationMs}ms${result.timedOut ? ' (TIMED OUT)' : ''}`,
    400,
  )
}
