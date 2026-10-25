import { describe, expect, it } from 'vitest'
import {
  CONSUMED_METRIC_FONT_TOKENS,
  EMPTY_STYLE_COVERAGE,
  MAX_TOKEN_VALUE_LENGTH,
  STYLE_TOKEN_FAMILIES,
  assertMetricTokens,
  assertStyleTokenMap,
  auditStyleCoverage,
  auditStyleTokens,
  isAllowedMetricFontTokenValue,
  isAllowedStyleTokenValue,
  isAllowedTokenValue,
  isHostileTokenValue,
  isMetricFontToken,
  isStyleTokenName,
  styleTokenFamilyOf,
} from '../../src/core/audit.js'
import { METRICS, SURFACE_STYLE_DEFINITIONS, SURFACE_STYLES } from '../../src/core/registry.js'
import type { CompiledVariant, TokenMap } from '../../src/core/types.js'

function variant(tokens: TokenMap): CompiledVariant {
  return {
    seeds: { accent: '#3355aa', secondary: '#7799cc', surface: '#f4f6f9', text: '#101820' },
    tokens,
    contrast: [],
  }
}

describe('style token families', () => {
  it('registers the four frozen families with the documented token names', () => {
    expect(Object.keys(STYLE_TOKEN_FAMILIES)).toEqual(['shape', 'elevation', 'material', 'border'])
    expect(STYLE_TOKEN_FAMILIES.shape).toContain('--dsw-radius-md')
    expect(STYLE_TOKEN_FAMILIES.shape).toContain('--dsw-corner-shape')
    expect(STYLE_TOKEN_FAMILIES.elevation).toContain('--dsw-shadow-lv1')
    expect(STYLE_TOKEN_FAMILIES.elevation).toContain('--dsw-elevation-stroke')
    expect(STYLE_TOKEN_FAMILIES.material).toContain('--dsw-menu-backdrop-filter')
    expect(STYLE_TOKEN_FAMILIES.material).toContain('--dsw-mask-blur')
    expect(STYLE_TOKEN_FAMILIES.material).toContain('--dsw-focus-ring-width')
    expect(STYLE_TOKEN_FAMILIES.border).toEqual([
      '--dsw-alias-border-l1',
      '--dsw-alias-border-l2',
      '--dsw-alias-border-l3',
      '--dsw-alias-border-l4',
    ])
  })

  it('classifies names and rejects unknown ones', () => {
    expect(styleTokenFamilyOf('--dsw-radius-sm')).toBe('shape')
    expect(styleTokenFamilyOf('--dsw-shadow-lv2')).toBe('elevation')
    expect(styleTokenFamilyOf('--dsw-mask-blur')).toBe('material')
    expect(styleTokenFamilyOf('--dsw-alias-border-l3')).toBe('border')
    expect(styleTokenFamilyOf('--dsw-alias-bg-base')).toBeNull()
    expect(isStyleTokenName('--dsw-alias-bg-base')).toBe(false)
    expect(isStyleTokenName('--dsw-radius-md')).toBe(true)
  })
})

describe('style value allowlist', () => {
  it('accepts the documented value shapes per family', () => {
    const accepted: readonly (readonly [string, string])[] = [
      ['--dsw-radius-md', '12px'],
      ['--dsw-radius-xs', '0'],
      ['--dsw-radius-panel', '.5px'],
      ['--dsw-radius-lg', '1.5rem'],
      ['--dsw-corner-shape', 'superellipse(1.5)'],
      ['--dsw-corner-shape', 'round'],
      ['--dsw-shadow-lv1', 'none'],
      ['--dsw-shadow-lv1', '0'],
      ['--dsw-shadow-lv1', '0 2px 4px 0 #0000000d'],
      ['--dsw-shadow-lv2', '0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a'],
      ['--dsw-elevation-panel', 'var(--dsw-elevation-stroke), 0 3px 8px 0 #00000008'],
      ['--dsw-elevation-stroke', '0 0 0 .5px var(--dsw-elevation-stroke-color)'],
      ['--dsw-elevation-stroke-color', 'var(--dsw-alias-border-l4)'],
      ['--dsw-elevation-stroke-color', 'rgba(120, 90, 50, 0.34)'],
      ['--dsw-shadow-lv3', 'inset 0 1px 0 0 #ffffff14'],
      ['--dsw-menu-backdrop-filter', 'blur(40px) saturate(150%)'],
      ['--dsw-menu-backdrop-filter', 'none'],
      ['--dsw-mask-blur', 'blur(24px)'],
      ['--dsw-focus-ring-width', '2px'],
      ['--dsw-alias-border-l1', 'rgba(0, 0, 0, 0.08)'],
      ['--dsw-alias-border-l1', '#00000014'],
      ['--dsw-alias-border-l1', 'var(--dsw-alias-border-l2)'],
      ['--dsw-alias-border-l2', 'color-mix(in srgb, #000 20%, transparent)'],
    ]
    for (const [token, value] of accepted) {
      expect(isAllowedStyleTokenValue(token, value), `${token}=${value}`).toBe(true)
    }
  })

  it('rejects opaque border colours (alpha tints only)', () => {
    expect(isAllowedStyleTokenValue('--dsw-alias-border-l1', '#000000')).toBe(false)
    expect(isAllowedStyleTokenValue('--dsw-alias-border-l1', 'rgb(0, 0, 0)')).toBe(false)
    expect(isAllowedStyleTokenValue('--dsw-alias-border-l1', 'rgba(0, 0, 0, 0.5)')).toBe(true)
  })

  it('rejects values outside the family shape', () => {
    expect(isAllowedStyleTokenValue('--dsw-radius-md', '12px 4px')).toBe(false)
    expect(isAllowedStyleTokenValue('--dsw-radius-md', 'blur(2px)')).toBe(false)
    expect(isAllowedStyleTokenValue('--dsw-shadow-lv1', '1px')).toBe(false)
    expect(isAllowedStyleTokenValue('--dsw-mask-blur', '#ffffff')).toBe(false)
    expect(isAllowedStyleTokenValue('--dsw-focus-ring-width', 'thin')).toBe(false)
    expect(isAllowedStyleTokenValue('--dsw-alias-border-l1', '12px')).toBe(false)
    expect(isAllowedStyleTokenValue('--dsw-not-a-style-token', '12px')).toBe(false)
  })

  it('rejects hostile values in every family', () => {
    const hostile = [
      'url(https://evil.example/x.woff2)',
      'var(--evil)',
      '12px !important',
      '12px; background: red',
      'body { color: red }',
      '12px <script>',
      '12px\ncolor: red',
      'expression(alert(1))',
      'javascript:alert(1)',
      '@import url(x)',
      'x'.repeat(MAX_TOKEN_VALUE_LENGTH + 1),
    ]
    for (const value of hostile) {
      expect(isHostileTokenValue(value), value).toBe(true)
      expect(isAllowedStyleTokenValue('--dsw-radius-md', value), value).toBe(false)
      expect(isAllowedStyleTokenValue('--dsw-shadow-lv1', value), value).toBe(false)
      expect(isAllowedStyleTokenValue('--dsw-menu-backdrop-filter', value), value).toBe(false)
      expect(isAllowedStyleTokenValue('--dsw-alias-border-l1', value), value).toBe(false)
    }
  })

  it('validates metric font-token overrides', () => {
    expect(CONSUMED_METRIC_FONT_TOKENS).toHaveLength(8)
    expect(isMetricFontToken('--dsw-font-xs-13')).toBe(true)
    expect(isMetricFontToken('--dsw-font-markdown-base')).toBe(false)
    expect(isAllowedMetricFontTokenValue('--dsw-font-xs-13', '13px/20px var(--dsw-font-family)')).toBe(true)
    expect(isAllowedMetricFontTokenValue('--dsw-font-xs-strong-13', '600 13px/18px var(--dsw-font-family)')).toBe(true)
    expect(
      isAllowedMetricFontTokenValue('--dsw-font-family-brand', '"Futura", "Avenir Next", var(--dsw-font-family)'),
    ).toBe(true)
    expect(isAllowedMetricFontTokenValue('--dsw-font-xs-13', 'url(evil.woff2)')).toBe(false)
    expect(isAllowedMetricFontTokenValue('--dsw-font-xs-13', '13px; x: y')).toBe(false)
    expect(isAllowedMetricFontTokenValue('--dsw-font-markdown-base', '13px/20px var(--dsw-font-family)')).toBe(false)
  })

  it('dispatches generic values without weakening colour tokens', () => {
    expect(isAllowedTokenValue('--dsw-radius-md', '12px')).toBe(true)
    expect(isAllowedTokenValue('--dsw-radius-md', 'url(x)')).toBe(false)
    // Colour tokens are validated by the compiler's colour audit; the style
    // audit only rejects hostile values here.
    expect(isAllowedTokenValue('--dsw-alias-bg-base', '#f0f3f6')).toBe(true)
    expect(isAllowedTokenValue('--dsw-alias-bg-base', 'url(x)')).toBe(false)
  })
})

describe('registry self-validation', () => {
  it('accepts every registered surface style and metric profile', () => {
    for (const styleId of SURFACE_STYLES) {
      const definition = SURFACE_STYLE_DEFINITIONS[styleId]
      expect(() => assertStyleTokenMap(definition.light, `${styleId}:light`)).not.toThrow()
      expect(() => assertStyleTokenMap(definition.dark, `${styleId}:dark`)).not.toThrow()
    }
    for (const [id, metrics] of Object.entries(METRICS)) {
      expect(() => assertMetricTokens(metrics.tokens, id)).not.toThrow()
    }
  })

  it('throws for out-of-family tokens and hostile values', () => {
    expect(() => assertStyleTokenMap({ '--dsw-alias-bg-base': '#fff' }, 'bad-family')).toThrow(/not a registered style token/)
    expect(() => assertStyleTokenMap({ '--dsw-radius-md': 'url(x)' }, 'bad-value')).toThrow(/disallowed value/)
    expect(() => assertMetricTokens({ '--dsw-font-markdown-base': '12px' }, 'bad-metric-token')).toThrow(
      /not a consumed metric font token/,
    )
    expect(() => assertMetricTokens({ '--dsw-font-xs-13': 'url(x)' }, 'bad-metric-value')).toThrow(/disallowed value/)
  })
})

describe('style-token coverage facts', () => {
  it('reports applied tokens/families for one emitted map', () => {
    const audit = auditStyleTokens({
      '--dsw-radius-md': '12px',
      '--dsw-shadow-lv1': '0 2px 4px 0 #0000000d',
      '--dsw-mask-blur': 'blur(24px)',
      '--dsw-font-xs-13': '13px/20px var(--dsw-font-family)',
      '--dsw-alias-bg-base': '#f0f3f6',
    })
    expect(audit.pass).toBe(true)
    expect(audit.rejected).toEqual([])
    expect(audit.families).toEqual(['elevation', 'material', 'shape'])
    expect(audit.applied.map((entry) => entry.token)).toEqual([
      '--dsw-mask-blur',
      '--dsw-radius-md',
      '--dsw-shadow-lv1',
    ])
    expect(audit.metricFontTokens).toEqual(['--dsw-font-xs-13'])
    // Colour tokens are not style tokens and are not reported here.
    expect(audit.applied.some((entry) => entry.token === '--dsw-alias-bg-base')).toBe(false)
  })

  it('flags rejected style/metric tokens and fails the audit', () => {
    const audit = auditStyleTokens({
      '--dsw-radius-md': 'url(evil)',
      '--dsw-font-xs-13': 'url(evil)',
      '--dsw-alias-border-l1': '#000000',
    })
    expect(audit.pass).toBe(false)
    expect(audit.rejected.map((issue) => issue.token).sort()).toEqual([
      '--dsw-alias-border-l1',
      '--dsw-font-xs-13',
      '--dsw-radius-md',
    ])
  })

  it('aggregates light + dark coverage for a livery', () => {
    const coverage = auditStyleCoverage(
      variant({ '--dsw-radius-md': '12px', '--dsw-font-xs-13': '13px/20px var(--dsw-font-family)' }),
      variant({ '--dsw-radius-md': '12px', '--dsw-shadow-lv2': 'none', '--dsw-alias-border-l1': 'rgba(0, 0, 0, 0.08)' }),
    )
    expect(coverage.pass).toBe(true)
    expect(coverage.families).toEqual(['border', 'elevation', 'shape'])
    expect(coverage.tokens).toEqual(['--dsw-alias-border-l1', '--dsw-radius-md', '--dsw-shadow-lv2'])
    expect(coverage.metricFontTokens).toEqual(['--dsw-font-xs-13'])
    expect(coverage.rejected).toEqual([])
  })

  it('exposes an empty coverage constant for catalog entries without style tokens', () => {
    expect(EMPTY_STYLE_COVERAGE.pass).toBe(true)
    expect(EMPTY_STYLE_COVERAGE.families).toEqual([])
  })
})
