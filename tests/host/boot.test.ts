/**
 * Pre-loader gate and boot-row tests.
 *
 * The gate is the plugin's only fail-closed boundary: every rejection case here
 * asserts `rows.length === 0`, because "partially injected" is the one outcome
 * the contract forbids.
 */

import { describe, expect, it } from 'vitest'
import {
  computeBootState,
  escapeAttribute,
  escapeJsonForScript,
  escapeStyleText,
  renderBootAttributeScript,
  renderBootStyleHtml,
  type BootStateInput,
} from '../../src/host/boot.js'
import { CONTRACT_FACTS, HOST_CAPABILITIES } from '../../src/generated/contract.js'
import {
  BODY_ATTRIBUTE,
  BOOT_GLOBAL,
  BOOT_STYLE_ID,
  CATALOG_ROUTE,
  ENTRY_ID,
  HASH_ATTRIBUTE,
  LIVERY_VERSION,
  PLUGIN_MARKER,
  STOCK_ID,
} from '../../src/core/types.js'
import {
  FIXTURE_BOOT_CSS,
  FIXTURE_BOOT_HASH,
  capabilitiesWithout,
  makeBootInput,
  makeCatalogMeta,
  makeLivery,
} from './fixtures.js'

/** Rows are typed against the host contract; tests read them as a record. */
function rowKinds(input: BootStateInput): string[] {
  return computeBootState(input).rows.map((row) => row.kind)
}

describe('computeBootState — acceptance', () => {
  it('accepts an exact contract and emits the three boot rows in the frozen order', () => {
    const state = computeBootState(makeBootInput())
    expect(state.accepted).toBe(true)
    expect(state.diagnostics).toEqual([])
    // Frozen: first-paint CSS row first, then the handshake global, then the
    // body attribute stamp.
    expect(rowKinds(makeBootInput())).toEqual(['html', 'global', 'script'])
    expect(state.rows).toHaveLength(3)
    expect(state.gate.accepted).toBe(true)
    expect(state.gate.codes).toEqual([])
  })

  it('emits the boot style as head HTML first, carrying id, plugin marker and hash', () => {
    const state = computeBootState(makeBootInput())
    const row = state.rows[0]
    expect(row?.kind).toBe('html')
    if (row?.kind !== 'html') throw new Error('expected html row')
    expect(row.placement).toBe('head')
    expect(row.html).toContain(`<style id="${BOOT_STYLE_ID}"`)
    expect(row.html).toContain(`data-plugin="${PLUGIN_MARKER}"`)
    expect(row.html).toContain(`${HASH_ATTRIBUTE}="${FIXTURE_BOOT_HASH}"`)
    expect(row.html).toContain(FIXTURE_BOOT_CSS)
    // The only `</style` may be the row's own closing tag; the CSS body must
    // not be able to close the element early.
    expect(row.html.match(/<\/style/gi) ?? []).toHaveLength(1)
    expect(row.html.endsWith('</style>')).toBe(true)
  })

  it('emits the handshake payload global second', () => {
    const state = computeBootState(makeBootInput())
    const row = state.rows[1]
    expect(row).toEqual({ kind: 'global', name: BOOT_GLOBAL, value: state.payload })
  })

  it('emits the body script that stamps both body attributes', () => {
    const state = computeBootState(makeBootInput())
    const row = state.rows[2]
    expect(row?.kind).toBe('script')
    if (row?.kind !== 'script') throw new Error('expected script row')
    expect(row.placement).toBe('body')
    expect(row.text).toContain(`setAttribute(${JSON.stringify(BODY_ATTRIBUTE)}, boot.skinId)`)
    expect(row.text).toContain(`setAttribute(${JSON.stringify(HASH_ATTRIBUTE)}, boot.hash)`)
    expect(row.text).toContain('"skinId":"ivory-slate"')
    expect(row.text).toContain(`"hash":"${FIXTURE_BOOT_HASH}"`)
    expect(row.text).not.toMatch(/<\/script/i)
  })

  it('describes the payload exactly once, schema-complete', () => {
    const state = computeBootState(makeBootInput())
    expect(state.payload).toEqual({
      pluginVersion: LIVERY_VERSION,
      adapterId: CONTRACT_FACTS.adapterId,
      hostVersion: CONTRACT_FACTS.dshVersion,
      contractHash: CONTRACT_FACTS.contractHash,
      profileKind: 'web',
      accepted: true,
      skinId: 'ivory-slate',
      cssHash: FIXTURE_BOOT_HASH,
      bootStyleId: BOOT_STYLE_ID,
      catalogUrl: CATALOG_ROUTE,
      entryId: ENTRY_ID,
      diagnostics: [],
    })
  })

  it('carries the deployment profile into the payload', () => {
    const state = computeBootState(makeBootInput({ profileKind: 'desktop' }))
    expect(state.accepted).toBe(true)
    expect(state.payload.profileKind).toBe('desktop')
  })

  it('contributes no rows for the stock skin (gate passes, boot accepted = false)', () => {
    const state = computeBootState(makeBootInput({ skinId: STOCK_ID }))
    // Stock passes the host gate but has no boot content, so `accepted` (rows
    // will be injected) is false while the gate verdict is true.
    expect(state.gate.accepted).toBe(true)
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.payload.accepted).toBe(false)
    expect(state.payload.skinId).toBe(STOCK_ID)
    expect(state.payload.cssHash).toBe('')
    expect(state.diagnostics).toEqual([])
  })

  it('treats an absent config value as stock', () => {
    const state = computeBootState(makeBootInput({ skinId: undefined }))
    expect(state.gate.accepted).toBe(true)
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.payload.skinId).toBe(STOCK_ID)
  })

  it('boot state follows the live skin id (no state carried between renders)', () => {
    const input = makeBootInput()
    const stock = computeBootState({ ...input, skinId: STOCK_ID })
    const livery = computeBootState({ ...input, skinId: 'ivory-slate' })
    const other = computeBootState({
      ...input,
      liveries: [makeLivery(), makeLivery({ id: 'ocean-mist' })],
      skinId: 'ocean-mist',
    })
    expect(stock.rows).toEqual([])
    expect(stock.accepted).toBe(false)
    expect(livery.accepted).toBe(true)
    expect(livery.rows).toHaveLength(3)
    expect(livery.payload.skinId).toBe('ivory-slate')
    expect(other.payload.skinId).toBe('ocean-mist')
  })

  it('keeps optional unavailable capabilities out of the gate', () => {
    const livery = makeLivery({ optionalCapabilities: ['host-density-tokens'] })
    const state = computeBootState(makeBootInput({ liveries: [livery] }))
    expect(state.accepted).toBe(true)
    expect(state.rows).toHaveLength(3)
    expect(state.gate.missingCapabilities).toEqual([])
  })
})

describe('computeBootState — fail closed', () => {
  it('rejects a different host version with zero rows', () => {
    const state = computeBootState(makeBootInput({ observedHostVersion: '0.2.1-rc.2' }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.payload.accepted).toBe(false)
    expect(state.payload.cssHash).toBe('')
    expect(state.gate.codes).toContain('gate.version-mismatch')
    expect(state.diagnostics.join('\n')).toContain('gate.version-mismatch')
  })

  it('rejects a slightly different version string (exact comparison)', () => {
    const state = computeBootState(makeBootInput({ observedHostVersion: `${CONTRACT_FACTS.dshVersion} ` }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
  })

  it('rejects an unreadable host version', () => {
    const state = computeBootState(makeBootInput({ observedHostVersion: null }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.version-unknown')
  })

  it('rejects an adapter mismatch observed at runtime', () => {
    const state = computeBootState(makeBootInput({ observedAdapterId: 'dsh-other-adapter' }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.adapter-mismatch')
    expect(state.diagnostics.join('\n')).toContain('dsh-other-adapter')
  })

  it('rejects a catalog compiled for another adapter', () => {
    const state = computeBootState(makeBootInput({
      catalogMeta: makeCatalogMeta({ adapterId: 'dsh-other-adapter' }),
    }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.adapter-mismatch')
  })

  it('rejects a contract hash mismatch', () => {
    const state = computeBootState(makeBootInput({ observedContractHash: 'sha256:deadbeef' }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.contract-mismatch')
    expect(state.diagnostics.join('\n')).toContain('gate.contract-mismatch')
  })

  it('rejects a catalog compiled against another contract', () => {
    const state = computeBootState(makeBootInput({
      catalogMeta: makeCatalogMeta({ contractHash: 'sha256:deadbeef' }),
    }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.contract-mismatch')
  })

  it('rejects an unknown/deleted skin id', () => {
    const state = computeBootState(makeBootInput({ skinId: 'deleted-livery' }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.skin-unknown')
    expect(state.diagnostics.join('\n')).toContain('deleted-livery')
  })

  it('rejects a missing required capability', () => {
    const livery = makeLivery({ requiredCapabilities: ['theme-css', 'host-font-family'] })
    const state = computeBootState(makeBootInput({
      liveries: [livery],
      capabilities: capabilitiesWithout(['host-font-family']),
    }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('capability.missing:host-font-family')
    expect(state.gate.missingCapabilities).toEqual(['host-font-family'])
  })

  it('rejects when the boot renderer throws', () => {
    const state = computeBootState(makeBootInput({
      renderBoot: () => {
        throw new Error('token table corrupt')
      },
    }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.render-failed')
    expect(state.diagnostics.join('\n')).toContain('token table corrupt')
  })

  it('rejects an empty compiled stylesheet', () => {
    const state = computeBootState(makeBootInput({ renderBoot: () => ({ css: '', hash: 'sha256:x' }) }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.render-failed')
  })

  it('rejects a rendered stylesheet without a hash', () => {
    const state = computeBootState(makeBootInput({ renderBoot: () => ({ css: FIXTURE_BOOT_CSS, hash: '' }) }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.render-failed')
  })

  it('rejects CSS containing a closing style tag instead of escaping it', () => {
    const state = computeBootState(makeBootInput({
      renderBoot: () => ({ css: 'body{content:"</style>"}', hash: 'sha256:x' }),
    }))
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.render-failed')
  })
})

describe('row escaping', () => {
  it('never lets a malicious livery id close the script element', () => {
    const evilId = 'evil</script><script>alert(1)</script>'
    const state = computeBootState(makeBootInput({
      skinId: evilId,
      liveries: [makeLivery({ id: evilId })],
    }))
    expect(state.accepted).toBe(true)
    const scriptRow = state.rows[2]
    if (scriptRow?.kind !== 'script') throw new Error('expected script row')
    expect(scriptRow.text).not.toMatch(/<\/script/i)
    expect(scriptRow.text).toContain('\\u003c/script')
  })

  it('escapes CSS closing tags defensively in the helper', () => {
    expect(escapeStyleText('a{}</style><script>')).toBe('a{}</style><script>'.replace('</style', '<\\/style'))
    expect(escapeStyleText('plain css')).toBe('plain css')
  })

  it('escapes JSON for the script element', () => {
    expect(escapeJsonForScript('{"a":"</script>"}')).toBe('{"a":"\\u003c/script>"}')
    expect(escapeJsonForScript('{"a":1}')).toBe('{"a":1}')
  })

  it('escapes attribute values', () => {
    expect(escapeAttribute('a"b<c>d&e')).toBe('a&quot;b&lt;c&gt;d&amp;e')
    expect(escapeAttribute('sha256:abc')).toBe('sha256:abc')
  })

  it('builds style markup with escaped CSS and hash', () => {
    const html = renderBootStyleHtml('body{color:red}</style>', 'sha256:"x"')
    // The injected CSS's own closing sequence is escaped; only the element's
    // final closing tag remains.
    expect(html.match(/<\/style/gi) ?? []).toHaveLength(1)
    expect(html.endsWith('</style>')).toBe(true)
    expect(html).toContain('<\\/style>')
    expect(html).toContain('sha256:&quot;x&quot;')
  })

  it('builds a script that cannot close its element', () => {
    const text = renderBootAttributeScript('x</script>', 'h</script>')
    expect(text).not.toMatch(/<\/script/i)
    expect(text).toContain('setAttribute')
  })
})

describe('rows are plain serializable data', () => {
  it('JSON-serializes the whole table (the host contract requires it)', () => {
    const state = computeBootState(makeBootInput())
    const serialized = JSON.stringify(state.rows)
    expect(serialized).toContain('"kind":"global"')
    expect(serialized).toContain('"kind":"html"')
    expect(serialized).toContain('"kind":"script"')
    expect(() => JSON.parse(serialized)).not.toThrow()
  })

  it('always uses the host capability map the contract facts describe', () => {
    const state = computeBootState(makeBootInput())
    expect(HOST_CAPABILITIES['theme-css']?.available).toBe(true)
    expect(state.accepted).toBe(true)
  })
})
