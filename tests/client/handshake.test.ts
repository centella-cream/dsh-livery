import { describe, expect, it } from 'vitest'
import {
  bootIdentity,
  checkBoot,
  checkCatalog,
  expectedPreviewsBase,
  isDshLocale,
  normalizeLocale,
  readBootPayload,
  validateCatalog,
} from '../../src/client/handshake.js'
import { ADAPTER_IDENTITIES } from '../../src/generated/contract.js'
import { PREVIEW_ROUTE_PREFIX } from '../../src/core/types.js'
import {
  ADAPTER_020,
  ADAPTER_021_2,
  ADAPTER_021_3,
  adapterRecordOf,
  makeBootPayload,
  makeCatalog,
  TEST_PROFILE,
} from './fixtures.js'

describe('readBootPayload', () => {
  it('reads the boot global and tolerates a missing one', () => {
    const payload = makeBootPayload()
    expect(readBootPayload({ __DSH_LIVERY_BOOT__: payload })).toBe(payload)
    expect(readBootPayload({})).toBeUndefined()
    expect(readBootPayload(undefined)).toBeUndefined()
    expect(readBootPayload(null)).toBeUndefined()
  })
})

describe('checkBoot — certified adapter whitelist', () => {
  it('accepts every certified adapter triple', () => {
    for (const adapter of ADAPTER_IDENTITIES) {
      const payload = makeBootPayload({
        adapterId: adapter.adapterId,
        hostVersion: adapter.hostVersion,
        contractHash: adapter.contractHash,
        catalogProfile: adapter.catalogProfile,
      })
      const check = checkBoot(payload, ADAPTER_IDENTITIES)
      expect(check.kind, adapter.hostVersion).toBe('valid')
      expect(check.adapter, adapter.hostVersion).toBe(adapter)
      expect(check.reasons).toEqual([])
    }
  })

  it('keeps the already-accepted 0.2.0-rc.2 handshake working unchanged', () => {
    const check = checkBoot(makeBootPayload(), ADAPTER_IDENTITIES)
    expect(check.kind).toBe('valid')
    expect(check.adapter).toBe(ADAPTER_020)
    expect(check.payload?.hostVersion).toBe('0.2.0-rc.2')
    expect(check.payload?.adapterId).toBe('dsh-0.2.0-rc.2-r1')
  })

  it('accepts the 0.2.1 builds with their own profile', () => {
    const check = checkBoot(
      makeBootPayload({
        adapterId: ADAPTER_021_2.adapterId,
        hostVersion: ADAPTER_021_2.hostVersion,
        contractHash: ADAPTER_021_2.contractHash,
        catalogProfile: ADAPTER_021_2.catalogProfile,
      }),
      ADAPTER_IDENTITIES,
    )
    expect(check.kind).toBe('valid')
    expect(check.adapter).toBe(ADAPTER_021_2)
    expect(ADAPTER_021_2.catalogProfile).toBe(ADAPTER_021_3.catalogProfile)
  })

  it('treats a missing payload as absent (client may still use the catalog)', () => {
    const check = checkBoot(undefined, ADAPTER_IDENTITIES)
    expect(check.kind).toBe('absent')
    expect(check.payload).toBeUndefined()
    expect(check.adapter).toBeUndefined()
    expect(check.reasons[0]).toContain('no first-frame payload')
  })

  it('treats a certified gate rejection as absent, not mismatch', () => {
    const check = checkBoot(makeBootPayload({ accepted: false }), ADAPTER_IDENTITIES)
    expect(check.kind).toBe('absent')
    expect(check.adapter).toBe(ADAPTER_020)
    expect(check.reasons.join(' ')).toContain('gate')
  })

  it('fails closed on an unknown host version', () => {
    const check = checkBoot(makeBootPayload({ hostVersion: '0.2.2-rc.1' }), ADAPTER_IDENTITIES)
    expect(check.kind).toBe('mismatch')
    expect(check.adapter).toBeUndefined()
    expect(check.reasons.join(' ')).toContain('uncertified host build')
  })

  it('fails closed on an unknown adapter id for a certified version', () => {
    const check = checkBoot(makeBootPayload({ adapterId: 'dsh-0.2.1-rc.2-r9' }), ADAPTER_IDENTITIES)
    expect(check.kind).toBe('mismatch')
    expect(check.reasons.join(' ')).toContain('uncertified host build')
  })

  it('fails closed on an unknown contract hash', () => {
    const check = checkBoot(makeBootPayload({ contractHash: 'sha256:unknown' }), ADAPTER_IDENTITIES)
    expect(check.kind).toBe('mismatch')
    expect(check.reasons.join(' ')).toContain('uncertified host build')
  })

  it('fails closed when the payload profile does not match its adapter', () => {
    const check = checkBoot(
      makeBootPayload({ catalogProfile: ADAPTER_021_2.catalogProfile }),
      ADAPTER_IDENTITIES,
    )
    expect(check.kind).toBe('mismatch')
    expect(check.reasons.join(' ')).toContain('catalog profile mismatch')
  })

  it('fails closed on a plugin version mismatch', () => {
    const check = checkBoot(makeBootPayload({ pluginVersion: '9.9.9' }), ADAPTER_IDENTITIES)
    expect(check.kind).toBe('mismatch')
    expect(check.reasons.join(' ')).toContain('plugin version mismatch')
  })

  it('fails closed on an entry id mismatch', () => {
    const check = checkBoot(makeBootPayload({ entryId: 'other' }), ADAPTER_IDENTITIES)
    expect(check.kind).toBe('mismatch')
    expect(check.reasons.join(' ')).toContain('entry mismatch')
  })

  it('fails closed on a malformed payload instead of crashing', () => {
    const check = checkBoot({ adapterId: 42, accepted: 'yes' }, ADAPTER_IDENTITIES)
    expect(check.kind).toBe('mismatch')
    expect(check.payload).toBeUndefined()
    expect(check.reasons.length).toBeGreaterThan(0)
    expect(checkBoot('nope', ADAPTER_IDENTITIES).kind).toBe('mismatch')
  })

  it('requires the catalog profile field (multi-version payload shape)', () => {
    const legacy = makeBootPayload() as unknown as Record<string, unknown>
    const withoutProfile: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(legacy)) if (key !== 'catalogProfile') withoutProfile[key] = value
    const check = checkBoot(withoutProfile, ADAPTER_IDENTITIES)
    expect(check.kind).toBe('mismatch')
    expect(check.reasons.join(' ')).toContain('catalogProfile')
  })
})

describe('bootIdentity', () => {
  it('derives the certified identity from the matched adapter', () => {
    const check = checkBoot(makeBootPayload(), ADAPTER_IDENTITIES)
    expect(bootIdentity(check)).toEqual({
      hostVersion: ADAPTER_020.hostVersion,
      adapterId: ADAPTER_020.adapterId,
      contractHash: ADAPTER_020.contractHash,
      catalogProfile: ADAPTER_020.catalogProfile,
    })
  })

  it('is undefined without a certified adapter', () => {
    expect(bootIdentity(checkBoot(undefined, ADAPTER_IDENTITIES))).toBeUndefined()
  })
})

describe('checkCatalog — certified identity + profile', () => {
  it('accepts a catalog for every certified adapter', () => {
    for (const adapter of ADAPTER_IDENTITIES) {
      const catalog = makeCatalog(undefined, adapterRecordOf(adapter).capabilities, adapter)
      const check = checkCatalog(catalog, { adapters: ADAPTER_IDENTITIES })
      expect(check.catalog, adapter.hostVersion).toBe(catalog)
      expect(check.adapter, adapter.hostVersion).toBe(adapter)
      expect(validateCatalog(catalog, { adapters: ADAPTER_IDENTITIES })).toBe(catalog)
    }
  })

  it('accepts a catalog that repeats the handshake identity', () => {
    const catalog = makeCatalog()
    const expected = bootIdentity(checkBoot(makeBootPayload(), ADAPTER_IDENTITIES))
    expect(checkCatalog(catalog, { adapters: ADAPTER_IDENTITIES, expected }).catalog).toBe(catalog)
  })

  it('rejects a catalog for a different certified host than the handshake', () => {
    const catalog = makeCatalog(undefined, adapterRecordOf(ADAPTER_021_2).capabilities, ADAPTER_021_2)
    const expected = bootIdentity(checkBoot(makeBootPayload(), ADAPTER_IDENTITIES))
    const check = checkCatalog(catalog, { adapters: ADAPTER_IDENTITIES, expected })
    expect(check.catalog).toBeUndefined()
    expect(check.reasons.join(' ')).toContain('does not describe the host build')
  })

  it('rejects a catalog with an uncertified triple', () => {
    const catalog = makeCatalog()
    const check = checkCatalog({ ...catalog, contractHash: 'sha256:unknown' }, { adapters: ADAPTER_IDENTITIES })
    expect(check.catalog).toBeUndefined()
    expect(check.reasons.join(' ')).toContain('uncertified catalog identity')
  })

  it('rejects a catalog whose profile does not match its adapter', () => {
    const catalog = makeCatalog()
    const otherProfile = ADAPTER_021_2.catalogProfile
    const check = checkCatalog(
      { ...catalog, catalogProfile: otherProfile, previewsBase: `${PREVIEW_ROUTE_PREFIX}${otherProfile}/` },
      { adapters: ADAPTER_IDENTITIES },
    )
    expect(check.catalog).toBeUndefined()
    expect(check.reasons.join(' ')).toContain('catalog profile mismatch')
  })

  it('rejects a catalog whose previewsBase is not the certified profile directory', () => {
    const catalog = makeCatalog()
    expect(checkCatalog({ ...catalog, previewsBase: `${PREVIEW_ROUTE_PREFIX}other/` }, { adapters: ADAPTER_IDENTITIES }).catalog)
      .toBeUndefined()
    expect(checkCatalog({ ...catalog, previewsBase: PREVIEW_ROUTE_PREFIX }, { adapters: ADAPTER_IDENTITIES }).catalog)
      .toBeUndefined()
  })

  it('accepts the exact previewsBase the host derives for the profile', () => {
    expect(expectedPreviewsBase(TEST_PROFILE)).toBe(`${PREVIEW_ROUTE_PREFIX}${TEST_PROFILE}/`)
    const catalog = makeCatalog()
    expect(catalog.previewsBase).toBe(expectedPreviewsBase(TEST_PROFILE))
    expect(checkCatalog(catalog, { adapters: ADAPTER_IDENTITIES }).catalog).toBe(catalog)
  })

  it('rejects malformed envelopes', () => {
    const catalog = makeCatalog() as unknown as Record<string, unknown>
    expect(checkCatalog(undefined, { adapters: ADAPTER_IDENTITIES }).catalog).toBeUndefined()
    expect(checkCatalog({ ...catalog, schemaVersion: 2 }, { adapters: ADAPTER_IDENTITIES }).catalog).toBeUndefined()
    expect(checkCatalog({ ...catalog, liveries: 'nope' }, { adapters: ADAPTER_IDENTITIES }).catalog).toBeUndefined()
    expect(checkCatalog({ ...catalog, capabilities: null }, { adapters: ADAPTER_IDENTITIES }).catalog).toBeUndefined()
    expect(checkCatalog({ ...catalog, previewsBase: 42 }, { adapters: ADAPTER_IDENTITIES }).catalog).toBeUndefined()
  })

  it('exposes diagnostic reasons for a rejected catalog', () => {
    const check = checkCatalog(undefined, { adapters: ADAPTER_IDENTITIES })
    expect(check.reasons).toEqual(['catalog envelope is malformed'])
    expect(check.adapter).toBeUndefined()
  })

  it('does not require a handshake identity when no boot payload exists', () => {
    const catalog = makeCatalog()
    expect(checkCatalog(catalog, { adapters: ADAPTER_IDENTITIES }).catalog).toBe(catalog)
    expect(checkCatalog(catalog, { adapters: ADAPTER_IDENTITIES, expected: undefined }).catalog).toBe(catalog)
  })

  it('uses the injected registry rather than a hardcoded version list', () => {
    const check = checkCatalog(makeCatalog(), { adapters: [], expected: undefined })
    expect(check.catalog).toBeUndefined()
    expect(check.reasons.join(' ')).toContain('uncertified catalog identity')
  })
})

describe('locale helpers', () => {
  it('normalizes unknown locales to en (host fallback)', () => {
    expect(isDshLocale('zh')).toBe(true)
    expect(isDshLocale('en')).toBe(true)
    expect(isDshLocale('zh-CN')).toBe(false)
    expect(normalizeLocale('zh')).toBe('zh')
    expect(normalizeLocale('fr')).toBe('en')
    expect(normalizeLocale(undefined)).toBe('en')
  })
})
