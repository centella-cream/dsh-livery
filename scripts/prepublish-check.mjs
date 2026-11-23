#!/usr/bin/env node
/**
 * Guard `npm publish`: the candidate bytes must be exactly the accepted artifact
 * for the package version in package.json, and every formal-matrix evidence file
 * must bind those bytes. Version and evidence paths are derived, never hardcoded.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import {
  REQUIRED_UPDATE_CHECKS,
  UPDATE_EVIDENCE_SCHEMA_VERSION,
  defaultCandidatePath,
  evidenceScopeKey,
  matrixEvidence,
  matrixPassedScopes,
  parseFlag,
  readMatrix,
  readPackageJson,
  validateTransition,
} from './release-lib.mjs'

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
const allCandidates = matrixEvidence(matrix)
const candidates = allCandidates.filter((file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')).packageVersion === pkg.version
  } catch {
    fail(`cannot read evidence file: ${file}`)
  }
})
if (candidates.length === 0) fail(`no evidence files for package version ${pkg.version}`)
const scopes = matrixPassedScopes(matrix)
const covered = new Set()
for (const file of candidates) {
  const document = JSON.parse(readFileSync(file, 'utf8'))
  const key = evidenceScopeKey(document)
  if (key !== null) covered.add(key)
}
const missing = scopes.filter((scope) => !covered.has(scope.key))
if (missing.length > 0) {
  fail(`package version ${pkg.version} evidence does not cover ${missing.length}/${scopes.length} passed scopes: ${missing.map((scope) => scope.key).join(', ')}`)
}
const requireUpdate = process.argv.slice(2).includes('--require-update') || process.env.REQUIRE_UPDATE_EVIDENCE === '1'
if (requireUpdate) {
  // The release that claims an in-process update must ship at least one
  // schema-v3 transition record for a matrix-passed Web scope, and that record
  // must bind the same candidate bytes every other evidence file binds.
  const updateDocuments = candidates
    .map((file) => ({ file, document: JSON.parse(readFileSync(file, 'utf8')) }))
    .filter((entry) => entry.document.schemaVersion === UPDATE_EVIDENCE_SCHEMA_VERSION)
  if (updateDocuments.length === 0) {
    fail(`--require-update: no schema-v${UPDATE_EVIDENCE_SCHEMA_VERSION} update evidence for ${pkg.name}@${pkg.version}`)
  }
  const passedWeb = new Set(scopes.filter((scope) => scope.profile === 'web').map((scope) => scope.key))
  const accepted = updateDocuments.filter((entry) => {
    const key = evidenceScopeKey(entry.document)
    if (key === null || !passedWeb.has(key)) return false
    const transition = entry.document.transition
    if (validateTransition(transition, { toVersion: pkg.version }).length > 0) return false
    if (!Array.isArray(entry.document.criticalChecks)) return false
    return entry.document.criticalChecks.some((check) => check.status === 'pass' && REQUIRED_UPDATE_CHECKS.includes(check.id))
  })
  if (accepted.length === 0) {
    fail(`--require-update: the schema-v${UPDATE_EVIDENCE_SCHEMA_VERSION} evidence files do not cover a matrix-passed Web scope with an accepted transition`)
  }
}
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
