/**
 * Wallpaper studio core — client-only visual layer.
 *
 * Wallpapers never touch host configuration or the boot handshake: the layer is
 * persisted in `localStorage` and rendered by the client into one plugin-owned
 * `<style data-plugin-css="dsh-livery/wallpaper">` plus
 * `body[data-dsh-wallpaper]`, using only body pseudo-elements and documented
 * livery background tokens mixed toward transparent for the frost effect.
 *
 * Everything here is DOM-free and testable: validation, clamping, the persisted
 * schema, remote-response mapping and the stylesheet builder. DOM writes live in
 * `wallpaper/apply.ts`; orchestration lives in `wallpaper/controller.ts`.
 */
import type { CompiledLivery, TokenMap } from '../core/types.js'

/** localStorage key holding the persisted wallpaper selection + effects. */
export const WALLPAPER_STORAGE_KEY = 'dsh-livery.wallpaper.v1'
/** `data-plugin-css` marker of the plugin-owned wallpaper stylesheet. */
export const WALLPAPER_CSS_FILE = 'dsh-livery/wallpaper'
/** Public body attribute owning the wallpaper layer (only Livery writes it). */
export const WALLPAPER_ATTRIBUTE = 'data-dsh-wallpaper'
/** Id + class of the plugin-owned atmosphere overlay element above app content. */
export const WALLPAPER_OVERLAY_ID = 'dsh-livery-wallpaper-overlay'
export const WALLPAPER_OVERLAY_CLASS = 'dsh-livery-wallpaper-overlay'

/** Hard cap for user-provided wallpaper URLs. */
export const MAX_WALLPAPER_URL_LENGTH = 2048

/** One of the 24 bundled CSS-only wallpapers. */
export type BuiltinWallpaperId =
  | 'aurora' | 'dusk' | 'mist' | 'paper'
  | 'ink' | 'ember' | 'sea' | 'mono'
  | 'forest' | 'desert' | 'ocean' | 'sky'
  | 'snow' | 'bloom' | 'neon' | 'cyber'
  | 'retro' | 'sand' | 'rose' | 'violet'
  | 'midnight' | 'sunrise' | 'glacier' | 'minimal'

/** Builtin wallpapers in display order. */
export const BUILTIN_WALLPAPER_IDS: readonly BuiltinWallpaperId[] = [
  'aurora', 'dusk', 'mist', 'paper', 'ink', 'ember', 'sea', 'mono',
  'forest', 'desert', 'ocean', 'sky', 'snow', 'bloom', 'neon', 'cyber',
  'retro', 'sand', 'rose', 'violet', 'midnight', 'sunrise', 'glacier', 'minimal',
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
  forest: 'radial-gradient(90% 120% at 20% 0%, #14532d 0%, transparent 60%), linear-gradient(170deg, #052e16 0%, #166534 55%, #4ade80 100%)',
  desert: 'linear-gradient(165deg, #78350f 0%, #d97706 45%, #fde68a 100%)',
  ocean: 'radial-gradient(100% 120% at 80% 10%, #0ea5e9 0%, transparent 55%), linear-gradient(180deg, #082f49 0%, #0369a1 55%, #67e8f9 100%)',
  sky: 'linear-gradient(180deg, #38bdf8 0%, #bae6fd 55%, #f0f9ff 100%)',
  snow: 'radial-gradient(80% 90% at 30% 10%, #ffffff 0%, transparent 65%), linear-gradient(170deg, #dbeafe 0%, #e2e8f0 60%, #94a3b8 100%)',
  bloom: 'radial-gradient(60% 70% at 25% 20%, #fbcfe8 0%, transparent 60%), radial-gradient(60% 70% at 80% 75%, #fde68a 0%, transparent 60%), linear-gradient(150deg, #831843 0%, #be185d 60%, #fb7185 100%)',
  neon: 'linear-gradient(120deg, #0f172a 0%, #4c1d95 40%, #db2777 70%, #22d3ee 100%)',
  cyber: 'repeating-linear-gradient(90deg, #0b1026 0 14px, #111a3a 14px 28px), radial-gradient(80% 100% at 50% 120%, #22d3ee 0%, transparent 60%)',
  retro: 'linear-gradient(160deg, #7c2d12 0%, #c2410c 35%, #fbbf24 70%, #fde68a 100%)',
  sand: 'linear-gradient(170deg, #d6c3a5 0%, #e7d7bd 50%, #b49a72 100%)',
  rose: 'linear-gradient(160deg, #4c0519 0%, #9f1239 45%, #fda4af 100%)',
  violet: 'radial-gradient(90% 120% at 15% 10%, #7c3aed 0%, transparent 60%), linear-gradient(170deg, #1e1b4b 0%, #4c1d95 55%, #c4b5fd 100%)',
  midnight: 'linear-gradient(180deg, #020617 0%, #0f172a 55%, #1e293b 100%)',
  sunrise: 'radial-gradient(80% 100% at 80% 100%, #f97316 0%, transparent 60%), linear-gradient(180deg, #1e1b4b 0%, #7c2d12 45%, #fbbf24 100%)',
  glacier: 'radial-gradient(90% 110% at 25% 0%, #e0f2fe 0%, transparent 60%), linear-gradient(170deg, #0f172a 0%, #0369a1 50%, #7dd3fc 100%)',
  minimal: 'linear-gradient(160deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
}

/** Effect slider values (integers). */
export interface WallpaperEffects {
  /** Blur radius in px, 0–24. */
  readonly blur: number
  /** Dim overlay opacity in percent, 0–70. */
  readonly dim: number
  /** Frost: percentage of the surface colour removed toward transparency, 0–100. */
  readonly frost: number
  /** Global atmosphere overlay opacity in percent, 0–100 (step 5); 0 = immersive only. */
  readonly atmosphere: number
}

/** Effect bounds and step used by the UI and the clamp helper. */
export const WALLPAPER_EFFECT_BOUNDS: Readonly<Record<keyof WallpaperEffects, { readonly min: number; readonly max: number; readonly step: number }>> = {
  blur: { min: 0, max: 24, step: 1 },
  dim: { min: 0, max: 70, step: 1 },
  frost: { min: 0, max: 100, step: 1 },
  atmosphere: { min: 0, max: 100, step: 5 },
}

/** Effects applied before any user change, and by the reset action. */
export const DEFAULT_WALLPAPER_EFFECTS: WallpaperEffects = { blur: 8, dim: 25, frost: 35, atmosphere: 30 }

/** The selected wallpaper, or `undefined` for "no wallpaper". */
export type WallpaperSelection =
  | { readonly kind: 'builtin'; readonly id: BuiltinWallpaperId }
  | { readonly kind: 'remote'; readonly url: string }
  | { readonly kind: 'upload'; readonly key: string }
  | undefined

/** Persisted schema version written by this client (v1 flat records migrate on read). */
export const WALLPAPER_STATE_SCHEMA_VERSION = 2

/** Focal-position coordinate in percent: only the nine-grid stops are persisted. */
export type WallpaperPositionValue = 0 | 50 | 100

/** Focal point of a remote/upload wallpaper; built-in designs stay centered. */
export interface WallpaperPosition {
  readonly x: WallpaperPositionValue
  readonly y: WallpaperPositionValue
}

/** Allowed focal-position values, in ascending order. */
export const WALLPAPER_POSITION_VALUES: readonly WallpaperPositionValue[] = [0, 50, 100]

/** Default focal point: centered (the only behaviour schema v1 could express). */
export const DEFAULT_WALLPAPER_POSITION: WallpaperPosition = { x: 50, y: 50 }

/** Stable id of one nine-grid option (also used by the UI `data-testid`s). */
export type WallpaperPositionId =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right'

/** The nine focal-position options in reading order (`x` grows right, `y` grows down). */
export const WALLPAPER_POSITION_OPTIONS: readonly {
  readonly id: WallpaperPositionId
  readonly x: WallpaperPositionValue
  readonly y: WallpaperPositionValue
}[] = [
  { id: 'top-left', x: 0, y: 0 },
  { id: 'top', x: 50, y: 0 },
  { id: 'top-right', x: 100, y: 0 },
  { id: 'left', x: 0, y: 50 },
  { id: 'center', x: 50, y: 50 },
  { id: 'right', x: 100, y: 50 },
  { id: 'bottom-left', x: 0, y: 100 },
  { id: 'bottom', x: 50, y: 100 },
  { id: 'bottom-right', x: 100, y: 100 },
]

/** Persisted shape (legacy schema v1, read-only migration input). */
export interface StoredWallpaper {
  readonly kind: 'builtin' | 'remote' | 'upload'
  readonly id?: string
  readonly url?: string
  readonly key?: string
  readonly blur: number
  readonly dim: number
  readonly frost: number
  readonly atmosphere: number
}

/** Clamp one numeric effect value into its bounds; NaN falls back to the default. */
function clampEffect(name: keyof WallpaperEffects, value: unknown): number {
  const bounds = WALLPAPER_EFFECT_BOUNDS[name]
  const fallback = DEFAULT_WALLPAPER_EFFECTS[name]
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  const stepped = Math.round(numeric / bounds.step) * bounds.step
  return Math.min(bounds.max, Math.max(bounds.min, stepped))
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
    atmosphere: clampEffect('atmosphere', record.atmosphere),
  }
}

/** Snap one untrusted coordinate to the nearest legal nine-grid stop. */
function snapPositionValue(value: unknown): WallpaperPositionValue {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 50
  let best: WallpaperPositionValue = 50
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of WALLPAPER_POSITION_VALUES) {
    const distance = Math.abs(value - candidate)
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }
  return best
}

/**
 * Normalize an untrusted focal position (storage/preset/UI) to the nine-grid stops.
 * Missing or malformed axes fall back to `50` so a corrupt record never hides the
 * wallpaper; values are snapped to the nearest of `0`, `50`, `100`.
 * @param input - partial/unknown position.
 * @returns a complete legal position.
 */
export function normalizeWallpaperPosition(input: unknown): WallpaperPosition {
  const record = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
  return { x: snapPositionValue(record.x), y: snapPositionValue(record.y) }
}

/**
 * Normalize an untrusted persisted revision to a non-negative integer.
 * @param value - stored/received revision.
 * @returns a safe monotonic counter value (0 when malformed).
 */
export function normalizeWallpaperRevision(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return 0
  return Math.floor(numeric)
}

/**
 * CSS `background-position` value for one selection + focal position.
 * Built-in designs and "no wallpaper" always stay centered; only remote and
 * uploaded images honour the nine-grid position.
 * @param selection - current wallpaper.
 * @param position - persisted focal position (defaults to centered).
 * @returns the CSS value, e.g. `'center'` or `'0% 100%'`.
 */
export function backgroundPositionValue(
  selection: WallpaperSelection,
  position: WallpaperPosition | undefined = DEFAULT_WALLPAPER_POSITION,
): string {
  if (selection === undefined || selection.kind === 'builtin') return 'center'
  const point = normalizeWallpaperPosition(position)
  return `${point.x}% ${point.y}%`
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
export function backgroundImageValue(selection: WallpaperSelection, overrideUrl?: string): string | undefined {
  if (selection === undefined) return undefined
  if (selection.kind === 'builtin') return BUILTIN_WALLPAPERS[selection.id]
  if (selection.kind === 'upload') return overrideUrl === undefined ? undefined : cssUrlValue(overrideUrl)
  // A locally cached (object URL) copy wins for online wallpapers; otherwise use
  // the persisted remote URL.
  return overrideUrl === undefined ? cssUrlValue(selection.url) : cssUrlValue(overrideUrl)
}

/**
 * Documented livery background tokens the frost effect makes translucent.
 * Only names present in the active livery's token map are emitted.
 *
 * Host floating/control surfaces are intentionally absent: Modal uses layer-2,
 * Tooltip uses tooltip-bg, Input uses layer-1, and overlay covers badges and
 * other compact controls. Making those translucent lets underlying page text
 * show through floating surfaces, which is never acceptable. This means all
 * host layer-2 surfaces (Modal, Settings, plugin manager, previews) stay opaque;
 * that is an accepted 0.1.3 product boundary. Plugin cards use the private
 * `--dsh-livery-card-surface` variable in cardSurfaceOverride().
 */
export const WALLPAPER_SURFACE_TOKENS: readonly string[] = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-document-preview',
  '--dsw-alias-bg-module-platform',
  '--dsw-alias-interactive-bg-hover-solid',
  '--dsw-alias-scrollbar-bg-l1',
  '--dsw-alias-scrollbar-bg-l2',
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
  /** Focal position of remote/upload images; built-in designs stay centered. */
  readonly position?: WallpaperPosition | undefined
  /** Present only when an active livery supplies background tokens. */
  readonly tokens?: WallpaperTokenContext | undefined
  /** Fresh object URL for an `upload` selection (validated local blob URL). */
  readonly uploadUrl?: string | undefined
  /** Local cached object URL for a remote selection (best-effort disk cache). */
  readonly imageOverride?: string | undefined
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
 * Expose the frosty card surface without changing the host's layer-2 token.
 * Host dialogs use --dsw-alias-bg-layer-2 directly; they stay opaque, while this
 * plugin-only variable lets Livery cards keep their glass-over-wallpaper look.
 */
function cardSurfaceOverride(selector: string, tokens: TokenMap, frost: number): string {
  const layer2 = tokens['--dsw-alias-bg-layer-2']
  if (typeof layer2 !== 'string' || layer2.length === 0) return ''
  const remaining = Math.max(0, Math.min(100, 100 - frost))
  return `${selector}{--dsh-livery-card-surface:color-mix(in srgb, ${layer2} ${remaining}%, transparent)}`
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
  const image = backgroundImageValue(input.selection, input.imageOverride ?? input.uploadUrl)
  if (image === undefined) return ''
  const { blur, dim, atmosphere } = input.effects
  const position = backgroundPositionValue(input.selection, input.position)
  const rules: string[] = [
    `body[${WALLPAPER_ATTRIBUTE}]::before{content:'';position:fixed;inset:-24px;z-index:-1;pointer-events:none;`
    + `background-image:${image};background-position:${position};background-size:cover;filter:blur(${blur}px)}`,
    `body[${WALLPAPER_ATTRIBUTE}]::after{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;`
    + `background:rgba(0,0,0,${(dim / 100).toFixed(2)})}`,
    // Let the under-content immersive layer show through the host's body canvas.
    `body[${WALLPAPER_ATTRIBUTE}]{background-color:transparent}`,
  ]
  // Optional page tint for surfaces whose background can show it: a
  // non-interactive atmospheric copy above normal page content but below every
  // host floating layer. It is not a visual-coverage guarantee on opaque pages.
  if (atmosphere > 0) {
    // Keep the atmosphere below host-owned floating layers: plain Menu,
    // Tooltip and HoverCard use 100/101, Modal uses 1000 and Toast 1100. This
    // keeps floating surfaces readable and un-tinted by the wallpaper.
    rules.push(`.${WALLPAPER_OVERLAY_CLASS}{position:fixed;inset:0;z-index:90;pointer-events:none;`
      + `background-image:${image};background-size:cover;background-position:${position};filter:blur(${blur}px);`
      + `opacity:${(atmosphere / 100).toFixed(2)};mix-blend-mode:soft-light}`)
  }
  // OS accessibility modes: never paint the wallpaper over the app. The glass
  // effects are decorative and can hide or tint content in forced-colors mode.
  const decorativeSelectors = `body[${WALLPAPER_ATTRIBUTE}]::before,body[${WALLPAPER_ATTRIBUTE}]::after`
    + (atmosphere > 0 ? `,.${WALLPAPER_OVERLAY_CLASS}` : '')
  rules.push(
    `@media (forced-colors: active){${decorativeSelectors}{display:none}`
    + `body[${WALLPAPER_ATTRIBUTE}]{background-color:revert}}`,
  )
  rules.push(
    `@media (prefers-reduced-transparency: reduce){${decorativeSelectors}{display:none}`
    + `body[${WALLPAPER_ATTRIBUTE}]{background-color:revert}}`,
  )
  const tokens = input.tokens
  if (tokens !== undefined) {
    const lightSelector = `body[data-dsh-livery][${WALLPAPER_ATTRIBUTE}]`
    const darkSelector = `body[data-dsh-livery][${WALLPAPER_ATTRIBUTE}][data-ds-dark-theme]`
    const glass: string[] = []
    const light = tokenOverrides(lightSelector, tokens.light, tokens.frost)
    if (light.length > 0) glass.push(light)
    const lightCard = cardSurfaceOverride(lightSelector, tokens.light, tokens.frost)
    if (lightCard.length > 0) glass.push(lightCard)
    const dark = tokenOverrides(darkSelector, tokens.dark, tokens.frost)
    if (dark.length > 0) glass.push(dark)
    const darkCard = cardSurfaceOverride(darkSelector, tokens.dark, tokens.frost)
    if (darkCard.length > 0) glass.push(darkCard)
    // High-contrast and reduced-transparency users get the original opaque
    // host surfaces: no translucency, no private card surface, no blur rules.
    if (glass.length > 0) {
      rules.push(`@media (prefers-reduced-transparency: no-preference) and (forced-colors: none){${glass.join('\n')}}`)
    }
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

/** Persisted selection in schema v2: only the kind-relevant identifier. */
export type StoredWallpaperSelection =
  | { readonly kind: 'builtin'; readonly id: BuiltinWallpaperId }
  | { readonly kind: 'remote'; readonly url: string }
  | { readonly kind: 'upload'; readonly key: string }
  /** Tombstone written by an intentional clear so other tabs can sync it. */
  | { readonly kind: 'none' }

/** Persisted shape (schema v2): revisioned selection + effects + focal position. */
export interface StoredWallpaperState {
  readonly schemaVersion: 2
  readonly revision: number
  readonly selection: StoredWallpaperSelection
  readonly effects: WallpaperEffects
  readonly position: WallpaperPosition
}

/** Hydrated controller state from storage (schema v2 or a migrated v1 record). */
export interface HydratedWallpaperState {
  readonly revision: number
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
  readonly position: WallpaperPosition
}

/**
 * Validate one stored selection object (shared by schema v1 migration and v2 reads).
 * @param raw - unknown `selection`/flat v1 record fields.
 * @returns the validated selection, or undefined.
 */
function parseStoredSelection(raw: unknown): WallpaperSelection {
  if (typeof raw !== 'object' || raw === null) return undefined
  const record = raw as Record<string, unknown>
  if (record.kind === 'builtin') {
    if (!isBuiltinWallpaperId(record.id)) return undefined
    return { kind: 'builtin', id: record.id }
  }
  if (record.kind === 'remote') {
    if (typeof record.url !== 'string') return undefined
    const check = validateWallpaperUrl(record.url)
    if (!check.ok) return undefined
    return { kind: 'remote', url: check.url }
  }
  if (record.kind === 'upload') {
    if (typeof record.key !== 'string' || !/^upload-[A-Za-z0-9-]{1,64}$/.test(record.key)) return undefined
    return { kind: 'upload', key: record.key }
  }
  return undefined
}

/** Map one live selection to its persisted (schema v2) form. */
function toStoredSelection(selection: WallpaperSelection): StoredWallpaperSelection | undefined {
  if (selection === undefined) return undefined
  if (selection.kind === 'builtin') return { kind: 'builtin', id: selection.id }
  if (selection.kind === 'upload') return { kind: 'upload', key: selection.key }
  return { kind: 'remote', url: selection.url }
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
  if (selection.kind === 'upload') {
    return { kind: 'upload', key: selection.key, ...clamped }
  }
  return { kind: 'remote', url: selection.url, ...clamped }
}

/** Hydrated controller state from a legacy v1 record. */
export interface HydratedWallpaper {
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
}

/**
 * Parse one persisted legacy (schema v1) wallpaper record.
 * Kept for v1 migration and compatibility; new writes use
 * {@link serializeWallpaperState} (schema v2).
 * @param raw - `JSON.parse`d value from localStorage.
 * @returns the hydrated selection/effects, or undefined when invalid.
 */
export function parseStoredWallpaper(raw: unknown): HydratedWallpaper | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const selection = parseStoredSelection(raw)
  if (selection === undefined) return undefined
  return { selection, effects: clampEffects(raw as Record<string, unknown>) }
}

/**
 * Serialize one selection + effects (legacy schema v1 shape).
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

/**
 * Parse one persisted wallpaper record, accepting schema v2 and migrating the
 * legacy v1 flat record losslessly (v1 had no position: 50/50, no revision: 0).
 *
 * Corrupt records and unknown schema versions are ignored (`undefined`); callers
 * must never clear the live wallpaper because a stored record failed to parse.
 * @param raw - `JSON.parse`d value from localStorage or a preset/sync payload.
 * @returns the hydrated revision/selection/effects/position, or undefined.
 */
export function parseWallpaperState(raw: unknown): HydratedWallpaperState | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const record = raw as Record<string, unknown>
  const version = record.schemaVersion
  if (version === WALLPAPER_STATE_SCHEMA_VERSION) {
    const storedSelection = record.selection
    const isClear = storedSelection === null
      || (typeof storedSelection === 'object' && storedSelection !== null
        && (storedSelection as Record<string, unknown>).kind === 'none')
    const selection = isClear ? undefined : parseStoredSelection(storedSelection)
    if (!isClear && selection === undefined) return undefined
    return {
      revision: normalizeWallpaperRevision(record.revision),
      selection,
      effects: clampEffects(record.effects),
      position: normalizeWallpaperPosition(record.position),
    }
  }
  // Schema v1 persisted a flat record without a version field (accept an
  // explicit `1` too, in case an early migration wrote one).
  if (version === undefined || version === 1) {
    const legacy = parseStoredWallpaper(record)
    if (legacy === undefined) return undefined
    return {
      revision: 0,
      selection: legacy.selection,
      effects: legacy.effects,
      position: { ...DEFAULT_WALLPAPER_POSITION },
    }
  }
  return undefined
}

/**
 * Serialize one wallpaper state as the persisted schema v2 record.
 * @param selection - current wallpaper (undefined removes the stored record).
 * @param effects - current effect values (clamped).
 * @param position - current focal position (normalized to the nine-grid stops).
 * @param revision - monotonic state revision (0 when omitted).
 * @returns the JSON record to store; a cleared selection is a revisioned tombstone.
 */
export function serializeWallpaperState(
  selection: WallpaperSelection,
  effects: WallpaperEffects,
  position: WallpaperPosition | undefined = DEFAULT_WALLPAPER_POSITION,
  revision = 0,
): StoredWallpaperState {
  return {
    schemaVersion: WALLPAPER_STATE_SCHEMA_VERSION,
    revision: normalizeWallpaperRevision(revision),
    selection: selection === undefined ? { kind: 'none' } : toStoredSelection(selection)!,
    effects: clampEffects(effects),
    position: normalizeWallpaperPosition(position),
  }
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
export function parseOpenverseResults(json: unknown, limit = 12): readonly WallpaperRemoteResult[] {
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
    if (mapped.length === Math.max(1, limit)) break
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
