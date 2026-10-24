/**
 * Deterministic fixtures for the Host unit tests.
 *
 * Everything here is pure data matching the frozen types in `src/core/types.ts`
 * and the generated contract facts — no filesystem, no ambient process state,
 * so a test failure names a host rule rather than a machine difference.
 */

import type {
  CatalogMeta,
} from '../../src/generated/liveries.js'
import type {
  CapabilityMap,
  CompiledLivery,
  CompiledVariant,
  ContractCapabilityFacts,
  LiveryAuditReport,
  MetricsDefinition,
  ResolvedTypography,
} from '../../src/core/types.js'
import { CONTRACT_FACTS, HOST_CAPABILITIES } from '../../src/generated/contract.js'
import type { BootStateInput } from '../../src/host/boot.js'

/** Typography metrics fixture used by the compiled-livery fixture. */
function metrics(id: MetricsDefinition['id'], lineHeight: number): MetricsDefinition {
  return { id, lineHeight, note: 'fixture' }
}

/** One contract-complete compiled livery. Overrides patch the fields a test cares about. */
export function makeLivery(overrides: Partial<CompiledLivery> = {}): CompiledLivery {
  const variant: CompiledVariant = {
    seeds: {
      accent: '#3366ff',
      secondary: '#22aa88',
      surface: '#ffffff',
      text: '#111111',
    },
    tokens: {
      '--dsw-alias-bg': '#ffffff',
      '--dsw-alias-text': '#111111',
    },
    contrast: [],
  }
  const typography: ResolvedTypography = {
    ui: { 'zh-CN': 'system-ui, sans-serif', 'en-US': 'system-ui, sans-serif' },
    content: { 'zh-CN': 'system-ui, sans-serif', 'en-US': 'system-ui, sans-serif' },
    code: 'ui-monospace, monospace',
    metrics: {
      'zh-CN': metrics('cjk-comfortable', 1.75),
      'en-US': metrics('latin-default', 1.6),
    },
  }
  const audit: LiveryAuditReport = {
    contrast: [],
    contrastFailures: 0,
    tokenCoverage: { covered: [], inherited: [], missing: [] },
    cssSafety: {
      important: 0,
      hashSelectors: 0,
      elementSelectors: [],
      remoteUrls: 0,
      unscopedTokens: 0,
      fixedZIndexes: [],
      pass: true,
    },
    degraded: [],
  }
  return {
    id: 'ivory-slate',
    meta: {
      name: { 'zh-CN': '象牙石板', 'en-US': 'Ivory Slate' },
      description: { 'zh-CN': '测试', 'en-US': 'Fixture' },
      tags: [],
      order: 1,
    },
    typography,
    layout: {
      density: 'host',
      conversationWidth: 'host',
      messageFlow: 'stock',
      surfaceStyle: 'solid',
    },
    requiredCapabilities: ['theme-css'],
    optionalCapabilities: [],
    light: variant,
    dark: variant,
    css: { tokens: '', typography: '', layout: '' },
    hash: 'sha256:fixture-livery',
    audit,
    ...overrides,
  }
}

/** Catalog metadata that agrees with the certified contract facts. */
export function makeCatalogMeta(overrides: Partial<CatalogMeta> = {}): CatalogMeta {
  return {
    compiledAt: '2026-01-01T00:00:00.000Z',
    sourceHash: 'sha256:fixture-source',
    contractHash: CONTRACT_FACTS.contractHash,
    adapterId: CONTRACT_FACTS.adapterId,
    hostVersion: CONTRACT_FACTS.dshVersion,
    capabilities: HOST_CAPABILITIES,
    ...overrides,
  }
}

/** Boot CSS renderer stub: deterministic bytes and hash, no core dependency. */
export const FIXTURE_BOOT_CSS = 'body[data-dsh-livery="ivory-slate"]{--dsw-alias-bg:#ffffff}'
export const FIXTURE_BOOT_HASH = 'sha256:0123456789abcdef0123456789abcdef'

/**
 * A full boot input that the gate must accept, before per-test overrides.
 * `renderBoot` is stubbed so gate/payload/row tests do not depend on the core
 * renderer being present; the real renderer is exercised by integration tests.
 */
export function makeBootInput(overrides: Partial<BootStateInput> = {}): BootStateInput {
  return {
    skinId: 'ivory-slate',
    capabilities: HOST_CAPABILITIES,
    liveries: [makeLivery()],
    catalogMeta: makeCatalogMeta(),
    contractFacts: CONTRACT_FACTS,
    profileKind: 'web',
    observedHostVersion: CONTRACT_FACTS.dshVersion,
    renderBoot: () => ({ css: FIXTURE_BOOT_CSS, hash: FIXTURE_BOOT_HASH }),
    ...overrides,
  }
}

/** A capability map where the supplied ids are unavailable, everything else from the host facts. */
export function capabilitiesWithout(ids: readonly string[]): CapabilityMap {
  const next: Record<string, CapabilityMap[string]> = { ...HOST_CAPABILITIES }
  for (const id of ids) {
    const fact = next[id]
    next[id] = {
      id,
      available: false,
      provenance: fact?.provenance ?? 'absent',
      required: fact?.required ?? false,
      detail: fact?.detail ?? 'fixture: unavailable',
    }
  }
  return next
}

/** Contract capability facts fixture (used by diagnostics tests). */
export function contractCapabilityFacts(): ContractCapabilityFacts {
  const facts: Record<string, ContractCapabilityFacts[string]> = {}
  for (const [id, fact] of Object.entries(HOST_CAPABILITIES)) {
    facts[id] = {
      id,
      available: fact.available,
      provenance: fact.provenance,
      required: fact.required,
      detail: fact.detail,
    }
  }
  return facts
}

/** Recording fake for `node:http`'s ServerResponse, enough for route handlers. */
export class FakeResponse {
  statusCode = 0
  headers: Record<string, string> = {}
  body: string | Uint8Array | undefined
  headersSent = false
  writableEnded = false
  #ended = false

  /**
   * Record a status line and headers.
   * @param status - HTTP status code.
   * @param headers - response headers.
   * @returns this, for chaining.
   */
  writeHead(status: number, headers: Record<string, string> = {}): this {
    this.statusCode = status
    this.headers = { ...headers }
    this.headersSent = true
    return this
  }

  /**
   * Record the body and finish the response.
   * @param body - optional response body.
   * @returns this, for chaining.
   */
  end(body?: string | Uint8Array): this {
    if (body !== undefined) this.body = body
    this.headersSent = true
    this.writableEnded = true
    this.#ended = true
    return this
  }

  /** Whether `end` was called (body may be empty, e.g. HEAD/404). */
  get ended(): boolean {
    return this.#ended
  }
}

/**
 * Fake incoming request carrying just the properties route handlers read.
 * @param method - HTTP method.
 * @param url - request target.
 * @returns a request-shaped object.
 */
export function fakeRequest(method: string, url: string): { method: string; url: string } {
  return { method, url }
}

