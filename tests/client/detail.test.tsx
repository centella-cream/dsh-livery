/**
 * Plugin-detail contribution tests.
 *
 * The plugin-manager detail page renders every registered entry for every
 * subject, so the contributions are tested through static server rendering
 * (the repo's React test pattern): subject filtering, badge identity, the
 * observable-facts section, the state-selected update boundary, the action
 * gates, and the copy-diagnostics announcement/helper.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

const clipboard = vi.hoisted(() => ({ write: vi.fn(async () => true) }))

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
    writeClipboard: clipboard.write,
  }
})
import type { Context } from '@deepseek-ai/cordis'
import {
  DETAIL_ENTRY_ID,
  DETAIL_HEADING_ID,
  DetailActions,
  DetailBadge,
  DetailCopyStatus,
  DetailSection,
  bootStateKey,
  catalogStateKey,
  copyAnnouncementKey,
  copyDiagnosticsReport,
  detailBoundaryKey,
  installDetailSlots,
  isLiverySubject,
  openLiveryPanel,
  wallpaperFact,
} from '../../src/client/detail.js'
import type { DetailActionsProps, DetailSectionProps } from '../../src/client/detail.js'
import type { LiveryDetailProps, PluginPackageRef, PluginsSubject } from '../../src/client/platform.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from '../../src/client/model.js'
import { createInitialSnapshot, shortHash } from '../../src/client/model.js'
import { HASH_ATTRIBUTE, LIVERY_VERSION } from '../../src/core/types.js'
import { DEFAULT_WALLPAPER_EFFECTS } from '../../src/client/wallpaper.js'
import { setWallpaperController } from '../../src/client/wallpaper/controller.js'
import type { WallpaperControllerApi } from '../../src/client/wallpaper/controller.js'
import { enUS, zhCN } from '../../src/i18n/index.js'
import { TEST_ADAPTER } from './fixtures.js'


const IDENTITY = {
  adapterId: TEST_ADAPTER.adapterId,
  contractHash: TEST_ADAPTER.contractHash,
  pluginVersion: LIVERY_VERSION,
  hostVersion: TEST_ADAPTER.hostVersion,
}

type Dict = Record<string, string>
type Translate = LiveryDetailProps['t']

/** Translate with the shipped dictionaries, echoing unknown keys for failures. */
function translate(dict: Dict): Translate {
  return ((key: string, params?: Record<string, unknown>): string => {
    const template = dict[key] ?? `!${key}`
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? `{${name}}`))
  }) as unknown as Translate
}

const EN = translate(enUS)
const ZH = translate(zhCN)

/** Undo React's HTML escaping for text assertions (apostrophes in boundary copy). */
function decodeHtml(html: string): string {
  return html.replace(/&#x27;/gu, "'")
}

/** One bundle package ref with overrides. */
function packageRef(patch: Partial<PluginPackageRef> = {}): PluginPackageRef {
  return {
    name: 'dsh-livery',
    version: '0.2.2',
    installed: true,
    availability: 'available',
    official: false,
    enabled: true,
    rows: [],
    ...patch,
  }
}

const LIVERY_BUNDLE: PluginsSubject = { kind: 'bundle', pkg: packageRef() }
const OTHER_BUNDLE: PluginsSubject = { kind: 'bundle', pkg: packageRef({ name: 'dsh-context' }) }
const LIVERY_ROW: PluginsSubject = {
  kind: 'row',
  pkg: packageRef(),
  row: { rowId: 'livery', moduleName: 'dsh-livery/lib/index.js', enabled: true },
}
const OFFICIAL_ITEM: PluginsSubject = { kind: 'item', id: 'dsh-livery' }

/** A ready snapshot with catalog/style facts the section observes. */
function makeSnapshot(patch: Partial<LiveryRuntimeSnapshot> = {}): LiveryRuntimeSnapshot {
  const base = createInitialSnapshot(IDENTITY, {
    status: 'valid',
    reason: undefined,
    diagnostics: [],
    catalogProfile: TEST_ADAPTER.catalogProfile,
  })
  return {
    ...base,
    catalogStatus: 'ready',
    capabilities: {},
    confirmedId: 'midnight',
    effectiveId: 'midnight',
    locale: 'en',
    ...patch,
  }
}

/** Minimal runtime face backed by one immutable snapshot. */
function makeRuntime(snapshot: LiveryRuntimeSnapshot): LiveryRuntimeApi {
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

/** Render the badge for one subject and locale. */
function renderBadge(subject: PluginsSubject = LIVERY_BUNDLE, t: Translate = EN): string {
  return renderToStaticMarkup(<DetailBadge subject={subject} t={t} />)
}

/** Render the section for one snapshot/subject and locale. */
function renderSection(
  patch: Partial<LiveryRuntimeSnapshot> = {},
  subject: PluginsSubject = LIVERY_BUNDLE,
  t: Translate = EN,
): string {
  const props = {
    subject,
    t,
    runtime: makeRuntime(makeSnapshot(patch)),
  } as DetailSectionProps
  return renderToStaticMarkup(<DetailSection {...props} />)
}

/** Render the actions for one snapshot/subject and registration gate state. */
function renderActions(options: {
  readonly registered?: boolean
  readonly subject?: PluginsSubject
  readonly patch?: Partial<LiveryRuntimeSnapshot>
  readonly t?: Translate
} = {}): string {
  const props: DetailActionsProps = {
    subject: options.subject ?? LIVERY_BUNDLE,
    t: options.t ?? EN,
    runtime: makeRuntime(makeSnapshot(options.patch)),
    isMainPanelRegistered: () => options.registered ?? false,
    openLivery: () => undefined,
  }
  return renderToStaticMarkup(<DetailActions {...props} />)
}

/** Replace the global document with the minimal body-attribute surface. */
function setDocumentHash(hash: string | null): void {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: { body: { getAttribute: (name: string) => (name === HASH_ATTRIBUTE ? hash : null) } },
  })
}

const savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')

/** Restore the document/wallpaper globals after each test. */
function restoreGlobals(): void {
  if (savedDocument === undefined) {
    delete (globalThis as { document?: unknown }).document
  } else {
    Object.defineProperty(globalThis, 'document', savedDocument)
  }
  setWallpaperController(undefined)
}

/** Publish one wallpaper selection through the controller singleton. */
function setWallpaperSelection(selection: unknown): void {
  const controller = {
    getSnapshot: () => ({
      selection,
      effects: DEFAULT_WALLPAPER_EFFECTS,
      position: { x: 50, y: 50 },
      revision: 1,
    }),
  } as unknown as WallpaperControllerApi
  setWallpaperController(controller)
}

describe('subject filtering', () => {
  it('recognizes only the dsh-livery bundle subject', () => {
    expect(isLiverySubject(LIVERY_BUNDLE)).toBe(true)
    expect(isLiverySubject(OTHER_BUNDLE)).toBe(false)
    expect(isLiverySubject(LIVERY_ROW)).toBe(false)
    expect(isLiverySubject(OFFICIAL_ITEM)).toBe(false)
  })

  it('renders nothing for row/item subjects and for other bundles', () => {
    for (const subject of [OTHER_BUNDLE, LIVERY_ROW, OFFICIAL_ITEM]) {
      expect(renderBadge(subject)).toBe('')
      expect(renderSection({}, subject)).toBe('')
      expect(renderActions({ subject })).toBe('')
    }
  })
})

describe('badge', () => {
  afterEach(restoreGlobals)

  it('shows only the live client build identity', () => {
    const html = renderBadge()
    expect(html).toContain('data-testid="livery-detail-badge"')
    expect(html).toContain(`Livery ${LIVERY_VERSION}`)
    // No Host-plan-derived badge claims.
    expect(html).not.toMatch(/hot update|restart required/iu)
  })

  it('localizes through the slot dictionary', () => {
    expect(renderBadge(LIVERY_BUNDLE, ZH)).toContain(`Livery 版本 ${LIVERY_VERSION}`)
  })
})

describe('facts section', () => {
  afterEach(restoreGlobals)

  it('renders a labelled section with a dl and the observable fields', () => {
    setDocumentHash('sha256:appliedcataloghash')
    setWallpaperSelection({ kind: 'builtin', id: 'aurora' })
    const html = renderSection()
    expect(html).toContain(`aria-labelledby="${DETAIL_HEADING_ID}"`)
    expect(html).toContain('<dl')
    expect(html).toContain('>Livery details</h3>')
    // Client build + installed package version.
    expect(html).toContain(LIVERY_VERSION)
    expect(html).toContain('0.2.2')
    // Handshake + identity facts.
    expect(html).toContain(enUS['detail.boot.valid'])
    expect(html).toContain(TEST_ADAPTER.hostVersion)
    expect(html).toContain(TEST_ADAPTER.adapterId)
    expect(html).toContain(shortHash(TEST_ADAPTER.contractHash))
    expect(html).toContain(TEST_ADAPTER.catalogProfile)
    // Catalog phase + applied CSS hash from the public body attribute.
    expect(html).toContain(enUS['detail.catalog.ready'])
    expect(html).toContain('sha256:appliedcataloghash')
    // Active style and wallpaper facts.
    expect(html).toContain('midnight')
    expect(html).toContain(`${enUS['detail.wallpaper.builtin']} · aurora`)
  })

  it('shows the boot reason and invalid configured style when present', () => {
    const html = renderSection({
      bootStatus: 'mismatch',
      bootReason: 'payload hostVersion does not match the certified adapter',
      invalidSkinId: 'missing-skin',
    })
    expect(html).toContain('payload hostVersion does not match the certified adapter')
    expect(html).toContain('missing-skin')
  })

  it('falls back to localized "none" values when facts are absent', () => {
    const html = renderSection({
      identity: { adapterId: '', contractHash: '', pluginVersion: LIVERY_VERSION, hostVersion: '' },
      catalogProfile: undefined,
      confirmedId: undefined,
      effectiveId: undefined,
    })
    expect(html).toContain(enUS['detail.none'])
    expect(html).toContain(enUS['detail.wallpaper.none'])
  })

  it('describes a style wallpaper selection without assuming the legacy kinds', () => {
    setWallpaperSelection({ kind: 'style', variant: 'mesh' })
    expect(renderSection()).toContain(enUS['detail.wallpaper.style'])
    expect(wallpaperFact(EN)).toBe(`${enUS['detail.wallpaper.style']} · mesh`)
    setWallpaperSelection({ kind: 'style' })
    expect(wallpaperFact(EN)).toBe(enUS['detail.wallpaper.style'])
  })

  it('describes remote and upload wallpaper selections', () => {
    setWallpaperSelection({ kind: 'remote', url: 'https://images.example/aurora.jpg' })
    expect(wallpaperFact(EN)).toBe(`${enUS['detail.wallpaper.remote']} · https://images.example/aurora.jpg`)
    setWallpaperSelection({ kind: 'upload', key: 'local-file-1' })
    expect(wallpaperFact(EN)).toBe(`${enUS['detail.wallpaper.upload']} · local-file-1`)
    setWallpaperSelection(undefined)
    expect(wallpaperFact(EN)).toBe(enUS['detail.wallpaper.none'])
  })

  it('localizes field labels in Chinese', () => {
    const html = renderSection({}, LIVERY_BUNDLE, ZH)
    expect(html).toContain(zhCN['detail.field.clientBuild'])
    expect(html).toContain('Livery 详情')
  })
})

describe('update-boundary copy', () => {
  afterEach(restoreGlobals)

  it('selects exactly one statement by handshake state', () => {
    const cases: ReadonlyArray<{
      readonly state: LiveryRuntimeSnapshot['bootStatus']
      readonly catalogStatus: LiveryRuntimeSnapshot['catalogStatus']
      readonly shown: string
      readonly hidden: readonly string[]
      readonly reloadRequired?: boolean
    }> = [
      {
        state: 'valid',
        catalogStatus: 'ready',
        shown: enUS['detail.boundary.valid']!,
        hidden: [enUS['detail.boundary.stale']!, enUS['detail.boundary.staleDegraded']!, enUS['detail.boundary.mismatch']!, enUS['detail.boundary.absent']!],
      },
      {
        state: 'stale',
        catalogStatus: 'ready',
        shown: enUS['detail.boundary.stale']!,
        hidden: [enUS['detail.boundary.valid']!, enUS['detail.boundary.staleDegraded']!, enUS['detail.boundary.mismatch']!, enUS['detail.boundary.absent']!],
      },
      {
        state: 'stale',
        catalogStatus: 'unavailable',
        shown: enUS['detail.boundary.staleDegraded']!,
        hidden: [enUS['detail.boundary.valid']!, enUS['detail.boundary.stale']!, enUS['detail.boundary.mismatch']!, enUS['detail.boundary.absent']!],
      },
      {
        state: 'mismatch',
        catalogStatus: 'ready',
        reloadRequired: true,
        shown: enUS['detail.boundary.mismatch']!,
        hidden: [
          enUS['detail.boundary.valid']!, enUS['detail.boundary.stale']!,
          enUS['detail.boundary.staleDegraded']!, enUS['detail.boundary.mismatchUnsupported']!,
          enUS['detail.boundary.absent']!,
        ],
      },
      {
        state: 'mismatch',
        catalogStatus: 'ready',
        shown: enUS['detail.boundary.mismatchUnsupported']!,
        hidden: [enUS['detail.boundary.valid']!, enUS['detail.boundary.stale']!, enUS['detail.boundary.staleDegraded']!, enUS['detail.boundary.mismatch']!, enUS['detail.boundary.absent']!],
      },
      {
        state: 'absent',
        catalogStatus: 'ready',
        shown: enUS['detail.boundary.absent']!,
        hidden: [enUS['detail.boundary.valid']!, enUS['detail.boundary.stale']!, enUS['detail.boundary.staleDegraded']!, enUS['detail.boundary.mismatch']!],
      },
    ]
    for (const entry of cases) {
      const html = decodeHtml(renderSection({
        bootStatus: entry.state,
        catalogStatus: entry.catalogStatus,
        ...(entry.reloadRequired === undefined ? {} : { reloadRequired: entry.reloadRequired }),
      }))
      expect(html).toContain(entry.shown)
      for (const copy of entry.hidden) expect(html).not.toContain(copy)
    }
  })

  it('maps states to keys without a Host version string', () => {
    expect(detailBoundaryKey('valid', false)).toBe('detail.boundary.valid')
    expect(detailBoundaryKey('stale', false)).toBe('detail.boundary.stale')
    expect(detailBoundaryKey('stale', true)).toBe('detail.boundary.staleDegraded')
    expect(detailBoundaryKey('mismatch', false, true)).toBe('detail.boundary.mismatch')
    expect(detailBoundaryKey('mismatch', false, false)).toBe('detail.boundary.mismatchUnsupported')
    expect(detailBoundaryKey('absent', false)).toBe('detail.boundary.absent')
    // A payload state this build does not know stays on the neutral statement.
    expect(detailBoundaryKey('future-state', false)).toBe('detail.boundary.valid')
  })

  it('maps handshake and catalog states to localized keys', () => {
    expect(bootStateKey('valid')).toBe('detail.boot.valid')
    expect(bootStateKey('stale')).toBe('detail.boot.stale')
    expect(bootStateKey('absent')).toBe('detail.boot.absent')
    expect(bootStateKey('mismatch')).toBe('detail.boot.mismatch')
    expect(bootStateKey('future-state')).toBe('detail.boot.unknown')
    expect(catalogStateKey('idle')).toBe('detail.catalog.idle')
    expect(catalogStateKey('loading')).toBe('detail.catalog.loading')
    expect(catalogStateKey('ready')).toBe('detail.catalog.ready')
    expect(catalogStateKey('unavailable')).toBe('detail.catalog.unavailable')
    expect(catalogStateKey('future-state')).toBe('detail.catalog.unknown')
  })
})

describe('actions', () => {
  afterEach(restoreGlobals)

  it('hides Open Livery while the main panel is not registered', () => {
    const html = renderActions({ registered: false })
    expect(html).not.toContain('data-testid="livery-detail-open"')
    expect(html).toContain('data-testid="livery-detail-copy-diagnostics"')
    expect(html).toContain(enUS['detail.action.copyDiagnostics'])
  })

  it('shows Open Livery only when the main panel is registered', () => {
    const html = renderActions({ registered: true })
    expect(html).toContain('data-testid="livery-detail-open"')
    expect(html).toContain(enUS['detail.action.open'])
  })

  it('has a polite live region for the copy result and no update control', () => {
    const html = renderActions({ registered: true })
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('data-testid="livery-detail-copy-status"')
    expect(html).not.toContain('livery-detail-update')
    expect(html).not.toMatch(/>\s*Update\s*</u)
  })

  it('localizes the action labels', () => {
    const html = renderActions({ registered: true, t: ZH })
    expect(html).toContain(zhCN['detail.action.open'])
    expect(html).toContain(zhCN['detail.action.copyDiagnostics'])
  })
})

describe('Open Livery action', () => {
  it('selects the registered livery panel through the public layout service', () => {
    const selected: string[] = []
    const ctx = {
      get: (service: string) => (service === 'layout'
        ? { selectPanel: (key: string) => selected.push(key) }
        : undefined),
    } as unknown as Context
    openLiveryPanel(ctx)
    expect(selected).toEqual(['livery'])
  })

  it('is a no-op without a layout service or when selection races a teardown', () => {
    const noLayout = { get: () => undefined } as unknown as Context
    expect(() => openLiveryPanel(noLayout)).not.toThrow()
    const throwing = {
      get: () => ({ selectPanel: () => { throw new Error('unregistered main key') } }),
    } as unknown as Context
    expect(() => openLiveryPanel(throwing)).not.toThrow()
  })
})

describe('copy diagnostics announcement', () => {
  it('renders a polite live region that announces the copied/failed outcome', () => {
    const idle = renderToStaticMarkup(<DetailCopyStatus t={EN} outcome={undefined} />)
    expect(idle).toContain('role="status"')
    expect(idle).toContain('aria-live="polite"')
    expect(idle).not.toContain(enUS['detail.copy.copied'])
    expect(renderToStaticMarkup(<DetailCopyStatus t={EN} outcome="copied" />)).toContain(enUS['detail.copy.copied'])
    expect(renderToStaticMarkup(<DetailCopyStatus t={EN} outcome="failed" />)).toContain(enUS['detail.copy.failed'])
    expect(renderToStaticMarkup(<DetailCopyStatus t={ZH} outcome="copied" />)).toContain(zhCN['detail.copy.copied'])
  })
})

describe('copy diagnostics', () => {
  it('writes the existing diagnostics report to the clipboard', async () => {
    clipboard.write.mockResolvedValueOnce(true)
    await expect(copyDiagnosticsReport(EN, makeSnapshot())).resolves.toBe(true)
    expect(clipboard.write).toHaveBeenCalledWith(expect.stringContaining('DSH Livery'))
    expect(clipboard.write).toHaveBeenCalledWith(expect.stringContaining(TEST_ADAPTER.adapterId))
  })

  it('reports clipboard failure and selects the matching announcement', async () => {
    clipboard.write.mockResolvedValueOnce(false)
    await expect(copyDiagnosticsReport(EN, makeSnapshot())).resolves.toBe(false)
    expect(copyAnnouncementKey(true)).toBe('detail.copy.copied')
    expect(copyAnnouncementKey(false)).toBe('detail.copy.failed')
    expect(enUS['detail.copy.copied']).not.toBe(enUS['detail.copy.failed'])
    expect(zhCN['detail.copy.copied']).not.toBe(zhCN['detail.copy.failed'])
  })
})

describe('installDetailSlots', () => {
  interface FakeSlots {
    readonly ctx: Context
    readonly registrations: Array<{ options: Record<string, unknown>; component: unknown; active: boolean }>
    readonly injections: string[]
    readonly disposed: string[]
    pending(key: string): boolean
    declare(key: string): void
  }

  /**
   * Fake slots service: deferred `inject` callbacks stay pending until the test
   * declares the slot, mirroring a host where the plugin-manager page has not
   * loaded yet.
   */
  function createSlots(options: { readonly deferred?: readonly string[] } = {}): FakeSlots {
    const registrations: FakeSlots['registrations'] = []
    const injections: string[] = []
    const disposed: string[] = []
    const deferred = new Set(options.deferred ?? [])
    const pending = new Map<string, () => (() => void) | undefined>()
    const run = (key: string, callback: () => (() => void) | undefined): (() => void) => {
      injections.push(key)
      const disposeRegistration = callback()
      let done = false
      return () => {
        if (done) return
        done = true
        disposed.push(key)
        disposeRegistration?.()
      }
    }
    const slots = {
      inject: (key: string, callback: () => (() => void) | undefined) => {
        if (deferred.has(key)) {
          pending.set(key, callback)
          let done = false
          return () => {
            if (done) return
            done = true
            pending.delete(key)
            disposed.push(key)
          }
        }
        return run(key, callback)
      },
      register: (registrationOptions: Record<string, unknown>, component: unknown) => {
        const record = { options: registrationOptions, component, active: true }
        registrations.push(record)
        return () => {
          record.active = false
        }
      },
    }
    const ctx = {
      slots,
      get: (service: string) => (service === 'layout'
        ? { selectPanel: () => undefined }
        : undefined),
    } as unknown as Context
    return {
      ctx,
      registrations,
      injections,
      disposed,
      pending: key => pending.has(key),
      declare: (key: string) => {
        const callback = pending.get(key)
        if (callback === undefined) throw new Error(`no pending inject for ${key}`)
        pending.delete(key)
        deferred.delete(key)
        run(key, callback)
      },
    }
  }

  /** Install the detail slots against one fake context. */
  function install(fake: FakeSlots): readonly (() => void)[] {
    return installDetailSlots(fake.ctx, {
      runtime: makeRuntime(makeSnapshot()),
      isMainPanelRegistered: () => false,
    })
  }

  const ALL_DETAIL_KEYS = ['plugins.detail.actions', 'plugins.detail.badge', 'plugins.detail.section'] as const

  it('registers only inside inject callbacks, not before the slot is declared', () => {
    const fake = createSlots({ deferred: ALL_DETAIL_KEYS })
    const disposers = install(fake)
    expect(disposers).toHaveLength(3)
    expect(fake.registrations).toEqual([])
    expect(fake.injections).toEqual([])
    for (const key of ALL_DETAIL_KEYS) expect(fake.pending(key)).toBe(true)

    fake.declare('plugins.detail.badge')
    expect(fake.registrations).toHaveLength(1)
    expect(fake.registrations[0]?.options).toMatchObject({
      name: 'plugins.detail.badge',
      id: DETAIL_ENTRY_ID,
      order: 0,
      locale: 'dsh-livery',
    })
    expect(fake.registrations[0]?.options.id).toBe('dsh-livery')
    expect(typeof fake.registrations[0]?.component).toBe('function')

    fake.declare('plugins.detail.section')
    fake.declare('plugins.detail.actions')
    expect(fake.registrations.map(entry => entry.options.name)).toEqual([
      'plugins.detail.badge',
      'plugins.detail.section',
      'plugins.detail.actions',
    ])
  })

  it('survives a slots service that rejects one unknown detail key', () => {
    const fake = createSlots()
    const original = fake.ctx.slots.inject.bind(fake.ctx.slots) as (
      key: string,
      callback: () => (() => void) | undefined,
    ) => () => void
    ;(fake.ctx.slots as unknown as { inject: unknown }).inject = (key: string, callback: () => (() => void) | undefined) => {
      if (key === 'plugins.detail.badge') throw new Error(`unknown slot ${key}`)
      return original(key, callback)
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const disposers = install(fake)
    consoleError.mockRestore()
    expect(disposers).toHaveLength(2)
    expect(fake.registrations.map(entry => entry.options.name)).toEqual([
      'plugins.detail.actions',
      'plugins.detail.section',
    ])
  })

  it('is harmless when the plugin-manager slots never declare', () => {
    const fake = createSlots({ deferred: ALL_DETAIL_KEYS })
    const disposers = install(fake)
    expect(fake.registrations).toEqual([])
    expect(() => {
      for (const dispose of disposers) dispose()
    }).not.toThrow()
    expect(fake.disposed).toEqual([...ALL_DETAIL_KEYS])
  })

  it('registers the entries and renders null for foreign subjects', () => {
    const fake = createSlots()
    install(fake)
    const foreign = { subject: OTHER_BUNDLE, t: EN } as LiveryDetailProps
    for (const registration of fake.registrations) {
      const component = registration.component as (value: LiveryDetailProps) => unknown
      expect(renderToStaticMarkup(createElement(component as never, foreign as never))).toBe('')
    }
    const own = { subject: LIVERY_BUNDLE, t: EN } as LiveryDetailProps
    const badge = fake.registrations.find(entry => entry.options.name === 'plugins.detail.badge')
    expect(renderToStaticMarkup(createElement(badge?.component as never, own as never))).toContain('livery-detail-badge')
  })

  it('disposes every inject subscription with the plugin lifetime', () => {
    const fake = createSlots()
    const disposers = install(fake)
    expect(fake.injections).toEqual([...ALL_DETAIL_KEYS])
    expect(fake.registrations.every(entry => entry.active)).toBe(true)
    for (const dispose of disposers) dispose()
    expect(fake.registrations.every(entry => !entry.active)).toBe(true)
    expect(fake.disposed).toEqual([...ALL_DETAIL_KEYS])
  })

  it('never registers the config-body or official-plugin slots', () => {
    const fake = createSlots()
    install(fake)
    const names = fake.registrations.map(entry => entry.options.name)
    expect(names).not.toContain('plugins.bundle.config')
    expect(names).not.toContain('plugins.item')
    expect(new Set(names)).toEqual(new Set(ALL_DETAIL_KEYS))
  })
})
