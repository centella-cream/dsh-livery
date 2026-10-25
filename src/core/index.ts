/**
 * DSH Livery pure core barrel — Node/test consumption only.
 *
 * No module under `src/core` may import React, Cordis, DSH packages or touch the
 * DOM. Runtime bundles (Host/Client) import the individual core modules they
 * need (`types`, `catalog`); they must never import this barrel because it also
 * re-exports the compile-time derivation renderer.
 *
 * Generated modules are imported directly by their owners:
 * - `../generated/contract.js` (adapter registry) → host, compiler, contract tooling
 * - `../generated/liveries.js` (catalog profiles) → compiler, host catalog route
 * - `../generated/stock.js` (per-version stock snapshots) → compiler, tests
 * Only the stock snapshot type is shared with the core API surface, so it and
 * its lookup helpers are re-exported here for build-time and test convenience
 * without pulling adapter or catalog data into the barrel.
 */
export * from './types.js'
export * from './color.js'
export * from './registry.js'
export * from './capabilities.js'
export * from './derive.js'
export * from './contrast.js'
export * from './audit.js'
export * from './render.js'
export * from './catalog.js'

export type { StockSnapshot, StockTokenDeclaration } from '../generated/stock.js'
export {
  STOCK_BY_VERSION,
  STOCK_VERSIONS,
  stockForVersion,
  stockLightFor,
  stockDarkFor,
} from '../generated/stock.js'
