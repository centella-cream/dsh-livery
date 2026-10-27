#!/usr/bin/env node
/**
 * Acceptance-harness selftest (no product/artifact involvement).
 *
 * Run: node scripts/acceptance/selftest.mjs
 *
 * Covers the 0.1.3 acceptance-owned invariants:
 * - exact full browser version validation (`--expect-browser-version` semantics)
 * - matrix `certifiedBrowserVersions` / certification-field copying
 * - Desktop report truthfulness (skipped first-paint never becomes "verified")
 * - Desktop report/matrix consistency (a report may never claim stronger than
 *   the matrix desktop.macos status)
 */

import assert from 'node:assert/strict'
import {
  certificationFor,
  describeCertification,
  validateBrowserVersion,
} from './probe/support-matrix.mjs'
import { buildDesktopClaims, validateDesktopClaims } from './probe/report-claims.mjs'

let checks = 0
const results = []
function check(name, fn) {
  checks += 1
  try {
    fn()
    results.push(`PASS ${name}`)
  } catch (error) {
    results.push(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}

const matrix = {
  schemaVersion: 1,
  entries: [
    {
      hostVersion: '0.2.1-rc.2',
      status: 'released',
      claimTier: 'stable',
      distributionChannel: 'latest',
      certifiedBrowserVersions: ['156.0.8078.48'],
      certifiedRuntimeVersions: ['22.23.1'],
      upstream: { githubTag: 'dsh-v0.2.1-rc.2', npmVersion: '0.2.1-rc.2' },
      profiles: { desktop: { macos: 'not-supported' }, web: { chrome: 'passed' } },
    },
    {
      hostVersion: '0.2.1-rc.4',
      status: 'released',
      claimTier: 'preview',
      distributionChannel: 'next',
      certifiedBrowserVersions: ['156.0.8078.48'],
      certifiedRuntimeVersions: ['22.23.1'],
      upstream: { githubTag: null, npmVersion: '0.2.1-rc.4' },
      profiles: { desktop: { macos: 'not-supported' }, web: { chrome: 'passed' } },
    },
    {
      hostVersion: '0.2.1-rc.3',
      status: 'released',
      claimTier: 'stable',
      distributionChannel: 'desktop-app',
      certifiedBrowserVersions: ['152.0.7977.130'],
      certifiedRuntimeVersions: ['24.21.0'],
      upstream: { githubTag: 'dsh-v0.2.1-rc.3', npmVersion: '0.2.1-rc.3' },
      profiles: { desktop: { macos: 'passed' }, web: { chrome: 'not-supported' } },
    },
  ],
}

check('matrix certification shape is copied exactly', () => {
  const { certification } = certificationFor('0.2.1-rc.2', matrix)
  assert.deepEqual(certification, {
    claimTier: 'stable',
    distributionChannel: 'latest',
    certifiedBrowserVersions: ['156.0.8078.48'],
    certifiedRuntimeVersions: ['22.23.1'],
    upstream: { githubTag: 'dsh-v0.2.1-rc.2', npmVersion: '0.2.1-rc.2' },
  })
  assert.match(describeCertification('0.2.1-rc.4', matrix), /claimTier=preview/)
  assert.match(describeCertification('0.2.1-rc.4', matrix), /browsers=\[156\.0\.8078\.48\]/)
})

check('legacy matrix (no certification fields) stays null-ish', () => {
  const legacy = { schemaVersion: 1, entries: [{ hostVersion: '0.2.1-rc.2', status: 'released' }] }
  const { certification, legacy: isLegacy } = certificationFor('0.2.1-rc.2', legacy)
  assert.equal(isLegacy, true)
  assert.deepEqual(certification, {
    claimTier: null,
    distributionChannel: null,
    certifiedBrowserVersions: [],
    certifiedRuntimeVersions: [],
    upstream: null,
  })
})

check('browser version: exact flag match passes', () => {
  const result = validateBrowserVersion({ hostVersion: '0.2.1-rc.2', actualVersion: '156.0.8078.48', expectedVersion: '156.0.8078.48', matrix })
  assert.equal(result.ok, true, result.problems.join('; '))
})

check('browser version: flag mismatch fails', () => {
  const result = validateBrowserVersion({ hostVersion: '0.2.1-rc.2', actualVersion: '156.0.8079.1', expectedVersion: '156.0.8078.48', matrix })
  assert.equal(result.ok, false)
  assert.match(result.problems.join('; '), /≠ --expect-browser-version/)
})

check('browser version: actual outside matrix certified list fails', () => {
  const result = validateBrowserVersion({ hostVersion: '0.2.1-rc.2', actualVersion: '156.0.8079.1', matrix })
  assert.equal(result.ok, false)
  assert.match(result.problems.join('; '), /not in matrix certifiedBrowserVersions/)
})

check('browser version: expect flag outside matrix certified list fails', () => {
  const result = validateBrowserVersion({ hostVersion: '0.2.1-rc.2', actualVersion: '156.0.8078.48', expectedVersion: '156.0.8079.1', matrix })
  assert.equal(result.ok, false)
  assert.match(result.problems.join('; '), /not certified for 0\.2\.1-rc\.2/)
})

check('certified full chrome versions differ per host', () => {
  const rc4 = validateBrowserVersion({ hostVersion: '0.2.1-rc.4', actualVersion: '156.0.8078.48', matrix })
  assert.equal(rc4.ok, true)
  const rc3 = validateBrowserVersion({ hostVersion: '0.2.1-rc.3', actualVersion: '152.0.7977.130', matrix })
  assert.equal(rc3.ok, true)
})

const passedDesktopChecks = [
  'desktop.certified-runtime',
  'desktop.official-install',
  'desktop.renderer-launches',
  'desktop.boot-graph-row',
  'desktop.catalog-identity',
  'desktop.stock-start',
  'desktop.sidebar-entry',
  'desktop.main-panel',
  'desktop.gallery',
  'desktop.gallery-families',
  'desktop.preview-locale',
  'desktop.preview-locale-en',
  'desktop.preview-locale-zh',
  'desktop.wallpaper',
  'desktop.preview',
  'desktop.preview-cancel',
  'desktop.apply-persists',
  'desktop.boot-injection',
  'desktop.hash-equality',
  'desktop.theme-light',
  'desktop.theme-dark',
  'desktop.font-role-hooks',
  'desktop.self-check',
  'desktop.restore-stock',
].map((id) => ({ id, status: 'pass', detail: 'fixture pass' }))

check('desktop claims: passed checks + passed matrix → renderer-verified, no first-paint claim', () => {
  const checks = [...passedDesktopChecks, { id: 'desktop.first-paint-sampling', status: 'skip', detail: 'fixture skip' }]
  const claims = buildDesktopClaims({ checks, matrixStatus: 'passed' })
  assert.equal(claims.claimLevel, 'renderer-verified')
  assert.equal(claims.certified, true)
  assert.equal(claims.contradictions.length, 0)
  assert.equal(claims.firstPaint.verified, false)
  assert.ok(claims.verified.every((line) => !/first[- ]paint/u.test(line)), 'verified list must not claim first-paint')
  assert.ok(claims.notVerified.some((line) => /first paint sampling — NOT verified/u.test(line)))
})

check('desktop claims: first-paint pass adds the claim only then', () => {
  const checks = [...passedDesktopChecks, { id: 'desktop.first-paint-sampling', status: 'pass', detail: 'fixture pass' }]
  const claims = buildDesktopClaims({ checks, matrixStatus: 'passed' })
  assert.equal(claims.firstPaint.verified, true)
  assert.ok(claims.verified.some((line) => /first-paint sampling/u.test(line)))
})

check('desktop claims: pending matrix → diagnostic-only and enabled checks are explicitly not certified', () => {
  const checks = [...passedDesktopChecks, { id: 'desktop.first-paint-sampling', status: 'skip', detail: 'fixture skip' }]
  const claims = buildDesktopClaims({ checks, matrixStatus: 'pending' })
  assert.equal(claims.claimLevel, 'diagnostic-only')
  assert.equal(claims.certified, false)
  assert.match(claims.statement, /NOT certified/)
  assert.equal(validateDesktopClaims(claims, 'pending').length, 0)
})

check('desktop claims: report may not claim renderer certification on pending matrix', () => {
  const fake = { claimLevel: 'renderer-verified', firstPaint: { status: 'skip', verified: false } }
  assert.match(validateDesktopClaims(fake, 'pending').join('; '), /stronger than|claims renderer certification/)
})

check('desktop claims: skip cannot be relabeled as verified first-paint', () => {
  const fake = { claimLevel: 'renderer-verified', firstPaint: { status: 'skip', verified: true } }
  assert.match(validateDesktopClaims(fake, 'passed').join('; '), /first-paint verified/)
})

check('desktop claims: missing matrix status is a consistency failure', () => {
  const checks = [...passedDesktopChecks, { id: 'desktop.first-paint-sampling', status: 'skip', detail: 'fixture skip' }]
  const claims = buildDesktopClaims({ checks, matrixStatus: null })
  assert.equal(claims.claimLevel, 'diagnostic-only')
  assert.match(claims.statement, /status missing|NOT certified/)
  assert.match(claims.contradictions.join('; '), /no known profiles\.desktop\.macos status/)
})

check('desktop claims: missing check group is not verified', () => {
  const checks = passedDesktopChecks.filter((check) => check.id !== 'desktop.official-install')
  const claims = buildDesktopClaims({ checks, matrixStatus: 'passed' })
  assert.ok(claims.notVerified.some((line) => /official plugin-manager install/u.test(line)))
})

for (const line of results) console.log(line)
console.log(`\n${checks} checks — ${process.exitCode === 1 ? 'FAIL' : 'PASS'}`)
