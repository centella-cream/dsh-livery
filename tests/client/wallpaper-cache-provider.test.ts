/**
 * Remote image cache + provider image-host policy (0.2.2).
 *
 * The cache must enforce a provider's declared image hosts / redirect hosts when
 * a policy is supplied, while pre-0.2.2 remote selections (which carry no
 * provider policy) keep hydrating through the legacy Picsum redirect hop. The
 * cache key stays the URL hash in both paths.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} }) as unknown as ImageBitmap

import { cacheRemoteImage, loadCachedRemote, remoteCacheKey } from '../../src/client/wallpaper/cache.js'
import type { RemoteImagePolicy } from '../../src/client/wallpaper/cache.js'
import { providerImagePolicy } from '../../src/client/wallpaper/providers.js'
import type { StoredImageRecord, WallpaperImageStore } from '../../src/client/wallpaper/storage.js'

class FakeImages implements WallpaperImageStore {
  readonly records = new Map<string, StoredImageRecord>()
  put = vi.fn(async (record: StoredImageRecord) => { this.records.set(record.key, record) })
  get = vi.fn(async (key: string) => this.records.get(key))
  delete = vi.fn(async (key: string) => { this.records.delete(key) })
  deleteIfGeneration = vi.fn(async (key: string, generation: string) => {
    const record = this.records.get(key)
    if (record === undefined || record.generation !== generation) return false
    this.records.delete(key)
    return true
  })
  list = vi.fn(async () => [...this.records.values()])
  clear = vi.fn(async () => { this.records.clear() })
  touch = vi.fn(async (key: string, now: number) => {
    const record = this.records.get(key)
    if (record === undefined) return undefined
    const touched = { ...record, lastUsedAt: Math.max(now, record.lastUsedAt) }
    this.records.set(key, touched)
    return touched
  })
}

const blob = (bytes = 8): Blob => new Blob([new Uint8Array(bytes)], { type: 'image/png' })

/** Image response whose platform-final URL is controllable (redirect testing). */
function imageResponse(finalUrl?: string): Response {
  const response = new Response(blob(), { status: 200, headers: { 'content-type': 'image/png' } })
  if (finalUrl !== undefined) {
    Object.defineProperty(response, 'url', { value: finalUrl, configurable: true })
  }
  return response
}

interface FetchCall {
  readonly url: string
  readonly init: RequestInit | undefined
}

function stubFetch(response: Response): { readonly calls: readonly FetchCall[] } {
  const calls: FetchCall[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    return response
  }))
  return { calls }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('provider image policy in the remote cache', () => {
  it('rejects a URL outside the provider image hosts without fetching', async () => {
    const images = new FakeImages()
    const { calls } = stubFetch(imageResponse())
    const result = await cacheRemoteImage('https://origin-platform.example/raw.jpg', {
      images,
      policy: providerImagePolicy('openverse'),
    })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(calls).toHaveLength(0)
    expect(images.put).not.toHaveBeenCalled()
  })

  it('caches an Openverse proxied image under the URL hash key with redirects closed', async () => {
    const images = new FakeImages()
    const url = 'https://api.openverse.org/v1/images/8f7a9e0d-1234-4abc-9def-0123456789ab/thumb/?full_size=true'
    const { calls } = stubFetch(imageResponse(url))
    const policy = providerImagePolicy('openverse')
    const result = await cacheRemoteImage(url, { images, policy })
    expect(result.ok).toBe(true)
    expect(calls[0]?.init?.redirect).toBe('error')
    // Policy never changes the URL-hash cache key (0.2.1-cache-compatible).
    expect(images.records.has(remoteCacheKey(url))).toBe(true)
    expect((await loadCachedRemote(url, images))?.sourceUrl).toBe(url)
  })

  it('accepts a wildcard image host and keeps redirects closed when none are declared', async () => {
    const images = new FakeImages()
    const policy: RemoteImagePolicy = { imageHosts: ['*.example.org'] }
    const url = 'https://cdn.example.org/a.jpg'
    const { calls } = stubFetch(imageResponse(url))
    const result = await cacheRemoteImage(url, { images, policy })
    expect(result.ok).toBe(true)
    expect(calls[0]?.init?.redirect).toBe('error')
  })

  it('follows a declared redirect host and accepts the matching final URL', async () => {
    const images = new FakeImages()
    const policy: RemoteImagePolicy = {
      imageHosts: ['img.example.org'],
      redirectHosts: ['cdn.example.net'],
    }
    const initial = 'https://img.example.org/a.jpg'
    const finalUrl = 'https://cdn.example.net/a.jpg?token=1'
    const { calls } = stubFetch(imageResponse(finalUrl))
    const result = await cacheRemoteImage(initial, { images, policy })
    expect(result.ok).toBe(true)
    expect(calls[0]?.init?.redirect).toBe('follow')
    expect(images.records.has(remoteCacheKey(initial))).toBe(true)
  })

  it('rejects a redirect that lands outside the declared redirect hosts', async () => {
    const images = new FakeImages()
    const policy: RemoteImagePolicy = {
      imageHosts: ['img.example.org'],
      redirectHosts: ['cdn.example.net'],
    }
    stubFetch(imageResponse('https://evil.example.net/a.jpg'))
    const result = await cacheRemoteImage('https://img.example.org/a.jpg', { images, policy })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(images.put).not.toHaveBeenCalled()
  })

  it('rejects a redirect to an eTLD look-alike of a declared redirect host', async () => {
    const images = new FakeImages()
    const policy: RemoteImagePolicy = {
      imageHosts: ['img.example.org'],
      redirectHosts: ['cdn.example.net'],
    }
    stubFetch(imageResponse('https://cdn.example.net.evil/a.jpg'))
    const result = await cacheRemoteImage('https://img.example.org/a.jpg', { images, policy })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(images.put).not.toHaveBeenCalled()
  })

  it('never lists Picsum as a provider image host', async () => {
    const images = new FakeImages()
    const { calls } = stubFetch(imageResponse())
    const result = await cacheRemoteImage('https://picsum.photos/id/10/1600/900', {
      images,
      policy: providerImagePolicy('openverse'),
    })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(calls).toHaveLength(0)
  })
})

describe('rejected-provider cache policy (no provider policy)', () => {
  it('makes no new Picsum request for a legacy selection on cache miss', async () => {
    const images = new FakeImages()
    const { calls } = stubFetch(imageResponse('https://fastly.picsum.photos/id/10/1600/900.jpg?hmac=abc'))
    const result = await cacheRemoteImage('https://picsum.photos/id/10/1600/900', { images })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(calls).toHaveLength(0)
    expect(images.put).not.toHaveBeenCalled()
  })

  it('does not refetch a Picsum CDN host without a policy either', async () => {
    const images = new FakeImages()
    const { calls } = stubFetch(imageResponse())
    const result = await cacheRemoteImage('https://fastly.picsum.photos/id/10/1600/900.jpg', { images })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(calls).toHaveLength(0)
  })

  it('keeps redirects fails-closed for other public URLs without a policy', async () => {
    const images = new FakeImages()
    const { calls } = stubFetch(imageResponse('https://cdn.example.net/a.jpg'))
    const result = await cacheRemoteImage('https://cdn.example.org/a.jpg', { images })
    expect(result.ok).toBe(true)
    expect(calls[0]?.init?.redirect).toBe('error')
  })
})
