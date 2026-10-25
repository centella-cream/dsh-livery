/**
 * The two read-only routes the Host serves to the browser: the catalog and the
 * preview assets.
 *
 * Both routes answer for the *live adapter*. The Host styles exactly one exact
 * host build per process, so a process that cannot resolve a certified adapter
 * (unreadable or uncertified version) serves neither a catalog nor previews:
 * the gate is closed and the Client has no boot payload to act on anyway. The
 * preview route is scoped to the active adapter's catalog profile — a request
 * naming another profile is a 404, so a 0.2.1 host can never be served a
 * 0.2.0-compiled asset set.
 *
 * Both handlers own their whole response (the webserver sets no content type
 * and ships no file helper), and both are fail-safe: an unexpected throw, a
 * client that disconnected, or a response already completed never escapes as
 * an unhandled rejection. Assets are served from a per-profile whitelist bound
 * at registration time, so a request name can never become a filesystem path.
 */

import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { CATALOG_ROUTE, PREVIEW_ROUTE_PREFIX, type LiveryCatalog } from '../core/types.js'
import type { AdapterRecord } from '../generated/contract.js'
import { bindPreviews, buildCatalog, serializeCatalog } from './catalog.js'

/** A webserver route handler: owns the whole response lifecycle. */
export type LiveryRouteHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>

/**
 * The slice of `WebServer` this module depends on.
 *
 * Structural on purpose: the plugin only needs `register`, and a narrower type
 * keeps this module unit-testable with a plain object.
 */
export interface LiveryWebServerLike {
  register(route: {
    readonly kind: 'exact' | 'prefix'
    readonly path: string
    readonly handler: LiveryRouteHandler
  }): () => void
}

/** Injection seams for the route handlers; production passes only `adapterFor`. */
export interface LiveryRouteOptions {
  /**
   * Resolve the live adapter per request. Returning `undefined` means the host
   * version is not certified: the routes answer 404 and serve nothing.
   */
  readonly adapterFor?: () => AdapterRecord | undefined
  /** Fixed adapter for tests; takes precedence over `adapterFor`. */
  readonly adapter?: AdapterRecord
  /** Catalog builder seam for tests; defaults to `buildCatalog(adapter)`. */
  readonly catalogFor?: (adapter: AdapterRecord) => LiveryCatalog
  /**
   * Per-profile preview whitelists for tests, keyed by catalog profile id. When
   * supplied it replaces disk binding entirely (a missing profile is empty).
   */
  readonly profilePreviews?: ReadonlyMap<string, ReadonlyMap<string, string>>
  /** File reader for preview assets; defaults to `node:fs/promises`. */
  readonly readAsset?: (filePath: string) => Promise<Uint8Array>
}

/** Both handlers, wired with one consistent option set. */
export interface LiveryRouteHandlers {
  readonly catalog: LiveryRouteHandler
  readonly preview: LiveryRouteHandler
}

/** Response headers shared by every catalog answer. */
const CATALOG_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
}

/** Response headers shared by every preview answer. */
const PREVIEW_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'image/svg+xml',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
}

/** Headers for the 405 answer; the body is empty. */
const METHOD_NOT_ALLOWED_HEADERS: Readonly<Record<string, string>> = {
  allow: 'GET, HEAD',
}

/** Headers for a "not available on this host" answer. */
const NOT_FOUND_HEADERS: Readonly<Record<string, string>> = {
  'cache-control': 'no-store',
}

/** Plain-text headers for an unexpected internal failure. */
const INTERNAL_ERROR_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'text/plain; charset=utf-8',
  'cache-control': 'no-store',
}

/**
 * The request method as an uppercase token.
 * @param req - incoming request.
 * @returns upper-case method, `GET` when the carrier omitted one.
 */
function methodOf(req: IncomingMessage): string {
  const method = typeof req.method === 'string' ? req.method : ''
  return method === '' ? 'GET' : method.toUpperCase()
}

/**
 * Whether the request is a read method.
 * @param req - incoming request.
 * @returns whether GET or HEAD.
 */
function isReadMethod(req: IncomingMessage): boolean {
  const method = methodOf(req)
  return method === 'GET' || method === 'HEAD'
}

/**
 * Whether a response can no longer be written.
 *
 * `headersSent` covers a handler that already started answering; `writableEnded`
 * covers a client that disconnected after the headers went out. Neither may be
 * followed by `writeHead`/`end`.
 * @param res - server response.
 * @returns whether the response is finished.
 */
function isFinished(res: ServerResponse): boolean {
  return res.headersSent === true || res.writableEnded === true
}

/**
 * Write a complete response, unless the response is already finished.
 * @param res - server response.
 * @param status - HTTP status code.
 * @param headers - response headers.
 * @param body - optional body; omitted for HEAD and empty answers.
 */
function respond(
  res: ServerResponse,
  status: number,
  headers: Readonly<Record<string, string>>,
  body?: string | Uint8Array,
): void {
  if (isFinished(res)) return
  try {
    res.writeHead(status, headers)
    if (body === undefined) {
      res.end()
    } else {
      res.end(body)
    }
  } catch {
    // The socket can disappear between the check and the write; a read-only
    // asset route has no recovery to attempt.
  }
}

/**
 * Parse the request target into a decoded pathname.
 *
 * The decoded form is what traversal checks must run against: `%2e%2e%2f` is
 * `../` to a filesystem but opaque to a raw prefix match.
 * @param req - incoming request.
 * @returns decoded absolute pathname, or `null` for a malformed target.
 */
function requestPathname(req: IncomingMessage): string | null {
  const target = typeof req.url === 'string' ? req.url : ''
  if (target === '') return null
  let pathname: string
  try {
    pathname = new URL(target, 'http://livery.invalid').pathname
  } catch {
    return null
  }
  try {
    return decodeURIComponent(pathname)
  } catch {
    return null
  }
}

/**
 * Whether a name can be looked up in a profile's preview map.
 *
 * The map lookup alone makes traversal impossible; this rejects the shapes that
 * are not preview filenames before the lookup so a request cannot even be used
 * to probe for map entries.
 * @param name - request-derived segment after the profile id.
 * @returns whether the name is a flat, non-empty file name.
 */
function isSafePreviewName(name: string): boolean {
  return name !== ''
    && name.length <= 256
    && !name.includes('/')
    && !name.includes('\\')
    && !name.includes('\0')
    && name.startsWith('.') === false
}

/**
 * Resolve which adapter the routes answer for, fail-closed.
 *
 * A resolver that throws (a disposed context, a broken probe) is treated the
 * same as "uncertified": no catalog, no previews.
 * @param options - route options.
 * @returns resolver returning the fixed adapter, the live adapter, or `undefined`.
 */
function adapterResolver(options: LiveryRouteOptions): () => AdapterRecord | undefined {
  if (options.adapter !== undefined) {
    const fixed = options.adapter
    return () => fixed
  }
  const resolve = options.adapterFor
  if (resolve === undefined) return () => undefined
  return () => {
    try {
      return resolve()
    } catch {
      return undefined
    }
  }
}

/**
 * Build the catalog handler.
 *
 * The adapter is resolved per request (the version probe settles asynchronously
 * at startup), and the JSON is built once per adapter id and reused: the
 * generated catalog cannot change while the Host is running, and a settings
 * change changes the *selected* skin, not the catalog. HEAD answers with the
 * same headers and length as GET, without a body.
 * @param options - adapter resolver and catalog seam.
 * @returns route handler.
 */
export function createCatalogHandler(options: LiveryRouteOptions = {}): LiveryRouteHandler {
  const currentAdapter = adapterResolver(options)
  const catalogFor = options.catalogFor ?? ((adapter: AdapterRecord) => buildCatalog(adapter))
  const catalogJson = new Map<string, string>()
  return (req, res) => {
    if (!isReadMethod(req)) {
      respond(res, 405, METHOD_NOT_ALLOWED_HEADERS)
      return
    }
    const adapter = currentAdapter()
    if (adapter === undefined) {
      // Uncertified host: this build has no catalog it can honestly claim.
      respond(res, 404, NOT_FOUND_HEADERS)
      return
    }
    let json = catalogJson.get(adapter.adapterId)
    if (json === undefined) {
      try {
        json = serializeCatalog(catalogFor(adapter))
      } catch {
        respond(res, 500, INTERNAL_ERROR_HEADERS, 'catalog unavailable')
        return
      }
      catalogJson.set(adapter.adapterId, json)
    }
    const headers: Record<string, string> = {
      ...CATALOG_HEADERS,
      'content-length': String(Buffer.byteLength(json)),
    }
    respond(res, 200, headers, methodOf(req) === 'HEAD' ? undefined : json)
  }
}

/**
 * Build the preview handler.
 *
 * Only the active adapter's catalog profile is served, and only names present
 * in that profile's bound whitelist. Other profiles, unknown names, traversal
 * attempts and unreadable files are all the same 404 — the gallery shows a
 * thumbnail error, the plugin never reveals the filesystem or another profile's
 * assets.
 * @param options - adapter resolver, per-profile whitelists and file reader.
 * @returns route handler.
 */
export function createPreviewHandler(options: LiveryRouteOptions = {}): LiveryRouteHandler {
  const currentAdapter = adapterResolver(options)
  const readAsset = options.readAsset ?? ((filePath: string) => readFile(filePath))
  const boundPreviews = new Map<string, ReadonlyMap<string, string>>()

  /**
   * Preview whitelist for one profile (test override first, disk binding otherwise).
   * @param profileId - catalog profile id.
   * @returns filename → absolute path map.
   */
  const previewsFor = (profileId: string): ReadonlyMap<string, string> => {
    if (options.profilePreviews !== undefined) {
      return options.profilePreviews.get(profileId) ?? new Map()
    }
    let previews = boundPreviews.get(profileId)
    if (previews === undefined) {
      previews = bindPreviews(profileId)
      boundPreviews.set(profileId, previews)
    }
    return previews
  }

  return async (req, res) => {
    if (!isReadMethod(req)) {
      respond(res, 405, METHOD_NOT_ALLOWED_HEADERS)
      return
    }
    const adapter = currentAdapter()
    if (adapter === undefined) {
      respond(res, 404, NOT_FOUND_HEADERS)
      return
    }
    const pathname = requestPathname(req)
    if (pathname === null || !pathname.startsWith(PREVIEW_ROUTE_PREFIX)) {
      respond(res, 404, NOT_FOUND_HEADERS)
      return
    }
    const rest = pathname.slice(PREVIEW_ROUTE_PREFIX.length)
    const separator = rest.indexOf('/')
    if (separator <= 0 || separator === rest.length - 1) {
      respond(res, 404, NOT_FOUND_HEADERS)
      return
    }
    const profileId = rest.slice(0, separator)
    const name = rest.slice(separator + 1)
    if (profileId !== adapter.catalogProfile) {
      // Render-equivalent profiles are never interchangeable: a 0.2.1 host is
      // not served the 0.2.0-compiled asset set, and vice versa.
      respond(res, 404, NOT_FOUND_HEADERS)
      return
    }
    if (!isSafePreviewName(name)) {
      respond(res, 404, NOT_FOUND_HEADERS)
      return
    }
    const filePath = previewsFor(profileId).get(name)
    if (filePath === undefined) {
      respond(res, 404, NOT_FOUND_HEADERS)
      return
    }
    let bytes: Uint8Array
    try {
      bytes = await readAsset(filePath)
    } catch {
      respond(res, 404, NOT_FOUND_HEADERS)
      return
    }
    const headers: Record<string, string> = {
      ...PREVIEW_HEADERS,
      'content-length': String(bytes.byteLength),
    }
    respond(res, 200, headers, methodOf(req) === 'HEAD' ? undefined : bytes)
  }
}

/**
 * Wrap a handler so an unexpected throw becomes a 500 instead of an unhandled
 * rejection (and never a half-written response that was already completed).
 * @param handler - route handler.
 * @returns safe route handler.
 */
function safetyNet(handler: LiveryRouteHandler): LiveryRouteHandler {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch {
      if (!isFinished(res)) {
        respond(res, 500, INTERNAL_ERROR_HEADERS, 'livery route failed')
      }
    }
  }
}

/**
 * Create both handlers with one consistent option set.
 * @param options - adapter resolver and preview/catalog seams.
 * @returns the two handlers.
 */
export function createLiveryRouteHandlers(options: LiveryRouteOptions = {}): LiveryRouteHandlers {
  return {
    catalog: safetyNet(createCatalogHandler(options)),
    preview: safetyNet(createPreviewHandler(options)),
  }
}

/**
 * The registration path for the preview prefix.
 *
 * The webserver's route paths carry no trailing slash; the public prefix does,
 * because the browser appends `<catalogProfile>/<file>` directly.
 * @returns `/livery/assets/previews`.
 */
export function previewRouteBase(): string {
  return PREVIEW_ROUTE_PREFIX.endsWith('/')
    ? PREVIEW_ROUTE_PREFIX.slice(0, -1)
    : PREVIEW_ROUTE_PREFIX
}

/**
 * Register the catalog and preview routes on the webserver.
 *
 * Both registrations happen or neither: if the second throws (a route collision
 * is a composition misconfiguration), the first is disposed before the error
 * escapes. The returned aggregator disposes in reverse registration order and
 * tolerates a disposer throwing so one failed teardown cannot strand the other.
 * @param webServer - webserver service (or a compatible real one).
 * @param options - adapter resolver and preview/catalog seams.
 * @returns a disposer aggregator for both routes.
 */
export function registerLiveryRoutes(
  webServer: LiveryWebServerLike,
  options: LiveryRouteOptions = {},
): () => void {
  const handlers = createLiveryRouteHandlers(options)
  const disposers: Array<() => void> = []
  const release = (): void => {
    while (disposers.length > 0) {
      const dispose = disposers.pop()
      if (dispose === undefined) continue
      try {
        dispose()
      } catch {
        // One failed removal must not strand the other route.
      }
    }
  }
  try {
    disposers.push(webServer.register({
      kind: 'exact',
      path: CATALOG_ROUTE,
      handler: handlers.catalog,
    }))
    disposers.push(webServer.register({
      kind: 'prefix',
      path: previewRouteBase(),
      handler: handlers.preview,
    }))
  } catch (error) {
    release()
    throw error
  }
  return release
}
