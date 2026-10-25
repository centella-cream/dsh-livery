#!/usr/bin/env node
/**
 * Prepare a contract-extractable Desktop host tree from the packaged Electron app.
 *
 * The Desktop Profile ships its DSH runtime inside Electron's `app.asar`. Packaged
 * apps strip type declarations (`.d.ts`) and a few READMEs, which the contract
 * snapshot verifies. This script:
 *
 *  1. reads the archive header (dependency-free asar reader),
 *  2. extracts every DSH package's `package.json`, `lib/client.js`, `lib/index.js`
 *     and `README.md`, plus the web-frontend shell assets,
 *  3. supplements the missing type documents (and the slots package, which the
 *     app seeds from its shell instead of shipping) from the same published npm
 *     version, recording the mixture in `dsh-livery-prepared.json`,
 *  4. leaves the tree ready for `pnpm contract:snapshot -- --dsh-install <target>`.
 *
 * Usage:
 *   node scripts/prepare-desktop-contract.mjs --app-asar <path> --version 0.2.1-rc.3
 *       [--target .tmp/desktop-contract] [--runtime-node 24.21.0] [--electron 44.7.0]
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function parseArgs(argv) {
  const flags = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const name = token.slice(2)
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      flags[name] = next
      i += 1
    } else {
      flags[name] = true
    }
  }
  return flags
}

const flags = parseArgs(process.argv.slice(2))
const appAsar = flags['app-asar']
const version = flags.version ?? '0.2.1-rc.3'
const target = resolve(root, flags.target ?? '.tmp/desktop-contract')
const runtimeNode = flags['runtime-node'] ?? '24.21.0'
const electron = flags.electron ?? '44.7.0'
if (typeof appAsar !== 'string' || !existsSync(appAsar)) {
  console.error('prepare-desktop-contract: --app-asar <path-to-app.asar> is required')
  process.exit(2)
}

/* ------------------------------------------------------------------ *
 * asar reader (see src/contract/README-asar notes in docs)
 * ------------------------------------------------------------------ */

const archive = resolve(appAsar)
const archiveBytes = readFileSync(archive)
const archiveSha256 = `sha256:${createHash('sha256').update(archiveBytes).digest('hex')}`
const headerSize = archiveBytes.readUInt32LE(4)
const jsonSize = archiveBytes.readUInt32LE(12)
const dataStart = 8 + headerSize
const tree = JSON.parse(archiveBytes.subarray(16, 16 + jsonSize).toString('utf8'))
const files = new Map()
const walk = (node, prefix) => {
  if (node.files !== undefined) {
    for (const [name, child] of Object.entries(node.files)) walk(child, prefix === '' ? name : `${prefix}/${name}`)
    return
  }
  if (node.size === undefined || node.offset === undefined) return
  files.set(prefix, { size: node.size, offset: Number(node.offset) })
}
walk(tree, '')

function extractAsarEntries(entries, targetRoot) {
  const fd = openSync(archive, 'r')
  const written = []
  try {
    for (const [entryPath, entry] of entries) {
      // Archive root is `dsh/`; drop it so the tree mirrors a normal install:
      //   <target>/node_modules/@deepseek-ai/dsh/... 
      const outPath = join(targetRoot, entryPath.replace(/^dsh\//u, ''))
      mkdirSync(dirname(outPath), { recursive: true })
      const buffer = Buffer.alloc(entry.size)
      readSync(fd, buffer, 0, entry.size, dataStart + entry.offset)
      writeFileSync(outPath, buffer)
      written.push(entryPath)
    }
  } finally {
    closeSync(fd)
  }
  return written
}

/* ------------------------------------------------------------------ *
 * 1. Extract the runtime files the contract snapshot needs
 * ------------------------------------------------------------------ */

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

const ASAR_PKG_PREFIX = 'dsh/node_modules/@deepseek-ai/'
const selected = []
for (const [entryPath, entry] of files) {
  if (!entryPath.startsWith(ASAR_PKG_PREFIX)) continue
  const rest = entryPath.slice(ASAR_PKG_PREFIX.length)
  if (!rest.includes('/')) continue
  const relative = rest.slice(rest.indexOf('/') + 1)
  const keep =
    relative === 'package.json' ||
    relative === 'lib/client.js' ||
    relative === 'lib/index.js' ||
    relative === 'README.md' ||
    (rest.startsWith('dsh-web-frontend/') &&
      (relative === 'dist/index.html' || /^dist\/assets\/index-.*\.(js|css)$/u.test(relative)))
  if (!keep) continue
  selected.push([entryPath, entry])
}
// Frontend shell assets are the only non-package entry kept.
for (const [entryPath, entry] of files) {
  if (!entryPath.startsWith('dsh/node_modules/@deepseek-ai/')) continue
}
console.log(`prepare: extract ${selected.length} package files`)
extractAsarEntries(selected, target)

/* ------------------------------------------------------------------ *
 * 2. Supplement missing type documents from the same npm version
 * ------------------------------------------------------------------ */

const SUPPLY_PACKAGES = [
  'dsh-client-ui-slots',
  'dsh-client-ui-theme',
  'dsh-host-webserver',
  'dsh-settings',
  'dsh-config-editor',
  'dsh-client-ui-settings',
  'dsh-client-locale',
  'dsh-client-ui-layout',
  'dsh-package-manifest',
  'dsh-client-ui-renderer',
]
const npmCache = join(root, '.tmp', 'npm-contract-cache')
mkdirSync(npmCache, { recursive: true })
const supplements = []

function fetchTarball(packageName) {
  const cachePath = join(npmCache, `${packageName}-${version}.tgz`)
  if (existsSync(cachePath)) return cachePath
  const url = `https://registry.npmjs.org/@deepseek-ai/${packageName}/-/${packageName}-${version}.tgz`
  const response = execFileSync('curl', ['-fsSL', '--max-time', '120', '-o', cachePath, url], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  void response
  return cachePath
}

function extractTarTo(tarballPath, targetRoot) {
  mkdirSync(targetRoot, { recursive: true })
  execFileSync('tar', ['-xzf', tarballPath, '-C', targetRoot], { stdio: 'ignore' })
}

for (const packageName of SUPPLY_PACKAGES) {
  const packageRoot = join(target, 'node_modules', '@deepseek-ai', packageName)
  const tarball = fetchTarball(packageName)
  const unpacked = join(npmCache, `${packageName}-${version}`)
  if (!existsSync(unpacked)) {
    rmSync(unpacked, { recursive: true, force: true })
    extractTarTo(tarball, unpacked)
  }
  const packageDir = join(unpacked, 'package')
  const copied = []
  const copyRelative = (relative) => {
    const source = join(packageDir, relative)
    if (!existsSync(source)) return
    const destination = join(packageRoot, relative)
    if (existsSync(destination)) return
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, readFileSync(source))
    copied.push(relative)
  }
  if (packageName === 'dsh-client-ui-slots') {
    // The app seeds this module from the shell; the published package is the
    // canonical type/contract source for the same version.
    for (const relative of ['lib/client.js', 'lib/index.js', 'README.md', 'package.json']) copyRelative(relative)
    const walkDir = (relativeDir) => {
      const absolute = join(packageDir, relativeDir)
      for (const entry of readFileSyncDirectory(absolute)) {
        const childRelative = join(relativeDir, entry.name)
        if (entry.isDirectory()) walkDir(childRelative)
        else copyRelative(childRelative)
      }
    }
    walkDir('lib/types')
  } else {
    for (const relative of ['README.md']) copyRelative(relative)
    const walkDir = (relativeDir) => {
      const absolute = join(packageDir, relativeDir)
      if (!existsSync(absolute)) return
      for (const entry of readFileSyncDirectory(absolute)) {
        const childRelative = join(relativeDir, entry.name)
        if (entry.isDirectory()) walkDir(childRelative)
        else copyRelative(childRelative)
      }
    }
    walkDir('lib/types')
  }
  if (copied.length > 0) supplements.push({ package: packageName, version, files: copied })
  console.log(`prepare: supplemented ${packageName} (${copied.length} files)`)
}

function readFileSyncDirectory(directory) {
  // Local helper so the script keeps a single fs import block.
  const { readdirSync } = process.getBuiltinModule('node:fs')
  return readdirSync(directory, { withFileTypes: true })
}

/* ------------------------------------------------------------------ *
 * 3. Prepared marker consumed by `contract:snapshot`
 * ------------------------------------------------------------------ */

const markerPath = join(target, 'node_modules', 'dsh-livery-prepared.json')
mkdirSync(dirname(markerPath), { recursive: true })
writeFileSync(
  markerPath,
  `${JSON.stringify(
    {
      kind: 'packaged-app',
      runtime: { node: runtimeNode, electron },
      source: {
        archiveSha256,
        extractor: 'scripts/prepare-desktop-contract.mjs',
        supplements: supplements.map((entry) => `${entry.package}@${entry.version}`),
        notes:
          'Runtime files extracted from the Desktop app.asar; missing .d.ts/README documents supplemented from the same published npm version. The app seeds @deepseek-ai/dsh-client-ui-slots from its shell, so that package comes from npm at the same version.',
      },
    },
    null,
    2,
  )}\n`,
)
console.log(`prepare: target ${target}`)
console.log(`prepare: archive ${archiveSha256}`)
console.log(`prepare: runtime node ${runtimeNode} / electron ${electron}`)
console.log('prepare: now run: node lib/cli/contract.js contract:snapshot --dsh-install ' + target)
