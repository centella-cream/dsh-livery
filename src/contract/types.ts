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
    readonly kind: 'installed-package'
    readonly dshPackage: string
    readonly nodeRange: string
    /** Where the range came from: `declared` by the target or `certified`. */
    readonly nodeRangeSource: string
    readonly clientTarget: string
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
  readonly verifiedBrowsers: readonly { readonly family: string; readonly minVersion: number }[]
}

export type EvidenceStatus =
  | 'draft'
  | 'g0-g5-passed'
  | 'g6-approved'
  | 'released'

export interface SupportMatrixEntry {
  readonly hostVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly status: EvidenceStatus
  readonly profiles: {
    readonly desktop: { readonly macos: 'pending' | 'passed' | 'failed'; readonly win32: 'pending' | 'passed' | 'failed' }
    readonly web: { readonly chrome: 'pending' | 'passed' | 'failed'; readonly edge: 'pending' | 'passed' | 'failed' }
  }
  readonly browserSupport: readonly { readonly family: string; readonly minVersion: number }[]
  readonly clientTarget: string
  readonly evidence: readonly string[]
  readonly notes: readonly string[]
}

export interface SupportMatrix {
  readonly schemaVersion: 1
  readonly updatedAt: string
  readonly entries: readonly SupportMatrixEntry[]
}
