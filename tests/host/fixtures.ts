/**
 * Deterministic fixtures for the multi-adapter Host unit tests.
 *
 * Everything here is pure data matching the frozen types in `src/core/types.ts`
 * and the generated adapter registry — no filesystem, no ambient process state,
 * so a test failure names a host rule rather than a machine difference. The
 * *real* generated registry/catalog profiles are exercised separately in
 * `generated.test.ts`.
 */

import type {
  CapabilityMap,
  CatalogProfileData,
  CompiledLivery,
  CompiledVariant,
  LiveryAuditReport,
  MetricsDefinition,
  ResolvedTypography,
} from '../../src/core/types.js'
import { expect, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import type { AdapterRecord } from '../../src/generated/contract.js'
import type { BootStateInput } from '../../src/host/boot.js'
import { buildCatalog } from '../../src/host/catalog.js'
import type { LiveryRouteHandler, LiveryWebServerLike } from '../../src/host/routes.js'

/** First synthetic catalog profile id (not a generated one). */
export const SYNTHETIC_PROFILE_A = 'sha256:synthetic-profile-a'
/** Second synthetic catalog profile id (renders differently on purpose). */
export const SYNTHETIC_PROFILE_B = 'sha256:synthetic-profile-b'

/** Compiled boot CSS of the fixture livery, byte-for-byte. */
export const FIXTURE_BOOT_CSS = 'body[data-dsh-livery="ivory-slate"]{--dsw-alias-bg:#ffffff}'
/** Content hash the fixture livery claims for its compiled CSS. */
export const FIXTURE_BOOT_HASH = 'sha256:0123456789abcdef0123456789abcdef'

/** Typography metrics fixture used by the compiled-livery fixture. */
function metrics(id: MetricsDefinition['id'], lineHeight: number): MetricsDefinition {
  // `tokens` carries mode-independent style-token overrides (style system v2);
  // the fixture livery needs none, but the type requires the field.
  return { id, lineHeight, tokens: {}, note: 'fixture' }
}

/** One contract-complete compiled livery. Overrides patch the fields a test cares about. */
export function makeLivery(overrides: Partial<CompiledLivery> = {}): CompiledLivery {
  const variant: CompiledVariant = {
    seeds: {
      accent: '#3366ff',
      secondary: '#22aa88',
      surface: '#ffffff',
      text: '#111111',
    },
    tokens: {
      '--dsw-alias-bg': '#ffffff',
      '--dsw-alias-text': '#111111',
    },
    contrast: [],
  }
  const typography: ResolvedTypography = {
    ui: { 'zh-CN': 'system-ui, sans-serif', 'en-US': 'system-ui, sans-serif' },
    content: { 'zh-CN': 'system-ui, sans-serif', 'en-US': 'system-ui, sans-serif' },
    code: 'ui-monospace, monospace',
    metrics: {
      'zh-CN': metrics('cjk-comfortable', 1.75),
      'en-US': metrics('latin-default', 1.6),
    },
  }
  const audit: LiveryAuditReport = {
    contrast: [],
    contrastFailures: 0,
    tokenCoverage: { covered: [], inherited: [], missing: [] },
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
  }
  return {
    id: 'ivory-slate',
    meta: {
      name: { 'zh-CN': '象牙石板', 'en-US': 'Ivory Slate' },
      description: { 'zh-CN': '测试', 'en-US': 'Fixture' },
      tags: [],
      order: 1,
    },
    typography,
    layout: {
      density: 'host',
      conversationWidth: 'host',
      messageFlow: 'stock',
      surfaceStyle: 'solid',
    },
    requiredCapabilities: ['theme-css'],
    optionalCapabilities: [],
    light: variant,
    dark: variant,
    css: { tokens: FIXTURE_BOOT_CSS, typography: '', layout: '' },
    cssHash: FIXTURE_BOOT_HASH,
    hash: 'sha256:fixture-livery',
    audit,
    ...overrides,
  }
}

/**
 * A capability map with the two required theme facts available.
 * @param missing - ids to mark unavailable; unknown ids are added as absent facts.
 * @returns a complete-enough capability map fixture.
 */
export function makeCapabilities(missing: readonly string[] = []): CapabilityMap {
  const unavailable = new Set(missing)
  const fact = (id: string, available: boolean, required: boolean): CapabilityMap[string] => ({
    id,
    available: available && !unavailable.has(id),
    provenance: available && !unavailable.has(id) ? 'documented' : 'absent',
    required,
    detail: `fixture capability ${id}`,
  })
  return {
    'theme-css': fact('theme-css', true, true),
    'host-font-family': fact('host-font-family', true, true),
    'host-font-role-hooks': fact('host-font-role-hooks', false, false),
    'surface-material': fact('surface-material', true, false),
    'host-density-tokens': fact('host-density-tokens', false, false),
    ...Object.fromEntries(missing.map((id) => [id, fact(id, false, false)])),
  }
}

/**
 * One synthetic certified adapter. Every field is filled so a test can assert
 * that host code reads identity from the adapter record and nothing ambient.
 * @param overrides - patched fields.
 * @returns adapter fixture.
 */
export function makeAdapter(overrides: Partial<AdapterRecord> = {}): AdapterRecord {
  return {
    hostVersion: 'test-host-1.0.0',
    adapterId: 'dsh-test-host-1.0.0-r1',
    contractHash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    loaderAbiHash: 'sha256:test-loader-abi',
    hostApiHash: 'sha256:test-host-api',
    clientApiHash: 'sha256:test-client-api',
    tokenHash: 'sha256:test-token',
    layoutHash: 'sha256:test-layout',
    profileSchemaHash: 'sha256:test-profile-schema',
    nodeRange: '^22.23.1',
    nodeRangeSource: 'fixture',
    clientTarget: 'chrome120',
    platformModules: ['react'],
    capabilities: makeCapabilities(),
    catalogProfile: SYNTHETIC_PROFILE_A,
    sourceKind: 'installed-package',
    sourceEvidence: [],
    capturedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** One synthetic compiled catalog profile. */
export function makeProfile(
  profileId: string,
  liveries: readonly CompiledLivery[] = [makeLivery()],
  overrides: Partial<CatalogProfileData> = {},
): CatalogProfileData {
  return {
    profileId,
    compiledAt: '2026-01-01T00:00:00.000Z',
    sourceHash: `sha256:source-${profileId}`,
    sourceAdapters: [],
    liveries,
    ...overrides,
  }
}

/** Catalog for one synthetic adapter, with an explicit profile (never the registry). */
export function makeAdapterCatalog(
  adapter: AdapterRecord = makeAdapter(),
  liveries: readonly CompiledLivery[] = [makeLivery()],
) {
  return buildCatalog(adapter, makeProfile(adapter.catalogProfile, liveries))
}

/**
 * A full boot input that the gate must accept, before per-test overrides.
 * `adapter`/`catalog` are synthetic, so no generated artifacts are involved.
 */
export function makeBootInput(overrides: Partial<BootStateInput> = {}): BootStateInput {
  const adapter = overrides.adapter ?? makeAdapter()
  const catalog = overrides.catalog ?? makeAdapterCatalog(adapter)
  return {
    skinId: 'ivory-slate',
    profileKind: 'web',
    observedHostVersion: adapter.hostVersion,
    adapter,
    catalog,
    ...overrides,
  }
}

/** Recording fake for `node:http`'s ServerResponse, enough for route handlers. */
export class FakeResponse {
  statusCode = 0
  headers: Record<string, string> = {}
  body: string | Uint8Array | undefined
  headersSent = false
  writableEnded = false
  #ended = false

  /**
   * Record a status line and headers.
   * @param status - HTTP status code.
   * @param headers - response headers.
   * @returns this, for chaining.
   */
  writeHead(status: number, headers: Record<string, string> = {}): this {
    this.statusCode = status
    this.headers = { ...headers }
    this.headersSent = true
    return this
  }

  /**
   * Record the body and finish the response.
   * @param body - optional response body.
   * @returns this, for chaining.
   */
  end(body?: string | Uint8Array): this {
    if (body !== undefined) this.body = body
    this.headersSent = true
    this.writableEnded = true
    this.#ended = true
    return this
  }

  /** Whether `end` was called (body may be empty, e.g. HEAD/404). */
  get ended(): boolean {
    return this.#ended
  }
}

/**
 * Fake incoming request carrying just the properties route handlers read.
 * @param method - HTTP method.
 * @param url - request target.
 * @returns a request-shaped object.
 */
export function fakeRequest(method: string, url: string): { method: string; url: string } {
  return { method, url }
}


/** A promise with externally controlled settlement (async-race tests). */
export interface Deferred<T> {
  readonly promise: Promise<T>
  /** Resolve the promise exactly once. */
  resolve(value: T): void
  /** Reject the promise exactly once. */
  reject(reason?: unknown): void
}

/**
 * Create a controllable promise.
 * @returns the promise plus its settlement functions.
 */
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** In-memory webserver double recording registrations and disposals. */
export class FakeWebServer implements LiveryWebServerLike {
  readonly routes = new Map<string, LiveryRouteHandler>()
  readonly disposed: string[] = []
  failOnPath: string | undefined

  /**
   * Register one route.
   * @param route - route registration.
   * @returns disposer removing it.
   */
  register(route: {
    readonly kind: 'exact' | 'prefix'
    readonly path: string
    readonly handler: LiveryRouteHandler
  }): () => void {
    const key = `${route.kind}:${route.path}`
    if (route.path === this.failOnPath) throw new Error(`duplicate route ${key}`)
    this.routes.set(key, route.handler)
    return () => {
      this.routes.delete(key)
      this.disposed.push(key)
    }
  }
}

/** One captured `ctx.effect` call. */
export interface CapturedEffect {
  label: string | undefined
  dispose: () => void
}

/** A fake child context carrying injected services and recording effects. */
export function makeChildContext(services: Record<string, unknown>, effects: CapturedEffect[]) {
  return {
    ...services,
    effect(execute: () => (() => void) | void, label?: string) {
      const dispose = execute()
      effects.push({ label, dispose: typeof dispose === 'function' ? dispose : () => {} })
      return () => {}
    },
  }
}

/** Result of {@link makeFakeHostContext}. */
export interface FakeHostContext {
  readonly context: Context
  readonly listener: { current?: (table: IndexInjection[]) => void }
  readonly effects: CapturedEffect[]
  readonly injected: string[][]
  readonly warn: ReturnType<typeof vi.fn>
}

/**
 * A fake Cordis host context with the services `apply` touches.
 * @param options - optional injected webServer/settings services.
 * @returns the context plus captured listener/effects/injections/logger.
 */
export function makeFakeHostContext(options: {
  webServer?: object
  settings?: object
  fiber?: object
} = {}): FakeHostContext {
  const listener: { current?: (table: IndexInjection[]) => void } = {}
  const effects: CapturedEffect[] = []
  const injected: string[][] = []
  const warn = vi.fn()
  const context = {
    fiber: options.fiber ?? { uid: 1 },
    logger: { warn },
    on(event: string, handler: (table: IndexInjection[]) => void) {
      expect(event).toBe('webserver/index-inject')
      listener.current = handler
      return () => {}
    },
    inject(deps: string[], callback: (child: unknown) => void) {
      injected.push(deps)
      if (deps.includes('webServer') && options.webServer !== undefined) {
        callback(makeChildContext({ webServer: options.webServer }, effects))
      }
      if (deps.includes('settings') && options.settings !== undefined) {
        callback(makeChildContext({ settings: options.settings }, effects))
      }
      return { then: () => undefined }
    },
  }
  return { context: context as unknown as Context, listener, effects, injected, warn }
}
