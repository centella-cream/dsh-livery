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
    contractHash: 'sha256:478c25e6ea37d18789f4514bbf569f2b534c97505f4967dc3f1379b7176679b0',
    catalogProfile: 'sha256:d2be3f5cfc144f4200185faa05cda85830d64a103eec6b8cf6262f22a4c43150',
    nodeRange: '^22.23.1',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.3',
    adapterId: 'dsh-0.2.1-rc.3-r1',
    contractHash: 'sha256:47b5cf24e19b5194676be7f037d7315dccab5d666cfc63350ae4f6ff11d6067b',
    catalogProfile: 'sha256:53e0ceb22a79f9f96cebdaa7250cb801a99ad5864dbe623afff96dba7abeb6ae',
    nodeRange: '^24.21.0',
    platformModules: 11,
    sourceKind: 'packaged-app',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.4',
    adapterId: 'dsh-0.2.1-rc.4-r1',
    contractHash: 'sha256:9e2320f31fe145945ac1f836c5468b5f5c3113f97e80cea7b1ab3976a079346f',
    catalogProfile: 'sha256:d79417c43791d0dc1ed795d6309001c66185eaef168d5521ea2a4de263602f05',
    nodeRange: '^22.23.1',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.2',
    adapterId: 'dsh-0.2.2-rc.2-r1',
    contractHash: 'sha256:495f83fd4154adf11d739ebaf04fbfce14aaea07d91d30d14f1279599505d678',
    catalogProfile: 'sha256:5261f8acff0ab84417fc51a6d5c6b1b2b20fba0deee3560e49e8d4c8d613139e',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.5',
    adapterId: 'dsh-0.2.2-rc.5-r1',
    contractHash: 'sha256:65ed78f3838c020ef3d4fdfab4786d54acc456623625d11dae79a1c92e16c4b3',
    catalogProfile: 'sha256:0a58dee4f5c8d5669c976a02e8c2981bd04468a5d998af3e8c9354346c89be94',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.3',
    adapterId: 'dsh-0.2.2-rc.3-r1',
    contractHash: 'sha256:0f583969a24ec4f76277ec1d52485335c3d58cca653b5e3c680977faecb80f94',
    catalogProfile: 'sha256:5ce72e7e7775556b5c707db4d50d5697d8049a210711571b561c937045af4e04',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'packaged-app',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.1',
    adapterId: 'dsh-0.2.2-rc.1-r1',
    contractHash: 'sha256:51e8eb37e1f9e0205ef33bd088dd8b36129de6432d36ada346ead8ad0346bca2',
    catalogProfile: 'sha256:78b5b7bb57f333aa61a40f523927e364be7e47aac2f5cb86aefba48a1c55560c',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.5',
    adapterId: 'dsh-0.2.1-rc.5-r1',
    contractHash: 'sha256:846aa7d51a291e5364def3a386aba19d3d9f5229354cd8030adf48b9c3f1b470',
    catalogProfile: 'sha256:b67980c9300f2eaa594180a91af0a4ea24821963bc43227c3dd87944a44a2b1a',
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
