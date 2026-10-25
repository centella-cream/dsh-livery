/**
 * DSH Livery — browser plugin entry (Cordis face).
 *
 * Registered as `apply(ctx)` plus `inject` service deps on the client module
 * graph. Contributions, each owned by its own `ctx.effect` so fiber unload tears
 * them down in reverse order:
 *
 * 1. the `dsh-livery` locale dictionaries (zh/en),
 * 2. the settings-page stylesheet,
 * 3. the runtime (state machine + presenter) and the `settings.section` page.
 *
 * Host compatibility is decided once, by the generated certified-adapter
 * registry: the first-frame payload and the fetched catalog must agree on an
 * exact `(hostVersion, adapterId, contractHash)` triple plus its
 * `catalogProfile`. No config object arrives here (client plugins get none); the
 * livery choice is read from `ctx.configForms.get('livery')` inside the runtime.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type { LiveryConfig, LiveryCatalog } from '../core/types.js'
import { CATALOG_ROUTE, ENTRY_ID, LIVERY_VERSION, LOCALE_NS, SETTINGS_SECTION_ID } from '../core/types.js'
import { findLivery, liveryCssHash, styleTextOf } from '../core/catalog.js'
import { ADAPTER_IDENTITIES } from '../generated/contract.js'
import { dictionaries } from '../i18n/index.js'
import { CLIENT_CSS } from '../styles/client.js'
import { bootIdentity, checkBoot, checkCatalog, readBootPayload } from './handshake.js'
import type { BootCheck } from './handshake.js'
import type { RuntimeIdentity } from './model.js'
import { createPresenter } from './presenter.js'
import { createLiveryRuntime } from './runtime.js'
import type { ConfigFormLike, LocaleSource, ThemeSource } from './runtime.js'
import { LiverySettingsPage } from './settings/LiverySettingsPage.js'

/** Nav position: after models (10), plugins (15), agent presets (20). */
export const LIVERY_SETTINGS_ORDER = 25

/** Cordis services the plugin waits on. */
export const inject = ['configForms', 'slots', 'locale']

/** Timeout for the one lazy catalog request; a hung route must not stall boot. */
const CATALOG_TIMEOUT_MS = 8000

/**
 * Live build identity for presentation. The handshake's certified adapter is
 * authoritative; an uncertified payload still contributes the values it
 * reported so the self-check can explain the failure.
 * @param boot - handshake result.
 * @returns identity shown in the settings page/diagnostics.
 */
function identityOf(boot: BootCheck): RuntimeIdentity {
  if (boot.adapter !== undefined) {
    return {
      adapterId: boot.adapter.adapterId,
      contractHash: boot.adapter.contractHash,
      pluginVersion: LIVERY_VERSION,
      hostVersion: boot.adapter.hostVersion,
    }
  }
  return {
    adapterId: boot.payload?.adapterId ?? '',
    contractHash: boot.payload?.contractHash ?? '',
    pluginVersion: LIVERY_VERSION,
    hostVersion: boot.payload?.hostVersion ?? '',
  }
}

/**
 * Fetch and validate the catalog once, against the identity the handshake
 * promised (or, with no boot payload, against any certified adapter record).
 * @param expected - identity from the accepted handshake, when there is one.
 * @returns the catalog when the host answered for a certified adapter.
 */
async function fetchCatalog(expected: ReturnType<typeof bootIdentity>): Promise<LiveryCatalog | undefined> {
  try {
    const response = await fetch(CATALOG_ROUTE, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
    })
    if (!response.ok) return undefined
    return checkCatalog(await response.json(), { adapters: ADAPTER_IDENTITIES, expected }).catalog
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

  const boot = checkBoot(readBootPayload(globalThis), ADAPTER_IDENTITIES)
  const expected = bootIdentity(boot)
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
    identity: identityOf(boot),
    entryId: ENTRY_ID,
    configForms,
    presenter,
    core: { styleTextOf, liveryCssHash, findLivery },
    fetchCatalog: () => fetchCatalog(expected),
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
