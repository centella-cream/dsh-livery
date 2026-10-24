/**
 * Localized display names for the stable capability ids that appear in the
 * degradation report. Unknown ids fall back to the verbatim id, which is what a
 * maintainer needs when a future contract adds a capability before this client
 * learns a name for it.
 */
import { formatList } from '../../i18n/index.js'
import type { LiveryKey } from '../../i18n/index.js'
import type { LiveryLocaleId } from '../model.js'
import type { LiveryTranslate } from '../platform.js'

const CAPABILITY_KEYS: Readonly<Record<string, LiveryKey>> = {
  'theme-css': 'capability.theme-css',
  'host-font-family': 'capability.host-font-family',
  'surface-material': 'capability.surface-material',
  'host-density-tokens': 'capability.host-density-tokens',
  'host-transcript-width': 'capability.host-transcript-width',
  'host-message-flow': 'capability.host-message-flow',
}

/**
 * Localized label for one capability id.
 * @param t - dictionary-bound translate.
 * @param id - stable capability id.
 * @returns the localized name, or the raw id when this client has no label.
 */
export function capabilityLabel(t: LiveryTranslate, id: string): string {
  const key = CAPABILITY_KEYS[id]
  return key === undefined ? id : t(key)
}

/**
 * Localized prose list of capability ids for notices and self-check copy.
 * @param t - dictionary-bound translate.
 * @param locale - active DSH locale (Intl list formatting).
 * @param ids - capability ids.
 * @returns a locale-formatted, localized list.
 */
export function capabilityList(
  t: LiveryTranslate,
  locale: LiveryLocaleId,
  ids: readonly string[],
): string {
  return formatList(locale, ids.map(id => capabilityLabel(t, id)))
}
