/**
 * DSH Livery — style-token audit (style system v2).
 *
 * Surface-style recipes and metric profiles emit non-colour host tokens (shape,
 * elevation, material, borders and consumed font-ladder entries). This module
 * owns the frozen allowlist for those values and the per-livery coverage facts
 * the compiler reports:
 *
 * - every token belongs to exactly one registered style family;
 * - every value has an allowed shape (lengths, unitless numbers, colours,
 *   `var(--dsw-*)`, `color-mix(...)`, box-shadow lists, `blur(...)` /
 *   `saturate(...)` filter lists, `superellipse(...)`, `none`, `0`);
 * - hostile values (`url(`, `@`, `!important`, selectors, `<`, newlines, …) are
 *   rejected;
 * - metric overrides are limited to the consumed host font tokens listed in
 *   docs/implementation/style-system.md (user content/code font-size tokens stay
 *   authoritative).
 *
 * The audit is pure and deterministic; colour-token coverage accounting stays in
 * the compiler and is not touched here.
 */

import type { CompiledVariant, TokenMap } from './types.js'
import { splitTopLevelList } from './color.js'

/** Registered style-token families and their exact token names (frozen). */
export const STYLE_TOKEN_FAMILIES = {
  shape: [
    '--dsw-radius-xs',
    '--dsw-radius-sm',
    '--dsw-radius-md',
    '--dsw-radius-lg',
    '--dsw-radius-xl',
    '--dsw-radius-panel',
    '--dsw-corner-shape',
  ],
  elevation: [
    '--dsw-shadow-lv1',
    '--dsw-shadow-lv1-blur',
    '--dsw-shadow-lv2',
    '--dsw-shadow-lv3',
    '--dsw-elevation-panel',
    '--dsw-elevation-prominent',
    '--dsw-elevation-soft',
    '--dsw-elevation-stroke',
    '--dsw-elevation-stroke-color',
  ],
  material: ['--dsw-menu-backdrop-filter', '--dsw-mask-blur', '--dsw-focus-ring-width'],
  border: [
    '--dsw-alias-border-l1',
    '--dsw-alias-border-l2',
    '--dsw-alias-border-l3',
    '--dsw-alias-border-l4',
  ],
} as const

export type StyleTokenFamily = keyof typeof STYLE_TOKEN_FAMILIES

const STYLE_TOKEN_FAMILY_BY_NAME: ReadonlyMap<string, StyleTokenFamily> = new Map(
  (Object.entries(STYLE_TOKEN_FAMILIES) as (readonly [StyleTokenFamily, readonly string[]])[]).flatMap(
    ([family, names]) => names.map((name) => [name, family] as const),
  ),
)

/** Consumed host font tokens metric profiles may override (frozen list). */
export const CONSUMED_METRIC_FONT_TOKENS: readonly string[] = [
  '--dsw-font-xxxs-11',
  '--dsw-font-xxs-12',
  '--dsw-font-xs-13',
  '--dsw-font-xs-strong-13',
  '--dsw-font-s-14',
  '--dsw-font-l-20',
  '--dsw-font-markdown-small',
  '--dsw-font-family-brand',
] as const

const CONSUMED_METRIC_FONT_TOKEN_SET: ReadonlySet<string> = new Set(CONSUMED_METRIC_FONT_TOKENS)

/** The style family a token belongs to, or `null` for non-style tokens. */
export function styleTokenFamilyOf(name: string): StyleTokenFamily | null {
  return STYLE_TOKEN_FAMILY_BY_NAME.get(name) ?? null
}

/** True when the token is one of the registered shape/elevation/material/border tokens. */
export function isStyleTokenName(name: string): boolean {
  return STYLE_TOKEN_FAMILY_BY_NAME.has(name)
}

/** True when a token is an allowed metric font-token override. */
export function isMetricFontToken(name: string): boolean {
  return CONSUMED_METRIC_FONT_TOKEN_SET.has(name)
}

// ---------------------------------------------------------------------------
// Value allowlist
// ---------------------------------------------------------------------------

const HOSTILE_PATTERNS: readonly RegExp[] = [
  /url\s*\(/i,
  /@/,
  /!important/i,
  /expression\s*\(/i,
  /javascript:/i,
  /[;{}<>\\]/,
  /[\u0000-\u001f\u007f]/,
  // Only documented `--dsw-*` host variables may be referenced.
  /var\(--(?!dsw-)/i,
]

/** Values longer than this are never legitimate for a token override. */
export const MAX_TOKEN_VALUE_LENGTH = 240

const LENGTH_PATTERN = /^(?:0|-?(?:\d+|\d*\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|pt|ch))$/
const NUMBER_PATTERN = /^-?(?:\d+|\d*\.\d+)$/
const VAR_DSW_PATTERN = /^var\(--dsw-[a-z0-9-]+\)$/
const HEX_COLOR_PATTERN = /^#[0-9a-f]{3,8}$/i
const RGB_COLOR_PATTERN = /^rgba?\(\s*[0-9.%]+(?:\s*[,\s]\s*[0-9.%]+){2}(?:\s*[,/]\s*[0-9.%]+)?\s*\)$/i
const HSL_COLOR_PATTERN = /^hsla?\(\s*[0-9.]+(?:deg)?(?:\s*[,\s]\s*[0-9.%]+){2}(?:\s*[,/]\s*[0-9.%]+)?\s*\)$/i
const SUPERELLIPSE_PATTERN = /^superellipse\(\s*-?(?:\d+|\d*\.\d+)\s*\)$/
const CORNER_SHAPE_KEYWORDS: ReadonlySet<string> = new Set(['round', 'squircle', 'superellipse(1.5)'])
const FILTER_FUNCTION_PATTERN = /^(?:blur|saturate|brightness|contrast|grayscale|sepia|drop-shadow)\([^<>{};@]*\)$/i

/** Generic hostile-value guard shared by every token kind. */
export function isHostileTokenValue(value: string): boolean {
  if (typeof value !== 'string') return true
  if (value.length === 0 || value.length > MAX_TOKEN_VALUE_LENGTH) return true
  return HOSTILE_PATTERNS.some((pattern) => pattern.test(value))
}

function isColorValue(value: string): boolean {
  const trimmed = value.trim()
  return (
    HEX_COLOR_PATTERN.test(trimmed) ||
    RGB_COLOR_PATTERN.test(trimmed) ||
    HSL_COLOR_PATTERN.test(trimmed) ||
    VAR_DSW_PATTERN.test(trimmed) ||
    isColorMixValue(trimmed)
  )
}

function isColorMixValue(value: string): boolean {
  if (!value.startsWith('color-mix(') || !value.endsWith(')')) return false
  if (isHostileTokenValue(value)) return false
  // Balanced parentheses and at most the documented named colours/keywords.
  let depth = 0
  for (const char of value) {
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    if (depth < 0) return false
  }
  return depth === 0 && /^[A-Za-z0-9()%,.#\s-]+$/.test(value)
}

/** Split a CSS value into whitespace-separated tokens, keeping function groups intact. */
function splitValueTokens(value: string): string[] {
  const tokens: string[] = []
  let current = ''
  let depth = 0
  for (const char of value) {
    if (char === '(') depth += 1
    if (char === ')') depth = Math.max(0, depth - 1)
    if (/\s/.test(char) && depth === 0) {
      if (current.length > 0) tokens.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current.length > 0) tokens.push(current)
  return tokens
}

/** One box-shadow layer: optional `inset`, 2–4 lengths, optional colour/var. */
function isShadowLayer(layer: string): boolean {
  const trimmed = layer.trim()
  if (trimmed.length === 0) return false
  if (VAR_DSW_PATTERN.test(trimmed)) return true
  const tokens = splitValueTokens(trimmed)
  let remaining = [...tokens]
  if (remaining[0]?.toLowerCase() === 'inset') remaining = remaining.slice(1)
  if (remaining.length < 2 || remaining.length > 5) return false
  let lengths = 0
  for (const token of remaining) {
    if (LENGTH_PATTERN.test(token) || NUMBER_PATTERN.test(token)) lengths += 1
    else if (isColorValue(token) || VAR_DSW_PATTERN.test(token)) continue
    else return false
  }
  return lengths >= 2
}

function isShadowList(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === 'none' || trimmed === '0') return true
  if (VAR_DSW_PATTERN.test(trimmed)) return true
  const layers = splitTopLevelList(trimmed)
  if (layers.length === 0) return false
  return layers.every((layer) => isShadowLayer(layer))
}

function isFilterList(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === 'none' || trimmed === '0') return true
  if (VAR_DSW_PATTERN.test(trimmed)) return true
  const tokens = splitValueTokens(trimmed)
  if (tokens.length === 0 || tokens.length > 4) return false
  return tokens.every((token) => FILTER_FUNCTION_PATTERN.test(token))
}

function isFontFamilyList(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length === 0 || isHostileTokenValue(trimmed)) return false
  if (!/^[A-Za-z0-9"'(),.%\s/+-]+$/.test(trimmed)) return false
  return VAR_DSW_PATTERN.test(trimmed) || trimmed.includes('"') || trimmed.includes("'")
}

/** Font shorthand like `500 13px/20px var(--dsw-font-family)` (family token included). */
function isFontShorthand(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length === 0 || isHostileTokenValue(trimmed)) return false
  if (!/^[A-Za-z0-9"'(),.%\s/+-]+$/.test(trimmed)) return false
  if (!/(?:\d+|\d*\.\d+)px/.test(trimmed)) return false
  if (!/var\(--dsw-[a-z0-9-]+\)/.test(trimmed) && !trimmed.includes('"') && !trimmed.includes("'")) return false
  let depth = 0
  for (const char of trimmed) {
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    if (depth < 0) return false
  }
  return depth === 0
}

/** Alpha of a concrete colour value (null when it is not a concrete colour). */
function colorAlpha(value: string): number | null {
  const trimmed = value.trim()
  const hex = /^#([0-9a-f]{3,8})$/i.exec(trimmed)
  if (hex !== null) {
    const digits = hex[1] as string
    if (digits.length === 3) return 1
    if (digits.length === 4) return parseInt((digits[3] as string) + (digits[3] as string), 16) / 255
    if (digits.length === 6) return 1
    if (digits.length === 8) return parseInt(digits.slice(6, 8), 16) / 255
    return null
  }
  const rgba = /^rgba?\(\s*([0-9.%]+)(?:\s*[,\s]\s*[0-9.%]+){2}(?:\s*[,/]\s*([0-9.]+))?\s*\)$/i.exec(trimmed)
  if (rgba !== null) {
    const alpha = rgba[2]
    return alpha === undefined ? 1 : Number.parseFloat(alpha)
  }
  return null
}

function isAlphaTint(value: string): boolean {
  const trimmed = value.trim()
  if (VAR_DSW_PATTERN.test(trimmed) || isColorMixValue(trimmed)) return true
  if (!isColorValue(trimmed)) return false
  const alpha = colorAlpha(trimmed)
  return alpha !== null && alpha < 1
}

function isRadiusLength(value: string): boolean {
  const trimmed = value.trim()
  return LENGTH_PATTERN.test(trimmed) || NUMBER_PATTERN.test(trimmed) || VAR_DSW_PATTERN.test(trimmed)
}

/** True when `value` is an allowed override for the style token `name`. */
export function isAllowedStyleTokenValue(name: string, value: string): boolean {
  const family = styleTokenFamilyOf(name)
  if (family === null) return false
  const trimmed = value.trim()
  if (isHostileTokenValue(trimmed)) return false
  switch (family) {
    case 'shape':
      if (name === '--dsw-corner-shape') {
        return SUPERELLIPSE_PATTERN.test(trimmed) || CORNER_SHAPE_KEYWORDS.has(trimmed)
      }
      return isRadiusLength(trimmed)
    case 'elevation':
      if (name === '--dsw-elevation-stroke-color') return isColorValue(trimmed)
      return isShadowList(trimmed)
    case 'material':
      if (name === '--dsw-focus-ring-width') return isRadiusLength(trimmed)
      return isFilterList(trimmed)
    case 'border':
      return isAlphaTint(trimmed)
  }
}

/** True when `value` is an allowed override for the metric font token `name`. */
export function isAllowedMetricFontTokenValue(name: string, value: string): boolean {
  if (!isMetricFontToken(name)) return false
  const trimmed = value.trim()
  if (isHostileTokenValue(trimmed)) return false
  if (name === '--dsw-font-family-brand') return isFontFamilyList(trimmed)
  return isFontShorthand(trimmed)
}

/** Generic dispatch used when auditing an emitted token map. */
export function isAllowedTokenValue(name: string, value: string): boolean {
  if (isStyleTokenName(name)) return isAllowedStyleTokenValue(name, value)
  if (isMetricFontToken(name)) return isAllowedMetricFontTokenValue(name, value)
  // Colour tokens keep the compiler's existing validation; only reject hostile
  // values here so the style audit never weakens colour coverage.
  return !isHostileTokenValue(value)
}

// ---------------------------------------------------------------------------
// Coverage facts
// ---------------------------------------------------------------------------

export interface StyleTokenIssue {
  readonly token: string
  readonly family: StyleTokenFamily | null
  readonly value: string
  readonly reason: string
}

export interface AppliedStyleToken {
  readonly token: string
  readonly family: StyleTokenFamily
  readonly value: string
}

export interface StyleTokenAudit {
  /** Style tokens present in the emitted map, sorted by token name. */
  readonly applied: readonly AppliedStyleToken[]
  /** Style families actually applied, sorted. */
  readonly families: readonly StyleTokenFamily[]
  /** Metric-font overrides present in the emitted map, sorted. */
  readonly metricFontTokens: readonly string[]
  /** Style/metric tokens that violate the allowlist (must be empty to ship). */
  readonly rejected: readonly StyleTokenIssue[]
  readonly pass: boolean
}

function emptyAudit(): StyleTokenAudit {
  return { applied: [], families: [], metricFontTokens: [], rejected: [], pass: true }
}

/** Audit the style/metric tokens of one emitted token map. */
export function auditStyleTokens(tokens: TokenMap): StyleTokenAudit {
  const applied: AppliedStyleToken[] = []
  const rejected: StyleTokenIssue[] = []
  const metricFontTokens: string[] = []
  for (const name of Object.keys(tokens).sort()) {
    const value = tokens[name] as string
    const family = styleTokenFamilyOf(name)
    if (family !== null) {
      if (isAllowedStyleTokenValue(name, value)) applied.push({ token: name, family, value })
      else rejected.push({ token: name, family, value, reason: 'value is not allowed for this style family' })
      continue
    }
    if (isMetricFontToken(name)) {
      if (isAllowedMetricFontTokenValue(name, value)) metricFontTokens.push(name)
      else rejected.push({ token: name, family: null, value, reason: 'metric font override is not an allowed font token value' })
    }
  }
  const families = [...new Set(applied.map((entry) => entry.family))].sort() as StyleTokenFamily[]
  return { applied, families, metricFontTokens, rejected, pass: rejected.length === 0 }
}

/** Per-livery style coverage facts for light + dark (compiler report input). */
export interface LiveryStyleCoverage {
  readonly light: StyleTokenAudit
  readonly dark: StyleTokenAudit
  /** Union of applied families across both modes, sorted. */
  readonly families: readonly StyleTokenFamily[]
  /** Union of applied style-token names across both modes, sorted. */
  readonly tokens: readonly string[]
  /** Union of metric-font override names across both modes, sorted. */
  readonly metricFontTokens: readonly string[]
  readonly rejected: readonly StyleTokenIssue[]
  readonly pass: boolean
}

/** Aggregate style-token coverage facts for one compiled livery. */
export function auditStyleCoverage(
  light: Pick<CompiledVariant, 'tokens'>,
  dark: Pick<CompiledVariant, 'tokens'>,
): LiveryStyleCoverage {
  const lightAudit = auditStyleTokens(light.tokens)
  const darkAudit = auditStyleTokens(dark.tokens)
  const families = [...new Set([...lightAudit.families, ...darkAudit.families])].sort() as StyleTokenFamily[]
  const tokens = [...new Set([...lightAudit.applied, ...darkAudit.applied].map((entry) => entry.token))].sort()
  const metricFontTokens = [...new Set([...lightAudit.metricFontTokens, ...darkAudit.metricFontTokens])].sort()
  const rejected = [...lightAudit.rejected, ...darkAudit.rejected]
  return {
    light: lightAudit,
    dark: darkAudit,
    families,
    tokens,
    metricFontTokens,
    rejected,
    pass: rejected.length === 0,
  }
}

/** Empty coverage used by catalog entries that carry no style tokens. */
export const EMPTY_STYLE_COVERAGE: LiveryStyleCoverage = {
  light: emptyAudit(),
  dark: emptyAudit(),
  families: [],
  tokens: [],
  metricFontTokens: [],
  rejected: [],
  pass: true,
}

// ---------------------------------------------------------------------------
// Registry self-validation (core-owned data must satisfy the same allowlist)
// ---------------------------------------------------------------------------

/** Throw when a surface-style token map leaves the registered families/values. */
export function assertStyleTokenMap(tokens: TokenMap, label: string): void {
  for (const [name, value] of Object.entries(tokens)) {
    if (!isStyleTokenName(name)) {
      throw new RangeError(`${label}: ${name} is not a registered style token`)
    }
    if (!isAllowedStyleTokenValue(name, value)) {
      throw new RangeError(`${label}: ${name} has a disallowed value ${JSON.stringify(value)}`)
    }
  }
}

/** Throw when a metric profile overrides a token/value outside the allowlist. */
export function assertMetricTokens(tokens: Readonly<Record<string, string>>, label: string): void {
  for (const [name, value] of Object.entries(tokens)) {
    if (!isMetricFontToken(name)) {
      throw new RangeError(`${label}: ${name} is not a consumed metric font token`)
    }
    if (!isAllowedMetricFontTokenValue(name, value)) {
      throw new RangeError(`${label}: ${name} has a disallowed value ${JSON.stringify(value)}`)
    }
  }
}
