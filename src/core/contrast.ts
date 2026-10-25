/**
 * DSH Livery — contrast audit and bounded foreground auto-adjustment.
 *
 * The matrix covers the roles × surfaces × states required by
 * IMPLEMENTATION_PLAN.md §18.2 (light and dark). Translucent token values are
 * composited over the surface they actually paint on before the WCAG 2.x ratio
 * is computed. Thresholds follow WCAG 2.2 AA: 4.5 normal text, 3.0 large text /
 * non-text / focus indicators.
 *
 * `auditContrast` is a pure read; `adjustForContrast` is a bounded
 * (fixed iteration count, deterministic) helper the deriver uses to repair
 * foreground tokens that miss the matrix.
 */

import type { CompiledVariant, ContrastEntry, Mode, TokenMap } from './types.js'
import type { Rgb, RgbaColor } from './color.js'
import {
  clampToSrgbGamut,
  contrastRatio,
  formatHex,
  oklchToRgb,
  parseColor,
  parseColorWithAlpha,
  relativeLuminance,
  rgbToOklch,
} from './color.js'
import type { StockSnapshot } from '../generated/stock.js'

/** Interaction states asserted by the matrix (§18.2). */
export type ContrastState = 'default' | 'hover' | 'active' | 'selected' | 'focus' | 'disabled'

/** One matrix assertion. `backgroundToken` may be translucent → composite over `backgroundOverToken`. */
export interface ContrastCheck {
  readonly role: string
  readonly surface: string
  readonly state: ContrastState
  readonly foregroundToken: string
  readonly backgroundToken: string
  /** When the background token is translucent, it is composited over this one. */
  readonly backgroundOverToken?: string
  readonly min: number
  readonly kind: ContrastEntry['kind']
  /** Whether `deriveLivery` may move `foregroundToken` to repair a failure. */
  readonly adjustable: boolean
}

/** Surface tokens referenced by the matrix (also used by previews/diagnostics). */
export const CONTRAST_SURFACES = {
  base: '--dsw-alias-bg-base',
  sidebar: '--dsw-specific-sidebar-fill',
  layer: '--dsw-alias-bg-layer-1',
  card: '--dsw-alias-settings-card-fill',
  bubble: '--dsw-specific-bubble',
  menu: '--dsw-specific-menu',
  toast: '--dsw-alias-toast-bg',
  tooltip: '--dsw-alias-tooltip-bg',
  code: '--dsw-alias-markdown-code-block',
  input: '--dsw-specific-input-major',
  selection: '--dsw-specific-sidebar-nav-item-active',
} as const

/** Foreground tokens referenced by the matrix. */
export const CONTRAST_FOREGROUNDS = {
  primary: '--dsw-alias-label-primary',
  secondary: '--dsw-alias-label-secondary',
  tertiary: '--dsw-alias-label-tertiary',
  caption: '--dsw-alias-label-caption',
  link: '--dsw-alias-link',
  brandText: '--dsw-alias-brand-text',
  error: '--dsw-alias-state-error-primary',
  warn: '--dsw-alias-state-warn-label',
  success: '--dsw-alias-state-success-primary',
  disabled: '--dsw-alias-label-dimmed',
  onAccent: '--dsw-alias-label-primary-foreground',
  toastLabel: '--dsw-alias-toast-label',
  business: '--dsw-alias-state-business-primary',
  brandFill: '--dsw-alias-brand-primary',
  buttonPrimaryFill: '--dsw-alias-button-primary-fill',
} as const

const TEXT = 'text' as const
const NON_TEXT = 'non-text' as const

interface CheckOptions {
  readonly backgroundOverToken?: string
  readonly adjustable?: boolean
}

function check(
  role: string,
  surface: string,
  state: ContrastState,
  foregroundToken: string,
  backgroundToken: string,
  min: number,
  kind: ContrastEntry['kind'],
  options: CheckOptions = {},
): ContrastCheck {
  const adjustable = options.adjustable ?? true
  const over = options.backgroundOverToken
  if (over === undefined) {
    return { role, surface, state, foregroundToken, backgroundToken, min, kind, adjustable }
  }
  return { role, surface, state, foregroundToken, backgroundToken, backgroundOverToken: over, min, kind, adjustable }
}

type SurfaceSpec = readonly [surface: string, backgroundToken: string, over?: string]

function textOn(
  role: string,
  foregroundToken: string,
  surfaces: readonly SurfaceSpec[],
  min: number,
  state: ContrastState = 'default',
  adjustable = true,
): ContrastCheck[] {
  return surfaces.map(([surface, backgroundToken, over]) => {
    const options: CheckOptions = over === undefined ? { adjustable } : { adjustable, backgroundOverToken: over }
    return check(role, surface, state, foregroundToken, backgroundToken, min, TEXT, options)
  })
}

const S = CONTRAST_SURFACES
const F = CONTRAST_FOREGROUNDS

/** The frozen audit matrix, ordered deterministically. */
export const CONTRAST_CHECKS: readonly ContrastCheck[] = [
  ...textOn('label-primary', F.primary, [
    ['base', S.base],
    ['sidebar', S.sidebar],
    ['layer', S.layer],
    ['card', S.card],
    ['bubble', S.bubble],
    ['code', S.code],
    ['input', S.input],
    ['menu', S.menu, S.base],
  ], 7),
  ...textOn('label-secondary', F.secondary, [
    ['base', S.base],
    ['sidebar', S.sidebar],
    ['layer', S.layer],
    ['card', S.card],
    ['menu', S.menu, S.base],
  ], 5),
  ...textOn('label-tertiary', F.tertiary, [
    ['base', S.base],
    ['layer', S.layer],
    ['card', S.card],
    ['input', S.input],
    ['menu', S.menu, S.base],
  ], 4.5),
  ...textOn('label-caption', F.caption, [
    ['base', S.base],
    ['layer', S.layer],
    ['card', S.card],
  ], 4.5),
  ...textOn('link', F.link, [
    ['base', S.base],
    ['sidebar', S.sidebar],
    ['layer', S.layer],
    ['card', S.card],
    ['bubble', S.bubble],
  ], 4.5),
  ...textOn('brand', F.brandText, [['base', S.base]], 4.5),
  ...textOn('error', F.error, [
    ['base', S.base],
    ['layer', S.layer],
    ['card', S.card],
    ['bubble', S.bubble],
    ['menu', S.menu, S.base],
  ], 4.5),
  ...textOn('warn', F.warn, [
    ['base', S.base],
    ['layer', S.layer],
    ['card', S.card],
    ['menu', S.menu, S.base],
  ], 4.5),
  ...textOn('success', F.success, [
    ['base', S.base],
    ['layer', S.layer],
    ['card', S.card],
    ['bubble', S.bubble],
  ], 4.5),
  // Placeholder copy paints in the tertiary label role in the host; §18.2 lists
  // it separately, so it gets its own assertions on the surfaces placeholder
  // text appears on (inputs and the layers above them). The token is adjusted
  // through the `label-tertiary` entries above.
  ...textOn('placeholder', F.tertiary, [
    ['input', S.input],
    ['base', S.base],
    ['card', S.card],
  ], 4.5, 'default', false),
  // Toast and tooltip surfaces carry their own inverse label pair.
  ...textOn('toast-label', F.toastLabel, [['toast', S.toast]], 4.5, 'default', false),
  ...textOn('tooltip-label', F.toastLabel, [['tooltip', S.tooltip]], 4.5, 'default', false),
  // on-accent: label on a brand-primary fill (§18.2 `brand` + `on-accent`).
  check('on-accent', 'brand-fill', 'default', F.onAccent, F.brandFill, 4.5, TEXT),
  check('on-accent', 'button-fill', 'default', F.onAccent, F.buttonPrimaryFill, 4.5, TEXT),
  // Interaction states.
  ...textOn('label-primary', F.primary, [['base', S.base, '--dsw-alias-interactive-bg-hover']], 4.5, 'hover'),
  ...textOn('label-primary', F.primary, [['base', S.base, '--dsw-alias-interactive-bg-active']], 4.5, 'active'),
  ...textOn('label-primary', F.primary, [['base', S.base, '--dsw-alias-interactive-bg-hover-accent']], 4.5, 'selected'),
  ...textOn('label-primary', F.primary, [['selection', S.selection]], 4.5, 'selected'),
  ...textOn('disabled-label', F.disabled, [
    ['base', S.base],
    ['layer', S.layer],
    ['card', S.card],
    ['menu', S.menu, S.base],
  ], 3, 'disabled'),
  // Non-text: focus indicator and brand fill against the page surface (§18.2).
  check('focus-ring', 'base', 'focus', F.business, S.base, 3, NON_TEXT),
  check('focus-ring', 'layer', 'focus', F.business, S.layer, 3, NON_TEXT),
  check('focus-ring', 'sidebar', 'focus', F.business, S.sidebar, 3, NON_TEXT),
  check('brand-fill', 'base', 'default', F.brandFill, S.base, 3, NON_TEXT),
] as const

/** Parse a concrete CSS colour value; returns `null` for expressions. */
function parseConcrete(value: string | null | undefined): RgbaColor | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  if (trimmed.startsWith('var(') || trimmed.includes('color-mix(') || trimmed.includes('calc(')) return null
  try {
    return parseColorWithAlpha(trimmed)
  } catch {
    return null
  }
}

/**
 * Resolve a token to a concrete colour for auditing: derived value first, then
 * the frozen stock declaration for that mode from the explicit host snapshot.
 */
export function resolveTokenColor(
  tokens: TokenMap,
  name: string,
  mode: Mode,
  stock: StockSnapshot,
): RgbaColor | null {
  const derived = parseConcrete(tokens[name])
  if (derived !== null) return derived
  const declaration = stock.tokens[name]
  if (declaration === undefined) return null
  const resolved = mode === 'light' ? declaration.resolvedLight : declaration.resolvedDark
  const fromResolved = parseConcrete(resolved)
  if (fromResolved !== null) return fromResolved
  const raw = mode === 'light' ? declaration.light : declaration.dark
  return parseConcrete(raw)
}

/** Alpha-composite `foreground` over an opaque `background`. */
export function compositeOver(foreground: RgbaColor, background: Rgb): Rgb {
  if (foreground.alpha >= 1) return foreground.rgb
  const alpha = foreground.alpha
  return {
    r: foreground.rgb.r * alpha + background.r * (1 - alpha),
    g: foreground.rgb.g * alpha + background.g * (1 - alpha),
    b: foreground.rgb.b * alpha + background.b * (1 - alpha),
  }
}

function opaqueTokenColor(tokens: TokenMap, name: string, mode: Mode, stock: StockSnapshot): Rgb | null {
  const resolved = resolveTokenColor(tokens, name, mode, stock)
  if (resolved === null) return null
  if (resolved.alpha >= 1) return resolved.rgb
  const base = resolveTokenColor(tokens, CONTRAST_SURFACES.base, mode, stock)
  if (base === null) return null
  return compositeOver(resolved, base.rgb)
}

/**
 * Resolve the effective (composited) foreground and background of one check.
 * Returns `null` when a token cannot be resolved to a concrete colour.
 */
export function resolveCheckColors(
  tokens: TokenMap,
  spec: ContrastCheck,
  mode: Mode,
  stock: StockSnapshot,
): { readonly foreground: Rgb; readonly background: Rgb } | null {
  const rawBackground = resolveTokenColor(tokens, spec.backgroundToken, mode, stock)
  if (rawBackground === null) return null
  let background: Rgb
  if (rawBackground.alpha < 1) {
    const over = opaqueTokenColor(tokens, spec.backgroundOverToken ?? CONTRAST_SURFACES.base, mode, stock)
    if (over === null) return null
    background = compositeOver(rawBackground, over)
  } else {
    background = rawBackground.rgb
  }
  const rawForeground = resolveTokenColor(tokens, spec.foregroundToken, mode, stock)
  if (rawForeground === null) return null
  const foreground = rawForeground.alpha < 1 ? compositeOver(rawForeground, background) : rawForeground.rgb
  return { foreground, background }
}

function entryRole(spec: ContrastCheck): string {
  return `${spec.role}/${spec.surface}/${spec.state}`
}

/**
 * Audit every matrix assertion for one compiled variant in one mode. Entries
 * are emitted in `CONTRAST_CHECKS` order; unresolvable token pairs are skipped
 * (they cannot paint a colour and are covered by the token-coverage report).
 */
export function auditContrast(
  variant: CompiledVariant,
  mode: Mode,
  stock: StockSnapshot,
): readonly ContrastEntry[] {
  const entries: ContrastEntry[] = []
  for (const spec of CONTRAST_CHECKS) {
    const resolved = resolveCheckColors(variant.tokens, spec, mode, stock)
    if (resolved === null) continue
    const raw = contrastRatio(resolved.foreground, resolved.background)
    const ratio = Math.round(raw * 1000) / 1000
    entries.push({
      role: entryRole(spec),
      foreground: formatHex(resolved.foreground),
      background: formatHex(resolved.background),
      ratio,
      min: spec.min,
      pass: ratio >= spec.min,
      kind: spec.kind,
    })
  }
  return entries
}

/** Count failures out of the audited total. */
export function summarizeContrast(entries: readonly ContrastEntry[]): {
  readonly failures: number
  readonly total: number
} {
  let failures = 0
  for (const entry of entries) {
    if (!entry.pass) failures += 1
  }
  return { failures, total: entries.length }
}

/** Options for `adjustForContrast`. */
export interface AdjustForContrastOptions {
  /** Iterations of the bounded binary search (default 24). */
  readonly maxSteps?: number
  /** Safety margin above `min` the adjusted colour must reach (default 0.05). */
  readonly margin?: number
}

interface LightnessCandidate {
  readonly l: number
  readonly ratio: number
}

/** Bounded binary search for the lightness closest to `start` that reaches `target`. */
function searchLightness(
  hue: number,
  chroma: number,
  start: number,
  direction: 'darker' | 'lighter',
  target: number,
  background: Rgb,
  steps: number,
): LightnessCandidate {
  const evaluate = (l: number): number =>
    contrastRatio(oklchToRgb(clampToSrgbGamut({ l, c: chroma, h: hue })), background)
  const extreme = direction === 'darker' ? 0 : 1
  const extremeRatio = evaluate(extreme)
  if (extremeRatio < target) return { l: extreme, ratio: extremeRatio }
  let failing = start
  let passing = extreme
  for (let i = 0; i < steps; i += 1) {
    const mid = (failing + passing) / 2
    if (evaluate(mid) >= target) passing = mid
    else failing = mid
  }
  return { l: passing, ratio: evaluate(passing) }
}

/**
 * Move `foreground` in OKLCh lightness (preserving hue and chroma) just far
 * enough to reach `min` contrast against `background`. Bounded binary search,
 * never throws, always returns a concrete `#rrggbb` string.
 */
export function adjustForContrast(
  foreground: string,
  background: string,
  min: number,
  options: AdjustForContrastOptions = {},
): string {
  const fg = parseColor(foreground)
  const bg = parseColor(background)
  const target = min + (options.margin ?? 0.05)
  if (contrastRatio(fg, bg) >= target) return formatHex(fg)

  const lch = rgbToOklch(fg)
  const steps = Math.max(4, Math.min(64, options.maxSteps ?? 24))
  const candidates = [
    searchLightness(lch.h, lch.c, lch.l, 'darker', target, bg, steps),
    searchLightness(lch.h, lch.c, lch.l, 'lighter', target, bg, steps),
  ]
  const prefersDarker = relativeLuminance(bg) >= relativeLuminance(fg)
  const passing = candidates.filter((candidate) => candidate.ratio >= target)
  let chosen: LightnessCandidate
  if (passing.length > 0) {
    chosen = passing.reduce((best, candidate) => {
      const bestDelta = Math.abs(best.l - lch.l)
      const candidateDelta = Math.abs(candidate.l - lch.l)
      if (candidateDelta < bestDelta - 1e-12) return candidate
      if (Math.abs(candidateDelta - bestDelta) <= 1e-12) {
        const bestPrefers = best.l <= lch.l === prefersDarker
        const candidatePrefers = candidate.l <= lch.l === prefersDarker
        return candidatePrefers && !bestPrefers ? candidate : best
      }
      return best
    })
  } else {
    const [first, second] = candidates as [LightnessCandidate, LightnessCandidate]
    chosen = first.ratio >= second.ratio ? first : second
  }
  return formatHex(oklchToRgb(clampToSrgbGamut({ l: chosen.l, c: lch.c, h: lch.h })))
}
