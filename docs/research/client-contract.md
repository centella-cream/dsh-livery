# DSH Client-Side Plugin Contract — 0.2.0-rc.2

Implementation-grade contract for a third-party **browser** plugin ("livery"). Every claim is cited `path:line`;
anything not verified against first-party files is marked **UNVERIFIED**.

**Paths**: `DSH/` = `/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/`;
`FE/` = `DSH/dsh-web-frontend/dist/assets/index-5SrrfWpU.js` (minified shell, boot+seed all on line 126);
`CHARTER/` = `/Users/ryanzhang/Personal/openprojects/dsh-charter/` (working reference plugin). Host `0.2.0-rc.2`, React 18.3.1.

## 0. Load-bearing facts (10 lines)

1. Build output is one classic script calling `window.__ModuleLoader__.load({id, factory})`; `id` = exact npm package name; factory = `(require) => module.exports` (`DSH/dsh-client-modules/lib/client.js:1-6,569-576`).
2. Host serves only `exports["./client"]` as `/<pkg>/client.js` plus compiler chunks `client.<name>.js`; CSS must be inlined into JS, no sibling static imports (`DSH/dsh-client-modules/lib/index.js:170-181,204-229`).
3. Baseline seed (9 words): `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-slots`, `@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-dockkit` (`FE:126`); everything else needs `dsh.client.external`.
4. `dsh.client.inject` = informational package edges; Cordis service deps are a **separate** `export const inject` in the bundle (`DSH/dsh-package-manifest/lib/types/types.d.ts:76-89`, `CHARTER/src/client.tsx:14`).
5. Settings page = `settings.section` list slot (root scope, owner prop `{close}`); single preference = `settings.general.item`; Plugins-page config = `plugins.item`/`plugins.bundle.config`/`plugins.row.config` (`DSH/dsh-client-ui-settings/lib/types/client/contract/slots.d.ts:62-124`).
6. Locale: `ctx.locale.register(ns,{zh,en})` + `bind(ns)`; ids exactly `zh`/`en`, fallback `en` (`DSH/dsh-client-locale/lib/types/client/index.d.ts:199-226`, `.../locale-settings.d.ts:8-11`).
7. Theme observation = `ctx.theme.getTheme()` + `ctx.on('theme/change', …)`; never register a theme to read state (`DSH/dsh-client-ui-theme/lib/types/client/index.d.ts:84-143`, `DSH/dsh-client-ui-layout/lib/client.js:674-684`).
8. Theme DOM: presenter writes `body[data-ds-dark-theme]`, `html[data-ds-theme-source]`, `--dsh-content-font-size`, token vars on `body` (`DSH/dsh-client-ui-layout/lib/types/client/theme-presenter.d.ts:14,24,26`, `.../lib/client.js:532-547`).
9. Client `apply(ctx)` gets **no config object**; host config is read via `ctx.configForms.get('<settings namespace>')` (`DSH/dsh-client-ui-settings/lib/types/client/config-form.d.ts:138-157`).
10. Styles: inline CSS string → `<style data-plugin="<pkg>" data-plugin-css="<pkg>/<file>.css">` at materialization; kernel removes them on disable/HMR (`DSH/dsh-client-modules/lib/client.js:194-197,492-498`).

## 1. Client bundle envelope

**File location.** Loader row specifier → nearest `package.json` → `pkg.dsh.client` (validated by `parseDshClient`) →
`pkg.exports["./client"]` (string or `{default}`) → `dirname(pkg.json)/<rel>` (`DSH/dsh-client-modules/lib/index.js:701-731`, `:170-181`).
`dsh.client` without `./client` is a hard error (`:719`); a missing built file fails activation loudly with a
package/path list (`:132-152`; `DSH/dsh-client-modules/README.md:50`).

**Exact envelope** (banner/footer in `CHARTER/tsdown.config.ts:41-56`):

```js
window.__ModuleLoader__.load({
  id: 'dsh-livery',                // MUST equal the package name (graph row id)
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    /* bundle body: runs once, at materialization */
    exports.apply = apply;         // Cordis plugin face
    exports.inject = inject;       // optional service deps
    return module.exports;
  }
});
```

- Registration shape `ClientBundleRegistration {id, chunk?, factory}` (`DSH/dsh-client-modules/lib/types/client/manifest.d.ts:176-188`).
- `id` normalization strips a trailing `/client`, so `@scope/pkg/client` ≡ `@scope/pkg` (`.../lib/client.js:98-100,569-572`); a row that never registers fails with `loaded without registering "<id>" via __ModuleLoader__.load` (`:625,640`).
- Re-execution of the same registration throws `duplicate factory registration` (`:573-576`).
- **Lazy CJS**: script execution only registers the factory; module-body side effects (CSS included) run at materialization, memoized in `loadCache` (`:16-24,671-695`); a require cycle throws (`:677`).
- `require(spec)` is synchronous: seed word → memoized record → registered factory → **throw** (`:698-706`). `require.async(spec)` is the only async form, and `./client.<name>.js` is the only chunk form (`:707-714`; name pattern `^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$` `:470`).
- Build constraints: one self-contained entry; a synchronous `require` of another relative `client*.js` output is unsupported (`DSH/dsh-client-modules/README.md:68`) and only compiler-emitted chunks get a route (`index.js:220-229`); a bare `import './client.css'` cannot survive a CJS factory, so CSS is inlined (`CHARTER/scripts/build/inline-client-css.mjs:1-40`; shipped packages use the shared tsdown client preset).
- Source maps: optional sibling `client.js.map`; absent ⇒ host synthesizes an identity section map (`index.js:270-281,336-345`); the bundle's `sourceMappingURL` trailer is stripped and re-stamped per combo (`:255-267`); emitted maps are indexed v3. Reference build: `tsdown`, `format:'cjs'`, `platform:'browser'`, `deps.neverBundle` for `react*` and `@deepseek-ai/*` (`CHARTER/tsdown.config.ts:1-12,38-62`).

## 2. Module sharing: seed, `external`, `inject`

Baseline seed, usable with **no** declaration (`FE:126`; copied into the resolver at
`DSH/dsh-client-modules/lib/client.js:548,698-700`; README calls it frozen, `DSH/dsh-client-modules/README.md:46`):

```js
{ react, "react/jsx-runtime", "react-dom", "react-dom/client", "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-store", "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-ui-primitives", "@deepseek-ai/dsh-client-ui-dockkit" }
```

Type-only imports are erased and create no request (`DSH/dsh-package-manifest/lib/types/types.d.ts:86-87`).

| `dsh.client` field | meaning | validation |
|---|---|---|
| `platform` / `immediately` | `'web'` (else not a client row) / stage-one prefetch tier | `index.js:713-717`, `client.js:68` |
| `inject` | *informational* package-name deps, "not Cordis service injection" (`types.d.ts:79-80`) | string array `client.js:66,49` |
| `external` | exact non-baseline module requests, subpaths included (`types.d.ts:83-88`) | string array `client.js:67,49` |

- `external` creates graph edges: requested package rows are ordered before consumers; self-request throws; a
  synchronous request cycle throws (`DSH/dsh-client-modules/lib/index.js:405-437`, errors `:424,428`). A name that is
  neither a graph row nor a seed word adds no edge (`:427-430`).
- `inject` rows register their factories before the consumer materializes; inject cycles are rejected at arrival
  (`.../lib/client.js:643-669`).
- Unresolvable `require` throws `missed the module table … (a build-time externals drift …)` (`:705`).
- Division of labour, as practiced (`CHARTER/package.json:95-103`; `CHARTER/src/client.tsx:1-14`): `external` only for
  specifiers the bundle **requires** (`@deepseek-ai/dsh-api-gateway/client`); `inject` for packages whose Cordis
  services the plugin waits on; `export const inject` in code for the service names themselves.
- No missing-supplier precheck is present in the shipped node half — only self/cycle checks (`index.js:426-430`); the
  README's "missing suppliers" rejection is **UNVERIFIED**.

## 3. Client `ctx` services in 0.2.0-rc.2

Client plugins export `apply(ctx)` with no config argument (`DSH/dsh-client-modules/lib/client.js:865-869`,
`CHARTER/src/client.tsx:26`). Cordis primitives: `ctx.effect(body,label)` (`DSH/cordis/lib/types/fiber.d.ts:145-159`),
`ctx.inject(deps,cb)` (`DSH/cordis/lib/types/registry.d.ts:185`), `ctx.get(name)` for optional services.

| service | provider | key members |
|---|---|---|
| `slots` | ui-renderer | `register(opts, component)` (`DSH/dsh-client-ui-renderer/lib/types/client/registry.d.ts:85`), `registerFactory` (`:95`), `inject(key, cb)` (`:111`), boot-once `install`/`installLocale` (`:118,126` — shell-owned), `entries`, `entriesOfSlot`, `snapshot`, `subscribe`, `getVersion`, `onEntryError` (`:164-211`) |
| `uiRenderer` | ui-renderer | `mount(el): () => void` (`.../client/index.d.ts:7-14`) — shell-owned |
| `locale` | dsh-client-locale | §5; `DSH/dsh-client-locale/lib/types/client/index.d.ts:97-237` |
| `theme` | dsh-client-ui-theme | §6; `DSH/dsh-client-ui-theme/lib/types/client/index.d.ts:109-188` |
| `remote` | dsh-api-gateway/client | typed `remote.<ns>` methods, `$stream`, `$host.{home,isLoopback}`, `$mount(contribution)` (`DSH/dsh-api-gateway/lib/types/client/index.d.ts:10-52`; usage `CHARTER/src/client.tsx:46`) |
| `configForms` (+`settingsSchema`) | dsh-client-ui-settings | `get(ns)`, `describe()`, `whileServed(ns, cb)` (`.../config-form.d.ts:130-157`); schema rehydrate/validate (`.../schema.d.ts`) |
| `modules` / `layout` | client-modules / ui-layout | `ClientModuleLoader` (`DSH/dsh-client-modules/lib/types/client/manifest.d.ts:239-288`, rarely needed); `panelInfo`, `selectPanel`, `toggleSidebar`, `openRightbar`, `closeRightbar` (`DSH/dsh-client-ui-layout/lib/types/client/service.d.ts:22-52`) |

Further feature services (`sessions`, `conversation`, `uiConversation`, `sidebarRight`, `productAnalytics`, …) exist per package but are outside a skin plugin's needs.

## 4. Settings UI registration

Slot contract (all `scope:'root'`) at `DSH/dsh-client-ui-settings/lib/types/client/contract/slots.d.ts`:

| slot | kind | owner props | use |
|---|---|---|---|
| `settings.section` | list (`id`,`order`,`label`) | `{close: () => void}` (`:154-157`) | **a full settings page** (`:62-77`) |
| `settings.general.item` | list (`id`,`order`) | `{}` (`:128-131`) | one preference row in General (`:106-124`) |
| `settings.plugins.tab` | list (`id`,`order`,`label`) | `{}` (`:133-136`) | page inside the Plugins settings section (`:78-90`) |
| `settings.action` | list | `{}` | header actions before Close (`:42-51`) |
| `settings.onboarding` | list | `{stepId,explicit?,complete,openSection}` (`:158-168`) | onboarding step |

Plugins **should** use `settings.section` for a page and `settings.general.item` for a single row; the shell owns no copy (`contract/slots.d.ts:1-10`; `DSH/dsh-client-ui-settings/README.md:42`). `ui-settings-shell` is **not** an extension point — one shipped official page that registers while its host namespace is served (`DSH/dsh-client-ui-settings-shell/README.md:6-16`).

Shell behaviour (`DSH/dsh-client-ui-settings-general/lib/client.js`): nav = `slots.entries('settings.section')` →
`{id,label,order}`, ascending `order`, labels via `resolveSlotLabel`, re-rendered on slot version **and** locale revision
(`:1017-1039`); active section renders as `renderSlot('settings.section', {close: onClose}, {only: active})` (`:337`;
`only` filters by entry id, `DSH/dsh-client-ui-slots/lib/types/index.d.ts:224-230`). Unknown ids get a default gear icon
(`:244-274`). Shipped orders: `account -10`, `general 0`, `models 10`, `plugins 15`, `agent-presets 20`.

Minimal page registration (mirrors `.../client.js:1171-1181`):

```tsx
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

export const inject = ['slots', 'locale']

export function apply(ctx) {
  const t = ctx.locale.bind('dsh-livery')
  ctx.effect(() => ctx.locale.register('dsh-livery', { zh, en }), 'dsh-livery: locale')
  ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'livery',              // nav id, also the `only` filter key; new ids are fine
    order: 25,                 // after models(10), plugins(15), agent-presets(20)
    label: () => t('nav'),     // SlotLabel thunk: locale-following, no re-registration
    locale: 'dsh-livery',      // puts typed `t` on props
  }, LiverySection)), 'dsh-livery: settings section')
}

function LiverySection(props: PropsRuntime<'settings.section'> & PropsLocale<'dsh-livery'>) {
  return <section>{props.t('title')}<button onClick={props.close}>…</button></section>
}
```

Rules that bite: registering into an undeclared slot throws; a second entry at an occupied cell's exact priority throws;
the disposer collapses declared children (`DSH/dsh-client-ui-slots/lib/types/index.d.ts:757-788`); an entry that declares
`children` must render `renderSlot` (`:585-595`). Label thunks are the supported locale mechanism (`:550-555`) though the
settings contract text still describes re-registration (`.../contract/slots.d.ts:62-68`) — shipped pages use thunks.

Sidebar-level page (how the Plugins page is registered): a keyed occupant of `main` plus a `sidebar.panellist` row, not a
Settings section — `ctx.slots.register({name:'main', key:'plugins', locale, store, inject, children:{…}}, Page)`
(`DSH/dsh-client-ui-plugin-manager/lib/client.js:3719-3760`) and
`ctx.slots.register({name:'sidebar.panellist', id:'plugins', order:0, label:()=>t('panel'), locale}, PluginsPanelIcon)`
(`:3770-3776`); declarations `DSH/dsh-client-ui-layout/lib/types/client/index.d.ts:48-56`,
`DSH/dsh-client-ui-sidebar/lib/types/client/contract/slots.d.ts:46-52`.

## 5. Locale

- Ids: `LOCALE_IDS = ['zh','en']`, `BuiltInLocaleId = 'zh'|'en'`, `FALLBACK_LOCALE='en'` (`DSH/dsh-client-locale/lib/types/locale-settings.d.ts:8-11`, `.../client/index.d.ts:82`). Not `zh-CN`.
- Register typed, both locales required, duplicate `(ns,locale)` throws: `ctx.locale.register(ns,{zh,en}) → disposer` (`.../client/index.d.ts:199`); per-locale form for language packs (`:209`). Keys are declared by merging `LocaleNamespaceMap` (`:20-27`).
- Bind: `ctx.locale.bind(ns) → (key, params?) => string` with `{name}` templates, stable identity per namespace (`:219-226`; `DSH/dsh-client-ui-slots/lib/types/index.d.ts:45,67`).
- Read: `getLocale()`/`getSnapshot()` → `{active, locales, revision}`; `subscribe(fn)`; event `'locale/change'(snapshot)` fires **only** on a locale switch, not on dictionary registration (`.../client/index.d.ts:49-56,61-71,123-144`). `<html lang>` is synced by the runtime (`DSH/dsh-client-locale/README.md:92`).
- Writes only via `setLocale(id)` (`:145-157`); language packs `addLanguage({id,label,fallback})` (`:158-170`); package text `resolveText(LocalizedText)` (`:124-130`). Slot labels follow the locale as thunks resolved per read (`DSH/dsh-client-ui-slots/lib/types/index.d.ts:550-555`).
- Reference: `CHARTER/src/client/locales.ts:489-498` (`Record<'zh'|'en', LocaleDictOf<ns>>` + namespace merge), `CHARTER/src/client.tsx:28-36`.

## 6. Theme

- `ctx.theme`: `getTheme()`, `exportInspectTokens()`, `setTheme(id)`, `setFontSize(px)`, `register(definition)`, `overrideTokens(source, tokens)` (`DSH/dsh-client-ui-theme/lib/types/client/index.d.ts:109-188`); event `'theme/change'(snapshot)` (`:88-96`).
- `ThemeSnapshot = {preference:'light'|'dark'|'system', fontSize, active:{id, colorScheme:'light'|'dark', tokens}, themes, revision}`; the dark flag is `snapshot.active.colorScheme === 'dark'` (`:43-70`).
- DOM (recomputed on every `theme/change`): `documentElement.style.colorScheme`; `html[data-ds-theme-source="light|dark|system"]`; `body[data-ds-dark-theme]` present+empty when dark, removed otherwise; `body --dsh-content-font-size`; alias tokens as inline vars on `body`; one `meta[name=theme-color]` (`DSH/dsh-client-ui-layout/lib/client.js:532-547`; constants `theme-presenter.d.ts:14,24,26`).
- Observe without registering (the shipped pattern, `.../lib/client.js:674-684`):

```ts
ctx.effect(() => {
  const apply = (s: ThemeSnapshot) => { root.dataset.dark = String(s.active.colorScheme === 'dark') }
  apply(ctx.theme.getTheme())
  const off = ctx.on('theme/change', apply)
  return off
}, 'dsh-livery: theme observer')
```

Prefer CSS: `--dsw-*` tokens already switch with the palette, so a skin often needs no JS observation (`DSH/dsh-client-ui-theme/README.md:28`). Registering a theme or calling `setTheme`/`setFontSize` is a product decision, not an observation mechanism; `overrideTokens(source, tokens)` is the least invasive dynamic write (`.../client/index.d.ts:162-178`). The presenter is shell-owned — never install it.

## 7. Styles

Injection pattern used by every shipped client bundle (`DSH/dsh-client-ui-agent-preset/lib/client.js`, per-module block):

```js
const tagId = '<pkg>/<File>.module.css'
if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {
  const tag = document.createElement('style')
  tag.dataset.plugin = '<pkg>'; tag.dataset.pluginCss = tagId; tag.textContent = css
  document.head.appendChild(tag)
}
```

- Lifecycle: tags are inserted at materialization; `claimStyles` claims any untagged `<style>` for the materializing
  plugin and records `data-plugin-css` (`DSH/dsh-client-modules/lib/client.js:492-498`); `removeOwnedStyles(id)` deletes
  every `style[data-plugin="<id>"]` on disable, HMR replacement, prune and invalidation (`:194-197,312,367,690,796,821`).
  Because the CSS string lives inside the factory body, a disabled plugin leaves no styles.
- No `@layer` in shipped packages (grep over `DSH/dsh-client-ui-primitives/lib/*.css`, `DSH/dsh-client-ui-theme`): plain
  unlayered CSS + CSS-module hashed class names + `--dsw-*` tokens. `docs/web-styling.md` is cited as authoritative
  (`DSH/dsh-client-ui-primitives/README.md:116,175`) but is **not shipped** — content **UNVERIFIED**.
- `@deepseek-ai/dsh-client-ui-primitives` is a **seed word** and shell build input with **no** `dsh.client` declaration
  (`DSH/dsh-client-ui-primitives/package.json:14-24`, no `dsh` key); its components (`Button`, `Switch`, `Menu`, `Modal`, `Tooltip`,
  `SettingsForm`, icons, …) are reachable via `require('@deepseek-ai/dsh-client-ui-primitives')` with no `external`
  (`lib/types/index.d.ts:4-97`). It is the only sanctioned shared control library — a plugin cannot import another
  plugin's components (`README.md:39`). No CSS-injection helper is exported.

## 8. Plugin configuration from the client

- No config channel exists in the boot wire or the client face: `WebBootEntry` carries only
  `{id,url,rev,inject,external,immediately}` (`DSH/dsh-client-modules/lib/types/client/manifest.d.ts:48-64`), client
  entries are created with `{name: id}` only (`.../lib/client.js:352-361`), and `parseDshClient` accepts only
  `platform/inject/external/immediately` (`:61-75`). Any other client-config path is **UNVERIFIED**.
- Route A — settings namespace: host half registers a namespace via `ctx.settings`; browser half reads
  `ctx.configForms.get(ns)` → `ConfigForm<T>{getSnapshot, subscribe, set(field,value), unset(field), mutate(ops, expectedRevision?)}`
  (`.../config-form.d.ts:138-142`; `.../config-form-types.d.ts:36-74`). Snapshot =
  `{status:'loading'|'ready'|'unavailable', value, base, user, revision, writable, mode:'host'|'memory'}`
  (`:6-32`). Caveat: the signature documents `entryId` but the implementation keys the form by `{namespace: entryId}` —
  pass the settings namespace (`DSH/dsh-client-ui-settings/lib/client.js:1309-1312`). Gate registration with
  `ctx.configForms.whileServed([ns], register)` (`config-form.d.ts:143-156`).
- Route B — remote namespace via `ctx.remote` (`DSH/dsh-api-gateway/lib/types/client/index.d.ts:10-52`), mounted from a
  contribution (`CHARTER/src/client.tsx:43-65`): use when the data is not settings.
- Form presentation is a **Plugins-page** mechanism, not a Settings-page one: `plugins.item` (list, official plugin),
  `plugins.bundle.config` (keyed by package name), `plugins.row.config` (keyed `<pkg>#<rowId>`), each rendered with
  `PluginConfigViewProps {view:'summary'|'page', form?: {state, mutate}}`
  (`DSH/dsh-client-ui-plugin-manager/lib/types/client/slot-contract.d.ts:20-25,74-116,150-153`; docs `README.md:58-84`).
  The page owner resolves each entry's form by namespace from `ctx.configForms.describe()` (`DSH/dsh-client-ui-plugin-manager/lib/client.js:3310`).
- Durability: host-backed only on loopback pages; remote pages never write to the Host and a form starts `unavailable` (`DSH/dsh-client-ui-settings/README.md:106`).

## 9. React / JSX runtime

- Seeded React is **18.3.1** (`version="18.3.1"` in the shell bundle; `react-dom.production.min.js` and
  `react-jsx-runtime.production.min.js` are inlined in `FE`), exposed as an ESM-shaped namespace `{default, ...named}`,
  so both `import React from 'react'` and `import {jsx} from 'react/jsx-runtime'` resolve.
- `react` is **not installed** under the DSH installation (`DSH/../node_modules/react` absent) — it exists only in the
  prebuilt shell. Declare it as devDependency + peer for building (`CHARTER/package.json:126-140` `react ^18.2.0`) and
  never bundle it.
- JSX: automatic runtime; a tsdown-rolled CJS client bundle emits `require("react/jsx-runtime")` and `require("react")` —
  the reference bundle requires exactly `react`, `react/jsx-runtime` and its one declared external (grep over
  `CHARTER/lib/client.js`), all seed words ⇒ no `external` entry. `react-dom`/`react-dom/client` are seeded for portals,
  but mounting belongs to the shell (`uiRenderer.mount`, `DSH/dsh-client-ui-renderer/lib/types/client/index.d.ts:7-14`).

## 10. Residual risks for livery

Bundle purity is enforced at **runtime** (loud throw), not at build time in the shipped packages (§2) — a wrong `external` fails on page load. `CHARTER/tsdown.config.ts:18-22` ("DSH does not expose sibling chunk files") is stale for rc.2: compiler chunks are routed (`DSH/dsh-client-modules/lib/index.js:220-229`), non-compiler sibling files are not. Shipping `--dsw-*` overrides via `ctx.theme.overrideTokens` without registering a theme is API-supported but **not documented as a public extension point** (`DSH/dsh-client-ui-theme/README.md:125`).
