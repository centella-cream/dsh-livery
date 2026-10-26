/**
 * DSH Livery — Host half (Cordis functional plugin).
 *
 * Three responsibilities the browser cannot handle on its own:
 *
 * 1. Declare the volatile Config the profile patch carries (`Config`), so the
 *    persisted skin id is a settings form the Client reads and writes through
 *    `ctx.configForms.get('livery')`.
 * 2. Contribute the first-frame rows on every index render, but only after the
 *    pre-loader gate has mapped the live DSH version through the generated
 *    adapter registry and confirmed the identity matches a certified build. A
 *    closed gate contributes nothing: stock stays stock.
 * 3. Serve the read-only catalog and preview assets from the webserver, when a
 *    Web carrier is composed, for the adapter this process resolved to.
 *
 * Cold-start readiness is a first-class concern: the runtime version probe has
 * an asynchronous fallback (the only import form the plugin contract allows),
 * so a page or asset request can arrive before it settles. To keep first paint
 * and the Client's single catalog fetch correct, the Host:
 *
 * - probes synchronously first (`observeHostVersionSync`, a package-manifest
 *   read through `createRequire` — no ESM evaluation, no bundler dependency),
 *   which settles the common Node/Electron case inside `apply`;
 * - otherwise latches the async probe and lets async callers (routes,
 *   `bootStateForConfigWhenReady`) await it with a bounded timeout;
 * - never treats "still pending" as "wrong version": the transient state fails
 *   closed (stock first paint) *without* logging a compatibility failure, and
 *   a later render/request includes boot content as soon as the probe settles.
 *
 * The listener is registered unconditionally: the event is inert without a
 * `WebServer`, and a desktop deployment that never serves an index simply never
 * emits it. Every resource is owned by `ctx.effect` (or by `ctx.on`), so
 * disable/HMR removes routes and rows without touching the page.
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: augments Context with `webServer` and Events with
// `webserver/index-inject`. Erased at build time — the host bundle must not
// require DSH packages at runtime.
import type {} from '@deepseek-ai/dsh-host-webserver'
import { ENTRY_ID } from '../core/types.js'
import type { AdapterRecord } from '../generated/contract.js'
import { computeBootState, resolveAdapterForVersion, type BootState, type ProfileKind } from './boot.js'
import { formatGateLogLine } from './diagnostics.js'
import { readSkinId, type LiveryHostConfig } from './config.js'
import { registerLiveryRoutes } from './routes.js'

/** The plugin's Loader entry id, and therefore its settings namespace. */
export const name = 'livery'

/** Live Host Config schema, re-exported for the Cordis loader. */
export { Config, normalizeSkinId, readSkinId } from './config.js'
export type { LiveryHostConfig, SkinPreference } from './config.js'
export type { BootState, GateResult, ProfileKind } from './boot.js'
export { bindPreviews, bindProfilePreviews, buildCatalog, previewsBaseFor } from './catalog.js'
export { registerLiveryRoutes } from './routes.js'

/**
 * Upper bound an async caller waits for the runtime version probe.
 *
 * Long enough to cover a cold module resolve on a loaded machine, short enough
 * that a genuinely absent probe leaves the browser carrier responsive (a 404
 * the Client already handles as degraded) instead of hanging a request.
 */
export const HOST_READINESS_TIMEOUT_MS = 1500

/** One resolved picture of the deployment the Host is running in. */
export interface HostEnvironment {
  readonly profileKind: ProfileKind
  /** Runtime DSH version reported by the harness, or `null` when unreadable. */
  readonly observedHostVersion: string | null
}

/**
 * The service surface needed from the optional settings service.
 *
 * Structural because `@deepseek-ai/dsh-settings` may be absent from a profile:
 * a deployment without it shows no trace of Livery in settings, and the plugin
 * still boots.
 */
interface LiverySettingsService {
  configure(options: { readonly auto: boolean }, fiber: unknown): unknown
}

/** A context that may carry the optional settings service. */
interface SettingsCarrier {
  settings?: LiverySettingsService
}

/** Latest resolved environment; `undefined` until the probe settles. */
let resolvedEnvironment: HostEnvironment | undefined
/** Latched environment probe, shared by every caller; never rejects. */
let readinessPromise: Promise<HostEnvironment> | undefined
/** Test override for the async probe (unset in production). */
let asyncProbeOverride: (() => Promise<string | null>) | undefined
/** Test override for the synchronous probe (unset in production). */
let syncProbeOverride: (() => string | null) | undefined
/** Last gate evaluation, for diagnostics and tests. */
let lastGateStatus: BootState | undefined
/** Last diagnostic line actually logged, so a failing gate warns once. */
let lastLoggedGateLine: string | undefined

/**
 * Detect the deployment profile.
 *
 * Electron sets `process.versions.electron`; the Web profile does not. The
 * profile kind is recorded in the payload for diagnostics only: certification
 * scope is a support-matrix claim, not a runtime switch, so it never decides
 * whether a certified adapter is accepted.
 * @returns `desktop` under Electron, `web` otherwise.
 */
export function detectProfileKind(): ProfileKind {
  const electron = (process.versions as Record<string, string | undefined>).electron
  return typeof electron === 'string' && electron.length > 0 ? 'desktop' : 'web'
}

/**
 * Package that owns the runtime version accessor.
 *
 * Spelled through a variable so the bundler and the type checker treat the
 * import as an optional runtime capability of the profile (`scripts/build.mjs`
 * marks the package external): the version probe must never become a build
 * dependency of a theme plugin.
 */
const APP_BOOT_PACKAGE = '@deepseek-ai/dsh-app-boot'

/**
 * CommonJS resolver rooted at the built module.
 *
 * Used only by {@link observeHostVersionSync} to locate the app-boot package
 * manifest. Creating it is side-effect free; resolution failures are caught.
 */
const requireFromHost = createRequire(import.meta.url)

/**
 * Deployment environment before the probe settles: profile known, version not.
 * @returns the unknown environment.
 */
function unknownEnvironment(): HostEnvironment {
  return { profileKind: detectProfileKind(), observedHostVersion: null }
}

/**
 * Read the runtime DSH version from the harness that is booting us.
 *
 * The only way a Host plugin can observe the live version is the app-boot
 * package's `getDshRuntimeVersion`; the version is not otherwise exposed. The
 * import is dynamic and guarded because a profile may not resolve the package,
 * and a theme plugin must not fail the host boot over a version probe. The
 * result is cached: the process version cannot change while running.
 * @returns the version string, or `null` when it cannot be observed.
 */
export async function observeHostVersion(): Promise<string | null> {
  try {
    const module = await import(APP_BOOT_PACKAGE) as {
      getDshRuntimeVersion?: () => unknown
    }
    const getVersion = module.getDshRuntimeVersion
    if (typeof getVersion !== 'function') return null
    const value = getVersion()
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
  } catch {
    // Unresolvable package, throwing accessor or exotic export: unknown is a
    // closed gate, never a guess.
    return null
  }
}

/**
 * Synchronous fast path for the runtime version.
 *
 * `getDshRuntimeVersion` is defined as "read the app-boot package manifest
 * version", so the same value can be obtained synchronously by resolving that
 * manifest through CommonJS and reading it. This never evaluates the package's
 * ESM entry (so no top-level-await hazard) and never becomes a build
 * dependency: `require.resolve` either finds `package.json` in the profile
 * node_modules chain or throws, in which case the caller falls back to the
 * async probe.
 *
 * The win is cold start: when this succeeds inside `apply`, the first index
 * render already carries boot rows and the first catalog/preview request is
 * answered immediately — without a bounded-wait round trip.
 * @returns the version string, or `null` when it cannot be observed synchronously.
 */
export function observeHostVersionSync(): string | null {
  try {
    const manifestPath = requireFromHost.resolve(`${APP_BOOT_PACKAGE}/package.json`)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version?: unknown }
    const version = manifest.version
    return typeof version === 'string' && version.trim() !== '' ? version.trim() : null
  } catch {
    // No CommonJS resolution path, unreadable manifest or malformed JSON: the
    // async probe remains the authority.
    return null
  }
}

/**
 * Run the async probe once and latch its result.
 *
 * Never rejects: any probe throw is mapped to "unknown version", which the gate
 * treats as a closed host rather than a boot failure.
 * @returns the resolved environment (never rejects).
 */
async function probeEnvironment(): Promise<HostEnvironment> {
  let version: string | null = null
  try {
    const probe = asyncProbeOverride ?? observeHostVersion
    const observed = await probe()
    version = typeof observed === 'string' && observed.trim() !== '' ? observed.trim() : null
  } catch {
    version = null
  }
  const environment: HostEnvironment = {
    profileKind: detectProfileKind(),
    observedHostVersion: version,
  }
  resolvedEnvironment ??= environment
  return environment
}

/**
 * Latched environment readiness: the shared probe promise.
 *
 * Callers that can await (HTTP routes, {@link bootStateForConfigWhenReady}) use
 * this or {@link awaitHostEnvironment} instead of reading "not resolved yet" as
 * "unknown version". The promise is created once per process and never rejects.
 * @returns the resolved environment.
 */
export function hostReadiness(): Promise<HostEnvironment> {
  readinessPromise ??= probeEnvironment()
  return readinessPromise
}

/**
 * Resolve the deployment environment once, sharing the in-flight probe.
 * @returns the resolved environment (never rejects).
 * @deprecated Prefer {@link hostReadiness} or {@link awaitHostEnvironment}; kept
 * for callers written against the pre-readiness API.
 */
export function resolveHostEnvironment(): Promise<HostEnvironment> {
  return resolvedEnvironment !== undefined ? Promise.resolve(resolvedEnvironment) : hostReadiness()
}

/**
 * Await readiness with a bounded timeout.
 *
 * Resolves with the real environment when the probe settles in time. On timeout
 * it resolves with the best environment known at that moment (possibly the
 * unknown environment) but does **not** latch "unknown": the probe keeps
 * running, so a later render/request picks up the real version. Never rejects.
 * @param timeoutMs - maximum wait in milliseconds.
 * @returns the environment, or the unknown environment after the timeout.
 */
export function awaitHostEnvironment(timeoutMs: number = HOST_READINESS_TIMEOUT_MS): Promise<HostEnvironment> {
  if (resolvedEnvironment !== undefined) return Promise.resolve(resolvedEnvironment)
  const readiness = hostReadiness()
  return new Promise<HostEnvironment>((resolve) => {
    let finished = false
    const finish = (environment: HostEnvironment): void => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      resolve(environment)
    }
    const timer = setTimeout(
      () => finish(resolvedEnvironment ?? unknownEnvironment()),
      Math.max(0, timeoutMs),
    )
    timer.unref?.()
    readiness.then(environment => finish(environment), () => finish(unknownEnvironment()))
  })
}

/**
 * Latch the environment synchronously when possible.
 *
 * Called at `apply` time and on every boot-state/route resolution so the common
 * case needs no waiting at all.
 * @returns the latched environment, or `undefined` when no synchronous probe is available.
 */
function tryResolveEnvironmentSynchronously(): HostEnvironment | undefined {
  if (resolvedEnvironment !== undefined) return resolvedEnvironment
  const probe = syncProbeOverride ?? observeHostVersionSync
  let version: string | null = null
  try {
    version = probe()
  } catch {
    version = null
  }
  if (typeof version !== 'string' || version.trim() === '') return undefined
  resolvedEnvironment = { profileKind: detectProfileKind(), observedHostVersion: version.trim() }
  return resolvedEnvironment
}

/**
 * The adapter this process currently styles, resolved through the generated
 * registry from the last observed host version.
 *
 * Tries the synchronous probe first, so a route request arriving before the
 * async probe settles can still answer without waiting. A probe failure keeps
 * everything closed rather than serving a guessed identity.
 * @returns the certified adapter, or `undefined` when the version is unknown/uncertified.
 */
export function resolveAdapter(): AdapterRecord | undefined {
  const environment = resolvedEnvironment ?? tryResolveEnvironmentSynchronously()
  return resolveAdapterForVersion(environment?.observedHostVersion ?? null)
}

/**
 * Evaluate the gate for one Host Config value.
 *
 * Synchronous and pure given an explicit `environment`; when omitted it uses the
 * last resolved probe (and treats an unresolved probe as "version unknown",
 * which fails closed). Async callers should prefer
 * {@link bootStateForConfigWhenReady} so a cold start waits for the probe
 * instead of emitting a transiently closed gate. The live volatile config is
 * read on every call, so a persisted skin change is reflected on the next index
 * render without remount.
 * @param config - live Host Config (or absent).
 * @param environment - resolved deployment identity.
 * @returns the boot state for this render.
 */
export function bootStateForConfig(
  config: LiveryHostConfig | undefined,
  environment: HostEnvironment = resolvedEnvironment ?? tryResolveEnvironmentSynchronously() ?? unknownEnvironment(),
): BootState {
  return computeBootState({
    skinId: readSkinId(config),
    profileKind: environment.profileKind,
    observedHostVersion: environment.observedHostVersion,
  })
}

/**
 * Evaluate the gate after bounded readiness.
 *
 * The async counterpart of {@link bootStateForConfig}: waits up to `timeoutMs`
 * for the version probe, then evaluates. Fail-closed semantics are unchanged —
 * a probe that times out or throws yields an unknown version and a closed gate.
 * @param config - live Host Config (or absent).
 * @param timeoutMs - maximum readiness wait in milliseconds.
 * @returns the boot state for this render.
 */
export async function bootStateForConfigWhenReady(
  config: LiveryHostConfig | undefined,
  timeoutMs: number = HOST_READINESS_TIMEOUT_MS,
): Promise<BootState> {
  return bootStateForConfig(config, await awaitHostEnvironment(timeoutMs))
}

/**
 * Log one structured line for a closed gate, at most once per distinct failure.
 *
 * `ctx.logger` is the Cordis logging service; a test context without one falls
 * back to the console so a fail-closed boot never becomes silent.
 * @param ctx - owning Host context.
 * @param state - closed boot state.
 */
function logGateFailureOnce(ctx: Context, state: BootState): void {
  const line = formatGateLogLine(state.gate)
  if (line === lastLoggedGateLine) return
  lastLoggedGateLine = line
  try {
    ctx.logger.warn(line)
  } catch {
    try {
      console.warn(line)
    } catch {
      // Logging must never be the thing that breaks a theme plugin.
    }
  }
}

/**
 * Host plugin entry point: config, first-frame rows, routes, settings policy.
 * @param ctx - Host context, one fiber per loaded entry.
 * @param config - live Config from the profile entry.
 */
export function apply(ctx: Context, config: LiveryHostConfig): void {
  // Cold-start readiness: settle the version probe as early as possible. The
  // synchronous package-manifest read (no ESM evaluation) resolves the common
  // case inside apply, before any index render or HTTP request can race us.
  // Only when that is unavailable do we latch the async probe — and async
  // callers then await it (bounded) instead of treating "pending" as "unknown".
  tryResolveEnvironmentSynchronously()
  if (resolvedEnvironment === undefined) void hostReadiness()

  // Registered unconditionally: the event is inert without a WebServer, and
  // the listener reads the live config value at emit time so a persisted skin
  // change reaches the next index render without a remount.
  ctx.on('webserver/index-inject', (table) => {
    const environment = resolvedEnvironment ?? tryResolveEnvironmentSynchronously()
    const state = bootStateForConfig(config, environment)
    lastGateStatus = state
    if (environment === undefined) {
      // Transient cold start: the probe is still pending, so this render stays
      // on stock. Do not log a gate failure — nothing is known to be
      // incompatible yet, and the next render after the probe settles carries
      // the boot rows.
      return
    }
    if (!state.gate.accepted) {
      logGateFailureOnce(ctx, state)
      return
    }
    // A later failure after a success should warn again.
    lastLoggedGateLine = undefined
    if (state.accepted) table.push(...state.rows)
  })

  // The browser carrier is optional: desktop deployments may never compose it.
  // Routes answer for whatever adapter the version probe resolved; a request
  // arriving before the probe settles waits up to HOST_READINESS_TIMEOUT_MS and
  // only then falls back to 404 (genuine unknown), so a cold client fetch is
  // not answered with a race-induced 404.
  ctx.inject(['webServer'], (child) => {
    child.effect(
      () => registerLiveryRoutes(child.webServer, {
        adapterFor: resolveAdapter,
        whenReady: () => awaitHostEnvironment(),
        readinessTimeoutMs: HOST_READINESS_TIMEOUT_MS,
      }),
      'livery: routes',
    )
  })

  // Keep the generated settings page out of the way: Livery's settings live in
  // its own Client section, which reads and writes this entry's volatile field.
  // A deployment without the settings service shows no trace of the plugin here.
  ctx.inject(['settings'], (child) => {
    const settings = (child as unknown as SettingsCarrier).settings
    if (settings === undefined) return
    child.effect(() => {
      try {
        const dispose = settings.configure({ auto: false }, ctx.fiber)
        return typeof dispose === 'function' ? dispose as () => void : () => {}
      } catch {
        // A refused settings policy is cosmetic; the plugin keeps working.
        return () => {}
      }
    }, 'livery: settings policy')
  })
}

// ---------------------------------------------------------------------------
// Test seams
//
// The gate and the listener cannot be exercised through a real WebServer in a
// unit test, so the environment probe and the last outcome are readable and
// seedable. These are exported functions, not mutable globals: nothing is
// written to `globalThis` and nothing leaks outside this module.
// ---------------------------------------------------------------------------

/**
 * Seed the resolved environment, bypassing every probe.
 * @param environment - environment to use, or `null` to clear it.
 */
export function setHostEnvironmentForTests(environment: HostEnvironment | null): void {
  resolvedEnvironment = environment ?? undefined
}

/**
 * Replace the async version probe (test-only).
 *
 * Clears the latched environment/readiness so the next `apply`/readiness call
 * runs the fake probe. Pass `null` to restore the production probe.
 * @param probe - fake probe returning a version or null.
 */
export function setHostVersionProbeForTests(probe: (() => Promise<string | null>) | null): void {
  asyncProbeOverride = probe ?? undefined
  resolvedEnvironment = undefined
  readinessPromise = undefined
}

/**
 * Replace the synchronous version probe (test-only).
 *
 * `null` disables the synchronous fast path, forcing tests through the async
 * readiness path. Pass `null` to restore the production probe.
 * @param probe - fake sync probe returning a version or null.
 */
export function setHostVersionSyncProbeForTests(probe: (() => string | null) | null): void {
  // `null` explicitly disables the fast path; `undefined` would restore the
  // production probe, which is not what a test wants when simulating a race.
  syncProbeOverride = probe === null ? (() => null) : probe
}

/** Whether the environment probe has settled (real or latched). */
export function isHostReady(): boolean {
  return resolvedEnvironment !== undefined
}

/** Latest gate evaluation, or `undefined` before the first index render. */
export function getLastGateStatus(): BootState | undefined {
  return lastGateStatus
}

/** Reset module state between tests (environment, probes, promise cache, logs). */
export function resetLiveryHostForTests(): void {
  resolvedEnvironment = undefined
  readinessPromise = undefined
  asyncProbeOverride = undefined
  syncProbeOverride = undefined
  lastGateStatus = undefined
  lastLoggedGateLine = undefined
}

/** Entry id re-exported for diagnostics parity with the client contract. */
export const SETTINGS_NAMESPACE = ENTRY_ID
