/**
 * Cross-module integration checks against the REAL generated artifacts.
 *
 * These are the seams where client assumptions can drift from the compiler and
 * host without any single-module test noticing:
 *
 * - every certified adapter must have a generated catalog profile; adapters
 *   sharing a profile must receive byte-identical CSS, and different profiles
 *   must differ (the 0.2.1 font-role-hook strategy vs the 0.2.0 token strategy);
 * - every livery's `cssHash` must be the hash of exactly the stylesheet bytes
 *   `styleTextOf` concatenates (that hash is the zero-write adoption key);
 * - the per-adapter catalog envelope the host serves must pass the client
 *   handshake validator, and a catalog from another certified host must not;
 * - preview assets exist under the profile-scoped directory the catalog's
 *   `previewsBase` points at;
 * - the real acquisition path (boot payload + catalog + runtime) works for
 *   every certified adapter, not just 0.2.0-rc.2.
 */
import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOG_PROFILES, CATALOG_PROFILE_IDS } from '../../src/generated/liveries.js'
import type { CatalogProfile } from '../../src/generated/liveries.js'
import { ADAPTERS, ADAPTER_IDENTITIES } from '../../src/generated/contract.js'
import type { AdapterIdentity, AdapterRecord } from '../../src/generated/contract.js'
import type { BootPayload, CompiledLivery, LiveryCatalog } from '../../src/core/types.js'
import { LIVERY_VERSION, SCHEMA_VERSION } from '../../src/core/types.js'
import { findLivery, liveryCssHash, renderBootCssFromCatalog, styleTextOf } from '../../src/core/catalog.js'
import { hashCss } from '../../src/core/render.js'
import { bootIdentity, checkBoot, checkCatalog, expectedPreviewsBase } from '../../src/client/handshake.js'
import { createLiveryRuntime } from '../../src/client/runtime.js'
import type { CoreApi } from '../../src/client/runtime.js'
import { liveryAvailability, missingContractCapabilities, previewFileName, previewUrl } from '../../src/client/model.js'
import { dictionaries } from '../../src/i18n/index.js'
import {
  ADAPTER_020,
  ADAPTER_021_2,
  adapterRecordOf,
  FakeConfigForm,
  FakeDocument,
  FakeLocale,
  FakeTheme,
  RecordingPresenter,
  TEST_ADAPTER,
  flush,
  makeBootPayload,
} from './fixtures.js'

const REAL_CORE: CoreApi = { styleTextOf, liveryCssHash, findLivery }

const ALL_PROFILES: readonly CatalogProfile[] = CATALOG_PROFILE_IDS.map(id => CATALOG_PROFILES[id]!)

/** Generated profile one certified adapter is served from. */
function profileFor(adapter: AdapterIdentity | AdapterRecord): CatalogProfile {
  const profile = CATALOG_PROFILES[adapter.catalogProfile]
  if (profile === undefined) throw new Error(`no generated profile for ${adapter.hostVersion}`)
  return profile
}

/** Catalog the host serves for one certified adapter (profile-scoped). */
function catalogFor(adapter: AdapterRecord): LiveryCatalog {
  const profile = profileFor(adapter)
  return {
    schemaVersion: SCHEMA_VERSION,
    compilerVersion: LIVERY_VERSION,
    adapterId: adapter.adapterId,
    hostVersion: adapter.hostVersion,
    contractHash: adapter.contractHash,
    catalogProfile: adapter.catalogProfile,
    capabilities: adapter.capabilities,
    previewsBase: expectedPreviewsBase(adapter.catalogProfile),
    liveries: [...profile.liveries],
  }
}

/** First-frame payload a certified host would inject for one adapter + skin. */
function bootFor(adapter: AdapterIdentity, skinId = 'fjord', cssHash = ''): BootPayload {
  return makeBootPayload({
    adapterId: adapter.adapterId,
    hostVersion: adapter.hostVersion,
    contractHash: adapter.contractHash,
    catalogProfile: adapter.catalogProfile,
    skinId,
    cssHash,
  })
}

/** Livery count per generated profile (compiler-owned; tests derive, never assume). */
const LIVERY_COUNT = ALL_PROFILES[0]?.liveries.length ?? 0

function allGeneratedLiveries(): readonly CompiledLivery[] {
  return ALL_PROFILES.flatMap(profile => [...profile.liveries])
}

describe('certified adapter registry', () => {
  it('certifies exactly the three supported host builds', () => {
    expect(ADAPTERS.map(adapter => adapter.hostVersion)).toEqual(['0.2.0-rc.2', '0.2.1-rc.2', '0.2.1-rc.3'])
    expect(ADAPTER_IDENTITIES).toHaveLength(ADAPTERS.length)
    for (const identity of ADAPTER_IDENTITIES) {
      expect(ADAPTERS.some(adapter => adapter.adapterId === identity.adapterId
        && adapter.contractHash === identity.contractHash
        && adapter.hostVersion === identity.hostVersion
        && adapter.catalogProfile === identity.catalogProfile)).toBe(true)
    }
  })

  it('shares one catalog profile between the two render-equivalent 0.2.1 hosts', () => {
    expect(ADAPTER_020.catalogProfile).not.toBe(ADAPTER_021_2.catalogProfile)
    expect(ADAPTER_021_2.catalogProfile).toBe(ADAPTER_IDENTITIES[2]!.catalogProfile)
  })

  it('seeds every platform module the client bundle requires', () => {
    const required = [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-client-store',
      '@deepseek-ai/dsh-client-ui-slots',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-client-ui-dockkit',
    ]
    for (const adapter of ADAPTERS) {
      for (const module of required) {
        expect(adapter.platformModules, `${adapter.hostVersion} seeds ${module}`).toContain(module)
      }
    }
  })
})

describe('generated catalog profiles', () => {
  it('generates exactly the two expected profiles', () => {
    expect(CATALOG_PROFILE_IDS).toHaveLength(2)
    expect(new Set(Object.keys(CATALOG_PROFILES))).toEqual(new Set(CATALOG_PROFILE_IDS))
  })

  it('has a generated profile for every certified adapter', () => {
    for (const adapter of ADAPTERS) {
      const profile = profileFor(adapter)
      expect(profile.profileId, adapter.hostVersion).toBe(adapter.catalogProfile)
      expect(profile.sourceAdapters, adapter.hostVersion).toContain(adapter.hostVersion)
    }
  })

  it('compiles every profile with the same non-empty set of distinct liveries', () => {
    const expected = ALL_PROFILES[0]!.liveries.length
    expect(expected).toBeGreaterThan(0)
    // The catalog size is compiler-owned; the client derives it, never hardcodes it.
    for (const profile of ALL_PROFILES) {
      expect(profile.liveries.length, profile.profileId).toBe(expected)
      expect(new Set(profile.liveries.map(livery => livery.id)).size, profile.profileId).toBe(expected)
    }
    expect(LIVERY_COUNT).toBe(expected)
  })

  it('derives cssHash from the exact style text the client concatenates', () => {
    const liveries = allGeneratedLiveries()
    expect(liveries.length).toBe(LIVERY_COUNT * ALL_PROFILES.length)
    for (const livery of liveries) {
      const text = styleTextOf(livery)
      expect(text.length, livery.id).toBeGreaterThan(0)
      expect(hashCss(text), livery.id).toBe(livery.cssHash)
      expect(liveryCssHash(livery), livery.id).toBe(livery.cssHash)
    }
  })

  it('matches the host boot helper byte for byte for every profile', () => {
    for (const adapter of ADAPTERS) {
      const catalog = catalogFor(adapter)
      for (const livery of catalog.liveries) {
        const boot = renderBootCssFromCatalog(catalog, livery.id)
        expect(boot.css, `${adapter.hostVersion}/${livery.id}`).toBe(styleTextOf(livery))
        expect(boot.hash, `${adapter.hostVersion}/${livery.id}`).toBe(livery.cssHash)
      }
      expect(renderBootCssFromCatalog(catalog, 'stock')).toEqual({ css: '', hash: '' })
    }
  })

  it('renders byte-identical CSS for adapters that share a profile', () => {
    const two = ADAPTERS[1]!
    const three = ADAPTERS[2]!
    expect(two.catalogProfile).toBe(three.catalogProfile)
    const a = catalogFor(two)
    const b = catalogFor(three)
    expect(a.liveries.map(livery => [livery.id, livery.cssHash]))
      .toEqual(b.liveries.map(livery => [livery.id, livery.cssHash]))
  })

  it('uses the capability-driven typography strategy per profile (no version logic)', () => {
    const older = profileFor(adapterRecordOf(ADAPTER_020))
    const newer = profileFor(adapterRecordOf(ADAPTER_021_2))
    const olderTypography = older.liveries[0]!.css.typography
    const newerTypography = newer.liveries[0]!.css.typography
    // 0.2.0-rc.2: composite --dsw-font-family override strategy.
    expect(/--dsw-font-family\s*:/.test(olderTypography)).toBe(true)
    expect(olderTypography).not.toContain('--dsh-font-family-text')
    // 0.2.1+: documented per-role font hooks only.
    expect(newerTypography).toContain('--dsh-font-family-text')
    expect(newerTypography).toContain('--dsh-font-family-code')
    expect(/--dsw-font-family\s*:/.test(newerTypography)).toBe(false)
    expect(older.liveries[0]!.cssHash).not.toBe(newer.liveries[0]!.cssHash)
  })

  it('stays inside the per-livery CSS hard cap (12KB)', () => {
    for (const livery of allGeneratedLiveries()) {
      expect(new TextEncoder().encode(styleTextOf(livery)).length, livery.id).toBeLessThanOrEqual(12 * 1024)
    }
  })

  it('has profile-scoped preview images for every derived URL', () => {
    const missing: string[] = []
    let checked = 0
    for (const adapter of ADAPTERS) {
      const catalog = catalogFor(adapter)
      for (const livery of catalog.liveries) {
        for (const locale of ['zh', 'en'] as const) {
          for (const mode of ['light', 'dark'] as const) {
            const fileName = previewFileName(livery.id, locale, mode)
            const file = join(process.cwd(), 'lib', 'previews', catalog.catalogProfile, fileName)
            if (!existsSync(file)) missing.push(`${catalog.catalogProfile}/${fileName}`)
            const url = previewUrl(catalog.previewsBase, livery.id, locale, mode)
            expect(url).toBe(`${catalog.previewsBase}${fileName}`)
            expect(url.startsWith(`/livery/assets/previews/${catalog.catalogProfile}/`)).toBe(true)
            checked += 1
          }
        }
      }
    }
    expect(missing).toEqual([])
    // Every certified adapter serves its profile's liveries x 4 locale/mode files.
    expect(checked).toBe(ADAPTERS.length * LIVERY_COUNT * 4)
  })

  it('localizes every tag id used by any profile in both shipped dictionaries', () => {
    const tags = new Set(allGeneratedLiveries().flatMap(livery => [...livery.meta.tags]))
    const missing: string[] = []
    for (const tag of tags) {
      const key = `tag.${tag}`
      if (!(key in dictionaries.en) || !(key in dictionaries.zh)) missing.push(`tag.${tag}`)
    }
    expect(missing).toEqual([])
  })
})

describe('per-adapter handshake + catalog identity', () => {
  it('accepts every certified adapter boot triple', () => {
    for (const adapter of ADAPTER_IDENTITIES) {
      const check = checkBoot(bootFor(adapter), ADAPTER_IDENTITIES)
      expect(check.kind, adapter.hostVersion).toBe('valid')
      expect(check.adapter, adapter.hostVersion).toBe(adapter)
    }
  })

  it('accepts the per-adapter served catalog envelope', () => {
    for (const adapter of ADAPTERS) {
      const boot = checkBoot(bootFor(adapter), ADAPTER_IDENTITIES)
      const expected = bootIdentity(boot)
      expect(expected?.catalogProfile).toBe(adapter.catalogProfile)
      const check = checkCatalog(catalogFor(adapter), { adapters: ADAPTER_IDENTITIES, expected })
      expect(check.catalog, adapter.hostVersion).toBeDefined()
      expect(check.reasons, adapter.hostVersion).toEqual([])
    }
  })

  it('rejects a catalog served for another certified host', () => {
    const expected = bootIdentity(checkBoot(bootFor(ADAPTER_020), ADAPTER_IDENTITIES))
    const foreign = catalogFor(ADAPTERS[2]!)
    const check = checkCatalog(foreign, { adapters: ADAPTER_IDENTITIES, expected })
    expect(check.catalog).toBeUndefined()
    expect(check.reasons.join(' ')).toContain('does not describe the host build')
  })

  it('rejects a catalog whose previewsBase is not profile-scoped', () => {
    const catalog = catalogFor(adapterRecordOf(ADAPTER_020))
    const check = checkCatalog({ ...catalog, previewsBase: '/livery/assets/previews/' }, { adapters: ADAPTER_IDENTITIES })
    expect(check.catalog).toBeUndefined()
    expect(check.reasons.join(' ')).toContain('previewsBase')
  })

  it('decides applicability from the catalog capability map, not a version string', () => {
    for (const adapter of ADAPTERS) {
      expect(missingContractCapabilities(adapter.capabilities)).toEqual([])
      for (const livery of catalogFor(adapter).liveries) {
        const availability = liveryAvailability(livery, adapter.capabilities)
        expect(availability.applicable, `${adapter.hostVersion}/${livery.id}`).toBe(true)
      }
    }
  })

  it('exposes host-font-role-hooks on 0.2.1 and not on 0.2.0-rc.2', () => {
    expect(adapterRecordOf(ADAPTER_020).capabilities['host-font-role-hooks']?.available).toBe(false)
    for (const adapter of ADAPTERS.filter(candidate => candidate.hostVersion.startsWith('0.2.1'))) {
      expect(adapter.capabilities['host-font-role-hooks']?.available, adapter.hostVersion).toBe(true)
    }
  })
})

describe('real acquisition path per certified adapter', () => {
  function adoptHarness(adapter: AdapterRecord, livery: CompiledLivery): {
    phase(): string
    effectiveId(): string | undefined
    adoptCalls(): number
    confirmCalls(): number
    cssWrites(): number
    catalogProfile(): string | undefined
    identityAdapter(): string
  } {
    const catalog = catalogFor(adapter)
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
      boot: checkBoot(bootFor(adapter, livery.id, hash), ADAPTER_IDENTITIES),
      identity: {
        adapterId: adapter.adapterId,
        contractHash: adapter.contractHash,
        pluginVersion: LIVERY_VERSION,
        hostVersion: adapter.hostVersion,
      },
      entryId: 'livery',
      configForms: { get: () => form },
      presenter,
      core: REAL_CORE,
      fetchCatalog: async () => catalog,
      locale: new FakeLocale('en'),
      theme: new FakeTheme(),
      document: doc.asDocument(),
    })
    runtime.start()
    return {
      phase: () => runtime.getSnapshot().phase,
      effectiveId: () => runtime.getSnapshot().effectiveId,
      adoptCalls: () => presenter.count('adoptBootStyle'),
      confirmCalls: () => presenter.count('applyConfirmed'),
      cssWrites: () => presenter.snapshot().cssTextWrites,
      catalogProfile: () => runtime.getSnapshot().catalogProfile,
      identityAdapter: () => runtime.getSnapshot().identity.adapterId,
    }
  }

  it('adopts the matching first frame with zero CSS writes on every certified adapter', async () => {
    for (const adapter of ADAPTERS) {
      const catalog = catalogFor(adapter)
      const livery = catalog.liveries[0]!
      const result = adoptHarness(adapter, livery)
      await flush()
      expect(result.phase(), adapter.hostVersion).toBe('ready')
      expect(result.effectiveId(), adapter.hostVersion).toBe(livery.id)
      expect(result.adoptCalls(), adapter.hostVersion).toBe(1)
      expect(result.confirmCalls(), adapter.hostVersion).toBe(0)
      expect(result.cssWrites(), adapter.hostVersion).toBe(0)
      expect(result.catalogProfile(), adapter.hostVersion).toBe(adapter.catalogProfile)
      expect(result.identityAdapter(), adapter.hostVersion).toBe(adapter.adapterId)
    }
  })

  it('keeps the certified 0.2.0-rc.2 acquisition result unchanged', async () => {
    const adapter = adapterRecordOf(TEST_ADAPTER)
    const catalog = catalogFor(adapter)
    const livery = catalog.liveries[0]!
    const result = adoptHarness(adapter, livery)
    await flush()
    expect(result.phase()).toBe('ready')
    expect(result.effectiveId()).toBe(livery.id)
    expect(result.adoptCalls()).toBe(1)
    expect(result.cssWrites()).toBe(0)
  })
})
