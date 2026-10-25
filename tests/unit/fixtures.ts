/**
 * Unit-test fixtures: ten representative manifests built directly as data.
 *
 * The compiler owns the shipped `liveries/*.json` manifests; these fixtures
 * exercise the same contract with deliberately different palettes, metrics,
 * surface materials and layout recipes so the core modules are covered before
 * the compiled catalog exists (and independently of it).
 */

import type {
  ConversationWidthId,
  DensityId,
  FontId,
  LiveryManifest,
  MessageFlowId,
  MetricsId,
  Seeds,
  SurfaceStyleId,
  TagId,
} from '../../src/core/types.js'
import { SCHEMA_VERSION } from '../../src/core/types.js'

export interface FixtureOptions {
  readonly tags?: readonly TagId[]
  readonly order?: number
  readonly uiZh?: FontId
  readonly uiEn?: FontId
  readonly contentZh?: FontId
  readonly contentEn?: FontId
  readonly code?: FontId
  readonly metricsZh?: MetricsId
  readonly metricsEn?: MetricsId
  readonly density?: DensityId
  readonly conversationWidth?: ConversationWidthId
  readonly messageFlow?: MessageFlowId
  readonly surfaceStyle?: SurfaceStyleId
  readonly required?: LiveryManifest['compat']['requiredCapabilities']
  readonly optional?: LiveryManifest['compat']['optionalCapabilities']
  readonly tokenOverrides?: {
    readonly light?: Record<string, string>
    readonly dark?: Record<string, string>
  }
}

function seeds(accent: string, secondary: string, surface: string, text: string): Seeds {
  return { accent, secondary, surface, text }
}

/** Build a complete schemaVersion 1 manifest from two seed sets. */
export function makeManifest(
  id: string,
  light: Seeds,
  dark: Seeds,
  options: FixtureOptions = {},
): LiveryManifest {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    meta: {
      name: { 'zh-CN': `测试-${id}`, 'en-US': `Fixture ${id}` },
      description: { 'zh-CN': '单元测试皮肤', 'en-US': 'Unit test livery' },
      tags: options.tags ?? ['calm', 'neutral'],
      order: options.order ?? 100,
    },
    variants: {
      light: {
        seeds: light,
        ...(options.tokenOverrides?.light === undefined ? {} : { tokens: options.tokenOverrides.light }),
      },
      dark: {
        seeds: dark,
        ...(options.tokenOverrides?.dark === undefined ? {} : { tokens: options.tokenOverrides.dark }),
      },
    },
    typography: {
      ui: { 'zh-CN': options.uiZh ?? 'system-cjk', 'en-US': options.uiEn ?? 'system-latin' },
      content: { 'zh-CN': options.contentZh ?? 'system-cjk', 'en-US': options.contentEn ?? 'system-latin' },
      code: options.code ?? 'system-mono',
      metrics: {
        'zh-CN': options.metricsZh ?? 'cjk-comfortable',
        'en-US': options.metricsEn ?? 'latin-default',
      },
    },
    layout: {
      density: options.density ?? 'host',
      conversationWidth: options.conversationWidth ?? 'host',
      messageFlow: options.messageFlow ?? 'stock',
      surfaceStyle: options.surfaceStyle ?? 'solid',
    },
    compat: {
      requiredCapabilities: options.required ?? ['theme-css', 'host-font-family'],
      optionalCapabilities:
        options.optional ?? [
          'surface-material',
          'host-density-tokens',
          'host-transcript-width',
          'host-message-flow',
          'reduced-transparency',
          'forced-colors',
        ],
    },
  }
}

/** Ten palettes spanning cool/warm/neutral/high-contrast/muted/deep/playful. */
export const FIXTURE_MANIFESTS: readonly LiveryManifest[] = [
  makeManifest(
    'fixture-fjord',
    seeds('#5b7c99', '#8ba7bd', '#f0f3f6', '#1b2733'),
    seeds('#8fb3d1', '#7098b8', '#181c21', '#eef2f6'),
    { tags: ['calm', 'cool'], order: 100 },
  ),
  makeManifest(
    'fixture-ember',
    seeds('#b25c3a', '#d59b7a', '#faf4ee', '#2a1d17'),
    seeds('#e08a5f', '#c47a55', '#211a16', '#f7ece3'),
    { tags: ['warm', 'playful'], order: 110 },
  ),
  makeManifest(
    'fixture-graphite',
    seeds('#4a4a4c', '#8a8a8e', '#f7f7f8', '#101012'),
    seeds('#a8a8ae', '#8c8c92', '#0e0e10', '#f5f5f7'),
    { tags: ['neutral', 'classic'], order: 120 },
  ),
  makeManifest(
    'fixture-moss',
    seeds('#4f7a52', '#93b394', '#f4f8f3', '#1c2b1d'),
    seeds('#83b886', '#6d9a70', '#141f15', '#edf4ec'),
    { tags: ['calm', 'warm'], order: 130 },
  ),
  makeManifest(
    'fixture-royal',
    seeds('#3b5bdb', '#8da2fb', '#f3f5fe', '#141a2e'),
    seeds('#7c96f7', '#6b81d6', '#111528', '#eef1fb'),
    { tags: ['deep', 'contrast'], order: 140 },
  ),
  makeManifest(
    'fixture-rose',
    seeds('#b34a6e', '#d68ba2', '#fdf3f6', '#2e1620'),
    seeds('#d9809c', '#b36a80', '#241318', '#fbeef3'),
    { tags: ['warm', 'elegant'], order: 150 },
  ),
  makeManifest(
    'fixture-slate-glass',
    seeds('#527a8c', '#7fa6b6', '#eef4f6', '#152228'),
    seeds('#8ab7c9', '#6f99a9', '#141e23', '#e8f2f5'),
    {
      tags: ['cool', 'deep'],
      order: 160,
      surfaceStyle: 'glass',
      density: 'compact',
      conversationWidth: 'focused',
    },
  ),
  makeManifest(
    'fixture-sand',
    seeds('#a1804e', '#c9b08a', '#faf7f0', '#2a2317'),
    seeds('#c9a86f', '#a98c60', '#211d16', '#f6f1e6'),
    { tags: ['warm', 'muted'], order: 170, surfaceStyle: 'soft' },
  ),
  makeManifest(
    'fixture-contrast',
    seeds('#1449d4', '#4f8bf5', '#ffffff', '#000000'),
    seeds('#9dbcff', '#85a9f7', '#050608', '#ffffff'),
    {
      tags: ['contrast', 'classic'],
      order: 180,
      uiZh: 'system-cjk',
      uiEn: 'system-latin',
      contentZh: 'system-cjk',
      contentEn: 'system-latin',
      density: 'comfortable',
      conversationWidth: 'wide',
      messageFlow: 'separated',
    },
  ),
  makeManifest(
    'fixture-mist',
    seeds('#6f8f7f', '#a7bfb2', '#f2f7f4', '#20302a'),
    seeds('#9dc4ae', '#7fa693', '#17201c', '#ecf4ef'),
    { tags: ['muted', 'calm'], order: 190, metricsZh: 'airy', metricsEn: 'compact' },
  ),
] as const

/** Manifest with explicit token overrides (used by the override-precedence test). */
export const OVERRIDE_MANIFEST: LiveryManifest = makeManifest(
  'fixture-override',
  seeds('#6a5acd', '#9d8fe0', '#f5f4fb', '#1c1830'),
  seeds('#9d8fe0', '#7a6fc0', '#1a1726', '#ece9f8'),
  {
    tags: ['elegant', 'deep'],
    order: 200,
    tokenOverrides: {
      light: {
        '--dsw-static-neutral-bluish-500': '#123456',
        '--dsw-alias-label-secondary': '#654321',
        // Not consumed by any shipped package: only an explicit override makes
        // this token appear in the derived variant + emitted CSS.
        '--dsw-specific-tip': '#f2e8ee',
      },
      dark: {
        '--dsw-static-neutral-bluish-500': '#abcdef',
        '--dsw-specific-tip': '#2b2027',
      },
    },
  },
)


// ---------------------------------------------------------------------------
// Style system v2 fixtures (docs/implementation/style-system.md)
// ---------------------------------------------------------------------------

/** The seven new local-only font ids paired into plausible livery pairings. */
export const V2_FONT_PAIRINGS: readonly (readonly [FontId, FontId, FontId])[] = [
  ['serif-cjk', 'serif-latin', 'tech-latin'],
  ['humanist-cjk', 'humanist-latin', 'system-mono'],
  ['serif-cjk', 'display-latin', 'tech-latin'],
  ['system-cjk', 'rounded-latin', 'system-mono'],
  ['humanist-cjk', 'display-latin', 'tech-latin'],
] as const

/** New metric ids in registry order (all carry consumed font-token overrides). */
export const V2_METRICS_IDS: readonly MetricsId[] = ['editorial', 'punchy', 'technical', 'quiet'] as const

/** New surface-style ids in registry order. */
export const V2_SURFACE_STYLE_IDS: readonly SurfaceStyleId[] = [
  'flat',
  'sharp',
  'rounded',
  'paper',
  'elevated',
  'terminal',
] as const

/**
 * Build one style-system-v2 fixture manifest: new font pairing + new metrics +
 * one surface style (light/dark seeds vary per index so palettes differ).
 */
export function makeStyleManifest(
  id: string,
  surfaceStyle: SurfaceStyleId,
  metrics: MetricsId,
  index = 0,
): LiveryManifest {
  const pairing = V2_FONT_PAIRINGS[index % V2_FONT_PAIRINGS.length] as readonly [FontId, FontId, FontId]
  const palette = [
    ['#3b5bdb', '#8da2fb', '#f3f5fe', '#141a2e', '#7c96f7', '#6b81d6', '#111528', '#eef1fb'],
    ['#b25c3a', '#d59b7a', '#faf4ee', '#2a1d17', '#e08a5f', '#c47a55', '#211a16', '#f7ece3'],
    ['#4f7a52', '#93b394', '#f4f8f3', '#1c2b1d', '#83b886', '#6d9a70', '#141f15', '#edf4ec'],
    ['#b34a6e', '#d68ba2', '#fdf3f6', '#2e1620', '#d9809c', '#b36a80', '#241318', '#fbeef3'],
    ['#527a8c', '#7fa6b6', '#eef4f6', '#152228', '#8ab7c9', '#6f99a9', '#141e23', '#e8f2f5'],
    ['#a1804e', '#c9b08a', '#faf7f0', '#2a2317', '#c9a86f', '#a98c60', '#211d16', '#f6f1e6'],
  ] as const
  const colors = palette[index % palette.length] as readonly [string, string, string, string, string, string, string, string]
  return makeManifest(
    id,
    seeds(colors[0], colors[1], colors[2], colors[3]),
    seeds(colors[4], colors[5], colors[6], colors[7]),
    {
      tags: ['retro'],
      order: 300 + index,
      uiZh: pairing[0],
      contentZh: pairing[0],
      uiEn: pairing[1],
      contentEn: pairing[1],
      code: pairing[2],
      metricsZh: metrics,
      metricsEn: metrics,
      surfaceStyle,
    },
  )
}

/** All six new surface styles plus three retuned legacy styles, new metrics/fonts. */
export const V2_STYLE_MANIFESTS: readonly LiveryManifest[] = [
  ...V2_SURFACE_STYLE_IDS.map((style, index) =>
    makeStyleManifest(`fixture-v2-${style}`, style, V2_METRICS_IDS[index % V2_METRICS_IDS.length] as MetricsId, index),
  ),
  makeStyleManifest('fixture-v2-soft-serif', 'soft', 'editorial', 2),
  makeStyleManifest('fixture-v2-glass-punchy', 'glass', 'punchy', 5),
  makeStyleManifest('fixture-v2-solid-tech', 'solid', 'technical', 0),
] as const
