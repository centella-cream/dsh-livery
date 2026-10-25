/**
 * Host-side Config for the DSH Livery plugin.
 *
 * The Config schema is the durable shape the profile patch carries. Its single
 * field is volatile, which makes it the form the browser settings page reads
 * and writes through `ctx.configForms.get(ENTRY_ID)`: the settings
 * namespace *is* the Loader entry id (`livery`), so this module never invents a
 * second namespace and never persists anything of its own.
 *
 * Every helper here is defensive: a plugin that cannot read its own config must
 * show the stock appearance, never throw out of an index render or a settings
 * form.
 */

import Schema from '@deepseek-ai/schemastery'
import type { Volatile } from '@deepseek-ai/cordis'
import { STOCK_ID, type LiveryId, type StockId } from '../core/types.js'

/**
 * The one Config field. It is volatile so a settings change commits into the
 * running plugin without a remount (`loader/volatile-update`), and the
 * `webserver/index-inject` listener re-reads it on every index render.
 */
export const CONFIG_SKIN_ID_FIELD = 'skinId' as const

/** Configured skin: `stock` (no livery) or a compiled livery id. */
export type SkinPreference = LiveryId | StockId

/**
 * Live Host Config as delivered to `apply(ctx, config)`.
 *
 * `Volatile` comes from Cordis/Schemastery: read it with `.get()` on every use,
 * never cache the snapshot across renders — the reference is stable, the value
 * is not.
 */
export interface LiveryHostConfig {
  readonly skinId: Volatile<string>
}

/**
 * Loader-validated Config schema.
 *
 * One field only. `stock` is the default, so a fresh profile installs with the
 * host's own appearance and Livery only changes the page when a livery is
 * picked. The entry id `livery` (see {@link ENTRY_ID}) is the settings
 * namespace; it is load-bearing and must not be renamed.
 */
export const Config = Schema.object({
  [CONFIG_SKIN_ID_FIELD]: Schema.string().default(STOCK_ID).volatile(),
})

/** The schema's validated output type (used for `Reference<typeof Config>`-style tools). */
export type LiveryConfigOutput = ReturnType<typeof Config>

/**
 * Whether a config value is a volatile reference (`{ get() }`).
 * @param value - candidate from a validated config object.
 * @returns whether `.get()` can be called on it.
 */
function isVolatileRef(value: unknown): value is Volatile<unknown> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { get?: unknown }).get === 'function'
}

/**
 * Read one raw skin value out of a config object without ever throwing.
 *
 * Accepts the three shapes seen in practice: a volatile reference (the normal
 * runtime shape), a plain string (a resolved config snapshot in tests or a
 * forward-compatible loader), and anything unexpected.
 * @param config - validated (or absent) Host Config.
 * @returns the raw string value, or `undefined` when none could be read.
 */
function readRawSkinId(config: unknown): unknown {
  if (config === null || typeof config !== 'object') return undefined
  const ref = (config as Record<string, unknown>)[CONFIG_SKIN_ID_FIELD]
  if (typeof ref === 'string') return ref
  if (!isVolatileRef(ref)) return undefined
  try {
    return ref.get()
  } catch {
    // A disposed or foreign reference must not break an index render.
    return undefined
  }
}

/**
 * Read the configured skin id from the live Host Config.
 *
 * Never throws and never normalizes against the catalog — an unknown id is
 * returned as-is so the boot gate can tell "user asked for `stock`" apart from
 * "user asked for a livery this build no longer ships" and produce the right
 * diagnostic. {@link normalizeSkinId} is the catalog-aware step.
 * @param config - validated (or absent) Host Config.
 * @returns the trimmed configured id, or `stock` when absent/unreadable/empty.
 */
export function readSkinId(config: unknown): LiveryId | StockId {
  const raw = readRawSkinId(config)
  if (typeof raw !== 'string') return STOCK_ID
  const trimmed = raw.trim()
  return trimmed === '' ? STOCK_ID : trimmed
}

/**
 * Normalize a requested skin id against the ids this build actually ships.
 *
 * Unknown, deleted, malformed and empty ids fall back to `stock`; nothing is
 * ever thrown. This is the last safety net before the gate decides between
 * "stock look" and "fail closed with a diagnostic".
 * @param id - requested id, any type.
 * @param knownIds - compiled livery ids (`findLivery`-equivalent set).
 * @returns a known livery id, or `stock`.
 */
export function normalizeSkinId(id: unknown, knownIds: Iterable<string>): LiveryId | StockId {
  if (typeof id !== 'string') return STOCK_ID
  const trimmed = id.trim()
  if (trimmed === '' || trimmed === STOCK_ID) return STOCK_ID
  try {
    if (knownIds instanceof Set) {
      return knownIds.has(trimmed) ? trimmed : STOCK_ID
    }
    if (knownIds instanceof Map) {
      return knownIds.has(trimmed) ? trimmed : STOCK_ID
    }
    for (const known of knownIds) {
      if (known === trimmed) return trimmed
    }
  } catch {
    // A hostile/broken iterable is a fallback, not a crash.
    return STOCK_ID
  }
  return STOCK_ID
}
