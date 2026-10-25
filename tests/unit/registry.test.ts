import { describe, expect, it } from 'vitest'
import {
  FONT_STACKS,
  METRICS,
  SURFACE_STYLE_DEFINITIONS,
  SURFACE_STYLES,
  TAGS,
  TAG_IDS,
  TYPOGRAPHY_LOCALES,
  fontStackOf,
  metricsOf,
  resolveTypography,
  surfaceStyleOf,
} from '../../src/core/registry.js'
import {
  CONSUMED_METRIC_FONT_TOKENS,
  isAllowedMetricFontTokenValue,
  isAllowedStyleTokenValue,
  styleTokenFamilyOf,
} from '../../src/core/audit.js'
import type { FontId, LiveryManifest, MetricsId, SurfaceStyleId } from '../../src/core/types.js'
import { makeManifest } from './fixtures.js'

const LEGACY_CJK = '"PingFang SC", "Microsoft YaHei UI", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif'
const LEGACY_LATIN =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const LEGACY_MONO = '"SFMono-Regular", Consolas, "Liberation Mono", "Noto Sans Mono CJK SC", monospace'

const V2_FONT_STACKS: Readonly<Record<string, string>> = {
  'serif-cjk': '"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", serif',
  'serif-latin': '"Iowan Old Style", "Palatino", "Palatino Linotype", Georgia, "Times New Roman", serif',
  'humanist-cjk': '"Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei UI", sans-serif',
  'humanist-latin': '"Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", Helvetica, sans-serif',
  'display-latin': '"Futura", "Avenir Next", "Trebuchet MS", "Century Gothic", sans-serif',
  'rounded-latin': '"SF Pro Rounded", "Arial Rounded MT Bold", "Avenir Next", "Trebuchet MS", system-ui, sans-serif',
  'tech-latin': '"SF Mono", "JetBrains Mono", Menlo, Consolas, "Liberation Mono", monospace',
}

const LEGACY_METRICS: readonly MetricsId[] = ['cjk-comfortable', 'latin-default', 'compact', 'airy', 'comfortable']
const V2_METRICS: readonly MetricsId[] = ['editorial', 'punchy', 'technical', 'quiet']

describe('font registry', () => {
  it('keeps the legacy §9.2 stacks byte-identical', () => {
    expect(FONT_STACKS['system-cjk'].stack).toBe(LEGACY_CJK)
    expect(FONT_STACKS['system-latin'].stack).toBe(LEGACY_LATIN)
    expect(FONT_STACKS['system-mono'].stack).toBe(LEGACY_MONO)
    expect(fontStackOf('system-cjk')).toBe(LEGACY_CJK)
  })

  it('registers the seven new local-only stacks exactly per the frozen contract', () => {
    for (const [id, stack] of Object.entries(V2_FONT_STACKS)) {
      expect(FONT_STACKS[id as FontId]).toBeDefined()
      expect(fontStackOf(id as FontId)).toBe(stack)
    }
    expect(Object.keys(FONT_STACKS)).toHaveLength(10)
  })

  it('every font id resolves and no stack loads a remote font', () => {
    for (const id of Object.keys(FONT_STACKS) as FontId[]) {
      const stack = fontStackOf(id)
      expect(stack.length).toBeGreaterThan(0)
      expect(stack).not.toContain('http')
      expect(stack).not.toContain('url(')
      expect(stack).not.toContain('@font-face')
      expect(FONT_STACKS[id].note.length).toBeGreaterThan(0)
    }
  })

  it('throws for unregistered font ids', () => {
    expect(() => fontStackOf('comic-sans' as FontId)).toThrow(/Unknown font registry id/)
    expect(() => fontStackOf(undefined as unknown as FontId)).toThrow()
  })
})

describe('metrics registry', () => {
  it('keeps the four legacy profiles with their documented line-heights and empty token maps', () => {
    expect(METRICS['cjk-comfortable'].lineHeight).toBe(1.55)
    expect(METRICS['latin-default'].lineHeight).toBe(1.45)
    expect(METRICS.compact.lineHeight).toBe(1.35)
    expect(METRICS.airy.lineHeight).toBe(1.75)
    for (const id of LEGACY_METRICS) {
      expect(METRICS[id].tokens).toEqual({})
    }
    // Additive design-table alias keeps the comfortable leading target.
    expect(METRICS.comfortable.lineHeight).toBe(1.55)
  })

  it('registers the four v2 profiles with token overrides', () => {
    expect(Object.keys(METRICS)).toHaveLength(9)
    for (const id of V2_METRICS) {
      const metrics = metricsOf(id)
      expect(metrics.lineHeight).toBeGreaterThanOrEqual(1.3)
      expect(metrics.lineHeight).toBeLessThanOrEqual(1.8)
      expect(metrics.note.length).toBeGreaterThan(0)
      expect(Object.keys(metrics.tokens).length).toBeGreaterThan(0)
    }
  })

  it('only overrides consumed metric font tokens with allowed values', () => {
    const allowed = new Set(CONSUMED_METRIC_FONT_TOKENS)
    for (const id of V2_METRICS) {
      for (const [token, value] of Object.entries(METRICS[id].tokens)) {
        expect(allowed.has(token)).toBe(true)
        expect(isAllowedMetricFontTokenValue(token, value)).toBe(true)
        // Never override the user's content/code font-size tokens.
        expect(token).not.toContain('content-font')
        expect(token).not.toContain('code-font')
        expect(token).not.toBe('--dsw-font-markdown-code-block')
      }
    }
  })

  it('throws for unregistered metrics ids', () => {
    expect(() => metricsOf('dense' as MetricsId)).toThrow(/Unknown metrics profile id/)
  })
})

describe('surface style registry', () => {
  it('registers all nine surface styles in a stable order', () => {
    expect(SURFACE_STYLES).toEqual([
      'solid',
      'soft',
      'glass',
      'flat',
      'sharp',
      'rounded',
      'paper',
      'elevated',
      'terminal',
    ])
    expect(Object.keys(SURFACE_STYLE_DEFINITIONS)).toHaveLength(9)
  })

  it('every style is token-only and within the frozen families/allowlist', () => {
    for (const styleId of SURFACE_STYLES) {
      const definition = surfaceStyleOf(styleId)
      expect(definition.id).toBe(styleId)
      expect(definition.note.length).toBeGreaterThan(0)
      for (const mode of ['light', 'dark'] as const) {
        for (const [token, value] of Object.entries(definition[mode])) {
          expect(styleTokenFamilyOf(token)).not.toBeNull()
          expect(isAllowedStyleTokenValue(token, value)).toBe(true)
        }
      }
    }
  })

  it('keeps solid as the zero-byte stock recipe', () => {
    expect(surfaceStyleOf('solid').light).toEqual({})
    expect(surfaceStyleOf('solid').dark).toEqual({})
  })

  it('gives each non-solid style a visible radius scale and keeps the focus ring accessible', () => {
    for (const styleId of SURFACE_STYLES) {
      const definition = surfaceStyleOf(styleId)
      if (styleId !== 'solid') {
        expect(definition.light['--dsw-radius-md']).toBeDefined()
        expect(definition.dark['--dsw-radius-md']).toBeDefined()
      }
      const ring = definition.light['--dsw-focus-ring-width']
      if (ring !== undefined) expect(Number.parseFloat(ring)).toBeGreaterThanOrEqual(2)
    }
  })

  it('uses material blur only where the recipe claims material', () => {
    const withFilters: SurfaceStyleId[] = []
    for (const styleId of SURFACE_STYLES) {
      const definition = surfaceStyleOf(styleId)
      const filters = [
        definition.light['--dsw-menu-backdrop-filter'],
        definition.light['--dsw-mask-blur'],
      ].filter((value) => value !== undefined && /blur\(/i.test(value))
      if (filters.length > 0) withFilters.push(styleId)
    }
    expect(withFilters).toContain('glass')
    expect(withFilters).not.toContain('flat')
    expect(withFilters).not.toContain('paper')
  })

  it('throws for unregistered surface style ids', () => {
    expect(() => surfaceStyleOf('neumorphic' as SurfaceStyleId)).toThrow(/Unknown surface style id/)
  })
})

describe('tags', () => {
  it('freezes the sixteen documented tag ids', () => {
    const ids = [
      'calm',
      'cool',
      'warm',
      'neutral',
      'deep',
      'elegant',
      'playful',
      'contrast',
      'muted',
      'classic',
      'retro',
      'paper',
      'ink',
      'neon',
      'organic',
      'tech',
    ]
    expect(TAGS.map((tag) => tag.id)).toEqual(ids)
    expect(TAG_IDS).toEqual(ids)
    for (const tag of TAGS) {
      expect(tag.label['zh-CN'].length).toBeGreaterThan(0)
      expect(tag.label['en-US'].length).toBeGreaterThan(0)
      expect(tag.label['zh-CN']).not.toBe(tag.label['en-US'])
    }
  })

  it('adds the six v2 tags with their bilingual labels', () => {
    const expected: Readonly<Record<string, readonly [string, string]>> = {
      retro: ['复古', 'Retro'],
      paper: ['纸感', 'Paper'],
      ink: ['墨感', 'Ink'],
      neon: ['霓虹', 'Neon'],
      organic: ['自然', 'Organic'],
      tech: ['科技', 'Tech'],
    }
    for (const [id, [zh, en]] of Object.entries(expected)) {
      const tag = TAGS.find((candidate) => candidate.id === id)
      expect(tag).toBeDefined()
      expect(tag?.label['zh-CN']).toBe(zh)
      expect(tag?.label['en-US']).toBe(en)
    }
  })
})

describe('resolveTypography', () => {
  it('resolves locale-specific stacks and metrics (legacy + v2 ids)', () => {
    const manifest = makeManifest(
      'fixture-registry',
      { accent: '#3355aa', secondary: '#7799cc', surface: '#f4f6f9', text: '#101820' },
      { accent: '#88aadd', secondary: '#6688bb', surface: '#12161c', text: '#eef3f8' },
      { uiZh: 'serif-cjk', contentZh: 'humanist-cjk', uiEn: 'display-latin', contentEn: 'rounded-latin', code: 'tech-latin', metricsZh: 'editorial', metricsEn: 'punchy' },
    )
    const resolved = resolveTypography(manifest)
    expect(resolved.ui['zh-CN']).toBe(V2_FONT_STACKS['serif-cjk'])
    expect(resolved.ui['en-US']).toBe(V2_FONT_STACKS['display-latin'])
    expect(resolved.content['zh-CN']).toBe(V2_FONT_STACKS['humanist-cjk'])
    expect(resolved.content['en-US']).toBe(V2_FONT_STACKS['rounded-latin'])
    expect(resolved.code).toBe(V2_FONT_STACKS['tech-latin'])
    expect(resolved.metrics['zh-CN'].id).toBe('editorial')
    expect(resolved.metrics['en-US'].id).toBe('punchy')
    expect(Object.keys(resolved.metrics['zh-CN'].tokens).length).toBeGreaterThan(0)
    expect(TYPOGRAPHY_LOCALES).toEqual(['zh-CN', 'en-US'])
  })

  it('rejects unregistered font and metrics ids', () => {
    const base = makeManifest(
      'fixture-registry-bad',
      { accent: '#3355aa', secondary: '#7799cc', surface: '#f4f6f9', text: '#101820' },
      { accent: '#88aadd', secondary: '#6688bb', surface: '#12161c', text: '#eef3f8' },
    )
    const badFont: LiveryManifest = {
      ...base,
      typography: { ...base.typography, code: 'monospace-please' as FontId },
    }
    expect(() => resolveTypography(badFont)).toThrow(/Invalid code font/)
    const badMetrics: LiveryManifest = {
      ...base,
      typography: { ...base.typography, metrics: { 'zh-CN': 'huge' as MetricsId, 'en-US': 'latin-default' } },
    }
    expect(() => resolveTypography(badMetrics)).toThrow(/Invalid metrics profile/)
  })
})
