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
import { readMatrix } from './release-lib.mjs'

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
// Scope and certification claims are checked against the formal matrix; no
// host version list or browser/runtime list is hardcoded in this script.
const matrix = readMatrix()
const matrixEntryFor = (hostVersion) =>
  matrix.entries.find((entry) => entry.hostVersion === hostVersion) ?? null
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
  const allowed = /^(contracts\/dsh\/(evidence\/|support-matrix\.json$|perf-baseline\.json$)|docs\/|\.github\/|scripts\/|tests\/|vitest\.config\.ts$|README\.md$|README\.zh-CN\.md$|SECURITY\.md$|CHANGELOG\.md$|NOTICE\.md$|CONTRIBUTING|SUPPORT\.md$|AGENTS\.md$)/
  const forbidden = changed.filter(file => !allowed.test(file))
  if (forbidden.length > 0) {
    fail(`changes since evidence commit touch artifact inputs: ${forbidden.slice(0, 5).join(', ')}`)
  }
}
// Every current evidence manifest must copy the exact matrix certification and
// record the exact browser version; nothing is keyed to a specific release path.
{
  const targetScope = evidence.target?.scope
  if (!targetScope || typeof targetScope.browserVersion !== 'string' || !/^\d+\.\d+\.\d+\.\d+$/u.test(targetScope.browserVersion)) {
    fail('evidence must record target.scope.browserVersion as a full four-part version')
  }
  const hostVersion = targetScope.hostVersion ?? evidence.scope?.hostVersion
  const entry = matrixEntryFor(hostVersion)
  if (!entry) fail(`evidence target.scope.hostVersion ${String(hostVersion)} has no matrix entry`)
  const certification = evidence.target?.certification
  if (!certification || typeof certification !== 'object') {
    fail('evidence must copy target.certification from the support matrix')
  }
  for (const field of ['claimTier', 'distributionChannel', 'certifiedBrowserVersions', 'certifiedRuntimeVersions', 'upstream']) {
    const expected = JSON.stringify(entry[field] ?? null)
    const actual = JSON.stringify(certification[field] ?? null)
    if (expected !== actual) fail(`evidence target.certification.${field} does not match the support matrix`)
  }
  if (targetScope.profile === 'web' && targetScope.browser !== 'chrome') fail('web evidence target.scope.browser must be chrome')
  if (targetScope.profile === 'desktop' && targetScope.platform !== 'macos') fail('desktop evidence target.scope.platform must be macos')
}
if (!Array.isArray(evidence.runs) || evidence.runs.length === 0) fail('evidence.runs must be non-empty')
if (evidence.scope !== undefined) {
  const scope = evidence.scope
  const entry = matrix.entries.find((candidate) => candidate.hostVersion === scope.hostVersion)
  if (entry === undefined) fail(`evidence scope hostVersion ${String(scope.hostVersion)} is not in the formal matrix`)
  if (scope.profile === 'web') {
    if (entry.profiles.web.chrome !== 'passed' || scope.browser !== 'chrome') {
      fail(`web evidence for ${scope.hostVersion} requires a passed web.chrome matrix entry`)
    }
    const browserVersion = scope.browserVersion ?? evidence.target?.scope?.browserVersion
    if (typeof browserVersion !== 'string') fail('web evidence must record an exact scope.browserVersion')
    if (!entry.certifiedBrowserVersions?.includes(browserVersion)) {
      fail(`browser ${browserVersion} is not certified for ${scope.hostVersion} (certified: ${(entry.certifiedBrowserVersions ?? []).join(', ')})`)
    }
  } else if (scope.profile === 'desktop') {
    if (entry.profiles.desktop.macos !== 'passed' || scope.platform !== 'macos') {
      fail(`desktop evidence for ${scope.hostVersion} requires a passed desktop.macos matrix entry`)
    }
  } else {
    fail('evidence scope profile must be web or desktop')
  }
  const claimed = evidence.target?.certification
  if (claimed !== undefined) {
    const expected = {
      claimTier: entry.claimTier,
      distributionChannel: entry.distributionChannel,
      certifiedBrowserVersions: entry.certifiedBrowserVersions,
      certifiedRuntimeVersions: entry.certifiedRuntimeVersions,
      upstream: entry.upstream,
    }
    for (const [key, value] of Object.entries(expected)) {
      if (JSON.stringify(claimed[key]) !== JSON.stringify(value)) {
        fail(`evidence target.certification.${key} does not match the formal matrix`)
      }
    }
  }
}
{
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
  if (evidence.packageVersion !== pkg.version) fail(`evidence packageVersion ${String(evidence.packageVersion)} != package.json ${pkg.version}`)
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
    let report
    try {
      report = readFileSync(resolve(run.report))
    } catch {
      fail(`${run.id}: report file is missing: ${run.report}`)
    }
    if (typeof run.reportSha256 === 'string') {
      const hash = createHash('sha256').update(report).digest('hex')
      if (hash !== run.reportSha256) fail(`${run.id}: report sha mismatch: file=${hash} evidence=${run.reportSha256}`)
    }
  }
}
console.log(`release-evidence: OK ${digest} commit=${head} runs=${evidence.runs.length}`)
