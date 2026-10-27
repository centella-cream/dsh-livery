/**
 * Runtime direct-apply API tests + preset-integration wiring.
 *
 * The runtime gains `applyStyle` (one config write, no transient preview) so a
 * native preset flow can apply the livery first and only then batch the
 * wallpaper state. These tests pin the failure taxonomy (`refused` /
 * `transport` / `unknown` / `unavailable` / `busy`) and the "never touch the
 * wallpaper before the style landed" ordering of the preset orchestrator.
 */
import { describe, expect, it } from 'vitest'
import type { BootPayload, LiveryCatalog } from '../../src/core/types.js'
import { LIVERY_VERSION, STOCK_ID } from '../../src/core/types.js'
import { ADAPTER_IDENTITIES } from '../../src/generated/contract.js'
import { checkBoot } from '../../src/client/handshake.js'
import type { BootCheck } from '../../src/client/handshake.js'
import type { LiveryRuntime } from '../../src/client/runtime.js'
import { createLiveryRuntime } from '../../src/client/runtime.js'
import type { PresetApplyPorts } from '../../src/client/wallpaper/preset.js'
import {
  applyPreset,
  createdWithOf,
  matchesPresetWallpaperState,
  presetWallpaperTarget,
} from '../../src/client/wallpaper/preset.js'
import type { LiveryPreset } from '../../src/client/wallpaper/preset.js'
import { DEFAULT_WALLPAPER_EFFECTS, WALLPAPER_STORAGE_KEY } from '../../src/client/wallpaper.js'
import { createWallpaperController } from '../../src/client/wallpaper/controller.js'
import type { WallpaperControllerApi, WallpaperStorage } from '../../src/client/wallpaper/controller.js'
import {
  FakeConfigForm,
  FakeDocument,
  FakeLocale,
  FakeTheme,
  RecordingPresenter,
  TEST_ADAPTER,
  TEST_CORE,
  flush,
  makeBootPayload,
  makeCatalog,
  makeLivery,
} from './fixtures.js'

function validBoot(payload: Partial<Record<keyof BootPayload, unknown>> = {}): BootCheck {
  const check = checkBoot(makeBootPayload(payload), ADAPTER_IDENTITIES)
  if (check.kind !== 'valid') throw new Error(`fixture boot must be valid: ${check.reasons.join('; ')}`)
  return check
}

interface Harness {
  runtime: LiveryRuntime
  presenter: RecordingPresenter
  form: FakeConfigForm
}

function createHarness(options: { readonly catalog?: LiveryCatalog | undefined } = {}): Harness {
  const presenter = new RecordingPresenter()
  const form = new FakeConfigForm({
    status: 'ready',
    value: { skinId: 'fjord' },
    revision: 1,
    writable: true,
    mode: 'host',
  })
  const catalog = 'catalog' in options ? options.catalog : makeCatalog()
  const runtime = createLiveryRuntime({
    boot: validBoot(),
    identity: {
      adapterId: TEST_ADAPTER.adapterId,
      contractHash: TEST_ADAPTER.contractHash,
      pluginVersion: LIVERY_VERSION,
      hostVersion: TEST_ADAPTER.hostVersion,
    },
    entryId: 'livery',
    configForms: { get: () => form },
    presenter,
    core: TEST_CORE,
    fetchCatalog: async () => catalog,
    locale: new FakeLocale('en'),
    theme: new FakeTheme(),
    document: new FakeDocument().asDocument(),
  })
  return { runtime, presenter, form }
}

async function readyHarness(options: Parameters<typeof createHarness>[0] = {}): Promise<Harness> {
  const harness = createHarness(options)
  harness.runtime.start()
  await flush()
  const phase = harness.runtime.getSnapshot().phase
  if (phase !== 'ready' && phase !== 'degraded') {
    throw new Error(`fixture runtime must settle before interaction, got ${phase}`)
  }
  return harness
}

function makePreset(overrides: Partial<LiveryPreset> = {}): LiveryPreset {
  return {
    schemaVersion: 1,
    createdWith: createdWithOf(LIVERY_VERSION),
    styleId: 'midnight',
    wallpaper: { kind: 'builtin', id: 'aurora' },
    effects: { ...DEFAULT_WALLPAPER_EFFECTS },
    position: { x: 100, y: 0 },
    ...overrides,
  }
}

describe('runtime direct style apply', () => {
  it('applies one livery with exactly one config write and settles on it', async () => {
    const harness = await readyHarness()
    const baselineConfirmedBatches = harness.presenter.count('applyConfirmed')

    const outcome = await harness.runtime.applyStyle('midnight')

    expect(outcome).toEqual({ ok: true })
    expect(harness.form.writes).toEqual([{ field: 'skinId', value: 'midnight' }])
    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.phase).toBe('ready')
    expect(snapshot.previewId).toBeUndefined()
    expect(snapshot.confirmedId).toBe('midnight')
    expect(snapshot.effectiveId).toBe('midnight')
    expect(snapshot.writeFailure).toBeUndefined()
    expect(harness.presenter.count('applyPreview')).toBe(1)
    expect(harness.presenter.count('applyConfirmed')).toBe(baselineConfirmedBatches + 1)
  })

  it('is a no-op success when that livery is already confirmed', async () => {
    const harness = await readyHarness()
    const outcome = await harness.runtime.applyStyle('fjord')
    expect(outcome).toEqual({ ok: true })
    expect(harness.form.writes).toEqual([])
  })

  it('restores stock without entering preview', async () => {
    const harness = await readyHarness()
    const outcome = await harness.runtime.applyStyle(STOCK_ID)
    expect(outcome).toEqual({ ok: true })
    expect(harness.form.writes).toEqual([{ field: 'skinId', value: STOCK_ID }])
    expect(harness.runtime.getSnapshot().effectiveId).toBe(STOCK_ID)
    expect(harness.presenter.count('clearSkin')).toBe(1)
  })

  it('is a no-op success when the stock appearance is already applied', async () => {
    const harness = createHarness()
    harness.form.snapshot = { ...harness.form.snapshot, value: { skinId: STOCK_ID } }
    harness.runtime.start()
    await flush()
    const outcome = await harness.runtime.applyStyle(STOCK_ID)
    expect(outcome).toEqual({ ok: true })
    expect(harness.form.writes).toEqual([])
  })

  it('reports unknown ids without writing', async () => {
    const harness = await readyHarness()
    const outcome = await harness.runtime.applyStyle('not-a-livery')
    expect(outcome).toEqual({ ok: false, failure: 'unknown' })
    expect(harness.form.writes).toEqual([])
    expect(harness.runtime.getSnapshot().confirmedId).toBe('fjord')
  })

  it('reports unavailable liveries without writing', async () => {
    const catalog = makeCatalog(undefined, {})
    const harness = await readyHarness({ catalog })
    const outcome = await harness.runtime.applyStyle('midnight')
    expect(outcome).toEqual({ ok: false, failure: 'unavailable' })
    expect(harness.form.writes).toEqual([])
  })

  it('reports unavailable when the catalog never loaded', async () => {
    const harness = await readyHarness({ catalog: undefined })
    const outcome = await harness.runtime.applyStyle('midnight')
    expect(outcome).toEqual({ ok: false, failure: 'unavailable' })
    expect(harness.form.writes).toEqual([])
  })

  it('maps a refused write to refused and keeps the old livery', async () => {
    const harness = await readyHarness()
    harness.form.response = false
    const outcome = await harness.runtime.applyStyle('midnight')
    expect(outcome).toEqual({ ok: false, failure: 'refused' })
    expect(harness.runtime.getSnapshot().confirmedId).toBe('fjord')
    expect(harness.runtime.getSnapshot().effectiveId).toBe('fjord')
    expect(harness.presenter.count('rollbackPreview')).toBe(1)
  })

  it('maps a throwing write to transport', async () => {
    const harness = await readyHarness()
    harness.form.response = new Error('offline')
    const outcome = await harness.runtime.applyStyle('midnight')
    expect(outcome).toEqual({ ok: false, failure: 'transport' })
    expect(harness.runtime.getSnapshot().confirmedId).toBe('fjord')
  })

  it('reports busy while another write is in flight', async () => {
    const harness = await readyHarness()
    let release: ((accepted: boolean) => void) | undefined
    harness.form.set = () => new Promise<boolean>(resolve => { release = resolve })

    const first = harness.runtime.applyStyle('midnight')
    await flush()
    expect(harness.runtime.getSnapshot().writing).toBe(true)

    const blocked = await harness.runtime.applyStyle('fjord')
    expect(blocked).toEqual({ ok: false, failure: 'busy' })

    release?.(true)
    await first
    await flush()
  })

  it('reports busy after dispose', async () => {
    const harness = await readyHarness()
    harness.runtime.dispose()
    const outcome = await harness.runtime.applyStyle('midnight')
    expect(outcome).toEqual({ ok: false, failure: 'busy' })
    expect(harness.form.writes).toEqual([])
  })

  it('cancels a transient preview before applying directly', async () => {
    const harness = await readyHarness()
    harness.runtime.preview('midnight')
    expect(harness.runtime.getSnapshot().phase).toBe('previewing')

    const outcome = await harness.runtime.applyStyle('midnight')

    expect(outcome).toEqual({ ok: true })
    expect(harness.runtime.getSnapshot().phase).toBe('ready')
    expect(harness.runtime.getSnapshot().confirmedId).toBe('midnight')
    expect(harness.runtime.getSnapshot().previewId).toBeUndefined()
  })

  it('reports unknown for a livery that disappears from the catalog', async () => {
    const catalog = makeCatalog([makeLivery('fjord')])
    const harness = await readyHarness({ catalog })
    const outcome = await harness.runtime.applyStyle('midnight')
    expect(outcome).toEqual({ ok: false, failure: 'unknown' })
  })
})

describe('preset integration with the direct apply API', () => {
  it('applies the style first, then the wallpaper batch', async () => {
    const harness = await readyHarness()
    const calls: string[] = []
    const ports: PresetApplyPorts = {
      async applyStyle(styleId) {
        calls.push(`style:${styleId}`)
        return harness.runtime.applyStyle(styleId)
      },
      applyWallpaper(target) {
        calls.push(`wallpaper:${target.selection?.kind ?? 'none'}:${target.position.x}/${target.position.y}`)
        return true
      },
    }
    const preset = makePreset()

    const result = await applyPreset(preset, ports)

    expect(result).toEqual({ status: 'applied' })
    expect(calls).toEqual(['style:midnight', 'wallpaper:builtin:100/0'])
    expect(harness.runtime.getSnapshot().confirmedId).toBe('midnight')
    expect(harness.form.writes).toEqual([{ field: 'skinId', value: 'midnight' }])
  })

  it('never touches the wallpaper when the style write is refused', async () => {
    const harness = await readyHarness()
    harness.form.response = false
    const wallpaperCalls: unknown[] = []
    const result = await applyPreset(makePreset(), {
      applyStyle: id => harness.runtime.applyStyle(id),
      applyWallpaper(target) { wallpaperCalls.push(target); return true },
    })
    expect(result).toEqual({ status: 'style-failed', failure: 'refused' })
    expect(wallpaperCalls).toEqual([])
    expect(harness.runtime.getSnapshot().confirmedId).toBe('fjord')
  })

  it('reports partial failure after the style landed but the wallpaper did not', async () => {
    const harness = await readyHarness()
    const result = await applyPreset(makePreset(), {
      applyStyle: id => harness.runtime.applyStyle(id),
      applyWallpaper: () => false,
    })
    expect(result).toEqual({ status: 'partial', styleId: 'midnight' })
    // The style change is real and visible: partial failure never rolls it back
    // silently, so the caller can offer a wallpaper-only retry.
    expect(harness.runtime.getSnapshot().confirmedId).toBe('midnight')
    expect(harness.runtime.getSnapshot().effectiveId).toBe('midnight')
  })

  it('is idempotent when re-applying the same preset after a partial failure', async () => {
    const harness = await readyHarness()
    const styleCalls: string[] = []
    const ports: PresetApplyPorts = {
      async applyStyle(styleId) {
        styleCalls.push(styleId)
        return harness.runtime.applyStyle(styleId)
      },
      applyWallpaper: () => false,
    }
    await applyPreset(makePreset(), ports)
    harness.form.writes.length = 0

    await applyPreset(makePreset(), ports)

    expect(styleCalls).toEqual(['midnight', 'midnight'])
    // Already confirmed: the retry issues no second config write.
    expect(harness.form.writes).toEqual([])
  })

  it('expresses "clear wallpaper" as an explicit undefined selection', async () => {
    const target = presetWallpaperTarget(makePreset({ wallpaper: null }))
    expect('selection' in target).toBe(true)
    expect(target.selection).toBeUndefined()
  })
})

/** In-memory localStorage for the state-v2 controller. */
class MemoryStorage implements WallpaperStorage {
  readonly map = new Map<string, string>()
  getItem(key: string): string | null { return this.map.get(key) ?? null }
  setItem(key: string, value: string): void { this.map.set(key, value) }
  removeItem(key: string): void { this.map.delete(key) }
}

/** The documented WallpaperPanel integration wrapper, verbatim. */
function controllerPort(controller: WallpaperControllerApi): PresetApplyPorts['applyWallpaper'] {
  return target => {
    const next = controller.setState({
      selection: target.selection,
      effects: target.effects,
      position: target.position,
    }, { flush: true })
    return matchesPresetWallpaperState(next, target)
  }
}

describe('state-v2 controller adapter (documented integration wrapper)', () => {
  it('applies a preset wallpaper target in one batch and verifies the snapshot', () => {
    const storage = new MemoryStorage()
    const controller = createWallpaperController({ storage, document: undefined })
    controller.start()
    const revisions: number[] = []
    controller.subscribe(() => revisions.push(controller.getSnapshot().revision))
    const target = presetWallpaperTarget(makePreset())

    const next = controller.setState({
      selection: target.selection,
      effects: target.effects,
      position: target.position,
    }, { flush: true })

    expect(matchesPresetWallpaperState(next, target)).toBe(true)
    expect(revisions).toHaveLength(1)
    expect(next.position).toEqual({ x: 100, y: 0 })
    expect(storage.map.get(WALLPAPER_STORAGE_KEY)).toBeDefined()
    controller.dispose()
  })

  it('detects a disposed controller as a wallpaper failure (no silent success)', () => {
    const controller = createWallpaperController({ storage: new MemoryStorage(), document: undefined })
    controller.start()
    controller.dispose()
    const target = presetWallpaperTarget(makePreset())
    const next = controller.applyState({
      selection: target.selection,
      effects: target.effects,
      position: target.position,
    })
    expect(matchesPresetWallpaperState(next, target)).toBe(false)
  })

  it('drives runtime style + controller wallpaper through the preset orchestrator', async () => {
    const harness = await readyHarness()
    const controller = createWallpaperController({ storage: new MemoryStorage(), document: undefined })
    controller.start()
    const preset = makePreset()

    const result = await applyPreset(preset, {
      applyStyle: id => harness.runtime.applyStyle(id),
      applyWallpaper: controllerPort(controller),
    })

    expect(result).toEqual({ status: 'applied' })
    expect(harness.runtime.getSnapshot().confirmedId).toBe('midnight')
    const wallpaper = controller.getSnapshot()
    expect(wallpaper.selection).toEqual({ kind: 'builtin', id: 'aurora' })
    expect(wallpaper.position).toEqual({ x: 100, y: 0 })
    expect(wallpaper.effects).toEqual(preset.effects)
    controller.dispose()
  })

  it('reports partial failure when the wallpaper controller is unavailable', async () => {
    const harness = await readyHarness()
    const controller = createWallpaperController({ storage: new MemoryStorage(), document: undefined })
    controller.start()
    controller.dispose()

    const result = await applyPreset(makePreset(), {
      applyStyle: id => harness.runtime.applyStyle(id),
      applyWallpaper: controllerPort(controller),
    })

    expect(result).toEqual({ status: 'partial', styleId: 'midnight' })
    // The style half is real and visible; the caller can offer a wallpaper retry.
    expect(harness.runtime.getSnapshot().confirmedId).toBe('midnight')
  })
})
