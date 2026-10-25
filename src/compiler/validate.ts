/**
 * Livery manifest validation.
 *
 * Two layers, both mandatory:
 *
 * 1. Strict JSON Schema (draft 2020-12) from `schemas/livery.schema.json`,
 *    compiled by Ajv in `strict: true` mode. The schema is the single source of
 *    truth for the manifest shape: unknown keys anywhere, remote resources, CSS
 *    strings, font faces and unregistered registry ids are all rejected here.
 * 2. Semantic checks a JSON Schema cannot express: catalog-wide id/order
 *    uniqueness, livery-dir ↔ id agreement, registry membership, known and
 *    available capabilities, token whitelisting, safe CSS colour overrides and
 *    seed parseability.
 *
 * Everything returns a structured `Diagnostic[]`; nothing throws for invalid input.
 */
import Ajv2020 from 'ajv/dist/2020.js'
import type { ErrorObject, ValidateFunction } from 'ajv'
import { parseColor } from '../core/color.js'
import { FONT_STACKS, METRICS, TAGS, SURFACE_STYLE_DEFINITIONS } from '../core/registry.js'
import type { CapabilityMap, LiveryManifest, LocalizedText } from '../core/types.js'
import { CAP } from '../core/types.js'
import { DEFAULT_ADAPTER } from '../generated/contract.js'
import { stockForVersion } from '../generated/stock.js'
import type { StockSnapshot } from '../generated/stock.js'
import manifestSchema from '../../schemas/livery.schema.json'

/** One machine-readable validation problem. `path` is `<source file>#<JSON pointer>`. */
export interface Diagnostic {
  readonly code: string
  readonly path: string
  readonly message: string
}

/** A manifest document as read from disk (or supplied by a test / importer). */
export interface ManifestSource {
  /** Path relative to the repository root, e.g. `liveries/fjord/manifest.json`. */
  readonly file: string
  /** Raw JSON value; shape is validated, never trusted. */
  readonly raw: unknown
}

export interface ManifestValidationOptions {
  /**
   * Capability availability for the host build being compiled (defaults to the
   * newest certified adapter). The compiler always passes the representative
   * adapter's map explicitly.
   */
  readonly capabilities?: CapabilityMap
  /**
   * Stock token snapshot whose token inventory defines the manifest's allowed
   * token overrides (defaults to the newest certified adapter's host version).
   */
  readonly stock?: StockSnapshot
}

export interface CatalogValidation {
  readonly manifests: readonly LiveryManifest[]
  readonly diagnostics: readonly Diagnostic[]
  readonly ok: boolean
}

const KNOWN_TAGS: ReadonlySet<string> = new Set(TAGS.map((tag) => tag.id))
const KNOWN_FONTS: ReadonlySet<string> = new Set(Object.keys(FONT_STACKS))
const KNOWN_METRICS: ReadonlySet<string> = new Set(Object.keys(METRICS))
const KNOWN_SURFACE_STYLES: ReadonlySet<string> = new Set(Object.keys(SURFACE_STYLE_DEFINITIONS))
const KNOWN_CAPABILITIES: ReadonlySet<string> = new Set(Object.values(CAP) as string[])

const TOKEN_WHITELIST_CACHE = new Map<string, ReadonlySet<string>>()

/**
 * Explicit token overrides may only target host-declared semantic tokens. Raw
 * static palette steps and private `--dsh-*` hooks are not part of the whitelist.
 * Derived from the exact stock snapshot, so a host token rename narrows it.
 */
export function tokenWhitelist(stock: StockSnapshot): ReadonlySet<string> {
  const cacheKey = `${stock.version}|${stock.tokenContractHash}`
  const cached = TOKEN_WHITELIST_CACHE.get(cacheKey)
  if (cached !== undefined) return cached
  const whitelist: ReadonlySet<string> = new Set(
    Object.keys(stock.tokens).filter((name) => /^--dsw-(alias|specific)-[a-z0-9-]+$/.test(name)),
  )
  TOKEN_WHITELIST_CACHE.set(cacheKey, whitelist)
  return whitelist
}

/** Default stock snapshot used when a caller supplies none (newest certified host). */
export function defaultStockSnapshot(): StockSnapshot {
  const stock = stockForVersion(DEFAULT_ADAPTER.hostVersion)
  if (stock === undefined) {
    throw new Error(`compiler bug: no stock snapshot for DEFAULT_ADAPTER ${DEFAULT_ADAPTER.hostVersion}`)
  }
  return stock
}

const UNSAFE_VALUE_PATTERNS: readonly { readonly pattern: RegExp; readonly reason: string }[] = [
  { pattern: /[;{}<>]/, reason: 'contains rule, declaration or markup delimiters' },
  { pattern: /\/\*|\*\//, reason: 'contains a CSS comment' },
  { pattern: /\burl\s*\(/i, reason: 'references a URL resource' },
  { pattern: /@(import|font-face|supports|layer|media|charset|namespace|keyframes)\b/i, reason: 'contains an at-rule' },
  { pattern: /expression\s*\(/i, reason: 'contains a legacy script expression' },
  { pattern: /\b(javascript|vbscript|data):/i, reason: 'contains a non-CSS URL scheme' },
  { pattern: /\/\//, reason: 'contains a protocol-relative URL' },
  { pattern: /!\s*important/i, reason: 'contains !important' },
  { pattern: /\\/, reason: 'contains CSS escapes' },
  { pattern: /--dsh-/i, reason: 'references a non-token host variable' },
]

/** Returns a human reason when a token override value is not a safe colour expression. */
export function unsafeCssValueReason(value: string): string | null {
  if (value.trim().length === 0) return 'is empty'
  if (value.length > 200) return 'is longer than the 200 character budget'
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return 'contains control characters'
  for (const { pattern, reason } of UNSAFE_VALUE_PATTERNS) {
    if (pattern.test(value)) return reason
  }
  return null
}

let cachedValidator: ValidateFunction | null = null

/** Compile (once) the strict draft 2020-12 schema. Throws only if the schema itself is broken. */
export function getManifestValidator(): ValidateFunction {
  if (cachedValidator) return cachedValidator
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    allowUnionTypes: false,
    validateFormats: false,
  })
  cachedValidator = ajv.compile(manifestSchema as object)
  return cachedValidator
}

function pointerOf(error: ErrorObject): string {
  const base = error.instancePath.length > 0 ? error.instancePath : '/'
  if (error.keyword === 'additionalProperties') {
    const extra = (error.params as { additionalProperty?: string }).additionalProperty
    return extra === undefined ? base : `${base === '/' ? '' : base}/${extra}`
  }
  if (error.keyword === 'required') {
    const missing = (error.params as { missingProperty?: string }).missingProperty
    return missing === undefined ? base : `${base === '/' ? '' : base}/${missing}`
  }
  if (error.keyword === 'propertyNames') {
    return base
  }
  return base
}

function schemaDiagnostics(source: ManifestSource, errors: readonly ErrorObject[] | null | undefined): Diagnostic[] {
  const out: Diagnostic[] = []
  for (const error of errors ?? []) {
    const code =
      error.keyword === 'additionalProperties' || error.keyword === 'propertyNames'
        ? 'manifest.unknown-property'
        : `schema.${error.keyword}`
    out.push({
      code,
      path: `${source.file}#${pointerOf(error)}`,
      message: error.message === undefined ? `violates ${error.keyword}` : error.message,
    })
  }
  return out
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function localizedValue(text: unknown, locale: keyof LocalizedText): string | null {
  if (!isRecord(text)) return null
  const value = text[locale]
  return typeof value === 'string' ? value : null
}

/** Full validation of one manifest document (schema + per-manifest semantics). */
export function validateManifest(
  source: ManifestSource,
  options: ManifestValidationOptions = {},
): Diagnostic[] {
  const validator = getManifestValidator()
  const valid = validator(source.raw)
  if (!valid) return schemaDiagnostics(source, validator.errors)

  const capabilities = options.capabilities ?? DEFAULT_ADAPTER.capabilities
  const stock = options.stock ?? defaultStockSnapshot()
  const whitelist = tokenWhitelist(stock)
  const manifest = source.raw as LiveryManifest
  const diagnostics: Diagnostic[] = []
  const file = source.file

  // The on-disk folder name is part of the public identity (preview filenames and
  // import paths derive from it), so `<dir>/manifest.json` must agree with `id`.
  const directory = /^liveries\/([^/]+)\/manifest\.json$/.exec(file)
  if (directory !== null && directory[1] !== manifest.id) {
    diagnostics.push({
      code: 'id.directory-mismatch',
      path: `${file}#/id`,
      message: `id "${manifest.id}" does not match directory "${directory[1] ?? ''}"`,
    })
  }

  for (const locale of ['zh-CN', 'en-US'] as const) {
    const name = localizedValue(manifest.meta.name, locale)
    if (name === null || name.trim().length === 0) {
      diagnostics.push({
        code: 'meta.locale.empty',
        path: `${file}#/meta/name/${locale}`,
        message: `name.${locale} must be a non-empty string`,
      })
    }
    const description = localizedValue(manifest.meta.description, locale)
    if (description === null || description.trim().length === 0) {
      diagnostics.push({
        code: 'meta.locale.empty',
        path: `${file}#/meta/description/${locale}`,
        message: `description.${locale} must be a non-empty string`,
      })
    }
  }

  for (const tag of manifest.meta.tags) {
    if (!KNOWN_TAGS.has(tag)) {
      diagnostics.push({
        code: 'tags.unknown',
        path: `${file}#/meta/tags`,
        message: `unknown tag id "${tag}"`,
      })
    }
  }

  const typography: readonly [string, unknown][] = [
    ['ui', manifest.typography.ui],
    ['content', manifest.typography.content],
  ]
  for (const [role, record] of typography) {
    if (!isRecord(record)) continue
    for (const locale of ['zh-CN', 'en-US'] as const) {
      const id = record[locale]
      if (typeof id === 'string' && !KNOWN_FONTS.has(id)) {
        diagnostics.push({
          code: 'font.unknown',
          path: `${file}#/typography/${role}/${locale}`,
          message: `unknown font id "${id}"`,
        })
      }
    }
  }
  if (!KNOWN_FONTS.has(manifest.typography.code)) {
    diagnostics.push({
      code: 'font.unknown',
      path: `${file}#/typography/code`,
      message: `unknown font id "${manifest.typography.code}"`,
    })
  }
  for (const locale of ['zh-CN', 'en-US'] as const) {
    const id = manifest.typography.metrics[locale]
    if (!KNOWN_METRICS.has(id)) {
      diagnostics.push({
        code: 'metrics.unknown',
        path: `${file}#/typography/metrics/${locale}`,
        message: `unknown metrics id "${id}"`,
      })
    }
  }

  const styleId = manifest.layout.surfaceStyle
  if (!KNOWN_SURFACE_STYLES.has(styleId)) {
    diagnostics.push({
      code: 'surface-style.unknown',
      path: `${file}#/layout/surfaceStyle`,
      message: `unknown surface style id "${styleId}"`,
    })
  }

  const required = new Set(manifest.compat.requiredCapabilities)
  const optional = new Set(manifest.compat.optionalCapabilities)
  for (const [kind, ids] of [
    ['requiredCapabilities', manifest.compat.requiredCapabilities],
    ['optionalCapabilities', manifest.compat.optionalCapabilities],
  ] as const) {
    for (const id of ids) {
      if (!KNOWN_CAPABILITIES.has(id)) {
        diagnostics.push({
          code: 'capability.unknown',
          path: `${file}#/compat/${kind}`,
          message: `unknown capability id "${id}"`,
        })
        continue
      }
      if (kind === 'requiredCapabilities') {
        const availability = capabilities[id]
        if (availability !== undefined && !availability.available) {
          diagnostics.push({
            code: 'capability.required-unavailable',
            path: `${file}#/compat/${kind}`,
            message: `required capability "${id}" is unavailable in the certified host contract; move it to optionalCapabilities so the livery degrades instead of disappearing`,
          })
        }
      }
    }
  }
  for (const id of required) {
    if (optional.has(id)) {
      diagnostics.push({
        code: 'capability.overlap',
        path: `${file}#/compat`,
        message: `capability "${id}" is declared both required and optional`,
      })
    }
  }

  for (const mode of ['light', 'dark'] as const) {
    const variant = manifest.variants[mode]
    for (const seed of ['accent', 'secondary', 'surface', 'text'] as const) {
      const value = variant.seeds[seed]
      try {
        parseColor(value)
      } catch {
        diagnostics.push({
          code: 'seed.invalid',
          path: `${file}#/variants/${mode}/seeds/${seed}`,
          message: `seed "${value}" is not a parseable colour`,
        })
      }
    }

    const tokens = variant.tokens
    if (tokens === undefined) continue
    for (const [name, value] of Object.entries(tokens)) {
      if (!whitelist.has(name)) {
        diagnostics.push({
          code: 'token.not-whitelisted',
          path: `${file}#/variants/${mode}/tokens/${name}`,
          message: `"${name}" is not a host-declared alias/specific token; overrides are restricted to --dsw-alias-* and --dsw-specific-*`,
        })
      }
      if (typeof value !== 'string') continue
      const unsafe = unsafeCssValueReason(value)
      if (unsafe !== null) {
        diagnostics.push({
          code: 'token.unsafe-value',
          path: `${file}#/variants/${mode}/tokens/${name}`,
          message: `value ${unsafe}`,
        })
      }
    }
  }

  return diagnostics
}

/**
 * Validate a whole catalog. Per-manifest diagnostics are reported first, then
 * cross-manifest constraints (unique ids, unique gallery order).
 */
export function validateCatalog(
  sources: readonly ManifestSource[],
  options: ManifestValidationOptions = {},
): CatalogValidation {
  const diagnostics: Diagnostic[] = []
  const manifests: LiveryManifest[] = []

  if (sources.length === 0) {
    return {
      manifests: [],
      diagnostics: [{ code: 'catalog.empty', path: 'liveries/', message: 'no livery manifests found' }],
      ok: false,
    }
  }

  const seenIds = new Map<string, string>()
  const seenOrders = new Map<number, string>()

  for (const source of sources) {
    const manifestDiagnostics = validateManifest(source, options)
    diagnostics.push(...manifestDiagnostics)
    if (manifestDiagnostics.length > 0) continue

    const manifest = source.raw as LiveryManifest
    manifests.push(manifest)

    const previousIdFile = seenIds.get(manifest.id)
    if (previousIdFile !== undefined) {
      diagnostics.push({
        code: 'id.duplicate',
        path: `${source.file}#/id`,
        message: `id "${manifest.id}" is already used by ${previousIdFile}`,
      })
    } else {
      seenIds.set(manifest.id, source.file)
    }

    const previousOrderFile = seenOrders.get(manifest.meta.order)
    if (previousOrderFile !== undefined) {
      diagnostics.push({
        code: 'order.duplicate',
        path: `${source.file}#/meta/order`,
        message: `order ${manifest.meta.order} is already used by ${previousOrderFile}`,
      })
    } else {
      seenOrders.set(manifest.meta.order, source.file)
    }
  }

  return { manifests, diagnostics, ok: diagnostics.length === 0 }
}

/** Thrown by the compiler when manifests do not validate. Carries every diagnostic. */
export class ManifestValidationError extends Error {
  readonly diagnostics: readonly Diagnostic[]

  constructor(diagnostics: readonly Diagnostic[]) {
    const first = diagnostics[0]
    super(`livery manifest validation failed (${diagnostics.length} problem${diagnostics.length === 1 ? '' : 's'})${first === undefined ? '' : `: ${first.path} ${first.message}`}`)
    this.name = 'ManifestValidationError'
    this.diagnostics = diagnostics
  }
}
