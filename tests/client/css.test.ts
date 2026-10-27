import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { CLIENT_CSS } from '../../src/styles/client.js'

describe('client stylesheet (plan §18.3 / §18.8)', () => {
  it('stays inside the 14KB budget', () => {
    expect(new TextEncoder().encode(CLIENT_CSS).length).toBeLessThanOrEqual(14 * 1024)
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
    // Wallpaper views: visible selected tabs/swatches, readable swatch labels,
    // compact empty state and bounded diagnostics in narrow panels.
    expect(CLIENT_CSS).toMatch(/\.livery-chip\[aria-pressed='true'\],\.livery-chip\[aria-selected='true'\]/)
    expect(CLIENT_CSS).toMatch(/\.wallpaper-swatch\[aria-pressed='true'\]/)
    expect(CLIENT_CSS).toContain('.wallpaper-swatch::after')
    expect(CLIENT_CSS).toContain('text-shadow:0 1px 2px rgba(0,0,0,.9)')
    expect(CLIENT_CSS).toContain('.wallpaper-hero__empty')
    expect(CLIENT_CSS).toContain('.livery-diag{')
    expect(CLIENT_CSS).toMatch(/@media \(prefers-reduced-transparency: reduce\),\(forced-colors: active\)\{\.livery-ui-card/)
    expect(CLIENT_CSS).toContain('.wallpaper-file-input{')
    expect(CLIENT_CSS).toContain('.wallpaper-rail{order:-1}')
    // Effect sliders are bounded inside the rail card, never viewport-wide.
    expect(CLIENT_CSS).toMatch(/\.wallpaper-effect input\{flex:1 1 100px;width:100%;min-width:96px;max-width:140px/)
    expect(CLIENT_CSS).toMatch(/\.wallpaper-effect output\{flex:0 0 54px/)
    expect(CLIENT_CSS).toMatch(/\.wallpaper-effects-grid\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(180px,1fr\)\)/)
    expect(CLIENT_CSS).toMatch(/\.livery-gallery-head\{display:flex;align-items:baseline;justify-content:space-between/)
    expect(CLIENT_CSS).toMatch(/\.wallpaper-swatches\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
    // Recent wallpapers card: compact responsive thumbnail grid.
    expect(CLIENT_CSS).toMatch(/\.wallpaper-recent-grid\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(118px,1fr\)\)/)
    expect(CLIENT_CSS).toMatch(/\.wallpaper-recent-item\{[^}]*font-size:var\(--lw-fs-caption\)/)
  })

  it('uses one shared typography scale (≤5 sizes, no ad-hoc px in modules)', () => {
    const sizes = [...CLIENT_CSS.matchAll(/font-size:([^;}]+)/g)].map(match => match[1]!.trim())
    const allowed = new Set(['display', 'title', 'body', 'label', 'caption'])
    for (const value of sizes) {
      const match = /^var\(--lw-fs-([a-z]+)\)$/.exec(value)
      expect(match, `ad-hoc font-size: ${value}`).not.toBeNull()
      expect(allowed.has(match![1]!)).toBe(true)
    }
    const tokens = [...CLIENT_CSS.matchAll(/--lw-fs-([a-z]+):([0-9.]+)px/g)]
    expect(tokens).toHaveLength(5)
    const steps = [...new Set(tokens.map(match => Number(match[2])))]
    expect(steps).toHaveLength(5)
    expect([...steps].sort((a, b) => b - a)).toEqual([20, 15, 13, 12, 11])
    const leading = [...CLIENT_CSS.matchAll(/line-height:([^;}]+)/g)].map(match => match[1]!.trim())
    expect(leading.length).toBeGreaterThan(0)
    for (const value of leading) expect(value).toBe('var(--lw-lh)')
    // Selector-level mapping for the leaks found in the live build (not just declarations):
    // chips/tabs, gallery heading, and host Input/Textarea inside our workspace.
    expect(CLIENT_CSS).toMatch(/\.livery-chip\{[^}]*font-size:var\(--lw-fs-body\)/)
    expect(CLIENT_CSS).toMatch(/\.livery-ui-card__title,\.livery-gallery-head__title\{[^}]*font-size:var\(--lw-fs-title\)/)
    expect(CLIENT_CSS).toMatch(/\.livery-search :is\(input,textarea\)\{font-size:var\(--lw-fs-body\)\}/)
    // Tokens live on every actual composition root, not only the legacy .livery-section.
    const roots = '\.livery-section,\.livery-settings,\.livery-panel,\.livery-workspace{'
    expect(CLIENT_CSS).toContain(roots.replaceAll('\\', ''))
    expect(CLIENT_CSS).toContain('--lw-fs-display:20px;--lw-fs-title:15px;--lw-fs-body:13px;--lw-fs-label:12px;--lw-fs-caption:11px')
    // Footer is a real two-line block: flex column with a gap, not inline spans.
    expect(CLIENT_CSS).toMatch(/\.livery-about\{display:flex;flex-direction:column;gap:4px\}/)
  })

  it('provides a visible focus ring and a reduced-motion fallback', () => {
    expect(CLIENT_CSS).toMatch(/:focus-visible/)
    expect(CLIENT_CSS).toMatch(/@media \(prefers-reduced-motion:reduce\)/)
  })

  it('only uses documented --dsw-* tokens for color/spacing', () => {
    const custom = [...CLIENT_CSS.matchAll(/var\((--[a-z0-9-]+)/gi)].map(match => match[1]!)
    const allowed = new Set(['--lw-fg', '--lw-2', '--lw-3', '--lw-line', '--lw-line2', '--lw-brand', '--lw-layer', '--lw-layer2', '--lw-mono', '--lw-on-brand', '--lw-err', '--lw-warn', '--lw-fs-display', '--lw-fs-title', '--lw-fs-body', '--lw-fs-label', '--lw-fs-caption', '--lw-lh', '--dsh-livery-card-surface', '--livery-accent', '--livery-secondary', '--livery-surface', '--livery-text'])
    for (const token of custom) {
      expect(token.startsWith('--dsw-') || allowed.has(token), `unexpected custom property: ${token}`).toBe(true)
    }
    // Local aliases themselves may only be defined from host tokens.
    for (const match of CLIENT_CSS.matchAll(/(--lw-[a-z0-9-]+):([^;}]+)/g)) {
      expect(match[2]!.includes('--dsw-') || match[1] === '--lw-2' || match[1] === '--lw-3' || (match[1] ?? '').startsWith('--lw-fs-') || match[1] === '--lw-lh').toBe(true)
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
