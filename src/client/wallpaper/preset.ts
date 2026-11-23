/**
 * Preset v2 — portable, strictly validated snapshot of the user-visible visual
 * setup: livery id, wallpaper selection, effects, focal point and the optional
 * image credit.
 *
 * A preset is **data only**. It deliberately cannot carry CSS, design tokens,
 * fonts, blob uploads, local file paths, IndexedDB keys or wallpaper history:
 * those are either executable/stylesheet payloads or device-local state that
 * must never travel in a shareable file. Uploaded images are not exportable at
 * all (they only exist on the device that picked them); the exported wallpaper
 * is exactly `builtin | remote | style | null`.
 *
 * Schema v2 adds the generated `{kind:'style', variant:'mesh'}` wallpaper and
 * attribution URLs (`creatorUrl`/`licenseUrl`/`sourceUrl`). Schema v1 files stay
 * importable (v1 has no style kind and no attribution URLs); export always
 * writes v2. 0.2.1 clients reject a v2 file with their existing
 * `schema-version` error — that documented downgrade limitation is expected.
 *
 * This module is pure: no React, no Cordis, no DOM. The studio UI maps problem
 * codes to localized copy; the runtime and the state-v2 controller are injected
 * through the small ports below.
 */
import { STOCK_ID } from '../../core/types.js'
import { isLocalOrPrivateHost } from './host-safety.js'
import { isStyleWallpaperVariant } from './style.js'
import {
  DEFAULT_WALLPAPER_POSITION,
  WALLPAPER_EFFECT_BOUNDS,
  WALLPAPER_POSITION_OPTIONS,
  WALLPAPER_POSITION_VALUES,
  clampEffects,
  isBuiltinWallpaperId,
  normalizeWallpaperPosition,
  normalizeWallpaperProvenanceUrl,
  provenanceOfSelection,
  validateWallpaperUrl,
} from '../wallpaper.js'
import type {
  BuiltinWallpaperId,
  StyleWallpaperVariant,
  WallpaperEffects,
  WallpaperPosition,
  WallpaperPositionId,
  WallpaperPositionValue,
  WallpaperProvenance,
  WallpaperSelection,
} from '../wallpaper.js'
import type { StyleApplyFailure, StyleApplyOutcome } from '../model.js'

/** Schema version written by this build (export always writes the current one). */
export const PRESET_SCHEMA_VERSION = 2 as const
/** Legacy schema version still accepted on import (builtin | remote | null only). */
export const LEGACY_PRESET_SCHEMA_VERSION = 1 as const
/** Schema versions accepted by the import path. */
export type PresetSchemaVersion = typeof LEGACY_PRESET_SCHEMA_VERSION | typeof PRESET_SCHEMA_VERSION

/** Hard cap for a preset file / JSON payload (64 KiB). */
export const PRESET_FILE_MAX_BYTES = 64 * 1024

/** Longest accepted `createdWith` producer string. */
export const PRESET_MAX_CREATED_WITH_LENGTH = 96

/** Longest accepted preset style id. */
export const PRESET_MAX_STYLE_ID_LENGTH = 64

/** Producer string written into every exported preset. */
export const PRESET_PRODUCER = 'dsh-livery'

/**
 * Focal point stored in a preset. Aligned with the state-v2 controller's
 * `WallpaperPosition` (single source of truth in `../wallpaper.ts`); the alias
 * keeps the preset module readable at its own call sites.
 */
export type PresetPosition = WallpaperPosition

/** One focal-point axis value (percent). */
export type PresetPositionValue = WallpaperPositionValue

/** Accepted focal-point axis values, in display order. */
export const PRESET_POSITION_VALUES: readonly PresetPositionValue[] = WALLPAPER_POSITION_VALUES

/** Default focal point (centered); also the export fallback for corrupt input. */
export const DEFAULT_PRESET_POSITION: PresetPosition = DEFAULT_WALLPAPER_POSITION

/** Named 3x3 focal-point cell (stable id, also used by the wallpaper nine-grid UI). */
export type PresetPositionName = WallpaperPositionId

/** One bundled wallpaper reference. */
export interface PresetWallpaperBuiltin {
  readonly kind: 'builtin'
  readonly id: BuiltinWallpaperId
}

/** One validated https wallpaper reference. */
export interface PresetWallpaperRemote {
  readonly kind: 'remote'
  readonly url: string
}

/**
 * One generated "follow style" wallpaper reference (schema v2 only). The layer
 * itself is generated from the receiving machine's active livery tokens; a
 * preset carries only the variant id.
 */
export interface PresetWallpaperStyle {
  readonly kind: 'style'
  readonly variant: StyleWallpaperVariant
}

/**
 * Wallpaper reference a preset may carry; `null` means "no wallpaper".
 * A schema v1 file can only carry `builtin | remote | null` (a v1 `style` claim
 * is rejected as `wallpaper-kind` so both clients agree).
 */
export type PresetWallpaper = PresetWallpaperBuiltin | PresetWallpaperRemote | PresetWallpaperStyle

/** Optional image credit, carried only for human-readable attribution. */
export interface PresetAttribution {
  readonly title?: string | undefined
  readonly creator?: string | undefined
  readonly license?: string | undefined
  readonly source?: string | undefined
  /** Schema v2: optional attribution links (https, public host, ≤2048 chars). */
  readonly creatorUrl?: string | undefined
  readonly licenseUrl?: string | undefined
  readonly sourceUrl?: string | undefined
}

/** One complete preset. `schemaVersion` records the shape the file was authored in. */
export interface LiveryPreset {
  readonly schemaVersion: PresetSchemaVersion
  readonly createdWith: string
  readonly styleId: string
  readonly wallpaper: PresetWallpaper | null
  readonly effects: WallpaperEffects
  readonly position: PresetPosition
  readonly attribution?: PresetAttribution | undefined
}

/** Why an imported file was rejected (mapped to localized copy by the UI). */
export type PresetProblem =
  | 'unreadable'
  | 'too-large'
  | 'invalid-json'
  | 'not-object'
  | 'schema-version'
  | 'created-with'
  | 'unknown-field'
  | 'style-id'
  | 'unknown-style'
  | 'catalog-unavailable'
  | 'wallpaper-kind'
  | 'wallpaper-id'
  | 'wallpaper-url'
  | 'wallpaper-variant'
  | 'effects'
  | 'position'
  | 'attribution'
  | 'forbidden-content'

/** Options for import validation. */
export interface PresetImportOptions {
  /** Livery ids in the live catalog (the client validates against this set). */
  readonly catalogIds: readonly string[]
  /** Optional tighter byte cap (tests). */
  readonly maxBytes?: number | undefined
}

/** Successful validation. */
export interface PresetImportOk {
  readonly ok: true
  readonly preset: LiveryPreset
  /** UTF-8 byte size of the imported text / file. */
  readonly bytes: number
}

/** Failed validation. `detail` names the offending field/pattern (technical). */
export interface PresetImportFailure {
  readonly ok: false
  readonly problem: PresetProblem
  readonly detail?: string | undefined
}

/** Import validation result. */
export type PresetImportResult = PresetImportOk | PresetImportFailure

/** Minimal `File` face needed to import a preset (injectable in tests). */
export interface PresetFileLike {
  readonly size: number
  readonly name?: string | undefined
  text(): Promise<string>
}

/** Why the current setup cannot be exported (mapped to localized copy). */
export type PresetExportProblem =
  | 'upload'
  | 'invalid-url'
  | 'invalid-wallpaper'
  | 'invalid-style'
  | 'invalid-version'
  /** `style` is selected but no catalog livery/tokens are active to generate it. */
  | 'style-unavailable'

/** Live setup read by the export action. */
export interface PresetExportSource {
  /** Currently applied livery id (`stock` when nothing is applied). */
  readonly styleId: string | undefined
  /** Live wallpaper selection (`undefined` = no wallpaper). */
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
  /** State-v2 focal point; normalized defensively (never fails an export). */
  readonly position: unknown
  /**
   * Explicit image credit. When omitted, the export falls back to the current
   * remote selection's provenance (the authoritative credit store).
   */
  readonly attribution?: PresetAttribution | undefined
  /**
   * Whether the active catalog currently supplies the style tokens a `style`
   * wallpaper needs. `false` fails the export with `style-unavailable` even when
   * a livery id is applied (degraded catalog); omitted means "assume available".
   */
  readonly styleAvailable?: boolean | undefined
  /** Running plugin version for `createdWith`. */
  readonly pluginVersion: string
}

/** Successful export. */
export interface PresetExportOk {
  readonly ok: true
  readonly preset: LiveryPreset
  /** The exact `JSON.stringify(..., null, 2)` text, newline-terminated. */
  readonly json: string
  readonly bytes: number
}

/** Failed export. */
export interface PresetExportFailure {
  readonly ok: false
  readonly problem: PresetExportProblem
}

/** Export result. */
export type PresetExportResult = PresetExportOk | PresetExportFailure

/** Wallpaper view of the live setup: uploads are visible but not exportable. */
export type PresetCurrentWallpaper =
  | PresetWallpaper
  | { readonly kind: 'upload'; readonly key: string }
  | null

/** Normalized live setup used by the diff preview. */
export interface PresetCurrent {
  readonly styleId: string
  readonly wallpaper: PresetCurrentWallpaper
  readonly effects: WallpaperEffects
  readonly position: PresetPosition
  readonly attribution: PresetAttribution | undefined
}

/** Source read from the runtime + wallpaper controller for a diff. */
export interface PresetCurrentSource {
  readonly styleId: string | undefined
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
  readonly position: unknown
  readonly attribution?: PresetAttribution | undefined
}

/** One changed field between the live setup and an imported preset. */
export type PresetChange =
  | { readonly field: 'style'; readonly from: string; readonly to: string }
  | { readonly field: 'wallpaper'; readonly from: PresetCurrentWallpaper; readonly to: PresetWallpaper | null }
  | { readonly field: 'effects'; readonly from: WallpaperEffects; readonly to: WallpaperEffects }
  | { readonly field: 'position'; readonly from: PresetPosition; readonly to: PresetPosition }
  | { readonly field: 'attribution'; readonly from: PresetAttribution | undefined; readonly to: PresetAttribution | undefined }

/** Diff preview between the live setup and one preset. */
export interface PresetDiff {
  readonly changed: boolean
  readonly changes: readonly PresetChange[]
}

/** Batch wallpaper state requested by a preset (state-v2 `setState` shape). */
export interface PresetWallpaperTarget {
  /** `undefined` explicitly clears the wallpaper. */
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
  readonly position: PresetPosition
}

/** The minimal live-wallpaper snapshot needed to verify a batch apply. */
export interface PresetWallpaperSnapshotLike {
  readonly selection: WallpaperSelection
  readonly effects: WallpaperEffects
  readonly position: unknown
}

/** Ports the preset apply sequence writes through. */
export interface PresetApplyPorts {
  /** Direct, single-write style apply (runtime `applyStyle`). */
  readonly applyStyle: (styleId: string) => Promise<StyleApplyOutcome>
  /** Batch wallpaper apply (state-v2 controller `setState`/`applyState` wrapper). */
  readonly applyWallpaper: (target: PresetWallpaperTarget) => boolean | Promise<boolean>
}

/** Outcome of applying one preset. */
export type PresetApplyResult =
  | { readonly status: 'applied' }
  /**
   * The livery was applied but the wallpaper batch did not land. Reported
   * explicitly instead of silently leaving a half-applied preset.
   */
  | { readonly status: 'partial'; readonly styleId: string }
  /** The livery did not land; nothing was written to the wallpaper state. */
  | { readonly status: 'style-failed'; readonly failure: StyleApplyFailure }

/** Pattern for the `createdWith` producer string (`dsh-livery/<version>`). */
const CREATED_WITH_PATTERN = /^dsh-livery\/[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/

/** Pattern for a version segment inside `createdWith` / the export source. */
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/

/** Pattern for a catalog livery id (kebab-case, bounded). */
const STYLE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/

/** Exact top-level key set (shared by schema v1 and v2). */
const ROOT_KEYS: readonly string[] = [
  'schemaVersion',
  'createdWith',
  'styleId',
  'wallpaper',
  'effects',
  'position',
  'attribution',
]

/** Exact key set of an effects object. */
const EFFECT_KEYS: readonly (keyof WallpaperEffects)[] = ['blur', 'dim', 'frost', 'atmosphere']

/** Exact key set of a focal-point object. */
const POSITION_KEYS: readonly string[] = ['x', 'y']

/** Attribution text key -> maximum accepted string length (schema v1). */
const ATTRIBUTION_LIMITS: Readonly<Record<'title' | 'creator' | 'license' | 'source', number>> = {
  title: 200,
  creator: 120,
  license: 120,
  source: 200,
}
/** Attribution URL fields added by schema v2 (validated as portable URLs). */
const ATTRIBUTION_URL_FIELDS = ['creatorUrl', 'licenseUrl', 'sourceUrl'] as const
/** Every attribution key, in export order. */
const ATTRIBUTION_KEYS = [...Object.keys(ATTRIBUTION_LIMITS), ...ATTRIBUTION_URL_FIELDS] as readonly (keyof PresetAttribution)[]

/** Hard cap on JSON nesting accepted by preset validation (the schema needs 3). */
export const PRESET_MAX_JSON_DEPTH = 8

/**
 * Hard cap on object/array nodes inspected before a preset is rejected as
 * `too-large`. A valid preset has fewer than 32 nodes; the cap only bounds the
 * work done on a hostile deep/wide graph passed to the public API.
 */
const PRESET_MAX_JSON_NODES = 50_000

/** Escaped/control characters that never belong in preset strings. */
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

/** Scheme/path shapes that would smuggle a local or executable payload. */
const FORBIDDEN_CONTENT: readonly RegExp[] = [
  /\\/, // Windows path separator
  /[{}]/, // CSS/JSON structure smuggling
  /[<>]/, // markup
  /!important/i,
  /url\s*\(/i,
  /\b(?:javascript|vbscript|data|blob|file):/i,
  /^[A-Za-z]:[\\/]/, // Windows drive path
  /^~[\\/]/, // home path
  /^\.{1,2}[\\/]/, // relative path traversal
]

/** Named local-only zones; these are not portable with a preset. */
/** UTF-8 byte length of a string (pure fallback for exotic runtimes). */
function utf8Bytes(text: string): number {
  try {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length
  } catch {
    /* fall through to the character count */
  }
  return text.length
}

/** Stable outcome of inspecting/serializing one untrusted JSON value. */
type JsonMeasurement =
  | { readonly ok: true; readonly bytes: number }
  | { readonly ok: false; readonly problem: 'invalid-json' | 'too-large'; readonly detail: string }

/**
 * Measure one untrusted value as JSON without ever throwing.
 *
 * `JSON.stringify` recurses, so a deeply nested input can raise a `RangeError`
 * ("Maximum call stack size exceeded") and a cyclic/BigInt/toJSON-throwing input
 * can raise a `TypeError`. Before serializing, this helper walks the graph
 * iteratively with an explicit stack (no recursion of our own), reject
 * cycles/unsafe types/over-deep nesting, and aborts early on the byte/node
 * budget. Only a bounded, acyclic, JSON-safe graph reaches `JSON.stringify`,
 * which is still wrapped for defence in depth. Deep input therefore maps to a
 * stable `invalid-json` failure (detail `depth`) instead of an exception, and
 * oversized input to `too-large`.
 * @param value - untrusted JSON-like value.
 * @param maxBytes - byte budget of the serialized preset.
 * @returns measured UTF-8 bytes, or a stable failure code + detail.
 */
function measureJsonValue(value: unknown, maxBytes: number): JsonMeasurement {
  try {
    const stack: Array<{ readonly value: unknown; readonly depth: number }> = [{ value, depth: 0 }]
    const seen = new WeakSet<object>()
    let nodes = 0
    let stringBytes = 0
    while (stack.length > 0) {
      const entry = stack.pop() as { readonly value: unknown; readonly depth: number }
      nodes += 1
      if (nodes > PRESET_MAX_JSON_NODES) return { ok: false, problem: 'too-large', detail: 'nodes' }
      const current = entry.value
      if (current === null || typeof current === 'boolean') continue
      if (typeof current === 'number') {
        if (!Number.isFinite(current)) return { ok: false, problem: 'invalid-json', detail: 'number' }
        continue
      }
      if (typeof current === 'string') {
        stringBytes += utf8Bytes(current)
        if (stringBytes > maxBytes) return { ok: false, problem: 'too-large', detail: 'bytes' }
        continue
      }
      if (typeof current !== 'object') {
        // undefined/function/symbol/bigint are not JSON values.
        return { ok: false, problem: 'invalid-json', detail: 'type' }
      }
      if (entry.depth >= PRESET_MAX_JSON_DEPTH) {
        return { ok: false, problem: 'invalid-json', detail: 'depth' }
      }
      if (seen.has(current)) return { ok: false, problem: 'invalid-json', detail: 'cyclic' }
      seen.add(current)
      for (const key of Object.keys(current)) {
        stack.push({ value: (current as Record<string, unknown>)[key], depth: entry.depth + 1 })
      }
    }
    const text: unknown = JSON.stringify(value)
    if (typeof text !== 'string') return { ok: false, problem: 'invalid-json', detail: 'stringify' }
    // Fast pre-check before encoding: UTF-8 bytes are never shorter than the
    // number of UTF-16 code units in a JSON string.
    if (text.length > maxBytes) return { ok: false, problem: 'too-large', detail: 'bytes' }
    const bytes = utf8Bytes(text)
    if (bytes > maxBytes) return { ok: false, problem: 'too-large', detail: 'bytes' }
    return { ok: true, bytes }
  } catch {
    // Proxies/getters can still throw between passes; never leak that to callers.
    return { ok: false, problem: 'invalid-json', detail: 'measure' }
  }
}

/** Build a failure result, keeping `detail` only when present. */
function failed(problem: PresetProblem, detail?: string): PresetImportFailure {
  return detail === undefined ? { ok: false, problem } : { ok: false, problem, detail }
}

/** Build an export failure result. */
function exportFailed(problem: PresetExportProblem): PresetExportFailure {
  return { ok: false, problem }
}

/** Narrow an unknown JSON value to a plain record. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

/** First key of `record` outside `allowed`, if any. */
function firstUnknownKey(record: Record<string, unknown>, allowed: readonly string[]): string | undefined {
  const allowedSet = new Set(allowed)
  for (const key of Object.keys(record)) if (!allowedSet.has(key)) return key
  return undefined
}

/** Whether one string carries a forbidden shape (path/scheme/markup/CSS). */
export function hasForbiddenContent(value: string): boolean {
  if (CONTROL_CHARACTERS.test(value)) return true
  return FORBIDDEN_CONTENT.some(pattern => pattern.test(value))
}

/** Check one free-form string against length/forbidden-content rules. */
function checkString(
  value: unknown,
  field: string,
  maxLength: number,
): { readonly value: string } | PresetImportFailure {
  if (typeof value !== 'string') return failed('forbidden-content', field)
  if (value.length > maxLength) return failed('forbidden-content', field)
  const trimmed = value.trim()
  if (trimmed.length === 0) return { value: '' }
  // Attribution is plain display text: only control characters are unsafe.
  // Titles such as "<No. 2>" or "url(...)" are legitimate credits.
  if (CONTROL_CHARACTERS.test(trimmed)) return failed('forbidden-content', field)
  return { value: trimmed }
}

/** Validate one focal-point axis. */
function isPositionValue(value: unknown): value is PresetPositionValue {
  return value === 0 || value === 50 || value === 100
}

/**
 * Strict 3×3 focal-point check (import path): both axes must be exactly one of
 * the nine-grid stops, so a crafted `{x:25}` is rejected rather than snapped.
 * @param value - untrusted JSON value.
 * @returns true when it is a valid preset position.
 */
export function isPresetPosition(value: unknown): value is PresetPosition {
  const record = asRecord(value)
  if (record === undefined) return false
  if (firstUnknownKey(record, POSITION_KEYS) !== undefined) return false
  return isPositionValue(record.x) && isPositionValue(record.y)
}

/**
 * Defensive normalization of a live/serialized position value (delegates to the
 * state-v2 controller helper: snaps each axis to the nearest stop and falls back
 * to center). Used by export/diff so device-local oddities never produce an
 * invalid preset.
 * @param value - device-local position (object) or nothing.
 * @returns a valid focal point.
 */
export function normalizePresetPosition(value: unknown): PresetPosition {
  return normalizeWallpaperPosition(value)
}

/**
 * Stable 3x3 cell id of one focal point (reuses the controller's nine-grid ids,
 * so the preset diff and the wallpaper position UI speak the same ids).
 * @param position - valid focal point.
 * @returns the option id (`'top-left'`, `'center'`, …).
 */
export function presetPositionName(position: PresetPosition): PresetPositionName {
  const match = WALLPAPER_POSITION_OPTIONS.find(option => option.x === position.x && option.y === position.y)
  return match?.id ?? 'center'
}

/** Build the producer string for one plugin version. */
export function createdWithOf(pluginVersion: string): string {
  const version = pluginVersion.trim()
  return `${PRESET_PRODUCER}/${version}`
}

/** Whether a producer string is a version this build understands. */
export function isCreatedWith(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= PRESET_MAX_CREATED_WITH_LENGTH
    && CREATED_WITH_PATTERN.test(value)
}

/** Result of requiring a portable (https, non-local, non-executable) URL. */
type PortableUrlResult =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly detail: string }

/** Require one portable wallpaper URL (shared by import and export). */
function portableWallpaperUrl(raw: unknown): PortableUrlResult {
  if (typeof raw !== 'string') return { ok: false, detail: 'not-string' }
  const check = validateWallpaperUrl(raw)
  if (!check.ok) return { ok: false, detail: check.problem }
  if (hasForbiddenContent(check.url)) return { ok: false, detail: 'forbidden-content' }
  let hostname = ''
  try {
    hostname = new URL(check.url).hostname
  } catch {
    return { ok: false, detail: 'invalid' }
  }
  if (isLocalOrPrivateHost(hostname)) return { ok: false, detail: 'local' }
  return { ok: true, url: check.url }
}

/**
 * Parse the `wallpaper` member of a preset for one schema version.
 *
 * v1 keeps exactly `builtin | remote | null`; a v1 file claiming `kind:'style'`
 * is rejected as `wallpaper-kind` so both clients agree. v2 adds the generated
 * `{kind:'style', variant}` reference with an exact key set and a dedicated
 * `wallpaper-variant` problem code.
 */
function parseWallpaper(
  value: unknown,
  version: PresetSchemaVersion,
): { readonly wallpaper: PresetWallpaper | null } | PresetImportFailure {
  if (value === null) return { wallpaper: null }
  const record = asRecord(value)
  if (record === undefined) return failed('wallpaper-kind', 'wallpaper')
  const kind = record.kind
  if (kind === 'builtin') {
    const unknown = firstUnknownKey(record, ['kind', 'id'])
    if (unknown !== undefined) return failed('unknown-field', `wallpaper.${unknown}`)
    if (!isBuiltinWallpaperId(record.id)) return failed('wallpaper-id', 'wallpaper.id')
    return { wallpaper: { kind: 'builtin', id: record.id } }
  }
  if (kind === 'remote') {
    const unknown = firstUnknownKey(record, ['kind', 'url'])
    if (unknown !== undefined) return failed('unknown-field', `wallpaper.${unknown}`)
    const portable = portableWallpaperUrl(record.url)
    if (!portable.ok) {
      return portable.detail === 'forbidden-content'
        ? failed('forbidden-content', 'wallpaper.url')
        : failed('wallpaper-url', `wallpaper.url.${portable.detail}`)
    }
    return { wallpaper: { kind: 'remote', url: portable.url } }
  }
  if (kind === 'style' && version >= PRESET_SCHEMA_VERSION) {
    const unknown = firstUnknownKey(record, ['kind', 'variant'])
    if (unknown !== undefined) return failed('unknown-field', `wallpaper.${unknown}`)
    if (!isStyleWallpaperVariant(record.variant)) return failed('wallpaper-variant', 'wallpaper.variant')
    return { wallpaper: { kind: 'style', variant: record.variant } }
  }
  return failed('wallpaper-kind', 'wallpaper.kind')
}

/**
 * Validate one attribution URL: https, public host, ≤2048 chars (shared with the
 * persisted provenance rule so a preset can never carry an unportable link).
 * @param value - untrusted URL field.
 * @param field - field name for the failure detail.
 * @returns the normalized URL or an `attribution` failure.
 */
function parseAttributionUrl(
  value: unknown,
  field: string,
): { readonly url: string } | PresetImportFailure {
  if (typeof value !== 'string') return failed('attribution', field)
  const url = normalizeWallpaperProvenanceUrl(value)
  if (url === undefined) return failed('attribution', field)
  return { url }
}

/** Parse the `effects` member of a preset (clamped into the supported ranges). */
function parseEffects(value: unknown): { readonly effects: WallpaperEffects } | PresetImportFailure {
  const record = asRecord(value)
  if (record === undefined) return failed('effects', 'effects')
  const unknown = firstUnknownKey(record, EFFECT_KEYS)
  if (unknown !== undefined) return failed('unknown-field', `effects.${unknown}`)
  for (const key of EFFECT_KEYS) {
    const candidate = record[key]
    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return failed('effects', `effects.${key}`)
    const bounds = WALLPAPER_EFFECT_BOUNDS[key]
    if (candidate < bounds.min || candidate > bounds.max) return failed('effects', `effects.${key}`)
  }
  return { effects: clampEffects(record) }
}

/** Parse the `position` member of a preset (strict 0/50/100 grid). */
function parsePosition(value: unknown): { readonly position: PresetPosition } | PresetImportFailure {
  const record = asRecord(value)
  if (record === undefined) return failed('position', 'position')
  const unknown = firstUnknownKey(record, POSITION_KEYS)
  if (unknown !== undefined) return failed('unknown-field', `position.${unknown}`)
  if (!isPresetPosition(record)) return failed('position', 'position')
  return { position: { x: record.x as PresetPositionValue, y: record.y as PresetPositionValue } }
}

/**
 * Parse the optional `attribution` member of a preset.
 *
 * v1 accepts only the four plain-text fields; a v1 file carrying a v2 URL field
 * is rejected as `unknown-field` (strict version shape). v2 adds the three URL
 * fields under the portable-URL rule; a malformed URL fails with the
 * `attribution` problem and a `detail` naming the field (never silently dropped
 * on import — only export drops unportable links).
 */
function parseAttribution(
  value: unknown,
  version: PresetSchemaVersion,
): { readonly attribution: PresetAttribution | undefined } | PresetImportFailure {
  if (value === undefined) return { attribution: undefined }
  const record = asRecord(value)
  if (record === undefined) return failed('attribution', 'attribution')
  const keys: readonly (keyof PresetAttribution)[] = version >= PRESET_SCHEMA_VERSION ? ATTRIBUTION_KEYS : Object.keys(ATTRIBUTION_LIMITS) as readonly (keyof PresetAttribution)[]
  const unknown = firstUnknownKey(record, keys)
  if (unknown !== undefined) return failed('unknown-field', `attribution.${unknown}`)
  const attribution: Record<string, string> = {}
  for (const key of keys) {
    const candidate = record[key]
    if (candidate === undefined) continue
    if ((ATTRIBUTION_URL_FIELDS as readonly string[]).includes(key)) {
      const parsedUrl = parseAttributionUrl(candidate, `attribution.${key}`)
      if ('ok' in parsedUrl && parsedUrl.ok === false) return parsedUrl
      attribution[key] = (parsedUrl as { readonly url: string }).url
      continue
    }
    if (typeof candidate !== 'string') return failed('attribution', `attribution.${key}`)
    const checked = checkString(candidate, `attribution.${key}`, ATTRIBUTION_LIMITS[key as keyof typeof ATTRIBUTION_LIMITS])
    if ('ok' in checked && checked.ok === false) return checked
    const parsed = checked as { readonly value: string }
    if (parsed.value.length > 0) attribution[key] = parsed.value
  }
  return { attribution: Object.keys(attribution).length === 0 ? undefined : attribution as PresetAttribution }
}

/** Validate an already-parsed JSON value as a preset (schema v1 or v2). */
function validatePresetValue(value: unknown, options: PresetImportOptions): PresetImportResult {
  const maxBytes = options.maxBytes ?? PRESET_FILE_MAX_BYTES
  const measured = measureJsonValue(value, maxBytes)
  if (!measured.ok) return failed(measured.problem, measured.detail)
  const bytes = measured.bytes
  const record = asRecord(value)
  if (record === undefined) return failed('not-object')
  const unknownRoot = firstUnknownKey(record, ROOT_KEYS)
  if (unknownRoot !== undefined) return failed('unknown-field', unknownRoot)

  const version = record.schemaVersion
  if (version !== LEGACY_PRESET_SCHEMA_VERSION && version !== PRESET_SCHEMA_VERSION) {
    return failed('schema-version', 'schemaVersion')
  }

  if (!isCreatedWith(record.createdWith)) return failed('created-with', 'createdWith')
  const createdWith = record.createdWith as string

  const styleId = record.styleId
  if (typeof styleId !== 'string'
    || styleId.length > PRESET_MAX_STYLE_ID_LENGTH
    || !STYLE_ID_PATTERN.test(styleId)) {
    return failed('style-id', 'styleId')
  }
  if (styleId !== STOCK_ID) {
    if (options.catalogIds.length === 0) return failed('catalog-unavailable', 'styleId')
    if (!options.catalogIds.includes(styleId)) return failed('unknown-style', 'styleId')
  }

  const wallpaper = parseWallpaper(record.wallpaper, version)
  if ('ok' in wallpaper && wallpaper.ok === false) return wallpaper
  const wallpaperValue = (wallpaper as { readonly wallpaper: PresetWallpaper | null }).wallpaper
  if (wallpaperValue?.kind === 'style' && styleId === STOCK_ID) {
    return failed('wallpaper-kind', 'wallpaper.style.stock')
  }
  const effects = parseEffects(record.effects)
  if ('ok' in effects && effects.ok === false) return effects
  const position = parsePosition(record.position)
  if ('ok' in position && position.ok === false) return position
  const attribution = parseAttribution(record.attribution, version)
  if ('ok' in attribution && attribution.ok === false) return attribution

  const attributionValue = (attribution as { readonly attribution: PresetAttribution | undefined }).attribution
  const preset: LiveryPreset = {
    schemaVersion: version,
    createdWith,
    styleId,
    wallpaper: (wallpaper as { readonly wallpaper: PresetWallpaper | null }).wallpaper,
    effects: (effects as { readonly effects: WallpaperEffects }).effects,
    position: (position as { readonly position: PresetPosition }).position,
    ...(attributionValue === undefined ? {} : { attribution: attributionValue }),
  }
  return { ok: true, preset, bytes }
}

/**
 * Validate an already-parsed JSON value as a preset (schema v1 or v2).
 *
 * Never throws: deep/cyclic/unserializable input and oversized payloads become
 * stable `invalid-json` / `too-large` results (the caller-visible contract of
 * the import path).
 * @param value - untrusted value, typically `JSON.parse` output.
 * @param options - catalog ids + optional byte cap.
 * @returns ok with the normalized preset, or a stable problem code.
 */
export function validatePreset(value: unknown, options: PresetImportOptions): PresetImportResult {
  try {
    return validatePresetValue(value, options)
  } catch {
    return failed('invalid-json', 'validation')
  }
}

/**
 * Validate one preset JSON text (schema v1 or v2; export always writes v2).
 *
 * Never throws: malformed JSON, deeply nested JSON and oversized input all map
 * to stable problem codes. A leading UTF-8 BOM is tolerated.
 * @param text - raw JSON text.
 * @param options - catalog ids + optional byte cap.
 * @returns ok with the normalized preset, or a stable problem code.
 */
export function parsePresetText(text: string, options: PresetImportOptions): PresetImportResult {
  try {
    const maxBytes = options.maxBytes ?? PRESET_FILE_MAX_BYTES
    // UTF-8 bytes are never fewer than UTF-16 code units: reject cheaply first.
    if (text.length > maxBytes) return failed('too-large', 'bytes')
    if (utf8Bytes(text) > maxBytes) return failed('too-large', 'bytes')
    let raw: unknown
    try {
      raw = JSON.parse(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text)
    } catch {
      return failed('invalid-json')
    }
    const result = validatePreset(raw, options)
    return result.ok ? { ...result, bytes: utf8Bytes(text) } : result
  } catch {
    return failed('invalid-json', 'text')
  }
}

/**
 * Import one picked file: size cap first (never read an oversized file), then
 * strict text validation.
 * @param file - file metadata + text reader.
 * @param options - catalog ids + optional byte cap.
 * @returns ok with the normalized preset, or a stable problem code.
 */
export async function importPresetFile(file: PresetFileLike, options: PresetImportOptions): Promise<PresetImportResult> {
  try {
    const maxBytes = options.maxBytes ?? PRESET_FILE_MAX_BYTES
    let size: unknown
    try {
      size = file.size
    } catch {
      return failed('unreadable', 'size')
    }
    if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
      return failed('unreadable', 'size')
    }
    if (size > maxBytes) return failed('too-large', 'size')
    let text: string
    try {
      text = await file.text()
    } catch {
      return failed('unreadable', 'text')
    }
    const result = parsePresetText(text, options)
    if (!result.ok) return result
    return { ...result, bytes: size }
  } catch {
    // The import path must surface a stable error, never an unhandled rejection.
    return failed('unreadable', 'file')
  }
}

/**
 * Keep only attribution values that would pass import validation. Text fields
 * keep plain display text (length/control-character bounded); URL fields are
 * dropped when they are not portable https public-host links. Export drops
 * invalid URLs instead of failing the whole export (plan §4.6).
 */
function sanitizeAttribution(input: PresetAttribution | undefined): PresetAttribution | undefined {
  if (input === undefined) return undefined
  const output: Record<string, string> = {}
  for (const [key, limit] of Object.entries(ATTRIBUTION_LIMITS)) {
    const candidate = input[key as keyof PresetAttribution]
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (trimmed.length === 0) continue
    if (trimmed.length > limit) continue
    if (CONTROL_CHARACTERS.test(trimmed)) continue
    output[key] = trimmed
  }
  for (const key of ATTRIBUTION_URL_FIELDS) {
    const url = normalizeWallpaperProvenanceUrl(input[key])
    if (url !== undefined) output[key] = url
  }
  return Object.keys(output).length === 0 ? undefined : output as PresetAttribution
}

/**
 * Map the authoritative remote-selection provenance onto preset attribution
 * fields. Used as the export fallback when the caller does not pass an explicit
 * attribution record, so a re-exported image keeps its credit links.
 * @param provenance - current remote selection provenance.
 * @returns the attribution record, or undefined when nothing is known.
 */
export function attributionFromProvenance(
  provenance: WallpaperProvenance | undefined,
): PresetAttribution | undefined {
  if (provenance === undefined) return undefined
  const attribution: Record<string, string> = {}
  const textKeys = ['title', 'creator', 'license', 'source'] as const
  for (const key of textKeys) {
    const value = provenance[key]
    if (typeof value === 'string' && value.trim().length > 0) attribution[key] = value.trim()
  }
  for (const key of ATTRIBUTION_URL_FIELDS) {
    const value = normalizeWallpaperProvenanceUrl(provenance[key])
    if (value !== undefined) attribution[key] = value
  }
  return Object.keys(attribution).length === 0 ? undefined : attribution as PresetAttribution
}

/**
 * Export the live setup as a preset v2 object + deterministic JSON text.
 *
 * Uploads are refused (device-local blobs are not portable); remote URLs are
 * re-validated as https; effects are clamped; the focal point is normalized.
 * The generated `style` wallpaper exports only when a catalog livery is active
 * (a stock/no-token state has nothing to follow, so it fails
 * `style-unavailable`). Attribution falls back to the selection provenance.
 * @param source - live setup read from the runtime + wallpaper controller.
 * @returns ok with preset/json/bytes, or a stable export problem.
 */
export function exportPreset(source: PresetExportSource): PresetExportResult {
  const styleId = source.styleId === undefined || source.styleId.length === 0 ? STOCK_ID : source.styleId
  if (styleId !== STOCK_ID && (styleId.length > PRESET_MAX_STYLE_ID_LENGTH || !STYLE_ID_PATTERN.test(styleId))) {
    return exportFailed('invalid-style')
  }
  const pluginVersion = source.pluginVersion.trim()
  if (!VERSION_PATTERN.test(pluginVersion)) return exportFailed('invalid-version')
  const createdWith = createdWithOf(pluginVersion)

  let wallpaper: PresetWallpaper | null = null
  const selection = source.selection
  if (selection !== undefined) {
    if (selection.kind === 'upload') return exportFailed('upload')
    if (selection.kind === 'builtin') {
      if (!isBuiltinWallpaperId(selection.id)) return exportFailed('invalid-wallpaper')
      wallpaper = { kind: 'builtin', id: selection.id }
    } else if (selection.kind === 'style') {
      // A style layer can only be reproduced on a machine with catalog tokens;
      // stock/no-style or an explicitly unavailable token context means there is
      // nothing to follow.
      if (styleId === STOCK_ID || source.styleAvailable === false || !isStyleWallpaperVariant(selection.variant)) {
        return exportFailed('style-unavailable')
      }
      wallpaper = { kind: 'style', variant: selection.variant }
    } else {
      const portable = portableWallpaperUrl(selection.url)
      if (!portable.ok) return exportFailed('invalid-url')
      wallpaper = { kind: 'remote', url: portable.url }
    }
  }

  const attribution = sanitizeAttribution(source.attribution ?? attributionFromProvenance(provenanceOfSelection(selection)))
  const preset: LiveryPreset = {
    schemaVersion: PRESET_SCHEMA_VERSION,
    createdWith,
    styleId,
    wallpaper,
    effects: clampEffects(source.effects),
    position: normalizePresetPosition(source.position),
    ...(attribution === undefined ? {} : { attribution }),
  }
  const json = `${JSON.stringify(preset, null, 2)}\n`
  return { ok: true, preset, json, bytes: utf8Bytes(json) }
}

/** Wallpaper view of one live selection. */
function currentWallpaperOf(selection: WallpaperSelection): PresetCurrentWallpaper {
  if (selection === undefined) return null
  if (selection.kind === 'builtin') return { kind: 'builtin', id: selection.id }
  if (selection.kind === 'remote') return { kind: 'remote', url: selection.url }
  if (selection.kind === 'style') return { kind: 'style', variant: selection.variant }
  return { kind: 'upload', key: selection.key }
}

/**
 * Normalize the live setup for the diff preview.
 * @param source - live style id + wallpaper controller state.
 * @returns normalized current setup.
 */
export function currentPresetOf(source: PresetCurrentSource): PresetCurrent {
  return {
    styleId: source.styleId === undefined || source.styleId.length === 0 ? STOCK_ID : source.styleId,
    wallpaper: currentWallpaperOf(source.selection),
    effects: clampEffects(source.effects),
    position: normalizePresetPosition(source.position),
    attribution: sanitizeAttribution(source.attribution),
  }
}

/** Compare two effects records field by field. */
export function sameEffects(a: WallpaperEffects, b: WallpaperEffects): boolean {
  return a.blur === b.blur && a.dim === b.dim && a.frost === b.frost && a.atmosphere === b.atmosphere
}

/** Compare two focal points. */
export function samePosition(a: PresetPosition, b: PresetPosition): boolean {
  return a.x === b.x && a.y === b.y
}

/** Compare two wallpaper views (`null` = no wallpaper). */
export function sameWallpaperView(a: PresetCurrentWallpaper, b: PresetCurrentWallpaper): boolean {
  if (a === null || b === null) return a === b
  if (a.kind !== b.kind) return false
  if (a.kind === 'builtin') return b.kind === 'builtin' && a.id === b.id
  if (a.kind === 'remote') return b.kind === 'remote' && a.url === b.url
  if (a.kind === 'style') return b.kind === 'style' && a.variant === b.variant
  return b.kind === 'upload' && a.key === b.key
}

/** Compare two normalized attribution records (undefined/empty considered equal). */
export function sameAttribution(a: PresetAttribution | undefined, b: PresetAttribution | undefined): boolean {
  return ATTRIBUTION_KEYS.every(field => (a?.[field] ?? '') === (b?.[field] ?? ''))
}

/**
 * Compute the human-sized diff between the live setup and one preset.
 * @param current - normalized live setup (see {@link currentPresetOf}).
 * @param preset - imported preset.
 * @returns changed fields in a stable order (style, wallpaper, effects, position, attribution).
 */
export function diffPreset(current: PresetCurrent, preset: LiveryPreset): PresetDiff {
  const changes: PresetChange[] = []
  if (current.styleId !== preset.styleId) {
    changes.push({ field: 'style', from: current.styleId, to: preset.styleId })
  }
  if (!sameWallpaperView(current.wallpaper, preset.wallpaper)) {
    changes.push({ field: 'wallpaper', from: current.wallpaper, to: preset.wallpaper })
  }
  if (!sameEffects(current.effects, preset.effects)) {
    changes.push({ field: 'effects', from: current.effects, to: preset.effects })
  }
  if (!samePosition(current.position, preset.position)) {
    changes.push({ field: 'position', from: current.position, to: preset.position })
  }
  if (!sameAttribution(current.attribution, preset.attribution)) {
    changes.push({ field: 'attribution', from: current.attribution, to: preset.attribution })
  }
  return { changed: changes.length > 0, changes }
}

/**
 * Batch wallpaper target of one preset (`preset.wallpaper: null` clears).
 * @param preset - imported preset.
 * @returns the state-v2 batch payload.
 */
export function presetWallpaperTarget(preset: LiveryPreset): PresetWallpaperTarget {
  return {
    selection: preset.wallpaper ?? undefined,
    effects: preset.effects,
    position: preset.position,
  }
}

/**
 * Whether a live controller snapshot matches a preset wallpaper target. The
 * integration wrapper uses this to turn the never-throwing state-v2 `setState`
 * into a reliable success/failure signal.
 * @param snapshot - state-v2 controller snapshot after the batch.
 * @param target - requested wallpaper target.
 * @returns true when selection/effects/position all landed.
 */
export function matchesPresetWallpaperState(
  snapshot: PresetWallpaperSnapshotLike,
  target: PresetWallpaperTarget,
): boolean {
  return sameWallpaperView(currentWallpaperOf(snapshot.selection), currentWallpaperOf(target.selection))
    && sameEffects(clampEffects(snapshot.effects), target.effects)
    && samePosition(normalizePresetPosition(snapshot.position), target.position)
}

/**
 * Apply just the wallpaper half of a preset (recovery path after a partial
 * failure). Never throws: a throwing port counts as failure.
 * @param preset - imported preset.
 * @param ports - wallpaper port.
 * @returns true when the controller confirmed the target state.
 */
export async function applyPresetWallpaper(preset: LiveryPreset, ports: Pick<PresetApplyPorts, 'applyWallpaper'>): Promise<boolean> {
  try {
    return (await ports.applyWallpaper(presetWallpaperTarget(preset))) === true
  } catch {
    return false
  }
}

/**
 * Apply one preset in the documented order: the livery first (one runtime
 * config write), then the wallpaper state in one controller batch.
 *
 * A failed livery aborts before the wallpaper is touched. A failed wallpaper
 * batch is reported as `partial` (the livery change is never silently hidden or
 * silently rolled back).
 * @param preset - validated preset.
 * @param ports - runtime style port + wallpaper batch port.
 * @returns applied/partial/style-failed.
 */
export async function applyPreset(preset: LiveryPreset, ports: PresetApplyPorts): Promise<PresetApplyResult> {
  let style: StyleApplyOutcome
  try {
    style = await ports.applyStyle(preset.styleId)
  } catch {
    return { status: 'style-failed', failure: 'transport' }
  }
  if (!style.ok) return { status: 'style-failed', failure: style.failure }
  if (!(await applyPresetWallpaper(preset, ports))) return { status: 'partial', styleId: preset.styleId }
  return { status: 'applied' }
}
