import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { CLIENT_CSS } from '../../src/styles/client.js'

describe('client stylesheet (plan §18.3 / §18.8)', () => {
  it('stays inside the 8KB budget', () => {
    expect(new TextEncoder().encode(CLIENT_CSS).length).toBeLessThanOrEqual(8 * 1024)
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
