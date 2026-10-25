/**
 * Wallpaper studio core — client-only visual layer.
 *
 * Wallpapers never touch host configuration or the boot handshake: the layer is
 * persisted in `localStorage` and rendered by the client into one plugin-owned
 * `<style data-plugin-css="dsh-livery/wallpaper">` plus
 * `body[data-dsh-wallpaper]`, using only body pseudo-elements and documented
 * livery background tokens mixed toward transparent for the frost effect.
 *
 * Everything in this module is pure and testable: validation, clamping, the
 * persisted schema, remote-response mapping and the stylesheet builder. DOM
 * writes live in `wallpaper/apply.ts`; orchestration lives in
 * `wallpaper/controller.ts`.
 */
import type { CompiledLivery, TokenMap } from '../core/types.js'

/** localStorage key holding the persisted wallpaper selection + effects. */
export const WALLPAPER_STORAGE_KEY = 'dsh-livery.wallpaper.v1'
/** `data-plugin-css` marker of the plugin-owned wallpaper stylesheet. */
export const WALLPAPER_CSS_FILE = 'dsh-livery/wallpaper'
/** Public body attribute owning the wallpaper layer (only Livery writes it). */
export const WALLPAPER_ATTRIBUTE = 'data-dsh-wallpaper'

/** Hard cap for user-provided wallpaper URLs. */
export const MAX_WALLPAPER_URL_LENGTH = 2048

/** One of the eight bundled CSS-only wallpapers. */
export type BuiltinWallpaperId =
  | 'aurora' | 'dusk' | 'mist' | 'paper'
  | 'ink' | 'ember' | 'sea' | 'mono'

/** Builtin wallpapers in display order. */
export const BUILTIN_WALLPAPER_IDS: readonly BuiltinWallpaperId[] = [
  'aurora', 'dusk', 'mist', 'paper', 'ink', 'ember', 'sea', 'mono',
]

/** CSS `background` shorthand value of each bundled wallpaper (no network/assets). */
export const BUILTIN_WALLPAPERS: Readonly<Record<BuiltinWallpaperId, string>> = {
  aurora: 'radial-gradient(120% 130% at 8% 0%, #5eead4 0%, transparent 55%), '
    + 'radial-gradient(110% 130% at 92% 12%, #818cf8 0%, transparent 60%), '
    + 'linear-gradient(160deg, #0b1026 0%, #111a3a 100%)',
  dusk: 'linear-gradient(160deg, #2d1b3d 0%, #6b2d5c 48%, #e07a5f 100%)',
  mist: 'linear-gradient(180deg, #e8eef2 0%, #c9d6dd 55%, #9fb3bd 100%)',
  paper: 'repeating-linear-gradient(0deg, #f6f1e7 0 22px, #efe8da 22px 23px)',
  ink: 'radial-gradient(90% 130% at 14% 0%, #3b3b3b 0%, transparent 62%), '
    + 'linear-gradient(180deg, #f2eee6 0%, #d9d2c4 100%)',
  ember: 'radial-gradient(110% 120% at 20% 100%, #f59e0b 0%, transparent 55%), '
    + 'linear-gradient(160deg, #3a0d0d 0%, #7c2d12 58%, #f59e0b 100%)',
  sea: 'linear-gradient(180deg, #0f172a 0%, #0e7490 55%, #67e8f9 100%)',
  mono: 'linear-gradient(160deg, #111111 0%, #333333 50%, #111111 100%)',
}

/** Effect slider values (integers). */
export interface WallpaperEffects {
  /** Blur radius in px, 0–24. */
  readonly blur: number
  /** Dim overlay opacity in percent, 0–70. */
  readonly dim: number
  /** Frost: percent of surface color removed toward transparent, 0–100. */
  readonly frost: number
}

/** Effect bounds and step used by the UI and the clamp helper. */
export const WALLPAPER_EFFECT_BOUNDS: Readonly<Record<keyof WallpaperEffects, { readonly min: number; readonly max: number; readonly step: number }>> = {
  blur: { min: 0, max: 24, step: 1 },
  dim: { min: 0, max: 70, step: 1 },
  frost: { min: 0, max: 100, step: 1 },
}

/** Effects applied before any user change (and restored by 重置). */
export const DEFAULT_WALLPAPER_EFFECTS: WallpaperEffects = { blur: 8, dim: 25, frost: 35 }

/** The selected wallpaper, or `undefined` for "no wallpaper". */
export type WallpaperSelection =
  | { readonly kind: 'builtin'; readonly id: BuiltinWallpaperId }
  | { readonly kind: 'remote'; readonly url: string }
  | undefined

/** Persisted shape (schema v1). */
export interface StoredWallpaper {
  readonly kind: 'builtin' | 'remote'
  readonly id?: string
  readonly url?: string
  readonly blur: number
  readonly dim: number
  readonly frost: number
}

/** Clamp one numeric effect value into its bounds; NaN falls back to the default. */
function clampEffect(name: keyof WallpaperEffects, value: unknown): number {
  const bounds = WALLPAPER_EFFECT_BOUNDS[name]
  const fallback = DEFAULT_WALLPAPER_EFFECTS[name]
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(numeric)))
}

/**
 * Clamp an untrusted effects record (storage/UI) to the supported ranges.
 * @param input - partial/unknown effects.
 * @returns a complete, bounded effects record.
 */
export function clampEffects(input: unknown): WallpaperEffects {
  const record = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
  return {
    blur: clampEffect('blur', record.blur),
    dim: clampEffect('dim', record.dim),
    frost: clampEffect('frost', record.frost),
  }
}

/** Reasons a custom wallpaper URL can be rejected (mapped to i18n copy). */
export type WallpaperUrlProblem =
  | 'empty' | 'too-long' | 'not-https' | 'credentials' | 'invalid'

/** Validation result for a custom wallpaper URL. */
export type WallpaperUrlCheck =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly problem: WallpaperUrlProblem }

/**
 * Validate a user-provided wallpaper URL: https only, bounded length, no
 * embedded credentials, no `javascript:`/`data:`/`http:`/`file:` schemes.
 * @param input - raw input text.
 * @returns the normalized https URL or a problem code.
 */
export function validateWallpaperUrl(input: string): WallpaperUrlCheck {
  const trimmed = input.trim()
  if (trimmed.length === 0) return { ok: false, problem: 'empty' }
  if (trimmed.length > MAX_WALLPAPER_URL_LENGTH) return { ok: false, problem: 'too-long' }
  // Reject non-https schemes before URL parsing normalizes them.
  if (!/^https:\/\//i.test(trimmed)) return { ok: false, problem: 'not-https' }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, problem: 'invalid' }
  }
  if (parsed.protocol !== 'https:') return { ok: false, problem: 'not-https' }
  if (parsed.username.length > 0 || parsed.password.length > 0) return { ok: false, problem: 'credentials' }
  if (parsed.hostname.length === 0) return { ok: false, problem: 'invalid' }
  return { ok: true, url: parsed.href }
}

/** Whether the value is a known builtin wallpaper id. */
export function isBuiltinWallpaperId(value: unknown): value is BuiltinWallpaperId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BUILTIN_WALLPAPERS, value)
}

/**
 * CSS `url()` token for one validated remote URL.
 *
 * Single-quoted so a value can never break out of the declaration; backslashes
 * and quotes are escaped and raw newlines removed. Validation already restricts
 * the scheme, this is defence in depth for the stylesheet builder.
 * @param url - validated https URL.
 * @returns the CSS url() value.
 */
export function cssUrlValue(url: string): string {
  const escaped = url
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/[\r\n\f]/g, '')
  return `url('${escaped}')`
}

/**
 * CSS background-image value for one selection.
 * @param selection - selected wallpaper.
 * @returns the CSS value, or undefined for "no wallpaper".
 */
export function backgroundImageValue(selection: WallpaperSelection): string | undefined {
  if (selection === undefined) return undefined
  if (selection.kind === 'builtin') return BUILTIN_WALLPAPERS[selection.id]
  return cssUrlValue(selection.url)
}

/**
 * Documented livery background tokens the frost effect makes translucent.
 * Only names present in the active livery's token map are emitted.
 */
export const WALLPAPER_SURFACE_TOKENS: readonly string[] = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-document-preview',
  '--dsw-alias-bg-module-platform',
  '--dsw-alias-bg-overlay',
  '--dsw-alias-interactive-bg-hover-solid',
  '--dsw-alias-scrollbar-bg-l1',
  '--dsw-alias-scrollbar-bg-l2',
  '--dsw-alias-tooltip-bg',
  '--dsw-alias-turn-trigger-bg',
]

/** Livery token maps needed for surface translucency (absent for stock/hydrating). */
export interface WallpaperTokenContext {
  readonly light: TokenMap
  readonly dark: TokenMap
  readonly frost: number
}

/** Input of the wallpaper stylesheet builder. */
export interface WallpaperCssInput {
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
  /** Present only when an active livery supplies background tokens. */
  readonly tokens?: WallpaperTokenContext | undefined
}

/**
 * Build one translucent override block for a token map.
 * @param selector - body-qualified selector.
 * @param tokens - compiled livery token map for one mode.
 * @param frost - frost percentage (0…100).
 * @returns the override rule, or '' when no surface token is present.
 */
function tokenOverrides(selector: string, tokens: TokenMap, frost: number): string {
  const remaining = Math.max(0, Math.min(100, 100 - frost))
  const declarations = WALLPAPER_SURFACE_TOKENS
    .filter(token => typeof tokens[token] === 'string' && tokens[token]!.length > 0)
    .map(token => `${token}:color-mix(in srgb, ${tokens[token]} ${remaining}%, transparent)`)
  return declarations.length === 0 ? '' : `${selector}{${declarations.join(';')}}`
}

/**
 * Build the complete plugin-owned wallpaper stylesheet.
 *
 * Layer: two fixed pseudo-elements on `body[data-dsh-wallpaper]` (image + dim
 * veil), both behind content and non-interactive. Frost: translucent overrides
 * of the active livery's background tokens, scoped to the livery and the
 * wallpaper attributes, with a dark-scheme variant.
 * @param input - selection, effects and optional livery token maps.
 * @returns the stylesheet text ('' clears the layer).
 */
export function buildWallpaperCss(input: WallpaperCssInput): string {
  const image = backgroundImageValue(input.selection)
  if (image === undefined) return ''
  const { blur, dim } = input.effects
  const rules: string[] = [
    `body[${WALLPAPER_ATTRIBUTE}]::before{content:'';position:fixed;inset:-24px;z-index:-1;pointer-events:none;`
    + `background-image:${image};background-position:center;background-size:cover;filter:blur(${blur}px)}`,
    `body[${WALLPAPER_ATTRIBUTE}]::after{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;`
    + `background:rgba(0,0,0,${(dim / 100).toFixed(2)})}`,
  ]
  const tokens = input.tokens
  if (tokens !== undefined) {
    const light = tokenOverrides(`body[data-dsh-livery][${WALLPAPER_ATTRIBUTE}]`, tokens.light, tokens.frost)
    if (light.length > 0) rules.push(light)
    const dark = tokenOverrides(
      `body[data-dsh-livery][${WALLPAPER_ATTRIBUTE}][data-ds-dark-theme]`,
      tokens.dark,
      tokens.frost,
    )
    if (dark.length > 0) rules.push(dark)
  }
  return rules.join('\n')
}

/** Wallpaper token context for one active livery, or undefined for stock. */
export function tokenContextOf(
  livery: CompiledLivery | undefined,
  frost: number,
): WallpaperTokenContext | undefined {
  if (livery === undefined) return undefined
  return { light: livery.light.tokens, dark: livery.dark.tokens, frost }
}

/** Persistable record for one selection + effects, or undefined when cleared. */
export function toStoredWallpaper(
  selection: WallpaperSelection,
  effects: WallpaperEffects,
): StoredWallpaper | undefined {
  if (selection === undefined) return undefined
  const clamped = clampEffects(effects)
  if (selection.kind === 'builtin') {
    return { kind: 'builtin', id: selection.id, ...clamped }
  }
  return { kind: 'remote', url: selection.url, ...clamped }
}

/** Hydrated controller state from storage. */
export interface HydratedWallpaper {
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
}

/**
 * Parse one persisted wallpaper record (defensive: corrupt/foreign data ignored).
 * @param raw - `JSON.parse`d value from localStorage.
 * @returns the hydrated selection/effects, or undefined when invalid.
 */
export function parseStoredWallpaper(raw: unknown): HydratedWallpaper | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const record = raw as Record<string, unknown>
  const effects = clampEffects(record)
  if (record.kind === 'builtin') {
    if (!isBuiltinWallpaperId(record.id)) return undefined
    return { selection: { kind: 'builtin', id: record.id }, effects }
  }
  if (record.kind === 'remote') {
    if (typeof record.url !== 'string') return undefined
    const check = validateWallpaperUrl(record.url)
    if (!check.ok) return undefined
    return { selection: { kind: 'remote', url: check.url }, effects }
  }
  return undefined
}

/**
 * Serialize one selection + effects, or undefined when nothing should persist.
 * @param selection - current wallpaper.
 * @param effects - current effect values.
 * @returns the JSON record to store.
 */
export function serializeWallpaper(
  selection: WallpaperSelection,
  effects: WallpaperEffects,
): StoredWallpaper | undefined {
  return toStoredWallpaper(selection, effects)
}

/** One mapped remote wallpaper result. */
export interface WallpaperRemoteResult {
  readonly id: string
  readonly url: string
  readonly thumbnail: string
  readonly title: string
  readonly creator: string
  readonly license: string
  readonly source: string
}

/** Remote source family: Openverse search or Picsum random list. */
export type WallpaperRemoteSource = 'openverse' | 'picsum'

/** Openverse image search endpoint. */
export const OPENVERSE_API = 'https://api.openverse.org/v1/images/'
/** Picsum public list endpoint. */
export const PICSUM_API = 'https://picsum.photos/v2/list'

/**
 * Build the Openverse search URL (CC0/PDM only, 12 results).
 * @param query - user query (already trimmed; empty is allowed by the API).
 * @param page - 1-based result page.
 * @returns the absolute URL.
 */
export function openverseUrl(query: string, page = 1): string {
  const params = new URLSearchParams({
    q: query,
    license: 'cc0,pdm',
    page_size: '12',
    page: String(page),
  })
  return `${OPENVERSE_API}?${params.toString()}`
}

/**
 * Build the Picsum random-list URL.
 * @param page - 1-based page.
 * @param limit - page size.
 * @returns the absolute URL.
 */
export function picsumListUrl(page: number, limit = 12): string {
  return `${PICSUM_API}?page=${page}&limit=${limit}`
}

function httpsOnly(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return /^https:\/\//i.test(value) ? value : undefined
}

/**
 * Map one Openverse response document to result rows.
 * @param json - decoded response body.
 * @returns valid https results (max 12); malformed rows are skipped.
 */
export function parseOpenverseResults(json: unknown): readonly WallpaperRemoteResult[] {
  if (typeof json !== 'object' || json === null) return []
  const results = (json as Record<string, unknown>).results
  if (!Array.isArray(results)) return []
  const mapped: WallpaperRemoteResult[] = []
  for (const entry of results) {
    if (typeof entry !== 'object' || entry === null) continue
    const row = entry as Record<string, unknown>
    const url = httpsOnly(row.url)
    if (url === undefined) continue
    const id = typeof row.id === 'string' || typeof row.id === 'number' ? String(row.id) : url
    const thumbnail = httpsOnly(row.thumbnail) ?? url
    mapped.push({
      id,
      url,
      thumbnail,
      title: typeof row.title === 'string' && row.title.length > 0 ? row.title : 'Openverse image',
      creator: typeof row.creator === 'string' ? row.creator : '',
      license: typeof row.license === 'string' ? row.license : '',
      source: 'openverse.org',
    })
    if (mapped.length === 12) break
  }
  return mapped
}

/**
 * Map one Picsum list response document to result rows (1600×900 renders).
 * @param json - decoded response body.
 * @returns valid https results (max 12).
 */
export function parsePicsumResults(json: unknown): readonly WallpaperRemoteResult[] {
  if (!Array.isArray(json)) return []
  const mapped: WallpaperRemoteResult[] = []
  for (const entry of json) {
    if (typeof entry !== 'object' || entry === null) continue
    const row = entry as Record<string, unknown>
    const id = typeof row.id === 'string' || typeof row.id === 'number' ? String(row.id) : undefined
    if (id === undefined) continue
    const url = `https://picsum.photos/id/${encodeURIComponent(id)}/1600/900`
    mapped.push({
      id,
      url,
      thumbnail: `https://picsum.photos/id/${encodeURIComponent(id)}/400/225`,
      title: `Picsum #${id}`,
      creator: typeof row.author === 'string' ? row.author : '',
      license: 'Picsum',
      source: 'picsum.photos',
    })
    if (mapped.length === 12) break
  }
  return mapped
}

/** Result of one user-initiated remote fetch. */
export type WallpaperFetchOutcome =
  | { readonly ok: true; readonly results: readonly WallpaperRemoteResult[] }
  | { readonly ok: false; readonly reason: 'offline' | 'error' }

/** Timeout for one wallpaper network request. */
export const WALLPAPER_FETCH_TIMEOUT_MS = 8000

/**
 * Run one user-initiated wallpaper network request.
 *
 * Only called from explicit user actions; failures resolve to a typed outcome
 * instead of throwing so the panel can show loading/empty/offline states.
 * @param request - source and query/page.
 * @param fetchImpl - fetch implementation (global fetch in the browser; injected in tests).
 * @param timeoutMs - abort timeout in ms.
 * @returns results or a failure reason.
 */
export async function requestWallpaperResults(
  request: { readonly source: WallpaperRemoteSource; readonly query?: string; readonly page?: number },
  fetchImpl: typeof fetch | undefined = typeof fetch === 'undefined' ? undefined : fetch,
  timeoutMs = WALLPAPER_FETCH_TIMEOUT_MS,
): Promise<WallpaperFetchOutcome> {
  if (fetchImpl === undefined) return { ok: false, reason: 'offline' }
  const url = request.source === 'openverse'
    ? openverseUrl(request.query ?? '', request.page ?? 1)
    : picsumListUrl(request.page ?? Math.floor(Math.random() * 8) + 1)
  const controller = typeof AbortController === 'undefined' ? undefined : new AbortController()
  const timer = controller === undefined
    ? undefined
    : setTimeout(() => { controller.abort() }, timeoutMs)
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: { accept: 'application/json' },
      ...(controller === undefined ? {} : { signal: controller.signal }),
    })
    if (!response.ok) return { ok: false, reason: 'error' }
    const json: unknown = await response.json()
    const results = request.source === 'openverse'
      ? parseOpenverseResults(json)
      : parsePicsumResults(json)
    return { ok: true, results }
  } catch {
    return { ok: false, reason: 'offline' }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
