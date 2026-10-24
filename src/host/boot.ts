/**
 * First-frame boot: the pre-loader gate and the index rows it contributes.
 *
 * This is the only Host code that runs before the Client exists, so it carries
 * the plugin's fail-closed rule: unless the observed host identity matches the
 * certified contract *exactly* and the active livery renders, it contributes
 * zero rows. A closed gate leaves the page on the host's own stock appearance —
 * never a half-injected palette, never a partial row table that a later render
 * might finish.
 *
 * Row shapes follow `@deepseek-ai/dsh-host-webserver`'s `IndexInjection` union:
 * `global` (the handshake payload), `html` (a head `<style>` with an id the
 * Client can adopt), `script` (body attribute stamping). All content is escaped
 * so no livery id or CSS comment can close its host element early.
 */

import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import {
  ADAPTER_ID,
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
  type CompiledLivery,
  type LiveryCatalog,
} from '../core/types.js'
import { findLivery, hashCss, renderBootCss, renderStyleText } from '../core/index.js'
import type { CatalogMeta } from '../generated/liveries.js'
import { CONTRACT_HASH, type ContractFacts } from '../generated/contract.js'
import { buildCatalog } from './catalog.js'
import { normalizeSkinId } from './config.js'
import {
  CAPABILITY_MISSING_PREFIX,
  GATE_CODE,
  buildDiagnostics,
} from './diagnostics.js'

/** Deployment profile the Host is running in. */
export type ProfileKind = 'web' | 'desktop'

/**
 * One gate evaluation, independent of the payload and rows it produced.
 *
 * The diagnostic layer consumes this shape (rather than the whole boot state)
 * so it can explain a closed gate without depending on the render layer.
 */
export interface GateResult {
  /** True only when every identity check passed and the boot CSS rendered. */
  readonly accepted: boolean
  /** Stable codes for every failed check; empty when accepted. */
  readonly codes: readonly string[]
  readonly profileKind: ProfileKind
  /** Version reported by the live harness, or `null` when it cannot be read. */
  readonly observedHostVersion: string | null
  readonly expectedHostVersion: string
  readonly adapterId: string
  readonly expectedAdapterId: string
  readonly contractHash: string
  readonly expectedContractHash: string
  /** Required capabilities of the active livery that this host lacks. */
  readonly missingCapabilities: readonly string[]
  /** Requested skin id before resolution (`stock` for an absent config). */
  readonly activeSkinId: string
  /** Render failure message, or `null` when rendering succeeded / was skipped. */
  readonly renderError: string | null
}

/** Everything one index-inject evaluation produces. */
export interface BootState {
  readonly accepted: boolean
  /** Rows to append, in final order. Empty whenever the gate closed or skin is stock. */
  readonly rows: readonly IndexInjection[]
  readonly payload: BootPayload
  readonly gate: GateResult
  /** Same list as `payload.diagnostics`, exposed for direct assertions. */
  readonly diagnostics: readonly string[]
}

/** Inputs one pre-loader gate evaluation needs. All data, no services. */
export interface BootStateInput {
  /** Raw configured skin id (already read from the volatile config). */
  readonly skinId: string | undefined
  readonly capabilities: CapabilityMap
  readonly liveries: readonly CompiledLivery[]
  readonly catalogMeta: CatalogMeta
  readonly contractFacts: ContractFacts
  readonly profileKind: ProfileKind
  /** Runtime DSH version, or `null` when the harness could not report one. */
  readonly observedHostVersion: string | null
  /** Adapter id this build was compiled against; defaults to the frozen constant. */
  readonly observedAdapterId?: string
  /** Contract hash this build was compiled against; defaults to the frozen constant. */
  readonly observedContractHash?: string
  /**
   * Render seam for tests. Production always uses the core renderer; the
   * default is intentionally not configurable from the plugin config.
   */
  readonly renderBoot?: (catalog: LiveryCatalog, skinId: string) => { css: string; hash: string }
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
 * styles, and the content hash so the Client can prove the sheet it would
 * render is the one already on screen.
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
    // Attribute stamping is cosmetic ordering, not a correctness boundary.
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
 * Evaluate the pre-loader gate and, when it accepts, build the boot rows.
 *
 * Acceptance requires all of:
 * 1. the observed DSH version equals the certified contract version exactly
 *    (an unreadable version is a closed gate, not a guess);
 * 2. the adapter id and contract hash this build carries and the generated
 *    catalog carries both equal the certified contract facts;
 * 3. a requested livery resolves through `findLivery`;
 * 4. every capability the livery declares as required is available;
 * 5. the boot CSS renders without throwing.
 *
 * A requested `stock` skin is always accepted when the identity checks pass,
 * and contributes no rows at all — the stock look is the absence of Livery.
 * @param input - host identity, catalog sources, profile and live config value.
 * @returns gate outcome, payload and rows (rows are empty on any failure).
 */
export function computeBootState(input: BootStateInput): BootState {
  const facts = input.contractFacts
  const observedAdapterId = input.observedAdapterId ?? ADAPTER_ID
  const observedContractHash = input.observedContractHash ?? CONTRACT_HASH
  const catalog = buildCatalog({
    liveries: input.liveries,
    catalogMeta: input.catalogMeta,
    capabilities: input.capabilities,
    contractFacts: facts,
  })

  const codes: string[] = []

  // 1. Identity: the live host version must match the certified one exactly.
  if (input.observedHostVersion === null || input.observedHostVersion.trim() === '') {
    codes.push(GATE_CODE.versionUnknown)
  } else if (input.observedHostVersion !== facts.dshVersion) {
    codes.push(GATE_CODE.versionMismatch)
  }

  // 2. Adapter and contract hashes: this build, and the generated catalog, must
  // both describe the same certified contract as the frozen facts.
  if (observedAdapterId !== facts.adapterId || input.catalogMeta.adapterId !== facts.adapterId) {
    codes.push(GATE_CODE.adapterMismatch)
  }
  if (observedContractHash !== facts.contractHash
    || input.catalogMeta.contractHash !== facts.contractHash) {
    codes.push(GATE_CODE.contractMismatch)
  }

  // 3. Resolve the requested skin. `stock` is a valid, accepted non-livery.
  const requestedSkinId = (input.skinId ?? STOCK_ID).trim()
  const knownIds = new Set(input.liveries.map((livery) => livery.id))
  const normalizedSkinId = normalizeSkinId(requestedSkinId, knownIds)
  const stockRequested = normalizedSkinId === STOCK_ID
  if (!stockRequested && findLivery(catalog, normalizedSkinId) === undefined) {
    codes.push(GATE_CODE.skinUnknown)
  }
  const activeLivery = stockRequested ? undefined : findLivery(catalog, normalizedSkinId)

  // 4. Required capabilities of the active livery.
  const missingCapabilities: string[] = []
  if (activeLivery !== undefined) {
    for (const id of activeLivery.requiredCapabilities) {
      if (input.capabilities[id]?.available !== true && !missingCapabilities.includes(id)) {
        missingCapabilities.push(id)
      }
    }
    for (const id of missingCapabilities) codes.push(`${CAPABILITY_MISSING_PREFIX}${id}`)
  }

  // 5. Render the boot stylesheet — only once the identity checks are clean, so
  // an incompatible host never even executes the renderer against its catalog.
  //
  // FROZEN: the injected bytes and their hash must be exactly the stylesheet the
  // Client will independently produce from the catalog, i.e.
  // `renderBootCss(catalog, id).css === renderStyleText(livery, capabilities)`
  // and `.hash === hashCss(css)`. The boot element is adopted verbatim by the
  // Client, so any drift here (a wrapper, a banner, a newline) is a first-frame
  // correctness bug, not cosmetic — it closes the gate instead.
  let bootCss = ''
  let bootHash = ''
  let renderError: string | null = null
  if (codes.length === 0 && activeLivery !== undefined) {
    try {
      const render = input.renderBoot ?? renderBootCss
      const rendered = render(catalog, activeLivery.id)
      if (typeof rendered.css !== 'string' || rendered.css.trim() === '') {
        throw new Error('renderer produced empty boot CSS')
      }
      if (typeof rendered.hash !== 'string' || rendered.hash.trim() === '') {
        throw new Error('renderer produced no boot CSS hash')
      }
      // A raw-text element ends at the first `</style`; such CSS cannot be
      // injected byte-identically, so it fails closed instead of being mangled.
      if (/<\/style/i.test(rendered.css)) {
        throw new Error('boot CSS contains a closing style tag')
      }
      if (input.renderBoot === undefined) {
        const expectedCss = renderStyleText(activeLivery, input.capabilities)
        if (rendered.css !== expectedCss) {
          throw new Error('boot CSS drifted from renderStyleText (frozen hash equality)')
        }
        if (rendered.hash !== hashCss(expectedCss)) {
          throw new Error('boot CSS hash drifted from hashCss (frozen hash equality)')
        }
      }
      bootCss = rendered.css
      bootHash = rendered.hash
    } catch (error) {
      renderError = errorMessage(error)
      codes.push(GATE_CODE.renderFailed)
    }
  }

  const accepted = codes.length === 0
  const activeSkinId = accepted && activeLivery !== undefined ? activeLivery.id : STOCK_ID

  const gate: GateResult = {
    accepted,
    codes,
    profileKind: input.profileKind,
    observedHostVersion: input.observedHostVersion,
    expectedHostVersion: facts.dshVersion,
    adapterId: observedAdapterId,
    expectedAdapterId: facts.adapterId,
    contractHash: observedContractHash,
    expectedContractHash: facts.contractHash,
    missingCapabilities,
    activeSkinId: requestedSkinId === '' ? STOCK_ID : requestedSkinId,
    renderError,
  }
  const diagnostics = buildDiagnostics(gate, input.capabilities, facts)

  const payload: BootPayload = {
    pluginVersion: LIVERY_VERSION,
    adapterId: ADAPTER_ID,
    hostVersion: facts.dshVersion,
    contractHash: facts.contractHash,
    profileKind: input.profileKind,
    accepted,
    skinId: activeSkinId,
    cssHash: accepted ? bootHash : '',
    bootStyleId: BOOT_STYLE_ID,
    catalogUrl: CATALOG_ROUTE,
    entryId: ENTRY_ID,
    diagnostics,
  }

  const rows: IndexInjection[] = []
  if (accepted && activeLivery !== undefined) {
    rows.push({ kind: 'global', name: BOOT_GLOBAL, value: payload })
    rows.push({ kind: 'html', placement: 'head', html: renderBootStyleHtml(bootCss, bootHash) })
    rows.push({
      kind: 'script',
      placement: 'body',
      text: renderBootAttributeScript(activeLivery.id, bootHash),
    })
  }

  return { accepted, rows, payload, gate, diagnostics }
}
