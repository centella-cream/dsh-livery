/**
 * Client-side platform types the Livery bundle needs but cannot import as
 * values: the Cordis `slots` service is provided by the shell's ui-renderer
 * (a seed module, not a dependency of this package), so its runtime face is
 * declared structurally here. Type-only imports of the shipped client packages
 * are erased by the bundler and create no module request
 * (client-contract.md §2).
 *
 * The plugin contributes to one of two compositions:
 * - panel navigation (certified hosts): a keyed `main` panel page plus a
 *   `sidebar.panellist` row (declared by ui-layout + ui-sidebar);
 * - Settings fallback (older/foreign compositions): the legacy
 *   `settings.section` page.
 */
import type { ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { PropsLocale, PropsRuntime, Translate } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the `main` keyed-slot contract + `MainPanelId` branding.
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the `sidebar.panellist` slot contract and its icon props.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the settings slot contract (`settings.section`) and the
// `ctx.configForms` Context merge; both are erased at build time.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (`ctx.locale`).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the theme plugin's Context/Events merge (`ctx.theme`,
// `theme/change`) — the runtime only observes theme while the page is open.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type { LiveryKey } from '../i18n/index.js'
import type { LiveryRuntimeApi } from './model.js'

export type { LiveryKey }

/** Typed translate function for this bundle's locale namespace. */
export type LiveryTranslate = Translate<LiveryKey>

/** Owner + locale shares a `settings.section` entry receives from the shell. */
export type LiveryPageProps = PropsRuntime<'settings.section'> & PropsLocale<'dsh-livery'>

/** Owner + locale shares the keyed `main` panel page receives from the shell. */
export type LiveryMainPageProps = PropsRuntime<'main'> & PropsLocale<'dsh-livery'>

/** Owner (icon geometry/active) + locale shares a sidebar row receives. */
export type LiveryPanelIconProps = PropsRuntime<'sidebar.panellist'> & PropsLocale<'dsh-livery'>

/** Full props of the Livery settings page (fallback composition). */
export type LiverySettingsPageProps = LiveryPageProps & { readonly runtime: LiveryRuntimeApi }

/** Full props of the Livery main-panel page (panel-navigation composition). */
export type LiveryPanelPageProps = LiveryMainPageProps & { readonly runtime: LiveryRuntimeApi }

/** Options accepted by `slots.register` for the legacy settings page. */
export interface LiverySlotRegistration {
  readonly name: 'settings.section'
  readonly id: string
  readonly order: number
  /** Locale-following nav label thunk (the supported mechanism). */
  readonly label: () => string
  readonly locale: 'dsh-livery'
}

/** Options accepted by `slots.register` for the keyed main panel page. */
export interface LiveryMainRegistration {
  readonly name: 'main'
  /** Keyed-slot cell: the panel id the sidebar row selects. */
  readonly key: MainPanelId
  readonly locale: 'dsh-livery'
}

/** Options accepted by `slots.register` for the sidebar panel row. */
export interface LiverySidebarRegistration {
  readonly name: 'sidebar.panellist'
  /** List id; must equal the keyed `main` panel id. */
  readonly id: string
  readonly order: number
  readonly label: () => string
  readonly locale: 'dsh-livery'
}

/**
 * Structural face of the `slots` service used by this plugin. Mirrors the
 * shipped registry (`client-contract.md` §3/§4): `inject(key, cb)` runs the
 * callback whenever the slot's declaring owner becomes live, and `register`
 * contributes an entry whose disposer removes it. Contribution gating never
 * reads slot metadata synchronously: activation order is profile-dependent, so
 * `inject` is the source of truth.
 */
export interface SlotsService {
  register(
    options: LiverySlotRegistration,
    component: (props: LiveryPageProps) => ReactNode,
  ): () => void
  register(
    options: LiveryMainRegistration,
    component: (props: LiveryMainPageProps) => ReactNode,
  ): () => void
  register(
    options: LiverySidebarRegistration,
    component: (props: LiveryPanelIconProps) => ReactNode,
  ): () => void
  inject(key: 'settings.section', callback: () => () => void): () => void
  inject(key: 'main', callback: () => () => void): () => void
  inject(key: 'sidebar.panellist', callback: () => () => void): () => void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    slots: SlotsService
  }
}

/** Convenience alias used by the client entry. */
export type LiveryClientContext = Context
