/**
 * Shared client-test fixtures: a minimal fake DOM, a recording presenter, a
 * scriptable config form, and a two-livery catalog. No React, no jsdom — the
 * runtime and presenter were designed around injected sources precisely so
 * they can be driven without a browser.
 */
import type {
  BootPayload,
  CapabilityId,
  CapabilityMap,
  CompiledLivery,
  LiveryCatalog,
} from '../../src/core/types.js'
import { LIVERY_VERSION, PREVIEW_ROUTE_PREFIX, SCHEMA_VERSION } from '../../src/core/types.js'
import type { AdapterIdentity, AdapterRecord } from '../../src/generated/contract.js'
import { ADAPTERS, ADAPTER_IDENTITIES } from '../../src/generated/contract.js'
import type { ConfigFormLike, ConfigFormSnapshotLike, CoreApi, LocaleSource, ThemeSource } from '../../src/client/runtime.js'
import type { Presenter, PresenterSnapshot, SkinCss } from '../../src/client/presenter.js'

/**
 * The three certified host builds as the browser bundle sees them: the lite
 * `AdapterIdentity` registry (the client never imports the full records, whose
 * capability prose/source evidence must stay out of the browser bundle).
 */
export const ADAPTER_020: AdapterIdentity = ADAPTER_IDENTITIES[0]!
export const ADAPTER_021_2: AdapterIdentity = ADAPTER_IDENTITIES[1]!
export const ADAPTER_021_3: AdapterIdentity = ADAPTER_IDENTITIES[2]!

/** Default adapter used by fixtures: the already-accepted 0.2.0-rc.2 build. */
export const TEST_ADAPTER: AdapterIdentity = ADAPTER_020

/** Full generated records (tests only, for capability maps/platform modules). */
export const ADAPTER_RECORD_020: AdapterRecord = ADAPTERS[0]!
export const ADAPTER_RECORD_021_2: AdapterRecord = ADAPTERS[1]!
export const ADAPTER_RECORD_021_3: AdapterRecord = ADAPTERS[2]!

/**
 * Full generated record for one lite identity (tests that need its capability
 * map; the browser bundle has no such lookup).
 * @param identity - certified adapter identity.
 * @returns the matching full adapter record.
 */
export function adapterRecordOf(identity: AdapterIdentity): AdapterRecord {
  const record = ADAPTERS.find(candidate => candidate.adapterId === identity.adapterId)
  if (record === undefined) throw new Error(`no full adapter record for ${identity.adapterId}`)
  return record
}

/** Contract hash the default fixtures describe (from the certified adapter). */
export const TEST_CONTRACT_HASH = TEST_ADAPTER.contractHash

/** Catalog profile + preview base for the default fixtures. */
export const TEST_PROFILE = TEST_ADAPTER.catalogProfile
export const TEST_PREVIEWS_BASE = `${PREVIEW_ROUTE_PREFIX}${TEST_PROFILE}/`

/** Fake `Document` surface used by the presenter and the adoption check. */
export class FakeElement {
  readonly tagName: string
  id = ''
  textContent = ''
  readonly dataset: Record<string, string> = {}
  readonly attributes: Record<string, string> = {}
  readonly children: FakeElement[] = []
  parentNode: FakeElement | null = null

  constructor(tagName = 'STYLE') {
    this.tagName = tagName
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null
  }

  removeAttribute(name: string): void {
    delete this.attributes[name]
  }

  appendChild(child: FakeElement): void {
    child.parentNode = this
    this.children.push(child)
  }

  insertAdjacentElement(_position: 'afterend', element: FakeElement): void {
    const parent = this.parentNode
    if (parent === null) return
    const index = parent.children.indexOf(this)
    element.parentNode = parent
    parent.children.splice(index + 1, 0, element)
  }

  remove(): void {
    const parent = this.parentNode
    if (parent === null) return
    const index = parent.children.indexOf(this)
    if (index >= 0) parent.children.splice(index, 1)
    this.parentNode = null
  }

  /** All descendants plus self, in document order. */
  walk(): FakeElement[] {
    return [this, ...this.children.flatMap(child => child.walk())]
  }
}

/** Minimal `Document`-shaped object accepted by `createPresenter`. */
export class FakeDocument {
  readonly head = new FakeElement('HEAD')
  readonly body = new FakeElement('BODY')
  private readonly created: FakeElement[] = []

  createElement(tagName: string): FakeElement {
    const element = new FakeElement(tagName.toUpperCase())
    this.created.push(element)
    return element
  }

  getElementById(id: string): FakeElement | null {
    const search = (root: FakeElement): FakeElement | null =>
      root.walk().find(element => element.id === id) ?? null
    return search(this.head) ?? search(this.body)
  }

  querySelector(selector: string): FakeElement | null {
    const match = /^style\[data-plugin-css="(.+)"\]$/.exec(selector)
    if (match === null) return null
    const cssFile = match[1]
    return this.head.walk().find(element => element.tagName === 'STYLE' && element.dataset.pluginCss === cssFile) ?? null
  }

  /** `createPresenter` casts to `Document`; tests use the fake structurally. */
  asDocument(): Document {
    return this as unknown as Document
  }
}

/** Recording presenter: never touches a DOM, records the call order. */
export class RecordingPresenter implements Presenter {
  readonly calls: string[] = []
  readonly skins: Array<{ call: string; skin: SkinCss | undefined }> = []
  adoptResult = true
  private state: PresenterSnapshot = {
    cssTextWrites: 0,
    adoptedBootStyle: false,
    tokenStylePresent: false,
    previewStylePresent: false,
    bootStylePresent: false,
    bodyId: null,
    bodyHash: null,
  }

  installClientCss(): () => void {
    this.calls.push('installClientCss')
    return () => undefined
  }

  adoptBootStyle(skin: SkinCss): boolean {
    this.calls.push('adoptBootStyle')
    this.skins.push({ call: 'adoptBootStyle', skin })
    if (this.adoptResult) {
      this.state = { ...this.state, adoptedBootStyle: true, tokenStylePresent: true, bodyId: skin.id, bodyHash: skin.hash }
    }
    return this.adoptResult
  }

  applyConfirmed(skin: SkinCss): void {
    this.calls.push('applyConfirmed')
    this.skins.push({ call: 'applyConfirmed', skin })
    this.state = {
      ...this.state,
      tokenStylePresent: skin.id !== 'stock',
      previewStylePresent: false,
      bodyId: skin.id === 'stock' ? null : skin.id,
      bodyHash: skin.id === 'stock' ? null : skin.hash,
    }
  }

  applyPreview(skin: SkinCss): void {
    this.calls.push('applyPreview')
    this.skins.push({ call: 'applyPreview', skin })
    this.state = {
      ...this.state,
      previewStylePresent: skin.id !== 'stock',
      bodyId: skin.id === 'stock' ? null : skin.id,
      bodyHash: skin.id === 'stock' ? null : skin.hash,
    }
  }

  rollbackPreview(confirmed: SkinCss | undefined): void {
    this.calls.push('rollbackPreview')
    this.skins.push({ call: 'rollbackPreview', skin: confirmed })
    this.state = {
      ...this.state,
      previewStylePresent: false,
      bodyId: confirmed?.id ?? null,
      bodyHash: confirmed?.hash ?? null,
    }
  }

  clearSkin(): void {
    this.calls.push('clearSkin')
    this.state = {
      ...this.state,
      tokenStylePresent: false,
      previewStylePresent: false,
      bootStylePresent: false,
      bodyId: null,
      bodyHash: null,
    }
  }

  removeBootArtifacts(): void {
    this.calls.push('removeBootArtifacts')
    this.state = { ...this.state, bootStylePresent: false, bodyId: null, bodyHash: null }
  }

  dispose(): void {
    this.calls.push('dispose')
    this.state = {
      ...this.state,
      tokenStylePresent: false,
      previewStylePresent: false,
      bootStylePresent: false,
      bodyId: null,
      bodyHash: null,
    }
  }

  snapshot(): PresenterSnapshot {
    return this.state
  }

  count(call: string): number {
    return this.calls.filter(entry => entry === call).length
  }
}

/** Scriptable config form: one namespace, in-memory write result. */
export class FakeConfigForm implements ConfigFormLike {
  snapshot: ConfigFormSnapshotLike = {
    status: 'ready',
    value: { skinId: 'stock' },
    revision: 1,
    writable: true,
    mode: 'host',
  }

  response: boolean | Error = true
  readonly writes: Array<{ field: string; value: unknown }> = []
  private readonly listeners = new Set<() => void>()

  constructor(initial?: ConfigFormSnapshotLike) {
    if (initial !== undefined) this.snapshot = initial
  }

  getSnapshot(): ConfigFormSnapshotLike {
    return this.snapshot
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async set(field: string, value: unknown): Promise<boolean> {
    this.writes.push({ field, value })
    if (this.response instanceof Error) throw this.response
    if (this.response) {
      this.snapshot = {
        ...this.snapshot,
        value: { skinId: value },
        revision: (this.snapshot.revision ?? 0) + 1,
      }
      this.emit()
    }
    return this.response
  }

  /** Simulate a host-side change arriving through the subscription. */
  update(partial: Partial<ConfigFormSnapshotLike>): void {
    this.snapshot = { ...this.snapshot, ...partial }
    this.emit()
  }

  emit(): void {
    for (const listener of [...this.listeners]) listener()
  }

  get listenerCount(): number {
    return this.listeners.size
  }
}

/** Locale source over a mutable active locale. */
export class FakeLocale implements LocaleSource {
  active: string
  private readonly listeners = new Set<(locale: string) => void>()

  constructor(active = 'en') {
    this.active = active
  }

  getLocale(): string {
    return this.active
  }

  subscribe(listener: (locale: string) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setActive(locale: 'zh' | 'en'): void {
    this.active = locale
    for (const listener of [...this.listeners]) listener(locale)
  }
}

/** Theme source that counts subscriptions (the startup budget is zero). */
export class FakeTheme implements ThemeSource {
  mode: 'light' | 'dark' = 'light'
  subscriptions = 0
  private readonly listeners = new Set<(mode: 'light' | 'dark') => void>()

  getMode(): 'light' | 'dark' {
    return this.mode
  }

  subscribe(listener: (mode: 'light' | 'dark') => void): () => void {
    this.subscriptions += 1
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setMode(mode: 'light' | 'dark'): void {
    this.mode = mode
    for (const listener of [...this.listeners]) listener(mode)
  }
}

/** A capability map that makes every fixture livery applicable. */
export const TEST_CAPABILITIES: CapabilityMap = {
  'theme-css': {
    id: 'theme-css',
    available: true,
    provenance: 'documented',
    required: true,
    detail: 'test',
  },
  'host-font-family': {
    id: 'host-font-family',
    available: true,
    provenance: 'documented',
    required: true,
    detail: 'test',
  },
  'reduced-motion': {
    id: 'reduced-motion',
    available: true,
    provenance: 'documented',
    required: false,
    detail: 'test',
  },
}

/** Build one compiled livery fixture. */
export function makeLivery(
  id: string,
  options: {
    readonly order?: number
    readonly tags?: readonly string[]
    readonly required?: readonly CapabilityId[]
    readonly optional?: readonly CapabilityId[]
  } = {},
): CompiledLivery {
  const variant = (hex: string) => ({
    seeds: { accent: hex, secondary: '#888888', surface: '#f5f5f5', text: '#111111' },
    tokens: {},
    contrast: [
      { role: 'label', foreground: '#111111', background: '#ffffff', ratio: 16, min: 4.5, pass: true, kind: 'text' as const },
    ],
  })
  return {
    id,
    meta: {
      name: { 'zh-CN': `风格-${id}`, 'en-US': `Visual Style ${id}` },
      description: { 'zh-CN': `描述-${id}`, 'en-US': `Description for ${id}` },
      tags: [...(options.tags ?? ['calm'])],
      order: options.order ?? 10,
    },
    typography: {
      ui: { 'zh-CN': 'ui-zh', 'en-US': 'ui-en' },
      content: { 'zh-CN': 'content-zh', 'en-US': 'content-en' },
      code: 'code',
      metrics: {
        'zh-CN': { id: 'cjk-comfortable', lineHeight: 1.55, note: 'test', tokens: {} },
        'en-US': { id: 'latin-default', lineHeight: 1.45, note: 'test', tokens: {} },
      },
    },
    layout: { density: 'host', conversationWidth: 'host', messageFlow: 'stock', surfaceStyle: 'solid' },
    requiredCapabilities: [...(options.required ?? ['theme-css'])],
    optionalCapabilities: [...(options.optional ?? ['reduced-motion'])],
    light: variant('#aa2222'),
    dark: variant('#2222aa'),
    css: { tokens: '', typography: '', layout: '' },
    cssHash: `hash:/*${id}*/`,
    hash: `bundled:${id}`,
    audit: {
      contrast: [
        { role: 'label', foreground: '#111111', background: '#ffffff', ratio: 16, min: 4.5, pass: true, kind: 'text' },
        { role: 'secondary', foreground: '#888888', background: '#ffffff', ratio: 3.1, min: 4.5, pass: false, kind: 'text' },
      ],
      contrastFailures: 1,
      tokenCoverage: {
        covered: ['--dsw-alias-bg-base'],
        inherited: ['--dsw-alias-bg-layer-1'],
        missing: [],
      },
      cssSafety: {
        important: 0,
        hashSelectors: 0,
        elementSelectors: [],
        remoteUrls: 0,
        unscopedTokens: 0,
        fixedZIndexes: [],
        pass: true,
      },
      degraded: [],
    },
  }
}

/** Build one catalog fixture for a certified adapter (default: 0.2.0-rc.2). */
export function makeCatalog(
  liveries: readonly CompiledLivery[] = [makeLivery('fjord', { order: 10 }), makeLivery('midnight', { order: 20, tags: ['deep', 'elegant'] })],
  capabilities: CapabilityMap = TEST_CAPABILITIES,
  adapter: AdapterIdentity = TEST_ADAPTER,
): LiveryCatalog {
  return {
    schemaVersion: SCHEMA_VERSION,
    compilerVersion: LIVERY_VERSION,
    adapterId: adapter.adapterId,
    hostVersion: adapter.hostVersion,
    contractHash: adapter.contractHash,
    catalogProfile: adapter.catalogProfile,
    capabilities,
    previewsBase: `${PREVIEW_ROUTE_PREFIX}${adapter.catalogProfile}/`,
    liveries: [...liveries],
  }
}

/** Build a valid boot payload. */
export function makeBootPayload(overrides: Partial<Record<keyof BootPayload, unknown>> = {}): BootPayload {
  const base = {
    pluginVersion: LIVERY_VERSION,
    adapterId: TEST_ADAPTER.adapterId,
    hostVersion: TEST_ADAPTER.hostVersion,
    contractHash: TEST_ADAPTER.contractHash,
    catalogProfile: TEST_ADAPTER.catalogProfile,
    profileKind: 'web',
    accepted: true,
    skinId: 'fjord',
    cssHash: '',
    bootStyleId: 'dsh-livery-boot',
    catalogUrl: '/livery/api/catalog',
    entryId: 'livery',
    diagnostics: [],
    ...overrides,
  }
  return base as unknown as BootPayload
}

/** Deterministic `CoreApi` stand-in: css text derives from the livery id. */
export const TEST_CORE: CoreApi = {
  styleTextOf: livery => `/*${livery.id}*/`,
  liveryCssHash: livery => `hash:/*${livery.id}*/`,
  findLivery: (catalog, id) => catalog.liveries.find(livery => livery.id === id),
}

/** Flush pending microtasks + one macrotask so async runtime steps settle. */
export async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}
