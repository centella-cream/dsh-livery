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
    catalogProfile: 'sha256:a4161f075483a629a57fab83a2e2258167681f2eb7fa0767fbef758b2f5c551a',
    nodeRange: '^22.23.1',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.3',
    adapterId: 'dsh-0.2.1-rc.3-r1',
    contractHash: 'sha256:47b5cf24e19b5194676be7f037d7315dccab5d666cfc63350ae4f6ff11d6067b',
    catalogProfile: 'sha256:ac0a36e31c128ac65a0c52e1feb4e4827e548274b5c76734c351afa85ea5cf19',
    nodeRange: '^24.21.0',
    platformModules: 11,
    sourceKind: 'packaged-app',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.4',
    adapterId: 'dsh-0.2.1-rc.4-r1',
    contractHash: 'sha256:9e2320f31fe145945ac1f836c5468b5f5c3113f97e80cea7b1ab3976a079346f',
    catalogProfile: 'sha256:d126b90736df71222c4175c8181d1ea828779f2894edc77c0e6cb994d460235f',
    nodeRange: '^22.23.1',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.2',
    adapterId: 'dsh-0.2.2-rc.2-r1',
    contractHash: 'sha256:495f83fd4154adf11d739ebaf04fbfce14aaea07d91d30d14f1279599505d678',
    catalogProfile: 'sha256:59870c7f712922c0dbe1085220faa92e7fb9401695b4ad6deed99a54979cf077',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.5',
    adapterId: 'dsh-0.2.2-rc.5-r1',
    contractHash: 'sha256:65ed78f3838c020ef3d4fdfab4786d54acc456623625d11dae79a1c92e16c4b3',
    catalogProfile: 'sha256:8bb88619f79476035460096193003e16de096bde72d963d8060b33c9a6a1c037',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.3',
    adapterId: 'dsh-0.2.2-rc.3-r1',
    contractHash: 'sha256:0f583969a24ec4f76277ec1d52485335c3d58cca653b5e3c680977faecb80f94',
    catalogProfile: 'sha256:46ccd3f3724998c44a995d1cef2009f97f34d1e87efaa89ec347cb1824bd51ef',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'packaged-app',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.2-rc.1',
    adapterId: 'dsh-0.2.2-rc.1-r1',
    contractHash: 'sha256:51e8eb37e1f9e0205ef33bd088dd8b36129de6432d36ada346ead8ad0346bca2',
    catalogProfile: 'sha256:35b832dedbd84f2d45bea53210cd6c336646c08032ddd1671469f8a73385df40',
    nodeRange: '>=24.9.0',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.5',
    adapterId: 'dsh-0.2.1-rc.5-r1',
    contractHash: 'sha256:846aa7d51a291e5364def3a386aba19d3d9f5229354cd8030adf48b9c3f1b470',
    catalogProfile: 'sha256:4de94fefc9d6f52eb2f798810b9267d1bc009aaf33ad4b846202e5707c0b3d82',
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
