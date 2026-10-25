/**
 * DSH Livery — data-driven light/dark token derivation (COMPILE-TIME ONLY).
 *
 * `deriveLivery` turns a manifest's four seed colours per mode into a complete
 * concrete token overlay for one exact host stock snapshot:
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
 *    host think-selection gradients are re-stopped on the new ramp.
 * 5. The dark variant is derived independently from its own seeds; it is not an
 *    inversion of the light variant.
 * 6. A bounded WCAG repair pass (`auditContrast` + `adjustForContrast`) moves
 *    foreground tokens that miss §18.2; explicit manifest overrides win over the
 *    derived values (they are exempt from the repair pass).
 * 7. Style system v2 merge order (docs/design/style-system.md §2):
 *    derived colours → `metrics.tokens` (mode-independent) → `surfaceStyle.light`
 *    or `surfaceStyle.dark` → explicit `variants.<mode>.tokens` (explicit wins).
 *    `CompiledVariant.tokens` stays the single emitted map the renderer consumes.
 * 8. Emission policy (§8.2 A-tier): only tokens consumed by shipped host
 *    packages are serialized — every consumed `--dsw-alias-*` /
 *    `--dsw-specific-*` token plus the static steps read directly by components,
 *    plus the style/metric tokens selected by the manifest (shape/elevation/
 *    material/border + allowed font-ladder overrides). The full derived palette
 *    is still used for the contrast audit and returned through `contrast`;
 *    unconsumed colour tokens inherit stock and are reported by the compiler.
 *
 * Every entry point takes the host `StockSnapshot` explicitly (§2 of
 * docs/design/multi-version.md): a catalog compiled for one host version
 * can never derive against another version's token values. No module-global
 * stock table survives. This module imports the frozen snapshot *types* only and
 * must never be reachable from the Client/Host runtime bundles.
 *
 * Output is deterministic: fixed ordering, fixed rounding, no I/O, no clocks.
 */

import type { CompiledVariant, ContrastEntry, LiveryManifest, Mode, Seeds, TokenMap } from './types.js'
import type { Rgb } from './color.js'
import {
  contrastRatio,
  evaluateColorMix,
  formatCssColor,
  formatHex,
  mixOklab,
  parseColor,
  parseColorWithAlpha,
  rgbToOklab,
  substituteVars,
} from './color.js'
import type { StockSnapshot, StockTokenDeclaration } from '../generated/stock.js'
import { CONTRAST_CHECKS, adjustForContrast, auditContrast, resolveCheckColors } from './contrast.js'
import { metricsOf, surfaceStyleOf } from './registry.js'

/** Declaration record of one host stock snapshot (mode-independent metadata). */
export type StockDeclarations = Readonly<Record<string, StockTokenDeclaration>>

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
  // Host think-selection fades are not consumed by any shipped package in the
  // frozen snapshots (referencedBy empty), so they stay at the host values.
  '--dsw-linear-gradient-think',
  '--dsw-linear-think-select',
] as const

/** Stock declaration record for one snapshot (shared helper). */
export function declarationsOf(stock: StockSnapshot): StockDeclarations {
  return stock.tokens
}

/**
 * A-tier required tokens for one snapshot (§8.2): every alias/specific token a
 * shipped DSH package actually consumes in that host's frozen contract.
 */
export function requiredColorTokenNames(stock: StockSnapshot): readonly string[] {
  return Object.entries(stock.tokens)
    .filter(
      ([name, declaration]) =>
        /^--dsw-(alias|specific)-[a-z0-9-]+$/.test(name) && declaration.referencedBy.length > 0,
    )
    .map(([name]) => name)
    .sort()
}

/**
 * Raw palette steps consumed directly by a shipped package other than the theme
 * package for one snapshot. The theme package references every static step while
 * defining the alias layer, so those references are already covered by the
 * emitted aliases; these steps are read by components straight from CSS.
 */
export function directConsumedStaticTokenNames(stock: StockSnapshot): readonly string[] {
  return Object.entries(stock.tokens)
    .filter(
      ([name, declaration]) =>
        name.startsWith('--dsw-static-') &&
        declaration.referencedBy.some((pkg) => pkg !== 'dsh-client-ui-theme'),
    )
    .map(([name]) => name)
    .sort()
}

/**
 * The deterministic emitted-token set for one snapshot (A-tier emission policy,
 * §8.2): every alias/specific token a shipped package consumes plus the static
 * steps read directly by components; brand roles and material tokens are always
 * owned by the livery. Everything else inherits stock and is reported by the
 * compiler as a non-blocking diagnostic. No host version string is involved.
 */
export function emittedTokenNames(stock: StockSnapshot): ReadonlySet<string> {
  return new Set([
    ...requiredColorTokenNames(stock),
    ...directConsumedStaticTokenNames(stock),
    ...ROLE_TOKEN_NAMES,
  ])
}

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

type RawOf = (name: string) => string

function buildNeutralMapping(mode: Mode, seeds: Seeds, rawOf: RawOf): RampMapping {
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
  declarations: StockDeclarations,
  rawOf: RawOf,
): RampMapping {
  const familyNames = Object.keys(declarations).filter((tokenName) =>
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

function rawStockValue(declaration: StockTokenDeclaration, mode: Mode): string {
  return mode === 'light' ? declaration.light : declaration.dark
}

function sameAsStock(name: string, value: string, declarations: StockDeclarations, mode: Mode): boolean {
  const declaration = declarations[name]
  if (declaration === undefined) return false
  const raw = rawStockValue(declaration, mode)
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

/**
 * Mode-independent metric font-token overrides for one manifest.
 *
 * The manifest picks one metrics profile per locale; both profiles are merged in
 * deterministic locale order (`zh-CN` then `en-US`, so `en-US` wins on a
 * collision — designers are expected to pick the same profile for both locales
 * when the token maps differ). Only consumed host font tokens are allowed, so the
 * user's content/code font-size setting stays authoritative.
 */
function metricTokenOverrides(manifest: LiveryManifest): TokenMap {
  const merged: Record<string, string> = {}
  for (const locale of ['zh-CN', 'en-US'] as const) {
    const metrics = metricsOf(manifest.typography.metrics[locale])
    for (const [name, value] of Object.entries(metrics.tokens)) merged[name] = value
  }
  return merged
}

// ---------------------------------------------------------------------------
// Per-mode derivation
// ---------------------------------------------------------------------------

function deriveVariant(
  manifest: LiveryManifest,
  mode: Mode,
  stock: StockSnapshot,
  lightEmitted?: TokenMap,
): CompiledVariant {
  const seeds = manifest.variants[mode].seeds
  const overrides: TokenMap = manifest.variants[mode].tokens ?? {}
  const overridden = new Set<string>(Object.keys(overrides))
  const declarations = stock.tokens
  const surface = parseColor(seeds.surface)
  const text = parseColor(seeds.text)
  const accent = parseColor(seeds.accent)
  const secondary = parseColor(seeds.secondary)

  const rawOf: RawOf = (name: string): string => {
    const declaration = declarations[name]
    if (declaration === undefined) return ''
    return rawStockValue(declaration, mode)
  }

  const full: MutableTokens = {}
  const neutralMapping = buildNeutralMapping(mode, seeds, rawOf)
  const accentMapping = buildSeedMapping('deepseek', mode, accent, surface, text, declarations, rawOf)
  const secondaryMapping = buildSeedMapping('blue', mode, secondary, surface, text, declarations, rawOf)
  const mappings: Readonly<Record<StaticFamily, RampMapping | null>> = {
    neutral: neutralMapping,
    accent: accentMapping,
    secondary: secondaryMapping,
    semantic: null,
  }

  // 1. Static palette steps.
  for (const [name, declaration] of Object.entries(declarations)) {
    if (declaration.category !== 'static') continue
    const raw = rawStockValue(declaration, mode)
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
    const declaration = declarations[name]
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
    return null
  }
  function resolveToken(name: string): string | null {
    if (resolvedCache.has(name)) return resolvedCache.get(name) ?? null
    if (visiting.has(name)) return null
    const declaration = declarations[name]
    if (declaration === undefined) return null
    visiting.add(name)
    const value = resolveExpression(rawStockValue(declaration, mode))
    visiting.delete(name)
    resolvedCache.set(name, value)
    return value
  }
  for (const [name, declaration] of Object.entries(declarations)) {
    if (declaration.category !== 'alias' && declaration.category !== 'specific') continue
    if (pinned.has(name)) continue
    const value = resolveToken(name)
    if (value !== null) full[name] = value
  }
  // 5. Style system v2 merge order: metrics.tokens -> surfaceStyle[mode] ->
  //    explicit manifest overrides (explicit wins). CompiledVariant.tokens stays
  //    the single emitted map; the renderer body is unchanged.
  const metricTokens = metricTokenOverrides(manifest)
  const surfaceStyle = manifest.layout.surfaceStyle
  const styleTokens = surfaceStyleOf(surfaceStyle)[mode]
  for (const [name, value] of Object.entries(metricTokens)) full[name] = value
  for (const [name, value] of Object.entries(styleTokens)) full[name] = value
  // Re-apply explicit overrides last so they always win over style/metric tokens.
  for (const [name, value] of Object.entries(overrides)) full[name] = value

  // 6. Bounded WCAG repair pass over the foreground tokens of the audit matrix.
  let contrast: readonly ContrastEntry[] = []
  for (let pass = 0; pass < 6; pass += 1) {
    const variant: CompiledVariant = { seeds, tokens: sortedTokens({ ...full }), contrast: [] }
    contrast = auditContrast(variant, mode, stock)
    let changed = false
    for (const spec of CONTRAST_CHECKS) {
      if (!spec.adjustable) continue
      if (overridden.has(spec.foregroundToken)) continue
      const resolved = resolveCheckColors(full, spec, mode, stock)
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
  contrast = auditContrast(finalVariant, mode, stock)

  // 7. Emission policy (§8.2): consumed tokens only; everything else inherits
  //    stock and is reported by the compiler as a non-blocking diagnostic.
  const emittedNames = emittedTokenNames(stock)
  const forced = new Set<string>([...overridden, ...Object.keys(roleOverrides)])
  // Style/metric tokens are emitted when they differ from stock (surface `solid`
  // and legacy metric profiles keep empty maps, so they add no bytes).
  const extraAllowed = new Set<string>([...Object.keys(metricTokens), ...Object.keys(styleTokens)])
  const emitted: MutableTokens = {}
  for (const name of Object.keys(full)) {
    const value = full[name]
    if (value === undefined) continue
    if (DELIBERATELY_INHERITED_TOKENS.includes(name)) continue
    const isForced = forced.has(name)
    if (!isForced && !extraAllowed.has(name) && !emittedNames.has(name)) continue
    if (!isForced && sameAsStock(name, value, declarations, mode)) continue
    // Compact dark block: a non-forced token with no host dark-scoped
    // declaration and the same emitted light value is already covered by the
    // body-scoped light declaration in both modes.
    if (
      mode === 'dark' &&
      !isForced &&
      lightEmitted !== undefined &&
      declarations[name]?.darkSelector === null &&
      lightEmitted[name] === value
    ) {
      continue
    }
    emitted[name] = value
  }

  return { seeds, tokens: sortedTokens(emitted), contrast }
}

/**
 * Derive the complete light/dark token sets for one manifest against one exact
 * host stock snapshot. The snapshot is required: a catalog compiled for one host
 * version must never derive against another version's token values.
 *
 * Deterministic and side-effect free; compile-time only (never reachable from
 * the runtime bundles).
 */
export function deriveLivery(
  manifest: LiveryManifest,
  stock: StockSnapshot,
): { readonly light: CompiledVariant; readonly dark: CompiledVariant } {
  const light = deriveVariant(manifest, 'light', stock)
  return {
    light,
    dark: deriveVariant(manifest, 'dark', stock, light.tokens),
  }
}

/** True when a token may be emitted (alias / specific / static / approved). */
export function isTokenWhitelisted(name: string): boolean {
  return name.startsWith('--dsw-alias-') || name.startsWith('--dsw-specific-') || name.startsWith('--dsw-static-')
}
