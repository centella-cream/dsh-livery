/**
 * Multi-adapter pre-loader gate and boot-row tests.
 *
 * The gate is the plugin's only fail-closed boundary: every rejection case here
 * asserts `rows.length === 0`, because "partially injected" is the one outcome
 * the contract forbids, and an uncertified host version must never be styled.
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
import { buildCatalog } from '../../src/host/catalog.js'
import { SUPPORTED_HOST_VERSIONS, type AdapterRecord } from '../../src/generated/contract.js'
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
  SYNTHETIC_PROFILE_A,
  SYNTHETIC_PROFILE_B,
  makeAdapter,
  makeAdapterCatalog,
  makeBootInput,
  makeCapabilities,
  makeLivery,
  makeProfile,
} from './fixtures.js'

/** The three synthetic certified adapters the host must style (two share a profile). */
function syntheticAdapters(): AdapterRecord[] {
  return [
    makeAdapter(),
    makeAdapter({
      hostVersion: 'test-host-2.0.0',
      adapterId: 'dsh-test-host-2.0.0-r1',
      contractHash: `sha256:${'2'.repeat(64)}`,
      catalogProfile: SYNTHETIC_PROFILE_B,
    }),
    makeAdapter({
      hostVersion: 'test-host-2.1.0',
      adapterId: 'dsh-test-host-2.1.0-r1',
      contractHash: `sha256:${'3'.repeat(64)}`,
      catalogProfile: SYNTHETIC_PROFILE_B,
    }),
  ]
}

/** An input with no resolvable adapter: unknown/uncertified host version. */
function unresolvedInput(observedHostVersion: string | null): BootStateInput {
  return {
    skinId: 'ivory-slate',
    profileKind: 'web',
    observedHostVersion,
  }
}

describe('computeBootState — acceptance per certified adapter', () => {
  it.each(syntheticAdapters().map((adapter) => [adapter.hostVersion, adapter] as const))(
    'accepts adapter %s and emits the three boot rows in the frozen order',
    (_version, adapter) => {
      const state = computeBootState(makeBootInput({ adapter }))
      expect(state.gate.accepted).toBe(true)
      expect(state.accepted).toBe(true)
      expect(state.diagnostics).toEqual([])
      expect(state.rows.map((row) => row.kind)).toEqual(['html', 'global', 'script'])
      expect(state.rows).toHaveLength(3)
      expect(state.adapter).toEqual(adapter)
      expect(state.capabilities).toBe(adapter.capabilities)
    },
  )

  it.each(syntheticAdapters().map((adapter) => [adapter.hostVersion, adapter] as const))(
    'carries %s adapter identity into the payload and gate',
    (_version, adapter) => {
      const state = computeBootState(makeBootInput({ adapter }))
      expect(state.payload.adapterId).toBe(adapter.adapterId)
      expect(state.payload.hostVersion).toBe(adapter.hostVersion)
      expect(state.payload.contractHash).toBe(adapter.contractHash)
      expect(state.payload.catalogProfile).toBe(adapter.catalogProfile)
      expect(state.gate.adapterId).toBe(adapter.adapterId)
      expect(state.gate.hostVersion).toBe(adapter.hostVersion)
      expect(state.gate.contractHash).toBe(adapter.contractHash)
      expect(state.gate.catalogProfile).toBe(adapter.catalogProfile)
    },
  )

  it('shares one catalog profile between render-equivalent adapters', () => {
    const [first, second, third] = syntheticAdapters()
    expect(first?.catalogProfile).toBe(SYNTHETIC_PROFILE_A)
    expect(second?.catalogProfile).toBe(third?.catalogProfile)
    if (second === undefined) throw new Error('missing adapter')
    const result = computeBootState(makeBootInput({ adapter: second }))
    expect(result.payload.catalogProfile).toBe(SYNTHETIC_PROFILE_B)
  })

  it('describes the payload schema-completely for one adapter', () => {
    const adapter = makeAdapter()
    const state = computeBootState(makeBootInput({ adapter }))
    expect(state.payload).toEqual({
      pluginVersion: LIVERY_VERSION,
      adapterId: adapter.adapterId,
      hostVersion: adapter.hostVersion,
      contractHash: adapter.contractHash,
      catalogProfile: adapter.catalogProfile,
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
    expect(row.html.match(/<\/style/gi) ?? []).toHaveLength(1)
    expect(row.html.endsWith('</style>')).toBe(true)
  })

  it('emits the handshake payload global second', () => {
    const state = computeBootState(makeBootInput())
    expect(state.rows[1]).toEqual({ kind: 'global', name: BOOT_GLOBAL, value: state.payload })
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

  it('records the deployment profile for diagnostics only', () => {
    const state = computeBootState(makeBootInput({ profileKind: 'desktop' }))
    expect(state.accepted).toBe(true)
    expect(state.payload.profileKind).toBe('desktop')
    expect(state.gate.profileKind).toBe('desktop')
  })

  it('contributes no rows for the stock skin on every adapter', () => {
    for (const adapter of syntheticAdapters()) {
      const state = computeBootState(makeBootInput({ adapter, skinId: STOCK_ID }))
      expect(state.gate.accepted).toBe(true)
      expect(state.accepted).toBe(false)
      expect(state.rows).toEqual([])
      expect(state.payload.accepted).toBe(false)
      expect(state.payload.skinId).toBe(STOCK_ID)
      expect(state.payload.cssHash).toBe('')
      expect(state.payload.adapterId).toBe(adapter.adapterId)
      expect(state.diagnostics).toEqual([])
    }
  })

  it('treats an absent config value as stock', () => {
    const state = computeBootState(makeBootInput({ skinId: undefined }))
    expect(state.gate.accepted).toBe(true)
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.payload.skinId).toBe(STOCK_ID)
  })

  it('keeps optional unavailable capabilities out of the gate', () => {
    const livery = makeLivery({ optionalCapabilities: ['host-density-tokens'] })
    const adapter = makeAdapter()
    const state = computeBootState(makeBootInput({
      adapter,
      catalog: makeAdapterCatalog(adapter, [livery]),
    }))
    expect(state.accepted).toBe(true)
    expect(state.rows).toHaveLength(3)
    expect(state.gate.missingCapabilities).toEqual([])
  })

  it('boot state follows the live skin id (no state carried between renders)', () => {
    const input = makeBootInput()
    const stock = computeBootState({ ...input, skinId: STOCK_ID })
    const livery = computeBootState({ ...input, skinId: 'ivory-slate' })
    expect(stock.rows).toEqual([])
    expect(stock.accepted).toBe(false)
    expect(livery.accepted).toBe(true)
    expect(livery.rows).toHaveLength(3)
  })
})

describe('computeBootState — unknown / uncertified host versions', () => {
  it('rejects an unreadable host version with zero rows', () => {
    const state = computeBootState(unresolvedInput(null))
    expect(state.gate.accepted).toBe(false)
    expect(state.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.version-unknown')
    expect(state.gate.adapterId).toBe('')
    expect(state.payload.adapterId).toBe('')
    expect(state.payload.catalogProfile).toBe('')
    expect(state.diagnostics.join('\n')).toContain('gate.version-unknown')
  })

  it.each(['9.9.9', '1.0.0', '0.1.9', '0.2.0-alpha.1', 'not-a-version'])(
    'rejects out-of-range version %s with zero rows',
    (version) => {
      const state = computeBootState(unresolvedInput(version))
      expect(state.gate.accepted, version).toBe(false)
      expect(state.rows).toEqual([])
      expect(state.gate.codes).toContain('gate.version-mismatch')
      // Release policy is exact-only: no compatibility promise in diagnostics.
      expect(state.diagnostics.join('\n')).not.toContain('compat')
      expect(state.diagnostics.join('\n')).not.toContain('compatible versions')
    },
  )

  it.each(['0.3.0-rc.1', '0.2.1', '0.2.2-rc.1', '0.2.0'])(
    'fails closed for readable in-range uncertified version %s (no compat injection)',
    (version) => {
      // Exact released contracts only: a readable version inside the old
      // compatibility range must NOT be served a different build's contract.
      const state = computeBootState({ ...unresolvedInput(version), skinId: 'fjord' })
      expect(state.gate.accepted, version).toBe(false)
      expect(state.accepted, version).toBe(false)
      expect(state.rows, version).toEqual([])
      expect(state.gate.codes, version).toContain('gate.version-mismatch')
      expect(state.gate.adapterId, version).toBe('')
      expect(state.payload.adapterId, version).toBe('')
      expect(state.payload.hostVersion, version).toBe(version)
      expect(state.adapter, version).toBeUndefined()
      expect(state.diagnostics.join('\n'), version).toContain(version)
      expect(state.diagnostics.join('\n'), version).not.toContain('compat.mode')
      expect((state.payload as { compat?: boolean }).compat, version).toBeUndefined()
    },
  )

  it('trims whitespace around the observed version before the registry lookup', () => {
    // A padded-but-certified version is still the same exact version.
    const certified = SUPPORTED_HOST_VERSIONS[0]
    if (certified === undefined) return
    const state = computeBootState(unresolvedInput(` ${certified} `))
    expect(state.gate.observedHostVersion).toBe(certified)
    expect(state.gate.codes).not.toContain('gate.version-unknown')
  })

  it('lists the certified allowlist in diagnostics', () => {
    const state = computeBootState(unresolvedInput('9.9.9'))
    expect(state.gate.supportedHostVersions.length).toBeGreaterThan(0)
    for (const version of state.gate.supportedHostVersions) {
      expect(state.diagnostics.join('\n')).toContain(version)
    }
  })

  it('rejects an adapter override that disagrees with the observed version', () => {
    const adapter = makeAdapter()
    const state = computeBootState(makeBootInput({ adapter, observedHostVersion: 'test-host-other' }))
    expect(state.gate.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.adapter-mismatch')
  })
})

describe('computeBootState — catalog identity', () => {
  it('rejects a catalog built for another adapter', () => {
    const adapter = makeAdapter()
    const catalog = { ...makeAdapterCatalog(adapter), adapterId: 'dsh-other' }
    const state = computeBootState(makeBootInput({ adapter, catalog }))
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.adapter-mismatch')
  })

  it('rejects a catalog built for another contract', () => {
    const adapter = makeAdapter()
    const catalog = { ...makeAdapterCatalog(adapter), contractHash: `sha256:${'f'.repeat(64)}` }
    const state = computeBootState(makeBootInput({ adapter, catalog }))
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.contract-mismatch')
    expect(state.diagnostics.join('\n')).toContain('gate.contract-mismatch')
  })

  it('rejects a catalog whose profile does not match the adapter', () => {
    const adapter = makeAdapter()
    const catalog = { ...makeAdapterCatalog(adapter), catalogProfile: SYNTHETIC_PROFILE_B }
    const state = computeBootState(makeBootInput({ adapter, catalog }))
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.catalog-profile-mismatch')
  })
})

describe('computeBootState — skin, capability and render failures', () => {
  it('rejects an unknown/deleted skin id', () => {
    const state = computeBootState(makeBootInput({ skinId: 'deleted-livery' }))
    expect(state.gate.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.skin-unknown')
    expect(state.diagnostics.join('\n')).toContain('deleted-livery')
  })

  it('rejects a skin id known to another catalog profile only', () => {
    const adapter = makeAdapter()
    const catalog = buildCatalog(
      { ...adapter, catalogProfile: SYNTHETIC_PROFILE_B },
      makeProfile(SYNTHETIC_PROFILE_B, [makeLivery({ id: 'other-profile-livery' })]),
    )
    const state = computeBootState(makeBootInput({ adapter, catalog, skinId: 'other-profile-livery' }))
    expect(state.rows).toEqual([])
    // The catalog no longer matches the adapter profile, so identity closes first.
    expect(state.gate.codes).toContain('gate.catalog-profile-mismatch')
  })

  it('rejects a missing required capability on this adapter', () => {
    const adapter = makeAdapter({ capabilities: makeCapabilities(['theme-css']) })
    const state = computeBootState(makeBootInput({ adapter }))
    expect(state.gate.accepted).toBe(false)
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('capability.missing:theme-css')
    expect(state.gate.missingCapabilities).toEqual(['theme-css'])
  })

  it('rejects when the compiled boot stylesheet cannot be read', () => {
    const state = computeBootState(makeBootInput({
      renderBoot: () => {
        throw new Error('profile catalog corrupt')
      },
    }))
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.render-failed')
    expect(state.diagnostics.join('\n')).toContain('profile catalog corrupt')
  })

  it('rejects an empty compiled stylesheet', () => {
    const state = computeBootState(makeBootInput({ renderBoot: () => ({ css: '', hash: 'sha256:x' }) }))
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.render-failed')
  })

  it('rejects a compiled stylesheet without a hash', () => {
    const state = computeBootState(makeBootInput({ renderBoot: () => ({ css: FIXTURE_BOOT_CSS, hash: '' }) }))
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.render-failed')
  })

  it('rejects CSS containing a closing style tag instead of escaping it', () => {
    const state = computeBootState(makeBootInput({
      renderBoot: () => ({ css: 'body{content:"</style>"}', hash: 'sha256:x' }),
    }))
    expect(state.rows).toEqual([])
    expect(state.gate.codes).toContain('gate.render-failed')
  })
})

describe('row escaping', () => {
  it('never lets a malicious livery id close the script element', () => {
    const evilId = 'evil</script><script>alert(1)</script>'
    const adapter = makeAdapter()
    const catalog = makeAdapterCatalog(adapter, [makeLivery({ id: evilId })])
    const state = computeBootState(makeBootInput({ adapter, catalog, skinId: evilId }))
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
})
