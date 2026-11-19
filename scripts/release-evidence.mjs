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
if (evidence.schemaVersion !== 2) fail(`unsupported evidence schemaVersion ${String(evidence.schemaVersion)}`)
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
  const scopeCert = entry.scopeCertification?.[targetScope.profile]?.[targetScope.profile === 'web' ? 'chrome' : 'macos']
  if (scopeCert !== undefined) {
    const versions = scopeCert.browserVersions ?? []
    if (!versions.includes(targetScope.browserVersion)) {
      fail(`browser ${targetScope.browserVersion} is not certified for ${targetScope.profile} scope ${entry.hostVersion}`)
    }
  }
  if (targetScope.profile === 'web' && targetScope.browser !== 'chrome') fail('web evidence target.scope.browser must be chrome')
  if (targetScope.profile === 'desktop' && targetScope.platform !== 'macos') fail('desktop evidence target.scope.platform must be macos')
}
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`
}
function sha256Text(text) {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`
}

if (!Array.isArray(evidence.runs) || evidence.runs.length === 0) fail('evidence.runs must be non-empty')
// 0.2.0+ requires the canonical audit envelopes supplied by the compiler. This
// proves the envelope corresponds to the accepted catalog identity and is not a
// self-reported summary.
if (Number.parseInt(String(evidence.packageVersion).split('.')[0] ?? '0', 10) >= 2) {
  if (!Array.isArray(evidence.auditEnvelopes) || evidence.auditEnvelopes.length === 0) {
    fail('0.2.0+ evidence must include auditEnvelopes')
  }
  for (const entry of evidence.auditEnvelopes) {
    if (typeof entry.path !== 'string' || typeof entry.sha256 !== 'string') {
      fail('each audit envelope entry needs path + sha256')
    }
    let bytes
    try {
      bytes = readFileSync(resolve(entry.path))
    } catch {
      fail(`audit envelope is missing: ${entry.path}`)
    }
    const fileHash = createHash('sha256').update(bytes).digest('hex')
    if (fileHash !== entry.sha256) fail(`audit envelope sha mismatch: ${entry.path}`)
    let envelopes
    try {
      envelopes = JSON.parse(bytes.toString('utf8'))
    } catch {
      fail(`audit envelope is not JSON: ${entry.path}`)
    }
    if (!Array.isArray(envelopes) || envelopes.length === 0) fail(`audit envelope is empty: ${entry.path}`)
    for (const envelope of envelopes) {
      const payload = envelope?.payload
      if (payload === null || typeof payload !== 'object') fail(`audit envelope payload missing: ${entry.path}`)
      if (Object.prototype.hasOwnProperty.call(payload, 'auditHash')) fail(`audit payload must not contain auditHash: ${entry.path}`)
      if (typeof envelope.auditHash !== 'string' || envelope.auditHash !== sha256Text(canonicalJson(payload))) {
        fail(`auditHash mismatch: ${entry.path}`)
      }
      if (typeof payload.catalogHash !== 'string' || payload.catalogHash === '') fail(`audit catalogHash missing: ${entry.path}`)
      const packed = execFileSync('tar', ['-xOzf', tarball, 'package/lib/index.js'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
      if (!packed.includes(payload.catalogHash)) fail(`audit catalogHash does not appear in the candidate Catalog: ${entry.path}`)
      if (typeof payload.auditSummaryHash !== 'string' || payload.auditSummaryHash === '') fail(`audit summary hash missing: ${entry.path}`)
      const catalogFile = `package/lib/catalogs/${String(payload.profileId).replace(':', '-')}.json`
      let catalog
      try {
        catalog = JSON.parse(execFileSync('tar', ['-xOzf', tarball, catalogFile], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }))
      } catch {
        fail(`packaged catalog missing: ${catalogFile}`)
      }
      const livery = Array.isArray(catalog.liveries) ? catalog.liveries.find((candidate) => candidate.id === payload.liveryId) : undefined
      if (!livery) fail(`audit livery not present in packaged catalog: ${payload.liveryId}`)
      if (livery.hash !== payload.liveryHash) fail(`audit liveryHash does not match packaged catalog: ${payload.liveryId}`)
      if (livery.cssHash !== payload.cssHash) fail(`audit cssHash does not match packaged catalog: ${payload.liveryId}`)
      if (sha256Text(canonicalJson(livery.auditSummary)) !== payload.auditSummaryHash) fail(`audit summary hash does not match packaged catalog: ${payload.liveryId}`)
      if (!Array.isArray(payload.decorationAudits)) fail(`decoration audits missing: ${entry.path}`)
      for (const audit of payload.decorationAudits) {
        if (Array.isArray(audit.issues) && audit.issues.length > 0) fail(`decoration audit has issues: ${entry.path}`)
      }
      if (typeof payload.liveryId !== 'string' || payload.liveryId === '') fail(`audit liveryId missing: ${entry.path}`)
      if (typeof payload.liveryHash !== 'string' || payload.liveryHash === '') fail(`audit liveryHash missing: ${entry.path}`)
      if (typeof payload.cssHash !== 'string' || payload.cssHash === '') fail(`audit cssHash missing: ${entry.path}`)
    }
  }
}
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
// Critical checks that must be present AND pass. Counts alone cannot catch a
// skipped safety path (preset partial failure, floating surfaces, migration).
const REQUIRED_WEB_CHECKS = [
  'env.browser-version',
  'handshake.certified-adapter',
  'catalog.certified-identity',
  'merged.two-tab-sync',
  'merged.two-tab-clear',
  'merged.state-migration-v1',
  'merged.preset-import-diff',
  'merged.preset-apply-atomic',
  'merged.preset-invalid-rejected',
  'merged.preset-partial-failure',
  'merged.position-remote',
  'merged.clear-local-data',
  'visual.floating-surfaces',
]
const REQUIRED_DESKTOP_CHECKS = [
  'desktop.official-install',
  'desktop.certified-runtime',
  'desktop.renderer-launches',
  'desktop.boot-graph-row',
  'desktop.apply-persists',
  'desktop.position-remote',
  'desktop.reduced-transparency',
  'desktop.floating-surfaces',
  'desktop.restore-stock',
  'desktop.matrix-consistency',
]
const profile = evidence.scope?.profile
const requiredChecks = profile === 'web'
  ? REQUIRED_WEB_CHECKS
  : profile === 'desktop'
    ? REQUIRED_DESKTOP_CHECKS
    : []
if (!Array.isArray(evidence.criticalChecks)) {
  fail('evidence.criticalChecks is required for display, but it is validated against raw probes')
}
const evidenceCritical = new Map(evidence.criticalChecks.map((check) => [check.id, check.status]))
const observedCritical = new Map()
let runCommit
for (const run of evidence.runs) {
  if (typeof run.id !== 'string' || typeof run.hostVersion !== 'string' || typeof run.adapterId !== 'string') {
    fail('every evidence run needs id, hostVersion and adapterId')
  }
  if (typeof run.commit !== 'string' || !/^[0-9a-f]{40}$/u.test(run.commit)) fail(`${run.id}: run.commit must be exact`)
  if (runCommit === undefined) runCommit = run.commit
  if (run.commit !== runCommit) fail(`${run.id}: all runs must execute on the same final commit`)
  if (run.tarballSha256 !== digest) fail(`${run.id}: run.tarballSha256 must equal the candidate`)
  if (typeof run.probe !== 'string' || typeof run.probeSha256 !== 'string') {
    fail(`${run.id}: sanitized raw probe path + probeSha256 are required`)
  }
  let probeBytes
  try {
    probeBytes = readFileSync(resolve(run.probe))
  } catch {
    fail(`${run.id}: probe file is missing: ${run.probe}`)
  }
  const probeHash = createHash('sha256').update(probeBytes).digest('hex')
  if (probeHash !== run.probeSha256) fail(`${run.id}: probe sha mismatch: file=${probeHash} evidence=${run.probeSha256}`)
  let probe
  try {
    probe = JSON.parse(probeBytes.toString('utf8'))
  } catch {
    fail(`${run.id}: probe is not valid JSON`)
  }
  const probeSummary = probe.summary ?? {}
  for (const key of ['pass', 'fail', 'skip', 'warn', 'total']) {
    if (run.summary?.[key] !== probeSummary[key]) {
      fail(`${run.id}: evidence summary.${key}=${String(run.summary?.[key])} != probe ${String(probeSummary[key])}`)
    }
  }
  if (typeof probeSummary.pass !== 'number' || probeSummary.pass <= 0) fail(`${run.id}: probe has no passing checks`)
  if (probeSummary.fail !== 0) fail(`${run.id}: probe records failing checks`)
  if (probe.target?.packageVersion !== evidence.packageVersion) fail(`${run.id}: probe packageVersion mismatch`)
  if (probe.target?.tarballSha256 !== digest) fail(`${run.id}: probe was not run on this tarball`)
  if (probe.target?.hostVersion !== run.hostVersion) fail(`${run.id}: probe hostVersion mismatch`)
  if (probe.target?.adapterId !== run.adapterId) fail(`${run.id}: probe adapterId mismatch`)
  if (probe.environment?.commit !== run.commit) fail(`${run.id}: probe commit mismatch`)
  if (profile === 'web' && probe.target?.scope?.browserVersion !== evidence.target?.scope?.browserVersion) {
    fail(`${run.id}: probe browser version does not match evidence target`)
  }
  const checks = new Map((probe.checks ?? []).map((check) => [check.id, check.status]))
  for (const id of requiredChecks) {
    const status = checks.get(id)
    if (status === undefined) fail(`${run.id}: required critical check missing from raw probe: ${id}`)
    if (status !== 'pass') fail(`${run.id}: required critical check not pass in raw probe: ${id} (${String(status)})`)
    if (evidenceCritical.get(id) !== status) fail(`${run.id}: evidence criticalChecks.${id} does not match raw probe`)
    observedCritical.set(id, status)
  }
  let report
  try {
    report = readFileSync(resolve(run.report))
  } catch {
    fail(`${run.id}: report file is missing: ${run.report}`)
  }
  if (typeof run.reportSha256 !== 'string') fail(`${run.id}: reportSha256 is required`)
  const reportHash = createHash('sha256').update(report).digest('hex')
  if (reportHash !== run.reportSha256) fail(`${run.id}: report sha mismatch: file=${reportHash} evidence=${run.reportSha256}`)
  if (!report.toString('utf8').includes(run.commit)) fail(`${run.id}: report does not record the run commit`)
}
if (runCommit !== undefined) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', runCommit, head])
  } catch {
    fail(`run commit ${runCommit} is not an ancestor of HEAD ${head}`)
  }
  const changedSinceRun = execFileSync('git', ['diff', '--name-only', `${runCommit}..${head}`], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean)
  // CI-only workflow/gate changes after the acceptance run do not alter the
  // artifact bytes; still refuse any product/docs/matrix/package change.
  const allowedAfterRun = /^(contracts\/dsh\/evidence\/|contracts\/dsh\/support-matrix\.json$|contracts\/dsh\/perf-baseline\.json$|tests\/|\.github\/workflows\/|scripts\/release-evidence\.mjs$|scripts\/prepublish-check\.mjs$|scripts\/acceptance\/|AGENTS\.md$)/
  const forbidden = changedSinceRun.filter(file => !allowedAfterRun.test(file))
  if (forbidden.length > 0) {
    fail(`acceptance ran on a dirty/older harness: changes after run commit include ${forbidden.slice(0, 5).join(', ')}`)
  }
}
for (const id of requiredChecks) {
  if (evidenceCritical.get(id) !== observedCritical.get(id)) fail(`evidence criticalChecks.${id} is not backed by a probe`)
}
console.log(`release-evidence: OK ${digest} commit=${head} runs=${evidence.runs.length}`)
