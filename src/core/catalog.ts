/**
 * DSH Livery — catalog resolution (RUNTIME: Host + Client).
 *
 * This module is reachable from the Host and Client bundles, so it must never
 * import `../generated/stock.js`, `../generated/liveries.js`, `derive.ts` or
 * `render.ts`: the compiler has already rendered and hashed the exact
 * stylesheet bytes for every catalog profile. The runtime only reads
 * `CompiledLivery.css` and `CompiledLivery.cssHash`.
 *
 * `stock` is always a valid skin id: it resolves to "no livery", and callers
 * leave the host appearance untouched.
 */

import type { CompiledLivery, LiveryCatalog, StockId } from './types.js'
import { STOCK_ID } from './types.js'

/** Accept either the served catalog or the compiled livery array. */
export type LiverySource = LiveryCatalog | readonly CompiledLivery[]

function liveriesOf(source: LiverySource): readonly CompiledLivery[] {
  if ('liveries' in source) return source.liveries
  return source
}

/** Find a compiled livery by id. `stock` and unknown ids return `undefined`. */
export function findLivery(source: LiverySource, id: string): CompiledLivery | undefined {
  if (id === STOCK_ID) return undefined
  return liveriesOf(source).find((livery) => livery.id === id)
}

/** True for the stock id and for every livery id present in the catalog. */
export function isKnownSkinId(source: LiverySource, id: string): boolean {
  if (id === STOCK_ID) return true
  return findLivery(source, id) !== undefined
}

/** Normalised skin id: stock/unknown → `stock`. */
export function normalizeSkinId(source: LiverySource, skinId: string): string {
  return findLivery(source, skinId)?.id ?? STOCK_ID
}

/**
 * Resolve the persisted `skinId` to a livery and the normalised id to persist
 * or boot. Unknown and deleted ids normalize to `stock`, leaving the host
 * appearance untouched.
 */
export function resolveActiveLivery(
  source: LiverySource,
  skinId: string,
): { readonly livery?: CompiledLivery; readonly normalizedId: string } {
  const livery = findLivery(source, skinId)
  return livery === undefined ? { normalizedId: STOCK_ID } : { livery, normalizedId: livery.id }
}

/** Exact production stylesheet bytes for one compiled livery (no wrappers). */
export function styleTextOf(livery: Pick<CompiledLivery, 'css'>): string {
  return `${livery.css.tokens}${livery.css.typography}${livery.css.layout}`
}

/** The content hash of {@link styleTextOf}, compiled with the livery. */
export function liveryCssHash(livery: Pick<CompiledLivery, 'cssHash'>): string {
  return livery.cssHash
}

/**
 * Resolve everything a boot path needs for one skin id: the livery (when the id
 * is a real catalog entry), its compiled stylesheet bytes and their hash. Stock,
 * unknown or missing ids yield no livery and empty css/hash so the Host injects
 * no boot rows. No rendering and no hashing happens at runtime.
 */
export function resolveSkinForBoot(
  source: LiverySource,
  skinId: string,
): { readonly livery?: CompiledLivery; readonly css: string; readonly hash: string } {
  const livery = findLivery(source, skinId)
  if (livery === undefined) return { css: '', hash: '' }
  return { livery, css: styleTextOf(livery), hash: liveryCssHash(livery) }
}

/**
 * Boot stylesheet for one skin id, read straight from the compiled catalog.
 * `stock`, unknown or missing liveries contribute nothing (stock appearance).
 */
export function renderBootCssFromCatalog(
  catalog: LiveryCatalog,
  skinId: string,
): { readonly css: string; readonly hash: string } {
  const resolved = resolveSkinForBoot(catalog, skinId)
  return { css: resolved.css, hash: resolved.hash }
}

/** Convenience: the catalog profile id the served catalog was compiled for. */
export function catalogProfileOf(catalog: Pick<LiveryCatalog, 'catalogProfile'>): string {
  return catalog.catalogProfile
}

/** Convenience: the preview asset base URL carried by the served catalog. */
export function previewsBaseOf(catalog: Pick<LiveryCatalog, 'previewsBase'>): string {
  return catalog.previewsBase
}

/** Skin id union helper used by config restoration. */
export type ResolvedSkinId = string | StockId
