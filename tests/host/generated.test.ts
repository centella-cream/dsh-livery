/**
 * Integration tests against the *real* generated multi-adapter registry and the
 * *real* compiled catalog profiles.
 *
 * Skipped while `src/generated/liveries.ts` is still the single-catalog
 * placeholder (no `CATALOG_PROFILES`); it turns on as soon as the multi-profile
 * compiler has run. These tests prove the multi-version contract end to end —
 * gate acceptance per certified adapter, hash equality per catalog profile,
 * per-profile preview serving — so they must never be weakened to make a
 * placeholder build pass.
 */

import { describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  ADAPTERS,
  SUPPORTED_HOST_VERSIONS,
  adapterForContractHash,
  adapterForVersion,
} from '../../src/generated/contract.js'
import { CATALOG_PROFILES, CATALOG_PROFILE_IDS } from '../../src/generated/liveries.js'
import {
  bindPreviews,
  bindProfilePreviews,
  buildCatalog,
  previewsBaseFor,
} from '../../src/host/catalog.js'
import { computeBootState } from '../../src/host/boot.js'
import {
  createCatalogHandler,
  createPreviewHandler,
  type LiveryRouteHandler,
} from '../../src/host/routes.js'
import { hashCss } from '../../src/core/render.js'
import { CATALOG_ROUTE, PREVIEW_ROUTE_PREFIX, STOCK_ID } from '../../src/core/types.js'
import { FakeResponse, fakeRequest } from './fixtures.js'

/** Whether the generated artifacts are a compiled multi-profile catalog. */
const COMPILED = ADAPTERS.length > 0
  && CATALOG_PROFILE_IDS.length > 0
  && ADAPTERS.every((adapter) => CATALOG_PROFILES[adapter.catalogProfile] !== undefined)

/**
 * Liveries each catalog profile ships, read from the emitted catalog instead of
 * hardcoding a round's design count (10 in round 4, 24 after the style-system
 * round). Every profile must agree; the count is asserted per profile below.
 */
const LIVERIES_PER_PROFILE = CATALOG_PROFILES[CATALOG_PROFILE_IDS[0] ?? '']?.liveries.length ?? 0

/**
 * Preview files each profile ships: four deterministic previews per livery
 * (zh/en × light/dark). Derived so a catalog-count change needs no test edit.
 */
const PREVIEWS_PER_PROFILE = LIVERIES_PER_PROFILE * 4

/** Module URL of the built host bundle; preview indexes are resolved from there. */
const BUILT_MODULE_URL = new URL('../../lib/index.js', import.meta.url)

/** Every profile's preview whitelist, bound from the real generated indexes. */
const REAL_PREVIEWS = bindProfilePreviews({ moduleUrl: BUILT_MODULE_URL })

/** The nine platform modules the Livery client bundle requires from the loader. */
const REQUIRED_PLATFORM_MODULES = [
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

/**
 * Run one route handler against recording fakes.
 * @param handler - route handler.
 * @param method - HTTP method.
 * @param url - request target.
 * @returns the recording response.
 */
async function invoke(
  handler: LiveryRouteHandler,
  method: string,
  url: string,
): Promise<FakeResponse> {
  const response = new FakeResponse()
  await handler(
    fakeRequest(method, url) as unknown as IncomingMessage,
    response as unknown as ServerResponse,
  )
  return response
}

/**
 * Boot state for one generated livery through the *production* registry path.
 * @param hostVersion - exact host version to simulate.
 * @param skinId - configured skin id.
 * @returns the gate result.
 */
function realBootState(hostVersion: string, skinId: string) {
  return computeBootState({
    skinId,
    profileKind: 'web',
    observedHostVersion: hostVersion,
  })
}

describe.skipIf(!COMPILED)('generated adapter registry', () => {
  it('certifies exactly the three supported exact versions', () => {
    expect(ADAPTERS.map((adapter) => adapter.hostVersion)).toEqual([
      '0.2.0-rc.2',
      '0.2.1-rc.2',
      '0.2.1-rc.3',
    ])
    expect(SUPPORTED_HOST_VERSIONS).toEqual(ADAPTERS.map((adapter) => adapter.hostVersion))
    for (const adapter of ADAPTERS) {
      expect(adapterForVersion(adapter.hostVersion)).toEqual(adapter)
      expect(adapterForContractHash(adapter.contractHash)).toEqual(adapter)
    }
    expect(adapterForVersion(undefined)).toBeUndefined()
    expect(adapterForContractHash(undefined)).toBeUndefined()
    expect(adapterForVersion('9.9.9')).toBeUndefined()
  })

  it('gives each adapter a distinct identity and the certified platform modules', () => {
    const adapterIds = ADAPTERS.map((adapter) => adapter.adapterId)
    const contractHashes = ADAPTERS.map((adapter) => adapter.contractHash)
    expect(new Set(adapterIds).size).toBe(ADAPTERS.length)
    expect(new Set(contractHashes).size).toBe(ADAPTERS.length)
    for (const adapter of ADAPTERS) {
      expect(adapter.adapterId).toBe(`dsh-${adapter.hostVersion}-r1`)
      for (const module of REQUIRED_PLATFORM_MODULES) {
        expect(adapter.platformModules, `${adapter.hostVersion} seeds ${module}`).toContain(module)
      }
      expect(adapter.capabilities['theme-css']?.available).toBe(true)
      expect(adapter.capabilities['host-font-family']?.available).toBe(true)
    }
    // 0.2.1 changed the loader ABI table; it adds modules rather than replacing them.
    const legacy = adapterForVersion('0.2.0-rc.2')
    const modern = adapterForVersion('0.2.1-rc.2')
    expect(legacy?.platformModules).not.toContain('zod')
    expect(modern?.platformModules).toContain('zod')
  })

  it('shares one catalog profile between the render-equivalent 0.2.1 builds only', () => {
    const legacy = adapterForVersion('0.2.0-rc.2')
    const web = adapterForVersion('0.2.1-rc.2')
    const desktop = adapterForVersion('0.2.1-rc.3')
    expect(web?.catalogProfile).toBe(desktop?.catalogProfile)
    expect(web?.catalogProfile).not.toBe(legacy?.catalogProfile)
    expect(web?.capabilities['host-font-role-hooks']?.available).toBe(true)
    expect(desktop?.capabilities['host-font-role-hooks']?.available).toBe(true)
    expect(legacy?.capabilities['host-font-role-hooks']?.available).toBe(false)
  })

  it('gives every adapter a catalog profile with a full preview set', () => {
    expect(LIVERIES_PER_PROFILE).toBeGreaterThan(0)
    for (const adapter of ADAPTERS) {
      const profile = CATALOG_PROFILES[adapter.catalogProfile]
      expect(profile, adapter.catalogProfile).toBeDefined()
      // One design count per profile: every compiled set is complete, not partial.
      expect(profile?.liveries.length, adapter.catalogProfile).toBe(LIVERIES_PER_PROFILE)
      expect(REAL_PREVIEWS.get(adapter.catalogProfile)?.size).toBe(PREVIEWS_PER_PROFILE)
    }
    expect([...REAL_PREVIEWS.keys()].sort()).toEqual([...CATALOG_PROFILE_IDS].sort())
  })
})

describe.skipIf(!COMPILED)('generated catalog per adapter', () => {
  it('assembles the served catalog from the adapter record', () => {
    for (const adapter of ADAPTERS) {
      const catalog = buildCatalog(adapter)
      const profile = CATALOG_PROFILES[adapter.catalogProfile]
      expect(catalog.adapterId).toBe(adapter.adapterId)
      expect(catalog.hostVersion).toBe(adapter.hostVersion)
      expect(catalog.contractHash).toBe(adapter.contractHash)
      expect(catalog.catalogProfile).toBe(adapter.catalogProfile)
      expect(catalog.capabilities).toBe(adapter.capabilities)
      expect(catalog.previewsBase).toBe(previewsBaseFor(adapter.catalogProfile))
      expect(catalog.liveries).toEqual(profile?.liveries)
    }
  })

  it('serves the per-adapter catalog identity over the route', async () => {
    for (const adapter of ADAPTERS) {
      const handler = createCatalogHandler({ adapter })
      const response = await invoke(handler, 'GET', CATALOG_ROUTE)
      expect(response.statusCode).toBe(200)
      const parsed = JSON.parse(String(response.body)) as Record<string, unknown>
      expect(parsed.adapterId).toBe(adapter.adapterId)
      expect(parsed.hostVersion).toBe(adapter.hostVersion)
      expect(parsed.contractHash).toBe(adapter.contractHash)
      expect(parsed.catalogProfile).toBe(adapter.catalogProfile)
      expect(parsed.previewsBase).toBe(previewsBaseFor(adapter.catalogProfile))
      expect((parsed.liveries as unknown[]).length).toBe(LIVERIES_PER_PROFILE)
    }
  })
})

describe.skipIf(!COMPILED)('generated boot per adapter', () => {
  it('accepts every generated livery on every certified adapter with hash equality', () => {
    for (const adapter of ADAPTERS) {
      const profile = CATALOG_PROFILES[adapter.catalogProfile]
      expect(profile).toBeDefined()
      for (const livery of profile?.liveries ?? []) {
        const state = realBootState(adapter.hostVersion, livery.id)
        const label = `${adapter.hostVersion}/${livery.id}`
        expect(state.gate.accepted, label).toBe(true)
        expect(state.accepted, label).toBe(true)
        expect(state.rows, label).toHaveLength(3)
        expect(state.diagnostics, label).toEqual([])

        // The compile artifact is the source of truth; the host injects exactly it.
        const expectedCss = livery.css.tokens + livery.css.typography + livery.css.layout
        const expectedHash = livery.cssHash
        expect(hashCss(expectedCss), `${label} cssHash`).toBe(expectedHash)
        expect(state.payload.cssHash, label).toBe(expectedHash)
        expect(state.payload.adapterId, label).toBe(adapter.adapterId)
        expect(state.payload.hostVersion, label).toBe(adapter.hostVersion)
        expect(state.payload.contractHash, label).toBe(adapter.contractHash)
        expect(state.payload.catalogProfile, label).toBe(adapter.catalogProfile)

        const styleRow = state.rows[0]
        if (styleRow?.kind !== 'html') throw new Error('expected html style row first')
        expect(styleRow.placement).toBe('head')
        expect(styleRow.html, label).toContain(expectedCss)
        expect(styleRow.html, label).toContain(`data-dsh-livery-hash="${expectedHash}"`)
        expect(styleRow.html.match(/<\/style/gi) ?? [], label).toHaveLength(1)

        const scriptRow = state.rows[2]
        if (scriptRow?.kind !== 'script') throw new Error('expected body script row last')
        expect(scriptRow.text, label).toContain(expectedHash)
        expect(scriptRow.text, label).not.toMatch(/<\/script/i)

        // §18.8 performance budget: first-frame CSS <= 12 KiB.
        expect(Buffer.byteLength(expectedCss, 'utf8'), label).toBeLessThanOrEqual(12 * 1024)
      }
    }
  })

  it('renders identical bytes for adapters sharing a catalog profile', () => {
    const web = adapterForVersion('0.2.1-rc.2')
    const desktop = adapterForVersion('0.2.1-rc.3')
    expect(web).toBeDefined()
    expect(desktop).toBeDefined()
    if (web === undefined || desktop === undefined) return
    expect(web.catalogProfile).toBe(desktop.catalogProfile)
    expect(web.adapterId).not.toBe(desktop.adapterId)
    const profile = CATALOG_PROFILES[web.catalogProfile]
    expect(profile?.liveries.length).toBe(LIVERIES_PER_PROFILE)
    for (const livery of profile?.liveries ?? []) {
      const webState = realBootState(web.hostVersion, livery.id)
      const desktopState = realBootState(desktop.hostVersion, livery.id)
      expect(webState.accepted, livery.id).toBe(true)
      expect(desktopState.accepted, livery.id).toBe(true)
      // Same compiled bytes, only the recorded adapter identity differs.
      expect(webState.payload.cssHash, livery.id).toBe(desktopState.payload.cssHash)
      // CSS and attribute rows are byte-identical; only the identity-carrying
      // global payload names its own adapter.
      expect(webState.rows[0], livery.id).toEqual(desktopState.rows[0])
      expect(webState.rows[2], livery.id).toEqual(desktopState.rows[2])
      expect(webState.payload.adapterId, livery.id).toBe(web.adapterId)
      expect(desktopState.payload.adapterId, livery.id).toBe(desktop.adapterId)
    }
  })

  it('passes the gate for stock on every certified adapter', () => {
    for (const adapter of ADAPTERS) {
      const state = realBootState(adapter.hostVersion, STOCK_ID)
      expect(state.gate.accepted, adapter.hostVersion).toBe(true)
      expect(state.accepted).toBe(false)
      expect(state.rows).toEqual([])
      expect(state.payload.adapterId).toBe(adapter.adapterId)
      expect(state.payload.skinId).toBe(STOCK_ID)
      expect(state.payload.cssHash).toBe('')
      expect(state.diagnostics).toEqual([])
    }
  })

  it('fails closed with zero rows on out-of-range versions', () => {
    for (const version of ['9.9.9', '1.0.0', '0.1.9', '0.2.0-alpha.1']) {
      const state = realBootState(version, 'fjord')
      expect(state.gate.accepted, version).toBe(false)
      expect(state.rows, version).toEqual([])
      expect(state.payload.adapterId, version).toBe('')
      expect(state.gate.codes, version).toContain('gate.version-mismatch')
    }
    const unknown = computeBootState({ skinId: 'fjord', profileKind: 'web', observedHostVersion: null })
    expect(unknown.rows).toEqual([])
    expect(unknown.gate.codes).toContain('gate.version-unknown')
  })

  it('serves in-range uncertified versions through the synthetic compat adapter', () => {
    for (const version of ['0.2.2-rc.1', '0.2.1-rc.4', '0.2.0', '0.3.0-rc.1']) {
      const state = realBootState(version, 'fjord')
      expect(state.gate.accepted, version).toBe(true)
      expect(state.compat, version).toBe(true)
      expect(state.payload.compat, version).toBe(true)
      expect(state.payload.adapterId, version).toBe('dsh-compat')
      expect(state.payload.hostVersion, version).toBe(version)
      expect(state.rows.map((row) => row.kind), version).toEqual(['html', 'global', 'script'])
      expect(state.diagnostics.join('\n'), version).toContain('compat.mode')
    }
  })

  it('every profile livery declares only capabilities its adapters provide', () => {
    for (const profile of Object.values(CATALOG_PROFILES)) {
      const adapters = ADAPTERS.filter((adapter) => adapter.catalogProfile === profile.profileId)
      expect(adapters.length).toBeGreaterThan(0)
      for (const livery of profile.liveries) {
        for (const capability of livery.requiredCapabilities) {
          for (const adapter of adapters) {
            expect(
              adapter.capabilities[capability]?.available,
              `${livery.id} requires ${capability} on ${adapter.hostVersion}`,
            ).toBe(true)
          }
        }
      }
    }
  })
})

describe.skipIf(!COMPILED)('generated previews per profile', () => {
  it('binds exactly the frozen preview index of each profile', () => {
    for (const profileId of CATALOG_PROFILE_IDS) {
      const previews = bindPreviews(profileId, { moduleUrl: BUILT_MODULE_URL })
      // Four previews per livery; derived so a design-count change needs no edit.
      expect(previews.size, profileId).toBe((CATALOG_PROFILES[profileId]?.liveries.length ?? 0) * 4)
      expect(previews.size, profileId).toBe(PREVIEWS_PER_PROFILE)
      for (const name of previews.keys()) {
        expect(name).toMatch(/^[a-z0-9-]+-(zh|en)-(light|dark)\.svg$/)
        expect(previews.get(name)).toContain(`/previews/${profileId}/`)
      }
    }
  })

  it('serves the active profile and 404s every other compiled profile', async () => {
    for (const adapter of ADAPTERS) {
      const own = REAL_PREVIEWS.get(adapter.catalogProfile)
      const ownName = [...(own?.keys() ?? [])][0]
      expect(ownName, adapter.catalogProfile).toBeDefined()
      if (ownName === undefined) return
      const handler = createPreviewHandler({
        adapter,
        profilePreviews: REAL_PREVIEWS,
        readAsset: async (filePath) => {
          const { readFile } = await import('node:fs/promises')
          return readFile(filePath)
        },
      })
      const served = await invoke(
        handler,
        'GET',
        `${PREVIEW_ROUTE_PREFIX}${adapter.catalogProfile}/${ownName}`,
      )
      expect(served.statusCode, adapter.hostVersion).toBe(200)
      expect(served.headers['content-type']).toBe('image/svg+xml')
      expect(served.headers['cache-control']).toBe('no-store')
      expect(Buffer.from(served.body as Uint8Array).subarray(0, 4).toString()).toBe('<svg')

      for (const otherProfile of CATALOG_PROFILE_IDS) {
        if (otherProfile === adapter.catalogProfile) continue
        const other = await invoke(
          handler,
          'GET',
          `${PREVIEW_ROUTE_PREFIX}${otherProfile}/${ownName}`,
        )
        expect(other.statusCode, `${adapter.hostVersion} -> ${otherProfile}`).toBe(404)
      }
    }
  })
})
