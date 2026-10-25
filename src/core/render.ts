/**
 * DSH Livery — deterministic CSS rendering + content hashing (COMPILE TIME).
 *
 * The compiler renders once per catalog profile and ships the exact bytes +
 * `cssHash`; the Host and Client only read `CompiledLivery.css` /
 * `CompiledLivery.cssHash` through `src/core/catalog.ts`, so they never import
 * this module (it needs the frozen stock snapshot of the target host version).
 *
 * Every render entry point takes the host `StockSnapshot` explicitly (§2 of
 * docs/implementation/multi-version.md): a catalog compiled for one host version
 * can never render against another version's token values.
 *
 * Output contract (frozen):
 * - `tokens`: `body[data-dsh-livery="<id>"]{…light…}` then
 *   `body[data-dsh-livery="<id>"][data-ds-dark-theme]{…dark…}`, followed by the
 *   unlayered token-level media fallbacks from `layout.ts` (forced colors,
 *   reduced transparency).
 * - `typography`: `:root:lang(zh) body[…]` and `:root:lang(en) body[…]` font
 *   bindings, selected by capability facts:
 *   - `host-font-role-hooks` available (0.2.1+): bind ONLY the documented host
 *     hooks `--dsh-font-family-text` / `--dsh-font-family-code`; the composite
 *     `--dsw-font-*` ladder is not touched (the host derives it from the hooks).
 *   - hooks absent: legacy strategy — override `--dsw-font-family` plus the
 *     consumed composite family tokens, de-referencing via
 *     `var(--dsw-font-family)` / `var(--dsh-...)` without repeating stacks.
 * - `layout`: the `@layer dsh-livery.compat` order statement (component
 *   compensation rules only; none are safe on the certified host).
 *
 * Compact serialization is the default (the bytes we ship); `options.pretty`
 * produces an audit-friendly form but is never shipped.
 */

import type {
  CapabilityMap,
  CompiledLivery,
  LiveryCatalog,
  LiveryCss,
  ResolvedTypography,
} from './types.js'
import { STOCK_ID } from './types.js'
import type { StockSnapshot } from '../generated/stock.js'
import { hasFontRoleHooks } from './capabilities.js'
import {
  bodyDarkScope,
  bodyScope,
  renderLayoutCss,
  renderMaterialCss,
  type LayoutLivery,
  type RenderOptions,
} from './layout.js'

/** Livery fields the CSS renderer consumes. */
export type RenderableLivery = Pick<
  CompiledLivery,
  'id' | 'light' | 'dark' | 'typography' | 'layout' | 'requiredCapabilities' | 'optionalCapabilities'
>

/** Documented per-role font-family hooks exposed by 0.2.1+ hosts. */
export const FONT_ROLE_HOOKS = {
  text: '--dsh-font-family-text',
  code: '--dsh-font-family-code',
} as const

const FONT_FAMILY_TOKEN = '--dsw-font-family'
const FONT_BRAND_TOKEN = '--dsw-font-family-brand'
const CODE_FAMILY_TOKEN = '--dsw-font-markdown-code-font-family'
const UI_FAMILY_EXPRESSION = 'var(--dsw-font-family)'
const CODE_FAMILY_EXPRESSION = 'var(--ds-font-family-code)'

/** Consumed Markdown ladder shorthands embedding the UI family expression. */
const CONSUMED_MARKDOWN_SHORTHANDS: readonly string[] = [
  '--dsw-font-markdown-h1',
  '--dsw-font-markdown-h2',
  '--dsw-font-markdown-h3',
  '--dsw-font-markdown-h4',
  '--dsw-font-markdown-base',
  '--dsw-font-markdown-base-strong',
  '--dsw-font-markdown-table',
  '--dsw-font-markdown-table-head',
] as const

/** Consumed UI scale shorthands embedding the UI family expression. */
const CONSUMED_UI_SHORTHANDS: readonly string[] = [
  '--dsw-font-l-20',
  '--dsw-font-s-14',
  '--dsw-font-xs-13',
  '--dsw-font-xs-strong-13',
  '--dsw-font-xxs-12',
  '--dsw-font-xxxs-11',
] as const

/** Consumed code shorthands embedding the host code family variable. */
const CONSUMED_CODE_SHORTHANDS: readonly string[] = [
  '--dsw-font-markdown-code',
  '--dsw-font-markdown-code-block',
  '--dsw-font-markdown-code-block-small',
] as const

const LOCALE_SELECTORS: readonly (readonly [locale: 'zh-CN' | 'en-US', lang: string])[] = [
  ['zh-CN', 'zh'],
  ['en-US', 'en'],
] as const

interface StockShorthand {
  readonly value: string
  readonly selector: string | null
}

function stockShorthand(stock: StockSnapshot, name: string): StockShorthand | null {
  const declaration = stock.tokens[name]
  if (declaration === undefined || declaration.referencedBy.length === 0) return null
  return { value: declaration.light, selector: declaration.selector }
}

/** Raw stock value regardless of consumption (needed to rebind content fonts). */
function stockDeclarationValue(stock: StockSnapshot, name: string): string | null {
  const declaration = stock.tokens[name]
  return declaration === undefined ? null : declaration.light
}

function replaceExpression(value: string, expression: string, replacement: string): string {
  return value.split(expression).join(replacement)
}

/**
 * A declaration identical to the stock one is only meaningful when the stock
 * declaration lives on `:root` and re-binds a `var()` there (a body-scoped copy
 * re-resolves it against the body family override).
 */
function isRedundantFontDeclaration(stock: StockSnapshot, name: string, value: string): boolean {
  const declaration = stock.tokens[name]
  if (declaration === undefined) return true
  if (value !== declaration.light) return false
  return !(declaration.selector === ':root' && declaration.light.includes('var('))
}

/**
 * Typography strategy for hosts WITH documented font role hooks (0.2.1+): bind
 * only `--dsh-font-family-text` / `--dsh-font-family-code` per language. The
 * host composes the composite `--dsw-font-*` ladder from these hooks, so
 * overriding the ladder would be redundant and fragile.
 */
function hookTypographyDeclarations(
  typography: ResolvedTypography,
  locale: 'zh-CN' | 'en-US',
): readonly (readonly [string, string])[] {
  // One text role hook exists per locale; the UI stack is the documented
  // replacement for the host UI family. Code always uses the mono registry stack.
  return [
    [FONT_ROLE_HOOKS.text, typography.ui[locale]],
    [FONT_ROLE_HOOKS.code, typography.code],
  ]
}

/**
 * Legacy typography strategy for hosts WITHOUT font role hooks (0.2.0-rc.2):
 * override `--dsw-font-family` and de-reference the consumed composite tokens
 * through `var(--dsw-font-family)`; do not repeat the stack.
 */
function legacyTypographyDeclarations(
  typography: ResolvedTypography,
  locale: 'zh-CN' | 'en-US',
  stock: StockSnapshot,
): readonly (readonly [string, string])[] {
  const uiStack = typography.ui[locale]
  const contentStack = typography.content[locale]
  const codeStack = typography.code
  const declarations: [string, string][] = [[FONT_FAMILY_TOKEN, uiStack]]

  const brand = stockShorthand(stock, FONT_BRAND_TOKEN)
  if (brand !== null) declarations.push([FONT_BRAND_TOKEN, brand.value])

  const contentDiffers = contentStack !== uiStack
  if (contentDiffers) {
    for (const name of CONSUMED_MARKDOWN_SHORTHANDS) {
      const stockValue = stockDeclarationValue(stock, name)
      if (stockValue === null || !stockValue.includes(UI_FAMILY_EXPRESSION)) continue
      declarations.push([name, replaceExpression(stockValue, UI_FAMILY_EXPRESSION, contentStack)])
    }
  }
  for (const name of CONSUMED_UI_SHORTHANDS) {
    const shorthand = stockShorthand(stock, name)
    if (shorthand === null || !shorthand.value.includes(UI_FAMILY_EXPRESSION)) continue
    declarations.push([name, shorthand.value])
  }
  declarations.push([CODE_FAMILY_TOKEN, codeStack])
  for (const name of CONSUMED_CODE_SHORTHANDS) {
    const shorthand = stockShorthand(stock, name)
    if (shorthand === null || !shorthand.value.includes(CODE_FAMILY_EXPRESSION)) continue
    declarations.push([name, replaceExpression(shorthand.value, CODE_FAMILY_EXPRESSION, `var(${CODE_FAMILY_TOKEN})`)])
  }

  return declarations.filter(([name, value]) => !isRedundantFontDeclaration(stock, name, value))
}

/**
 * Host font-token bindings for one locale (fixed order → stable bytes), selected
 * by capability facts only — never by a host version string.
 */
export function typographyDeclarations(
  typography: ResolvedTypography,
  locale: 'zh-CN' | 'en-US',
  capabilities: CapabilityMap,
  stock: StockSnapshot,
): readonly (readonly [token: string, value: string])[] {
  return hasFontRoleHooks(capabilities)
    ? hookTypographyDeclarations(typography, locale)
    : legacyTypographyDeclarations(typography, locale, stock)
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Minify a declaration value without changing its meaning: drop whitespace
 * around commas (rgba, font lists, gradients) and collapse runs of spaces. The
 * spaces required by `calc()` (`+` / `-`) and the font shorthand's `/` survive.
 */
function compactValue(value: string): string {
  const compact = value.replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ').trim()
  // `rgba(r,g,b,a)` → `#rrggbbaa` (9 bytes instead of ~21) and `rgb()` → hex.
  return compact.replace(
    /rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)/g,
    (_match: string, red: string, green: string, blue: string, alpha?: string) => {
      const channel = (raw: string): string => Math.round(Math.min(255, Math.max(0, Number(raw)))).toString(16).padStart(2, '0')
      if (alpha === undefined) return `#${channel(red)}${channel(green)}${channel(blue)}`
      const alphaChannel = Math.round(Math.min(1, Math.max(0, Number(alpha))) * 255)
        .toString(16)
        .padStart(2, '0')
      return `#${channel(red)}${channel(green)}${channel(blue)}${alphaChannel}`
    },
  )
}

function formatDeclarations(
  declarations: readonly (readonly [string, string])[],
  pretty: boolean,
): string {
  if (declarations.length === 0) return ''
  if (!pretty) return declarations.map(([token, value]) => `${token}:${compactValue(value)}`).join(';')
  return declarations.map(([token, value]) => `  ${token}: ${value};`).join('\n')
}

function formatRule(selector: string, declarations: readonly (readonly [string, string])[], pretty: boolean): string {
  const body = formatDeclarations(declarations, pretty)
  if (body.length === 0) return ''
  return pretty ? `${selector}{\n${body}\n}` : `${selector}{${body}}`
}

function sortedEntries(tokens: Readonly<Record<string, string>>): (readonly [string, string])[] {
  return Object.keys(tokens)
    .sort()
    .map((name) => [name, tokens[name] as string] as const)
}

function joinFragments(fragments: readonly string[], pretty: boolean): string {
  const nonEmpty = fragments.filter((fragment) => fragment.length > 0)
  if (nonEmpty.length === 0) return ''
  const joined = nonEmpty.join(pretty ? '\n' : '')
  return pretty ? `${joined}\n` : joined
}

/**
 * Generated text is embedded in a `<style>` element. In CSS `'\/'` is a valid
 * escape for `/`, so any literal `</` is neutralised without changing meaning.
 */
function sanitizeStyleText(css: string): string {
  const sanitized = css.split('</').join('<\\/')
  if (sanitized.includes('</style')) {
    throw new Error('Livery CSS sanitizer failed to remove a style-closing sequence')
  }
  return sanitized
}

function layoutLiveryOf(livery: RenderableLivery): LayoutLivery {
  return { id: livery.id, layout: livery.layout, light: livery.light, dark: livery.dark }
}

function renderTokenCss(livery: RenderableLivery, capabilities: CapabilityMap, pretty: boolean): string {
  return joinFragments(
    [
      formatRule(bodyScope(livery.id), sortedEntries(livery.light.tokens), pretty),
      formatRule(bodyDarkScope(livery.id), sortedEntries(livery.dark.tokens), pretty),
      renderMaterialCss(layoutLiveryOf(livery), capabilities, { pretty }),
    ],
    pretty,
  )
}

function renderTypographyCss(livery: RenderableLivery, capabilities: CapabilityMap, stock: StockSnapshot, pretty: boolean): string {
  return joinFragments(
    LOCALE_SELECTORS.map(([locale, lang]) =>
      formatRule(
        `:root:lang(${lang}) ${bodyScope(livery.id)}`,
        typographyDeclarations(livery.typography, locale, capabilities, stock),
        pretty,
      ),
    ),
    pretty,
  )
}

function renderLayoutFragment(livery: RenderableLivery, capabilities: CapabilityMap, pretty: boolean): string {
  const css = renderLayoutCss(layoutLiveryOf(livery), capabilities, { pretty })
  if (css.length === 0) return ''
  return pretty && !css.endsWith('\n') ? `${css}\n` : css
}

/**
 * Render the three CSS fragments for one compiled livery against one exact host
 * stock snapshot. Compact bytes are the default (what the compiler ships and
 * hashes); `options.pretty` is for audits.
 */
export function renderLiveryCss(
  livery: RenderableLivery,
  capabilities: CapabilityMap,
  stock: StockSnapshot,
  options: RenderOptions = {},
): LiveryCss {
  const pretty = options.pretty ?? false
  return {
    tokens: sanitizeStyleText(renderTokenCss(livery, capabilities, pretty)),
    typography: sanitizeStyleText(renderTypographyCss(livery, capabilities, stock, pretty)),
    layout: sanitizeStyleText(renderLayoutFragment(livery, capabilities, pretty)),
  }
}

/** Exact production concatenation of the three fragments (no wrappers). */
export function styleTextFromFragments(css: LiveryCss): string {
  return `${css.tokens}${css.typography}${css.layout}`
}

/** Rendition used by the compiler for the shipped bytes and `cssHash`. */
export function renderStyleText(livery: CompiledLivery, capabilities: CapabilityMap, stock: StockSnapshot): string {
  return styleTextFromFragments(renderLiveryCss(livery, capabilities, stock))
}

/** `sha256:<hex>` of the exact production stylesheet bytes. */
export function computeLiveryCssHash(css: LiveryCss): string {
  return hashCss(styleTextFromFragments(css))
}

/**
 * Compiler/audit helper: boot CSS for one skin id. The Host runtime uses
 * `renderBootCssFromCatalog` from `src/core/catalog.ts` instead (stock-free).
 * `stock`/unknown id → empty CSS and hash.
 */
export function renderBootCss(
  catalog: LiveryCatalog,
  skinId: string,
  stock: StockSnapshot,
): { readonly css: string; readonly hash: string } {
  if (skinId === STOCK_ID) return { css: '', hash: '' }
  const livery = catalog.liveries.find((candidate) => candidate.id === skinId)
  if (livery === undefined) return { css: '', hash: '' }
  const css = renderStyleText(livery, catalog.capabilities, stock)
  return { css, hash: hashCss(css) }
}

// ---------------------------------------------------------------------------
// Hashing — dependency-free SHA-256 (identical in compiler and browser)
// ---------------------------------------------------------------------------

const SHA256_K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount))
}

function toHex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0')
}

/** Plain SHA-256 over the UTF-8 bytes of `message`, lowercase hex. */
export function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message)
  const bitLength = bytes.length * 8
  const paddedLength = Math.ceil((bytes.length + 1 + 8) / 64) * 64
  const padded = new Uint8Array(paddedLength)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000))
  view.setUint32(paddedLength - 4, bitLength >>> 0)

  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19
  const w = new Uint32Array(64)

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      w[index] = view.getUint32(offset + index * 4)
    }
    for (let index = 16; index < 64; index += 1) {
      const w15 = w[index - 15] as number
      const w2 = w[index - 2] as number
      const s0 = rotateRight(w15, 7) ^ rotateRight(w15, 18) ^ (w15 >>> 3)
      const s1 = rotateRight(w2, 17) ^ rotateRight(w2, 19) ^ (w2 >>> 10)
      w[index] = ((w[index - 16] as number) + s0 + (w[index - 7] as number) + s1) >>> 0
    }
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7
    for (let index = 0; index < 64; index += 1) {
      const sigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)
      const choice = (e & f) ^ (~e & g)
      const temp1 = (h + sigma1 + choice + (SHA256_K[index] as number) + (w[index] as number)) >>> 0
      const sigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)
      const majority = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (sigma0 + majority) >>> 0
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  return (
    toHex32(h0) + toHex32(h1) + toHex32(h2) + toHex32(h3) +
    toHex32(h4) + toHex32(h5) + toHex32(h6) + toHex32(h7)
  )
}

/** Content hash in the documented `sha256:<hex>` form. */
export function hashCss(css: string): string {
  return `sha256:${sha256Hex(css)}`
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const serialized = JSON.stringify(value)
    return serialized === undefined ? 'null' : serialized
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`
  }
  const record = value as Record<string, unknown>
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
  return `{${entries.join(',')}}`
}

/**
 * Catalog identity hash over id + rendered CSS + layout + typography (property
 * order canonicalised, so compiler and Client compute the same value).
 */
export function hashLivery(livery: Omit<CompiledLivery, 'hash'>): string {
  return hashCss(
    stableStringify({
      id: livery.id,
      css: livery.css,
      layout: livery.layout,
      typography: livery.typography,
    }),
  )
}
