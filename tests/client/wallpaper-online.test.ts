/**
 * Online wallpaper studio state-machine tests (0.2.2).
 *
 * No test may hit the network: the studio accepts an injected page loader, and
 * the one integration-style case stubs `globalThis.fetch` for the real
 * `fetchOnlinePage` Auto failover. The panel-level render coverage lives in
 * `wallpaper-panel.test.tsx`.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  ONLINE_FAILURE_STATUSES,
  ONLINE_PAGE_SIZE,
  createOnlineStudio,
  onlineCapability,
  onlineFailureOf,
  randomRequestProvider,
  searchRequestProvider,
} from '../../src/client/ui/wallpaper-online.js'
import type { OnlinePageFetcher, OnlineStudio } from '../../src/client/ui/wallpaper-online.js'
import type {
  OnlinePageFailure,
  OnlinePageOk,
  OnlinePageRequest,
  WallpaperProviderResult,
} from '../../src/client/wallpaper/providers.js'

/** One provider-result fixture. */
function result(patch: Partial<WallpaperProviderResult> = {}): WallpaperProviderResult {
  return {
    providerId: 'openverse',
    id: 'result-1',
    title: 'Result one',
    creator: 'Creator',
    license: { name: 'CC0' },
    sourceUrl: 'https://example.com/source',
    fullUrl: 'https://api.openverse.org/v1/images/result-1/thumb/?full_size=true',
    thumbUrl: 'https://api.openverse.org/v1/images/result-1/thumb/',
    ...patch,
  }
}

/** A successful page fixture. */
function page(results: readonly WallpaperProviderResult[], servedBy: 'openverse' | 'wikimedia' = 'openverse'): OnlinePageOk {
  return { ok: true, results, servedBy }
}

/** A failed page fixture. */
function failure(patch: Partial<OnlinePageFailure> = {}): OnlinePageFailure {
  return { ok: false, failure: 'unavailable', tried: ['openverse'], ...patch }
}

/** Recording fetcher: returns one queued outcome and records every request. */
function recorder(outcomes: Array<OnlinePageOk | OnlinePageFailure>): {
  readonly fetchPage: OnlinePageFetcher
  readonly requests: OnlinePageRequest[]
} {
  const requests: OnlinePageRequest[] = []
  const fetchPage: OnlinePageFetcher = async (request) => {
    requests.push(request)
    const next = outcomes.shift()
    if (next === undefined) throw new Error('unexpected request')
    return next
  }
  return { fetchPage, requests }
}

/** Minimal JSON `Response` stand-in for the real provider transport. */
function jsonResponse(body: unknown, status = 200): Response {
  const text = JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    url: '',
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    body: null,
    text: async () => text,
  } as unknown as Response
}

/** One Wikimedia Commons API page (with licence metadata). */
function wikimediaPage(): unknown {
  return {
    query: {
      pages: {
        '7': {
          pageid: 7,
          title: 'File:Sea.jpg',
          imageinfo: [{
            mime: 'image/jpeg',
            url: 'https://upload.wikimedia.org/sea.jpg',
            thumburl: 'https://upload.wikimedia.org/sea-thumb.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Sea.jpg',
            width: 1200,
            height: 800,
            extmetadata: { LicenseShortName: { value: 'CC0' } },
          }],
        },
      },
    },
  }
}

describe('online studio — request policy', () => {
  it('starts idle and performs no request until the Online tab activates', async () => {
    const { fetchPage, requests } = recorder([page([result()])])
    const studio = createOnlineStudio({ fetchPage })
    expect(studio.getSnapshot().status).toBe('idle')
    expect(studio.getSnapshot().results).toEqual([])
    expect(requests).toHaveLength(0)

    await studio.activate()
    expect(requests).toHaveLength(1)
    expect(studio.getSnapshot().status).toBe('ready')
  })

  it('performs exactly one batch on first activation and never refetches on later switches', async () => {
    const { fetchPage, requests } = recorder([page([result()])])
    const studio = createOnlineStudio({ fetchPage })
    await studio.activate()
    await studio.activate()
    await studio.activate()
    expect(requests).toHaveLength(1)
    expect(requests[0]?.pageSize).toBe(ONLINE_PAGE_SIZE)
    expect(requests[0]?.provider).toBe('auto')
  })

  it('settles to empty without treating it as a failure', async () => {
    const { fetchPage } = recorder([page([])])
    const studio = createOnlineStudio({ fetchPage })
    await studio.activate()
    expect(studio.getSnapshot().status).toBe('empty')
    expect(studio.getSnapshot().failure).toBeUndefined()
  })

  it('names the provider that served the results', async () => {
    const { fetchPage } = recorder([page([result({ providerId: 'wikimedia' })], 'wikimedia')])
    const studio = createOnlineStudio({ fetchPage })
    await studio.activate()
    expect(studio.getSnapshot().servedBy).toBe('wikimedia')
  })

  it('reports each typed failure with its retry-after and tried providers', async () => {
    const { fetchPage } = recorder([failure({
      failure: 'rate-limited',
      retryAfterMs: 21_000,
      tried: ['openverse', 'wikimedia'],
    })])
    const studio = createOnlineStudio({ fetchPage })
    await studio.activate()
    const snapshot = studio.getSnapshot()
    expect(snapshot.status).toBe('rate-limited')
    expect(snapshot.failure).toBe('rate-limited')
    expect(snapshot.retryAfterMs).toBe(21_000)
    expect(snapshot.tried).toEqual(['openverse', 'wikimedia'])
    expect(snapshot.results).toEqual([])
  })

  it('backs off locally when a 429 has no Retry-After', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-23T00:00:00Z'))
    try {
      const { fetchPage, requests } = recorder([
        failure({ failure: 'rate-limited', tried: ['openverse', 'wikimedia'] }),
        page([result()]),
      ])
      const studio = createOnlineStudio({ fetchPage })
      await studio.activate()
      expect(studio.getSnapshot().status).toBe('rate-limited')
      expect(studio.getSnapshot().retryAfterMs).toBe(30_000)
      await studio.retry()
      expect(requests).toHaveLength(1)
      expect(studio.getSnapshot().status).toBe('rate-limited')
      vi.advanceTimersByTime(30_001)
      await studio.retry()
      expect(requests).toHaveLength(2)
      expect(studio.getSnapshot().status).toBe('ready')
      studio.dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('maps the failure union onto settled statuses only', () => {
    for (const status of ONLINE_FAILURE_STATUSES) {
      expect(onlineFailureOf(status)).toBe(status)
    }
    for (const status of ['idle', 'loading', 'ready', 'empty'] as const) {
      expect(onlineFailureOf(status)).toBeUndefined()
    }
  })

  it('retries the last request and refreshes it without changing provider', async () => {
    const { fetchPage, requests } = recorder([
      failure({ failure: 'timeout', tried: ['openverse'] }),
      page([result()]),
      page([result({ id: 'result-2' })]),
    ])
    const studio = createOnlineStudio({ fetchPage })
    studio.setQuery('sea')
    await studio.search()
    expect(requests[0]?.query).toBe('sea')
    await studio.retry()
    expect(requests[1]?.query).toBe('sea')
    await studio.refresh()
    expect(requests[2]?.query).toBe('sea')
    expect(studio.getSnapshot().servedBy).toBe('openverse')
  })

  it('does not retry when no request has run yet', async () => {
    const { fetchPage, requests } = recorder([])
    const studio = createOnlineStudio({ fetchPage })
    await studio.retry()
    await studio.refresh()
    expect(requests).toHaveLength(0)
  })

  it('ignores a stale response after the provider selection changed', async () => {
    let settle: ((outcome: OnlinePageOk) => void) | undefined
    const pending = new Promise<OnlinePageOk>((resolve) => { settle = resolve })
    const controller = new AbortController()
    const studio: OnlineStudio = createOnlineStudio({
      fetchPage: () => pending,
      createAbortController: () => controller,
    })
    const activation = studio.activate()
    expect(studio.getSnapshot().status).toBe('loading')
    studio.setProvider('wikimedia')
    expect(studio.getSnapshot().status).toBe('idle')
    expect(controller.signal.aborted).toBe(true)
    settle?.(page([result()]))
    await activation
    expect(studio.getSnapshot().status).toBe('idle')
    expect(studio.getSnapshot().results).toEqual([])
  })
})

describe('online studio — provider selection', () => {
  it('clears results to idle on a provider change and never fetches implicitly', async () => {
    const { fetchPage, requests } = recorder([page([result()])])
    const studio = createOnlineStudio({ fetchPage })
    await studio.activate()
    expect(studio.getSnapshot().status).toBe('ready')
    studio.setProvider('wikimedia')
    expect(requests).toHaveLength(1)
    expect(studio.getSnapshot().status).toBe('idle')
    expect(studio.getSnapshot().provider).toBe('wikimedia')
    expect(studio.getSnapshot().results).toEqual([])
    expect(studio.getSnapshot().servedBy).toBeUndefined()
    expect(studio.getSnapshot().lastRequest).toBeUndefined()
  })

  it('ignores an unknown provider id', () => {
    const studio = createOnlineStudio({ fetchPage: async () => page([]) })
    studio.setProvider('picsum')
    expect(studio.getSnapshot().provider).toBe('auto')
  })

  it('keeps the search text when the provider changes', () => {
    const studio = createOnlineStudio({ fetchPage: async () => page([]) })
    studio.setQuery('mountain')
    studio.setProvider('openverse')
    expect(studio.getSnapshot().query).toBe('mountain')
  })
})

describe('online studio — capability-gated actions', () => {
  it('resolves Search/Random targets from the frozen registry', () => {
    expect(searchRequestProvider('auto')).toBe('auto')
    expect(searchRequestProvider('openverse')).toBe('openverse')
    expect(searchRequestProvider('wikimedia')).toBe('wikimedia')
    // Wikimedia is the only provider declaring `random`.
    expect(randomRequestProvider('auto')).toBe('wikimedia')
    expect(randomRequestProvider('openverse')).toBeUndefined()
    expect(randomRequestProvider('wikimedia')).toBe('wikimedia')
  })

  it('disables Search and Random with a reason when the pinned source lacks them', () => {
    expect(onlineCapability('auto', 'search')).toEqual({ enabled: true, reason: undefined })
    expect(onlineCapability('auto', 'random')).toEqual({ enabled: true, reason: undefined })
    expect(onlineCapability('openverse', 'search')).toEqual({ enabled: true, reason: undefined })
    expect(onlineCapability('openverse', 'random')).toEqual({ enabled: false, reason: 'pinned-missing' })
    expect(onlineCapability('wikimedia', 'search')).toEqual({ enabled: true, reason: undefined })
    expect(onlineCapability('wikimedia', 'random')).toEqual({ enabled: true, reason: undefined })
  })

  it('never calls the page loader for a capability-gated no-op', async () => {
    const { fetchPage, requests } = recorder([])
    const studio = createOnlineStudio({ fetchPage })
    studio.setProvider('openverse')
    await studio.search() // search is supported by Openverse
    expect(requests).toHaveLength(1)
    expect(requests[0]?.provider).toBe('openverse')
    // Random is unavailable on the pinned Openverse source.
    await studio.random()
    expect(requests).toHaveLength(1)
  })

  it('pins Wikimedia for Auto Random and keeps the query empty', async () => {
    const { fetchPage, requests } = recorder([page([result({ providerId: 'wikimedia' })], 'wikimedia')])
    const studio = createOnlineStudio({ fetchPage })
    studio.setQuery('ignored for random')
    await studio.random()
    expect(requests[0]?.provider).toBe('wikimedia')
    expect(requests[0]?.query).toBeUndefined()
    expect(studio.getSnapshot().servedBy).toBe('wikimedia')
  })

  it('uses the pinned provider for Search', async () => {
    const { fetchPage, requests } = recorder([page([result({ providerId: 'wikimedia' })], 'wikimedia')])
    const studio = createOnlineStudio({ fetchPage })
    studio.setProvider('wikimedia')
    studio.setQuery('harbour')
    await studio.search()
    expect(requests[0]?.provider).toBe('wikimedia')
    expect(requests[0]?.query).toBe('harbour')
  })
})

describe('online studio — real provider transport (no network)', () => {
  it('fails over inside one Auto batch and names the serving provider', async () => {
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input)
      calls.push(url)
      if (url.startsWith('https://api.openverse.org/')) return jsonResponse({}, 500)
      return jsonResponse(wikimediaPage())
    })
    vi.stubGlobal('fetch', fetchMock)
    try {
      const studio = createOnlineStudio()
      expect(fetchMock).not.toHaveBeenCalled()
      await studio.activate()
      const snapshot = studio.getSnapshot()
      expect(snapshot.status).toBe('ready')
      expect(snapshot.servedBy).toBe('wikimedia')
      expect(snapshot.results).toHaveLength(1)
      expect(snapshot.results[0]?.fullUrl).toBe('https://upload.wikimedia.org/sea.jpg')
      // One Auto batch = at most two provider attempts, never more.
      expect(calls).toHaveLength(2)
      expect(calls[0]).toContain('api.openverse.org')
      expect(calls[1]).toContain('commons.wikimedia.org')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
