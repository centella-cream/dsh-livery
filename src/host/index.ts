/**
 * DSH Livery — Host half (Cordis functional plugin).
 *
 * Three responsibilities, all of them things the browser cannot do for itself:
 *
 * 1. Declare the volatile Config the profile patch carries (`Config`), so the
 *    persisted skin id is a settings form the Client reads and writes through
 *    `ctx.configForms.get('livery')`.
 * 2. Contribute the first-frame rows on every index render, but only after the
 *    pre-loader gate has proved the live host identity matches the certified
 *    contract. A closed gate contributes nothing: stock stays stock.
 * 3. Serve the read-only catalog and preview assets from the webserver, when a
 *    Web carrier is composed.
 *
 * The listener is registered unconditionally: the event is inert without a
 * `WebServer`, and a desktop deployment that never serves an index simply never
 * emits it. Every resource is owned by `ctx.effect` (or by `ctx.on`), so
 * disable/HMR removes routes and rows without touching the page.
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: augments Context with `webServer` and Events with
// `webserver/index-inject`. Erased at build time — the host bundle must not
// require DSH packages at runtime.
import type {} from '@deepseek-ai/dsh-host-webserver'
import { ENTRY_ID } from '../core/types.js'
import { CONTRACT_FACTS, HOST_CAPABILITIES } from '../generated/contract.js'
import { CATALOG_META, LIVERIES } from '../generated/liveries.js'
import { computeBootState, type BootState, type ProfileKind } from './boot.js'
import { formatGateLogLine } from './diagnostics.js'
import { readSkinId, type LiveryHostConfig } from './config.js'
import { registerLiveryRoutes } from './routes.js'

/** The plugin's Loader entry id, and therefore its settings namespace. */
export const name = 'livery'

/** Live Host Config schema, re-exported for the Cordis loader. */
export { Config, normalizeSkinId, readSkinId } from './config.js'
export type { LiveryHostConfig, SkinPreference } from './config.js'
export type { BootState, GateResult, ProfileKind } from './boot.js'
export { buildCatalog, bindPreviews } from './catalog.js'
export { registerLiveryRoutes } from './routes.js'

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

/** Latest resolved environment; `undefined` until the lazy probe settles. */
let resolvedEnvironment: HostEnvironment | undefined
/** In-flight environment probe, shared by every caller. */
let environmentPromise: Promise<HostEnvironment> | undefined
/** Last gate evaluation, for diagnostics and tests. */
let lastGateStatus: BootState | undefined
/** Last diagnostic line actually logged, so a failing gate warns once. */
let lastLoggedGateLine: string | undefined

/**
 * Detect the deployment profile.
 *
 * Electron sets `process.versions.electron`; the Web profile does not. The
 * profile kind is carried into the payload so the Client can refuse desktop
 * first-paint claims this build has not certified.
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
    return typeof value === 'string' && value.trim() !== '' ? value : null
  } catch {
    // Unresolvable package, throwing accessor or exotic export: unknown is a
    // closed gate, never a guess.
    return null
  }
}

/**
 * Resolve the deployment environment once, sharing the in-flight probe.
 * @returns the resolved environment (never rejects).
 */
export function resolveHostEnvironment(): Promise<HostEnvironment> {
  environmentPromise ??= observeHostVersion().then(
    (observedHostVersion): HostEnvironment => ({
      profileKind: detectProfileKind(),
      observedHostVersion,
    }),
    (): HostEnvironment => ({
      profileKind: detectProfileKind(),
      observedHostVersion: null,
    }),
  )
  return environmentPromise
}

/**
 * Evaluate the gate for one Host Config value.
 *
 * Pure given an explicit `environment`; when omitted it uses the last resolved
 * probe (and treats an unresolved probe as "version unknown", which fails
 * closed). Reads the live volatile config on every call, so a persisted change
 * is reflected on the next index render without remount.
 * @param config - live Host Config (or absent).
 * @param environment - resolved deployment identity.
 * @returns the boot state for this render.
 */
export function bootStateForConfig(
  config: LiveryHostConfig | undefined,
  environment: HostEnvironment = resolvedEnvironment ?? {
    profileKind: detectProfileKind(),
    observedHostVersion: null,
  },
): BootState {
  return computeBootState({
    skinId: readSkinId(config),
    capabilities: HOST_CAPABILITIES,
    liveries: LIVERIES,
    catalogMeta: CATALOG_META,
    contractFacts: CONTRACT_FACTS,
    profileKind: environment.profileKind,
    observedHostVersion: environment.observedHostVersion,
  })
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
  // Settle the version probe in the background; until it resolves the gate
  // treats the version as unknown and contributes no rows. The probe is cached,
  // so exactly one dynamic import happens per process.
  if (resolvedEnvironment === undefined) {
    void resolveHostEnvironment().then((environment) => {
      resolvedEnvironment ??= environment
    }, () => {
      // Rejection is already mapped to "unknown" inside resolveHostEnvironment.
    })
  }

  // Registered unconditionally: the event is inert without a WebServer, and
  // the listener reads the live config value at emit time so a persisted skin
  // change reaches the next index render without a remount.
  ctx.on('webserver/index-inject', (table) => {
    const state = bootStateForConfig(config)
    lastGateStatus = state
    if (state.accepted) {
      // A later failure after a success should warn again.
      lastLoggedGateLine = undefined
      if (state.rows.length > 0) table.push(...state.rows)
      return
    }
    logGateFailureOnce(ctx, state)
  })

  // The browser carrier is optional: desktop deployments may never compose it.
  ctx.inject(['webServer'], (child) => {
    child.effect(
      () => registerLiveryRoutes(child.webServer),
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
 * Seed the resolved environment, bypassing the dynamic version probe.
 * @param environment - environment to use, or `null` to clear it.
 */
export function setHostEnvironmentForTests(environment: HostEnvironment | null): void {
  resolvedEnvironment = environment ?? undefined
}

/** Latest gate evaluation, or `undefined` before the first index render. */
export function getLastGateStatus(): BootState | undefined {
  return lastGateStatus
}

/** Reset module state between tests (environment, promise cache, last status). */
export function resetLiveryHostForTests(): void {
  resolvedEnvironment = undefined
  environmentPromise = undefined
  lastGateStatus = undefined
  lastLoggedGateLine = undefined
}

/** Entry id re-exported for diagnostics parity with the client contract. */
export const SETTINGS_NAMESPACE = ENTRY_ID
