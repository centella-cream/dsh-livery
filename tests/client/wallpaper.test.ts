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
  MAX_WALLPAPER_URL_LENGTH,
  WALLPAPER_STORAGE_KEY,
  WALLPAPER_SURFACE_TOKENS,
  backgroundImageValue,
  buildWallpaperCss,
  clampEffects,
  cssUrlValue,
  isBuiltinWallpaperId,
  openverseUrl,
  parseOpenverseResults,
  parsePicsumResults,
  parseStoredWallpaper,
  picsumListUrl,
  requestWallpaperResults,
  serializeWallpaper,
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
    expect(css).toContain('z-index:2147483000')
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

  it('escapes remote URLs inside single-quoted url()', () => {
    expect(cssUrlValue("https://example.com/a'b\\c.jpg")).toBe("url('https://example.com/a\\'b\\\\c.jpg')")
    expect(cssUrlValue('https://example.com/a\nb.jpg')).toBe("url('https://example.com/ab.jpg')")
    const css = buildWallpaperCss({
      selection: { kind: 'remote', url: "https://example.com/a'b.jpg" },
      effects: DEFAULT_WALLPAPER_EFFECTS,
    })
    expect(css).toContain("background-image:url('https://example.com/a\\'b.jpg')")
    expect(css.match(/'/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('emits translucent livery surface tokens with color-mix math', () => {
    const light = {
      '--dsw-alias-bg-base': '#101820',
      '--dsw-alias-bg-layer-1': '#1b2430',
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
    expect(css).toContain('--dsw-alias-bg-layer-1:color-mix(in srgb, #1b2430 65%, transparent)')
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
    expect(css).toContain('--dsw-alias-bg-layer-1:color-mix')
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
  it('hydrates a stored selection and applies it to the layer', () => {
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
    })
    expect(doc.body.getAttribute('data-dsh-wallpaper')).toBe('')
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('blur(4px)')
    // Legacy stored records hydrate the default atmosphere overlay.
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).not.toBeNull()
    controller.dispose()
    expect(doc.body.getAttribute('data-dsh-wallpaper')).toBeNull()
    expect(doc.getElementById('dsh-livery-wallpaper-overlay')).toBeNull()
  })

  it('ignores corrupt storage and leaves the layer off', () => {
    const storage = new MemoryStorage()
    storage.setItem(WALLPAPER_STORAGE_KEY, '{not json')
    const doc = fakeDoc()
    const controller = createWallpaperController({ storage, document: doc as never })
    controller.start()
    expect(controller.getSnapshot().selection).toBeUndefined()
    expect(doc.body.getAttribute('data-dsh-wallpaper')).toBeNull()
    expect(doc.getElementById(WALLPAPER_STYLE_ID)).toBeNull()
    controller.dispose()
  })

  it('persists changes debounced and clears the record when removed', () => {
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
    const stored = JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')
    expect(stored).toMatchObject({ kind: 'builtin', id: 'ember' })

    controller.setEffects({ blur: 23, dim: 70, frost: 0 })
    vi.advanceTimersByTime(300)
    expect(JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')).toMatchObject({ blur: 23, dim: 70, frost: 0 })

    controller.clear()
    vi.advanceTimersByTime(300)
    expect(storage.getItem(WALLPAPER_STORAGE_KEY)).toBeNull()
    expect(controller.getSnapshot().selection).toBeUndefined()
    expect(notifications.length).toBeGreaterThanOrEqual(3)
    unsubscribe()
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
