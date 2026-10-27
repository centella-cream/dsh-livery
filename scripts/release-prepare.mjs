#!/usr/bin/env node
/**
 * Bind one already-built candidate tarball to every formal matrix evidence file.
 *
 * Usage:
 *   pnpm pack:candidate
 *   pnpm release:prepare -- --tgz .tmp/release-check/dsh-livery-<version>.tgz
 *
 * No version, tarball name or evidence path is hardcoded: the package version and
 * evidence list come from package.json and the formal support matrix. The
 * candidate is never rebuilt here.
 */
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { ROOT, defaultCandidatePath, matrixEvidence, parseFlag, readMatrix, readPackageJson } from './release-lib.mjs'

const pkg = readPackageJson()
const supplied = parseFlag(process.argv.slice(2), 'tgz')
const tgz = supplied === undefined ? defaultCandidatePath(pkg) : supplied
if (!existsSync(tgz)) {
  console.error(`release-prepare: candidate tarball missing: ${tgz}`)
  console.error('release-prepare: run `pnpm pack:candidate` first, then pass --tgz <candidate>')
  process.exit(1)
}
const run = (args) => execFileSync(args[0], args.slice(1), { cwd: ROOT, stdio: 'inherit' })
run(['node', 'scripts/release-check.mjs', '--tgz', tgz])
run(['node', 'scripts/cli.mjs', 'gate:support-matrix', '--', '--all'])
run(['node', 'scripts/cli.mjs', 'gate:release', '--', '--all'])
const evidence = matrixEvidence(readMatrix())
if (evidence.length === 0) {
  console.error('release-prepare: formal matrix has no evidence files')
  process.exit(1)
}
for (const file of evidence) run(['node', 'scripts/release-evidence.mjs', '--tgz', tgz, '--evidence', file])
console.log(`release-prepare: OK ${pkg.name}@${pkg.version} bound to ${evidence.length} evidence files`)
