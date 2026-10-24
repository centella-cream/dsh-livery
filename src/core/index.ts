/**
 * DSH Livery pure core barrel (frozen surface — see docs/implementation/interfaces.md).
 *
 * No module under `src/core` may import React, Cordis, DSH packages or touch the
 * DOM. Everything here is deterministic data transformation.
 */
export * from './types.js'
export * from './color.js'
export * from './registry.js'
export * from './capabilities.js'
export * from './derive.js'
export * from './contrast.js'
export * from './render.js'
export * from './catalog.js'
export { STOCK_TOKENS, STOCK_TOKEN_NAMES, STOCK_LIGHT, STOCK_DARK, STOCK_DSH_VARIABLES, STOCK_DSH_VERSION, STOCK_THEME_VERSION } from '../generated/stock.js'
export type { StockTokenDeclaration } from '../generated/stock.js'
export { LIVERIES, CATALOG_META } from '../generated/liveries.js'
export type { CatalogMeta } from '../generated/liveries.js'
