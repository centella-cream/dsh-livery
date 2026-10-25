/**
 * Host-version compatibility policy.
 *
 * The certified matrix in `contracts/dsh/support-matrix.proposed.json` names the
 * exact DSH builds whose six-hash contracts are frozen and verified. A newer
 * DSH build must still work, so `engines.dsh` declares a compatibility range
 * rather than an exact allowlist:
 *
 *   >=0.2.0-rc.2 <1.0.0
 *
 * Any readable host version inside that range that has no certified adapter is
 * served through the newest certified contract in **compat mode** — the UI keeps
 * working, the self-check says it is unverified, and the gate still fails closed
 * outside the range or when the version is unreadable.
 */

/** Exact certified builds, newest last. Kept in sync with `contracts/dsh/`. */
export const CERTIFIED_HOST_VERSIONS = ['0.2.0-rc.2', '0.2.1-rc.2', '0.2.1-rc.3'] as const

/** Install-time compatibility range (`package.json engines.dsh`). */
export const DSH_COMPAT_RANGE = '>=0.2.0-rc.2 <1.0.0' as const

/** Lower bound of the compatibility range (inclusive). */
export const DSH_COMPAT_MIN = '0.2.0-rc.2' as const

/** Single synthetic adapter id used when serving an uncertified-but-compatible host. */
export const COMPAT_ADAPTER_ID = 'dsh-compat' as const

interface ParsedVersion {
  readonly major: number
  readonly minor: number
  readonly patch: number
  readonly prerelease: readonly (string | number)[]
}

/** Parse a DSH-style `x.y.z(-pre)?` version; `null` for anything else. */
function parseVersion(version: string): ParsedVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version.trim())
  if (match === null) return null
  const prerelease = match[4] === undefined
    ? []
    : match[4].split('.').map((part) => (/^\d+$/.test(part) ? Number(part) : part))
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease,
  }
}

/**
 * Semver-style precedence between two DSH versions.
 * @param a - left version.
 * @param b - right version.
 * @returns negative when a<b, zero when equal, positive when a>b.
 */
export function compareDshVersions(a: string, b: string): number {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (left === null || right === null) return Number.NaN
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (left[key] !== right[key]) return left[key] - right[key]
  }
  // A release outranks its prereleases; prerelease identifiers compare per spec.
  if (left.prerelease.length === 0 && right.prerelease.length === 0) return 0
  if (left.prerelease.length === 0) return 1
  if (right.prerelease.length === 0) return -1
  const length = Math.max(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    const l = left.prerelease[index]
    const r = right.prerelease[index]
    if (l === undefined) return -1
    if (r === undefined) return 1
    if (l === r) continue
    if (typeof l === 'number' && typeof r === 'number') return l - r
    if (typeof l === 'number') return -1
    if (typeof r === 'number') return 1
    return l < r ? -1 : 1
  }
  return 0
}

/**
 * Whether a host version falls inside the compatibility range.
 * Unparseable versions never do.
 * @param version - observed DSH version.
 * @returns true when `>=0.2.0-rc.2 <1.0.0`.
 */
export function isCompatibleHostVersion(version: string): boolean {
  const parsed = parseVersion(version)
  if (parsed === null) return false
  // The range is `>=0.2.0-rc.2 <1.0.0`; a semver comparator would also admit
  // `1.0.0-rc.1`, but a future major must be an explicit support decision.
  if (parsed.major !== 0) return false
  const lower = compareDshVersions(version, DSH_COMPAT_MIN)
  const upper = compareDshVersions(version, '1.0.0')
  return lower >= 0 && upper < 0
}
