/**
 * `kind: 'style'` wallpaper core — the generated, token-only "follow style"
 * background.
 *
 * Unlike the 24 bundled designs this is not a stored CSS string: it is one
 * frozen recipe derived from the active livery's catalog tokens, so following
 * the style keeps working with every future livery and never introduces a
 * `url(...)`, blob, IndexedDB row or cache record.
 *
 * The recipe is pure and deterministic: the token names are resolved to the
 * mode's own compiled values, which is what makes the light and dark images
 * byte-different for the same livery while the same token map always produces
 * the same bytes. Mix percentages are global constants — never per-livery
 * overrides (a contrast failure is fixed by adjusting the constants).
 */
import type { TokenMap } from '../../core/types.js'

/** Supported style variants (one per shipped recipe). */
export const STYLE_WALLPAPER_VARIANTS = ['mesh'] as const

/** Stable style variant id. */
export type StyleWallpaperVariant = typeof STYLE_WALLPAPER_VARIANTS[number]

/**
 * Catalog tokens the mesh recipe consumes. All must be present in the mode's
 * token map; a missing/unusable token fails closed instead of painting a
 * half-resolved layer.
 */
export const STYLE_WALLPAPER_TOKENS: readonly string[] = [
  '--dsw-alias-brand-primary',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-2',
]

/** Global mix percentages of the mesh recipe (frozen; never per-style). */
export const STYLE_PRIMARY_MIX = 24
export const STYLE_LAYER3_MIX = 18

/** Geometry of the two radial stops, exported for audit tests. */
export const STYLE_PRIMARY_RADIAL = { size: '120% 140%', at: '12% 0%', stop: '55%' } as const
export const STYLE_LAYER3_RADIAL = { size: '110% 130%', at: '88% 18%', stop: '60%' } as const
/** Angle of the base linear gradient. */
export const STYLE_BASE_ANGLE = '160deg'

/** Longest accepted raw token value (defence in depth; catalog values are short). */
const MAX_TOKEN_VALUE_LENGTH = 256

/**
 * Shapes that must never appear inside an inlined token value: they could break
 * out of the declaration or smuggle a remote/executable payload.
 */
const UNSAFE_TOKEN_VALUE = /[\u0000-\u001F\u007F;{}]|url\s*\(|!important|\/\*/i

/**
 * Whether an unknown value is a supported style variant.
 * @param value - untrusted value (storage/preset/UI).
 * @returns true for the shipped variant ids.
 */
export function isStyleWallpaperVariant(value: unknown): value is StyleWallpaperVariant {
  return typeof value === 'string' && (STYLE_WALLPAPER_VARIANTS as readonly string[]).includes(value)
}

/** Read one usable raw token value, or undefined when absent/unsafe. */
function tokenValue(tokens: TokenMap, name: string): string | undefined {
  const value = tokens[name]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_TOKEN_VALUE_LENGTH) return undefined
  if (UNSAFE_TOKEN_VALUE.test(trimmed)) return undefined
  return trimmed
}

/**
 * Build the deterministic CSS `background-image` value of one style variant for
 * one mode's catalog tokens.
 *
 * The frozen recipe (plan §4.3):
 * ```
 * radial-gradient(120% 140% at 12% 0%,
 *   color-mix(in srgb, <brand-primary> 24%, transparent) 0%, transparent 55%),
 * radial-gradient(110% 130% at 88% 18%,
 *   color-mix(in srgb, <bg-layer-3> 18%, transparent) 0%, transparent 60%),
 * linear-gradient(160deg, <bg-base> 0%, <bg-layer-2> 100%)
 * ```
 * `--dsw-alias-brand-primary` / `--dsw-alias-bg-layer-3` / `--dsw-alias-bg-base`
 * / `--dsw-alias-bg-layer-2` are resolved from `tokens` because the function is
 * per-mode: the same call with the light map vs the dark map must return the
 * two mode-specific images.
 * @param tokens - compiled token map of one mode (light or dark).
 * @param variant - style variant (defaults to the only shipped recipe, `mesh`).
 * @returns the CSS value, or undefined when a required token is absent/unusable.
 */
export function styleWallpaperImage(
  tokens: TokenMap,
  variant: StyleWallpaperVariant = 'mesh',
): string | undefined {
  const primary = tokenValue(tokens, '--dsw-alias-brand-primary')
  const layer3 = tokenValue(tokens, '--dsw-alias-bg-layer-3')
  const base = tokenValue(tokens, '--dsw-alias-bg-base')
  const layer2 = tokenValue(tokens, '--dsw-alias-bg-layer-2')
  if (primary === undefined || layer3 === undefined || base === undefined || layer2 === undefined) return undefined
  switch (variant) {
    case 'mesh':
      return `radial-gradient(${STYLE_PRIMARY_RADIAL.size} at ${STYLE_PRIMARY_RADIAL.at},`
        + ` color-mix(in srgb, ${primary} ${STYLE_PRIMARY_MIX}%, transparent) 0%,`
        + ` transparent ${STYLE_PRIMARY_RADIAL.stop}),`
        + ` radial-gradient(${STYLE_LAYER3_RADIAL.size} at ${STYLE_LAYER3_RADIAL.at},`
        + ` color-mix(in srgb, ${layer3} ${STYLE_LAYER3_MIX}%, transparent) 0%,`
        + ` transparent ${STYLE_LAYER3_RADIAL.stop}),`
        + ` linear-gradient(${STYLE_BASE_ANGLE}, ${base} 0%, ${layer2} 100%)`
    default:
      // Unknown variants are rejected at every untrusted boundary; this branch
      // keeps a corrupt in-memory value from painting a layer.
      return undefined
  }
}
