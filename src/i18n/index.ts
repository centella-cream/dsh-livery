/**
 * Typed zh/en dictionary registry for the `dsh-livery` locale namespace.
 *
 * The DSH locale ids are exactly `zh` and `en` (never `zh-CN`/`en-US`); the
 * full BCP 47 tags are only used for `Intl` formatting and for the compiled
 * livery metadata keys. `getDictionary` is the single accessor the settings UI
 * uses when it needs dictionary values outside a slot-bound `t` seat.
 */
import { enUS, type LiveryKey } from './en-US.js'
import { zhCN } from './zh-CN.js'

export type { LiveryKey }
export { enUS, zhCN }

/** Runtime locale ids shipped by DSH. */
export type LiveryLocaleId = 'zh' | 'en'

/** A complete dictionary: exactly the namespace key union. */
export type LiveryDictionary = Record<LiveryKey, string>

/** Locale ids in display order (matches the shipped locale catalog). */
export const LIVERY_LOCALES: readonly LiveryLocaleId[] = ['zh', 'en']

/** Full BCP 47 tags used for `Intl` formatting. */
export const LOCALE_TAGS: Readonly<Record<LiveryLocaleId, string>> = {
  zh: 'zh-CN',
  en: 'en-US',
}

/** Every shipped dictionary, keyed by DSH locale id. */
export const dictionaries: Readonly<Record<LiveryLocaleId, LiveryDictionary>> = {
  zh: zhCN,
  en: enUS,
}

/**
 * Dictionary for one active locale.
 * @param active - DSH locale id (`zh` or `en`).
 * @returns the complete dictionary; unknown ids fall back to English, matching
 * the host locale runtime's own fallback.
 */
export function getDictionary(active: string | undefined): LiveryDictionary {
  return active === 'zh' ? zhCN : enUS
}

/**
 * Full BCP 47 tag for one DSH locale id.
 * @param active - DSH locale id.
 * @returns `zh-CN` for `zh`, `en-US` otherwise.
 */
export function localeTag(active: string | undefined): string {
  return active === 'zh' ? LOCALE_TAGS.zh : LOCALE_TAGS.en
}

/**
 * Format an integer with the active locale's digit grouping.
 * @param active - DSH locale id.
 * @param value - number to format.
 * @returns localized number text.
 */
export function formatNumber(active: string | undefined, value: number): string {
  return new Intl.NumberFormat(localeTag(active)).format(value)
}

/**
 * Format a contrast ratio with up to two fraction digits.
 * @param active - DSH locale id.
 * @param value - ratio (`4.5` for 4.5:1).
 * @returns localized ratio number text without the `:1` suffix.
 */
export function formatRatio(active: string | undefined, value: number): string {
  return new Intl.NumberFormat(localeTag(active), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Join a list with the active locale's conjunction (for prose), not a comma
 * dump.
 * @param active - DSH locale id.
 * @param items - already-localized labels.
 * @returns the locale-formatted list.
 */
export function formatList(active: string | undefined, items: readonly string[]): string {
  return new Intl.ListFormat(localeTag(active), { style: 'long', type: 'conjunction' }).format([...items])
}

/**
 * Format a timestamp with the active locale's date and time pattern.
 * @param active - DSH locale id.
 * @param value - `Date` or epoch milliseconds.
 * @returns localized date-time text.
 */
export function formatDateTime(active: string | undefined, value: Date | number): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(localeTag(active), { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

/** Characters used by the "looks untranslated" heuristic. */
const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
/** Latin letters outside `{placeholder}` tokens. */
const LATIN = /[A-Za-z]/

/** Strip `{name}` template placeholders and tag-ish tokens before inspecting prose. */
function proseOf(value: string): string {
  return value.replace(/\{[^}]*\}/g, '').replace(/\b[A-Z]{2,}\b/g, '')
}

/**
 * Keys whose value is a pure formatting template and legitimately identical in
 * every language (placeholders, separators, product names).
 */
export const SHARED_VALUE_KEYS: readonly LiveryKey[] = [
  'about.plugin',
  'current.idLabel',
  'diag.line',
  'diag.capabilityLine',
  'diag.ratio',
  'diag.count',
]

/**
 * Key-set diff between two dictionaries.
 * @param a - first dictionary.
 * @param b - second dictionary.
 * @returns keys present only in `a`, and keys present only in `b`.
 */
export function dictionaryKeyDiff(
  a: Readonly<Record<string, string>>,
  b: Readonly<Record<string, string>>,
): { readonly missing: readonly string[]; readonly extra: readonly string[] } {
  const aKeys = new Set(Object.keys(a))
  const bKeys = new Set(Object.keys(b))
  return {
    missing: [...bKeys].filter(key => !aKeys.has(key)).sort(),
    extra: [...aKeys].filter(key => !bKeys.has(key)).sort(),
  }
}

/**
 * Heuristic for keys that look untranslated rather than merely identical.
 *
 * Flags: an English value containing Han characters, a Chinese value with no
 * Han characters (unless it is a pure-format/product-name key or contains no
 * prose at all), and identical prose between locales.
 * @param a - dictionary to compare (the Chinese one in tests).
 * @param b - reference dictionary (the English one in tests).
 * @param options.allowIdentical - keys allowed to share a value.
 * @returns suspicious keys, sorted.
 */
export function findUntranslatedKeys(
  a: Readonly<Record<string, string>>,
  b: Readonly<Record<string, string>>,
  options: { readonly allowIdentical?: readonly string[] } = {},
): readonly string[] {
  const allowed = new Set<string>([...SHARED_VALUE_KEYS, ...(options.allowIdentical ?? [])])
  const suspicious = new Set<string>()
  for (const key of Object.keys(a)) {
    const value = a[key]
    if (value === undefined) continue
    if (HAN.test(value)) {
      // A value with Han characters is a Chinese translation; fine here.
      continue
    }
    if (allowed.has(key)) continue
    const prose = proseOf(value)
    if (!LATIN.test(prose)) continue
    if (b[key] === value) {
      suspicious.add(key)
      continue
    }
    // Chinese without a single Han character where the reference has prose.
    const reference = b[key] === undefined ? '' : proseOf(b[key] as string)
    if (LATIN.test(reference)) suspicious.add(key)
  }
  return [...suspicious].sort()
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Settings page copy owned by the Livery client bundle. */
    'dsh-livery': LiveryKey
  }
}
