# Sidebar plugin navigation — Livery UI entry (round 4, user-directed)

Status: implemented, live-verified on the user's real Web Profile, and folded into
the certified package `dsh-livery-0.2.2.tgz`. This document records the capability
research, the implementation contract, and the evidence for the entry move away from
the Settings page.

## 1. Why the entry changed

`deepseek-harness-skin` (the previous skin plugin) put skin selection inside the
Settings page. That placement costs every skin plugin an extra settings-shell
adaptation and is not where DSH's own browser plugins surface their pages. DSH's
shipped browser plugins (插件 / Plugin manager, 自动化任务 / Schedule, and plugins
such as dsh-context's 上下文洞察) put a row in the **main-page left sidebar plugin
navigation** above the Workspace section and open a full `main` panel. Livery now
uses the same integration, so the entry is visible without opening Settings.

## 2. Capability and version cutoff (researched from published packages)

| Fact | Evidence |
|---|---|
| `sidebar.panellist` (left-sidebar global-panel rows) + keyed `main` panel seat first appear in `@deepseek-ai/dsh-client-ui-sidebar@0.1.5-alpha.2` | tarball grep of every published version: absent in `0.1.3-alpha.2`, `0.1.5-alpha.1`; found in `0.1.5-alpha.2` and every later version |
| The slot's documented contract is already the current pattern ("icon component to the root-scoped `sidebar.panellist` list with an `id`, optional `order`, and a string or locale-aware `label`; the same id addresses the layout's root-scoped `main` keyed slot") | `dsh-client-ui-sidebar@0.1.5-alpha.2/README.md` |
| `ctx.layout.selectPanel` / `MainPanelId` exist in `dsh-client-ui-layout@0.1.5-alpha.2` | layout tarball |
| First shipped consumer: Plugin manager `@deepseek-ai/dsh-client-ui-plugin-manager` starts at `0.1.6-alpha.2`, using exactly this pattern (order 0); schedule uses order 10; dsh-context registers order 20 | installed clients + npm metadata |

**Conclusion:** the capability exists since **DSH `0.1.5-alpha.2`** (first release
line `0.1.5-rc.1`). Livery therefore does not gate the entry on a host version: it
always installs the panel-navigation registration through `ctx.slots.inject` (which
fires whenever the declaration appears, regardless of plugin activation order), and
registers the legacy `settings.section` page only after a 1500 ms grace period when
the host never declares the panellist slot (pre-0.1.5-alpha.2 hosts). A late
declaration retires the fallback, so exactly one entry exists. This keeps the code
forward/backward compatible with the capability's whole lifetime without pinning to
the newest API.

Note: certification scope is unchanged — the shipped package still declares and
verifies the three exact host builds (`0.2.0-rc.2`, `0.2.1-rc.2`, `0.2.1-rc.3`),
because the contract-freeze policy requires a frozen six-hash contract and real
acceptance evidence per supported build. Older 0.1.x builds have the navigation
capability but are not certified install targets; the fallback path keeps the
integration honest if that matrix is expanded later.

## 3. Implementation contract

- `main` keyed slot: `{ name: 'main', key: PANEL_ID }` where
  `PANEL_ID = 'livery' as MainPanelId` (`@deepseek-ai/dsh-client-ui-layout/client`).
- `sidebar.panellist` list row: `{ name: 'sidebar.panellist', id: PANEL_ID,
  order: 30, locale: 'dsh-livery', label: () => t('panel.label') }` — after plugins
  (0), schedule (10) and dsh-context (20); label 皮肤 / Livery; inline SVG icon
  receiving `{size, active}`.
- Registration is inject-first (`ctx.slots.inject('main'|'sidebar.panellist', …)`)
  and exception-safe: a registration failure rolls back partial effects and installs
  the Settings fallback; the plugin never throws from activation.
- Fallback: `settings.section` (`id: 'livery'`, order 25) only if no panellist
  declaration arrives within 1500 ms; disposed when a late declaration arrives.
- Page DOM: `div[data-slot="main"] > div[data-testid="livery-panel"][data-plugin-panel="true"]`
  (h1 皮肤/Livery, description, scrollable body) → `div[data-testid="livery-section"]`
  with the unchanged gallery/search/preview/apply/self-check testids. The Settings
  dialog on certified hosts contains no Livery section.
- i18n keys added: `panel.label`, `panel.title`, `panel.description` (zh/en).
- CSS budget kept: CLIENT_CSS 8,156 / 8,192 B; client bundle 20,927 B gzip
  (25,600 B budget).

## 4. Live verification on the user's real Web Profile

Environment: real `~/.dsh/profiles/web` (DSH `0.2.1-rc.2`, installed plugins
dsh-charter `0.1.0-rc.2`, dsh-context `0.73.0`, dsh-vscode-bridge), official
`dsh plugin --profile web add file:dsh-livery-0.2.2.tgz`, then the real web server
booted and driven with Playwright (system Chrome, 1440×900, zh-CN).

Result: **11/11 checks pass** — sidebar rows `["插件","自动化任务","上下文洞察","皮肤"]`,
皮肤 row after 上下文洞察 and before 工作区 (DOM order verified), row click selects
the main panel (`aria-current=page`, conversation composer hidden), page h1 皮肤,
10 gallery cards, preview + cancel, self-check shows `0.2.1-rc.2` /
`dsh-0.2.1-rc.2-r1`, no console errors; Settings contains no active 皮肤 section.

Evidence: `artifacts/acceptance/real-web-profile/` — `probe.json`,
`real-web-sidebar.png`, `real-web-panel.png`, `real-web-preview.png`,
`real-web-selfcheck.png`.

Two defects were found and fixed during this live run (the reason the shipped
version is 0.2.2, not 0.2.0):

1. 0.2.1: the synchronous capability probe extracted the `slots.spec` service method
   and lost its `this` receiver → activation threw on 0.2.1 hosts.
2. 0.2.2: the synchronous probe also ran before the shell declared
   `sidebar.panellist` on the user's loaded profile (plugin activation order is not
   fixed), which selected the Settings fallback instead of the sidebar row. Fixed
   with inject-first registration + grace-timer fallback (see §3).

## 5. Certified-matrix acceptance (package 0.2.2)

Filled by the verifier run against `dsh-livery-0.2.2.tgz`
sha256 `74725a779f0fd8d88b11fac2688a3fb587185e19840ac8398aef3830861f9c17`.

| Target | Result | Evidence |
|---|---|---|
| Web 0.2.1-rc.2 isolated full | **PASS 127 / 0 / 3 / 1** | `artifacts/acceptance/pkg-0.2.2/web-0.2.1-rc.2/` · `docs/verification/web-acceptance-0.2.1-rc.2-pkg0.2.2.md` |
| Web real-profile clone | **PASS 128 / 0 / 3 / 2** | `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/` · `…-real-profile-clone-pkg0.2.2.md` |
| Desktop 0.2.1-rc.3 packaged web carrier | **PASS 127 / 0 / 3 / 1** | `artifacts/acceptance/pkg-0.2.2/web-carrier-0.2.1-rc.3/` · `…-rc.3-runtime-carrier-pkg0.2.2.md` |
| Desktop 0.2.1-rc.3 real Electron renderer | **PASS 22 / 0 / 1** (native chrome unverified) | `artifacts/acceptance/pkg-0.2.2/desktop-0.2.1-rc.3/` · `desktop-acceptance-0.2.1-rc.3-pkg0.2.2.md` |

Sidebar-nav assertions passed on every target: row present already on stock start
(`aria-label 皮肤`, `data-slot="sidebar.panellist"`, inline svg), placement above
工作区 (row #2 on isolated/carrier/desktop, #3 after 插件/自动化任务/上下文洞察 on
the clone), selection switches the main panel (`aria-current=page`,
`[data-testid="livery-panel"]`, conversation hidden), legacy Settings has 0 Livery
nodes, the panel survives closing Settings and hard reload (via `sidebar-panellist`),
en locale shows `Livery` + English page, and the Electron renderer shows the row and
panel swap. Harness-only fixes during the round: clone lock `file:` re-anchoring,
onboarding-overlay/locale-settle retry for self-check, panel-aware waits; superseded
0.2.0/0.2.1 attempts are annotated and retained.

## 6. How to use it

1. Install the package into a profile: `dsh plugin --profile web add dsh-livery-0.2.2.tgz`
   (Desktop: install through the app's plugin manager).
2. Open DSH. The Livery entry is in the **left sidebar, above 工作区**, in the same
   group as 插件 / 自动化任务 / 上下文观察 (zh: 皮肤, en: Livery).
3. Click it: the full-page gallery opens (search, tags, 10 liveries, preview, apply,
   restore stock, self-check). Settings → 皮肤 no longer exists on these hosts.
