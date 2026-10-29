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
import { LiverySettingsPage } from '../../src/client/ui/LiverySettingsPage.js'
import { formatDiagnostics } from '../../src/client/diagnostics.js'
import { SelfCheck } from '../../src/client/ui/SelfCheck.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from '../../src/client/model.js'
import { createInitialSnapshot } from '../../src/client/model.js'
import { LIVERY_VERSION } from '../../src/core/types.js'
import type { LiveryPageProps, LiverySettingsPageProps } from '../../src/client/platform.js'
import { enUS, zhCN } from '../../src/i18n/index.js'
import { ADAPTER_021_2, adapterRecordOf, makeCatalog, makeLivery, TEST_ADAPTER, TEST_PREVIEWS_BASE } from './fixtures.js'

const IDENTITY = {
  adapterId: TEST_ADAPTER.adapterId,
  contractHash: TEST_ADAPTER.contractHash,
  pluginVersion: '0.2.0',
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
    applyStyle: async () => ({ ok: true }),
    restoreStock: async () => false,
    retryLastWrite: async () => false,
    retryCatalog: async () => undefined,
    observeTheme: () => () => undefined,
  }
}

function render(snapshot: LiveryRuntimeSnapshot, locale: 'zh' | 'en' = 'en'): string {
  // The shell also passes the global standard-hook seat (usePanelInfo); the page
  // never reads it, so the render fixture omits it behind the composed type.
  const props = {
    t: translate(locale === 'zh' ? zhCN : enUS),
    close: () => undefined,
    runtime: fakeRuntime(snapshot),
  } as unknown as LiverySettingsPageProps
  return renderToStaticMarkup(<LiverySettingsPage {...props} />)
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

  it('renders the large hero and full-width gallery without a side rail', () => {
    const html = render(READY)
    expect(html).toContain('data-testid="livery-layout"')
    expect(html).toContain('data-testid="livery-current-card"')
    expect(html).toContain('data-testid="livery-gallery-card"')
    expect(html).toContain('data-testid="livery-hero-thumb"')
    expect(html).toContain('data-testid="livery-restore"')
    expect(html).not.toContain('data-testid="livery-actions-card"')
    expect(html).not.toContain('class="livery-rail"')
    expect(html).toContain('Current style')
    // Behavior hooks moved into cards but preserved verbatim.
    expect(html).toContain('data-testid="livery-current"')
    expect(html).toContain('data-testid="livery-gallery"')
    expect(html).toContain('data-testid="livery-restore"')
    expect(html).toContain('data-testid="livery-selfcheck"')
    // Hero preview, gallery, then secondary tools (DOM order == visual order).
    expect(html.indexOf('data-testid="livery-current-card"')).toBeLessThan(html.indexOf('data-testid="livery-gallery-card"'))
    expect(html.indexOf('data-testid="livery-gallery-card"')).toBeLessThan(html.indexOf('data-testid="livery-secondary"'))
    expect(html).toContain('data-testid="livery-gallery-toolbar"')
    expect(html).toContain('class="livery-hero__preview"')
    expect(html).not.toContain('class="livery-layout"')
    expect(html).not.toContain('class="livery-rail"')
    expect(html).toContain(`${TEST_PREVIEWS_BASE}fjord-en-light.svg`)
  })

  it('renders the current summary and family-grouped gallery hooks', () => {
    const html = render(READY)
    expect(html).toContain('data-testid="livery-current"')
    expect(html).toContain('data-testid="livery-gallery"')
    expect(html.match(/data-testid="livery-card"/g)).toHaveLength(2)
    expect(html).toContain('data-livery-id="fjord"')
    expect(html).toContain('data-livery-id="midnight"')
    expect(html).toContain('data-state="active"')
    expect(html).toContain('data-testid="livery-thumb"')
    expect(html).toContain(`${TEST_PREVIEWS_BASE}fjord-en-light.svg`)
    expect(html).toContain('aria-label="Visual Style fjord"')
    expect(html).toContain('data-testid="livery-search"')
    // Family chips are the primary filter row; tag chips live behind 更多筛选.
    expect(html.match(/data-testid="livery-family-chip"/g)).toHaveLength(7)
    expect(html).toContain('data-family="all"')
    expect(html).toContain('data-testid="livery-more-filters"')
    expect(html).not.toContain('data-testid="livery-tag"')
    // Both fixture styles are calm-family, so one presentation section wraps them.
    expect(html.match(/data-testid="livery-family"/g)).toHaveLength(1)
    expect(html).toContain('data-testid="livery-family-calm"')
    expect(html).toContain('data-testid="livery-restore"')
    expect(html).toContain('data-testid="livery-selfcheck"')
    expect(html).toContain('data-testid="livery-selfcheck-toggle"')
    // Apply/cancel only exist while a transient preview is active.
    expect(html).not.toContain('data-testid="livery-apply"')
  })

  it('renders human About copy and keeps ids in the diagnostics only', () => {
    const html = render(READY)
    expect(html).toContain('DSH Livery')
    expect(html).toContain(`Certified for DeepSeek Harness ${TEST_ADAPTER.hostVersion}`)
    expect(html).toContain('Gallery previews are generated from fixed scenes')
    expect(html).not.toContain('Contract ')
    expect(html).not.toContain('Adapter ')
    expect(html).not.toMatch(/契约|适配器/)
    const footer = /<footer class="livery-about"[\s\S]*?<\/footer>/.exec(html)?.[0] ?? ''
    const spans = footer.match(/<span/g) ?? []
    // Two distinct lines (block layout, not one run-on sentence); note is its own span.
    expect(spans.length).toBe(2)
    expect(footer).toMatch(/<\/span>\s*<span class="livery-about__note">/)
    expect(footer).not.toMatch(/Harness [0-9][^<]*Gallery previews/)
    const report = formatDiagnostics(translate(enUS), READY, 'en')
    expect(report).toContain(TEST_ADAPTER.adapterId)
    expect(report).toContain(TEST_ADAPTER.contractHash.replace('sha256:', '').slice(0, 12))
  })

  it('renders the preview-language tab and follows the host locale by default', () => {
    const html = render(READY)
    expect(html).toContain('data-testid="livery-locale-tab"')
    expect(html).toContain('data-testid="livery-locale-follow"')
    expect(html).toContain('data-testid="livery-locale-zh"')
    expect(html).toContain('data-testid="livery-locale-en"')
    // READY.locale === 'en' and the default choice is "follow DSH".
    expect(html).toMatch(/data-testid="livery-locale-follow"[^>]*aria-pressed="true"/)
    expect(html).toContain(`${TEST_PREVIEWS_BASE}fjord-en-light.svg`)
    expect(html).toContain('Preview language')
  })

  it('uses the host zh locale for previews when following DSH', () => {
    const html = render({ ...READY, locale: 'zh' }, 'zh')
    expect(html).toContain(`${TEST_PREVIEWS_BASE}fjord-zh-light.svg`)
    expect(html).toContain('预览语言')
    expect(html).toContain('跟随 DSH')
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
    expect(html).toContain('aria-label="风格-fjord"')
    expect(html).toContain(`${TEST_PREVIEWS_BASE}fjord-zh-light.svg`)
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
    expect(html).toContain('theme styles')
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
    expect(html).toContain('message layout')
    // Required-capability alert must not appear for the normal host fallbacks.
    expect(render(snapshot)).not.toContain('data-testid="livery-degraded"')
  })

  it('renders capability rows from the profile catalog (0.2.1 font role hooks)', () => {
    const profileCatalog = makeCatalog(undefined, adapterRecordOf(ADAPTER_021_2).capabilities, ADAPTER_021_2)
    const snapshot = {
      ...READY,
      catalog: profileCatalog,
      capabilities: profileCatalog.capabilities,
      catalogProfile: profileCatalog.catalogProfile,
      identity: {
        adapterId: ADAPTER_021_2.adapterId,
        contractHash: ADAPTER_021_2.contractHash,
        pluginVersion: LIVERY_VERSION,
        hostVersion: ADAPTER_021_2.hostVersion,
      },
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
    expect(html).toContain(enUS['check.profile'])
    expect(html).toContain(ADAPTER_021_2.catalogProfile)
    expect(html).toMatch(/data-capability="host-font-role-hooks" data-available="true"/)
    expect(html).toContain(ADAPTER_021_2.adapterId)
    expect(html).toContain(ADAPTER_021_2.hostVersion)
  })

  it('reports font role hooks as unavailable when the host does not document them', () => {
    const baseCapabilities = adapterRecordOf(TEST_ADAPTER).capabilities
    const capabilities = {
      ...baseCapabilities,
      'host-font-role-hooks': { ...baseCapabilities['host-font-role-hooks']!, available: false },
    }
    const profileCatalog = makeCatalog(undefined, capabilities, TEST_ADAPTER)
    const snapshot = {
      ...READY,
      catalog: profileCatalog,
      capabilities: profileCatalog.capabilities,
      catalogProfile: profileCatalog.catalogProfile,
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
    expect(html).toMatch(/data-capability="host-font-role-hooks" data-available="false"/)
    expect(html).toContain(TEST_ADAPTER.catalogProfile)
  })

  it('renders no unresolved dictionary keys', () => {
    const html = render(READY)
    expect(html).not.toMatch(/![a-z]+\.[a-z]/i)
  })
})
