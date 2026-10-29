#!/usr/bin/env node
/**
 * Build schema-v2, probe-bound acceptance evidence from real run artifacts.
 *
 * New round-2 evidence binds every run to a sanitized raw probe committed next to
 * the evidence. The release gate re-reads those probes and requires:
 *   - probe sha256 == run.probeSha256
 *   - probe target tarball/version/host/adapter/commit match the run
 *   - probe summary == run.summary and fail === 0
 *   - every required critical check is present and passing in the raw probe
 *   - report records the exact run commit and reportSha256 matches
 *
 * Usage (repeat --run per formal target; clone is supplementary, never listed):
 *   node scripts/acceptance/evidence.mjs \
 *     --evidence contracts/dsh/evidence/0.1.4/0.2.1-rc.2-web-chrome.json \
 *     --probes-dir contracts/dsh/evidence/0.1.4/probes \
 *     --reports-dir contracts/dsh/evidence/0.1.4/reports \
 *     --tgz dsh-livery-0.1.4.tgz --package-version 0.1.4 \
 *     --run web-isolated-full:0.2.1-rc.2:dsh-0.2.1-rc.2-r1:<probe>:<report>
 */

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { WORKSPACE_ROOT } from './probe/util.mjs'

export const REQUIRED_WEB_CHECKS = Object.freeze([
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
])

export const REQUIRED_DESKTOP_CHECKS = Object.freeze([
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
])

const argv = process.argv.slice(2)
const flag = (name) => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}
const flags = (name) => {
  const values = []
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === name && index + 1 < argv.length) values.push(argv[index + 1])
  }
  return values
}
const fail = (message) => {
  console.error(`acceptance-evidence: FAIL ${message}`)
  process.exit(1)
}
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')

const evidencePath = flag('--evidence')
const probesDir = flag('--probes-dir') ?? 'contracts/dsh/evidence/0.1.4/probes'
const reportsDir = flag('--reports-dir') ?? 'contracts/dsh/evidence/0.1.4/reports'
const tgzPath = flag('--tgz')
const packageVersion = flag('--package-version')
const commitArg = flag('--commit')
const runArgs = flags('--run')
if (!evidencePath || !tgzPath || !packageVersion || runArgs.length === 0) {
  fail('usage: evidence.mjs --evidence <out> --tgz <tgz> --package-version <v> --run <id>:<host>:<adapter>:<probe>:<report> [...]')
}

const repoRoot = WORKSPACE_ROOT
const rel = (absolute) => path.relative(repoRoot, absolute).split(path.sep).join('/')
const resolvePath = (value) => path.resolve(repoRoot, value)
const tarballBytes = readFileSync(resolvePath(tgzPath))
const tarballSha256 = sha256(tarballBytes)
const commit = commitArg ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: repoRoot }).trim()
if (!/^[0-9a-f]{40}$/u.test(commit)) fail(`invalid commit ${String(commit)}`)

const matrix = JSON.parse(readFileSync(path.join(repoRoot, 'contracts', 'dsh', 'support-matrix.json'), 'utf8'))
const matrixEntryFor = (hostVersion) => matrix.entries.find((entry) => entry.hostVersion === hostVersion) ?? null
const certificationFor = (entry) => {
  const certification = {}
  for (const field of ['claimTier', 'distributionChannel', 'certifiedBrowserVersions', 'certifiedRuntimeVersions', 'upstream']) {
    certification[field] = entry[field] ?? null
  }
  return certification
}

const usersHome = process.env.HOME ?? ''

/** Recursively sanitize raw probes/reports: no absolute home paths, tokens or local usernames. */
export function sanitizeText(text) {
  let output = String(text)
  if (usersHome.length > 0) output = output.split(usersHome).join('<home>')
  output = output.split(repoRoot).join('.')
  output = output.replace(/file:\/\/\/[^\s"]+/gu, (value) => value.replace(repoRoot, '.').replace(usersHome, '<home>'))
  output = output.replace(/([?&](?:token|auth|access_token)=)[^&\s"]+/gu, '$1<redacted>')
  output = output.replace(/\/private\/(?:var|tmp)\/[^\s"'`]+/gu, '<tmp>')
  output = output.replace(/\/var\/folders\/[^\s"'`]+/gu, '<tmp>')
  output = output.replace(/\/tmp\/[^\s"'`]+/gu, '<tmp>')
  output = output.replace(/\/Applications\/[^\s"'`]+/gu, '<system-app>')
  output = output.replace(/\/opt\/homebrew\/[^\s"'`]+/gu, '<system>')
  output = output.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gu, '$1<redacted>')
  return output
}

export function sanitizeValue(value) {
  if (typeof value === 'string') return sanitizeText(value)
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value !== null && typeof value === 'object') {
    const result = {}
    for (const [key, child] of Object.entries(value)) result[key] = sanitizeValue(child)
    return result
  }
  return value
}

function sanitizeJson(value) {
  return `${JSON.stringify(sanitizeValue(value), null, 2)}\n`
}

mkdirSync(path.resolve(repoRoot, probesDir), { recursive: true })
mkdirSync(path.resolve(repoRoot, reportsDir), { recursive: true })

const runs = []
const criticalCheckMap = new Map()
let profile = null
let scope = null
let targetCertification = null
let criticalIds = null

for (const raw of runArgs) {
  const parts = raw.split(':')
  if (parts.length < 5) fail(`--run must be id:hostVersion:adapterId:probe:report, got ${raw}`)
  const reportPath = parts.slice(4).join(':')
  const [id, hostVersion, adapterId] = parts.slice(0, 3)
  const probePath = parts[3]
  const probeFile = resolvePath(probePath)
  const reportFile = resolvePath(reportPath)
  if (!existsSync(probeFile)) fail(`${id}: probe missing: ${probePath}`)
  if (!existsSync(reportFile)) fail(`${id}: report missing: ${reportPath}`)
  const probe = JSON.parse(readFileSync(probeFile, 'utf8'))
  const entry = matrixEntryFor(hostVersion)
  if (!entry) fail(`${id}: hostVersion ${hostVersion} is not in the formal matrix`)
  const probeSummary = probe.summary ?? {}
  if (probeSummary.fail !== 0) fail(`${id}: probe records failing checks`)
  if (typeof probeSummary.pass !== 'number' || probeSummary.pass <= 0) fail(`${id}: probe has no passing checks`)
  if (probe.target?.tarballSha256 !== tarballSha256) fail(`${id}: probe tarball sha mismatch`)
  if (probe.target?.hostVersion !== hostVersion) fail(`${id}: probe hostVersion mismatch`)
  if (probe.target?.adapterId !== adapterId) fail(`${id}: probe adapterId mismatch`)
  if (probe.target?.packageVersion !== packageVersion) fail(`${id}: probe packageVersion mismatch`)
  if (probe.environment?.commit !== commit) fail(`${id}: probe environment.commit ${String(probe.environment?.commit)} != run commit ${commit}`)
  const runProfile = probe.target?.scope?.profile
  if (runProfile !== 'web' && runProfile !== 'desktop') fail(`${id}: probe scope.profile is ${String(runProfile)}`)
  if (profile === null) {
    profile = runProfile
    scope = probe.target.scope
    targetCertification = certificationFor(entry)
    criticalIds = runProfile === 'web' ? REQUIRED_WEB_CHECKS : REQUIRED_DESKTOP_CHECKS
  } else if (profile !== runProfile) {
    fail(`${id}: mixed scope profiles in one evidence file`)
  }
  if (runProfile === 'web' && (probe.target.scope.browser !== 'chrome' || entry.profiles?.web?.chrome !== 'passed')) {
    fail(`${id}: web run is not chrome/passed in matrix`)
  }
  if (runProfile === 'desktop' && entry.profiles?.desktop?.macos !== 'passed') fail(`${id}: desktop.macos is not passed in matrix`)
  const checks = new Map((probe.checks ?? []).map((check) => [check.id, check]))
  for (const checkId of criticalIds) {
    const check = checks.get(checkId)
    if (check === undefined) fail(`${id}: required critical check missing from probe: ${checkId}`)
    if (check.status !== 'pass') fail(`${id}: required critical check not pass in probe: ${checkId} (${check.status})`)
    criticalCheckMap.set(checkId, { id: checkId, status: check.status, title: check.title })
  }
  const sanitizedProbe = sanitizeJson(probe)
  const probeOut = path.resolve(repoRoot, probesDir, `${id}.json`)
  writeFileSync(probeOut, sanitizedProbe)
  const probeSha256 = sha256(Buffer.from(sanitizedProbe))
  let reportText = sanitizeText(readFileSync(reportFile, 'utf8'))
  if (!reportText.includes(commit)) {
    reportText = `${reportText.trimEnd()}\n\n**Run commit:** \`${commit}\`\n`
  }
  const reportOut = path.resolve(repoRoot, reportsDir, `${id}.md`)
  writeFileSync(reportOut, reportText)
  const reportSha256 = sha256(Buffer.from(reportText))
  runs.push({
    id,
    commit,
    hostVersion,
    adapterId,
    tarballSha256,
    summary: {
      pass: probeSummary.pass,
      fail: probeSummary.fail,
      skip: probeSummary.skip,
      warn: probeSummary.warn,
      total: probeSummary.total,
    },
    probe: rel(probeOut),
    probeSha256,
    report: rel(reportOut),
    reportSha256,
  })
}

if (profile === null) fail('no runs')
const evidence = {
  schemaVersion: 2,
  commit,
  packageVersion,
  tarballSha256,
  tarballBytes: tarballBytes.length,
  generatedAt: new Date().toISOString(),
  scope: {
    hostVersion: scope.hostVersion,
    profile: profile,
    ...(profile === 'web' ? { browser: 'chrome' } : { platform: 'macos' }),
    browserVersion: scope.browserVersion,
  },
  target: {
    scope: {
      hostVersion: scope.hostVersion,
      profile: profile,
      ...(profile === 'web' ? { browser: 'chrome' } : { platform: 'macos', browser: 'chrome' }),
      browserVersion: scope.browserVersion,
    },
    certification: targetCertification,
  },
  criticalChecks: [...criticalCheckMap.values()],
  runs,
}
writeFileSync(resolvePath(evidencePath), `${JSON.stringify(evidence, null, 2)}\n`)
console.log(`acceptance-evidence: wrote ${rel(resolvePath(evidencePath))} — ${runs.length} run(s), ${evidence.criticalChecks.length} critical checks, probes in ${probesDir}`)
