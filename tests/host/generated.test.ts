/**
 * Integration tests against the *real* generated catalog and the *real* core
 * runtime helpers.
 *
 * Skipped while `src/generated/liveries.ts` is still the placeholder (it ships
 * zero liveries and a non-certified contract hash); it turns on as soon as
 * `pnpm liveries:compile` has run. These are the tests that prove the frozen
 * hash-equality contract end to end, so they must never be weakened to make a
 * placeholder build pass.
 */

import { describe, expect, it } from 'vitest'
import { computeBootState } from '../../src/host/boot.js'
import {
  bootStateForConfig,
  resetLiveryHostForTests,
  setHostEnvironmentForTests,
} from '../../src/host/index.js'
import { renderBootCssFromCatalog } from '../../src/core/catalog.js'
import { hashCss } from '../../src/core/render.js'
import { CONTRACT_FACTS, HOST_CAPABILITIES } from '../../src/generated/contract.js'
import { CATALOG_META, LIVERIES } from '../../src/generated/liveries.js'
import { BODY_ATTRIBUTE, HASH_ATTRIBUTE, STOCK_ID } from '../../src/core/types.js'
import { buildCatalog } from '../../src/host/catalog.js'
import { Config } from '../../src/host/config.js'
import type { LiveryHostConfig } from '../../src/host/config.js'

/** Whether the generated artifacts are a compiled (non-placeholder) catalog. */
const compiled = LIVERIES.length > 0 && CATALOG_META.contractHash === CONTRACT_FACTS.contractHash

/** The served catalog assembled from the real generated artifacts. */
function realCatalog() {
  return buildCatalog({
    liveries: LIVERIES,
    catalogMeta: CATALOG_META,
    capabilities: HOST_CAPABILITIES,
    contractFacts: CONTRACT_FACTS,
  })
}

/** Boot state for one generated livery with the real catalog source. */
function realBootState(skinId: string) {
  return computeBootState({
    skinId,
    capabilities: HOST_CAPABILITIES,
    liveries: LIVERIES,
    catalogMeta: CATALOG_META,
    contractFacts: CONTRACT_FACTS,
    profileKind: 'web',
    observedHostVersion: CONTRACT_FACTS.dshVersion,
  })
}

describe.skipIf(!compiled)('generated catalog + real runtime helpers', () => {
  it('ships a compiled catalog bound to the certified contract', () => {
    expect(LIVERIES.length).toBeGreaterThan(0)
    expect(CATALOG_META.adapterId).toBe(CONTRACT_FACTS.adapterId)
    expect(CATALOG_META.hostVersion).toBe(CONTRACT_FACTS.dshVersion)
    expect(CATALOG_META.contractHash).toBe(CONTRACT_FACTS.contractHash)
  })

  it('accepts every generated livery and injects the compiled stylesheet verbatim', () => {
    const catalog = realCatalog()
    for (const livery of LIVERIES) {
      const state = realBootState(livery.id)
      expect(state.gate.accepted, `${livery.id} gate`).toBe(true)
      expect(state.accepted, `${livery.id} accepted`).toBe(true)
      expect(state.rows).toHaveLength(3)
      expect(state.diagnostics).toEqual([])

      // The compile artifact is the source of truth: concatenated CssFragments
      // and their hash. The host must inject exactly those bytes.
      const expectedCss = livery.css.tokens + livery.css.typography + livery.css.layout
      const expectedHash = livery.cssHash
      expect(hashCss(expectedCss), `${livery.id} cssHash`).toBe(expectedHash)
      const helper = renderBootCssFromCatalog(catalog, livery.id)
      expect(helper.css, `${livery.id} helper css`).toBe(expectedCss)
      expect(helper.hash, `${livery.id} helper hash`).toBe(expectedHash)

      expect(state.payload.cssHash).toBe(expectedHash)

      const styleRow = state.rows[0]
      if (styleRow?.kind !== 'html') throw new Error('expected html style row first')
      expect(styleRow.placement).toBe('head')
      expect(styleRow.html).toContain(expectedCss)
      expect(styleRow.html).toContain(`${HASH_ATTRIBUTE}="${expectedHash}"`)
      // Only the element's own closing tag may appear.
      expect(styleRow.html.match(/<\/style/gi) ?? []).toHaveLength(1)

      const globalRow = state.rows[1]
      expect(globalRow?.kind).toBe('global')

      const scriptRow = state.rows[2]
      if (scriptRow?.kind !== 'script') throw new Error('expected body script row last')
      expect(scriptRow.text).toContain(`"${BODY_ATTRIBUTE}"`)
      expect(scriptRow.text).toContain(expectedHash)
      expect(scriptRow.text).not.toMatch(/<\/script/i)

      // §18.8 performance budget: first-frame CSS <= 12 KiB.
      expect(Buffer.byteLength(expectedCss, 'utf8')).toBeLessThanOrEqual(12 * 1024)
    }
  })

  it('renders stock with no rows and an empty cssHash', () => {
    const state = realBootState(STOCK_ID)
    expect(state.gate.accepted).toBe(true)
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.payload.skinId).toBe(STOCK_ID)
    expect(state.payload.cssHash).toBe('')
  })

  it('every generated livery declares only available required capabilities', () => {
    for (const livery of LIVERIES) {
      for (const id of livery.requiredCapabilities) {
        expect(HOST_CAPABILITIES[id]?.available, `${livery.id} requires ${id}`).toBe(true)
      }
    }
  })

  it('the plugin entry passes the gate for stock against the compiled artifacts', () => {
    resetLiveryHostForTests()
    setHostEnvironmentForTests({ profileKind: 'web', observedHostVersion: CONTRACT_FACTS.dshVersion })
    try {
      const state = bootStateForConfig(Config() as LiveryHostConfig)
      expect(state.gate.accepted).toBe(true)
      expect(state.accepted).toBe(false)
      expect(state.rows).toEqual([])
    } finally {
      resetLiveryHostForTests()
    }
  })
})
