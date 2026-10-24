/**
 * Client-side platform types the Livery bundle needs but cannot import as
 * values: the Cordis `slots` service is provided by the shell's ui-renderer
 * (a seed module, not a dependency of this package), so its runtime face is
 * declared structurally here. Type-only imports of the shipped client packages
 * are erased by the bundler and create no module request
 * (client-contract.md §2).
 */
import type { ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { PropsLocale, PropsRuntime, Translate } from '@deepseek-ai/dsh-client-ui-slots'
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

/** Full props of the Livery settings page, including the runtime face. */
export type LiverySettingsPageProps = LiveryPageProps & { readonly runtime: LiveryRuntimeApi }

/** Options accepted by `slots.register` for the Livery settings page. */
export interface LiverySlotRegistration {
  readonly name: 'settings.section'
  readonly id: string
  readonly order: number
  /** Locale-following nav label thunk (the supported mechanism). */
  readonly label: () => string
  readonly locale: 'dsh-livery'
}

/**
 * Structural face of the `slots` service used by this plugin. Mirrors the
 * shipped registry (`client-contract.md` §4): `inject(key, cb)` runs the
 * callback once the slot's declaring owner is live, and `register` contributes
 * an entry whose disposer removes it.
 */
export interface SlotsService {
  register(
    options: LiverySlotRegistration,
    component: (props: LiveryPageProps) => ReactNode,
  ): () => void
  inject(key: 'settings.section', callback: () => () => void): () => void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    slots: SlotsService
  }
}

/** Convenience alias used by the client entry. */
export type LiveryClientContext = Context
