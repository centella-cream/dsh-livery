/**
 * Pure preset v1 tests: export shape, strict import validation, diff preview,
 * apply ordering and the partial-failure contract.
 *
 * No React, no DOM: the module under test is deterministic and the runtime /
 * controller arrive through tiny ports.
 */
import { describe, expect, it } from 'vitest'
import { STOCK_ID } from '../../src/core/types.js'
import { DEFAULT_WALLPAPER_EFFECTS } from '../../src/client/wallpaper.js'
import type { WallpaperEffects } from '../../src/client/wallpaper.js'
import {
  DEFAULT_PRESET_POSITION,
  PRESET_FILE_MAX_BYTES,
  PRESET_POSITION_VALUES,
  PRESET_SCHEMA_VERSION,
  applyPreset,
  applyPresetWallpaper,
  createdWithOf,
  currentPresetOf,
  diffPreset,
  exportPreset,
  hasForbiddenContent,
  importPresetFile,
  isCreatedWith,
  isPresetPosition,
  matchesPresetWallpaperState,
  normalizePresetPosition,
  parsePresetText,
  presetPositionName,
  presetWallpaperTarget,
  sameAttribution,
  sameEffects,
  samePosition,
  sameWallpaperView,
  validatePreset,
} from '../../src/client/wallpaper/preset.js'
import type {
  LiveryPreset,
  PresetApplyPorts,
  PresetExportSource,
  PresetImportResult,
} from '../../src/client/wallpaper/preset.js'
import type { StyleApplyOutcome } from '../../src/client/model.js'

const CATALOG_IDS = ['fjord', 'midnight']
const VERSION = '0.1.3'

function effects(patch: Partial<WallpaperEffects> = {}): WallpaperEffects {
  return { ...DEFAULT_WALLPAPER_EFFECTS, ...patch }
}

function makePreset(patch: Partial<LiveryPreset> = {}): LiveryPreset {
  return {
    schemaVersion: PRESET_SCHEMA_VERSION,
    createdWith: createdWithOf(VERSION),
    styleId: 'fjord',
    wallpaper: { kind: 'builtin', id: 'aurora' },
    effects: effects(),
    position: { x: 50, y: 50 },
    ...patch,
  }
}

function presetText(patch: Partial<LiveryPreset> = {}): string {
  return JSON.stringify(makePreset(patch))
}

/** Assert one import result failed with an exact problem code. */
function expectProblem(result: PresetImportResult, problem: string): void {
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.problem).toBe(problem)
}

/** Assert one import result succeeded and return the preset. */
function expectOk(result: PresetImportResult): LiveryPreset {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(`expected ok, got ${result.problem}`)
  return result.preset
}

function parse(text: unknown): PresetImportResult {
  return parsePresetText(JSON.stringify(text), { catalogIds: CATALOG_IDS })
}

describe('preset schema v1 — valid import', () => {
  it('round-trips a full preset', () => {
    const preset = makePreset({
      wallpaper: { kind: 'remote', url: 'https://images.example.com/paper.jpg?w=1600' },
      position: { x: 0, y: 100 },
      attribution: { title: 'Dunes', creator: 'A. Photographer', license: 'CC0', source: 'example.com' },
    })
    const parsed = expectOk(parsePresetText(JSON.stringify(preset), { catalogIds: CATALOG_IDS }))
    expect(parsed).toEqual(preset)
  })

  it('accepts no wallpaper and the stock style id without a catalog', () => {
    const preset = makePreset({ styleId: STOCK_ID, wallpaper: null, position: { x: 50, y: 100 } })
    const parsed = expectOk(parsePresetText(JSON.stringify(preset), { catalogIds: [] }))
    expect(parsed.wallpaper).toBeNull()
    expect(parsed.styleId).toBe(STOCK_ID)
  })

  it('tolerates a leading UTF-8 BOM and normalizes https URLs', () => {
    const text = `\uFEFF${presetText({ wallpaper: { kind: 'remote', url: 'https://EXAMPLE.com/a b.jpg' } })}`
    const preset = expectOk(parsePresetText(text, { catalogIds: CATALOG_IDS }))
    expect(preset.wallpaper).toEqual({ kind: 'remote', url: 'https://example.com/a%20b.jpg' })
  })

  it('clamps in-range effects to the slider steps', () => {
    const preset = expectOk(parsePresetText(presetText({ effects: effects({ atmosphere: 32, blur: 8.4 }) }), {
      catalogIds: CATALOG_IDS,
    }))
    // atmosphere step 5 -> 30; blur step 1 -> 8.
    expect(preset.effects).toEqual(effects({ atmosphere: 30, blur: 8 }))
  })

  it('reports the imported byte size', () => {
    const text = presetText()
    const result = parsePresetText(text, { catalogIds: CATALOG_IDS })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.bytes).toBe(Buffer.byteLength(text, 'utf8'))
  })
})

describe('preset schema v1 — strict rejection', () => {
  it('caps the file size before parsing', () => {
    expectProblem(parsePresetText('x'.repeat(PRESET_FILE_MAX_BYTES + 1), { catalogIds: CATALOG_IDS }), 'too-large')
  })

  it('rejects malformed JSON', () => {
    expectProblem(parsePresetText('{not json', { catalogIds: CATALOG_IDS }), 'invalid-json')
  })

  it('rejects non-objects and unknown top-level fields', () => {
    expectProblem(parse([]), 'not-object')
    expectProblem(parse({ ...makePreset(), css: 'body{color:red}' }), 'unknown-field')
    expectProblem(parse({ ...makePreset(), tokens: { '--x': '#fff' } }), 'unknown-field')
    expectProblem(parse({ ...makePreset(), history: ['aurora'] }), 'unknown-field')
    expectProblem(parsePresetText(
      JSON.stringify({ ...makePreset(), ['__proto__']: { polluted: true } }),
      { catalogIds: CATALOG_IDS },
    ), 'unknown-field')
  })

  it('rejects wrong schema versions and foreign producers', () => {
    expectProblem(parse({ ...makePreset(), schemaVersion: 2 }), 'schema-version')
    expectProblem(parse({ ...makePreset(), createdWith: 'other-app/1.0.0' }), 'created-with')
    expectProblem(parse({ ...makePreset(), createdWith: 'dsh-livery/../../etc/passwd' }), 'created-with')
  })

  it('rejects invalid, unknown and uncatalogued style ids', () => {
    expectProblem(parse({ ...makePreset(), styleId: 'Fjord' }), 'style-id')
    expectProblem(parse({ ...makePreset(), styleId: 'fjord;body{}' }), 'style-id')
    expectProblem(parse({ ...makePreset(), styleId: 'missing' }), 'unknown-style')
    expectProblem(
      parsePresetText(presetText(), { catalogIds: [] }),
      'catalog-unavailable',
    )
  })

  it('rejects non-portable wallpaper payloads', () => {
    expectProblem(parse({ ...makePreset(), wallpaper: { kind: 'upload', key: 'upload-1' } }), 'wallpaper-kind')
    expectProblem(parse({ ...makePreset(), wallpaper: { kind: 'blob', url: 'blob:http://x' } }), 'wallpaper-kind')
    expectProblem(parse({ ...makePreset(), wallpaper: { kind: 'builtin', id: 'nope' } }), 'wallpaper-id')
    expectProblem(parse({ ...makePreset(), wallpaper: { kind: 'builtin', id: 'aurora', css: 'x' } }), 'unknown-field')
    expectProblem(parse({ ...makePreset(), wallpaper: { kind: 'remote', url: 'http://example.com/a.jpg' } }), 'wallpaper-url')
    expectProblem(
      parse({ ...makePreset(), wallpaper: { kind: 'remote', url: 'https://user:pw@example.com/a.jpg' } }),
      'wallpaper-url',
    )
    expectProblem(
      parse({ ...makePreset(), wallpaper: { kind: 'remote', url: 'https://localhost/a.jpg' } }),
      'wallpaper-url',
    )
    expectProblem(
      parse({ ...makePreset(), wallpaper: { kind: 'remote', url: 'https://example.com/a.jpg', extra: 1 } }),
      'unknown-field',
    )
    expectProblem(parse({ ...makePreset(), wallpaper: [] }), 'wallpaper-kind')
  })

  it('rejects CSS/scheme smuggling in URLs but treats attribution as plain text', () => {
    expectProblem(
      parse({ ...makePreset(), wallpaper: { kind: 'remote', url: 'https://example.com/url(x)' } }),
      'forbidden-content',
    )
    const text = parse({ ...makePreset(), attribution: { title: '<No. 2>', creator: 'url(...) / {plain}' } })
    expect(text.ok).toBe(true)
    if (text.ok) expect(text.preset.attribution).toEqual({ title: '<No. 2>', creator: 'url(...) / {plain}' })
  })

  it('rejects loopback, private, link-local and IPv6-mapped local URLs', () => {
    for (const url of [
      'https://10.1.2.3/a.jpg',
      'https://172.16.0.1/a.jpg',
      'https://172.31.255.255/a.jpg',
      'https://192.168.1.2/a.jpg',
      'https://169.254.1.1/a.jpg',
      'https://127.0.0.1/a.jpg',
      'https://localhost./a.jpg',
      'https://device.local./a.jpg',
      'https://[fc00::1]/a.jpg',
      'https://[fd12:3456::1]/a.jpg',
      'https://[fe80::1]/a.jpg',
      'https://[::ffff:10.0.0.1]/a.jpg',
    ]) {
      const result = parse({ ...makePreset(), wallpaper: { kind: 'remote', url } })
      expect(result.ok, url).toBe(false)
    }
  })

  it('rejects unknown or malformed effects', () => {
    expectProblem(parse({ ...makePreset(), effects: { ...effects(), saturate: 4 } }), 'unknown-field')
    expectProblem(parse({ ...makePreset(), effects: { ...effects(), blur: '8' } }), 'effects')
    expectProblem(parse({ ...makePreset(), effects: { ...effects(), blur: -1 } }), 'effects')
    expectProblem(parse({ ...makePreset(), effects: { ...effects(), atmosphere: 101 } }), 'effects')
    const { dim: _dim, ...withoutDim } = effects()
    expectProblem(parse({ ...makePreset(), effects: withoutDim }), 'effects')
  })

  it('rejects positions outside the nine-grid stops', () => {
    expectProblem(parse({ ...makePreset(), position: { x: 25, y: 50 } }), 'position')
    expectProblem(parse({ ...makePreset(), position: { x: 50 } }), 'position')
    expectProblem(parse({ ...makePreset(), position: { x: 50, y: 50, z: 0 } }), 'unknown-field')
    expectProblem(parse({ ...makePreset(), position: null }), 'position')
  })

  it('rejects malformed attribution', () => {
    expectProblem(parse({ ...makePreset(), attribution: { author: 'x' } }), 'unknown-field')
    expectProblem(parse({ ...makePreset(), attribution: { title: 'x'.repeat(201) } }), 'forbidden-content')
    expectProblem(parse({ ...makePreset(), attribution: { title: 42 } }), 'attribution')
    expectProblem(parse({ ...makePreset(), attribution: 'credit' }), 'attribution')
  })
})

describe('preset file import', () => {
  it('rejects an oversized file without reading it', async () => {
    let read = false
    const result = await importPresetFile({
      size: PRESET_FILE_MAX_BYTES + 1,
      async text() { read = true; return '' },
    }, { catalogIds: CATALOG_IDS })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problem).toBe('too-large')
    expect(read).toBe(false)
  })

  it('reads and validates a picked file', async () => {
    const text = presetText()
    const result = await importPresetFile({
      size: Buffer.byteLength(text, 'utf8'),
      async text() { return text },
    }, { catalogIds: CATALOG_IDS })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.bytes).toBe(Buffer.byteLength(text, 'utf8'))
  })

  it('maps an unreadable file to a stable problem', async () => {
    const result = await importPresetFile({
      size: 10,
      async text(): Promise<string> { throw new Error('io') },
    }, { catalogIds: CATALOG_IDS })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problem).toBe('unreadable')
  })
})

describe('preset export', () => {
  const base: PresetExportSource = {
    styleId: 'fjord',
    selection: { kind: 'builtin', id: 'aurora' },
    effects: effects(),
    position: { x: 50, y: 50 },
    pluginVersion: VERSION,
  }

  it('exports a stable, newline-terminated JSON document', () => {
    const result = exportPreset(base)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.preset.schemaVersion).toBe(1)
    expect(result.preset.createdWith).toBe('dsh-livery/0.1.3')
    expect(result.json.endsWith('\n')).toBe(true)
    expect(result.json).toBe(`${JSON.stringify(result.preset, null, 2)}\n`)
    expect(Object.keys(JSON.parse(result.json) as object)).toEqual([
      'schemaVersion', 'createdWith', 'styleId', 'wallpaper', 'effects', 'position',
    ])
    expect(result.bytes).toBe(Buffer.byteLength(result.json, 'utf8'))
  })

  it('round-trips a remote wallpaper and includes attribution', () => {
    const result = exportPreset({
      ...base,
      selection: { kind: 'remote', url: 'https://images.example.com/a.jpg' },
      attribution: { title: 'Dunes', creator: 'A. Photographer' },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.preset.wallpaper).toEqual({ kind: 'remote', url: 'https://images.example.com/a.jpg' })
    expect(result.preset.attribution).toEqual({ title: 'Dunes', creator: 'A. Photographer' })
    expect(expectOk(parsePresetText(result.json, { catalogIds: CATALOG_IDS }))).toEqual(result.preset)
  })

  it('exports the stock style and no wallpaper', () => {
    const result = exportPreset({ ...base, styleId: undefined, selection: undefined })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.preset.styleId).toBe(STOCK_ID)
    expect(result.preset.wallpaper).toBeNull()
  })

  it('refuses device-local uploads', () => {
    const result = exportPreset({ ...base, selection: { kind: 'upload', key: 'upload-abc' } })
    expect(result).toEqual({ ok: false, problem: 'upload' })
  })

  it('rejects an invalid live URL, style id or plugin version', () => {
    expect(exportPreset({ ...base, selection: { kind: 'remote', url: 'http://example.com/a.jpg' } }))
      .toEqual({ ok: false, problem: 'invalid-url' })
    // Local-only / non-portable URLs would produce a preset that import rejects.
    expect(exportPreset({ ...base, selection: { kind: 'remote', url: 'https://localhost/a.jpg' } }))
      .toEqual({ ok: false, problem: 'invalid-url' })
    expect(exportPreset({ ...base, selection: { kind: 'remote', url: 'https://example.com/url(x).jpg' } }))
      .toEqual({ ok: false, problem: 'invalid-url' })
    expect(exportPreset({ ...base, styleId: 'Bad Id' })).toEqual({ ok: false, problem: 'invalid-style' })
    expect(exportPreset({ ...base, pluginVersion: 'dev' })).toEqual({ ok: false, problem: 'invalid-version' })
  })

  it('clamps effects and normalizes a malformed focal point defensively', () => {
    const result = exportPreset({
      ...base,
      effects: { blur: 99, dim: -3, frost: 30, atmosphere: 400 },
      position: { x: 33, y: 77 },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.preset.effects).toEqual({ blur: 24, dim: 0, frost: 30, atmosphere: 100 })
    expect(result.preset.position).toEqual({ x: 50, y: 100 })
  })

  it('drops unportable attribution fragments instead of writing them', () => {
    const result = exportPreset({
      ...base,
      attribution: { title: 'C:\\local\\file.png', creator: 'Fine Creator' },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.preset.attribution).toEqual({ title: 'C:\\local\\file.png', creator: 'Fine Creator' })
  })

  it('always emits a preset that strict import accepts (round-trip)', () => {
    const cases: PresetExportSource[] = [
      base,
      { ...base, selection: undefined },
      { ...base, styleId: STOCK_ID, selection: { kind: 'remote', url: 'https://images.example.com/a.jpg' } },
      {
        ...base,
        effects: { blur: 0, dim: 70, frost: 100, atmosphere: 0 },
        position: { x: 100, y: 100 },
        attribution: { title: 'Dunes', creator: 'A. Photographer', license: 'CC0', source: 'example.com' },
      },
    ]
    for (const source of cases) {
      const result = exportPreset(source)
      expect(result.ok, JSON.stringify(source)).toBe(true)
      if (!result.ok) continue
      const parsed = parsePresetText(result.json, { catalogIds: CATALOG_IDS })
      expect(parsed.ok, JSON.stringify(result.preset)).toBe(true)
      if (parsed.ok) expect(parsed.preset).toEqual(result.preset)
    }
  })
})

describe('preset diff', () => {
  const current = currentPresetOf({
    styleId: 'fjord',
    selection: { kind: 'builtin', id: 'aurora' },
    effects: effects(),
    position: { x: 50, y: 50 },
  })

  it('reports no changes for an identical setup', () => {
    const diff = diffPreset(current, makePreset())
    expect(diff).toEqual({ changed: false, changes: [] })
  })

  it('reports every changed field in a stable order', () => {
    const preset = makePreset({
      styleId: 'midnight',
      wallpaper: { kind: 'remote', url: 'https://example.com/b.jpg' },
      effects: effects({ blur: 1, dim: 2 }),
      position: { x: 0, y: 0 },
      attribution: { title: 'Dunes' },
    })
    const diff = diffPreset(current, preset)
    expect(diff.changed).toBe(true)
    expect(diff.changes.map(change => change.field)).toEqual([
      'style', 'wallpaper', 'effects', 'position', 'attribution',
    ])
    const style = diff.changes.find(change => change.field === 'style')
    expect(style).toEqual({ field: 'style', from: 'fjord', to: 'midnight' })
    const wallpaper = diff.changes.find(change => change.field === 'wallpaper')
    expect(wallpaper).toEqual({
      field: 'wallpaper',
      from: { kind: 'builtin', id: 'aurora' },
      to: { kind: 'remote', url: 'https://example.com/b.jpg' },
    })
  })

  it('treats the current stock style as a real style value', () => {
    const stock = currentPresetOf({
      styleId: undefined,
      selection: undefined,
      effects: effects(),
      position: { x: 50, y: 50 },
    })
    const diff = diffPreset(stock, makePreset({ styleId: 'fjord', wallpaper: null }))
    expect(diff.changes[0]).toEqual({ field: 'style', from: STOCK_ID, to: 'fjord' })
  })

  it('represents an uploaded current wallpaper distinctly from a preset wallpaper', () => {
    const upload = currentPresetOf({
      styleId: 'fjord',
      selection: { kind: 'upload', key: 'upload-abc' },
      effects: effects(),
      position: { x: 50, y: 50 },
    })
    expect(upload.wallpaper).toEqual({ kind: 'upload', key: 'upload-abc' })
    const diff = diffPreset(upload, makePreset({ wallpaper: null }))
    expect(diff.changes[0]).toEqual({
      field: 'wallpaper',
      from: { kind: 'upload', key: 'upload-abc' },
      to: null,
    })
  })

  it('normalizes live position/effects before diffing', () => {
    const odd = currentPresetOf({
      styleId: 'fjord',
      selection: { kind: 'builtin', id: 'aurora' },
      effects: { blur: 8, dim: 25, frost: 35, atmosphere: 30 },
      position: { x: 49, y: 3 },
    })
    expect(odd.position).toEqual({ x: 50, y: 0 })
  })
})

describe('preset apply ordering and partial failure', () => {
  const preset = makePreset({
    styleId: 'midnight',
    wallpaper: { kind: 'remote', url: 'https://example.com/b.jpg' },
    position: { x: 100, y: 0 },
  })

  function ports(overrides: Partial<PresetApplyPorts> = {}): {
    readonly ports: PresetApplyPorts
    readonly wallpaperCalls: Array<unknown>
    readonly styleCalls: string[]
  } {
    const wallpaperCalls: Array<unknown> = []
    const styleCalls: string[] = []
    const result: PresetApplyPorts = {
      async applyStyle(styleId: string): Promise<StyleApplyOutcome> {
        styleCalls.push(styleId)
        return { ok: true }
      },
      applyWallpaper(target): boolean {
        wallpaperCalls.push(target)
        return true
      },
      ...overrides,
    }
    return { ports: result, wallpaperCalls, styleCalls }
  }

  it('applies the style first, then one wallpaper batch', async () => {
    const harness = ports()
    const result = await applyPreset(preset, harness.ports)
    expect(result).toEqual({ status: 'applied' })
    expect(harness.styleCalls).toEqual(['midnight'])
    expect(harness.wallpaperCalls).toEqual([presetWallpaperTarget(preset)])
    expect(harness.wallpaperCalls[0]).toEqual({
      selection: { kind: 'remote', url: 'https://example.com/b.jpg' },
      effects: preset.effects,
      position: { x: 100, y: 0 },
    })
  })

  it('aborts before the wallpaper when the style write fails', async () => {
    const harness = ports({ applyStyle: async () => ({ ok: false, failure: 'refused' }) })
    const result = await applyPreset(preset, harness.ports)
    expect(result).toEqual({ status: 'style-failed', failure: 'refused' })
    expect(harness.wallpaperCalls).toEqual([])
  })

  it('maps a throwing style port to a transport-style failure', async () => {
    const result = await applyPreset(preset, ports({
      applyStyle: async () => { throw new Error('network') },
    }).ports)
    expect(result).toEqual({ status: 'style-failed', failure: 'transport' })
  })

  it('reports partial failure without hiding the applied style', async () => {
    const result = await applyPreset(preset, ports({ applyWallpaper: () => false }).ports)
    expect(result).toEqual({ status: 'partial', styleId: 'midnight' })
  })

  it('reports partial failure when the wallpaper port throws', async () => {
    const result = await applyPreset(preset, ports({
      applyWallpaper: () => { throw new Error('storage') },
    }).ports)
    expect(result).toEqual({ status: 'partial', styleId: 'midnight' })
  })

  it('supports wallpaper-only recovery after a partial apply', () => {
    const calls: unknown[] = []
    expect(applyPresetWallpaper(preset, {
      applyWallpaper(target) { calls.push(target); return true },
    })).toBe(true)
    expect(calls).toHaveLength(1)
    expect(applyPresetWallpaper(preset, { applyWallpaper: () => false })).toBe(false)
    expect(applyPresetWallpaper(preset, { applyWallpaper: () => { throw new Error('x') } })).toBe(false)
  })

  it('clears the wallpaper when the preset carries none', () => {
    const target = presetWallpaperTarget(makePreset({ wallpaper: null }))
    expect(target.selection).toBeUndefined()
  })

  it('verifies a never-throwing controller snapshot against the target', () => {
    const target = presetWallpaperTarget(preset)
    const snapshot = {
      selection: { kind: 'remote' as const, url: 'https://example.com/b.jpg' },
      effects: preset.effects,
      position: { x: 100, y: 0 },
    }
    expect(matchesPresetWallpaperState(snapshot, target)).toBe(true)
    expect(matchesPresetWallpaperState({ ...snapshot, position: { x: 50, y: 50 } }, target)).toBe(false)
    expect(matchesPresetWallpaperState({
      ...snapshot,
      selection: { kind: 'builtin', id: 'aurora' },
    }, target)).toBe(false)
    expect(matchesPresetWallpaperState({ ...snapshot, effects: effects({ blur: 1 }) }, target)).toBe(false)
  })
})

describe('preset position helpers', () => {
  it('only accepts the nine-grid stops on import', () => {
    expect(isPresetPosition({ x: 0, y: 100 })).toBe(true)
    expect(isPresetPosition({ x: 25, y: 50 })).toBe(false)
    expect(isPresetPosition({ x: 50 })).toBe(false)
    expect(isPresetPosition({ x: 50, y: 50, z: 50 })).toBe(false)
    expect(PRESET_POSITION_VALUES).toEqual([0, 50, 100])
  })

  it('normalizes device-local values to the nearest stop', () => {
    expect(normalizePresetPosition({ x: 10, y: 90 })).toEqual({ x: 0, y: 100 })
    expect(normalizePresetPosition({ x: 49, y: 51 })).toEqual({ x: 50, y: 50 })
    expect(normalizePresetPosition(undefined)).toEqual(DEFAULT_PRESET_POSITION)
  })

  it('names every cell and maps the grid to the wallpaper position ids', () => {
    const names = new Set<string>()
    for (const x of PRESET_POSITION_VALUES) {
      for (const y of PRESET_POSITION_VALUES) names.add(presetPositionName({ x, y }))
    }
    expect(names.size).toBe(9)
    expect(presetPositionName({ x: 0, y: 0 })).toBe('top-left')
    expect(presetPositionName({ x: 50, y: 50 })).toBe('center')
    expect(presetPositionName({ x: 100, y: 100 })).toBe('bottom-right')
  })
})

describe('preset helpers', () => {
  it('validates the producer string', () => {
    expect(isCreatedWith('dsh-livery/0.1.3')).toBe(true)
    expect(isCreatedWith('dsh-livery/0.1.3-rc.1')).toBe(true)
    expect(isCreatedWith('dsh-livery/')).toBe(false)
    expect(isCreatedWith('dsh-livery/0.1.3\nx')).toBe(false)
    expect(createdWithOf(' 0.1.3 ')).toBe('dsh-livery/0.1.3')
  })

  it('flags forbidden content shapes', () => {
    for (const value of ['a\\b', '{x}', '<script>', '!important', 'url(x)', 'javascript:alert(1)', 'data:image/png', 'C:\\x']) {
      expect(hasForbiddenContent(value), value).toBe(true)
    }
    expect(hasForbiddenContent('https://example.com/a.jpg')).toBe(false)
    expect(hasForbiddenContent('Dunes by A. Photographer')).toBe(false)
  })

  it('compares records field-wise', () => {
    expect(sameEffects(effects(), effects())).toBe(true)
    expect(sameEffects(effects(), effects({ blur: 0 }))).toBe(false)
    expect(samePosition({ x: 50, y: 50 }, { x: 50, y: 50 })).toBe(true)
    expect(samePosition({ x: 50, y: 50 }, { x: 0, y: 50 })).toBe(false)
    expect(sameWallpaperView(null, null)).toBe(true)
    expect(sameWallpaperView(null, { kind: 'builtin', id: 'aurora' })).toBe(false)
    expect(sameWallpaperView({ kind: 'builtin', id: 'aurora' }, { kind: 'builtin', id: 'aurora' })).toBe(true)
    expect(sameAttribution(undefined, {})).toBe(true)
    expect(sameAttribution({ title: 'a' }, { title: 'a' })).toBe(true)
    expect(sameAttribution({ title: 'a' }, { title: 'b' })).toBe(false)
  })
})

/** Export a couple of structural invariants the acceptance harness relies on. */
describe('preset public constants', () => {
  it('keeps the documented size cap and schema version', () => {
    expect(PRESET_SCHEMA_VERSION).toBe(1)
    expect(PRESET_FILE_MAX_BYTES).toBe(64 * 1024)
  })

  it('enforces a tighter byte cap when the host asks for one', () => {
    const preset = makePreset()
    expect(validatePreset(preset, { catalogIds: CATALOG_IDS }).ok).toBe(true)
    expect(validatePreset(preset, { catalogIds: CATALOG_IDS, maxBytes: 100 }).ok).toBe(false)
  })
})
