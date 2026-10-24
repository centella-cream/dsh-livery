/**
 * GENERATED PLACEHOLDER — replaced by `pnpm liveries:compile`.
 *
 * This stub keeps the project type-checking and buildable before the first
 * compile run. The compiler overwrites this file with the real catalog.
 */
import type { CapabilityMap, CompiledLivery } from '../core/types.js'

export interface CatalogMeta {
  readonly compiledAt: string
  readonly sourceHash: string
  readonly contractHash: string
  readonly adapterId: string
  readonly hostVersion: string
  readonly capabilities: CapabilityMap
}

export const LIVERIES: readonly CompiledLivery[] = []
export const CATALOG_META: CatalogMeta = {
  compiledAt: '1970-01-01T00:00:00.000Z',
  sourceHash: 'sha256:placeholder',
  contractHash: 'sha256:placeholder',
  adapterId: 'dsh-0.2.0-rc.2-r1',
  hostVersion: '0.2.0-rc.2',
  capabilities: {},
}
