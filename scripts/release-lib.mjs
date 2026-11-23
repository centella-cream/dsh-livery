/**
 * Shared release helpers. Every version, package name, tarball name, evidence
 * path and allowlist is derived; release scripts must not hardcode a version.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const CANDIDATE_DIR = join(ROOT, '.tmp', 'release-check')
export const MATRIX_PATH = join(ROOT, 'contracts', 'dsh', 'support-matrix.json')

export function readJson(path) {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
}

export function readPackageJson() {
  return readJson('package.json')
}

export function packageShortName(pkg = readPackageJson()) {
  return pkg.name.split('/').at(-1)
}

export function tarballName(pkg = readPackageJson()) {
  return `${packageShortName(pkg)}-${pkg.version}.tgz`
}

export function defaultCandidatePath(pkg = readPackageJson()) {
  return join(CANDIDATE_DIR, tarballName(pkg))
}

export function readMatrix() {
  return readJson(MATRIX_PATH)
}

export function matrixEvidence(matrix = readMatrix()) {
  return [...new Set(matrix.entries.flatMap((entry) => entry.evidence ?? []))]
}

export function readTarballPackage(tarball) {
  const text = execFileSync('tar', ['-xOzf', tarball, 'package/package.json'], { encoding: 'utf8' })
  return JSON.parse(text)
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

export function parseFlag(argv, name) {
  const index = argv.indexOf(`--${name}`)
  return index === -1 ? undefined : argv[index + 1]
}

/** Formal matrix scopes that are currently `passed`. */
export function matrixPassedScopes(matrix = readMatrix()) {
  const scopes = []
  for (const entry of matrix.entries) {
    for (const [profile, platforms] of Object.entries(entry.profiles ?? {})) {
      for (const [platform, status] of Object.entries(platforms ?? {})) {
        if (status !== 'passed') continue
        scopes.push({
          key: `${entry.hostVersion}:${profile}:${platform}`,
          hostVersion: entry.hostVersion,
          profile,
          platform,
          claimTier: entry.claimTier,
        })
      }
    }
  }
  return scopes
}

/** Scope key declared by one evidence document. */
export function evidenceScopeKey(document) {
  const scope = document?.scope
  if (!scope || typeof scope.hostVersion !== 'string') return null
  const profile = scope.profile
  const platform = profile === 'web' ? (scope.browser ?? 'chrome') : (scope.platform ?? 'macos')
  return `${scope.hostVersion}:${profile}:${platform}`
}

/* ------------------------------------------------------------------------- */
/* Update-probe acceptance evidence (schema v3)                               */
/* ------------------------------------------------------------------------- */

/**
 * Evidence schema version of an update run. Normal (fresh-install) runs stay on
 * schema v2; only a run that installs a previously accepted tarball, updates to
 * the candidate through the running Host's plugin manager and records the
 * resulting in-process transition is schema v3.
 */
export const UPDATE_EVIDENCE_SCHEMA_VERSION = 3

/**
 * How an update was requested. The Host's own "Add plugin" install dialog with
 * a local tarball path is the only accepted trigger for 0.2.2: a local offline
 * registry is a supplementary diagnostic, never acceptance evidence
 * (`docs/design/0.2.2-plan.md` §5.4).
 */
export const UPDATE_TRANSITION_TRIGGERS = Object.freeze(['host-install-dialog'])

/**
 * What the running Host's plugin manager reported after the install settled.
 * `applied` means the new bundle was published into the live process; a
 * `restart-required` answer cannot be used as hot-update acceptance evidence.
 */
export const UPDATE_MANAGER_OUTCOMES = Object.freeze([
  'applied',
  'restart-required',
  'failed',
  'unconfirmed',
  'cancelled',
])

/** Frozen transition fields the evidence schema validates (exact, no extras). */
export const UPDATE_TRANSITION_FIELDS = Object.freeze([
  'fromVersion',
  'fromSha256',
  'fromBytes',
  'toVersion',
  'toSha256',
  'trigger',
  'pageReloaded',
  'staleBootObserved',
  'catalogReadopted',
  'managerOutcome',
])

/**
 * Checks an update run must prove in its raw probe. `scripts/acceptance/web.mjs`
 * records them under `update.*`; `scripts/acceptance/evidence.mjs` copies them
 * into `criticalChecks`; `scripts/release-evidence.mjs` re-reads the raw probe
 * and requires each one to be present and passing.
 */
export const REQUIRED_UPDATE_CHECKS = Object.freeze([
  'env.certified-host',
  'env.browser-version',
  'update.from-artifact-verified',
  'update.from-installed',
  'update.dialog-available',
  'update.dialog-install-completed',
  'update.manager-outcome',
  'update.new-client-bundle-loaded',
  'update.no-page-navigation',
  'update.boot-payload-previous',
  'update.live-client-build-candidate',
  'update.catalog-refetched',
  'update.catalog-applied',
  'update.stale-boot-observed',
  'update.detail-section-renders',
  'update.transition-recorded',
])

/** Fresh-install Web critical checks (shared by evidence emission and release gate). */
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
  'merged.preset-style-roundtrip',
  'merged.preset-v2-attribution',
  'wallpaper.no-request-before-online',
  'wallpaper.online-first-batch',
  'wallpaper.provider-selector',
  'wallpaper.provider-served-by',
  'wallpaper.builtin-visible-8',
  'wallpaper.builtin-classic',
  'wallpaper.style-card',
  'wallpaper.attribution-links',
  'plugin.detail-section-renders',
  'plugin.detail-subject-filter',
  'visual.menu-surface-opaque',
  'visual.floating-surfaces',
])

/** Fresh-install Desktop critical checks (shared by evidence emission and release gate). */
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
  'desktop.sidebar-path',
])

const SHA256_HEX = /^[0-9a-f]{64}$/u
const VERSION_TOKEN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u

/**
 * Validate one update transition against the schema and the candidate artifact.
 *
 * The transition is pure evidence: it must record the exact from/to artifact
 * identities, the Host dialog trigger, and the observed in-page outcome. The
 * four observed booleans are frozen by the schema (no page reload, the stale
 * startup frame was seen, the catalog was re-adopted) and a
 * `restart-required` manager outcome is never an accepted hot update.
 * @param transition - parsed evidence.transition value (unknown shape).
 * @param options - artifact identity the transition must agree with.
 * @param options.toSha256 - candidate tarball sha256, when known.
 * @param options.toVersion - candidate package version, when known.
 * @param options.requireAccepted - enforce the accepted-hot-update invariants.
 * @returns human-readable schema problems; empty means valid.
 */
export function validateTransition(transition, { toSha256, toVersion, requireAccepted = true } = {}) {
  const problems = []
  if (transition === null || typeof transition !== 'object' || Array.isArray(transition)) {
    return ['transition must be an object']
  }
  const record = transition
  const keys = Object.keys(record).sort()
  const expected = [...UPDATE_TRANSITION_FIELDS].sort()
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    const missing = expected.filter((key) => !keys.includes(key))
    const extra = keys.filter((key) => !expected.includes(key))
    problems.push(`transition fields must be exactly ${expected.join(', ')}${missing.length ? `; missing: ${missing.join(', ')}` : ''}${extra.length ? `; unexpected: ${extra.join(', ')}` : ''}`)
  }
  if (typeof record.fromVersion !== 'string' || !VERSION_TOKEN.test(record.fromVersion)) {
    problems.push('transition.fromVersion must be an exact version string')
  }
  if (typeof record.fromSha256 !== 'string' || !SHA256_HEX.test(record.fromSha256)) {
    problems.push('transition.fromSha256 must be a lowercase sha256 hex digest')
  }
  if (!Number.isInteger(record.fromBytes) || record.fromBytes <= 0) {
    problems.push('transition.fromBytes must be a positive integer byte count')
  }
  if (typeof record.toVersion !== 'string' || !VERSION_TOKEN.test(record.toVersion)) {
    problems.push('transition.toVersion must be an exact version string')
  }
  if (typeof record.toSha256 !== 'string' || !SHA256_HEX.test(record.toSha256)) {
    problems.push('transition.toSha256 must be a lowercase sha256 hex digest')
  }
  if (!UPDATE_TRANSITION_TRIGGERS.includes(record.trigger)) {
    problems.push(`transition.trigger must be one of ${UPDATE_TRANSITION_TRIGGERS.join(', ')}`)
  }
  if (record.fromVersion === record.toVersion) problems.push('transition.fromVersion and toVersion must differ')
  if (toSha256 !== undefined && record.toSha256 !== toSha256) {
    problems.push(`transition.toSha256 must equal the candidate sha256 (${toSha256})`)
  }
  if (toVersion !== undefined && record.toVersion !== toVersion) {
    problems.push(`transition.toVersion must equal the candidate package version (${toVersion})`)
  }
  if (record.pageReloaded !== false) problems.push('transition.pageReloaded must be false for an in-process update')
  if (record.staleBootObserved !== true) problems.push('transition.staleBootObserved must be true')
  if (record.catalogReadopted !== true) problems.push('transition.catalogReadopted must be true')
  if (!UPDATE_MANAGER_OUTCOMES.includes(record.managerOutcome)) {
    problems.push(`transition.managerOutcome must be one of ${UPDATE_MANAGER_OUTCOMES.join(', ')}`)
  }
  if (requireAccepted && record.managerOutcome !== 'applied') {
    problems.push(`transition.managerOutcome must be applied for acceptance (got ${String(record.managerOutcome)})`)
  }
  return problems
}

/**
 * Compare a probe's check list with a required-check set.
 * @param checks - raw probe `checks` array (or a Map/record of id→status).
 * @param required - required check ids.
 * @returns problems naming missing/non-passing checks.
 */
export function requiredCheckProblems(checks, required) {
  const statuses = new Map()
  if (Array.isArray(checks)) {
    for (const check of checks) {
      if (check !== null && typeof check === 'object' && typeof check.id === 'string') {
        statuses.set(check.id, check.status)
      }
    }
  } else if (checks instanceof Map) {
    for (const [id, status] of checks) statuses.set(id, status)
  } else if (checks !== null && typeof checks === 'object') {
    for (const [id, status] of Object.entries(checks)) statuses.set(id, status)
  }
  const problems = []
  for (const id of required) {
    const status = statuses.get(id)
    if (status === undefined) problems.push(`required check missing: ${id}`)
    else if (status !== 'pass') problems.push(`required check not pass: ${id} (${String(status)})`)
  }
  return problems
}

/** Git-tracked evidence documents, root-relative. Never includes uncommitted files. */
export function committedEvidenceFiles(cwd = ROOT) {
  const output = execFileSync('git', ['ls-files', '--', 'contracts/dsh/evidence'], { cwd, encoding: 'utf8' }).trim()
  return output === '' ? [] : output.split('\n').filter((file) => file.endsWith('.json'))
}

/**
 * Find previously accepted evidence documents that bind one exact artifact.
 *
 * Used by the update-run evidence gate: the `from` side of a transition must be
 * an artifact that earlier evidence already certified, never the candidate and
 * never a local rebuild. Only git-tracked (committed) evidence counts.
 * @param identity - version + sha256 (+ optional byte count) of the from artifact.
 * @param options - repository root override (tests).
 * @returns matching committed evidence descriptors.
 */
export function findAcceptedArtifactEvidence({ version, sha256, bytes }, { root = ROOT } = {}) {
  const matches = []
  for (const file of committedEvidenceFiles(root)) {
    let document
    try {
      document = JSON.parse(readFileSync(join(root, file), 'utf8'))
    } catch {
      continue
    }
    if (document?.packageVersion !== version) continue
    if (document?.tarballSha256 !== sha256) continue
    if (bytes !== undefined && document?.tarballBytes !== bytes) continue
    if (document?.schemaVersion !== 2 && document?.schemaVersion !== 3) continue
    matches.push({
      file,
      schemaVersion: document.schemaVersion,
      packageVersion: document.packageVersion,
      tarballSha256: document.tarballSha256,
      tarballBytes: document.tarballBytes ?? null,
      hostVersion: document.scope?.hostVersion ?? null,
      profile: document.scope?.profile ?? null,
      commit: document.commit ?? null,
    })
  }
  return matches
}
