/**
 * Host plugin entry tests: the functional plugin exports, the lazy version
 * probe, and the `apply` wiring (unconditional listener, live config reads,
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
  setHostEnvironmentForTests,
} from '../../src/host/index.js'
import { Config } from '../../src/host/config.js'
import type { LiveryHostConfig } from '../../src/host/config.js'
import { CONTRACT_FACTS } from '../../src/generated/contract.js'
import { CATALOG_META, LIVERIES } from '../../src/generated/liveries.js'
import { CATALOG_ROUTE, STOCK_ID } from '../../src/core/types.js'
import { fakeRequest } from './fixtures.js'

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
  const childContexts: unknown[] = []
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
        const child = makeChildContext({ webServer: options.webServer }, effects)
        childContexts.push(child)
        callback(child)
      }
      if (deps.includes('settings') && options.settings !== undefined) {
        const child = makeChildContext({ settings: options.settings }, effects)
        childContexts.push(child)
        callback(child)
      }
      return { then: () => undefined }
    },
  }
  return { context: context as unknown as Context, listener, effects, injected, warn, childContexts }
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

/** Seed the environment with an exactly matching host identity. */
function seedMatchingEnvironment(): void {
  setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: CONTRACT_FACTS.dshVersion })
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
    // A Schemastery schema is callable and validates the one volatile field.
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

describe('bootStateForConfig', () => {
  it.skipIf(CATALOG_META.contractHash !== CONTRACT_FACTS.contractHash)(
    'passes the gate for stock and emits no rows',
    () => {
    seedMatchingEnvironment()
    const state = bootStateForConfig(Config() as LiveryHostConfig)
    expect(state.gate.accepted).toBe(true)
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.payload.skinId).toBe(STOCK_ID)
    expect(state.payload.cssHash).toBe('')
    },
  )

  it('rejects an unknown skin id without touching the generated catalog', () => {
    seedMatchingEnvironment()
    const state = bootStateForConfig(Config({ skinId: 'definitely-not-a-livery' }) as LiveryHostConfig)
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.skin-unknown')
  })

  it('fails closed when the environment probe has not resolved', () => {
    const state = bootStateForConfig(Config() as LiveryHostConfig)
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.version-unknown')
  })

  it.skipIf(LIVERIES.length === 0)('accepts a generated livery when the contract matches', () => {
    seedMatchingEnvironment()
    const first = LIVERIES[0]
    if (first === undefined) return
    const state = bootStateForConfig(Config({ skinId: first.id }) as LiveryHostConfig)
    // Placeholder generated artifacts (before `pnpm liveries:compile`) carry a
    // non-certified contract hash; the gate must close rather than guess.
    if (CATALOG_META.contractHash !== CONTRACT_FACTS.contractHash) {
      expect(state.accepted).toBe(false)
      expect(state.rows).toEqual([])
      return
    }
    expect(state.accepted).toBe(true)
    expect(state.rows).toHaveLength(3)
    expect(state.payload.skinId).toBe(first.id)
  })
})

describe('apply', () => {
  it('registers the index-inject listener unconditionally', () => {
    const host = makeHostContext()
    apply(host.context, Config() as LiveryHostConfig)
    expect(host.listener.current).toBeTypeOf('function')
  })

  it('pushes no rows and warns once for a closed gate', () => {
    setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: '9.9.9' })
    const host = makeHostContext()
    apply(host.context, Config() as LiveryHostConfig)
    const table: IndexInjection[] = []
    host.listener.current?.(table)
    host.listener.current?.(table)
    expect(table).toEqual([])
    expect(host.warn).toHaveBeenCalledTimes(1)
    expect(String(host.warn.mock.calls[0]?.[0])).toContain('gate.version-mismatch')
    expect(String(host.warn.mock.calls[0]?.[0])).toContain('profile=web')
    expect(getLastGateStatus()?.accepted).toBe(false)
  })

  it('re-reads the live volatile config on every emit (no remount)', () => {
    const host = makeHostContext()
    const live = liveConfig(STOCK_ID)
    seedMatchingEnvironment()
    apply(host.context, live.config)
    host.listener.current?.([])
    expect(getLastGateStatus()?.gate.activeSkinId).toBe(STOCK_ID)

    // Whatever the generated-catalog state, the next emit must observe the new
    // value: the gate reports the requested id it just read.
    live.set('definitely-not-a-livery')
    host.listener.current?.([])
    expect(getLastGateStatus()?.gate.activeSkinId).toBe('definitely-not-a-livery')
    expect(getLastGateStatus()?.gate.codes).toContain('gate.skin-unknown')
  })

  it.skipIf(
    LIVERIES.length === 0 || CATALOG_META.contractHash !== CONTRACT_FACTS.contractHash,
  )('emits rows after a persisted stock -> livery change without remount', () => {
    const host = makeHostContext()
    const live = liveConfig(STOCK_ID)
    seedMatchingEnvironment()
    apply(host.context, live.config)
    const firstTable: IndexInjection[] = []
    host.listener.current?.(firstTable)
    expect(firstTable).toEqual([])
    expect(getLastGateStatus()?.gate.accepted).toBe(true)
    expect(getLastGateStatus()?.accepted).toBe(false)

    const liveryId = LIVERIES[0]?.id
    if (liveryId === undefined) return
    live.set(liveryId)
    const secondTable: IndexInjection[] = []
    host.listener.current?.(secondTable)
    expect(secondTable).toHaveLength(3)
    expect(secondTable[0]?.kind).toBe('html')
    expect(getLastGateStatus()?.payload.skinId).toBe(liveryId)
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

  it('serves the catalog route registered by apply', async () => {
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
    expect(String(chunks[0])).toContain('"schemaVersion":1')
  })

  it('never throws out of the index listener for a stock config', () => {
    const host = makeHostContext()
    apply(host.context, Config() as LiveryHostConfig)
    expect(() => host.listener.current?.([])).not.toThrow()
  })
})
