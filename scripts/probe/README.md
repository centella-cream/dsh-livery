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
| `browser.mjs` | Playwright session/recorders, first-paint rAF recorder, **sidebar panellist + main-panel navigation** (`openLiveryDetailed`/`openLivery`/`inspectPanellist`/`readMainColumnState`), **host-level style probe** (`readHostStyleProbe`: radius/shadow/backdrop/font computed styles + style-token family values), legacy settings-dialog fallback helpers, gallery/search/control helpers, CDP filmstrip, computed-theme/CSS snapshots, clipboard probe |
| `labels.mjs` | frozen zh/en settings copy + tag labels used for accessible-name queries and search assertions |
| `labels-runtime.mjs` | `--labels <file|json>` override loading |
| `checks.mjs` | the assertions themselves (handshake, catalog, stock baseline, settings UI flow, tokens/dark mode, fonts/locale, self-check, first paint, restore, uninstall residue) |
| `report.mjs` | assembles `probe.json` / `console.json` / `timings.json` and renders the Markdown report under `docs/verification/` |

## Round-5 style system (24 visual styles, 视觉风格 / Visual Style)

- Entry/page/search/gallery copy is asserted in the current labels table
  (`视觉风格` / `Visual Style`, `搜索视觉风格` / `Search visual styles`,
  `视觉风格画廊` / `Visual style gallery`); data-testids are unchanged.
- Counts are derived from the served catalog: 24 liveries/profile
  (`catalog.gallery-size`), 24 gallery cards, 96 preview SVGs/profile, per-livery
  CSS ≤12 KiB, and style vocabulary (surface recipes, font stacks, shape/
  elevation/material/border families).
- `checkStyleContrast` applies graphite/catppuccin/rice-paper/tokyo-night through
  the real Apply button (or transient preview in read-only `--reuse` mode) and
  measures the live host: composer-shell border-radius, body font stack,
  shadow values, glass backdrop token and cascade-resolved style tokens. In a
  real-profile clone the existing `- id: livery` row is updated in place, which
  `apply.one-mutation` accepts as the same single mutation.

## Fast nav smoke

`node scripts/acceptance-web.mjs --tgz <tgz> --quick` installs, boots, checks
the catalog and then exercises the sidebar-panel navigation + gallery/preview/
apply flow only (~40 s). Use it to validate a new client build's navigation
registration before paying for the full acceptance run (fonts, first paint,
dark mode, responsive, restore stock, uninstall lifecycle).

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
- A fresh isolated home shows first-run overlays (welcome notice / API-key
  onboarding); the harness dismisses them through Escape/label matching.
- **Livery navigation (round 4):** the Livery entry is a left-sidebar
  `sidebar.panellist` row (`id`/panel key `livery`, order 30, zh 皮肤 / en
  Livery) addressing a `main` keyed page. The old `settings.section` page is a
  fallback for hosts without panel navigation and must stay unregistered on
  certified hosts; the harness asserts both states. Shell selectors:
  `[data-slot="sidebar"] nav[aria-label="全局面板"] button[aria-label="皮肤"]`
  (selected row carries `aria-current="page"`), main column `[data-slot="main"]`,
  workspace section `[data-slot="sidebar.workspaces"]`.
