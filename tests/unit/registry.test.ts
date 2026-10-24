import { describe, expect, it } from 'vitest'
import {
  FONT_STACKS,
  METRICS,
  SURFACE_STYLES,
  TAGS,
  TAG_IDS,
  TYPOGRAPHY_LOCALES,
  fontStackOf,
  metricsOf,
  resolveTypography,
} from '../../src/core/registry.js'
import type { FontId, LiveryManifest, MetricsId } from '../../src/core/types.js'
import { makeManifest } from './fixtures.js'

const CJK_STACK = '"PingFang SC", "Microsoft YaHei UI", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif'
const LATIN_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const MONO_STACK = '"SFMono-Regular", Consolas, "Liberation Mono", "Noto Sans Mono CJK SC", monospace'

describe('font registry', () => {
  it('matches the frozen §9.2 stacks exactly', () => {
    expect(FONT_STACKS['system-cjk'].stack).toBe(CJK_STACK)
    expect(FONT_STACKS['system-latin'].stack).toBe(LATIN_STACK)
    expect(FONT_STACKS['system-mono'].stack).toBe(MONO_STACK)
    expect(fontStackOf('system-cjk')).toBe(CJK_STACK)
    expect(fontStackOf('system-latin')).toBe(LATIN_STACK)
    expect(fontStackOf('system-mono')).toBe(MONO_STACK)
  })

  it('never loads a remote font', () => {
    for (const stack of Object.values(FONT_STACKS)) {
      expect(stack.stack).not.toContain('http')
      expect(stack.stack).not.toContain('url(')
      expect(stack.stack).not.toContain('@font-face')
      expect(stack.note.length).toBeGreaterThan(0)
    }
  })

  it('throws for unregistered font ids', () => {
    expect(() => fontStackOf('comic-sans' as FontId)).toThrow(/Unknown font registry id/)
    expect(() => fontStackOf(undefined as unknown as FontId)).toThrow()
  })
})

describe('metrics registry', () => {
  it('matches the documented line-height targets', () => {
    expect(METRICS['cjk-comfortable'].lineHeight).toBe(1.55)
    expect(METRICS['latin-default'].lineHeight).toBe(1.45)
    expect(METRICS.compact.lineHeight).toBe(1.35)
    expect(METRICS.airy.lineHeight).toBe(1.75)
    for (const metrics of Object.values(METRICS)) expect(metrics.note.length).toBeGreaterThan(0)
  })

  it('throws for unregistered metrics ids', () => {
    expect(() => metricsOf('dense' as MetricsId)).toThrow(/Unknown metrics profile id/)
  })
})

describe('tags', () => {
  it('freezes exactly the ten documented tag ids', () => {
    const ids = ['calm', 'cool', 'warm', 'neutral', 'deep', 'elegant', 'playful', 'contrast', 'muted', 'classic']
    expect(TAGS.map((tag) => tag.id)).toEqual(ids)
    expect(TAG_IDS).toEqual(ids)
    for (const tag of TAGS) {
      expect(tag.label['zh-CN'].length).toBeGreaterThan(0)
      expect(tag.label['en-US'].length).toBeGreaterThan(0)
      expect(tag.label['zh-CN']).not.toBe(tag.label['en-US'])
    }
  })
})

describe('surface styles and locales', () => {
  it('registers the three surface materials', () => {
    expect(SURFACE_STYLES).toEqual(['solid', 'soft', 'glass'])
  })

  it('resolves typography for both locales', () => {
    expect(TYPOGRAPHY_LOCALES).toEqual(['zh-CN', 'en-US'])
  })
})

describe('resolveTypography', () => {
  it('resolves locale-specific stacks and metrics', () => {
    const manifest = makeManifest(
      'fixture-registry',
      { accent: '#3355aa', secondary: '#7799cc', surface: '#f4f6f9', text: '#101820' },
      { accent: '#88aadd', secondary: '#6688bb', surface: '#12161c', text: '#eef3f8' },
      { metricsZh: 'airy', metricsEn: 'compact', code: 'system-mono' },
    )
    const resolved = resolveTypography(manifest)
    expect(resolved.ui['zh-CN']).toBe(CJK_STACK)
    expect(resolved.ui['en-US']).toBe(LATIN_STACK)
    expect(resolved.content['zh-CN']).toBe(CJK_STACK)
    expect(resolved.content['en-US']).toBe(LATIN_STACK)
    expect(resolved.code).toBe(MONO_STACK)
    expect(resolved.metrics['zh-CN'].id).toBe('airy')
    expect(resolved.metrics['zh-CN'].lineHeight).toBe(1.75)
    expect(resolved.metrics['en-US'].id).toBe('compact')
    expect(resolved.metrics['en-US'].lineHeight).toBe(1.35)
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
