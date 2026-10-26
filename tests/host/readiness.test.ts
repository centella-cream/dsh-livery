/**
 * Cold-start readiness tests.
 *
 * The runtime version probe has an async fallback, so an index render or an
 * HTTP request can race it. These tests pin the contract:
 *
 * - a synchronous probe settles the environment inside `apply`, so the very
 *   first index render already carries boot rows;
 * - an async probe that settles before the first render behaves the same;
 * - while the probe is still pending, pages fail closed to stock *without*
 *   logging a compatibility failure, and async callers wait (bounded);
 * - routes answer with the real catalog when the probe resolves in time and 404
 *   only after a timeout / genuine unknown;
 * - a throwing probe never crashes, rejects or hangs the host.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import {
  apply,
  awaitHostEnvironment,
  bootStateForConfig,
  bootStateForConfigWhenReady,
  getLastGateStatus,
  hostReadiness,
  isHostReady,
  observeHostVersionSync,
  resetLiveryHostForTests,
  resolveAdapter,
  setHostEnvironmentForTests,
  setHostVersionProbeForTests,
  setHostVersionSyncProbeForTests,
  HOST_READINESS_TIMEOUT_MS,
} from '../../src/host/index.js'
import {
  createCatalogHandler,
  createPreviewHandler,
  DEFAULT_READINESS_TIMEOUT_MS,
} from '../../src/host/routes.js'
import { Config } from '../../src/host/config.js'
import type { LiveryHostConfig } from '../../src/host/config.js'
import { ADAPTERS } from '../../src/generated/contract.js'
import { CATALOG_PROFILES } from '../../src/generated/liveries.js'
import { CATALOG_ROUTE, PREVIEW_ROUTE_PREFIX } from '../../src/core/types.js'
import {
  FakeResponse,
  FakeWebServer,
  deferred,
  fakeRequest,
  makeFakeHostContext,
} from './fixtures.js'

/** First generated certified adapter (undefined only on a placeholder build). */
const FIRST_ADAPTER = ADAPTERS[0]
/** Compiled catalog profile for the first adapter, when the catalog is compiled. */
const FIRST_PROFILE = FIRST_ADAPTER === undefined
  ? undefined
  : CATALOG_PROFILES[FIRST_ADAPTER.catalogProfile]
/** First shipped livery of that profile. */
const FIRST_LIVERY = FIRST_PROFILE?.liveries[0]
/** Whether the generated catalog can exercise accepted boot states. */
const COMPILED = FIRST_ADAPTER !== undefined && FIRST_LIVERY !== undefined

/** Exact certified version used by the default fake probe. */
const CERTIFIED_VERSION = FIRST_ADAPTER?.hostVersion ?? '0.2.1-rc.2'
/** Catalog profile the certified adapter renders with. */
const CERTIFIED_PROFILE = FIRST_ADAPTER?.catalogProfile ?? 'sha256:fixture-profile'
/** Skin id the accepted-state tests configure (undefined only on a placeholder build). */
const LIVERY_SKIN_ID = FIRST_LIVERY?.id ?? 'ivory-slate'

/**
 * Run one route handler against recording fakes.
 * @param handler - route handler.
 * @param method - HTTP method.
 * @param url - request target.
 * @returns the recording response.
 */
async function invoke(
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>,
  method: string,
  url: string,
): Promise<FakeResponse> {
  const response = new FakeResponse()
  await handler(
    fakeRequest(method, url) as unknown as IncomingMessage,
    response as unknown as ServerResponse,
  )
  return response
}

/**
 * Let pending microtasks/macrotasks run without resolving the probe.
 * @param ms - real milliseconds to yield.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

beforeEach(() => {
  resetLiveryHostForTests()
})

afterEach(() => {
  resetLiveryHostForTests()
})

describe('readiness constants', () => {
  it('bound cold-start waits to 1.5 s in both host and routes', () => {
    expect(HOST_READINESS_TIMEOUT_MS).toBe(1500)
    expect(DEFAULT_READINESS_TIMEOUT_MS).toBe(1500)
  })
})

describe('observeHostVersionSync', () => {
  it('returns a string or null without throwing (no app-boot in the test tree)', () => {
    const version = observeHostVersionSync()
    expect(version === null || typeof version === 'string').toBe(true)
  })
})

describe('first index render', () => {
  it.skipIf(!COMPILED)('carries boot rows when the synchronous probe settles inside apply', () => {
    setHostVersionProbeForTests(async () => {
      throw new Error('async probe must not be needed when the sync fast path settles')
    })
    setHostVersionSyncProbeForTests(() => CERTIFIED_VERSION)
    const host = makeFakeHostContext()
    apply(host.context, Config({ skinId: LIVERY_SKIN_ID }) as LiveryHostConfig)

    // Settled synchronously: no wait, no timer, no fallback to stock.
    expect(isHostReady()).toBe(true)
    expect(resolveAdapter()).toEqual(FIRST_ADAPTER)
    const firstTable: IndexInjection[] = []
    host.listener.current?.(firstTable)
    expect(firstTable).toHaveLength(3)
    expect(getLastGateStatus()?.payload.adapterId).toBe(FIRST_ADAPTER?.adapterId)
    expect(host.warn).not.toHaveBeenCalled()
  })

  it.skipIf(!COMPILED)('carries boot rows when the async probe resolves before the first render', async () => {
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(async () => CERTIFIED_VERSION)
    const host = makeFakeHostContext()
    apply(host.context, Config({ skinId: LIVERY_SKIN_ID }) as LiveryHostConfig)
    // The common async path: the render happens after readiness is awaited.
    await hostReadiness()
    const table: IndexInjection[] = []
    host.listener.current?.(table)
    expect(table).toHaveLength(3)
    expect(isHostReady()).toBe(true)
  })

  it.skipIf(!COMPILED)('fails closed silently while pending, then emits rows after resolution', async () => {
    const probe = deferred<string | null>()
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(() => probe.promise)
    const host = makeFakeHostContext()
    apply(host.context, Config({ skinId: LIVERY_SKIN_ID }) as LiveryHostConfig)

    // First render races the probe: stock, no rows, and no compatibility warning
    // (nothing is known to be incompatible yet — it is merely not ready).
    const racingTable: IndexInjection[] = []
    host.listener.current?.(racingTable)
    expect(racingTable).toEqual([])
    expect(isHostReady()).toBe(false)
    expect(getLastGateStatus()?.gate.accepted).toBe(false)
    expect(host.warn).not.toHaveBeenCalled()

    probe.resolve(CERTIFIED_VERSION)
    await hostReadiness()
    const laterTable: IndexInjection[] = []
    host.listener.current?.(laterTable)
    expect(laterTable).toHaveLength(3)
    expect(getLastGateStatus()?.payload.hostVersion).toBe(CERTIFIED_VERSION)
  })

  it('treats a throwing async probe as a genuine unknown host, never crashing', async () => {
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(async () => {
      throw new Error('probe exploded')
    })
    const host = makeFakeHostContext()
    apply(host.context, Config() as LiveryHostConfig)

    const environment = await hostReadiness()
    expect(environment.observedHostVersion).toBeNull()
    const table: IndexInjection[] = []
    expect(() => host.listener.current?.(table)).not.toThrow()
    expect(table).toEqual([])
    expect(host.warn).toHaveBeenCalledTimes(1)
    expect(String(host.warn.mock.calls[0]?.[0])).toContain('gate.version-unknown')
  })

  it('falls back to the async probe when the synchronous probe throws', async () => {
    setHostVersionSyncProbeForTests(() => {
      throw new Error('sync probe exploded')
    })
    setHostVersionProbeForTests(async () => CERTIFIED_VERSION)
    const host = makeFakeHostContext()
    expect(() => apply(host.context, Config() as LiveryHostConfig)).not.toThrow()
    expect(isHostReady()).toBe(false)
    const environment = await hostReadiness()
    expect(environment.observedHostVersion).toBe(CERTIFIED_VERSION)
    expect(resolveAdapter()).toEqual(FIRST_ADAPTER)
    expect(host.listener.current).toBeTypeOf('function')
  })
})

describe('bounded readiness for async callers', () => {
  it('awaitHostEnvironment resolves with the real environment when the probe settles', async () => {
    const probe = deferred<string | null>()
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(() => probe.promise)
    apply(makeFakeHostContext().context, Config() as LiveryHostConfig)

    const pending = awaitHostEnvironment(1000)
    probe.resolve(CERTIFIED_VERSION)
    await expect(pending).resolves.toEqual({
      profileKind: expect.any(String),
      observedHostVersion: CERTIFIED_VERSION,
    })
  })

  it('times out without latching "unknown" and picks the version up when it arrives later', async () => {
    const probe = deferred<string | null>()
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(() => probe.promise)
    apply(makeFakeHostContext().context, Config() as LiveryHostConfig)

    const started = Date.now()
    const environment = await awaitHostEnvironment(25)
    const elapsed = Date.now() - started
    expect(environment.observedHostVersion).toBeNull()
    expect(elapsed).toBeGreaterThanOrEqual(15)
    expect(elapsed).toBeLessThan(1000)
    expect(isHostReady()).toBe(false)

    // The probe keeps running: a later caller gets the real environment.
    probe.resolve(CERTIFIED_VERSION)
    await expect(awaitHostEnvironment(1000)).resolves.toMatchObject({
      observedHostVersion: CERTIFIED_VERSION,
    })
    expect(resolveAdapter()).toEqual(FIRST_ADAPTER)
  })

  it.skipIf(!COMPILED)('bootStateForConfigWhenReady waits for the probe then evaluates', async () => {
    const probe = deferred<string | null>()
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(() => probe.promise)
    apply(makeFakeHostContext().context, Config() as LiveryHostConfig)

    const pending = bootStateForConfigWhenReady(
      Config({ skinId: LIVERY_SKIN_ID }) as LiveryHostConfig,
      1000,
    )
    await sleep(5)
    probe.resolve(CERTIFIED_VERSION)
    const state = await pending
    expect(state.accepted).toBe(true)
    expect(state.rows).toHaveLength(3)
    expect(state.payload.adapterId).toBe(FIRST_ADAPTER?.adapterId)
  })

  it('bootStateForConfigWhenReady is fail-closed after its own timeout', async () => {
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(() => new Promise<string | null>(() => {}))
    apply(makeFakeHostContext().context, Config() as LiveryHostConfig)
    const state = await bootStateForConfigWhenReady(Config() as LiveryHostConfig, 20)
    expect(state.gate.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.version-unknown')
  })

  it('bootStateForConfig stays synchronous and fail-closed for unresolved probes', () => {
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(() => new Promise<string | null>(() => {}))
    const state = bootStateForConfig(Config() as LiveryHostConfig)
    expect(state.gate.accepted).toBe(false)
    expect(state.rows).toEqual([])
  })
})

describe('routes during cold start', () => {
  it.skipIf(!COMPILED)('catalog request waits for a pending probe instead of 404ing', async () => {
    const probe = deferred<string | null>()
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(() => probe.promise)
    const webServer = new FakeWebServer()
    const host = makeFakeHostContext({ webServer })
    apply(host.context, Config() as LiveryHostConfig)
    const handler = webServer.routes.get(`exact:${CATALOG_ROUTE}`)
    if (handler === undefined) throw new Error('catalog route not registered')

    let settled = false
    const responsePromise = invoke(handler, 'GET', CATALOG_ROUTE).then((response) => {
      settled = true
      return response
    })
    await sleep(10)
    // Still pending: no response may be written while readiness is in flight.
    expect(settled).toBe(false)

    probe.resolve(CERTIFIED_VERSION)
    const response = await responsePromise
    expect(response.statusCode).toBe(200)
    const parsed = JSON.parse(String(response.body)) as Record<string, unknown>
    expect(parsed.adapterId).toBe(FIRST_ADAPTER?.adapterId)
    expect(parsed.hostVersion).toBe(CERTIFIED_VERSION)
  })

  it('answers 404 only after its bounded wait when the probe never settles', async () => {
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(() => new Promise<string | null>(() => {}))
    apply(makeFakeHostContext().context, Config() as LiveryHostConfig)

    const handler = createCatalogHandler({
      adapterFor: resolveAdapter,
      whenReady: () => awaitHostEnvironment(),
      readinessTimeoutMs: 25,
    })
    const started = Date.now()
    const response = await invoke(handler, 'GET', CATALOG_ROUTE)
    const elapsed = Date.now() - started
    expect(response.statusCode).toBe(404)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(elapsed).toBeGreaterThanOrEqual(15)
    expect(elapsed).toBeLessThan(1000)
  })

  it('does not block non-read methods on readiness', async () => {
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(() => new Promise<string | null>(() => {}))
    apply(makeFakeHostContext().context, Config() as LiveryHostConfig)
    const handler = createCatalogHandler({
      adapterFor: resolveAdapter,
      whenReady: () => awaitHostEnvironment(),
    })
    const started = Date.now()
    const response = await invoke(handler, 'POST', CATALOG_ROUTE)
    expect(response.statusCode).toBe(405)
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('ignores a rejecting readiness gate and resolves normally (no hang/crash)', async () => {
    setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: CERTIFIED_VERSION })
    const handler = createCatalogHandler({
      adapterFor: resolveAdapter,
      whenReady: async () => {
        throw new Error('readiness exploded')
      },
    })
    const response = await invoke(handler, 'GET', CATALOG_ROUTE)
    expect(response.statusCode).toBe(200)
  })

  it.skipIf(!COMPILED)('preview request waits for a pending probe too', async () => {
    const probe = deferred<string | null>()
    setHostVersionSyncProbeForTests(null)
    setHostVersionProbeForTests(() => probe.promise)
    apply(makeFakeHostContext().context, Config() as LiveryHostConfig)

    const previewName = 'fixture-light.svg'
    const handler = createPreviewHandler({
      adapterFor: resolveAdapter,
      whenReady: () => awaitHostEnvironment(),
      readinessTimeoutMs: 1000,
      profilePreviews: new Map([
        [CERTIFIED_PROFILE, new Map([[previewName, '/virtual/fixture-light.svg']])],
      ]),
      readAsset: async () => new TextEncoder().encode('<svg></svg>'),
    })
    const request = invoke(
      handler,
      'GET',
      `${PREVIEW_ROUTE_PREFIX}${CERTIFIED_PROFILE}/${previewName}`,
    )
    await sleep(5)
    probe.resolve(CERTIFIED_VERSION)
    const response = await request
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('image/svg+xml')
  })

  it('resolves the adapter synchronously once the environment is latched', () => {
    setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: CERTIFIED_VERSION })
    expect(resolveAdapter()).toEqual(FIRST_ADAPTER)
  })
})
