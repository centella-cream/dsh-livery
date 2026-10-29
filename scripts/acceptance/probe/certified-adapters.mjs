/**
 * Frozen mirror of the certified host-adapter matrix.
 *
 * The plugin package owns the authoritative registry in
 * `src/generated/contract.ts` (`ADAPTERS`). The black-box acceptance harness
 * must not import build sources, so it carries this mirror of the same records
 * and checks that the live boot payload / catalog repeat exactly one of these
 * certified `(hostVersion, adapterId, contractHash, catalogProfile)` triples.
 *
 * Keep in sync with `src/generated/contract.ts` when the certified matrix
 * changes (docs/design/multi-version.md §1). A live triple that is not
 * in this list must be reported as a failure, never inferred from semver.
 */

/**
 * DSH 0.2.1-rc.2 and the latest 0.2.1-rc.4 on the Web Profile/Chrome, and
 * DSH 0.2.1-rc.3 on the Desktop Profile/macOS (real Electron renderer).
 * All certified adapters share the same 0.1.4 catalog profile.
 * Windows and Web Edge are not-supported and are not claimed.
 */
export const ACCEPTANCE_SCOPE = Object.freeze({
  hostVersion: '0.2.1-rc.2',
  profile: 'web',
  browser: 'chrome',
})

/** Desktop-profile evidence scope (rc.3 Electron renderer on macOS). */
export const DESKTOP_SCOPE = Object.freeze({
  hostVersion: '0.2.1-rc.3',
  profile: 'desktop',
  platform: 'macos',
})

const CAPABILITIES_021 = Object.freeze({
  'theme-css': true,
  'host-font-family': true,
  'surface-material': true,
  'host-density-tokens': false,
  'host-transcript-width': false,
  'host-message-flow': false,
  'reduced-transparency': true,
  'forced-colors': true,
  'reduced-motion': true,
  'host-font-role-hooks': true,
})

/** Every certified host build for this release (both share one catalog profile). */
export const CERTIFIED_ADAPTERS = Object.freeze([
  Object.freeze({
    hostVersion: '0.2.1-rc.2',
    adapterId: 'dsh-0.2.1-rc.2-r1',
    contractHash: 'sha256:fc5ccff8885eccb6f947e729b10b8f0d6355a36be6ad5ebbb3a91b7577921b1d',
    catalogProfile: 'sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec',
    nodeRange: '^22.23.1',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.3',
    adapterId: 'dsh-0.2.1-rc.3-r1',
    contractHash: 'sha256:d246181d261323398733ed0975f362d9dfe702f1256b1097397e794db38fdd60',
    catalogProfile: 'sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec',
    nodeRange: '^24.21.0',
    platformModules: 11,
    sourceKind: 'packaged-app',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.4',
    adapterId: 'dsh-0.2.1-rc.4-r1',
    contractHash: 'sha256:18e63d003897b8485451218bf584f29ecfdaa5b6d07caafced77314eb29de7bf',
    catalogProfile: 'sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec',
    nodeRange: '^22.23.1',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
])

export const SUPPORTED_HOST_VERSIONS = Object.freeze(CERTIFIED_ADAPTERS.map((adapter) => adapter.hostVersion))

export function adapterForVersion(version) {
  return CERTIFIED_ADAPTERS.find((adapter) => adapter.hostVersion === version)
}

export function adapterForTriple({ hostVersion, adapterId, contractHash } = {}) {
  return CERTIFIED_ADAPTERS.find(
    (adapter) => adapter.hostVersion === hostVersion && adapter.adapterId === adapterId && adapter.contractHash === contractHash,
  )
}

export function adapterForContractHash(contractHash) {
  return CERTIFIED_ADAPTERS.find((adapter) => adapter.contractHash === contractHash)
}

/** Catalog profiles other than this one (empty: both adapters share one profile). */
export function otherCatalogProfiles(catalogProfile) {
  return [...new Set(CERTIFIED_ADAPTERS.map((adapter) => adapter.catalogProfile))].filter((profile) => profile !== catalogProfile)
}

/** Expected preview base the host must advertise for a catalog profile. */
export function expectedPreviewsBase(catalogProfile) {
  return `/livery/assets/previews/${catalogProfile}/`
}

/** Human-readable description of a certified build, for reports. */
export function describeAdapter(adapter) {
  if (!adapter) return 'uncertified'
  return `${adapter.hostVersion} / ${adapter.adapterId} / ${adapter.contractHash.slice(0, 19)}… / ${adapter.platformModules}-module table / ${adapter.sourceKind}`
}
