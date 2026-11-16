/**
 * Human-readable "style DNA" for gallery cards.
 *
 * A palette alone does not explain how a style changes the DSH shell, so every
 * card carries two traits: the surface recipe (shape/material language) and the
 * UI type family. They are derived from compiled data only — no second manifest
 * field and no duplicated taxonomy — so a style can never advertise a recipe it
 * does not ship.
 */
import type { CompiledLivery, SurfaceStyleId } from '../../core/types.js'
import type { LiveryTranslate } from '../platform.js'
import type { LiveryKey } from '../../i18n/index.js'

/** UI type families the gallery can name without loading any font. */
export type StyleTypeFamily = 'sans' | 'serif' | 'mono' | 'display' | 'rounded'

/** i18n key for one surface recipe's card label. */
export type DnaShapeKey =
  | 'dna.shape.solid'
  | 'dna.shape.soft'
  | 'dna.shape.glass'
  | 'dna.shape.flat'
  | 'dna.shape.sharp'
  | 'dna.shape.rounded'
  | 'dna.shape.paper'
  | 'dna.shape.elevated'
  | 'dna.shape.terminal'
  | 'dna.shape.brutal'
  | 'dna.shape.pill'
  | 'dna.shape.editorial'

/** i18n key for one UI type family's card label. */
export type DnaTypeKey =
  | 'dna.type.sans'
  | 'dna.type.serif'
  | 'dna.type.mono'
  | 'dna.type.display'
  | 'dna.type.rounded'

/** Dictionary key of a surface recipe's shape label. */
export function shapeLabelKey(surface: SurfaceStyleId): DnaShapeKey {
  switch (surface) {
    case 'solid': return 'dna.shape.solid'
    case 'soft': return 'dna.shape.soft'
    case 'glass': return 'dna.shape.glass'
    case 'flat': return 'dna.shape.flat'
    case 'sharp': return 'dna.shape.sharp'
    case 'rounded': return 'dna.shape.rounded'
    case 'paper': return 'dna.shape.paper'
    case 'elevated': return 'dna.shape.elevated'
    case 'terminal': return 'dna.shape.terminal'
    case 'brutal': return 'dna.shape.brutal'
    case 'pill': return 'dna.shape.pill'
    case 'editorial': return 'dna.shape.editorial'
  }
}

/** Dictionary key of a UI type family's label. */
export function typeLabelKey(family: StyleTypeFamily): DnaTypeKey {
  switch (family) {
    case 'sans': return 'dna.type.sans'
    case 'serif': return 'dna.type.serif'
    case 'mono': return 'dna.type.mono'
    case 'display': return 'dna.type.display'
    case 'rounded': return 'dna.type.rounded'
  }
}

/**
 * Classify a resolved UI font stack into one display family.
 *
 * The registry stacks are local-only and have stable primary names, so this is a
 * presentation hint, not a font loader: an unknown stack falls back to `sans`.
 * @param stack - resolved `font-family` stack.
 * @returns the family used by the card DNA label.
 */
export function typeFamilyOf(stack: string): StyleTypeFamily {
  const value = stack.toLowerCase()
  if (/mono|consolas|menlo|sfmono/.test(value)) return 'mono'
  if (/rounded|sf pro rounded|arial rounded/.test(value)) return 'rounded'
  if (/futura|century gothic|trebuchet/.test(value)) return 'display'
  // `sans-serif` contains the substring `serif`; resolve generic sans first.
  if (/sans-serif|system-ui|-apple-system/.test(value)) return 'sans'
  if (/serif|songti|palatino|georgia|times/.test(value)) return 'serif'
  return 'sans'
}

/** The two visible traits of one style. */
export interface StyleDna {
  readonly shape: StyleDnaKeyValue
  readonly type: StyleDnaKeyValue
  readonly labels: readonly [string, string]
}

/** One localized trait label plus its dictionary key (for tests/diagnostics). */
export interface StyleDnaKeyValue {
  readonly key: LiveryKey
  readonly label: string
}

/**
 * Derive the localized traits of one style for the gallery card.
 * @param livery - compiled style.
 * @param locale - active DSH locale (`zh`/`en`).
 * @param t - active-locale translator.
 * @returns shape + type labels in stable order.
 */
export function styleDna(
  livery: CompiledLivery,
  locale: 'zh' | 'en',
  t: LiveryTranslate,
): StyleDna {
  const shapeKey = shapeLabelKey(livery.layout.surfaceStyle)
  const stack = livery.typography.ui[locale === 'zh' ? 'zh-CN' : 'en-US']
  const typeKey = typeLabelKey(typeFamilyOf(stack))
  return {
    shape: { key: shapeKey, label: t(shapeKey) },
    type: { key: typeKey, label: t(typeKey) },
    labels: [t(shapeKey), t(typeKey)],
  }
}
