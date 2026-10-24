/**
 * Audit gate tests: token coverage, CSS safety (postcss-based) and contrast
 * summarisation. These gates ship the catalog, so each check gets an artificial
 * bad fixture in addition to the clean one.
 */
import { describe, expect, it } from 'vitest'
import {
  EMITTED_TOKEN_NAMES,
  REQUIRED_TOKENS,
  SIZE_BUDGETS,
  TOKEN_EXEMPTIONS,
  Z_INDEX_BUDGET,
  auditCssFragments,
  auditLiveryCss,
  buildContrastArtifact,
  buildTokenCoverageArtifact,
  coverTokens,
  exemptionDetails,
} from '../../src/compiler/audit.js'
import type { CompiledLivery, ContrastEntry } from '../../src/core/types.js'

const CLEAN_LIVERY_CSS = [
  'body[data-dsh-livery="fjord"] { --dsw-alias-bg-base: #ffffff; --dsw-alias-label-primary: #111111; color: var(--dsw-alias-label-primary); }',
  'body[data-dsh-livery="fjord"][data-ds-dark-theme] { --dsw-alias-bg-base: #151517; }',
  '@layer dsh-livery.compat { body[data-dsh-livery] [data-composer-root] { color: var(--dsw-alias-label-primary); } }',
].join('\n')

const CLEAN_TYPOGRAPHY_CSS = ':root:lang(zh-CN) { --dsw-font-family: "PingFang SC", sans-serif; }\n:root:lang(en-US) { --dsw-font-family: system-ui, sans-serif; }'

function safetyFor(css: string) {
  return auditCssFragments([{ axis: 'tokens', css }])
}

describe('token coverage', () => {
  it('derives the A-tier required set from consumed host tokens', () => {
    expect(REQUIRED_TOKENS.length).toBeGreaterThan(100)
    for (const token of REQUIRED_TOKENS) {
      expect(token).toMatch(/^--dsw-(alias|specific|static)-[a-z0-9-]+$/)
    }
    expect(REQUIRED_TOKENS).toContain('--dsw-alias-bg-base')
    expect(REQUIRED_TOKENS).toContain('--dsw-specific-bubble')
    expect(REQUIRED_TOKENS).toContain('--dsw-static-neutral-100')
    expect(REQUIRED_TOKENS).not.toContain('--dsw-radius-sm')
    expect(REQUIRED_TOKENS).not.toContain('--dsw-font-family')
  })

  it('emits the consumed alias/specific tokens plus directly-painted static steps', () => {
    expect(EMITTED_TOKEN_NAMES.size).toBeGreaterThan(80)
    expect(EMITTED_TOKEN_NAMES.size).toBeLessThan(REQUIRED_TOKENS.length)
    for (const token of EMITTED_TOKEN_NAMES) {
      expect(REQUIRED_TOKENS).toContain(token)
    }
  })

  it('reports nothing missing when every required token is generated', () => {
    const coverage = coverTokens(REQUIRED_TOKENS)
    expect(coverage.missing).toEqual([])
    expect(coverage.covered).toHaveLength(REQUIRED_TOKENS.length)
  })

  it('fails uncovered non-exempt tokens and documents exempt inheritance', () => {
    const coverage = coverTokens([])
    expect(coverage.covered).toEqual([])
    expect(coverage.missing.length).toBeGreaterThan(0)
    expect(coverage.missing).toContain('--dsw-alias-bg-base')
    expect(coverage.missing).toContain('--dsw-alias-label-primary')
    expect(coverage.inherited.length + coverage.missing.length).toBe(REQUIRED_TOKENS.length)
    for (const token of coverage.inherited) {
      expect(TOKEN_EXEMPTIONS.some((exemption) => exemption.token === token)).toBe(true)
    }
  })

  it('keeps the exemption list versioned and reasoned', () => {
    expect(TOKEN_EXEMPTIONS.length).toBeGreaterThan(0)
    for (const exemption of TOKEN_EXEMPTIONS) {
      expect(exemption.since).toMatch(/^dsh-/)
      expect(exemption.reason.length).toBeGreaterThan(10)
    }
    expect(exemptionDetails([]).length).toBe(0)
    const details = exemptionDetails(['--dsw-alias-border-l1'])
    expect(details).toHaveLength(1)
    expect(details[0]?.token).toBe('--dsw-alias-border-l1')
  })

  it('excludes deliberately inherited and theme-internal tokens from the missing list', () => {
    const generated = REQUIRED_TOKENS.filter(
      (token) => token !== '--dsw-alias-file-diff-added-bg' && token !== '--dsw-static-neutral-bluish-100',
    )
    const coverage = coverTokens(generated)
    expect(coverage.missing).toEqual([])
    expect(coverage.inherited).toContain('--dsw-alias-file-diff-added-bg')
    expect(coverage.inherited).toContain('--dsw-static-neutral-bluish-100')
  })

  it('still fails a future required token that no exemption covers', () => {
    // Simulate a host contract bump: a required token appears that is not emitted
    // and has no versioned exemption.
    const coverage = coverTokens([])
    expect(coverage.missing).toContain('--dsw-alias-bg-base')
    expect(coverage.missing).not.toContain('--dsw-alias-file-diff-added-bg')
  })
})

describe('CSS safety', () => {
  it('passes clean scoped sheets, including :root:lang and @layer compat rules', () => {
    const result = safetyFor(`${CLEAN_LIVERY_CSS}\n${CLEAN_TYPOGRAPHY_CSS}`)
    expect(result.details.violations).toEqual([])
    expect(result.report.pass).toBe(true)
    expect(result.report.important).toBe(0)
    expect(result.report.hashSelectors).toBe(0)
    expect(result.report.remoteUrls).toBe(0)
    expect(result.report.unscopedTokens).toBe(0)
    expect(result.report.elementSelectors).toEqual([])
  })

  it('detects !important', () => {
    const result = safetyFor('body[data-dsh-livery] { color: red !important; }')
    expect(result.report.important).toBe(1)
    expect(result.report.pass).toBe(false)
  })

  it('detects CSS-Modules hash class selectors', () => {
    const result = safetyFor('body[data-dsh-livery] ._copied_38jqx_36 { color: red; }')
    expect(result.report.hashSelectors).toBeGreaterThan(0)
    expect(result.report.pass).toBe(false)
  })

  it('detects remote URLs and font faces', () => {
    expect(safetyFor('body[data-dsh-livery] { background: url(https://cdn.example.com/a.png); }').report.remoteUrls).toBe(1)
    expect(safetyFor('body[data-dsh-livery] { background: url("//cdn.example.com/a.png"); }').report.remoteUrls).toBe(1)
    expect(safetyFor('body[data-dsh-livery] { color: red; } @import "https://x/y.css";').report.remoteUrls).toBe(1)
    expect(safetyFor('@font-face { font-family: Evil; src: local(Evil); }').report.remoteUrls).toBe(1)
  })

  it('flags element-level / unscoped selectors', () => {
    const result = safetyFor('button { color: red; }\n* { color: red; }\nbody[data-dsh-livery] { color: red; }')
    expect(result.report.elementSelectors.length).toBe(2)
    expect(result.report.pass).toBe(false)
  })

  it('flags token declarations outside the livery scope', () => {
    const result = safetyFor(':root { --dsw-alias-bg-base: red; }\nbody[data-dsh-livery] { --dsw-alias-label-primary: red; }')
    expect(result.report.unscopedTokens).toBe(1)
    expect(result.details.unscopedTokenNames).toEqual(['tokens: --dsw-alias-bg-base'])
    expect(result.report.pass).toBe(false)
  })

  it('enforces the fixed z-index budget', () => {
    expect(safetyFor('body[data-dsh-livery] { z-index: 10; }').report.pass).toBe(true)
    const over = safetyFor(`body[data-dsh-livery] { z-index: ${Z_INDEX_BUDGET + 80}; }`)
    expect(over.report.fixedZIndexes).toEqual([Z_INDEX_BUDGET + 80])
    expect(over.report.pass).toBe(false)
    expect(safetyFor('body[data-dsh-livery] { z-index: -1; }').report.pass).toBe(false)
  })

  it('rejects </style> escape sequences', () => {
    const result = safetyFor('body[data-dsh-livery] { --dsw-alias-bg-base: red; } /* </style><script> */')
    expect(result.details.closeStyleSequences).toBe(1)
    expect(result.report.pass).toBe(false)
  })

  it('requires layout compensation rules to live in @layer dsh-livery.compat', () => {
    const unlayered = auditCssFragments([{ axis: 'layout', css: 'body[data-dsh-livery] [data-x] { gap: 4px; }' }])
    expect(unlayered.details.unlayeredCompatRules).toBe(1)
    expect(unlayered.report.pass).toBe(false)
    const layered = auditCssFragments([
      { axis: 'layout', css: '@layer dsh-livery.compat { body[data-dsh-livery] [data-x] { gap: 4px; } }' },
    ])
    expect(layered.details.unlayeredCompatRules).toBe(0)
    expect(layered.report.pass).toBe(true)
  })

  it('enforces the per-livery CSS size budget', () => {
    const small = auditLiveryCss({
      id: 'small',
      css: { tokens: 'body[data-dsh-livery]{color:red}', typography: '', layout: '' },
    })
    expect(small.overBudget).toBe(false)
    expect(small.bytes.total).toBeLessThan(SIZE_BUDGETS.liveryBytes)
    const huge = 'body[data-dsh-livery] { color: red; }\n'.repeat(SIZE_BUDGETS.liveryBytes)
    const over = auditLiveryCss({ id: 'huge', css: { tokens: huge, typography: '', layout: '' } })
    expect(over.overBudget).toBe(true)
  })

  it('fails closed when a fragment does not parse', () => {
    const result = safetyFor('body[data-dsh-livery] { color: red; ')
    expect(result.report.pass).toBe(false)
    expect(result.details.violations[0]).toContain('does not parse')
  })
})

describe('contrast artifact', () => {
  function entry(role: string, ratio: number, min: number): ContrastEntry {
    return { role, foreground: '#000000', background: '#ffffff', ratio, min, pass: ratio >= min, kind: 'text' }
  }

  function fakeLivery(id: string, light: readonly ContrastEntry[], dark: readonly ContrastEntry[]): CompiledLivery {
    const context = {
      seeds: { accent: '#000000', secondary: '#000000', surface: '#ffffff', text: '#000000' },
      tokens: {},
      contrast: [],
    }
    return {
      id,
      meta: {
        name: { 'zh-CN': id, 'en-US': id },
        description: { 'zh-CN': id, 'en-US': id },
        tags: ['calm'],
        order: 1,
      },
      typography: {
        ui: { 'zh-CN': 'ui', 'en-US': 'ui' },
        content: { 'zh-CN': 'content', 'en-US': 'content' },
        code: 'code',
        metrics: {
          'zh-CN': { id: 'cjk-comfortable', lineHeight: 1.55, note: '' },
          'en-US': { id: 'latin-default', lineHeight: 1.45, note: '' },
        },
      },
      layout: { density: 'host', conversationWidth: 'host', messageFlow: 'stock', surfaceStyle: 'solid' },
      requiredCapabilities: ['theme-css'],
      optionalCapabilities: [],
      light: { ...context, contrast: light },
      dark: { ...context, contrast: dark },
      css: { tokens: '', typography: '', layout: '' },
      cssHash: 'sha256:css',
      hash: 'sha256:x',
      audit: {
        contrast: [...light, ...dark],
        contrastFailures: [...light, ...dark].filter((item) => !item.pass).length,
        tokenCoverage: { covered: [], inherited: [], missing: [] },
        cssSafety: { important: 0, hashSelectors: 0, elementSelectors: [], remoteUrls: 0, unscopedTokens: 0, fixedZIndexes: [], pass: true },
        degraded: [],
      },
    }
  }

  const artifactContext = {
    sourceHash: 'sha256:source',
    contractHash: 'sha256:contract',
    compiledAt: '2026-01-01T00:00:00.000Z',
    adapterId: 'dsh-0.2.0-rc.2-r1',
    hostVersion: '0.2.0-rc.2',
  }

  it('summarises passing contrast and stays green', () => {
    const artifact = buildContrastArtifact([fakeLivery('ok', [entry('body', 7.1, 4.5)], [entry('body', 8.2, 4.5)])], artifactContext)
    expect(artifact.summary.total).toBe(2)
    expect(artifact.summary.failures).toBe(0)
    expect(artifact.pass).toBe(true)
    expect(artifact.liveries[0]?.light.smallestRatio).toBe(7.1)
  })

  it('fails the gate and lists per-livery/mode failures', () => {
    const artifact = buildContrastArtifact([fakeLivery('bad', [entry('link', 3.2, 4.5)], [entry('caption', 2.1, 4.5)])], artifactContext)
    expect(artifact.pass).toBe(false)
    expect(artifact.summary.failures).toBe(2)
    expect(artifact.failures.map((failure) => failure.mode)).toEqual(['light', 'dark'])
  })

  it('builds a token-coverage artifact with counts and applied exemptions', () => {
    const artifact = buildTokenCoverageArtifact([], artifactContext)
    expect(artifact.schemaVersion).toBe(1)
    expect(artifact.counts.required).toBe(REQUIRED_TOKENS.length)
    expect(artifact.counts.covered).toBe(0)
    expect(artifact.counts.missing).toBe(REQUIRED_TOKENS.length - artifact.counts.inherited)
    expect(artifact.pass).toBe(false)
  })
})
