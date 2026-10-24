/**
 * Preview SVG tests: deterministic 640x400 static scenes, one per livery ×
 * locale (zh/en) × mode (light/dark), rendered from the compiled tokens and
 * resolved font stacks. The files must be standalone, XML well-formed and
 * script/foreignObject free because the Host serves them as `image/svg+xml`.
 */
import { join } from 'node:path'
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
import { REPO_ROOT, CJK_PATTERN, checkWellFormedXml, liveryIds, readManifest } from './helpers.js'

const result = compileFromDisk(REPO_ROOT)

function requireCatalog(): NonNullable<typeof result.catalog> {
  if (result.catalog === null) throw new Error(`catalog did not compile: ${JSON.stringify(result.problems)}`)
  return result.catalog
}

const catalog = requireCatalog()

function previewSource(id: string): PreviewLivery {
  const livery = catalog.liveries.find((entry) => entry.id === id)
  if (livery === undefined) throw new Error(`livery ${id} missing`)
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

describe('preview rendering', () => {
  it('renders exactly 4 deterministic previews per shipped livery (40 total)', () => {
    const files: string[] = []
    for (const id of liveryIds()) {
      const source = previewSource(id)
      const set = renderPreviewSet(source)
      expect(set).toHaveLength(4)
      expect(set.map((entry) => entry.file).sort()).toEqual(
        ['dark', 'light'].flatMap((mode) => ['en', 'zh'].map((locale) => `${id}-${locale}-${mode}.svg`)).sort(),
      )
      for (const entry of set) {
        expect(entry.content).toBe(renderPreview(source, entry.file.includes('-zh-') ? 'zh' : 'en', entry.file.endsWith('-light.svg') ? 'light' : 'dark'))
        files.push(entry.file)
      }
    }
    expect(files).toHaveLength(40)
    expect(result.previewCount).toBe(40)
  })

  it('produces well-formed, standalone 640x400 XML', () => {
    for (const id of liveryIds()) {
      const source = previewSource(id)
      for (const locale of PREVIEW_LOCALES) {
        for (const mode of PREVIEW_MODES) {
          const svg = renderPreview(source, locale, mode)
          const problems = checkWellFormedXml(svg)
          expect(problems, `${id}-${locale}-${mode}: ${problems.join('; ')}`).toEqual([])
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
  })

  it('embeds the livery name, description and fixed scene fixture', () => {
    for (const id of liveryIds()) {
      const source = previewSource(id)
      const manifest = readManifest(id)
      const zh = renderPreview(source, 'zh', 'light')
      const en = renderPreview(source, 'en', 'dark')
      expect(zh).toContain(xmlEscape(manifest.meta.name['zh-CN']))
      expect(en).toContain(xmlEscape(manifest.meta.name['en-US']))
      expect(zh).toContain(`[${id}/zh/light]`)
      expect(en).toContain(`[${id}/en/dark]`)
      // Scene parts: sidebar, transcript, plugin panel card, composer.
      for (const svg of [zh, en]) {
        expect(svg).toContain('width="240"')
        expect(svg).toContain('DSH LIVERY')
      }
    }
  })

  it('uses native zh/en copy (not literal translations) and separates locales', () => {
    const source = previewSource('fjord')
    const zh = renderPreview(source, 'zh', 'light')
    const en = renderPreview(source, 'en', 'light')
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
  })

  it('uses the compiled tokens and the resolved font stacks', () => {
    const livery = catalog.liveries.find((entry) => entry.id === 'fjord')
    if (livery === undefined) throw new Error('fjord missing')
    const source = previewSource('fjord')
    const zh = renderPreview(source, 'zh', 'light')
    expect(zh).toContain(xmlEscape(livery.typography.ui['zh-CN']))
    expect(zh).toContain(xmlEscape(livery.typography.code))
    // The panel/composer surfaces must use the compiled token colours.
    const page = livery.light.tokens['--dsw-alias-bg-base']
    if (page !== undefined) {
      const rgb = page.replace(/^#([0-9a-f]{6})[0-9a-f]{2}$/i, '#$1').toLowerCase()
      expect(zh.toLowerCase()).toContain(rgb)
    }
    // Layout recipe drives the material decoration.
    expect(renderPreview(source, 'zh', 'light')).not.toBe(renderPreview(source, 'zh', 'dark'))
  })

  it('shows the surfaceStyle material difference in the artwork', () => {
    const solid = renderPreview(previewSource('fjord'), 'zh', 'light')
    const soft = renderPreview(previewSource('plum'), 'zh', 'light')
    const glass = renderPreview(previewSource('deep-sea'), 'zh', 'light')
    expect(glass).toContain('glassGlow')
    expect(solid).not.toContain('glassGlow')
    expect(soft).not.toContain('glassGlow')
    expect(solid).not.toBe(soft)
  })

  it('keeps the emitted index.json in sync with the rendered files', () => {
    const indexJson = result.files.get('lib/previews/index.json')
    expect(indexJson).toBeDefined()
    const index = JSON.parse(indexJson ?? '{}') as { files: string[]; count: number }
    expect(index.count).toBe(40)
    expect(index.files).toHaveLength(40)
    for (const file of index.files) {
      const svg = result.files.get(join('lib/previews', file).split('\\').join('/'))
      expect(svg, file).toBeDefined()
      expect(checkWellFormedXml(svg ?? '')).toEqual([])
    }
  })
})
