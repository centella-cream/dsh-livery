# DSH host-side plugin contract: 0.2.0-rc.2

A detailed contract for a third-party DSH plugin ("livery"). Every claim cites `path:line`; unverified claims
are marked **UNVERIFIED**. Host `0.2.0-rc.2` (`DSH/../dsh/package.json:4`), Cordis `4.0.5` (`DSH/cordis/package.json:4`).
Paths: `DSH/` = `…/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/`, `CHARTER/` = `~/Personal/openprojects/dsh-charter/`
(reference plugin), `SKIN/` = `~/Personal/opensources/deepseek-harness-skin/plugin/` (prior art installed as bundle
`dsh-skin` in `~/.dsh/profiles/desktop`; it does first-paint skin injection, the same job).

## 0. Key facts

1. One plugin = one Loader entry `{id, name, config}`; `name` is an import specifier, `id` is the settings namespace (`DSH/cordis-plugin-loader/README.md:29-31`, `SKIN/cordis.patch.yml:5-9`).
2. Entry shape is free: default-exported `class extends Service` with `static inject`/`static Config`, or an object exporting `apply(ctx, config)` + `Config` (`DSH/cordis/lib/index.js:1067-1071,1631`).
3. `.volatile()` Config fields arrive as `Volatile<T>` (`.get()`) and become the browser-editable form (`DSH/schemastery/lib/types/index.d.ts:156,206`, `SKIN/src/config.ts:11`).
4. First paint = `ctx.on('webserver/index-inject', t => t.push(row))`; row kinds `style|script|script-src|script-preload|global|html` (`DSH/dsh-host-webserver/lib/types/index.d.ts:27`, `DSH/dsh-host-webserver/lib/types/injections.d.ts:11-51`).
5. Rows splice immediately after `<head>`, **before** the shell's `<script>`/`<link>` tags — equal-specificity injected CSS loses; scope first-paint rules to `body[data-…]` (`DSH/dsh-host-webserver/lib/index.js:85-87`, `DSH/dsh-web-frontend/dist/index.html:10-13`).
6. The event is emitted only by a live `WebServer`; listen unconditionally, it is inert without the Web carrier (`DSH/dsh-host-webserver/lib/index.js:352`).
7. Typed Host→Client calls need both halves: Host `TypertRemoteService` + Client `ctx.remote.$mount(contribution)` (`DSH/dsh-typert-protocol/README.md:32-45`, `DSH/dsh-api-gateway/README.md:52`).
8. The remote service usually ships as its own entry (`charter-remote` → `dsh-charter/remote`) (`CHARTER/cordis.patch.yml:16-17`, `CHARTER/package.json:16-19`).
9. Persisting a Client choice: volatile Host field + `settings.configure({auto:false}, ctx.fiber)` + `ctx.configForms.get('<entry-id>')` (`DSH/dsh-settings/README.md:39`, `DSH/dsh-client-ui-settings/lib/types/client/config-form.d.ts:142`, `SKIN/src/client/index.ts:97`).
10. `dsh.client.inject` is informational, `external` is the module contract, `immediately` is a boot barrier (`DSH/dsh-package-manifest/lib/types/types.d.ts:79-88`); disable disposes effects/routes/CSS but **not** DOM attributes written by hand (`SKIN/src/client/index.ts:218` — gap, §6.1).

## 1. Host entry contract

### 1.1 package.json

```jsonc
{ "type": "module", "main": "./lib/index.js", "types": "./lib/index.d.ts",
  "exports": { ".": {"types":"./lib/index.d.ts","default":"./lib/index.js"},
               "./remote": {"default":"./lib/remote.js"}, "./client": {"default":"./lib/client.js"},
               "./cordis.patch.yml": "./cordis.patch.yml" },
  "engines": { "node": "^22.19.0 || >=24.0.0", "dsh": "0.2.0-rc.2" },
  "peerDependencies": { "@deepseek-ai/cordis": "^4.0.4", "@deepseek-ai/dsh-host-webserver": "0.2.0-rc.2" },
  "dsh": { "manifestVersion": 1, "bundle": { "patch": "./cordis.patch.yml" },
           "client": { "platform": "web", "external": ["@deepseek-ai/dsh-api-gateway/client"],
                       "inject": ["@deepseek-ai/dsh-client-ui-settings"] } } }
```

Mirrors `CHARTER/package.json:8-31,45-46,88-116` and `SKIN/package.json`. `dsh.bundle.patch` is one path **or an ordered
list**, relative to the package root, applied as one layer (`DSH/dsh-package-manifest/lib/types/types.d.ts:66-69`,
`DSH/dsh-app-boot/README.md:50`). `dsh.client`: `platform` required; `inject` = informational package-name edges, "not
Cordis service injection"; `immediately` = phase-one registration barrier; `external` = exact non-baseline module requests
(`DSH/dsh-package-manifest/lib/types/types.d.ts:76-89`), validated by `parseDshClient` (`DSH/dsh-client-modules/lib/index.js:61-74`).

**Compatibility is gated by `peerDependencies`, not `engines.dsh`**: before import, every `@deepseek-ai/dsh` / `dsh-*`
peer range is checked against one runtime version; missing DSH peers are unconstrained; `engines.dsh` is never consulted
(`DSH/dsh-app-boot/README.md:52`, `DSH/dsh-package-manifest/README.md:93`). For a package that targets a single build, pin
`0.2.0-rc.2` exactly; `"*"` (`SKIN/package.json`) buys nothing. Both references install as a *bundle* (listed in the
profile's `dsh.profile.bundles`), so the profile patch never repeats their rows (`~/.dsh/profiles/desktop/package.json`, `~/.dsh/profiles/web/package.json`).

### 1.2 cordis.patch.yml

```yaml
- insert:
    - id: livery
      name: dsh-livery          # package specifier | absolute path | file URL | ./relative
      config: { activeSkin: ivory-slate }
    - id: livery-remote         # second entry: Host-only remote half
      name: dsh-livery/remote
```

`insert` appends entries (optionally into the group named by `id`). Other rows are `{id, name?, disabled?, config?}`;
`config` is replaced **wholesale**, not deep-merged; a truthy `name` is an assertion (mismatch = skip); unknown ids warn
and skip (`DSH/dsh-app-boot/lib/index.js:61-103,2760`). Patch-relative `./`/`../` names become file URLs
(`DSH/dsh-app-boot/README.md:65`); entries also accept `disabled`, `group`, `inject` (`DSH/cordis-plugin-loader/README.md:27-34`).
**`id` is load-bearing**: settings key a plugin's form by entry id and the client reads it back via
`ctx.configForms.get('<id>')`, so renaming the id renames the persistence namespace (`SKIN/cordis.patch.yml:5-9`,
`DSH/dsh-settings/lib/types/index.d.ts:92-96`).

### 1.3 Loader instantiation (verified order)

1. Import `name`; normalize exports `exports.default ?? exports` (again for `__esModule`) (`DSH/cordis-plugin-loader/lib/index.js:666-672`).
2. Resolve shape: function | class | `{apply}` object (`DSH/cordis/lib/index.js:1533-1538`, `DSH/cordis/lib/types/registry.d.ts:48-81`).
3. Validate config against `plugin.Config` (`DSH/cordis/lib/index.js:1631`; failure = `ValidationError` → FAILED fiber, `DSH/cordis/lib/types/fiber.d.ts:24-31`).
4. Instantiate (`DSH/cordis/lib/index.js:1067-1071`) — class: `new callback(ctx, config)`, run init hooks, then `i?.[Service.init]?.()`; object: `callback(ctx, config)`.

Class form → `static Config` + `static inject` + optional `[Service.init]()`; object form → exported `Config`/`inject` +
`apply(ctx, config)`. Charter uses the class form (`CHARTER/src/host/service.ts:131-133`, `CHARTER/src/index.ts:1`); ui-theme
and skin use the object form (`DSH/dsh-client-ui-theme/lib/index.js:80-95`, `SKIN/src/index.ts:28-44`).

### 1.4 Service lifecycle & dispose

- `class X extends Service` registers `super(ctx, name)` immediately and is **unregistered automatically when the fiber unloads** (`DSH/cordis/lib/types/service.d.ts:28-38`).
- `[Service.init]()` = async activation hook after construction; rejection = FAILED fiber (`DSH/cordis/lib/types/service.d.ts:11-12`; `WebServer` listens there, `DSH/dsh-host-webserver/lib/types/index.d.ts:116`; charter `CHARTER/src/host/service.ts:158`). `Service` has **no** `start`/`stop`/`dispose`.
- Cleanup is effects: `ctx.effect()` disposers run in **reverse registration order**, may be async (`DSH/cordis/lib/types/fiber.d.ts:35-51`); listeners, services and effects all die with the fiber (`DSH/cordis/README.md:66-67`).
- `WebServer` disposal: `close()` + `closeAllConnections()`, tracked upgraded sockets destroyed, resolves after both (`DSH/dsh-host-webserver/README.md:71`).

## 2. webserver / index-inject

### 2.1 API

`ctx.webServer: WebServer extends Service` (`DSH/dsh-host-webserver/lib/types/index.d.ts:67`); the event is declared on the
Cordis `Events` map as `'webserver/index-inject'(table: IndexInjection[]): void`, `@mode emit`, mutable table, append in
activation order (`DSH/dsh-host-webserver/lib/types/index.d.ts:19-28`).

| kind | placement | fields |
|---|---|---|
| `style` | head only | `text` (must not contain `</style`) |
| `script` | `head`\|`body` | `text` (must not contain `</script`) |
| `script-src` | `head`\|`body` | `src` |
| `script-preload` | head | `src` |
| `global` | head | `name`, `value` → `globalThis[name]=value` |
| `html` | `head`\|`body` | raw markup |

(`DSH/dsh-host-webserver/lib/types/injections.d.ts:11-51`.) Minimal use, same shape as `SKIN/src/index.ts:51-54`:

```ts
ctx.on('webserver/index-inject', (table) => {
  table.push({ kind: 'style', text: cssFor(config.skin.get()) })                       // head, pre-paint
  table.push({ kind: 'script', placement: 'body', text: attributeBoot(config.skin.get()) })
})
```

Rendering: head rows concatenated and spliced **immediately after the opening `<head …>`**, body rows after `<body …>`, each
in table order; a `__DSH_BOOT_READY__` resolving script tails the body rows; raw `tapIndex(transform)` runs **after** row
rendering (`DSH/dsh-host-webserver/lib/index.js:65,74-93,350-363`). **Ordering**: table order = listener registration order,
so `ctx.on(ev, fn, {prepend:true})` places rows first (`DSH/cordis/lib/types/events.d.ts:80-88`; ui-theme does this,
`DSH/dsh-client-ui-theme/lib/index.js:92-94`); `client-modules` pushes `__DSH_BOOT__` + bootstrap scripts later in the table
(`DSH/dsh-client-modules/lib/index.js:453-498`). Emit is synchronous (`DSH/cordis/lib/types/events.d.ts:25`); no other priority exists.

No client bundle subscribes to this event — every occurrence of the string outside READMEs is a Host `lib/index.js`;
the row table never crosses the wire. Verified users: ui-theme head style + body script (`DSH/dsh-client-ui-theme/lib/index.js:92`), client-modules boot graph
(`DSH/dsh-client-modules/lib/index.js:553`), connection `__DSH_CONNECTION_RECOVERY__` (`DSH/dsh-client-connection/lib/index.js:822`),
document-preview `__DSH_DOCUMENT_PREVIEW_CONFIG__` (`DSH/dsh-client-ui-sidebar-documentpreview/lib/index.js:26-32`), skin
custom-skin style + attribute script (`SKIN/src/boot-skin.ts:78-92`).

### 2.2 Cascade consequence (critical)

The shell already places its module script and both stylesheets in `<head>` (`DSH/dsh-web-frontend/dist/index.html:10-13`);
injected rows precede them, so **injected CSS is earlier than every shell stylesheet and loses ties**. Measured: the shell
stylesheet declares 2 `--dsw-*:` tokens but uses 436, while ui-theme's client bundle declares 403 — the token layer is
client-owned and appended to `document.head` at materialization, i.e. after the injected sheet
(`DSH/dsh-client-ui-theme/lib/client.js:1183-1192`). Evidence: `research/host-probe/index-cascade.json`. Therefore scope
first-paint rules to an attribute the injected body script stamps (`body[data-livery-skin='x']`) — higher specificity than
the shell's `body{…}` and re-appliable from the client bundle. Fonts: the shell reads
`body{font-family:var(--dsw-font-family, -apple-system, …)}`, so declare `--dsw-font-family` inside the attribute block, not
on bare `:root` (`DSH/dsh-web-frontend/dist/assets/index-BPHePDI_.css`, `body{font-family:…}` rule).

### 2.3 Routes, headers, static files

- `register({kind:'exact'|'prefix', path, handler})` → disposer; duplicate `(kind,path)` throws; matching is exact → longest prefix → fallback (`DSH/dsh-host-webserver/lib/types/index.d.ts:31-39,84-90`, `DSH/dsh-host-webserver/README.md:45`). The handler owns the whole response; the webserver sets **no** content type and ships no file helper (`DSH/dsh-host-webserver/lib/types/index.d.ts:37-38`, `DSH/dsh-host-webserver/README.md:12`); a throwing handler answers 400 (`DSH/dsh-host-webserver/README.md:55`).
- Static assets are plugin code: `res.writeHead(200, {'content-type':'image/webp'})`, `405` + `allow: 'GET, HEAD'`, `404`, explicit traversal fence — prior art `SKIN/src/index.ts:56-79` (`/api/dsh-skin/{upload,skins,assets}`), MIME/status `SKIN/src/skin-store.ts:243-245,295-297`, routes `SKIN/src/skins/custom.ts:22-33`.
- Do not hide writes under `/api`: `dsh-client-connection` owns the `/api` prefix and its admission check, and a longer prefix route bypasses it (`DSH/dsh-client-connection/lib/index.js:829-843`). Use `/livery/...`.
- The only generic MIME table belongs to the dist fallback owner, not plugin routes (`DSH/dsh-host-frontend-static/lib/types/index.d.ts:37`, `DSH/dsh-host-frontend-static/README.md:42`: unknown extension → `application/octet-stream`). Prefer shipping fonts/CSS **inside the client bundle** — "the client bundle compiles and injects them as plugin-owned global styles, so unload and HMR remove them" (`DSH/dsh-client-ui-theme/README.md:58`) — which avoids a route entirely.

## 3. Configuration, settings, configForms

### 3.1 Host config

Schemastery `z.object({…})` exported as `Config` and mirrored as `static Config` (`CHARTER/src/host/service.ts:70-82,133`);
validated before start, failure fails the fiber (`DSH/cordis/lib/types/fiber.d.ts:24-31`); delivered as the 2nd
constructor/`apply` argument (`DSH/cordis/lib/index.js:1068,1071`). `.volatile()` makes a field a `Volatile<T>` read via
`.get()` and form-editable (`DSH/schemastery/lib/types/index.d.ts:156,205-207`; `Volatile` imported from
`@deepseek-ai/cordis`, `SKIN/src/config.ts:11`; live reads `DSH/dsh-client-ui-theme/lib/index.js:93`, `SKIN/src/index.ts:52-53`).
A volatile-only change commits into the running references **without remount** plus a `loader/volatile-update`
(`DSH/cordis-plugin-loader/README.md:51-53`).

### 3.2 Namespace = entry id

`ctx.settings` (`SettingsForms`) projects each **entry's** live Config: `describe()` = "forms keyed by unique profile entry
ids"; `update/replace/mutate(ns, …)` take a "Profile entry id" (`DSH/dsh-settings/lib/types/index.d.ts:8-19,92-114`). Only
`.volatile()` fields appear; writes persist through the active profile patch and are refused where a home/CLI layer would
override (`DSH/dsh-settings/README.md:12,33,37`). Opt out of the generated page with
`ctx.inject(['settings'], c => c.effect(() => c.settings.configure({auto:false}, ctx.fiber)))` (`DSH/dsh-settings/README.md:39`,
`DSH/dsh-settings/lib/types/index.d.ts:74-82`; implemented `DSH/dsh-client-ui-theme/lib/index.js:88-91`, `SKIN/src/index.ts:47-49`).

### 3.3 Client `configForms`

The wire half of settings is `@deepseek-ai/dsh-api-settings-controller`, which registers the generated
`ctx.remote.settings` / `ctx.remote.credentials` namespaces; `settings.update|replace|mutate` project the settings
service's three write operations and return the namespace's new redacted view (`DSH/dsh-api-settings-controller/README.md:11,30`).
The Client facade over it is `ConfigForms extends Service` (`DSH/dsh-client-ui-settings/lib/types/client/config-form.d.ts:106`): `get<T>(entryId)`
(shared form + write queue, `:138-142`), `describe()` (single document mirror, `:130-137`), `whileServed(namespaces,
register)` (register only while Host-served, `:143-156`). `ConfigForm`: `getSnapshot()` `{value, base, user, revision,
writability, persistence}`, `subscribe`, `set`, `unset`, `mutate`, `dispose` (`:26-93`; semantics
`DSH/dsh-client-ui-settings/README.md:34`). Writes carry the last-seen revision; stale writes are refused and the mirror
reloads (`DSH/dsh-client-ui-settings/README.md:34,46`). Persistence `'host'|'memory'`: non-loopback pages never cross the wire
(`DSH/dsh-client-ui-settings/lib/types/client/config-form.d.ts:118-129`, `DSH/dsh-client-ui-settings/README.md:106`).

**Recommended persistence for a Client choice**, in order: **(1) configForms** — volatile Host field +
`get('<entry-id>')`, verified end-to-end (`SKIN/src/client/index.ts:60-63,97,218`,
`DSH/dsh-client-ui-theme/lib/client.js:1567-1581`); **(2) Remote service** when the value is not a scalar/schema field or
must be readable by other Host plugins (§4); **(3) generated form only** (`auto:true`) when no Client UI is needed;
**never** `localStorage` as source of truth — per-browser, and the Host cannot read it for first paint.

## 4. Host ↔ Client bridge

```ts
// Host, own entry (dsh-livery/remote)
export class LiveryRemote extends TypertRemoteService {
  static inject = ['livery']
  constructor(ctx: Context) { super(ctx, 'liveryRemote', { namespace: 'livery' }) }
  @Remote({ mode: 'stream' })
  watch(signal: AbortSignal): AsyncIterable<Frame> { … }
}
```

(`CHARTER/src/remote/service.ts:12-17,19-27`; base + decorator `DSH/dsh-typert-protocol/README.md:32-45`; a final
`signal: AbortSignal` is injected, not sent, `:45`; stream uplink `this.ctx.invocation.uplink<In>()`, `:49`.)

```ts
// Client
export const inject = ['remote', 'slots', 'locale']
export function apply(ctx: Context) {
  ctx.effect(async () => {
    const disposeMount = await ctx.remote.$mount(liveryRemoteContribution)
    const scope = ctx.inject(['remote.livery'], c => { /* c.remote.livery */ })
    await scope
    return async () => { await scope.dispose(); await disposeMount() }
  }, 'livery: remote')
}
```

(`CHARTER/src/client.tsx:14,43-65`.) `$mount` validates the contribution and installs `remote.<namespace>` for the calling
fiber; withdrawal removes descriptors and aborts calls/streams (`DSH/dsh-api-gateway/README.md:52-54`). Unary calls return
`RemoteResult<T>` and never reject on carrier faults (`:56`); `$on` keys are the Host assembly's forwarding selection
(`:62`, `DSH/dsh-typert-protocol/README.md:74`).

Descriptors may be hand-written instead of generated: `TypertRemoteContribution = {package, descriptors: readonly
InvocationDescriptor[]}` (`DSH/dsh-typert-protocol/lib/types/types.d.ts:344-349`), each naming
`service/namespace/method/mode/invocation/parameters/result` codecs (`CHARTER/src/remote/contribution.ts:12-80`). This is
the route when Typert codegen is unavailable — strict codecs are mandatory for every client-supplied field
(`DSH/dsh-api-gateway/README.md:85`), so pair descriptors with zod schemas.

## 5. How the Client gets Host config

| Mechanism | Wire | Use when |
|---|---|---|
| `index-inject` `{kind:'global'}` | `globalThis.__DSH_X__=…` in head | static per render, needed pre-mount (`__DSH_DOCUMENT_PREVIEW_CONFIG__` `DSH/dsh-client-ui-sidebar-documentpreview/lib/index.js:26-32`; `__DSH_CONNECTION_RECOVERY__` `DSH/dsh-client-connection/lib/index.js:822-828`) |
| `configForms.get(entryId)` | `settings.describe` + revisioned writes | user-editable Config field — recommended (§3.3) |
| Remote service | `/api` unary or mux stream | dynamic, server-validated, non-schema data (§4) |
| `window.__DSH_BOOT__` | graph `entries[]`/`batches[]`/`rev` | module-graph data only; **no** plugin semver (`DSH/dsh-client-modules/lib/types/client/manifest.d.ts:48-90`) |

Rows are HTML text: `global` values escape `<` as `\u003c` (`DSH/dsh-host-webserver/lib/index.js:28`); `style`/`script`
text must not contain `</style`/`</script` (`DSH/dsh-host-webserver/lib/types/injections.d.ts:20-21,41`).

## 6. Cleanup, disable, HMR, version

### 6.1 Fail-closed

- Fiber-owned resources dispose themselves: `ctx.on`, `ctx.effect`, `webServer.register` disposers, services (`DSH/cordis/lib/types/service.d.ts:28-38`, `DSH/cordis/lib/types/fiber.d.ts:35-51`, `DSH/dsh-host-webserver/lib/types/index.d.ts:84-106`). A Host `index-inject` listener disappears on disable, so the next index render omits the rows — an **already loaded page keeps them until reload**.
- Client-bundle CSS is removed with the plugin: `<style data-plugin data-plugin-css>` appended inside `ctx.effect` whose disposer removes the tag (`DSH/dsh-client-ui-theme/lib/client.js:1183-1192`, `SKIN/src/client/styles.ts:35-45`); the module system "waits for its asynchronous effects before evicting unused modules and styles" (`DSH/dsh-client-modules/README.md:42`).
- **Gap: do not copy.** `SKIN` writes `body[data-dsh-skin]`, `data-skin-chrome`, `data-dsh-titlebar` in a presenter (`SKIN/src/client/presenter.ts:52-69`) but registers only a form subscription, no reverse effect (`SKIN/src/client/index.ts:218`), so HMR/disable leaves those attributes until reload. Livery must own cleanup: `ctx.effect(() => { applyAttributes(snapshot); return () => clearLivery(document) }, 'livery: presentation')`.
- Adopting a Host-injected style element is supported: give the row `kind:'html'` to carry an `id`, then query/replace it from the client (`SKIN/src/boot-skin.ts:80-89`, `SKIN/src/client/custom-skin.ts:127,138`).
- Failure visibility: the module system records "the last import failure per row … the Web boot audit reports that text per entry" (`DSH/dsh-client-modules/README.md:38`). No documented "last console error" surface — **UNVERIFIED**.

### 6.2 Disable / HMR

Disable = the row becomes `disabled`; with HMR the patch re-applies live, without HMR a restart is required
(`DSH/dsh-hmr/README.md:27`, `DSH/dsh-plugin-manager/README.md:14`). Disabling removes the entry and waits for async effects
before evicting modules and styles; re-enabling loads one instance with its styles (`DSH/dsh-client-modules/README.md:42`). A
code rebuild remounts with fresh state (React state lost, session/connection state survives,
`DSH/dsh-client-hmr/README.md:36,48`). A failed row does not stop startup unless it is a required entry
(`DSH/dsh-app-boot/README.md:43`).

### 6.3 Version handshake

None exists in 0.2.0-rc.2. `ctx.remote.$host` exposes only `home` and `isLoopback`
(`DSH/dsh-api-gateway/lib/types/client/index.d.ts:33-38`); the boot graph carries `id/url/rev/inject/immediately/external`
where `rev` is an mtime/ctime/size artifact revision, not semver
(`DSH/dsh-client-modules/lib/types/client/manifest.d.ts:48-64`, `DSH/dsh-client-modules/README.md:74`); the runtime DSH version is Host-only
(`getDshRuntimeVersion`, `DSH/dsh-app-boot/lib/types/plugin-compatibility.d.ts:16`). A plugin needing a version handshake
must add one explicitly: a `global` row (`__DSH_LIVERY__={version,contractHash}`), a remote method returning `{version}`, or
a build-time bundle constant. Compare all three and fall back to the stock look on mismatch.

## 7. Not verified

1. **Desktop/Electron first paint.** The webserver "serves browsers only; Electron loads dist over `file://` and carries fetch over an IPC bridge" (`DSH/dsh-host-webserver/README.md:12`), and only `WebServer.collectIndexInjections` emits the event (`DSH/dsh-host-webserver/lib/index.js:352`). Whether Desktop (which does compose `@deepseek-ai/dsh-web-app`, `~/.dsh/profiles/desktop/package.json`) runs an HTTP carrier or renders the same rows through a shell-owned carrier is **UNVERIFIED** — the Electron app is not in this package tree. Check before claiming Desktop first-paint parity.
2. Bundle-level peer gating: rows are checked before import (`DSH/dsh-app-boot/README.md:52`); the bundle-skip path was not observed (local profiles use `"*"` peers).
3. `configForms` for a third-party entry id without the shipped settings composition — `whileServed`/`get` fallbacks are documented only for official pages (`DSH/dsh-client-ui-settings/README.md:38`).
4. Any user-visible "last console error" guarantee (§6.1).
