/**
 * Style-family gallery unit + server-render tests: family derivation from tags,
 * grouped sections, compact primary chips, the tag row behind the 更多筛选
 * toggle, and the global roving-focus index across section boundaries.
 */
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', async () => {
  const React = await import('react')
  type AnyProps = Record<string, unknown>
  const passthrough = (tag: string) => (props: AnyProps) =>
    React.createElement(tag, props as never)
  return {
    Button: passthrough('button'),
    Input: passthrough('input'),
    Tag: passthrough('span'),
    Modal: () => null,
    Toast: () => null,
    writeClipboard: async () => true,
  }
})
import { Gallery } from '../../src/client/ui/Gallery.js'
import type { GalleryProps } from '../../src/client/ui/Gallery.js'
import {
  FALLBACK_FAMILY,
  STYLE_FAMILIES,
  cardKeyTarget,
  familyLabelKey,
  familyOf,
  flattenGroups,
  groupByFamily,
} from '../../src/client/ui/families.js'
import type { StyleFamilyId } from '../../src/client/ui/families.js'
import { createInitialSnapshot } from '../../src/client/model.js'
import type { LiveryRuntimeSnapshot } from '../../src/client/model.js'
import type { LiveryPageProps } from '../../src/client/platform.js'
import { enUS, zhCN } from '../../src/i18n/index.js'
import { makeCatalog, makeLivery, TEST_ADAPTER } from './fixtures.js'

const IDENTITY = {
  adapterId: TEST_ADAPTER.adapterId,
  contractHash: TEST_ADAPTER.contractHash,
  pluginVersion: '0.1.0',
  hostVersion: TEST_ADAPTER.hostVersion,
}

function translate(dict: Record<string, string>): LiveryPageProps['t'] {
  return ((key: string, params?: Record<string, unknown>): string => {
    const template = dict[key] ?? `!${key}`
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? `{${name}}`))
  }) as unknown as LiveryPageProps['t']
}

/** One style per family, ordered by tag priority inputs. */
const catalog = makeCatalog([
  makeLivery('fjord', { order: 10, tags: ['calm'] }),
  makeLivery('moss', { order: 20, tags: ['organic'] }),
  makeLivery('amber', { order: 30, tags: ['retro', 'warm'] }),
  makeLivery('midnight', { order: 40, tags: ['deep'] }),
  makeLivery('linen', { order: 50, tags: ['cool', 'paper'] }),
  makeLivery('sakura', { order: 60, tags: ['neon', 'playful'] }),
])

const base = createInitialSnapshot(IDENTITY, { status: 'valid', reason: undefined, diagnostics: [] })
const READY: LiveryRuntimeSnapshot = {
  ...base,
  phase: 'ready',
  bootStatus: 'valid',
  catalogStatus: 'ready',
  catalog,
  capabilities: catalog.capabilities,
  catalogProfile: catalog.catalogProfile,
  configStatus: 'ready',
  writable: true,
  confirmedId: 'fjord',
  effectiveId: 'fjord',
  locale: 'en',
}

function renderGallery(
  locale: 'zh' | 'en' = 'en',
  overrides: Partial<GalleryProps> = {},
): string {
  const props = {
    t: translate(locale === 'zh' ? zhCN : enUS),
    snapshot: READY,
    filter: { query: '', tagId: undefined },
    onFilterChange: () => undefined,
    onPreview: () => undefined,
    previewLocaleChoice: 'follow',
    previewLocale: 'en',
    onPreviewLocaleChange: () => undefined,
    ...overrides,
  } as unknown as GalleryProps
  return renderToStaticMarkup(<Gallery {...props} />)
}

describe('style family derivation', () => {
  it('maps all sixteen tag ids to the six families', () => {
    const mapping: Record<string, StyleFamilyId> = {
      calm: 'calm', elegant: 'calm', muted: 'calm',
      organic: 'nature',
      retro: 'retro', warm: 'retro', classic: 'retro',
      deep: 'dark', neutral: 'dark', tech: 'dark',
      cool: 'light', paper: 'light', ink: 'light',
      neon: 'vivid', playful: 'vivid', contrast: 'vivid',
    }
    for (const [tag, family] of Object.entries(mapping)) {
      const livery = makeLivery(`style-${tag}`, { tags: [tag] })
      expect(familyOf(livery), tag).toBe(family)
    }
    expect(STYLE_FAMILIES).toEqual(['calm', 'nature', 'light', 'retro', 'vivid', 'dark'])
  })

  it('uses the documented priority order for multi-family tags', () => {
    expect(familyOf(makeLivery('a', { tags: ['organic', 'calm'] }))).toBe('nature')
    expect(familyOf(makeLivery('b', { tags: ['neon', 'deep'] }))).toBe('vivid')
    expect(familyOf(makeLivery('c', { tags: ['contrast', 'retro'] }))).toBe('retro')
    expect(familyOf(makeLivery('d', { tags: ['ink'] }))).toBe('light')
  })

  it('falls back deterministically for unknown tag vocabularies', () => {
    expect(familyOf(makeLivery('unknown', { tags: ['not-a-tag'] }))).toBe(FALLBACK_FAMILY)
    expect(familyOf(makeLivery('empty', { tags: [] }))).toBe(FALLBACK_FAMILY)
  })

  it('groups in family order and filters to one family', () => {
    const groups = groupByFamily(catalog.liveries)
    expect(groups.map(group => group.family)).toEqual([...STYLE_FAMILIES])
    expect(groups.map(group => group.liveries.length)).toEqual([1, 1, 1, 1, 1, 1])
    expect(flattenGroups(groups).map(livery => livery.id)).toEqual([
      'fjord', 'moss', 'linen', 'amber', 'sakura', 'midnight',
    ])
    const dark = groupByFamily(catalog.liveries, 'dark')
    expect(dark).toHaveLength(1)
    expect(dark[0]!.liveries.map(livery => livery.id)).toEqual(['midnight'])
  })

  it('exposes localized labels for every family', () => {
    for (const family of STYLE_FAMILIES) {
      const key = familyLabelKey(family)
      expect(enUS[key], `en ${family}`).toBeTruthy()
      expect(zhCN[key], `zh ${family}`).toBeTruthy()
    }
    expect(familyLabelKey('calm')).toBe('family.calm')
    expect(zhCN['family.calm']).toBe('静谧')
    expect(enUS['family.calm']).toBe('Calm')
  })
})

describe('roving focus across family sections', () => {
  it('moves by card index across section boundaries and clamps at the ends', () => {
    // 6 cards, 3 columns: 0..2 / 3..5 (two notional sections of three).
    expect(cardKeyTarget('ArrowRight', 2, 6, 3)).toBe(3)
    expect(cardKeyTarget('ArrowLeft', 3, 6, 3)).toBe(2)
    expect(cardKeyTarget('ArrowDown', 0, 6, 3)).toBe(3)
    expect(cardKeyTarget('ArrowUp', 4, 6, 3)).toBe(1)
    expect(cardKeyTarget('Home', 5, 6, 3)).toBe(0)
    expect(cardKeyTarget('End', 0, 6, 3)).toBe(5)
    expect(cardKeyTarget('ArrowLeft', 0, 6, 3)).toBe(0)
    expect(cardKeyTarget('ArrowRight', 5, 6, 3)).toBe(5)
    expect(cardKeyTarget('Enter', 2, 6, 3)).toBeUndefined()
    expect(cardKeyTarget(' ', 2, 6, 3)).toBeUndefined()
    expect(cardKeyTarget('ArrowRight', 0, 0, 3)).toBeUndefined()
  })
})

describe('family-grouped gallery render', () => {
  it('renders 全部 + six family chips as the primary filter row', () => {
    const html = renderGallery()
    expect(html.match(/data-testid="livery-family-chip"/g)).toHaveLength(7)
    for (const family of ['all', ...STYLE_FAMILIES]) {
      expect(html).toContain(`data-family="${family}"`)
    }
    expect(html).toMatch(/data-family="all"[^>]*aria-pressed="true"/)
    expect(html).toContain('>Calm<')
    expect(html).toContain('>Nature<')
    expect(html).toContain('>Vivid<')
    expect(html).toContain('aria-label="Style family"')
  })

  it('localizes the family chips in zh', () => {
    const html = renderGallery('zh')
    expect(html).toContain('>静谧<')
    expect(html).toContain('>自然<')
    expect(html).toContain('>霓虹<')
    expect(html).toContain('aria-label="风格分组"')
  })

  it('groups cards into presentation-only family sections in family order', () => {
    const html = renderGallery()
    expect(html.match(/data-testid="livery-family"/g)).toHaveLength(6)
    for (const family of STYLE_FAMILIES) {
      expect(html).toContain(`data-testid="livery-family-${family}"`)
    }
    // Family order: first occurrence of each section testid follows STYLE_FAMILIES.
    const positions = STYLE_FAMILIES.map(family => html.indexOf(`data-testid="livery-family-${family}"`))
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    // Single listbox, cards as options, sections as groups.
    expect(html.match(/role="listbox"/g)).toHaveLength(1)
    expect(html.match(/role="group"/g)?.length).toBeGreaterThanOrEqual(6)
    expect(html.match(/data-testid="livery-card"/g)).toHaveLength(6)
    expect(html.match(/role="option"/g)).toHaveLength(6)
  })

  it('keeps the tag row behind the 更多筛选 toggle until opened', () => {
    const collapsed = renderGallery()
    expect(collapsed).toContain('data-testid="livery-more-filters"')
    expect(collapsed).toMatch(/data-testid="livery-more-filters"[^>]*aria-expanded="false"/)
    expect(collapsed).toContain('More filters')
    expect(collapsed).not.toContain('data-testid="livery-tag"')

    const expanded = renderGallery('en', { initialMoreFiltersOpen: true })
    expect(expanded).toMatch(/data-testid="livery-more-filters"[^>]*aria-expanded="true"/)
    expect(expanded).toContain('Fewer filters')
    expect(expanded).toContain('data-testid="livery-tag"')
    expect(expanded).toContain('data-tag="calm"')
    expect(expanded).toContain('data-tag="neon"')
    // The tag row still targets the same accessible group label.
    expect(expanded).toContain('aria-label="Filter by tag"')
  })

  it('filters to a single family when a family chip is active', () => {
    const html = renderGallery('en', { initialFamily: 'dark' })
    expect(html).toMatch(/data-family="dark"[^>]*aria-pressed="true"/)
    expect(html.match(/data-testid="livery-family"/g)).toHaveLength(1)
    expect(html).toContain('data-testid="livery-family-dark"')
    expect(html.match(/data-testid="livery-card"/g)).toHaveLength(1)
    expect(html).toContain('data-livery-id="midnight"')
    expect(html).not.toContain('data-testid="livery-family-calm"')
  })

  it('keeps the existing gallery/search hooks intact', () => {
    const html = renderGallery()
    expect(html).toContain('data-testid="livery-gallery"')
    expect(html).toContain('data-testid="livery-search"')
    expect(html).toContain('data-testid="livery-locale-tab"')
    expect(html).toContain('data-testid="livery-family"')
    expect(html).toContain('6 visual styles')
  })

  it('shows the empty state instead of sections when nothing matches', () => {
    const html = renderGallery('en', { filter: { query: 'zzzz-no-style', tagId: undefined } })
    expect(html).toContain('data-testid="livery-empty"')
    expect(html).not.toContain('data-testid="livery-gallery"')
    expect(html).not.toContain('data-testid="livery-family"')
  })
})
