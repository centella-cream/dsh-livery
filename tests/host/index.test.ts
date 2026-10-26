/**
 * Host plugin entry tests: the functional plugin exports, the lazy version
 * probe, adapter resolution through the generated registry, and the `apply`
 * wiring (unconditional listener, live config reads, per-adapter routes,
 * optional webServer/settings injections, one-line deduped warnings).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import {
  apply,
  bootStateForConfig,
  detectProfileKind,
  getLastGateStatus,
  name,
  observeHostVersion,
  resetLiveryHostForTests,
  resolveAdapter,
  setHostEnvironmentForTests,
} from '../../src/host/index.js'
import { Config } from '../../src/host/config.js'
import type { LiveryHostConfig } from '../../src/host/config.js'
import { ADAPTERS } from '../../src/generated/contract.js'
import { CATALOG_PROFILES } from '../../src/generated/liveries.js'
import { CATALOG_ROUTE, STOCK_ID } from '../../src/core/types.js'
import { fakeRequest } from './fixtures.js'

/** First generated certified adapter, when a compiled catalog exists. */
const FIRST_ADAPTER = ADAPTERS[0]
/** Whether generated catalog profiles are present (false before compile). */
const COMPILED = FIRST_ADAPTER !== undefined
  && Object.keys(CATALOG_PROFILES).length > 0
  && CATALOG_PROFILES[FIRST_ADAPTER.catalogProfile] !== undefined

/** A fake webserver recording registered routes. */
function makeWebServer() {
  const routes = new Map<string, unknown>()
  return {
    routes,
    register(route: { kind: string; path: string; handler: unknown }) {
      routes.set(`${route.kind}:${route.path}`, route.handler)
      return () => routes.delete(`${route.kind}:${route.path}`)
    },
  }
}

/** One captured `ctx.effect` call. */
interface EffectRecord {
  label: string | undefined
  dispose: () => void
}

/** A fake child context carrying one injected service. */
function makeChildContext(services: Record<string, unknown>, effects: EffectRecord[]) {
  return {
    ...services,
    effect(execute: () => (() => void) | void, label?: string) {
      const dispose = execute()
      effects.push({ label, dispose: typeof dispose === 'function' ? dispose : () => {} })
      return () => {}
    },
  }
}

/** A fake Cordis host context with the services `apply` touches. */
function makeHostContext(options: { webServer?: object; settings?: object } = {}) {
  const listener: { current: ((table: IndexInjection[]) => void) | undefined } = { current: undefined }
  const effects: EffectRecord[] = []
  const injected: string[][] = []
  const warn = vi.fn()
  const context = {
    fiber: { uid: 1 },
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

/** A Host config whose volatile value the test controls. */
function liveConfig(initial: string) {
  let value = initial
  return {
    config: { skinId: { get: () => value } } as unknown as LiveryHostConfig,
    set(next: string) {
      value = next
    },
  }
}

/** Seed the environment with the first generated certified adapter's version. */
function seedCertifiedEnvironment(): void {
  if (FIRST_ADAPTER === undefined) throw new Error('no generated adapter')
  setHostEnvironmentForTests({
    profileKind: 'web',
    observedHostVersion: FIRST_ADAPTER.hostVersion,
  })
}

beforeEach(() => {
  resetLiveryHostForTests()
})

afterEach(() => {
  resetLiveryHostForTests()
  vi.restoreAllMocks()
})

describe('plugin exports', () => {
  it('exports the Loader entry name, Config and apply', () => {
    expect(name).toBe('livery')
    expect(typeof apply).toBe('function')
    expect(typeof Config).toBe('function')
    expect((Config as unknown as (input: unknown) => unknown)({}))
      .toEqual({ skinId: expect.objectContaining({ get: expect.any(Function) }) })
  })
})

describe('detectProfileKind', () => {
  it('reports web outside Electron', () => {
    expect(detectProfileKind()).toBe('web')
  })
})

describe('observeHostVersion', () => {
  it('resolves to a string or to null, never rejects', async () => {
    const version = await observeHostVersion()
    expect(version === null || typeof version === 'string').toBe(true)
  })
})

describe('resolveAdapter', () => {
  it('returns undefined before the version probe resolves', () => {
    expect(resolveAdapter()).toBeUndefined()
  })

  it('maps a certified version to its generated adapter', () => {
    if (FIRST_ADAPTER === undefined) return
    seedCertifiedEnvironment()
    expect(resolveAdapter()).toEqual(FIRST_ADAPTER)
  })

  it('returns undefined for an out-of-range version', () => {
    setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: '9.9.9' })
    expect(resolveAdapter()).toBeUndefined()
  })

  it('returns undefined for an in-range uncertified version (exact-only policy)', () => {
    setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: '0.3.0-rc.1' })
    expect(resolveAdapter()).toBeUndefined()
  })
})

describe('bootStateForConfig', () => {
  it('fails closed with zero rows when the version probe has not resolved', () => {
    const state = bootStateForConfig(Config() as LiveryHostConfig)
    expect(state.gate.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.version-unknown')
  })

  it('fails closed for a readable in-range uncertified version (no compat injection)', () => {
    setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: '0.3.0-rc.1' })
    const state = bootStateForConfig({ skinId: { get: () => 'fjord' } } as unknown as LiveryHostConfig)
    expect(state.gate.accepted).toBe(false)
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.version-mismatch')
    expect(state.payload.adapterId).toBe('')
    expect(state.payload.hostVersion).toBe('0.3.0-rc.1')
    expect(state.diagnostics.join('\n')).not.toContain('compat.mode')
    expect((state.payload as { compat?: boolean }).compat).toBeUndefined()
  })

  it('fails closed for an out-of-range host version', () => {
    setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: '9.9.9' })
    const state = bootStateForConfig(Config() as LiveryHostConfig)
    expect(state.gate.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.version-mismatch')
    expect(state.gate.supportedHostVersions.length).toBeGreaterThan(0)
  })

  it.skipIf(!COMPILED)('passes the gate for stock against the certified adapter', () => {
    seedCertifiedEnvironment()
    const state = bootStateForConfig(Config() as LiveryHostConfig)
    expect(state.gate.accepted).toBe(true)
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.payload.adapterId).toBe(FIRST_ADAPTER?.adapterId)
    expect(state.payload.skinId).toBe(STOCK_ID)
  })

  it.skipIf(!COMPILED)('accepts a livery from the active adapter profile', () => {
    seedCertifiedEnvironment()
    if (FIRST_ADAPTER === undefined) return
    const profile = CATALOG_PROFILES[FIRST_ADAPTER.catalogProfile]
    const first = profile?.liveries[0]
    if (first === undefined) return
    const state = bootStateForConfig(Config({ skinId: first.id }) as LiveryHostConfig)
    expect(state.accepted).toBe(true)
    expect(state.rows).toHaveLength(3)
    expect(state.payload.adapterId).toBe(FIRST_ADAPTER.adapterId)
    expect(state.payload.catalogProfile).toBe(FIRST_ADAPTER.catalogProfile)
    expect(state.payload.skinId).toBe(first.id)
  })
})

describe('apply', () => {
  it('registers the index-inject listener unconditionally', () => {
    const host = makeHostContext()
    apply(host.context, Config() as LiveryHostConfig)
    expect(host.listener.current).toBeTypeOf('function')
  })

  it('pushes no rows and warns once for an uncertified host, with a structured line', () => {
    setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: '9.9.9' })
    const host = makeHostContext()
    apply(host.context, Config() as LiveryHostConfig)
    const table: IndexInjection[] = []
    host.listener.current?.(table)
    host.listener.current?.(table)
    expect(table).toEqual([])
    expect(host.warn).toHaveBeenCalledTimes(1)
    const line = String(host.warn.mock.calls[0]?.[0])
    expect(line).toContain('gate.version-mismatch')
    expect(line).toContain('profile=web')
    expect(line).toContain('supported=[')
    expect(getLastGateStatus()?.gate.accepted).toBe(false)
  })

  it('does not warn when the gate passes and the skin is stock', () => {
    if (FIRST_ADAPTER === undefined) return
    seedCertifiedEnvironment()
    const host = makeHostContext()
    apply(host.context, Config() as LiveryHostConfig)
    host.listener.current?.([])
    expect(getLastGateStatus()?.gate.accepted).toBe(true)
    expect(host.warn).not.toHaveBeenCalled()
  })

  it('re-reads the live volatile config on every emit (no remount)', () => {
    setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: '9.9.9' })
    const host = makeHostContext()
    const live = liveConfig(STOCK_ID)
    apply(host.context, live.config)
    host.listener.current?.([])
    expect(getLastGateStatus()?.gate.activeSkinId).toBe(STOCK_ID)

    live.set('definitely-not-a-livery')
    host.listener.current?.([])
    expect(getLastGateStatus()?.gate.activeSkinId).toBe('definitely-not-a-livery')
  })

  it.skipIf(!COMPILED)('emits rows after a persisted stock -> livery change without remount', () => {
    if (FIRST_ADAPTER === undefined) return
    const profile = CATALOG_PROFILES[FIRST_ADAPTER.catalogProfile]
    const first = profile?.liveries[0]
    if (first === undefined) return
    seedCertifiedEnvironment()
    const host = makeHostContext()
    const live = liveConfig(STOCK_ID)
    apply(host.context, live.config)

    const firstTable: IndexInjection[] = []
    host.listener.current?.(firstTable)
    expect(firstTable).toEqual([])
    expect(getLastGateStatus()?.gate.accepted).toBe(true)

    live.set(first.id)
    const secondTable: IndexInjection[] = []
    host.listener.current?.(secondTable)
    expect(secondTable).toHaveLength(3)
    expect(secondTable[0]?.kind).toBe('html')
    expect(getLastGateStatus()?.payload.adapterId).toBe(FIRST_ADAPTER.adapterId)
    expect(getLastGateStatus()?.payload.skinId).toBe(first.id)
  })

  it('registers both routes through ctx.inject([webServer]) and disposes them via effect', () => {
    const webServer = makeWebServer()
    const host = makeHostContext({ webServer })
    apply(host.context, Config() as LiveryHostConfig)
    expect(host.injected).toContainEqual(['webServer'])
    expect([...webServer.routes.keys()]).toEqual([
      `exact:${CATALOG_ROUTE}`,
      'prefix:/livery/assets/previews',
    ])
    const routeEffect = host.effects.find((effect) => effect.label === 'livery: routes')
    expect(routeEffect).toBeDefined()
    routeEffect?.dispose()
    expect(webServer.routes.size).toBe(0)
  })

  it('serves the catalog for the resolved adapter through the registered route', async () => {
    if (FIRST_ADAPTER === undefined) return
    seedCertifiedEnvironment()
    const webServer = makeWebServer()
    const host = makeHostContext({ webServer })
    apply(host.context, Config() as LiveryHostConfig)
    const handler = webServer.routes.get(`exact:${CATALOG_ROUTE}`) as (
      req: unknown,
      res: unknown,
    ) => Promise<void>
    const chunks: unknown[] = []
    const res = {
      headersSent: false,
      writableEnded: false,
      statusCode: 0,
      headers: {} as Record<string, string>,
      writeHead(status: number, headers: Record<string, string>) {
        this.statusCode = status
        this.headers = headers
        this.headersSent = true
        return this
      },
      end(body?: unknown) {
        chunks.push(body)
        this.writableEnded = true
      },
    }
    await handler(fakeRequest('GET', CATALOG_ROUTE), res)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/json')
    expect(res.headers['cache-control']).toBe('no-store')
    const parsed = JSON.parse(String(chunks[0])) as Record<string, unknown>
    expect(parsed.adapterId).toBe(FIRST_ADAPTER.adapterId)
    expect(parsed.hostVersion).toBe(FIRST_ADAPTER.hostVersion)
    expect(parsed.contractHash).toBe(FIRST_ADAPTER.contractHash)
    expect(parsed.catalogProfile).toBe(FIRST_ADAPTER.catalogProfile)
  })

  it('serves nothing from the routes before the version probe resolves', async () => {
    const webServer = makeWebServer()
    const host = makeHostContext({ webServer })
    apply(host.context, Config() as LiveryHostConfig)
    const handler = webServer.routes.get(`exact:${CATALOG_ROUTE}`) as (
      req: unknown,
      res: unknown,
    ) => Promise<void>
    const res = {
      headersSent: false,
      writableEnded: false,
      statusCode: 0,
      headers: {} as Record<string, string>,
      writeHead(status: number, headers: Record<string, string>) {
        this.statusCode = status
        this.headers = headers
        this.headersSent = true
        return this
      },
      end() {
        this.writableEnded = true
      },
    }
    await handler(fakeRequest('GET', CATALOG_ROUTE), res)
    expect(res.statusCode).toBe(404)
  })

  it('configures the settings policy with auto:false through ctx.inject([settings])', () => {
    const configure = vi.fn(() => () => {})
    const host = makeHostContext({ settings: { configure } })
    apply(host.context, Config() as LiveryHostConfig)
    expect(host.injected).toContainEqual(['settings'])
    expect(configure).toHaveBeenCalledTimes(1)
    expect(configure).toHaveBeenCalledWith({ auto: false }, expect.anything())
    expect(host.effects.some((effect) => effect.label === 'livery: settings policy')).toBe(true)
  })

  it('shows no trace when the settings service is absent (and does not fail)', () => {
    const host = makeHostContext()
    expect(() => apply(host.context, Config() as LiveryHostConfig)).not.toThrow()
    expect(host.effects).toEqual([])
  })

  it('does not fail when settings.configure throws', () => {
    const configure = vi.fn(() => {
      throw new Error('settings locked')
    })
    const host = makeHostContext({ settings: { configure } })
    expect(() => apply(host.context, Config() as LiveryHostConfig)).not.toThrow()
    expect(host.effects.some((effect) => effect.label === 'livery: settings policy')).toBe(true)
  })
})
