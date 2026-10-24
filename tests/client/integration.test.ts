/**
 * Cross-module integration checks against the REAL generated catalog and
 * compiler output. These are the seams where client/runtime assumptions can
 * drift from the compiler and host without any single-module test noticing:
 *
 * - `CompiledLivery.cssHash` must be the hash of exactly the stylesheet bytes
 *   `styleTextOf` concatenates (that hash is the adoption key);
 * - the served catalog envelope must pass the client handshake validator;
 * - adoption with the real values must take the zero-CSS-write path;
 * - the preview filename convention the client derives must match the files the
 *   compiler generated;
 * - every tag id in the catalog must have a localized label in both locales.
 */
import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOG_META, LIVERIES } from '../../src/generated/liveries.js'
import { CONTRACT_HASH } from '../../src/generated/contract.js'
import { ADAPTER_ID, DSH_VERSION, ENTRY_ID, LIVERY_VERSION, SCHEMA_VERSION } from '../../src/core/types.js'
import { findLivery, liveryCssHash, styleTextOf, renderBootCssFromCatalog } from '../../src/core/catalog.js'
import { hashCss } from '../../src/core/render.js'
import { validateCatalog } from '../../src/client/handshake.js'
import { checkBoot } from '../../src/client/handshake.js'
import { createLiveryRuntime } from '../../src/client/runtime.js'
import type { CoreApi } from '../../src/client/runtime.js'
import { liveryAvailability, previewFileName } from '../../src/client/model.js'
import { dictionaries } from '../../src/i18n/index.js'
import { makeBootPayload, FakeConfigForm, FakeDocument, FakeLocale, FakeTheme, RecordingPresenter, flush } from './fixtures.js'
import type { LiveryCatalog } from '../../src/core/types.js'

const IDENTITY = {
  adapterId: ADAPTER_ID,
  contractHash: CONTRACT_HASH,
  pluginVersion: LIVERY_VERSION,
  entryId: ENTRY_ID,
}

const CATALOG: LiveryCatalog = {
  schemaVersion: SCHEMA_VERSION,
  compilerVersion: LIVERY_VERSION,
  adapterId: ADAPTER_ID,
  hostVersion: DSH_VERSION,
  contractHash: CATALOG_META.contractHash,
  capabilities: CATALOG_META.capabilities,
  liveries: LIVERIES,
}

const REAL_CORE: CoreApi = { styleTextOf, liveryCssHash, findLivery }

describe('generated catalog contract', () => {
  it('ships ten compiled liveries', () => {
    expect(LIVERIES.length).toBe(10)
    expect(new Set(LIVERIES.map(livery => livery.id)).size).toBe(10)
  })

  it('derives cssHash from the exact style text the client concatenates', () => {
    for (const livery of LIVERIES) {
      const text = styleTextOf(livery)
      expect(text.length, livery.id).toBeGreaterThan(0)
      expect(hashCss(text), livery.id).toBe(livery.cssHash)
      expect(liveryCssHash(livery), livery.id).toBe(livery.cssHash)
    }
  })

  it('matches the host boot helper byte for byte', () => {
    for (const livery of LIVERIES) {
      const boot = renderBootCssFromCatalog(CATALOG, livery.id)
      expect(boot.css).toBe(styleTextOf(livery))
      expect(boot.hash).toBe(livery.cssHash)
    }
    expect(renderBootCssFromCatalog(CATALOG, 'stock')).toEqual({ css: '', hash: '' })
  })

  it('stays inside the per-livery CSS budget (hard cap 12KB)', () => {
    for (const livery of LIVERIES) {
      expect(new TextEncoder().encode(styleTextOf(livery)).length, livery.id).toBeLessThanOrEqual(12 * 1024)
    }
  })

  it('passes the client catalog handshake validator', () => {
    expect(CATALOG_META.contractHash).toBe(CONTRACT_HASH)
    expect(CATALOG_META.adapterId).toBe(ADAPTER_ID)
    expect(validateCatalog(CATALOG, IDENTITY)).toBe(CATALOG)
  })

  it('publishes a capability map that makes every livery applicable', () => {
    for (const livery of LIVERIES) {
      const availability = liveryAvailability(livery, CATALOG_META.capabilities)
      expect(availability.applicable, livery.id).toBe(true)
    }
  })

  it('has a preview image for every livery x locale x mode the client derives', () => {
    const missing: string[] = []
    for (const livery of LIVERIES) {
      for (const locale of ['zh', 'en'] as const) {
        for (const mode of ['light', 'dark'] as const) {
          const file = join(process.cwd(), 'lib', 'previews', previewFileName(livery.id, locale, mode))
          if (!existsSync(file)) missing.push(previewFileName(livery.id, locale, mode))
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('localizes every tag id used by the catalog in both shipped dictionaries', () => {
    const tags = new Set(LIVERIES.flatMap(livery => [...livery.meta.tags]))
    const missing: string[] = []
    for (const tag of tags) {
      const key = `tag.${tag}`
      if (!(key in dictionaries.en) || !(key in dictionaries.zh)) missing.push(tag)
    }
    expect(missing).toEqual([])
  })
})

describe('real catalog through the runtime', () => {
  function readyHarness(skinId: string): {
    runtime: ReturnType<typeof createLiveryRuntime>
    presenter: RecordingPresenter
    form: FakeConfigForm
  } {
    const presenter = new RecordingPresenter()
    const form = new FakeConfigForm({
      status: 'ready',
      value: { skinId },
      revision: 1,
      writable: true,
      mode: 'host',
    })
    const runtime = createLiveryRuntime({
      boot: checkBoot(makeBootPayload({ contractHash: CONTRACT_HASH, accepted: false, skinId: 'stock', cssHash: '' }), IDENTITY),
      identity: { adapterId: ADAPTER_ID, contractHash: CONTRACT_HASH, pluginVersion: LIVERY_VERSION, hostVersion: DSH_VERSION },
      entryId: ENTRY_ID,
      configForms: { get: () => form },
      presenter,
      core: REAL_CORE,
      fetchCatalog: async () => CATALOG,
      locale: new FakeLocale('en'),
      theme: new FakeTheme(),
      document: new FakeDocument().asDocument(),
    })
    runtime.start()
    return { runtime, presenter, form }
  }

  it('adopts a matching real first frame with zero CSS-text writes', async () => {
    const livery = LIVERIES[0]!
    const hash = liveryCssHash(livery)
    const doc = new FakeDocument()
    const bootStyle = doc.createElement('style')
    bootStyle.id = 'dsh-livery-boot'
    bootStyle.textContent = styleTextOf(livery)
    bootStyle.setAttribute('data-plugin', 'dsh-livery')
    bootStyle.setAttribute('data-dsh-livery-hash', hash)
    doc.head.appendChild(bootStyle)
    doc.body.setAttribute('data-dsh-livery', livery.id)
    doc.body.setAttribute('data-dsh-livery-hash', hash)

    const presenter = new RecordingPresenter()
    const form = new FakeConfigForm({
      status: 'ready', value: { skinId: livery.id }, revision: 1, writable: true, mode: 'host',
    })
    const runtime = createLiveryRuntime({
      boot: checkBoot(makeBootPayload({ contractHash: CONTRACT_HASH, accepted: true, skinId: livery.id, cssHash: hash }), IDENTITY),
      identity: { adapterId: ADAPTER_ID, contractHash: CONTRACT_HASH, pluginVersion: LIVERY_VERSION, hostVersion: DSH_VERSION },
      entryId: ENTRY_ID,
      configForms: { get: () => form },
      presenter,
      core: REAL_CORE,
      fetchCatalog: async () => CATALOG,
      locale: new FakeLocale('en'),
      theme: new FakeTheme(),
      document: doc.asDocument(),
    })
    runtime.start()
    await flush()

    const snapshot = runtime.getSnapshot()
    expect(snapshot.phase).toBe('ready')
    expect(snapshot.effectiveId).toBe(livery.id)
    expect(snapshot.effectiveId).toBe(snapshot.confirmedId)
    expect(presenter.count('adoptBootStyle')).toBe(1)
    expect(presenter.count('applyConfirmed')).toBe(0)
    expect(presenter.snapshot().cssTextWrites).toBe(0)
    expect(snapshot.bootStatus).toBe('valid')
  })

  it('applies real compiled CSS in a single batch when no boot rows exist', async () => {
    const { runtime, presenter } = readyHarness(LIVERIES[0]!.id)
    await flush()

    const livery = LIVERIES[0]!
    expect(runtime.getSnapshot().phase).toBe('ready')
    expect(presenter.count('applyConfirmed')).toBe(1)
    expect(presenter.skins[0]?.skin).toEqual({
      id: livery.id,
      cssText: styleTextOf(livery),
      hash: livery.cssHash,
    })
  })

  it('previews and commits a real livery with one write', async () => {
    const { runtime, presenter, form } = readyHarness(LIVERIES[0]!.id)
    await flush()
    const target = LIVERIES[1]!

    expect(runtime.preview(target.id)).toBe(true)
    expect(presenter.skins.at(-1)).toEqual({
      call: 'applyPreview',
      skin: { id: target.id, cssText: styleTextOf(target), hash: target.cssHash },
    })

    expect(await runtime.commitPreview()).toBe(true)
    expect(form.writes).toEqual([{ field: 'skinId', value: target.id }])
    expect(runtime.getSnapshot().effectiveId).toBe(target.id)
  })
})
