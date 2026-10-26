/**
 * First-frame handshake and catalog identity for the multi-version client.
 *
 * Compatibility is decided by an exact `(hostVersion, adapterId, contractHash)`
 * triple from the generated certified-adapter registry — never by semver
 * inference or a version string in UI logic. A payload whose triple is unknown
 * fails closed to stock; a fetched catalog must repeat the same certified triple
 * and its `catalogProfile`, and preview assets must live under the base the host
 * declared for that profile.
 *
 * Pure functions — no DOM, no fetch, no Cordis.
 */
import type { AdapterIdentity } from '../generated/contract.js'
import { COMPAT_ADAPTER_ID, isCompatibleHostVersion } from '../core/compat.js'
import type { BootPayload, LiveryCatalog } from '../core/types.js'
import { BOOT_GLOBAL, ENTRY_ID, LIVERY_VERSION, PREVIEW_ROUTE_PREFIX, SCHEMA_VERSION } from '../core/types.js'

/** The exact identity fields a handshake/catalog pair must agree on. */
export interface HostIdentity {
  readonly hostVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly catalogProfile: string
}

/** Result of inspecting one handshake payload. */
export interface BootCheck {
  /** `valid`: certified and accepted. `absent`: known host, no boot rows. `mismatch`: fail closed. */
  readonly kind: 'valid' | 'absent' | 'mismatch'
  /** The payload when its shape validated; undefined for a malformed global. */
  readonly payload: BootPayload | undefined
  /** Certified adapter identity whose triple the payload matched, when it matched one. */
  readonly adapter: AdapterIdentity | undefined
  /** True when the host is inside the compatibility range but uncertified. */
  readonly compat?: boolean
  /** Human-readable reasons, used for diagnostics only. */
  readonly reasons: readonly string[]
}

/** Result of inspecting one fetched catalog document. */
export interface CatalogCheck {
  readonly catalog: LiveryCatalog | undefined
  readonly adapter: AdapterIdentity | undefined
  readonly reasons: readonly string[]
}

/** Raw fields read off the boot global before narrowing. */
type RawRecord = Record<string, unknown>

function asRecord(value: unknown): RawRecord | undefined {
  return typeof value === 'object' && value !== null ? (value as RawRecord) : undefined
}

/** Field-by-field shape check of the first-frame payload. */
function bootShapeProblems(raw: RawRecord): string[] {
  const problems: string[] = []
  const strings = [
    'adapterId',
    'hostVersion',
    'contractHash',
    'catalogProfile',
    'skinId',
    'cssHash',
    'catalogUrl',
    'entryId',
  ] as const
  for (const field of strings) {
    if (typeof raw[field] !== 'string') problems.push(`boot payload: ${field} is not a string`)
  }
  if (typeof raw.pluginVersion !== 'string') problems.push('boot payload: pluginVersion is not a string')
  if (typeof raw.accepted !== 'boolean') problems.push('boot payload: accepted is not a boolean')
  if (raw.compat !== undefined && typeof raw.compat !== 'boolean') problems.push('boot payload: compat is not a boolean')
  if (!Array.isArray(raw.diagnostics)) problems.push('boot payload: diagnostics is not an array')
  return problems
}

/**
 * Read the boot global without assuming it exists.
 * @param scope - `globalThis`-like object.
 * @returns the raw value stored under {@link BOOT_GLOBAL}, or undefined.
 */
export function readBootPayload(scope: unknown): unknown {
  if (typeof scope !== 'object' || scope === null) return undefined
  return (scope as RawRecord)[BOOT_GLOBAL]
}

/**
 * Find the certified adapter record for one exact triple.
 * @param adapters - generated registry (injected for testability).
 * @param hostVersion - live host version.
 * @param adapterId - live adapter id.
 * @param contractHash - live contract hash.
 * @returns the matching record, or undefined when the build is uncertified.
 */
export function findAdapter(
  adapters: readonly AdapterIdentity[],
  hostVersion: string,
  adapterId: string,
  contractHash: string,
): AdapterIdentity | undefined {
  return adapters.find(adapter => adapter.hostVersion === hostVersion
    && adapter.adapterId === adapterId
    && adapter.contractHash === contractHash)
}

/**
 * Validate one handshake payload against the certified-adapter registry.
 *
 * `mismatch` is the fail-closed outcome: the client must not adopt or apply
 * anything from a host it was not compiled and certified against. `absent` means
 * a certified host deliberately injected no first-frame rows (gate rejected or
 * stock), so the client may still work from the served catalog and config.
 * @param raw - value read from the boot global (unknown shape).
 * @param adapters - generated certified-adapter identity registry.
 * @returns classification, matched adapter and reasons.
 */
export function checkBoot(raw: unknown, adapters: readonly AdapterIdentity[]): BootCheck {
  if (raw === undefined) {
    return { kind: 'absent', payload: undefined, adapter: undefined, compat: false, reasons: ['no first-frame payload'] }
  }
  const record = asRecord(raw)
  if (record === undefined) {
    return { kind: 'mismatch', payload: undefined, adapter: undefined, compat: false, reasons: ['boot payload is not an object'] }
  }
  const problems = bootShapeProblems(record)
  if (problems.length > 0) {
    return { kind: 'mismatch', payload: undefined, adapter: undefined, compat: false, reasons: problems }
  }
  const payload = record as unknown as BootPayload
  const adapter = findAdapter(adapters, payload.hostVersion, payload.adapterId, payload.contractHash)
  const compat = adapter === undefined
    && payload.compat === true
    && payload.adapterId === COMPAT_ADAPTER_ID
    && isCompatibleHostVersion(payload.hostVersion)
  if (adapter === undefined && !compat) {
    return {
      kind: 'mismatch',
      payload,
      adapter: undefined,
      compat: false,
      reasons: [
        'uncertified host build: '
        + `hostVersion=${payload.hostVersion} adapterId=${payload.adapterId} contractHash=${payload.contractHash}`,
      ],
    }
  }
  const reasons: string[] = []
  if (payload.pluginVersion !== LIVERY_VERSION) {
    reasons.push(`plugin version mismatch: host=${payload.pluginVersion} build=${LIVERY_VERSION}`)
  }
  if (payload.entryId !== ENTRY_ID) {
    reasons.push(`entry mismatch: host=${payload.entryId} build=${ENTRY_ID}`)
  }
  if (compat) {
    const contractMatch = adapters.some(candidate => candidate.contractHash === payload.contractHash
      && candidate.catalogProfile === payload.catalogProfile)
    if (!contractMatch) {
      reasons.push(`compat payload names an unknown contract/profile: ${payload.contractHash} / ${payload.catalogProfile}`)
    }
  } else if (payload.catalogProfile !== adapter!.catalogProfile) {
    reasons.push(`catalog profile mismatch: host=${payload.catalogProfile} certified=${adapter!.catalogProfile}`)
  }
  if (reasons.length > 0) {
    return { kind: 'mismatch', payload, adapter: adapter ?? undefined, compat, reasons }
  }
  if (!payload.accepted) {
    return {
      kind: 'absent',
      payload,
      adapter: adapter ?? undefined,
      compat,
      reasons: ['host gate did not accept first-frame injection'],
    }
  }
  return { kind: 'valid', payload, adapter: adapter ?? undefined, compat, reasons: [] }
}

/**
 * Identity the accepted handshake promises the catalog must repeat.
 * @param boot - handshake result.
 * @returns the certified identity, or undefined when no certified host is known.
 */
export function bootIdentity(boot: BootCheck): HostIdentity | undefined {
  const payload = boot.payload
  if (payload !== undefined) {
    return {
      hostVersion: payload.hostVersion,
      adapterId: payload.adapterId,
      contractHash: payload.contractHash,
      catalogProfile: payload.catalogProfile,
    }
  }
  if (boot.adapter === undefined) return undefined
  return {
    hostVersion: boot.adapter.hostVersion,
    adapterId: boot.adapter.adapterId,
    contractHash: boot.adapter.contractHash,
    catalogProfile: boot.adapter.catalogProfile,
  }
}

/** The preview asset base a certified host must declare for a catalog profile. */
export function expectedPreviewsBase(catalogProfile: string): string {
  return `${PREVIEW_ROUTE_PREFIX}${catalogProfile}/`
}

/** Whether the value has the catalog envelope fields (identity checked separately). */
export function isCatalogShape(value: unknown): value is LiveryCatalog {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as RawRecord
  if (candidate.schemaVersion !== SCHEMA_VERSION) return false
  for (const field of ['adapterId', 'hostVersion', 'contractHash', 'catalogProfile', 'previewsBase'] as const) {
    if (typeof candidate[field] !== 'string') return false
  }
  if (typeof candidate.capabilities !== 'object' || candidate.capabilities === null) return false
  if (!Array.isArray(candidate.liveries)) return false
  return candidate.liveries.every(livery => typeof livery === 'object' && livery !== null)
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isLocalized(value: unknown): boolean {
  return isRecord(value) && isText(value['zh-CN']) && isText(value['en-US'])
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string')
}

function isStringMap(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(entry => typeof entry === 'string')
}

/** Validate the fields the client/UI actually consumes for one livery row. */
function isCompiledLivery(value: unknown): boolean {
  if (!isRecord(value) || !isText(value.id)) return false
  const meta = value.meta
  if (!isRecord(meta) || typeof meta.order !== 'number' || !Number.isFinite(meta.order)) return false
  if (!isLocalized(meta.name) || !isLocalized(meta.description) || !isStringArray(meta.tags)) return false
  for (const mode of ['light', 'dark'] as const) {
    const variant = value[mode]
    if (!isRecord(variant) || !isStringMap(variant.tokens)) return false
  }
  const css = value.css
  if (!isRecord(css) || typeof css.tokens !== 'string' || typeof css.typography !== 'string' || typeof css.layout !== 'string') return false
  if (!isText(value.cssHash) || !isText(value.hash)) return false
  if (!isStringArray(value.requiredCapabilities) || !isStringArray(value.optionalCapabilities)) return false
  const audit = value.audit
  if (!isRecord(audit) || !Array.isArray(audit.contrast) || typeof audit.contrastFailures !== 'number') return false
  const coverage = audit.tokenCoverage
  if (!isRecord(coverage)
    || !isStringArray(coverage.covered)
    || !isStringArray(coverage.inherited)
    || !isStringArray(coverage.missing)) return false
  const safety = audit.cssSafety
  if (!isRecord(safety) || typeof safety.pass !== 'boolean') return false
  for (const field of ['important', 'hashSelectors', 'remoteUrls', 'unscopedTokens'] as const) {
    if (typeof safety[field] !== 'number') return false
  }
  // `fixedZIndexes` is consumed as a list by the compiled catalog.
  if (!Array.isArray(safety.fixedZIndexes) && typeof safety.fixedZIndexes !== 'number') return false
  return Array.isArray(audit.degraded)
}

/** Options accepted by {@link checkCatalog}. */
export interface CatalogExpectation {
  /** Generated certified-adapter registry. */
  readonly adapters: readonly AdapterIdentity[]
  /**
   * Identity the accepted handshake promises. When present the catalog must
   * repeat it exactly; when absent (no first-frame payload) the catalog still
   * has to match one certified adapter record.
   */
  readonly expected?: HostIdentity | undefined
}

/**
 * Validate a fetched catalog against the certified-adapter registry.
 * @param raw - decoded JSON, unknown shape.
 * @param expectation - registry and optional handshake identity.
 * @returns the catalog + adapter on success, otherwise undefined + reasons.
 */
export function checkCatalog(raw: unknown, expectation: CatalogExpectation): CatalogCheck {
  if (!isCatalogShape(raw)) {
    return { catalog: undefined, adapter: undefined, reasons: ['catalog envelope is malformed'] }
  }
  const adapter = findAdapter(expectation.adapters, raw.hostVersion, raw.adapterId, raw.contractHash)
  const compat = adapter === undefined
    && raw.adapterId === COMPAT_ADAPTER_ID
    && isCompatibleHostVersion(raw.hostVersion)
    && expectation.adapters.some(candidate => candidate.contractHash === raw.contractHash
      && candidate.catalogProfile === raw.catalogProfile)
  if (adapter === undefined && !compat) {
    return {
      catalog: undefined,
      adapter: undefined,
      reasons: [
        'uncertified catalog identity: '
        + `hostVersion=${raw.hostVersion} adapterId=${raw.adapterId} contractHash=${raw.contractHash}`,
      ],
    }
  }
  const reasons: string[] = []
  const profile = adapter?.catalogProfile ?? raw.catalogProfile
  if (!compat && raw.catalogProfile !== profile) {
    reasons.push(`catalog profile mismatch: catalog=${raw.catalogProfile} certified=${profile}`)
  }
  const previewsBase = expectedPreviewsBase(profile)
  if (raw.previewsBase !== previewsBase) {
    reasons.push(`catalog previewsBase mismatch: catalog=${raw.previewsBase} expected=${previewsBase}`)
  }
  if (!raw.liveries.every(isCompiledLivery)) {
    reasons.push('catalog contains malformed livery entries')
  }
  if (expectation.expected !== undefined) {
    const expected = expectation.expected
    if (raw.hostVersion !== expected.hostVersion
      || raw.adapterId !== expected.adapterId
      || raw.contractHash !== expected.contractHash
      || raw.catalogProfile !== expected.catalogProfile) {
      reasons.push('catalog does not describe the host build the first-frame handshake accepted')
    }
  }
  if (reasons.length > 0) {
    return { catalog: undefined, adapter: undefined, reasons }
  }
  return { catalog: raw, adapter, reasons: [] }
}

/**
 * Convenience wrapper returning only the validated catalog.
 * @param raw - decoded JSON.
 * @param expectation - registry and optional handshake identity.
 * @returns the catalog when certified/authored for this host, else undefined.
 */
export function validateCatalog(raw: unknown, expectation: CatalogExpectation): LiveryCatalog | undefined {
  return checkCatalog(raw, expectation).catalog
}

/**
 * Whether the value is a shipped DSH locale id.
 * @param value - raw locale id.
 * @returns true for `zh`/`en`.
 */
export function isDshLocale(value: unknown): value is 'zh' | 'en' {
  return value === 'zh' || value === 'en'
}

/**
 * Normalize a locale id for client-side presentation.
 * @param value - raw locale id.
 * @returns `zh` or `en` (fallback `en`, matching the host fallback).
 */
export function normalizeLocale(value: unknown): 'zh' | 'en' {
  return value === 'zh' ? 'zh' : 'en'
}
