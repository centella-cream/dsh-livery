/**
 * Wallpaper core unit tests: URL validation, effect clamping, persistence
 * roundtrip, stylesheet builder (escaping + translucent token math), remote
 * response mapping, fetch outcomes, DOM layer and controller lifecycle.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BUILTIN_WALLPAPERS,
  BUILTIN_WALLPAPER_IDS,
  CLASSIC_BUILTIN_IDS,
  DEFAULT_WALLPAPER_EFFECTS,
  DEFAULT_WALLPAPER_POSITION,
  MAX_WALLPAPER_URL_LENGTH,
  VISIBLE_BUILTIN_IDS,
  WALLPAPER_POSITION_OPTIONS,
  WALLPAPER_POSITION_VALUES,
  WALLPAPER_SIDEBAR_TINT_TOKEN,
  DIRECT_WALLPAPER_STATE_SCHEMA_VERSION,
  WALLPAPER_DIRECT_ID,
  WALLPAPER_STATE_SCHEMA_VERSION,
  WALLPAPER_STORAGE_KEY,
  WALLPAPER_SURFACE_TOKENS,
  backgroundImageValue,
  backgroundPositionValue,
  buildWallpaperCss,
  builtinGalleryVisibility,
  canRepositionWallpaper,
  clampEffects,
  cssUrlValue,
  isBuiltinWallpaperId,
  isClassicBuiltinId,
  isVisibleBuiltinId,
  normalizeWallpaperProvenance,
  normalizeWallpaperProvenanceUrl,
  normalizeWallpaperSelection,
  pinnedClassicBuiltinId,
  provenanceOfSelection,
  sameWallpaperProvenance,
  normalizeWallpaperPosition,
  normalizeWallpaperRevision,
  parseStoredWallpaper,
  parseWallpaperState,
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
import { DIRECT_IMAGE_HOSTS } from '../../src/client/wallpaper/host-safety.js'
import providerManifests from '../../src/provider-manifests.json'

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

describe('built-in visibility (0.2.2)', () => {
  it('exposes exactly the 8 curated ids in the frozen order', () => {
    expect(VISIBLE_BUILTIN_IDS).toEqual(['paper', 'ink', 'aurora', 'cyber', 'dusk', 'minimal', 'mono', 'sand'])
    expect(new Set(VISIBLE_BUILTIN_IDS).size).toBe(8)
    for (const id of VISIBLE_BUILTIN_IDS) {
      expect(isVisibleBuiltinId(id)).toBe(true)
      expect(isClassicBuiltinId(id)).toBe(false)
      expect(isBuiltinWallpaperId(id)).toBe(true)
    }
  })

  it('keeps the remaining 16 in catalog order without remapping any id', () => {
    expect(CLASSIC_BUILTIN_IDS).toEqual([
      'mist', 'ember', 'sea', 'forest', 'desert', 'ocean', 'sky', 'snow',
      'bloom', 'neon', 'retro', 'rose', 'violet', 'midnight', 'sunrise', 'glacier',
    ])
    expect(VISIBLE_BUILTIN_IDS.length + CLASSIC_BUILTIN_IDS.length).toBe(24)
    const partition = [...VISIBLE_BUILTIN_IDS, ...CLASSIC_BUILTIN_IDS].sort()
    expect(partition).toEqual([...BUILTIN_WALLPAPER_IDS].sort())
    // Classic ids preserve their relative order from the catalog list.
    const catalogClassic = BUILTIN_WALLPAPER_IDS.filter(id => !(VISIBLE_BUILTIN_IDS as readonly string[]).includes(id))
    expect(CLASSIC_BUILTIN_IDS).toEqual(catalogClassic)
    for (const id of CLASSIC_BUILTIN_IDS) {
      expect(isClassicBuiltinId(id)).toBe(true)
      expect(isVisibleBuiltinId(id)).toBe(false)
    }
    expect(isClassicBuiltinId('nope')).toBe(false)
    expect(isVisibleBuiltinId('mist')).toBe(false)
  })

  it('keeps all 24 ids and CSS bytes unchanged (no design remap)', () => {
    expect(BUILTIN_WALLPAPER_IDS).toHaveLength(24)
    // The exact catalog payload is pinned so no id/CSS can silently change in a
    // refactor that only touches visibility.
    expect(JSON.stringify(Object.fromEntries(BUILTIN_WALLPAPER_IDS.map(id => [id, BUILTIN_WALLPAPERS[id]]))))
      .toMatchInlineSnapshot(`"{"aurora":"radial-gradient(120% 130% at 8% 0%, #5eead4 0%, transparent 55%), radial-gradient(110% 130% at 92% 12%, #818cf8 0%, transparent 60%), linear-gradient(160deg, #0b1026 0%, #111a3a 100%)","dusk":"linear-gradient(160deg, #2d1b3d 0%, #6b2d5c 48%, #e07a5f 100%)","mist":"linear-gradient(180deg, #e8eef2 0%, #c9d6dd 55%, #9fb3bd 100%)","paper":"repeating-linear-gradient(0deg, #f6f1e7 0 22px, #efe8da 22px 23px)","ink":"radial-gradient(90% 130% at 14% 0%, #3b3b3b 0%, transparent 62%), linear-gradient(180deg, #f2eee6 0%, #d9d2c4 100%)","ember":"radial-gradient(110% 120% at 20% 100%, #f59e0b 0%, transparent 55%), linear-gradient(160deg, #3a0d0d 0%, #7c2d12 58%, #f59e0b 100%)","sea":"linear-gradient(180deg, #0f172a 0%, #0e7490 55%, #67e8f9 100%)","mono":"linear-gradient(160deg, #111111 0%, #333333 50%, #111111 100%)","forest":"radial-gradient(90% 120% at 20% 0%, #14532d 0%, transparent 60%), linear-gradient(170deg, #052e16 0%, #166534 55%, #4ade80 100%)","desert":"linear-gradient(165deg, #78350f 0%, #d97706 45%, #fde68a 100%)","ocean":"radial-gradient(100% 120% at 80% 10%, #0ea5e9 0%, transparent 55%), linear-gradient(180deg, #082f49 0%, #0369a1 55%, #67e8f9 100%)","sky":"linear-gradient(180deg, #38bdf8 0%, #bae6fd 55%, #f0f9ff 100%)","snow":"radial-gradient(80% 90% at 30% 10%, #ffffff 0%, transparent 65%), linear-gradient(170deg, #dbeafe 0%, #e2e8f0 60%, #94a3b8 100%)","bloom":"radial-gradient(60% 70% at 25% 20%, #fbcfe8 0%, transparent 60%), radial-gradient(60% 70% at 80% 75%, #fde68a 0%, transparent 60%), linear-gradient(150deg, #831843 0%, #be185d 60%, #fb7185 100%)","neon":"linear-gradient(120deg, #0f172a 0%, #4c1d95 40%, #db2777 70%, #22d3ee 100%)","cyber":"repeating-linear-gradient(90deg, #0b1026 0 14px, #111a3a 14px 28px), radial-gradient(80% 100% at 50% 120%, #22d3ee 0%, transparent 60%)","retro":"linear-gradient(160deg, #7c2d12 0%, #c2410c 35%, #fbbf24 70%, #fde68a 100%)","sand":"linear-gradient(170deg, #d6c3a5 0%, #e7d7bd 50%, #b49a72 100%)","rose":"linear-gradient(160deg, #4c0519 0%, #9f1239 45%, #fda4af 100%)","violet":"radial-gradient(90% 120% at 15% 10%, #7c3aed 0%, transparent 60%), linear-gradient(170deg, #1e1b4b 0%, #4c1d95 55%, #c4b5fd 100%)","midnight":"linear-gradient(180deg, #020617 0%, #0f172a 55%, #1e293b 100%)","sunrise":"radial-gradient(80% 100% at 80% 100%, #f97316 0%, transparent 60%), linear-gradient(180deg, #1e1b4b 0%, #7c2d12 45%, #fbbf24 100%)","glacier":"radial-gradient(90% 110% at 25% 0%, #e0f2fe 0%, transparent 60%), linear-gradient(170deg, #0f172a 0%, #0369a1 50%, #7dd3fc 100%)","minimal":"linear-gradient(160deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)"}"`)
  })

  it('hydrates and renders every one of the 24 built-ins', () => {
    for (const id of BUILTIN_WALLPAPER_IDS) {
      const stored = serializeWallpaperState({ kind: 'builtin', id }, DEFAULT_WALLPAPER_EFFECTS)
      expect(parseWallpaperState(stored)?.selection).toEqual({ kind: 'builtin', id })
      expect(backgroundImageValue({ kind: 'builtin', id })).toBe(BUILTIN_WALLPAPERS[id])
    }
  })

  it('decides the pinned-legacy swatch from the current selection only', () => {
    expect(pinnedClassicBuiltinId(undefined)).toBeUndefined()
    expect(pinnedClassicBuiltinId({ kind: 'builtin', id: 'sand' })).toBeUndefined()
    expect(pinnedClassicBuiltinId({ kind: 'builtin', id: 'mist' })).toBe('mist')
    expect(pinnedClassicBuiltinId({ kind: 'builtin', id: 'glacier' })).toBe('glacier')
    expect(pinnedClassicBuiltinId({ kind: 'remote', url: 'https://example.com/a.jpg' })).toBeUndefined()
    expect(pinnedClassicBuiltinId({ kind: 'upload', key: 'upload-1-a' })).toBeUndefined()
    expect(pinnedClassicBuiltinId({ kind: 'style', variant: 'mesh' })).toBeUndefined()
  })

  it('groups the gallery without duplicating the pinned Classic id', () => {
    const plain = builtinGalleryVisibility(undefined)
    expect(plain.pinnedClassic).toBeUndefined()
    expect(plain.visible).toEqual([...VISIBLE_BUILTIN_IDS])
    expect(plain.classic).toEqual([...CLASSIC_BUILTIN_IDS])

    const pinned = builtinGalleryVisibility({ kind: 'builtin', id: 'forest' })
    expect(pinned.pinnedClassic).toBe('forest')
    expect(pinned.visible).toEqual([...VISIBLE_BUILTIN_IDS])
    expect(pinned.classic).toHaveLength(15)
    expect(pinned.classic).not.toContain('forest')
    const allIds = [...pinned.visible, ...pinned.classic, pinned.pinnedClassic]
    expect(new Set(allIds).size).toBe(24)
  })
})

describe('wallpaper provenance', () => {
  const provenance = {
    providerId: 'openverse',
    title: 'Quiet sea',
    creator: 'A. Photographer',
    creatorUrl: 'https://openverse.org/u/a',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source: 'Openverse',
    sourceUrl: 'https://openverse.org/i/1',
  } as const

  it('normalizes valid provenance and trims display text', () => {
    expect(normalizeWallpaperProvenance({ ...provenance, title: '  Quiet sea  ' })).toEqual(provenance)
    expect(normalizeWallpaperProvenance({ title: 'Only text' })).toEqual({ title: 'Only text' })
    expect(normalizeWallpaperProvenance({ creatorUrl: 'https://EXAMPLE.com/u/a' })).toEqual({
      creatorUrl: 'https://example.com/u/a',
    })
  })

  it('rejects non-objects/empty records and drops unusable fields', () => {
    expect(normalizeWallpaperProvenance(undefined)).toBeUndefined()
    expect(normalizeWallpaperProvenance(null)).toBeUndefined()
    expect(normalizeWallpaperProvenance('credit')).toBeUndefined()
    expect(normalizeWallpaperProvenance({})).toBeUndefined()
    expect(normalizeWallpaperProvenance({ title: 'x'.repeat(201) })).toBeUndefined()
    expect(normalizeWallpaperProvenance({ providerId: 'p'.repeat(65) })).toBeUndefined()
    expect(normalizeWallpaperProvenance({ title: 'bad\u0000title' })).toBeUndefined()
    // Invalid URLs are dropped individually; the rest of the credit survives.
    expect(normalizeWallpaperProvenance({
      title: 'Dunes',
      creatorUrl: 'http://example.com/a',
      licenseUrl: 'https://localhost/a',
      sourceUrl: 'not-a-url',
    })).toEqual({ title: 'Dunes' })
  })

  it('requires https, public-host, bounded provenance URLs', () => {
    for (const url of [
      'http://example.com/a.jpg',
      'https://localhost/a.jpg',
      'https://127.0.0.1/a.jpg',
      'https://192.168.1.1/a.jpg',
      'https://printer/a.jpg',
      'https://user:pw@example.com/a.jpg',
      `https://example.com/${'a'.repeat(MAX_WALLPAPER_URL_LENGTH)}.jpg`,
      'javascript:alert(1)',
    ]) {
      expect(normalizeWallpaperProvenanceUrl(url), url).toBeUndefined()
    }
    expect(normalizeWallpaperProvenanceUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg')
  })

  it('compares normalized provenance structurally', () => {
    expect(sameWallpaperProvenance(undefined, undefined)).toBe(true)
    expect(sameWallpaperProvenance(undefined, {})).toBe(false)
    expect(sameWallpaperProvenance(provenance, { ...provenance })).toBe(true)
    expect(sameWallpaperProvenance(provenance, { ...provenance, creator: 'Other' })).toBe(false)
  })

  it('exposes provenance only for remote selections', () => {
    expect(provenanceOfSelection({ kind: 'remote', url: 'https://example.com/a.jpg', provenance })).toEqual(provenance)
    expect(provenanceOfSelection({ kind: 'remote', url: 'https://example.com/a.jpg' })).toBeUndefined()
    expect(provenanceOfSelection({ kind: 'builtin', id: 'mist' })).toBeUndefined()
    expect(provenanceOfSelection({ kind: 'upload', key: 'upload-1-a' })).toBeUndefined()
    expect(provenanceOfSelection({ kind: 'style', variant: 'mesh' })).toBeUndefined()
    expect(provenanceOfSelection(undefined)).toBeUndefined()
  })

  it('sanitizes remote selection provenance before it enters state', () => {
    expect(normalizeWallpaperSelection({
      kind: 'remote',
      url: 'https://example.com/a.jpg',
      provenance: { title: 'Dunes', creatorUrl: 'https://example.com/u' },
    })).toEqual({ kind: 'remote', url: 'https://example.com/a.jpg', provenance: { title: 'Dunes', creatorUrl: 'https://example.com/u' } })
    // An entirely invalid provenance record is dropped, the image stays.
    expect(normalizeWallpaperSelection({
      kind: 'remote',
      url: 'https://example.com/a.jpg',
      provenance: { creatorUrl: 'http://insecure.example/u' },
    })).toEqual({ kind: 'remote', url: 'https://example.com/a.jpg' })
    expect(normalizeWallpaperSelection({ kind: 'builtin', id: 'mist' })).toEqual({ kind: 'builtin', id: 'mist' })
    expect(normalizeWallpaperSelection(undefined)).toBeUndefined()
    // Defensive: an unknown style variant never enters state.
    expect(normalizeWallpaperSelection({ kind: 'style', variant: 'grid' } as never)).toBeUndefined()
    expect(normalizeWallpaperSelection({ kind: 'style', variant: 'mesh' })).toEqual({ kind: 'style', variant: 'mesh' })
  })

  it('round-trips provenance through the main remote selection', () => {
    const stored = serializeWallpaperState(
      { kind: 'remote', url: 'https://example.com/a.jpg', provenance },
      DEFAULT_WALLPAPER_EFFECTS,
    )
    expect(stored.selection).toEqual({ kind: 'remote', url: 'https://example.com/a.jpg', provenance })
    expect(parseWallpaperState(stored)).toEqual({
      revision: 0,
      selection: { kind: 'remote', url: 'https://example.com/a.jpg', provenance },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      position: DEFAULT_WALLPAPER_POSITION,
    })
  })

  it('drops invalid URLs on write while keeping the image and text credit', () => {
    const stored = serializeWallpaperState(
      {
        kind: 'remote',
        url: 'https://example.com/a.jpg',
        provenance: { title: 'Dunes', creator: 'Ann', creatorUrl: 'http://insecure.example/u' },
      },
      DEFAULT_WALLPAPER_EFFECTS,
    )
    expect(stored.selection).toEqual({
      kind: 'remote',
      url: 'https://example.com/a.jpg',
      provenance: { title: 'Dunes', creator: 'Ann' },
    })
  })

  it('survives a 0.2.1-shaped rewrite that drops provenance but keeps the image', () => {
    // 0.2.1 ignores the unknown `provenance` member on read and rebuilds a
    // compact remote selection on its next write.
    const rewritten = { schemaVersion: 2, revision: 3, selection: { kind: 'remote', url: 'https://example.com/a.jpg' }, effects: DEFAULT_WALLPAPER_EFFECTS, position: DEFAULT_WALLPAPER_POSITION }
    const parsed = parseWallpaperState(rewritten)
    expect(parsed?.selection).toEqual({ kind: 'remote', url: 'https://example.com/a.jpg' })
    // The cached image still renders (remote CSS always comes from the verified local URL).
    expect(buildWallpaperCss({
      selection: parsed!.selection,
      effects: DEFAULT_WALLPAPER_EFFECTS,
      imageOverride: 'blob:cached',
    })).toContain("url('blob:cached')")
  })

  it('carries provenance through controller state and persistence', () => {
    const storage = new MemoryStorage()
    const controller = createWallpaperController({ storage, document: fakeDoc() as never })
    controller.start()
    controller.setSelection({ kind: 'remote', url: 'https://example.com/a.jpg', provenance })
    const selection = controller.getSnapshot().selection
    expect(selection).toEqual({ kind: 'remote', url: 'https://example.com/a.jpg', provenance })
    expect(controller.flushState()).toBe(true)
    const raw = JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')
    expect(raw.selection.provenance).toEqual(provenance)
    expect(controller.getPersistedSelection()).toEqual({ kind: 'remote', url: 'https://example.com/a.jpg', provenance })
    controller.dispose()
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


  it('writes direct selections to schema v3 only and keeps cached selections on v2', () => {
    const direct = {
      kind: 'remote' as const,
      url: 'https://openaccess-cdn.clevelandart.org/print.jpg',
      delivery: 'direct' as const,
      thumbnail: 'https://openaccess-cdn.clevelandart.org/web.jpg',
      provenance: { providerId: 'cleveland', title: 'Art' },
    }
    const record = serializeWallpaperState(direct, DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, 7)
    expect(record.schemaVersion).toBe(DIRECT_WALLPAPER_STATE_SCHEMA_VERSION)
    expect(record.schemaVersion).toBe(3)
    expect(record.selection).toMatchObject({ kind: 'remote', delivery: 'direct' })
    expect(parseWallpaperState(record)).toMatchObject({ revision: 7, selection: direct })
    expect(serializeWallpaperState({ kind: 'remote', url: 'https://cdn.example/cached.jpg' }, DEFAULT_WALLPAPER_EFFECTS).schemaVersion).toBe(2)
    // A direct record without the explicit delivery discriminator is not v3.
    expect(parseWallpaperState({
      schemaVersion: 3,
      revision: 1,
      selection: { kind: 'remote', url: 'https://example.com/x.jpg' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      position: DEFAULT_WALLPAPER_POSITION,
    })).toBeUndefined()
    // Direct records are provider-controlled: unknown hosts / missing providerId fail closed.
    for (const selection of [
      { kind: 'remote', url: 'https://evil.example/print.jpg', delivery: 'direct', provenance: { providerId: 'cleveland' } },
      { kind: 'remote', url: 'https://openaccess-cdn.clevelandart.org/print.jpg', delivery: 'direct' },
      { kind: 'remote', url: 'https://openaccess-cdn.clevelandart.org/print.jpg', delivery: 'direct', thumbnail: 'https://evil.example/web.jpg', provenance: { providerId: 'cleveland' } },
    ]) {
      expect(parseWallpaperState({
        schemaVersion: 3,
        revision: 1,
        selection,
        effects: DEFAULT_WALLPAPER_EFFECTS,
        position: DEFAULT_WALLPAPER_POSITION,
      })).toBeUndefined()
    }
  })

  it('keeps the direct client host allowlist exactly equal to the reviewed manifests', () => {
    const directProviders = providerManifests.providers.filter(provider => provider.delivery === 'direct')
    // Bidirectional: every reviewed direct provider is present, and the client
    // has no extra direct-provider entry.
    expect(new Set(Object.keys(DIRECT_IMAGE_HOSTS)))
      .toEqual(new Set(directProviders.map(provider => provider.id)))
    for (const provider of directProviders) {
      // The client uses one exact host; fail loudly if a future manifest has more
      // or different hosts instead of silently allowing only the first.
      expect(provider.imageHosts).toEqual([DIRECT_IMAGE_HOSTS[provider.id]])
    }
  })

  it('emits direct image CSS without a body pseudo-element and keeps cached remote CSS unchanged', () => {
    const direct = buildWallpaperCss({
      selection: { kind: 'remote', url: 'https://oa.example/full.jpg', delivery: 'direct', thumbnail: 'https://oa.example/web.jpg' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      imageLayer: 'direct',
      position: { x: 50, y: 0 },
    })
    expect(direct).toContain(`#${WALLPAPER_DIRECT_ID}`)
    expect(direct).not.toContain('::before')
    expect(direct).toContain('object-position:50% 0%')
    const cached = buildWallpaperCss({
      selection: { kind: 'remote', url: 'https://cdn.example/cached.jpg' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      imageOverride: 'blob:https://app/1',
    })
    expect(cached).toContain('::before')
    expect(cached).toContain("url('blob:https://app/1')")
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
    // The generated style layer is a fixed recipe: always centered.
    expect(backgroundPositionValue({ kind: 'style', variant: 'mesh' }, { x: 100, y: 100 })).toBe('center')
    expect(backgroundPositionValue({ kind: 'remote', url: 'https://example.com/w.jpg' })).toBe('50% 50%')
    expect(backgroundPositionValue({ kind: 'upload', key: 'upload-1-abc' }, { x: 0, y: 0 })).toBe('0% 0%')

    // Repositioning applies to real images only.
    expect(canRepositionWallpaper({ kind: 'remote', url: 'https://example.com/w.jpg' })).toBe(true)
    expect(canRepositionWallpaper({ kind: 'upload', key: 'upload-1-abc' })).toBe(true)
    expect(canRepositionWallpaper({ kind: 'builtin', id: 'ocean' })).toBe(false)
    expect(canRepositionWallpaper({ kind: 'style', variant: 'mesh' })).toBe(false)
    expect(canRepositionWallpaper(undefined)).toBe(false)
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

  it('keeps the macOS sidebar tint at frost and gives the fill a legibility boost', () => {
    const fillLight = '#ebeff2'
    const fillDark = '#1e2227'
    const css = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'dusk' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, frost: 35 },
      tokens: {
        light: {
          '--dsw-alias-bg-base': '#ffffff',
          '--dsw-specific-sidebar-fill': fillLight,
        },
        dark: {
          '--dsw-alias-bg-base': '#101010',
          '--dsw-specific-sidebar-fill': fillDark,
        },
        frost: 35,
      },
    })
    // macOS paints the ordinary sidebar as wash + 40% (light) / 50% (dark) of
    // --dsw-specific-sidebar-tint. The tint must carry the frost ratio once, not
    // stack the host multiplier on top of the already-translucent fill (which
    // would land at 26-33% instead of 65%).
    expect(css).toContain(
      `body[data-dsh-livery][data-dsh-wallpaper]{${WALLPAPER_SIDEBAR_TINT_TOKEN}:color-mix(in srgb, color-mix(in srgb, ${fillLight} 97%, #7a9bf0) 65%, transparent)}`,
    )
    expect(css).toContain(
      `body[data-dsh-livery][data-dsh-wallpaper][data-ds-dark-theme]{${WALLPAPER_SIDEBAR_TINT_TOKEN}:color-mix(in srgb, ${fillDark} 65%, transparent)}`,
    )
    // Direct-paint paths (Web/Windows/drawer) use the same effective alpha as
    // the host-composited macOS rail (85% fill × 40/50%).
    expect(css).toContain(`--dsw-specific-sidebar-fill:color-mix(in srgb, ${fillLight} 34%, transparent)`)
    expect(css).toContain(`--dsw-specific-sidebar-fill:color-mix(in srgb, ${fillDark} 42.5%, transparent)`)
    expect(css).toContain(`--dsw-specific-sidebar-fill:color-mix(in srgb, ${fillLight} 85%, transparent)`)
    expect(css).toContain(`--dsw-specific-sidebar-fill:color-mix(in srgb, ${fillDark} 85%, transparent)`)
    // No double frost: the tint is authored as a host token, not a surface token.
    expect(WALLPAPER_SURFACE_TOKENS).not.toContain(WALLPAPER_SIDEBAR_TINT_TOKEN)
  })

  it('omits the macOS sidebar tint when a mode has no sidebar fill token', () => {
    const css = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'mono' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      tokens: {
        light: { '--dsw-alias-bg-base': '#ffffff' },
        dark: { '--dsw-alias-bg-base': '#000000' },
        frost: 35,
      },
    })
    expect(css).not.toContain(WALLPAPER_SIDEBAR_TINT_TOKEN)
  })

  it('keeps host dialog surfaces opaque so settings never show page text through', () => {
    // Dialog/modal panels use --dsw-alias-bg-layer-2; making it translucent
    // would leak the underlying page through the Settings overlay.
    expect(WALLPAPER_SURFACE_TOKENS).not.toContain('--dsw-alias-bg-layer-2')
    expect(WALLPAPER_SURFACE_TOKENS).not.toContain('--dsw-specific-sidebar-fill')
    expect(WALLPAPER_SURFACE_TOKENS).not.toContain(WALLPAPER_SIDEBAR_TINT_TOKEN)
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
    const tokens = {
      light: { '--dsw-alias-bg-base': '#ffffff', '--dsw-specific-sidebar-fill': '#f0f0f0' },
      dark: { '--dsw-alias-bg-base': '#000000', '--dsw-specific-sidebar-fill': '#101010' },
      frost: 0,
    }
    const clear = buildWallpaperCss({ selection: { kind: 'builtin', id: 'mono' }, effects: DEFAULT_WALLPAPER_EFFECTS, tokens })
    expect(clear).toContain('color-mix(in srgb, #ffffff 100%, transparent)')
    expect(clear).toContain(`${WALLPAPER_SIDEBAR_TINT_TOKEN}:color-mix(in srgb, color-mix(in srgb, #f0f0f0 97%, #7a9bf0) 100%, transparent)`)
    const frosted = { ...tokens, frost: 100 }
    const opaque = buildWallpaperCss({ selection: { kind: 'builtin', id: 'mono' }, effects: DEFAULT_WALLPAPER_EFFECTS, tokens: frosted })
    expect(opaque).toContain('color-mix(in srgb, #ffffff 0%, transparent)')
    expect(opaque).toContain(`${WALLPAPER_SIDEBAR_TINT_TOKEN}:color-mix(in srgb, color-mix(in srgb, #f0f0f0 97%, #7a9bf0) 0%, transparent)`)
  })

  it('pins opaque menu/fill surfaces for stock style with an active wallpaper', () => {
    const css = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'ink' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
    })
    expect(css).toContain(
      'body[data-dsh-wallpaper]:not([data-dsh-livery]){--dsw-menu-surface-fill:var(--dsw-alias-bg-layer-1);',
    )
    expect(css).toContain('--dsw-specific-menu:var(--dsw-alias-bg-layer-1)')
    expect(css).toContain('--dsw-alias-fill-l1:var(--dsw-alias-bg-layer-1)')
    expect(css).toContain('--dsw-alias-fill-l2:var(--dsw-alias-bg-layer-2)')
    const livery = buildWallpaperCss({
      selection: { kind: 'builtin', id: 'ink' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      tokens: { light: { '--dsw-alias-bg-base': '#fff' }, dark: { '--dsw-alias-bg-base': '#000' }, frost: 35 },
    })
    expect(livery).not.toContain(':not([data-dsh-livery])')
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


  it('renders and clears one direct image layer with a no-referrer image', () => {
    const doc = fakeDoc()
    const layer = createWallpaperLayer(doc as never)
    layer.apply('body[data-dsh-wallpaper]{color:red}', false, {
      url: 'https://oa.example/full.jpg',
      fallbackUrl: 'https://oa.example/web.jpg',
    })
    const wrapper = doc.getElementById(WALLPAPER_DIRECT_ID)
    expect(wrapper).not.toBeNull()
    expect(wrapper?.getAttribute('class')).toBe('dsh-livery-wallpaper-direct')
    const image = wrapper?.children[0]
    expect(image?.getAttribute('src')).toBe('https://oa.example/full.jpg')
    expect(image?.getAttribute('referrerpolicy')).toBe('no-referrer')
    // A failed full image falls back once; a second failure marks the layer.
    ;(image as unknown as { onerror?: () => void }).onerror?.()
    expect(image?.getAttribute('src')).toBe('https://oa.example/web.jpg')
    ;(image as unknown as { onerror?: () => void }).onerror?.()
    expect(wrapper?.getAttribute('data-failed')).toBe('true')
    // A new direct selection resets the fallback and uses its own thumbnail.
    layer.apply('body[data-dsh-wallpaper]{color:red}', false, {
      url: 'https://openaccess-cdn.clevelandart.org/A.jpg',
      fallbackUrl: 'https://openaccess-cdn.clevelandart.org/A-thumb.jpg',
    })
    expect(wrapper?.getAttribute('data-failed')).toBeNull()
    expect(image?.getAttribute('src')).toBe('https://openaccess-cdn.clevelandart.org/A.jpg')
    ;(image as unknown as { onerror?: () => void }).onerror?.()
    expect(image?.getAttribute('src')).toBe('https://openaccess-cdn.clevelandart.org/A-thumb.jpg')
    layer.apply('body[data-dsh-wallpaper]{color:red}', false, {
      url: 'https://images.metmuseum.org/B.jpg',
      fallbackUrl: 'https://images.metmuseum.org/B-thumb.jpg',
    })
    ;(image as unknown as { onerror?: () => void }).onerror?.()
    expect(image?.getAttribute('src')).toBe('https://images.metmuseum.org/B-thumb.jpg')
    // Switching back to a cached/full body selection removes the direct layer.
    layer.apply('body[data-dsh-wallpaper]::before{color:blue}', false)
    expect(doc.getElementById(WALLPAPER_DIRECT_ID)).toBeNull()
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
