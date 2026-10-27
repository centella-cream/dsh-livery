/**
 * Contract snapshot types for the frozen DSH host build.
 *
 * A snapshot is generated from a real DSH installation (`contract:snapshot`) and
 * verified against it (`contract:verify`). Version numbers are only an index:
 * compatibility is decided by the six contract hashes recorded here.
 */

export type ContractClass =
  | 'loaderAbi'
  | 'hostApi'
  | 'clientApi'
  | 'token'
  | 'layout'
  | 'profileSchema'

export interface FileHash {
  /** Package-relative path (never an absolute host path). */
  readonly path: string
  /** `sha256:<hex>`. */
  readonly sha256: string
  readonly bytes: number
}

export interface PlatformModulesClass {
  readonly hash: string
  /** Exact module table the shell seeds before plugin bundles materialize. */
  readonly modules: readonly string[]
  /** `require.async` chunk protocol marker, if documented by the loader. */
  readonly chunkProtocol: string
  readonly evidence: readonly FileHash[]
}

export interface LoaderAbiContract {
  readonly hash: string
  /** Globals the loader exposes before plugin bundles evaluate. */
  readonly globals: readonly string[]
  /** Bundle envelope marker the host serves and the browser evaluates. */
  readonly envelope: {
    readonly call: string
    readonly moduleFormat: 'cjs-factory'
    readonly idEqualsPackageName: boolean
    readonly singleFile: boolean
  }
  readonly servePath: string
  readonly platformModules: PlatformModulesClass
  readonly evidence: readonly FileHash[]
}

export interface ServiceSignature {
  readonly service: string
  readonly members: readonly string[]
  /** Where the signature was read from (package-relative). */
  readonly from: string
}

export interface HostApiContract {
  readonly hash: string
  readonly services: readonly ServiceSignature[]
  readonly events: Readonly<Record<string, string>>
  readonly evidence: readonly FileHash[]
}

export interface ClientApiContract {
  readonly hash: string
  /** Cordis client services consumed by Livery. */
  readonly services: readonly string[]
  readonly slots: {
    readonly settingsSection: { readonly kind: string; readonly scope: string; readonly owner: string }
    readonly localeNamespace: string
  }
  readonly theme: {
    readonly darkAttribute: string
    readonly themeSourceAttribute: string
    readonly observer: string
  }
  readonly locale: { readonly ids: readonly string[]; readonly langAttribute: string }
  readonly configForms: { readonly entryKey: string; readonly sharedForm: string }
  readonly evidence: readonly FileHash[]
}

export interface TokenDeclaration {
  readonly name: string
  readonly category: string
  readonly light: string
  readonly dark: string
  readonly selector: string
  readonly darkSelector: string | null
  readonly referencedBy: readonly string[]
}

export interface TokenContract {
  readonly hash: string
  readonly count: number
  /** Consumed-by-shipped-packages token names (A-tier promise). */
  readonly consumed: readonly string[]
  /** Full declaration list, sorted by name. */
  readonly tokens: readonly TokenDeclaration[]
  readonly undeclaredButRead: readonly string[]
}

export interface LayoutContract {
  readonly hash: string
  readonly darkAttribute: string
  /** Documented public attributes a theme may read (README-cited). */
  readonly documentedAttributes: readonly string[]
  /** `--dsh-*` variables that are declared at document/frame level. */
  readonly rootVariables: readonly string[]
  readonly capabilityFacts: Readonly<Record<string, boolean>>
  readonly evidence: readonly FileHash[]
}

export interface ProfileSchemaContract {
  readonly hash: string
  readonly patchKeys: readonly string[]
  readonly bundleFields: readonly string[]
  readonly peerGate: string
  readonly evidence: readonly FileHash[]
}

export interface ContractCapabilities {
  readonly themeCss: boolean
  readonly hostFontFamily: boolean
  /**
   * Documented host-level font-family role hooks (`--dsh-font-family-text`,
   * `--dsh-font-family-code`) introduced by DSH 0.2.1. When present, a theme can
   * change fonts through the public host mechanism instead of overriding the
   * composite token ladder.
   */
  readonly fontRoleHooks: boolean
  readonly surfaceMaterial: boolean
  readonly hostDensityTokens: boolean
  readonly hostTranscriptWidth: boolean
  readonly hostMessageFlow: boolean
}

export interface ContractSnapshot {
  readonly schemaVersion: 1
  readonly adapterId: string
  readonly hostVersion: string
  readonly capturedAt: string
  readonly source: {
    /**
     * `installed-package` for npm/CLI installs, `packaged-app` when the contract
     * was extracted from the Desktop app's Electron `app.asar` (which strips
     * `.d.ts` files, so missing type documents are supplemented from the same
     * published version and recorded here).
     */
    readonly kind: 'installed-package' | 'packaged-app'
    readonly dshPackage: string
    readonly nodeRange: string
    /** Where the range came from: `declared` by the target or `certified`. */
    readonly nodeRangeSource: string
    readonly clientTarget: string
    /** Present only for packaged-app snapshots. */
    readonly prepared?: {
      readonly archiveSha256?: string
      readonly extractor: string
      readonly supplements: readonly string[]
      readonly notes: string
    }
  }
  readonly loaderAbi: LoaderAbiContract
  readonly hostApi: HostApiContract
  readonly clientApi: ClientApiContract
  readonly tokens: TokenContract
  readonly layout: LayoutContract
  readonly profileSchema: ProfileSchemaContract
  readonly capabilities: ContractCapabilities
  readonly hashes: Readonly<Record<ContractClass, string>>
  /** sha256 over the six class hashes + node range + client target. */
  readonly contractHash: string
}

export interface AdapterManifest {
  readonly hostVersion: string
  readonly adapterId: string
  readonly loaderAbi: string
  readonly hostApiContract: string
  readonly clientApiContract: string
  readonly tokenContract: string
  readonly layoutContract: string
  readonly profileSchema: string
  readonly contractHash: string
  readonly nodeRange: string
  readonly clientTarget: string
  readonly verifiedProfiles: readonly string[]
  readonly verifiedPlatforms: readonly string[]
  /** Certified browser/Chromium families with the EXACT full versions accepted. */
  readonly verifiedBrowsers: readonly {
    readonly family: string
    readonly versions: readonly string[]
  }[]
}

export type EvidenceStatus =
  | 'draft'
  | 'g0-g5-passed'
  | 'g6-approved'
  | 'released'

/**
 * Certification state of one profile for one exact host version.
 *
 * `not-supported` is an explicit release decision (the profile is deliberately
 * outside this release line's scope), not a missing result. Gates ignore it; it
 * must never be treated as silently pending.
 */
export type ProfileStatus = 'pending' | 'passed' | 'failed' | 'not-supported'

/**
 * Stability promise of a certification claim.
 *
 * `stable` requires a real upstream GitHub tag/release AND the matching signed
 * npm package; a next-channel-only host is `preview`, never stable.
 */
export type ClaimTier = 'stable' | 'preview'

/** Distribution channel the certified build was published to. */
export type DistributionChannel = 'latest' | 'next' | 'desktop-app'

/** Upstream provenance of the exact host build. */
export interface UpstreamProvenance {
  /** Official GitHub tag/release name, or `null` for a preview-only build. */
  readonly githubTag: string | null
  /** Exact signed npm package version. */
  readonly npmVersion: string
}

export interface SupportMatrixEntry {
  readonly hostVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly status: EvidenceStatus
  readonly profiles: {
    readonly desktop: { readonly macos: ProfileStatus; readonly win32: ProfileStatus }
    readonly web: { readonly chrome: ProfileStatus; readonly edge: ProfileStatus }
  }
  readonly claimTier: ClaimTier
  readonly distributionChannel: DistributionChannel
  /** EXACT certified browser/Chromium versions (full version strings). */
  readonly certifiedBrowserVersions: readonly string[]
  /** EXACT certified runtime versions (Node/Electron Node version strings). */
  readonly certifiedRuntimeVersions: readonly string[]
  readonly upstream: UpstreamProvenance
  readonly clientTarget: string
  readonly evidence: readonly string[]
  readonly notes: readonly string[]
}

/**
 * The formal support matrix (`contracts/dsh/support-matrix.json`) is the
 * release authority. Its entries decide which adapters may be generated and
 * shipped at all. The historical candidate matrix
 * (`support-matrix.proposed.json`) keeps every frozen contract's certification
 * trail and is never read by the release gates.
 */
export interface SupportMatrix {
  /** Schema 2 carries exact certification claims (tier/channel/browser/runtime/upstream). */
  readonly schemaVersion: 2
  readonly updatedAt: string
  readonly entries: readonly SupportMatrixEntry[]
}
