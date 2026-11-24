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
import { ROOT, defaultCandidatePath, matrixEvidence, parseFlag, readJson, readMatrix, readPackageJson } from './release-lib.mjs'

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
// The matrix retains historical evidence for audit. Only files for the package
// version in package.json can bind this candidate; the older entries belong to
// their own published artifacts and are verified by their own releases.
const evidence = matrixEvidence(readMatrix()).filter((file) => readJson(file).packageVersion === pkg.version)
if (evidence.length === 0) {
  console.error(`release-prepare: formal matrix has no evidence files for ${pkg.name}@${pkg.version}`)
  process.exit(1)
}
for (const file of evidence) run(['node', 'scripts/release-evidence.mjs', '--tgz', tgz, '--evidence', file])
console.log(`release-prepare: OK ${pkg.name}@${pkg.version} bound to ${evidence.length} evidence files`)
