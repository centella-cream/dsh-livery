#!/usr/bin/env node
/**
 * Bind a candidate tarball to an acceptance evidence manifest.
 *
 * The evidence file is produced after running the four-target acceptance against
 * one exact candidate tarball. This refuses to proceed unless the tarball hash,
 * commit, adapter identities and non-zero run summaries all agree. It is the
 * machine check behind "accept one artifact, publish the same bytes"; it does not
 * replace the human promotion of the support matrix.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const argv = process.argv.slice(2)
const flag = (name) => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}
const fail = (message) => {
  console.error(`release-evidence: FAIL ${message}`)
  process.exit(1)
}
const tgzPath = flag('--tgz')
const evidencePath = flag('--evidence')
if (tgzPath === undefined || evidencePath === undefined) {
  fail('usage: release-evidence --tgz <candidate.tgz> --evidence <evidence.json>')
}
const tarball = resolve(tgzPath)
const digest = createHash('sha256').update(readFileSync(tarball)).digest('hex')
const evidence = JSON.parse(readFileSync(resolve(evidencePath), 'utf8'))
if (evidence.schemaVersion !== 1) fail(`unsupported evidence schemaVersion ${String(evidence.schemaVersion)}`)
if (evidence.tarballSha256 !== digest) fail(`tarball sha mismatch: file=${digest} evidence=${String(evidence.tarballSha256)}`)
if (!/^[0-9a-f]{40}$/u.test(evidence.commit ?? '')) fail('evidence.commit must be a full git commit')
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
if (evidence.commit !== head) {
  // Accept a later HEAD only when the exact artifact inputs have not changed
  // since the evidence commit (evidence/matrix/docs commits may follow).
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', evidence.commit, head])
  } catch {
    fail(`evidence commit ${evidence.commit} is not an ancestor of HEAD ${head}`)
  }
  const changed = execFileSync('git', ['diff', '--name-only', `${evidence.commit}..${head}`], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean)
  const allowed = /^(contracts\/dsh\/(evidence\/|support-matrix\.json$)|docs\/|README\.md$|README\.zh-CN\.md$|SECURITY\.md$|CHANGELOG\.md$|NOTICE\.md$|CONTRIBUTING|SUPPORT\.md$)/
  const forbidden = changed.filter(file => !allowed.test(file))
  if (forbidden.length > 0) {
    fail(`changes since evidence commit touch artifact inputs: ${forbidden.slice(0, 5).join(', ')}`)
  }
}
if (!Array.isArray(evidence.runs) || evidence.runs.length === 0) fail('evidence.runs must be non-empty')
if (evidence.scope !== undefined) {
  if (evidence.scope.hostVersion === undefined || evidence.scope.profile !== 'web' || evidence.scope.browser !== 'chrome') {
    fail('evidence scope must be the supported web/chrome host/profile')
  }
}
for (const run of evidence.runs) {
  if (typeof run.id !== 'string' || typeof run.hostVersion !== 'string' || typeof run.adapterId !== 'string') {
    fail('every evidence run needs id, hostVersion and adapterId')
  }
  const summary = run.summary ?? {}
  if (typeof summary.pass !== 'number' || summary.pass <= 0) fail(`${run.id}: no passing checks recorded`)
  if (typeof summary.fail !== 'number' || summary.fail !== 0) fail(`${run.id}: failing checks recorded`)
  if (run.tarballSha256 !== undefined && run.tarballSha256 !== digest) fail(`${run.id}: run was not executed on this tarball`)
  if (typeof run.report === 'string') {
    try {
      readFileSync(resolve(run.report))
    } catch {
      fail(`${run.id}: report file is missing: ${run.report}`)
    }
  }
}
console.log(`release-evidence: OK ${digest} commit=${head} runs=${evidence.runs.length}`)
