/**
 * First-frame handshake: validate the payload the host injected before any app
 * script ran, and validate the lazily fetched catalog against the build
 * identity. Pure functions — no DOM, no fetch, no Cordis.
 *
 * Fail-closed rule (plan §3.2, interfaces.md §4): a payload whose adapter,
 * contract hash, plugin version, or entry id do not match this build must not
 * be trusted; the body attributes and boot style are then removed and the page
 * stays on stock appearance.
 */
import type { BootPayload, LiveryCatalog } from '../core/types.js'
import { BOOT_GLOBAL, ENTRY_ID, LIVERY_VERSION, SCHEMA_VERSION } from '../core/types.js'

/** Identity facts this build was compiled against. */
export interface HandshakeIdentity {
  readonly adapterId: string
  readonly contractHash: string
  readonly pluginVersion: string
  readonly entryId: string
}

/** Default identity for the frozen build. */
export const DEFAULT_HANDSHAKE_IDENTITY: HandshakeIdentity = {
  adapterId: 'dsh-0.2.0-rc.2-r1',
  contractHash: 'unknown',
  pluginVersion: LIVERY_VERSION,
  entryId: ENTRY_ID,
}

/** Result of inspecting one handshake payload. */
export interface BootCheck {
  /** `valid`: trustworthy and accepted. `absent`: no boot rows. `mismatch`: fail closed. */
  readonly kind: 'valid' | 'absent' | 'mismatch'
  /** The payload when its shape validated; undefined for a malformed global. */
  readonly payload: BootPayload | undefined
  /** Human-readable reasons, used for diagnostics only. */
  readonly reasons: readonly string[]
}

/** Raw fields read off the boot global before narrowing. */
type RawBootFields = Record<string, unknown>

function asRecord(value: unknown): RawBootFields | undefined {
  return typeof value === 'object' && value !== null ? (value as RawBootFields) : undefined
}

/** Field-by-field shape check; a malformed global is a fail-closed mismatch. */
function shapeProblems(raw: RawBootFields): string[] {
  const problems: string[] = []
  const strings = ['adapterId', 'contractHash', 'pluginVersion', 'hostVersion', 'skinId', 'cssHash', 'catalogUrl', 'entryId'] as const
  for (const field of strings) {
    if (typeof raw[field] !== 'string') problems.push(`boot payload: ${field} is not a string`)
  }
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
  return (scope as RawBootFields)[BOOT_GLOBAL]
}

/**
 * Validate one handshake payload against the build identity.
 *
 * `mismatch` is the fail-closed outcome: the client must not adopt or apply
 * anything from a host it was not compiled against. `absent` means the host
 * deliberately injected no first-frame rows (gate rejected, or stock), so the
 * client may still work from the served catalog and config.
 * @param raw - value read from the boot global (unknown shape).
 * @param identity - build identity and expected entry id.
 * @returns the trust classification plus reasons.
 */
export function checkBoot(raw: unknown, identity: HandshakeIdentity): BootCheck {
  if (raw === undefined) {
    return { kind: 'absent', payload: undefined, reasons: ['no first-frame payload'] }
  }
  const record = asRecord(raw)
  if (record === undefined) {
    return { kind: 'mismatch', payload: undefined, reasons: ['boot payload is not an object'] }
  }
  const problems = shapeProblems(record)
  if (problems.length > 0) {
    return { kind: 'mismatch', payload: undefined, reasons: problems }
  }
  const payload = record as unknown as BootPayload
  const reasons: string[] = []
  if (payload.adapterId !== identity.adapterId) {
    reasons.push(`adapter mismatch: boot=${payload.adapterId} build=${identity.adapterId}`)
  }
  if (payload.contractHash !== identity.contractHash) {
    reasons.push(`contract mismatch: boot=${payload.contractHash} build=${identity.contractHash}`)
  }
  if (payload.pluginVersion !== identity.pluginVersion) {
    reasons.push(`plugin version mismatch: boot=${payload.pluginVersion} build=${identity.pluginVersion}`)
  }
  if (payload.entryId !== identity.entryId) {
    reasons.push(`entry mismatch: boot=${payload.entryId} build=${identity.entryId}`)
  }
  if (reasons.length > 0) {
    return { kind: 'mismatch', payload, reasons }
  }
  if (!payload.accepted) {
    return {
      kind: 'absent',
      payload,
      reasons: ['host gate did not accept first-frame injection'],
    }
  }
  return { kind: 'valid', payload, reasons: [] }
}

/**
 * Narrow one decoded JSON value to the catalog envelope shape (structural part
 * only; identity verification is {@link validateCatalog}'s job).
 * @param value - decoded JSON of unknown shape.
 * @returns whether the value has the catalog envelope fields.
 */
export function isCatalogShape(value: unknown): value is LiveryCatalog {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (candidate.schemaVersion !== SCHEMA_VERSION) return false
  if (typeof candidate.adapterId !== 'string') return false
  if (typeof candidate.contractHash !== 'string') return false
  if (typeof candidate.capabilities !== 'object' || candidate.capabilities === null) return false
  if (!Array.isArray(candidate.liveries)) return false
  return candidate.liveries.every(livery => typeof livery === 'object' && livery !== null)
}

/**
 * Validate a fetched catalog against the build identity.
 * @param raw - decoded JSON, unknown shape.
 * @param identity - build identity.
 * @returns the catalog when the contract matches, otherwise undefined.
 */
export function validateCatalog(raw: unknown, identity: HandshakeIdentity): LiveryCatalog | undefined {
  if (!isCatalogShape(raw)) return undefined
  if (raw.adapterId !== identity.adapterId) return undefined
  if (raw.contractHash !== identity.contractHash) return undefined
  return raw
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
