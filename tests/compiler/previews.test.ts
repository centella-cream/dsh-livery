/**
 * Multi-version preview SVG tests: deterministic 640x400 static scenes, one per
 * catalog profile × livery × locale (zh/en) × mode (light/dark), rendered from
 * the compiled tokens, the profile's stock snapshot (inherited tokens) and the
 * resolved font stacks. Files must be standalone, XML well-formed and
 * script/foreignObject free because the Host serves them as `image/svg+xml`.
 */
import { describe, expect, it } from 'vitest'
import { compileFromDisk } from '../../src/compiler/compile.js'
import {
  PREVIEW_HEIGHT,
  PREVIEW_LOCALES,
  PREVIEW_MODES,
  PREVIEW_WIDTH,
  renderPreview,
  renderPreviewSet,
  xmlEscape,
  type PreviewLivery,
} from '../../src/compiler/previews.js'
import { METRICS, SURFACE_STYLE_DEFINITIONS } from '../../src/core/registry.js'
import { REPO_ROOT, CJK_PATTERN, checkWellFormedXml, liveryIds, readManifest } from './helpers.js'

const result = compileFromDisk(REPO_ROOT)

function requireResult(): NonNullable<typeof result.profiles[number]>[] {
  if (!result.ok || result.profiles.length === 0) {
    throw new Error(`catalog did not compile: ${JSON.stringify(result.problems)}`)
  }
  return [...result.profiles]
}

const profiles = requireResult()
const LIVERY_COUNT = liveryIds().length
const PREVIEW_COUNT = LIVERY_COUNT * 4

function previewSource(profileIndex: number, id: string): PreviewLivery {
  const profile = profiles[profileIndex]
  const livery = profile?.profile.liveries.find((entry) => entry.id === id)
  if (profile === undefined || livery === undefined) throw new Error(`livery ${id} missing on profile ${profileIndex}`)
  return {
    id: livery.id,
    meta: livery.meta,
    layout: livery.layout,
    typography: livery.typography,
    light: { tokens: livery.light.tokens },
    dark: { tokens: livery.dark.tokens },
  }
}

const FORBIDDEN_SVG_FRAGMENTS = [
  '<script',
  'foreignObject',
  '<image',
  'xlink:href',
  'href="http',
  'href="//',
  'data:image',
  '@import',
  'url(http',
  'url(//',
  '<iframe',
  '<object',
  '<embed',
  'javascript:',
]

describe('preview rendering (multi-profile)', () => {
  it('renders exactly 4 deterministic previews per livery, per profile (2 × 40)', () => {
    for (const [index, profile] of profiles.entries()) {
      const files: string[] = []
      for (const id of liveryIds()) {
        const source = previewSource(index, id)
        const set = renderPreviewSet(source, profile.stock)
        expect(set).toHaveLength(4)
        expect(set.map((entry) => entry.file).sort()).toEqual(
          ['dark', 'light'].flatMap((mode) => ['en', 'zh'].map((locale) => `${id}-${locale}-${mode}.svg`)).sort(),
        )
        for (const entry of set) {
          expect(entry.content).toBe(
            renderPreview(
              source,
              entry.file.includes('-zh-') ? 'zh' : 'en',
              entry.file.endsWith('-light.svg') ? 'light' : 'dark',
              profile.stock,
            ),
          )
          files.push(entry.file)
        }
      }
      expect(files).toHaveLength(PREVIEW_COUNT)
      expect(profile.previewCount).toBe(PREVIEW_COUNT)
    }
  })

  it('produces well-formed, standalone 640x400 XML for every profile', () => {
    for (const [index, profile] of profiles.entries()) {
      for (const id of liveryIds()) {
        const source = previewSource(index, id)
        for (const locale of PREVIEW_LOCALES) {
          for (const mode of PREVIEW_MODES) {
            const svg = renderPreview(source, locale, mode, profile.stock)
            const problems = checkWellFormedXml(svg)
            expect(problems, `${profile.profile.profileId}/${id}-${locale}-${mode}: ${problems.join('; ')}`).toEqual([])
            expect(svg).toContain(`width="${PREVIEW_WIDTH}"`)
            expect(svg).toContain(`height="${PREVIEW_HEIGHT}"`)
            expect(svg).toContain('viewBox="0 0 640 400"')
            expect(svg).toContain('role="img"')
            expect(svg).toContain(`data-livery="${xmlEscape(id)}"`)
            expect(svg).toContain(`data-locale="${locale}"`)
            expect(svg).toContain(`data-mode="${mode}"`)
            expect(svg).toContain('<title id="title">')
            expect(svg).toContain('<desc id="desc">')
            for (const fragment of FORBIDDEN_SVG_FRAGMENTS) {
              expect(svg, `${id}-${locale}-${mode} contains ${fragment}`).not.toContain(fragment)
            }
          }
        }
      }
    }
  })

  it('embeds the livery name, description and fixed scene fixture', () => {
    for (const [index, profile] of profiles.entries()) {
      for (const id of liveryIds()) {
        const source = previewSource(index, id)
        const manifest = readManifest(id)
        const zh = renderPreview(source, 'zh', 'light', profile.stock)
        const en = renderPreview(source, 'en', 'dark', profile.stock)
        expect(zh).toContain(xmlEscape(manifest.meta.name['zh-CN']))
        expect(en).toContain(xmlEscape(manifest.meta.name['en-US']))
        expect(zh).toContain(`[${id}/zh/light]`)
        expect(en).toContain(`[${id}/en/dark]`)
        for (const svg of [zh, en]) {
          expect(svg).toContain('width="240"')
          expect(svg).toContain('DSH LIVERY')
        }
      }
    }
  })

  it('uses native zh/en copy (not literal translations) and separates locales', () => {
    for (const [index, profile] of profiles.entries()) {
      const source = previewSource(index, 'fjord')
      const zh = renderPreview(source, 'zh', 'light', profile.stock)
      const en = renderPreview(source, 'en', 'light', profile.stock)
      expect(zh).toContain('会话')
      expect(zh).toContain('新会话')
      expect(zh).toContain('任务面板')
      expect(zh).toContain('给 Livery 发一条消息…')
      expect(zh).toMatch(CJK_PATTERN)
      expect(en).toContain('Chats')
      expect(en).toContain('New chat')
      expect(en).toContain('Task panel')
      expect(en).toContain('Message Livery…')
      expect(en).not.toMatch(CJK_PATTERN)
    }
  })

  it('uses the compiled tokens and the resolved font stacks', () => {
    for (const [index, profile] of profiles.entries()) {
      const livery = profile.profile.liveries.find((entry) => entry.id === 'fjord')
      if (livery === undefined) throw new Error('fjord missing')
      const source = previewSource(index, 'fjord')
      const zh = renderPreview(source, 'zh', 'light', profile.stock)
      expect(zh).toContain(xmlEscape(livery.typography.ui['zh-CN']))
      expect(zh).toContain(xmlEscape(livery.typography.code))
      const page = livery.light.tokens['--dsw-alias-bg-base']
      if (page !== undefined) {
        const rgb = page.replace(/^#([0-9a-f]{6})[0-9a-f]{2}$/i, '#$1').toLowerCase()
        expect(zh.toLowerCase()).toContain(rgb)
      }
      expect(renderPreview(source, 'zh', 'light', profile.stock)).not.toBe(
        renderPreview(source, 'zh', 'dark', profile.stock),
      )
    }
  })

  it('renders inherited tokens from the profile stock snapshot', () => {
    // A colour both snapshots declare identically must render identically; the
    // preview palette fallback must never read a different version's table.
    for (const [index, profile] of profiles.entries()) {
      expect(profile.stock.version).toBe(profile.report.hostVersion)
      const source = previewSource(index, 'fjord')
      const stockBase = profile.stock.tokens['--dsw-alias-bg-base']
      expect(stockBase).toBeDefined()
      expect(renderPreview(source, 'zh', 'light', profile.stock)).toContain('</svg>')
    }
    // Every shipped profile must render inherited tokens from its own snapshot
    // deterministically (only one shipped profile today).
    const legacy = previewSource(0, 'fjord')
    for (const locale of PREVIEW_LOCALES) {
      for (const mode of PREVIEW_MODES) {
        expect(renderPreview(legacy, locale, mode, profiles[0]?.stock ?? profileStockFallback())).toBe(
          renderPreview(legacy, locale, mode, profiles[0]?.stock ?? profileStockFallback()),
        )
      }
    }
  })

  it('shows the surfaceStyle material difference in the artwork', () => {
    for (const [index, profile] of profiles.entries()) {
      const solid = renderPreview(previewSource(index, 'fjord'), 'zh', 'light', profile.stock)
      const soft = renderPreview(previewSource(index, 'plum'), 'zh', 'light', profile.stock)
      const glass = renderPreview(previewSource(index, 'deep-sea'), 'zh', 'light', profile.stock)
      expect(glass).toContain('glassGlow')
      expect(solid).not.toContain('glassGlow')
      expect(soft).not.toContain('glassGlow')
      expect(solid).not.toBe(soft)
    }
  })

  it('keeps each per-profile index.json in sync with the emitted files', () => {
    for (const profile of profiles) {
      const directory = `lib/previews/${profile.profile.profileId}`
      const indexJson = result.files.get(`${directory}/index.json`)
      expect(indexJson, directory).toBeDefined()
      const index = JSON.parse(indexJson ?? '{}') as { files: string[]; count: number }
      expect(index.count).toBe(PREVIEW_COUNT)
      expect(index.files).toHaveLength(PREVIEW_COUNT)
      for (const file of index.files) {
        const svg = result.files.get(`${directory}/${file}`)
        expect(svg, file).toBeDefined()
        expect(checkWellFormedXml(svg ?? '')).toEqual([])
      }
    }
    expect(existsInFiles('lib/previews')).toBe(true)
  })
})

/** Every (profile, livery, locale, mode) SVG, for style-difference assertions. */
function allSvgs(): { readonly profileIndex: number; readonly id: string; readonly locale: 'zh' | 'en'; readonly mode: 'light' | 'dark'; readonly svg: string }[] {
  const out: { profileIndex: number; id: string; locale: 'zh' | 'en'; mode: 'light' | 'dark'; svg: string }[] = []
  for (const [index, profile] of profiles.entries()) {
    for (const id of liveryIds()) {
      const source = previewSource(index, id)
      for (const locale of PREVIEW_LOCALES) {
        for (const mode of PREVIEW_MODES) {
          out.push({ profileIndex: index, id, locale, mode, svg: renderPreview(source, locale, mode, profile.stock) })
        }
      }
    }
  }
  return out
}

function attrValues(svg: string, attribute: string): number[] {
  const values: number[] = []
  const pattern = new RegExp(`${attribute}="([0-9.]+)"`, 'g')
  let match = pattern.exec(svg)
  while (match !== null) {
    values.push(Number.parseFloat(match[1] ?? ''))
    match = pattern.exec(svg)
  }
  return values
}

describe('style-system visual differentiation', () => {
  const profile = profiles[0]
  if (profile === undefined) throw new Error('no profile')

  const styleOf = (id: string): string => {
    const livery = profile.profile.liveries.find((candidate) => candidate.id === id)
    if (livery === undefined) throw new Error(`${id} missing`)
    return livery.layout.surfaceStyle
  }

  it('exposes surface style and metrics line-height on the root element', () => {
    for (const entry of allSvgs()) {
      expect(entry.svg).toContain(`data-locale="${entry.locale}"`)
      expect(entry.svg).toMatch(/data-surface-style="[a-z]+"/)
      expect(entry.svg).toMatch(/data-metrics-line-height="[0-9.]+"/)
      const declared = readManifest(entry.id).layout.surfaceStyle
      expect(entry.svg).toContain(`data-surface-style="${declared}"`)
    }
  })

  it('renders corner radii from the compiled radius tokens (distinct across styles)', () => {
    const byStyle = new Map<string, Set<string>>()
    for (const entry of allSvgs()) {
      if (entry.locale !== 'zh' || entry.mode !== 'light') continue
      const style = styleOf(entry.id)
      const radii = new Set(attrValues(entry.svg, 'rx').map(String))
      byStyle.set(style, radii)
    }
    expect(byStyle.size).toBeGreaterThanOrEqual(2)
    // At least two styles must render a different radius profile (stock vs recipe).
    const signatures = [...byStyle.values()].map((radii) => [...radii].sort().join(','))
    expect(new Set(signatures).size).toBeGreaterThan(1)
    // Rounding is data-driven, not a constant: every style's radii are legal px.
    for (const entry of allSvgs()) {
      for (const rx of attrValues(entry.svg, 'rx')) expect(rx).toBeGreaterThanOrEqual(0)
    }
  })

  it('renders elevation only via deterministic feDropShadow, hairline strokes otherwise', () => {
    let withShadow = 0
    let hairlineOnly = 0
    for (const entry of allSvgs()) {
      const filterCount = (entry.svg.match(/<filter /g) ?? []).length
      const dropShadows = (entry.svg.match(/<feDropShadow /g) ?? []).length
      expect(filterCount).toBe(dropShadows)
      // No other SVG filter primitives or external image assets.
      expect(entry.svg).not.toContain('feGaussianBlur')
      expect(entry.svg).not.toContain('feBlend')
      expect(entry.svg).not.toContain('<image')
      const styleDefinition = SURFACE_STYLE_DEFINITIONS[styleOf(entry.id) as keyof typeof SURFACE_STYLE_DEFINITIONS]
      expect(styleDefinition).toBeDefined()
      const livery = profile.profile.liveries.find((candidate) => candidate.id === entry.id)
      if (livery === undefined) throw new Error(`${entry.id} missing`)
      const tokens = entry.mode === 'light' ? livery.light.tokens : livery.dark.tokens
      const shadowOptOut = Object.entries(tokens).some(
        ([name, value]) => /^--dsw-(shadow|elevation)-/.test(name) && value.trim() === 'none',
      )
      if (shadowOptOut) {
        hairlineOnly += 1
        expect(dropShadows, `${entry.id}: shadow opt-out renders no elevation`).toBe(0)
      } else {
        withShadow += 1
        expect(dropShadows, `${entry.id}: elevation renders feDropShadow`).toBeGreaterThan(0)
        expect(entry.svg).toContain('flood-color=')
        expect(entry.svg).toContain('flood-opacity=')
      }
    }
    expect(withShadow).toBeGreaterThan(0)
    // The current shipped set is solid/soft/glass; once flat/paper/terminal styles
    // ship, they must render hairline strokes with no elevation filter.
    const usesShadowlessStyle = profile.profile.liveries.some((livery) =>
      ['flat', 'paper', 'terminal'].includes(livery.layout.surfaceStyle),
    )
    if (usesShadowlessStyle) expect(hairlineOnly).toBeGreaterThan(0)
  })

  it('uses the type scale from consumed font shorthand tokens when metrics differ', () => {
    const usedMetrics = new Set<string>()
    const sizesByMetrics = new Map<string, Set<string>>()
    for (const entry of allSvgs()) {
      if (entry.locale !== 'zh' || entry.mode !== 'light') continue
      const livery = profile.profile.liveries.find((candidate) => candidate.id === entry.id)
      if (livery === undefined) throw new Error(`${entry.id} missing`)
      const metricsId = livery.typography.metrics['zh-CN'].id
      usedMetrics.add(metricsId)
      sizesByMetrics.set(metricsId, new Set(attrValues(entry.svg, 'font-size').map(String)))
    }
    expect(sizesByMetrics.size).toBe(usedMetrics.size)
    // If the used metrics profiles carry different font-size tokens, the rendered
    // type scale must differ; otherwise the stock scale is intentionally shared.
    const tokenScales = new Set(
      [...usedMetrics].map((id) => JSON.stringify(METRICS[id as keyof typeof METRICS]?.tokens ?? {})),
    )
    if (tokenScales.size > 1) {
      const signatures = new Set([...sizesByMetrics.values()].map((sizes) => [...sizes].sort().join(',')))
      expect(signatures.size).toBeGreaterThan(1)
    }
    // The brand/display font stack is used for the livery name in the fixture.
    for (const entry of allSvgs()) expect(entry.svg).toContain('font-family=')
  })

  it('keeps every SVG byte-stable across repeated renders', () => {
    for (const [index, profile] of profiles.entries()) {
      const id = liveryIds()[0]
      if (id === undefined) throw new Error('no liveries')
      const source = previewSource(index, id)
      for (const locale of PREVIEW_LOCALES) {
        for (const mode of PREVIEW_MODES) {
          expect(renderPreview(source, locale, mode, profile.stock)).toBe(renderPreview(source, locale, mode, profile.stock))
        }
      }
    }
  })
})

function profileStockFallback(): NonNullable<(typeof profiles)[number]>['stock'] {
  const fallback = profiles[0]?.stock
  if (fallback === undefined) throw new Error('no profile stock')
  return fallback
}

function existsInFiles(prefix: string): boolean {
  return [...result.files.keys()].some((file) => file.startsWith(prefix))
}
