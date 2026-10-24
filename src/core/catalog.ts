/**
 * DSH Livery — catalog resolution (RUNTIME: Host + Client).
 *
 * This module is reachable from the Host and Client bundles, so it must never
 * import `../generated/stock.js`, `derive.ts` or `render.ts`: the compiler has
 * already rendered and hashed the exact stylesheet bytes. The runtime only reads
 * `CompiledLivery.css` and `CompiledLivery.cssHash`.
 *
 * `stock` is a first-class known skin id: it always resolves to "no livery" and
 * the callers then leave the host appearance untouched.
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

/**
 * Resolve the livery the persisted `skinId` points at. Returns `undefined`
 * (meaning: stay on stock) for the stock id and for ids that disappeared from
 * the catalog (e.g. a livery was deleted between releases).
 */
export function resolveActiveLivery(
  source: LiverySource,
  skinId: string,
): CompiledLivery | undefined {
  return findLivery(source, skinId)
}

/** Normalised skin id: stock/unknown → `stock`. */
export function normalizeSkinId(source: LiverySource, skinId: string): string {
  return findLivery(source, skinId)?.id ?? STOCK_ID
}

/**
 * Resolve both the livery and the normalised skin id used for the boot
 * attributes (`body[data-dsh-livery]` is only written for a real livery).
 */
export function resolveSkinForBoot(
  source: LiverySource,
  skinId: string,
): { readonly livery: CompiledLivery | undefined; readonly skinId: string | StockId } {
  const livery = findLivery(source, skinId)
  return livery === undefined ? { livery: undefined, skinId: STOCK_ID } : { livery, skinId: livery.id }
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
 * Boot stylesheet for one skin id, read straight from the compiled catalog.
 * `stock`, unknown or missing liveries contribute nothing (stock appearance).
 * No rendering and no hashing happens at runtime; both values are compiled.
 */
export function renderBootCssFromCatalog(
  catalog: LiveryCatalog,
  skinId: string,
): { readonly css: string; readonly hash: string } {
  if (skinId === STOCK_ID) return { css: '', hash: '' }
  const livery = findLivery(catalog, skinId)
  if (livery === undefined) return { css: '', hash: '' }
  return { css: styleTextOf(livery), hash: liveryCssHash(livery) }
}
