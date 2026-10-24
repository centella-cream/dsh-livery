/**
 * Host Config tests: one volatile field, total reads, and a catalog-aware
 * normalization that always falls back to `stock`.
 */

import { describe, expect, it } from 'vitest'
import { Config, readSkinId, normalizeSkinId } from '../../src/host/config.js'
import { STOCK_ID } from '../../src/core/types.js'

describe('Config schema', () => {
  it('defaults to stock and exposes a volatile reference', () => {
    const config = Config()
    expect(config.skinId).toBeTypeOf('object')
    expect(typeof config.skinId.get).toBe('function')
    expect(config.skinId.get()).toBe(STOCK_ID)
  })

  it('keeps an explicitly configured skin id', () => {
    const config = Config({ skinId: 'ivory-slate' })
    expect(config.skinId.get()).toBe('ivory-slate')
    expect(readSkinId(config)).toBe('ivory-slate')
  })
})

describe('readSkinId', () => {
  it('reads a volatile reference', () => {
    expect(readSkinId({ skinId: { get: () => 'ocean-mist' } })).toBe('ocean-mist')
  })

  it('reads a plain string (resolved config snapshot)', () => {
    expect(readSkinId({ skinId: 'ocean-mist' })).toBe('ocean-mist')
  })

  it('trims whitespace', () => {
    expect(readSkinId({ skinId: '  ocean-mist  ' })).toBe('ocean-mist')
    expect(readSkinId({ skinId: '   ' })).toBe(STOCK_ID)
  })

  it('falls back to stock for absent, malformed or hostile configs', () => {
    expect(readSkinId(undefined)).toBe(STOCK_ID)
    expect(readSkinId(null)).toBe(STOCK_ID)
    expect(readSkinId('ivory-slate')).toBe(STOCK_ID)
    expect(readSkinId({})).toBe(STOCK_ID)
    expect(readSkinId({ skinId: 42 })).toBe(STOCK_ID)
    expect(readSkinId({ skinId: { get: () => 42 } })).toBe(STOCK_ID)
  })

  it('falls back to stock when the volatile reference throws', () => {
    const hostile = {
      skinId: {
        get(): unknown {
          throw new Error('disposed fiber')
        },
      },
    }
    expect(readSkinId(hostile)).toBe(STOCK_ID)
  })
})

describe('normalizeSkinId', () => {
  const known = ['ivory-slate', 'ocean-mist']

  it('accepts an id the build ships', () => {
    expect(normalizeSkinId('ivory-slate', known)).toBe('ivory-slate')
    expect(normalizeSkinId('  ocean-mist ', known)).toBe('ocean-mist')
  })

  it('returns stock for deleted, unknown, empty or non-string ids', () => {
    expect(normalizeSkinId('deleted-livery', known)).toBe(STOCK_ID)
    expect(normalizeSkinId('', known)).toBe(STOCK_ID)
    expect(normalizeSkinId('   ', known)).toBe(STOCK_ID)
    expect(normalizeSkinId(undefined, known)).toBe(STOCK_ID)
    expect(normalizeSkinId(42, known)).toBe(STOCK_ID)
    expect(normalizeSkinId('ivory-slate', [])).toBe(STOCK_ID)
  })

  it("treats the literal 'stock' as stock regardless of the known set", () => {
    expect(normalizeSkinId('stock', known)).toBe(STOCK_ID)
  })

  it('accepts Set/Map lookups and never throws on a hostile iterable', () => {
    expect(normalizeSkinId('ocean-mist', new Set(known))).toBe('ocean-mist')
    expect(normalizeSkinId('ivory-slate', new Map(known.map((id) => [id, true])))).toBe('ivory-slate')
    const hostile = {
      [Symbol.iterator](): Iterator<string> {
        throw new Error('broken iterable')
      },
    }
    expect(normalizeSkinId('ivory-slate', hostile)).toBe(STOCK_ID)
  })
})
