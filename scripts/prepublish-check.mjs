#!/usr/bin/env node
/**
 * Guard `npm publish` for the stable release line.
 *
 * The published bytes must be the candidate that was accepted and bound to the
 * committed evidence file. This check refuses to publish unless:
 *  - the formal matrix has only `released` entries;
 *  - the committed evidence file matches the root candidate tarball's sha256;
 *  - the evidence commit is an ancestor of HEAD and artifact inputs are unchanged.
 * It does not rebuild: publish the existing candidate tarball, not a fresh pack.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const fail = (message) => {
  console.error(`prepublish-check: BLOCKED ${message}`)
  process.exit(1)
}
const matrix = JSON.parse(readFileSync(join(root, 'contracts', 'dsh', 'support-matrix.json'), 'utf8'))
for (const entry of matrix.entries) {
  if (entry.status !== 'released') fail(`formal matrix entry ${entry.hostVersion} is ${String(entry.status)}, not released`)
  if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) fail(`formal matrix entry ${entry.hostVersion} has no evidence`)
}
const candidates = matrix.entries.flatMap((entry) => entry.evidence ?? [])
if (candidates.length === 0) fail('no evidence files in the formal matrix')
for (const evidence of candidates) {
  try {
    execFileSync('node', ['scripts/release-evidence.mjs', '--tgz', 'dsh-livery-0.1.0.tgz', '--evidence', evidence], { cwd: root, stdio: 'inherit' })
  } catch {
    fail(`candidate artifact / evidence verification failed for ${evidence}`)
  }
}
console.log('prepublish-check: OK stable candidate bytes match committed evidence')
