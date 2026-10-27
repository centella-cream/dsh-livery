#!/usr/bin/env node
/**
 * Compare the candidate tarball with the exact tarball downloaded back from npm.
 * Fails on any sha256, byte-size, package name or version mismatch.
 */
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { parseFlag, readPackageJson, readTarballPackage, sha256File } from './release-lib.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const argv = process.argv.slice(2)
const candidate = parseFlag(argv, 'candidate')
const registry = parseFlag(argv, 'registry')
if (candidate === undefined || registry === undefined) {
  console.error('verify-published: usage --candidate <accepted.tgz> --registry <npm-downloaded.tgz>')
  process.exit(1)
}
const expected = readPackageJson()
const candidateSha = sha256File(candidate)
const registrySha = sha256File(registry)
const candidateBytes = statSync(candidate).size
const registryBytes = statSync(registry).size
const candidatePkg = readTarballPackage(candidate)
const registryPkg = readTarballPackage(registry)
const problems = []
if (candidateSha !== registrySha) problems.push(`sha256 candidate=${candidateSha} registry=${registrySha}`)
if (candidateBytes !== registryBytes) problems.push(`bytes candidate=${candidateBytes} registry=${registryBytes}`)
if (candidatePkg.name !== expected.name || candidatePkg.version !== expected.version) {
  problems.push(`candidate package ${candidatePkg.name}@${candidatePkg.version} != ${expected.name}@${expected.version}`)
}
if (registryPkg.name !== expected.name || registryPkg.version !== expected.version) {
  problems.push(`registry package ${registryPkg.name}@${registryPkg.version} != ${expected.name}@${expected.version}`)
}
if (problems.length > 0) {
  console.error(`verify-published: FAIL ${problems.join('; ')}`)
  process.exit(1)
}
console.log(`verify-published: OK ${expected.name}@${expected.version} sha256=${candidateSha} bytes=${candidateBytes}`)
