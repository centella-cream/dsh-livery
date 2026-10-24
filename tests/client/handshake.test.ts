import { describe, expect, it } from 'vitest'
import {
  checkBoot,
  isDshLocale,
  normalizeLocale,
  readBootPayload,
  validateCatalog,
} from '../../src/client/handshake.js'
import { ADAPTER_ID, ENTRY_ID, LIVERY_VERSION } from '../../src/core/types.js'
import { makeBootPayload, makeCatalog, TEST_CONTRACT_HASH } from './fixtures.js'

const IDENTITY = {
  adapterId: ADAPTER_ID,
  contractHash: TEST_CONTRACT_HASH,
  pluginVersion: LIVERY_VERSION,
  entryId: ENTRY_ID,
}

describe('readBootPayload', () => {
  it('reads the boot global and tolerates a missing one', () => {
    const payload = makeBootPayload()
    expect(readBootPayload({ __DSH_LIVERY_BOOT__: payload })).toBe(payload)
    expect(readBootPayload({})).toBeUndefined()
    expect(readBootPayload(undefined)).toBeUndefined()
    expect(readBootPayload(null)).toBeUndefined()
  })
})

describe('checkBoot', () => {
  it('accepts a matching, accepted payload', () => {
    const payload = makeBootPayload()
    const check = checkBoot(payload, IDENTITY)
    expect(check.kind).toBe('valid')
    expect(check.payload).toBe(payload)
    expect(check.reasons).toEqual([])
  })

  it('treats a missing payload as absent (client may still use the catalog)', () => {
    const check = checkBoot(undefined, IDENTITY)
    expect(check.kind).toBe('absent')
    expect(check.payload).toBeUndefined()
    expect(check.reasons[0]).toContain('no first-frame payload')
  })

  it('treats an explicit gate rejection as absent, not mismatch', () => {
    const check = checkBoot(makeBootPayload({ accepted: false }), IDENTITY)
    expect(check.kind).toBe('absent')
    expect(check.reasons.join(' ')).toContain('gate')
  })

  it('fails closed on an adapter mismatch', () => {
    const check = checkBoot(makeBootPayload({ adapterId: 'dsh-0.0.0-r0' }), IDENTITY)
    expect(check.kind).toBe('mismatch')
    expect(check.reasons.join(' ')).toContain('adapter mismatch')
  })

  it('fails closed on a contract hash mismatch', () => {
    const check = checkBoot(makeBootPayload({ contractHash: 'sha256:other' }), IDENTITY)
    expect(check.kind).toBe('mismatch')
    expect(check.reasons.join(' ')).toContain('contract mismatch')
  })

  it('fails closed on a plugin version mismatch', () => {
    const check = checkBoot(makeBootPayload({ pluginVersion: '9.9.9' }), IDENTITY)
    expect(check.kind).toBe('mismatch')
    expect(check.reasons.join(' ')).toContain('plugin version mismatch')
  })

  it('fails closed on an entry id mismatch', () => {
    const check = checkBoot(makeBootPayload({ entryId: 'other' }), IDENTITY)
    expect(check.kind).toBe('mismatch')
    expect(check.reasons.join(' ')).toContain('entry mismatch')
  })

  it('fails closed on a malformed payload instead of crashing', () => {
    const check = checkBoot({ adapterId: 42, accepted: 'yes' }, IDENTITY)
    expect(check.kind).toBe('mismatch')
    expect(check.payload).toBeUndefined()
    expect(check.reasons.length).toBeGreaterThan(0)
  })

  it('fails closed on a non-object payload', () => {
    expect(checkBoot('nope', IDENTITY).kind).toBe('mismatch')
  })
})

describe('validateCatalog', () => {
  it('accepts a catalog with the matching contract', () => {
    const catalog = makeCatalog()
    expect(validateCatalog(catalog, IDENTITY)).toBe(catalog)
  })

  it('rejects a catalog from another adapter', () => {
    expect(validateCatalog({ ...makeCatalog(), adapterId: 'other' }, IDENTITY)).toBeUndefined()
  })

  it('rejects a catalog from another contract', () => {
    expect(validateCatalog({ ...makeCatalog(), contractHash: 'sha256:other' }, IDENTITY)).toBeUndefined()
  })

  it('rejects malformed envelopes', () => {
    expect(validateCatalog(undefined, IDENTITY)).toBeUndefined()
    expect(validateCatalog({ schemaVersion: 2 }, IDENTITY)).toBeUndefined()
    expect(validateCatalog({ ...makeCatalog(), liveries: 'nope' }, IDENTITY)).toBeUndefined()
    expect(validateCatalog({ ...makeCatalog(), capabilities: null }, IDENTITY)).toBeUndefined()
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
