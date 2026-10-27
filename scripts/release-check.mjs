#!/usr/bin/env node
/**
 * Release packaging check.
 *
 * `pnpm release:check` runs the support-matrix / release gates first; this script
 * then builds the real tarball, inspects what npm would publish, verifies that
 * README links resolve inside the package, and prints the sha256 of the exact
 * artifact. It is wired into `prepublishOnly`; with the package marked private and
 * the gates failing, accidental publishing is blocked.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const work = join(root, '.tmp', 'release-check')
const argv = process.argv.slice(2)
const flag = (name) => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}
const supplied = flag('--tgz')
rmSync(work, { recursive: true, force: true })
mkdirSync(work, { recursive: true })

let tarball
if (supplied !== undefined) {
  // Verify an already-produced candidate artifact: acceptance must refer to the
  // exact bytes that will be published, so never rebuild when a path is passed.
  tarball = resolve(root, supplied)
} else {
  execFileSync('pnpm', ['build'], { cwd: root, stdio: 'inherit' })
  const packed = execFileSync('pnpm', ['pack', '--pack-destination', work], { cwd: root, encoding: 'utf8' })
  const tgz = packed.trim().split('\n').at(-1)
  if (tgz === undefined || !tgz.endsWith('.tgz')) throw new Error(`pnpm pack did not report a tarball: ${packed}`)
  tarball = resolve(root, tgz)
}
const listing = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).trim().split('\n')
const files = new Set(listing.map(line => line.replace(/^package\//, '')))
if (!files.has('package.json')) {
  console.error('release-check: tarball has no package.json')
  process.exit(1)
}
const packageJson = JSON.parse(execFileSync('tar', ['-xOzf', tarball, 'package/package.json'], { encoding: 'utf8' }))
if (packageJson.version !== '0.1.2') {
  console.error(`release-check: candidate version must be the unreleased 0.1.2, got ${String(packageJson.version)}`)
  process.exit(1)
}
// Narrow compatibility: engines.dsh must be the exact formal-matrix shipped set.
const formalMatrix = JSON.parse(readFileSync(join(root, 'contracts', 'dsh', 'support-matrix.json'), 'utf8'))
const shippedAllowlist = formalMatrix.entries
  .filter(entry => entry.status === 'g6-approved' || entry.status === 'released')
  .map(entry => entry.hostVersion)
  .sort()
  .join(' || ')
if (shippedAllowlist === '') {
  console.error('release-check: formal support matrix has no g6-approved/released adapter')
  process.exit(1)
}
if (packageJson.engines?.dsh !== shippedAllowlist) {
  console.error(
    `release-check: engines.dsh must be the exact shipped allowlist "${shippedAllowlist}", got "${String(packageJson.engines?.dsh)}"`,
  )
  process.exit(1)
}

const required = [
  'lib/index.js',
  'lib/client.js',
  'README.md',
  'README.zh-CN.md',
  'LICENSE',
  'NOTICE.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'CONTRIBUTING.zh-CN.md',
  'CODE_OF_CONDUCT.md',
  'docs/verification.md',
  'cordis.patch.yml',
]
const missing = required.filter(file => !files.has(file))
if (missing.length > 0) {
  console.error(`release-check: missing packaged files: ${missing.join(', ')}`)
  process.exit(1)
}

const readme = [readFileSync(join(root, 'README.md'), 'utf8'), readFileSync(join(root, 'README.zh-CN.md'), 'utf8')].join('\n')
const broken = []
for (const [, target] of readme.matchAll(/\]\(([^)]+)\)/g)) {
  if (target.startsWith('http') || target.startsWith('#') || target.startsWith('mailto:')) continue
  const clean = target.split('#')[0]
  if (clean !== '' && !files.has(clean) && !files.has(`${clean}/`)) {
    broken.push(target)
  }
}
if (broken.length > 0) {
  console.error(`release-check: README links are not inside the package: ${broken.join(', ')}`)
  process.exit(1)
}

const hash = createHash('sha256').update(readFileSync(tarball)).digest('hex')
const manifest = {
  generatedAt: new Date().toISOString(),
  file: tarball.split('/').at(-1),
  sha256: hash,
  bytes: readFileSync(tarball).length,
  files: files.size,
  required: required.length,
  readmeLinks: 'ok',
  mode: supplied === undefined ? 'built' : 'supplied',
}
writeFileSync(join(work, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`release-check: OK ${manifest.mode} ${manifest.sha256} (${manifest.files} files) — manifest: ${join(work, 'release-manifest.json')}`)
