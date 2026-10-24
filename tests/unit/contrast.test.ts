import { describe, expect, it } from 'vitest'
import {
  CONTRAST_CHECKS,
  CONTRAST_FOREGROUNDS,
  CONTRAST_SURFACES,
  adjustForContrast,
  auditContrast,
  compositeOver,
  resolveCheckColors,
  resolveTokenColor,
  summarizeContrast,
} from '../../src/core/contrast.js'
import { contrastRatio, parseColor, parseColorWithAlpha } from '../../src/core/color.js'
import { STOCK_TOKENS } from '../../src/generated/stock.js'
import type { CompiledVariant, ContrastEntry, TokenMap } from '../../src/core/types.js'
import { FIXTURE_MANIFESTS } from './fixtures.js'
import { buildFixture } from './helpers.js'

function variantOf(manifestIndex: number, mode: 'light' | 'dark'): CompiledVariant {
  const build = buildFixture(FIXTURE_MANIFESTS[manifestIndex]!)
  return mode === 'light' ? build.light : build.dark
}

function entryFor(entries: readonly ContrastEntry[], role: string): ContrastEntry {
  const entry = entries.find((candidate) => candidate.role === role)
  if (entry === undefined) throw new Error(`Missing contrast entry ${role}`)
  return entry
}

describe('contrast matrix', () => {
  it('covers the §18.2 roles, surfaces and states', () => {
    const roles = new Set(CONTRAST_CHECKS.map((spec) => spec.role))
    for (const role of [
      'label-primary',
      'label-secondary',
      'label-tertiary',
      'label-caption',
      'link',
      'brand',
      'on-accent',
      'error',
      'warn',
      'success',
      'disabled-label',
      'placeholder',
      'focus-ring',
    ]) {
      expect(roles.has(role)).toBe(true)
    }
    const surfaces = new Set(CONTRAST_CHECKS.map((spec) => spec.surface))
    for (const surface of ['base', 'sidebar', 'layer', 'bubble', 'menu', 'toast', 'tooltip', 'code', 'input', 'card']) {
      expect(surfaces.has(surface)).toBe(true)
    }
    const states = new Set(CONTRAST_CHECKS.map((spec) => spec.state))
    for (const state of ['default', 'hover', 'active', 'selected', 'focus', 'disabled'] as const) {
      expect(states.has(state)).toBe(true)
    }
  })

  it('references real stock tokens only', () => {
    for (const spec of CONTRAST_CHECKS) {
      expect(STOCK_TOKENS[spec.foregroundToken]).toBeDefined()
      expect(STOCK_TOKENS[spec.backgroundToken]).toBeDefined()
      if (spec.backgroundOverToken !== undefined) expect(STOCK_TOKENS[spec.backgroundOverToken]).toBeDefined()
      expect(spec.min).toBeGreaterThanOrEqual(3)
      expect(['text', 'large-text', 'non-text']).toContain(spec.kind)
    }
    for (const token of Object.values(CONTRAST_SURFACES)) expect(STOCK_TOKENS[token]).toBeDefined()
    for (const token of Object.values(CONTRAST_FOREGROUNDS)) expect(STOCK_TOKENS[token]).toBeDefined()
  })

  it('passes every assertion for every fixture in both modes', () => {
    for (let index = 0; index < FIXTURE_MANIFESTS.length; index += 1) {
      for (const mode of ['light', 'dark'] as const) {
        const variant = variantOf(index, mode)
        const entries = auditContrast(variant, mode)
        const summary = summarizeContrast(entries)
        expect(summary.failures).toBe(0)
        expect(summary.total).toBeGreaterThan(40)
        for (const entry of entries) {
          expect(entry.foreground).toMatch(/^#[0-9a-f]{6}$/)
          expect(entry.background).toMatch(/^#[0-9a-f]{6}$/)
          expect(entry.ratio).toBeGreaterThanOrEqual(entry.min)
          expect(entry.pass).toBe(true)
        }
      }
    }
  })

  it('includes the expected role/surface/state names', () => {
    const entries = auditContrast(variantOf(0, 'light'), 'light')
    for (const role of [
      'label-primary/base/default',
      'label-primary/sidebar/default',
      'label-secondary/menu/default',
      'on-accent/brand-fill/default',
      'focus-ring/base/focus',
      'label-primary/base/hover',
      'label-primary/base/active',
      'label-primary/selection/selected',
      'disabled-label/base/disabled',
      'toast-label/toast/default',
      'tooltip-label/tooltip/default',
    ]) {
      expect(entryFor(entries, role)).toBeDefined()
    }
  })

  it('composites translucent tokens over their surface before measuring', () => {
    const build = buildFixture(FIXTURE_MANIFESTS[0]!)
    const entries = auditContrast(build.light, 'light')
    const menuEntry = entryFor(entries, 'label-primary/menu/default')
    const rawMenu = resolveTokenColor(build.light.tokens, CONTRAST_SURFACES.menu, 'light')
    expect(rawMenu).not.toBeNull()
    expect(rawMenu?.alpha).toBeLessThan(1)
    // The audited background is the composited opaque colour, not the raw token.
    expect(menuEntry.background).toMatch(/^#[0-9a-f]{6}$/)
    const baseToken = build.light.tokens['--dsw-alias-bg-base']
    expect(baseToken).toBeDefined()
    const composited = compositeOver(rawMenu!, parseColor(baseToken as string))
    const hex = `#${[composited.r, composited.g, composited.b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
    expect(menuEntry.background).toBe(hex)
  })

  it('skips entries whose tokens cannot resolve (never throws)', () => {
    const variant: CompiledVariant = {
      seeds: FIXTURE_MANIFESTS[0]!.variants.light.seeds,
      tokens: { '--dsw-alias-label-primary': 'not-a-colour' },
      contrast: [],
    }
    const entries = auditContrast(variant, 'light')
    // The malformed token falls back to the stock declaration; the audit never
    // throws and still returns typed entries.
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(typeof entry.pass).toBe('boolean')
      expect(entry.ratio).toBeGreaterThan(0)
    }
  })

  it('summarizes failures deterministically', () => {
    const entries: ContrastEntry[] = [
      { role: 'a', foreground: '#000000', background: '#ffffff', ratio: 21, min: 4.5, pass: true, kind: 'text' },
      { role: 'b', foreground: '#dddddd', background: '#ffffff', ratio: 1.2, min: 4.5, pass: false, kind: 'text' },
    ]
    expect(summarizeContrast(entries)).toEqual({ failures: 1, total: 2 })
    expect(summarizeContrast([])).toEqual({ failures: 0, total: 0 })
  })
})

describe('adjustForContrast', () => {
  it('leaves passing colours untouched (normalised) and is deterministic', () => {
    const first = adjustForContrast('#000000', '#ffffff', 4.5)
    const second = adjustForContrast('#000000', '#ffffff', 4.5)
    expect(first).toBe('#000000')
    expect(second).toBe(first)
  })

  it('darkens a light foreground on a light background until AA passes', () => {
    const adjusted = adjustForContrast('#dddddd', '#ffffff', 4.5)
    expect(adjusted).toMatch(/^#[0-9a-f]{6}$/)
    expect(contrastRatio(parseColor(adjusted), parseColor('#ffffff'))).toBeGreaterThanOrEqual(4.5)
    expect(adjustForContrast('#dddddd', '#ffffff', 4.5)).toBe(adjusted)
  })

  it('lightens a dark foreground on a dark background until AA passes', () => {
    const adjusted = adjustForContrast('#222222', '#151517', 4.5)
    expect(contrastRatio(parseColor(adjusted), parseColor('#151517'))).toBeGreaterThanOrEqual(4.5)
  })

  it('is bounded and always returns a concrete colour', () => {
    for (const [foreground, background] of [
      ['#777777', '#888888'],
      ['#000000', '#000000'],
      ['#ffffff', '#ffffff'],
      ['#ec1313', '#141414'],
    ] as const) {
      const adjusted = adjustForContrast(foreground, background, 4.5)
      expect(adjusted).toMatch(/^#[0-9a-f]{6}$/)
      expect(adjustForContrast(foreground, background, 4.5)).toBe(adjusted)
    }
  })

  it('can repair a synthetic failing variant', () => {
    const background = '#ffffff'
    const failing = '#eeeeee'
    const before: CompiledVariant = {
      seeds: FIXTURE_MANIFESTS[0]!.variants.light.seeds,
      tokens: {
        '--dsw-alias-label-primary': failing,
        '--dsw-alias-bg-base': background,
      },
      contrast: [],
    }
    const primarySpec = CONTRAST_CHECKS.find((spec) => spec.role === 'label-primary')!
    const resolved = resolveCheckColors(before.tokens, primarySpec, 'light')
    expect(resolved).not.toBeNull()
    const ratio = contrastRatio(resolved!.foreground, resolved!.background)
    expect(ratio).toBeLessThan(primarySpec.min)
    const tokens: TokenMap = {
      ...before.tokens,
      '--dsw-alias-label-primary': adjustForContrast(failing, background, primarySpec.min),
    }
    const repaired: CompiledVariant = { seeds: before.seeds, tokens, contrast: [] }
    const entries = auditContrast(repaired, 'light')
    const labelEntries = entries.filter((entry) => entry.role.startsWith('label-primary/'))
    expect(labelEntries.length).toBeGreaterThan(0)
    const baseDefault = entries.find((entry) => entry.role === 'label-primary/base/default')
    expect(baseDefault).toBeDefined()
    expect(baseDefault?.pass).toBe(true)
    const repairedBase = resolveCheckColors(tokens, primarySpec, 'light')
    expect(repairedBase).not.toBeNull()
    expect(contrastRatio(repairedBase!.foreground, repairedBase!.background)).toBeGreaterThanOrEqual(primarySpec.min)
  })

  it('preserves alpha information for the auditor', () => {
    const parsed = parseColorWithAlpha('rgba(0, 0, 0, 0.2)')
    expect(parsed.alpha).toBeCloseTo(0.2, 6)
    const over = compositeOver(parsed, { r: 255, g: 255, b: 255 })
    expect(over.r).toBeCloseTo(204, 5)
  })
})
