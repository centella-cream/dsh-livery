import { describe, expect, it } from 'vitest'
import type { BootPayload, CapabilityMap, LiveryCatalog } from '../../src/core/types.js'
import { LIVERY_VERSION } from '../../src/core/types.js'
import { ADAPTER_IDENTITIES } from '../../src/generated/contract.js'
import { checkBoot } from '../../src/client/handshake.js'
import type { BootCheck } from '../../src/client/handshake.js'
import type { LiveryRuntime } from '../../src/client/runtime.js'
import { createLiveryRuntime } from '../../src/client/runtime.js'
import {
  ADAPTER_021_2,
  adapterRecordOf,
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

const CAPABILITIES = makeCatalog().capabilities

function failClosed(reason = 'adapter mismatch'): BootCheck {
  return { kind: 'mismatch', payload: undefined, adapter: undefined, reasons: [reason] }
}

function noBoot(): BootCheck {
  return checkBoot(undefined, ADAPTER_IDENTITIES)
}

function validBoot(payload: Partial<Record<keyof BootPayload, unknown>> = {}): BootCheck {
  const check = checkBoot(makeBootPayload(payload), ADAPTER_IDENTITIES)
  if (check.kind !== 'valid') throw new Error(`fixture boot must be valid: ${check.reasons.join('; ')}`)
  return check
}

interface Harness {
  runtime: LiveryRuntime
  presenter: RecordingPresenter
  form: FakeConfigForm
  locale: FakeLocale
  theme: FakeTheme | undefined
  doc: FakeDocument
  setCatalog(this: void, catalog: LiveryCatalog | undefined): void
  fetchCalls(): number
}

function createHarness(options: {
  boot?: BootCheck
  form?: FakeConfigForm
  theme?: FakeTheme | null
  catalog?: LiveryCatalog | undefined
  document?: FakeDocument
} = {}): Harness {
  const presenter = new RecordingPresenter()
  const form = options.form ?? new FakeConfigForm({
    status: 'ready',
    value: { skinId: 'fjord' },
    revision: 1,
    writable: true,
    mode: 'host',
  })
  const locale = new FakeLocale('en')
  const theme = options.theme === null ? undefined : options.theme ?? new FakeTheme()
  const doc = options.document ?? new FakeDocument()
  let catalog = 'catalog' in options ? options.catalog : makeCatalog()
  let fetchCalls = 0
  const runtime = createLiveryRuntime({
    boot: options.boot ?? noBoot(),
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
    fetchCatalog: async () => {
      fetchCalls += 1
      return catalog
    },
    locale,
    theme,
    document: doc.asDocument(),
  })
  return {
    runtime,
    presenter,
    form,
    locale,
    theme,
    doc,
    setCatalog(next) { catalog = next },
    fetchCalls() { return fetchCalls },
  }
}

function expectedHash(catalog: LiveryCatalog, id: string): string {
  const livery = catalog.liveries.find(candidate => candidate.id === id)!
  return TEST_CORE.liveryCssHash(livery)
}

function seedHostFirstFrame(doc: FakeDocument, id: string, hash: string): void {
  const style = doc.createElement('style')
  style.id = 'dsh-livery-boot'
  style.textContent = `/*${id}*/`
  doc.head.appendChild(style)
  doc.body.setAttribute('data-dsh-livery', id)
  doc.body.setAttribute('data-dsh-livery-hash', hash)
}

describe('first settle', () => {
  it('adopts an identical host first frame with zero CSS text writes', async () => {
    const catalog = makeCatalog()
    const hash = expectedHash(catalog, 'fjord')
    const doc = new FakeDocument()
    seedHostFirstFrame(doc, 'fjord', hash)
    const harness = createHarness({ boot: validBoot({ cssHash: hash }), catalog, document: doc })

    harness.runtime.start()
    await flush()

    expect(harness.runtime.getSnapshot().phase).toBe('ready')
    expect(harness.runtime.getSnapshot().effectiveId).toBe('fjord')
    expect(harness.presenter.count('adoptBootStyle')).toBe(1)
    expect(harness.presenter.count('applyConfirmed')).toBe(0)
    expect(harness.presenter.snapshot().cssTextWrites).toBe(0)
  })

  it('replaces a differing first frame in exactly one synchronous batch', async () => {
    const catalog = makeCatalog()
    const harness = createHarness({ boot: validBoot({ cssHash: 'sha256:stale' }), catalog })

    harness.runtime.start()
    await flush()

    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.phase).toBe('ready')
    expect(snapshot.effectiveId).toBe('fjord')
    expect(harness.presenter.count('adoptBootStyle')).toBe(0)
    expect(harness.presenter.count('applyConfirmed')).toBe(1)
    expect(harness.presenter.skins[0]).toEqual({
      call: 'applyConfirmed',
      skin: { id: 'fjord', cssText: '/*fjord*/', hash: expectedHash(catalog, 'fjord') },
    })
  })

  it('falls back to one batch when the host style element cannot be found', async () => {
    const catalog = makeCatalog()
    const hash = expectedHash(catalog, 'fjord')
    const doc = new FakeDocument()
    // Attributes exist but the element was never injected (or was already claimed).
    doc.body.setAttribute('data-dsh-livery', 'fjord')
    doc.body.setAttribute('data-dsh-livery-hash', hash)
    const harness = createHarness({ boot: validBoot({ cssHash: hash }), catalog, document: doc })
    harness.presenter.adoptResult = false

    harness.runtime.start()
    await flush()

    expect(harness.presenter.count('adoptBootStyle')).toBe(1)
    expect(harness.presenter.count('applyConfirmed')).toBe(1)
    expect(harness.runtime.getSnapshot().effectiveId).toBe('fjord')
  })

  it('performs zero DOM writes while loading and settles when config arrives', async () => {
    const form = new FakeConfigForm({
      status: 'loading',
      value: undefined,
      revision: undefined,
      writable: false,
      mode: 'host',
    })
    const harness = createHarness({ form })

    harness.runtime.start()
    await flush()

    expect(harness.runtime.getSnapshot().phase).toBe('loading')
    expect(harness.runtime.getSnapshot().catalogStatus).toBe('ready')
    expect(harness.presenter.calls).toEqual([])

    form.update({ status: 'ready', value: { skinId: 'fjord' }, revision: 1, writable: true })
    await flush()

    expect(harness.runtime.getSnapshot().phase).toBe('ready')
    expect(harness.presenter.count('applyConfirmed')).toBe(1)
  })

  it('degrades to boot-only colors when the catalog fetch fails', async () => {
    const doc = new FakeDocument()
    seedHostFirstFrame(doc, 'fjord', 'sha256:boot')
    const harness = createHarness({
      boot: validBoot({ cssHash: 'sha256:boot' }),
      catalog: undefined,
      document: doc,
    })

    harness.runtime.start()
    await flush()

    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.phase).toBe('degraded')
    expect(snapshot.catalogStatus).toBe('unavailable')
    expect(snapshot.effectiveId).toBe('fjord')
    expect(harness.presenter.count('adoptBootStyle')).toBe(1)
    expect(harness.presenter.count('applyConfirmed')).toBe(0)
  })

  it('takes identity + catalog profile from the fetched catalog (0.2.1 path)', async () => {
    const catalog = makeCatalog(undefined, adapterRecordOf(ADAPTER_021_2).capabilities, ADAPTER_021_2)
    const harness = createHarness({ catalog })

    harness.runtime.start()
    await flush()

    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.phase).toBe('ready')
    expect(snapshot.catalogStatus).toBe('ready')
    expect(snapshot.catalogProfile).toBe(ADAPTER_021_2.catalogProfile)
    expect(snapshot.identity).toEqual({
      adapterId: ADAPTER_021_2.adapterId,
      contractHash: ADAPTER_021_2.contractHash,
      pluginVersion: LIVERY_VERSION,
      hostVersion: ADAPTER_021_2.hostVersion,
    })
    expect(snapshot.capabilities['host-font-role-hooks']?.available).toBe(true)
  })

  it('seeds the catalog profile from a known handshake before the catalog arrives', async () => {
    const form = new FakeConfigForm({
      status: 'loading', value: undefined, revision: undefined, writable: false, mode: 'host',
    })
    const harness = createHarness({ form, boot: validBoot() })
    harness.runtime.start()
    await flush()
    expect(harness.runtime.getSnapshot().catalogProfile).toBe(TEST_ADAPTER.catalogProfile)
  })

  it('fails closed without fetching when the handshake mismatches', async () => {
    const doc = new FakeDocument()
    seedHostFirstFrame(doc, 'fjord', 'sha256:boot')
    const harness = createHarness({ boot: failClosed(), document: doc })

    harness.runtime.start()
    await flush()

    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.phase).toBe('degraded')
    expect(snapshot.bootStatus).toBe('mismatch')
    expect(snapshot.effectiveId).toBe('stock')
    expect(harness.presenter.count('removeBootArtifacts')).toBe(1)
    expect(harness.presenter.count('applyConfirmed')).toBe(0)
    expect(harness.presenter.count('adoptBootStyle')).toBe(0)
    expect(harness.fetchCalls()).toBe(0)
  })

  it('renders stock when the configured livery no longer exists', async () => {
    const harness = createHarness({
      form: new FakeConfigForm({
        status: 'ready',
        value: { skinId: 'deleted-livery' },
        revision: 1,
        writable: true,
        mode: 'host',
      }),
    })

    harness.runtime.start()
    await flush()

    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.phase).toBe('degraded')
    expect(snapshot.effectiveId).toBe('stock')
    expect(snapshot.invalidSkinId).toBe('deleted-livery')
    expect(harness.presenter.count('clearSkin')).toBe(1)
  })

  it('falls back to stock when a required capability is missing', async () => {
    const capabilities: CapabilityMap = {
      ...CAPABILITIES,
      'theme-css': { ...CAPABILITIES['theme-css']!, available: false },
    }
    const catalog = makeCatalog(undefined, capabilities)
    const harness = createHarness({ catalog })

    harness.runtime.start()
    await flush()

    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.phase).toBe('degraded')
    expect(snapshot.effectiveId).toBe('stock')
    expect(snapshot.missingRequired).toContain('theme-css')
    expect(harness.presenter.count('clearSkin')).toBe(1)
  })
})

describe('transient preview', () => {
  async function readyHarness(): Promise<Harness> {
    const harness = createHarness()
    harness.runtime.start()
    await flush()
    return harness
  }

  it('previews without writing configuration', async () => {
    const harness = await readyHarness()
    const started = harness.runtime.preview('midnight')

    expect(started).toBe(true)
    expect(harness.runtime.getSnapshot().phase).toBe('previewing')
    expect(harness.runtime.getSnapshot().previewId).toBe('midnight')
    expect(harness.presenter.count('applyPreview')).toBe(1)
    expect(harness.form.writes).toEqual([])
  })

  it('cancels the preview back to the confirmed livery', async () => {
    const harness = await readyHarness()
    harness.runtime.preview('midnight')
    harness.runtime.cancelPreview()

    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.phase).toBe('ready')
    expect(snapshot.previewId).toBeUndefined()
    expect(harness.presenter.count('rollbackPreview')).toBe(1)
    expect(harness.form.writes).toEqual([])
  })

  it('commits the preview with exactly one config write', async () => {
    const harness = await readyHarness()
    harness.runtime.preview('midnight')
    const confirmedBatches = harness.presenter.count('applyConfirmed')

    const accepted = await harness.runtime.commitPreview()

    expect(accepted).toBe(true)
    expect(harness.form.writes).toEqual([{ field: 'skinId', value: 'midnight' }])
    expect(harness.presenter.count('applyConfirmed')).toBe(confirmedBatches + 1)
    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.phase).toBe('ready')
    expect(snapshot.confirmedId).toBe('midnight')
    expect(snapshot.effectiveId).toBe('midnight')
    expect(snapshot.writing).toBe(false)
  })

  it('rolls back and reports when the host refuses the write', async () => {
    const harness = await readyHarness()
    harness.form.response = false
    harness.runtime.preview('midnight')

    const accepted = await harness.runtime.commitPreview()

    expect(accepted).toBe(false)
    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.writeFailure).toBe('refused')
    expect(snapshot.phase).toBe('ready')
    expect(snapshot.confirmedId).toBe('fjord')
    expect(harness.presenter.count('rollbackPreview')).toBe(1)
    expect(harness.presenter.snapshot().bodyId).toBe('fjord')
  })

  it('rolls back and reports a transport failure', async () => {
    const harness = await readyHarness()
    harness.form.response = new Error('offline')
    harness.runtime.preview('midnight')

    const accepted = await harness.runtime.commitPreview()

    expect(accepted).toBe(false)
    expect(harness.runtime.getSnapshot().writeFailure).toBe('transport')
    expect(harness.presenter.count('rollbackPreview')).toBe(1)
  })

  it('retries the failed write when the host recovers', async () => {
    const harness = await readyHarness()
    harness.form.response = false
    harness.runtime.preview('midnight')
    expect(await harness.runtime.commitPreview()).toBe(false)
    expect(harness.runtime.getSnapshot().writeFailure).toBe('refused')

    harness.form.response = true
    const accepted = await harness.runtime.retryLastWrite()

    expect(accepted).toBe(true)
    expect(harness.runtime.getSnapshot().confirmedId).toBe('midnight')
    expect(harness.runtime.getSnapshot().writeFailure).toBeUndefined()
    expect(harness.form.writes.at(-1)).toEqual({ field: 'skinId', value: 'midnight' })
  })

  it('retries a failed stock restore', async () => {
    const harness = await readyHarness()
    harness.form.response = new Error('offline')
    expect(await harness.runtime.restoreStock()).toBe(false)
    harness.form.response = true
    expect(await harness.runtime.retryLastWrite()).toBe(true)
    expect(harness.runtime.getSnapshot().effectiveId).toBe('stock')
  })

  it('supports previewing the stock appearance', async () => {
    const harness = await readyHarness()
    harness.runtime.preview('stock')
    expect(harness.runtime.getSnapshot().previewId).toBe('stock')
    expect(harness.presenter.count('applyPreview')).toBe(1)

    const accepted = await harness.runtime.commitPreview()
    expect(accepted).toBe(true)
    expect(harness.form.writes).toEqual([{ field: 'skinId', value: 'stock' }])
    expect(harness.presenter.count('clearSkin')).toBe(1)
    expect(harness.runtime.getSnapshot().effectiveId).toBe('stock')
  })

  it('treats an external config change during preview as superseding it', async () => {
    const harness = await readyHarness()
    harness.runtime.preview('fjord')
    expect(harness.runtime.getSnapshot().previewId).toBe('fjord')

    harness.form.update({ value: { skinId: 'midnight' }, revision: 2 })
    await flush()

    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.phase).toBe('ready')
    expect(snapshot.previewId).toBeUndefined()
    expect(snapshot.effectiveId).toBe('midnight')
    expect(harness.presenter.count('rollbackPreview')).toBeGreaterThanOrEqual(1)
  })

  it('restores the stock appearance with one write and no residue', async () => {
    const harness = await readyHarness()
    const accepted = await harness.runtime.restoreStock()

    expect(accepted).toBe(true)
    expect(harness.form.writes).toEqual([{ field: 'skinId', value: 'stock' }])
    expect(harness.presenter.count('clearSkin')).toBe(1)
    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.confirmedId).toBe('stock')
    expect(snapshot.effectiveId).toBe('stock')
  })
})

describe('degraded retry and re-configuration', () => {
  it('retries the catalog fetch and applies the recovered livery', async () => {
    const harness = createHarness({ catalog: undefined })
    harness.runtime.start()
    await flush()
    expect(harness.runtime.getSnapshot().phase).toBe('degraded')

    harness.setCatalog(makeCatalog())
    await harness.runtime.retryCatalog()

    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.catalogStatus).toBe('ready')
    expect(snapshot.phase).toBe('ready')
    expect(snapshot.effectiveId).toBe('fjord')
    expect(harness.fetchCalls()).toBe(2)
  })

  it('re-presents when the host config changes externally after settle', async () => {
    const harness = createHarness()
    harness.runtime.start()
    await flush()
    expect(harness.runtime.getSnapshot().effectiveId).toBe('fjord')

    harness.form.update({ value: { skinId: 'midnight' }, revision: 2 })
    await flush()

    expect(harness.runtime.getSnapshot().effectiveId).toBe('midnight')
    expect(harness.presenter.count('applyConfirmed')).toBeGreaterThanOrEqual(2)
  })

  it('falls back to the boot skin when the config is unavailable', async () => {
    const doc = new FakeDocument()
    seedHostFirstFrame(doc, 'fx-boot', 'sha256:boot')
    const catalog = makeCatalog([makeLivery('fx-boot')])
    const form = new FakeConfigForm({
      status: 'unavailable',
      value: undefined,
      revision: undefined,
      writable: false,
      mode: 'memory',
    })
    const harness = createHarness({
      form,
      catalog,
      document: doc,
      boot: validBoot({ skinId: 'fx-boot', cssHash: 'sha256:boot' }),
    })

    harness.runtime.start()
    await flush()

    const snapshot = harness.runtime.getSnapshot()
    expect(snapshot.configStatus).toBe('unavailable')
    expect(snapshot.confirmedId).toBe('fx-boot')
    expect(snapshot.effectiveId).toBe('fx-boot')
    expect(harness.runtime.getSnapshot().writable).toBe(false)
  })
})

describe('locale, theme and teardown', () => {
  it('tracks locale changes without touching the DOM', async () => {
    const harness = createHarness()
    harness.runtime.start()
    await flush()
    const writesBefore = harness.presenter.calls.length

    harness.locale.setActive('zh')
    expect(harness.runtime.getSnapshot().locale).toBe('zh')
    expect(harness.presenter.calls.length).toBe(writesBefore)
  })

  it('subscribes to theme changes only when the settings page asks', async () => {
    const harness = createHarness()
    harness.runtime.start()
    await flush()
    expect(harness.theme!.subscriptions).toBe(0)

    const stop = harness.runtime.observeTheme()
    expect(harness.theme!.subscriptions).toBe(1)
    harness.theme!.setMode('dark')
    expect(harness.runtime.getSnapshot().themeMode).toBe('dark')

    stop()
    harness.theme!.setMode('light')
    expect(harness.runtime.getSnapshot().themeMode).toBe('dark')
  })

  it('ignores interaction before the first settle', async () => {
    const form = new FakeConfigForm({
      status: 'loading', value: undefined, revision: undefined, writable: false, mode: 'host',
    })
    const harness = createHarness({ form })
    harness.runtime.start()
    expect(harness.runtime.preview('midnight')).toBe(false)
    expect(await harness.runtime.commitPreview()).toBe(false)
    expect(await harness.runtime.restoreStock()).toBe(false)
  })

  it('tears down subscriptions and DOM ownership in reverse order', async () => {
    const harness = createHarness()
    harness.runtime.start()
    await flush()
    harness.runtime.preview('midnight')

    harness.runtime.dispose()

    expect(harness.runtime.getSnapshot().phase).toBe('disposed')
    expect(harness.presenter.count('dispose')).toBe(1)
    expect(harness.form.listenerCount).toBe(0)
    expect(harness.runtime.preview('fjord')).toBe(false)
    harness.form.update({ value: { skinId: 'midnight' } })
    expect(harness.runtime.getSnapshot().phase).toBe('disposed')
  })
})

describe('write reconciliation with newer config revisions', () => {
  class DeferredForm extends FakeConfigForm {
    resolveWrite: ((value: boolean) => void) | undefined
    rejectWrite: ((error: unknown) => void) | undefined

    override async set(field: string, value: unknown): Promise<boolean> {
      this.writes.push({ field, value })
      return new Promise<boolean>((resolve, reject) => {
        this.resolveWrite = resolve
        this.rejectWrite = reject
      })
    }
  }

  async function settlePreview(): Promise<Harness & { form: DeferredForm }> {
    const form = new DeferredForm({ status: 'ready', value: { skinId: 'fjord' }, revision: 1, writable: true, mode: 'host' })
    const harness = createHarness({ form })
    harness.runtime.start()
    await flush()
    expect(harness.runtime.preview('midnight')).toBe(true)
    return { ...harness, form }
  }

  it('keeps the newest host config when an older write succeeds late', async () => {
    const { runtime, form } = await settlePreview()
    const commit = runtime.commitPreview()
    form.update({ value: { skinId: 'stock' }, revision: 7 })
    form.resolveWrite?.(true)
    expect(await commit).toBe(true)
    const snapshot = runtime.getSnapshot()
    expect(snapshot.confirmedId).toBe('stock')
    expect(snapshot.effectiveId).toBe('stock')
    expect(snapshot.writing).toBe(false)
    expect(snapshot.writeFailure).toBeUndefined()
    expect(snapshot.notes).toContain('newer host configuration superseded the in-flight settings write')
  })

  it('refuses a stock apply whose write was superseded by a newer host style', async () => {
    const form = new DeferredForm({ status: 'ready', value: { skinId: 'fjord' }, revision: 1, writable: true, mode: 'host' })
    const harness = createHarness({ form })
    harness.runtime.start()
    await flush()
    const apply = harness.runtime.applyStyle('stock')
    await flush()
    form.update({ value: { skinId: 'midnight' }, revision: 7 })
    form.resolveWrite?.(true)
    expect(await apply).toEqual({ ok: false, failure: 'refused' })
    expect(harness.runtime.getSnapshot().confirmedId).toBe('midnight')
  })

  it('lets a same-id host update without revision supersede an in-flight write', async () => {
    const { runtime, form } = await settlePreview()
    const commit = runtime.commitPreview()
    form.update({ value: { skinId: 'fjord' }, revision: undefined })
    form.resolveWrite?.(true)
    expect(await commit).toBe(true)
    const snapshot = runtime.getSnapshot()
    expect(snapshot.confirmedId).toBe('fjord')
    expect(snapshot.effectiveId).toBe('fjord')
    expect(snapshot.writing).toBe(false)
  })

  it('treats a same-target observation as a normal roll-forward, not a silent echo', async () => {
    const { runtime, form } = await settlePreview()
    const commit = runtime.commitPreview()
    form.update({ value: { skinId: 'midnight' }, revision: undefined })
    form.resolveWrite?.(true)
    expect(await commit).toBe(true)
    expect(runtime.getSnapshot().confirmedId).toBe('midnight')
    expect(runtime.getSnapshot().effectiveId).toBe('midnight')
  })

  it('rolls a failed older write back to the newest confirmed revision, not a stale one', async () => {
    const { runtime, form } = await settlePreview()
    const commit = runtime.commitPreview()
    form.update({ value: { skinId: 'stock' }, revision: 9 })
    form.resolveWrite?.(false)
    expect(await commit).toBe(false)
    const snapshot = runtime.getSnapshot()
    expect(snapshot.confirmedId).toBe('stock')
    expect(snapshot.effectiveId).toBe('stock')
    expect(snapshot.writing).toBe(false)
    expect(snapshot.writeFailure).toBeUndefined()
  })
})
