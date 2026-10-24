/**
 * Build-time audits: token coverage, CSS safety and contrast.
 *
 * These are release gates, not reports: `compileCatalog` refuses to emit a
 * catalog when any of them fails, and `audit:*` CLI commands exit non-zero. The
 * artifacts written under `artifacts/liveries/` are the machine-readable evidence
 * for each gate.
 *
 * CSS safety is enforced with a real postcss parse (never regex over the whole
 * sheet): every rendered fragment is parsed, selectors are checked against the
 * only allowed scopes (`body[data-dsh-livery]`, `:root:lang()`), token
 * declarations must live under those scopes, `!important` is forbidden, CSS
 * Modules hash class selectors are forbidden, remote URLs are forbidden, and
 * `@layer dsh-livery.compat` is the only home for layout compensation rules.
 */
import postcss from 'postcss'
import type { ChildNode, Declaration, Rule } from 'postcss'
import type {
  CapabilityDegrade,
  CompiledLivery,
  CompiledVariant,
  ContrastEntry,
  CssSafetyReport,
  LiveryCatalog,
  TokenCoverageReport,
} from '../core/types.js'
import { summarizeContrast } from '../core/contrast.js'
import { DELIBERATELY_INHERITED_TOKENS } from '../core/derive.js'
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from './previews.js'
import { STOCK_TOKENS } from '../generated/stock.js'

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

export interface CompileProblem {
  readonly code: string
  readonly path: string
  readonly message: string
}

/* ------------------------------------------------------------------ */
/* Token coverage                                                       */
/* ------------------------------------------------------------------ */

export interface TokenExemption {
  readonly token: string
  /** Why inheriting the frozen stock value is correct for this token. */
  readonly reason: string
  /** Adapter / contract generation the exemption was reviewed against. */
  readonly since: string
}

/**
 * Versioned exemption list: required host tokens this compiler intentionally does
 * not override. Each entry documents *why* stock inheritance is the correct
 * rendering (semantic hue preservation, host rebind contracts, alpha compositing
 * helpers, decorative gradients), so a future contract bump can re-review them.
 *
 * `DELIBERATELY_INHERITED_TOKENS` from `src/core/derive.ts` is the authoritative
 * core list; the compiler adds the alpha-only aliases that derive resolves to the
 * same stock alpha and therefore omits from the emitted override map.
 */
const EXEMPTION_SINCE = 'dsh-0.2.0-rc.2-r1'

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

/**
 * Alpha-only aliases derive resolves to exactly the stock value: they are
 * black/white (or semantic-red) washes whose compositing is independent of the
 * palette ramp, so inheriting the stock alpha is the correct rendering.
 */
const ALPHA_INHERITANCE: readonly TokenExemption[] = [
  {
    token: '--dsw-alias-bg-mask-1',
    reason: 'pure black alpha scrim; composites correctly over every livery surface',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-bg-mask-drop',
    reason: 'drop-shadow scrim alpha; the host paints it over the page surface, so the stock alpha is mode-correct',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-bg-skeleton',
    reason: 'black/white alpha skeleton wash with no hue; stock alpha is correct on every surface',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-border-inverted',
    reason: 'transparent/white alpha hairline used for contrast inversion; hue-free',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-border-l1',
    reason: 'black/white alpha hairline; compositing is hue-free, so the stock alpha ladder stays correct over the derived surfaces',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-border-l2',
    reason: 'black/white alpha hairline; compositing is hue-free, so the stock alpha ladder stays correct over the derived surfaces',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-border-l2-darkmode-thin',
    reason: 'dark-mode hairline thinning helper; alpha-only and mode-correct',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-border-l3',
    reason: 'black/white alpha hairline; compositing is hue-free, so the stock alpha ladder stays correct over the derived surfaces',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-border-l4',
    reason: 'black/white alpha hairline; compositing is hue-free, so the stock alpha ladder stays correct over the derived surfaces',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-interactive-bg-active',
    reason: 'press-state neutral wash at ~10% alpha; the stock tint stays below perceptual threshold over any livery surface and the contrast matrix does not assert it',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-interactive-bg-hover',
    reason: 'hover neutral wash at ~6% alpha; the stock tint stays below perceptual threshold over any livery surface',
    since: EXEMPTION_SINCE,
  },
  {
    token: '--dsw-alias-interactive-bg-hover-danger',
    reason: 'danger hover wash at ~5% alpha; semantic red is preserved by design',
    since: EXEMPTION_SINCE,
  },
]

function buildTokenExemptions(): TokenExemption[] {
  const exemptions: TokenExemption[] = []
  const seen = new Set<string>()
  for (const token of DELIBERATELY_INHERITED_TOKENS) {
    if (seen.has(token)) continue
    seen.add(token)
    exemptions.push({
      token,
      reason: CORE_INHERITANCE_REASONS[token] ?? 'documented deliberately-inherited token from src/core/derive.ts',
      since: EXEMPTION_SINCE,
    })
  }
  for (const exemption of ALPHA_INHERITANCE) {
    if (seen.has(exemption.token)) continue
    seen.add(exemption.token)
    exemptions.push(exemption)
  }
  // Raw palette steps referenced only by the theme package: they are consumed by
  // the alias-layer definitions that this compiler replaces with concrete derived
  // values, so the stock step is unreachable in the painted UI.
  for (const token of REQUIRED_TOKENS) {
    if (EMITTED_TOKEN_NAMES.has(token) || seen.has(token)) continue
    if (!token.startsWith('--dsw-static-')) continue
    seen.add(token)
    exemptions.push({
      token,
      reason:
        'theme-internal palette step: referenced only by the theme package while defining the alias layer; the compiler overrides those aliases with concrete derived values, so this stock step is never painted directly',
      since: EXEMPTION_SINCE,
    })
  }
  return exemptions
}

/** Version string recorded in artifacts so exemption reviews are traceable. */
export const TOKEN_EXEMPTION_VERSION = 'dsh-0.2.0-rc.2-r1'

/**
 * A-tier required set (IMPLEMENTATION_PLAN §8.2, Lead pin): every
 * `--dsw-alias-*` / `--dsw-specific-*` / `--dsw-static-*` declaration that at
 * least one shipped DSH package consumes, read from the frozen contract snapshot
 * at compile time (never hardcoded), sorted for determinism.
 */
export const REQUIRED_TOKENS: readonly string[] = Object.entries(STOCK_TOKENS)
  .filter(
    ([name, declaration]) =>
      /^--dsw-(alias|specific|static)-[a-z0-9-]+$/.test(name) &&
      (declaration.referencedBy?.length ?? 0) > 0,
  )
  .map(([name]) => name)
  .sort()

/**
 * Raw palette steps consumed *directly* by a shipped package other than the
 * theme package itself. The theme package references every static step while
 * defining the alias layer; those references are already covered by overriding
 * the aliases with concrete values. These 13 steps are different: components read
 * them straight from CSS, so stock values would leave visible mixed-colour
 * surfaces. They are therefore part of the emitted token overlay.
 */
export const DIRECT_CONSUMED_STATIC_TOKENS: readonly string[] = Object.entries(STOCK_TOKENS)
  .filter(
    ([name, declaration]) =>
      name.startsWith('--dsw-static-') &&
      (declaration.referencedBy ?? []).some((pkg) => pkg !== 'dsh-client-ui-theme'),
  )
  .map(([name]) => name)
  .sort()

/**
 * Emission policy (IMPLEMENTATION_PLAN §8.2): the shipped override set is exactly
 * the consumed set — required alias/specific tokens plus directly-consumed static
 * steps. Everything else is inherited from stock and reported as a non-blocking
 * diagnostic (`inheritedUnconsumed`).
 */
export const TOKEN_EMISSION_POLICY = 'consumed-only' as const

/**
 * Emission set (Lead-approved size-budget policy, §18.8): the required
 * alias/specific tokens plus the static steps that are painted directly. Static
 * steps referenced *only* by the theme package are internal to the alias layer
 * definitions the compiler already replaces with concrete values, so emitting
 * them would duplicate ~4.7KB of CSS without changing a single painted pixel;
 * they are documented as inherited exemptions instead.
 */
export const EMITTED_TOKEN_NAMES: ReadonlySet<string> = new Set([
  ...REQUIRED_TOKENS.filter((name) => /^--dsw-(alias|specific)-/.test(name)),
  ...DIRECT_CONSUMED_STATIC_TOKENS,
])

/** The versioned exemption list itself (deterministically ordered). */
export const TOKEN_EXEMPTIONS: readonly TokenExemption[] = buildTokenExemptions()

const EXEMPTION_BY_TOKEN: ReadonlyMap<string, TokenExemption> = new Map(
  TOKEN_EXEMPTIONS.map((exemption) => [exemption.token, exemption]),
)


/** Trim a derived variant down to the consumed-token emission policy. */
export function selectEmittedVariant(variant: CompiledVariant): CompiledVariant {
  const tokens: Record<string, string> = {}
  for (const [name, value] of Object.entries(variant.tokens)) {
    if (EMITTED_TOKEN_NAMES.has(name)) tokens[name] = value
  }
  return { seeds: variant.seeds, tokens, contrast: variant.contrast }
}

/** Derived tokens intentionally left at their stock value (non-blocking). */
export function inheritedUnconsumedTokens(derived: Iterable<string>): string[] {
  const inherited: string[] = []
  for (const name of new Set(derived)) {
    if (!EMITTED_TOKEN_NAMES.has(name)) inherited.push(name)
  }
  return inherited.sort()
}

/** Alias/specific tokens referenced by shipped packages but not emitted (should be empty). */
export function unconsumedAliasTokens(derived: Iterable<string>): string[] {
  return inheritedUnconsumedTokens(derived).filter((name) => REQUIRED_TOKENS.includes(name))
}

/** Compare a generated token set against the required host-token set. */
export function coverTokens(generated: Iterable<string>): TokenCoverageReport {
  const present = new Set(generated)
  const covered: string[] = []
  const inherited: string[] = []
  const missing: string[] = []
  for (const token of REQUIRED_TOKENS) {
    if (present.has(token)) {
      covered.push(token)
      continue
    }
    if (EXEMPTION_BY_TOKEN.has(token)) {
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
export function coverCatalog(liveries: readonly Pick<CompiledLivery, 'light' | 'dark'>[]): TokenCoverageReport {
  const emitted = new Map<string, number>()
  for (const livery of liveries) {
    for (const token of liveryTokenNames(livery)) {
      emitted.set(token, (emitted.get(token) ?? 0) + 1)
    }
  }
  const covered: string[] = []
  const inherited: string[] = []
  const missing: string[] = []
  for (const token of REQUIRED_TOKENS) {
    const count = emitted.get(token) ?? 0
    if (count === liveries.length && count > 0) {
      covered.push(token)
      continue
    }
    if (EXEMPTION_BY_TOKEN.has(token)) {
      inherited.push(token)
      continue
    }
    missing.push(token)
  }
  return { covered, inherited, missing }
}

/** Per-token exemption metadata for artifacts (only tokens actually exempted). */
export function exemptionDetails(tokens: readonly string[]): TokenExemption[] {
  return tokens.flatMap((token) => {
    const exemption = EXEMPTION_BY_TOKEN.get(token)
    return exemption === undefined ? [] : [exemption]
  })
}

/* ------------------------------------------------------------------ */
/* CSS safety                                                           */
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
  // A comma inside :not()/:is()/:where() must not split the list; rules emitted by
  // Livery never contain those, but be conservative for host-injected text.
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
 * this per livery, `audit:css` calls it for the whole generated catalog plus boot
 * CSS for every livery.
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
          violations: [`${fragment.axis}: CSS does not parse (${message})`],
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
/* Artifacts                                                            */
/* ------------------------------------------------------------------ */

export interface ArtifactContext {
  readonly sourceHash: string
  readonly contractHash: string
  readonly compiledAt: string
  readonly adapterId: string
  readonly hostVersion: string
}

export interface TokenCoverageArtifact {
  readonly schemaVersion: 1
  readonly generator: string
  readonly sourceHash: string
  readonly contractHash: string
  readonly compiledAt: string
  readonly adapterId: string
  readonly hostVersion: string
  readonly exemptionVersion: string
  readonly required: readonly string[]
  readonly counts: { readonly required: number; readonly covered: number; readonly inherited: number; readonly missing: number }
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
    readonly mode: typeof TOKEN_EMISSION_POLICY
    readonly emitted: number
    readonly inheritedUnconsumed: readonly string[]
    readonly inheritedUnconsumedCount: number
  }
  readonly pass: boolean
}

const GENERATOR = 'dsh-livery/compiler'

/** Build artifacts/liveries/token-coverage.json content. */
export function buildTokenCoverageArtifact(
  liveries: readonly CompiledLivery[],
  context: ArtifactContext,
  derivedTokenNames: Iterable<string> = [],
): TokenCoverageArtifact {
  const aggregate = coverCatalog(liveries)
  const perLivery = liveries.map((livery) => {
    const coverage = coverTokens(liveryTokenNames(livery))
    return {
      id: livery.id,
      covered: coverage.covered.length,
      inherited: coverage.inherited,
      missing: coverage.missing,
    }
  })
  return {
    schemaVersion: 1,
    generator: GENERATOR,
    sourceHash: context.sourceHash,
    contractHash: context.contractHash,
    compiledAt: context.compiledAt,
    adapterId: context.adapterId,
    hostVersion: context.hostVersion,
    exemptionVersion: TOKEN_EXEMPTION_VERSION,
    required: REQUIRED_TOKENS,
    counts: {
      required: REQUIRED_TOKENS.length,
      covered: aggregate.covered.length,
      inherited: aggregate.inherited.length,
      missing: aggregate.missing.length,
    },
    exemptions: exemptionDetails(aggregate.inherited),
    inherited: aggregate.inherited,
    missing: aggregate.missing,
    perLivery,
    emissionPolicy: {
      mode: TOKEN_EMISSION_POLICY,
      emitted: EMITTED_TOKEN_NAMES.size,
      inheritedUnconsumed: inheritedUnconsumedTokens(derivedTokenNames),
      inheritedUnconsumedCount: inheritedUnconsumedTokens(derivedTokenNames).length,
    },
    pass: aggregate.missing.length === 0,
  }
}

export interface CssSafetyArtifact {
  readonly schemaVersion: 1
  readonly generator: string
  readonly sourceHash: string
  readonly contractHash: string
  readonly compiledAt: string
  readonly adapterId: string
  readonly hostVersion: string
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

/** Build artifacts/liveries/css-safety.json content from the compiled catalog. */
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
    sourceHash: context.sourceHash,
    contractHash: context.contractHash,
    compiledAt: context.compiledAt,
    adapterId: context.adapterId,
    hostVersion: context.hostVersion,
    budgets: { bootBytes: SIZE_BUDGETS.bootBytes, liveryBytes: SIZE_BUDGETS.liveryBytes, zIndex: Z_INDEX_BUDGET },
    liveries,
    boot,
    pass,
  }
}

export interface ContrastArtifact {
  readonly schemaVersion: 1
  readonly generator: string
  readonly sourceHash: string
  readonly contractHash: string
  readonly compiledAt: string
  readonly adapterId: string
  readonly hostVersion: string
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

/** Build artifacts/liveries/contrast.json content. */
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
    sourceHash: context.sourceHash,
    contractHash: context.contractHash,
    compiledAt: context.compiledAt,
    adapterId: context.adapterId,
    hostVersion: context.hostVersion,
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

export interface CatalogReport {
  readonly schemaVersion: 1
  readonly generator: string
  readonly sourceHash: string
  readonly contractHash: string
  readonly compiledAt: string
  readonly adapterId: string
  readonly hostVersion: string
  readonly compilerVersion: string
  readonly counts: {
    readonly liveries: number
    readonly previews: number
    readonly contrastEntries: number
    readonly contrastFailures: number
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
  }
  readonly previews: {
    readonly count: number
    readonly width: number
    readonly height: number
    readonly files: readonly string[]
  }
  readonly emissionPolicy: {
    readonly mode: typeof TOKEN_EMISSION_POLICY
    readonly emitted: number
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
  readonly bootCss: readonly { readonly id: string; readonly css: string }[]
  readonly maxLiveryCssBytes: number
  readonly derivedTokenNames: Iterable<string>
}

/** Build artifacts/liveries/report.json content. */
export function buildCatalogReport(options: CatalogReportOptions): CatalogReport {
  const { catalog, context, declaredLayouts, previewFiles, bootCss } = options
  const coverage = coverCatalog(catalog.liveries)
  const entries: LiveryReportEntry[] = catalog.liveries.map((livery) => {
    const css = auditLiveryCss(livery)
    const lightContrast = modeContrast(livery.light.contrast)
    const darkContrast = modeContrast(livery.dark.contrast)
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
        covered: coverTokens(liveryTokenNames(livery)).covered.length,
        inherited: coverTokens(liveryTokenNames(livery)).inherited.length,
        missing: coverTokens(liveryTokenNames(livery)).missing,
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
  return {
    schemaVersion: 1,
    generator: GENERATOR,
    sourceHash: context.sourceHash,
    contractHash: context.contractHash,
    compiledAt: context.compiledAt,
    adapterId: context.adapterId,
    hostVersion: context.hostVersion,
    compilerVersion: '0.1.0',
    counts: {
      liveries: entries.length,
      previews: previewFiles.length,
      contrastEntries,
      contrastFailures,
      tokenRequired: REQUIRED_TOKENS.length,
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
    },
    previews: {
      count: previewFiles.length,
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
      files: previewFiles,
    },
    emissionPolicy: {
      mode: TOKEN_EMISSION_POLICY,
      emitted: EMITTED_TOKEN_NAMES.size,
      inheritedUnconsumed: inheritedUnconsumedTokens(options.derivedTokenNames),
      inheritedUnconsumedCount: inheritedUnconsumedTokens(options.derivedTokenNames).length,
    },
    liveries: entries,
  }
}
