# `scripts/probe/` — acceptance-harness building blocks

These modules are the implementation of the black-box Web-profile acceptance
harness (`scripts/acceptance-web.mjs`). They are plain ESM with **no runtime
dependencies** beyond Node 22 builtins and a locally installed
`playwright-core`; no Playwright browser download is ever needed because the
harness drives the system Chrome through `channel: 'chrome'`.

| module | responsibility |
|---|---|
| `util.mjs` | paths, isolated-home guards, JSON/evidence writers, colour/font normalisation, PNG pixel stats (evidence for first-paint), TCP port checks, `CheckRunner`, CLI parser |
| `playwright.mjs` | resolves `playwright-core` (checkout `node_modules` → `--pw-core`/`PW_CORE` → npx cache) and launches system Chrome |
| `dsh-home.mjs` | isolated `DSH_HOME` preparation, official `dsh plugin --profile web add/remove` calls, profile patch/patch-locale edits, plugin-manager log capture |
| `boot.mjs` | spawns `dsh --profile web --no-open --port 0`, parses the printed `dsh web: http://127.0.0.1:<port>/?token=<hex>` line, waits for readiness, stops with SIGTERM and proves the port closed |
| `http.mjs` | raw HTTP probes: token→303→cookie, 401/403 browser-trust fence on `/api`, client-bundle route, catalog/preview routes |
| `browser.mjs` | Playwright session/recorders, first-paint rAF recorder, settings-dialog navigation, gallery/search/control helpers, CDP filmstrip, computed-theme/CSS snapshots, clipboard probe |
| `labels.mjs` | frozen zh/en settings copy + tag labels used for accessible-name queries and search assertions |
| `labels-runtime.mjs` | `--labels <file|json>` override loading |
| `checks.mjs` | the assertions themselves (handshake, catalog, stock baseline, settings UI flow, tokens/dark mode, fonts/locale, self-check, first paint, restore, uninstall residue) |
| `report.mjs` | assembles `probe.json` / `console.json` / `timings.json` and renders the Markdown report under `docs/verification/` |

## Useful environment facts (verified on this machine, DSH 0.2.0-rc.2)

- `dsh plugin --profile web add file:<abs tgz>` initializes a missing profile
  from the shipped web template (`@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app`);
  the pnpm store is project-local (`.pnpm-store/v11`), so no `~/.dsh` or
  `~/Library/pnpm` writes happen from the harness.
- The readiness line is printed once the loader tree settles:
  `dsh web: http://127.0.0.1:<port>/?token=<hex>`. The token can be exchanged
  more than once (verified), but the harness still navigates the browser to it
  exactly once and reuses the context cookie.
- Boot-graph rows use the grouped URL form
  `plugins/??<pkg>/client.js&rev=<rev>`; that exact URL is the authoritative
  client-bundle route. The bare `/plugins/<pkg>/client.js?rev=` form returns
  404 in this build (recorded as a documented deviation).
- The Host/Origin fence is enforced on `/api` traffic (`Host`/`Origin`/
  `Sec-Fetch-Site` violations → 403). The document itself is protected by the
  authority-bound signed cookie: a forged `Host` gets 401 (unknown authority)
  instead of reaching authenticated content.
- The profile patch (`profiles/web/cordis.patch.yml`) hot-reloads: flipping the
  pinned `locale` preference between `zh` and `en` needs a page reload but no
  process restart.
- A fresh isolated home shows two first-run overlays (预览版说明 → 继续, API-key
  onboarding → 稍后配置); the harness dismisses them and also suppresses the
  welcome notice through the profile patch to keep settings automation stable.
