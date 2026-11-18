#!/usr/bin/env node
/**
 * Guard `npm publish`: the candidate bytes must be exactly the accepted artifact
 * for the package version in package.json, and every formal-matrix evidence file
 * must bind those bytes. Version and evidence paths are derived, never hardcoded.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { matrixEvidence, defaultCandidatePath, parseFlag, readMatrix, readPackageJson } from './release-lib.mjs'

const fail = (message) => {
  console.error(`prepublish-check: BLOCKED ${message}`)
  process.exit(1)
}
const pkg = readPackageJson()
const matrix = readMatrix()
for (const entry of matrix.entries) {
  if (entry.status !== 'released') fail(`formal matrix entry ${entry.hostVersion} is ${String(entry.status)}, not released`)
  if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) fail(`formal matrix entry ${entry.hostVersion} has no evidence`)
}
const candidates = matrixEvidence(matrix).filter((file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')).packageVersion === pkg.version
  } catch {
    fail(`cannot read evidence file: ${file}`)
  }
})
if (candidates.length === 0) fail(`no evidence files for package version ${pkg.version}`)
const supplied = parseFlag(process.argv.slice(2), 'tgz') ?? process.env.RELEASE_TGZ
const tgz = supplied === undefined || supplied === '' ? defaultCandidatePath(pkg) : supplied
if (!existsSync(tgz)) fail(`candidate tarball missing: ${tgz}`)
for (const evidence of candidates) {
  try {
    execFileSync('node', ['scripts/release-evidence.mjs', '--tgz', tgz, '--evidence', evidence], { stdio: 'inherit' })
  } catch {
    fail(`candidate artifact / evidence verification failed for ${evidence}`)
  }
}
console.log(`prepublish-check: OK ${pkg.name}@${pkg.version} ${tgz} matches ${candidates.length} evidence files`)
