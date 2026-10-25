import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { CLIENT_CSS } from '../../src/styles/client.js'

describe('client stylesheet (plan §18.3 / §18.8)', () => {
  it('stays inside the 12KB budget', () => {
    expect(new TextEncoder().encode(CLIENT_CSS).length).toBeLessThanOrEqual(12 * 1024)
  })

  it('contains no !important', () => {
    expect(CLIENT_CSS).not.toMatch(/!\s*important/i)
  })

  it('contains no remote or data URLs', () => {
    expect(CLIENT_CSS).not.toMatch(/url\(\s*['"]?\s*(?:https?:|data:|ftp:|\/\/)/i)
    expect(CLIENT_CSS).not.toMatch(/(?:https?:)?\/\//i)
    expect(CLIENT_CSS).not.toMatch(/@import/i)
    expect(CLIENT_CSS).not.toMatch(/@font-face/i)
  })

  it('contains no id selectors or hashed module class selectors', () => {
    const withoutColors = CLIENT_CSS.replace(/#[0-9a-fA-F]{3,8}\b/g, 'COLOR')
    expect(withoutColors).not.toMatch(/#[\w-]/)
    expect(CLIENT_CSS).not.toMatch(/\._?[A-Za-z0-9]+_[A-Za-z0-9]{4,}/)
  })

  it('scopes every rule to a livery class and never touches host theme attributes', () => {
    expect(CLIENT_CSS).not.toMatch(/data-ds-/)
    expect(CLIENT_CSS).not.toMatch(/(^|[},])\s*(?:html|body|\*)\s*[{,]/m)
  })

  it('ships the responsive two-column card layout system', () => {
    expect(CLIENT_CSS).toMatch(/\.livery-layout,\.wallpaper-layout\{display:grid;grid-template-columns:minmax\(0,2fr\) minmax\(280px,1fr\)/)
    expect(CLIENT_CSS).toMatch(/@media \(max-width:1099px\)\{\.livery-layout,\.wallpaper-layout\{grid-template-columns:minmax\(0,1fr\)/)
    expect(CLIENT_CSS).toMatch(/\.livery-ui-card\{display:flex;flex-direction:column;gap:12px;min-width:0;padding:16px 18px/)
    // Cards are genuinely layered: token-derived surface, border, shadow, blur.
    expect(CLIENT_CSS).toContain('border:1px solid color-mix(in srgb,var(--lw-fg) 20%,transparent)')
    expect(CLIENT_CSS).toContain('background:color-mix(in srgb,var(--lw-fg) 5%,var(--lw-layer2))')
    expect(CLIENT_CSS).toContain('box-shadow:0 1px 2px rgba(0,0,0,.06)')
    expect(CLIENT_CSS).toContain('backdrop-filter:blur(14px) saturate(1.08)')
    // Effect sliders are bounded inside the rail card, never viewport-wide.
    expect(CLIENT_CSS).toMatch(/\.wallpaper-effect input\{flex:1 1 100px;width:100%;min-width:96px;max-width:140px/)
    expect(CLIENT_CSS).toMatch(/\.wallpaper-effect output\{flex:0 0 54px;width:54px/)
    expect(CLIENT_CSS).toMatch(/\.wallpaper-effects-grid\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(180px,1fr\)\)/)
    expect(CLIENT_CSS).toMatch(/\.livery-gallery-card \.livery-family\+\.livery-family\{border-block-start/)
    expect(CLIENT_CSS).toMatch(/\.wallpaper-swatches\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  })

  it('provides a visible focus ring and a reduced-motion fallback', () => {
    expect(CLIENT_CSS).toMatch(/:focus-visible/)
    expect(CLIENT_CSS).toMatch(/@media \(prefers-reduced-motion:reduce\)/)
  })

  it('only uses documented --dsw-* tokens for color/spacing', () => {
    const custom = [...CLIENT_CSS.matchAll(/var\((--[a-z0-9-]+)/gi)].map(match => match[1]!)
    const allowed = new Set(['--lw-fg', '--lw-2', '--lw-3', '--lw-line', '--lw-line2', '--lw-brand', '--lw-layer', '--lw-layer2', '--lw-mono', '--lw-on-brand', '--lw-err', '--lw-warn', '--livery-accent', '--livery-secondary', '--livery-surface', '--livery-text'])
    for (const token of custom) {
      expect(token.startsWith('--dsw-') || allowed.has(token), `unexpected custom property: ${token}`).toBe(true)
    }
    // Local aliases themselves may only be defined from host tokens.
    for (const match of CLIENT_CSS.matchAll(/(--lw-[a-z0-9-]+):([^;}]+)/g)) {
      expect(match[2]!.includes('--dsw-') || match[1] === '--lw-2' || match[1] === '--lw-3').toBe(true)
    }
  })

  it('does not hard-code a fixed pixel width for text containers', () => {
    expect(CLIENT_CSS).not.toMatch(/\.livery-(?:summary|card|notice|empty|check)[^{]*\{[^}]*\bwidth:\s*\d+px/)
  })

  it('is a TypeScript template string, not a .css import', () => {
    const source = readFileSync(new URL('../../src/styles/client.ts', import.meta.url), 'utf8')
    expect(source).toContain('export const CLIENT_CSS')
    expect(source).not.toMatch(/import\s+['"].*\.css['"]/)
  })
})
