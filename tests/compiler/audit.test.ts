/**
 * Audit gate tests: per-version token coverage, CSS safety (postcss-based) and
 * contrast summarisation. These gates ship each catalog profile, so each check
 * gets an artificial bad fixture in addition to the clean one.
 */
import { describe, expect, it } from 'vitest'
import {
  SIZE_BUDGETS,
  Z_INDEX_BUDGET,
  auditCssFragments,
  auditLiveryCss,
  buildContrastArtifact,
  buildTokenCoverageArtifact,
  coverCatalog,
  coverTokens,
  exemptionDetails,
  inheritedUnconsumedTokens,
  liveryTokenNames,
  selectEmittedVariant,
  tokenSetsFor,
  type ArtifactContext,
  type StockTokenSets,
} from '../../src/compiler/audit.js'
import type { CompiledLivery, ContrastEntry } from '../../src/core/types.js'
import { ADAPTERS } from '../../src/generated/contract.js'
import { stockForVersion } from '../../src/generated/stock.js'

const RC2_STOCK = stockForVersion('0.2.0-rc.2')
const RC21_STOCK = stockForVersion('0.2.1-rc.2')
if (RC2_STOCK === undefined || RC21_STOCK === undefined) throw new Error('stock snapshots missing')
const RC2_SETS = tokenSetsFor(RC2_STOCK)
const RC21_SETS = tokenSetsFor(RC21_STOCK)

const CLEAN_LIVERY_CSS = [
  'body[data-dsh-livery="fjord"] { --dsw-alias-bg-base: #ffffff; --dsw-alias-label-primary: #111111; color: var(--dsw-alias-label-primary); }',
  'body[data-dsh-livery="fjord"][data-ds-dark-theme] { --dsw-alias-bg-base: #151517; }',
  '@layer dsh-livery.compat { body[data-dsh-livery] [data-composer-root] { color: var(--dsw-alias-label-primary); } }',
].join('\n')

const CLEAN_TYPOGRAPHY_CSS = ':root:lang(zh) body[data-dsh-livery="fjord"] { --dsw-font-family: "PingFang SC", sans-serif; }'

function safetyFor(css: string) {
  return auditCssFragments([{ axis: 'tokens', css }])
}

function artifactContextFor(sets: StockTokenSets): ArtifactContext {
  const adapter = ADAPTERS.find((candidate) => stockForVersion(candidate.hostVersion)?.tokenContractHash === sets.tokenContractHash)
  if (adapter === undefined) throw new Error('no adapter for token contract')
  return {
    profileId: adapter.catalogProfile,
    sourceHash: 'sha256:source',
    compiledAt: '2026-01-01T00:00:00.000Z',
    sourceAdapters: [adapter.hostVersion],
    adapterIds: [adapter.adapterId],
    contractHash: adapter.contractHash,
    hostVersion: adapter.hostVersion,
    adapterId: adapter.adapterId,
    tokenSets: sets,
  }
}

const EMPTY_VARIANT = {
  seeds: { accent: '#000000', secondary: '#000000', surface: '#ffffff', text: '#000000' },
  tokens: {},
  contrast: [] as const,
}

describe('token coverage per host token contract', () => {
  it('computes the required sets from each snapshot (177 consumed in rc.2 vs 176 in 0.2.1)', () => {
    expect(RC2_SETS.consumed.length).toBe(177)
    expect(RC21_SETS.consumed.length).toBe(176)
    expect(RC2_SETS.required.length).toBe(146)
    expect(RC21_SETS.required.length).toBe(144)
    expect(RC2_SETS.aliasSpecific.length).toBe(86)
    expect(RC21_SETS.aliasSpecific.length).toBe(87)
    expect(RC2_SETS.directStatics.length).toBe(13)
    expect(RC21_SETS.directStatics.length).toBe(10)
    expect(RC2_SETS.emitted.size).toBe(99)
    expect(RC21_SETS.emitted.size).toBe(97)
    for (const sets of [RC2_SETS, RC21_SETS]) {
      for (const token of sets.required) expect(token).toMatch(/^--dsw-(alias|specific|static)-[a-z0-9-]+$/)
      expect(sets.required).toContain('--dsw-alias-bg-base')
      expect(sets.required).toContain('--dsw-specific-bubble')
      expect(sets.required).not.toContain('--dsw-radius-sm')
      expect(sets.required).not.toContain('--dsw-font-family')
    }
  })

  it('derives every set from the snapshot, never a hardcoded table', () => {
    for (const [stock, sets] of [
      [RC2_STOCK, RC2_SETS],
      [RC21_STOCK, RC21_SETS],
    ] as const) {
      const consumed = Object.entries(stock.tokens)
        .filter(([, declaration]) => declaration.referencedBy.length > 0)
        .map(([name]) => name)
        .sort()
      expect(sets.consumed).toEqual(consumed)
      const directStatics = Object.entries(stock.tokens)
        .filter(
          ([name, declaration]) =>
            name.startsWith('--dsw-static-') &&
            declaration.referencedBy.some((pkg) => pkg !== 'dsh-client-ui-theme'),
        )
        .map(([name]) => name)
        .sort()
      expect(sets.directStatics).toEqual(directStatics)
    }
  })

  it('reports nothing missing when every required token is generated', () => {
    for (const sets of [RC2_SETS, RC21_SETS]) {
      const coverage = coverTokens(sets.required, sets)
      expect(coverage.missing).toEqual([])
      expect(coverage.covered).toHaveLength(sets.required.length)
    }
  })

  it('fails uncovered non-exempt tokens and documents exempt inheritance', () => {
    const coverage = coverTokens([], RC2_SETS)
    expect(coverage.covered).toEqual([])
    expect(coverage.missing).toContain('--dsw-alias-bg-base')
    expect(coverage.missing).toContain('--dsw-alias-label-primary')
    expect(coverage.inherited.length + coverage.missing.length).toBe(RC2_SETS.required.length)
    for (const token of coverage.inherited) expect(RC2_SETS.exemptions.has(token)).toBe(true)
  })

  it('keeps the exemption list versioned and reasoned', () => {
    expect(RC2_SETS.exemptions.size).toBeGreaterThan(0)
    for (const exemption of RC2_SETS.exemptions.values()) {
      expect(exemption.since.length).toBeGreaterThan(0)
      expect(exemption.reason.length).toBeGreaterThan(10)
    }
    expect(exemptionDetails([], RC2_SETS)).toEqual([])
    expect(exemptionDetails(['--dsw-alias-border-l1'], RC2_SETS)[0]?.token).toBe('--dsw-alias-border-l1')
  })

  it('excludes deliberately inherited and theme-internal tokens from the missing list', () => {
    const generated = RC2_SETS.required.filter(
      (token) => token !== '--dsw-alias-file-diff-added-bg' && token !== '--dsw-static-neutral-bluish-100',
    )
    const coverage = coverTokens(generated, RC2_SETS)
    expect(coverage.missing).toEqual([])
    expect(coverage.inherited).toContain('--dsw-alias-file-diff-added-bg')
    expect(coverage.inherited).toContain('--dsw-static-neutral-bluish-100')
  })

  it('still fails a required token that no exemption covers', () => {
    const coverage = coverTokens([], RC2_SETS)
    expect(coverage.missing).toContain('--dsw-alias-bg-base')
    expect(coverage.missing).not.toContain('--dsw-alias-file-diff-added-bg')
  })

  it('trims derived variants idempotently to the consumed-token policy', () => {
    const variant = {
      ...EMPTY_VARIANT,
      tokens: {
        '--dsw-alias-bg-base': '#f0f3f6',
        '--dsw-static-neutral-bluish-100': '#111111',
        '--dsw-alias-not-consumed': '#222222',
      },
    }
    const trimmed = selectEmittedVariant(variant, RC2_SETS)
    expect(trimmed.tokens).toEqual({ '--dsw-alias-bg-base': '#f0f3f6' })
    expect(selectEmittedVariant(trimmed, RC2_SETS)).toEqual(trimmed)
    expect(liveryTokenNames({ light: trimmed, dark: trimmed })).toEqual(['--dsw-alias-bg-base'])
    expect(inheritedUnconsumedTokens(Object.keys(variant.tokens), RC2_SETS)).toEqual([
      '--dsw-alias-not-consumed',
      '--dsw-static-neutral-bluish-100',
    ])
  })

  it('always keeps explicit manifest overrides, even for unconsumed tokens', () => {
    const variant = {
      ...EMPTY_VARIANT,
      tokens: { '--dsw-alias-bg-base': '#f0f3f6', '--dsw-specific-tip': '#f2e8ee' },
    }
    const filtered = selectEmittedVariant(variant, RC2_SETS)
    expect(filtered.tokens['--dsw-specific-tip']).toBeUndefined()
    const withOverride = selectEmittedVariant(variant, RC2_SETS, new Set(['--dsw-specific-tip']))
    expect(withOverride.tokens).toEqual({ '--dsw-alias-bg-base': '#f0f3f6', '--dsw-specific-tip': '#f2e8ee' })
    expect(selectEmittedVariant(withOverride, RC2_SETS, new Set(['--dsw-specific-tip']))).toEqual(withOverride)
  })

  it('aggregates coverage across a catalog', () => {
    const emptyLivery = { light: EMPTY_VARIANT, dark: EMPTY_VARIANT }
    const coverage = coverCatalog([emptyLivery, emptyLivery], RC2_SETS)
    expect(coverage.covered).toEqual([])
    expect(coverage.missing.length).toBeGreaterThan(0)
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
    const layered = auditCssFragments([
      { axis: 'layout', css: '@layer dsh-livery.compat { body[data-dsh-livery] [data-x] { gap: 4px; } }' },
    ])
    expect(layered.details.unlayeredCompatRules).toBe(0)
    expect(layered.report.pass).toBe(true)
  })

  it('enforces the per-livery CSS size budget', () => {
    const small = auditLiveryCss({ id: 'small', css: { tokens: 'body[data-dsh-livery]{color:red}', typography: '', layout: '' } })
    expect(small.overBudget).toBe(false)
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

describe('contrast and coverage artifacts', () => {
  function entry(role: string, ratio: number, min: number): ContrastEntry {
    return { role, foreground: '#000000', background: '#ffffff', ratio, min, pass: ratio >= min, kind: 'text' }
  }

  function fakeLivery(id: string, light: readonly ContrastEntry[], dark: readonly ContrastEntry[]): CompiledLivery {
    const variant = { seeds: { accent: '#000000', secondary: '#000000', surface: '#ffffff', text: '#000000' }, tokens: {}, contrast: [] as const }
    return {
      id,
      meta: { name: { 'zh-CN': id, 'en-US': id }, description: { 'zh-CN': id, 'en-US': id }, tags: ['calm'], order: 1 },
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
      light: { ...variant, contrast: light },
      dark: { ...variant, contrast: dark },
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

  const context = artifactContextFor(RC2_SETS)

  it('summarises passing contrast and stays green', () => {
    const artifact = buildContrastArtifact([fakeLivery('ok', [entry('body', 7.1, 4.5)], [entry('body', 8.2, 4.5)])], context)
    expect(artifact.summary.total).toBe(2)
    expect(artifact.summary.failures).toBe(0)
    expect(artifact.pass).toBe(true)
    expect(artifact.profileId).toBe(context.profileId)
    expect(artifact.tokenContractHash).toBe(RC2_STOCK.tokenContractHash)
    expect(artifact.liveries[0]?.light.smallestRatio).toBe(7.1)
  })

  it('fails the gate and lists per-livery/mode failures', () => {
    const artifact = buildContrastArtifact([fakeLivery('bad', [entry('link', 3.2, 4.5)], [entry('caption', 2.1, 4.5)])], context)
    expect(artifact.pass).toBe(false)
    expect(artifact.summary.failures).toBe(2)
    expect(artifact.failures.map((failure) => failure.mode)).toEqual(['light', 'dark'])
  })

  it('builds a token-coverage artifact with counts and applied exemptions', () => {
    const artifact = buildTokenCoverageArtifact([], context, [])
    expect(artifact.schemaVersion).toBe(1)
    expect(artifact.counts.consumed).toBe(RC2_SETS.consumed.length)
    expect(artifact.counts.required).toBe(RC2_SETS.required.length)
    expect(artifact.counts.missing).toBe(RC2_SETS.required.length - artifact.counts.inherited)
    expect(artifact.pass).toBe(false)
  })
})
