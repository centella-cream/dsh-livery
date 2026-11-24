/**
 * Livery's contributions to the DSH plugin-manager detail page.
 *
 * The plugin-manager client declares three root/list slots —
 * `plugins.detail.actions`, `plugins.detail.badge` and
 * `plugins.detail.section` — and renders every registered entry for every
 * detail subject. A contribution therefore decides from `subject` whether it
 * has anything to say and returns `null` otherwise; this bundle only owns the
 * `dsh-livery` bundle page.
 *
 * Registration is inject-first: `register` into an undeclared slot throws, and
 * the plugin-manager page may be absent or arrive after this plugin, so every
 * contribution is installed inside its own `ctx.slots.inject(key, …)` callback.
 * The callback disposer returned by `inject` is the registration to keep; the
 * returned array is handed to the client entry's effect cleanup.
 *
 * The section/badge are observable-fact surfaces only. The Host owns install,
 * update policy, HMR and restart; this file never offers or intercepts an
 * update control and never claims a Host plan that does not exist.
 */
import { useCallback, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { HASH_ATTRIBUTE, LIVERY_VERSION, LOCALE_NS } from '../core/types.js'
import type {
  LayoutService,
  LiveryDetailProps,
  LiveryDetailSlotKey,
  LiveryKey,
  PluginsSubject,
} from './platform.js'
import { shortHash } from './model.js'
import type { LiveryRuntimeApi, LiveryRuntimeSnapshot } from './model.js'
import { PANEL_ID } from './navigation.js'
import { getWallpaperController } from './wallpaper/controller.js'

/** Package name of the bundle this contribution describes. */
export const DETAIL_PACKAGE_NAME = 'dsh-livery'

/** Stable list-entry id used for every contributed detail slot. */
export const DETAIL_ENTRY_ID = 'dsh-livery'

/** Stable id of the facts-section heading (one detail page exists at a time). */
export const DETAIL_HEADING_ID = 'dsh-livery-detail-heading'

/** Frozen display order of the three consumed detail slots (matches the contract). */
export const DETAIL_SLOT_KEYS: readonly LiveryDetailSlotKey[] = Object.freeze([
  'plugins.detail.actions',
  'plugins.detail.badge',
  'plugins.detail.section',
])

/** List-entry order of each contribution; 0 keeps the natural slot order. */
const DETAIL_SLOT_ORDERS: Readonly<Record<LiveryDetailSlotKey, number>> = Object.freeze({
  'plugins.detail.actions': 0,
  'plugins.detail.badge': 0,
  'plugins.detail.section': 0,
})

/**
 * Whether a detail subject is the bundle this plugin owns.
 * @param subject - subject of the open plugin-manager detail page.
 * @returns true only for the `dsh-livery` bundle page.
 */
export function isLiverySubject(subject: PluginsSubject): boolean {
  return subject.kind === 'bundle' && subject.pkg.name === DETAIL_PACKAGE_NAME
}

/** Dictionary keys describing one handshake state. */
const BOOT_STATE_KEYS: Readonly<Record<string, LiveryKey>> = Object.freeze({
  valid: 'detail.boot.valid',
  stale: 'detail.boot.stale',
  absent: 'detail.boot.absent',
  mismatch: 'detail.boot.mismatch',
})

/**
 * Dictionary key describing one handshake state. `stale` is a real handshake
 * outcome on 0.2.2 hosts; a state this build does not know falls back to the
 * neutral "unknown" label instead of borrowing another state's copy.
 * @param state - handshake status from the runtime snapshot.
 * @returns the dictionary key describing it.
 */
export function bootStateKey(state: string): LiveryKey {
  return BOOT_STATE_KEYS[state] ?? 'detail.boot.unknown'
}

/** Dictionary keys describing one catalog phase. */
const CATALOG_STATE_KEYS: Readonly<Record<string, LiveryKey>> = Object.freeze({
  idle: 'detail.catalog.idle',
  loading: 'detail.catalog.loading',
  ready: 'detail.catalog.ready',
  unavailable: 'detail.catalog.unavailable',
})

/**
 * Dictionary key describing one catalog phase.
 * @param state - catalog status from the runtime snapshot.
 * @returns the dictionary key describing it.
 */
export function catalogStateKey(state: string): LiveryKey {
  return CATALOG_STATE_KEYS[state] ?? 'detail.catalog.unknown'
}

/**
 * Select the single update-boundary statement shown for a handshake state.
 * Exactly one message is ever rendered; no Host version string participates.
 * @param state - handshake status from the runtime snapshot.
 * @param catalogUnavailable - whether the catalog is unavailable (degraded state).
 * @param reloadRequired - whether this mismatch is a plugin-version transition.
 * @returns the dictionary key of the one statement to show.
 */
export function detailBoundaryKey(state: string, catalogUnavailable: boolean, reloadRequired = false): LiveryKey {
  if (state === 'stale') {
    return catalogUnavailable ? 'detail.boundary.staleDegraded' : 'detail.boundary.stale'
  }
  if (state === 'mismatch') {
    return reloadRequired ? 'detail.boundary.mismatch' : 'detail.boundary.mismatchUnsupported'
  }
  if (state === 'absent') return 'detail.boundary.absent'
  return 'detail.boundary.valid'
}

/** Read the applied CSS hash from the public body attribute, when present. */
function appliedCssHash(): string | undefined {
  const body = globalThis.document?.body
  return body?.getAttribute(HASH_ATTRIBUTE) ?? undefined
}

/** Read a non-empty string field without trusting the value's TypeScript shape. */
function textField(value: object, key: string): string | undefined {
  const candidate = (value as Record<string, unknown>)[key]
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined
}

/**
 * Describe the active wallpaper from the published controller snapshot. The
 * runtime snapshot does not carry wallpaper state, and the selection kind set
 * may grow (for example the persisted `style` kind), so this reader is
 * structural rather than tied to one union member set.
 * @param t - dictionary-bound translate of the `dsh-livery` namespace.
 * @returns localized kind plus the wallpaper's own name/id/URL.
 */
export function wallpaperFact(t: LiveryDetailProps['t']): string {
  const selection: unknown = getWallpaperController()?.getSnapshot().selection
  if (selection === undefined || selection === null) return t('detail.wallpaper.none')
  if (typeof selection !== 'object') return t('detail.none')
  const kind = textField(selection, 'kind')
  if (kind === 'builtin') {
    return `${t('detail.wallpaper.builtin')} · ${textField(selection, 'id') ?? t('detail.none')}`
  }
  if (kind === 'remote') {
    return `${t('detail.wallpaper.remote')} · ${textField(selection, 'url') ?? t('detail.none')}`
  }
  if (kind === 'upload') {
    return `${t('detail.wallpaper.upload')} · ${textField(selection, 'key') ?? t('detail.none')}`
  }
  if (kind === 'style') {
    const variant = textField(selection, 'variant')
    return variant === undefined
      ? t('detail.wallpaper.style')
      : `${t('detail.wallpaper.style')} · ${variant}`
  }
  return t('detail.none')
}

/** Subscribe a component to the runtime snapshot (server-render safe). */
function useRuntimeSnapshot(runtime: LiveryRuntimeApi): LiveryRuntimeSnapshot {
  // The runtime is a class instance: passing its methods straight through loses
  // `this` on the first render. Bind stable wrappers per runtime instance.
  const subscribe = useCallback((listener: () => void) => runtime.subscribe(listener), [runtime])
  const getSnapshot = useCallback(() => runtime.getSnapshot(), [runtime])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** One rendered `<dt>`/`<dd>` fact of the section. */
interface DetailFact {
  readonly id: string
  readonly label: string
  readonly value: string
}

function fact(id: string, label: string, value: string): DetailFact {
  return { id, label, value }
}

/**
 * Small observable fact beside the detail page title: only the live client
 * build identity. No Host-plan-derived state is shown here.
 * @param props - owner props (`subject`) plus the locale seat.
 * @returns the tag element, or null for a subject this plugin does not own.
 */
export function DetailBadge({ subject, t }: LiveryDetailProps): JSX.Element | null {
  if (!isLiverySubject(subject)) return null
  return (
    <span data-testid="livery-detail-badge">
      <Tag tone="outline">{t('detail.badge.label', { version: LIVERY_VERSION })}</Tag>
    </span>
  )
}

/** Context the actions entry needs beyond its owner props (supplied by the installer). */
export interface DetailActionsContext {
  readonly runtime: LiveryRuntimeApi
  /** True while Livery's `main` panel registration is live on this host. */
  readonly isMainPanelRegistered: () => boolean
  /** Select Livery's main panel; only called while the gate above returns true. */
  readonly openLivery: () => void
}

/** Full props of the actions entry. */
export type DetailActionsProps = LiveryDetailProps & DetailActionsContext

/**
 * Page-head actions: open Livery's own panel when this host registered it, and
 * jump to the Livery detail tabs. No update or diagnostics-copy control: the
 * Host's own controls stay the only update path and diagnostics live in the
 * Livery self-check panel.
 * @param props - owner props, locale seat and installer context.
 * @returns the actions element, or null for a subject this plugin does not own.
 */
export function DetailActions(props: DetailActionsProps): JSX.Element | null {
  if (!isLiverySubject(props.subject)) return null
  return <LiveryDetailActions {...props} />
}

function LiveryDetailActions({ t, isMainPanelRegistered, openLivery }: DetailActionsProps): JSX.Element {
  return (
    <div className="livery-section">
      <div className="livery-actions" data-testid="livery-detail-actions">
        {isMainPanelRegistered() && (
          <Button
            variant="outline"
            size="sm"
            data-testid="livery-detail-open"
            onClick={() => { openLivery() }}
          >
            {t('detail.action.open')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          data-testid="livery-detail-open-hot"
          onClick={() => {
            document.getElementById('livery-detail-tab-hot')?.click()
            document.getElementById('livery-detail-section')?.scrollIntoView({ block: 'start' })
          }}
        >
          {t('detail.tab.hotUpdate')}
        </Button>
      </div>
    </div>
  )
}

/** Context the section needs beyond its owner props (supplied by the installer). */
export interface DetailSectionContext {
  readonly runtime: LiveryRuntimeApi
}

/** Full props of the facts section. */
export type DetailSectionProps = LiveryDetailProps & DetailSectionContext

/**
 * Observable-facts section at the bottom of the detail page, followed by one
 * truthful update-boundary statement selected by handshake state.
 * @param props - owner props, locale seat and installer context.
 * @returns the section element, or null for a subject this plugin does not own.
 */
export function DetailSection(props: DetailSectionProps): JSX.Element | null {
  if (!isLiverySubject(props.subject)) return null
  return <LiveryDetailSection {...props} />
}

function LiveryDetailSection({ subject, t, runtime }: DetailSectionProps): JSX.Element {
  const snapshot = useRuntimeSnapshot(runtime)
  const [tab, setTab] = useState<'facts' | 'hot'>('facts')
  const identity = snapshot.identity
  const reason = snapshot.bootReason
  // The exported wrapper already narrowed the subject; re-reading through a
  // guard keeps the helper total without a non-null assertion.
  const installedVersion = subject.kind === 'bundle' ? subject.pkg.version : undefined
  const facts: readonly DetailFact[] = [
    fact('client-build', t('detail.field.clientBuild'), LIVERY_VERSION),
    fact('handshake', t('detail.field.handshake'), t(bootStateKey(snapshot.bootStatus))),
    ...(reason === undefined || reason.length === 0
      ? []
      : [fact('handshake-reason', t('detail.field.reason'), reason)]),
    fact('installed', t('detail.field.installed'), installedVersion ?? t('detail.none')),
    fact('host', t('detail.field.host'), identity.hostVersion.length > 0 ? identity.hostVersion : t('detail.none')),
    fact('adapter', t('detail.field.adapter'), identity.adapterId.length > 0 ? identity.adapterId : t('detail.none')),
    fact('contract', t('detail.field.contract'), identity.contractHash.length > 0 ? shortHash(identity.contractHash) : t('detail.none')),
    fact('profile', t('detail.field.profile'), snapshot.catalogProfile ?? t('detail.none')),
    fact('catalog', t('detail.field.catalog'), t(catalogStateKey(snapshot.catalogStatus))),
    fact('css-hash', t('detail.field.cssHash'), appliedCssHash() ?? t('detail.none')),
    fact('confirmed', t('detail.field.confirmed'), snapshot.confirmedId ?? t('detail.none')),
    fact('effective', t('detail.field.effective'), snapshot.effectiveId ?? t('detail.none')),
    ...(snapshot.invalidSkinId === undefined
      ? []
      : [fact('invalid', t('detail.field.invalid'), snapshot.invalidSkinId)]),
    fact('wallpaper', t('detail.field.wallpaper'), wallpaperFact(t)),
  ]
  const boundary = t(detailBoundaryKey(
    snapshot.bootStatus,
    snapshot.catalogStatus === 'unavailable',
    snapshot.reloadRequired,
  ))
  const hotFacts = facts.filter(entry => ['client-build', 'handshake', 'installed', 'host', 'catalog'].includes(entry.id))

  return (
    <div className="livery-section livery-detail">
      <section
        className="livery-check"
        aria-labelledby={DETAIL_HEADING_ID}
        data-testid="livery-detail-section"
      >
        <div className="livery-check__body">
          <h3 className="livery-check__title" id={DETAIL_HEADING_ID}>{t('detail.section.title')}</h3>
          <div className="livery-detail__tabs" role="tablist" aria-label={t('detail.section.title')}>
            <button
              type="button"
              role="tab"
              id="livery-detail-tab-facts"
              className="livery-detail__tab"
              aria-selected={tab === 'facts'}
              aria-controls="livery-detail-panel-facts"
              tabIndex={tab === 'facts' ? 0 : -1}
              onClick={() => { setTab('facts') }}
            >
              {t('detail.tab.facts')}
            </button>
            <button
              type="button"
              role="tab"
              id="livery-detail-tab-hot"
              className="livery-detail__tab"
              aria-selected={tab === 'hot'}
              aria-controls="livery-detail-panel-hot"
              tabIndex={tab === 'hot' ? 0 : -1}
              onClick={() => { setTab('hot') }}
            >
              {t('detail.tab.hotUpdate')}
            </button>
          </div>
          <div
            id={`livery-detail-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`livery-detail-tab-${tab === 'facts' ? 'facts' : 'hot'}`}
          >
            <dl className="livery-detail__facts">
              {(tab === 'facts' ? facts : hotFacts).map(entry => (
                <div className="livery-detail__fact" key={entry.id}>
                  <dt className="livery-check__title">{entry.label}</dt>
                  <dd className="livery-check__value" data-testid={`livery-detail-${tab === 'hot' ? 'hot-' : ''}${entry.id}`}>{entry.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="livery-check__value" data-testid="livery-detail-boundary">{boundary}</p>
        </div>
      </section>
    </div>
  )
}

/** Options of {@link installDetailSlots}. */
export interface DetailSlotInstallOptions {
  readonly runtime: LiveryRuntimeApi
  /** Getter for the `main` panel registration lifetime; the Open Livery gate. */
  readonly isMainPanelRegistered: () => boolean
}

/**
 * Open Livery's registered main panel through the public layout service.
 * The caller gates on {@link DetailSlotInstallOptions.isMainPanelRegistered};
 * an absent layout service is a composition without panel navigation, so the
 * action simply has nothing to select.
 * @param ctx - client Cordis context.
 */
export function openLiveryPanel(ctx: Context): void {
  const layout: LayoutService | undefined = ctx.get('layout')
  try {
    layout?.selectPanel(PANEL_ID)
  } catch {
    /* the gate checks the live registration; a composition that collapsed in
       between must not take the plugin-manager page down with it */
  }
}

/** One contribution: its slot key, list order and the component to register. */
interface DetailContribution {
  readonly key: LiveryDetailSlotKey
  readonly component: (props: LiveryDetailProps) => ReactNode
}

/**
 * Register Livery's three plugin-detail contributions.
 *
 * Every `register` call happens inside the matching `slots.inject` callback, so
 * an undeclared slot (or a host without the plugin-manager page) never throws
 * and simply renders nothing. The returned disposers unsubscribe the injects;
 * the registration disposers they own are returned to the slot service.
 * @param ctx - client Cordis context with the `slots` service.
 * @param options - runtime snapshot source and the main-panel registration getter.
 * @returns one disposer per slot key, in {@link DETAIL_SLOT_KEYS} order.
 */
export function installDetailSlots(
  ctx: Context,
  options: DetailSlotInstallOptions,
): readonly (() => void)[] {
  const { runtime, isMainPanelRegistered } = options
  const contributions: readonly DetailContribution[] = [
    {
      key: 'plugins.detail.actions',
      component: props => (
        <DetailActions
          {...props}
          runtime={runtime}
          isMainPanelRegistered={isMainPanelRegistered}
          openLivery={() => { openLiveryPanel(ctx) }}
        />
      ),
    },
    {
      key: 'plugins.detail.badge',
      component: props => <DetailBadge {...props} />,
    },
    {
      key: 'plugins.detail.section',
      component: props => <DetailSection {...props} runtime={runtime} />,
    },
  ]

  const disposers: Array<() => void> = []
  for (const contribution of contributions) {
    try {
      disposers.push(ctx.slots.inject(contribution.key, () => ctx.slots.register({
        name: contribution.key,
        id: DETAIL_ENTRY_ID,
        order: DETAIL_SLOT_ORDERS[contribution.key],
        locale: LOCALE_NS,
      }, contribution.component)))
    } catch (error) {
      // A host whose slots service rejects an unknown key must lose only that
      // detail contribution, never the whole Livery client plugin.
      console.error(`[dsh-livery] plugin-detail slot ${contribution.key} is unavailable`, error)
    }
  }
  return disposers
}
