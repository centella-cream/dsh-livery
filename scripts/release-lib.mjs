/**
 * Shared release helpers. Every version, package name, tarball name, evidence
 * path and allowlist is derived; release scripts must not hardcode a version.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const CANDIDATE_DIR = join(ROOT, '.tmp', 'release-check')
export const MATRIX_PATH = join(ROOT, 'contracts', 'dsh', 'support-matrix.json')

export function readJson(path) {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
}

export function readPackageJson() {
  return readJson('package.json')
}

export function packageShortName(pkg = readPackageJson()) {
  return pkg.name.split('/').at(-1)
}

export function tarballName(pkg = readPackageJson()) {
  return `${packageShortName(pkg)}-${pkg.version}.tgz`
}

export function defaultCandidatePath(pkg = readPackageJson()) {
  return join(CANDIDATE_DIR, tarballName(pkg))
}

export function readMatrix() {
  return readJson(MATRIX_PATH)
}

export function matrixEvidence(matrix = readMatrix()) {
  return [...new Set(matrix.entries.flatMap((entry) => entry.evidence ?? []))]
}

export function readTarballPackage(tarball) {
  const text = execFileSync('tar', ['-xOzf', tarball, 'package/package.json'], { encoding: 'utf8' })
  return JSON.parse(text)
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

export function parseFlag(argv, name) {
  const index = argv.indexOf(`--${name}`)
  return index === -1 ? undefined : argv[index + 1]
}
