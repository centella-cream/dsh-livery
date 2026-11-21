/**
 * Package version policy shared by evidence generation and release verification.
 * Audit envelopes became mandatory with the 0.2.0 protocol. Compare numeric
 * semver components instead of the previous major-only check, which treated
 * every 0.x release as pre-policy.
 * @param {string} version - package version (e.g. 0.2.0).
 * @returns {boolean} whether audit envelopes are required.
 */
export function requiresAuditEnvelope(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/u.exec(String(version))
  if (match === null) return false
  const [, major, minor, patch] = match.map(Number)
  if (major !== 0) return major > 0
  if (minor !== 2) return minor > 2
  return patch >= 0
}
