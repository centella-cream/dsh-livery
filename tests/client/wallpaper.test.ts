/**
 * Wallpaper core unit tests: URL validation, effect clamping, persistence
 * roundtrip, stylesheet builder (escaping + translucent token math), remote
 * response mapping, fetch outcomes, DOM layer and controller lifecycle.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BUILTIN_WALLPAPERS,
  BUILTIN_WALLPAPER_IDS,
  DEFAULT_WALLPAPER_EFFECTS,
  DEFAULT_WALLPAPER_POSITION,
  MAX_WALLPAPER_URL_LENGTH,
  WALLPAPER_POSITION_OPTIONS,
  WALLPAPER_POSITION_VALUES,
  WALLPAPER_STATE_SCHEMA_VERSION,
  WALLPAPER_STORAGE_KEY,
  WALLPAPER_SURFACE_TOKENS,
  backgroundImageValue,
  backgroundPositionValue,
  buildWallpaperCss,
  clampEffects,
  cssUrlValue,
  isBuiltinWallpaperId,
  normalizeWallpaperPosition,
  normalizeWallpaperRevision,
  openverseUrl,
  parseOpenverseResults,
  parsePicsumResults,
  parseStoredWallpaper,
  parseWallpaperState,
  picsumListUrl,
  requestWallpaperResults,
  serializeWallpaper,
  serializeWallpaperState,
  toStoredWallpaper,
  tokenContextOf,
  validateWallpaperUrl,
} from '../../src/client/wallpaper.js'
import { createWallpaperLayer, WALLPAPER_STYLE_ID } from '../../src/client/wallpaper/apply.js'
import { createWallpaperController, getWallpaperController, setWallpaperController } from '../../src/client/wallpaper/controller.js'
import type { WallpaperStorage } from '../../src/client/wallpaper/controller.js'
import { FakeDocument } from './fixtures.js'

/** In-memory localStorage subset. */
class MemoryStorage implements WallpaperStorage {
  readonly map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

function fakeDoc(): FakeDocument {
  return new FakeDocument()
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  setWallpaperController(undefined)
})

describe('wallpaper URL validation', () => {
  it('accepts https URLs and normalizes them', () => {
    const check = validateWallpaperUrl('  https://example.com/a.jpg  ')
    expect(check.ok).toBe(true)
    if (check.ok) expect(check.url).toBe('https://example.com/a.jpg')
    expect(validateWallpaperUrl('HTTPS://example.com/X.JPG').ok).toBe(true)
  })

  it('rejects every non-https or hostile scheme', () => {
    for (const input of [
      'http://example.com/a.jpg',
      'javascript:alert(1)',
      'data:image/png;base64,aaaa',
      'file:///etc/passwd',
      'ftp://example.com/a.jpg',
      '//example.com/a.jpg',
    ]) {
      const check = validateWallpaperUrl(input)
      expect(check.ok, input).toBe(false)
      if (!check.ok) expect(check.problem).toBe('not-https')
    }
  })

  it('rejects empty, over-long and credential-bearing URLs', () => {
    expect(validateWallpaperUrl('')).toEqual({ ok: false, problem: 'empty' })
    expect(validateWallpaperUrl('   ')).toEqual({ ok: false, problem: 'empty' })
    const long = `https://example.com/${'a'.repeat(MAX_WALLPAPER_URL_LENGTH)}.jpg`
    expect(validateWallpaperUrl(long)).toEqual({ ok: false, problem: 'too-long' })
    expect(validateWallpaperUrl('https://user:secret@example.com/a.jpg')).toEqual({ ok: false, problem: 'credentials' })
    expect(validateWallpaperUrl('https://')).toEqual({ ok: false, problem: 'invalid' })
  })
})

describe('wallpaper effects', () => {
  it('clamps and rounds every effect into its bounds', () => {
    expect(clampEffects(undefined)).toEqual(DEFAULT_WALLPAPER_EFFECTS)
    expect(clampEffects({ blur: -5, dim: 999, frost: 100.4 })).toEqual({ blur: 0, dim: 70, frost: 100, atmosphere: 30 })
    expect(clampEffects({ blur: 24.6, dim: 0, frost: -1 })).toEqual({ blur: 24, dim: 0, frost: 0, atmosphere: 30 })
    expect(clampEffects({ blur: Number.NaN, dim: '30', frost: null })).toEqual({ blur: 8, dim: 30, frost: 0, atmosphere: 30 })
    // Atmosphere is a 0–100 step-5 slider; legacy records without it default to 30.
    expect(clampEffects({ atmosphere: 33 }).atmosphere).toBe(35)
    expect(clampEffects({ atmosphere: -10 }).atmosphere).toBe(0)
    expect(clampEffects({ atmosphere: 999 }).atmosphere).toBe(100)
    expect(clampEffects({}).atmosphere).toBe(30)
  })
})

describe('wallpaper persistence schema', () => {
  it('roundtrips a builtin selection with clamped effects', () => {
    const stored = toStoredWallpaper({ kind: 'builtin', id: 'aurora' }, { blur: 30, dim: -2, frost: 44.5, atmosphere: 30 })
    expect(stored).toEqual({ kind: 'builtin', id: 'aurora', blur: 24, dim: 0, frost: 45, atmosphere: 30 })
    expect(parseStoredWallpaper(stored)).toEqual({
      selection: { kind: 'builtin', id: 'aurora' },
      effects: { blur: 24, dim: 0, frost: 45, atmosphere: 30 },
    })
  })

  it('roundtrips a remote selection and drops invalid records', () => {
    const stored = serializeWallpaper({ kind: 'remote', url: 'https://example.com/w.jpg' }, DEFAULT_WALLPAPER_EFFECTS)
    const parsed = parseStoredWallpaper(stored)
    expect(parsed?.selection).toEqual({ kind: 'remote', url: 'https://example.com/w.jpg' })

    expect(parseStoredWallpaper(null)).toBeUndefined()
    expect(parseStoredWallpaper('nope')).toBeUndefined()
    expect(parseStoredWallpaper({ kind: 'builtin', id: 'not-a-wallpaper' })).toBeUndefined()
    expect(parseStoredWallpaper({ kind: 'remote', url: 'http://example.com/w.jpg' })).toBeUndefined()
    expect(parseStoredWallpaper({ kind: 'other' })).toBeUndefined()
    expect(toStoredWallpaper(undefined, DEFAULT_WALLPAPER_EFFECTS)).toBeUndefined()
  })

  it('checks builtin ids and exposes deterministic CSS for all 24 designs', () => {
    expect(BUILTIN_WALLPAPER_IDS).toHaveLength(24)
    for (const id of BUILTIN_WALLPAPER_IDS) {
      expect(isBuiltinWallpaperId(id)).toBe(true)
      expect(backgroundImageValue({ kind: 'builtin', id })).toBe(BUILTIN_WALLPAPERS[id])
    }
    expect(isBuiltinWallpaperId('nope')).toBe(false)
    expect(backgroundImageValue(undefined)).toBeUndefined()
  })
})

describe('wallpaper state schema v2', () => {
  it('serializes the documented v2 record and clamps/normalizes untrusted fields', () => {
    const record = serializeWallpaperState(
      { kind: 'remote', url: 'https://example.com/w.jpg' },
      { blur: 30, dim: -2, frost: 44.5, atmosphere: 33 },
      { x: 50, y: 100 },
      4.9,
    )
    expect(record).toEqual({
      schemaVersion: 2,
      revision: 4,
      selection: { kind: 'remote', url: 'https://example.com/w.jpg' },
      effects: { blur: 24, dim: 0, frost: 45, atmosphere: 35 },
      position: { x: 50, y: 100 },
    })
    expect(WALLPAPER_STATE_SCHEMA_VERSION).toBe(2)
    expect(parseWallpaperState(record)).toEqual({
      revision: 4,
      selection: { kind: 'remote', url: 'https://example.com/w.jpg' },
      effects: { blur: 24, dim: 0, frost: 45, atmosphere: 35 },
      position: { x: 50, y: 100 },
    })
    expect(serializeWallpaperState(undefined, DEFAULT_WALLPAPER_EFFECTS)).toMatchObject({ schemaVersion: 2, selection: { kind: 'none' } })
  })

  it('roundtrips every selection kind including a recoverable upload key', () => {
    for (const selection of [
      { kind: 'builtin' as const, id: 'aurora' as const },
      { kind: 'upload' as const, key: 'upload-123-abc' },
    ]) {
      const parsed = parseWallpaperState(serializeWallpaperState(selection, DEFAULT_WALLPAPER_EFFECTS))
      expect(parsed?.selection).toEqual(selection)
      expect(parsed?.position).toEqual(DEFAULT_WALLPAPER_POSITION)
      expect(parsed?.revision).toBe(0)
    }
  })

  it('migrates legacy v1 flat records losslessly with position 50/50', () => {
    const v1 = { kind: 'remote', url: 'https://example.com/legacy.jpg', blur: 12, dim: 40, frost: 22, atmosphere: 55 }
    expect(parseWallpaperState(v1)).toEqual({
      revision: 0,
      selection: { kind: 'remote', url: 'https://example.com/legacy.jpg' },
      effects: { blur: 12, dim: 40, frost: 22, atmosphere: 55 },
      position: { x: 50, y: 50 },
    })
    // v1 without atmosphere keeps the documented default.
    expect(parseWallpaperState({ kind: 'builtin', id: 'mist', blur: 4, dim: 10, frost: 60 })?.effects.atmosphere).toBe(30)
    // A record explicitly marked v1 migrates too.
    expect(parseWallpaperState({ ...v1, schemaVersion: 1 })?.position).toEqual(DEFAULT_WALLPAPER_POSITION)
  })

  it('ignores corrupt records and unknown schema versions without inventing a selection', () => {
    for (const raw of [
      null,
      'nope',
      42,
      [],
      { schemaVersion: 3, selection: { kind: 'builtin', id: 'aurora' } },
      { schemaVersion: 2 },
      { schemaVersion: 2, selection: { kind: 'builtin', id: 'not-a-wallpaper' } },
      { schemaVersion: 2, selection: { kind: 'remote', url: 'http://insecure.example/w.jpg' } },
      { schemaVersion: 2, selection: { kind: 'upload', key: 'not-an-upload' } },
      { schemaVersion: 2, selection: { kind: 'other' } },
    ]) {
      expect(parseWallpaperState(raw), JSON.stringify(raw)).toBeUndefined()
    }
  })

  it('normalizes position/revision helpers to the documented ranges', () => {
    expect(WALLPAPER_POSITION_VALUES).toEqual([0, 50, 100])
    expect(WALLPAPER_POSITION_OPTIONS).toHaveLength(9)
    expect(new Set(WALLPAPER_POSITION_OPTIONS.map(option => `${option.x},${option.y}`)).size).toBe(9)
    expect(normalizeWallpaperPosition(undefined)).toEqual({ x: 50, y: 50 })
    expect(normalizeWallpaperPosition({ x: 0, y: 100 })).toEqual({ x: 0, y: 100 })
    expect(normalizeWallpaperPosition({ x: 31, y: 95 })).toEqual({ x: 50, y: 100 })
    expect(normalizeWallpaperPosition({ x: '0', y: Number.NaN })).toEqual({ x: 50, y: 50 })
    expect(normalizeWallpaperRevision(undefined)).toBe(0)
    expect(normalizeWallpaperRevision(-4)).toBe(0)
    expect(normalizeWallpaperRevision(3.9)).toBe(3)
  })
})

describe('wallpaper stylesheet builder', () => {
  it('returns an empty stylesheet when no wallpaper is selected', () => {
    expect(buildWallpaperCss({ selection: undefined, effects: DEFAULT_WALLPAPER_EFFECTS })).toBe('')
  })

  it('injects the builtin background and effect values behind the body attribute', () => {
    const css = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'sea' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, blur: 12, dim: 70, frost: 0 },
    })
    expect(css).toContain('body[data-dsh-wallpaper]::before')
    expect(css).toContain(BUILTIN_WALLPAPERS.sea)
    expect(css).toContain('filter:blur(12px)')
    expect(css).toContain('rgba(0,0,0,0.70)')
    expect(css).not.toContain('color-mix')
  })

  it('emits the above-content atmosphere overlay and transparent body canvas', () => {
    const css = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'sea' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, blur: 10, atmosphere: 60 },
    })
    expect(css).toContain('.dsh-livery-wallpaper-overlay{')
    expect(css).toContain('position:fixed')
    expect(css).toContain('inset:0')
    expect(css).toContain('z-index:90')
    expect(css).toContain('pointer-events:none')
    expect(css).toContain(BUILTIN_WALLPAPERS.sea)
    expect(css).toContain('background-size:cover')
    expect(css).toContain('background-position:center')
    expect(css).toContain('filter:blur(10px)')
    expect(css).toContain('opacity:0.60')
    expect(css).toContain('mix-blend-mode:soft-light')
    expect(css).toContain('body[data-dsh-wallpaper]{background-color:transparent}')
    expect(css).not.toContain('!important')

    const immersiveOnly = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'sea' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, atmosphere: 0 },
    })
    expect(immersiveOnly).not.toContain('.dsh-livery-wallpaper-overlay')
    expect(immersiveOnly).toContain('body[data-dsh-wallpaper]::before')
  })

  it('drops decorative layers under forced-colors and reduced-transparency', () => {
    const css = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'aurora' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
    })
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('@media (prefers-reduced-transparency: reduce)')
  })

  it('keeps both layers viewport-relative (cover/center, blur bleed, no fixed aspect)', () => {
    const css = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'ocean' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, blur: 18 },
    })
    // Immersive body layer + atmosphere overlay both crop instead of distorting.
    expect(css.match(/background-size:cover/g)).toHaveLength(2)
    expect(css.match(/background-position:center/g)).toHaveLength(2)
    // Negative inset absorbs the blur bleed so resizes never show hard edges.
    expect(css).toContain('inset:-24px')
    expect(css).not.toMatch(/aspect-ratio|width:\s*\d+px|height:\s*\d+px/)
  })

  it('applies the focal position to remote/upload page and atmosphere layers but never built-ins', () => {
    const remote = buildWallpaperCss({
      selection: { kind: 'remote', url: 'https://example.com/w.jpg' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      imageOverride: 'blob:cached-remote',
      position: { x: 0, y: 100 },
    })
    // Body layer + atmosphere overlay both honour the nine-grid position.
    expect(remote.match(/background-position:0% 100%/g)).toHaveLength(2)
    expect(remote).not.toContain('background-position:center')

    const upload = buildWallpaperCss({
      selection: { kind: 'upload', key: 'upload-1-abc' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, atmosphere: 40 },
      uploadUrl: 'blob:wallpaper-1',
      position: { x: 100, y: 0 },
    })
    expect(upload.match(/background-position:100% 0%/g)).toHaveLength(2)

    const builtin = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'ocean' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      position: { x: 0, y: 0 },
    })
    expect(builtin.match(/background-position:center/g)).toHaveLength(2)
    expect(builtin).not.toContain('background-position:0% 0%')

    expect(backgroundPositionValue(undefined, { x: 0, y: 0 })).toBe('center')
    expect(backgroundPositionValue({ kind: 'builtin', id: 'ocean' }, { x: 0, y: 0 })).toBe('center')
    expect(backgroundPositionValue({ kind: 'remote', url: 'https://example.com/w.jpg' })).toBe('50% 50%')
    expect(backgroundPositionValue({ kind: 'upload', key: 'upload-1-abc' }, { x: 0, y: 0 })).toBe('0% 0%')
  })

  it('escapes remote URLs inside single-quoted url()', () => {
    expect(cssUrlValue("https://example.com/a'b\\c.jpg")).toBe("url('https://example.com/a\\'b\\\\c.jpg')")
    expect(cssUrlValue('https://example.com/a\nb.jpg')).toBe("url('https://example.com/ab.jpg')")
    const css = buildWallpaperCss({
      selection: { kind: 'remote', url: "https://example.com/a'b.jpg" },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      imageOverride: "https://example.com/a'b.jpg",
    })
    expect(css).toContain("background-image:url('https://example.com/a\\'b.jpg')")
    expect(css.match(/'/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('emits translucent livery surface tokens with color-mix math', () => {
    const light = {
      '--dsw-alias-bg-base': '#101820',
      '--dsw-alias-bg-layer-3': '#1b2430',
      '--dsw-alias-label-primary': '#ffffff',
    }
    const dark = { '--dsw-alias-bg-base': '#05070a' }
    const css = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'dusk' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, blur: 8, dim: 25, frost: 35 },
      tokens: { light, dark, frost: 35 },
    })
    expect(css).toContain('body[data-dsh-livery][data-dsh-wallpaper]')
    expect(css).toContain('--dsw-alias-bg-base:color-mix(in srgb, #101820 65%, transparent)')
    expect(css).toContain('--dsw-alias-bg-layer-3:color-mix(in srgb, #1b2430 65%, transparent)')
    expect(css).not.toContain('--dsw-alias-label-primary:color-mix')
    expect(css).toContain('body[data-dsh-livery][data-dsh-wallpaper][data-ds-dark-theme]')
    expect(css).toContain('--dsw-alias-bg-base:color-mix(in srgb, #05070a 65%, transparent)')
    // Safety rails: no !important, no host component selectors, no remote fonts.
    expect(css).not.toContain('!important')
    expect(css).not.toMatch(/\[[a-z-]+="_r_|div\.|\.[a-z]+[_]{2}/)
    expect(css).not.toContain('@font-face')
  })

  it('keeps host dialog surfaces opaque so settings never show page text through', () => {
    // Dialog/modal panels use --dsw-alias-bg-layer-2; making it translucent
    // would leak the underlying page through the Settings overlay.
    expect(WALLPAPER_SURFACE_TOKENS).not.toContain('--dsw-alias-bg-layer-2')
    const css = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'dusk' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, frost: 60 },
      tokens: {
        light: {
          '--dsw-alias-bg-base': '#ffffff',
          '--dsw-alias-bg-layer-1': '#f5f5f5',
          '--dsw-alias-bg-layer-2': '#ffffff',
        },
        dark: {},
        frost: 60,
      },
    })
    expect(css).not.toContain('--dsw-alias-bg-layer-2:color-mix')
    expect(css).not.toContain('--dsw-alias-bg-layer-1:color-mix')
    expect(css).not.toContain('--dsw-alias-tooltip-bg:color-mix')
    expect(css).toContain('--dsh-livery-card-surface:color-mix')
    expect(css).toContain('@media (prefers-reduced-transparency: no-preference) and (forced-colors: none)')
  })

  it('maps frost percentage to the remaining color percentage', () => {
    const tokens = { light: { '--dsw-alias-bg-base': '#ffffff' }, dark: { '--dsw-alias-bg-base': '#000000' }, frost: 0 }
    expect(buildWallpaperCss({ selection: { kind: 'builtin', id: 'mono' }, effects: DEFAULT_WALLPAPER_EFFECTS, tokens }))
      .toContain('color-mix(in srgb, #ffffff 100%, transparent)')
    const frosted = { ...tokens, frost: 100 }
    expect(buildWallpaperCss({ selection: { kind: 'builtin', id: 'mono' }, effects: DEFAULT_WALLPAPER_EFFECTS, tokens: frosted }))
      .toContain('color-mix(in srgb, #ffffff 0%, transparent)')
  })

  it('omits token overrides for stock appearance or empty token maps', () => {
    expect(tokenContextOf(undefined, 35)).toBeUndefined()
    const css = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'ink' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      tokens: { light: {}, dark: {}, frost: 35 },
    })
    expect(css).not.toContain('color-mix')
  })
})

describe('remote wallpaper mapping', () => {
  it('builds the documented Openverse and Picsum URLs', () => {
    const url = new URL(openverseUrl('quiet sea', 2))
    expect(url.origin + url.pathname).toBe('https://api.openverse.org/v1/images/')
    expect(url.searchParams.get('q')).toBe('quiet sea')
    expect(url.searchParams.get('license')).toBe('cc0,pdm')
    expect(url.searchParams.get('page_size')).toBe('12')
    expect(url.searchParams.get('page')).toBe('2')
    expect(picsumListUrl(3)).toBe('https://picsum.photos/v2/list?page=3&limit=12')
  })

  it('maps Openverse rows, filtering non-https and malformed entries', () => {
    const results = parseOpenverseResults({
      results: [
        { id: 'a', url: 'https://cdn.example/a.jpg', thumbnail: 'https://cdn.example/a-small.jpg', title: 'Sea', creator: 'Ann', license: 'cc0' },
        { id: 'b', url: 'http://insecure.example/b.jpg', title: 'Bad' },
        { url: 'https://cdn.example/c.jpg' },
        { id: 7 },
      ],
    })
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ id: 'a', source: 'openverse.org', license: 'cc0', creator: 'Ann' })
    expect(results[1]).toMatchObject({ id: 'https://cdn.example/c.jpg', title: 'Openverse image', thumbnail: 'https://cdn.example/c.jpg' })
    expect(parseOpenverseResults({})).toEqual([])
    expect(parseOpenverseResults(null)).toEqual([])
  })

  it('maps Picsum rows to 1600x900 renders', () => {
    const results = parsePicsumResults([{ id: '10', author: 'Ann' }, { bad: true }])
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      id: '10',
      url: 'https://picsum.photos/id/10/1600/900',
      thumbnail: 'https://picsum.photos/id/10/400/225',
      title: 'Picsum #10',
      creator: 'Ann',
      license: 'Picsum',
      source: 'picsum.photos',
    })
    expect(parsePicsumResults({})).toEqual([])
  })
})

describe('user-initiated wallpaper requests', () => {
  it('returns mapped results for a successful Openverse search', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('q=sea')
      return new Response(JSON.stringify({ results: [{ id: 'x', url: 'https://cdn.example/x.jpg' }] }), { status: 200 })
    })
    const outcome = await requestWallpaperResults({ source: 'openverse', query: 'sea' }, fetchImpl as unknown as typeof fetch)
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.results[0]?.url).toBe('https://cdn.example/x.jpg')
  })

  it('maps non-ok responses to an error and thrown requests to offline', async () => {
    const failing = vi.fn(async () => new Response('nope', { status: 500 }))
    expect(await requestWallpaperResults({ source: 'picsum' }, failing as unknown as typeof fetch))
      .toEqual({ ok: false, reason: 'error' })
    const throwing = vi.fn(async () => { throw new TypeError('offline') })
    expect(await requestWallpaperResults({ source: 'openverse', query: 'x' }, throwing as unknown as typeof fetch))
      .toEqual({ ok: false, reason: 'offline' })
    vi.stubGlobal('fetch', undefined)
    expect(await requestWallpaperResults({ source: 'picsum' })).toEqual({ ok: false, reason: 'offline' })
  })
})

describe('wallpaper DOM layer', () => {
  it('creates/updates one owned style and marks the body, then clears both', () => {
    const doc = fakeDoc()
    const layer = createWallpaperLayer(doc as never)
    layer.apply('body[data-dsh-wallpaper]::before{color:red}', false)
    const style = doc.getElementById(WALLPAPER_STYLE_ID)
    expect(style?.id).toBe(WALLPAPER_STYLE_ID)
    expect(style?.getAttribute('data-plugin-css')).toBe('dsh-livery/wallpaper')
    expect(style?.textContent).toBe('body[data-dsh-wallpaper]::before{color:red}')
    expect(doc.body.getAttribute('data-dsh-wallpaper')).toBe('')
    expect(doc.head.walk().filter(element => element.tagName === 'STYLE')).toHaveLength(1)

    layer.apply('body[data-dsh-wallpaper]::before{color:blue}', false)
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('blue')
    expect(doc.head.walk().filter(element => element.tagName === 'STYLE')).toHaveLength(1)

    layer.clear()
    expect(doc.getElementById(WALLPAPER_STYLE_ID)).toBeNull()
    expect(doc.body.getAttribute('data-dsh-wallpaper')).toBeNull()
    layer.dispose()
    expect(doc.getElementById(WALLPAPER_STYLE_ID)).toBeNull()
  })

  it('creates the atmosphere overlay as a class/attribute-only element above content', () => {
    const doc = fakeDoc()
    const layer = createWallpaperLayer(doc as never)
    layer.apply('.dsh-livery-wallpaper-overlay{opacity:.3}', true)
    const overlay = doc.getElementById('dsh-livery-wallpaper-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay?.getAttribute('class')).toBe('dsh-livery-wallpaper-overlay')
    expect(overlay?.getAttribute('data-plugin')).toBe('dsh-livery')
    expect(overlay?.getAttribute('aria-hidden')).toBe('true')
    // No inline style attribute: presentation lives in the owned stylesheet only.
    expect(overlay?.getAttribute('style')).toBeNull()
    // Exactly one overlay even after repeated applies; immersive style still owned.
    layer.apply('.dsh-livery-wallpaper-overlay{opacity:.3}', true)
    expect(doc.body.walk().filter(element => element.id === 'dsh-livery-wallpaper-overlay')).toHaveLength(1)
    // atmosphere = 0 removes the overlay but keeps the immersive layer.
    layer.apply('.dsh-livery-wallpaper-overlay{opacity:.3}', false)
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).toBeNull()
    expect(doc.body.getAttribute('data-dsh-wallpaper')).toBe('')
    layer.clear()
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).toBeNull()
  })

  it('applies nothing without a document', () => {
    const layer = createWallpaperLayer(undefined)
    expect(() => { layer.apply('x', false); layer.clear(); layer.dispose() }).not.toThrow()
  })
})

describe('wallpaper controller', () => {
  it('hydrates a legacy v1 stored selection (position 50/50, revision 0) and applies it', () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      kind: 'builtin', id: 'mist', blur: 4, dim: 10, frost: 60,
    }))
    const doc = fakeDoc()
    const controller = createWallpaperController({ storage, document: doc as never })
    controller.start()
    expect(controller.getSnapshot()).toEqual({
      selection: { kind: 'builtin', id: 'mist' },
      effects: { blur: 4, dim: 10, frost: 60, atmosphere: 30 },
      position: { x: 50, y: 50 },
      revision: 0,
    })
    expect(doc.body.getAttribute('data-dsh-wallpaper')).toBe('')
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('blur(4px)')
    // Legacy stored records hydrate the default atmosphere overlay.
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).not.toBeNull()
    controller.dispose()
    expect(doc.body.getAttribute('data-dsh-wallpaper')).toBeNull()
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).toBeNull()
  })

  it('hydrates a schema v2 record with its revision and focal position', () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      revision: 6,
      selection: { kind: 'remote', url: 'https://example.com/v2.jpg' },
      effects: { blur: 10, dim: 20, frost: 30, atmosphere: 45 },
      position: { x: 0, y: 100 },
    }))
    const doc = fakeDoc()
    const controller = createWallpaperController({ storage, document: doc as never })
    controller.start()
    expect(controller.getSnapshot()).toEqual({
      selection: { kind: 'remote', url: 'https://example.com/v2.jpg' },
      effects: { blur: 10, dim: 20, frost: 30, atmosphere: 45 },
      position: { x: 0, y: 100 },
      revision: 6,
    })
    // No cached blob yet: remote URLs never enter CSS directly.
    expect(doc.getElementById(WALLPAPER_STYLE_ID)).toBeNull()
    controller.dispose()
  })

  it('ignores corrupt and unknown-version records and leaves the layer off', () => {
    for (const corrupted of [
      '{not json',
      JSON.stringify({ schemaVersion: 9, selection: { kind: 'builtin', id: 'mist' } }),
      JSON.stringify({ schemaVersion: 2, selection: { kind: 'builtin', id: 'nope' } }),
    ]) {
      const storage = new MemoryStorage()
      storage.setItem(WALLPAPER_STORAGE_KEY, corrupted)
      const doc = fakeDoc()
      const controller = createWallpaperController({ storage, document: doc as never })
      controller.start()
      expect(controller.getSnapshot()).toMatchObject({ selection: undefined, position: { x: 50, y: 50 }, revision: 0 })
      expect(doc.body.getAttribute('data-dsh-wallpaper')).toBeNull()
      expect(doc.getElementById(WALLPAPER_STYLE_ID)).toBeNull()
      controller.dispose()
    }
  })

  it('persists changes debounced as schema v2 with a revision and clears the record when removed', () => {
    vi.useFakeTimers()
    const storage = new MemoryStorage()
    const doc = fakeDoc()
    const controller = createWallpaperController({ storage, document: doc as never })
    controller.start()
    const notifications: number[] = []
    const unsubscribe = controller.subscribe(() => notifications.push(1))

    controller.setSelection({ kind: 'builtin', id: 'ember' })
    expect(storage.getItem(WALLPAPER_STORAGE_KEY)).toBeNull()
    vi.advanceTimersByTime(300)
    const first = JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')
    expect(first).toMatchObject({
      schemaVersion: 2,
      revision: 1,
      selection: { kind: 'builtin', id: 'ember' },
      position: { x: 50, y: 50 },
    })

    controller.setEffects({ blur: 23, dim: 70, frost: 0 })
    vi.advanceTimersByTime(300)
    const second = JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')
    expect(second).toMatchObject({ revision: 2, effects: { blur: 23, dim: 70, frost: 0, atmosphere: 30 } })

    controller.clear()
    vi.advanceTimersByTime(300)
    const cleared = JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')
    expect(cleared).toMatchObject({ schemaVersion: 2, revision: 3, selection: { kind: 'none' } })
    expect(controller.getSnapshot()).toMatchObject({ selection: undefined, revision: 3 })
    expect(notifications.length).toBeGreaterThanOrEqual(3)
    unsubscribe()
    controller.dispose()
  })

  it('applies a batch state replacement as one transition, one save and one notification', () => {
    vi.useFakeTimers()
    const storage = new MemoryStorage()
    const doc = fakeDoc()
    const controller = createWallpaperController({ storage, document: doc as never })
    controller.start()
    const snapshots: unknown[] = []
    controller.subscribe(() => snapshots.push(controller.getSnapshot()))

    const next = controller.setState({
      selection: { kind: 'remote', url: 'https://example.com/batch.jpg' },
      effects: { blur: 16, atmosphere: 55 },
      position: { x: 100, y: 0 },
    })
    expect(next).toEqual({
      selection: { kind: 'remote', url: 'https://example.com/batch.jpg' },
      effects: { blur: 16, dim: 25, frost: 35, atmosphere: 55 },
      position: { x: 100, y: 0 },
      revision: 1,
    })
    // Exactly one subscriber notification for the whole batch.
    expect(snapshots).toHaveLength(1)
    // Remote CSS is emitted only once the verified cache supplies a blob URL.
    expect(doc.getElementById(WALLPAPER_STYLE_ID)).toBeNull()
    // Still one debounced write, containing the whole state.
    expect(storage.getItem(WALLPAPER_STORAGE_KEY)).toBeNull()
    vi.advanceTimersByTime(300)
    expect(JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')).toEqual({
      schemaVersion: 2,
      revision: 1,
      selection: { kind: 'remote', url: 'https://example.com/batch.jpg' },
      effects: { blur: 16, dim: 25, frost: 35, atmosphere: 55 },
      position: { x: 100, y: 0 },
    })
    controller.dispose()
  })

  it('supports explicit revision adoption, immediate flush and position-only changes', () => {
    const storage = new MemoryStorage()
    const doc = fakeDoc()
    const controller = createWallpaperController({ storage, document: doc as never })
    controller.start()
    controller.setState(
      { selection: { kind: 'upload', key: 'upload-1-abc' }, position: { x: 0, y: 0 } },
      { revision: 42, flush: true },
    )
    expect(controller.getSnapshot().revision).toBe(42)
    // flush:true persists immediately, without waiting for the debounce.
    expect(JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')).toMatchObject({
      revision: 42,
      position: { x: 0, y: 0 },
      selection: { kind: 'upload', key: 'upload-1-abc' },
    })
    const moved = controller.setPosition({ x: 100, y: 100 })
    expect(moved.position).toEqual({ x: 100, y: 100 })
    expect(moved.revision).toBe(43)
    // Built-in wallpapers ignore the focal position in the generated stylesheet.
    controller.setSelection({ kind: 'builtin', id: 'aurora' })
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('background-position:center')
    // A position-only change on a built-in still bumps/notifies the state.
    expect(controller.setPosition({ x: 0, y: 100 }).position).toEqual({ x: 0, y: 100 })
    controller.dispose()
  })

  it('applies translucent token overrides when an active livery is synced', () => {
    const storage = new MemoryStorage()
    const doc = fakeDoc()
    const controller = createWallpaperController({ storage, document: doc as never })
    controller.start()
    controller.setSelection({ kind: 'builtin', id: 'aurora' })
    controller.setEffects({ frost: 40 })
    controller.setTokens({ '--dsw-alias-bg-base': '#111111' }, { '--dsw-alias-bg-base': '#222222' })
    const text = doc.getElementById(WALLPAPER_STYLE_ID)?.textContent ?? ''
    expect(text).toContain('--dsw-alias-bg-base:color-mix(in srgb, #111111 60%, transparent)')
    expect(text).toContain('--dsw-alias-bg-base:color-mix(in srgb, #222222 60%, transparent)')
    controller.setTokens(undefined, undefined)
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent ?? '').not.toContain('color-mix')
    controller.dispose()
  })

  it('creates and removes the atmosphere overlay as the slider changes', () => {
    const storage = new MemoryStorage()
    const doc = fakeDoc()
    const controller = createWallpaperController({ storage, document: doc as never })
    controller.start()
    controller.setSelection({ kind: 'builtin', id: 'dusk' })
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).not.toBeNull()
    controller.setEffects({ atmosphere: 0 })
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).toBeNull()
    // The immersive under-content layer survives atmosphere = 0.
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('body[data-dsh-wallpaper]::before')
    controller.setEffects({ atmosphere: 65 })
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).not.toBeNull()
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('opacity:0.65')
    controller.dispose()
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).toBeNull()
  })

  it('publishes itself through the module singleton', () => {
    const controller = createWallpaperController({ storage: new MemoryStorage() })
    setWallpaperController(controller)
    expect(getWallpaperController()).toBe(controller)
    setWallpaperController(undefined)
    expect(getWallpaperController()).toBeUndefined()
  })
})
