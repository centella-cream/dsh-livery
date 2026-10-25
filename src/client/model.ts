/**
 * Pure model for the Livery client: the runtime snapshot shape, legal state
 * transitions, and the derived-data helpers the runtime and the settings page
 * share (search matching, availability, boot hash comparison).
 *
 * No React, no Cordis, no DOM. This is the unit-testable half of the client;
 * `runtime.ts` owns orchestration and `presenter.ts` owns every DOM write.
 */
import type {
  BootPayload,
  CapabilityDegrade,
  CapabilityMap,
  CompiledLivery,
  LiveryCatalog,
} from '../core/types.js'
import { LIVERY_VERSION, STOCK_ID } from '../core/types.js'

/** Lifecycle states from plan §6.3. */
export type LiveryPhase = 'boot' | 'loading' | 'ready' | 'previewing' | 'degraded' | 'disposed'

/** Outcome of the first-frame handshake. */
export type BootStatus = 'valid' | 'absent' | 'mismatch'

/** State of the one lazy catalog fetch. */
export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

/** Why a settings write did not land. */
export type WriteFailure = 'refused' | 'transport'

/** Color scheme currently resolved by the host theme service. */
export type LiveryMode = 'light' | 'dark'

/** DSH runtime locale ids. */
export type LiveryLocaleId = 'zh' | 'en'

/** Build identity this client was compiled against. */
export interface RuntimeIdentity {
  readonly adapterId: string
  readonly contractHash: string
  readonly pluginVersion: string
  readonly hostVersion: string
}

/** Immutable snapshot published to React through `useSyncExternalStore`. */
export interface LiveryRuntimeSnapshot {
  /** Monotonic revision; bumps on every snapshot replacement. */
  readonly revision: number
  readonly phase: LiveryPhase
  readonly bootStatus: BootStatus
  /** Why the handshake was degraded/rejected, when it was. */
  readonly bootReason: string | undefined
  /** Structured diagnostics the host attached to the boot payload. */
  readonly bootDiagnostics: readonly string[]
  readonly catalogStatus: CatalogStatus
  readonly catalog: LiveryCatalog | undefined
  readonly capabilities: CapabilityMap
  /** Skin id read from the host configuration (may be invalid/unknown). */
  readonly confirmedId: string | undefined
  /** Skin actually presented; `STOCK_ID` when nothing is applied. */
  readonly effectiveId: string | undefined
  /** Transient preview id while `phase === 'previewing'`. */
  readonly previewId: string | undefined
  /** A settings write is crossing the wire. */
  readonly writing: boolean
  /** Last write failure, cleared by the next user action. */
  readonly writeFailure: WriteFailure | undefined
  /** Config form availability. */
  readonly configStatus: 'loading' | 'ready' | 'unavailable'
  /** Whether the host document accepts writes. */
  readonly writable: boolean
  /** Configured skin id that does not exist in the catalog (rendered as stock). */
  readonly invalidSkinId: string | undefined
  /** Required capabilities missing for the configured livery. */
  readonly missingRequired: readonly string[]
  /** Declared-but-unavailable capabilities of the presented livery. */
  readonly degraded: readonly CapabilityDegrade[]
  /** Notes for the self-check/diagnostics copy (technical, host-facing). */
  readonly notes: readonly string[]
  readonly locale: LiveryLocaleId
  readonly themeMode: LiveryMode
  readonly identity: RuntimeIdentity
  /** Certified catalog profile the presented stylesheet/previews belong to. */
  readonly catalogProfile: string | undefined
}

/** Actions the settings page may call on the runtime. */
export interface LiveryRuntimeApi {
  getSnapshot(): LiveryRuntimeSnapshot
  subscribe(listener: () => void): () => void
  /** Enter transient preview (no settings write). */
  preview(id: string): boolean
  /** Leave transient preview, returning to the confirmed livery. */
  cancelPreview(): void
  /** Persist the preview with exactly one config write. */
  commitPreview(): Promise<boolean>
  /** Persist stock appearance (one config write). */
  restoreStock(): Promise<boolean>
  /** Retry the failed settings write (the last commit/restore attempt). */
  retryLastWrite(): Promise<boolean>
  /** Retry the failed catalog fetch. */
  retryCatalog(): Promise<void>
  /** Observe host light/dark changes while the settings page is mounted. */
  observeTheme(): () => void
}

/** Placeholder identity used until a handshake/catalog names the live host. */
export const DEFAULT_IDENTITY: RuntimeIdentity = {
  adapterId: '',
  contractHash: '',
  pluginVersion: LIVERY_VERSION,
  hostVersion: '',
}

/** Legal lifecycle transitions (plan §6.3). */
export const PHASE_TRANSITIONS: Readonly<Record<LiveryPhase, readonly LiveryPhase[]>> = {
  boot: ['loading', 'degraded', 'disposed'],
  loading: ['ready', 'degraded', 'disposed'],
  // `loading` is reachable again only through a catalog retry.
  ready: ['previewing', 'degraded', 'loading', 'disposed'],
  previewing: ['ready', 'degraded', 'disposed'],
  degraded: ['ready', 'previewing', 'loading', 'disposed'],
  disposed: [],
}

/**
 * Whether one lifecycle transition is legal.
 * @param from - current phase.
 * @param to - requested phase.
 * @returns true when the transition is declared in {@link PHASE_TRANSITIONS}.
 */
export function canTransition(from: LiveryPhase, to: LiveryPhase): boolean {
  return from === to || PHASE_TRANSITIONS[from].includes(to)
}

/**
 * Normalize a config form value into a skin id.
 * @param value - decoded `{skinId}` config section (shape checked defensively).
 * @returns the skin id string, or undefined when the section carries none.
 */
export function normalizeSkinId(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const skinId = (value as { skinId?: unknown }).skinId
  return typeof skinId === 'string' && skinId.length > 0 ? skinId : undefined
}

/** Whether a skin id means "no livery". */
export function isStock(id: string | undefined): boolean {
  return id === undefined || id === STOCK_ID
}

/**
 * Sort liveries for the gallery.
 * @param liveries - compiled catalog entries.
 * @returns a new array ordered by manifest `order`, then id.
 */
export function sortLiveries(liveries: readonly CompiledLivery[]): readonly CompiledLivery[] {
  return [...liveries].sort((a, b) => (a.meta.order - b.meta.order) || a.id.localeCompare(b.id))
}

/**
 * Unique tag ids across a catalog, in first-appearance order after sorting.
 * @param liveries - compiled catalog entries.
 * @returns tag ids for filter chips.
 */
export function collectTagIds(liveries: readonly CompiledLivery[]): readonly string[] {
  const seen = new Set<string>()
  for (const livery of sortLiveries(liveries)) {
    for (const tag of livery.meta.tags) if (!seen.has(tag)) seen.add(tag)
  }
  return [...seen]
}

/** Full locale tag used by compiled livery metadata. */
function metadataLocale(locale: LiveryLocaleId): 'zh-CN' | 'en-US' {
  return locale === 'zh' ? 'zh-CN' : 'en-US'
}

/**
 * Localized livery name with the fixed fallback chain: active full locale →
 * the other shipped locale → the id (plan §11.3).
 * @param livery - one compiled livery.
 * @param locale - active DSH locale.
 * @returns display name.
 */
export function localizedName(livery: CompiledLivery, locale: LiveryLocaleId): string {
  const primary = livery.meta.name[metadataLocale(locale)]
  if (primary !== undefined && primary.length > 0) return primary
  const fallback = locale === 'zh' ? livery.meta.name['en-US'] : livery.meta.name['zh-CN']
  return fallback !== undefined && fallback.length > 0 ? fallback : livery.id
}

/**
 * Localized livery description, same fallback chain as {@link localizedName}.
 * @param livery - one compiled livery.
 * @param locale - active DSH locale.
 * @returns display description, or an empty string.
 */
export function localizedDescription(livery: CompiledLivery, locale: LiveryLocaleId): string {
  const primary = livery.meta.description[metadataLocale(locale)]
  if (primary !== undefined && primary.length > 0) return primary
  const fallback = locale === 'zh' ? livery.meta.description['en-US'] : livery.meta.description['zh-CN']
  return fallback ?? ''
}

/** Tag label lookup passed from the settings page (active locale). */
export type TagLabels = Readonly<Record<string, string>>

/**
 * Localized tag label.
 * @param tag - stable tag id.
 * @param labels - active-locale labels by tag id.
 * @returns the label, or the raw id for an unknown tag.
 */
export function tagLabel(tag: string, labels: TagLabels): string {
  const label = labels[tag]
  return label !== undefined && label.length > 0 ? label : tag
}

/** Search/filter state for the gallery. */
export interface LiveryFilter {
  readonly query: string
  readonly tagId: string | undefined
}

/** Case-insensitive substring test. */
function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

/**
 * Whether one livery matches the search text and tag filter.
 *
 * Matches the localized name in both shipped locales, the id, every tag id, and
 * the active-locale tag labels (plan §11.1/§11.2).
 * @param livery - one compiled livery.
 * @param filter - free text and optional tag id.
 * @param labels - active-locale tag labels.
 * @returns true when the livery is included.
 */
export function matchesFilter(
  livery: CompiledLivery,
  filter: LiveryFilter,
  labels: TagLabels,
): boolean {
  if (filter.tagId !== undefined && !livery.meta.tags.includes(filter.tagId)) return false
  const query = filter.query.trim()
  if (query.length === 0) return true
  const haystack = [
    livery.meta.name['zh-CN'],
    livery.meta.name['en-US'],
    livery.id,
    ...livery.meta.tags,
    ...livery.meta.tags.map(tag => tagLabel(tag, labels)),
  ].join('\n')
  return includes(haystack, query)
}

/**
 * Filter and sort the gallery list.
 * @param liveries - compiled catalog entries.
 * @param filter - search text and tag selection.
 * @param labels - active-locale tag labels for matching.
 * @returns liveries to render, in manifest order.
 */
export function filterLiveries(
  liveries: readonly CompiledLivery[],
  filter: LiveryFilter,
  labels: TagLabels,
): readonly CompiledLivery[] {
  return sortLiveries(liveries).filter(livery => matchesFilter(livery, filter, labels))
}

/** Availability verdict for one livery under the live capability map. */
export interface LiveryAvailability {
  /** False when a required host capability is missing (plan §7: not applicable). */
  readonly applicable: boolean
  /** Required capability ids that are not available. */
  readonly missingRequired: readonly string[]
  /** Declared capabilities that fall back, with the fallback actually used. */
  readonly degraded: readonly CapabilityDegrade[]
}

/**
 * Evaluate one livery against the live capability map.
 * @param livery - compiled livery.
 * @param capabilities - host capability facts (from the catalog payload).
 * @returns applicability, missing requirements, and degradation details.
 */
export function liveryAvailability(
  livery: CompiledLivery,
  capabilities: CapabilityMap,
): LiveryAvailability {
  const missingRequired = livery.requiredCapabilities.filter(id => capabilities[id]?.available !== true)
  const declared = livery.audit.degraded
  const extra: CapabilityDegrade[] = []
  for (const id of livery.optionalCapabilities) {
    if (capabilities[id]?.available === true) continue
    if (declared.some(entry => entry.id === id)) continue
    extra.push({ id, reason: 'capability unavailable at runtime', fallback: 'disabled' })
  }
  return {
    applicable: missingRequired.length === 0,
    missingRequired,
    degraded: [...declared, ...extra],
  }
}

/**
 * Contract-level required capabilities that are unavailable.
 * @param capabilities - host capability facts.
 * @returns missing capability ids.
 */
export function missingContractCapabilities(capabilities: CapabilityMap): readonly string[] {
  return Object.values(capabilities)
    .filter(capability => capability.required && !capability.available)
    .map(capability => capability.id)
}

/**
 * Boot hash comparison: the client only adopts the host style element when the
 * computed style text, the handshake payload, and the body attributes all agree
 * on the same id and content hash (plan §6.3 / interfaces.md §4).
 */
export interface BootHashFacts {
  readonly expectedId: string
  readonly expectedHash: string
  readonly bootId: string | undefined
  readonly bootHash: string | undefined
  readonly bodyId: string | null
  readonly bodyHash: string | null
}

/**
 * Whether the host first-frame presentation is byte-identical to what this
 * client would render, so it can be adopted with zero CSS-text writes.
 * @param facts - ids and hashes from the handshake and the live DOM.
 * @returns true when adoption is safe.
 */
export function bootMatchesExpected(facts: BootHashFacts): boolean {
  return facts.expectedHash.length > 0
    && facts.bootId === facts.expectedId
    && facts.bootHash === facts.expectedHash
    && facts.bodyId === facts.expectedId
    && facts.bodyHash === facts.expectedHash
}

/**
 * Short display form of a content hash (`sha256:abcd…` → `abcd…`).
 * @param hash - full hash text.
 * @returns at most the first 12 hex-ish characters after the algorithm prefix.
 */
export function shortHash(hash: string): string {
  const body = hash.startsWith('sha256:') ? hash.slice('sha256:'.length) : hash
  return body.slice(0, 12)
}

/** Preview image filename convention frozen with the compiler. */
export type PreviewMode = LiveryMode

/**
 * Filename of one generated preview image.
 * @param id - livery id.
 * @param locale - DSH locale id.
 * @param mode - color mode.
 * @returns `<id>-<zh|en>-<light|dark>.svg`.
 */
export function previewFileName(id: string, locale: LiveryLocaleId, mode: PreviewMode): string {
  return `${id}-${locale === 'zh' ? 'zh' : 'en'}-${mode}.svg`
}

/**
 * Join a catalog-declared preview base with one preview filename.
 *
 * The base comes from the fetched catalog (`catalog.previewsBase`), which is
 * scoped per catalog profile; the client never reconstructs the host route
 * itself (multi-version.md §6).
 * @param previewsBase - catalog-provided base URL (trailing slash optional).
 * @param fileName - preview file name.
 * @returns the same-origin preview URL.
 */
export function previewAssetUrl(previewsBase: string, fileName: string): string {
  return previewsBase.endsWith('/') ? `${previewsBase}${fileName}` : `${previewsBase}/${fileName}`
}

/**
 * Same-origin URL of one generated preview image.
 * @param previewsBase - catalog-provided preview base URL.
 * @param id - livery id.
 * @param locale - DSH locale id.
 * @param mode - color mode.
 * @returns the preview URL under the catalog's own base.
 */
export function previewUrl(
  previewsBase: string,
  id: string,
  locale: LiveryLocaleId,
  mode: PreviewMode,
): string {
  return previewAssetUrl(previewsBase, previewFileName(id, locale, mode))
}

/** Four seed colors used by the fallback token-swatch mockup. */
export interface PreviewSeeds {
  readonly accent: string
  readonly secondary: string
  readonly surface: string
  readonly text: string
}

/**
 * Seed colors of one livery variant, for the thumbnail fallback mockup.
 * @param livery - compiled livery.
 * @param mode - color mode.
 * @returns the four seed colors.
 */
export function previewSeeds(livery: CompiledLivery, mode: PreviewMode): PreviewSeeds {
  const variant = mode === 'dark' ? livery.dark : livery.light
  return variant.seeds
}

/** Counts used by the self-check panel. */
export interface CapabilityCounts {
  readonly available: number
  readonly total: number
}

/**
 * Count available capabilities.
 * @param capabilities - host capability facts.
 * @returns available/total counts.
 */
export function countCapabilities(capabilities: CapabilityMap): CapabilityCounts {
  const values = Object.values(capabilities)
  return {
    available: values.filter(capability => capability.available).length,
    total: values.length,
  }
}

/**
 * Build the initial (pre-handshake) snapshot.
 * @param identity - build identity this client was compiled against.
 * @param boot - handshake outcome already computed by `handshake.ts`.
 * @returns a frozen starting snapshot in phase `boot`.
 */
export function createInitialSnapshot(
  identity: RuntimeIdentity,
  boot: {
    readonly status: BootStatus
    readonly reason: string | undefined
    readonly diagnostics: readonly string[]
    readonly catalogProfile?: string | undefined
  },
): LiveryRuntimeSnapshot {
  return {
    revision: 0,
    phase: 'boot',
    bootStatus: boot.status,
    bootReason: boot.reason,
    bootDiagnostics: boot.diagnostics,
    catalogStatus: 'idle',
    catalog: undefined,
    capabilities: {},
    confirmedId: undefined,
    effectiveId: undefined,
    previewId: undefined,
    writing: false,
    writeFailure: undefined,
    configStatus: 'loading',
    writable: false,
    invalidSkinId: undefined,
    missingRequired: [],
    degraded: [],
    notes: [],
    locale: 'en',
    themeMode: 'light',
    identity,
    catalogProfile: boot.catalogProfile,
  }
}

/**
 * Handshake payload diagnostics joined for the self-check copy.
 * @param payload - accepted boot payload, when there is one.
 * @returns host-provided diagnostic lines.
 */
export function bootDiagnosticsOf(payload: BootPayload | undefined): readonly string[] {
  return payload?.diagnostics ?? []
}
