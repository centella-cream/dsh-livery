/**
 * Chrome recipes: only the consumed component-fill tokens, deterministic concrete
 * colours per mode, and a real derivation difference against `plain`.
 */
import { describe, expect, it } from 'vitest'
import { CHROME_STYLES, CHROME_TOKEN_NAMES, chromeTokens, isChromeStyleId } from '../../src/core/chrome.js'
import { deriveLivery } from '../../src/core/derive.js'
import type { ChromeStyleId, LiveryManifest } from '../../src/core/types.js'
import { STOCK_021_RC2 } from './helpers.js'
import { FIXTURE_MANIFESTS } from './fixtures.js'
import { readFileSync } from 'node:fs'
import { normalizeManifest } from '../../src/core/presentation.js'
import { resolve } from 'node:path'

const SEEDS = { accent: '#b03a2e', secondary: '#cf7e71', surface: '#faf3ef', text: '#33201a' }

describe('chrome recipes', () => {
  it('registers the six recipes and validates ids', () => {
    expect(CHROME_STYLES).toEqual(['plain', 'tinted', 'outline', 'terminal', 'editorial', 'poster'])
    expect(isChromeStyleId('poster')).toBe(true)
    expect(isChromeStyleId('nope')).toBe(false)
  })

  it('only authors consumed component-fill tokens with concrete colours', () => {
    for (const id of CHROME_STYLES) {
      for (const mode of ['light', 'dark'] as const) {
        const tokens = chromeTokens(id, mode, SEEDS)
        for (const [name, value] of Object.entries(tokens)) {
          expect(CHROME_TOKEN_NAMES).toContain(name)
          expect(value).toMatch(/^#[0-9a-f]{6}$/i)
        }
      }
    }
    const plain = chromeTokens('plain', 'light', SEEDS)
    expect(plain['--dsw-specific-sidebar-fill']).not.toBe(SEEDS.surface)
    expect(plain['--dsw-specific-sidebar-nav-item-active-accent']).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('keeps distinct GUI roles for tinted, outline, terminal, editorial and poster', () => {
    const keys: readonly ChromeStyleId[] = ['tinted', 'outline', 'terminal', 'editorial', 'poster']
    const sidebar = new Set(keys.map((id) => chromeTokens(id, 'light', SEEDS)['--dsw-specific-sidebar-fill']))
    const bubble = new Set(keys.map((id) => chromeTokens(id, 'light', SEEDS)['--dsw-specific-bubble']))
    expect(sidebar.size).toBeGreaterThan(2)
    expect(bubble.size).toBeGreaterThan(2)
  })

  it('changes the derived component fills without touching the shape or labels', () => {
    const base = FIXTURE_MANIFESTS[0] as LiveryManifest
    const plainManifest: LiveryManifest = { ...base, layout: { ...base.layout, chrome: 'plain' } }
    const posterManifest: LiveryManifest = { ...base, layout: { ...base.layout, chrome: 'poster' } }
    const plain = deriveLivery(plainManifest, STOCK_021_RC2)
    const poster = deriveLivery(posterManifest, STOCK_021_RC2)
    expect(poster.light.tokens['--dsw-specific-sidebar-fill']).not.toBe(plain.light.tokens['--dsw-specific-sidebar-fill'])
    expect(poster.light.tokens['--dsw-specific-bubble']).not.toBe(plain.light.tokens['--dsw-specific-bubble'])
    expect(poster.light.tokens['--dsw-radius-md']).toBe(plain.light.tokens['--dsw-radius-md'])
    expect(poster.light.tokens['--dsw-alias-label-primary']).toBe(plain.light.tokens['--dsw-alias-label-primary'])
  })
})

describe('shipped chrome assignments', () => {
  it('applies the terminal chrome to the real graphite manifest', () => {
    const graphite = normalizeManifest(JSON.parse(readFileSync(resolve('liveries/graphite/manifest.json'), 'utf8')))
    const plain: LiveryManifest = { ...graphite, layout: { ...graphite.layout, chrome: 'plain' } }
    const shipped = deriveLivery(graphite, STOCK_021_RC2)
    const stockChrome = deriveLivery(plain, STOCK_021_RC2)
    expect(graphite.layout.chrome).toBe('terminal')
    expect(shipped.light.tokens['--dsw-specific-sidebar-fill']).not.toBe(stockChrome.light.tokens['--dsw-specific-sidebar-fill'])
    expect(shipped.dark.tokens['--dsw-specific-sidebar-fill']).not.toBe(stockChrome.dark.tokens['--dsw-specific-sidebar-fill'])
  })
})
