#!/usr/bin/env node
/**
 * Standalone browser-acceptance runner (no vitest — plain `node`).
 *
 * This is a thin, discoverable entry point; the real harness is
 * `scripts/acceptance/web.mjs`, which owns the isolated DSH_HOME, the official
 * plugin install lifecycle, the boot, the Playwright checks and the evidence
 * report.
 *
 *   node tests/browser/run.mjs --tgz dist/dsh-livery-0.1.2.tgz
 *   node tests/browser/run.mjs --reuse "http://127.0.0.1:3080/?token=…"
 *   node tests/browser/run.mjs --smoke          # charter fixture smoke (mechanics only)
 *   node tests/browser/run.mjs --desktop        # real Electron desktop renderer probe
 *
 * Any extra arguments are forwarded verbatim, e.g.:
 *   node tests/browser/run.mjs --tgz dist/x.tgz -- --keep --locale en
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const HARNESS = path.join(REPO, 'scripts', 'acceptance', 'web.mjs')
const CHARTER_TGZ = process.env.DSH_CHARTER_TGZ ?? path.join(REPO, '.tmp', 'charter', 'dsh-charter-0.1.0-rc.2.tgz')

const argv = process.argv.slice(2)
const desktopIndex = argv.indexOf('--desktop')
if (desktopIndex !== -1) {
  argv.splice(desktopIndex, 1)
  const probe = path.join(REPO, 'scripts', 'acceptance', 'probe', 'desktop-probe.mjs')
  const forwarded = argv[0] === '--' ? argv.slice(1) : argv
  const desktopChild = spawn(process.execPath, [probe, ...forwarded], { cwd: REPO, stdio: 'inherit', env: process.env })
  desktopChild.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    else process.exit(code ?? 2)
  })
  desktopChild.on('error', (error) => {
    console.error(`failed to start desktop probe: ${error.message}`)
    process.exit(2)
  })
} else {
const smokeIndex = argv.indexOf('--smoke')
const presetArgs = []
if (smokeIndex !== -1) {
  argv.splice(smokeIndex, 1)
  if (!existsSync(CHARTER_TGZ)) {
    console.error(`--smoke needs the dsh-charter fixture tarball at ${CHARTER_TGZ}`)
    process.exit(2)
  }
  presetArgs.push(
    '--tgz',
    CHARTER_TGZ,
    '--plugin-id',
    'dsh-charter',
    '--package',
    'dsh-charter',
    '--title',
    'Harness mechanics smoke — dsh-charter fixture (generic mode, not a dsh-livery acceptance run)',
    '--out',
    path.join(REPO, 'artifacts/acceptance/harness-smoke'),
    '--json',
    path.join(REPO, 'artifacts/acceptance/harness-smoke/probe.json'),
    '--report',
    path.join(REPO, 'docs/verification.md'),
  )
}

const forwarded = argv[0] === '--' ? argv.slice(1) : argv
const child = spawn(process.execPath, [HARNESS, ...presetArgs, ...forwarded], {
  cwd: REPO,
  stdio: 'inherit',
  env: process.env,
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 2)
})
child.on('error', (error) => {
  console.error(`failed to start harness: ${error.message}`)
  process.exit(2)
})
}
