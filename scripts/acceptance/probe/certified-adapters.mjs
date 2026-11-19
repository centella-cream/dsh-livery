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
 * DSH 0.2.1-rc.2/rc.4 and rc.5 on the Web Profile/Chrome, and DSH
 * 0.2.1-rc.3/rc.5 on the Desktop Profile/macOS. All certified adapters share the
 * same catalog profile; rc.5 is served by one profile-agnostic adapter entry.
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

/** Every certified host build for this release (the 0.2.1 family shares one catalog profile). */
export const CERTIFIED_ADAPTERS = Object.freeze([
  Object.freeze({
    hostVersion: '0.2.1-rc.2',
    adapterId: 'dsh-0.2.1-rc.2-r1',
    contractHash: 'sha256:fc5ccff8885eccb6f947e729b10b8f0d6355a36be6ad5ebbb3a91b7577921b1d',
    catalogProfile: 'sha256:6d303ba32419d0bda409b9a42f59eb587b0001e3676e3c2e38f784eb1e864087',
    nodeRange: '^22.23.1',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.3',
    adapterId: 'dsh-0.2.1-rc.3-r1',
    contractHash: 'sha256:d246181d261323398733ed0975f362d9dfe702f1256b1097397e794db38fdd60',
    catalogProfile: 'sha256:6d303ba32419d0bda409b9a42f59eb587b0001e3676e3c2e38f784eb1e864087',
    nodeRange: '^24.21.0',
    platformModules: 11,
    sourceKind: 'packaged-app',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.4',
    adapterId: 'dsh-0.2.1-rc.4-r1',
    contractHash: 'sha256:18e63d003897b8485451218bf584f29ecfdaa5b6d07caafced77314eb29de7bf',
    catalogProfile: 'sha256:6d303ba32419d0bda409b9a42f59eb587b0001e3676e3c2e38f784eb1e864087',
    nodeRange: '^22.23.1',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.2',
    adapterId: 'dsh-0.2.2-rc.2-r1',
    contractHash: 'sha256:597669eeb1ea75ffa93894ba223aeb0c61d79d6b16288f6e00867749b1909f2a',
    catalogProfile: 'sha256:607e5aea42096b4fb59b2a749381ef7259f955d72ae655d390c16754278b4c7c',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.3',
    adapterId: 'dsh-0.2.2-rc.3-r1',
    contractHash: 'sha256:0ac1b8dd8f1685384f6314c9f5299acd8afb7c1d5a52e055d0a7ce0c55a5cf72',
    catalogProfile: 'sha256:3beca72de6230ef32fc4c44f60a243ca0e04b89713ec1004c575e6464ccc0df3',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'packaged-app',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.1',
    adapterId: 'dsh-0.2.2-rc.1-r1',
    contractHash: 'sha256:cfba6d85aa26795d6410e117ff72b2280cab87b6350762f64be5485db5ba433a',
    catalogProfile: 'sha256:16691145cd9adc75b67ee37e612a89de7e6443150f78b3ae8614c337b547ddfc',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.5',
    adapterId: 'dsh-0.2.1-rc.5-r1',
    contractHash: 'sha256:f203caf1afe401afca12e1186797f46a3191fe6aeb4b226fc85a24c6d515a619',
    catalogProfile: 'sha256:6d303ba32419d0bda409b9a42f59eb587b0001e3676e3c2e38f784eb1e864087',
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
