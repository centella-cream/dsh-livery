/**
 * DSH Livery — browser plugin entry (Cordis face).
 *
 * Registered as `apply(ctx)` plus `inject` service deps on the client module
 * graph. Three contributions, each owned by its own `ctx.effect` so fiber
 * unload tears them down in reverse order:
 *
 * 1. the `dsh-livery` locale dictionaries (zh/en),
 * 2. the settings-page stylesheet,
 * 3. the runtime (state machine + presenter) and the `settings.section` page.
 *
 * No config object arrives here (client plugins get none); the livery choice is
 * read from `ctx.configForms.get('livery')` inside the runtime.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type { LiveryConfig } from '../core/types.js'
import {
  ADAPTER_ID,
  CATALOG_ROUTE,
  DSH_VERSION,
  ENTRY_ID,
  LIVERY_VERSION,
  LOCALE_NS,
  SETTINGS_SECTION_ID,
} from '../core/types.js'
import { findLivery, liveryCssHash, styleTextOf } from '../core/catalog.js'
import { CONTRACT_HASH } from '../generated/contract.js'
import { dictionaries } from '../i18n/index.js'
import { CLIENT_CSS } from '../styles/client.js'
import type { LiveryCatalog } from '../core/types.js'
import { checkBoot, readBootPayload, validateCatalog } from './handshake.js'
import type { HandshakeIdentity } from './handshake.js'
import { createPresenter } from './presenter.js'
import { createLiveryRuntime } from './runtime.js'
import type { ConfigFormLike, LocaleSource, ThemeSource } from './runtime.js'
import { LiverySettingsPage } from './settings/LiverySettingsPage.js'

/** Nav position: after models (10), plugins (15), agent presets (20). */
export const LIVERY_SETTINGS_ORDER = 25

/** Cordis services the plugin waits on. */
export const inject = ['configForms', 'slots', 'locale']

/** Build identity compared against the host first-frame handshake. */
const IDENTITY: HandshakeIdentity = {
  adapterId: ADAPTER_ID,
  contractHash: CONTRACT_HASH,
  pluginVersion: LIVERY_VERSION,
  entryId: ENTRY_ID,
}

/** Timeout for the one lazy catalog request; a hung route must not stall boot. */
const CATALOG_TIMEOUT_MS = 8000

/**
 * Fetch and validate the catalog once.
 * @returns the catalog when the route answered with a same-contract payload.
 */
async function fetchCatalog(): Promise<LiveryCatalog | undefined> {
  try {
    const response = await fetch(CATALOG_ROUTE, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
    })
    if (!response.ok) return undefined
    return validateCatalog(await response.json(), IDENTITY)
  } catch {
    return undefined
  }
}

/** Read the host color scheme without registering anything. */
function themeModeOf(theme: Context['theme']): 'light' | 'dark' {
  try {
    return theme.getTheme().active.colorScheme === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Client plugin body.
 * @param ctx - client Cordis context.
 */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(LOCALE_NS)

  ctx.effect(() => ctx.locale.register(LOCALE_NS, dictionaries), 'livery: locale dictionaries')

  const presenter = createPresenter()
  ctx.effect(() => presenter.installClientCss(CLIENT_CSS), 'livery: client styles')

  const boot = checkBoot(readBootPayload(globalThis), IDENTITY)
  const themeService = ctx.get('theme')
  const theme: ThemeSource | undefined = themeService === undefined ? undefined : {
    getMode: () => themeModeOf(themeService),
    subscribe: listener => ctx.on('theme/change', snapshot => {
      listener(snapshot.active.colorScheme === 'dark' ? 'dark' : 'light')
    }),
  }
  const locale: LocaleSource = {
    getLocale: () => ctx.locale.getLocale().active,
    subscribe: listener => ctx.locale.subscribe(() => listener(ctx.locale.getLocale().active)),
  }
  const form = ctx.configForms.get<LiveryConfig>(ENTRY_ID)
  const configForms = {
    get: (): ConfigFormLike => form,
  }

  const runtime = createLiveryRuntime({
    boot,
    identity: {
      adapterId: ADAPTER_ID,
      contractHash: CONTRACT_HASH,
      pluginVersion: LIVERY_VERSION,
      hostVersion: boot.payload?.hostVersion ?? DSH_VERSION,
    },
    entryId: ENTRY_ID,
    configForms,
    presenter,
    core: { styleTextOf, liveryCssHash, findLivery },
    fetchCatalog,
    locale,
    theme,
    document: typeof document === 'undefined' ? undefined : document,
  })

  ctx.effect(() => {
    runtime.start()
    return () => runtime.dispose()
  }, 'livery: runtime')

  ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: SETTINGS_SECTION_ID,
    order: LIVERY_SETTINGS_ORDER,
    locale: LOCALE_NS,
    label: () => t('section.label'),
  }, props => <LiverySettingsPage {...props} runtime={runtime} />)), 'livery: settings section')
}
