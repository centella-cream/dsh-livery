/**
 * No compatibility backdoor: the client accepts exact certified triples only.
 * A payload claiming `dsh-compat` is rejected and no compat UI exists.
 */
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', async () => {
  const React = await import('react')
  type AnyProps = Record<string, unknown>
  return {
    Button: (props: AnyProps) => React.createElement('button', props as never),
    Input: (props: AnyProps) => React.createElement('input', props as never),
    Tag: (props: AnyProps) => React.createElement('span', props as never),
    Modal: () => null,
    Toast: () => null,
    writeClipboard: async () => true,
  }
})
import { checkBoot, checkCatalog, bootIdentity } from '../../src/client/handshake.js'
import { LiveryPanelPage } from '../../src/client/LiveryPanelPage.js'
import type { LiveryPanelPageProps } from '../../src/client/platform.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from '../../src/client/model.js'
import { createInitialSnapshot } from '../../src/client/model.js'
import { enUS, zhCN } from '../../src/i18n/index.js'
import { ADAPTERS, ADAPTER_IDENTITIES } from '../../src/generated/contract.js'
import { adapterRecordOf, makeBootPayload, makeCatalog, TEST_ADAPTER } from './fixtures.js'

const IDENTITY = {
  adapterId: TEST_ADAPTER.adapterId,
  contractHash: TEST_ADAPTER.contractHash,
  pluginVersion: '0.1.2',
  hostVersion: TEST_ADAPTER.hostVersion,
}
const catalog = makeCatalog()
const READY: LiveryRuntimeSnapshot = {
  ...createInitialSnapshot(IDENTITY, { status: 'valid', reason: undefined, diagnostics: [] }),
  phase: 'ready',
  bootStatus: 'valid',
  catalogStatus: 'ready',
  catalog,
  capabilities: catalog.capabilities,
  catalogProfile: catalog.catalogProfile,
  configStatus: 'ready',
  writable: true,
  confirmedId: 'fjord',
  effectiveId: 'fjord',
  locale: 'en',
}

function translate(dict: Record<string, string>): (key: string, params?: Record<string, unknown>) => string {
  return (key, params) => {
    const template = dict[key] ?? `!${key}`
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? `{${name}}`))
  }
}

function fakeRuntime(): LiveryRuntimeApi {
  return {
    getSnapshot: () => READY,
    subscribe: () => () => undefined,
    preview: () => false,
    cancelPreview: () => undefined,
    commitPreview: async () => false,
    restoreStock: async () => false,
    retryLastWrite: async () => false,
    retryCatalog: async () => undefined,
    observeTheme: () => () => undefined,
  }
}

describe('compatibility mode is rejected (exact certified triples only)', () => {
  it('rejects a dsh-compat payload even with an in-range version', () => {
    const payload = makeBootPayload({
      adapterId: 'dsh-compat',
      hostVersion: '0.3.0-rc.1',
      contractHash: TEST_ADAPTER.contractHash,
      catalogProfile: TEST_ADAPTER.catalogProfile,
      compat: true,
    })
    const check = checkBoot(payload, ADAPTER_IDENTITIES)
    expect(check.kind).toBe('mismatch')
    expect(check.adapter).toBeUndefined()
    expect(bootIdentity(check)).toBeUndefined()
    expect(check.reasons.join(' ')).toContain('uncertified host build')
  })

  it('rejects a compat-shaped catalog so the runtime falls back to degraded/stock', () => {
    const raw = {
      ...makeCatalog(),
      adapterId: 'dsh-compat',
      hostVersion: '0.3.0-rc.1',
    }
    const check = checkCatalog(raw, { adapters: ADAPTER_IDENTITIES })
    expect(check.catalog).toBeUndefined()
    expect(check.reasons.join(' ')).toContain('uncertified catalog identity')
  })

  it('still accepts the exact shipped certified pair', () => {
    const shipped = ADAPTERS[0]!
    const boot = checkBoot(makeBootPayload({
      hostVersion: shipped.hostVersion,
      adapterId: shipped.adapterId,
      contractHash: shipped.contractHash,
      catalogProfile: shipped.catalogProfile,
    }), ADAPTER_IDENTITIES)
    expect(boot.kind).toBe('valid')
    const served = makeCatalog(undefined, adapterRecordOf(shipped).capabilities, shipped)
    expect(checkCatalog(served, { adapters: ADAPTER_IDENTITIES, expected: bootIdentity(boot) }).catalog)
      .toBeDefined()
  })
})

describe('no compat UI copy or markers remain', () => {
  it('renders no compat banner/tag/self-check row on a page', () => {
    const props = { t: translate(enUS as unknown as Record<string, string>), runtime: fakeRuntime() } as unknown as LiveryPanelPageProps
    const html = renderToStaticMarkup(<LiveryPanelPage {...props} />)
    expect(html).not.toContain('livery-compat-notice')
    expect(html).not.toContain('livery-compat-selfcheck')
    expect(html).not.toMatch(/compat(?:ibility)? mode/i)
  })

  it('removed the dead i18n keys in both locales', () => {
    for (const key of ['state.compatMode', 'state.compatModeBody', 'check.compatMode', 'check.compatModeValue']) {
      expect(key in enUS, `en ${key}`).toBe(false)
      expect(key in zhCN, `zh ${key}`).toBe(false)
    }
  })
})
