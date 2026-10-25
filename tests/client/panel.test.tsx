/**
 * Server-render smoke tests for the main-panel page (sidebar plugin-navigation
 * composition) and the sidebar row icon. Confirms the verifier-facing markers
 * and that the shared workspace behaves identically to the settings fallback.
 */
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Structural stubs for the shared primitives package (its own runtime deps are
// not part of this package's devDependency set); real components run in the
// browser acceptance harness.
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
import { LiveryPanelIcon } from '../../src/client/LiveryPanelIcon.js'
import { LiveryPanelPage } from '../../src/client/LiveryPanelPage.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from '../../src/client/model.js'
import { createInitialSnapshot } from '../../src/client/model.js'
import type { LiveryPageProps, LiveryPanelPageProps } from '../../src/client/platform.js'
import { enUS, zhCN } from '../../src/i18n/index.js'
import { makeCatalog, TEST_ADAPTER } from './fixtures.js'

const IDENTITY = {
  adapterId: TEST_ADAPTER.adapterId,
  contractHash: TEST_ADAPTER.contractHash,
  pluginVersion: '0.1.0',
  hostVersion: TEST_ADAPTER.hostVersion,
}

function translate(dict: Record<string, string>): LiveryPageProps['t'] {
  return ((key: string, params?: Record<string, unknown>): string => {
    const template = dict[key] ?? `!${key}`
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? `{${name}}`))
  }) as unknown as LiveryPageProps['t']
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

/** The keyed `main` slot has no owner props; only the locale seat + runtime arrive. */
function render(snapshot: LiveryRuntimeSnapshot, locale: 'zh' | 'en' = 'en'): string {
  // The shell also passes the global standard-hook seat (usePanelInfo); the page
  // never reads it, so the render fixture omits it behind the composed type.
  const props = {
    t: translate(locale === 'zh' ? zhCN : enUS),
    runtime: fakeRuntime(snapshot),
  } as unknown as LiveryPanelPageProps
  return renderToStaticMarkup(<LiveryPanelPage {...props} />)
}

const base = createInitialSnapshot(IDENTITY, {
  status: 'valid',
  reason: undefined,
  diagnostics: [],
  catalogProfile: TEST_ADAPTER.catalogProfile,
})
const catalog = makeCatalog()

const READY: LiveryRuntimeSnapshot = {
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
}

describe('main-panel page server render', () => {
  it('renders both panel markers on the page root', () => {
    const html = render(READY)
    expect(html).toContain('data-testid="livery-panel"')
    expect(html).toContain('data-plugin-panel="true"')
  })

  it('keeps the shared livery-section root and the gallery hooks', () => {
    const html = render(READY)
    expect(html).toContain('data-testid="livery-section"')
    expect(html).toContain('data-testid="livery-gallery"')
    expect(html.match(/data-testid="livery-card"/g)).toHaveLength(2)
    expect(html).toContain('data-testid="livery-search"')
    expect(html).toContain('data-testid="livery-restore"')
    expect(html).toContain('data-testid="livery-selfcheck"')
  })

  it('renders the page title and description copy', () => {
    const html = render(READY)
    expect(html).toContain(enUS['panel.title'])
    expect(html).toContain(enUS['panel.description'])
    expect(html).toContain('<h1')
  })

  it('renders the preview bar actions while previewing', () => {
    const html = render({ ...READY, phase: 'previewing', previewId: 'midnight' })
    expect(html).toContain('data-testid="livery-preview"')
    expect(html).toContain('data-testid="livery-apply"')
    expect(html).toContain('data-testid="livery-cancel"')
  })

  it('localizes the page for zh', () => {
    const html = render({ ...READY, locale: 'zh' }, 'zh')
    expect(html).toContain(zhCN['panel.title'])
    expect(html).toContain(zhCN['panel.description'])
    expect(html).toContain('aria-label="皮肤-fjord"')
    expect(html).not.toContain(enUS['panel.description'])
  })

  it('keeps the self-check panel expandable inside the page', () => {
    const html = render(READY)
    expect(html).toContain('data-testid="livery-selfcheck-toggle"')
  })
})

describe('sidebar row icon', () => {
  it('draws an inline svg honoring geometry and selected state', () => {
    const inactive = renderToStaticMarkup(<LiveryPanelIcon size={16} active={false} />)
    expect(inactive).toContain('<svg')
    expect(inactive).toContain('width="16"')
    expect(inactive).toContain('height="16"')
    expect(inactive).toContain('aria-hidden="true"')
    expect(inactive).toContain('stroke-width="1.7"')
    const active = renderToStaticMarkup(<LiveryPanelIcon size={18} active />)
    expect(active).toContain('width="18"')
    expect(active).toContain('stroke-width="2"')
    // No external references in the glyph.
    expect(inactive).not.toContain('http')
    expect(inactive).not.toContain('url(')
  })
})
