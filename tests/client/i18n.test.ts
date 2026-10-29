import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  LIVERY_LOCALES,
  LOCALE_TAGS,
  SHARED_VALUE_KEYS,
  dictionaries,
  dictionaryKeyDiff,
  enUS,
  findUntranslatedKeys,
  formatDateTime,
  formatList,
  formatNumber,
  formatRatio,
  getDictionary,
  localeTag,
  zhCN,
} from '../../src/i18n/index.js'
import type { LiveryKey } from '../../src/i18n/index.js'

const EN_KEYS = Object.keys(enUS).sort()
const ZH_KEYS = Object.keys(zhCN).sort()

describe('dictionary key parity', () => {
  it('ships exactly the same key set in zh and en', () => {
    expect(dictionaryKeyDiff(enUS, zhCN)).toEqual({ missing: [], extra: [] })
    expect(EN_KEYS).toEqual(ZH_KEYS)
  })

  it('declares every key the client sources reference', () => {
    const files = [
      'src/client/index.tsx',
      'src/client/diagnostics.ts',
      'src/client/ui/Gallery.tsx',
      'src/client/ui/SelfCheck.tsx',
      'src/client/ui/LiverySettingsPage.tsx',
      'src/client/ui/LiveryWorkspace.tsx',
      'src/client/ui/WallpaperPanel.tsx',
      'src/client/LiveryPanelPage.tsx',
      'src/client/LiveryPanelIcon.tsx',
      'src/client/ui/capability-names.ts',
      'src/client/ui/families.ts',
    ]
    const prefixes = 'section|panel|current|search|filter|gallery|empty|card|preview|action|write|state|check|about|mode|tag|hint|diag|capability|family|wallpaper|tab'
    const pattern = new RegExp(`['"]((?:${prefixes})\\.[A-Za-z0-9.]+)['"]`, 'g')
    const known = new Set(EN_KEYS)
    const referenced = new Map<string, string>()
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), 'utf8')
      for (const match of source.matchAll(pattern)) {
        const key = match[1]!
        if (!known.has(key)) referenced.set(key, file)
      }
    }
    expect([...referenced.entries()]).toEqual([])
  })

  it('does not hard-code Chinese copy in client sources', () => {
    const files = [
      'src/client/index.tsx',
      'src/client/model.ts',
      'src/client/runtime.ts',
      'src/client/presenter.ts',
      'src/client/diagnostics.ts',
      'src/client/ui/Gallery.tsx',
      'src/client/ui/SelfCheck.tsx',
      'src/client/ui/LiverySettingsPage.tsx',
      'src/client/ui/LiveryWorkspace.tsx',
      'src/client/ui/WallpaperPanel.tsx',
      'src/client/LiveryPanelPage.tsx',
      'src/client/LiveryPanelIcon.tsx',
      'src/client/ui/capability-names.ts',
      'src/client/ui/families.ts',
    ]
    const han = /[\u3400-\u4dbf\u4e00-\u9fff]/
    const offenders = files.filter(file => han.test(readFileSync(join(process.cwd(), file), 'utf8')))
    expect(offenders).toEqual([])
  })

  it('does not hard-code English UI copy in the runtime/model (only technical diagnostics)', () => {
    const runtime = readFileSync(join(process.cwd(), 'src/client/runtime.ts'), 'utf8')
    // The runtime may carry host-facing diagnostic notes, but its user-visible
    // strings must come from the dictionary; guard the obvious sentence shapes.
    expect(runtime).not.toMatch(/['"][A-Z][a-z]+ [a-z]+ [a-z]+ [a-z]+['"]/)
  })
})

describe('untranslated-key detection', () => {
  it('finds no suspicious entries in the shipped dictionaries', () => {
    expect(findUntranslatedKeys(zhCN, enUS)).toEqual([])
  })

  it('flags identical prose and Chinese values without Han characters', () => {
    const zh = { a: 'Same text', b: 'Plain', c: '中文' }
    const en = { a: 'Same text', b: 'Different', c: 'Chinese' }
    const suspicious = findUntranslatedKeys(zh, en, { allowIdentical: [] })
    expect(suspicious).toContain('a')
    expect(suspicious).toContain('b')
    expect(suspicious).not.toContain('c')
  })

  it('allows the declared pure-format keys to be shared', () => {
    expect(SHARED_VALUE_KEYS.length).toBeGreaterThan(0)
    const suspicious = findUntranslatedKeys(zhCN, enUS)
    for (const key of SHARED_VALUE_KEYS) expect(suspicious).not.toContain(key)
  })

  it('keeps the English dictionary free of Han characters', () => {
    const han = /[\u3400-\u4dbf\u4e00-\u9fff]/
    const offenders = Object.entries(enUS).filter(([, value]) => han.test(value))
    expect(offenders).toEqual([])
  })

  it('renders a Chinese translation for every prose key', () => {
    const han = /[\u3400-\u4dbf\u4e00-\u9fff]/
    const missing = (Object.keys(zhCN) as LiveryKey[])
      .filter(key => !SHARED_VALUE_KEYS.includes(key))
      .filter(key => !han.test(zhCN[key]))
    expect(missing).toEqual([])
  })
})

describe('entry rename — 视觉风格 / Visual Style', () => {
  it('keeps the style subpage tab distinct from the entry name', () => {
    expect(zhCN['tab.style']).toBe('风格')
    expect(enUS['tab.style']).toBe('Styles')
    expect(zhCN['tab.wallpaper']).toBe('壁纸')
    expect(enUS['tab.wallpaper']).toBe('Wallpapers')
  })

  it('names the entry consistently in both locales', () => {
    expect(zhCN['panel.label']).toBe('视觉风格')
    expect(enUS['panel.label']).toBe('Visual Style')
    expect(zhCN['panel.title']).toBe('视觉风格')
    expect(enUS['panel.title']).toBe('Visual Style')
    // Legacy Settings-fallback label follows the same entry name.
    expect(zhCN['section.label']).toBe('视觉风格')
    expect(enUS['section.label']).toBe('Visual Style')
    expect(zhCN['gallery.aria']).toContain('视觉风格')
    expect(enUS['gallery.aria']).toBe('Visual style gallery')
  })

  it('leaves no retired entry name in user-visible copy', () => {
    const retiredZh = Object.entries(zhCN).filter(([, value]) => value.includes('皮肤'))
    expect(retiredZh).toEqual([])
    // Product/package identity may keep the plugin's own name.
    const productCopy = new Set(['about.plugin', 'diag.header'])
    const retiredEn = Object.entries(enUS)
      .filter(([key, value]) => !productCopy.has(key) && /\blivery\b/i.test(value))
    expect(retiredEn).toEqual([])
  })

  it('keeps plugin identity copy separate from the entry label', () => {
    expect(enUS['about.plugin']).toContain('DSH Livery')
    expect(zhCN['diag.header']).toContain('dsh-livery')
  })
})

describe('locale access', () => {
  it('maps DSH locale ids to Intl tags', () => {
    expect(localeTag('zh')).toBe('zh-CN')
    expect(localeTag('en')).toBe('en-US')
    expect(localeTag('fr')).toBe('en-US')
    expect(LOCALE_TAGS).toEqual({ zh: 'zh-CN', en: 'en-US' })
    expect(LIVERY_LOCALES).toEqual(['zh', 'en'])
    expect(getDictionary('zh')).toBe(zhCN)
    expect(getDictionary('en')).toBe(enUS)
    expect(getDictionary('unknown')).toBe(enUS)
    expect(dictionaries.zh).toBe(zhCN)
    expect(dictionaries.en).toBe(enUS)
  })
})

describe('Intl formatting helpers', () => {
  it('formats numbers with the active locale grouping', () => {
    expect(formatNumber('en', 1234)).toBe('1,234')
    expect(formatNumber('zh', 1234)).toBe('1,234')
    expect(formatNumber(undefined, 0)).toBe('0')
  })

  it('formats contrast ratios with at most two fraction digits', () => {
    expect(formatRatio('en', 4.5)).toBe('4.5')
    expect(formatRatio('en', 16)).toBe('16')
    expect(formatRatio('zh', 3.333)).toBe('3.33')
  })

  it('joins lists with the locale conjunction', () => {
    expect(formatList('en', ['a', 'b', 'c'])).toBe('a, b, and c')
    expect(formatList('zh', ['a', 'b', 'c'])).toBe('a、b和c')
  })

  it('formats date-times with the locale tag', () => {
    const stamp = Date.UTC(2024, 0, 2, 3, 4)
    const en = formatDateTime('en', stamp)
    const zh = formatDateTime('zh', stamp)
    expect(en).toContain('2024')
    expect(zh).toContain('2024')
    expect(en).not.toBe(zh)
  })
})
