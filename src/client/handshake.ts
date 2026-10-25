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
    return { kind: 'absent', payload: undefined, adapter: undefined, reasons: ['no first-frame payload'] }
  }
  const record = asRecord(raw)
  if (record === undefined) {
    return { kind: 'mismatch', payload: undefined, adapter: undefined, reasons: ['boot payload is not an object'] }
  }
  const problems = bootShapeProblems(record)
  if (problems.length > 0) {
    return { kind: 'mismatch', payload: undefined, adapter: undefined, reasons: problems }
  }
  const payload = record as unknown as BootPayload
  const adapter = findAdapter(adapters, payload.hostVersion, payload.adapterId, payload.contractHash)
  if (adapter === undefined) {
    return {
      kind: 'mismatch',
      payload,
      adapter: undefined,
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
  if (payload.catalogProfile !== adapter.catalogProfile) {
    reasons.push(`catalog profile mismatch: host=${payload.catalogProfile} certified=${adapter.catalogProfile}`)
  }
  if (reasons.length > 0) {
    return { kind: 'mismatch', payload, adapter: undefined, reasons }
  }
  if (!payload.accepted) {
    return {
      kind: 'absent',
      payload,
      adapter,
      reasons: ['host gate did not accept first-frame injection'],
    }
  }
  return { kind: 'valid', payload, adapter, reasons: [] }
}

/**
 * Identity the accepted handshake promises the catalog must repeat.
 * @param boot - handshake result.
 * @returns the certified identity, or undefined when no certified host is known.
 */
export function bootIdentity(boot: BootCheck): HostIdentity | undefined {
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
  if (adapter === undefined) {
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
  if (raw.catalogProfile !== adapter.catalogProfile) {
    reasons.push(`catalog profile mismatch: catalog=${raw.catalogProfile} certified=${adapter.catalogProfile}`)
  }
  const previewsBase = expectedPreviewsBase(adapter.catalogProfile)
  if (raw.previewsBase !== previewsBase) {
    reasons.push(`catalog previewsBase mismatch: catalog=${raw.previewsBase} certified=${previewsBase}`)
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
