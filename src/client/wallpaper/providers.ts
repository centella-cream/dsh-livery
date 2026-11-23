/**
 * Keyless online wallpaper provider registry (0.2.2).
 *
 * Only providers that passed the committed access gate
 * (`docs/research/provider-access-gate.json`) are registered here: Openverse and
 * Wikimedia Commons. Rejected/deferred targets (NASA Image Library, The Met,
 * AIC, Picsum) are deliberately absent — they must never be listed, imported by
 * the UI, selected by Auto, or used as a source of new licence strings.
 *
 * Everything in this module is network-policy and response-mapping code:
 *
 * - image URLs returned in a result must be https, public and on a declared
 *   `imageHosts` host (exact host or `*.` wildcard, dot-boundary matched);
 * - results carry real licence/attribution metadata or `license: null`
 *   (rendered but not selectable);
 * - failures are typed and never thrown;
 * - `fetchOnlinePage` owns Auto failover, the per-attempt 6 s timeout and the
 * 12 s overall deadline. Pinned providers make exactly one attempt.
 *
 * The module is DOM-free and testable; tests stub `globalThis.fetch` (no test
 * hits the network) and the UI imports this file directly.
 */
import { WALLPAPER_JSON_MAX_BYTES, MAX_WALLPAPER_URL_LENGTH } from '../wallpaper.js'
import { isLocalOrPrivateHost } from './host-safety.js'

/** Stable provider failure classes surfaced by the UI. */
export type ProviderFailure =
  | 'timeout' | 'rate-limited' | 'auth-required' | 'unavailable' | 'invalid-response'

/** Gate-accepted provider ids in registry (gate) order. */
export type ProviderId = 'openverse' | 'wikimedia'

/** Provider capabilities used to gate Search/Random actions. */
export interface ProviderCapabilities {
  readonly search: boolean
  readonly random: boolean
}

/** One selectable online wallpaper result with real attribution metadata. */
export interface WallpaperProviderResult {
  readonly providerId: ProviderId
  readonly id: string
  readonly title: string
  readonly creator?: string
  readonly creatorUrl?: string
  /** `null` means: no usable licence/attribution — rendered but not selectable. */
  readonly license: { readonly name: string; readonly url?: string } | null
  readonly sourceUrl: string
  /** Full-resolution image URL (must be on an `imageHosts` host). */
  readonly fullUrl: string
  /** Thumbnail image URL (must be on an `imageHosts` host). */
  readonly thumbUrl: string
  readonly width?: number
  readonly height?: number
}

/** Host allowlist for provider image URLs. */
export interface ImageHostPolicy {
  /**
   * Hostnames that may serve result image bytes. Each entry is an exact host
   * (`images.example.org`) or a wildcard subdomain (`*.example.org`, which
   * matches any `x.example.org` but not the apex host).
   */
  readonly imageHosts: readonly string[]
  /** Hostnames a followed redirect may end on (same exact/wildcard rules). */
  readonly redirectHosts?: readonly string[]
}

/** One page request passed to {@link WallpaperProvider.fetchPage}. */
export interface ProviderPageRequest {
  /** Search text; omitted/blank means a browse/random request. */
  readonly query?: string
  /** Opaque provider-encoded continuation token from the previous page. */
  readonly cursor?: string
  readonly pageSize: number
  readonly signal: AbortSignal
}

/** A gate-accepted, keyless image provider. */
export interface WallpaperProvider {
  readonly id: ProviderId
  readonly label: { readonly 'zh-CN': string; readonly 'en-US': string }
  readonly auth: 'keyless'
  readonly capabilities: ProviderCapabilities
  readonly imageHosts: readonly string[]
  readonly redirectHosts?: readonly string[]
  fetchPage(request: ProviderPageRequest): Promise<
    | { readonly results: readonly WallpaperProviderResult[]; readonly nextCursor?: string }
    | { readonly failure: ProviderFailure; readonly retryAfterMs?: number }
  >
}

/** One page request for {@link fetchOnlinePage}. */
export interface OnlinePageRequest {
  readonly provider: ProviderId | 'auto'
  readonly query?: string
  readonly cursor?: string
  readonly pageSize: number
  readonly signal?: AbortSignal
  /** Overall deadline in ms (default {@link ONLINE_PAGE_DEADLINE_MS}). */
  readonly deadlineMs?: number
}

/** Successful online page. */
export interface OnlinePageOk {
  readonly ok: true
  readonly results: readonly WallpaperProviderResult[]
  readonly servedBy: ProviderId
  readonly nextCursor?: string
}

/** Failed online page (after every allowed attempt). */
export interface OnlinePageFailure {
  readonly ok: false
  readonly failure: ProviderFailure
  readonly retryAfterMs?: number
  readonly tried: readonly ProviderId[]
}

/** Default overall deadline for one online page (12 s). */
export const ONLINE_PAGE_DEADLINE_MS = 12_000
/** Default per-attempt timeout cap inside the overall deadline (6 s). */
export const ONLINE_ATTEMPT_TIMEOUT_MS = 6_000
/** Auto may try at most this many providers per page. */
export const AUTO_MAX_ATTEMPTS = 2

/** Openverse API base (proxied image endpoints hang off the same host). */
export const OPENVERSE_API_BASE = 'https://api.openverse.org/v1/images/'
/** Wikimedia Commons MediaWiki API endpoint (CORS requires `origin=*`). */
export const WIKIMEDIA_API_BASE = 'https://commons.wikimedia.org/w/api.php'
/** Thumbnail width requested from `iiurlwidth` (server-side scaled render). */
export const WIKIMEDIA_THUMB_WIDTH = 1280
/** Anonymous Openverse requests reject `page_size > 20` with HTTP 401. */
export const OPENVERSE_MAX_PAGE_SIZE = 20
/** Commons silently clamps `gsrlimit`/`grnlimit` above 500. */
export const WIKIMEDIA_MAX_PAGE_SIZE = 500

/** Maximum accepted display/identifier length for returned text fields. */
const MAX_TITLE_CHARS = 300
const MAX_CREATOR_CHARS = 120
const MAX_LICENSE_CHARS = 120
/** Positive integer bound for width/height metadata. */
const MAX_DIMENSION = 200_000

/**
 * One provider image host policy for an id (fail-closed empty for foreign ids).
 * @param id - registered provider id.
 * @returns the provider's image host/redirect policy.
 */
export function providerImagePolicy(id: ProviderId): ImageHostPolicy {
  const provider = providerById(id)
  if (provider === undefined) return EMPTY_IMAGE_POLICY
  return provider.redirectHosts === undefined
    ? { imageHosts: provider.imageHosts }
    : { imageHosts: provider.imageHosts, redirectHosts: provider.redirectHosts }
}

/* -------------------------------------------------------------------------- */
/* Host matching                                                              */
/* -------------------------------------------------------------------------- */

/** FQDN label shape for allowlist entries (no ports, paths, IPv6, wildcards). */
const HOST_NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/u

/** Normalize one hostname for matching (`undefined` when malformed). */
function normalizeHostname(value: string): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().toLowerCase()
  if (trimmed.length === 0) return undefined
  const withoutTrailingDot = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed
  return HOST_NAME.test(withoutTrailingDot) ? withoutTrailingDot : undefined
}

/**
 * Parse one allowlist entry: exact hostname or leading `*.` wildcard only.
 * A bare `*`, mid-string `*`, scheme, port or path is not a valid entry.
 * @param pattern - untrusted allowlist entry.
 * @returns the parsed pattern, or undefined when invalid.
 */
function parseHostPattern(pattern: string): { readonly wildcard: boolean; readonly host: string } | undefined {
  if (typeof pattern !== 'string') return undefined
  const trimmed = pattern.trim().toLowerCase()
  if (trimmed.startsWith('*.')) {
    const host = normalizeHostname(trimmed.slice(2))
    return host === undefined ? undefined : { wildcard: true, host }
  }
  if (trimmed.includes('*')) return undefined
  const host = normalizeHostname(trimmed)
  return host === undefined ? undefined : { wildcard: false, host }
}

/**
 * Pure exact/wildcard host matcher used by the cache, UI and tests.
 *
 * `example.com` matches only `example.com`; `*.example.com` matches
 * `a.example.com` and `a.b.example.com` but not `example.com`. Matching is on
 * label boundaries, so `notexample.com` and `example.com.evil` never match.
 * @param hostname - URL hostname (or host-like string) to test.
 * @param pattern - allowlist entry (exact host or `*.` wildcard).
 * @returns true only on a dot-boundary match.
 */
export function matchesHostPattern(hostname: string, pattern: string): boolean {
  const host = normalizeHostname(hostname)
  const parsed = parseHostPattern(pattern)
  if (host === undefined || parsed === undefined) return false
  if (!parsed.wildcard) return host === parsed.host
  return host.length > parsed.host.length + 1 && host.endsWith(`.${parsed.host}`)
}

/**
 * Whether a hostname matches any allowlist entry.
 * @param hostname - URL hostname (or host-like string).
 * @param patterns - exact host / wildcard entries.
 * @returns true when at least one entry matches on a dot boundary.
 */
export function isAllowedHost(hostname: string, patterns: readonly string[]): boolean {
  const host = normalizeHostname(hostname)
  if (host === undefined) return false
  return patterns.some(pattern => matchesHostPattern(host, pattern))
}

/**
 * Whether one URL is an acceptable provider image URL: https, no credentials,
 * public host, and on a declared `imageHosts` host.
 * @param url - untrusted image URL.
 * @param policy - provider image host policy.
 * @returns true when the cache/UI may fetch or render the URL.
 */
export function isAllowedImageUrl(url: string, policy: ImageHostPolicy): boolean {
  if (typeof url !== 'string' || url.length === 0 || url.length > MAX_WALLPAPER_URL_LENGTH) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  if (parsed.username.length > 0 || parsed.password.length > 0) return false
  const host = normalizeHostname(parsed.hostname)
  if (host === undefined || isLocalOrPrivateHost(host)) return false
  return isAllowedHost(host, policy.imageHosts)
}

/* -------------------------------------------------------------------------- */
/* Small parsing helpers                                                      */
/* -------------------------------------------------------------------------- */

const NAMED_ENTITIES: Readonly<Record<string, string>> = Object.freeze({
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
})

/** Decode the small set of HTML entities found in MediaWiki metadata. */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/giu, (match, entity: string) => {
    const key = entity.toLowerCase()
    if (key.startsWith('#x')) {
      const code = Number.parseInt(key.slice(2), 16)
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    if (key.startsWith('#')) {
      const code = Number.parseInt(key.slice(1), 10)
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[key] ?? match
  })
}

/** Strip tags/entities from untrusted attribution HTML and collapse whitespace. */
function stripHtml(value: unknown, maxLength = MAX_CREATOR_CHARS): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = decodeHtmlEntities(value.replace(/<[^>]*>/gu, ' ')).replace(/\s+/gu, ' ').trim()
  if (text.length === 0) return undefined
  return text.length > maxLength ? text.slice(0, maxLength).trimEnd() : text
}

/** Sanitize one display-text metadata field. */
function displayText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.replace(/\s+/gu, ' ').trim()
  if (trimmed.length === 0) return undefined
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength).trimEnd() : trimmed
}

/** Positive integer metadata field (width/height/page counters). */
function positiveInteger(value: unknown, max = Number.MAX_SAFE_INTEGER): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const rounded = Math.round(value)
  return rounded > 0 && rounded <= max ? rounded : undefined
}

/** Validate + normalize one https public link (attribution/source URLs). */
function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_WALLPAPER_URL_LENGTH) return undefined
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return undefined
    if (parsed.username.length > 0 || parsed.password.length > 0) return undefined
    if (isLocalOrPrivateHost(parsed.hostname)) return undefined
    return parsed.toString()
  } catch {
    return undefined
  }
}

/** First safe https link inside one attribution HTML fragment. */
function firstHref(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const match = /\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/iu.exec(value)
  if (match === null) return undefined
  const href = decodeHtmlEntities(match[1] ?? match[2] ?? '').trim()
  if (href.length === 0) return undefined
  return safeHttpsUrl(href.startsWith('//') ? `https:${href}` : href)
}

/** Parsed `Retry-After` header → delay in ms (seconds or HTTP-date). */
function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined
  const header = value.trim()
  if (header.length === 0) return undefined
  if (/^\d+$/u.test(header)) {
    const seconds = Number(header)
    return Number.isFinite(seconds) ? Math.min(seconds * 1000, 24 * 60 * 60 * 1000) : undefined
  }
  const timestamp = Date.parse(header)
  if (!Number.isFinite(timestamp)) return undefined
  return Math.max(0, Math.min(timestamp - Date.now(), 24 * 60 * 60 * 1000))
}

/* -------------------------------------------------------------------------- */
/* Shared JSON transport                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Read + parse one JSON response under the shared 2 MiB streaming cap. The body
 * is never fully materialized past the cap; the reader is cancelled.
 * @param response - fetch response.
 * @returns parsed JSON, or undefined on malformed/oversized bodies.
 */
async function readCappedJson(response: Response): Promise<unknown> {
  const max = WALLPAPER_JSON_MAX_BYTES
  const body = response.body
  if (body === null || typeof body.getReader !== 'function') {
    try {
      const text = await response.text()
      if (text.length > max || new TextEncoder().encode(text).byteLength > max) return undefined
      return JSON.parse(text) as unknown
    } catch {
      return undefined
    }
  }
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value === undefined) continue
      total += value.byteLength
      if (total > max) {
        await reader.cancel().catch(() => undefined)
        return undefined
      }
      chunks.push(value)
    }
  } catch {
    return undefined
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    return undefined
  }
}

/** JSON transport outcome (internal discriminated union). */
type JsonFetchResult =
  | { readonly ok: true; readonly json: unknown }
  | { readonly ok: false; readonly failure: ProviderFailure; readonly retryAfterMs?: number }

/** Build one transport failure without leaking `undefined` optional fields. */
function jsonFailure(failure: ProviderFailure, retryAfterMs?: number): JsonFetchResult {
  return retryAfterMs === undefined
    ? { ok: false, failure }
    : { ok: false, failure, retryAfterMs }
}

/** Resolve the platform fetch lazily so tests can stub/replace it. */
function resolveFetch(): typeof fetch | undefined {
  if (typeof fetch === 'undefined') return undefined
  return fetch
}

/**
 * Fetch + classify one provider JSON page. HTTP status is mapped to the stable
 * failure classes; abort/timeout, network errors and malformed bodies never
 * throw out of a provider.
 * @param url - absolute API URL.
 * @param signal - request signal (abort/timeout signals map to `timeout`).
 * @returns parsed JSON or a typed failure.
 */
async function fetchJsonPage(url: string, signal: AbortSignal | undefined): Promise<JsonFetchResult> {
  const fetchImpl = resolveFetch()
  if (fetchImpl === undefined) return jsonFailure('unavailable')
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      // The gated API hosts answer directly; a redirect is not an expected path.
      redirect: 'error',
      headers: { accept: 'application/json' },
      ...(signal === undefined ? {} : { signal }),
    })
  } catch {
    return jsonFailure(signal?.aborted === true ? 'timeout' : 'unavailable')
  }
  if (response.status === 401 || response.status === 403) return jsonFailure('auth-required')
  if (response.status === 429) return jsonFailure('rate-limited', parseRetryAfter(response.headers.get('retry-after')))
  if (response.status >= 500) return jsonFailure('unavailable')
  if (!response.ok) return jsonFailure('invalid-response')
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
  if (contentType.length > 0 && !contentType.includes('json')) return jsonFailure('invalid-response')
  const declared = Number(response.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > WALLPAPER_JSON_MAX_BYTES) return jsonFailure('invalid-response')
  const json = await readCappedJson(response)
  if (json === undefined) return jsonFailure('invalid-response')
  return { ok: true, json }
}

/* -------------------------------------------------------------------------- */
/* Openverse                                                                  */
/* -------------------------------------------------------------------------- */

/** Openverse image host policy: proxied endpoints on the API host only. */
const OPENVERSE_IMAGE_POLICY: ImageHostPolicy = Object.freeze({
  imageHosts: Object.freeze(['api.openverse.org']),
})

/** Display names for the Openverse licence slugs the client can honour. */
const OPENVERSE_LICENSE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  cc0: 'CC0',
  pdm: 'Public Domain Mark',
  by: 'CC BY',
  'by-sa': 'CC BY-SA',
})
/** Openverse licences whose reuse terms require an attribution link. */
const OPENVERSE_ATTRIBUTION_LICENSES: ReadonlySet<string> = new Set(['by', 'by-sa'])
/** Anonymous pagination cursor prefix (page number encoded per provider). */
const OPENVERSE_CURSOR_PREFIX = 'ov1:'

/** Build one proxied Openverse image URL (never an origin host). */
function openverseProxyUrl(id: string, fullSize: boolean): string {
  const base = `${OPENVERSE_API_BASE}${encodeURIComponent(id)}/thumb/`
  return fullSize ? `${base}?full_size=true` : base
}

/** Encode an Openverse page number as an opaque cursor. */
function encodeOpenverseCursor(page: number): string {
  return `${OPENVERSE_CURSOR_PREFIX}${page}`
}

/** Decode an Openverse cursor; undefined means "not an Openverse cursor". */
function decodeOpenverseCursor(cursor: string): number | undefined {
  if (!cursor.startsWith(OPENVERSE_CURSOR_PREFIX)) return undefined
  const raw = cursor.slice(OPENVERSE_CURSOR_PREFIX.length)
  if (!/^[1-9][0-9]*$/u.test(raw)) return undefined
  const page = Number(raw)
  return Number.isSafeInteger(page) ? page : undefined
}

/** Clamp page size to the anonymous Openverse limit (above it the API 401s). */
function clampOpenversePageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize)) return 12
  return Math.min(OPENVERSE_MAX_PAGE_SIZE, Math.max(1, Math.trunc(pageSize)))
}

/**
 * Build the anonymous Openverse search URL. Only CC0/PDM works are requested
 * (0.2.2 keeps the conservative public-domain filter the 0.2.1 client used).
 */
function openverseSearchUrl(query: string | undefined, page: number, pageSize: number): string {
  const params = new URLSearchParams()
  const trimmed = query?.trim() ?? ''
  if (trimmed.length > 0) params.set('q', trimmed)
  params.set('license', 'cc0,pdm')
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  return `${OPENVERSE_API_BASE}?${params.toString()}`
}

/** Map one Openverse licence record to the display licence (null = unusable). */
function mapOpenverseLicense(row: Record<string, unknown>): WallpaperProviderResult['license'] {
  const slugValue = row.license
  if (typeof slugValue !== 'string') return null
  const slug = slugValue.trim().toLowerCase()
  const baseName = OPENVERSE_LICENSE_NAMES[slug]
  if (baseName === undefined) return null
  const versionValue = row.license_version
  const version = typeof versionValue === 'string' && versionValue.trim().length > 0
    ? displayText(versionValue, 16)
    : undefined
  const name = version === undefined ? baseName : `${baseName} ${version}`
  const licenseUrl = safeHttpsUrl(row.license_url)
  if (OPENVERSE_ATTRIBUTION_LICENSES.has(slug) && licenseUrl === undefined) return null
  return licenseUrl === undefined ? { name } : { name, url: licenseUrl }
}

/** Map one Openverse result row; malformed rows are dropped. */
function mapOpenverseResult(raw: unknown): WallpaperProviderResult | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const row = raw as Record<string, unknown>
  const idValue = row.id
  const id = typeof idValue === 'string'
    ? idValue.trim()
    : typeof idValue === 'number' && Number.isFinite(idValue) ? String(idValue) : undefined
  // Ids are opaque UUID-like tokens; reject path/query syntax before building
  // the proxied URL from them.
  if (id === undefined || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(id)) return undefined
  const sourceUrl = safeHttpsUrl(row.foreign_landing_url)
  if (sourceUrl === undefined) return undefined
  const fullUrl = openverseProxyUrl(id, true)
  const thumbUrl = openverseProxyUrl(id, false)
  // Defense in depth: the constructed proxy URLs must satisfy the declared
  // image-host policy (a base-URL edit cannot silently widen the allowlist).
  if (!isAllowedImageUrl(fullUrl, OPENVERSE_IMAGE_POLICY)
    || !isAllowedImageUrl(thumbUrl, OPENVERSE_IMAGE_POLICY)) return undefined
  const title = displayText(row.title, MAX_TITLE_CHARS) ?? 'Untitled'
  const creator = displayText(row.creator, MAX_CREATOR_CHARS)
  const creatorUrl = safeHttpsUrl(row.creator_url)
  const width = positiveInteger(row.width, MAX_DIMENSION)
  const height = positiveInteger(row.height, MAX_DIMENSION)
  return {
    providerId: 'openverse',
    id,
    title,
    ...(creator === undefined ? {} : { creator }),
    ...(creatorUrl === undefined ? {} : { creatorUrl }),
    license: mapOpenverseLicense(row),
    sourceUrl,
    fullUrl,
    thumbUrl,
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
  }
}

/** One Openverse page outcome. */
type ProviderPage =
  | { readonly results: readonly WallpaperProviderResult[]; readonly nextCursor?: string }
  | { readonly failure: ProviderFailure; readonly retryAfterMs?: number }

/** Build one provider page failure without leaking `undefined` optional fields. */
function pageFailure(failure: ProviderFailure, retryAfterMs?: number): ProviderPage {
  return retryAfterMs === undefined
    ? { failure }
    : { failure, retryAfterMs }
}

/** Map one Openverse response body (invalid schema is a typed failure). */
function parseOpenversePage(json: unknown, requestedPage: number): ProviderPage {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return pageFailure('invalid-response')
  const record = json as Record<string, unknown>
  const rows = record.results
  if (!Array.isArray(rows)) return pageFailure('invalid-response')
  const results: WallpaperProviderResult[] = []
  for (const row of rows) {
    const mapped = mapOpenverseResult(row)
    if (mapped !== undefined) results.push(mapped)
  }
  const page = positiveInteger(record.page, Number.MAX_SAFE_INTEGER) ?? requestedPage
  const pageCount = positiveInteger(record.page_count, Number.MAX_SAFE_INTEGER)
  if (pageCount === undefined || page >= pageCount) return { results }
  return { results, nextCursor: encodeOpenverseCursor(page + 1) }
}

const openverseProvider: WallpaperProvider = Object.freeze({
  id: 'openverse' as const,
  label: Object.freeze({ 'zh-CN': 'Openverse', 'en-US': 'Openverse' }),
  auth: 'keyless' as const,
  capabilities: Object.freeze({ search: true, random: false }),
  imageHosts: OPENVERSE_IMAGE_POLICY.imageHosts,
  async fetchPage(request: ProviderPageRequest): Promise<ProviderPage> {
    const signal = request.signal
    if (signal?.aborted === true) return pageFailure('timeout')
    let page = 1
    if (request.cursor !== undefined) {
      const decoded = decodeOpenverseCursor(request.cursor)
      if (decoded === undefined) return pageFailure('invalid-response')
      page = decoded
    }
    const pageSize = clampOpenversePageSize(request.pageSize)
    const fetched = await fetchJsonPage(openverseSearchUrl(request.query, page, pageSize), signal)
    if (!fetched.ok) return pageFailure(fetched.failure, fetched.retryAfterMs)
    return parseOpenversePage(fetched.json, page)
  },
})

/* -------------------------------------------------------------------------- */
/* Wikimedia Commons                                                          */
/* -------------------------------------------------------------------------- */

/** Exact image hosts verified for Commons API-returned URLs. */
const WIKIMEDIA_IMAGE_HOSTS: readonly string[] = Object.freeze([
  'upload.wikimedia.org',
  'thumb.wikimedia.org',
])
/**
 * Raster formats the wallpaper cache can decode. Commons namespace-6 search also
 * returns PDF/video/audio/SVG/TIFF; those must not become selectable results.
 */
const WIKIMEDIA_RASTER_MIMES: readonly string[] = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])
/** Policy used to validate Commons image URLs before they leave the registry. */
const WIKIMEDIA_IMAGE_POLICY: ImageHostPolicy = Object.freeze({
  imageHosts: WIKIMEDIA_IMAGE_HOSTS,
})
/** Opaque continuation cursor prefix for the MediaWiki `continue` protocol. */
const WIKIMEDIA_CURSOR_PREFIX = 'wm1:'
/** Licence names/usage text that mark a non-free restriction (defence in depth). */
const NON_FREE_LICENSE = /(?:^|[^a-z0-9])(?:nc|nd|non-?commercial|non-?free|fair\s*use|no\s*derivatives?)(?:$|[^a-z0-9])/iu
/** Licence names whose reuse terms require an attribution link. */
const ATTRIBUTION_LICENSE = /\b(?:by|attribution)\b/iu

/** Parsed MediaWiki continuation state. */
interface WikimediaCursor {
  readonly offset: string
  readonly continueValue: string
}

/** Encode MediaWiki continuation state as one opaque cursor. */
function encodeWikimediaCursor(cursor: WikimediaCursor): string {
  const payload = JSON.stringify({ o: cursor.offset, c: cursor.continueValue })
  return `${WIKIMEDIA_CURSOR_PREFIX}${encodeURIComponent(payload)}`
}

/** Decode one MediaWiki cursor (`undefined` when it is not ours). */
function decodeWikimediaCursor(cursor: string): WikimediaCursor | undefined {
  if (!cursor.startsWith(WIKIMEDIA_CURSOR_PREFIX)) return undefined
  let payload: unknown
  try {
    payload = JSON.parse(decodeURIComponent(cursor.slice(WIKIMEDIA_CURSOR_PREFIX.length))) as unknown
  } catch {
    return undefined
  }
  if (typeof payload !== 'object' || payload === null) return undefined
  const record = payload as Record<string, unknown>
  const offset = record.o
  const continueValue = record.c
  if (typeof offset !== 'string' || !/^[0-9]+$/u.test(offset)) return undefined
  if (typeof continueValue !== 'string' || continueValue.length === 0 || continueValue.length > 200) return undefined
  return { offset, continueValue }
}

/** Clamp Commons page size to the documented server cap. */
function clampWikimediaPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize)) return 12
  return Math.min(WIKIMEDIA_MAX_PAGE_SIZE, Math.max(1, Math.trunc(pageSize)))
}

/** Base MediaWiki imageinfo parameters shared by search and random. */
function wikimediaImageInfoParams(): Record<string, string> {
  return {
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: String(WIKIMEDIA_THUMB_WIDTH),
    // MediaWiki anonymous CORS only answers when this query parameter is set.
    origin: '*',
  }
}

/** Build one Commons search URL (with continuation when a cursor is present). */
function wikimediaSearchUrl(query: string, pageSize: number, cursor: WikimediaCursor | undefined): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: String(pageSize),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: String(WIKIMEDIA_THUMB_WIDTH),
    origin: '*',
  })
  if (cursor !== undefined) {
    params.set('continue', cursor.continueValue)
    params.set('gsroffset', cursor.offset)
  }
  return `${WIKIMEDIA_API_BASE}?${params.toString()}`
}

/** Build one Commons random-gallery URL (`generator=random`, file namespace). */
function wikimediaRandomUrl(pageSize: number): string {
  const params = new URLSearchParams({
    ...wikimediaImageInfoParams(),
    generator: 'random',
    grnnamespace: '6',
    grnlimit: String(pageSize),
  })
  return `${WIKIMEDIA_API_BASE}?${params.toString()}`
}

/** Extract one extmetadata value (the API wraps values as `{value, source}`). */
function extMetadataValue(metadata: Record<string, unknown>, key: string): string | undefined {
  const entry = metadata[key]
  if (typeof entry === 'string') return entry
  if (typeof entry !== 'object' || entry === null) return undefined
  const value = (entry as Record<string, unknown>).value
  return typeof value === 'string' ? value : undefined
}

/** Map Commons extmetadata to the display licence (null = not selectable). */
function mapWikimediaLicense(metadata: Record<string, unknown>): WallpaperProviderResult['license'] {
  const name = stripHtml(extMetadataValue(metadata, 'LicenseShortName'), MAX_LICENSE_CHARS)
  if (name === undefined) return null
  const signal = `${name} ${stripHtml(extMetadataValue(metadata, 'UsageTerms'), MAX_LICENSE_CHARS) ?? ''}`
  if (NON_FREE_LICENSE.test(signal)) return null
  const attributionRequired = (extMetadataValue(metadata, 'AttributionRequired') ?? '').trim().toLowerCase() === 'true'
  const requiresUrl = attributionRequired || ATTRIBUTION_LICENSE.test(name)
  const licenseUrl = safeHttpsUrl(extMetadataValue(metadata, 'LicenseUrl'))
  if (requiresUrl && licenseUrl === undefined) return null
  return licenseUrl === undefined ? { name } : { name, url: licenseUrl }
}

/** Canonical Commons file-description page for a page title. */
function wikimediaFilePage(title: string): string | undefined {
  const normalized = title.trim().replace(/ /gu, '_')
  if (normalized.length === 0) return undefined
  try {
    return new URL(`https://commons.wikimedia.org/wiki/${encodeURI(normalized)}`).toString()
  } catch {
    return undefined
  }
}

/** Extract the creator name/link from Artist (or Credit) attribution HTML. */
function wikimediaArtist(page: Record<string, unknown>): { creator?: string; creatorUrl?: string } {
  const metadata = page.extmetadata
  if (typeof metadata !== 'object' || metadata === null) return {}
  const record = metadata as Record<string, unknown>
  const raw = extMetadataValue(record, 'Artist') ?? extMetadataValue(record, 'Credit')
  const creator = stripHtml(raw, MAX_CREATOR_CHARS)
  const creatorUrl = firstHref(raw)
  return {
    ...(creator === undefined ? {} : { creator }),
    ...(creatorUrl === undefined ? {} : { creatorUrl }),
  }
}

/** Map one MediaWiki page row to a provider result; unusable rows are dropped. */
function mapWikimediaPage(raw: unknown): WallpaperProviderResult | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const page = raw as Record<string, unknown>
  const imageInfoList = page.imageinfo
  if (!Array.isArray(imageInfoList)) return undefined
  const infoRaw = imageInfoList[0]
  if (typeof infoRaw !== 'object' || infoRaw === null || Array.isArray(infoRaw)) return undefined
  const info = infoRaw as Record<string, unknown>
  // `mime` is present because the query asks for it; a missing/foreign value is
  // not a decodable raster and must not become a selectable wallpaper.
  if (typeof info.mime !== 'string' || !WIKIMEDIA_RASTER_MIMES.includes(info.mime.toLowerCase())) {
    return undefined
  }
  const fullUrl = safeHttpsUrl(info.url)
  if (fullUrl === undefined || !isAllowedImageUrl(fullUrl, WIKIMEDIA_IMAGE_POLICY)) return undefined
  const verifiedThumb = safeHttpsUrl(info.thumburl)
  const thumbUrl = verifiedThumb !== undefined && isAllowedImageUrl(verifiedThumb, WIKIMEDIA_IMAGE_POLICY)
    ? verifiedThumb
    : fullUrl
  const titleValue = page.title
  const rawTitle = typeof titleValue === 'string' ? titleValue : ''
  const displayTitle = displayText(rawTitle.replace(/^File:/iu, ''), MAX_TITLE_CHARS) ?? 'Untitled'
  const sourceUrl = safeHttpsUrl(info.descriptionurl)
    ?? (rawTitle.length > 0 ? wikimediaFilePage(rawTitle) : undefined)
  if (sourceUrl === undefined) return undefined
  const width = positiveInteger(info.width, MAX_DIMENSION)
  const height = positiveInteger(info.height, MAX_DIMENSION)
  const licenseRecord = typeof info.extmetadata === 'object' && info.extmetadata !== null
    ? info.extmetadata as Record<string, unknown>
    : undefined
  const license = licenseRecord === undefined ? null : mapWikimediaLicense(licenseRecord)
  const artist = wikimediaArtist(info)
  const pageId = page.pageid
  const id = typeof pageId === 'number' && Number.isFinite(pageId)
    ? String(pageId)
    : displayText(rawTitle, MAX_TITLE_CHARS) ?? 'missing'
  return {
    providerId: 'wikimedia',
    id,
    title: displayTitle,
    ...artist,
    license,
    sourceUrl,
    fullUrl,
    thumbUrl,
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
  }
}

/** Map one MediaWiki JSON error object to a stable failure class. */
function mediaWikiFailure(error: unknown): ProviderFailure {
  if (typeof error !== 'object' || error === null) return 'invalid-response'
  const codeRaw = (error as Record<string, unknown>).code
  const code = typeof codeRaw === 'string' ? codeRaw.toLowerCase() : ''
  if (code.includes('ratelimit')) return 'rate-limited'
  if (code.includes('permission') || code.includes('denied') || code.includes('blocked')) return 'auth-required'
  if (code === 'maxlag') return 'unavailable'
  return 'invalid-response'
}

/** Map one Commons API response body; random requests ignore continuation. */
function parseWikimediaPage(json: unknown, allowCursor: boolean): ProviderPage {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return pageFailure('invalid-response')
  const record = json as Record<string, unknown>
  if (record.error !== undefined) return pageFailure(mediaWikiFailure(record.error))
  const query = record.query
  if (query === undefined || query === null) return { results: [] }
  if (typeof query !== 'object' || Array.isArray(query)) return pageFailure('invalid-response')
  const pagesValue = (query as Record<string, unknown>).pages
  if (pagesValue === undefined || pagesValue === null) return { results: [] }
  if (typeof pagesValue !== 'object' || Array.isArray(pagesValue)) return pageFailure('invalid-response')
  const rows = Object.values(pagesValue as Record<string, unknown>)
  rows.sort((left, right) => wikimediaRowIndex(left) - wikimediaRowIndex(right))
  const results: WallpaperProviderResult[] = []
  for (const row of rows) {
    const mapped = mapWikimediaPage(row)
    if (mapped !== undefined) results.push(mapped)
  }
  const continuation = record.continue
  if (allowCursor && typeof continuation === 'object' && continuation !== null && !Array.isArray(continuation)) {
    const tokenRecord = continuation as Record<string, unknown>
    const offset = tokenRecord.gsroffset
    const continueValue = tokenRecord.continue
    if ((typeof offset === 'number' || typeof offset === 'string') && typeof continueValue === 'string') {
      return {
        results,
        nextCursor: encodeWikimediaCursor({ offset: String(offset), continueValue }),
      }
    }
  }
  return { results }
}

/** Generator ordering index (`0` when absent) used to keep relevance order. */
function wikimediaRowIndex(row: unknown): number {
  if (typeof row !== 'object' || row === null) return 0
  const index = (row as Record<string, unknown>).index
  return typeof index === 'number' && Number.isFinite(index) ? index : 0
}

const wikimediaProvider: WallpaperProvider = Object.freeze({
  id: 'wikimedia' as const,
  label: Object.freeze({ 'zh-CN': '维基共享资源', 'en-US': 'Wikimedia Commons' }),
  auth: 'keyless' as const,
  capabilities: Object.freeze({ search: true, random: true }),
  imageHosts: WIKIMEDIA_IMAGE_HOSTS,
  async fetchPage(request: ProviderPageRequest): Promise<ProviderPage> {
    const signal = request.signal
    if (signal?.aborted === true) return pageFailure('timeout')
    const pageSize = clampWikimediaPageSize(request.pageSize)
    const query = request.query?.trim() ?? ''
    // A missing/blank query is a browse request: `generator=random` gives a
    // truthful random file page in namespace 6. The licence mapping below still
    // runs for every row, so unusable/restricted files are never selectable.
    if (query.length === 0) {
      const fetched = await fetchJsonPage(wikimediaRandomUrl(pageSize), signal)
      if (!fetched.ok) return pageFailure(fetched.failure, fetched.retryAfterMs)
      return parseWikimediaPage(fetched.json, false)
    }
    let cursor: WikimediaCursor | undefined
    if (request.cursor !== undefined) {
      const decoded = decodeWikimediaCursor(request.cursor)
      if (decoded === undefined) return pageFailure('invalid-response')
      cursor = decoded
    }
    const fetched = await fetchJsonPage(wikimediaSearchUrl(query, pageSize, cursor), signal)
    if (!fetched.ok) return pageFailure(fetched.failure, fetched.retryAfterMs)
    return parseWikimediaPage(fetched.json, true)
  },
})

/* -------------------------------------------------------------------------- */
/* Registry                                                                   */
/* -------------------------------------------------------------------------- */

/** Empty policy used for foreign ids (fail closed: no images allowed). */
const EMPTY_IMAGE_POLICY: ImageHostPolicy = Object.freeze({ imageHosts: Object.freeze([]) })

/** Gate-accepted providers in gate (Auto) order: Openverse, Wikimedia Commons. */
export const PROVIDERS: readonly WallpaperProvider[] = Object.freeze([
  openverseProvider,
  wikimediaProvider,
])

/** Capability-filtered provider lists (precomputed; registry order preserved). */
const CAPABILITY_PROVIDERS: Readonly<Record<'search' | 'random', readonly WallpaperProvider[]>> = Object.freeze({
  search: Object.freeze(PROVIDERS.filter(provider => provider.capabilities.search)),
  random: Object.freeze(PROVIDERS.filter(provider => provider.capabilities.random)),
})

/**
 * Look up one registered provider by its stable id.
 * @param id - provider id (any untrusted string).
 * @returns the provider, or undefined for unknown/rejected ids.
 */
export function providerById(id: string): WallpaperProvider | undefined {
  return PROVIDERS.find(provider => provider.id === id)
}

/**
 * Providers Auto may use, in registry/gate order (Picsum is never present).
 * @returns every gate-accepted provider.
 */
export function autoProviders(): readonly WallpaperProvider[] {
  return PROVIDERS
}

/**
 * Providers that truthfully declare one capability, in registry order.
 * @param capability - capability to filter on.
 * @returns the matching providers (empty when none can truthfully serve it).
 */
export function providersForCapability(capability: 'search' | 'random'): readonly WallpaperProvider[] {
  return CAPABILITY_PROVIDERS[capability]
}

/* -------------------------------------------------------------------------- */
/* Online page orchestration                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Whether a signal exists and is already aborted. A helper (instead of an
 * optional-chain comparison) keeps control-flow narrowing from hiding the
 * loop-level re-check after an awaited attempt.
 */
function isSignalAborted(signal: AbortSignal | undefined): boolean {
  return signal !== undefined && signal.aborted
}

/** Signal used only when the platform has no `AbortController`. */
const NEVER_ABORTED_SIGNAL: AbortSignal = Object.freeze({
  aborted: false,
  reason: undefined,
  onabort: null,
  throwIfAborted: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
}) as unknown as AbortSignal

/**
 * Run one provider attempt with a hard timeout. The race is needed because a
 * provider could ignore its abort signal; a late result is ignored.
 * @param provider - provider to call.
 * @param request - page request.
 * @param timeoutMs - per-attempt timeout (`min(6s, remaining)`).
 * @param externalSignal - overall caller signal.
 * @returns the provider page outcome (never throws).
 */
function attemptProvider(
  provider: WallpaperProvider,
  request: OnlinePageRequest,
  timeoutMs: number,
  externalSignal: AbortSignal | undefined,
): Promise<ProviderPage> {
  return new Promise<ProviderPage>((resolve) => {
    let settled = false
    const controller = typeof AbortController === 'undefined' ? undefined : new AbortController()
    const signal = controller?.signal ?? externalSignal ?? NEVER_ABORTED_SIGNAL
    let timer: ReturnType<typeof setTimeout> | undefined
    const onExternalAbort = (): void => {
      try {
        controller?.abort()
      } catch {
        /* abort is best effort */
      }
      finish(pageFailure('timeout'))
    }
    const cleanup = (): void => {
      if (timer !== undefined) clearTimeout(timer)
      if (externalSignal !== undefined) {
        try {
          externalSignal.removeEventListener('abort', onExternalAbort)
        } catch {
          /* removing a listener is best effort */
        }
      }
    }
    function finish(outcome: ProviderPage): void {
      if (settled) return
      settled = true
      cleanup()
      resolve(outcome)
    }
    timer = setTimeout(() => {
      try {
        controller?.abort()
      } catch {
        /* abort is best effort */
      }
      finish(pageFailure('timeout'))
    }, timeoutMs)
    if (externalSignal !== undefined) {
      try {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true })
      } catch {
        /* adding a listener is best effort */
      }
      // The signal may have aborted between the loop's check and this listener.
      if (externalSignal.aborted) onExternalAbort()
    }
    let pending: Promise<ProviderPage>
    try {
      pending = provider.fetchPage({
        ...(request.query === undefined ? {} : { query: request.query }),
        ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
        pageSize: request.pageSize,
        signal,
      })
    } catch {
      finish(pageFailure('unavailable'))
      return
    }
    pending.then(
      outcome => finish(outcome),
      () => finish(pageFailure('unavailable')),
    )
  })
}

/**
 * Fetch one online wallpaper page with Auto failover and typed failures.
 *
 * - `provider: 'auto'` tries at most {@link AUTO_MAX_ATTEMPTS} gate providers in
 *   registry order and reports the provider that served the results.
 * - A pinned provider gets exactly one attempt and never silently changes.
 * - Each attempt gets `min(6 s, remaining)`; the overall deadline defaults to
 *   12 s. Abort/timeout, 401/403, 429 (+`Retry-After`), malformed bodies and
 *   network/5xx failures map to the stable {@link ProviderFailure} classes.
 * @param request - provider selection, page state and deadline.
 * @returns results + served provider, or the last typed failure + tried ids.
 */
export async function fetchOnlinePage(request: OnlinePageRequest): Promise<OnlinePageOk | OnlinePageFailure> {
  const externalSignal = request.signal
  if (isSignalAborted(externalSignal)) return { ok: false, failure: 'timeout', tried: [] }
  let candidates: readonly WallpaperProvider[]
  if (request.provider === 'auto') {
    candidates = autoProviders().slice(0, AUTO_MAX_ATTEMPTS)
  } else {
    const pinned = providerById(request.provider)
    if (pinned === undefined) return { ok: false, failure: 'invalid-response', tried: [] }
    candidates = [pinned]
  }
  const deadlineMs = typeof request.deadlineMs === 'number' && Number.isFinite(request.deadlineMs)
    ? request.deadlineMs
    : ONLINE_PAGE_DEADLINE_MS
  const deadlineAt = Date.now() + deadlineMs
  const tried: ProviderId[] = []
  let lastFailure: ProviderFailure = 'unavailable'
  let lastRetryAfterMs: number | undefined
  for (const provider of candidates) {
    if (isSignalAborted(externalSignal)) {
      lastFailure = 'timeout'
      lastRetryAfterMs = undefined
      break
    }
    const remaining = deadlineAt - Date.now()
    if (remaining <= 0) {
      lastFailure = 'timeout'
      lastRetryAfterMs = undefined
      break
    }
    const timeoutMs = Math.max(1, Math.min(ONLINE_ATTEMPT_TIMEOUT_MS, remaining))
    tried.push(provider.id)
    const outcome = await attemptProvider(provider, request, timeoutMs, externalSignal)
    if ('results' in outcome) {
      return outcome.nextCursor === undefined
        ? { ok: true, results: outcome.results, servedBy: provider.id }
        : { ok: true, results: outcome.results, servedBy: provider.id, nextCursor: outcome.nextCursor }
    }
    lastFailure = outcome.failure
    lastRetryAfterMs = outcome.retryAfterMs
  }
  return lastRetryAfterMs === undefined
    ? { ok: false, failure: lastFailure, tried }
    : { ok: false, failure: lastFailure, retryAfterMs: lastRetryAfterMs, tried }
}
