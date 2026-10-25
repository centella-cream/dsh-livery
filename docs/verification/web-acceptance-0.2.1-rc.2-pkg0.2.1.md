# Web-profile acceptance evidence — DSH Livery on DSH 0.2.1-rc.2

> **SUPERSEDED — this run used `dsh-livery-0.2.1.tgz` and FAILED because the
> client's synchronous capability probe ran before the shell declared
> `sidebar.panellist`, so it fell back to the legacy Settings page (sidebar had
> no 皮肤 row). It is kept as evidence of the timing bug and is NOT an
> acceptance result. The fixed package is `dsh-livery-0.2.2.tgz`; see the
> pkg0.2.2 acceptance reports.**

# Acceptance evidence — DSH Livery on DSH 0.2.1-rc.2 (installed-package)

Run `2026-10-25T06-14-55-347Z-isolated` · isolated DSH_HOME · **55 passed / 11 failed / 9 skipped / 1 warnings** · RESULT: FAIL

## Environment

| item | value |
|---|---|
| date | 2026-10-25T06:15:28.383Z |
| DSH | 0.2.1-rc.2 |
| Node | v22.23.1 |
| OS | darwin 25.6.0 (arm64) |
| Chrome | 155.0.8059.85 (system Chrome via playwright-core, `channel: 'chrome'`) |
| playwright-core | 1.63.0 |
| target package | dsh-livery@0.2.1 (`file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.2.1.tgz`) |
| tarball sha256 | 27c57a4486816e1d5ed5ae8d7f4a99c890e2dbe88c76b81b8da24f34f89a895c |
| browser | headless Chrome, viewport 1440×900 |

## Host identity & certification

| item | expected (certified) | observed live |
|---|---|---|
| host version | 0.2.1-rc.2 | 0.2.1-rc.2 |
| adapter id | dsh-0.2.1-rc.2-r1 | dsh-0.2.1-rc.2-r1 |
| contract hash | sha256:fc5ccff8885eccb6f947e729b10b8f0d6355a36be6ad5ebbb3a91b7577921b1d | sha256:fc5ccff8885eccb6f947e729b10b8f0d6355a36be6ad5ebbb3a91b7577921b1d |
| catalog profile | sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50 | sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50 |
| platform module table | 11 modules | — (resolved at boot) |
| package source kind | installed-package | — |
| BootPayload.profileKind | web | — |
| previews base | — | /livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/ |

Certified-adapter match: ✅ yes · catalog profile sha256:060e80efd4f5…

## Boot

```text
dsh web: http://127.0.0.1:60293/?token=<redacted>
```

- boot ready: 1.2 s; install via official profile package manager: 136 ms

## IMPLEMENTATION_PLAN.md §20 coverage (Web profile)

| §20 criterion | result | mapped checks |
|---|---|---|
| Exact certified host install + certified contract hash | ✅ all mapped checks passed | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.applied-boot`, `catalog.schema`, `catalog.livery-hashes` |
| Live host matches a certified adapter (version + adapter id + contract hash + catalog profile) | ✅ all mapped checks passed | `env.certified-host`, `handshake.certified-adapter`, `handshake.applied-boot`, `catalog.certified-identity`, `handshake.catalog-identity` |
| Platform module table / client bundle ABI resolves on this host build | ✅ all mapped checks passed | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.certified-adapter` |
| zh-CN + en-US Livery UI and previews complete (sidebar navigation entry) | ❌ failed checks present | `nav.sidebar-entry`, `nav.main-panel`, `gallery.cards`, `search.name`, `keyboard.arrow-right`, `fonts.en-latin`, `locale.en-gallery`, `preview.previewing` |
| At least 10 double-mode liveries | ✅ all mapped checks passed | `catalog.gallery-size`, `gallery.cards`, `previews.assets-served` |
| Colour + host-level font-family actually effective (not just the settings page) | ⏭ font strategy is capability-selected: role hooks (--dsh-font-family-text/-code) on 0.2.1+, legacy composite tokens on 0.2.0-rc.2 | `theme.light-tokens`, `theme.dark-tokens`, `fonts.zh-cjk`, `fonts.zh-role-hooks`, `css.token-scoping` |
| At least one safe layout capability actually effective | — HONEST GAP: the certified hosts expose no public density / transcript-width / message-flow hook. Livery degrades layout to host/stock and lists the unavailable capabilities in the self-check; no fake compensation is shipped. Wallpaper is removed from schema v1. | — |
| Follows host light/dark without changing host preference | ⏭ not fully exercised in this run | `theme.dark-tokens`, `theme.light-restored`, `theme.host-preference`, `theme.host-preference-file` |
| Startup filmstrip has no stock-style frame / no takeover flash | ⏭ not fully exercised in this run | `firstpaint.no-stock-frame`, `firstpaint.first-colour`, `handshake.body-hash-catalog` |
| 0 !important, 0 hash-class selectors, 0 whole-document observers | ✅ all mapped checks passed | `css.no-important`, `css.no-hash-selectors`, `css.no-whole-document-observers`, `selfcheck.css-safety` |
| All contrast gates pass | ✅ all mapped checks passed | `catalog.contrast-zero-failures`, `selfcheck.contrast` |
| Livery lives in the left-sidebar plugin navigation (main panel), not in Settings | ❌ sidebar.panellist row (id/panel key livery, order 30, zh 皮肤 / en Livery) + main keyed page; legacy settings.section must stay unregistered on panel-navigation hosts | `nav.sidebar-entry`, `nav.row-order`, `nav.above-workspaces`, `nav.conversation-hidden`, `nav.settings-section-absent` |
| Preview is transient; Apply is one durable mutation; restore stock works | ❌ failed checks present | `preview.cancel`, `apply.one-mutation`, `apply.persists`, `restore.stock`, `restore.persists` |
| Browser trust / Origin / CSRF fence | ✅ all mapped checks passed | `boot.token-exchange`, `trust.bad-host-api-403`, `trust.cross-origin-403`, `trust.cross-site-403` |
| Hard reload, multi-tab and service restart consistency | ✅ all mapped checks passed | `apply.persists`, `web.multi-tab`, `lifecycle.sigterm`, `lifecycle.final-stop` |
| Uninstall leaves no runtime residue after restart | ✅ all mapped checks passed | `residue.no-boot-row`, `residue.no-dom`, `residue.no-boot-payload`, `residue.catalog-route`, `residue.old-bundle-url` |
| Web layout at 1023px / 767px widths | ✅ all mapped checks passed | `web.no-overflow-1023`, `web.no-overflow-767` |
| Performance budgets (bundle gzip, active CSS bytes, first paint) | ✅ all mapped checks passed | `bundle.gzip-budget`, `css.size-budget`, `firstpaint.paint-timings` |
| Desktop / Windows / native chrome / wallpaper | — Out of scope: the Web harness has no Electron surface. Desktop/Windows certification belongs to the desktop rows of §18.9/§20. | — |

## Checks


### Environment

| check | title | result | detail |
|---|---|---|---|
| `env.certified-host` | dsh CLI host version maps to a certified adapter record | ✅ pass | 0.2.1-rc.2 / dsh-0.2.1-rc.2-r1 / sha256:fc5ccff8885e… / 11-module table / installed-package |
| `env.browser` | system Chrome launches through playwright-core (no browser download) | ✅ pass | Chrome 155.0.8059.85; playwright-core 1.63.0 at /Users/ryanzhang/Personal/openprojects/dsh-livery/node_modules/playwright-core/index.mjs |

### Lifecycle

| check | title | result | detail |
|---|---|---|---|
| `lifecycle.install` | official `dsh plugin --profile web add file:<tgz>` installs and selects the bundle | ✅ pass | dsh plugin --profile web add file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.2.1.tgz → exit 0 in 136ms; dependency=file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.2.1.tgz; bundles=["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-livery"] |
| `lifecycle.profile-initialized` | isolated profile initialized from the shipped web template | ✅ pass | home=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home; profile=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home/profiles/web; initialized=true; sha256=27c57a4486816e1d5ed5ae8d7f4a99c890e2dbe88c76b81b8da24f34f89a895c |
| `lifecycle.boot` | `dsh --profile web --no-open --port 0` boots and prints its authenticated URL | ✅ pass | ready in 1211ms on port 60293; log=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log |
| `lifecycle.boot-warnings` | boot log has no skipped-bundle or compatibility warnings | ✅ pass | no skipped/incompatible/warning lines in the boot log |
| `lifecycle.sigterm` | SIGTERM stops the web service cleanly and closes the port | ✅ pass | exit=0 signal=null shutdown=92ms portClosed=true forced=false |
| `lifecycle.uninstall` | official `dsh plugin remove` uninstalls without residue in the profile manifest | ✅ pass | exit=0 depPresent=false bundleSelected=false duration=178ms |
| `lifecycle.final-stop` | final SIGTERM stops the restarted service and closes the port | ✅ pass | exit=0 portClosed=true forced=false |

### Boot graph & handshake

| check | title | result | detail |
|---|---|---|---|
| `boot.token-exchange` | launch token is exchanged for the signed cookie and dropped from the URL | ✅ pass | final url http://127.0.0.1:60293/; navigation 154ms |
| `boot.graph-entry` | __DSH_BOOT__ lists client entry "dsh-livery" | ✅ pass | url plugins/??dsh-livery/client.js&rev=ab77f3bf117a |

### Client bundle route

| check | title | result | detail |
|---|---|---|---|
| `bundle.serves-client-js` | plugin client bundle (boot-graph URL) is served as JavaScript | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=ab77f3bf117a → 200 text/javascript; charset=utf-8 (82818 bytes) |
| `bundle.requires-rev` | plugin client bundle requires its graph rev | ✅ pass | GET graph URL without rev → 404 |
| `bundle.canonical-route` | bare /plugins/<pkg>/client.js?rev= route (doc-comment form) | ⚠️ warn | GET /plugins/dsh-livery/client.js?rev=<graph rev> → 404; this DSH build serves only the graph-encoded URL (verified deviation from the doc comment) |
| `bundle.gzip-budget` | client bundle gzip stays within the 25KB performance budget (host peers excluded) | ✅ pass | 20989 bytes gzip / 82818 bytes raw (budget 25600) |

### First-frame handshake

| check | title | result | detail |
|---|---|---|---|
| `handshake.stock-no-rows` | stock default injects no first-frame rows (fail-safe stock) | ✅ pass | __DSH_LIVERY_BOOT__ absent; skin style elements=0; body attribute=null |
| `handshake.boot-global` | first-frame handshake is asserted once a livery is configured | ⏭️ skip | initial boot is stock (no rows expected); asserted after the settings apply step |
| `handshake.echo` | first-frame handshake is asserted once a livery is configured | ⏭️ skip | initial boot is stock (no rows expected); asserted after the settings apply step |
| `handshake.catalog-url` | first-frame handshake is asserted once a livery is configured | ⏭️ skip | initial boot is stock (no rows expected); asserted after the settings apply step |

### Browser trust / auth fence

| check | title | result | detail |
|---|---|---|---|
| `trust.no-cookie-401` | browser trust: no cookie 401 | ✅ pass | GET / without cookie → 401 |
| `trust.wrong-token-rejected` | browser trust: wrong token rejected | ✅ pass | GET /?token=<wrong> → 401 |
| `trust.token-exchange-303` | browser trust: token exchange 303 | ✅ pass | GET /?token=<launch token> → 303 |
| `trust.cookie-issued` | browser trust: cookie issued | ✅ pass | Set-Cookie: Max-Age=2592000; Path=/; Expires=Tue, 24 Nov 2026 06:14:57 GMT; HttpOnly; SameSite=Strict |
| `trust.cookie-200` | browser trust: cookie 200 | ✅ pass | GET / with cookie → 200 |
| `trust.bad-host-index-refused` | browser trust: bad host index refused | ✅ pass | GET / Host: evil.example (cookie from 127.0.0.1) → 401 (refused; cookie authority mismatch) |
| `trust.bad-host-api-403` | browser trust: bad host api 403 | ✅ pass | GET /api/__dsh_acceptance_probe__ Host: evil.example → 403 |
| `trust.cross-origin-403` | browser trust: cross origin 403 | ✅ pass | GET /api/__dsh_acceptance_probe__ Origin: http://evil.example → 403 |
| `trust.cross-site-403` | browser trust: cross site 403 | ✅ pass | GET /api/__dsh_acceptance_probe__ Sec-Fetch-Site: cross-site → 403 |

### Stock baseline

| check | title | result | detail |
|---|---|---|---|
| `stock.no-body-attribute` | stock boot leaves body without data-dsh-livery | ✅ pass | data-dsh-livery=null |
| `stock.no-livery-styles` | stock boot injects no Livery skin style elements or handshake rows | ✅ pass | 0 skin style element(s); __DSH_LIVERY_BOOT__ present=false |
| `stock.tokens-recorded` | stock token baseline captured for residue comparison | ✅ pass | --dsw-alias-bg-base=#fff labelPrimary=#0f1115 borderL1=#0000000a |
| `stock.host-theme-source` | host theme source is system (preference untouched) | ✅ pass | html[data-ds-theme-source]=system body[data-ds-dark-theme]=null |
| `stock.no-theme-write` | no ui-theme row was written to the profile patch | ✅ pass | no ui-theme row in profile patch |

### Navigation (sidebar panellist + main panel)

| check | title | result | detail |
|---|---|---|---|
| `nav.sidebar-entry-present-stock` | Livery sidebar row is present on a stock start (client navigation registration) | ❌ fail | rows: 插件, 自动化任务 |
| `nav.sidebar-entry` | Livery row is registered in the left-sidebar plugin navigation (aria-label + icon + panellist slot) | ❌ fail | expected the sidebar.panellist path on a certified host, got "settings-fallback" |
| `nav.row-order` | Livery row comes after the existing plugin rows (order 30) | ❌ fail | row #undefined; existing plugin rows at [0,1]; rows: 插件, 自动化任务 |
| `nav.above-workspaces` | Livery row sits above the workspace section in the sidebar | ❌ fail | navBeforeWorkspaces=true rowTop=undefined workspacesTop=0 |
| `nav.main-panel` | selecting the row opens the Livery main-panel page in the main column | ❌ fail | row selected=undefined; main panel visible=false; selected row "null"; main children=1 |
| `nav.conversation-hidden` | the conversation is replaced while the Livery panel is selected | ❌ fail | composer visible=true; conversation root=undefined; body starts: 新会话 ⌥ ⌘ N 插件 自动化任务 工作区 默认工作区 新会话 更多 探索未至之境 预览版 默认工作区 标准模式 描述你想要构建的内容, / 调用指令, @ 文件或对话 工作区内修改 请选择模型 设置 通用设置 模型 内置插件 Agent |
| `nav.settings-section-absent` | legacy settings.section Livery entry is NOT registered on panel-navigation hosts | ❌ fail | settings launcher path=account-menu; section labels=[通用设置, 模型, 内置插件, Agent 预设, 皮肤]; livery nodes in settings dialog=0 |
| `nav.settings-open-path` | settings dialog is still usable for the absence assertion | ✅ pass | launcher path=account-menu |
| `nav.panel-still-selected` | closing the settings dialog returns to the selected Livery panel | ❌ fail | panel visible=false; selected row "null" |

### Catalog route

| check | title | result | detail |
|---|---|---|---|
| `catalog.serves-json` | Host serves GET /livery/api/catalog | ✅ pass | status 200, content-type application/json, cache-control no-store |
| `catalog.schema` | catalog shape carries the certified host identity and catalog profile | ✅ pass | schemaVersion=1 hostVersion=0.2.1-rc.2 adapterId=dsh-0.2.1-rc.2-r1 contractHash=sha256:fc5ccff8885ec… catalogProfile=sha256:060e80efd4f55… previewsBase=/livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/ |
| `catalog.certified-identity` | catalog reports a certified (hostVersion, adapterId, contractHash, catalogProfile) quadruple | ✅ pass | 0.2.1-rc.2 / dsh-0.2.1-rc.2-r1 / sha256:fc5ccff8885e… / 11-module table / installed-package |
| `catalog.cache-control-no-store` | catalog is not cached | ✅ pass | cache-control: no-store |
| `catalog.gallery-size` | catalog carries at least 10 liveries | ✅ pass | 10 liveries: fjord, plum, amber-dusk, moss, graphite, rice-paper, deep-sea, sakura, midnight, linen |
| `catalog.token-coverage` | every asserted token is either compiled into the livery or documented as inherited (missing = 0) | ✅ pass | covered 780 / inherited 660 / required 1440 / missing 0 across 10 liveries |
| `catalog.contrast-zero-failures` | compiled catalog has 0 contrast failures | ✅ pass | all liveries report contrastFailures=0 |
| `catalog.css-safety-clean` | compiled catalog has 0 !important / 0 hash selectors | ✅ pass | all liveries report cssSafety pass |
| `catalog.livery-hashes` | every compiled livery cssHash equals sha256(tokens+typography+layout) | ✅ pass | 10 livery hashes verified |
| `catalog.capabilities` | catalog capability availability matches the certified adapter contract | ✅ pass | theme-css=true, host-font-family=true, surface-material=true, host-density-tokens=false, host-transcript-width=false, host-message-flow=false, reduced-transparency=true, forced-colors=true, reduced-motion=true, host-font-role-hooks=true |
| `catalog.get-only-405` | catalog route is GET-only (POST → 405) | ✅ pass | POST /livery/api/catalog → 405 |

### Preview assets

| check | title | result | detail |
|---|---|---|---|
| `previews.assets-served` | all preview SVGs are served as image/svg+xml under the declared catalog-profile base | ✅ pass | 40 preview assets HTTP 200 image/svg+xml under /livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/ |
| `previews.unknown-404` | unknown preview asset returns 404 | ✅ pass | unknown file → 404 |
| `previews.profile-isolation` | previews are served per catalog profile; another profile directory is not exposed | ✅ pass | cross-profile asset /livery/assets/previews/sha256:4c5ee1a20f2974a53037a2ee4d2daa71f9f4600c9f004f0b35592b1ff413d602/fjord-zh-light.svg → 404 (404 expected) |
| `previews.no-404` | no 404 responses for /livery/assets/previews/* | ✅ pass | 0 404 preview response(s) |

### probe

| check | title | result | detail |
|---|---|---|---|
| `probe.nav` | probe group "nav" completes | ❌ fail | page.waitForFunction: Timeout 20000ms exceeded. at waitForGallery (/Users/ryanzhang/Personal/openprojects/dsh-livery/scripts/probe/checks.mjs:542:14) at checkLiveryPanelFlow (/Users/ryanzhang/Personal/openprojects/dsh-livery/scripts/probe/checks.mjs:697:30) at async main (/Users/ryanzhang/Personal/openprojects/dsh-livery/scripts/acceptance-web.mjs:504:9) |

### Theme tokens

| check | title | result | detail |
|---|---|---|---|
| `theme.light-tokens` | active livery light tokens match the compiled catalog | ⏭️ skip | no active livery (settings apply step failed or was skipped) |
| `theme.dark-tokens` | active livery dark tokens match the compiled catalog under emulated dark mode | ⏭️ skip | no active livery |

### Fonts / locale

| check | title | result | detail |
|---|---|---|---|
| `fonts.zh-cjk` | zh-CN page resolves the livery CJK stack | ⏭️ skip | no active livery |
| `fonts.en-latin` | en page resolves the livery latin stack | ⏭️ skip | no active livery |

### Self-check & diagnostics

| check | title | result | detail |
|---|---|---|---|
| `selfcheck.panel` | self-check panel reports capability availability | ❌ fail | Livery panel not visible |

### First paint

| check | title | result | detail |
|---|---|---|---|
| `firstpaint.no-stock-frame` | no stock-style frame is painted before the livery boot style | ⏭️ skip | no active livery |

### Web surface

| check | title | result | detail |
|---|---|---|---|
| `web.responsive` | no horizontal overflow at 1023px / 767px widths with the livery active | ⏭️ skip | no active livery |

### Stock restore

| check | title | result | detail |
|---|---|---|---|
| `restore.stock` | Restore stock appearance removes the livery and returns stock tokens | ❌ fail | Livery panel not visible |

### console

| check | title | result | detail |
|---|---|---|---|
| `console.no-livery-errors` | no console errors, page errors, failed requests or 4xx/5xx responses for Livery-owned URLs | ✅ pass | 0 console error(s), 0 page error(s), 0 failed request(s), 0 HTTP error response(s) |

### Uninstall residue

| check | title | result | detail |
|---|---|---|---|
| `residue.no-boot-row` | after uninstall the boot graph has no plugin row | ✅ pass | 69 entries, none for dsh-livery |
| `residue.no-dom` | after uninstall + restart body has no Livery attributes or style elements | ✅ pass | data-dsh-livery=null data-dsh-livery-hash=null styles=0 |
| `residue.stock-tokens` | after uninstall + restart computed tokens equal the stock baseline | ✅ pass | actual=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] stock=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] |
| `residue.no-boot-payload` | after uninstall the first-frame handshake global is absent | ✅ pass | window.__DSH_LIVERY_BOOT__=false |
| `residue.catalog-route` | after uninstall /livery/api/catalog returns 404 | ✅ pass | GET /livery/api/catalog → 404 |
| `residue.preview-route` | after uninstall /livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/fjord-zh-light.svg returns 404 | ✅ pass | GET /livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/fjord-zh-light.svg → 404 |
| `residue.plugin-route` | after uninstall /plugins/dsh-livery/client.js returns 404 | ✅ pass | GET /plugins/dsh-livery/client.js → 404 |
| `residue.old-bundle-url` | after uninstall the previously served client bundle URL returns 404 | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=ab77f3bf117a → 404 |
| `residue.profile-manifest` | uninstall removes dependency/bundle selection; any stale settings row is documented (not silently ignored) | ✅ pass | profile dependency removed; patch liveryRows=0 skinId=(none) |

## Screenshots

| file | locale | mode | state |
|---|---|---|---|
| `artifacts/acceptance/pkg-0.2.1/web-0.2.1-rc.2/screens/0.2.1-rc.2-web-chrome/zh-light-home.png` | zh | light | home |
| `artifacts/acceptance/pkg-0.2.1/web-0.2.1-rc.2/screens/0.2.1-rc.2-web-chrome/zh-light-home.png` | zh | light | home |
| `artifacts/acceptance/pkg-0.2.1/web-0.2.1-rc.2/screens/0.2.1-rc.2-web-chrome/zh-light-panel.png` | zh | light | panel |
| `artifacts/acceptance/pkg-0.2.1/web-0.2.1-rc.2/screens/0.2.1-rc.2-web-chrome/zh-light-stock-post-uninstall.png` | zh | light | stock-post-uninstall |

## Artifacts

- probe: `artifacts/acceptance/pkg-0.2.1/web-0.2.1-rc.2/probe.json`
- console/network: `artifacts/acceptance/pkg-0.2.1/web-0.2.1-rc.2/console.json`
- timings: `artifacts/acceptance/pkg-0.2.1/web-0.2.1-rc.2/timings.json`
- filmstrip frames: `artifacts/acceptance/pkg-0.2.1/web-0.2.1-rc.2/filmstrip` (0 frames)
- HTML snapshots: `artifacts/acceptance/pkg-0.2.1/web-0.2.1-rc.2/html`

## Lifecycle

| step | result |
|---|---|
| SIGTERM stop before uninstall | exit 0, port closed: true, 92 ms |
| official `dsh plugin remove` | exit 0, dependency removed: true, bundle deselected: true, 178 ms |
| fresh boot after uninstall | ready in 1.6 s, port 60695 |
| residue sweep (boot graph / DOM / routes / tokens) | see residue checks above |
| final SIGTERM | exit 0, port closed: true |

## Deviations / known limitations

- HONEST GAP — IMPLEMENTATION_PLAN.md §20 "at least one safe layout capability actually effective" cannot be met on DSH 0.2.1-rc.2: the certified adapter (installed-package) exposes no public density / transcript-width / message-flow hook (all three capability facts are unavailable). Livery degrades layout to host/stock and reports the unavailable capabilities in the self-check rather than faking them. Wallpaper is removed from schema v1.
- Disable/hot-reload state-machine transitions and unknown-version fail-closed to stock are covered by unit/contract tests; this black-box run proves install → boot → stock start → panel config apply → hard reload → restore stock → official uninstall → restart residue (web) / install-admission + app-runtime boot (desktop).
- §18.8 p95/CLS statistics need ≥30 samples per scenario; this run records per-run byte budgets and one cold-start paint trace/filmstrip, not a statistical distribution.
- DSH 0.2.1-rc.2 serves client bundles only through boot-graph grouped URLs (plugins/??<pkg>/client.js&rev=…); the bare /plugins/<pkg>/client.js?rev= form returns 404 in this build (asserted as a documented warning).
- No Playwright browser download is used: the harness drives the system Chrome through channel: 'chrome' (web carrier) or connects over CDP to the Electron renderer (desktop).
- Web profile only: Desktop / macOS / Windows native-window criteria from §18.9/§20 (Electron surface, caption, traffic lights, Dock) are out of scope for this harness.

## Evidence details

Stock baseline tokens:

```json
{
  "--dsw-alias-bg-base": "#fff",
  "--dsw-alias-label-primary": "#0f1115",
  "--dsw-alias-border-l1": "#0000000a"
}
```

Lifecycle:

```json
{
  "stopBeforeUninstall": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 92,
    "forceKilled": false,
    "port": 60293,
    "portClosed": true,
    "portClosedWaitedMs": 1,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log",
    "logTail": "dsh web: http://127.0.0.1:60293/?token=<redacted>\n"
  },
  "uninstall": {
    "phase": "uninstall",
    "command": "dsh plugin --profile web remove dsh-livery",
    "startedAt": "2026-10-25T06:15:25.383Z",
    "exitCode": 0,
    "signal": null,
    "timedOut": false,
    "durationMs": 178,
    "stdout": "Packages: -1\n-\n\ndependencies:\n- dsh-livery file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.2.1.tgz\n\nDone in 39ms using pnpm v12.3.4\n",
    "stderr": "",
    "dependencyPresent": false,
    "bundleSelected": false
  },
  "postUninstallBoot": {
    "url": "http://127.0.0.1:60695/?token=-5hJKRr6AYpVfuubOxZPTUVaGLIqXtvCCWeJAqWg2JI",
    "baseUrl": "http://127.0.0.1:60695",
    "port": 60695,
    "readyMs": 1616
  },
  "stopAfterResidue": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 87,
    "forceKilled": false,
    "port": 60695,
    "portClosed": true,
    "portClosedWaitedMs": 0,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web-post-uninstall.log",
    "logTail": "dsh web: http://127.0.0.1:60695/?token=<redacted>\n"
  }
}
```

---

_Generated by `scripts/acceptance-web.mjs`. The command is listed in `docs/verification/README.md`;
the checklist mapping to IMPLEMENTATION_PLAN.md §20 lives there too._
