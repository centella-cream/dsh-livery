/**
 * Route tests: per-adapter catalog identity, per-profile preview whitelisting,
 * status codes, headers, HEAD semantics, and the two failure modes that matter
 * on a public HTTP surface — traversal and a response that is already finished.
 */

import { describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  createCatalogHandler,
  createLiveryRouteHandlers,
  createPreviewHandler,
  previewRouteBase,
  registerLiveryRoutes,
  type LiveryRouteHandler,
  type LiveryWebServerLike,
} from '../../src/host/routes.js'
import { buildCatalog, previewsBaseFor } from '../../src/host/catalog.js'
import { CATALOG_ROUTE, PREVIEW_ROUTE_PREFIX } from '../../src/core/types.js'
import type { AdapterRecord } from '../../src/generated/contract.js'
import {
  SYNTHETIC_PROFILE_A,
  SYNTHETIC_PROFILE_B,
  FakeResponse,
  fakeRequest,
  makeAdapter,
  makeLivery,
  makeProfile,
} from './fixtures.js'

/**
 * Run one handler against fakes.
 * @param handler - route handler under test.
 * @param method - HTTP method.
 * @param url - request target.
 * @returns the recording response.
 */
async function invoke(
  handler: LiveryRouteHandler,
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

const ADAPTER: AdapterRecord = makeAdapter()
const OTHER_PROFILE_ADAPTER: AdapterRecord = makeAdapter({
  hostVersion: 'test-host-9.0.0',
  adapterId: 'dsh-test-host-9.0.0-r1',
  contractHash: `sha256:${'9'.repeat(64)}`,
  catalogProfile: SYNTHETIC_PROFILE_B,
})
const CATALOG = buildCatalog(ADAPTER, makeProfile(ADAPTER.catalogProfile, [makeLivery()]))
const PREVIEW_NAME = 'ivory-slate-zh-light.svg'
const PREVIEW_PATH = `/virtual/lib/previews/${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}`
const PREVIEW_SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

/** Preview handler wired to a virtual per-profile whitelist and recording reader. */
function previewHandler(options: {
  adapter?: AdapterRecord
  failRead?: boolean
  profilePreviews?: ReadonlyMap<string, ReadonlyMap<string, string>>
} = {}) {
  const reads: string[] = []
  const handler = createPreviewHandler({
    adapter: options.adapter ?? ADAPTER,
    profilePreviews: options.profilePreviews ?? new Map([
      [SYNTHETIC_PROFILE_A, new Map([[PREVIEW_NAME, PREVIEW_PATH]])],
    ]),
    readAsset: async (filePath) => {
      reads.push(filePath)
      if (options.failRead === true) throw new Error('ENOENT')
      return new TextEncoder().encode(PREVIEW_SVG)
    },
  })
  return { handler, reads }
}

describe('GET /livery/api/catalog', () => {
  it("answers 200 JSON with the live adapter's identity and profile", async () => {
    const handler = createCatalogHandler({ adapter: ADAPTER, catalogFor: () => CATALOG })
    const response = await invoke(handler, 'GET', CATALOG_ROUTE)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('application/json')
    expect(response.headers['cache-control']).toBe('no-store')
    const body = String(response.body)
    expect(response.headers['content-length']).toBe(String(Buffer.byteLength(body)))
    const parsed = JSON.parse(body) as Record<string, unknown>
    expect(parsed.adapterId).toBe(ADAPTER.adapterId)
    expect(parsed.hostVersion).toBe(ADAPTER.hostVersion)
    expect(parsed.contractHash).toBe(ADAPTER.contractHash)
    expect(parsed.catalogProfile).toBe(SYNTHETIC_PROFILE_A)
    expect(parsed.previewsBase).toBe(previewsBaseFor(SYNTHETIC_PROFILE_A))
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.liveries).toHaveLength(1)
  })

  it('uses the catalog builder seam and caches per adapter', async () => {
    const built: string[] = []
    const handler = createCatalogHandler({
      adapter: ADAPTER,
      catalogFor: (adapter) => {
        built.push(adapter.adapterId)
        return CATALOG
      },
    })
    const first = await invoke(handler, 'GET', CATALOG_ROUTE)
    const second = await invoke(handler, 'GET', `${CATALOG_ROUTE}?v=2`)
    expect(String(first.body)).toBe(String(second.body))
    expect(built).toEqual([ADAPTER.adapterId])
  })

  it('answers HEAD with the same headers and content length but no body', async () => {
    const handler = createCatalogHandler({ adapter: ADAPTER })
    const response = await invoke(handler, 'HEAD', CATALOG_ROUTE)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('application/json')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(Number(response.headers['content-length'])).toBeGreaterThan(0)
    expect(response.ended).toBe(true)
    expect(response.body).toBeUndefined()
  })

  it.each(['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])('rejects %s with 405 and Allow', async (method) => {
    const handler = createCatalogHandler({ adapter: ADAPTER })
    const response = await invoke(handler, method, CATALOG_ROUTE)
    expect(response.statusCode).toBe(405)
    expect(response.headers.allow).toBe('GET, HEAD')
    expect(response.body).toBeUndefined()
  })

  it('answers 404 for an uncertified host (no adapter resolved)', async () => {
    const handler = createCatalogHandler({ adapterFor: () => undefined })
    const response = await invoke(handler, 'GET', CATALOG_ROUTE)
    expect(response.statusCode).toBe(404)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body).toBeUndefined()
  })

  it('fails closed when the adapter resolver throws', async () => {
    const handler = createCatalogHandler({
      adapterFor: () => {
        throw new Error('probe disposed')
      },
    })
    const response = await invoke(handler, 'GET', CATALOG_ROUTE)
    expect(response.statusCode).toBe(404)
  })

  it('resolves the adapter per request, so a late version probe is picked up', async () => {
    let current: AdapterRecord | undefined
    const handler = createCatalogHandler({ adapterFor: () => current })
    const before = await invoke(handler, 'GET', CATALOG_ROUTE)
    expect(before.statusCode).toBe(404)
    current = ADAPTER
    const first = await invoke(handler, 'GET', CATALOG_ROUTE)
    expect(first.statusCode).toBe(200)
    expect((JSON.parse(String(first.body)) as { adapterId: string }).adapterId).toBe(ADAPTER.adapterId)
    current = OTHER_PROFILE_ADAPTER
    const second = await invoke(handler, 'GET', CATALOG_ROUTE)
    expect((JSON.parse(String(second.body)) as { catalogProfile: string }).catalogProfile)
      .toBe(SYNTHETIC_PROFILE_B)
  })

  it('answers 500 when the catalog builder fails', async () => {
    const handler = createCatalogHandler({
      adapter: ADAPTER,
      catalogFor: () => {
        throw new Error('catalog corrupt')
      },
    })
    const response = await invoke(handler, 'GET', CATALOG_ROUTE)
    expect(response.statusCode).toBe(500)
  })

  it('never writes after the response is already finished', async () => {
    const handler = createCatalogHandler({ adapter: ADAPTER })
    const response = new FakeResponse()
    response.headersSent = true
    await handler(
      fakeRequest('GET', CATALOG_ROUTE) as unknown as IncomingMessage,
      response as unknown as ServerResponse,
    )
    expect(response.statusCode).toBe(0)
    expect(response.ended).toBe(false)
  })
})

describe('GET /livery/assets/previews/<catalogProfile>/<file>', () => {
  it('serves a whitelisted file of the active profile as SVG with no-store', async () => {
    const { handler, reads } = previewHandler()
    const response = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}`)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('image/svg+xml')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['content-length']).toBe(String(Buffer.byteLength(PREVIEW_SVG)))
    expect(Buffer.from(response.body as Uint8Array).toString()).toBe(PREVIEW_SVG)
    expect(reads).toEqual([PREVIEW_PATH])
  })

  it('answers HEAD with headers and no body', async () => {
    const { handler } = previewHandler()
    const response = await invoke(handler, 'HEAD', `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}`)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('image/svg+xml')
    expect(Number(response.headers['content-length'])).toBeGreaterThan(0)
    expect(response.body).toBeUndefined()
  })

  it('serves a name with a query string (query is not part of the name)', async () => {
    const { handler } = previewHandler()
    const response = await invoke(
      handler,
      'GET',
      `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}?v=1`,
    )
    expect(response.statusCode).toBe(200)
  })

  it('decodes a percent-encoded whitelisted name before lookup', async () => {
    const { handler } = previewHandler()
    const response = await invoke(
      handler,
      'GET',
      `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/%69vory-slate-zh-light.svg`,
    )
    expect(response.statusCode).toBe(200)
  })

  it('answers 404 for another catalog profile (never cross-serves a compiled set)', async () => {
    const { handler, reads } = previewHandler()
    const response = await invoke(
      handler,
      'GET',
      `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_B}/${PREVIEW_NAME}`,
    )
    expect(response.statusCode).toBe(404)
    expect(reads).toEqual([])
  })

  it('answers 404 for an unknown file in the active profile', async () => {
    const { handler } = previewHandler()
    const response = await invoke(
      handler,
      'GET',
      `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/unknown.svg`,
    )
    expect(response.statusCode).toBe(404)
  })

  it('answers 404 when the active profile has no index bound', async () => {
    const handler = createPreviewHandler({
      adapter: ADAPTER,
      profilePreviews: new Map([[SYNTHETIC_PROFILE_B, new Map([[PREVIEW_NAME, PREVIEW_PATH]])]]),
      readAsset: async () => new Uint8Array(),
    })
    const response = await invoke(
      handler,
      'GET',
      `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}`,
    )
    expect(response.statusCode).toBe(404)
  })

  it('answers 404 when the bound file disappears', async () => {
    const { handler } = previewHandler({ failRead: true })
    const response = await invoke(
      handler,
      'GET',
      `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}`,
    )
    expect(response.statusCode).toBe(404)
  })

  it.each([
    `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/../secret.svg`,
    `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/%2e%2e%2fsecret.svg`,
    `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/..%2Fsecret.svg`,
    `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/a%2F..%2Fsecret.svg`,
    `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/..\\secret.svg`,
    `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/%00.svg`,
    `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/`,
    `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}`,
    PREVIEW_ROUTE_PREFIX,
    '/etc/passwd',
    '/livery/api/catalog',
  ])('answers 404 for traversal/unknown target %s', async (target) => {
    const { handler, reads } = previewHandler()
    const response = await invoke(handler, 'GET', target)
    expect(response.statusCode).toBe(404)
    expect(reads).toEqual([])
  })

  it('answers 404 for a malformed percent-encoding instead of throwing', async () => {
    const { handler } = previewHandler()
    const response = await invoke(
      handler,
      'GET',
      `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/%zz.svg`,
    )
    expect(response.statusCode).toBe(404)
  })

  it.each(['POST', 'PUT', 'DELETE'])('rejects %s with 405 and Allow', async (method) => {
    const { handler } = previewHandler()
    const response = await invoke(
      handler,
      method,
      `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}`,
    )
    expect(response.statusCode).toBe(405)
    expect(response.headers.allow).toBe('GET, HEAD')
  })

  it('answers 404 for an uncertified host (no adapter resolved)', async () => {
    const response = await invoke(
      createPreviewHandler({ adapterFor: () => undefined, profilePreviews: new Map() }),
      'GET',
      `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}`,
    )
    expect(response.statusCode).toBe(404)
  })

  it('serves the profile of whichever adapter is live at request time', async () => {
    let current: AdapterRecord | undefined = ADAPTER
    const profilePreviews = new Map([
      [SYNTHETIC_PROFILE_A, new Map([[PREVIEW_NAME, PREVIEW_PATH]])],
      [SYNTHETIC_PROFILE_B, new Map([[PREVIEW_NAME, `/virtual/lib/previews/${SYNTHETIC_PROFILE_B}/${PREVIEW_NAME}`]])],
    ])
    const handler = createPreviewHandler({
      adapterFor: () => current,
      profilePreviews,
      readAsset: async () => new TextEncoder().encode(PREVIEW_SVG),
    })
    const own = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}`)
    expect(own.statusCode).toBe(200)
    current = OTHER_PROFILE_ADAPTER
    const old = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}`)
    expect(old.statusCode).toBe(404)
    const next = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_B}/${PREVIEW_NAME}`)
    expect(next.statusCode).toBe(200)
  })

  it('never writes after the response is already finished', async () => {
    const { handler } = previewHandler()
    const response = new FakeResponse()
    response.headersSent = true
    await handler(
      fakeRequest('GET', `${PREVIEW_ROUTE_PREFIX}${SYNTHETIC_PROFILE_A}/${PREVIEW_NAME}`) as unknown as IncomingMessage,
      response as unknown as ServerResponse,
    )
    expect(response.statusCode).toBe(0)
    expect(response.ended).toBe(false)
  })
})

describe('createLiveryRouteHandlers', () => {
  it('returns one catalog and one preview handler', async () => {
    const handlers = createLiveryRouteHandlers({
      adapter: ADAPTER,
      catalogFor: () => CATALOG,
      profilePreviews: new Map(),
      readAsset: async () => new Uint8Array(),
    })
    expect(typeof handlers.catalog).toBe('function')
    expect(typeof handlers.preview).toBe('function')
    const response = await invoke(handlers.catalog, 'GET', CATALOG_ROUTE)
    expect(response.statusCode).toBe(200)
    expect((JSON.parse(String(response.body)) as { adapterId: string }).adapterId).toBe(ADAPTER.adapterId)
  })
})

/** In-memory webserver double recording registrations and disposals. */
class FakeWebServer implements LiveryWebServerLike {
  readonly routes = new Map<string, LiveryRouteHandler>()
  readonly disposed: string[] = []
  failOnPath: string | undefined

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

describe('registerLiveryRoutes', () => {
  it('registers the exact catalog route and the preview prefix route', () => {
    const webServer = new FakeWebServer()
    const release = registerLiveryRoutes(webServer, {
      adapter: ADAPTER,
      catalogFor: () => CATALOG,
      profilePreviews: new Map(),
      readAsset: async () => new Uint8Array(),
    })
    expect([...webServer.routes.keys()]).toEqual([
      `exact:${CATALOG_ROUTE}`,
      `prefix:${previewRouteBase()}`,
    ])
    expect(previewRouteBase()).toBe('/livery/assets/previews')
    release()
    expect(webServer.routes.size).toBe(0)
    expect(webServer.disposed).toEqual([
      `prefix:${previewRouteBase()}`,
      `exact:${CATALOG_ROUTE}`,
    ])
  })

  it('is idempotent to dispose twice', () => {
    const webServer = new FakeWebServer()
    const release = registerLiveryRoutes(webServer, { adapterFor: () => undefined })
    release()
    expect(() => release()).not.toThrow()
  })

  it('disposes the first route when the second registration fails, then rethrows', () => {
    const webServer = new FakeWebServer()
    webServer.failOnPath = previewRouteBase()
    expect(() => registerLiveryRoutes(webServer, { adapterFor: () => undefined }))
      .toThrow(/duplicate route/)
    expect(webServer.routes.size).toBe(0)
    expect(webServer.disposed).toEqual([`exact:${CATALOG_ROUTE}`])
  })
})
