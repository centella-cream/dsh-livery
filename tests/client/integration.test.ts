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
import { ADAPTERS, ADAPTER_IDENTITIES, SUPPORTED_HOST_VERSIONS } from '../../src/generated/contract.js'
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
  it('certifies the shipped formal-matrix builds and nothing else', () => {
    const shippedVersions = [...new Set(ADAPTER_IDENTITIES.map(identity => identity.hostVersion))]
    expect(shippedVersions.length).toBeGreaterThan(0)
    expect([...SUPPORTED_HOST_VERSIONS]).toEqual(shippedVersions)
    expect(ADAPTER_IDENTITIES).toHaveLength(ADAPTERS.length)
    for (const identity of ADAPTER_IDENTITIES) {
      expect(ADAPTERS.some(adapter => adapter.adapterId === identity.adapterId
        && adapter.contractHash === identity.contractHash
        && adapter.hostVersion === identity.hostVersion
        && adapter.catalogProfile === identity.catalogProfile)).toBe(true)
    }
    const shippedProfiles = [...new Set(ADAPTER_IDENTITIES.map(identity => identity.catalogProfile))]
    expect(new Set(CATALOG_PROFILE_IDS)).toEqual(new Set(shippedProfiles))
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
  it('generates exactly the profiles the shipped adapters reference', () => {
    const shippedProfiles = [...new Set(ADAPTERS.map(adapter => adapter.catalogProfile))]
    expect(shippedProfiles.length).toBeGreaterThan(0)
    expect([...CATALOG_PROFILE_IDS].sort()).toEqual([...shippedProfiles].sort())
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

  it('renders the same CSS for every adapter that shares a profile', () => {
    const groups = new Map<string, typeof ADAPTERS[number][]>()
    for (const adapter of ADAPTERS) {
      const group = groups.get(adapter.catalogProfile) ?? []
      group.push(adapter)
      groups.set(adapter.catalogProfile, group)
    }
    for (const [profile, adapters] of groups) {
      const rendered = adapters.map(adapter => catalogFor(adapter).liveries.map(livery => [livery.id, livery.cssHash]))
      for (const candidate of rendered) expect(candidate, profile).toEqual(rendered[0])
      expect(CATALOG_PROFILES[profile]!.liveries.map(livery => [livery.id, livery.cssHash])).toEqual(rendered[0])
    }
  })

  it('uses the capability-driven typography strategy per profile (no version logic)', () => {
    for (const adapter of ADAPTERS) {
      const profile = profileFor(adapter)
      const typography = profile.liveries[0]!.css.typography
      const roleHooks = adapter.capabilities['host-font-role-hooks']?.available === true
      if (roleHooks) {
        // Documented per-role font hooks only.
        expect(typography, adapter.hostVersion).toContain('--dsh-font-family-text')
        expect(typography, adapter.hostVersion).toContain('--dsh-font-family-code')
        expect(/--dsw-font-family\s*:/.test(typography), adapter.hostVersion).toBe(false)
      } else {
        // Composite --dsw-font-family override strategy.
        expect(/--dsw-font-family\s*:/.test(typography), adapter.hostVersion).toBe(true)
        expect(typography, adapter.hostVersion).not.toContain('--dsh-font-family-text')
      }
    }
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

  it('rejects a catalog that does not describe the expected host identity', () => {
    const shipped = ADAPTERS[0]!
    const expected = {
      hostVersion: '0.3.0-rc.1',
      adapterId: 'dsh-compat',
      contractHash: shipped.contractHash,
      catalogProfile: shipped.catalogProfile,
    }
    const check = checkCatalog(catalogFor(shipped), { adapters: ADAPTER_IDENTITIES, expected })
    expect(check.catalog).toBeUndefined()
    expect(check.reasons.join(' ')).toContain('does not describe the host build')
  })

  it('rejects a catalog whose previewsBase is not profile-scoped', () => {
    const catalog = catalogFor(ADAPTERS[0]!)
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

  it('exposes host-font-role-hooks consistently with the shipped capability facts', () => {
    for (const adapter of ADAPTERS) {
      const facts = adapter.capabilities['host-font-role-hooks']
      expect(facts, adapter.hostVersion).toBeDefined()
      // The shipped 0.2.1 build documents per-role font hooks.
      expect(facts?.available, adapter.hostVersion).toBe(true)
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
