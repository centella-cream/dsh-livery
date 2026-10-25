/**
 * Build-time audits: token coverage, CSS safety and contrast.
 *
 * Multi-version rule (docs/implementation/multi-version.md §2): every audit is
 * relative to one explicit `StockSnapshot`. The required-token set, the direct
 * static bridge set and every documented inheritance/exemption is computed from
 * that snapshot's `referencedBy` data — never from a global token table and never
 * hardcoded — so a host that adds/removes a consumed token re-opens the gate.
 *
 * These are release gates, not reports: `compileCatalog` refuses to emit a
 * catalog profile when any of them fails, and `audit:*` CLI commands exit
 * non-zero. The artifacts written under `artifacts/liveries/<profileId>/` are the
 * machine-readable evidence for each gate.
 */
import postcss from 'postcss'
import type { ChildNode, Declaration, Rule } from 'postcss'
import type {
  CapabilityDegrade,
  CatalogProfileData,
  CompiledLivery,
  CompiledVariant,
  ContrastEntry,
  CssSafetyReport,
  LiveryCatalog,
  TokenCoverageReport,
} from '../core/types.js'
import { LIVERY_VERSION } from '../core/types.js'
import { summarizeContrast } from '../core/contrast.js'
import { DELIBERATELY_INHERITED_TOKENS } from '../core/derive.js'
import type { StockSnapshot } from '../generated/stock.js'
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from './previews.js'

/** Documented size budgets from IMPLEMENTATION_PLAN §18.8 (bytes, UTF-8). */
export const SIZE_BUDGETS = {
  /** First-frame boot CSS. */
  bootBytes: 12 * 1024,
  /** One livery's full rendered CSS (tokens + typography + layout). */
  liveryBytes: 12 * 1024,
} as const

/** Fixed z-index budget from IMPLEMENTATION_PLAN §18.3: no value above 20. */
export const Z_INDEX_BUDGET = 20

/** CSS cascade layer that must own every layout compensation rule. */
export const COMPAT_LAYER_NAME = 'dsh-livery.compat'

/** Version of the reasoning documented in `exemptions`; bump when re-reviewed. */
export const TOKEN_EXEMPTION_VERSION = 'multi-version-r1'

export interface CompileProblem {
  readonly code: string
  readonly path: string
  readonly message: string
}

/* ------------------------------------------------------------------ */
/* Token coverage (per stock snapshot)                                  */
/* ------------------------------------------------------------------ */

export interface TokenExemption {
  readonly token: string
  /** Why inheriting the frozen stock value is correct for this token. */
  readonly reason: string
  /** Adapter / contract generation the exemption was reviewed against. */
  readonly since: string
}

/**
 * Alpha-only aliases derive resolves to exactly the stock value: they are
 * black/white (or semantic-red) washes whose compositing is independent of the
 * palette ramp, so inheriting the stock alpha is the correct rendering. Token
 * names are version-independent (the 0.2.1 token contract keeps every name) and
 * entries are only consulted when a required token is uncovered.
 */
const ALPHA_INHERITANCE: readonly TokenExemption[] = [
  { token: '--dsw-alias-bg-mask-1', reason: 'pure black alpha scrim; composites correctly over every livery surface', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-bg-mask-drop', reason: 'drop-shadow scrim alpha; painted over the page surface, so the stock alpha is mode-correct', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-bg-skeleton', reason: 'black/white alpha skeleton wash with no hue; stock alpha is correct on every surface', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-border-inverted', reason: 'transparent/white alpha hairline used for contrast inversion; hue-free', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-border-l1', reason: 'black/white alpha hairline; compositing is hue-free, so the stock alpha ladder stays correct over the derived surfaces', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-border-l2', reason: 'black/white alpha hairline; compositing is hue-free, so the stock alpha ladder stays correct over the derived surfaces', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-border-l2-darkmode-thin', reason: 'dark-mode hairline thinning helper; alpha-only and mode-correct', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-border-l3', reason: 'black/white alpha hairline; compositing is hue-free, so the stock alpha ladder stays correct over the derived surfaces', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-border-l4', reason: 'black/white alpha hairline; compositing is hue-free, so the stock alpha ladder stays correct over the derived surfaces', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-interactive-bg-active', reason: 'press-state neutral wash at ~10% alpha; the stock tint stays below perceptual threshold over any livery surface and the contrast matrix does not assert it', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-interactive-bg-hover', reason: 'hover neutral wash at ~6% alpha; the stock tint stays below perceptual threshold over any livery surface', since: TOKEN_EXEMPTION_VERSION },
  { token: '--dsw-alias-interactive-bg-hover-danger', reason: 'danger hover wash at ~5% alpha; semantic red is preserved by design', since: TOKEN_EXEMPTION_VERSION },
]

/** Reasons for the core's deliberately-inherited tokens. */
const CORE_INHERITANCE_REASONS: Readonly<Record<string, string>> = {
  '--dsw-menu-surface-fill': 'public menu-material contract; the host composes it over its own backdrop and Livery must not re-author it',
  '--dsw-menu-backdrop-filter': 'public menu-material contract; host-owned backdrop filter',
  '--dsw-mask-blur': 'public menu-material blur helper; host-owned',
  '--dsw-focus-ring-color': 'host rebind seam: the focus rule keeps `var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary))`, so overriding the alias is correct and the token itself must stay undeclared',
  '--dsw-elevation-stroke-color': 'host rebind seam; the host rebinds it to alias border tokens per surface, so overriding aliases flows through',
  '--dsw-gradient-onboarding-violet-stops': 'onboarding brand art gradient; not re-themed by a palette livery',
  '--dsw-gradient-onboarding-blue-stops': 'onboarding brand art gradient; not re-themed by a palette livery',
  '--dsw-gradient-onboarding-cyan-stops': 'onboarding brand art gradient; not re-themed by a palette livery',
  '--dsw-alias-onboarding-accent': 'first-run overlay brand accent; inherits the host onboarding art until onboarding joins the preview matrix',
  '--dsw-alias-file-diff-added-bg': 'diff colours are semantic added/deleted hues and are intentionally not re-themed',
  '--dsw-alias-file-diff-added-gutter': 'diff colours are semantic added/deleted hues and are intentionally not re-themed',
  '--dsw-alias-file-diff-added-marker': 'diff colours are semantic added/deleted hues and are intentionally not re-themed',
  '--dsw-alias-file-diff-deleted-bg': 'diff colours are semantic added/deleted hues and are intentionally not re-themed',
  '--dsw-alias-file-diff-deleted-gutter': 'diff colours are semantic added/deleted hues and are intentionally not re-themed',
  '--dsw-alias-file-diff-deleted-marker': 'diff colours are semantic added/deleted hues and are intentionally not re-themed',
}

/** Token sets derived from one host-version stock snapshot. */
export interface StockTokenSets {
  readonly version: string
  readonly tokenContractHash: string
  /** Every `--dsw-*` declaration consumed by a shipped package. */
  readonly consumed: readonly string[]
  /** Consumed alias/specific/static tokens (the A-tier required set). */
  readonly required: readonly string[]
  /** Consumed alias/specific tokens (manifest-overridable, emitted when changed). */
  readonly aliasSpecific: readonly string[]
  /** Static steps painted directly by a package other than the theme package. */
  readonly directStatics: readonly string[]
  /** Alias/specific required tokens + direct statics: the shipped override set. */
  readonly emitted: ReadonlySet<string>
  /** Required host tokens a livery may deliberately inherit, with reasons. */
  readonly exemptions: ReadonlyMap<string, TokenExemption>
}

const TOKEN_SETS_CACHE = new Map<string, StockTokenSets>()

/** Compute (and cache) the token sets for one stock snapshot. */
export function tokenSetsFor(stock: StockSnapshot): StockTokenSets {
  const cacheKey = `${stock.version}|${stock.tokenContractHash}`
  const cached = TOKEN_SETS_CACHE.get(cacheKey)
  if (cached !== undefined) return cached

  const entries = Object.entries(stock.tokens)
  const consumed = entries
    .filter(([, declaration]) => (declaration.referencedBy?.length ?? 0) > 0)
    .map(([name]) => name)
    .sort()
  const required = consumed.filter((name) => /^--dsw-(alias|specific|static)-[a-z0-9-]+$/.test(name))
  const aliasSpecific = required.filter((name) => /^--dsw-(alias|specific)-/.test(name))
  const directStatics = entries
    .filter(
      ([name, declaration]) =>
        name.startsWith('--dsw-static-') &&
        (declaration.referencedBy ?? []).some((pkg) => pkg !== 'dsh-client-ui-theme'),
    )
    .map(([name]) => name)
    .sort()
  const emitted = new Set<string>([...aliasSpecific, ...directStatics])

  const exemptions = new Map<string, TokenExemption>()
  const addExemption = (exemption: TokenExemption): void => {
    if (!exemptions.has(exemption.token)) exemptions.set(exemption.token, exemption)
  }
  for (const token of DELIBERATELY_INHERITED_TOKENS) {
    addExemption({
      token,
      reason: CORE_INHERITANCE_REASONS[token] ?? 'documented deliberately-inherited token from src/core/derive.ts',
      since: TOKEN_EXEMPTION_VERSION,
    })
  }
  for (const exemption of ALPHA_INHERITANCE) addExemption(exemption)
  // Raw palette steps referenced only by the theme package: they are consumed by
  // the alias-layer definitions that the compiler replaces with concrete derived
  // values, so the stock step is unreachable in the painted UI.
  for (const token of required) {
    if (emitted.has(token) || exemptions.has(token)) continue
    if (!token.startsWith('--dsw-static-')) continue
    addExemption({
      token,
      reason:
        'theme-internal palette step: referenced only by the theme package while defining the alias layer; the compiler overrides those aliases with concrete derived values, so this stock step is never painted directly',
      since: TOKEN_EXEMPTION_VERSION,
    })
  }

  const sets: StockTokenSets = {
    version: stock.version,
    tokenContractHash: stock.tokenContractHash,
    consumed,
    required,
    aliasSpecific,
    directStatics,
    emitted,
    exemptions,
  }
  TOKEN_SETS_CACHE.set(cacheKey, sets)
  return sets
}

/** Compare a generated token set against the required host-token set. */
export function coverTokens(generated: Iterable<string>, sets: StockTokenSets): TokenCoverageReport {
  const present = new Set(generated)
  const covered: string[] = []
  const inherited: string[] = []
  const missing: string[] = []
  for (const token of sets.required) {
    if (present.has(token)) {
      covered.push(token)
      continue
    }
    if (sets.exemptions.has(token)) {
      inherited.push(token)
      continue
    }
    missing.push(token)
  }
  return { covered, inherited, missing }
}

/** Union of light + dark generated tokens for one compiled livery. */
export function liveryTokenNames(livery: Pick<CompiledLivery, 'light' | 'dark'>): string[] {
  return [...new Set([...Object.keys(livery.light.tokens), ...Object.keys(livery.dark.tokens)])].sort()
}

/** Aggregate coverage across every livery: a token only counts as covered when every livery emits it. */
export function coverCatalog(
  liveries: readonly Pick<CompiledLivery, 'light' | 'dark'>[],
  sets: StockTokenSets,
): TokenCoverageReport {
  const emitted = new Map<string, number>()
  for (const livery of liveries) {
    for (const token of liveryTokenNames(livery)) {
      emitted.set(token, (emitted.get(token) ?? 0) + 1)
    }
  }
  const covered: string[] = []
  const inherited: string[] = []
  const missing: string[] = []
  for (const token of sets.required) {
    const count = emitted.get(token) ?? 0
    if (count === liveries.length && count > 0) {
      covered.push(token)
      continue
    }
    if (sets.exemptions.has(token)) {
      inherited.push(token)
      continue
    }
    missing.push(token)
  }
  return { covered, inherited, missing }
}

/** Per-token exemption metadata for artifacts (only tokens actually exempted). */
export function exemptionDetails(tokens: readonly string[], sets: StockTokenSets): TokenExemption[] {
  return tokens.flatMap((token) => {
    const exemption = sets.exemptions.get(token)
    return exemption === undefined ? [] : [exemption]
  })
}

/** Derived tokens intentionally left at their stock value (non-blocking). */
export function inheritedUnconsumedTokens(derived: Iterable<string>, sets: StockTokenSets): string[] {
  const inherited: string[] = []
  for (const name of new Set(derived)) {
    if (!sets.emitted.has(name)) inherited.push(name)
  }
  return inherited.sort()
}

/**
 * Trim a derived variant down to the consumed-token emission policy (idempotent).
 * Tokens named in `explicitOverrides` are always kept: an author override that
 * passed manifest validation is intent, even when no shipped package consumes
 * the token yet ("explicit overrides win", interfaces.md §2).
 */
export function selectEmittedVariant(
  variant: CompiledVariant,
  sets: StockTokenSets,
  explicitOverrides: ReadonlySet<string> = new Set(),
): CompiledVariant {
  const tokens: Record<string, string> = {}
  for (const [name, value] of Object.entries(variant.tokens)) {
    if (sets.emitted.has(name) || explicitOverrides.has(name)) tokens[name] = value
  }
  return { seeds: variant.seeds, tokens, contrast: variant.contrast }
}

/* ------------------------------------------------------------------ */
/* CSS safety                                                          */
/* ------------------------------------------------------------------ */

export type CssAxis = 'tokens' | 'typography' | 'layout' | 'boot'

export interface CssFragment {
  readonly axis: CssAxis
  readonly css: string
}

export interface CssSafetyDetails {
  readonly important: number
  readonly hashSelectors: number
  readonly elementSelectors: readonly string[]
  readonly remoteUrls: number
  readonly unscopedTokens: number
  readonly unscopedTokenNames: readonly string[]
  readonly fixedZIndexes: readonly number[]
  readonly closeStyleSequences: number
  readonly unlayeredCompatRules: number
  readonly bytes: number
  readonly pass: boolean
  readonly violations: readonly string[]
}

export interface CssAuditResult {
  readonly report: CssSafetyReport
  readonly details: CssSafetyDetails
}

const SCOPED_BODY_SELECTOR = /^body\[data-dsh-livery(?:="[^"]*")?\](?=$|[\s:.[>+~#])/
const SCOPED_LANG_SELECTOR = /^:root:lang\([^)]*\)(?=$|[\s:.[>+~])/
const HASH_CLASS_PATTERNS: readonly RegExp[] = [
  /\._?[A-Za-z][A-Za-z0-9-]*_[A-Za-z0-9]{4,}(?:_[A-Za-z0-9]+)?/,
  /\.(?:css|sc|jsx)-[A-Za-z0-9_-]{4,}/,
  /\.[A-Za-z][A-Za-z0-9]*__[A-Za-z0-9]{3,}/,
]
const REMOTE_URL_PATTERN = /url\(\s*['"]?(?:https?:|\/\/)/gi
const AT_IMPORT_PATTERN = /@import\b/gi
const AT_FONT_FACE_PATTERN = /@font-face\b/gi
const CLOSE_STYLE_PATTERN = /<\/style/gi

function splitSelectorList(selector: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const char of selector) {
    if (char === '(') depth += 1
    if (char === ')') depth = Math.max(0, depth - 1)
    if (char === ',' && depth === 0) {
      out.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim().length > 0) out.push(current.trim())
  return out
}

function selectorAllowed(selector: string): boolean {
  return SCOPED_BODY_SELECTOR.test(selector) || SCOPED_LANG_SELECTOR.test(selector)
}

function isHashSelector(selector: string): boolean {
  return HASH_CLASS_PATTERNS.some((pattern) => pattern.test(selector))
}

function countMatches(input: string, pattern: RegExp): number {
  pattern.lastIndex = 0
  let count = 0
  while (pattern.exec(input) !== null) count += 1
  pattern.lastIndex = 0
  return count
}

interface CssContainerLike {
  readonly type: string
  readonly name?: string
  readonly params?: string
  readonly parent?: CssContainerLike
}

function isInsideCompatLayer(node: ChildNode): boolean {
  let parent = node.parent as unknown as CssContainerLike | undefined
  while (parent !== undefined) {
    if (parent.type === 'atrule' && parent.name === 'layer') {
      const params = parent.params ?? ''
      if (params.trim() === COMPAT_LAYER_NAME) return true
    }
    parent = parent.parent
  }
  return false
}

function byteLength(input: string): number {
  return Buffer.byteLength(input, 'utf8')
}

/**
 * Audit already-rendered CSS fragments. Pure and deterministic: the compiler calls
 * this per livery, `audit:css` calls it for every profile's catalog plus boot CSS.
 */
export function auditCssFragments(fragments: readonly CssFragment[]): CssAuditResult {
  let important = 0
  let hashSelectors = 0
  let remoteUrls = 0
  let unscopedTokens = 0
  let closeStyleSequences = 0
  const elementSelectors: string[] = []
  const unscopedTokenNames: string[] = []
  const fixedZIndexes: number[] = []
  let unlayeredCompatRules = 0

  for (const fragment of fragments) {
    const css = fragment.css
    if (css.trim().length === 0) continue
    const bytes = byteLength(css)
    remoteUrls += countMatches(css, REMOTE_URL_PATTERN)
    remoteUrls += countMatches(css, AT_IMPORT_PATTERN)
    remoteUrls += countMatches(css, AT_FONT_FACE_PATTERN)
    closeStyleSequences += countMatches(css, CLOSE_STYLE_PATTERN)

    let root
    try {
      root = postcss.parse(css, { from: undefined })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const violations = [`${fragment.axis}: CSS does not parse (${message})`]
      return {
        report: {
          important: important + 1,
          hashSelectors,
          elementSelectors: [...elementSelectors, `<unparsable ${fragment.axis} css>`],
          remoteUrls,
          unscopedTokens,
          fixedZIndexes,
          pass: false,
        },
        details: {
          important: important + 1,
          hashSelectors,
          elementSelectors: [...elementSelectors, `<unparsable ${fragment.axis} css>`],
          remoteUrls,
          unscopedTokens,
          unscopedTokenNames,
          fixedZIndexes,
          closeStyleSequences,
          unlayeredCompatRules,
          bytes,
          pass: false,
          violations,
        },
      }
    }

    root.walkRules((rule: Rule) => {
      for (const selector of splitSelectorList(rule.selector)) {
        if (isHashSelector(selector)) hashSelectors += 1
        if (!selectorAllowed(selector)) {
          elementSelectors.push(`${fragment.axis}: ${selector}`)
        }
      }
      if (fragment.axis === 'layout' && !isInsideCompatLayer(rule)) {
        unlayeredCompatRules += 1
      }
    })

    root.walkDecls((declaration: Declaration) => {
      if (declaration.important) important += 1
      if (declaration.prop.startsWith('--dsw-') || declaration.prop.startsWith('--dsh-')) {
        const parentRule = declaration.parent
        const selector = parentRule !== undefined && parentRule.type === 'rule' ? (parentRule as Rule).selector : ''
        const scoped = splitSelectorList(selector).some((part) => selectorAllowed(part))
        if (!scoped) {
          unscopedTokens += 1
          unscopedTokenNames.push(`${fragment.axis}: ${declaration.prop}`)
        }
      }
      if (declaration.prop === 'z-index') {
        const raw = declaration.value.trim()
        if (/^-?\d+$/.test(raw)) {
          fixedZIndexes.push(Number.parseInt(raw, 10))
        }
      }
    })
  }

  const zIndexOverBudget = fixedZIndexes.filter((value) => value > Z_INDEX_BUDGET || value < 0)
  const violations: string[] = []
  if (important > 0) violations.push(`${important} !important declaration(s)`)
  if (hashSelectors > 0) violations.push(`${hashSelectors} CSS-Modules hash selector(s)`)
  if (elementSelectors.length > 0) violations.push(`${elementSelectors.length} selector(s) outside body[data-dsh-livery] / :root:lang()`)
  if (remoteUrls > 0) violations.push(`${remoteUrls} remote URL / @import / @font-face occurrence(s)`)
  if (unscopedTokens > 0) violations.push(`${unscopedTokens} token declaration(s) outside the livery scope`)
  if (zIndexOverBudget.length > 0) violations.push(`${zIndexOverBudget.length} fixed z-index value(s) above ${Z_INDEX_BUDGET}`)
  if (closeStyleSequences > 0) violations.push(`${closeStyleSequences} </style> sequence(s)`)
  if (unlayeredCompatRules > 0) violations.push(`${unlayeredCompatRules} layout rule(s) outside @layer ${COMPAT_LAYER_NAME}`)

  const details: CssSafetyDetails = {
    important,
    hashSelectors,
    elementSelectors,
    remoteUrls,
    unscopedTokens,
    unscopedTokenNames,
    fixedZIndexes,
    closeStyleSequences,
    unlayeredCompatRules,
    bytes: fragments.reduce((total, fragment) => total + byteLength(fragment.css), 0),
    pass: violations.length === 0,
    violations,
  }
  return {
    report: {
      important,
      hashSelectors,
      elementSelectors,
      remoteUrls,
      unscopedTokens,
      fixedZIndexes,
      pass: details.pass,
    },
    details,
  }
}

export interface LiveryCssAudit {
  readonly safety: CssSafetyReport
  readonly details: CssSafetyDetails
  readonly bytes: { readonly tokens: number; readonly typography: number; readonly layout: number; readonly total: number }
  readonly overBudget: boolean
}

/** Audit one livery's rendered CSS (the same fragments host/client concatenate). */
export function auditLiveryCss(livery: Pick<CompiledLivery, 'id' | 'css'>): LiveryCssAudit {
  const { report, details } = auditCssFragments([
    { axis: 'tokens', css: livery.css.tokens },
    { axis: 'typography', css: livery.css.typography },
    { axis: 'layout', css: livery.css.layout },
  ])
  const bytes = {
    tokens: byteLength(livery.css.tokens),
    typography: byteLength(livery.css.typography),
    layout: byteLength(livery.css.layout),
    total: byteLength(livery.css.tokens) + byteLength(livery.css.typography) + byteLength(livery.css.layout),
  }
  return { safety: report, details, bytes, overBudget: bytes.total > SIZE_BUDGETS.liveryBytes }
}

/* ------------------------------------------------------------------ */
/* Contrast                                                             */
/* ------------------------------------------------------------------ */

export interface ModeContrastSummary {
  readonly entries: readonly ContrastEntry[]
  readonly total: number
  readonly failures: readonly ContrastEntry[]
  readonly smallestRatio: number
}

export interface LiveryContrastSummary {
  readonly id: string
  readonly light: ModeContrastSummary
  readonly dark: ModeContrastSummary
}

function modeContrast(entries: readonly ContrastEntry[]): ModeContrastSummary {
  const summary = summarizeContrast(entries)
  const smallest = entries.reduce((min, entry) => (entry.ratio < min ? entry.ratio : min), Number.POSITIVE_INFINITY)
  return {
    entries,
    total: summary.total,
    failures: entries.filter((entry) => !entry.pass),
    smallestRatio: Number.isFinite(smallest) ? Math.round(smallest * 100) / 100 : 0,
  }
}

/** Contrast summary for one compiled livery from its pre-audited variants. */
export function summarizeLiveryContrast(livery: Pick<CompiledLivery, 'id' | 'light' | 'dark'>): LiveryContrastSummary {
  return {
    id: livery.id,
    light: modeContrast(livery.light.contrast),
    dark: modeContrast(livery.dark.contrast),
  }
}

/* ------------------------------------------------------------------ */
/* Artifact context                                                     */
/* ------------------------------------------------------------------ */

export interface ArtifactContext {
  readonly profileId: string
  readonly sourceHash: string
  readonly compiledAt: string
  /** Exact host versions that share this profile, ascending. */
  readonly sourceAdapters: readonly string[]
  /** Adapter ids of the same group, ascending by host version. */
  readonly adapterIds: readonly string[]
  /** Contract hash of the group's representative adapter. */
  readonly contractHash: string
  /** Representative adapter identity/presentation facts. */
  readonly hostVersion: string
  readonly adapterId: string
  /** Token contract + coverage sets for this profile's stock snapshot. */
  readonly tokenSets: StockTokenSets
}

export const GENERATOR = 'dsh-livery/compiler'

/* ------------------------------------------------------------------ */
/* Token coverage artifact                                              */
/* ------------------------------------------------------------------ */

export interface TokenCoverageArtifact {
  readonly schemaVersion: 1
  readonly generator: string
  readonly profileId: string
  readonly sourceHash: string
  readonly compiledAt: string
  readonly sourceAdapters: readonly string[]
  readonly hostVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly tokenContractHash: string
  readonly exemptionVersion: string
  readonly required: readonly string[]
  readonly consumed: readonly string[]
  readonly counts: { readonly consumed: number; readonly required: number; readonly covered: number; readonly inherited: number; readonly missing: number }
  readonly exemptions: readonly TokenExemption[]
  readonly inherited: readonly string[]
  readonly missing: readonly string[]
  readonly perLivery: readonly {
    readonly id: string
    readonly covered: number
    readonly inherited: readonly string[]
    readonly missing: readonly string[]
  }[]
  readonly emissionPolicy: {
    readonly mode: 'consumed-only'
    readonly emitted: number
    readonly inheritedUnconsumed: readonly string[]
    readonly inheritedUnconsumedCount: number
  }
  readonly pass: boolean
}

/** Build artifacts/liveries/<profileId>/token-coverage.json content. */
export function buildTokenCoverageArtifact(
  liveries: readonly CompiledLivery[],
  context: ArtifactContext,
  derivedTokenNames: Iterable<string>,
): TokenCoverageArtifact {
  const sets = context.tokenSets
  const aggregate = coverCatalog(liveries, sets)
  const perLivery = liveries.map((livery) => {
    const coverage = coverTokens(liveryTokenNames(livery), sets)
    return {
      id: livery.id,
      covered: coverage.covered.length,
      inherited: coverage.inherited,
      missing: coverage.missing,
    }
  })
  const inheritedUnconsumed = inheritedUnconsumedTokens(derivedTokenNames, sets)
  return {
    schemaVersion: 1,
    generator: GENERATOR,
    profileId: context.profileId,
    sourceHash: context.sourceHash,
    compiledAt: context.compiledAt,
    sourceAdapters: context.sourceAdapters,
    hostVersion: context.hostVersion,
    adapterId: context.adapterId,
    contractHash: context.contractHash,
    tokenContractHash: sets.tokenContractHash,
    exemptionVersion: TOKEN_EXEMPTION_VERSION,
    required: sets.required,
    consumed: sets.consumed,
    counts: {
      consumed: sets.consumed.length,
      required: sets.required.length,
      covered: aggregate.covered.length,
      inherited: aggregate.inherited.length,
      missing: aggregate.missing.length,
    },
    exemptions: exemptionDetails(aggregate.inherited, sets),
    inherited: aggregate.inherited,
    missing: aggregate.missing,
    perLivery,
    emissionPolicy: {
      mode: 'consumed-only',
      emitted: sets.emitted.size,
      inheritedUnconsumed,
      inheritedUnconsumedCount: inheritedUnconsumed.length,
    },
    pass: aggregate.missing.length === 0,
  }
}

/* ------------------------------------------------------------------ */
/* CSS safety artifact                                                  */
/* ------------------------------------------------------------------ */

export interface CssSafetyArtifact {
  readonly schemaVersion: 1
  readonly generator: string
  readonly profileId: string
  readonly sourceHash: string
  readonly compiledAt: string
  readonly sourceAdapters: readonly string[]
  readonly hostVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly tokenContractHash: string
  readonly budgets: { readonly bootBytes: number; readonly liveryBytes: number; readonly zIndex: number }
  readonly liveries: readonly {
    readonly id: string
    /** Shipped (compact) bytes — this is what the budget gate measures. */
    readonly bytes: { readonly tokens: number; readonly typography: number; readonly layout: number; readonly total: number }
    /** Pretty-printed bytes, kept only as audit/debug evidence. */
    readonly prettyBytes: { readonly tokens: number; readonly typography: number; readonly layout: number; readonly total: number }
    readonly overBudget: boolean
    readonly safety: CssSafetyReport
    readonly details: CssSafetyDetails
  }[]
  readonly boot: readonly {
    readonly id: string
    readonly bytes: number
    readonly hash: string
    readonly overBudget: boolean
    readonly safety: CssSafetyReport
  }[]
  readonly pass: boolean
}

/** Build artifacts/liveries/<profileId>/css-safety.json content. */
export function buildCssSafetyArtifact(
  catalog: LiveryCatalog,
  bootCss: readonly { readonly id: string; readonly css: string; readonly hash: string }[],
  context: ArtifactContext,
  prettyCssBytes: ReadonlyMap<string, { readonly tokens: number; readonly typography: number; readonly layout: number; readonly total: number }> = new Map(),
): CssSafetyArtifact {
  const liveries = catalog.liveries.map((livery) => {
    const audit = auditLiveryCss(livery)
    const pretty = prettyCssBytes.get(livery.id)
    return {
      id: livery.id,
      bytes: audit.bytes,
      prettyBytes: pretty ?? audit.bytes,
      overBudget: audit.overBudget,
      safety: audit.safety,
      details: audit.details,
    }
  })
  const boot = bootCss.map((entry) => {
    const audit = auditCssFragments([{ axis: 'boot', css: entry.css }])
    const bytes = byteLength(entry.css)
    return {
      id: entry.id,
      bytes,
      hash: entry.hash,
      overBudget: bytes > SIZE_BUDGETS.bootBytes,
      safety: audit.report,
    }
  })
  const pass =
    liveries.every((entry) => entry.safety.pass && !entry.overBudget) &&
    boot.every((entry) => entry.safety.pass && !entry.overBudget)
  return {
    schemaVersion: 1,
    generator: GENERATOR,
    profileId: context.profileId,
    sourceHash: context.sourceHash,
    compiledAt: context.compiledAt,
    sourceAdapters: context.sourceAdapters,
    hostVersion: context.hostVersion,
    adapterId: context.adapterId,
    contractHash: context.contractHash,
    tokenContractHash: context.tokenSets.tokenContractHash,
    budgets: { bootBytes: SIZE_BUDGETS.bootBytes, liveryBytes: SIZE_BUDGETS.liveryBytes, zIndex: Z_INDEX_BUDGET },
    liveries,
    boot,
    pass,
  }
}

/* ------------------------------------------------------------------ */
/* Contrast artifact                                                    */
/* ------------------------------------------------------------------ */

export interface ContrastArtifact {
  readonly schemaVersion: 1
  readonly generator: string
  readonly profileId: string
  readonly sourceHash: string
  readonly compiledAt: string
  readonly sourceAdapters: readonly string[]
  readonly hostVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly tokenContractHash: string
  readonly summary: {
    readonly total: number
    readonly failures: number
    readonly byMode: { readonly light: { readonly total: number; readonly failures: number }; readonly dark: { readonly total: number; readonly failures: number } }
  }
  readonly liveries: readonly {
    readonly id: string
    readonly hash: string
    readonly light: { readonly total: number; readonly failures: number; readonly smallestRatio: number; readonly entries: readonly ContrastEntry[] }
    readonly dark: { readonly total: number; readonly failures: number; readonly smallestRatio: number; readonly entries: readonly ContrastEntry[] }
  }[]
  readonly failures: readonly { readonly id: string; readonly mode: 'light' | 'dark'; readonly entry: ContrastEntry }[]
  readonly pass: boolean
}

/** Build artifacts/liveries/<profileId>/contrast.json content. */
export function buildContrastArtifact(
  liveries: readonly CompiledLivery[],
  context: ArtifactContext,
): ContrastArtifact {
  const summaries = liveries.map(summarizeLiveryContrast)
  const failures: { id: string; mode: 'light' | 'dark'; entry: ContrastEntry }[] = []
  for (const summary of summaries) {
    for (const [mode, entries] of [
      ['light', summary.light.failures],
      ['dark', summary.dark.failures],
    ] as const) {
      for (const entry of entries) failures.push({ id: summary.id, mode, entry })
    }
  }
  const lightTotal = summaries.reduce((total, summary) => total + summary.light.total, 0)
  const darkTotal = summaries.reduce((total, summary) => total + summary.dark.total, 0)
  const lightFailures = summaries.reduce((total, summary) => total + summary.light.failures.length, 0)
  const darkFailures = summaries.reduce((total, summary) => total + summary.dark.failures.length, 0)
  return {
    schemaVersion: 1,
    generator: GENERATOR,
    profileId: context.profileId,
    sourceHash: context.sourceHash,
    compiledAt: context.compiledAt,
    sourceAdapters: context.sourceAdapters,
    hostVersion: context.hostVersion,
    adapterId: context.adapterId,
    contractHash: context.contractHash,
    tokenContractHash: context.tokenSets.tokenContractHash,
    summary: {
      total: lightTotal + darkTotal,
      failures: failures.length,
      byMode: {
        light: { total: lightTotal, failures: lightFailures },
        dark: { total: darkTotal, failures: darkFailures },
      },
    },
    liveries: summaries.map((summary, index) => {
      const livery = liveries[index]
      return {
        id: summary.id,
        hash: livery?.hash ?? '',
        light: {
          total: summary.light.total,
          failures: summary.light.failures.length,
          smallestRatio: summary.light.smallestRatio,
          entries: summary.light.entries,
        },
        dark: {
          total: summary.dark.total,
          failures: summary.dark.failures.length,
          smallestRatio: summary.dark.smallestRatio,
          entries: summary.dark.entries,
        },
      }
    }),
    failures,
    pass: failures.length === 0,
  }
}

/* ------------------------------------------------------------------ */
/* Catalog report artifact                                              */
/* ------------------------------------------------------------------ */

export interface LiveryReportEntry {
  readonly id: string
  readonly name: { readonly 'zh-CN': string; readonly 'en-US': string }
  readonly description: { readonly 'zh-CN': string; readonly 'en-US': string }
  readonly tags: readonly string[]
  readonly order: number
  readonly hash: string
  readonly cssHash: string
  readonly layout: {
    readonly declared: unknown
    readonly effective: unknown
    readonly degraded: readonly CapabilityDegrade[]
  }
  readonly capabilities: {
    readonly required: readonly string[]
    readonly optional: readonly string[]
  }
  readonly variants: {
    readonly light: { readonly tokens: number; readonly contrastTotal: number; readonly contrastFailures: number; readonly smallestRatio: number }
    readonly dark: { readonly tokens: number; readonly contrastTotal: number; readonly contrastFailures: number; readonly smallestRatio: number }
  }
  readonly css: { readonly tokens: number; readonly typography: number; readonly layout: number; readonly total: number }
  readonly contrast: { readonly total: number; readonly failures: number }
  readonly tokenCoverage: { readonly covered: number; readonly inherited: number; readonly missing: readonly string[] }
  readonly cssSafety: CssSafetyReport
  readonly degraded: readonly CapabilityDegrade[]
}

export interface AdapterEntry {
  readonly hostVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly tokenContractHash: string
  readonly sourceKind: string
  readonly nodeRange: string
  readonly catalogProfile: string
}

export interface CatalogReport {
  readonly schemaVersion: 1
  readonly generator: string
  readonly profileId: string
  readonly sourceHash: string
  readonly compiledAt: string
  readonly hostVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly tokenContractHash: string
  readonly compilerVersion: string
  readonly sourceAdapters: readonly string[]
  readonly adapters: readonly AdapterEntry[]
  readonly counts: {
    readonly liveries: number
    readonly previews: number
    readonly contrastEntries: number
    readonly contrastFailures: number
    readonly tokenConsumed: number
    readonly tokenRequired: number
    readonly tokenCovered: number
    readonly tokenInherited: number
    readonly tokenMissing: number
    readonly cssBytes: number
    readonly maxLiveryCssBytes: number
    readonly maxBootCssBytes: number
  }
  readonly gates: {
    readonly validation: boolean
    readonly contrast: boolean
    readonly tokenCoverage: boolean
    readonly cssSafety: boolean
    readonly sizeBudget: boolean
    readonly capabilities: boolean
    readonly adapterRenderIdentity: boolean
  }
  readonly previews: {
    readonly directory: string
    readonly count: number
    readonly width: number
    readonly height: number
    readonly files: readonly string[]
  }
  readonly emissionPolicy: {
    readonly mode: 'consumed-only'
    readonly inheritedUnconsumed: readonly string[]
    readonly inheritedUnconsumedCount: number
  }
  readonly liveries: readonly LiveryReportEntry[]
}

export interface CatalogReportOptions {
  readonly catalog: LiveryCatalog
  readonly context: ArtifactContext
  readonly declaredLayouts: ReadonlyMap<string, CompiledLivery['layout']>
  readonly previewFiles: readonly string[]
  readonly previewDirectory: string
  readonly bootCss: readonly { readonly id: string; readonly css: string }[]
  readonly maxLiveryCssBytes: number
  readonly adapterEntries: readonly AdapterEntry[]
  readonly derivedTokenNames: Iterable<string>
  readonly adapterRenderIdentity: boolean
}

/** Build artifacts/liveries/<profileId>/report.json content. */
export function buildCatalogReport(options: CatalogReportOptions): CatalogReport {
  const { catalog, context, declaredLayouts, previewFiles, bootCss } = options
  const sets = context.tokenSets
  const coverage = coverCatalog(catalog.liveries, sets)
  const entries: LiveryReportEntry[] = catalog.liveries.map((livery) => {
    const css = auditLiveryCss(livery)
    const lightContrast = modeContrast(livery.light.contrast)
    const darkContrast = modeContrast(livery.dark.contrast)
    const liveryCoverage = coverTokens(liveryTokenNames(livery), sets)
    return {
      id: livery.id,
      name: livery.meta.name,
      description: livery.meta.description,
      tags: livery.meta.tags,
      order: livery.meta.order,
      hash: livery.hash,
      cssHash: livery.cssHash,
      layout: {
        declared: declaredLayouts.get(livery.id) ?? livery.layout,
        effective: livery.layout,
        degraded: livery.audit.degraded,
      },
      capabilities: {
        required: livery.requiredCapabilities,
        optional: livery.optionalCapabilities,
      },
      variants: {
        light: {
          tokens: Object.keys(livery.light.tokens).length,
          contrastTotal: lightContrast.total,
          contrastFailures: lightContrast.failures.length,
          smallestRatio: lightContrast.smallestRatio,
        },
        dark: {
          tokens: Object.keys(livery.dark.tokens).length,
          contrastTotal: darkContrast.total,
          contrastFailures: darkContrast.failures.length,
          smallestRatio: darkContrast.smallestRatio,
        },
      },
      css: { ...css.bytes },
      contrast: { total: lightContrast.total + darkContrast.total, failures: lightContrast.failures.length + darkContrast.failures.length },
      tokenCoverage: {
        covered: liveryCoverage.covered.length,
        inherited: liveryCoverage.inherited.length,
        missing: liveryCoverage.missing,
      },
      cssSafety: css.safety,
      degraded: livery.audit.degraded,
    }
  })
  const contrastFailures = entries.reduce((total, entry) => total + entry.contrast.failures, 0)
  const contrastEntries = entries.reduce((total, entry) => total + entry.contrast.total, 0)
  const cssBytes = entries.reduce((total, entry) => total + entry.css.total, 0)
  const maxLiveryCssBytes = Math.max(0, ...entries.map((entry) => entry.css.total))
  const maxBootCssBytes = Math.max(0, ...bootCss.map((entry) => Buffer.byteLength(entry.css, 'utf8')))
  const inheritedUnconsumed = inheritedUnconsumedTokens(options.derivedTokenNames, sets)
  return {
    schemaVersion: 1,
    generator: GENERATOR,
    profileId: context.profileId,
    sourceHash: context.sourceHash,
    compiledAt: context.compiledAt,
    hostVersion: context.hostVersion,
    adapterId: context.adapterId,
    contractHash: context.contractHash,
    tokenContractHash: sets.tokenContractHash,
    compilerVersion: LIVERY_VERSION,
    sourceAdapters: context.sourceAdapters,
    adapters: options.adapterEntries,
    counts: {
      liveries: entries.length,
      previews: previewFiles.length,
      contrastEntries,
      contrastFailures,
      tokenConsumed: sets.consumed.length,
      tokenRequired: sets.required.length,
      tokenCovered: coverage.covered.length,
      tokenInherited: coverage.inherited.length,
      tokenMissing: coverage.missing.length,
      cssBytes,
      maxLiveryCssBytes,
      maxBootCssBytes,
    },
    gates: {
      validation: true,
      contrast: contrastFailures === 0,
      tokenCoverage: coverage.missing.length === 0,
      cssSafety: entries.every((entry) => entry.cssSafety.pass),
      sizeBudget: maxLiveryCssBytes <= SIZE_BUDGETS.liveryBytes && maxBootCssBytes <= SIZE_BUDGETS.bootBytes,
      capabilities: entries.every((entry) => entry.degraded.every((degrade) => degrade.fallback !== 'none')),
      adapterRenderIdentity: options.adapterRenderIdentity,
    },
    previews: {
      directory: options.previewDirectory,
      count: previewFiles.length,
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
      files: previewFiles,
    },
    emissionPolicy: {
      mode: 'consumed-only',
      inheritedUnconsumed,
      inheritedUnconsumedCount: inheritedUnconsumed.length,
    },
    liveries: entries,
  }
}

/* ------------------------------------------------------------------ */
/* Cross-profile summary artifact                                       */
/* ------------------------------------------------------------------ */

export interface SummaryProfileEntry {
  readonly profileId: string
  readonly compiledAt: string
  readonly sourceHash: string
  readonly sourceAdapters: readonly string[]
  readonly adapterIds: readonly string[]
  readonly hostVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly tokenContractHash: string
  readonly counts: CatalogReport['counts']
  readonly gates: CatalogReport['gates']
  readonly previews: { readonly directory: string; readonly count: number }
  readonly css: {
    readonly maxLiveryBytes: number
    readonly maxBootBytes: number
    readonly budgetBytes: number
  }
  readonly tokenCoverage: {
    readonly consumed: number
    readonly required: number
    readonly covered: number
    readonly inherited: number
    readonly missing: number
    readonly pass: boolean
  }
  readonly contrast: { readonly total: number; readonly failures: number; readonly pass: boolean }
  readonly cssSafety: { readonly pass: boolean }
}

export interface SummaryAdapterEntry extends AdapterEntry {
  readonly liveries: number
}

export interface SummaryArtifact {
  readonly schemaVersion: 1
  readonly generator: string
  readonly profiles: readonly SummaryProfileEntry[]
  readonly adapters: readonly SummaryAdapterEntry[]
  readonly counts: { readonly profiles: number; readonly adapters: number; readonly liveries: number; readonly previews: number }
  readonly pass: boolean
}

export interface SummaryProfileSource {
  readonly profile: CatalogProfileData
  readonly report: CatalogReport
  readonly contrast: ContrastArtifact
  readonly tokenCoverage: TokenCoverageArtifact
  readonly cssSafety: CssSafetyArtifact
  readonly adapters: readonly AdapterEntry[]
  readonly previewDirectory: string
}

/** Build artifacts/liveries/summary.json content (adapter → profile mapping). */
export function buildSummaryArtifact(sources: readonly SummaryProfileSource[]): SummaryArtifact {
  const profiles: SummaryProfileEntry[] = sources.map((source) => ({
    profileId: source.profile.profileId,
    compiledAt: source.profile.compiledAt,
    sourceHash: source.profile.sourceHash,
    sourceAdapters: source.profile.sourceAdapters,
    adapterIds: source.adapters.map((adapter) => adapter.adapterId),
    hostVersion: source.report.hostVersion,
    adapterId: source.report.adapterId,
    contractHash: source.report.contractHash,
    tokenContractHash: source.report.tokenContractHash,
    counts: source.report.counts,
    gates: source.report.gates,
    previews: { directory: source.previewDirectory, count: source.report.previews.count },
    css: {
      maxLiveryBytes: source.report.counts.maxLiveryCssBytes,
      maxBootBytes: source.report.counts.maxBootCssBytes,
      budgetBytes: SIZE_BUDGETS.liveryBytes,
    },
    tokenCoverage: {
      consumed: source.tokenCoverage.counts.consumed,
      required: source.tokenCoverage.counts.required,
      covered: source.tokenCoverage.counts.covered,
      inherited: source.tokenCoverage.counts.inherited,
      missing: source.tokenCoverage.counts.missing,
      pass: source.tokenCoverage.pass,
    },
    contrast: { total: source.contrast.summary.total, failures: source.contrast.summary.failures, pass: source.contrast.pass },
    cssSafety: { pass: source.cssSafety.pass },
  }))
  const adapters: SummaryAdapterEntry[] = sources.flatMap((source) =>
    source.adapters.map((adapter) => ({ ...adapter, liveries: source.profile.liveries.length })),
  )
  const pass =
    profiles.every(
      (profile) =>
        profile.tokenCoverage.pass &&
        profile.contrast.pass &&
        profile.cssSafety.pass &&
        profile.gates.validation &&
        profile.gates.sizeBudget &&
        profile.gates.adapterRenderIdentity,
    ) && adapters.length > 0
  return {
    schemaVersion: 1,
    generator: GENERATOR,
    profiles,
    adapters,
    counts: {
      profiles: profiles.length,
      adapters: adapters.length,
      liveries: profiles.reduce((total, profile) => total + profile.counts.liveries, 0),
      previews: profiles.reduce((total, profile) => total + profile.previews.count, 0),
    },
    pass,
  }
}
