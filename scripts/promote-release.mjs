#!/usr/bin/env node
/**
 * Promote one accepted candidate into the formal support matrix.
 *
 * Preconditions:
 *  - the candidate tarball exists and matches the acceptance evidence file;
 *  - the evidence file is committed under contracts/dsh/evidence/;
 *  - the formal matrix currently has a g6-approved entry for that host version.
 * This script only flips the reviewed entry to `released` and records the
 * evidence path. It does not rebuild the tarball; the published artifact must be
 * the same bytes that were accepted.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const argv = process.argv.slice(2)
const flag = (name) => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}
const version = flag('--version')
const evidence = flag('--evidence')
if (version === undefined || evidence === undefined) {
  console.error('promote-release: usage --version <dsh-version> --evidence <contracts/dsh/evidence/...json>')
  process.exit(1)
}
const evidencePath = resolve(root, evidence)
if (!existsSync(evidencePath)) {
  console.error(`promote-release: evidence file missing: ${evidence}`)
  process.exit(1)
}
const evidenceRelative = evidencePath.slice(root.length + 1).replaceAll('\\\\', '/')
if (!evidenceRelative.startsWith('contracts/dsh/evidence/')) {
  console.error('promote-release: evidence must live under contracts/dsh/evidence/ so it is committed')
  process.exit(1)
}
const record = JSON.parse(readFileSync(evidencePath, 'utf8'))
const matrixPath = join(root, 'contracts', 'dsh', 'support-matrix.json')
const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'))
const entry = matrix.entries.find((candidate) => candidate.hostVersion === version)
if (entry === undefined) {
  console.error(`promote-release: no formal matrix entry for ${version}`)
  process.exit(1)
}
if (entry.status !== 'g6-approved') {
  console.error(`promote-release: ${version} must be g6-approved before promotion, got ${String(entry.status)}`)
  process.exit(1)
}
if (record.schemaVersion !== 1 || typeof record.tarballSha256 !== 'string' || !Array.isArray(record.runs) || record.runs.length === 0) {
  console.error('promote-release: evidence file is incomplete')
  process.exit(1)
}
for (const run of record.runs) {
  if (run.summary?.fail !== 0) {
    console.error(`promote-release: evidence run ${String(run.id)} has failures`)
    process.exit(1)
  }
  if (run.tarballSha256 !== undefined && run.tarballSha256 !== record.tarballSha256) {
    console.error(`promote-release: evidence run ${String(run.id)} names a different tarball`)
    process.exit(1)
  }
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
if (record.commit !== commit) {
  console.error(`promote-release: evidence commit ${String(record.commit)} does not match HEAD ${commit}`)
  process.exit(1)
}
entry.status = 'released'
entry.evidence = [evidenceRelative]
matrix.updatedAt = new Date().toISOString()
writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`)
console.log(`promote-release: ${version} -> released (evidence ${evidenceRelative}, tarball ${record.tarballSha256})`)
