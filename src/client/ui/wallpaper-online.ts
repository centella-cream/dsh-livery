/**
 * Online wallpaper studio state machine (0.2.2).
 *
 * The wallpaper page must not touch the network just because it was opened: the
 * default image tab is Built-in and the first Online activation performs exactly
 * one batch for the current provider/query. Everything else (Search, Random,
 * Refresh, Retry) is user-originated. This module owns that request policy and
 * the settled `idle | loading | ready | empty | <provider failure>` states, so
 * the React panel only renders a snapshot and calls explicit actions.
 *
 * The registry (`../wallpaper/providers.js`) is the frozen source of truth:
 * `fetchOnlinePage` owns Auto failover, the 12 s overall deadline and the 6 s
 * per-attempt cap; this module never re-implements them. Capability-gated actions
 * are resolved here too:
 *
 * - Search runs through providers that declare `search` (Auto keeps failover);
 * - Random pins the first provider that declares `random` (Wikimedia Commons);
 * - a pinned provider lacking a capability disables that action.
 */
import {
  fetchOnlinePage,
  providerById,
  providersForCapability,
} from '../wallpaper/providers.js'
import type {
  OnlinePageFailure,
  OnlinePageOk,
  OnlinePageRequest,
  ProviderFailure,
  ProviderId,
  WallpaperProviderResult,
} from '../wallpaper/providers.js'

/** Idle/loading/settled union shown by the Online panel. */
export type OnlineStatus = 'idle' | 'loading' | 'ready' | 'empty' | ProviderFailure

/** Selected online source: `auto` or one explicit gate-accepted provider. */
export type ProviderChoice = 'auto' | ProviderId

/** Capability-gated actions. */
export type OnlineCapability = 'search' | 'random'

/** The request kinds a user action can originate. */
export type OnlineAction = 'browse' | 'search' | 'random'

/** One repeatable request description (Refresh/Retry reuse it verbatim). */
export interface OnlineRequestSpec {
  readonly action: OnlineAction
  readonly provider: ProviderChoice
  readonly query: string
}

/** Provider failure classes, in the order the UI documents them. */
export const ONLINE_FAILURE_STATUSES: readonly ProviderFailure[] = [
  'timeout',
  'rate-limited',
  'auth-required',
  'unavailable',
  'invalid-response',
]

/** Results requested per online page. */
export const ONLINE_PAGE_SIZE = 12

/** One immutable Online studio snapshot consumed by the panel. */
export interface OnlineStudioSnapshot {
  readonly status: OnlineStatus
  readonly provider: ProviderChoice
  readonly query: string
  readonly results: readonly WallpaperProviderResult[]
  /** Provider that served the current results (`auto` failover names it). */
  readonly servedBy: ProviderId | undefined
  readonly failure: ProviderFailure | undefined
  readonly retryAfterMs: number | undefined
  readonly tried: readonly ProviderId[]
  readonly nextCursor: string | undefined
  /** Request the Refresh/Retry actions would repeat; `undefined` before any run. */
  readonly lastRequest: OnlineRequestSpec | undefined
}

/** Capability-gating answer for one action. */
export interface OnlineCapabilityAvailability {
  readonly enabled: boolean
  /** Why the action is unavailable (`undefined` when enabled). */
  readonly reason: OnlineCapabilityReason | undefined
}

/** Why a capability-gated action is disabled. */
export type OnlineCapabilityReason = 'no-provider' | 'pinned-missing'

/** Injected page loader (defaults to the frozen `fetchOnlinePage`). */
export type OnlinePageFetcher = (request: OnlinePageRequest) => Promise<OnlinePageOk | OnlinePageFailure>

/** Options of {@link createOnlineStudio}. */
export interface OnlineStudioOptions {
  /** Page loader override (tests inject a fake; never hits the network). */
  readonly fetchPage?: OnlinePageFetcher | undefined
  /** AbortController factory override (tests may return `undefined`). */
  readonly createAbortController?: (() => AbortController | undefined) | undefined
}

/** Actions/state of one mounted Online studio. */
export interface OnlineStudio {
  getSnapshot(): OnlineStudioSnapshot
  subscribe(listener: () => void): () => void
  /**
   * First Online-tab activation: performs one browse batch for the current
   * provider/query, only while the studio is still idle. Later tab switches are
   * no-ops because the status has settled.
   */
  activate(): Promise<void>
  /** Select `auto`/one provider; clears results to idle and never fetches. */
  setProvider(provider: string): void
  /** Update the search text without starting a request. */
  setQuery(query: string): void
  /** Explicit Search (capability-gated). */
  search(): Promise<void>
  /** Explicit Random (capability-gated; pins the first random provider). */
  random(): Promise<void>
  /** Repeat the last request with a fresh page. */
  refresh(): Promise<void>
  /** Repeat the failed request. */
  retry(): Promise<void>
  /** Cancel an in-flight request and drop listeners. */
  dispose(): void
}

/** Default Browser AbortController factory (undefined when unavailable). */
function defaultAbortController(): (() => AbortController | undefined) | undefined {
  try {
    if (typeof AbortController === 'undefined') return undefined
    return () => new AbortController()
  } catch {
    return undefined
  }
}

/** Fresh idle snapshot for one provider/query pair. */
function idleSnapshot(provider: ProviderChoice = 'auto', query = ''): OnlineStudioSnapshot {
  return {
    status: 'idle',
    provider,
    query,
    results: [],
    servedBy: undefined,
    failure: undefined,
    retryAfterMs: undefined,
    tried: [],
    nextCursor: undefined,
    lastRequest: undefined,
  }
}

/**
 * Whether one status is a settled provider failure (mapped to `role="alert"`).
 * @param status - online status.
 * @returns the failure class, or undefined for idle/loading/ready/empty.
 */
export function onlineFailureOf(status: OnlineStatus): ProviderFailure | undefined {
  return (ONLINE_FAILURE_STATUSES as readonly string[]).includes(status)
    ? status as ProviderFailure
    : undefined
}

/**
 * Resolve which provider/search target a Search action must use.
 *
 * Auto keeps the registry's failover order; a pinned provider is used only when
 * it truthfully declares `search`.
 * @param choice - current provider selection.
 * @returns the request provider, or undefined when Search is unavailable.
 */
export function searchRequestProvider(choice: ProviderChoice): ProviderChoice | undefined {
  if (choice === 'auto') {
    return providersForCapability('search').length === 0 ? undefined : 'auto'
  }
  const provider = providerById(choice)
  return provider?.capabilities.search === true ? provider.id : undefined
}

/**
 * Resolve which provider a Random action must pin.
 *
 * Auto pins the first provider in registry order that declares `random`; a
 * pinned provider is used only when it declares `random` itself.
 * @param choice - current provider selection.
 * @returns the pinned random provider, or undefined when Random is unavailable.
 */
export function randomRequestProvider(choice: ProviderChoice): ProviderId | undefined {
  if (choice === 'auto') return providersForCapability('random')[0]?.id
  const provider = providerById(choice)
  return provider?.capabilities.random === true ? provider.id : undefined
}

/**
 * Capability answer the panel renders (disabled controls get a visible reason).
 * @param choice - current provider selection.
 * @param capability - capability to check.
 * @returns enabled flag plus the disabled reason.
 */
export function onlineCapability(
  choice: ProviderChoice,
  capability: OnlineCapability,
): OnlineCapabilityAvailability {
  if (capability === 'search') {
    const provider = searchRequestProvider(choice)
    if (provider !== undefined) return { enabled: true, reason: undefined }
    return { enabled: false, reason: choice === 'auto' ? 'no-provider' : 'pinned-missing' }
  }
  const provider = randomRequestProvider(choice)
  if (provider !== undefined) return { enabled: true, reason: undefined }
  return { enabled: false, reason: choice === 'auto' ? 'no-provider' : 'pinned-missing' }
}

/**
 * Create the Online studio state machine.
 * @param options - page loader/AbortController injection (tests).
 * @returns the studio (idle, no request).
 */
export function createOnlineStudio(options: OnlineStudioOptions = {}): OnlineStudio {
  const fetchPage = options.fetchPage ?? fetchOnlinePage
  const createAbort = options.createAbortController ?? defaultAbortController()
  const listeners = new Set<() => void>()
  let snapshot = idleSnapshot()
  /** Monotonic request ticket: a stale response never overwrites a newer one. */
  let sequence = 0
  let active: AbortController | undefined
  let disposed = false

  const publish = (patch: Partial<OnlineStudioSnapshot>): void => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch {
        /* a broken listener must not break the studio */
      }
    }
  }

  const abortActive = (): void => {
    if (active === undefined) return
    try {
      active.abort()
    } catch {
      /* abort is best effort */
    }
    active = undefined
  }

  const run = async (request: OnlineRequestSpec): Promise<void> => {
    if (disposed) return
    const ticket = ++sequence
    abortActive()
    const controller = createAbort?.()
    active = controller
    publish({
      status: 'loading',
      results: [],
      servedBy: undefined,
      failure: undefined,
      retryAfterMs: undefined,
      tried: [],
      nextCursor: undefined,
      lastRequest: request,
    })
    let outcome: OnlinePageOk | OnlinePageFailure
    try {
      outcome = await fetchPage({
        provider: request.provider,
        ...(request.query.length > 0 ? { query: request.query } : {}),
        pageSize: ONLINE_PAGE_SIZE,
        ...(controller === undefined ? {} : { signal: controller.signal }),
      })
    } catch {
      outcome = { ok: false, failure: 'unavailable', tried: [] }
    }
    if (disposed || ticket !== sequence) return
    active = undefined
    if (outcome.ok) {
      publish({
        status: outcome.results.length === 0 ? 'empty' : 'ready',
        results: outcome.results,
        servedBy: outcome.servedBy,
        failure: undefined,
        retryAfterMs: undefined,
        tried: [],
        nextCursor: outcome.nextCursor,
      })
      return
    }
    publish({
      status: outcome.failure,
      results: [],
      servedBy: undefined,
      failure: outcome.failure,
      retryAfterMs: outcome.retryAfterMs,
      tried: [...outcome.tried],
      nextCursor: undefined,
    })
  }

  const repeatLast = async (onlyFailure: boolean): Promise<void> => {
    if (disposed) return
    if (onlyFailure && onlineFailureOf(snapshot.status) === undefined) return
    const last = snapshot.lastRequest
    if (last === undefined) return
    await run(last)
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    activate: async () => {
      if (disposed || snapshot.status !== 'idle') return
      await run({ action: 'browse', provider: snapshot.provider, query: snapshot.query.trim() })
    },
    setProvider: (provider: string) => {
      if (disposed) return
      let next: ProviderChoice
      if (provider === 'auto') {
        next = 'auto'
      } else {
        const found = providerById(provider)
        if (found === undefined) return
        next = found.id
      }
      if (next === snapshot.provider) return
      // Never fetch implicitly: abort any in-flight request and settle back idle.
      sequence += 1
      abortActive()
      publish({
        ...idleSnapshot(next, snapshot.query),
      })
    },
    setQuery: (query: string) => {
      if (disposed || query === snapshot.query) return
      publish({ query })
    },
    search: async () => {
      if (disposed) return
      const provider = searchRequestProvider(snapshot.provider)
      if (provider === undefined) return
      await run({ action: 'search', provider, query: snapshot.query.trim() })
    },
    random: async () => {
      if (disposed) return
      const provider = randomRequestProvider(snapshot.provider)
      if (provider === undefined) return
      await run({ action: 'random', provider, query: '' })
    },
    refresh: async () => {
      await repeatLast(false)
    },
    retry: async () => {
      await repeatLast(true)
    },
    dispose: () => {
      disposed = true
      sequence += 1
      abortActive()
      listeners.clear()
    },
  }
}
