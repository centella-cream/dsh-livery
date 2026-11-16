/**
 * Style-DNA labels: the gallery must name the shipped recipe and the actual UI
 * type family, not classify `sans-serif` as a serif stack.
 */
import { describe, expect, it } from 'vitest'
import { FONT_STACKS } from '../../src/core/registry.js'
import { chromeLabelKey, shapeLabelKey, styleDna, typeFamilyOf, typeLabelKey } from '../../src/client/ui/style-dna.js'
import { getDictionary } from '../../src/i18n/index.js'
import type { CompiledLivery } from '../../src/core/types.js'

describe('style DNA', () => {
  it('classifies every registered UI stack into the right family', () => {
    expect(typeFamilyOf(FONT_STACKS['humanist-latin'].stack)).toBe('sans')
    expect(typeFamilyOf(FONT_STACKS['system-cjk'].stack)).toBe('sans')
    expect(typeFamilyOf(FONT_STACKS['serif-latin'].stack)).toBe('serif')
    expect(typeFamilyOf(FONT_STACKS['serif-cjk'].stack)).toBe('serif')
    expect(typeFamilyOf(FONT_STACKS['tech-latin'].stack)).toBe('mono')
    expect(typeFamilyOf(FONT_STACKS['rounded-latin'].stack)).toBe('rounded')
    expect(typeFamilyOf(FONT_STACKS['display-latin'].stack)).toBe('display')
    expect(typeFamilyOf('unknown, sans-serif')).toBe('sans')
  })

  it('maps every surface recipe and type family to a dictionary key', () => {
    expect(shapeLabelKey('terminal')).toBe('dna.shape.terminal')
    expect(shapeLabelKey('brutal')).toBe('dna.shape.brutal')
    expect(shapeLabelKey('pill')).toBe('dna.shape.pill')
    expect(shapeLabelKey('editorial')).toBe('dna.shape.editorial')
    expect(typeLabelKey('sans')).toBe('dna.type.sans')
    expect(typeLabelKey('serif')).toBe('dna.type.serif')
    expect(chromeLabelKey('poster')).toBe('dna.chrome.poster')
    expect(chromeLabelKey('terminal')).toBe('dna.chrome.terminal')
  })

  it('derives localized shape + type labels from compiled data', () => {
    const livery = {
      layout: { surfaceStyle: 'brutal', chrome: 'poster' },
      typography: { ui: { 'zh-CN': FONT_STACKS['display-latin'].stack, 'en-US': FONT_STACKS['display-latin'].stack } },
    } as unknown as CompiledLivery
    const en = getDictionary('en')
    const dna = styleDna(livery, 'en', (key) => en[key])
    expect(dna.shape).toEqual({ key: 'dna.shape.brutal', label: 'Brutal' })
    expect(dna.chrome).toEqual({ key: 'dna.chrome.poster', label: 'Poster' })
    expect(dna.type).toEqual({ key: 'dna.type.display', label: 'Display' })
    expect(dna.labels).toEqual(['Brutal', 'Poster', 'Display'])
  })
})
