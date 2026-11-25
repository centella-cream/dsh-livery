/**
 * Online provider registry tests (0.2.2).
 *
 * Covers the two gate-accepted providers (Openverse, Wikimedia Commons) with a
 * stubbed global fetch — no test touches the network:
 *
 * - per-provider URL shape, parsing, licence mapping and attribution URLs;
 * - licence-null (non-selectable) rows and rejected origin image hosts;
 * - cursors/page sizes, 429 Retry-After, malformed bodies, timeouts/deadlines;
 * - Auto failover (servedBy/tried) and pinned no-failover;
 * - the pure exact/wildcard image-host matcher and policy export.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AUTO_MAX_ATTEMPTS,
  ONLINE_ATTEMPT_TIMEOUT_MS,
  ONLINE_PAGE_DEADLINE_MS,
  PROVIDERS,
  autoProviders,
  fetchOnlinePage,
  isAllowedHost,
  isAllowedImageUrl,
  loadProviderManifests,
  manifestRequestUrl,
  matchesHostPattern,
  offeredProviders,
  parseProviderManifestDocument,
  providerById,
  providerImagePolicy,
  providersForCapability,
  registeredProviders,
  resetProviderManifests,
} from '../../src/client/wallpaper/providers.js'
import manifestSource from '../../src/provider-manifests.json'
import type {
  ImageHostPolicy,
  ProviderId,
  ProviderPageRequest,
  WallpaperProvider,
  WallpaperProviderResult,
} from '../../src/client/wallpaper/providers.js'

/* -------------------------------------------------------------------------- */
/* Fixtures / helpers                                                         */
/* -------------------------------------------------------------------------- */

const signal = (): AbortSignal => new AbortController().signal

interface FetchCall {
  readonly url: URL
  readonly init: RequestInit | undefined
}

/** Stub global fetch with a handler and record every call. */
function stubFetch(handler: (call: FetchCall) => Response | Promise<Response>): {
  readonly calls: readonly FetchCall[]
  readonly mock: ReturnType<typeof vi.fn>
} {
  const calls: FetchCall[] = []
  const mock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const call: FetchCall = { url: new URL(raw, 'http://localhost'), init }
    calls.push(call)
    return handler(call)
  })
  vi.stubGlobal('fetch', mock)
  return { calls, mock }
}

/** Stub a sequence of JSON/response bodies keyed by hostname. */
function stubHosts(responses: Readonly<Record<string, () => Response>>): readonly FetchCall[] {
  const { calls } = stubFetch(({ url }) => {
    const make = responses[url.hostname]
    if (make === undefined) return new Response('unexpected host', { status: 500 })
    return make()
  })
  return calls
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers ?? {}) },
  })
}


function wikimediaPage(overrides: Record<string, unknown> = {}): Response {
  return jsonResponse({
    batchcomplete: true,
    query: { pages: { '12345': WIKIMEDIA_PAGE } },
    continue: { gsroffset: 12, continue: 'gsroffset||' },
    ...overrides,
  })
}

const WIKIMEDIA_PAGE = {
  pageid: 12345,
  ns: 6,
  title: 'File:Quiet sea.jpg',
  index: 1,
  imageinfo: [{
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Quiet_sea.jpg',
    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Quiet_sea.jpg',
    mime: 'image/jpeg',
    thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Quiet_sea.jpg/1280px-Quiet_sea.jpg',
    width: 4000,
    height: 3000,
    extmetadata: {
      LicenseShortName: { value: 'CC BY-SA 4.0' },
      LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
      Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Ann">Ann</a>' },
      AttributionRequired: { value: 'true' },
      UsageTerms: { value: 'Creative Commons Attribution-ShareAlike 4.0' },
    },
  }],
} as const

const openverse = (): WallpaperProvider => {
  const provider = providerById('openverse')
  if (provider === undefined) throw new Error('openverse provider missing')
  return provider
}

const wikimedia = (): WallpaperProvider => {
  const provider = providerById('wikimedia')
  if (provider === undefined) throw new Error('wikimedia provider missing')
  return provider
}

function pageRequest(overrides: Partial<ProviderPageRequest> = {}): ProviderPageRequest {
  return { pageSize: 12, signal: signal(), ...overrides }
}

/** Assert every returned result image URL is on the provider's declared hosts. */
function expectImageUrlsAllowlisted(results: readonly WallpaperProviderResult[]): void {
  for (const result of results) {
    const policy = providerImagePolicy(result.providerId)
    expect(isAllowedImageUrl(result.thumbUrl, policy), `thumb ${result.thumbUrl}`).toBe(true)
    expect(isAllowedImageUrl(result.fullUrl, policy), `full ${result.fullUrl}`).toBe(true)
  }
}

afterEach(() => {
  resetProviderManifests()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/* -------------------------------------------------------------------------- */
/* Registry                                                                   */
/* -------------------------------------------------------------------------- */

describe('provider registry (gate order, no rejected providers)', () => {
  it('keeps Openverse legacy-only and Wikimedia as the static offer', () => {
    expect(registeredProviders().map(provider => provider.id)).toEqual(['openverse', 'wikimedia'])
    expect(offeredProviders().map(provider => provider.id)).toEqual(['wikimedia'])
    expect(Object.isFrozen(PROVIDERS)).toBe(true)
    expect(autoProviders().map(provider => provider.id)).toEqual(['wikimedia'])
    expect(PROVIDERS.filter(provider => provider.id === ('picsum' as ProviderId))).toEqual([])
  })

  it('exposes keyless providers with labels, capabilities and hosts', () => {
    for (const provider of registeredProviders()) {
      expect(provider.auth).toBe('keyless')
      expect(provider.label['zh-CN'].length).toBeGreaterThan(0)
      expect(provider.label['en-US'].length).toBeGreaterThan(0)
      expect(provider.imageHosts.length).toBeGreaterThan(0)
      if (provider.id !== 'openverse') expect(provider.capabilities.search).toBe(true)
      expect(typeof provider.capabilities.random).toBe('boolean')
    }
    expect(openverse().capabilities.random).toBe(false)
    expect(wikimedia().capabilities.random).toBe(true)
  })

  it('looks providers up by id and never resurrects rejected ids', () => {
    expect(providerById('openverse')).toBe(openverse())
    expect(providerById('wikimedia')).toBe(wikimedia())
    expect(providerById('picsum')).toBeUndefined()
    expect(providerById('nasa-image-library')).toBeUndefined()
    expect(providerById('met-open-access')).toBeUndefined()
    expect(providerById('')).toBeUndefined()
  })

  it('filters providers by capability in registry order', () => {
    expect(providersForCapability('search').map(provider => provider.id)).toEqual(['wikimedia'])
    expect(providersForCapability('random').map(provider => provider.id)).toEqual(['wikimedia'])
  })

  it('exports the provider image policy and fails closed for foreign ids', () => {
    expect(providerImagePolicy('openverse')).toEqual({ imageHosts: ['api.openverse.org'] })
    expect(providerImagePolicy('wikimedia')).toEqual({
      imageHosts: ['upload.wikimedia.org', 'thumb.wikimedia.org'],
    })
    for (const provider of PROVIDERS) {
      const policy = providerImagePolicy(provider.id)
      expect(policy.imageHosts).toEqual(provider.imageHosts)
      expect(policy.redirectHosts).toBeUndefined()
    }
    expect(providerImagePolicy('picsum' as unknown as ProviderId)).toEqual({ imageHosts: [] })
  })

  it('freezes the documented online budgets', () => {
    expect(ONLINE_PAGE_DEADLINE_MS).toBe(12_000)
    expect(ONLINE_ATTEMPT_TIMEOUT_MS).toBe(6_000)
    expect(AUTO_MAX_ATTEMPTS).toBe(2)
  })
})

/* -------------------------------------------------------------------------- */
/* Host matcher / policy                                                      */
/* -------------------------------------------------------------------------- */

describe('image-host matcher (exact or dot-boundary wildcard only)', () => {
  it('matches exact hosts, case-insensitively and with an FQDN trailing dot', () => {
    expect(matchesHostPattern('upload.wikimedia.org', 'upload.wikimedia.org')).toBe(true)
    expect(matchesHostPattern('UPLOAD.WIKIMEDIA.ORG', 'upload.wikimedia.org')).toBe(true)
    expect(matchesHostPattern('upload.wikimedia.org', 'UPLOAD.WIKIMEDIA.ORG')).toBe(true)
    expect(matchesHostPattern('upload.wikimedia.org.', 'upload.wikimedia.org')).toBe(true)
    expect(matchesHostPattern('api.openverse.org', 'upload.wikimedia.org')).toBe(false)
  })

  it('matches wildcard subdomains on a label boundary and never the apex', () => {
    expect(matchesHostPattern('cdn.example.org', '*.example.org')).toBe(true)
    expect(matchesHostPattern('a.b.example.org', '*.example.org')).toBe(true)
    expect(matchesHostPattern('example.org', '*.example.org')).toBe(false)
    expect(matchesHostPattern('notexample.org', '*.example.org')).toBe(false)
    expect(matchesHostPattern('evil-example.org', '*.example.org')).toBe(false)
    expect(matchesHostPattern('cdn.example.org.evil', '*.example.org')).toBe(false)
  })

  it('rejects look-alike and eTLD suffix hosts for exact and wildcard entries', () => {
    expect(matchesHostPattern('notexample.com', 'example.com')).toBe(false)
    expect(matchesHostPattern('example.com.evil', 'example.com')).toBe(false)
    expect(matchesHostPattern('notexample.com', '*.example.com')).toBe(false)
    expect(matchesHostPattern('example.co.uk.evil', 'example.co.uk')).toBe(false)
    expect(matchesHostPattern('example.co.uk', '*.co.uk')).toBe(true)
    expect(matchesHostPattern('evilco.uk', '*.co.uk')).toBe(false)
  })

  it('treats malformed allowlist entries as no match', () => {
    for (const pattern of ['', '*', '*example.com', 'example.*', 'example.com.evil*', 'https://example.com', 'example.com/path', 'example.com:443', '*.']) {
      expect(matchesHostPattern('example.com', pattern), pattern).toBe(false)
    }
    expect(matchesHostPattern('', 'example.com')).toBe(false)
    expect(matchesHostPattern('user@example.com', 'example.com')).toBe(false)
  })

  it('checks an allowlist and a full image URL', () => {
    const policy: ImageHostPolicy = { imageHosts: ['api.openverse.org'] }
    expect(isAllowedHost('api.openverse.org', ['*.example.org', 'api.openverse.org'])).toBe(true)
    expect(isAllowedHost('api.openverse.org.evil', ['api.openverse.org'])).toBe(false)
    expect(isAllowedImageUrl('https://api.openverse.org/v1/images/x/thumb/', policy)).toBe(true)
    expect(isAllowedImageUrl('https://API.Openverse.org/v1/images/x/thumb/', policy)).toBe(true)
    expect(isAllowedImageUrl('https://origin-platform.example/x.jpg', policy)).toBe(false)
    expect(isAllowedImageUrl('http://api.openverse.org/x.jpg', policy)).toBe(false)
    expect(isAllowedImageUrl('https://user:pass@api.openverse.org/x.jpg', policy)).toBe(false)
    expect(isAllowedImageUrl('https://127.0.0.1/x.jpg', policy)).toBe(false)
    expect(isAllowedImageUrl('not a url', policy)).toBe(false)
    const wildcard: ImageHostPolicy = { imageHosts: ['*.example.org'] }
    expect(isAllowedImageUrl('https://cdn.example.org/a.jpg', wildcard)).toBe(true)
    expect(isAllowedImageUrl('https://example.org/a.jpg', wildcard)).toBe(false)
    expect(isAllowedImageUrl('https://notexample.org/a.jpg', wildcard)).toBe(false)
    expect(isAllowedImageUrl('https://example.org.evil/a.jpg', wildcard)).toBe(false)
  })
})

/* -------------------------------------------------------------------------- */
/* Openverse                                                                  */
/* -------------------------------------------------------------------------- */

describe('Wikimedia Commons provider', () => {
  it('requests the CORS-enabled search API and maps licence/attribution fields', async () => {
    const calls = stubHosts({ 'commons.wikimedia.org': () => wikimediaPage() })
    const outcome = await wikimedia().fetchPage(pageRequest({ query: 'quiet sea' }))
    if (!('results' in outcome)) throw new Error('expected results')
    const [result] = outcome.results
    expect(result).toMatchObject({
      providerId: 'wikimedia',
      id: '12345',
      title: 'Quiet sea.jpg',
      creator: 'Ann',
      creatorUrl: 'https://commons.wikimedia.org/wiki/User:Ann',
      license: {
        name: 'CC BY-SA 4.0',
        url: 'https://creativecommons.org/licenses/by-sa/4.0',
      },
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Quiet_sea.jpg',
      fullUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Quiet_sea.jpg',
      thumbUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Quiet_sea.jpg/1280px-Quiet_sea.jpg',
      width: 4000,
      height: 3000,
    })
    expectImageUrlsAllowlisted(outcome.results)
    if (outcome.nextCursor === undefined) throw new Error('missing cursor')

    expect(calls).toHaveLength(1)
    const params = calls[0]!.url.searchParams
    expect(calls[0]!.url.origin + calls[0]!.url.pathname).toBe('https://commons.wikimedia.org/w/api.php')
    expect(params.get('action')).toBe('query')
    expect(params.get('format')).toBe('json')
    expect(params.get('generator')).toBe('search')
    expect(params.get('gsrsearch')).toBe('quiet sea')
    expect(params.get('gsrnamespace')).toBe('6')
    expect(params.get('gsrlimit')).toBe('12')
    expect(params.get('prop')).toBe('imageinfo')
    expect(params.get('iiprop')).toBe('url|extmetadata|size|mime')
    expect(params.get('iiurlwidth')).toBe('1280')
    // Anonymous CORS only works with the origin=* query parameter.
    expect(params.get('origin')).toBe('*')

    const next = await wikimedia().fetchPage(pageRequest({ query: 'quiet sea', cursor: outcome.nextCursor }))
    expect('results' in next).toBe(true)
    const nextParams = calls[1]!.url.searchParams
    expect(nextParams.get('continue')).toBe('gsroffset||')
    expect(nextParams.get('gsroffset')).toBe('12')
  })

  it('drops non-raster media (PDF/SVG/TIFF/video) from Commons search results', async () => {
    const rowWithMime = (mime: string): unknown => ({
      ...WIKIMEDIA_PAGE,
      imageinfo: [{
        ...WIKIMEDIA_PAGE.imageinfo[0],
        mime,
      }],
    })
    const pages = (rows: readonly unknown[]): Response => jsonResponse({
      batchcomplete: true,
      query: { pages: Object.fromEntries(rows.map((row, index) => [String(index + 1), row])) },
    })
    const calls = stubHosts({
      'commons.wikimedia.org': () => pages([
        rowWithMime('application/pdf'),
        rowWithMime('image/svg+xml'),
        rowWithMime('image/tiff'),
        rowWithMime('video/webm'),
        { ...WIKIMEDIA_PAGE, imageinfo: [{ ...WIKIMEDIA_PAGE.imageinfo[0], mime: undefined }] },
        rowWithMime('image/jpeg'),
      ]),
    })
    const outcome = await wikimedia().fetchPage(pageRequest({ query: 'quiet sea' }))
    if (!('results' in outcome)) throw new Error('expected results')
    expect(outcome.results).toHaveLength(1)
    expect(calls).toHaveLength(1)
  })

  it('trims the query and clamps an oversized page size', async () => {
    const calls = stubHosts({ 'commons.wikimedia.org': () => wikimediaPage() })
    await wikimedia().fetchPage(pageRequest({ query: '  quiet sea  ', pageSize: 100_000 }))
    expect(calls[0]?.url.searchParams.get('gsrsearch')).toBe('quiet sea')
    expect(calls[0]?.url.searchParams.get('gsrlimit')).toBe('500')
  })

  it('maps missing/restricted licence metadata to null', async () => {
    const withMeta = (extmetadata: Record<string, unknown>): typeof WIKIMEDIA_PAGE => ({
      ...WIKIMEDIA_PAGE,
      imageinfo: [{
        ...WIKIMEDIA_PAGE.imageinfo[0],
        extmetadata: extmetadata as typeof WIKIMEDIA_PAGE.imageinfo[0]['extmetadata'],
      }],
    })
    const pages = (rows: readonly unknown[]): Response => jsonResponse({
      batchcomplete: true,
      query: { pages: Object.fromEntries(rows.map((row, index) => [String(index + 1), row])) },
    })
    const rows = [
      withMeta({}),
      withMeta({ LicenseShortName: { value: 'CC BY-SA 4.0' } }),
      withMeta({
        LicenseShortName: { value: 'CC BY-NC 4.0' },
        LicenseUrl: { value: 'https://creativecommons.org/licenses/by-nc/4.0' },
      }),
      withMeta({
        LicenseShortName: { value: 'Public domain' },
        AttributionRequired: { value: 'false' },
      }),
      withMeta({
        LicenseShortName: { value: 'CC0' },
        LicenseUrl: { value: 'https://creativecommons.org/publicdomain/zero/1.0/' },
      }),
    ]
    stubHosts({ 'commons.wikimedia.org': () => pages(rows) })
    const outcome = await wikimedia().fetchPage(pageRequest({ query: 'sea' }))
    if (!('results' in outcome)) throw new Error('expected results')
    expect(outcome.results.map(result => result.license)).toEqual([
      null,
      null,
      null,
      { name: 'Public domain' },
      { name: 'CC0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
    ])
  })

  it('strips attribution HTML and rejects image hosts outside the allowlist', async () => {
    const badHost = {
      ...WIKIMEDIA_PAGE,
      pageid: 99,
      title: 'File:Bad host.jpg',
      imageinfo: [{
        ...WIKIMEDIA_PAGE.imageinfo[0],
        url: 'https://upload.wikimedia.example.org/wikipedia/commons/bad.jpg',
      }],
    }
    const lookAlike = {
      ...WIKIMEDIA_PAGE,
      pageid: 100,
      title: 'File:Look alike.jpg',
      imageinfo: [{
        ...WIKIMEDIA_PAGE.imageinfo[0],
        url: 'https://upload.wikimedia.org.evil/wikipedia/commons/bad.jpg',
      }],
    }
    const evilThumb = {
      ...WIKIMEDIA_PAGE,
      pageid: 101,
      title: 'File:Evil thumb.jpg',
      imageinfo: [{
        ...WIKIMEDIA_PAGE.imageinfo[0],
        thumburl: 'https://evil-thumb.example/bad-thumb.jpg',
      }],
    }
    const noAttributionUrl = {
      ...WIKIMEDIA_PAGE,
      pageid: 102,
      title: 'File:Plain artist.jpg',
      imageinfo: [{
        ...WIKIMEDIA_PAGE.imageinfo[0],
        extmetadata: {
          LicenseShortName: { value: 'CC0' },
          LicenseUrl: { value: 'https://creativecommons.org/publicdomain/zero/1.0/' },
          Artist: { value: 'Plain Artist' },
        },
      }],
    }
    stubHosts({
      'commons.wikimedia.org': () => jsonResponse({
        batchcomplete: true,
        query: { pages: Object.fromEntries([badHost, lookAlike, evilThumb, noAttributionUrl].map((row, index) => [String(index + 1), row])) },
      }),
    })
    const outcome = await wikimedia().fetchPage(pageRequest({ query: 'sea' }))
    if (!('results' in outcome)) throw new Error('expected results')
    expect(outcome.results.map(result => result.id)).toEqual(['101', '102'])
    expect(outcome.results[0]?.thumbUrl).toBe(WIKIMEDIA_PAGE.imageinfo[0].url)
    expect(outcome.results[1]?.creator).toBe('Plain Artist')
    expect(outcome.results[1]?.creatorUrl).toBeUndefined()
    expectImageUrlsAllowlisted(outcome.results)
  })

  it('serves a random namespace-6 gallery when no query is given', async () => {
    const calls = stubHosts({ 'commons.wikimedia.org': () => wikimediaPage() })
    const outcome = await wikimedia().fetchPage(pageRequest())
    if (!('results' in outcome)) throw new Error('expected results')
    expect(outcome.results).toHaveLength(1)
    const params = calls[0]!.url.searchParams
    expect(params.get('generator')).toBe('random')
    expect(params.get('grnnamespace')).toBe('6')
    expect(params.get('grnlimit')).toBe('12')
    expect(params.get('gsrsearch')).toBeNull()
    expect(params.get('origin')).toBe('*')
  })

  it('maps MediaWiki JSON errors and HTTP failures to typed failures', async () => {
    stubHosts({ 'commons.wikimedia.org': () => jsonResponse({ error: { code: 'ratelimited', info: 'slow down' } }) })
    expect(await wikimedia().fetchPage(pageRequest({ query: 'sea' }))).toEqual({ failure: 'rate-limited' })
    stubHosts({ 'commons.wikimedia.org': () => jsonResponse({ error: { code: 'readapidenied' } }) })
    expect(await wikimedia().fetchPage(pageRequest({ query: 'sea' }))).toEqual({ failure: 'auth-required' })
    stubHosts({ 'commons.wikimedia.org': () => new Response('', { status: 429, headers: { 'retry-after': '1' } }) })
    expect(await wikimedia().fetchPage(pageRequest({ query: 'sea' }))).toEqual({ failure: 'rate-limited', retryAfterMs: 1000 })
    stubHosts({ 'commons.wikimedia.org': () => new Response('', { status: 500 }) })
    expect(await wikimedia().fetchPage(pageRequest({ query: 'sea' }))).toEqual({ failure: 'unavailable' })
    stubHosts({ 'commons.wikimedia.org': () => jsonResponse({ query: { pages: 'nope' } }) })
    expect(await wikimedia().fetchPage(pageRequest({ query: 'sea' }))).toEqual({ failure: 'invalid-response' })
    stubHosts({ 'commons.wikimedia.org': () => jsonResponse(null) })
    expect(await wikimedia().fetchPage(pageRequest({ query: 'sea' }))).toEqual({ failure: 'invalid-response' })
  })

  it('falls back to the canonical file page and drops rows without imageinfo', async () => {
    const withoutDescription = {
      ...WIKIMEDIA_PAGE,
      pageid: 7,
      title: 'File:No description.jpg',
      imageinfo: [{ ...WIKIMEDIA_PAGE.imageinfo[0], descriptionurl: undefined }],
    }
    const withoutImageInfo = { ...WIKIMEDIA_PAGE, pageid: 8, title: 'File:No info.jpg', imageinfo: [] }
    stubHosts({
      'commons.wikimedia.org': () => jsonResponse({
        batchcomplete: true,
        query: { pages: { '7': withoutDescription, '8': withoutImageInfo } },
      }),
    })
    const outcome = await wikimedia().fetchPage(pageRequest({ query: 'sea' }))
    if (!('results' in outcome)) throw new Error('expected results')
    expect(outcome.results).toHaveLength(1)
    expect(outcome.results[0]?.sourceUrl).toBe('https://commons.wikimedia.org/wiki/File:No_description.jpg')
  })

  it('rejects a foreign cursor without a network call', async () => {
    const { mock } = stubFetch(() => wikimediaPage())
    expect(await wikimedia().fetchPage(pageRequest({ query: 'sea', cursor: 'ov1:3' })))
      .toEqual({ failure: 'invalid-response' })
    expect(mock).not.toHaveBeenCalled()
  })
})

/* -------------------------------------------------------------------------- */
/* fetchOnlinePage: Auto failover, pinned, deadline                          */
/* -------------------------------------------------------------------------- */

describe('Host manifest providers', () => {
  it('loads reviewed manifests lazily and exposes the offered/Auto policy', async () => {
    stubFetch(({ url }) => {
      if (url.pathname === '/livery/api/providers') {
        return jsonResponse({ ...manifestSource, manifestHash: `sha256:${'a'.repeat(64)}` })
      }
      return new Response('unexpected', { status: 500 })
    })
    // The minimal route document is envelope-valid; the full gate validates fields.
    expect(parseProviderManifestDocument({ schemaVersion: 1, providers: [] })).toBeUndefined()
    expect(await loadProviderManifests()).toBe(true)
    expect(offeredProviders().map(provider => provider.id)).toEqual(['wikimedia', 'cleveland', 'met-open-access'])
    expect(autoProviders().map(provider => provider.id)).toEqual(['wikimedia', 'cleveland'])
    expect(providerById('met-open-access')?.capabilities.auto).toBe(false)
  })

  it('maps Met search -> object detail, filters non-public-domain rows and keeps direct delivery', async () => {
    const met = manifestSource.providers.find(provider => provider.id === 'met-open-access')
    if (met === undefined) throw new Error('missing Met manifest')
    stubFetch(({ url }) => {
      if (url.pathname === '/livery/api/providers') return jsonResponse({ schemaVersion: 1, providers: [met] })
      if (url.pathname === '/public/collection/v1.1/search') return jsonResponse({ total: 2, objectIDs: [1, 2] })
      if (url.pathname === '/public/collection/v1/objects/1') {
        return jsonResponse({ objectID: 1, title: 'Open', isPublicDomain: true, primaryImage: 'https://images.metmuseum.org/open.jpg', primaryImageSmall: 'https://images.metmuseum.org/open-small.jpg', objectURL: 'https://www.metmuseum.org/art/1', artistDisplayName: 'Artist' })
      }
      if (url.pathname === '/public/collection/v1/objects/2') {
        return jsonResponse({ objectID: 2, title: 'Closed', isPublicDomain: false, primaryImage: 'https://images.metmuseum.org/closed.jpg', primaryImageSmall: 'https://images.metmuseum.org/closed-small.jpg', objectURL: 'https://www.metmuseum.org/art/2' })
      }
      return new Response('unexpected', { status: 500 })
    })
    expect(await loadProviderManifests()).toBe(true)
    const provider = providerById('met-open-access')
    if (provider === undefined) throw new Error('missing provider')
    const page = await provider.fetchPage({ query: 'cat', pageSize: 12, signal: signal() })
    if (!('results' in page)) throw new Error('expected results')
    expect(page.results).toHaveLength(1)
    expect(page.results[0]).toMatchObject({
      providerId: 'met-open-access',
      title: 'Open',
      delivery: 'direct',
      license: { name: 'Public Domain' },
    })
  })

  it('builds deterministic provider request URLs and maps a direct result', async () => {
    resetProviderManifests()
    const original = providerById('cleveland')
    expect(original).toBeUndefined()
    const cleveland = manifestSource.providers.find(provider => provider.id === 'cleveland')
    if (cleveland === undefined) throw new Error('missing Cleveland manifest')
    stubFetch(({ url }) => {
      if (url.pathname === '/livery/api/providers') return jsonResponse({ schemaVersion: 1, providers: [cleveland] })
      if (url.hostname === 'openaccess-api.clevelandart.org') return jsonResponse({ data: [{ id: '1', title: 'Art', share_license_status: 'CC0', url: 'https://clevelandart.org/art/1', creators: [{ description: 'Artist' }], images: { print: { url: 'https://openaccess-cdn.clevelandart.org/1_print.jpg' }, web: { url: 'https://openaccess-cdn.clevelandart.org/1_web.jpg' } } }] })
      return new Response('unexpected', { status: 500 })
    })
    expect(await loadProviderManifests()).toBe(true)
    const provider = providerById('cleveland')
    expect(provider).toBeDefined()
    if (provider === undefined) return
    expect(manifestRequestUrl(cleveland as never, '', 12)).toContain('has_image=1')
    const page = await provider.fetchPage({ query: '', pageSize: 12, signal: signal() })
    expect('results' in page).toBe(true)
    if (!('results' in page)) return
    expect(page.results[0]?.delivery).toBe('direct')
    expect(page.results[0]?.license?.name).toBe('CC0 1.0')
    expect(page.results[0]?.thumbUrl).toContain('_web.jpg')
  })
})

describe('fetchOnlinePage', () => {
  it('Auto uses the offered Wikimedia provider and names it', async () => {
    const calls = stubHosts({
      'commons.wikimedia.org': () => wikimediaPage(),
    })
    const outcome = await fetchOnlinePage({ provider: 'auto', query: 'sea', pageSize: 12 })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.servedBy).toBe('wikimedia')
    expect(outcome.results.length).toBeGreaterThan(0)
    expect(outcome.nextCursor).toBeDefined()
    expect(calls.map(call => call.url.hostname)).toEqual(['commons.wikimedia.org'])
  })

  it('returns the last failure with the tried provider names when Auto cannot serve', async () => {
    stubHosts({
      'commons.wikimedia.org': () => new Response('', { status: 429, headers: { 'retry-after': '3' } }),
    })
    const outcome = await fetchOnlinePage({ provider: 'auto', query: 'sea', pageSize: 12 })
    expect(outcome).toEqual({
      ok: false,
      failure: 'rate-limited',
      retryAfterMs: 3000,
      tried: ['wikimedia'],
    })
  })

  it('makes exactly one attempt for a pinned provider and never silently changes', async () => {
    const { mock } = stubFetch(() => new Response('down', { status: 500 }))
    const outcome = await fetchOnlinePage({ provider: 'wikimedia', query: 'sea', pageSize: 12 })
    expect(outcome).toEqual({ ok: false, failure: 'unavailable', tried: ['wikimedia'] })
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('returns results from a pinned provider with servedBy', async () => {
    stubHosts({ 'commons.wikimedia.org': () => wikimediaPage() })
    const outcome = await fetchOnlinePage({ provider: 'wikimedia', query: 'sea', pageSize: 12 })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.servedBy).toBe('wikimedia')
  })

  it('rejects an unknown pinned id without any network call', async () => {
    const { mock } = stubFetch(() => wikimediaPage())
    const outcome = await fetchOnlinePage({
      provider: 'picsum' as unknown as ProviderId,
      pageSize: 12,
    })
    expect(outcome).toEqual({ ok: false, failure: 'invalid-response', tried: [] })
    expect(mock).not.toHaveBeenCalled()
  })

  it('times out an already-aborted overall signal without any attempt', async () => {
    const { mock } = stubFetch(() => wikimediaPage())
    const controller = new AbortController()
    controller.abort()
    const outcome = await fetchOnlinePage({ provider: 'auto', pageSize: 12, signal: controller.signal })
    expect(outcome).toEqual({ ok: false, failure: 'timeout', tried: [] })
    expect(mock).not.toHaveBeenCalled()
  })

  it('cancels an in-flight pinned attempt when the caller signal aborts', async () => {
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const requestSignal = init?.signal
      if (requestSignal === null || requestSignal === undefined) return
      requestSignal.addEventListener('abort', () => {
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      }, { once: true })
    })))
    const controller = new AbortController()
    const pending = fetchOnlinePage({
      provider: 'wikimedia',
      query: 'sea',
      pageSize: 12,
      signal: controller.signal,
      deadlineMs: 500,
    })
    setTimeout(() => controller.abort(), 5)
    const outcome = await pending
    expect(outcome).toEqual({ ok: false, failure: 'timeout', tried: ['wikimedia'] })
  })

  it('caps each attempt and the overall Auto budget at 6 s / 12 s', async () => {
    vi.useFakeTimers()
    try {
      const hangingFetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        const requestSignal = init?.signal
        if (requestSignal === null || requestSignal === undefined) return
        requestSignal.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        }, { once: true })
      }))
      vi.stubGlobal('fetch', hangingFetch)
      const pending = fetchOnlinePage({ provider: 'auto', query: 'sea', pageSize: 12 })
      // Only Wikimedia is offered, so one attempt consumes the per-attempt
      // timeout and there is no second provider to fail over to.
      await vi.advanceTimersByTimeAsync(ONLINE_ATTEMPT_TIMEOUT_MS)
      expect(hangingFetch).toHaveBeenCalledTimes(1)
      const outcome = await pending
      expect(outcome).toEqual({
        ok: false,
        failure: 'timeout',
        tried: ['wikimedia'],
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops at the overall deadline instead of starting another attempt', async () => {
    vi.useFakeTimers()
    try {
      const hangingFetch = vi.fn(() => new Promise<Response>(() => undefined))
      vi.stubGlobal('fetch', hangingFetch)
      const pending = fetchOnlinePage({ provider: 'auto', query: 'sea', pageSize: 12, deadlineMs: 120 })
      await vi.advanceTimersByTimeAsync(120)
      const outcome = await pending
      expect(outcome).toEqual({ ok: false, failure: 'timeout', tried: ['wikimedia'] })
      expect(hangingFetch).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
