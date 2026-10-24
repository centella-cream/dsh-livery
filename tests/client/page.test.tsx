/**
 * Server-render smoke tests for the settings page: catches JSX/import drift,
 * missing localization keys and the black-box test hooks the acceptance
 * harness relies on. No DOM is involved — the page only reads the runtime
 * snapshot and the dictionary during render.
 */
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// The shared primitives package pulls its own runtime dependencies (clsx) that
// are not part of this package's devDependency set. The page test only needs
// structural stubs to verify our JSX, localization and test hooks; the real
// components are exercised by the browser acceptance harness.
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
import { LiverySettingsPage } from '../../src/client/settings/LiverySettingsPage.js'
import { SelfCheck } from '../../src/client/settings/SelfCheck.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from '../../src/client/model.js'
import { createInitialSnapshot } from '../../src/client/model.js'
import type { LiveryPageProps } from '../../src/client/platform.js'
import { enUS, zhCN } from '../../src/i18n/index.js'
import { makeCatalog, makeLivery, TEST_CONTRACT_HASH } from './fixtures.js'

const IDENTITY = {
  adapterId: 'dsh-0.2.0-rc.2-r1',
  contractHash: TEST_CONTRACT_HASH,
  pluginVersion: '0.1.0',
  hostVersion: '0.2.0-rc.2',
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

function render(snapshot: LiveryRuntimeSnapshot, locale: 'zh' | 'en' = 'en'): string {
  return renderToStaticMarkup(
    <LiverySettingsPage
      t={translate(locale === 'zh' ? zhCN : enUS)}
      close={() => undefined}
      runtime={fakeRuntime(snapshot)}
    />,
  )
}

const base = createInitialSnapshot(IDENTITY, { status: 'valid', reason: undefined, diagnostics: [] })
const catalog = makeCatalog()

const READY: LiveryRuntimeSnapshot = {
  ...base,
  phase: 'ready',
  bootStatus: 'valid',
  catalogStatus: 'ready',
  catalog,
  capabilities: catalog.capabilities,
  configStatus: 'ready',
  writable: true,
  confirmedId: 'fjord',
  effectiveId: 'fjord',
  locale: 'en',
}

describe('settings page server render', () => {
  it('renders the loading state hook', () => {
    const html = render({ ...base, phase: 'loading' })
    expect(html).toContain('data-testid="livery-section"')
    expect(html).toContain('data-testid="livery-loading"')
    expect(html).not.toContain('data-testid="livery-gallery"')
  })

  it('renders the incompatible/handshake error state hook', () => {
    const html = render({ ...base, phase: 'degraded', bootStatus: 'mismatch', bootReason: 'adapter mismatch: a != b' })
    expect(html).toContain('data-testid="livery-error"')
    expect(html).toContain('adapter mismatch')
    expect(html).not.toContain('data-testid="livery-gallery"')
  })

  it('renders the current summary and the 10-card gallery hooks', () => {
    const html = render(READY)
    expect(html).toContain('data-testid="livery-current"')
    expect(html).toContain('data-testid="livery-gallery"')
    expect(html.match(/data-testid="livery-card"/g)).toHaveLength(2)
    expect(html).toContain('data-livery-id="fjord"')
    expect(html).toContain('data-livery-id="midnight"')
    expect(html).toContain('data-state="active"')
    expect(html).toContain('data-testid="livery-thumb"')
    expect(html).toContain('/livery/assets/previews/fjord-en-light.svg')
    expect(html).toContain('aria-label="Livery fjord"')
    expect(html).toContain('data-testid="livery-search"')
    expect(html).toContain('data-testid="livery-tag"')
    expect(html).toContain('data-tag="calm"')
    expect(html).toContain('data-testid="livery-restore"')
    expect(html).toContain('data-testid="livery-selfcheck"')
    expect(html).toContain('data-testid="livery-selfcheck-toggle"')
    // Apply/cancel only exist while a transient preview is active.
    expect(html).not.toContain('data-testid="livery-apply"')
  })

  it('renders the preview bar with apply/cancel hooks while previewing', () => {
    const html = render({ ...READY, phase: 'previewing', previewId: 'midnight' })
    expect(html).toContain('data-testid="livery-preview"')
    expect(html).toContain('data-testid="livery-apply"')
    expect(html).toContain('data-testid="livery-cancel"')
    expect(html).toContain('data-state="preview"')
  })

  it('renders the write-failure error state with a retry hook', () => {
    const html = render({ ...READY, writeFailure: 'refused' })
    expect(html).toContain('data-testid="livery-error"')
    expect(html).toContain(enUS['write.refused'])
    expect(html).toContain('data-testid="livery-retry"')
  })

  it('renders the offline/catalog-unavailable state without the gallery', () => {
    const html = render({
      ...READY,
      phase: 'degraded',
      catalogStatus: 'unavailable',
      catalog: undefined,
      capabilities: {},
      effectiveId: undefined,
    })
    expect(html).toContain('data-testid="livery-offline"')
    expect(html).toContain('data-testid="livery-retry-catalog"')
    expect(html).not.toContain('data-testid="livery-gallery"')
  })

  it('renders the stock summary and a disabled restore action when stock is applied', () => {
    const html = render({ ...READY, confirmedId: 'stock', effectiveId: 'stock' })
    expect(html).toContain(enUS['current.stockName'])
    expect(html).toMatch(/data-testid="livery-restore"[^>]*disabled/)
  })

  it('localizes card names, thumbnails and labels for zh', () => {
    const html = render({ ...READY, locale: 'zh' }, 'zh')
    expect(html).toContain('aria-label="皮肤-fjord"')
    expect(html).toContain('/livery/assets/previews/fjord-zh-light.svg')
    expect(html).toContain(zhCN['gallery.title'])
    expect(html).not.toContain(enUS['gallery.title'])
  })

  it('shows no degraded alert for optional-only capability fallbacks (certified behavior)', () => {
    const html = render({
      ...READY,
      degraded: [
        { id: 'host-density-tokens', reason: 'absent', fallback: 'host' },
        { id: 'host-transcript-width', reason: 'absent', fallback: 'host' },
        { id: 'host-message-flow', reason: 'absent', fallback: 'stock' },
      ],
    })
    expect(html).not.toContain('data-testid="livery-degraded"')
    expect(html).not.toContain(enUS['state.degradedTitle'])
  })

  it('renders a neutral information notice when a required capability is missing', () => {
    const html = render({ ...READY, phase: 'degraded', missingRequired: ['theme-css'] })
    expect(html).toContain('data-testid="livery-degraded"')
    expect(html).toContain('livery-notice--info')
    expect(html).not.toContain('livery-notice--warn')
    expect(html).toContain('theme CSS')
  })

  it('explains an unknown configured skin id without alert styling', () => {
    const html = render({
      ...READY,
      phase: 'degraded',
      effectiveId: 'stock',
      invalidSkinId: 'deleted-livery',
    })
    expect(html).toContain('data-testid="livery-degraded"')
    expect(html).toContain('deleted-livery')
  })

  it('reports optional degradation inside the self-check panel only', () => {
    const optionalCatalog = makeCatalog([
      makeLivery('fjord', {
        optional: ['host-density-tokens', 'host-transcript-width', 'host-message-flow'],
      }),
    ])
    const snapshot = {
      ...READY,
      catalog: optionalCatalog,
      capabilities: optionalCatalog.capabilities,
    }
    const html = renderToStaticMarkup(
      <SelfCheck
        t={translate(enUS)}
        snapshot={snapshot}
        onCopyResult={() => undefined}
        copyFailed={false}
        defaultOpen
      />,
    )
    expect(html).toContain('data-testid="livery-optional-info"')
    expect(html).toContain('density')
    expect(html).toContain('conversation width')
    expect(html).toContain('message flow')
    // Required-capability alert must not appear for the normal host fallbacks.
    expect(render(snapshot)).not.toContain('data-testid="livery-degraded"')
  })

  it('renders no unresolved dictionary keys', () => {
    const html = render(READY)
    expect(html).not.toMatch(/![a-z]+\.[a-z]/i)
  })
})
