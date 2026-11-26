/**
 * Wallpaper studio server-render tests: page tabs, built-in swatches, effect
 * sliders, custom URL controls, online controls and hydrated persisted state.
 */
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
import { LiveryPanelPage } from '../../src/client/LiveryPanelPage.js'
import type { LiveryPanelPageProps } from '../../src/client/platform.js'
import { LiveryWorkspace } from '../../src/client/ui/LiveryWorkspace.js'
import type { LiveryWorkspaceProps } from '../../src/client/ui/LiveryWorkspace.js'
import { STYLE_DISABLED_REASON_ID, WallpaperPanel, sourceTabForKeyboard } from '../../src/client/ui/WallpaperPanel.js'
import { createOnlineStudio } from '../../src/client/ui/wallpaper-online.js'
import type { OnlineStudio } from '../../src/client/ui/wallpaper-online.js'
import { RECENT_WALLPAPER_KEY } from '../../src/client/wallpaper/history.js'
import type { WallpaperPanelProps } from '../../src/client/ui/WallpaperPanel.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from '../../src/client/model.js'
import { createInitialSnapshot } from '../../src/client/model.js'
import {
  BUILTIN_WALLPAPER_IDS,
  CLASSIC_BUILTIN_IDS,
  DEFAULT_WALLPAPER_EFFECTS,
  VISIBLE_BUILTIN_IDS,
  WALLPAPER_STORAGE_KEY,
} from '../../src/client/wallpaper.js'
import type { TokenMap } from '../../src/core/types.js'
import type { OnlinePageFailure, OnlinePageOk, WallpaperProviderResult } from '../../src/client/wallpaper/providers.js'
import { createWallpaperController, setWallpaperController } from '../../src/client/wallpaper/controller.js'
import { rememberedPageTab, rememberPageTab, resetRememberedPageTab } from '../../src/client/ui/tabs.js'
import type { WallpaperStorage } from '../../src/client/wallpaper/controller.js'
import { enUS, zhCN } from '../../src/i18n/index.js'
import { makeCatalog, TEST_ADAPTER } from './fixtures.js'

const IDENTITY = {
  adapterId: TEST_ADAPTER.adapterId,
  contractHash: TEST_ADAPTER.contractHash,
  pluginVersion: '0.3.0',
  hostVersion: TEST_ADAPTER.hostVersion,
}

type Dict = Record<string, string>
type Translate = (key: string, params?: Record<string, unknown>) => string
type OnlinePageOutcome = OnlinePageOk | OnlinePageFailure

function translate(dict: Dict): Translate {
  return (key: string, params?: Record<string, unknown>): string => {
    const template = dict[key] ?? `!${key}`
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? `{${name}}`))
  }
}

class MemoryStorage implements WallpaperStorage {
  readonly map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
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
    applyStyle: async () => ({ ok: true }),
  }
}

/** Light/dark token maps with every style-wallpaper recipe token present. */
const LIGHT_TOKENS: TokenMap = {
  '--dsw-alias-brand-primary': '#b46000',
  '--dsw-alias-bg-layer-3': '#ededed',
  '--dsw-alias-bg-base': '#fafafa',
  '--dsw-alias-bg-layer-2': '#f5f5f5',
}
const DARK_TOKENS: TokenMap = {
  '--dsw-alias-brand-primary': '#ffcc66',
  '--dsw-alias-bg-layer-3': '#2a2a2a',
  '--dsw-alias-bg-base': '#0b0e14',
  '--dsw-alias-bg-layer-2': '#11151d',
}
/** Snapshot with a non-stock applied livery but no catalog tokens yet. */
const NO_TOKENS: LiveryRuntimeSnapshot = {
  ...READY,
  catalog: undefined,
  catalogStatus: 'idle',
  confirmedId: undefined,
  effectiveId: undefined,
}
/** Dark-mode snapshot for the mode-specific style preview. */
const READY_DARK: LiveryRuntimeSnapshot = { ...READY, themeMode: 'dark' }
/** Chinese-locale snapshot (provider names follow the runtime locale). */
const READY_ZH: LiveryRuntimeSnapshot = { ...READY, locale: 'zh' }

/** One online provider result fixture in the frozen registry shape. */
function resultFixture(patch: Partial<WallpaperProviderResult> = {}): WallpaperProviderResult {
  return {
    providerId: 'wikimedia',
    id: 'file-7',
    title: 'Harbour at dusk',
    creator: 'A. Photographer',
    creatorUrl: 'https://commons.wikimedia.org/wiki/User:A',
    license: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Harbour.jpg',
    fullUrl: 'https://upload.wikimedia.org/harbour.jpg',
    thumbUrl: 'https://upload.wikimedia.org/harbour-thumb.jpg',
    ...patch,
  }
}

/** Build an activated studio with one scripted page outcome. */
async function activatedStudio(
  outcome: OnlinePageOutcome,
  options: { readonly provider?: string; readonly query?: string } = {},
): Promise<OnlineStudio> {
  const studio = createOnlineStudio({ fetchPage: async () => outcome })
  if (options.provider !== undefined) studio.setProvider(options.provider)
  if (options.query !== undefined) studio.setQuery(options.query)
  await studio.activate()
  return studio
}

function renderPanel(
  dict: Dict = enUS as unknown as Dict,
  snapshot: LiveryRuntimeSnapshot = READY,
  options: { readonly onlineStudio?: OnlineStudio } = {},
): string {
  const props = {
    t: translate(dict),
    snapshot,
    ...(options.onlineStudio === undefined ? {} : { onlineStudio: options.onlineStudio }),
  } as unknown as WallpaperPanelProps
  return renderToStaticMarkup(<WallpaperPanel {...props} />)
}

function renderWorkspace(
  dict: Dict = enUS as unknown as Dict,
  options: { initialTab?: 'style' | 'wallpaper'; snapshot?: LiveryRuntimeSnapshot } = {},
): string {
  const props = {
    t: translate(dict),
    runtime: fakeRuntime(options.snapshot ?? READY),
    initialTab: options.initialTab,
  } as unknown as LiveryWorkspaceProps
  return renderToStaticMarkup(<LiveryWorkspace {...props} />)
}

let storage: MemoryStorage
let controller: ReturnType<typeof createWallpaperController>

beforeEach(() => {
  resetRememberedPageTab()
  vi.unstubAllGlobals()
  storage = new MemoryStorage()
  controller = createWallpaperController({ storage, document: undefined })
  setWallpaperController(controller)
})

afterEach(() => {
  controller.dispose()
  setWallpaperController(undefined)
  resetRememberedPageTab()
  vi.unstubAllGlobals()
})

describe('page tabs', () => {
  it('renders 风格 / 壁纸 tabs with the style panel selected by default', () => {
    const html = renderWorkspace()
    expect(html).toContain('data-testid="livery-page-tabs"')
    expect(html).toContain('data-testid="livery-page-tab-style"')
    expect(html).toContain('data-testid="livery-page-tab-wallpaper"')
    expect(html).toMatch(/data-testid="livery-page-tab-style"[^>]*aria-selected="true"/)
    expect(html).toMatch(/data-testid="livery-page-tab-wallpaper"[^>]*aria-selected="false"/)
    expect(html).toContain('data-testid="livery-tabpanel-style"')
    expect(html).not.toContain('data-testid="livery-tabpanel-wallpaper"')
    expect(html).toContain('role="tablist"')
  })

  it('switches to the wallpaper tab when it is the initial tab', () => {
    const html = renderWorkspace(enUS as unknown as Dict, { initialTab: 'wallpaper' })
    expect(html).toMatch(/data-testid="livery-page-tab-wallpaper"[^>]*aria-selected="true"/)
    expect(html).toContain('data-testid="livery-tabpanel-wallpaper"')
    expect(html).toContain('data-testid="wallpaper-panel"')
    expect(html).not.toContain('data-testid="livery-tabpanel-style"')
    expect(html).not.toContain('data-testid="livery-gallery"')
  })

  it('restores the wallpaper tab after a remount (module scope + sessionStorage)', () => {
    rememberPageTab('wallpaper')
    const first = renderWorkspace()
    expect(first).toContain('data-testid="livery-tabpanel-wallpaper"')
    expect(first).not.toContain('data-testid="livery-tabpanel-style"')
    // A second render emulates the workspace remounting/navigating back.
    const second = renderWorkspace()
    expect(second).toContain('data-testid="livery-tabpanel-wallpaper"')
    expect(second).toMatch(/data-testid="livery-page-tab-wallpaper"[^>]*aria-selected="true"/)
    expect(rememberedPageTab()).toBe('wallpaper')
  })

  it('falls back to a sessionStorage tab when module memory is empty', () => {
    vi.stubGlobal('sessionStorage', {
      value: 'wallpaper',
      getItem: () => 'wallpaper',
      setItem: () => undefined,
      removeItem: () => undefined,
    })
    // reset clears module memory; simulate a fresh page load reading sessionStorage.
    resetRememberedPageTab()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => (key === 'dsh-livery.page-tab.v1' ? 'wallpaper' : null),
      setItem: () => undefined,
      removeItem: () => undefined,
    })
    const html = renderWorkspace()
    expect(html).toContain('data-testid="livery-tabpanel-wallpaper"')
  })

  it('lets an explicit initialTab win over the remembered tab', () => {
    rememberPageTab('wallpaper')
    const html = renderWorkspace(enUS as unknown as Dict, { initialTab: 'style' })
    expect(html).toContain('data-testid="livery-tabpanel-style"')
    expect(html).not.toContain('data-testid="livery-tabpanel-wallpaper"')
  })

  it('never rewrites the remembered tab from wallpaper selection', () => {
    rememberPageTab('wallpaper')
    controller.start()
    controller.setSelection({ kind: 'builtin', id: 'aurora' })
    controller.setEffects({ atmosphere: 5 })
    controller.clear()
    expect(rememberedPageTab()).toBe('wallpaper')
  })

  it('shows the same tabs on the keyed main panel page', () => {
    const props = { t: translate(zhCN as unknown as Dict), runtime: fakeRuntime(READY) } as unknown as LiveryPanelPageProps
    const html = renderToStaticMarkup(<LiveryPanelPage {...props} />)
    expect(html).toContain('data-testid="livery-panel"')
    expect(html).toContain('data-testid="livery-page-tabs"')
    expect(html).toContain('视觉风格')
    expect(html).toContain('壁纸')
    expect(html).toContain('data-testid="livery-tabpanel-style"')
  })
})

describe('online request policy (panel)', () => {
  it('defaults to the Online tab before the automatic Random batch settles', () => {
    const html = renderPanel()
    expect(html).toMatch(/data-testid="wallpaper-source-tab-online"[^>]*aria-selected="true"/)
    expect(html).toMatch(/data-testid="wallpaper-source-tab-builtin"[^>]*aria-selected="false"/)
    expect(html).not.toMatch(/data-testid="wallpaper-source-panel-online"[^>]*hidden/)
    expect(html).toMatch(/data-testid="wallpaper-source-panel-builtin"[^>]*hidden=""/)
    // Server rendering runs no effects; the client auto-Random effect owns the request.
    expect(html).not.toContain('data-testid="wallpaper-status"')
    expect(html).not.toContain('data-testid="wallpaper-result"')
    expect(html).not.toContain('data-testid="wallpaper-served-by"')
    expect(html).not.toContain('data-testid="wallpaper-online-error"')
  })

  it('renders no state for an idle injected studio', () => {
    const studio = createOnlineStudio({
      fetchPage: async () => { throw new Error('a request must not run on mount') },
    })
    const html = renderPanel(enUS as unknown as Dict, READY, { onlineStudio: studio })
    expect(studio.getSnapshot().status).toBe('idle')
    expect(html).not.toContain('data-testid="wallpaper-status"')
  })

  it('renders the ready results, served-by provider and result thumbnails only', async () => {
    const studio = await activatedStudio({ ok: true, results: [resultFixture()], servedBy: 'wikimedia' })
    const html = renderPanel(enUS as unknown as Dict, READY, { onlineStudio: studio })
    expect(html).toMatch(/data-testid="wallpaper-status"[^>]*data-status="ready"/)
    expect(html).toContain('data-testid="wallpaper-served-by"')
    expect(html).toContain('Served by Wikimedia Commons')
    expect(html.match(/data-testid="wallpaper-result"/g)).toHaveLength(1)
    expect(html.match(/data-testid="wallpaper-result-thumb"/g)).toHaveLength(1)
    expect(html).toContain('data-provider="wikimedia"')
    expect(html).toContain('data-wallpaper-url="https://upload.wikimedia.org/harbour.jpg"')
    expect(html).toContain('src="https://upload.wikimedia.org/harbour-thumb.jpg"')
  })

  it('renders one failure block with Retry and Built-in/None escape links', async () => {
    const studio = await activatedStudio({
      ok: false,
      failure: 'rate-limited',
      retryAfterMs: 21_000,
      tried: ['openverse', 'wikimedia'],
    })
    const html = renderPanel(enUS as unknown as Dict, READY, { onlineStudio: studio })
    expect(html).toMatch(/data-testid="wallpaper-status"[^>]*data-status="rate-limited"/)
    expect(html).toMatch(/data-testid="wallpaper-online-error"[^>]*role="alert"/)
    expect(html).toContain('data-testid="wallpaper-online-retry"')
    expect(html).toContain('data-testid="wallpaper-online-builtin"')
    expect(html).toContain('data-testid="wallpaper-online-none"')
    expect(html).toContain('data-testid="wallpaper-retry-after"')
    expect(html).toContain('21 seconds')
    expect(html).not.toContain('data-testid="wallpaper-result"')
  })

  it('renders the explicit empty state as settled, not a failure', async () => {
    const studio = await activatedStudio({ ok: true, results: [], servedBy: 'openverse' })
    const html = renderPanel(enUS as unknown as Dict, READY, { onlineStudio: studio })
    expect(html).toMatch(/data-testid="wallpaper-status"[^>]*data-status="empty"/)
    expect(html).toContain('data-testid="wallpaper-online-empty"')
    expect(html).not.toContain('data-testid="wallpaper-online-error"')
    expect(html).not.toContain('data-testid="wallpaper-result"')
  })

  it('renders a native provider select labelled Source with Auto first', () => {
    const html = renderPanel()
    expect(html).toContain('id="wallpaper-provider"')
    expect(html).toContain('data-testid="wallpaper-provider"')
    expect(html).toContain('for="wallpaper-provider"')
    expect(html).toContain('>Source<')
    expect(html).toContain('data-testid="wallpaper-provider"')
    const autoIndex = html.indexOf('value="auto"')
    const wikimediaIndex = html.indexOf('value="wikimedia"')
    expect(autoIndex).toBeGreaterThan(-1)
    expect(autoIndex).toBeLessThan(wikimediaIndex)
    expect(html).not.toContain('value="openverse"')
    expect(html).toContain('>Wikimedia Commons<')
  })

  it('disables capability-gated actions and describes the reason', () => {
    const studio = createOnlineStudio({
      fetchPage: async () => ({ ok: true, results: [], servedBy: 'openverse' }),
    })
    studio.setProvider('openverse')
    const html = renderPanel(enUS as unknown as Dict, READY, { onlineStudio: studio })
    // Openverse is legacy-only and declares neither capability.
    expect(html).toMatch(/data-testid="wallpaper-search-go"[^>]*disabled/)
    expect(html).toMatch(/data-testid="wallpaper-random"[^>]*disabled/)
    expect(html).toMatch(/data-testid="wallpaper-random"[^>]*aria-describedby="wallpaper-capability-reason"/)
    expect(html).toContain('id="wallpaper-capability-reason"')
    expect(html).toContain('This source cannot search')
    expect(html).toContain('This source is search-only; Random is unavailable')
    // Refresh has nothing to repeat before a request runs.
    expect(html).toMatch(/data-testid="wallpaper-refresh"[^>]*disabled/)
  })



  it('shows the Openverse notice for a stored legacy selection without fetching it', () => {
    controller.setSelection({
      kind: 'remote',
      url: 'https://api.openverse.org/v1/images/abc/thumb/',
      provenance: { providerId: 'openverse', source: 'Openverse' },
    })
    const html = renderPanel()
    expect(html).toContain('data-testid="wallpaper-openverse-notice"')
    expect(html).toContain('Not endorsed or certified by Openverse')
  })

  it('renders a direct selection as an <img> with the thumbnail and disables atmosphere', () => {
    controller.setSelection({
      kind: 'remote',
      url: 'https://openaccess-cdn.clevelandart.org/1_print.jpg',
      delivery: 'direct',
      thumbnail: 'https://openaccess-cdn.clevelandart.org/1_web.jpg',
      provenance: { providerId: 'cleveland', title: 'Art' },
    })
    const html = renderPanel()
    expect(html).toContain('class="wallpaper-hero__img"')
    expect(html).toContain('src="https://openaccess-cdn.clevelandart.org/1_web.jpg"')
    expect(html).toContain('referrerPolicy="no-referrer"')
    expect(html).toMatch(/data-testid="wallpaper-atmosphere"[^>]*disabled/)
  })

  it('renders licence-less results as readable but non-selectable', async () => {
    const studio = await activatedStudio({
      ok: true,
      results: [resultFixture({ license: null })],
      servedBy: 'wikimedia',
    })
    const html = renderPanel(enUS as unknown as Dict, READY, { onlineStudio: studio })
    expect(html).toMatch(/data-testid="wallpaper-result"[^>]*data-selectable="false"/)
    expect(html).toMatch(/aria-disabled="true"[^>]*data-testid="wallpaper-result"/)
    expect(html).toContain('No reusable licence; cannot be applied.')
    expect(html).not.toMatch(/data-testid="wallpaper-result"[^>]*disabled/)
  })

  it('associates a provider failure with the search control and a stable error id', async () => {
    const studio = await activatedStudio({ ok: false, failure: 'unavailable', tried: ['openverse'] })
    const html = renderPanel(enUS as unknown as Dict, READY, { onlineStudio: studio })
    expect(html).toContain('id="wallpaper-online-error"')
    expect(html).toMatch(/data-testid="wallpaper-search"[^>]*aria-invalid="true"/)
    expect(html).toMatch(/data-testid="wallpaper-search"[^>]*aria-describedby="wallpaper-online-error"/)
    expect(html).toMatch(/data-testid="wallpaper-search"[^>]*aria-errormessage="wallpaper-online-error"/)
  })

  it('localizes the online states in Chinese', async () => {
    const studio = await activatedStudio({ ok: true, results: [resultFixture()], servedBy: 'wikimedia' })
    const html = renderPanel(zhCN as unknown as Dict, READY_ZH, { onlineStudio: studio })
    expect(html).toContain('由 维基共享资源 提供')
    expect(html).toContain('来源')
    expect(html).not.toContain('!wallpaper.')
  })
})

describe('recent wallpapers card', () => {
  it('shows stored recent online wallpapers with thumbnails and clear action', () => {
    const store = {
      value: JSON.stringify([
        { url: 'https://cdn.example/a.jpg', thumbnail: 'https://cdn.example/a-t.jpg', title: 'Result A', source: 'openverse.org', addedAt: 2 },
        { url: 'https://cdn.example/b.jpg', title: 'Result B', source: 'picsum.photos', addedAt: 1 },
      ]),
      getItem(key: string): string | null { return key === RECENT_WALLPAPER_KEY ? this.value : null },
      setItem(): void { /* no-op */ },
      removeItem(): void { this.value = '' },
    }
    vi.stubGlobal('localStorage', store)
    const html = renderPanel()
    vi.unstubAllGlobals()
    expect(html).toContain('data-testid="wallpaper-recent-card"')
    expect(html.match(/data-testid="wallpaper-recent-item"/g)).toHaveLength(2)
    expect(html).toContain('data-url="https://cdn.example/a.jpg"')
    expect(html).toContain('data-cached="false"')
    expect(html).toContain('data-testid="wallpaper-recent-clear"')
    expect(html).not.toContain('src="https://cdn.example/a-t.jpg"')
    expect(html).toContain('Recent wallpapers')
    // Recent card sits after the online card and before the custom card.
    const online = html.indexOf('data-testid="wallpaper-online-card"')
    const recent = html.indexOf('data-testid="wallpaper-recent-card"')
    const custom = html.indexOf('data-testid="wallpaper-custom-card"')
    expect(online).toBeLessThan(recent)
    expect(recent).toBeLessThan(custom)
  })

  it('hides the recent card when there is no history', () => {
    vi.stubGlobal('localStorage', undefined)
    const html = renderPanel()
    vi.unstubAllGlobals()
    expect(html).not.toContain('data-testid="wallpaper-recent-card"')
  })
})

describe('focal position nine-grid', () => {
  const ALL_RADIOS = /data-testid="wallpaper-position-(?:top-left|top|top-right|left|center|right|bottom-left|bottom|bottom-right)"/g

  it('renders a native radio group only for remote/upload selections', () => {
    // No wallpaper: no position control.
    expect(renderPanel()).not.toContain('data-testid="wallpaper-position"')

    // Built-in designs cannot be repositioned.
    controller.setSelection({ kind: 'builtin', id: 'ember' })
    let html = renderPanel()
    expect(html).toContain('data-testid="wallpaper-hero-preview"')
    expect(html).not.toContain('data-testid="wallpaper-position"')

    // Remote: native radios in one group, centered by default.
    controller.setSelection({ kind: 'remote', url: 'https://example.com/w.jpg' })
    html = renderPanel()
    expect(html).toContain('<fieldset class="wallpaper-position" data-testid="wallpaper-position">')
    expect(html).toContain('<legend class="livery-ui-card__title">Focal point</legend>')
    expect(html.match(ALL_RADIOS)).toHaveLength(9)
    expect(html.match(/type="radio"/g)).toHaveLength(9)
    expect(html.match(/name="wallpaper-position"/g)).toHaveLength(9)
    expect(html).toMatch(/data-testid="wallpaper-position-center"[^>]*checked/)
    expect(html).not.toMatch(/data-testid="wallpaper-position-top-left"[^>]*checked/)
    for (const pair of ['0,0', '50,0', '100,0', '0,50', '50,50', '100,50', '0,100', '50,100', '100,100']) {
      expect(html).toContain(`value="${pair}"`)
    }

    // Upload selections can be repositioned too.
    controller.setSelection({ kind: 'upload', key: 'upload-1-abc' })
    expect(renderPanel()).toContain('data-testid="wallpaper-position"')
  })

  it('localizes the group, labels and hint in both locales', () => {
    controller.setSelection({ kind: 'remote', url: 'https://example.com/w.jpg' })
    const zh = renderPanel(zhCN as unknown as Dict)
    expect(zh).toContain('焦点位置')
    expect(zh).toContain('左上')
    expect(zh).toContain('居中')
    expect(zh).toContain('右下')
    expect(zh).toContain('只有在线/上传图片可调整焦点。')
    const en = renderPanel()
    expect(en).toContain('Top left')
    expect(en).toContain('Center')
    expect(en).toContain('Bottom right')
    expect(en).toContain('Only online/uploaded images can be repositioned.')
  })

  it('reflects a persisted position in the checked radio and the hero preview', () => {
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      revision: 3,
      selection: { kind: 'remote', url: 'https://example.com/p.jpg' },
      effects: { blur: 8, dim: 25, frost: 35, atmosphere: 30 },
      position: { x: 0, y: 100 },
    }))
    controller.start()
    const html = renderPanel()
    expect(html).toMatch(/data-testid="wallpaper-position-bottom-left"[^>]*checked/)
    // No verified blob exists in this SSR fixture; remote CSS must stay empty.
    expect(html).toContain('data-testid="wallpaper-hero-empty"')
    expect(html).not.toMatch(/data-testid="wallpaper-position-center"[^>]*checked/)
  })

  it('moves the checked state with controller.setPosition and keeps built-ins centered', () => {
    controller.setSelection({ kind: 'remote', url: 'https://example.com/w.jpg' })
    controller.setPosition({ x: 100, y: 0 })
    const html = renderPanel()
    expect(html).toMatch(/data-testid="wallpaper-position-top-right"[^>]*checked/)

    // The saved state is a schema v2 position (batch transition covered in the
    // controller suite; here we assert the controller snapshot contract).
    expect(controller.getSnapshot().position).toEqual({ x: 100, y: 0 })

    controller.setSelection({ kind: 'builtin', id: 'sea' })
    expect(controller.getSnapshot().position).toEqual({ x: 100, y: 0 })
    const builtin = renderPanel()
    expect(builtin).not.toContain('data-testid="wallpaper-position"')
    expect(builtin).toContain('background-position:center')
  })
})

describe('wallpaper error accessibility', () => {
  it('associates upload and URL errors with their controls', () => {
    const source = readFileSync(new URL('../../src/client/ui/WallpaperPanel.tsx', import.meta.url), 'utf8')
    expect(source).toContain('id="wallpaper-upload-error"')
    expect(source).toContain('aria-describedby={uploadProblem === undefined ? undefined : \'wallpaper-upload-error\'}')
    expect(source).toContain('id="wallpaper-url-error"')
    expect(source).toContain('aria-describedby={problem === undefined ? undefined : \'wallpaper-url-error\'}')
  })
})

describe('wallpaper studio render', () => {
  it('renders the preset cards, the default Online tab, effects, upload and URL controls', () => {
    const html = renderPanel()
    expect(html).toContain('data-testid="preset-card"')
    expect(html).toContain('data-testid="wallpaper-panel"')
    // Background preset cards sit above the four source tabs.
    expect(html).toContain('data-testid="wallpaper-presets"')
    expect(html).toContain('Background presets')
    expect(html).toMatch(/data-testid="wallpaper-preset-none"[^>]*aria-pressed="true"/)
    expect(html).toMatch(/data-testid="wallpaper-preset-style"[^>]*aria-pressed="false"/)
    expect(html).not.toMatch(/data-testid="wallpaper-preset-style"[^>]*disabled/)
    expect(html).toContain('Or choose an image')
    expect(html.indexOf('data-testid="wallpaper-presets"')).toBeLessThan(html.indexOf('data-testid="wallpaper-source-tabs"'))
    // Default image tab is Online; the offline built-in panel still renders below.
    expect(html).toMatch(/data-testid="wallpaper-source-tab-online"[^>]*aria-selected="true"/)
    expect(html).toMatch(/data-testid="wallpaper-source-tab-builtin"[^>]*aria-selected="false"/)
    expect(html).not.toMatch(/data-testid="wallpaper-source-panel-online"[^>]*hidden/)
    expect(html).toMatch(/data-testid="wallpaper-source-panel-builtin"[^>]*hidden=""/)
    expect(html.match(/data-testid="wallpaper-builtin"/g)).toHaveLength(8)
    for (const id of VISIBLE_BUILTIN_IDS) {
      expect(html).toContain(`data-wallpaper-id="${id}"`)
    }
    expect(html.match(/data-testid="wallpaper-builtin-classic-swatch"/g)).toHaveLength(16)
    for (const id of CLASSIC_BUILTIN_IDS) {
      expect(html).toContain(`data-wallpaper-id="${id}"`)
    }
    // All 24 ids still render exactly once.
    for (const id of BUILTIN_WALLPAPER_IDS) {
      expect(html.match(new RegExp(`data-wallpaper-id="${id}"`, 'g'))).toHaveLength(1)
    }
    expect(html).toContain('data-testid="wallpaper-builtin-classic"')
    expect(html).toContain('Classic built-in designs (16)')
    expect(html).not.toContain('data-testid="wallpaper-builtin-pinned"')
    expect(html).toContain('data-testid="wallpaper-no-request-hint"')
    expect(html).toContain('data-testid="wallpaper-blur"')
    expect(html).toContain('data-testid="wallpaper-dim"')
    expect(html).toContain('data-testid="wallpaper-frost"')
    expect(html).toContain('data-testid="wallpaper-atmosphere"')
    expect(html.match(/type="range"/g)).toHaveLength(4)
    expect(html).toContain('data-testid="wallpaper-reset"')
    // Clear stays present (disabled in the empty hero) so the testid contract holds.
    expect(html).toContain('data-testid="wallpaper-clear"')
    expect(html).toMatch(/data-testid="wallpaper-clear"[^>]*disabled/)
    // Workbench (hero + effects) precedes the single source selector; no rail.
    expect(html).toContain('data-testid="wallpaper-workbench"')
    expect(html).toContain('data-testid="wallpaper-hero"')
    expect(html).toContain('data-testid="wallpaper-hero-empty"')
    expect(html).toContain('data-testid="wallpaper-effects-card"')
    expect(html).toContain('data-testid="wallpaper-effects-grid"')
    expect(html).toContain('data-testid="wallpaper-source-card"')
    expect(html).toContain('data-testid="wallpaper-source-tabs"')
    expect(html).toContain('data-testid="wallpaper-source-tab-online"')
    expect(html).toContain('data-testid="wallpaper-source-tab-builtin"')
    expect(html).toContain('data-testid="wallpaper-source-tab-recent"')
    expect(html).toContain('data-testid="wallpaper-source-tab-local"')
    expect(html).toContain('data-testid="wallpaper-online-card"')
    expect(html).toContain('data-testid="wallpaper-custom-card"')
    expect(html).toContain('data-testid="wallpaper-builtins-card"')
    expect(html.match(/role="tab"/g)?.length).toBeGreaterThanOrEqual(4)
    expect(html).toContain('data-testid="wallpaper-manage"')
    expect(html).not.toContain('wallpaper-rail')
    expect(html.indexOf('data-testid="wallpaper-hero"')).toBeLessThan(html.indexOf('data-testid="wallpaper-effects-card"'))
    expect(html.indexOf('data-testid="wallpaper-effects-card"')).toBeLessThan(html.indexOf('data-testid="wallpaper-source-card"'))
    expect(html.indexOf('data-testid="wallpaper-source-card"')).toBeLessThan(html.indexOf('data-testid="wallpaper-manage"'))
    expect(html).toContain('Current wallpaper')
    expect(html).toContain('Online wallpapers')
    // Status/results appear only after an explicit request; the page opens idle.
    expect(html).not.toContain('data-testid="wallpaper-status"')
    expect(html.match(/data-testid="wallpaper-result"/g)).toBeNull()
    // Upload section: hidden file input + picker button + drop zone.
    expect(html).toContain('data-testid="wallpaper-upload"')
    expect(html).toContain('accept="image/jpeg,image/png,image/webp,image/avif"')
    expect(html).toContain('data-testid="wallpaper-upload-button"')
    expect(html).toContain('data-testid="wallpaper-upload-dropzone"')
    expect(html).toContain('class="wallpaper-file-input"')
    expect(html).toMatch(/data-testid="wallpaper-upload-dropzone" role="button" tabindex="0"/)
    expect(html).not.toContain('data-testid="wallpaper-upload-error"')
    expect(html).toContain('data-testid="wallpaper-url"')
    expect(html).toContain('maxLength="2048"')
    expect(html).toContain('data-testid="wallpaper-url-apply"')
    // Local-data cleanup card is mounted once by the panel (storage-v2 component).
    expect(html).toContain('data-testid="wallpaper-clear-local-card"')
    expect(html).toContain('data-testid="wallpaper-clear-local-data"')
    expect(html).toContain('data-testid="wallpaper-search"')
    expect(html).toContain('data-testid="wallpaper-search-go"')
    expect(html).toContain('data-testid="wallpaper-refresh"')
    expect(html).toContain('data-testid="wallpaper-random"')
    expect(html).not.toContain('data-testid="wallpaper-status"')
    expect(html).not.toContain('data-testid="wallpaper-result"')
    expect(html).not.toContain('data-testid="wallpaper-url-error"')
    // Effect inputs carry the documented bounds and default values.
    expect(html).toMatch(/data-testid="wallpaper-blur"[^>]*min="0"[^>]*max="24"/)
    expect(html).toMatch(/data-testid="wallpaper-dim"[^>]*min="0"[^>]*max="70"/)
    expect(html).toMatch(/data-testid="wallpaper-frost"[^>]*min="0"[^>]*max="100"/)
    expect(html).toMatch(/data-testid="wallpaper-atmosphere"[^>]*min="0"[^>]*max="100"[^>]*step="5"/)
    expect(html).toContain('value="8"')
    expect(html).toContain('value="25"')
    expect(html).toContain('value="35"')
    expect(html).toContain('value="30"')
    expect(html).toContain('Built-in wallpapers')
    expect(html).toContain('Atmosphere')
    expect(html).toContain('Online wallpapers')
  })

  it('localizes every wallpaper block in zh', () => {
    const html = renderPanel(zhCN as unknown as Dict)
    expect(html).toContain('内置壁纸')
    expect(html).toContain('效果')
    expect(html).toContain('模糊')
    expect(html).toContain('磨砂')
    expect(html).toContain('全局氛围')
    expect(html).toContain('自定义图片地址')
    expect(html).toContain('在线壁纸')
    expect(html).toContain('在线壁纸')
    expect(html).toContain('上传图片')
    expect(html).toContain('极光')
    expect(html).toContain('搜索')
    expect(html).toContain('随机')
  })

  it('hydrates a persisted builtin selection and effects into the controls', () => {
    // Legacy record without atmosphere hydrates the default 30.
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
      kind: 'builtin', id: 'ember', blur: 20, dim: 55, frost: 90,
    }))
    controller.start()
    const html = renderPanel()
    expect(html).toMatch(/data-wallpaper-id="ember"[^>]*aria-pressed="true"/)
    expect(html).toMatch(/data-testid="wallpaper-blur"[^>]*value="20"/)
    expect(html).toMatch(/data-testid="wallpaper-dim"[^>]*value="55"/)
    expect(html).toMatch(/data-testid="wallpaper-frost"[^>]*value="90"/)
    expect(html).toMatch(/data-testid="wallpaper-atmosphere"[^>]*value="30"/)
    expect(html).toContain('value="20"')
    expect(html).toContain('value="55"')
    expect(html).toContain('value="90"')
    expect(html).toContain('value="30"')
    expect(html).toContain('data-testid="wallpaper-clear"')
    expect(html).toContain('data-testid="wallpaper-hero-preview"')
  })

  it('shows the hero empty-state prompt while no wallpaper is selected', () => {
    const html = renderPanel()
    expect(html).toContain('data-testid="wallpaper-hero-empty"')
    expect(html).toContain('No wallpaper selected.')
  })

  it('uses only the documented effect defaults when nothing is stored', () => {
    expect(DEFAULT_WALLPAPER_EFFECTS).toEqual({ blur: 8, dim: 25, frost: 35, atmosphere: 30 })
    const html = renderPanel()
    expect(html).toContain('value="8"')
  })
})

describe('background preset cards', () => {
  it('marks No wallpaper pressed while the selection is empty and Follow style not pressed', () => {
    const html = renderPanel()
    expect(html).toMatch(/data-testid="wallpaper-preset-none"[^>]*aria-pressed="true"/)
    expect(html).toMatch(/data-testid="wallpaper-preset-style"[^>]*aria-pressed="false"/)
    // Both preset cards are real buttons, not clickable divs.
    const cards = html.split('<button').filter(chunk => chunk.includes('data-testid="wallpaper-preset-'))
    expect(cards.length).toBeGreaterThanOrEqual(2)
  })

  it('disables Follow style with a visible, programmatically-described reason without tokens', () => {
    const html = renderPanel(enUS as unknown as Dict, NO_TOKENS)
    expect(html).toMatch(/data-testid="wallpaper-preset-style"[^>]*disabled/)
    expect(html).toMatch(new RegExp(`data-testid="wallpaper-preset-style"[^>]*aria-describedby="${STYLE_DISABLED_REASON_ID}"`))
    expect(html).toContain(`id="${STYLE_DISABLED_REASON_ID}"`)
    expect(html).toContain('data-testid="wallpaper-style-disabled"')
    expect(html).toContain('Apply a visual style first')
    expect(html).not.toContain('!wallpaper.')
  })

  it('selects Follow style (aria-pressed) and renders the mode-specific hero preview', () => {
    controller.setTokens(LIGHT_TOKENS, DARK_TOKENS)
    controller.setSelection({ kind: 'style', variant: 'mesh' })
    const light = renderPanel()
    expect(light).toMatch(/data-testid="wallpaper-preset-style"[^>]*aria-pressed="true"/)
    expect(light).toMatch(/data-testid="wallpaper-preset-none"[^>]*aria-pressed="false"/)
    expect(light).not.toMatch(/data-testid="wallpaper-preset-style"[^>]*disabled/)
    expect(light).toContain('data-testid="wallpaper-hero-preview"')
    expect(light).toContain('data-kind="style"')
    expect(light).toContain('Following the applied visual style.')
    // The light generated recipe mixes the light brand token ...
    expect(light).toContain('#b46000')
    expect(light).not.toContain('#ffcc66')
    // ... and the dark snapshot uses the dark token map, not a stored image.
    const dark = renderPanel(enUS as unknown as Dict, READY_DARK)
    expect(dark).toContain('#ffcc66')
    expect(dark).not.toContain('#b46000')
    // The generated layer is fixed: no focal-point control and no network image.
    expect(light).not.toContain('data-testid="wallpaper-position"')
    expect(light).not.toContain('url(')
  })
})

describe('built-in gallery visibility', () => {
  it('pins the selected Classic design once, above the grid, with a dynamic summary', () => {
    controller.setSelection({ kind: 'builtin', id: 'mist' })
    const html = renderPanel()
    expect(html).toContain('data-testid="wallpaper-builtin-pinned"')
    expect(html.match(/data-testid="wallpaper-builtin-pinned-swatch"/g)).toHaveLength(1)
    expect(html).toMatch(/data-testid="wallpaper-builtin-pinned-swatch"[^>]*data-wallpaper-id="mist"/)
    expect(html).toMatch(/data-testid="wallpaper-builtin-pinned-swatch"[^>]*aria-pressed="true"/)
    expect(html).toContain('Current (Classic)')
    expect(html).toContain('Classic designs (16; 1 pinned above)')
    // The pinned id is not duplicated in the grid or the Classic group.
    expect(html.match(/data-wallpaper-id="mist"/g)).toHaveLength(1)
    expect(html.match(/data-testid="wallpaper-builtin"/g)).toHaveLength(8)
    expect(html.match(/data-testid="wallpaper-builtin-classic-swatch"/g)).toHaveLength(15)
    for (const id of BUILTIN_WALLPAPER_IDS) {
      expect(html.match(new RegExp(`data-wallpaper-id="${id}"`, 'g'))).toHaveLength(1)
    }
    // Pinned row renders before the curated grid.
    expect(html.indexOf('data-testid="wallpaper-builtin-pinned"'))
      .toBeLessThan(html.indexOf('data-testid="wallpaper-builtin-grid"'))
  })

  it('does not pin a curated built-in and keeps the 16 total summary', () => {
    controller.setSelection({ kind: 'builtin', id: 'paper' })
    const html = renderPanel()
    expect(html).not.toContain('data-testid="wallpaper-builtin-pinned"')
    expect(html).toContain('Classic built-in designs (16)')
    expect(html).toMatch(/data-testid="wallpaper-builtin" data-wallpaper-id="paper"[^>]*aria-pressed="true"/)
    expect(html.match(/data-testid="wallpaper-builtin-classic-swatch"/g)).toHaveLength(16)
    for (const id of BUILTIN_WALLPAPER_IDS) {
      expect(html.match(new RegExp(`data-wallpaper-id="${id}"`, 'g'))).toHaveLength(1)
    }
  })

  it('never pins for remote/upload/style selections', () => {
    controller.setSelection({ kind: 'remote', url: 'https://example.com/w.jpg' })
    expect(renderPanel()).not.toContain('data-testid="wallpaper-builtin-pinned"')
    controller.setSelection({ kind: 'upload', key: 'upload-1-abc' })
    expect(renderPanel()).not.toContain('data-testid="wallpaper-builtin-pinned"')
    controller.setTokens(LIGHT_TOKENS, DARK_TOKENS)
    controller.setSelection({ kind: 'style', variant: 'mesh' })
    expect(renderPanel()).not.toContain('data-testid="wallpaper-builtin-pinned"')
  })
})

describe('source tabs — roving tabindex and keyboard mapping', () => {
  it('maps arrow/home/end keys with wraparound', () => {
    expect(sourceTabForKeyboard('online', 'ArrowRight')).toBe('builtin')
    expect(sourceTabForKeyboard('local', 'ArrowRight')).toBe('online')
    expect(sourceTabForKeyboard('online', 'ArrowLeft')).toBe('local')
    expect(sourceTabForKeyboard('recent', 'ArrowUp')).toBe('builtin')
    expect(sourceTabForKeyboard('builtin', 'Home')).toBe('online')
    expect(sourceTabForKeyboard('builtin', 'End')).toBe('local')
    expect(sourceTabForKeyboard('builtin', 'Enter')).toBeUndefined()
  })

  it('keeps exactly the active tab in the tab order', () => {
    const html = renderPanel()
    expect(html).toMatch(/data-testid="wallpaper-source-tab-online"[^>]*tabindex="0"/)
    expect(html).toMatch(/data-testid="wallpaper-source-tab-builtin"[^>]*tabindex="-1"/)
    expect(html).toMatch(/data-testid="wallpaper-source-tab-recent"[^>]*tabindex="-1"/)
    expect(html).toMatch(/data-testid="wallpaper-source-tab-local"[^>]*tabindex="-1"/)
    expect(html.match(/role="tab"/g)?.length).toBeGreaterThanOrEqual(4)
  })
})

describe('attribution resolution', () => {
  it('renders the selection provenance as plain text plus safe links', () => {
    controller.setSelection({
      kind: 'remote',
      url: 'https://cdn.example.org/photo.jpg',
      provenance: {
        providerId: 'wikimedia',
        title: 'Harbour at dusk',
        creator: 'A. Photographer',
        creatorUrl: 'https://commons.wikimedia.org/wiki/User:A',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        source: 'Wikimedia Commons',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Harbour.jpg',
      },
    })
    const html = renderPanel()
    expect(html).toContain('data-testid="wallpaper-hero-attribution"')
    expect(html).toContain('Harbour at dusk by A. Photographer')
    expect(html).toContain('CC BY-SA 4.0')
    const links = html.match(/<a [^>]*data-testid="wallpaper-attribution-link"[^>]*>/g) ?? []
    expect(links).toHaveLength(3)
    for (const link of links) {
      expect(link).toContain('rel="noreferrer noopener"')
      expect(link).toContain('target="_blank"')
      expect(link).toContain('href="https://')
    }
    expect(html).toContain('data-kind="creator"')
    expect(html).toContain('data-kind="license"')
    expect(html).toContain('data-kind="source"')
    // The source link shows the localized provider name, not the raw URL.
    expect(html).toContain('>Wikimedia Commons</a>')
  })

  it('renders plain text without links when the credit has no usable URL', () => {
    controller.setSelection({
      kind: 'remote',
      url: 'https://cdn.example.org/photo.jpg',
      provenance: {
        creator: 'Only text',
        creatorUrl: 'http://insecure.example/creator',
        license: 'CC0',
      },
    })
    const html = renderPanel()
    expect(html).toContain('data-testid="wallpaper-hero-attribution"')
    expect(html).toContain('Only text')
    expect(html).toContain('CC0')
    expect(html).not.toContain('data-testid="wallpaper-attribution-link"')
  })

  it('falls back to the matching recent-history entry for legacy records', () => {
    const store = {
      value: JSON.stringify([{
        url: 'https://cdn.example.org/photo.jpg',
        title: 'Legacy title',
        creator: 'Legacy creator',
        creatorUrl: 'https://example.org/creator',
        license: 'CC0',
        source: 'openverse.org',
        sourceUrl: 'https://openverse.org/image/1',
        addedAt: 1,
      }]),
      getItem(key: string): string | null { return key === RECENT_WALLPAPER_KEY ? this.value : null },
      setItem(): void { /* no-op */ },
      removeItem(): void { this.value = '' },
    }
    vi.stubGlobal('localStorage', store)
    controller.setSelection({ kind: 'remote', url: 'https://cdn.example.org/photo.jpg' })
    const html = renderPanel()
    vi.unstubAllGlobals()
    expect(html).toContain('Legacy title')
    expect(html).toContain('data-testid="wallpaper-attribution-link"')
    expect(html).toContain('href="https://example.org/creator"')
    expect(html).toContain('href="https://openverse.org/image/1"')
  })

  it('never renders attribution for built-in/upload/style selections', () => {
    controller.setSelection({ kind: 'builtin', id: 'paper' })
    const builtin = renderPanel()
    expect(builtin).not.toContain('data-testid="wallpaper-hero-attribution"')
    expect(builtin).not.toContain('data-testid="wallpaper-attribution-link"')
    controller.setTokens(LIGHT_TOKENS, DARK_TOKENS)
    controller.setSelection({ kind: 'style', variant: 'mesh' })
    expect(renderPanel()).not.toContain('data-testid="wallpaper-hero-attribution"')
  })

  it('does not own a second attribution store any more', () => {
    const panelSource = readFileSync(new URL('../../src/client/ui/WallpaperPanel.tsx', import.meta.url), 'utf8')
    expect(panelSource).not.toContain('attribution.v1')
    expect(panelSource).not.toContain('setItem(ATTRIBUTION')
    expect(panelSource).toContain('migrateLegacyAttribution')
    const creditSource = readFileSync(new URL('../../src/client/ui/wallpaper-credit.ts', import.meta.url), 'utf8')
    expect(creditSource).not.toContain('setItem(LEGACY_ATTRIBUTION_STORAGE_KEY')
    expect(creditSource).toContain('removeItem(LEGACY_ATTRIBUTION_STORAGE_KEY)')
  })
})
