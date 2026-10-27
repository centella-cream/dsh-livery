/**
 * Desktop report truthfulness and matrix-consistency rules.
 *
 * The Desktop acceptance report must never claim more than the checks actually
 * proved. In particular a *skipped* first-paint sampling check is an explicit
 * "not verified" boundary, not "first paint verified". The generated Verified
 * list comes only from groups whose checks all passed.
 *
 * Matrix consistency: the report may describe a pending / not-supported matrix
 * status, but in that case it is a diagnostic run only and must explicitly say
 * it is not certified. A report that claims renderer/matrix certification while
 * the matrix says pending/not-supported is a hard inconsistency.
 */

/** Check groups that prove one human-readable verified claim. */
export const DESKTOP_VERIFIED_GROUPS = Object.freeze([
  Object.freeze({ ids: ['desktop.official-install'], text: 'official plugin-manager install of the shipped tarball with no version exemption' }),
  Object.freeze({ ids: ['desktop.certified-runtime', 'desktop.renderer-launches'], text: 'real Electron renderer boots on the certified host build' }),
  Object.freeze({ ids: ['desktop.boot-graph-row'], text: 'Livery client module is present in the boot graph' }),
  Object.freeze({
    ids: ['desktop.catalog-identity', 'desktop.boot-injection', 'desktop.hash-equality'],
    text: 'catalog and post-apply boot payload agree with the certified adapter/contract/profile',
  }),
  Object.freeze({ ids: ['desktop.stock-start'], text: 'stock start (no livery attribute or stylesheet)' }),
  Object.freeze({ ids: ['desktop.sidebar-entry', 'desktop.main-panel'], text: 'sidebar navigation opens the Livery main panel' }),
  Object.freeze({
    ids: ['desktop.gallery', 'desktop.gallery-families', 'desktop.preview-locale', 'desktop.preview-locale-en', 'desktop.preview-locale-zh'],
    text: 'gallery, families and preview-language tab render in the real desktop renderer',
  }),
  Object.freeze({ ids: ['desktop.wallpaper'], text: 'wallpaper studio renders and selects a built-in' }),
  Object.freeze({
    ids: ['desktop.preview', 'desktop.preview-cancel', 'desktop.apply-persists', 'desktop.boot-injection', 'desktop.hash-equality'],
    text: 'preview/cancel and apply → persistence after a real renderer reload',
  }),
  Object.freeze({
    ids: ['desktop.theme-light', 'desktop.theme-dark', 'desktop.font-role-hooks', 'desktop.self-check'],
    text: 'light/dark livery tokens, documented font role hooks and self-check in the real desktop renderer',
  }),
  Object.freeze({ ids: ['desktop.restore-stock'], text: 'restore stock removes the livery from the renderer' }),
])

/** Claims that are never in scope for this probe, regardless of status. */
export const DESKTOP_NEVER_VERIFIED = Object.freeze([
  'native macOS window shell (traffic lights/leading, titlebar, vibrancy/transparency, Dock/rightbar window states)',
  'OS-level DPI scaling beyond `window.devicePixelRatio`',
  'packaged Chromium sandbox/GPU path (probe runs with --no-sandbox --disable-gpu in this automation session)',
])

const MATRIX_STATUSES = new Set(['passed', 'pending', 'not-supported'])

function statusMap(checks) {
  const map = new Map()
  for (const check of checks ?? []) map.set(check.id, check)
  return map
}

/**
 * Build the honest Verified / Not-verified lists for a Desktop report.
 *
 * @param {object} input
 * @param {Array<{id:string,status:string,detail?:string}>} input.checks runner checks
 * @param {string|null} input.matrixStatus matrix profiles.desktop.macos status
 * @returns {{ matrixStatus:string|null, claimLevel:'renderer-verified'|'diagnostic-only',
 *   certified:boolean, statement:string, verified:string[], notVerified:string[],
 *   contradictions:string[], firstPaint:{status:string|null, verified:boolean, detail:string} }}
 */
export function buildDesktopClaims({ checks = [], matrixStatus = null } = {}) {
  const map = statusMap(checks)
  const verified = []
  const notVerified = []
  for (const group of DESKTOP_VERIFIED_GROUPS) {
    const present = group.ids.filter((id) => map.has(id))
    const allPass = present.length === group.ids.length && group.ids.every((id) => map.get(id)?.status === 'pass')
    if (allPass) {
      verified.push(group.text)
    } else {
      const failing = group.ids
        .map((id) => map.get(id))
        .filter((check) => check === undefined || check.status !== 'pass')
        .map((check) => (check === undefined ? 'missing check' : `${check.id}:${check.status}`))
      notVerified.push(`${group.text} — not verified (${failing.join(', ')})`)
    }
  }
  const firstPaintCheck = map.get('desktop.first-paint-sampling') ?? null
  const firstPaintStatus = firstPaintCheck?.status ?? null
  if (firstPaintStatus === 'pass') {
    verified.push('first-paint sampling (the real renderer produced first-frame rows)')
  } else {
    const reason = firstPaintCheck?.detail ? String(firstPaintCheck.detail) : 'check not present in this run'
    notVerified.push(`first paint sampling — NOT verified (${firstPaintStatus ?? 'missing'}: ${reason.slice(0, 300)})`)
  }
  notVerified.push(...DESKTOP_NEVER_VERIFIED)
  const statusKnown = matrixStatus !== null && MATRIX_STATUSES.has(matrixStatus)
  const certified = statusKnown && matrixStatus === 'passed'
  const claimLevel = certified ? 'renderer-verified' : 'diagnostic-only'
  const contradictions = []
  if (!statusKnown) {
    contradictions.push(`support matrix has no known profiles.desktop.macos status (got ${String(matrixStatus)})`)
  }
  if (!certified && claimLevel !== 'diagnostic-only') {
    contradictions.push(`report claim level ${claimLevel} is stronger than matrix desktop.macos=${String(matrixStatus)}`)
  }
  const statement = !statusKnown
    ? 'Support matrix: desktop.macos status missing — diagnostic run only, NOT certified.'
    : matrixStatus === 'passed'
      ? 'Support matrix: desktop.macos = passed — renderer-verified; this report claims renderer behavior only (native window shell remains host-owned/out of plugin certification).'
      : matrixStatus === 'pending'
        ? 'Support matrix: desktop.macos = pending — diagnostic run only, NOT certified for release.'
        : 'Support matrix: desktop.macos = not-supported — diagnostic run only, NOT certified.'
  return {
    matrixStatus: matrixStatus ?? null,
    claimLevel,
    certified,
    statement,
    verified,
    notVerified,
    contradictions,
    firstPaint: { status: firstPaintStatus, verified: firstPaintStatus === 'pass', detail: firstPaintCheck?.detail ?? null },
  }
}

/**
 * Validate an already-built claims object against the matrix status.
 * Used by the automated consistency check and by the selftest.
 *
 * A report may never claim stronger than the matrix. It may be weaker (e.g. a
 * diagnostic report on a pending matrix).
 */
export function validateDesktopClaims(claims, matrixStatus) {
  const problems = []
  if (!MATRIX_STATUSES.has(matrixStatus)) {
    problems.push(`matrix desktop.macos status missing/unknown: ${String(matrixStatus)}`)
  }
  if (claims?.claimLevel === 'matrix-certified' && matrixStatus !== 'passed') {
    problems.push(`report claims matrix certification while matrix desktop.macos=${String(matrixStatus)}`)
  }
  if (claims?.claimLevel === 'renderer-verified' && matrixStatus !== 'passed') {
    problems.push(`report claims renderer certification while matrix desktop.macos=${String(matrixStatus)}`)
  }
  if (matrixStatus === 'passed' && claims?.claimLevel === 'diagnostic-only') {
    // Weaker is safe, just note it; not a contradiction.
  }
  if (claims?.firstPaint?.verified === true && claims?.firstPaint?.status !== 'pass') {
    problems.push('report claims first-paint verified while the first-paint sampling check did not pass')
  }
  return problems
}
