/**
 * DSH Livery — data-driven light/dark token derivation (COMPILE-TIME ONLY).
 *
 * `deriveLivery` turns a manifest's four seed colours per mode into a complete
 * concrete token overlay for the frozen host palette:
 *
 * 1. Neutral ramp: every neutral static step is re-mapped in OKLab from the
 *    `surface` ↔ `text` seed pair, preserving the host's relative lightness
 *    structure (light/pale steps stay pale, dark steps stay dark).
 * 2. Accent ramp: `deepseek-*` statics (link / primary action / business state)
 *    are mapped from the `accent` seed; `blue-*` statics (selection / secondary
 *    emphasis) from the `secondary` seed. The 500 step anchors the seed itself.
 * 3. Semantic statics (`amber` / `green` / `red`) keep their host hues; only the
 *    foreground aliases are contrast-adjusted, never the semantic statics.
 * 4. Alias / specific tokens are resolved through their stock `var()` chain,
 *    `color-mix()` expressions are evaluated against the new ramp values and the
 *    two host think-selection gradients are re-stopped on the new ramp.
 * 5. The dark variant is derived independently from its own seeds; it is not an
 *    inversion of the light variant.
 * 6. A bounded WCAG repair pass (`auditContrast` + `adjustForContrast`) moves
 *    foreground tokens that miss §18.2; explicit manifest overrides win over the
 *    derived values (they are exempt from the repair pass).
 * 7. Emission policy (§8.2 A-tier): only tokens consumed by shipped host
 *    packages are serialized — every consumed `--dsw-alias-*` /
 *    `--dsw-specific-*` token plus the static steps read directly by components.
 *    The full derived palette is still used for the contrast audit and returned
 *    through `contrast`; unconsumed tokens inherit stock and are reported as
 *    non-blocking diagnostics by the compiler.
 *
 * This module imports the frozen stock snapshot, so it must never be reachable
 * from the Client/Host runtime bundles: only the build-time compiler uses it.
 * Output is deterministic: fixed ordering, fixed rounding, no I/O, no clocks.
 */

import type { CompiledVariant, ContrastEntry, LiveryManifest, Mode, Seeds, TokenMap } from './types.js'
import type { Rgb } from './color.js'
import {
  clampToSrgbGamut,
  contrastRatio,
  evaluateColorMix,
  formatCssColor,
  formatHex,
  mixOklab,
  parseColor,
  parseColorWithAlpha,
  rgbToOklab,
  splitTopLevelList,
  substituteVars,
} from './color.js'
import { STOCK_TOKENS, STOCK_LIGHT, STOCK_DARK } from '../generated/stock.js'
import { CONTRAST_CHECKS, adjustForContrast, auditContrast, resolveCheckColors } from './contrast.js'

/** Stock declaration maps for both host palettes. */
export interface StockTokens {
  readonly light: TokenMap
  readonly dark: TokenMap
}

/** Frozen declaration snapshot; pass this when a caller has no custom stock. */
export const STOCK_SNAPSHOT: StockTokens = { light: STOCK_LIGHT, dark: STOCK_DARK }

/** Material (surfaceStyle soft/glass) tokens that glass makes translucent. */
export const MATERIAL_LAYER_TOKENS: readonly string[] = [
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-module-platform',
] as const

/** Per-token alpha used by the `glass` surface style. */
const GLASS_ALPHA: Readonly<Record<string, number>> = {
  '--dsw-alias-bg-layer-1': 0.8,
  '--dsw-alias-bg-layer-2': 0.86,
  '--dsw-alias-bg-layer-3': 0.92,
  '--dsw-alias-bg-module-platform': 0.72,
}

/** Host think-selection gradients re-stopped on the derived neutral ramp. */
export const GRADIENT_TOKEN_NAMES: readonly string[] = [
  '--dsw-linear-gradient-think',
  '--dsw-linear-think-select',
] as const

/** Brand / on-accent roles always owned by the livery (even when unconsumed). */
const ROLE_TOKEN_NAMES: readonly string[] = [
  '--dsw-alias-brand-primary',
  '--dsw-alias-brand-primary-new-colorprimary-new-color',
  '--dsw-alias-label-primary-foreground',
  '--dsw-alias-button-primary-hover',
] as const

/**
 * Tokens deliberately left at their stock value (documented inheritance):
 * public host material contracts, host rebind seams, onboarding brand art and
 * the semantic diff palette (which is intentionally not re-themed).
 */
export const DELIBERATELY_INHERITED_TOKENS: readonly string[] = [
  '--dsw-menu-surface-fill',
  '--dsw-menu-backdrop-filter',
  '--dsw-mask-blur',
  '--dsw-focus-ring-color',
  '--dsw-elevation-stroke-color',
  '--dsw-gradient-onboarding-violet-stops',
  '--dsw-gradient-onboarding-blue-stops',
  '--dsw-gradient-onboarding-cyan-stops',
  '--dsw-alias-onboarding-accent',
  '--dsw-alias-file-diff-added-bg',
  '--dsw-alias-file-diff-added-gutter',
  '--dsw-alias-file-diff-added-marker',
  '--dsw-alias-file-diff-deleted-bg',
  '--dsw-alias-file-diff-deleted-gutter',
  '--dsw-alias-file-diff-deleted-marker',
] as const

/**
 * A-tier required tokens (§8.2): every alias/specific token a shipped DSH
 * package actually consumes according to the frozen contract snapshot.
 */
export const REQUIRED_COLOR_TOKEN_NAMES: readonly string[] = Object.entries(STOCK_TOKENS)
  .filter(
    ([name, declaration]) =>
      /^--dsw-(alias|specific)-[a-z0-9-]+$/.test(name) && declaration.referencedBy.length > 0,
  )
  .map(([name]) => name)
  .sort()

/**
 * Raw palette steps consumed directly by a shipped package other than the theme
 * package. The theme package references every static step while defining the
 * alias layer, so those references are already covered by the emitted aliases;
 * these steps are read by components straight from CSS and must be overridden.
 */
export const DIRECT_CONSUMED_STATIC_TOKEN_NAMES: readonly string[] = Object.entries(STOCK_TOKENS)
  .filter(
    ([name, declaration]) =>
      name.startsWith('--dsw-static-') &&
      declaration.referencedBy.some((pkg) => pkg !== 'dsh-client-ui-theme'),
  )
  .map(([name]) => name)
  .sort()

/** Alias/specific tokens asserted by the contrast matrix (kept for diagnostics). */
const MATRIX_TOKEN_NAMES: ReadonlySet<string> = new Set(
  CONTRAST_CHECKS.flatMap((spec) => {
    const names = [spec.foregroundToken, spec.backgroundToken]
    if (spec.backgroundOverToken !== undefined) names.push(spec.backgroundOverToken)
    return names
  }),
)

/**
 * The deterministic emitted-token set: required consumed aliases + directly
 * consumed static steps + contrast-matrix roles + brand roles + gradients +
 * material tokens. Everything else inherits stock (non-blocking diagnostics).
 */
export const EMITTED_TOKEN_NAMES: ReadonlySet<string> = new Set([
  ...REQUIRED_COLOR_TOKEN_NAMES,
  ...DIRECT_CONSUMED_STATIC_TOKEN_NAMES,
  ...MATRIX_TOKEN_NAMES,
  ...ROLE_TOKEN_NAMES,
  ...GRADIENT_TOKEN_NAMES,
  ...MATERIAL_LAYER_TOKENS,
])

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

type MutableTokens = Record<string, string>

type StaticFamily = 'neutral' | 'accent' | 'secondary' | 'semantic'

function staticFamilyOf(name: string): StaticFamily {
  if (name.startsWith('--dsw-static-neutral-bluish-') || name.startsWith('--dsw-static-neutral-')) {
    return 'neutral'
  }
  if (name.startsWith('--dsw-static-deepseek-')) return 'accent'
  if (name.startsWith('--dsw-static-blue-')) return 'secondary'
  return 'semantic'
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

interface RampMapping {
  readonly name: string
  readonly map: (rgb: Rgb) => Rgb
}

function buildNeutralMapping(mode: Mode, seeds: Seeds, rawOf: (name: string) => string): RampMapping {
  const luminanceOf = (name: string): number => rgbToOklab(parseColor(rawOf(name))).l
  const surface = parseColor(seeds.surface)
  const text = parseColor(seeds.text)
  const darkPole =
    mode === 'light'
      ? luminanceOf('--dsw-static-neutral-bluish-1000')
      : luminanceOf('--dsw-static-neutral-bluish-950')
  const lightPole =
    mode === 'light'
      ? luminanceOf('--dsw-static-neutral-bluish-00')
      : luminanceOf('--dsw-static-neutral-bluish-50')
  const darkTarget = mode === 'light' ? text : surface
  const lightTarget = mode === 'light' ? surface : text
  const span = Math.max(1e-6, lightPole - darkPole)
  return {
    name: 'neutral',
    map: (rgb: Rgb): Rgb => {
      const position = clamp01((rgbToOklab(rgb).l - darkPole) / span)
      return mixOklab(darkTarget, lightTarget, position)
    },
  }
}

function buildSeedMapping(
  name: string,
  mode: Mode,
  seed: Rgb,
  surface: Rgb,
  text: Rgb,
  rawOf: (tokenName: string) => string,
): RampMapping {
  const familyNames = Object.keys(STOCK_TOKENS).filter((tokenName) =>
    tokenName.startsWith(`--dsw-static-${name}-`),
  )
  let lightPole = Number.NEGATIVE_INFINITY
  let darkPole = Number.POSITIVE_INFINITY
  for (const familyName of familyNames) {
    const lightness = rgbToOklab(parseColor(rawOf(familyName))).l
    if (lightness > lightPole) lightPole = lightness
    if (lightness < darkPole) darkPole = lightness
  }
  const midLightness = rgbToOklab(parseColor(rawOf(`--dsw-static-${name}-500`))).l
  const lightTarget = mode === 'light' ? mixOklab(seed, surface, 0.88) : mixOklab(seed, text, 0.55)
  const darkTarget = mode === 'light' ? mixOklab(seed, text, 0.72) : mixOklab(seed, surface, 0.72)
  const lightSpan = Math.max(1e-6, lightPole - midLightness)
  const darkSpan = Math.max(1e-6, midLightness - darkPole)
  return {
    name,
    map: (rgb: Rgb): Rgb => {
      const lightness = rgbToOklab(rgb).l
      if (lightness >= midLightness) {
        const position = clamp01((lightness - midLightness) / lightSpan)
        return mixOklab(seed, lightTarget, position)
      }
      const position = clamp01((midLightness - lightness) / darkSpan)
      return mixOklab(seed, darkTarget, position)
    },
  }
}

/** Re-stop a two-stop neutral `linear-gradient()` on the derived ramp. */
function mapGradient(expression: string, mapNeutral: (rgb: Rgb) => Rgb): string | null {
  const prefix = 'linear-gradient('
  const trimmed = expression.trim()
  if (!trimmed.startsWith(prefix) || !trimmed.endsWith(')')) return null
  const inner = trimmed.slice(prefix.length, -1)
  const parts = splitTopLevelList(inner).map((part) => part.trim())
  if (parts.length < 3) return null
  const angle = parts[0] as string
  const stops = parts.slice(1).map((stop) => {
    const match = /^(.+?)\s+([0-9.]+%)$/.exec(stop)
    const colorExpression = match === null ? stop : (match[1] as string).trim()
    const position = match === null ? '' : ` ${match[2] as string}`
    let parsed: { rgb: Rgb; alpha: number }
    try {
      parsed = parseColorWithAlpha(colorExpression)
    } catch {
      return stop
    }
    return `${formatCssColor(mapNeutral(parsed.rgb), parsed.alpha)}${position}`
  })
  return `linear-gradient(${angle}, ${stops.join(', ')})`
}

function canonicalColor(value: string): string | null {
  try {
    const parsed = parseColorWithAlpha(value)
    return formatCssColor(parsed.rgb, parsed.alpha)
  } catch {
    return null
  }
}

function rgbaEqual(a: { rgb: Rgb; alpha: number }, b: { rgb: Rgb; alpha: number }): boolean {
  const round = (value: number): number => Math.round(value * 1000) / 1000
  return (
    round(a.rgb.r) === round(b.rgb.r) &&
    round(a.rgb.g) === round(b.rgb.g) &&
    round(a.rgb.b) === round(b.rgb.b) &&
    round(a.alpha) === round(b.alpha)
  )
}

function sameAsStock(name: string, value: string, stockForMode: TokenMap): boolean {
  const raw = stockForMode[name]
  if (raw === undefined) return false
  if (value === raw) return true
  try {
    return rgbaEqual(parseColorWithAlpha(value), parseColorWithAlpha(raw))
  } catch {
    return false
  }
}

function sortedTokens(source: MutableTokens): TokenMap {
  const result: Record<string, string> = {}
  for (const name of Object.keys(source).sort()) {
    const value = source[name]
    if (value !== undefined) result[name] = value
  }
  return result
}

// ---------------------------------------------------------------------------
// Per-mode derivation
// ---------------------------------------------------------------------------

function deriveVariant(manifest: LiveryManifest, mode: Mode, stockForMode: TokenMap): CompiledVariant {
  const seeds = manifest.variants[mode].seeds
  const overrides: TokenMap = manifest.variants[mode].tokens ?? {}
  const overridden = new Set<string>(Object.keys(overrides))
  const surface = parseColor(seeds.surface)
  const text = parseColor(seeds.text)
  const accent = parseColor(seeds.accent)
  const secondary = parseColor(seeds.secondary)

  const rawOf = (name: string): string => {
    const value = stockForMode[name]
    if (value !== undefined) return value
    const declaration = STOCK_TOKENS[name]
    return declaration === undefined ? '' : declaration.light
  }

  const full: MutableTokens = {}
  const neutralMapping = buildNeutralMapping(mode, seeds, rawOf)
  const accentMapping = buildSeedMapping('deepseek', mode, accent, surface, text, rawOf)
  const secondaryMapping = buildSeedMapping('blue', mode, secondary, surface, text, rawOf)
  const mappings: Readonly<Record<StaticFamily, RampMapping | null>> = {
    neutral: neutralMapping,
    accent: accentMapping,
    secondary: secondaryMapping,
    semantic: null,
  }

  // 1. Static palette steps.
  for (const [name, declaration] of Object.entries(STOCK_TOKENS)) {
    if (declaration.category !== 'static') continue
    const raw = rawOf(name)
    if (raw.length === 0) continue
    const parsed = parseColorWithAlpha(raw)
    const mapping = mappings[staticFamilyOf(name)]
    const mapped = mapping === null ? parsed.rgb : mapping.map(parsed.rgb)
    full[name] = formatCssColor(mapped, parsed.alpha)
  }

  // 2. Brand / on-accent roles computed from the seeds before alias resolution.
  const neutralLightPole = full['--dsw-static-neutral-bluish-00'] as string
  const neutralDarkPole = full['--dsw-static-neutral-bluish-1000'] as string
  const basePole =
    mode === 'light'
      ? (full['--dsw-static-neutral-bluish-00'] as string)
      : (full['--dsw-static-neutral-bluish-950'] as string)
  const onAccentCandidates = mode === 'light' ? [neutralLightPole, '#ffffff'] : [neutralDarkPole, '#0b0b0c']
  let brandFill = formatHex(accent)
  let onAccent = onAccentCandidates[0] as string
  for (const candidate of onAccentCandidates) {
    const candidateRatio = contrastRatio(parseColor(candidate), parseColor(brandFill))
    if (candidateRatio > contrastRatio(parseColor(onAccent), parseColor(brandFill))) onAccent = candidate
  }
  for (let pass = 0; pass < 4; pass += 1) {
    const onAccentRatio = contrastRatio(parseColor(brandFill), parseColor(onAccent))
    const baseRatio = contrastRatio(parseColor(brandFill), parseColor(basePole))
    if (onAccentRatio >= 4.55 && baseRatio >= 3.05) break
    if (onAccentRatio < 4.55) brandFill = adjustForContrast(brandFill, onAccent, 4.5)
    else brandFill = adjustForContrast(brandFill, basePole, 3)
  }
  const roleOverrides: MutableTokens = {
    '--dsw-alias-brand-primary': brandFill,
    '--dsw-alias-brand-primary-new-colorprimary-new-color': brandFill,
    '--dsw-alias-label-primary-foreground': onAccent,
  }
  const hover = formatHex(mixOklab(parseColor(brandFill), text, 0.14))
  roleOverrides['--dsw-alias-button-primary-hover'] =
    contrastRatio(parseColor(hover), parseColor(onAccent)) >= 4.55
      ? hover
      : adjustForContrast(hover, onAccent, 4.5)
  const pinned = new Set<string>([...Object.keys(overrides), ...Object.keys(roleOverrides)])
  for (const [name, value] of Object.entries(roleOverrides)) full[name] = value

  // 3. Manifest overrides win over derived values (and are exempt from repair).
  for (const [name, value] of Object.entries(overrides)) full[name] = value

  // 4. Alias / specific tokens resolved through their stock var()/color-mix chain.
  const resolvedCache = new Map<string, string | null>()
  const visiting = new Set<string>()
  const resolveRef = (name: string): string | null => {
    const direct = full[name]
    if (direct !== undefined) return direct
    const declaration = STOCK_TOKENS[name]
    if (declaration === undefined) return null
    return resolveToken(name)
  }
  const resolveExpression = (raw: string): string | null => {
    const substituted = substituteVars(raw.trim(), resolveRef)
    if (substituted === null) return null
    const value = substituted.trim()
    const literal = canonicalColor(value)
    if (literal !== null) return literal
    if (value.startsWith('color-mix(')) return evaluateColorMix(value)
    if (value.startsWith('linear-gradient(')) return mapGradient(value, neutralMapping.map)
    return null
  }
  function resolveToken(name: string): string | null {
    if (resolvedCache.has(name)) return resolvedCache.get(name) ?? null
    if (visiting.has(name)) return null
    const declaration = STOCK_TOKENS[name]
    if (declaration === undefined) return null
    visiting.add(name)
    const value = resolveExpression(rawOf(name))
    visiting.delete(name)
    resolvedCache.set(name, value)
    return value
  }
  for (const [name, declaration] of Object.entries(STOCK_TOKENS)) {
    if (declaration.category !== 'alias' && declaration.category !== 'specific') continue
    if (pinned.has(name)) continue
    const value = resolveToken(name)
    if (value !== null) full[name] = value
  }
  for (const name of GRADIENT_TOKEN_NAMES) {
    const value = resolveToken(name)
    if (value !== null) full[name] = value
  }

  // 5. Surface material recipes are token-only (no selectors).
  const surfaceStyle = manifest.layout.surfaceStyle
  if (surfaceStyle !== 'solid') {
    for (const name of MATERIAL_LAYER_TOKENS) {
      const current = full[name]
      if (current === undefined) continue
      const parsed = parseColorWithAlpha(current)
      if (surfaceStyle === 'soft') full[name] = formatHex(mixOklab(parsed.rgb, text, 0.05))
      else full[name] = formatCssColor(parsed.rgb, GLASS_ALPHA[name] ?? 0.85)
    }
  }

  // 6. Bounded WCAG repair pass over the foreground tokens of the audit matrix.
  let contrast: readonly ContrastEntry[] = []
  for (let pass = 0; pass < 6; pass += 1) {
    const variant: CompiledVariant = { seeds, tokens: sortedTokens({ ...full }), contrast: [] }
    contrast = auditContrast(variant, mode)
    let changed = false
    for (const spec of CONTRAST_CHECKS) {
      if (!spec.adjustable) continue
      if (overridden.has(spec.foregroundToken)) continue
      const resolved = resolveCheckColors(full, spec, mode)
      if (resolved === null) continue
      const ratio = contrastRatio(resolved.foreground, resolved.background)
      if (ratio >= spec.min) continue
      const current = formatHex(resolved.foreground)
      const repaired = adjustForContrast(current, formatHex(resolved.background), spec.min)
      if (repaired !== current) {
        full[spec.foregroundToken] = repaired
        changed = true
      }
    }
    if (!changed) break
  }
  const finalVariant: CompiledVariant = { seeds, tokens: sortedTokens({ ...full }), contrast: [] }
  contrast = auditContrast(finalVariant, mode)

  // 7. Emission policy (§8.2): consumed tokens only; everything else inherits
  //    stock and is reported by the compiler as a non-blocking diagnostic.
  const forced = new Set<string>([
    ...overridden,
    ...Object.keys(roleOverrides),
    ...GRADIENT_TOKEN_NAMES,
    ...(surfaceStyle === 'solid' ? [] : MATERIAL_LAYER_TOKENS),
  ])
  const emitted: MutableTokens = {}
  for (const name of Object.keys(full)) {
    const value = full[name]
    if (value === undefined) continue
    if (DELIBERATELY_INHERITED_TOKENS.includes(name)) continue
    const isForced = forced.has(name)
    if (!isForced && !EMITTED_TOKEN_NAMES.has(name)) continue
    if (!isForced && sameAsStock(name, value, stockForMode)) continue
    emitted[name] = value
  }

  return { seeds, tokens: sortedTokens(emitted), contrast }
}

/**
 * Derive the complete light/dark token sets for one manifest. Deterministic and
 * side-effect free; `stock` defaults to the frozen snapshot from the contract.
 * Compile-time only — never reachable from the runtime bundles.
 */
export function deriveLivery(
  manifest: LiveryManifest,
  stock: StockTokens = STOCK_SNAPSHOT,
): { readonly light: CompiledVariant; readonly dark: CompiledVariant } {
  return {
    light: deriveVariant(manifest, 'light', stock.light),
    dark: deriveVariant(manifest, 'dark', stock.dark),
  }
}

/** True when a token may be emitted (alias / specific / static / approved). */
export function isTokenWhitelisted(name: string): boolean {
  return name.startsWith('--dsw-alias-') || name.startsWith('--dsw-specific-') || name.startsWith('--dsw-static-')
}

/** Clamp helper re-exported for tests that build ramps by hand. */
export { clampToSrgbGamut }
