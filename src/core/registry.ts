/**
 * DSH Livery — typography / metrics / surface-style / tag registries.
 *
 * Raw font stacks never appear in a manifest: manifests reference these stable
 * ids. All stacks are local-only (never loaded from the network). CSS font
 * families are only requested; the host browser resolves them. Surface-style
 * recipes are token-only: they may only emit the frozen shape / elevation /
 * material / border token families validated by `src/core/audit.ts`, plus radius
 * scale values already consumed by the host.
 *
 * Frozen contract: docs/design/style-system.md §1.
 */

import type {
  FontId,
  FontStackDefinition,
  LiveryManifest,
  LocaleId,
  MetricsDefinition,
  MetricsId,
  ResolvedTypography,
  SurfaceStyleDefinition,
  SurfaceStyleId,
  TagDefinition,
  TagId,
} from './types.js'
import { assertMetricTokens, assertStyleTokenMap } from './audit.js'

/** Frozen font registry: system stacks first, then the v2 local-only stacks. */
export const FONT_STACKS: Readonly<Record<FontId, FontStackDefinition>> = {
  'system-cjk': {
    id: 'system-cjk',
    stack: '"PingFang SC", "Microsoft YaHei UI", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif',
    note: 'System CJK UI stack; no network font is loaded.',
  },
  'system-latin': {
    id: 'system-latin',
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    note: 'System Latin UI stack; no network font is loaded.',
  },
  'system-mono': {
    id: 'system-mono',
    stack: '"SFMono-Regular", Consolas, "Liberation Mono", "Noto Sans Mono CJK SC", monospace',
    note: 'System monospace stack with CJK fallback; no network font is loaded.',
  },
  'serif-cjk': {
    id: 'serif-cjk',
    stack: '"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", serif',
    note: 'Local CJK serif/song stack; no network font is loaded.',
  },
  'serif-latin': {
    id: 'serif-latin',
    stack: '"Iowan Old Style", "Palatino", "Palatino Linotype", Georgia, "Times New Roman", serif',
    note: 'Local Latin serif book stack; no network font is loaded.',
  },
  'humanist-cjk': {
    id: 'humanist-cjk',
    stack: '"Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei UI", sans-serif',
    note: 'Local humanist CJK sans stack; no network font is loaded.',
  },
  'humanist-latin': {
    id: 'humanist-latin',
    stack: '"Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", Helvetica, sans-serif',
    note: 'Local humanist Latin sans stack; no network font is loaded.',
  },
  'display-latin': {
    id: 'display-latin',
    stack: '"Futura", "Avenir Next", "Trebuchet MS", "Century Gothic", sans-serif',
    note: 'Local geometric display stack; no network font is loaded.',
  },
  'rounded-latin': {
    id: 'rounded-latin',
    stack: '"SF Pro Rounded", "Arial Rounded MT Bold", "Avenir Next", "Trebuchet MS", system-ui, sans-serif',
    note: 'Local rounded sans stack; no network font is loaded.',
  },
  'tech-latin': {
    id: 'tech-latin',
    stack: '"SF Mono", "JetBrains Mono", Menlo, Consolas, "Liberation Mono", monospace',
    note: 'Local technical monospace stack; no network font is loaded.',
  },
}

/**
 * Typography metric profiles. `lineHeight` is design metadata (the host owns
 * body leading); `tokens` are the mode-independent consumed font-token overrides
 * allowed by docs/design/style-system.md §1. Legacy profiles keep empty
 * token maps so existing liveries keep their established rendering bytes.
 */
export const METRICS: Readonly<Record<MetricsId, MetricsDefinition>> = {
  'cjk-comfortable': {
    id: 'cjk-comfortable',
    lineHeight: 1.55,
    note: 'Comfortable CJK body leading target (docs/design/implementation-plan.md §11.1).',
    tokens: {},
  },
  'latin-default': {
    id: 'latin-default',
    lineHeight: 1.45,
    note: 'Default Latin body leading target (docs/design/implementation-plan.md §11.2).',
    tokens: {},
  },
  /** Legacy-compatible alias of `cjk-comfortable` for the v2 design table. */
  comfortable: {
    id: 'comfortable',
    lineHeight: 1.55,
    note: 'Comfortable body leading; additive v2 alias of cjk-comfortable.',
    tokens: {},
  },
  compact: {
    id: 'compact',
    lineHeight: 1.35,
    note: 'Dense reading profile for information-heavy surfaces.',
    tokens: {},
  },
  airy: {
    id: 'airy',
    lineHeight: 1.75,
    note: 'Generous leading profile for long-form reading.',
    tokens: {},
  },
  editorial: {
    id: 'editorial',
    lineHeight: 1.6,
    note: 'Editorial scale: generous body leading, larger small caps and headings.',
    tokens: {
      '--dsw-font-xxxs-11': '11px/15px var(--dsw-font-family)',
      '--dsw-font-xxs-12': '12px/19px var(--dsw-font-family)',
      '--dsw-font-xs-13': '13px/21px var(--dsw-font-family)',
      '--dsw-font-xs-strong-13': '500 13px/21px var(--dsw-font-family)',
      '--dsw-font-s-14': '14px/23px var(--dsw-font-family)',
      '--dsw-font-l-20': '500 21px/30px var(--dsw-font-family)',
      '--dsw-font-markdown-small': '12px/21px var(--dsw-font-family)',
    },
  },
  punchy: {
    id: 'punchy',
    lineHeight: 1.35,
    note: 'Punchy scale: tight leading, heavier small labels, display brand row.',
    tokens: {
      '--dsw-font-xxxs-11': '11px/13px var(--dsw-font-family)',
      '--dsw-font-xxs-12': '12px/16px var(--dsw-font-family)',
      '--dsw-font-xs-13': '13px/17px var(--dsw-font-family)',
      '--dsw-font-xs-strong-13': '700 13px/17px var(--dsw-font-family)',
      '--dsw-font-s-14': '14px/19px var(--dsw-font-family)',
      '--dsw-font-l-20': '700 22px/26px var(--dsw-font-family)',
      '--dsw-font-markdown-small': '12px/17px var(--dsw-font-family)',
      '--dsw-font-family-brand': '"Futura", "Avenir Next", var(--dsw-font-family)',
    },
  },
  technical: {
    id: 'technical',
    lineHeight: 1.5,
    note: 'Technical scale: compact mono-adjacent labels and a tighter heading step.',
    tokens: {
      '--dsw-font-xxxs-11': '11px/14px var(--dsw-font-family)',
      '--dsw-font-xxs-12': '12px/16px var(--dsw-font-family)',
      '--dsw-font-xs-13': '13px/18px var(--dsw-font-family)',
      '--dsw-font-xs-strong-13': '600 13px/18px var(--dsw-font-family)',
      '--dsw-font-s-14': '14px/20px var(--dsw-font-family)',
      '--dsw-font-l-20': '500 19px/26px var(--dsw-font-family)',
      '--dsw-font-markdown-small': '11px/18px var(--dsw-font-family)',
    },
  },
  quiet: {
    id: 'quiet',
    lineHeight: 1.6,
    note: 'Quiet scale: calmer small text rhythm and a lighter heading step.',
    tokens: {
      '--dsw-font-xxxs-11': '11px/16px var(--dsw-font-family)',
      '--dsw-font-xxs-12': '12px/19px var(--dsw-font-family)',
      '--dsw-font-xs-13': '13px/22px var(--dsw-font-family)',
      '--dsw-font-xs-strong-13': '500 13px/22px var(--dsw-font-family)',
      '--dsw-font-s-14': '14px/24px var(--dsw-font-family)',
      '--dsw-font-l-20': '500 19px/30px var(--dsw-font-family)',
      '--dsw-font-markdown-small': '12px/22px var(--dsw-font-family)',
    },
  },
}

// ---------------------------------------------------------------------------
// Surface styles (token-only module shape / elevation / material / borders)
// ---------------------------------------------------------------------------

const RADIUS_SOFT = {
  '--dsw-radius-xs': '6px',
  '--dsw-radius-sm': '10px',
  '--dsw-radius-md': '14px',
  '--dsw-radius-lg': '18px',
  '--dsw-radius-xl': '24px',
  '--dsw-radius-panel': '30px',
} as const

const SHADOWS_SOFT = {
  '--dsw-shadow-lv1': '0 2px 8px 0 #0000000d',
  '--dsw-shadow-lv1-blur': '0 4px 16px 0 #00000008',
  '--dsw-shadow-lv2': '0 4px 16px 0 #00000008, 0 2px 10px 0 #0000000a',
  '--dsw-shadow-lv3': '0 0 1px 0 #0003, 0 0 6px 0 #00000005, 0 14px 36px 0 #00000014',
  '--dsw-elevation-panel': 'var(--dsw-elevation-stroke), 0 4px 16px 0 #00000008, 0 0 20px 0 #00000005',
  '--dsw-elevation-prominent': 'var(--dsw-elevation-stroke), 0 6px 20px 0 #00000008, 0 0 24px 0 #00000008',
  '--dsw-elevation-soft': 'var(--dsw-elevation-stroke), 0 8px 24px 0 #00000008, 0 0 32px 0 #00000005',
} as const

const NO_SHADOWS = {
  '--dsw-shadow-lv1': 'none',
  '--dsw-shadow-lv1-blur': 'none',
  '--dsw-shadow-lv2': 'none',
  '--dsw-shadow-lv3': 'none',
  '--dsw-elevation-panel': 'none',
  '--dsw-elevation-prominent': 'none',
  '--dsw-elevation-soft': 'none',
} as const

const BORDERS_FLAT_LIGHT = {
  '--dsw-alias-border-l1': 'rgba(0, 0, 0, 0.08)',
  '--dsw-alias-border-l2': 'rgba(0, 0, 0, 0.14)',
  '--dsw-alias-border-l3': 'rgba(0, 0, 0, 0.18)',
  '--dsw-alias-border-l4': 'rgba(0, 0, 0, 0.24)',
} as const

const BORDERS_FLAT_DARK = {
  '--dsw-alias-border-l1': 'rgba(255, 255, 255, 0.08)',
  '--dsw-alias-border-l2': 'rgba(255, 255, 255, 0.14)',
  '--dsw-alias-border-l3': 'rgba(255, 255, 255, 0.18)',
  '--dsw-alias-border-l4': 'rgba(255, 255, 255, 0.24)',
} as const

const BORDERS_STRONG_LIGHT = {
  '--dsw-alias-border-l1': 'rgba(0, 0, 0, 0.1)',
  '--dsw-alias-border-l2': 'rgba(0, 0, 0, 0.16)',
  '--dsw-alias-border-l3': 'rgba(0, 0, 0, 0.22)',
  '--dsw-alias-border-l4': 'rgba(0, 0, 0, 0.28)',
} as const

const BORDERS_STRONG_DARK = {
  '--dsw-alias-border-l1': 'rgba(255, 255, 255, 0.1)',
  '--dsw-alias-border-l2': 'rgba(255, 255, 255, 0.16)',
  '--dsw-alias-border-l3': 'rgba(255, 255, 255, 0.22)',
  '--dsw-alias-border-l4': 'rgba(255, 255, 255, 0.28)',
} as const

/** Warm paper hairlines (light) and warm ink hairlines (dark). */
const BORDERS_PAPER_LIGHT = {
  '--dsw-alias-border-l1': 'rgba(120, 90, 50, 0.14)',
  '--dsw-alias-border-l2': 'rgba(120, 90, 50, 0.2)',
  '--dsw-alias-border-l3': 'rgba(120, 90, 50, 0.26)',
  '--dsw-alias-border-l4': 'rgba(120, 90, 50, 0.34)',
} as const

const BORDERS_PAPER_DARK = {
  '--dsw-alias-border-l1': 'rgba(230, 210, 180, 0.12)',
  '--dsw-alias-border-l2': 'rgba(230, 210, 180, 0.18)',
  '--dsw-alias-border-l3': 'rgba(230, 210, 180, 0.24)',
  '--dsw-alias-border-l4': 'rgba(230, 210, 180, 0.32)',
} as const

/** Frozen surface-style registry (token-only recipes). */
export const SURFACE_STYLE_DEFINITIONS: Readonly<Record<SurfaceStyleId, SurfaceStyleDefinition>> = {
  solid: {
    id: 'solid',
    note: 'Host stock geometry and elevation; only palette/type-sale difference.',
    light: {},
    dark: {},
  },
  soft: {
    id: 'soft',
    note: 'Softer 6/10/14 radius scale with diffuse shadows.',
    light: { ...RADIUS_SOFT, ...SHADOWS_SOFT },
    dark: { ...RADIUS_SOFT, ...SHADOWS_SOFT },
  },
  glass: {
    id: 'glass',
    note: 'Large radius with backdrop blur / saturation material.',
    light: {
      '--dsw-radius-xs': '10px',
      '--dsw-radius-sm': '14px',
      '--dsw-radius-md': '18px',
      '--dsw-radius-lg': '24px',
      '--dsw-radius-xl': '28px',
      '--dsw-radius-panel': '36px',
      '--dsw-menu-backdrop-filter': 'blur(40px) saturate(150%)',
      '--dsw-mask-blur': 'blur(24px)',
      '--dsw-focus-ring-width': '2px',
      ...SHADOWS_SOFT,
    },
    dark: {
      '--dsw-radius-xs': '10px',
      '--dsw-radius-sm': '14px',
      '--dsw-radius-md': '18px',
      '--dsw-radius-lg': '24px',
      '--dsw-radius-xl': '28px',
      '--dsw-radius-panel': '36px',
      '--dsw-menu-backdrop-filter': 'blur(40px) saturate(150%)',
      '--dsw-mask-blur': 'blur(24px)',
      '--dsw-focus-ring-width': '2px',
      ...SHADOWS_SOFT,
    },
  },
  flat: {
    id: 'flat',
    note: 'Small 4/8/12 radius, zero shadows, hairline borders.',
    light: {
      '--dsw-radius-xs': '4px',
      '--dsw-radius-sm': '8px',
      '--dsw-radius-md': '12px',
      '--dsw-radius-lg': '12px',
      '--dsw-radius-xl': '16px',
      '--dsw-radius-panel': '20px',
      ...NO_SHADOWS,
      ...BORDERS_FLAT_LIGHT,
    },
    dark: {
      '--dsw-radius-xs': '4px',
      '--dsw-radius-sm': '8px',
      '--dsw-radius-md': '12px',
      '--dsw-radius-lg': '12px',
      '--dsw-radius-xl': '16px',
      '--dsw-radius-panel': '20px',
      ...NO_SHADOWS,
      ...BORDERS_FLAT_DARK,
    },
  },
  sharp: {
    id: 'sharp',
    note: 'Tight 2/4/6 geometry with hard one-pixel shadows and stronger borders.',
    light: {
      '--dsw-radius-xs': '2px',
      '--dsw-radius-sm': '4px',
      '--dsw-radius-md': '6px',
      '--dsw-radius-lg': '6px',
      '--dsw-radius-xl': '8px',
      '--dsw-radius-panel': '10px',
      '--dsw-corner-shape': 'superellipse(1.2)',
      '--dsw-shadow-lv1': '0 1px 0 0 #00000014',
      '--dsw-shadow-lv1-blur': '0 1px 0 0 #0000000a',
      '--dsw-shadow-lv2': '0 2px 0 0 #00000014',
      '--dsw-shadow-lv3': '0 3px 0 0 #0000001a',
      ...BORDERS_STRONG_LIGHT,
    },
    dark: {
      '--dsw-radius-xs': '2px',
      '--dsw-radius-sm': '4px',
      '--dsw-radius-md': '6px',
      '--dsw-radius-lg': '6px',
      '--dsw-radius-xl': '8px',
      '--dsw-radius-panel': '10px',
      '--dsw-corner-shape': 'superellipse(1.2)',
      '--dsw-shadow-lv1': '0 1px 0 0 #ffffff14',
      '--dsw-shadow-lv1-blur': '0 1px 0 0 #ffffff0a',
      '--dsw-shadow-lv2': '0 2px 0 0 #ffffff14',
      '--dsw-shadow-lv3': '0 3px 0 0 #ffffff1a',
      ...BORDERS_STRONG_DARK,
    },
  },
  rounded: {
    id: 'rounded',
    note: 'Generous 10/16/24 radius with a 32px panel and soft shadows.',
    light: {
      '--dsw-radius-xs': '10px',
      '--dsw-radius-sm': '16px',
      '--dsw-radius-md': '24px',
      '--dsw-radius-lg': '26px',
      '--dsw-radius-xl': '32px',
      '--dsw-radius-panel': '32px',
      '--dsw-corner-shape': 'superellipse(1.8)',
      ...SHADOWS_SOFT,
    },
    dark: {
      '--dsw-radius-xs': '10px',
      '--dsw-radius-sm': '16px',
      '--dsw-radius-md': '24px',
      '--dsw-radius-lg': '26px',
      '--dsw-radius-xl': '32px',
      '--dsw-radius-panel': '32px',
      '--dsw-corner-shape': 'superellipse(1.8)',
      ...SHADOWS_SOFT,
    },
  },
  paper: {
    id: 'paper',
    note: 'Flat 2/4/8 print geometry with warm hairlines and no shadows.',
    light: {
      '--dsw-radius-xs': '2px',
      '--dsw-radius-sm': '4px',
      '--dsw-radius-md': '8px',
      '--dsw-radius-lg': '10px',
      '--dsw-radius-xl': '14px',
      '--dsw-radius-panel': '18px',
      '--dsw-corner-shape': 'superellipse(1.5)',
      ...NO_SHADOWS,
      ...BORDERS_PAPER_LIGHT,
    },
    dark: {
      '--dsw-radius-xs': '2px',
      '--dsw-radius-sm': '4px',
      '--dsw-radius-md': '8px',
      '--dsw-radius-lg': '10px',
      '--dsw-radius-xl': '14px',
      '--dsw-radius-panel': '18px',
      '--dsw-corner-shape': 'superellipse(1.5)',
      ...NO_SHADOWS,
      ...BORDERS_PAPER_DARK,
    },
  },
  elevated: {
    id: 'elevated',
    note: '8/12/20 radius with prominent layered shadows.',
    light: {
      '--dsw-radius-xs': '8px',
      '--dsw-radius-sm': '12px',
      '--dsw-radius-md': '20px',
      '--dsw-radius-lg': '24px',
      '--dsw-radius-xl': '32px',
      '--dsw-radius-panel': '40px',
      '--dsw-shadow-lv1': '0 3px 6px 0 #0000000f',
      '--dsw-shadow-lv1-blur': '0 6px 20px 0 #0000000a',
      '--dsw-shadow-lv2': '0 8px 20px 0 #00000012, 0 2px 8px 0 #0000000a',
      '--dsw-shadow-lv3': '0 0 1px 0 #0003, 0 6px 16px 0 #0000000a, 0 24px 48px 0 #0000001a',
    },
    dark: {
      '--dsw-radius-xs': '8px',
      '--dsw-radius-sm': '12px',
      '--dsw-radius-md': '20px',
      '--dsw-radius-lg': '24px',
      '--dsw-radius-xl': '32px',
      '--dsw-radius-panel': '40px',
      '--dsw-shadow-lv1': '0 3px 6px 0 #00000026',
      '--dsw-shadow-lv1-blur': '0 6px 20px 0 #0000001a',
      '--dsw-shadow-lv2': '0 8px 20px 0 #00000029, 0 2px 8px 0 #0000001f',
      '--dsw-shadow-lv3': '0 0 1px 0 #0006, 0 6px 16px 0 #0000001f, 0 24px 48px 0 #0000003d',
    },
  },
  terminal: {
    id: 'terminal',
    note: 'Square 0/2/4 mono-density geometry, no shadows, crisp borders.',
    light: {
      '--dsw-radius-xs': '0',
      '--dsw-radius-sm': '2px',
      '--dsw-radius-md': '4px',
      '--dsw-radius-lg': '4px',
      '--dsw-radius-xl': '6px',
      '--dsw-radius-panel': '8px',
      '--dsw-corner-shape': 'superellipse(0.8)',
      ...NO_SHADOWS,
      '--dsw-menu-backdrop-filter': 'none',
      '--dsw-mask-blur': 'none',
      '--dsw-focus-ring-width': '2px',
      ...BORDERS_STRONG_LIGHT,
    },
    dark: {
      '--dsw-radius-xs': '0',
      '--dsw-radius-sm': '2px',
      '--dsw-radius-md': '4px',
      '--dsw-radius-lg': '4px',
      '--dsw-radius-xl': '6px',
      '--dsw-radius-panel': '8px',
      '--dsw-corner-shape': 'superellipse(0.8)',
      ...NO_SHADOWS,
      '--dsw-menu-backdrop-filter': 'none',
      '--dsw-mask-blur': 'none',
      '--dsw-focus-ring-width': '2px',
      ...BORDERS_STRONG_DARK,
    },
  },
}

/** Registered surface-style ids, in registry order. */
export const SURFACE_STYLES: readonly SurfaceStyleId[] = Object.keys(
  SURFACE_STYLE_DEFINITIONS,
) as SurfaceStyleId[]

/** All registered style token names across every family (frozen families). */
export const STYLE_TOKEN_NAMES: readonly string[] = [
  '--dsw-radius-xs',
  '--dsw-radius-sm',
  '--dsw-radius-md',
  '--dsw-radius-lg',
  '--dsw-radius-xl',
  '--dsw-radius-panel',
  '--dsw-corner-shape',
  '--dsw-shadow-lv1',
  '--dsw-shadow-lv1-blur',
  '--dsw-shadow-lv2',
  '--dsw-shadow-lv3',
  '--dsw-elevation-panel',
  '--dsw-elevation-prominent',
  '--dsw-elevation-soft',
  '--dsw-elevation-stroke',
  '--dsw-elevation-stroke-color',
  '--dsw-menu-backdrop-filter',
  '--dsw-mask-blur',
  '--dsw-focus-ring-width',
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-border-l3',
  '--dsw-alias-border-l4',
] as const

/**
 * @deprecated Use `SURFACE_STYLE_DEFINITIONS`; kept for pre-v2 callers that only
 * need the registered id list.
 */
export const SURFACE_STYLE_IDS: readonly SurfaceStyleId[] = SURFACE_STYLES

/** Stable tag ids; display names live here, never in a manifest. */
export const TAGS: readonly TagDefinition[] = [
  { id: 'calm', label: { 'zh-CN': '宁静', 'en-US': 'Calm' } },
  { id: 'cool', label: { 'zh-CN': '冷调', 'en-US': 'Cool' } },
  { id: 'warm', label: { 'zh-CN': '暖调', 'en-US': 'Warm' } },
  { id: 'neutral', label: { 'zh-CN': '中性', 'en-US': 'Neutral' } },
  { id: 'deep', label: { 'zh-CN': '深邃', 'en-US': 'Deep' } },
  { id: 'elegant', label: { 'zh-CN': '雅致', 'en-US': 'Elegant' } },
  { id: 'playful', label: { 'zh-CN': '俏皮', 'en-US': 'Playful' } },
  { id: 'contrast', label: { 'zh-CN': '高对比', 'en-US': 'High contrast' } },
  { id: 'muted', label: { 'zh-CN': '低饱和', 'en-US': 'Muted' } },
  { id: 'classic', label: { 'zh-CN': '经典', 'en-US': 'Classic' } },
  { id: 'retro', label: { 'zh-CN': '复古', 'en-US': 'Retro' } },
  { id: 'paper', label: { 'zh-CN': '纸感', 'en-US': 'Paper' } },
  { id: 'ink', label: { 'zh-CN': '墨感', 'en-US': 'Ink' } },
  { id: 'neon', label: { 'zh-CN': '霓虹', 'en-US': 'Neon' } },
  { id: 'organic', label: { 'zh-CN': '自然', 'en-US': 'Organic' } },
  { id: 'tech', label: { 'zh-CN': '科技', 'en-US': 'Tech' } },
] as const

/** All registered tag ids, frozen. */
export const TAG_IDS: readonly TagId[] = TAGS.map((tag) => tag.id)

/** Locales every livery must resolve typography for. */
export const TYPOGRAPHY_LOCALES: readonly LocaleId[] = ['zh-CN', 'en-US'] as const

/** Look up a font stack by registry id. Throws for any unregistered id. */
export function fontStackOf(id: FontId): string {
  const definition = FONT_STACKS[id]
  if (definition === undefined) {
    throw new RangeError(`Unknown font registry id: ${JSON.stringify(id)}`)
  }
  return definition.stack
}

/** Look up a metrics profile by id. Throws for any unregistered id. */
export function metricsOf(id: MetricsId): MetricsDefinition {
  const definition = METRICS[id]
  if (definition === undefined) {
    throw new RangeError(`Unknown metrics profile id: ${JSON.stringify(id)}`)
  }
  return definition
}

/** Look up a surface style by id. Throws for any unregistered id. */
export function surfaceStyleOf(id: SurfaceStyleId): SurfaceStyleDefinition {
  const definition = SURFACE_STYLE_DEFINITIONS[id]
  if (definition === undefined) {
    throw new RangeError(`Unknown surface style id: ${JSON.stringify(id)}`)
  }
  return definition
}

function resolveStack(id: FontId, role: string, locale: LocaleId): string {
  try {
    return fontStackOf(id)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new RangeError(`Invalid ${role} font for ${locale}: ${reason}`)
  }
}

function resolveMetrics(id: MetricsId, locale: LocaleId): MetricsDefinition {
  try {
    return metricsOf(id)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new RangeError(`Invalid metrics profile for ${locale}: ${reason}`)
  }
}

/**
 * Resolve a manifest's locale-specific font ids and metric ids into concrete
 * stacks / definitions. Throws for any id outside the registry.
 */
export function resolveTypography(manifest: LiveryManifest): ResolvedTypography {
  const { typography } = manifest
  const ui: Record<LocaleId, string> = {
    'zh-CN': resolveStack(typography.ui['zh-CN'], 'ui', 'zh-CN'),
    'en-US': resolveStack(typography.ui['en-US'], 'ui', 'en-US'),
  }
  const content: Record<LocaleId, string> = {
    'zh-CN': resolveStack(typography.content['zh-CN'], 'content', 'zh-CN'),
    'en-US': resolveStack(typography.content['en-US'], 'content', 'en-US'),
  }
  const metrics: Record<LocaleId, MetricsDefinition> = {
    'zh-CN': resolveMetrics(typography.metrics['zh-CN'], 'zh-CN'),
    'en-US': resolveMetrics(typography.metrics['en-US'], 'en-US'),
  }
  return {
    ui,
    content,
    code: resolveStack(typography.code, 'code', 'zh-CN'),
    metrics,
  }
}

// Core-owned registry data is validated against the frozen allowlist at module
// load time: a bad value can never reach a compiled catalog. (Data errors throw;
// user manifests are validated by the compiler schema.)
for (const [id, metrics] of Object.entries(METRICS)) {
  assertMetricTokens(metrics.tokens, `metrics:${id}`)
}
for (const [id, definition] of Object.entries(SURFACE_STYLE_DEFINITIONS)) {
  assertStyleTokenMap(definition.light, `surface:${id}:light`)
  assertStyleTokenMap(definition.dark, `surface:${id}:dark`)
}
