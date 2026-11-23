/**
 * `kind: 'style'` wallpaper: generated recipe, sidecar persistence, identity
 * rules and controller lifecycle.
 *
 * The sidecar is a localStorage record (not IndexedDB), so these tests exercise
 * the controller with an in-memory storage plus a fake image store to prove a
 * style layer never creates a blob/IndexedDB row or a `url(...)`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CATALOG_PROFILES } from '../../src/generated/liveries.js'
import type { TokenMap } from '../../src/core/types.js'
import {
  DEFAULT_WALLPAPER_EFFECTS,
  DEFAULT_WALLPAPER_POSITION,
  WALLPAPER_STORAGE_KEY,
  buildWallpaperCss,
  parseWallpaperState,
  serializeWallpaperState,
} from '../../src/client/wallpaper.js'
import {
  STYLE_BASE_ANGLE,
  STYLE_LAYER3_MIX,
  STYLE_LAYER3_RADIAL,
  STYLE_PRIMARY_MIX,
  STYLE_PRIMARY_RADIAL,
  STYLE_WALLPAPER_TOKENS,
  STYLE_WALLPAPER_VARIANTS,
  isStyleWallpaperVariant,
  styleWallpaperImage,
} from '../../src/client/wallpaper/style.js'
import type { StyleWallpaperVariant } from '../../src/client/wallpaper/style.js'
import {
  WALLPAPER_STYLE_SCHEMA_VERSION,
  WALLPAPER_STYLE_STORAGE_KEY,
  parseStoredWallpaperStyle,
  readStoredWallpaperStyle,
  removeStoredWallpaperStyle,
  sameWallpaperStateIdentity,
  serializeStoredWallpaperStyle,
  wallpaperStateIdentityOf,
  writeStoredWallpaperStyle,
} from '../../src/client/wallpaper/style-store.js'
import { createWallpaperController, setWallpaperController } from '../../src/client/wallpaper/controller.js'
import type { WallpaperStorage } from '../../src/client/wallpaper/controller.js'
import { WALLPAPER_STYLE_ID } from '../../src/client/wallpaper/apply.js'
import { writeWallpaperRefs, readReferencedUploadKeys } from '../../src/client/wallpaper/refs.js'
import { clearAllLocalWallpaperData, obsoleteUploadKey } from '../../src/client/wallpaper/lifecycle.js'
import { matchesPresetWallpaperState, presetWallpaperTarget } from '../../src/client/wallpaper/preset.js'
import type { StoredImageRecord, WallpaperImageStore } from '../../src/client/wallpaper/storage.js'
import type { StorageEventLike, StorageEventTarget } from '../../src/client/wallpaper/sync.js'
import { FakeDocument } from './fixtures.js'

/** In-memory localStorage with injectable failure/hook behaviour. */
class MemoryStorage implements WallpaperStorage {
  readonly map = new Map<string, string>()
  readonly failSetKeys = new Set<string>()
  readonly failRemoveKeys = new Set<string>()
  onSet: ((key: string, value: string) => void) | undefined
  get length(): number { return this.map.size }
  key(index: number): string | null { return [...this.map.keys()][index] ?? null }
  getItem(key: string): string | null { return this.map.get(key) ?? null }
  setItem(key: string, value: string): void {
    if (this.failSetKeys.has(key)) throw new Error(`quota exceeded for ${key}`)
    this.map.set(key, value)
    this.onSet?.(key, value)
  }
  removeItem(key: string): void {
    if (this.failRemoveKeys.has(key)) throw new Error(`cannot remove ${key}`)
    this.map.delete(key)
  }
}

class FakeImages implements WallpaperImageStore {
  readonly records = new Map<string, StoredImageRecord>()
  put = vi.fn(async (record: StoredImageRecord) => { this.records.set(record.key, record) })
  get = vi.fn(async (key: string) => this.records.get(key))
  delete = vi.fn(async (key: string) => { this.records.delete(key) })
  list = vi.fn(async () => [...this.records.values()])
  clear = vi.fn(async () => { this.records.clear() })
  touch = vi.fn(async () => undefined as StoredImageRecord | undefined)
}

/** Minimal storage-event target for two-tab adoption tests. */
class FakeEvents implements StorageEventTarget {
  private listener: ((event: StorageEventLike) => void) | undefined
  addEventListener(_type: 'storage', listener: (event: StorageEventLike) => void): void { this.listener = listener }
  removeEventListener(): void { this.listener = undefined }
  emit(newValue: string | null): void { this.listener?.({ key: WALLPAPER_STORAGE_KEY, newValue }) }
}

/** Light/dark token maps with every style token present. */
const LIGHT: TokenMap = {
  '--dsw-alias-brand-primary': '#b46000',
  '--dsw-alias-bg-layer-3': '#ededed',
  '--dsw-alias-bg-base': '#fafafa',
  '--dsw-alias-bg-layer-2': '#f5f5f5',
  '--dsw-alias-label-primary': '#4d5257',
}
const DARK: TokenMap = {
  '--dsw-alias-brand-primary': '#ffcc66',
  '--dsw-alias-bg-layer-3': '#2a2a2a',
  '--dsw-alias-bg-base': '#0b0e14',
  '--dsw-alias-bg-layer-2': '#11151d',
  '--dsw-alias-label-primary': '#bfbdb6',
}

const styleSelection = { kind: 'style' as const, variant: 'mesh' as const }

interface Harness {
  readonly controller: ReturnType<typeof createWallpaperController>
  readonly doc: FakeDocument
  readonly images: FakeImages
  readonly objectUrls: { create: ReturnType<typeof vi.fn>; revoke: ReturnType<typeof vi.fn> }
}

/** Build one started controller with tokens pre-seeded (or deliberately not). */
function harness(options: {
  readonly storage?: MemoryStorage
  readonly tokens?: boolean
  readonly sourceId?: string
  readonly eventTarget?: StorageEventTarget
} = {}): Harness {
  const doc = new FakeDocument()
  const images = new FakeImages()
  const objectUrls = {
    create: vi.fn((_blob: Blob) => 'blob:style-test'),
    revoke: vi.fn(),
  }
  const controller = createWallpaperController({
    storage: options.storage ?? new MemoryStorage(),
    document: doc as never,
    images,
    objectUrls,
    sourceId: options.sourceId ?? 'tab-a',
    eventTarget: options.eventTarget,
  })
  if (options.tokens !== false) controller.setTokens(LIGHT, DARK)
  controller.start()
  return { controller, doc, images, objectUrls }
}

/** Persisted main record as this controller writes it. */
function storedMain(storage: MemoryStorage): Record<string, unknown> {
  return JSON.parse(storage.getItem(WALLPAPER_STORAGE_KEY) ?? 'null')
}

/** Persisted sidecar as this controller writes it. */
function storedStyle(storage: MemoryStorage): Record<string, unknown> {
  return JSON.parse(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY) ?? 'null')
}

/** Seed one matching main tombstone + sidecar pair. */
function seedStyle(storage: MemoryStorage, revision: number, sourceId?: string): void {
  storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({
    schemaVersion: 2,
    revision,
    selection: { kind: 'none' },
    effects: DEFAULT_WALLPAPER_EFFECTS,
    position: DEFAULT_WALLPAPER_POSITION,
    ...(sourceId === undefined ? {} : { sourceId }),
  }))
  storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, JSON.stringify({
    schemaVersion: 1,
    variant: 'mesh',
    revision,
    sourceId: sourceId ?? '',
  }))
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  setWallpaperController(undefined)
})

describe('style recipe', () => {
  it('freezes the documented variant/mix/token constants', () => {
    expect(STYLE_WALLPAPER_VARIANTS).toEqual(['mesh'])
    expect(isStyleWallpaperVariant('mesh')).toBe(true)
    expect(isStyleWallpaperVariant('grid')).toBe(false)
    expect(STYLE_PRIMARY_MIX).toBe(24)
    expect(STYLE_LAYER3_MIX).toBe(18)
    expect(STYLE_PRIMARY_RADIAL).toEqual({ size: '120% 140%', at: '12% 0%', stop: '55%' })
    expect(STYLE_LAYER3_RADIAL).toEqual({ size: '110% 130%', at: '88% 18%', stop: '60%' })
    expect(STYLE_BASE_ANGLE).toBe('160deg')
    expect(STYLE_WALLPAPER_TOKENS).toEqual([
      '--dsw-alias-brand-primary',
      '--dsw-alias-bg-layer-3',
      '--dsw-alias-bg-base',
      '--dsw-alias-bg-layer-2',
    ])
  })

  it('emits the exact recipe with the mode token values inlined', () => {
    expect(styleWallpaperImage(LIGHT)).toBe(
      'radial-gradient(120% 140% at 12% 0%,'
      + ' color-mix(in srgb, #b46000 24%, transparent) 0%, transparent 55%),'
      + ' radial-gradient(110% 130% at 88% 18%,'
      + ' color-mix(in srgb, #ededed 18%, transparent) 0%, transparent 60%),'
      + ' linear-gradient(160deg, #fafafa 0%, #f5f5f5 100%)',
    )
    expect(styleWallpaperImage(LIGHT, 'mesh')).toBe(styleWallpaperImage(LIGHT))
  })

  it('is deterministic and mode-specific (light image differs from dark)', () => {
    expect(styleWallpaperImage(LIGHT)).toBe(styleWallpaperImage(LIGHT))
    expect(styleWallpaperImage(DARK)).toBe(styleWallpaperImage(DARK))
    expect(styleWallpaperImage(LIGHT)).not.toBe(styleWallpaperImage(DARK))
    expect(styleWallpaperImage(DARK)).toContain('#ffcc66')
  })

  it('never emits a url()/var()/remote asset and has no per-style override', () => {
    for (const tokens of [LIGHT, DARK]) {
      const image = styleWallpaperImage(tokens) ?? ''
      expect(image).not.toMatch(/url\(|var\(|https?:|!important|@import/i)
      // The global mix percentages appear exactly once each (the `88% 18%`
      // anchor coordinate is a different number occurrence).
      expect(image).toContain(' 24%, transparent')
      expect(image).toContain(' 18%, transparent')
      expect(image.match(/color-mix\(in srgb, /g)).toHaveLength(2)
    }
  })

  it('fails closed without tokens instead of painting half a layer', () => {
    expect(styleWallpaperImage({})).toBeUndefined()
    for (const missing of STYLE_WALLPAPER_TOKENS) {
      const partial = { ...LIGHT }
      delete (partial as Record<string, string>)[missing]
      expect(styleWallpaperImage(partial), missing).toBeUndefined()
    }
    expect(styleWallpaperImage({ ...LIGHT, '--dsw-alias-brand-primary': '#fff;}body{color:red' })).toBeUndefined()
    expect(styleWallpaperImage({ ...LIGHT, '--dsw-alias-bg-base': `#fff${'0'.repeat(300)}` })).toBeUndefined()
    expect(styleWallpaperImage({ ...LIGHT, '--dsw-alias-bg-base': 'url(https://x.example/a.png)' })).toBeUndefined()
    expect(styleWallpaperImage(LIGHT, 'grid' as unknown as StyleWallpaperVariant)).toBeUndefined()
  })

  it('generates for every shipped livery/mode token map', () => {
    let checked = 0
    for (const profile of Object.values(CATALOG_PROFILES)) {
      for (const livery of profile.liveries) {
        for (const mode of ['light', 'dark'] as const) {
          expect(styleWallpaperImage(livery[mode].tokens), `${livery.id}:${mode}`).toBeDefined()
          checked += 1
        }
      }
    }
    expect(checked).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Contrast audit: composite every recipe stop over its base and require the
// normal label token to stay >= 4.5:1 on all generated catalogs.
// ---------------------------------------------------------------------------

type Rgb = readonly [number, number, number]

function parseHex(value: unknown): Rgb | undefined {
  if (typeof value !== 'string') return undefined
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (match === null) return undefined
  const numeric = Number.parseInt(match[1] as string, 16)
  return [(numeric >> 16) & 0xff, (numeric >> 8) & 0xff, numeric & 0xff]
}

function composite(foreground: Rgb, alpha: number, background: Rgb): Rgb {
  return foreground.map((channel, index) => channel * alpha + (background[index] as number) * (1 - alpha)) as unknown as Rgb
}

function relativeLuminance(color: Rgb): number {
  const channel = (value: number): number => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2])
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const one = relativeLuminance(a)
  const two = relativeLuminance(b)
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05)
}

/** Parse a `120% 140%`-style radial size declaration. */
function radialRadii(size: string): readonly [number, number] {
  const match = /^(\d+)% (\d+)%$/.exec(size)
  if (match === null) throw new Error(`bad radial size ${size}`)
  return [Number(match[1]) / 100, Number(match[2]) / 100]
}

/** Parse an `88% 18%` anchor declaration into 0..1 coordinates. */
function radialAnchor(at: string): readonly [number, number] {
  const match = /^(\d+)% (\d+)%$/.exec(at)
  if (match === null) throw new Error(`bad radial anchor ${at}`)
  return [Number(match[1]) / 100, Number(match[2]) / 100]
}

/** Alpha at one point of a radial stop (`mix%` at 0 fading to 0 at `stop`). */
function radialAlpha(fraction: number, stop: number, mix: number): number {
  if (fraction >= stop) return 0
  return (mix / 100) * (1 - Math.max(0, fraction) / stop)
}

describe('style contrast audit over the generated catalogs', () => {
  it('keeps every recipe stop over its base at label-primary >= 4.5:1', () => {
    const [primaryRx, primaryRy] = radialRadii(STYLE_PRIMARY_RADIAL.size)
    const [primaryX, primaryY] = radialAnchor(STYLE_PRIMARY_RADIAL.at)
    const [layer3Rx, layer3Ry] = radialRadii(STYLE_LAYER3_RADIAL.size)
    const [layer3X, layer3Y] = radialAnchor(STYLE_LAYER3_RADIAL.at)
    const primaryStop = Number(STYLE_PRIMARY_RADIAL.stop.replace('%', '')) / 100
    const layer3Stop = Number(STYLE_LAYER3_RADIAL.stop.replace('%', '')) / 100
    const angle = Number(STYLE_BASE_ANGLE.replace('deg', '')) * (Math.PI / 180)
    const direction = { x: Math.sin(angle), y: -Math.cos(angle) }
    const maxProjection = 0.5 * (Math.abs(direction.x) + Math.abs(direction.y))
    /** Color of the base linear gradient at one viewport point (0..1). */
    const linearAt = (base: Rgb, layer2: Rgb, x: number, y: number): Rgb => {
      const projection = (x - 0.5) * direction.x + (y - 0.5) * direction.y
      const t = Math.max(0, Math.min(1, (projection / maxProjection + 1) / 2))
      return base.map((channel, index) => channel + ((layer2[index] as number) - channel) * t) as unknown as Rgb
    }
    let audited = 0
    for (const profile of Object.values(CATALOG_PROFILES)) {
      for (const livery of profile.liveries) {
        for (const mode of ['light', 'dark'] as const) {
          const tokens = livery[mode].tokens
          const label = parseHex(tokens['--dsw-alias-label-primary'])
          const base = parseHex(tokens['--dsw-alias-bg-base'])
          const layer2 = parseHex(tokens['--dsw-alias-bg-layer-2'])
          const layer3 = parseHex(tokens['--dsw-alias-bg-layer-3'])
          const primary = parseHex(tokens['--dsw-alias-brand-primary'])
          expect(label && base && layer2 && layer3 && primary, `${livery.id}:${mode} hex tokens`).toBeTruthy()
          if (label === undefined || base === undefined || layer2 === undefined || layer3 === undefined || primary === undefined) continue
          const where = `${livery.id}:${mode}`
          // Linear-gradient endpoints.
          expect(contrastRatio(label, base), `${where} base`).toBeGreaterThanOrEqual(4.5)
          expect(contrastRatio(label, layer2), `${where} layer-2`).toBeGreaterThanOrEqual(4.5)
          // Each radial stop composited over the base gradient colour at its anchor.
          const primaryBase = linearAt(base, layer2, primaryX, primaryY)
          const layer3Base = linearAt(base, layer2, layer3X, layer3Y)
          expect(contrastRatio(label, composite(primary, STYLE_PRIMARY_MIX / 100, primaryBase)), `${where} primary stop`).toBeGreaterThanOrEqual(4.5)
          expect(contrastRatio(label, composite(layer3, STYLE_LAYER3_MIX / 100, layer3Base)), `${where} layer-3 stop`).toBeGreaterThanOrEqual(4.5)
          // Conservative: both radials at full strength over the base end.
          expect(contrastRatio(label, composite(primary, STYLE_PRIMARY_MIX / 100, composite(layer3, STYLE_LAYER3_MIX / 100, base))), `${where} stacked`).toBeGreaterThanOrEqual(4.5)
          // Truthful full-composite sweep of the whole recipe over the viewport.
          for (let yIndex = 0; yIndex <= 20; yIndex += 1) {
            for (let xIndex = 0; xIndex <= 20; xIndex += 1) {
              const x = xIndex / 20
              const y = yIndex / 20
              const primaryFraction = Math.hypot((x - primaryX) / primaryRx, (y - primaryY) / primaryRy)
              const layer3Fraction = Math.hypot((x - layer3X) / layer3Rx, (y - layer3Y) / layer3Ry)
              const stacked = composite(
                primary,
                radialAlpha(primaryFraction, primaryStop, STYLE_PRIMARY_MIX),
                composite(layer3, radialAlpha(layer3Fraction, layer3Stop, STYLE_LAYER3_MIX), linearAt(base, layer2, x, y)),
              )
              const ratio = contrastRatio(label, stacked)
              if (ratio < 4.5) {
                throw new Error(`style contrast ${where} at ${x.toFixed(2)},${y.toFixed(2)} is ${ratio.toFixed(2)}:1`)
              }
            }
          }
          audited += 1
        }
      }
    }
    expect(audited).toBeGreaterThanOrEqual(56)
  })
})

describe('style sidecar record', () => {
  it('parses a valid sidecar and rejects every corrupt/foreign shape', () => {
    const valid = { schemaVersion: WALLPAPER_STYLE_SCHEMA_VERSION, variant: 'mesh', revision: 4, sourceId: 'tab-a' }
    expect(parseStoredWallpaperStyle(valid)).toEqual(valid)
    expect(parseStoredWallpaperStyle({ ...valid, schemaVersion: 2 })).toBeUndefined()
    expect(parseStoredWallpaperStyle({ ...valid, variant: 'grid' })).toBeUndefined()
    expect(parseStoredWallpaperStyle({ ...valid, revision: -1 })).toBeUndefined()
    expect(parseStoredWallpaperStyle({ ...valid, revision: '4' })).toBeUndefined()
    expect(parseStoredWallpaperStyle({ ...valid, sourceId: 4 })).toBeUndefined()
    expect(parseStoredWallpaperStyle({ ...valid, sourceId: undefined })).toBeUndefined()
    expect(parseStoredWallpaperStyle(null)).toBeUndefined()
    expect(parseStoredWallpaperStyle([])).toBeUndefined()
    expect(parseStoredWallpaperStyle('x')).toBeUndefined()
  })

  it('serializes the documented sidecar shape', () => {
    expect(serializeStoredWallpaperStyle('mesh', { revision: 5, sourceId: 'tab-a' })).toEqual({
      schemaVersion: 1,
      variant: 'mesh',
      revision: 5,
      sourceId: 'tab-a',
    })
    // A record written without a tab identity compares as the empty source id.
    expect(serializeStoredWallpaperStyle('mesh', { revision: 0 })).toEqual({
      schemaVersion: 1,
      variant: 'mesh',
      revision: 0,
      sourceId: '',
    })
  })

  it('compares identities exactly (undefined source id equals the empty string)', () => {
    expect(sameWallpaperStateIdentity({ revision: 2 }, { revision: 2 })).toBe(true)
    expect(sameWallpaperStateIdentity({ revision: 2 }, { revision: 2, sourceId: '' })).toBe(true)
    expect(sameWallpaperStateIdentity({ revision: 2, sourceId: 'a' }, { revision: 2, sourceId: 'a' })).toBe(true)
    expect(sameWallpaperStateIdentity({ revision: 2, sourceId: 'a' }, { revision: 3, sourceId: 'a' })).toBe(false)
    expect(sameWallpaperStateIdentity({ revision: 2, sourceId: 'a' }, { revision: 2, sourceId: 'b' })).toBe(false)
    expect(wallpaperStateIdentityOf(3.9, 'tab')).toEqual({ revision: 3, sourceId: 'tab' })
  })

  it('reads style only under the exact identity', () => {
    const storage = new MemoryStorage()
    const identity = { revision: 5, sourceId: 'tab-a' }
    expect(readStoredWallpaperStyle(storage, identity)).toBeUndefined()
    storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, JSON.stringify(serializeStoredWallpaperStyle('mesh', identity)))
    expect(readStoredWallpaperStyle(storage, identity)).toBe('mesh')
    expect(readStoredWallpaperStyle(storage, { revision: 4, sourceId: 'tab-a' })).toBeUndefined()
    expect(readStoredWallpaperStyle(storage, { revision: 5, sourceId: 'tab-b' })).toBeUndefined()
    expect(readStoredWallpaperStyle(undefined, identity)).toBeUndefined()
    storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, '{broken')
    expect(readStoredWallpaperStyle(storage, identity)).toBeUndefined()
  })

  it('writes only while the current main record still has the writer identity', () => {
    const storage = new MemoryStorage()
    writeStoredWallpaperStyle(storage, { variant: 'mesh', identity: { revision: 3, sourceId: 'writer' } })
    // No main record yet: the write guard refuses.
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).toBeNull()

    storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({
      ...serializeWallpaperState(undefined, DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, 3),
      sourceId: 'writer',
    }))
    expect(writeStoredWallpaperStyle(storage, { variant: 'mesh', identity: { revision: 3, sourceId: 'writer' } })).toBe(true)
    expect(storedStyle(storage)).toMatchObject({ revision: 3, sourceId: 'writer' })

    // A newer tab won in the meantime: skip the write and keep its sidecar.
    storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({
      ...serializeWallpaperState(undefined, DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, 4),
      sourceId: 'winner',
    }))
    storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, variant: 'mesh', revision: 4, sourceId: 'winner' }))
    expect(writeStoredWallpaperStyle(storage, { variant: 'mesh', identity: { revision: 3, sourceId: 'writer' } })).toBe(false)
    expect(storedStyle(storage)).toMatchObject({ revision: 4, sourceId: 'winner' })
  })

  it('reports a sidecar write failure instead of throwing', () => {
    const storage = new MemoryStorage()
    storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({
      ...serializeWallpaperState(undefined, DEFAULT_WALLPAPER_EFFECTS, DEFAULT_WALLPAPER_POSITION, 1),
      sourceId: 'writer',
    }))
    storage.failSetKeys.add(WALLPAPER_STYLE_STORAGE_KEY)
    expect(writeStoredWallpaperStyle(storage, { variant: 'mesh', identity: { revision: 1, sourceId: 'writer' } })).toBe(false)
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).toBeNull()
  })

  it('removes the sidecar best effort', () => {
    const storage = new MemoryStorage()
    storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, 'x')
    removeStoredWallpaperStyle(storage)
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).toBeNull()
    storage.failRemoveKeys.add(WALLPAPER_STYLE_STORAGE_KEY)
    expect(() => removeStoredWallpaperStyle(storage)).not.toThrow()
    removeStoredWallpaperStyle(undefined)
  })
})

describe('style CSS builder', () => {
  const input = {
    selection: styleSelection,
    effects: { ...DEFAULT_WALLPAPER_EFFECTS, blur: 6, atmosphere: 55 },
    tokens: { light: LIGHT, dark: DARK, frost: 35 },
  }

  it('emits per-mode images for the body layer and the atmosphere layer', () => {
    const css = buildWallpaperCss(input)
    const lightImage = styleWallpaperImage(LIGHT)
    const darkImage = styleWallpaperImage(DARK)
    expect(lightImage).toBeDefined()
    expect(darkImage).toBeDefined()
    expect(css).toContain(`background-image:${lightImage}`)
    expect(css).toContain(`body[data-dsh-wallpaper][data-ds-dark-theme]::before{background-image:${darkImage}}`)
    expect(css).toContain(`body[data-ds-dark-theme] .dsh-livery-wallpaper-overlay{background-image:${darkImage}}`)
    // Fixed recipe: always centered, never repositioned.
    expect(css.match(/background-position:center/g)).toHaveLength(2)
    expect(css).not.toMatch(/url\(|https?:/)
    // Existing decorative boundaries still apply.
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('@media (prefers-reduced-transparency: reduce)')
    expect(css).not.toContain('!important')
  })

  it('omits the atmosphere rule when atmosphere is 0', () => {
    const css = buildWallpaperCss({ ...input, effects: { ...input.effects, atmosphere: 0 } })
    expect(css).not.toContain('.dsh-livery-wallpaper-overlay')
    expect(css).toContain('body[data-dsh-wallpaper][data-ds-dark-theme]::before')
  })

  it('paints nothing without a token context', () => {
    expect(buildWallpaperCss({ selection: styleSelection, effects: DEFAULT_WALLPAPER_EFFECTS })).toBe('')
    expect(buildWallpaperCss({ selection: styleSelection, effects: DEFAULT_WALLPAPER_EFFECTS, tokens: { light: {}, dark: {}, frost: 35 } })).toBe('')
  })
})

describe('style controller persistence', () => {
  it('persists style as a main tombstone plus an identity-matched sidecar (never in the main record)', () => {
    const storage = new MemoryStorage()
    const { controller, doc, images, objectUrls } = harness({ storage })
    controller.setSelection(styleSelection)
    expect(controller.getSnapshot().selection).toEqual(styleSelection)
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('radial-gradient(120% 140% at 12% 0%')
    expect(controller.flushState()).toBe(true)

    const main = storedMain(storage)
    expect(main).toMatchObject({
      schemaVersion: 2,
      selection: { kind: 'none' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      position: DEFAULT_WALLPAPER_POSITION,
      sourceId: 'tab-a',
    })
    // 0.2.1-readable bytes: no style kind/variant anywhere in the main record.
    expect(JSON.stringify(main)).not.toContain('style')
    expect(JSON.stringify(main)).not.toContain('mesh')
    expect(parseWallpaperState(main)?.selection).toBeUndefined()
    expect(storedStyle(storage)).toEqual({
      schemaVersion: 1,
      variant: 'mesh',
      revision: main.revision,
      sourceId: 'tab-a',
    })
    // No blob/IndexedDB row and no object URL is created for a style layer.
    expect(images.put).not.toHaveBeenCalled()
    expect(objectUrls.create).not.toHaveBeenCalled()
    expect(controller.getRenderImage('light')).toBe(styleWallpaperImage(LIGHT))
    expect(controller.getRenderImage('dark')).toBe(styleWallpaperImage(DARK))
    controller.dispose()
  })

  it('leaves the non-style render image unchanged across modes', () => {
    const { controller } = harness()
    controller.setSelection({ kind: 'builtin', id: 'mist' })
    expect(controller.getRenderImage('light')).toBeTruthy()
    expect(controller.getRenderImage('dark')).toBe(controller.getRenderImage('light'))
    expect(controller.getRenderImage()).toBe(controller.getRenderImage('light'))
    controller.dispose()
  })

  it('refreshes the sidecar identity on every persist while style is active', () => {
    const storage = new MemoryStorage()
    const { controller } = harness({ storage })
    controller.setSelection(styleSelection)
    expect(controller.flushState()).toBe(true)
    const first = storedMain(storage)

    controller.setEffects({ blur: 3 })
    expect(controller.flushState()).toBe(true)
    const second = storedMain(storage)
    expect(second.revision).toBe((first.revision as number) + 1)
    expect(storedStyle(storage)).toMatchObject({ revision: second.revision, variant: 'mesh', sourceId: 'tab-a' })

    controller.setPosition({ x: 0, y: 100 })
    expect(controller.flushState()).toBe(true)
    const third = storedMain(storage)
    expect(third.revision).toBe((second.revision as number) + 1)
    expect(storedStyle(storage)).toMatchObject({ revision: third.revision })

    // A reload recovers the style with the latest effects/position.
    const reloaded = harness({ storage, sourceId: 'tab-b' })
    expect(reloaded.controller.getSnapshot()).toMatchObject({
      selection: styleSelection,
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, blur: 3 },
      position: { x: 0, y: 100 },
      revision: third.revision,
    })
    reloaded.controller.dispose()
    controller.dispose()
  })

  it('persists and hydrates style for a controller without an injected tab identity', () => {
    const storage = new MemoryStorage()
    const doc = new FakeDocument()
    const controller = createWallpaperController({ storage, document: doc as never })
    controller.setTokens(LIGHT, DARK)
    controller.start()
    controller.setSelection(styleSelection)
    expect(controller.flushState()).toBe(true)
    // 0.2.1-shaped main bytes: no sourceId, no style bytes; sidecar sourceId ''.
    const main = storedMain(storage)
    expect(main.sourceId).toBeUndefined()
    expect(JSON.stringify(main)).not.toContain('mesh')
    expect(storedStyle(storage)).toEqual({ schemaVersion: 1, variant: 'mesh', revision: main.revision, sourceId: '' })

    const reloadDoc = new FakeDocument()
    const reloaded = createWallpaperController({ storage, document: reloadDoc as never })
    reloaded.setTokens(LIGHT, DARK)
    reloaded.start()
    expect(reloaded.getSnapshot().selection).toEqual(styleSelection)
    expect(reloadDoc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('radial-gradient(120% 140% at 12% 0%')
    reloaded.dispose()
    controller.dispose()
  })

  it('rejects entering style without tokens/catalog and paints nothing on no-token hydration', () => {
    const storage = new MemoryStorage()
    const noTokens = harness({ storage, tokens: false })
    noTokens.controller.setSelection(styleSelection)
    expect(noTokens.controller.getSnapshot().selection).toBeUndefined()
    expect(storage.getItem(WALLPAPER_STORAGE_KEY)).toBeNull()
    expect(noTokens.controller.getRenderImage('light')).toBeUndefined()
    noTokens.controller.dispose()

    // A persisted style without tokens hydrates as "no wallpaper" (no layer),
    // and starts painting once the catalog tokens arrive.
    seedStyle(storage, 2, 'tab-a')
    const hydrating = harness({ storage, tokens: false, sourceId: 'tab-a' })
    expect(hydrating.controller.getSnapshot().selection).toEqual(styleSelection)
    expect(hydrating.doc.getElementById(WALLPAPER_STYLE_ID)).toBeNull()
    expect(hydrating.doc.body.getAttribute('data-dsh-wallpaper')).toBeNull()
    hydrating.controller.setTokens(LIGHT, DARK)
    expect(hydrating.doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('radial-gradient(120% 140% at 12% 0%')
    hydrating.controller.dispose()
  })

  it('removes the sidecar when switching to an image and leaves a clear tombstone durable', () => {
    const storage = new MemoryStorage()
    const { controller, doc } = harness({ storage })
    controller.setSelection(styleSelection)
    expect(controller.flushState()).toBe(true)
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).not.toBeNull()

    controller.setSelection({ kind: 'builtin', id: 'aurora' })
    expect(controller.flushState()).toBe(true)
    expect(storedMain(storage).selection).toEqual({ kind: 'builtin', id: 'aurora' })
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).toBeNull()
    expect(doc.getElementById(WALLPAPER_STYLE_ID)?.textContent).toContain('background-image')

    controller.clear()
    expect(controller.flushState()).toBe(true)
    expect(storedMain(storage).selection).toEqual({ kind: 'none' })
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).toBeNull()
    controller.dispose()
  })

  it('leaves no half-style when the sidecar write fails', () => {
    const storage = new MemoryStorage()
    storage.failSetKeys.add(WALLPAPER_STYLE_STORAGE_KEY)
    const { controller } = harness({ storage })
    controller.setSelection(styleSelection)
    expect(controller.flushState()).toBe(false)
    // Main tombstone exists, sidecar does not: a reload shows "no wallpaper".
    expect(storedMain(storage)).toMatchObject({ selection: { kind: 'none' } })
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).toBeNull()
    const reloaded = harness({ storage, sourceId: 'tab-b' })
    expect(reloaded.controller.getSnapshot().selection).toBeUndefined()
    reloaded.controller.dispose()
    controller.dispose()
  })

  it('writes no sidecar when the main tombstone write fails', () => {
    const storage = new MemoryStorage()
    storage.failSetKeys.add(WALLPAPER_STORAGE_KEY)
    const { controller } = harness({ storage })
    controller.setSelection(styleSelection)
    expect(controller.flushState()).toBe(false)
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).toBeNull()
    controller.dispose()
  })

  it('writes the clear tombstone first and leaves a stale sidecar harmless when removal fails', () => {
    const storage = new MemoryStorage()
    seedStyle(storage, 7, 'tab-a')
    const { controller } = harness({ storage, sourceId: 'tab-a' })
    expect(controller.getSnapshot().selection).toEqual(styleSelection)
    storage.failRemoveKeys.add(WALLPAPER_STYLE_STORAGE_KEY)
    controller.clear()
    // The tombstone is committed; the sidecar removal failed, so the save is
    // reported as not durable, but hydration still ignores the stale identity.
    expect(controller.flushState()).toBe(false)
    const cleared = storedMain(storage)
    expect(cleared).toMatchObject({ selection: { kind: 'none' } })
    expect(cleared.revision).toBe(8)
    expect(storedStyle(storage)).toMatchObject({ revision: 7 })
    const reloaded = harness({ storage, sourceId: 'tab-b' })
    expect(reloaded.controller.getSnapshot().selection).toBeUndefined()
    reloaded.controller.dispose()
    controller.dispose()
  })

  it('keeps the previous style when the clear tombstone write fails', () => {
    const storage = new MemoryStorage()
    seedStyle(storage, 4, 'tab-a')
    const { controller } = harness({ storage, sourceId: 'tab-a' })
    storage.failSetKeys.add(WALLPAPER_STORAGE_KEY)
    controller.clear()
    expect(controller.flushState()).toBe(false)
    // Nothing committed: the old matching main+sidecar pair is still the
    // recoverable state.
    expect(storedStyle(storage)).toMatchObject({ revision: 4 })
    const reloaded = harness({ storage, sourceId: 'tab-b' })
    expect(reloaded.controller.getSnapshot().selection).toEqual(styleSelection)
    reloaded.controller.dispose()
    controller.dispose()
  })

  it('does not let a behind tab clobber a newer main record or delete the winner sidecar', () => {
    const storage = new MemoryStorage()
    seedStyle(storage, 9, 'tab-a')
    const { controller } = harness({ storage, sourceId: 'tab-a' })
    // A newer tab wins at revision 10 with the higher source id.
    storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      revision: 10,
      selection: { kind: 'none' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      position: DEFAULT_WALLPAPER_POSITION,
      sourceId: 'tab-z',
    }))
    storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1, variant: 'mesh', revision: 10, sourceId: 'tab-z',
    }))
    controller.setSelection({ kind: 'builtin', id: 'mist' })
    expect(controller.flushState()).toBe(false)
    expect(storedMain(storage)).toMatchObject({ revision: 10, sourceId: 'tab-z', selection: { kind: 'none' } })
    expect(storedStyle(storage)).toMatchObject({ revision: 10, sourceId: 'tab-z' })
    controller.dispose()
  })

  it('keeps the previous recoverable style when the image main write fails', () => {
    const storage = new MemoryStorage()
    seedStyle(storage, 3, 'tab-a')
    const { controller } = harness({ storage, sourceId: 'tab-a' })
    storage.failSetKeys.add(WALLPAPER_STORAGE_KEY)
    controller.setSelection({ kind: 'builtin', id: 'mist' })
    expect(controller.flushState()).toBe(false)
    // Nothing committed: the old matching identity still hydrates as style.
    const reloaded = harness({ storage, sourceId: 'tab-b' })
    expect(reloaded.controller.getSnapshot().selection).toEqual(styleSelection)
    reloaded.controller.dispose()
    controller.dispose()
  })
})

describe('style preset application', () => {
  it('applies a style preset target through the sidecar write path and verifies its snapshot', () => {
    const storage = new MemoryStorage()
    const { controller } = harness({ storage })
    const target = presetWallpaperTarget({
      schemaVersion: 2,
      createdWith: 'dsh-livery/0.2.2',
      styleId: 'fjord',
      wallpaper: { kind: 'style', variant: 'mesh' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, blur: 2 },
      position: { x: 0, y: 0 },
    })
    const next = controller.setState(target, { flush: true })
    expect(matchesPresetWallpaperState(next, target)).toBe(true)
    expect(next.selection).toEqual(styleSelection)
    expect(storedMain(storage).selection).toEqual({ kind: 'none' })
    expect(storedStyle(storage)).toMatchObject({ variant: 'mesh', sourceId: 'tab-a' })
    controller.dispose()
  })
})

describe('style hydration identity rule', () => {
  it('adopts style only when the sidecar identity exactly matches the cleared main record', () => {
    for (const variant of [
      { name: 'matching identity', mainSource: 'tab-a', sidecarSource: 'tab-a', mainRevision: 5, sidecarRevision: 5, expected: true },
      { name: 'revision mismatch', mainSource: 'tab-a', sidecarSource: 'tab-a', mainRevision: 5, sidecarRevision: 4, expected: false },
      { name: 'source mismatch', mainSource: 'tab-a', sidecarSource: 'tab-b', mainRevision: 5, sidecarRevision: 5, expected: false },
    ] as const) {
      const storage = new MemoryStorage()
      storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({
        schemaVersion: 2,
        revision: variant.mainRevision,
        selection: { kind: 'none' },
        effects: DEFAULT_WALLPAPER_EFFECTS,
        position: DEFAULT_WALLPAPER_POSITION,
        sourceId: variant.mainSource,
      }))
      storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, JSON.stringify({
        schemaVersion: 1,
        variant: 'mesh',
        revision: variant.sidecarRevision,
        sourceId: variant.sidecarSource,
      }))
      const { controller } = harness({ storage, sourceId: 'tab-a' })
      expect(controller.getSnapshot().selection, variant.name)
        .toEqual(variant.expected ? styleSelection : undefined)
      controller.dispose()
    }
  })

  it('lets the main record win when it carries a selection or is absent', () => {
    const storage = new MemoryStorage()
    storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      revision: 6,
      selection: { kind: 'builtin', id: 'mist' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      position: DEFAULT_WALLPAPER_POSITION,
      sourceId: 'tab-a',
    }))
    storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, variant: 'mesh', revision: 6, sourceId: 'tab-a' }))
    const withSelection = harness({ storage })
    expect(withSelection.controller.getSnapshot().selection).toEqual({ kind: 'builtin', id: 'mist' })
    withSelection.controller.dispose()

    const empty = new MemoryStorage()
    empty.map.set(WALLPAPER_STYLE_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, variant: 'mesh', revision: 1, sourceId: 'tab-a' }))
    const noMain = harness({ storage: empty })
    expect(noMain.controller.getSnapshot().selection).toBeUndefined()
    noMain.controller.dispose()
  })

  it('ignores a corrupt or unknown-version sidecar', () => {
    for (const sidecar of ['{broken', JSON.stringify({ schemaVersion: 2, variant: 'mesh', revision: 5, sourceId: 'tab-a' })]) {
      const storage = new MemoryStorage()
      seedStyle(storage, 5, 'tab-a')
      storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, sidecar)
      const { controller } = harness({ storage })
      expect(controller.getSnapshot().selection).toBeUndefined()
      controller.dispose()
    }
  })

  it('lets any write produced by a 0.2.1-shaped client invalidate style while the bytes remain', () => {
    const storage = new MemoryStorage()
    const { controller } = harness({ storage })
    controller.setSelection(styleSelection)
    expect(controller.flushState()).toBe(true)
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).not.toBeNull()
    const main = storedMain(storage)

    // 0.2.1 rewrites the main record (e.g. an effects change): same shape, new revision.
    storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({
      ...main,
      revision: (main.revision as number) + 1,
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, blur: 1 },
    }))
    const downgraded = harness({ storage, sourceId: 'tab-b' })
    expect(downgraded.controller.getSnapshot().selection).toBeUndefined()
    expect(downgraded.controller.getSnapshot().effects.blur).toBe(1)
    // The sidecar bytes are data-preserving but stale and ignored.
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).not.toBeNull()
    downgraded.controller.dispose()

    // A 0.2.1 selection rewrite brings the image back and drops style.
    storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({
      ...main,
      revision: (main.revision as number) + 2,
      selection: { kind: 'builtin', id: 'sand' },
    }))
    const imageAgain = harness({ storage, sourceId: 'tab-c' })
    expect(imageAgain.controller.getSnapshot().selection).toEqual({ kind: 'builtin', id: 'sand' })
    imageAgain.controller.dispose()
    controller.dispose()
  })

  it('exposes style through getPersistedSelection/getDurableSelection only under the identity rule', () => {
    const storage = new MemoryStorage()
    const { controller } = harness({ storage })
    controller.setSelection(styleSelection)
    expect(controller.flushState()).toBe(true)
    expect(controller.getPersistedSelection()).toEqual(styleSelection)
    expect(controller.getDurableSelection()).toEqual(styleSelection)

    // Another tab (or 0.2.1) moves the main identity on: the durable style is stale.
    const main = storedMain(storage)
    storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({ ...main, revision: (main.revision as number) + 1 }))
    expect(controller.getPersistedSelection()).toBeUndefined()
    expect(controller.getDurableSelection()).toBeUndefined()
    controller.dispose()
  })
})

describe('style cross-tab safety', () => {
  it('does not let a behind tab overwrite the winner sidecar; the winner style still hydrates on reload', () => {
    const storage = new MemoryStorage()
    // The behind tab starts from a matching older style identity.
    storage.map.set(WALLPAPER_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      revision: 5,
      selection: { kind: 'none' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      position: DEFAULT_WALLPAPER_POSITION,
      sourceId: 'behind',
    }))
    storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, variant: 'mesh', revision: 5, sourceId: 'behind' }))
    const winnerMain = JSON.stringify({
      schemaVersion: 2,
      revision: 6,
      selection: { kind: 'none' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS, blur: 1 },
      position: DEFAULT_WALLPAPER_POSITION,
      sourceId: 'winner',
    })
    const winnerStyle = JSON.stringify({ schemaVersion: 1, variant: 'mesh', revision: 6, sourceId: 'winner' })
    let armed = true
    storage.onSet = (key) => {
      if (!armed || key !== WALLPAPER_STORAGE_KEY) return
      // Simulate the winner tab's write landing between our main write and the
      // sidecar refresh.
      armed = false
      storage.map.set(WALLPAPER_STORAGE_KEY, winnerMain)
      storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, winnerStyle)
    }
    const { controller } = harness({ storage, sourceId: 'behind' })
    expect(controller.getSnapshot().selection).toEqual(styleSelection)
    controller.setEffects({ blur: 3 })
    // The write guard skipped the sidecar refresh.
    expect(controller.flushState()).toBe(false)
    expect(JSON.parse(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY) ?? 'null')).toMatchObject({ revision: 6, sourceId: 'winner' })

    // Reload: the winner's style still hydrates.
    const reloaded = harness({ storage, sourceId: 'tab-b' })
    expect(reloaded.controller.getSnapshot().selection).toEqual(styleSelection)
    expect(reloaded.controller.getSnapshot().revision).toBe(6)
    reloaded.controller.dispose()
    controller.dispose()
  })

  it('adopts style, clear and image records from storage events with the sidecar re-read', () => {
    const storage = new MemoryStorage()
    const eventsA = new FakeEvents()
    const eventsB = new FakeEvents()
    const a = harness({ storage, sourceId: 'tab-a', eventTarget: eventsA })
    const b = harness({ storage, sourceId: 'tab-b', eventTarget: eventsB })

    a.controller.setSelection(styleSelection)
    expect(a.controller.flushState()).toBe(true)
    eventsB.emit(storage.getItem(WALLPAPER_STORAGE_KEY))
    expect(b.controller.getSnapshot().selection).toEqual(styleSelection)

    a.controller.setSelection({ kind: 'builtin', id: 'mist' })
    expect(a.controller.flushState()).toBe(true)
    eventsB.emit(storage.getItem(WALLPAPER_STORAGE_KEY))
    expect(b.controller.getSnapshot().selection).toEqual({ kind: 'builtin', id: 'mist' })

    a.controller.setSelection(styleSelection)
    expect(a.controller.flushState()).toBe(true)
    eventsB.emit(storage.getItem(WALLPAPER_STORAGE_KEY))
    expect(b.controller.getSnapshot().selection).toEqual(styleSelection)

    a.controller.clear()
    expect(a.controller.flushState()).toBe(true)
    eventsB.emit(storage.getItem(WALLPAPER_STORAGE_KEY))
    expect(b.controller.getSnapshot().selection).toBeUndefined()

    a.controller.dispose()
    b.controller.dispose()
  })

  it('resolves a same-revision tie to the deterministic winner and keeps its style', () => {
    const storage = new MemoryStorage()
    const eventsA = new FakeEvents()
    const a = harness({ storage, sourceId: 'tab-a', eventTarget: eventsA })
    a.controller.setSelection(styleSelection)
    expect(a.controller.flushState()).toBe(true)
    const tieMain = JSON.stringify({
      schemaVersion: 2,
      revision: 1,
      selection: { kind: 'none' },
      effects: DEFAULT_WALLPAPER_EFFECTS,
      position: DEFAULT_WALLPAPER_POSITION,
      sourceId: 'tab-z',
    })
    storage.map.set(WALLPAPER_STORAGE_KEY, tieMain)
    storage.map.set(WALLPAPER_STYLE_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, variant: 'mesh', revision: 1, sourceId: 'tab-z' }))
    eventsA.emit(tieMain)
    expect(a.controller.getSnapshot().selection).toEqual(styleSelection)
    expect(a.controller.getSnapshot().revision).toBe(1)
    expect(a.controller.getPersistedSelection()).toEqual(styleSelection)
    a.controller.dispose()
  })
})

describe('style and local-data lifecycle', () => {
  it('keeps both wallpaper-state keys when clearing disposable local data (clear-local-data preserves the current wallpaper)', async () => {
    const storage = new MemoryStorage()
    seedStyle(storage, 9, 'tab-a')
    const mainBefore = storage.getItem(WALLPAPER_STORAGE_KEY)
    const styleBefore = storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)
    const result = await clearAllLocalWallpaperData({
      storage,
      images: new FakeImages(),
      selection: styleSelection,
      getSelection: () => styleSelection,
      getReferencedUploadKeys: () => new Set(),
    })
    expect(result.errors).toEqual([])
    expect(storage.getItem(WALLPAPER_STORAGE_KEY)).toBe(mainBefore)
    expect(storage.getItem(WALLPAPER_STYLE_STORAGE_KEY)).toBe(styleBefore)
    // And a reload still hydrates the style.
    const { controller } = harness({ storage, sourceId: 'tab-b' })
    expect(controller.getSnapshot().selection).toEqual(styleSelection)
    controller.dispose()
  })

  it('ignores style selections in upload refs/GC', () => {
    const storage = new MemoryStorage()
    writeWallpaperRefs(storage as never, 'tab-a', [styleSelection, undefined])
    const refsKey = [...storage.map.keys()].find(key => key.startsWith('dsh-livery.wallpaper.ref.'))
    expect(refsKey).toBeDefined()
    expect(JSON.parse(storage.getItem(refsKey as string) ?? 'null')).toMatchObject({ uploads: [] })
    expect(readReferencedUploadKeys(storage as never)).toEqual(new Set())

    expect(obsoleteUploadKey(styleSelection, styleSelection)).toBeUndefined()
    expect(obsoleteUploadKey({ kind: 'upload', key: 'upload-1-a' }, styleSelection)).toBe('upload-1-a')
    expect(obsoleteUploadKey(styleSelection, { kind: 'upload', key: 'upload-1-a' })).toBeUndefined()
  })
})
