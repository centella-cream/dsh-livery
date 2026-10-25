/**
 * First-frame boot: the multi-adapter pre-loader gate and the index rows it
 * contributes.
 *
 * This is the only Host code that runs before the Client exists, so it carries
 * the plugin's fail-closed rule: the live DSH version maps through the generated
 * adapter registry to exactly one certified adapter, and unless that adapter's
 * identity, catalog and the active livery all check out, the Host contributes
 * zero rows. A closed gate leaves the page on stock appearance, never a
 * half-injected palette or a partial row table. Unknown or uncertified versions
 * are a closed gate, not a best effort.
 *
 * The runtime never renders or hashes CSS. `renderBootCssFromCatalog` reads the
 * `css` fragments and `cssHash` the compiler already produced and gated, so the
 * injected bytes are the bytes the Client expects from the catalog.
 *
 * Rows follow `@deepseek-ai/dsh-host-webserver`'s `IndexInjection` union: `html`
 * (a head `<style>` with an id the Client can adopt), then `global` (the
 * handshake payload), then `script` (body attribute stamping). All content is
 * escaped so no livery id or CSS comment can close its host element early.
 */

import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import {
  BOOT_GLOBAL,
  BOOT_STYLE_ID,
  BODY_ATTRIBUTE,
  CATALOG_ROUTE,
  ENTRY_ID,
  HASH_ATTRIBUTE,
  LIVERY_VERSION,
  PLUGIN_MARKER,
  STOCK_ID,
  type BootAttributePayload,
  type BootPayload,
  type CapabilityMap,
  type LiveryCatalog,
} from '../core/types.js'
import { findLivery, renderBootCssFromCatalog } from '../core/catalog.js'
import {
  ADAPTERS,
  SUPPORTED_HOST_VERSIONS,
  adapterForVersion,
  type AdapterRecord,
} from '../generated/contract.js'
import {
  COMPAT_ADAPTER_ID,
  DSH_COMPAT_RANGE,
  isCompatibleHostVersion,
} from '../core/compat.js'
import { buildCatalog } from './catalog.js'
import { normalizeSkinId } from './config.js'
import {
  CAPABILITY_MISSING_PREFIX,
  GATE_CODE,
  buildDiagnostics,
} from './diagnostics.js'

/** Deployment profile the Host is running in. Recorded for diagnostics only. */
export type ProfileKind = 'web' | 'desktop'

/** Map used when the host is uncertified and no adapter exists. */
const NO_CAPABILITIES: CapabilityMap = Object.freeze({})

/**
 * One gate evaluation, independent of the payload and rows it produced.
 *
 * The diagnostic layer consumes this shape (rather than the whole boot state)
 * so it can explain a closed gate without depending on the render layer. Empty
 * strings mean the registry could not resolve an adapter, and the diagnostics
 * report the same.
 */
export interface GateResult {
  /**
   * True only when every identity check passed. This is the gate verdict used
   * for diagnostics: `stock` passes the gate but has no boot content to emit.
   */
  readonly accepted: boolean
  /** Stable codes for every failed check; empty when accepted. */
  readonly codes: readonly string[]
  readonly profileKind: ProfileKind
  /** True when the adapter is the synthetic compat adapter (absent = false). */
  readonly compat?: boolean
  /** Compatibility range declared by `engines.dsh` (absent = stock policy). */
  readonly compatRange?: string
  /** Version reported by the live harness, or `null` when it cannot be read. */
  readonly observedHostVersion: string | null
  /** Exact certified host versions this build may style. */
  readonly supportedHostVersions: readonly string[]
  /** Resolved adapter identity; empty when the registry rejected the version. */
  readonly adapterId: string
  readonly hostVersion: string
  readonly contractHash: string
  /** Catalog profile the adapter renders with (shared by render-equivalent versions). */
  readonly catalogProfile: string
  /** Required capabilities of the active livery that this host lacks. */
  readonly missingCapabilities: readonly string[]
  /** Requested skin id before resolution (`stock` for an absent config). */
  readonly activeSkinId: string
  /** Render failure message, or `null` when rendering succeeded / was skipped. */
  readonly renderError: string | null
}

/** Everything one index-inject evaluation produces. */
export interface BootState {
  /** True only when boot rows will be injected (real livery + compiled CSS). */
  readonly accepted: boolean
  /** Rows to append, in final order. Empty whenever the gate closed or skin is stock. */
  readonly rows: readonly IndexInjection[]
  readonly payload: BootPayload
  readonly gate: GateResult
  /** Adapter the observed host resolved to (synthetic in compat mode), `undefined` when closed. */
  readonly adapter: AdapterRecord | undefined
  /** True when serving an uncertified version inside the compatibility range. */
  readonly compat: boolean
  /** Capability map the gate evaluated (the adapter's; empty when unresolved). */
  readonly capabilities: CapabilityMap
  /** Same list as `payload.diagnostics`, exposed for direct assertions. */
  readonly diagnostics: readonly string[]
}

/** Inputs one pre-loader gate evaluation needs. All data, no services. */
export interface BootStateInput {
  /** Raw configured skin id (already read from the volatile config). */
  readonly skinId: string | undefined
  readonly profileKind: ProfileKind
  /** Runtime DSH version reported by the harness, `null` when unreadable. */
  readonly observedHostVersion: string | null | undefined
  /**
   * Resolved adapter override. Production never passes this: the gate resolves
   * through the generated registry, which is the point of the multi-adapter
   * boundary. Tests use it to exercise each certified adapter deterministically.
   */
  readonly adapter?: AdapterRecord
  /** Catalog override for tests; defaults to `buildCatalog(adapter)`. */
  readonly catalog?: LiveryCatalog
  /**
   * Render seam for tests. Production always uses the compiled-catalog reader;
   * the default is intentionally not configurable from the plugin config.
   */
  readonly renderBoot?: (catalog: LiveryCatalog, skinId: string) => { css: string; hash: string }
}

/**
 * Normalize the observed version: absent/blank means "unknown", not "anything".
 * @param version - version the harness reported.
 * @returns trimmed version, or `null`.
 */
function normalizeObservedVersion(version: string | null | undefined): string | null {
  if (typeof version !== 'string') return null
  const trimmed = version.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Resolve a readable host version to an adapter.
 *
 * Exact certified versions resolve through the generated registry. A version
 * inside the compatibility range without a certified adapter gets the newest
 * certified contract under the synthetic `dsh-compat` identity, so newer DSH
 * builds keep a working (unverified) visual layer instead of failing closed.
 * @param observedHostVersion - readable host version, or null.
 * @returns resolved adapter and whether it is the compat adapter.
 */
export function resolveAdapterForVersion(
  observedHostVersion: string | null,
): { readonly adapter: AdapterRecord | undefined; readonly compat: boolean } {
  const exact = adapterForVersion(observedHostVersion ?? undefined)
  if (exact !== undefined) return { adapter: exact, compat: false }
  if (observedHostVersion !== null && isCompatibleHostVersion(observedHostVersion)) {
    const newest = ADAPTERS[ADAPTERS.length - 1]
    if (newest !== undefined) {
      return {
        adapter: {
          ...newest,
          adapterId: COMPAT_ADAPTER_ID,
          hostVersion: observedHostVersion,
        },
        compat: true,
      }
    }
  }
  return { adapter: undefined, compat: false }
}

/**
 * Escape CSS for embedding inside a `<style>` element.
 *
 * The HTML parser closes a raw-text element at the first `</style`, whatever
 * the CSS grammar says; `<\/style` is both inert to the parser and a valid CSS
 * escape for the same sequence.
 * @param css - rendered stylesheet text.
 * @returns the text safe to place inside `<style>`.
 */
export function escapeStyleText(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style')
}

/**
 * Escape a JSON literal for embedding inside a `<script>` element.
 *
 * Escaping every `<` as `\u003c` keeps the resulting JSON semantically identical
 * while making `</script` impossible to form inside the document.
 * @param json - `JSON.stringify` output.
 * @returns the literal safe to place inside `<script>`.
 */
export function escapeJsonForScript(json: string): string {
  return json.replace(/</g, '\\u003c')
}

/**
 * Escape a value for a double-quoted HTML attribute.
 * @param value - attribute value.
 * @returns the escaped value.
 */
export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Build the head `<style>` row markup for the boot CSS.
 *
 * The element carries the markers the Client and the plugin lifecycle use:
 * `id` for exact adoption, `data-plugin` for DSH's disposal of plugin-owned
 * styles, and the content hash so the Client can confirm the sheet it would
 * render is already on screen.
 * @param css - rendered boot CSS.
 * @param hash - content hash of that CSS.
 * @returns raw `<style>` markup.
 */
export function renderBootStyleHtml(css: string, hash: string): string {
  return `<style id="${BOOT_STYLE_ID}" data-plugin="${PLUGIN_MARKER}" `
    + `${HASH_ATTRIBUTE}="${escapeAttribute(hash)}">${escapeStyleText(css)}</style>`
}

/**
 * Build the body script that stamps the boot attributes.
 *
 * The script runs before the app's own module script, so the first painted
 * frame already matches the persisted skin. It writes only Livery-owned
 * attributes, never host `data-*` attributes, and does nothing when there is no
 * body yet.
 * @param skinId - resolved livery id.
 * @param hash - content hash of the boot CSS.
 * @returns inline classic script text.
 */
export function renderBootAttributeScript(skinId: string, hash: string): string {
  const attributes: BootAttributePayload = { skinId, hash }
  const literal = escapeJsonForScript(JSON.stringify(attributes))
  return `(() => {
  const boot = ${literal}
  const body = document.body
  if (!body) return
  try {
    body.setAttribute(${JSON.stringify(BODY_ATTRIBUTE)}, boot.skinId)
    body.setAttribute(${JSON.stringify(HASH_ATTRIBUTE)}, boot.hash)
  } catch (error) {
    // Attribute stamping only affects first-paint ordering; a failure is not fatal.
  }
})()`
}

/**
 * Describe an unknown thrown value without leaking a stack or path.
 * @param error - caught value.
 * @returns a one-line message.
 */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/\s+/g, ' ').trim()
  if (typeof error === 'string') return error.replace(/\s+/g, ' ').trim()
  try {
    return JSON.stringify(error)
  } catch {
    return 'unknown render failure'
  }
}

/**
 * Evaluate the multi-adapter gate and, when it accepts, build the boot rows.
 *
 * Acceptance requires all of:
 * 1. the observed DSH version resolves to exactly one certified adapter through
 *    the generated registry (unreadable/uncertified versions are closed gates);
 * 2. the served catalog repeats that adapter's identity and catalog profile;
 * 3. a requested livery resolves through `findLivery` in that profile;
 * 4. every capability the livery declares as required is available on this
 *    adapter's capability map;
 * 5. the compiled boot stylesheet exists for the active livery.
 *
 * A requested `stock` skin is always accepted when the identity checks pass,
 * and contributes no rows at all — the stock look is the absence of Livery.
 * @param input - live config value, deployment profile and observed host version.
 * @returns gate outcome, adapter, payload and rows (rows are empty on failure).
 */
export function computeBootState(input: BootStateInput): BootState {
  const observedHostVersion = normalizeObservedVersion(input.observedHostVersion)
  // Production path: registry lookup. The override exists only so adapter
  // fixtures can be exercised without mutating the generated registry.
  const resolution = input.adapter !== undefined
    ? { adapter: input.adapter, compat: false }
    : resolveAdapterForVersion(observedHostVersion)
  const adapter = resolution.adapter
  const compat = resolution.compat

  const codes: string[] = []

  // 1. Identity: the live host must resolve to one certified adapter, and an
  // explicitly supplied adapter must describe the version the harness reported.
  if (observedHostVersion === null) {
    codes.push(GATE_CODE.versionUnknown)
  } else if (adapter === undefined) {
    codes.push(GATE_CODE.versionMismatch)
  } else if (input.adapter !== undefined && adapter.hostVersion !== observedHostVersion) {
    codes.push(GATE_CODE.adapterMismatch)
  }

  // 2. Catalog identity for the resolved adapter. Built here (not passed in)
  // in production; the checks also protect injected/foreign catalogs.
  let catalog: LiveryCatalog | undefined
  if (adapter !== undefined) {
    catalog = input.catalog ?? buildCatalog(adapter)
    if (codes.length === 0) {
      if (catalog.adapterId !== adapter.adapterId || catalog.hostVersion !== adapter.hostVersion) {
        codes.push(GATE_CODE.adapterMismatch)
      }
      if (catalog.contractHash !== adapter.contractHash) {
        codes.push(GATE_CODE.contractMismatch)
      }
      if (catalog.catalogProfile !== adapter.catalogProfile) {
        codes.push(GATE_CODE.catalogProfileMismatch)
      }
    }
  }

  const capabilities = adapter?.capabilities ?? NO_CAPABILITIES
  const requestedSkinId = (input.skinId ?? STOCK_ID).trim() === ''
    ? STOCK_ID
    : (input.skinId ?? STOCK_ID).trim()
  const stockRequested = requestedSkinId === STOCK_ID

  // 3. Resolve the requested skin inside the active profile's catalog. A
  // deleted/newer-build id is a closed gate, never silently downgraded to stock.
  let normalizedSkinId: string = STOCK_ID
  let activeLivery = undefined as ReturnType<typeof findLivery>
  const missingCapabilities: string[] = []
  if (codes.length === 0 && catalog !== undefined && !stockRequested) {
    const knownIds = new Set(catalog.liveries.map((livery) => livery.id))
    normalizedSkinId = normalizeSkinId(requestedSkinId, knownIds)
    activeLivery = findLivery(catalog, normalizedSkinId)
    if (activeLivery === undefined) codes.push(GATE_CODE.skinUnknown)
  }

  // 4. Required capabilities of the active livery, against this adapter's map.
  if (activeLivery !== undefined) {
    for (const id of activeLivery.requiredCapabilities) {
      if (capabilities[id]?.available !== true && !missingCapabilities.includes(id)) {
        missingCapabilities.push(id)
      }
    }
    for (const id of missingCapabilities) codes.push(`${CAPABILITY_MISSING_PREFIX}${id}`)
  }

  // 5. Read the compiled boot stylesheet — only once the identity checks are
  // clean, so an incompatible host never touches the render path at all. There
  // is no runtime rendering or hashing here: the compiler emitted the exact
  // bytes (`livery.css.*`) and their hash (`livery.cssHash`) per catalog
  // profile under its own gates, so the Host cannot drift from the Client.
  let bootCss = ''
  let bootHash = ''
  let renderError: string | null = null
  if (codes.length === 0 && !stockRequested && catalog !== undefined) {
    try {
      const render = input.renderBoot ?? renderBootCssFromCatalog
      const rendered = render(catalog, normalizedSkinId)
      if (typeof rendered.css !== 'string' || rendered.css === '') {
        throw new Error('no compiled boot CSS for the active livery')
      }
      if (typeof rendered.hash !== 'string' || rendered.hash === '') {
        throw new Error('no compiled boot CSS hash for the active livery')
      }
      // A raw-text element ends at the first `</style`; such CSS cannot be
      // injected byte-identically, so it fails closed instead of being mangled.
      if (/<\/style/i.test(rendered.css)) {
        throw new Error('boot CSS contains a closing style tag')
      }
      bootCss = rendered.css
      bootHash = rendered.hash
    } catch (error) {
      renderError = errorMessage(error)
      codes.push(GATE_CODE.renderFailed)
    }
  }

  // A gate pass is not the same as boot content: stock passes the gate and
  // contributes nothing, so `accepted` here means "rows will be injected".
  const gateAccepted = codes.length === 0
  const accepted = gateAccepted && !stockRequested && bootCss !== ''
  const activeSkinId = accepted && activeLivery !== undefined ? activeLivery.id : STOCK_ID

  const gate: GateResult = {
    accepted: gateAccepted,
    codes,
    profileKind: input.profileKind,
    compat,
    compatRange: DSH_COMPAT_RANGE,
    observedHostVersion,
    supportedHostVersions: SUPPORTED_HOST_VERSIONS,
    adapterId: adapter?.adapterId ?? '',
    hostVersion: adapter?.hostVersion ?? (observedHostVersion ?? ''),
    contractHash: adapter?.contractHash ?? '',
    catalogProfile: adapter?.catalogProfile ?? '',
    missingCapabilities,
    activeSkinId: requestedSkinId,
    renderError,
  }
  const diagnostics = buildDiagnostics(gate, capabilities)

  const payload: BootPayload = {
    pluginVersion: LIVERY_VERSION,
    adapterId: gate.adapterId,
    hostVersion: gate.hostVersion,
    contractHash: gate.contractHash,
    catalogProfile: gate.catalogProfile,
    profileKind: input.profileKind,
    compat,
    accepted,
    skinId: activeSkinId,
    cssHash: accepted ? bootHash : '',
    bootStyleId: BOOT_STYLE_ID,
    catalogUrl: CATALOG_ROUTE,
    entryId: ENTRY_ID,
    diagnostics,
  }

  const rows: IndexInjection[] = []
  if (accepted) {
    // Frozen row order: first-paint CSS first (head rows are spliced immediately
    // after `<head>`, before the shell's own stylesheet — later would lose the
    // cascade), then the handshake global, then the body attribute stamp.
    rows.push({ kind: 'html', placement: 'head', html: renderBootStyleHtml(bootCss, bootHash) })
    rows.push({ kind: 'global', name: BOOT_GLOBAL, value: payload })
    rows.push({
      kind: 'script',
      placement: 'body',
      text: renderBootAttributeScript(normalizedSkinId, bootHash),
    })
  }

  return {
    accepted,
    rows,
    payload,
    gate,
    adapter,
    compat,
    capabilities,
    diagnostics,
  }
}
