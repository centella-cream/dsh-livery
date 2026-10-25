/**
 * DSH Livery — shared contract types.
 *
 * This module is deliberately free of React, Cordis and DSH imports: the same
 * types are compiled into the Host bundle, the Client bundle and the build-time
 * compiler. Everything here is data, never behaviour that touches a runtime.
 */

/** Livery manifest / compiled artifact schema version. */
export const SCHEMA_VERSION = 1 as const

/** DSH Livery release line. */
export const LIVERY_VERSION = '0.1.0' as const

/**
 * Adapter identity of the oldest certified host build. Runtime selection always
 * goes through the generated adapter registry, never through this constant; it
 * only exists for fixtures and build-time defaults.
 */
export const ADAPTER_ID = 'dsh-0.2.0-rc.2-r1' as const

/** Browser build target promised by the Web profile support statement. */
export const CLIENT_TARGET = 'chrome120' as const

/** Node engine range read from the target DSH contract (do not widen here). */
export const NODE_RANGE = '^22.19.0 || >=24.0.0' as const

/** Public body attribute owning the active livery. Only Livery writes it. */
export const BODY_ATTRIBUTE = 'data-dsh-livery' as const
/** Public opt-out attribute read on third-party plugin roots. */
export const QUIET_ATTRIBUTE = 'data-dsh-livery-quiet' as const
/** Client-owned attribute carrying the content hash of the applied CSS. */
export const HASH_ATTRIBUTE = 'data-dsh-livery-hash' as const
/** Boot style element id (host-injected first frame). */
export const BOOT_STYLE_ID = 'dsh-livery-boot' as const
/** Client-owned style element ids. */
export const TOKEN_STYLE_ID = 'dsh-livery-tokens' as const
export const LAYOUT_STYLE_ID = 'dsh-livery-layout' as const
export const PREVIEW_STYLE_ID = 'dsh-livery-preview' as const
/** Data owner marker that DSH's plugin lifecycle reclaims (`style[data-plugin]`). */
export const PLUGIN_MARKER = 'dsh-livery' as const
/** Global carrying the first-frame handshake payload. */
export const BOOT_GLOBAL = '__DSH_LIVERY_BOOT__' as const
/** Loader entry id used by `ctx.configForms.get(entryId)`. */
export const ENTRY_ID = 'livery' as const
/** Locale namespace for the client dictionary. */
export const LOCALE_NS = 'dsh-livery' as const
/** Read-only catalog route served by the Host. */
export const CATALOG_ROUTE = '/livery/api/catalog' as const
/** Read-only preview asset route prefix; the Host serves `<prefix><catalogProfile>/<file>`. */
export const PREVIEW_ROUTE_PREFIX = '/livery/assets/previews/' as const
/** CSS cascade layer holding host-node compensation rules only. */
export const COMPAT_LAYER = 'dsh-livery.compat' as const

/** The id meaning "no livery": stock host appearance. */
export const STOCK_ID = 'stock' as const

export type StockId = typeof STOCK_ID
export type LiveryId = string

/** Manifest locale keys (BCP 47, full tags). */
export type LocaleId = 'zh-CN' | 'en-US'

/** DSH runtime locale ids (`document.documentElement.lang`). */
export type DshLocaleId = 'zh' | 'en'

export type LocalizedText = Readonly<Record<LocaleId, string>>

export type Mode = 'light' | 'dark'

/** Font registry ids. Raw font stacks never appear in a manifest. */
export type FontId = 'system-cjk' | 'system-latin' | 'system-mono'

/** Typography metrics profile ids. */
export type MetricsId = 'cjk-comfortable' | 'latin-default' | 'compact' | 'airy'

/** Layout recipe ids (registered recipes only — manifests never carry selectors). */
export type DensityId = 'host' | 'compact' | 'comfortable'
export type ConversationWidthId = 'host' | 'focused' | 'wide'
export type MessageFlowId = 'stock' | 'separated'
export type SurfaceStyleId = 'solid' | 'soft' | 'glass'

/** Capability ids shared by the manifest, the contract snapshot and self-check. */
export const CAP = {
  themeCss: 'theme-css',
  hostFontFamily: 'host-font-family',
  /** Documented per-role font-family hooks (`--dsh-font-family-text|code`), 0.2.1+. */
  hostFontRoleHooks: 'host-font-role-hooks',
  hostDensity: 'host-density-tokens',
  hostTranscriptWidth: 'host-transcript-width',
  hostMessageFlow: 'host-message-flow',
  surfaceMaterial: 'surface-material',
  reducedTransparency: 'reduced-transparency',
  forcedColors: 'forced-colors',
  reducedMotion: 'reduced-motion',
} as const

export type CapabilityId = (typeof CAP)[keyof typeof CAP]

/** Four seed colours per variant. The compiler rejects anything unusable. */
export interface Seeds {
  readonly accent: string
  readonly secondary: string
  readonly surface: string
  readonly text: string
}

/** Token name → CSS value. Names are `--dsw-*` variables only. */
export type TokenMap = Readonly<Record<string, string>>

/** Livery manifest (`liveries/<id>/manifest.json`), schemaVersion 1. */
export interface LiveryManifest {
  readonly schemaVersion: typeof SCHEMA_VERSION
  readonly id: LiveryId
  readonly meta: {
    readonly name: LocalizedText
    readonly description: LocalizedText
    readonly tags: readonly TagId[]
    readonly order: number
  }
  readonly variants: {
    readonly light: LiveryVariantInput
    readonly dark: LiveryVariantInput
  }
  readonly typography: {
    readonly ui: Readonly<Record<LocaleId, FontId>>
    readonly content: Readonly<Record<LocaleId, FontId>>
    readonly code: FontId
    readonly metrics: Readonly<Record<LocaleId, MetricsId>>
  }
  readonly layout: {
    readonly density: DensityId
    readonly conversationWidth: ConversationWidthId
    readonly messageFlow: MessageFlowId
    readonly surfaceStyle: SurfaceStyleId
  }
  readonly compat: {
    readonly requiredCapabilities: readonly CapabilityId[]
    readonly optionalCapabilities: readonly CapabilityId[]
  }
}

export interface LiveryVariantInput {
  readonly seeds: Seeds
  /** Explicit author overrides; restricted to the compiler's token whitelist. */
  readonly tokens?: TokenMap
}

/** Stable tag id shared by manifests and the tag dictionary. */
export type TagId = string

export interface TagDefinition {
  readonly id: TagId
  readonly label: LocalizedText
}

export interface FontStackDefinition {
  readonly id: FontId
  readonly stack: string
  readonly note: string
}

export interface MetricsDefinition {
  readonly id: MetricsId
  readonly lineHeight: number
  readonly note: string
}

/** Resolved, locale-split typography values used by the CSS renderer. */
export interface ResolvedTypography {
  readonly ui: Readonly<Record<LocaleId, string>>
  readonly content: Readonly<Record<LocaleId, string>>
  readonly code: string
  readonly metrics: Readonly<Record<LocaleId, MetricsDefinition>>
}

/** One contrast assertion in the audit matrix. */
export interface ContrastEntry {
  readonly role: string
  readonly foreground: string
  readonly background: string
  readonly ratio: number
  readonly min: number
  readonly pass: boolean
  readonly kind: 'text' | 'large-text' | 'non-text'
}

export interface TokenCoverageReport {
  /** Tokens declared by the host contract that this livery overrides. */
  readonly covered: readonly string[]
  /** Host-declared tokens intentionally inherited from stock (documented). */
  readonly inherited: readonly string[]
  /** Consumed host tokens missing from both lists — must be empty to ship. */
  readonly missing: readonly string[]
}

export interface CssSafetyReport {
  readonly important: number
  readonly hashSelectors: number
  readonly elementSelectors: readonly string[]
  readonly remoteUrls: number
  readonly unscopedTokens: number
  readonly fixedZIndexes: readonly number[]
  readonly pass: boolean
}

export interface LiveryAuditReport {
  readonly contrast: readonly ContrastEntry[]
  readonly contrastFailures: number
  readonly tokenCoverage: TokenCoverageReport
  readonly cssSafety: CssSafetyReport
  /** Declared but unavailable capabilities, with the fallback actually used. */
  readonly degraded: readonly CapabilityDegrade[]
}

export interface CapabilityDegrade {
  readonly id: CapabilityId
  readonly reason: string
  readonly fallback: string
}

/** Capability availability resolved from the frozen contract snapshot. */
export interface CapabilityAvailability {
  readonly id: string
  readonly available: boolean
  readonly provenance:
    | 'documented'
    | 'typed-public-api'
    | 'host-owned-approved'
    | 'observed-internal'
    | 'absent'
  readonly required: boolean
  readonly detail: string
}

export type CapabilityMap = Readonly<Record<string, CapabilityAvailability>>

export interface CompiledVariant {
  readonly seeds: Seeds
  readonly tokens: TokenMap
  readonly contrast: readonly ContrastEntry[]
}

/** Rendered CSS fragments, one per lifecycle axis. */
export interface LiveryCss {
  /** `body[data-dsh-livery]` token pair + static bridges. */
  readonly tokens: string
  /** `:root:lang(zh|en)` host font token bindings. */
  readonly typography: string
  /** `@layer dsh-livery.compat` safe layout recipes. */
  readonly layout: string
}

/** One compiled built-in livery, shared verbatim by Host and Client. */
export interface CompiledLivery {
  readonly id: LiveryId
  readonly meta: LiveryManifest['meta']
  readonly typography: ResolvedTypography
  readonly layout: LiveryManifest['layout']
  /** Capability ids declared by the manifest plus the effective fallback. */
  readonly requiredCapabilities: readonly CapabilityId[]
  readonly optionalCapabilities: readonly CapabilityId[]
  readonly light: CompiledVariant
  readonly dark: CompiledVariant
  readonly css: LiveryCss
  /**
   * Hash of the exact concatenated stylesheet bytes (`hashCss(css.tokens +
   * css.typography + css.layout)`). This is the value the Host injects, the
   * Client compares against `BootPayload.cssHash` / `body[data-dsh-livery-hash]`,
   * and the only hash any runtime needs; no runtime re-render is required.
   */
  readonly cssHash: string
  /** Content hash over id + css + layout + typography (catalog identity). */
  readonly hash: string
  readonly audit: LiveryAuditReport
}

/**
 * One compiled catalog profile. Every adapter that shares a profile renders
 * byte-identical stylesheets (same token contract + render-affecting
 * capabilities), so the CSS/previews are compiled once and served under this
 * profile id.
 */
export interface CatalogProfileData {
  readonly profileId: string
  readonly compiledAt: string
  readonly sourceHash: string
  /** Exact host versions that share this profile. */
  readonly sourceAdapters: readonly string[]
  readonly liveries: readonly CompiledLivery[]
}

/** Versioned catalog served by the Host and read by the Client. */
export interface LiveryCatalog {
  readonly schemaVersion: typeof SCHEMA_VERSION
  readonly compilerVersion: typeof LIVERY_VERSION
  readonly adapterId: string
  readonly hostVersion: string
  readonly contractHash: string
  /** Catalog profile id shared by render-equivalent host versions. */
  readonly catalogProfile: string
  readonly capabilities: CapabilityMap
  /** Base URL for preview assets, e.g. `/livery/assets/previews/<profileId>/`. */
  readonly previewsBase: string
  readonly liveries: readonly CompiledLivery[]
}

/** First-frame handshake payload injected as a global before app scripts. */
export interface BootPayload {
  readonly pluginVersion: typeof LIVERY_VERSION
  readonly adapterId: string
  readonly hostVersion: string
  readonly contractHash: string
  /** Catalog profile id this host's compiled CSS/previews belong to. */
  readonly catalogProfile: string
  readonly profileKind: 'web' | 'desktop'
  /** Whether the pre-loader gate accepted the host; false = no boot rows. */
  readonly accepted: boolean
  readonly skinId: LiveryId | StockId
  /** Content hash of the boot CSS the Host actually injected ('' = none). */
  readonly cssHash: string
  /** Hash of the complete rendered stylesheet for the active livery. */
  readonly bootStyleId: string
  readonly catalogUrl: string
  readonly entryId: typeof ENTRY_ID
  readonly diagnostics: readonly string[]
}

/** Payload shape used by the injected body attribute bootstrap script. */
export interface BootAttributePayload {
  readonly skinId: LiveryId | StockId
  readonly hash: string
}

/** One host config field, rendered by the settings page. */
export interface LiveryConfig {
  /** `stock` or a built-in livery id. Volatile: edits apply without remount. */
  readonly skinId: LiveryId | StockId
}

export const DEFAULT_CONFIG: LiveryConfig = { skinId: STOCK_ID }

/** Settings page route + dock keys used by the client presenter. */
export const SETTINGS_SECTION_ID = 'livery' as const

/** One capability fact extracted by the frozen contract snapshot. */
export interface ContractCapabilityFact {
  readonly id: string
  readonly available: boolean
  readonly provenance: CapabilityAvailability['provenance']
  readonly required: boolean
  readonly detail: string
}

export type ContractCapabilityFacts = Readonly<Record<string, ContractCapabilityFact>>
