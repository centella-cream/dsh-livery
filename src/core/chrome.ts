/**
 * DSH Livery — component-chrome recipes (the third presentation axis).
 *
 * Palette, typography and surface shape are separate axes; this module owns the
 * fourth: how the shell's component fills relate to the page. Recipes are pure
 * functions of the livery seeds and mode, so every palette keeps readable
 * contrast instead of inheriting one hard-coded chrome from another theme.
 *
 * Chrome may only author the consumed component-fill tokens below. It never
 * touches layout, shape, elevation, text colours or host component selectors;
 * the compile-time contrast matrix remains the authority on legibility.
 */
import type { ChromeStyleId, Mode, Seeds, TokenMap } from './types.js'
import { contrastRatio, formatHex, mixOklab, parseColor } from './color.js'

/** Consumed component fills a chrome recipe may author. */
export const CHROME_TOKEN_NAMES: readonly string[] = [
  '--dsw-specific-sidebar-fill',
  '--dsw-specific-sidebar-nav-item-hover',
  '--dsw-specific-sidebar-nav-item-active',
  '--dsw-specific-sidebar-nav-item-active-accent',
  '--dsw-specific-input-major',
  '--dsw-specific-bubble',
  '--dsw-specific-bubble-highlight',
  '--dsw-specific-selector',
] as const

/** All chrome recipes, in display/rank order. */
export const CHROME_STYLES: readonly ChromeStyleId[] = [
  'plain',
  'tinted',
  'outline',
  'terminal',
  'editorial',
  'poster',
] as const

/** One recipe's human note (diagnostics and docs). */
export interface ChromeStyleInfo {
  readonly id: ChromeStyleId
  readonly note: string
}

/** Registered recipe metadata, in display order. */
export const CHROME_STYLE_INFO: Readonly<Record<ChromeStyleId, ChromeStyleInfo>> = {
  plain: { id: 'plain', note: 'Stock component relationship: page, rail and bubble keep their host fills.' },
  tinted: { id: 'tinted', note: 'Accent-tinted rail, composer and bubble at low mix amounts.' },
  outline: { id: 'outline', note: 'Page-coloured component fills; the active rail row is carried by its accent mark.' },
  terminal: { id: 'terminal', note: 'Darker rail, page-coloured composer and a faint accent active row.' },
  editorial: { id: 'editorial', note: 'Paper-coloured rail and composer; bubbles use only a text tint.' },
  poster: { id: 'poster', note: 'Strong accent blocks on the rail, bubble and selected controls.' },
}

type Recipe = (mode: Mode, seeds: Seeds) => TokenMap

/** Mix one seed toward another in OKLab and return an opaque hex value. */
function mixTo(from: string, to: string, amount: number): string {
  return formatHex(mixOklab(parseColor(from), parseColor(to), amount))
}

/** Accent-tinted surface at one mix amount. */
function accentMix(seeds: Seeds, amount: number): string {
  return mixTo(seeds.surface, seeds.accent, amount)
}

/** Text-tinted surface at one mix amount. */
function textMix(seeds: Seeds, amount: number): string {
  return mixTo(seeds.surface, seeds.text, amount)
}

/** Near-black shade of the surface, for the dark terminal rail. */
function shade(seeds: Seeds, amount: number): string {
  return mixTo(seeds.surface, '#000000', amount)
}

/** A selected-state accent that stays visibly distinct from its sidebar fill. */
function visibleAccent(sidebarFill: string, seeds: Seeds): string {
  const fill = parseColor(sidebarFill)
  const fillHex = formatHex(fill).toLowerCase()
  const accent = parseColor(seeds.accent)
  for (const amount of [0.26, 0.32, 0.38, 0.46, 0.54, 0.62, 0.70, 0.78, 0.86]) {
    const candidate = formatHex(mixOklab(fill, accent, amount))
    if (candidate.toLowerCase() !== fillHex && contrastRatio(parseColor(candidate), fill) >= 1.32) return candidate
  }
  const text = parseColor(seeds.text)
  for (const amount of [0.2, 0.4, 0.6, 0.8]) {
    const candidate = formatHex(mixOklab(accent, text, amount))
    if (candidate.toLowerCase() !== fillHex && contrastRatio(parseColor(candidate), fill) >= 1.32) return candidate
  }
  return formatHex(text)
}

const RECIPES: Readonly<Record<ChromeStyleId, Recipe>> = {
  plain: (_mode, seeds) => ({
    '--dsw-specific-sidebar-fill': seeds.surface,
    '--dsw-specific-sidebar-nav-item-active-accent': visibleAccent(seeds.surface, seeds),
  }),
  tinted: (_mode, seeds) => ({
    '--dsw-specific-sidebar-fill': accentMix(seeds, 0.12),
    '--dsw-specific-sidebar-nav-item-hover': accentMix(seeds, 0.05),
    '--dsw-specific-sidebar-nav-item-active': accentMix(seeds, 0.20),
    '--dsw-specific-sidebar-nav-item-active-accent': visibleAccent(accentMix(seeds, 0.12), seeds),
    '--dsw-specific-input-major': accentMix(seeds, 0.03),
    '--dsw-specific-bubble': accentMix(seeds, 0.1),
    '--dsw-specific-bubble-highlight': accentMix(seeds, 0.16),
    '--dsw-specific-selector': accentMix(seeds, 0.08),
  }),
  outline: (_mode, seeds) => ({
    '--dsw-specific-sidebar-fill': seeds.surface,
    '--dsw-specific-sidebar-nav-item-hover': textMix(seeds, 0.03),
    '--dsw-specific-sidebar-nav-item-active': seeds.surface,
    '--dsw-specific-sidebar-nav-item-active-accent': visibleAccent(seeds.surface, seeds),
    '--dsw-specific-input-major': seeds.surface,
    '--dsw-specific-bubble': seeds.surface,
    '--dsw-specific-bubble-highlight': textMix(seeds, 0.04),
    '--dsw-specific-selector': seeds.surface,
  }),
  terminal: (mode, seeds) => {
    const fill = mode === 'light' ? shade(seeds, 0.06) : shade(seeds, 0.25)
    return {
      '--dsw-specific-sidebar-fill': fill,
      '--dsw-specific-sidebar-nav-item-hover': accentMix(seeds, 0.20),
      '--dsw-specific-sidebar-nav-item-active': accentMix(seeds, 0.14),
      '--dsw-specific-sidebar-nav-item-active-accent': visibleAccent(fill, seeds),
    '--dsw-specific-input-major': seeds.surface,
    '--dsw-specific-bubble': mode === 'light' ? textMix(seeds, 0.04) : textMix(seeds, 0.06),
      '--dsw-specific-bubble-highlight': mode === 'light' ? textMix(seeds, 0.07) : textMix(seeds, 0.09),
      '--dsw-specific-selector': seeds.surface,
    }
  },
  editorial: (_mode, seeds) => ({
    '--dsw-specific-sidebar-fill': seeds.surface,
    '--dsw-specific-sidebar-nav-item-hover': seeds.surface,
    '--dsw-specific-sidebar-nav-item-active': seeds.surface,
    '--dsw-specific-sidebar-nav-item-active-accent': visibleAccent(seeds.surface, seeds),
    '--dsw-specific-input-major': seeds.surface,
    '--dsw-specific-bubble': textMix(seeds, 0.04),
    '--dsw-specific-bubble-highlight': textMix(seeds, 0.07),
    '--dsw-specific-selector': seeds.surface,
  }),
  poster: (_mode, seeds) => ({
    '--dsw-specific-sidebar-fill': accentMix(seeds, 0.14),
    '--dsw-specific-sidebar-nav-item-hover': accentMix(seeds, 0.1),
    '--dsw-specific-sidebar-nav-item-active': accentMix(seeds, 0.24),
    '--dsw-specific-sidebar-nav-item-active-accent': visibleAccent(accentMix(seeds, 0.14), seeds),
    '--dsw-specific-input-major': seeds.surface,
    '--dsw-specific-bubble': accentMix(seeds, 0.2),
    '--dsw-specific-bubble-highlight': accentMix(seeds, 0.28),
    '--dsw-specific-selector': accentMix(seeds, 0.20),
  }),
}

/**
 * Resolve one chrome recipe for a mode.
 * @param id - registered chrome id.
 * @param mode - light or dark variant.
 * @param seeds - the variant's four source colours.
 * @returns concrete component-fill tokens (empty for `plain`).
 */
export function chromeTokens(id: ChromeStyleId, mode: Mode, seeds: Seeds): TokenMap {
  return RECIPES[id](mode, seeds)
}

/**
 * True when a value is one of the chrome ids (schema/defensive config input).
 * @param value - unknown value.
 * @returns whether it is a registered id.
 */
export function isChromeStyleId(value: unknown): value is ChromeStyleId {
  return typeof value === 'string' && (CHROME_STYLES as readonly string[]).includes(value)
}
