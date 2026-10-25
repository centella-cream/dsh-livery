/**
 * Curated online wallpaper library ("lightweight stable crawler").
 *
 * Eight style categories mapped to license-safe Openverse CC0/PDM queries,
 * pageable batches, a size/TTL-capped localStorage cache, one retry on transient
 * failure, URL/id dedupe, and a cached fallback when the network is unavailable.
 *
 * Pure orchestration over injected `fetch`/storage/clock so tests never touch
 * the network; callers must originate requests from explicit user navigation.
 */
import type { LiveryKey } from '../../i18n/index.js'
import { parseOpenverseResults } from '../wallpaper.js'
import type { WallpaperRemoteResult } from '../wallpaper.js'

/** Curated library categories (stable ids; labels live in the dictionary). */
export type LibraryCategoryId = 'nature' | 'city' | 'abstract' | 'minimal' | 'sky' | 'texture' | 'space' | 'gradient'

/** One curated category. */
export interface LibraryCategory {
  readonly id: LibraryCategoryId
  readonly labelKey: LiveryKey
  readonly query: string
}

/** The eight curated categories in display order. */
export const LIBRARY_CATEGORIES: readonly LibraryCategory[] = [
  { id: 'nature', labelKey: 'wallpaper.category.nature', query: 'forest landscape nature' },
  { id: 'city', labelKey: 'wallpaper.category.city', query: 'city skyline architecture' },
  { id: 'abstract', labelKey: 'wallpaper.category.abstract', query: 'abstract art pattern' },
  { id: 'minimal', labelKey: 'wallpaper.category.minimal', query: 'minimalist texture simple' },
  { id: 'sky', labelKey: 'wallpaper.category.sky', query: 'sky clouds sunset' },
  { id: 'texture', labelKey: 'wallpaper.category.texture', query: 'texture surface material' },
  { id: 'space', labelKey: 'wallpaper.category.space', query: 'space stars nebula' },
  { id: 'gradient', labelKey: 'wallpaper.category.gradient', query: 'gradient colors light' },
]

/** localStorage key of the category cache. */
export const LIBRARY_CACHE_KEY = 'dsh-livery.wallpaper.library.v1'
/** Cache freshness window (6 h). */
export const LIBRARY_CACHE_TTL_MS = 6 * 60 * 60 * 1000
/** Results requested per page/batch. */
export const LIBRARY_BATCH_SIZE = 24
/** Cached categories kept (newest first). */
export const LIBRARY_CACHE_CATEGORIES = 2
/** Hard cap of the serialized cache. */
export const LIBRARY_CACHE_MAX_BYTES = 48_000
/** Request timeout. */
export const LIBRARY_TIMEOUT_MS = 8000

/** One cached category batch. */
export interface LibraryBatch {
  readonly fetchedAt: number
  readonly page: number
  readonly results: readonly WallpaperRemoteResult[]
}
/** Cache shape (partial by category). */
export type LibraryCache = Partial<Record<LibraryCategoryId, LibraryBatch>>

/** localStorage subset (injectable in tests). */
export interface LibraryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Openverse search URL for one curated category page. */
export function buildLibraryUrl(categoryId: LibraryCategoryId, page: number): string {
  const category = LIBRARY_CATEGORIES.find(candidate => candidate.id === categoryId) ?? LIBRARY_CATEGORIES[0]!
  const params = new URLSearchParams({
    q: category.query,
    license: 'cc0,pdm',
    page_size: String(LIBRARY_BATCH_SIZE),
    page: String(Math.max(1, Math.floor(page))),
  })
  return `https://api.openverse.org/v1/images/?${params.toString()}`
}

function isResult(value: unknown): value is WallpaperRemoteResult {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.id === 'string' && typeof row.url === 'string'
    && typeof row.thumbnail === 'string' && typeof row.title === 'string'
}

/** Defensive parse of one cached results array. */
function resultsOf(value: unknown): readonly WallpaperRemoteResult[] {
  if (!Array.isArray(value)) return []
  return value.filter(isResult).slice(0, LIBRARY_BATCH_SIZE)
}

/**
 * Read + validate the cache; corrupt/foreign data yields an empty cache.
 * @param storage - localStorage subset (optional).
 * @returns the parsed cache (never throws).
 */
export function readLibraryCache(storage: LibraryStorage | undefined): LibraryCache {
  if (storage === undefined) return {}
  try {
    const text = storage.getItem(LIBRARY_CACHE_KEY)
    if (text === null || text.length === 0) return {}
    const raw: unknown = JSON.parse(text)
    if (typeof raw !== 'object' || raw === null) return {}
    const cache: LibraryCache = {}
    for (const category of LIBRARY_CATEGORIES) {
      const entry = (raw as Record<string, unknown>)[category.id]
      if (typeof entry !== 'object' || entry === null) continue
      const row = entry as Record<string, unknown>
      const fetchedAt = typeof row.fetchedAt === 'number' && Number.isFinite(row.fetchedAt) ? row.fetchedAt : 0
      const page = typeof row.page === 'number' && Number.isFinite(row.page) ? Math.max(1, Math.floor(row.page)) : 1
      const results = resultsOf(row.results)
      if (results.length > 0) cache[category.id] = { fetchedAt, page, results }
    }
    return cache
  } catch {
    return {}
  }
}

/**
 * Prune + persist the cache: newest categories only, size-capped.
 * @param cache - current cache.
 * @param storage - localStorage subset (optional).
 */
export function writeLibraryCache(cache: LibraryCache, storage: LibraryStorage | undefined): void {
  if (storage === undefined) return
  try {
    const entries = Object.entries(cache)
      .filter((entry): entry is [LibraryCategoryId, LibraryBatch] => entry[1] !== undefined)
      .sort((a, b) => b[1].fetchedAt - a[1].fetchedAt)
    const pruned: LibraryCache = {}
    for (const [id, batch] of entries.slice(0, LIBRARY_CACHE_CATEGORIES)) pruned[id] = batch
    let text = JSON.stringify(pruned)
    while (text.length > LIBRARY_CACHE_MAX_BYTES && Object.keys(pruned).length > 0) {
      const ids = Object.keys(pruned).sort((a, b) => (pruned[a as LibraryCategoryId]?.fetchedAt ?? 0) - (pruned[b as LibraryCategoryId]?.fetchedAt ?? 0))
      delete pruned[ids[0] as LibraryCategoryId]
      text = JSON.stringify(pruned)
    }
    storage.setItem(LIBRARY_CACHE_KEY, text)
  } catch {
    /* storage can be disabled/quota-blocked; cache is best-effort */
  }
}

/**
 * Cache entry for one category.
 * @param cache - parsed cache.
 * @param categoryId - category id.
 * @param now - current timestamp.
 * @returns the batch and whether it is still fresh (TTL), or undefined.
 */
export function cachedBatch(
  cache: LibraryCache,
  categoryId: LibraryCategoryId,
  now: number,
): { readonly batch: LibraryBatch; readonly fresh: boolean } | undefined {
  const batch = cache[categoryId]
  if (batch === undefined) return undefined
  return { batch, fresh: now - batch.fetchedAt <= LIBRARY_CACHE_TTL_MS }
}

/**
 * Deduplicate results by image URL/id, preserving order, capped at one batch.
 * @param existing - already displayed results.
 * @param incoming - newly fetched results.
 * @returns merged unique results.
 */
export function mergeLibraryResults(
  existing: readonly WallpaperRemoteResult[],
  incoming: readonly WallpaperRemoteResult[],
): readonly WallpaperRemoteResult[] {
  const seen = new Set<string>()
  const merged: WallpaperRemoteResult[] = []
  for (const result of [...existing, ...incoming]) {
    const key = result.url.length > 0 ? result.url : result.id
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(result)
  }
  return merged.slice(0, LIBRARY_BATCH_SIZE)
}

/** Injectable dependencies for one library fetch. */
export interface LibraryFetchDeps {
  readonly fetchImpl?: typeof fetch | undefined
  readonly storage?: LibraryStorage | undefined
  readonly now?: (() => number) | undefined
  readonly timeoutMs?: number | undefined
}

/** Outcome of one library batch request. */
export type LibraryFetchOutcome =
  | { readonly ok: true; readonly results: readonly WallpaperRemoteResult[]; readonly page: number; readonly cached: boolean }
  | { readonly ok: false; readonly reason: 'offline' | 'error'; readonly cached?: LibraryBatch }

/** One request with AbortController timeout; resolves the parsed JSON or undefined. */
async function requestOnce(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<unknown | undefined> {
  const controller = typeof AbortController === 'undefined' ? undefined : new AbortController()
  const timer = controller === undefined ? undefined : setTimeout(() => { controller.abort() }, timeoutMs)
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: { accept: 'application/json' },
      ...(controller === undefined ? {} : { signal: controller.signal }),
    })
    if (!response.ok) return undefined
    return await response.json()
  } catch {
    return undefined
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * Fetch one curated category page with retry + cached fallback.
 *
 * Never throws: network failure returns the cached batch when one exists,
 * otherwise a typed offline/error outcome for the panel to render.
 * @param categoryId - curated category.
 * @param page - 1-based page.
 * @param deps - injected fetch/storage/clock.
 * @returns the page results or a typed failure carrying any cache fallback.
 */
export async function fetchLibraryBatch(
  categoryId: LibraryCategoryId,
  page: number,
  deps: LibraryFetchDeps = {},
): Promise<LibraryFetchOutcome> {
  const fetchImpl = deps.fetchImpl ?? (typeof fetch === 'undefined' ? undefined : fetch)
  const now = deps.now ?? (() => Date.now())
  const timeoutMs = deps.timeoutMs ?? LIBRARY_TIMEOUT_MS
  const url = buildLibraryUrl(categoryId, page)
  if (fetchImpl !== undefined) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const json = await requestOnce(url, fetchImpl, timeoutMs)
      if (json !== undefined) {
        const results = parseOpenverseResults(json, LIBRARY_BATCH_SIZE)
        if (results.length > 0) return { ok: true, results, page, cached: false }
      }
    }
  }
  const cache = cachedBatch(readLibraryCache(deps.storage), categoryId, now())
  if (cache !== undefined) return { ok: false, reason: 'offline', cached: cache.batch }
  return { ok: false, reason: fetchImpl === undefined ? 'offline' : 'error' }
}
