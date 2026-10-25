/**
 * Compatibility-mode UI: an uncertified-but-in-range host is surfaced honestly
 * (banner + summary tag + self-check row) while the handshake itself stays
 * Lead-owned.
 */
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', async () => {
  const React = await import('react')
  type AnyProps = Record<string, unknown>
  const passthrough = (tag: string) => (props: AnyProps) =>
    React.createElement(tag, props as never)
  return {
    Button: passthrough('button'),
    Input: passthrough('input'),
    Tag: passthrough('span'),
    Modal: () => null,
    Toast: () => null,
    writeClipboard: async () => true,
  }
})
import { COMPAT_ADAPTER_ID } from '../../src/core/compat.js'
import { LiveryPanelPage } from '../../src/client/LiveryPanelPage.js'
import type { LiveryPanelPageProps } from '../../src/client/platform.js'
import { SelfCheck } from '../../src/client/ui/SelfCheck.js'
import { isCompatIdentity } from '../../src/client/ui/compat.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from '../../src/client/model.js'
import { createInitialSnapshot } from '../../src/client/model.js'
import { formatDiagnostics } from '../../src/client/diagnostics.js'
import { enUS, zhCN } from '../../src/i18n/index.js'
import { makeCatalog, TEST_ADAPTER } from './fixtures.js'

type Dict = Record<string, string>
type Translate = (key: string, params?: Record<string, unknown>) => string

function translate(dict: Dict): Translate {
  return (key: string, params?: Record<string, unknown>): string => {
    const template = dict[key] ?? `!${key}`
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? `{${name}}`))
  }
}

function fakeRuntime(snapshot: LiveryRuntimeSnapshot): LiveryRuntimeApi {
  return {
    getSnapshot: () => snapshot,
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

const base = createInitialSnapshot(
  {
    adapterId: TEST_ADAPTER.adapterId,
    contractHash: TEST_ADAPTER.contractHash,
    pluginVersion: '0.1.0',
    hostVersion: TEST_ADAPTER.hostVersion,
  },
  { status: 'valid', reason: undefined, diagnostics: [], catalogProfile: TEST_ADAPTER.catalogProfile },
)
const catalog = makeCatalog()

function snapshotWith(adapterId: string, hostVersion: string): LiveryRuntimeSnapshot {
  return {
    ...base,
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
    identity: { adapterId, contractHash: TEST_ADAPTER.contractHash, pluginVersion: '0.1.0', hostVersion },
  }
}

const COMPAT = snapshotWith(COMPAT_ADAPTER_ID, '0.3.0')
const CERTIFIED = snapshotWith(TEST_ADAPTER.adapterId, TEST_ADAPTER.hostVersion)

function renderPage(snapshot: LiveryRuntimeSnapshot, dict: Dict = enUS as unknown as Dict): string {
  const props = {
    t: translate(dict),
    runtime: fakeRuntime(snapshot),
  } as unknown as LiveryPanelPageProps
  return renderToStaticMarkup(<LiveryPanelPage {...props} />)
}

describe('compat identity helper', () => {
  it('recognizes only the synthesized compat adapter id', () => {
    expect(isCompatIdentity({ adapterId: COMPAT_ADAPTER_ID })).toBe(true)
    expect(isCompatIdentity({ adapterId: TEST_ADAPTER.adapterId })).toBe(false)
  })
})

describe('compatibility-mode notice', () => {
  it('shows the unverified banner and summary tag on a compat host', () => {
    const html = renderPage(COMPAT)
    expect(html).toContain('data-testid="livery-compat-notice"')
    expect(html).toContain('Compatibility mode (unverified)')
    expect(html).toContain('outside the certified matrix')
    expect(html).toContain('data-testid="livery-current"')
    expect(html).toContain('data-testid="livery-current-card"')
    // Banner + hero-card tag both carry the honest warning.
    expect(html.match(/Compatibility mode \(unverified\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it('localizes the compat notice in zh', () => {
    const html = renderPage(COMPAT, zhCN as unknown as Dict)
    expect(html).toContain('data-testid="livery-compat-notice"')
    expect(html).toContain('兼容模式（未认证）')
  })

  it('does not show the compat notice on a certified host', () => {
    const html = renderPage(CERTIFIED)
    expect(html).not.toContain('data-testid="livery-compat-notice"')
    expect(html).not.toContain('Compatibility mode (unverified)')
  })

  it('shows the compat row and one-line explanation in the self-check', () => {
    const props = {
      t: translate(enUS as unknown as Dict),
      snapshot: COMPAT,
      onCopyResult: () => undefined,
      copyFailed: false,
      defaultOpen: true,
    }
    const html = renderToStaticMarkup(<SelfCheck {...props} />)
    expect(html).toContain('data-testid="livery-compat-selfcheck"')
    expect(html).toContain('Compatibility mode')
    expect(html).toContain('Unverified (0.3.0)')
    expect(html).toContain('outside the certified matrix')
  })

  it('omits the compat row in the self-check on a certified host', () => {
    const props = {
      t: translate(enUS as unknown as Dict),
      snapshot: CERTIFIED,
      onCopyResult: () => undefined,
      copyFailed: false,
      defaultOpen: true,
    }
    const html = renderToStaticMarkup(<SelfCheck {...props} />)
    expect(html).not.toContain('data-testid="livery-compat-selfcheck"')
  })
})

describe('compat diagnostics', () => {
  it('marks the uncertified mode in the copyable report only on compat hosts', () => {
    const compatReport = formatDiagnostics(translate(enUS as unknown as Dict) as never, COMPAT, 'en')
    expect(compatReport).toContain('Compatibility mode: Unverified (0.3.0)')
    const certifiedReport = formatDiagnostics(translate(enUS as unknown as Dict) as never, CERTIFIED, 'en')
    expect(certifiedReport).not.toContain('Compatibility mode')
  })
})

describe('compat dictionary keys', () => {
  it('ships both locales and keeps the explanation localizable', () => {
    expect(enUS['state.compatMode']).toBe('Compatibility mode (unverified)')
    expect(zhCN['state.compatMode']).toBe('兼容模式（未认证）')
    expect(enUS['check.compatMode']).toBe('Compatibility mode')
    expect(zhCN['check.compatMode']).toBe('兼容模式')
    expect(enUS['state.compatModeBody']).toContain('certified matrix')
    expect(zhCN['state.compatModeBody']).toContain('认证矩阵')
  })
})
