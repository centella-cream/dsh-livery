/**
 * Wallpaper studio server-render tests: page tabs, built-in swatches, effect
 * sliders, custom URL controls, online controls and hydrated persisted state.
 */
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
import { WallpaperPanel } from '../../src/client/ui/WallpaperPanel.js'
import type { WallpaperPanelProps } from '../../src/client/ui/WallpaperPanel.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from '../../src/client/model.js'
import { createInitialSnapshot } from '../../src/client/model.js'
import { BUILTIN_WALLPAPER_IDS, DEFAULT_WALLPAPER_EFFECTS, WALLPAPER_STORAGE_KEY } from '../../src/client/wallpaper.js'
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
  }
}

function renderPanel(dict: Dict = enUS as unknown as Dict, snapshot: LiveryRuntimeSnapshot = READY): string {
  const props = { t: translate(dict), snapshot } as unknown as WallpaperPanelProps
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
  it('renders 视觉风格 / 壁纸 tabs with the style panel selected by default', () => {
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

describe('wallpaper studio render', () => {
  it('renders the online library, 24 built-in wallpapers, effects, upload, URL and online controls', () => {
    const html = renderPanel()
    expect(html).toContain('data-testid="wallpaper-panel"')
    expect(html.match(/data-testid="wallpaper-builtin"/g)).toHaveLength(24)
    for (const id of BUILTIN_WALLPAPER_IDS) {
      expect(html).toContain(`data-wallpaper-id="${id}"`)
    }
    expect(html).toContain('data-testid="wallpaper-blur"')
    expect(html).toContain('data-testid="wallpaper-dim"')
    expect(html).toContain('data-testid="wallpaper-frost"')
    expect(html).toContain('data-testid="wallpaper-atmosphere"')
    expect(html.match(/type="range"/g)).toHaveLength(4)
    expect(html).toContain('data-testid="wallpaper-reset"')
    // Clear stays present (disabled in the empty hero) so the testid contract holds.
    expect(html).toContain('data-testid="wallpaper-clear"')
    expect(html).toMatch(/data-testid="wallpaper-clear"[^>]*disabled/)
    // Two-column card hierarchy: main column + side rail.
    expect(html).toContain('data-testid="wallpaper-layout"')
    expect(html).toContain('data-testid="wallpaper-hero"')
    expect(html).toContain('data-testid="wallpaper-hero-empty"')
    expect(html).toContain('data-testid="wallpaper-library-card"')
    expect(html).toContain('data-testid="wallpaper-random-card"')
    expect(html).toContain('data-testid="wallpaper-custom-card"')
    expect(html).toContain('data-testid="wallpaper-effects-card"')
    expect(html).toContain('data-testid="wallpaper-effects-grid"')
    expect(html).toContain('data-testid="wallpaper-builtins-card"')
    expect(html).toContain('Current wallpaper')
    expect(html).toContain('Surprise me')
    // Curated online library is the first section: 8 category chips + more.
    expect(html.match(/data-testid="wallpaper-category"/g)).toHaveLength(8)
    expect(html).toContain('data-testid="wallpaper-library-more"')
    // Status appears after the user-triggered load; SSR shows the idle section.
    expect(html).not.toContain('data-testid="wallpaper-library-status"')
    expect(html).toContain('data-category="nature"')
    expect(html).toMatch(/data-category="nature"[^>]*aria-pressed="true"/)
    expect(html.match(/data-testid="wallpaper-library-result"/g)).toBeNull()
    expect(html).toContain('Online wallpaper library')
    // Upload section: hidden file input + picker button + drop zone.
    expect(html).toContain('data-testid="wallpaper-upload"')
    expect(html).toContain('accept="image/jpeg,image/png,image/webp,image/avif"')
    expect(html).toContain('data-testid="wallpaper-upload-button"')
    expect(html).toContain('data-testid="wallpaper-upload-dropzone"')
    expect(html).not.toContain('data-testid="wallpaper-upload-error"')
    expect(html).toContain('data-testid="wallpaper-url"')
    expect(html).toContain('maxLength="2048"')
    expect(html).toContain('data-testid="wallpaper-url-apply"')
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
    expect(html).toContain('Search online')
  })

  it('localizes every wallpaper block in zh', () => {
    const html = renderPanel(zhCN as unknown as Dict)
    expect(html).toContain('内置壁纸')
    expect(html).toContain('效果')
    expect(html).toContain('模糊')
    expect(html).toContain('表面霜化')
    expect(html).toContain('全局氛围')
    expect(html).toContain('自定义图片地址')
    expect(html).toContain('在线搜索')
    expect(html).toContain('在线壁纸库')
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
    expect(html).toContain('No wallpaper selected yet')
  })

  it('uses only the documented effect defaults when nothing is stored', () => {
    expect(DEFAULT_WALLPAPER_EFFECTS).toEqual({ blur: 8, dim: 25, frost: 35, atmosphere: 30 })
    const html = renderPanel()
    expect(html).toContain('value="8"')
  })
})
