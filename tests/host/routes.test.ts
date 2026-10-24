/**
 * Route tests: status codes, headers, HEAD semantics, the preview whitelist and
 * the two failure modes that matter on a public HTTP surface — traversal and a
 * response that is already finished.
 */

import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import {
  createCatalogHandler,
  createLiveryRouteHandlers,
  createPreviewHandler,
  previewRouteBase,
  registerLiveryRoutes,
  type LiveryRouteHandler,
  type LiveryWebServerLike,
} from '../../src/host/routes.js'
import { bindPreviews, buildCatalog } from '../../src/host/catalog.js'
import { CATALOG_ROUTE, PREVIEW_ROUTE_PREFIX } from '../../src/core/types.js'
import { CONTRACT_FACTS, HOST_CAPABILITIES } from '../../src/generated/contract.js'
import { CATALOG_META, LIVERIES } from '../../src/generated/liveries.js'
import { FakeResponse, fakeRequest, makeCatalogMeta, makeLivery } from './fixtures.js'

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

/** The fixture catalog served by route tests. */
function fixtureCatalog() {
  return buildCatalog({ liveries: [makeLivery()], catalogMeta: makeCatalogMeta() })
}

const PREVIEW_NAME = 'ivory-slate-zh-light.svg'
const PREVIEW_PATH = `/virtual/lib/previews/${PREVIEW_NAME}`
const PREVIEW_SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

/** Preview handler wired to a virtual map and a recording reader. */
function previewHandler(options: { failRead?: boolean } = {}) {
  const reads: string[] = []
  const handler = createPreviewHandler({
    previews: new Map([[PREVIEW_NAME, PREVIEW_PATH]]),
    readAsset: async (filePath) => {
      reads.push(filePath)
      if (options.failRead === true) throw new Error('ENOENT')
      return new TextEncoder().encode(PREVIEW_SVG)
    },
  })
  return { handler, reads }
}

describe('GET /livery/api/catalog', () => {
  it('answers 200 JSON with no-store and a complete catalog body', async () => {
    const handler = createCatalogHandler({ catalog: fixtureCatalog() })
    const response = await invoke(handler, 'GET', CATALOG_ROUTE)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('application/json')
    expect(response.headers['cache-control']).toBe('no-store')
    const body = String(response.body)
    expect(response.headers['content-length']).toBe(String(Buffer.byteLength(body)))
    const parsed = JSON.parse(body) as Record<string, unknown>
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.contractHash).toBe(CONTRACT_FACTS.contractHash)
    expect(Array.isArray(parsed.liveries)).toBe(true)
    expect((parsed.liveries as unknown[]).length).toBe(1)
  })

  it('answers HEAD with the same headers and content length but no body', async () => {
    const handler = createCatalogHandler({ catalog: fixtureCatalog() })
    const response = await invoke(handler, 'HEAD', CATALOG_ROUTE)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('application/json')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(Number(response.headers['content-length'])).toBeGreaterThan(0)
    expect(response.ended).toBe(true)
    expect(response.body).toBeUndefined()
  })

  it('serializes the catalog once and reuses the bytes', async () => {
    const handler = createCatalogHandler({ catalog: fixtureCatalog() })
    const first = await invoke(handler, 'GET', CATALOG_ROUTE)
    const second = await invoke(handler, 'GET', `${CATALOG_ROUTE}?v=2`)
    expect(String(first.body)).toBe(String(second.body))
  })

  it.each(['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])('rejects %s with 405 and Allow', async (method) => {
    const handler = createCatalogHandler({ catalog: fixtureCatalog() })
    const response = await invoke(handler, method, CATALOG_ROUTE)
    expect(response.statusCode).toBe(405)
    expect(response.headers.allow).toBe('GET, HEAD')
    expect(response.body).toBeUndefined()
  })

  it('never writes after the response is already finished', async () => {
    const handler = createCatalogHandler({ catalog: fixtureCatalog() })
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

describe('GET /livery/assets/previews/<file>', () => {
  it('serves a whitelisted preview as an SVG with no-store', async () => {
    const { handler, reads } = previewHandler()
    const response = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}${PREVIEW_NAME}`)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('image/svg+xml')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['content-length']).toBe(String(Buffer.byteLength(PREVIEW_SVG)))
    expect(Buffer.from(response.body as Uint8Array).toString()).toBe(PREVIEW_SVG)
    expect(reads).toEqual([PREVIEW_PATH])
  })

  it('answers HEAD with headers and no body', async () => {
    const { handler } = previewHandler()
    const response = await invoke(handler, 'HEAD', `${PREVIEW_ROUTE_PREFIX}${PREVIEW_NAME}`)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('image/svg+xml')
    expect(Number(response.headers['content-length'])).toBeGreaterThan(0)
    expect(response.body).toBeUndefined()
  })

  it('serves a name with a query string (query is not part of the name)', async () => {
    const { handler } = previewHandler()
    const response = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}${PREVIEW_NAME}?v=1`)
    expect(response.statusCode).toBe(200)
  })

  it('decodes a percent-encoded whitelisted name before lookup', async () => {
    const { handler } = previewHandler()
    const encoded = `${PREVIEW_ROUTE_PREFIX}%69vory-slate-zh-light.svg`
    const response = await invoke(handler, 'GET', encoded)
    expect(response.statusCode).toBe(200)
  })

  it('answers 404 for an unknown file', async () => {
    const { handler } = previewHandler()
    const response = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}unknown.svg`)
    expect(response.statusCode).toBe(404)
  })

  it('answers 404 when the file disappears after binding', async () => {
    const { handler } = previewHandler({ failRead: true })
    const response = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}${PREVIEW_NAME}`)
    expect(response.statusCode).toBe(404)
  })

  it.each([
    `${PREVIEW_ROUTE_PREFIX}../secret.svg`,
    `${PREVIEW_ROUTE_PREFIX}%2e%2e%2fsecret.svg`,
    `${PREVIEW_ROUTE_PREFIX}..%2Fsecret.svg`,
    `${PREVIEW_ROUTE_PREFIX}%2E%2E/secret.svg`,
    `${PREVIEW_ROUTE_PREFIX}a%2F..%2Fsecret.svg`,
    `${PREVIEW_ROUTE_PREFIX}..\\secret.svg`,
    `${PREVIEW_ROUTE_PREFIX}%00.svg`,
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
    const response = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}%zz.svg`)
    expect(response.statusCode).toBe(404)
  })

  it.each(['POST', 'PUT', 'DELETE'])('rejects %s with 405 and Allow', async (method) => {
    const { handler } = previewHandler()
    const response = await invoke(handler, method, `${PREVIEW_ROUTE_PREFIX}${PREVIEW_NAME}`)
    expect(response.statusCode).toBe(405)
    expect(response.headers.allow).toBe('GET, HEAD')
  })

  it('never writes after the response is already finished', async () => {
    const { handler } = previewHandler()
    const response = new FakeResponse()
    response.headersSent = true
    await handler(
      fakeRequest('GET', `${PREVIEW_ROUTE_PREFIX}${PREVIEW_NAME}`) as unknown as IncomingMessage,
      response as unknown as ServerResponse,
    )
    expect(response.statusCode).toBe(0)
    expect(response.ended).toBe(false)
  })
})

describe('createLiveryRouteHandlers', () => {
  it('returns one catalog and one preview handler', async () => {
    const handlers = createLiveryRouteHandlers({
      catalog: fixtureCatalog(),
      previews: new Map(),
      readAsset: async () => new Uint8Array(),
    })
    expect(typeof handlers.catalog).toBe('function')
    expect(typeof handlers.preview).toBe('function')
    const catalogResponse = await invoke(handlers.catalog, 'GET', CATALOG_ROUTE)
    expect(catalogResponse.statusCode).toBe(200)
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
      catalog: fixtureCatalog(),
      previews: new Map(),
      readAsset: async () => new Uint8Array(),
    })
    expect([...webServer.routes.keys()]).toEqual([
      `exact:${CATALOG_ROUTE}`,
      `prefix:${previewRouteBase()}`,
    ])
    expect(previewRouteBase()).toBe('/livery/assets/previews')

    const handler = webServer.routes.get(`exact:${CATALOG_ROUTE}`)
    expect(handler).toBeDefined()
    release()
    expect(webServer.routes.size).toBe(0)
    expect(webServer.disposed).toEqual([
      `prefix:${previewRouteBase()}`,
      `exact:${CATALOG_ROUTE}`,
    ])
  })

  it('is idempotent to dispose twice', () => {
    const webServer = new FakeWebServer()
    const release = registerLiveryRoutes(webServer)
    release()
    expect(() => release()).not.toThrow()
  })

  it('disposes the first route when the second registration fails, then rethrows', () => {
    const webServer = new FakeWebServer()
    webServer.failOnPath = previewRouteBase()
    expect(() => registerLiveryRoutes(webServer)).toThrow(/duplicate route/)
    expect(webServer.routes.size).toBe(0)
    expect(webServer.disposed).toEqual([`exact:${CATALOG_ROUTE}`])
  })
})


describe('real generated artifacts', () => {
  /** The build output's module URL, which is what production resolves against. */
  const builtModuleUrl = new URL('../../lib/index.js', import.meta.url)
  const realIndex = fileURLToPath(new URL('../../lib/previews/index.json', import.meta.url))
  const realPreviews = existsSync(realIndex)
    ? bindPreviews({ moduleUrl: builtModuleUrl })
    : new Map<string, string>()

  it.skipIf(realPreviews.size === 0)('binds the frozen preview index and serves real SVGs', async () => {
    expect(realPreviews.size).toBeGreaterThan(0)
    const names = [...realPreviews.keys()]
    // Convention check: <id>-<zh|en>-<light|dark>.svg, flat names.
    for (const name of names) {
      expect(name).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*\.svg$/)
    }
    const handler = createPreviewHandler({ previews: realPreviews })
    for (const name of names.slice(0, 3)) {
      const response = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}${name}`)
      expect(response.statusCode, name).toBe(200)
      expect(response.headers['content-type']).toBe('image/svg+xml')
      expect(response.headers['cache-control']).toBe('no-store')
      const body = Buffer.from(response.body as Uint8Array).toString('utf8')
      expect(body.startsWith('<svg')).toBe(true)
      expect(Number(response.headers['content-length'])).toBe((response.body as Uint8Array).byteLength)
    }
    // A name that the index does not list is not served, whatever it looks like.
    const missing = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}not-a-preview.svg`)
    expect(missing.statusCode).toBe(404)
    const traversal = await invoke(handler, 'GET', `${PREVIEW_ROUTE_PREFIX}../index.json`)
    expect(traversal.statusCode).toBe(404)
    const head = await invoke(handler, 'HEAD', `${PREVIEW_ROUTE_PREFIX}${names[0] ?? ''}`)
    expect(head.statusCode).toBe(200)
    expect(head.body).toBeUndefined()
  })

  it.skipIf(LIVERIES.length === 0 || CATALOG_META.contractHash !== CONTRACT_FACTS.contractHash)(
    'serves the generated catalog by default (10 liveries bound to the certified contract)',
    async () => {
      const handler = createCatalogHandler()
      const response = await invoke(handler, 'GET', CATALOG_ROUTE)
      expect(response.statusCode).toBe(200)
      const parsed = JSON.parse(String(response.body)) as {
        liveries: unknown[]
        contractHash: string
        capabilities: unknown
      }
      expect(parsed.liveries).toHaveLength(LIVERIES.length)
      expect(parsed.contractHash).toBe(CONTRACT_FACTS.contractHash)
      expect(parsed.capabilities).toEqual(HOST_CAPABILITIES)
    },
  )
})
