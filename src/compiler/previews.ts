/**
 * Deterministic livery preview renderer.
 *
 * Renders one static 640x400 SVG per (livery, locale, mode): a fixed contract
 * fixture scene with a 240px sidebar, a chat transcript, one standard
 * token-native plugin panel card and a composer. Every colour comes from the
 * livery's compiled token map for that mode (falling back to the frozen stock
 * snapshot for tokens the livery intentionally inherits), and every font comes
 * from the livery's resolved typography. No external images, no fonts, no
 * scripts, no foreignObject: the file is standalone, XML-escaped and byte-stable.
 */
import type { LiveryManifest, Mode, ResolvedTypography, TokenMap } from '../core/types.js'
import type { DshLocaleId, LocaleId } from '../core/types.js'
import { STOCK_TOKENS } from '../generated/stock.js'

export const PREVIEW_WIDTH = 640
export const PREVIEW_HEIGHT = 400
export const PREVIEW_SIDEBAR_WIDTH = 240
export const PREVIEW_LOCALES: readonly DshLocaleId[] = ['zh', 'en']
export const PREVIEW_MODES: readonly Mode[] = ['light', 'dark']

const LOCALE_TAG: Readonly<Record<DshLocaleId, LocaleId>> = { zh: 'zh-CN', en: 'en-US' }

/** Everything the preview needs from one compiled livery. */
export interface PreviewLivery {
  readonly id: string
  readonly meta: LiveryManifest['meta']
  readonly layout: LiveryManifest['layout']
  readonly typography: ResolvedTypography
  readonly light: { readonly tokens: TokenMap }
  readonly dark: { readonly tokens: TokenMap }
}

interface Rgba {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly a: number
}

/* ------------------------------------------------------------------ */
/* Deterministic fixture copy (authored natively per locale, not translated) */
/* ------------------------------------------------------------------ */

interface PreviewCopy {
  readonly appCaption: string
  readonly sectionChats: string
  readonly chats: readonly string[]
  readonly sectionPlugins: string
  readonly plugins: readonly string[]
  readonly modeLight: string
  readonly modeDark: string
  readonly localeLabel: string
  readonly headerTitle: string
  readonly headerModeLight: string
  readonly headerModeDark: string
  readonly you: string
  readonly youLines: readonly string[]
  readonly assistant: string
  readonly assistantLines: readonly string[]
  readonly panelTitle: string
  readonly panelBadge: string
  readonly panelStatus: string
  readonly panelRows: readonly string[]
  readonly panelProgress: string
  readonly panelRowValues: readonly string[]
  readonly placeholder: string
  readonly composerHint: string
  readonly approvalNote: string
}

const COPY: Readonly<Record<DshLocaleId, PreviewCopy>> = {
  zh: {
    appCaption: 'DSH LIVERY',
    sectionChats: '会话',
    chats: ['新会话', '设计评审', '发布清单'],
    sectionPlugins: '插件',
    plugins: ['主题预览', '任务面板'],
    modeLight: '浅色',
    modeDark: '深色',
    localeLabel: '简体中文',
    headerTitle: '新会话',
    headerModeLight: '浅色模式',
    headerModeDark: '深色模式',
    you: '你',
    youLines: ['帮我看看这版配色在深色模式下', '够不够清楚，尤其是链接。'],
    assistant: '助手',
    assistantLines: ['对比度都过了：正文、链接和焦点环均达到 AA。', '明暗两套共用同一组中性色阶，切换很稳。'],
    panelTitle: '任务面板',
    panelBadge: '插件',
    panelStatus: '运行中',
    panelRows: ['生成预览图', '审计对比度'],
    panelProgress: '检查 token 覆盖',
    panelRowValues: ['4 张', 'AA 通过'],
    placeholder: '给 Livery 发一条消息…',
    composerHint: 'Enter 发送 · Shift + Enter 换行',
    approvalNote: '固定契约场景',
  },
  en: {
    appCaption: 'DSH LIVERY',
    sectionChats: 'Chats',
    chats: ['New chat', 'Design review', 'Release checklist'],
    sectionPlugins: 'Plugins',
    plugins: ['Theme preview', 'Task panel'],
    modeLight: 'Light',
    modeDark: 'Dark',
    localeLabel: 'English',
    headerTitle: 'New chat',
    headerModeLight: 'Light mode',
    headerModeDark: 'Dark mode',
    you: 'You',
    youLines: ['Can you check this palette in dark mode?', 'Links and focus rings especially.'],
    assistant: 'Assistant',
    assistantLines: ['Contrast passes: body, links and focus rings clear AA.', 'Light and dark share one neutral ramp, so it holds.'],
    panelTitle: 'Task panel',
    panelBadge: 'Plugin',
    panelStatus: 'Running',
    panelRows: ['Generate previews', 'Audit contrast'],
    panelProgress: 'Check token coverage',
    panelRowValues: ['4 modes', 'AA pass'],
    placeholder: 'Message Livery…',
    composerHint: 'Enter to send · Shift + Enter for a new line',
    approvalNote: 'Fixed contract fixture',
  },
}

/* ------------------------------------------------------------------ */
/* Colour resolution                                                    */
/* ------------------------------------------------------------------ */

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

/** Parse `#rgb`/`#rgba`/`#rrggbb`/`#rrggbbaa`/`rgb()`/`rgba()`; anything else is null. */
export function parsePreviewColor(value: string): Rgba | null {
  const input = value.trim()
  const hex = /^#([0-9a-fA-F]{3,8})$/.exec(input)
  if (hex !== null) {
    const digits = hex[1] ?? ''
    const expand = (part: string): number => parseInt(part.length === 1 ? part + part : part, 16)
    if (digits.length === 3 || digits.length === 4) {
      return {
        r: expand(digits.slice(0, 1)),
        g: expand(digits.slice(1, 2)),
        b: expand(digits.slice(2, 3)),
        a: digits.length === 4 ? Math.round((expand(digits.slice(3, 4)) / 255) * 1000) / 1000 : 1,
      }
    }
    if (digits.length === 6 || digits.length === 8) {
      return {
        r: expand(digits.slice(0, 2)),
        g: expand(digits.slice(2, 4)),
        b: expand(digits.slice(4, 6)),
        a: digits.length === 8 ? Math.round((expand(digits.slice(6, 8)) / 255) * 1000) / 1000 : 1,
      }
    }
    return null
  }
  const functional = /^rgba?\(\s*([\d.]+%?)\s*(?:[,\s]+)\s*([\d.]+%?)\s*(?:[,\s]+)\s*([\d.]+%?)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i.exec(input)
  if (functional !== null) {
    const channel = (part: string | undefined): number => {
      if (part === undefined) return 0
      return part.endsWith('%') ? (Number.parseFloat(part) / 100) * 255 : Number.parseFloat(part)
    }
    const alpha = (part: string | undefined): number => {
      if (part === undefined) return 1
      return part.endsWith('%') ? Number.parseFloat(part) / 100 : Number.parseFloat(part)
    }
    return {
      r: clampByte(channel(functional[1])),
      g: clampByte(channel(functional[2])),
      b: clampByte(channel(functional[3])),
      a: Math.round(alpha(functional[4]) * 1000) / 1000,
    }
  }
  return null
}

function toHex(color: Rgba): string {
  const part = (value: number): string => clampByte(value).toString(16).padStart(2, '0')
  return `#${part(color.r)}${part(color.g)}${part(color.b)}`
}

/** Deterministic sRGB mix; used only for fallbacks and material decoration. */
function mix(a: Rgba, b: Rgba, t: number): Rgba {
  const amount = Math.max(0, Math.min(1, t))
  return {
    r: clampByte(a.r + (b.r - a.r) * amount),
    g: clampByte(a.g + (b.g - a.g) * amount),
    b: clampByte(a.b + (b.b - a.b) * amount),
    a: 1,
  }
}

interface PreviewPalette {
  readonly page: Rgba
  readonly sidebar: Rgba
  readonly layer1: Rgba
  readonly layer2: Rgba
  readonly layer3: Rgba
  readonly navActive: Rgba
  readonly navHover: Rgba
  readonly labelPrimary: Rgba
  readonly labelSecondary: Rgba
  readonly labelTertiary: Rgba
  readonly labelCaption: Rgba
  readonly labelInverted: Rgba
  readonly brand: Rgba
  readonly link: Rgba
  readonly borderL1: Rgba
  readonly borderL2: Rgba
  readonly borderL3: Rgba
  readonly bubble: Rgba
  readonly input: Rgba
  readonly code: Rgba
  readonly tip: Rgba
  readonly success: Rgba
  readonly warn: Rgba
  readonly error: Rgba
  readonly business: Rgba
}

const ROLE_TOKENS: Readonly<Record<keyof PreviewPalette, readonly string[]>> = {
  page: ['--dsw-alias-bg-base'],
  sidebar: ['--dsw-specific-sidebar-fill', '--dsw-alias-bg-layer-1'],
  layer1: ['--dsw-alias-bg-layer-1'],
  layer2: ['--dsw-alias-bg-layer-2'],
  layer3: ['--dsw-alias-bg-layer-3'],
  navActive: ['--dsw-specific-sidebar-nav-item-active', '--dsw-alias-interactive-bg-active'],
  navHover: ['--dsw-specific-sidebar-nav-item-hover', '--dsw-alias-interactive-bg-hover'],
  labelPrimary: ['--dsw-alias-label-primary'],
  labelSecondary: ['--dsw-alias-label-secondary'],
  labelTertiary: ['--dsw-alias-label-tertiary'],
  labelCaption: ['--dsw-alias-label-caption'],
  labelInverted: ['--dsw-alias-label-primary-inverted'],
  brand: ['--dsw-alias-brand-primary', '--dsw-alias-onboarding-accent'],
  link: ['--dsw-alias-link'],
  borderL1: ['--dsw-alias-border-l1'],
  borderL2: ['--dsw-alias-border-l2'],
  borderL3: ['--dsw-alias-border-l3'],
  bubble: ['--dsw-specific-bubble'],
  input: ['--dsw-specific-input-major'],
  code: ['--dsw-alias-markdown-code-block'],
  tip: ['--dsw-specific-tip'],
  success: ['--dsw-alias-state-success-primary'],
  warn: ['--dsw-alias-state-warn-primary'],
  error: ['--dsw-alias-state-error-primary'],
  business: ['--dsw-alias-state-business-primary'],
}

function stockColor(name: string, mode: Mode): Rgba | null {
  const declaration = STOCK_TOKENS[name]
  if (declaration === undefined) return null
  const raw = mode === 'light' ? declaration.resolvedLight : declaration.resolvedDark
  if (raw === null) return null
  return parsePreviewColor(raw)
}

function seedFallback(role: keyof PreviewPalette, seeds: { readonly accent: string; readonly secondary: string; readonly surface: string; readonly text: string }): Rgba {
  const accent = parsePreviewColor(seeds.accent) ?? { r: 66, g: 100, b: 130, a: 1 }
  const secondary = parsePreviewColor(seeds.secondary) ?? accent
  const surface = parsePreviewColor(seeds.surface) ?? { r: 245, g: 245, b: 245, a: 1 }
  const text = parsePreviewColor(seeds.text) ?? { r: 20, g: 20, b: 20, a: 1 }
  switch (role) {
    case 'page':
      return surface
    case 'sidebar':
      return mix(surface, text, 0.03)
    case 'layer1':
    case 'layer2':
    case 'layer3':
      return mix(surface, text, role === 'layer1' ? 0.02 : role === 'layer2' ? 0.04 : 0.06)
    case 'navActive':
      return mix(surface, accent, 0.12)
    case 'navHover':
      return mix(surface, text, 0.05)
    case 'labelPrimary':
      return text
    case 'labelSecondary':
      return mix(text, surface, 0.35)
    case 'labelTertiary':
    case 'labelCaption':
      return mix(text, surface, 0.5)
    case 'labelInverted':
      return mix(surface, '#ffffff', 0.9)
    case 'brand':
      return accent
    case 'link':
      return accent
    case 'borderL1':
      return mix(surface, text, 0.06)
    case 'borderL2':
      return mix(surface, text, 0.12)
    case 'borderL3':
      return mix(surface, text, 0.2)
    case 'bubble':
      return mix(surface, accent, 0.1)
    case 'input':
      return mix(surface, text, 0.02)
    case 'code':
      return mix(surface, text, 0.05)
    case 'tip':
      return mix(surface, text, 0.08)
    case 'success':
      return { r: 34, g: 197, b: 94, a: 1 }
    case 'warn':
      return { r: 245, g: 158, b: 11, a: 1 }
    case 'error':
      return { r: 236, g: 19, b: 19, a: 1 }
    case 'business':
      return secondary
  }
}

function buildPalette(livery: PreviewLivery, mode: Mode): PreviewPalette {
  const tokens = mode === 'light' ? livery.light.tokens : livery.dark.tokens
  const seed = liverySeeds(livery, mode)
  const palette: Record<string, Rgba> = {}
  for (const role of Object.keys(ROLE_TOKENS) as (keyof PreviewPalette)[]) {
    let resolved: Rgba | null = null
    for (const name of ROLE_TOKENS[role]) {
      const override = tokens[name]
      if (override !== undefined) {
        resolved = parsePreviewColor(override)
        if (resolved !== null) break
      }
      resolved = stockColor(name, mode)
      if (resolved !== null) break
    }
    palette[role] = resolved ?? seedFallback(role, seed)
  }
  return palette as unknown as PreviewPalette
}

function liverySeeds(livery: PreviewLivery, mode: Mode): { readonly accent: string; readonly secondary: string; readonly surface: string; readonly text: string } {
  // The compiled artifact does not carry seeds directly; compiled tokens always
  // contain the palette families, so recover representative seed-ish colours.
  const tokens = mode === 'light' ? livery.light.tokens : livery.dark.tokens
  const pick = (name: string): string | null => {
    const value = tokens[name]
    if (value === undefined) return null
    return parsePreviewColor(value) === null ? null : value
  }
  const accent = pick('--dsw-alias-brand-primary') ?? pick('--dsw-alias-link')
  const page = pick('--dsw-alias-bg-base')
  const text = pick('--dsw-alias-label-primary')
  if (accent !== null && page !== null && text !== null) {
    return { accent, secondary: accent, surface: page, text }
  }
  return {
    accent: '#46688a',
    secondary: '#7b98b0',
    surface: mode === 'light' ? '#f0f3f6' : '#181c21',
    text: mode === 'light' ? '#1b2733' : '#eef2f6',
  }
}

/* ------------------------------------------------------------------ */
/* SVG primitives                                                       */
/* ------------------------------------------------------------------ */

/** XML-escape text content and attribute values (quotes included). */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function num(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

interface BoxOptions {
  readonly fill?: Rgba
  readonly stroke?: Rgba
  readonly strokeWidth?: number
  readonly rx?: number
  readonly opacity?: number
}

function box(x: number, y: number, width: number, height: number, options: BoxOptions = {}): string {
  const attributes: string[] = [`x="${num(x)}"`, `y="${num(y)}"`, `width="${num(width)}"`, `height="${num(height)}"`]
  if (options.rx !== undefined) attributes.push(`rx="${num(options.rx)}"`)
  if (options.fill !== undefined) {
    attributes.push(`fill="${toHex(options.fill)}"`)
    if (options.fill.a < 1) attributes.push(`fill-opacity="${num(options.fill.a)}"`)
  } else {
    attributes.push('fill="none"')
  }
  if (options.stroke !== undefined) {
    attributes.push(`stroke="${toHex(options.stroke)}"`)
    if (options.stroke.a < 1) attributes.push(`stroke-opacity="${num(options.stroke.a)}"`)
    attributes.push(`stroke-width="${num(options.strokeWidth ?? 1)}"`)
  }
  if (options.opacity !== undefined && options.opacity < 1) attributes.push(`opacity="${num(options.opacity)}"`)
  return `<rect ${attributes.join(' ')}/>`
}

interface TextOptions {
  readonly fill: Rgba
  readonly family: string
  readonly size: number
  readonly weight?: number
  readonly anchor?: 'start' | 'middle' | 'end'
  readonly letterSpacing?: number
  readonly opacity?: number
}

function text(x: number, y: number, content: string, options: TextOptions): string {
  const attributes: string[] = [
    `x="${num(x)}"`,
    `y="${num(y)}"`,
    `font-family="${xmlEscape(options.family)}"`,
    `font-size="${num(options.size)}"`,
    `fill="${toHex(options.fill)}"`,
  ]
  if (options.fill.a < 1) attributes.push(`fill-opacity="${num(options.fill.a)}"`)
  if (options.weight !== undefined) attributes.push(`font-weight="${num(options.weight)}"`)
  if (options.anchor !== undefined && options.anchor !== 'start') attributes.push(`text-anchor="${options.anchor}"`)
  if (options.letterSpacing !== undefined) attributes.push(`letter-spacing="${num(options.letterSpacing)}"`)
  if (options.opacity !== undefined && options.opacity < 1) attributes.push(`opacity="${num(options.opacity)}"`)
  return `<text ${attributes.join(' ')}>${xmlEscape(content)}</text>`
}

function dot(cx: number, cy: number, radius: number, fill: Rgba): string {
  return `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(radius)}" fill="${toHex(fill)}"${fill.a < 1 ? ` fill-opacity="${num(fill.a)}"` : ''}/>`
}

function line(x1: number, y1: number, x2: number, y2: number, stroke: Rgba, width = 1): string {
  return `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" stroke="${toHex(stroke)}" stroke-width="${num(width)}"${stroke.a < 1 ? ` stroke-opacity="${num(stroke.a)}"` : ''}/>`
}

/** Rough deterministic advance width (CJK ≈ 1em, latin ≈ 0.55em). */
export function estimateTextWidth(content: string, size: number): number {
  let width = 0
  for (const char of content) {
    const codePoint = char.codePointAt(0) ?? 0
    if (codePoint > 0x2e7f) width += size
    else if (char === ' ') width += size * 0.28
    else width += size * 0.55
  }
  return width
}

function truncateToWidth(content: string, size: number, maxWidth: number): string {
  if (estimateTextWidth(content, size) <= maxWidth) return content
  let out = ''
  for (const char of content) {
    if (estimateTextWidth(out + char + '…', size) > maxWidth) break
    out += char
  }
  return `${out}…`
}

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */

interface Ctx {
  readonly palette: PreviewPalette
  readonly copy: PreviewCopy
  readonly uiFont: string
  readonly contentFont: string
  readonly codeFont: string
  readonly uiLine: number
  readonly contentLine: number
  readonly mode: Mode
  readonly name: string
  readonly surfaceStyle: LiveryManifest['layout']['surfaceStyle']
}

function renderSidebar(ctx: Ctx): string[] {
  const { palette: p, copy, uiFont } = ctx
  const parts: string[] = []
  parts.push(box(0, 0, PREVIEW_SIDEBAR_WIDTH, PREVIEW_HEIGHT, { fill: p.sidebar }))
  parts.push(line(PREVIEW_SIDEBAR_WIDTH - 0.5, 0, PREVIEW_SIDEBAR_WIDTH - 0.5, PREVIEW_HEIGHT, p.borderL2))

  if (ctx.surfaceStyle === 'glass') {
    parts.push(box(0, 0, PREVIEW_SIDEBAR_WIDTH, 150, { fill: p.brand, opacity: 0.08 }))
  }

  // Brand block: mark + localized livery name.
  parts.push(dot(28, 30, 10, p.brand))
  parts.push(box(23.5, 26.5, 9, 2.2, { fill: p.labelInverted, rx: 1.1 }))
  parts.push(box(23.5, 30.5, 6, 2.2, { fill: p.labelInverted, rx: 1.1 }))
  parts.push(text(46, 33, truncateToWidth(ctx.name, 13, 176), { fill: p.labelPrimary, family: uiFont, size: 13, weight: 600 }))
  parts.push(text(46, 44, copy.appCaption, { fill: p.labelTertiary, family: uiFont, size: 8.5, letterSpacing: 0.8 }))

  // Chat section.
  parts.push(text(14, 68, copy.sectionChats, { fill: p.labelTertiary, family: uiFont, size: 9.5, letterSpacing: 0.4 }))
  let itemY = 74
  for (let index = 0; index < copy.chats.length; index += 1) {
    const label = copy.chats[index] ?? ''
    const active = index === 0
    if (active) {
      parts.push(box(12, itemY, 216, 30, { fill: p.navActive, rx: 8 }))
      parts.push(box(12, itemY + 6, 2.5, 18, { fill: p.brand, rx: 1.25 }))
    }
    parts.push(box(24, itemY + 9, 12, 12, { fill: active ? p.brand : p.labelTertiary, rx: 3.5, opacity: active ? 1 : 0.75 }))
    parts.push(
      text(44, itemY + 20, truncateToWidth(label, 11, 168), {
        fill: active ? p.labelPrimary : p.labelSecondary,
        family: uiFont,
        size: 11,
        weight: active ? 600 : 400,
      }),
    )
    itemY += 32
  }

  // Plugin section (token-native standard plugin surface).
  parts.push(text(14, 190, copy.sectionPlugins, { fill: p.labelTertiary, family: uiFont, size: 9.5, letterSpacing: 0.4 }))
  itemY = 196
  for (const label of copy.plugins) {
    parts.push(box(24, itemY + 9, 12, 12, { fill: p.labelTertiary, rx: 3.5, opacity: 0.6 }))
    parts.push(text(44, itemY + 20, truncateToWidth(label, 11, 168), { fill: p.labelSecondary, family: uiFont, size: 11 }))
    itemY += 32
  }

  // Sidebar footer: current mode + locale (the two preview axes).
  const modeLabel = ctx.mode === 'light' ? copy.modeLight : copy.modeDark
  parts.push(box(14, 348, 96, 22, { fill: p.layer1, stroke: p.borderL2, strokeWidth: 1, rx: 11 }))
  parts.push(dot(26, 359, 4.5, p.brand))
  parts.push(text(36, 363, modeLabel, { fill: p.labelSecondary, family: uiFont, size: 9.5, weight: 500 }))
  parts.push(text(226, 363, copy.localeLabel, { fill: p.labelTertiary, family: uiFont, size: 9.5, anchor: 'end' }))
  parts.push(text(14, 386, copy.approvalNote, { fill: p.labelCaption, family: uiFont, size: 8.5 }))
  return parts
}

function renderHeader(ctx: Ctx): string[] {
  const { palette: p, copy, uiFont } = ctx
  const parts: string[] = []
  parts.push(box(PREVIEW_SIDEBAR_WIDTH, 0, PREVIEW_WIDTH - PREVIEW_SIDEBAR_WIDTH, 41, { fill: p.page }))
  parts.push(line(PREVIEW_SIDEBAR_WIDTH, 40.5, PREVIEW_WIDTH, 40.5, p.borderL1))
  parts.push(text(256, 26, copy.headerTitle, { fill: p.labelPrimary, family: uiFont, size: 13.5, weight: 600 }))

  const modeLabel = ctx.mode === 'light' ? copy.headerModeLight : copy.headerModeDark
  const pillWidth = estimateTextWidth(modeLabel, 9.5) + 30
  const pillX = 618 - pillWidth
  parts.push(box(pillX, 13, pillWidth, 20, { fill: p.layer1, stroke: p.borderL2, strokeWidth: 1, rx: 10 }))
  parts.push(dot(pillX + 11, 23, 4, p.brand))
  parts.push(text(pillX + 20, 26.5, modeLabel, { fill: p.labelSecondary, family: uiFont, size: 9.5, weight: 500 }))
  return parts
}

function renderTranscript(ctx: Ctx): string[] {
  const { palette: p, copy, uiFont, contentFont, contentLine } = ctx
  const parts: string[] = []
  const right = 618
  const contentX = 254

  // User message: right-aligned bubble with authored native copy.
  const bubbleSize = 12
  const bubbleLine = ctx.contentLine
  const bubbleLineWidth = Math.max(...copy.youLines.map((lineText) => estimateTextWidth(lineText, bubbleSize)))
  const bubbleWidth = Math.min(320, Math.round(bubbleLineWidth + 24))
  const bubbleHeight = copy.youLines.length * bubbleLine + 16
  const bubbleX = right - bubbleWidth
  const bubbleY = 58
  parts.push(text(right, 53, copy.you, { fill: p.labelTertiary, family: uiFont, size: 9.5, anchor: 'end' }))
  parts.push(box(bubbleX, bubbleY, bubbleWidth, bubbleHeight, { fill: p.bubble, stroke: p.borderL1, strokeWidth: 1, rx: 11 }))
  copy.youLines.forEach((lineText, index) => {
    parts.push(
      text(bubbleX + 12, bubbleY + 8 + bubbleLine * 0.75 + index * bubbleLine, lineText, {
        fill: p.labelPrimary,
        family: contentFont,
        size: bubbleSize,
      }),
    )
  })

  // Assistant message: avatar + native copy.
  const assistantTop = bubbleY + bubbleHeight + 18
  parts.push(dot(contentX + 2, assistantTop + 7, 8, p.brand))
  parts.push(text(contentX + 17, assistantTop + 10.5, copy.assistant, { fill: p.labelPrimary, family: uiFont, size: 10.5, weight: 600 }))
  copy.assistantLines.forEach((lineText, index) => {
    parts.push(
      text(contentX, assistantTop + 27 + index * contentLine, truncateToWidth(lineText, 12, 340), {
        fill: p.labelPrimary,
        family: contentFont,
        size: 12,
        opacity: index === 1 ? 0.92 : 1,
      }),
    )
  })

  // Standard plugin panel card (token-native: layer-1 surface + brand accent).
  const cardTop = Math.max(assistantTop + 27 + copy.assistantLines.length * contentLine + 18, 186)
  const cardHeight = 100
  const cardX = contentX
  const cardWidth = right - contentX
  parts.push(box(cardX, cardTop, cardWidth, cardHeight, { fill: p.layer1, stroke: p.borderL2, strokeWidth: 1, rx: 10 }))
  parts.push(box(cardX + 12, cardTop + 12, 18, 18, { fill: p.brand, rx: 5 }))
  parts.push(box(cardX + 16.5, cardTop + 17.5, 9, 2, { fill: p.labelInverted, rx: 1 }))
  parts.push(box(cardX + 16.5, cardTop + 21.5, 6, 2, { fill: p.labelInverted, rx: 1 }))
  parts.push(text(cardX + 38, cardTop + 24, copy.panelTitle, { fill: p.labelPrimary, family: uiFont, size: 11.5, weight: 600 }))
  const badgeLabel = copy.panelBadge
  const badgeWidth = estimateTextWidth(badgeLabel, 8.5) + 12
  parts.push(box(cardX + 38 + estimateTextWidth(copy.panelTitle, 11.5) + 8, cardTop + 11, badgeWidth, 15, { fill: p.layer2, rx: 7.5 }))
  parts.push(
    text(cardX + 44 + estimateTextWidth(copy.panelTitle, 11.5) + 8, cardTop + 21.5, badgeLabel, {
      fill: p.labelTertiary,
      family: uiFont,
      size: 8.5,
    }),
  )
  parts.push(dot(cardX + cardWidth - 58, cardTop + 20, 3.5, p.success))
  parts.push(
    text(cardX + cardWidth - 14, cardTop + 23, copy.panelStatus, {
      fill: p.labelSecondary,
      family: uiFont,
      size: 9,
      anchor: 'end',
    }),
  )
  parts.push(line(cardX, cardTop + 34.5, cardX + cardWidth, cardTop + 34.5, p.borderL1))

  copy.panelRows.forEach((rowLabel, index) => {
    const rowY = cardTop + 51 + index * 21
    parts.push(dot(cardX + 18, rowY - 3, 4.5, index === 0 ? p.success : p.business))
    parts.push(
      text(cardX + 20.5, rowY - 0.4, '✓', { fill: p.labelInverted, family: uiFont, size: 6, anchor: 'middle', weight: 700 }),
    )
    parts.push(text(cardX + 30, rowY, rowLabel, { fill: p.labelPrimary, family: uiFont, size: 10.5 }))
    parts.push(
      text(cardX + cardWidth - 14, rowY, copy.panelRowValues[index] ?? '', {
        fill: p.labelTertiary,
        family: uiFont,
        size: 9.5,
        anchor: 'end',
      }),
    )
  })

  // Third row: safe progress demo (no fixed z-index, no animation).
  const progressY = cardTop + 84
  parts.push(text(cardX + 30, progressY + 3, copy.panelProgress, { fill: p.labelSecondary, family: uiFont, size: 10 }))
  const barX = cardX + 150
  const barWidth = cardWidth - 150 - 50
  parts.push(box(barX, progressY - 2, barWidth, 5, { fill: p.layer3, rx: 2.5 }))
  parts.push(box(barX, progressY - 2, Math.round(barWidth * 0.82), 5, { fill: p.brand, rx: 2.5 }))
  parts.push(
    text(cardX + cardWidth - 14, progressY + 3, 'OK', {
      fill: p.labelTertiary,
      family: ctx.codeFont,
      size: 8.5,
      anchor: 'end',
    }),
  )
  return parts
}

function renderComposer(ctx: Ctx): string[] {
  const { palette: p, copy, uiFont } = ctx
  const parts: string[] = []
  const x = 254
  const width = 364
  const y = 332
  const height = 52
  parts.push(box(x, y, width, height, { fill: p.input, stroke: p.borderL2, strokeWidth: 1, rx: 12 }))
  parts.push(line(x + 12, y + 12, x + 12, y + 22, p.borderL3))
  parts.push(text(x + 14, y + 21, copy.placeholder, { fill: p.labelTertiary, family: uiFont, size: 11 }))
  parts.push(text(x + 14, y + 37, copy.composerHint, { fill: p.labelCaption, family: uiFont, size: 8.5 }))
  parts.push(dot(x + width - 24, y + height / 2, 13, p.brand))
  parts.push(
    `<path d="M ${num(x + width - 24)} ${num(y + height / 2 - 5)} L ${num(x + width - 19)} ${num(y + height / 2)} L ${num(x + width - 24)} ${num(y + height / 2 + 5)}" fill="none" stroke="${toHex(p.labelInverted)}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  )
  return parts
}

function materialDefs(ctx: Ctx): string[] {
  if (ctx.surfaceStyle !== 'glass') return []
  return [
    '<defs>',
    '<linearGradient id="glassGlow" x1="0" y1="0" x2="0" y2="1">',
    `<stop offset="0" stop-color="${toHex(ctx.palette.brand)}" stop-opacity="0.16"/>`,
    `<stop offset="1" stop-color="${toHex(ctx.palette.brand)}" stop-opacity="0"/>`,
    '</linearGradient>',
    '</defs>',
  ]
}

function materialBackdrop(ctx: Ctx): string[] {
  if (ctx.surfaceStyle === 'solid') return []
  if (ctx.surfaceStyle === 'glass') {
    return [
      box(PREVIEW_SIDEBAR_WIDTH, 0, PREVIEW_WIDTH - PREVIEW_SIDEBAR_WIDTH, 168, { fill: ctx.palette.brand, opacity: 0.1 }),
      `<rect x="${PREVIEW_SIDEBAR_WIDTH}" y="0" width="${PREVIEW_WIDTH - PREVIEW_SIDEBAR_WIDTH}" height="168" fill="url(#glassGlow)"/>`,
    ]
  }
  return [box(248, 46, 384, 276, { fill: ctx.palette.layer1, rx: 18, opacity: 0.55 })]
}

function renderScene(livery: PreviewLivery, locale: DshLocaleId, mode: Mode): string {
  const tag = LOCALE_TAG[locale]
  const copy = COPY[locale]
  const name = livery.meta.name[tag]
  const typography = livery.typography
  const metrics = typography.metrics[tag]
  const palette = buildPalette(livery, mode)
  const contentLine = Math.round(12 * metrics.lineHeight)
  const ctx: Ctx = {
    palette,
    copy,
    uiFont: typography.ui[tag],
    contentFont: typography.content[tag],
    codeFont: typography.code,
    uiLine: metrics.lineHeight,
    contentLine,
    mode,
    name,
    surfaceStyle: livery.layout.surfaceStyle,
  }

  const title = `${name} · ${locale === 'zh' ? '中文' : 'English'} · ${mode === 'light' ? 'Light' : 'Dark'}`
  const description = `${livery.meta.description[tag]} [${livery.id}/${locale}/${mode}] Fixed contract preview rendered from compiled livery tokens.`
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" viewBox="0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}" role="img" aria-labelledby="title desc" data-livery="${xmlEscape(livery.id)}" data-locale="${locale}" data-mode="${mode}">`,
    `<title id="title">${xmlEscape(title)}</title>`,
    `<desc id="desc">${xmlEscape(description)}</desc>`,
    ...materialDefs(ctx),
    box(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT, { fill: palette.page }),
    ...renderSidebar(ctx),
    ...renderHeader(ctx),
    ...materialBackdrop(ctx),
    ...renderTranscript(ctx),
    ...renderComposer(ctx),
    '</svg>',
  ]
  return `${parts.join('\n')}\n`
}

const PREVIEW_SEPARATOR = '-'

/** Canonical preview filename for one livery / locale / mode com. */
export function previewFileName(id: string, locale: DshLocaleId, mode: Mode): string {
  return `${id}${PREVIEW_SEPARATOR}${locale}${PREVIEW_SEPARATOR}${mode}.svg`
}

/** All four deterministic previews for one livery, in stable order. */
export function renderPreviewSet(livery: PreviewLivery): { readonly file: string; readonly content: string }[] {
  const files: { file: string; content: string }[] = []
  for (const locale of PREVIEW_LOCALES) {
    for (const mode of PREVIEW_MODES) {
      files.push({
        file: previewFileName(livery.id, locale, mode),
        content: renderScene(livery, locale, mode),
      })
    }
  }
  return files
}

/** Render a single preview; exported for tests and ad-hoc inspection. */
export function renderPreview(livery: PreviewLivery, locale: DshLocaleId, mode: Mode): string {
  return renderScene(livery, locale, mode)
}

/** Localized fixture copy, exported for tests that assert real copy per locale. */
export function previewCopy(locale: DshLocaleId): PreviewCopy {
  return COPY[locale]
}
