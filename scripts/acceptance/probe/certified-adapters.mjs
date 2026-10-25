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

/** Capability ids certified per host build (availability, not presence in probe). */
const CAPABILITIES_020 = Object.freeze({
  'theme-css': true,
  'host-font-family': true,
  'surface-material': true,
  'host-density-tokens': false,
  'host-transcript-width': false,
  'host-message-flow': false,
  'reduced-transparency': true,
  'forced-colors': true,
  'reduced-motion': true,
  'host-font-role-hooks': false,
})

const CAPABILITIES_021 = Object.freeze({
  ...CAPABILITIES_020,
  'host-font-role-hooks': true,
})

/** Every certified host build, ascending by version. */
export const CERTIFIED_ADAPTERS = Object.freeze([
  Object.freeze({
    hostVersion: '0.2.0-rc.2',
    adapterId: 'dsh-0.2.0-rc.2-r1',
    contractHash: 'sha256:42abf8ebc5ec1df1e6abd6760680ec82fd062db650036e5e9f2a052138b6b2ce',
    catalogProfile: 'sha256:4c5ee1a20f2974a53037a2ee4d2daa71f9f4600c9f004f0b35592b1ff413d602',
    nodeRange: '^22.23.1',
    platformModules: 9,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_020,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.2',
    adapterId: 'dsh-0.2.1-rc.2-r1',
    contractHash: 'sha256:fc5ccff8885eccb6f947e729b10b8f0d6355a36be6ad5ebbb3a91b7577921b1d',
    catalogProfile: 'sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50',
    nodeRange: '^22.23.1',
    platformModules: 11,
    sourceKind: 'installed-package',
    capabilities: CAPABILITIES_021,
  }),
  Object.freeze({
    hostVersion: '0.2.1-rc.3',
    adapterId: 'dsh-0.2.1-rc.3-r1',
    contractHash: 'sha256:d246181d261323398733ed0975f362d9dfe702f1256b1097397e794db38fdd60',
    catalogProfile: 'sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50',
    nodeRange: '^24.21.0',
    platformModules: 11,
    sourceKind: 'packaged-app',
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

/** The catalog profile shared by `0.2.1-rc.2` and `0.2.1-rc.3`. */
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
