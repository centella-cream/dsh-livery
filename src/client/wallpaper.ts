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
import { isAllowedDirectImage, isLocalOrPrivateHost } from './wallpaper/host-safety.js'
import { isStyleWallpaperVariant, styleWallpaperImage } from './wallpaper/style.js'
import type { StyleWallpaperVariant } from './wallpaper/style.js'

export type { StyleWallpaperVariant } from './wallpaper/style.js'

/** localStorage key holding the persisted wallpaper selection + effects. */
export const WALLPAPER_STORAGE_KEY = 'dsh-livery.wallpaper.v1'
/**
 * Sidecar localStorage key holding a `kind: 'style'` selection (unknown to
 * 0.2.1 clients, which therefore never reject or delete it). The main record
 * stays the only ordering signal; the sidecar is adopted only when its identity
 * exactly matches the current main record.
 */
export const WALLPAPER_STYLE_STORAGE_KEY = 'dsh-livery.wallpaper.style.v1'
/** Style sidecar schema version written by this client. */
export const WALLPAPER_STYLE_SCHEMA_VERSION = 1

/**
 * Identity of one main-record write: its monotonic revision plus the per-tab
 * source id (absent when the record was written before/without tab identity).
 */
export interface WallpaperStateIdentity {
  readonly revision: number
  readonly sourceId?: string | undefined
}

/** Persisted shape of the style sidecar (`WALLPAPER_STYLE_STORAGE_KEY`). */
export interface StoredWallpaperStyle {
  readonly schemaVersion: 1
  readonly variant: StyleWallpaperVariant
  /** Revision of the main-record tombstone this style belongs to. */
  readonly revision: number
  /** Source id of the main-record write (empty string when none was known). */
  readonly sourceId: string
}
/** `data-plugin-css` marker of the plugin-owned wallpaper stylesheet. */
export const WALLPAPER_CSS_FILE = 'dsh-livery/wallpaper'
/** Public body attribute owning the wallpaper layer (only Livery writes it). */
export const WALLPAPER_ATTRIBUTE = 'data-dsh-wallpaper'
/** Id + class of the plugin-owned atmosphere overlay element above app content. */
export const WALLPAPER_OVERLAY_ID = 'dsh-livery-wallpaper-overlay'
export const WALLPAPER_OVERLAY_CLASS = 'dsh-livery-wallpaper-overlay'
/** Id + class of the direct-provider image layer (0.2.3). */
export const WALLPAPER_DIRECT_ID = 'dsh-livery-wallpaper-direct'
export const WALLPAPER_DIRECT_CLASS = 'dsh-livery-wallpaper-direct'

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

/**
 * The 8 curated built-ins shown in the wallpaper panel, in display order
 * (0.2.2). Chosen from the existing 24 ids: four light, four dark. The other 16
 * remain loadable as **Classic** with byte-identical ids and CSS — no id is
 * remapped or removed.
 */
export const VISIBLE_BUILTIN_IDS = [
  'paper', 'ink', 'aurora', 'cyber', 'dusk', 'minimal', 'mono', 'sand',
] as const

/** A curated built-in id rendered in the main 8-swatch grid. */
export type VisibleBuiltinWallpaperId = typeof VISIBLE_BUILTIN_IDS[number]

/** A bundled built-in id rendered inside the collapsed Classic group. */
export type ClassicBuiltinWallpaperId = Exclude<BuiltinWallpaperId, VisibleBuiltinWallpaperId>

/** Fast membership test backing {@link isVisibleBuiltinId}. */
const VISIBLE_BUILTIN_ID_SET: ReadonlySet<string> = new Set(VISIBLE_BUILTIN_IDS)

/**
 * The remaining 16 built-ins in catalog order. Every id in
 * {@link BUILTIN_WALLPAPER_IDS} belongs to exactly one of the visible set or
 * this list, and both sets keep the original ordering.
 */
export const CLASSIC_BUILTIN_IDS: readonly ClassicBuiltinWallpaperId[] = Object.freeze(
  BUILTIN_WALLPAPER_IDS.filter((id): id is ClassicBuiltinWallpaperId => !VISIBLE_BUILTIN_ID_SET.has(id)),
)

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

/**
 * Display attribution carried by one remote wallpaper selection (plan §4.6).
 *
 * This is the authoritative credit for the current image: recent history is only
 * a display mirror. Text fields are plain display text (no HTML/CSS sanitizing
 * beyond control characters); the URL fields are https public-host URLs and are
 * the only clickable parts.
 */
export interface WallpaperProvenance {
  readonly providerId?: string
  readonly title?: string
  readonly creator?: string
  readonly creatorUrl?: string
  /** Human-readable licence name, never a provider brand. */
  readonly license?: string
  readonly licenseUrl?: string
  readonly source?: string
  readonly sourceUrl?: string
}

/** Maximum accepted provenance text length per field (display text only). */
const PROVENANCE_TEXT_LIMITS: Readonly<Record<string, number>> = {
  providerId: 64,
  title: 200,
  creator: 120,
  license: 120,
  source: 200,
}

/** Provenance fields holding a https link (validated as portable URLs). */
const PROVENANCE_URL_FIELDS = ['creatorUrl', 'licenseUrl', 'sourceUrl'] as const

/** Control characters never belong in stored/displayed attribution text. */
const PROVENANCE_CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

/** Normalize one provenance text field (trim, cap, drop control characters). */
function provenanceText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > maxLength) return undefined
  if (PROVENANCE_CONTROL_CHARACTERS.test(trimmed)) return undefined
  return trimmed
}

/**
 * Normalize one provenance URL: https, bounded length, no credentials, public
 * host. Invalid URLs are dropped (never fail the whole selection).
 * @param value - untrusted URL field.
 * @returns the normalized URL, or undefined.
 */
export function normalizeWallpaperProvenanceUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const check = validateWallpaperUrl(value)
  if (!check.ok) return undefined
  try {
    if (isLocalOrPrivateHost(new URL(check.url).hostname)) return undefined
  } catch {
    return undefined
  }
  return check.url
}

/**
 * Normalize an untrusted provenance record: keep only the known fields, trim and
 * bound text, and drop invalid/private/over-long URLs. Returns undefined when no
 * usable field remains.
 * @param raw - untrusted provenance (storage/preset/UI).
 * @returns the sanitized provenance, or undefined.
 */
export function normalizeWallpaperProvenance(raw: unknown): WallpaperProvenance | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const record = raw as Record<string, unknown>
  const output: Record<string, string> = {}
  for (const [field, limit] of Object.entries(PROVENANCE_TEXT_LIMITS)) {
    const value = provenanceText(record[field], limit)
    if (value !== undefined) output[field] = value
  }
  for (const field of PROVENANCE_URL_FIELDS) {
    const value = normalizeWallpaperProvenanceUrl(record[field])
    if (value !== undefined) output[field] = value
  }
  return Object.keys(output).length === 0 ? undefined : output as WallpaperProvenance
}

/**
 * Structural equality for normalized provenance records (undefined = empty).
 * @param a - one provenance record.
 * @param b - the other provenance record.
 * @returns true when every known field matches.
 */
export function sameWallpaperProvenance(
  a: WallpaperProvenance | undefined,
  b: WallpaperProvenance | undefined,
): boolean {
  if (a === undefined || b === undefined) return a === b
  for (const field of [...Object.keys(PROVENANCE_TEXT_LIMITS), ...PROVENANCE_URL_FIELDS] as (keyof WallpaperProvenance)[]) {
    if ((a[field] ?? '') !== (b[field] ?? '')) return false
  }
  return true
}

/**
 * The authoritative attribution of one selection: the remote selection's
 * provenance (built-in/upload/style wallpapers carry none). The panel resolves
 * the current credit from here instead of from history.
 * @param selection - current wallpaper.
 * @returns its provenance, or undefined.
 */
export function provenanceOfSelection(selection: WallpaperSelection): WallpaperProvenance | undefined {
  return selection !== undefined && selection.kind === 'remote' ? selection.provenance : undefined
}

/**
 * Normalize one in-memory selection before it enters controller state: only a
 * remote selection can carry (sanitized) provenance; everything else is passed
 * through unchanged.
 * @param selection - untrusted selection built by UI/preset/storage code.
 * @returns the normalized selection.
 */
export function normalizeWallpaperSelection(selection: WallpaperSelection): WallpaperSelection {
  if (selection === undefined) return undefined
  if (selection.kind === 'style') {
    // Defence in depth for untrusted UI/preset construction: an unknown variant
    // would be rejected by the sidecar parser on the next reload.
    return isStyleWallpaperVariant(selection.variant) ? selection : undefined
  }
  if (selection.kind !== 'remote') return selection
  const provenance = normalizeWallpaperProvenance(selection.provenance)
  const thumbnail = typeof selection.thumbnail === 'string'
    ? validateWallpaperUrl(selection.thumbnail)
    : undefined
  const normalizedThumb = thumbnail?.ok === true ? thumbnail.url : undefined
  return {
    kind: 'remote',
    url: selection.url,
    ...(provenance === undefined ? {} : { provenance }),
    ...(selection.delivery === 'direct' ? { delivery: 'direct' as const } : {}),
    ...(normalizedThumb === undefined ? {} : { thumbnail: normalizedThumb }),
  }
}

/** The selected wallpaper, or `undefined` for "no wallpaper". */
export type WallpaperSelection =
  | { readonly kind: 'builtin'; readonly id: BuiltinWallpaperId }
  | {
    readonly kind: 'remote'
    readonly url: string
    readonly provenance?: WallpaperProvenance
    /** Direct providers are browser-loaded and never enter the Blob cache. */
    readonly delivery?: 'direct'
    /** Provider thumbnail used by the hero; never the full direct image. */
    readonly thumbnail?: string
  }
  | { readonly kind: 'upload'; readonly key: string }
  /** Generated "follow style" layer; persisted only in the style sidecar. */
  | { readonly kind: 'style'; readonly variant: StyleWallpaperVariant }
  | undefined

/** Persisted schema version written by this client (v1 flat records migrate on read). */
export const WALLPAPER_STATE_SCHEMA_VERSION = 2
/** Direct-only schema version: cached/builtin/upload selections stay on v2. */
export const DIRECT_WALLPAPER_STATE_SCHEMA_VERSION = 3

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
 * Built-in designs, the generated style layer and "no wallpaper" always stay
 * centered; only remote and uploaded images honour the nine-grid position.
 * @param selection - current wallpaper.
 * @param position - persisted focal position (defaults to centered).
 * @returns the CSS value, e.g. `'center'` or `'0% 100%'`.
 */
export function backgroundPositionValue(
  selection: WallpaperSelection,
  position: WallpaperPosition | undefined = DEFAULT_WALLPAPER_POSITION,
): string {
  if (!canRepositionWallpaper(selection)) return 'center'
  const point = normalizeWallpaperPosition(position)
  return `${point.x}% ${point.y}%`
}

/**
 * Whether the nine-grid focal position applies to one selection. Only real
 * images (remote/upload) can be repositioned: built-ins and the generated style
 * layer are fixed recipes, and "no wallpaper" has no focal point.
 * @param selection - current wallpaper.
 * @returns true for remote/upload selections.
 */
export function canRepositionWallpaper(selection: WallpaperSelection): boolean {
  return selection !== undefined && (selection.kind === 'remote' || selection.kind === 'upload')
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
 * Whether a value is one of the 8 curated built-ins shown in the main grid.
 * @param value - untrusted value.
 * @returns true for a {@link VISIBLE_BUILTIN_IDS} member.
 */
export function isVisibleBuiltinId(value: unknown): value is VisibleBuiltinWallpaperId {
  return typeof value === 'string' && VISIBLE_BUILTIN_ID_SET.has(value)
}

/**
 * Whether a value is one of the 16 Classic built-ins in the collapsed group.
 * @param value - untrusted value.
 * @returns true for a {@link CLASSIC_BUILTIN_IDS} member.
 */
export function isClassicBuiltinId(value: unknown): value is ClassicBuiltinWallpaperId {
  return typeof value === 'string' && !VISIBLE_BUILTIN_ID_SET.has(value) && isBuiltinWallpaperId(value)
}

/**
 * Pinned-legacy rule: the id that must be rendered as a pinned "Current
 * (Classic)" swatch above the 8-swatch grid. Only the *currently selected*
 * built-in outside {@link VISIBLE_BUILTIN_IDS} pins; a merely previewed preset
 * does not (it never becomes the selection).
 * @param selection - current wallpaper selection.
 * @returns the pinned Classic id, or undefined.
 */
export function pinnedClassicBuiltinId(selection: WallpaperSelection): ClassicBuiltinWallpaperId | undefined {
  if (selection === undefined || selection.kind !== 'builtin') return undefined
  return isClassicBuiltinId(selection.id) ? selection.id : undefined
}

/** Gallery groups the Built-in panel renders (the pinned id is excluded twice). */
export interface BuiltinGalleryVisibility {
  /** Classic id pinned above the grid, or undefined when none is selected. */
  readonly pinnedClassic: ClassicBuiltinWallpaperId | undefined
  /** The 8 curated swatches, in display order. */
  readonly visible: readonly VisibleBuiltinWallpaperId[]
  /** The 16 Classic ids in catalog order, minus a pinned id (never duplicated). */
  readonly classic: readonly ClassicBuiltinWallpaperId[]
}

/**
 * Pure pinned-legacy display decision for the Built-in panel: which swatch (if
 * any) is pinned, and the exact visible/Classic groups with no duplicated
 * `data-wallpaper-id`.
 * @param selection - current wallpaper selection.
 * @returns the pinned id and the two groups (never duplicates an id).
 */
export function builtinGalleryVisibility(selection: WallpaperSelection): BuiltinGalleryVisibility {
  const pinnedClassic = pinnedClassicBuiltinId(selection)
  return {
    pinnedClassic,
    visible: [...VISIBLE_BUILTIN_IDS],
    classic: pinnedClassic === undefined
      ? [...CLASSIC_BUILTIN_IDS]
      : CLASSIC_BUILTIN_IDS.filter(id => id !== pinnedClassic),
  }
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
 *
 * The generated `style` selection is intentionally NOT expressible here: its
 * image depends on the active livery's mode-specific tokens, so
 * {@link buildWallpaperCss} emits it per light/dark and the controller's
 * `getRenderImage(mode)` resolves it for the UI preview.
 * @param selection - selected wallpaper.
 * @returns the CSS value, or undefined for "no wallpaper", style, or a remote/
 * upload selection without a verified local object URL.
 */
export function backgroundImageValue(selection: WallpaperSelection, overrideUrl?: string): string | undefined {
  if (selection === undefined) return undefined
  if (selection.kind === 'builtin') return BUILTIN_WALLPAPERS[selection.id]
  if (selection.kind === 'style') return undefined
  if (selection.kind === 'upload') return overrideUrl === undefined ? undefined : cssUrlValue(overrideUrl)
  // Remote wallpapers are rendered ONLY from the verified local cache object URL.
  // Never put the raw remote URL in CSS: that would bypass the download's
  // credentials:omit/timeout/15 MiB/content-type checks and could issue a
  // same-origin credentialed image request.
  return overrideUrl === undefined ? undefined : cssUrlValue(overrideUrl)
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

/**
 * Host token the macOS AppFrame paints above the sidebar fill. The host authors
 * it as 40% (light) / 50% (dark) of `--dsw-specific-sidebar-fill`; frost already
 * makes that fill translucent, so the ramp must not stack a second multiplier.
 */
export const WALLPAPER_SIDEBAR_TINT_TOKEN = '--dsw-specific-sidebar-tint' as const
export const WALLPAPER_SIDEBAR_FILL_TOKEN = '--dsw-specific-sidebar-fill' as const

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
  /**
   * Renderer for the image pixels. `body` keeps the 0.2.2 body pseudo-element;
   * `direct` emits frost/dim/accessibility only and leaves the image to the
   * plugin-owned `<img>` layer. Raw remote URLs never enter body CSS.
   */
  readonly imageLayer?: 'body' | 'direct' | undefined
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

function sidebarFillOverride(selector: string, tokens: TokenMap, frost: number, mode: 'light' | 'dark'): string {
  const fill = tokens[WALLPAPER_SIDEBAR_FILL_TOKEN]
  if (typeof fill !== 'string' || fill.length === 0) return ''
  const remaining = Math.max(0, Math.min(100, 100 - frost))
  // macOS ordinary sidebars multiply the fill by the host wash (40/50%). Web,
  // Windows and the macOS drawer paint the fill directly. Match the *effective*
  // alpha on the direct paths so the same style does not look opaque on Web and
  // translucent on Desktop.
  const hostFill = Math.min(94, remaining + 20)
  const directFill = Math.max(0, Math.min(100, hostFill * (mode === 'light' ? 0.4 : 0.5)))
  return `${selector}{${WALLPAPER_SIDEBAR_FILL_TOKEN}:color-mix(in srgb, ${fill} ${directFill}%, transparent)}` +
    `html[data-platform="darwin"] ${selector}{${WALLPAPER_SIDEBAR_FILL_TOKEN}:color-mix(in srgb, ${fill} ${hostFill}%, transparent)}`
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
 * Match the macOS sidebar's composed surface to the main column's frost ratio.
 *
 * On macOS the ordinary sidebar is not painted with
 * `--dsw-specific-sidebar-fill` directly: the AppFrame paints a wash gradient
 * over `--dsw-specific-sidebar-tint`, whose stock recipe is 40% of the fill in
 * light mode and 50% in dark mode. Frost already rewrites the fill to
 * `remaining%`, so the host multiplies again and the sidebar lands at
 * `40–50% × remaining%` (default: 26–33%) while the main column stays at
 * `remaining%` (default: 65%). Over a light wallpaper that reads as a washed-out
 * left rail with white labels on a pale surface.
 *
 * Author the host's tint recipe directly at `remaining%` instead. This stays
 * token-only (no host class selectors), keeps the host's light-mode blue cast,
 * and leaves non-macOS hosts on the fill override, where no second multiplier
 * exists. The main column keeps its own fill: the two surfaces stay deliberately
 * distinct in colour while sharing one transparency ratio.
 * @param selector - body-qualified selector.
 * @param tokens - compiled livery token map for one mode.
 * @param frost - frost percentage (0…100).
 * @param mode - `light` keeps the host's 97/3 blue cast; `dark` uses the fill.
 * @returns the tint override rule, or '' when the mode has no sidebar fill.
 */
function sidebarTintOverride(
  selector: string,
  tokens: TokenMap,
  frost: number,
  mode: 'light' | 'dark',
): string {
  const fill = tokens['--dsw-specific-sidebar-fill']
  if (typeof fill !== 'string' || fill.length === 0) return ''
  const remaining = Math.max(0, Math.min(100, 100 - frost))
  const base = mode === 'light' ? `color-mix(in srgb, ${fill} 97%, #7a9bf0)` : fill
  return `${selector}{${WALLPAPER_SIDEBAR_TINT_TOKEN}:color-mix(in srgb, ${base} ${remaining}%, transparent)}`
}

/**
 * Build the complete plugin-owned wallpaper stylesheet.
 *
 * Layer: two fixed pseudo-elements on `body[data-dsh-wallpaper]` (image + dim
 * veil), both behind content and non-interactive. Frost: translucent overrides
 * of the active livery's background tokens, scoped to the livery and the
 * wallpaper attributes, with a dark-scheme variant.
 *
 * A `style` selection has no URL: its image is generated from the active
 * livery's light/dark token maps, so it is emitted once per mode (light as the
 * base rule, dark as an attribute override) for both the body layer and the
 * atmosphere layer. Without a token context a style selection paints nothing.
 * @param input - selection, effects and optional livery token maps.
 * @returns the stylesheet text ('' clears the layer).
 */
export function buildWallpaperCss(input: WallpaperCssInput): string {
  const styleSelection = input.selection !== undefined && input.selection.kind === 'style'
    ? input.selection
    : undefined
  // Per-mode generated image; undefined when the livery has no token map (a
  // style selection then hydrates as "no wallpaper", never an empty layer).
  const styleLight = styleSelection === undefined || input.tokens === undefined
    ? undefined
    : styleWallpaperImage(input.tokens.light, styleSelection.variant)
  const styleDark = styleSelection === undefined || input.tokens === undefined
    ? undefined
    : styleWallpaperImage(input.tokens.dark, styleSelection.variant)
  if (styleSelection !== undefined && (styleLight === undefined || styleDark === undefined)) return ''
  const direct = input.imageLayer === 'direct'
  const image = direct
    ? undefined
    : styleSelection === undefined
      ? backgroundImageValue(input.selection, input.imageOverride ?? input.uploadUrl)
      : styleLight
  if (!direct && image === undefined) return ''
  const darkImage = styleDark !== undefined && styleDark !== image ? styleDark : undefined
  const { blur, dim, atmosphere } = input.effects
  const position = backgroundPositionValue(input.selection, input.position)
  const rules: string[] = direct
    ? [
      `body[${WALLPAPER_ATTRIBUTE}] #${WALLPAPER_DIRECT_ID}{position:fixed;inset:-24px;z-index:-1;pointer-events:none;overflow:hidden}`,
      `body[${WALLPAPER_ATTRIBUTE}] #${WALLPAPER_DIRECT_ID} img{display:block;width:100%;height:100%;object-fit:cover;object-position:${position};filter:blur(${blur}px)}`,
    ]
    : [
      `body[${WALLPAPER_ATTRIBUTE}]::before{content:'';position:fixed;inset:-24px;z-index:-1;pointer-events:none;`
      + `background-image:${image};background-position:${position};background-size:cover;filter:blur(${blur}px)}`,
    ]
  // Generated style image for dark mode: same layer recipe, dark token map.
  if (darkImage !== undefined) {
    rules.push(`body[${WALLPAPER_ATTRIBUTE}][data-ds-dark-theme]::before{background-image:${darkImage}}`)
  }
  rules.push(
    `body[${WALLPAPER_ATTRIBUTE}]::after{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;`
    + `background:rgba(0,0,0,${(dim / 100).toFixed(2)})}`,
    // Let the under-content immersive layer show through the host's body canvas.
    `body[${WALLPAPER_ATTRIBUTE}]{background-color:transparent}`,
  )
  // Stock style + wallpaper: Livery owns no livery tokens there, so the host
  // MenuSurface material would stay translucent over the wallpaper. Pin the
  // same surface/fill tokens to the opaque stock layer ladder while a wallpaper
  // is active (the Livery-style branch below owns its own values).
  if (input.tokens === undefined) {
    rules.push(
      `body[${WALLPAPER_ATTRIBUTE}]:not([data-dsh-livery]){`
      + '--dsw-menu-surface-fill:var(--dsw-alias-bg-layer-1);'
      + '--dsw-specific-menu:var(--dsw-alias-bg-layer-1);'
      + '--dsw-alias-fill-l1:var(--dsw-alias-bg-layer-1);'
      + '--dsw-alias-fill-l2:var(--dsw-alias-bg-layer-2)}',
    )
  }
  // Optional page tint for surfaces whose background can show it: a
  // non-interactive atmospheric copy above normal page content but below every
  // host floating layer. It is not a visual-coverage guarantee on opaque pages.
  if (!direct && atmosphere > 0) {
    // Keep the atmosphere below host-owned floating layers: plain Menu,
    // Tooltip and HoverCard use 100/101, Modal uses 1000 and Toast 1100. This
    // keeps floating surfaces readable and un-tinted by the wallpaper.
    rules.push(`.${WALLPAPER_OVERLAY_CLASS}{position:fixed;inset:0;z-index:90;pointer-events:none;`
      + `background-image:${image};background-size:cover;background-position:${position};filter:blur(${blur}px);`
      + `opacity:${(atmosphere / 100).toFixed(2)};mix-blend-mode:soft-light}`)
    if (darkImage !== undefined) {
      rules.push(`body[data-ds-dark-theme] .${WALLPAPER_OVERLAY_CLASS}{background-image:${darkImage}}`)
    }
  }
  // OS accessibility modes: never paint the wallpaper over the app. The glass
  // effects are decorative and can hide or tint content in forced-colors mode.
  const decorativeSelectors = direct
    ? `body[${WALLPAPER_ATTRIBUTE}]::after,#${WALLPAPER_DIRECT_ID}`
    : `body[${WALLPAPER_ATTRIBUTE}]::before,body[${WALLPAPER_ATTRIBUTE}]::after`
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
    const light = tokenOverrides(lightSelector, tokens.light, tokens.frost) + sidebarFillOverride(lightSelector, tokens.light, tokens.frost, 'light')
    if (light.length > 0) glass.push(light)
    const lightTint = sidebarTintOverride(lightSelector, tokens.light, tokens.frost, 'light')
    if (lightTint.length > 0) glass.push(lightTint)
    const lightCard = cardSurfaceOverride(lightSelector, tokens.light, tokens.frost)
    if (lightCard.length > 0) glass.push(lightCard)
    const dark = tokenOverrides(darkSelector, tokens.dark, tokens.frost) + sidebarFillOverride(darkSelector, tokens.dark, tokens.frost, 'dark')
    if (dark.length > 0) glass.push(dark)
    const darkTint = sidebarTintOverride(darkSelector, tokens.dark, tokens.frost, 'dark')
    if (darkTint.length > 0) glass.push(darkTint)
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

/**
 * Persisted selection in schema v2: only the kind-relevant identifier.
 *
 * 0.2.1-readable: the kinds and the wire shape are unchanged. The single
 * additive member is optional `remote.provenance` (0.2.1 ignores unknown members
 * and drops it on its next write). `style` is NEVER part of this record — it
 * lives in the `WALLPAPER_STYLE_STORAGE_KEY` sidecar so a 0.2.1 client cannot
 * reject or overwrite it.
 */
export type StoredWallpaperSelection =
  | { readonly kind: 'builtin'; readonly id: BuiltinWallpaperId }
  | { readonly kind: 'remote'; readonly url: string; readonly provenance?: WallpaperProvenance }
  | { readonly kind: 'upload'; readonly key: string }
  /** Tombstone written by an intentional clear (also the style main record). */
  | { readonly kind: 'none' }

/** Persisted shape (schema v2): revisioned selection + effects + focal position. */
export interface StoredWallpaperState {
  readonly schemaVersion: 2
  readonly revision: number
  readonly selection: StoredWallpaperSelection
  readonly effects: WallpaperEffects
  readonly position: WallpaperPosition
}

/** One direct remote selection in the schema-v3-only record. */
export interface StoredDirectSelection {
  readonly kind: 'remote'
  readonly url: string
  readonly delivery: 'direct'
  readonly thumbnail?: string
  readonly provenance?: WallpaperProvenance
}

/** Persisted shape (schema v3, direct-only): no Blob/object URL is involved. */
export interface StoredDirectWallpaperState {
  readonly schemaVersion: 3
  readonly revision: number
  readonly selection: StoredDirectSelection
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
 * The additive `remote.provenance` member is parsed and normalized; `style` is
 * never valid in the main record (it lives in the sidecar).
 * @param raw - unknown `selection`/flat v1 record fields.
 * @returns the validated selection, or undefined.
 */
function parseStoredSelection(raw: unknown, allowDirect = false): WallpaperSelection {
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
    const delivery = allowDirect && record.delivery === 'direct' ? 'direct' as const : undefined
    if (record.delivery !== undefined && record.delivery !== 'direct') return undefined
    const thumbnail = delivery === undefined || typeof record.thumbnail !== 'string'
      ? undefined
      : validateWallpaperUrl(record.thumbnail)
    const normalizedThumb = thumbnail?.ok === true ? thumbnail.url : undefined
    const provenance = normalizeWallpaperProvenance(record.provenance)
    if (delivery === 'direct' && !isAllowedDirectImage(provenance?.providerId, check.url, normalizedThumb)) return undefined
    return {
      kind: 'remote',
      url: check.url,
      ...(provenance === undefined ? {} : { provenance }),
      ...(delivery === undefined ? {} : { delivery }),
      ...(normalizedThumb === undefined ? {} : { thumbnail: normalizedThumb }),
    }
  }
  if (record.kind === 'upload') {
    if (typeof record.key !== 'string' || !/^upload-[A-Za-z0-9-]{1,64}$/.test(record.key)) return undefined
    return { kind: 'upload', key: record.key }
  }
  return undefined
}

/** Map one live selection to its persisted (schema v2) form. */
function toStoredSelection(selection: WallpaperSelection): StoredWallpaperSelection | undefined {
  if (selection === undefined || selection.kind === 'style') return undefined
  if (selection.kind === 'builtin') return { kind: 'builtin', id: selection.id }
  if (selection.kind === 'upload') return { kind: 'upload', key: selection.key }
  const provenance = normalizeWallpaperProvenance(selection.provenance)
  return {
    kind: 'remote',
    url: selection.url,
    ...(provenance === undefined ? {} : { provenance }),
  }
}

/**
 * Persistable record for one selection + effects, or undefined when cleared.
 * The legacy v1 shape cannot express `style` (it persists through the sidecar),
 * so a style selection maps to undefined here.
 */
export function toStoredWallpaper(
  selection: WallpaperSelection,
  effects: WallpaperEffects,
): StoredWallpaper | undefined {
  if (selection === undefined || selection.kind === 'style') return undefined
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
  if (version === DIRECT_WALLPAPER_STATE_SCHEMA_VERSION) {
    const storedSelection = record.selection
    if (typeof storedSelection !== 'object' || storedSelection === null
      || (storedSelection as Record<string, unknown>).kind !== 'remote'
      || (storedSelection as Record<string, unknown>).delivery !== 'direct') return undefined
    const selection = parseStoredSelection(storedSelection, true)
    if (selection === undefined || selection.kind !== 'remote' || selection.delivery !== 'direct') return undefined
    return {
      revision: normalizeWallpaperRevision(record.revision),
      selection,
      effects: clampEffects(record.effects),
      position: normalizeWallpaperPosition(record.position),
    }
  }
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
 *
 * A `style` selection is written as the same revisioned `{kind:'none'}`
 * tombstone as a clear: the main record is the ordering signal and the style
 * variant lives only in the sidecar. Never write style bytes into this record.
 * @param selection - current wallpaper (undefined/style remove the stored selection).
 * @param effects - current effect values (clamped).
 * @param position - current focal position (normalized to the nine-grid stops).
 * @param revision - monotonic state revision (0 when omitted).
 * @returns the JSON record to store; a cleared/style selection is a revisioned tombstone.
 */
export function serializeWallpaperState(
  selection: WallpaperSelection,
  effects: WallpaperEffects,
  position: WallpaperPosition | undefined = DEFAULT_WALLPAPER_POSITION,
  revision = 0,
): StoredWallpaperState | StoredDirectWallpaperState {
  if (selection?.kind === 'remote' && selection.delivery === 'direct') {
    const provenance = normalizeWallpaperProvenance(selection.provenance)
    const thumbnail = typeof selection.thumbnail === 'string' ? validateWallpaperUrl(selection.thumbnail) : undefined
    return {
      schemaVersion: DIRECT_WALLPAPER_STATE_SCHEMA_VERSION,
      revision: normalizeWallpaperRevision(revision),
      selection: {
        kind: 'remote',
        url: selection.url,
        delivery: 'direct',
        ...(thumbnail?.ok === true ? { thumbnail: thumbnail.url } : {}),
        ...(provenance === undefined ? {} : { provenance }),
      },
      effects: clampEffects(effects),
      position: normalizeWallpaperPosition(position),
    }
  }
  const stored = toStoredSelection(selection)
  return {
    schemaVersion: WALLPAPER_STATE_SCHEMA_VERSION,
    revision: normalizeWallpaperRevision(revision),
    selection: stored ?? { kind: 'none' },
    effects: clampEffects(effects),
    position: normalizeWallpaperPosition(position),
  }
}

/** Maximum JSON response bytes materialized for one provider listing. */
export const WALLPAPER_JSON_MAX_BYTES = 2 * 1024 * 1024
