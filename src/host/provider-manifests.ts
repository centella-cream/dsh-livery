/**
 * Host-owned provider-manifest document.
 *
 * The source of truth is `src/provider-manifests.json`; it is bundled into the
 * Host bundle and served as JSON, never imported into the client bundle. The
 * document hash binds the exact reviewed data; the client and release gate
 * validate the same hash.
 */
import { createHash } from 'node:crypto'
import manifestSource from '../provider-manifests.json'
import type { ProviderManifestDocument } from '../providers/types.js'

/** Stable key ordering for manifest hashing. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`
}

/** The reviewed manifest document (without the response-only hash). */
export const PROVIDER_MANIFEST_DOCUMENT = manifestSource as unknown as ProviderManifestDocument

/** sha256 of the canonical manifest document. */
export const PROVIDER_MANIFEST_HASH = `sha256:${createHash('sha256').update(canonical(PROVIDER_MANIFEST_DOCUMENT), 'utf8').digest('hex')}`

/** Pre-serialized exact route response. */
export const PROVIDER_MANIFEST_RESPONSE = JSON.stringify({
  schemaVersion: PROVIDER_MANIFEST_DOCUMENT.schemaVersion,
  manifestHash: PROVIDER_MANIFEST_HASH,
  providers: PROVIDER_MANIFEST_DOCUMENT.providers,
})
