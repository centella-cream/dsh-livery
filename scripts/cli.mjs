#!/usr/bin/env node
/**
 * Stable command dispatcher for the project's public script interface
 * (`pnpm contract:snapshot`, `pnpm liveries:compile`, …).
 *
 * Thin wrapper only: the real implementations live in the bundled CLIs
 * (`lib/cli/compiler.js`, `lib/cli/contract.js`) or in scripts/.
 */
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const [command, ...rest] = process.argv.slice(2)

if (command === undefined) {
  console.error('usage: node scripts/cli.mjs <command> [-- flags]')
  process.exitCode = 2
} else if (command.startsWith('liveries:') || command.startsWith('audit:')) {
  const { main } = await import(pathToFileURL(join(root, 'lib', 'cli', 'compiler.js')).href)
  process.exitCode = await main([command, ...rest], cliContext())
} else if (
  command.startsWith('contract:') ||
  command.startsWith('adapter:') ||
  command === 'test:loader-abi' ||
  command.startsWith('gate:')
) {
  const { main } = await import(pathToFileURL(join(root, 'lib', 'cli', 'contract.js')).href)
  process.exitCode = await main([command, ...rest], cliContext())
} else if (command === 'pack:check') {
  process.exitCode = await packCheck(rest)
} else if (command === 'smoke:profile' || command === 'test:runtime:web') {
  const script = join(root, 'scripts', 'acceptance', 'web.mjs')
  const child = spawn(process.execPath, [script, ...rest], { cwd: root, stdio: 'inherit' })
  process.exitCode = await new Promise((resolveExit) => {
    child.on('exit', (code) => resolveExit(code ?? 1))
  })
} else {
  console.error(`scripts/cli.mjs: unknown command "${command}"`)
  process.exitCode = 2
}

function cliContext() {
  return {
    cwd: root,
    log: (line) => console.log(line),
    error: (line) => console.error(line),
  }
}

async function packCheck(args) {
  let pkg
  try {
    pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  } catch (error) {
    console.error(`pack:check: cannot read package.json: ${error.message}`)
    return 1
  }
  const problems = []
  const required = ['lib/index.js', 'lib/client.js', 'cordis.patch.yml', 'schemas/livery.schema.json', 'LICENSE', 'README.md']
  for (const file of required) {
    try {
      await readFile(join(root, file))
    } catch {
      problems.push(`missing packaged file: ${file}`)
    }
  }
  const files = pkg.files ?? []
  for (const forbidden of ['references', 'research', 'artifacts', '.tmp', 'node_modules']) {
    if (files.some((entry) => entry === forbidden || entry.startsWith(`${forbidden}/`))) {
      problems.push(`package.json files must not include ${forbidden}/`)
    }
  }
  // Install-time compatibility range; the certified matrix lives in contracts/.
  const compatRange = '>=0.2.0-rc.2 <1.0.0'
  if (pkg.engines?.dsh !== compatRange) {
    problems.push(`engines.dsh must be the compatibility range "${compatRange}", got ${String(pkg.engines?.dsh)}`)
  }
  if (typeof pkg.engines?.node !== 'string' || !pkg.engines.node.includes('^22.23.1') || !pkg.engines.node.includes('^24.21.0')) {
    problems.push(`engines.node must cover the certified runtimes, got ${String(pkg.engines?.node)}`)
  }
  if (pkg.dsh?.client?.platform !== 'web') problems.push('dsh.client.platform must be web')
  for (const external of pkg.dsh?.client?.external ?? []) {
    problems.push(`dsh.client.external must stay empty for the seeded-platform build (found ${external})`)
  }
  // The packed tree must not contain absolute host paths.
  for (const file of ['lib/index.js', 'lib/client.js']) {
    try {
      const text = await readFile(join(root, file), 'utf8')
      if (/\/Users\/|\/home\/|C:\\\\/u.test(text)) problems.push(`${file} contains an absolute host path`)
      if (text.includes('references/')) problems.push(`${file} references the research folder`)
    } catch {
      // covered by required-file check
    }
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(`pack:check: FAIL ${problem}`)
    return 1
  }
  console.log(`pack:check: OK ${pkg.name}@${pkg.version} (${required.length} required files, no host paths)`)
  return 0
}
