/**
 * Style-family taxonomy for the gallery.
 *
 * The 24 built-in styles carry 16 stable tag ids; the gallery groups them into
 * six presentation families so the primary filter row stays compact and the
 * cards read as families instead of one long wall. Families are DEMERITED from
 * tags (not a second data source): deterministic, priority-ordered, and
 * presentation-only — they never affect compilation, capability checks or the
 * applied stylesheet.
 *
 * Pure: no React, no DOM, no Cordis.
 */
import type { CompiledLivery } from '../../core/types.js'

/** The six gallery families, in display order. */
export type StyleFamilyId = 'calm' | 'nature' | 'retro' | 'dark' | 'light' | 'vivid'

/** Families in display order (sections and primary chips follow this order). */
export const STYLE_FAMILIES: readonly StyleFamilyId[] = ['calm', 'nature', 'light', 'retro', 'vivid', 'dark']

/**
 * Tag → family mapping, in priority order. A style with tags in several
 * families belongs to the first family in this list (so `["calm","organic"]`
 * is Calm, not Nature). `ink` folds into light with `paper`: both are the
 * paper/ink material family in the design table.
 */
const TAG_FAMILY_PRIORITY: readonly (readonly [StyleFamilyId, readonly string[]])[] = [
  // `nature` leads so organic+calm styles (moss/everforest/celadon) are not all
  // absorbed by `calm`; every family must have members in the shipped set.
  ['nature', ['organic']],
  ['calm', ['calm', 'elegant', 'muted']],
  ['light', ['cool', 'paper', 'ink']],
  ['retro', ['retro', 'warm', 'classic']],
  ['vivid', ['neon', 'playful', 'contrast']],
  ['dark', ['deep', 'neutral', 'tech']],
]

/** Fallback for an unknown tag vocabulary keeps deterministic grouping. */
export const FALLBACK_FAMILY: StyleFamilyId = 'calm'

/**
 * Derive the display family of one style from its tag ids.
 * @param livery - compiled style (only `meta.tags` is read).
 * @returns the highest-priority matching family, or {@link FALLBACK_FAMILY}.
 */
export function familyOf(livery: Pick<CompiledLivery, 'meta'>): StyleFamilyId {
  const tags = livery.meta.tags
  for (const [family, familyTags] of TAG_FAMILY_PRIORITY) {
    if (familyTags.some(tag => tags.includes(tag))) return family
  }
  return FALLBACK_FAMILY
}

/** One family section of the gallery. */
export interface FamilyGroup {
  readonly family: StyleFamilyId
  readonly liveries: readonly CompiledLivery[]
}

/**
 * Group styles into family sections in family order.
 * @param liveries - filtered styles, already in display order within families.
 * @param active - when set, only that family is returned.
 * @returns non-empty family groups in {@link STYLE_FAMILIES} order.
 */
export function groupByFamily(
  liveries: readonly CompiledLivery[],
  active?: StyleFamilyId | undefined,
): readonly FamilyGroup[] {
  const groups: FamilyGroup[] = []
  for (const family of STYLE_FAMILIES) {
    if (active !== undefined && family !== active) continue
    const members = liveries.filter(livery => familyOf(livery) === family)
    if (members.length > 0) groups.push({ family, liveries: members })
  }
  return groups
}

/** i18n key holding one family's localized label. */
export type FamilyLabelKey =
  | 'family.calm'
  | 'family.nature'
  | 'family.retro'
  | 'family.dark'
  | 'family.light'
  | 'family.vivid'

/**
 * Dictionary key of one family's label.
 * @param family - family id.
 * @returns the `family.<id>` dictionary key.
 */
export function familyLabelKey(family: StyleFamilyId): FamilyLabelKey {
  switch (family) {
    case 'calm': return 'family.calm'
    case 'nature': return 'family.nature'
    case 'retro': return 'family.retro'
    case 'dark': return 'family.dark'
    case 'light': return 'family.light'
    case 'vivid': return 'family.vivid'
  }
}

/**
 * Flatten family groups into the single global card order the roving focus uses
 * (sections are presentation-only; keyboard movement is one continuous list).
 * @param groups - grouped styles.
 * @returns all styles in rendered order.
 */
export function flattenGroups(groups: readonly FamilyGroup[]): readonly CompiledLivery[] {
  return groups.flatMap(group => [...group.liveries])
}

/**
 * Target card index for a keyboard key within the flattened card list.
 *
 * Arrow keys move across family-section boundaries (`←/→` by one, `↑/↓` by one
 * grid row), `Home`/`End` jump to the first/last card. Out-of-range targets
 * clamp to the ends (the browser keeps focus where it is at an edge). Activation
 * keys (`Enter`/`Space`) return `undefined`; the caller handles them separately.
 * @param key - `KeyboardEvent.key`.
 * @param index - current card index.
 * @param count - number of cards in the flattened list.
 * @param columns - current rendered column count (for up/down).
 * @returns the next index, or undefined when the key is not a movement key.
 */
export function cardKeyTarget(
  key: string,
  index: number,
  count: number,
  columns: number,
): number | undefined {
  if (count <= 0) return undefined
  const last = count - 1
  let target: number
  switch (key) {
    case 'ArrowRight': target = index + 1; break
    case 'ArrowLeft': target = index - 1; break
    case 'ArrowDown': target = index + Math.max(1, columns); break
    case 'ArrowUp': target = index - Math.max(1, columns); break
    case 'Home': target = 0; break
    case 'End': target = last; break
    default: return undefined
  }
  return Math.max(0, Math.min(last, target))
}
