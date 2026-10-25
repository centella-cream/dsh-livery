# Acceptance evidence — DSH Livery on DSH 0.2.1-rc.2 (installed-package)

Run `2026-10-25T06-27-56-187Z-isolated` · isolated DSH_HOME · **128 passed / 0 failed / 3 skipped / 2 warnings** · RESULT: PASS

## Environment

| item | value |
|---|---|
| date | 2026-10-25T06:28:33.078Z |
| DSH | 0.2.1-rc.2 |
| Node | v22.23.1 |
| OS | darwin 25.6.0 (arm64) |
| Chrome | 155.0.8059.85 (system Chrome via playwright-core, `channel: 'chrome'`) |
| playwright-core | 1.63.0 |
| target package | dsh-livery@0.2.2 (`file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.2.2.tgz`) |
| tarball sha256 | 74725a779f0fd8d88b11fac2688a3fb587185e19840ac8398aef3830861f9c17 |
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
| BootPayload.profileKind | web | web |
| previews base | — | /livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/ |

Certified-adapter match: ✅ yes · catalog profile sha256:060e80efd4f5…

Profile source: byte-clone of `/Users/ryanzhang/.dsh/profiles/web` (isolated copy; source read-only).

## Boot

```text
dsh web: http://127.0.0.1:63880/?token=<redacted>
```

- boot ready: 1.3 s; install via official profile package manager: 3.8 s

## IMPLEMENTATION_PLAN.md §20 coverage (Web profile)

| §20 criterion | result | mapped checks |
|---|---|---|
| Exact certified host install + certified contract hash | ✅ all mapped checks passed | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.applied-boot`, `catalog.schema`, `catalog.livery-hashes` |
| Live host matches a certified adapter (version + adapter id + contract hash + catalog profile) | ✅ all mapped checks passed | `env.certified-host`, `handshake.certified-adapter`, `handshake.applied-boot`, `catalog.certified-identity`, `handshake.catalog-identity` |
| Platform module table / client bundle ABI resolves on this host build | ✅ all mapped checks passed | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.certified-adapter` |
| zh-CN + en-US Livery UI and previews complete (sidebar navigation entry) | ✅ all mapped checks passed | `nav.sidebar-entry`, `nav.main-panel`, `gallery.cards`, `search.name`, `keyboard.arrow-right`, `fonts.en-latin`, `locale.en-gallery`, `preview.previewing` |
| At least 10 double-mode liveries | ✅ all mapped checks passed | `catalog.gallery-size`, `gallery.cards`, `previews.assets-served` |
| Colour + host-level font-family actually effective (not just the settings page) | ✅ font strategy is capability-selected: role hooks (--dsh-font-family-text/-code) on 0.2.1+, legacy composite tokens on 0.2.0-rc.2 | `theme.light-tokens`, `theme.dark-tokens`, `fonts.zh-cjk`, `fonts.zh-role-hooks`, `css.token-scoping` |
| At least one safe layout capability actually effective | — HONEST GAP: the certified hosts expose no public density / transcript-width / message-flow hook. Livery degrades layout to host/stock and lists the unavailable capabilities in the self-check; no fake compensation is shipped. Wallpaper is removed from schema v1. | — |
| Follows host light/dark without changing host preference | ✅ all mapped checks passed | `theme.dark-tokens`, `theme.light-restored`, `theme.host-preference`, `theme.host-preference-file` |
| Startup filmstrip has no stock-style frame / no takeover flash | ✅ all mapped checks passed | `firstpaint.no-stock-frame`, `firstpaint.first-colour`, `handshake.body-hash-catalog` |
| 0 !important, 0 hash-class selectors, 0 whole-document observers | ✅ all mapped checks passed | `css.no-important`, `css.no-hash-selectors`, `css.no-whole-document-observers`, `selfcheck.css-safety` |
| All contrast gates pass | ✅ all mapped checks passed | `catalog.contrast-zero-failures`, `selfcheck.contrast` |
| Livery lives in the left-sidebar plugin navigation (main panel), not in Settings | ✅ sidebar.panellist row (id/panel key livery, order 30, zh 皮肤 / en Livery) + main keyed page; legacy settings.section must stay unregistered on panel-navigation hosts | `nav.sidebar-entry`, `nav.row-order`, `nav.above-workspaces`, `nav.conversation-hidden`, `nav.settings-section-absent` |
| Preview is transient; Apply is one durable mutation; restore stock works | ✅ all mapped checks passed | `preview.cancel`, `apply.one-mutation`, `apply.persists`, `restore.stock`, `restore.persists` |
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
| `lifecycle.profile-cloned` | existing profile byte-cloned into the isolated home (source read-only) | ✅ pass | /Users/ryanzhang/.dsh/profiles/web → /Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home/profiles/web (667 ms); deps=dsh-charter, dsh-context, dsh-livery; bundles=@deepseek-ai/dsh-base, @deepseek-ai/dsh-web-app, dsh-context, dsh-charter, dsh-livery |
| `lifecycle.clone-repaired` | cloned profile manifest needs no local dependency repair | ✅ pass | all local file:/link: specs resolve |
| `lifecycle.install` | official `dsh plugin --profile web add file:<tgz>` installs and selects the bundle | ✅ pass | dsh plugin --profile web add file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.2.2.tgz → exit 0 in 3822ms; dependency=file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.2.2.tgz; bundles=["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-context","dsh-charter","dsh-livery"] |
| `lifecycle.install-on-clone` | official install path works against the cloned profile | ✅ pass | profile=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home/profiles/web; initialized=false; sha256=74725a779f0fd8d88b11fac2688a3fb587185e19840ac8398aef3830861f9c17 |
| `lifecycle.boot` | `dsh --profile web --no-open --port 0` boots and prints its authenticated URL | ✅ pass | ready in 1322ms on port 63880; log=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log |
| `lifecycle.boot-warnings` | boot log has no skipped-bundle or compatibility warnings | ⚠️ warn | [stderr] dsh: warning: 1 entry did not activate |
| `lifecycle.sigterm` | SIGTERM stops the web service cleanly and closes the port | ✅ pass | exit=0 signal=null shutdown=106ms portClosed=true forced=false |
| `lifecycle.uninstall` | official `dsh plugin remove` uninstalls without residue in the profile manifest | ✅ pass | exit=0 depPresent=false bundleSelected=false duration=1539ms |
| `lifecycle.final-stop` | final SIGTERM stops the restarted service and closes the port | ✅ pass | exit=0 portClosed=true forced=false |

### Boot graph & handshake

| check | title | result | detail |
|---|---|---|---|
| `boot.token-exchange` | launch token is exchanged for the signed cookie and dropped from the URL | ✅ pass | final url http://127.0.0.1:63880/; navigation 129ms |
| `boot.graph-entry` | __DSH_BOOT__ lists client entry "dsh-livery" | ✅ pass | url plugins/??dsh-livery/client.js&rev=32cd0492bce3 |

### Client bundle route

| check | title | result | detail |
|---|---|---|---|
| `bundle.serves-client-js` | plugin client bundle (boot-graph URL) is served as JavaScript | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=32cd0492bce3 → 200 text/javascript; charset=utf-8 (82906 bytes) |
| `bundle.requires-rev` | plugin client bundle requires its graph rev | ✅ pass | GET graph URL without rev → 404 |
| `bundle.canonical-route` | bare /plugins/<pkg>/client.js?rev= route (doc-comment form) | ⚠️ warn | GET /plugins/dsh-livery/client.js?rev=<graph rev> → 404; this DSH build serves only the graph-encoded URL (verified deviation from the doc comment) |
| `bundle.gzip-budget` | client bundle gzip stays within the 25KB performance budget (host peers excluded) | ✅ pass | 21033 bytes gzip / 82906 bytes raw (budget 25600) |

### First-frame handshake

| check | title | result | detail |
|---|---|---|---|
| `handshake.stock-no-rows` | stock default injects no first-frame rows (fail-safe stock) | ✅ pass | __DSH_LIVERY_BOOT__ absent; skin style elements=0; body attribute=null |
| `handshake.boot-global` | first-frame handshake is asserted once a livery is configured | ⏭️ skip | initial boot is stock (no rows expected); asserted after the settings apply step |
| `handshake.echo` | first-frame handshake is asserted once a livery is configured | ⏭️ skip | initial boot is stock (no rows expected); asserted after the settings apply step |
| `handshake.catalog-url` | first-frame handshake is asserted once a livery is configured | ⏭️ skip | initial boot is stock (no rows expected); asserted after the settings apply step |
| `handshake.applied-boot` | configured skin boot handshake is accepted with a certified host identity | ✅ pass | post-apply reload: accepted=true hostVersion=0.2.1-rc.2 adapterId=dsh-0.2.1-rc.2-r1 contractHash=sha256:fc5ccff8885ec… catalogProfile=sha256:060e80efd4f55… profileKind=web skinId=fjord cssHash=sha256:7f8a3ef9fab68c859… |
| `handshake.certified-adapter` | live host matches a certified adapter record (exact version + adapter + contract + catalog profile) | ✅ pass | 0.2.1-rc.2 / dsh-0.2.1-rc.2-r1 / sha256:fc5ccff8885e… / 11-module table / installed-package |
| `handshake.applied-skin` | configured skin is echoed by the boot handshake | ✅ pass | handshake.skinId=fjord (expected fjord) |
| `handshake.catalog-identity` | served catalog repeats the exact certified identity of the boot handshake | ✅ pass | 0.2.1-rc.2 / dsh-0.2.1-rc.2-r1 / sha256:fc5ccff8885ec… / sha256:060e80efd4f55… |
| `handshake.body-hash-catalog` | body[data-dsh-livery-hash] equals the compiled cssHash from the served catalog | ✅ pass | body hash=sha256:7f8a3ef9fab68c85980c31e catalog livery.cssHash=sha256:7f8a3ef9fab68c85980c31e |
| `handshake.hash-equality` | body[data-dsh-livery-hash] equals __DSH_LIVERY_BOOT__.cssHash | ✅ pass | body hash=sha256:7f8a3ef9fab68c85980c31e handshake cssHash=sha256:7f8a3ef9fab68c85980c31e |
| `handshake.hash-style-text` | style element text hashes to the advertised css hash | ✅ pass | sha256(style text)=7f8a3ef9fab68c85… body=sha256:7f8a3ef9fab68c859 handshake=sha256:7f8a3ef9fab68c859 |
| `handshake.boot-style-adopted` | boot style element is adopted with no duplicate Livery style ids | ✅ pass | ids=["dsh-livery-tokens"] tokensStyles=1 !important=0 classSelectors=0 |

### Browser trust / auth fence

| check | title | result | detail |
|---|---|---|---|
| `trust.no-cookie-401` | browser trust: no cookie 401 | ✅ pass | GET / without cookie → 401 |
| `trust.wrong-token-rejected` | browser trust: wrong token rejected | ✅ pass | GET /?token=<wrong> → 401 |
| `trust.token-exchange-303` | browser trust: token exchange 303 | ✅ pass | GET /?token=<launch token> → 303 |
| `trust.cookie-issued` | browser trust: cookie issued | ✅ pass | Set-Cookie: Max-Age=2592000; Path=/; Expires=Tue, 24 Nov 2026 06:28:02 GMT; HttpOnly; SameSite=Strict |
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
| `nav.sidebar-entry-present-stock` | Livery sidebar row is present on a stock start (client navigation registration) | ✅ pass | row #3 label "皮肤" panellistSlot=true icon=true selected=false |
| `nav.sidebar-entry` | Livery row is registered in the left-sidebar plugin navigation (aria-label + icon + panellist slot) | ✅ pass | row #3 aria-label "皮肤" icon=true panellistSlot=true (page locale zh) |
| `nav.row-order` | Livery row comes after the existing plugin rows (order 30) | ✅ pass | row #3; existing plugin rows at [0,1]; rows: 插件, 自动化任务, 上下文洞察, 皮肤 |
| `nav.above-workspaces` | Livery row sits above the workspace section in the sidebar | ✅ pass | navBeforeWorkspaces=true rowTop=240 workspacesTop=0 workspacesHeight=0 |
| `nav.main-panel` | selecting the row opens the Livery main-panel page in the main column | ✅ pass | row selected=true; main panel visible=true; selected row "皮肤"; main children=1 |
| `nav.conversation-hidden` | the conversation is replaced while the Livery panel is selected | ✅ pass | composer visible=false; conversation copy visible=false; body starts: 新会话 ⌥ ⌘ N 插件 自动化任务 上下文洞察 皮肤 工作区 默认工作区 新会话 更多 皮肤 为整个会话挑选颜色、字体与安全布局。 当前皮肤 默认外观 DSH 自带外观，未应用任何皮肤。 ID stock 浅色与深色 按标签筛选 全部 安 |
| `nav.settings-section-absent` | legacy settings.section Livery entry is NOT registered on panel-navigation hosts | ✅ pass | settings launcher path=account-menu; section labels=[通用设置, 模型, 内置插件, Agent 预设]; livery nodes in settings dialog=0 |
| `nav.settings-open-path` | settings dialog is still usable for the absence assertion | ✅ pass | launcher path=account-menu |
| `nav.panel-still-selected` | closing the settings dialog returns to the selected Livery panel | ✅ pass | panel visible=true; selected row "皮肤" |
| `nav.panel-after-reload` | after a hard reload the Livery panel opens again from the sidebar row and shows the persisted skin | ✅ pass | via=sidebar-panellist; panel visible=true; selected "皮肤" |

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

### Gallery

| check | title | result | detail |
|---|---|---|---|
| `gallery.cards` | gallery renders one card per catalog livery (≥10) | ✅ pass | 10 livery card(s) (catalog 10); stock card=false (optional; stock appearance is reachable through the restore action); ids: fjord, plum, amber-dusk, moss, graphite, rice-paper, deep-sea, sakura, midnight, linen |
| `gallery.thumbnails` | every livery card shows a loaded preview thumbnail | ✅ pass | 10/10 thumbs, broken: none |
| `gallery.no-error-state` | gallery is not in an error/catalog-unavailable state | ✅ pass | 0 livery-error node(s) |

### Search

| check | title | result | detail |
|---|---|---|---|
| `search.name` | search: localized name filters to its card | ✅ pass | query "峡湾" → 1 card(s): fjord |
| `search.id` | search: livery id filters to its card | ✅ pass | query "fjord" → 1 card(s): fjord |
| `search.tag` | search: localized tag label filters the gallery | ✅ pass | query "安静" → 3 card(s): fjord, moss, linen |
| `search.empty-state` | search-empty state renders for an unknown query | ✅ pass | 0 card(s) remain; panel text: 皮肤 为整个会话挑选颜色、字体与安全布局。 当前皮肤 默认外观 DSH 自带外观，未应用任何皮肤。 ID stock 浅色与深色 清空搜索 按标签筛选 全部 安静 冷调 雅致 低饱和 暖调 高对比 中性 古典 深邃 活泼 可用皮肤 0 套皮肤 没有匹配的皮肤 换一个名称、ID 或标签试试。 清除筛选 使用方向键在皮肤之间移动，按回车预览。 恢复默认外观 自检 展开自检 DSH Livery 0.2.2契约 fc5ccff8885e适配器 |

### Keyboard navigation

| check | title | result | detail |
|---|---|---|---|
| `keyboard.arrow-right` | ArrowRight moves roving focus to the next card | ✅ pass | focus moved to "plum" (expected "plum") |
| `keyboard.home` | Home moves roving focus to the first card | ✅ pass | focus is "fjord" |
| `keyboard.end` | End moves roving focus to the last card | ✅ pass | focus is "linen" (expected "linen") |

### Preview

| check | title | result | detail |
|---|---|---|---|
| `preview.previewing` | previewing a different skin sets the preview attribute and tokens | ✅ pass | body attr=plum tokens={"--dsw-alias-bg-base":"#f7f2f5","--dsw-alias-label-primary":"#2a1c24","--dsw-alias-border-l1":"#0000000a"} expected=["rgb(247, 242, 245)","rgb(42, 28, 36)","rgba(0, 0, 0, 0.04)"] |
| `preview.style-element` | preview uses a transient Livery style element | ✅ pass | 0 → 1 livery style element(s) |
| `preview.card-state` | the previewed card reports the previewing state | ✅ pass | data-state=preview |
| `preview.cancel` | Cancel restores the confirmed skin and token values | ✅ pass | body attr plum → null; tokens {"--dsw-alias-bg-base":"#fff","--dsw-alias-label-primary":"#0f1115","--dsw-alias-border-l1":"#0000000a"} vs ["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] |
| `preview.cancel-style` | Cancel removes the transient preview style element | ✅ pass | 1 → 0 livery style element(s) |

### Apply & persistence

| check | title | result | detail |
|---|---|---|---|
| `apply.commits` | Apply commits the previewed skin as the active livery | ✅ pass | body attr=fjord (expected fjord) |
| `apply.card-state` | the applied card reports the current state | ✅ pass | data-state=active |
| `apply.previewbar-cleared` | the transient preview bar is gone after Apply | ✅ pass | 0 preview bar(s) remain |
| `apply.one-mutation` | Apply writes exactly one livery config mutation to the profile patch | ✅ pass | before skinId=(none) (0 row(s)) → after skinId=fjord (1 row(s), added 1); row: - id: livery name: dsh-livery config: skinId: fjord # dsh-vscode-bridge: end; no ui-theme row written |
| `apply.persists` | applied skin survives a hard reload (boot injection + client ready) | ✅ pass | body attr=fjord handshake.skinId=fjord cssHash=sha256:7f8a3ef9fab68… |

### Livery panel page

| check | title | result | detail |
|---|---|---|---|
| `panel.no-degraded-notice` | optional-only capability fallbacks do not surface as a degraded notice on the Livery page (runtime stays ready) | ✅ pass | 0 livery-degraded notice(s) with all required capabilities available |
| `panel.no-offline-notice` | the Livery page is not in catalog-unavailable state | ✅ pass | 0 livery-offline notice(s) |

### Theme tokens

| check | title | result | detail |
|---|---|---|---|
| `theme.light-tokens` | active livery light tokens match the compiled catalog | ✅ pass | attr=fjord tokens={"--dsw-alias-bg-base":"#f0f3f6","--dsw-alias-label-primary":"#1b2733","--dsw-alias-border-l1":"#0000000a"} expected=["rgb(240, 243, 246)","rgb(27, 39, 51)","rgba(0, 0, 0, 0.04)"] darkAttr=null |
| `theme.tokens-change-with-skin` | applying a livery changes the computed host tokens versus the stock baseline | ✅ pass | livery light tokens ["rgb(240, 243, 246)","rgb(27, 39, 51)","rgba(0, 0, 0, 0.04)"] vs stock ["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] |
| `theme.host-preference` | host theme source stays system and no ui-theme row is written | ✅ pass | html[data-ds-theme-source]=system |
| `theme.host-preference-file` | profile patch contains no ui-theme writes | ✅ pass | no ui-theme row |
| `theme.dark-tokens` | emulated dark mode swaps to the livery dark tokens (host preference untouched) | ✅ pass | attr=fjord darkAttr= themeSource=system tokens={"--dsw-alias-bg-base":"#181c21","--dsw-alias-label-primary":"#eef2f6","--dsw-alias-border-l1":"#ffffff0f"} expected=["rgb(24, 28, 33)","rgb(238, 242, 246)","rgba(255, 255, 255, 0.06)"] |
| `theme.light-restored` | returning to light restores exactly the light token branch | ✅ pass | tokens={"--dsw-alias-bg-base":"#f0f3f6","--dsw-alias-label-primary":"#1b2733","--dsw-alias-border-l1":"#0000000a"} |
| `theme.forced-colors` | forced-colors emulation is active and the livery stays consistent (system colours take over) | ✅ pass | forced-colors=true attr=fjord body bg=rgb(255, 255, 255) color=rgb(0, 0, 0) |

### CSS safety

| check | title | result | detail |
|---|---|---|---|
| `css.token-scoping` | token declarations are scoped to body[data-dsh-livery]; font bindings to :root:lang() | ✅ pass | 0 token declaration(s), 0 unscoped token, 0 unscoped font binding |
| `css.no-important` | Livery CSS contains 0 !important | ✅ pass | 0 occurrence(s) |
| `css.no-hash-selectors` | Livery CSS contains no hash/class-name selectors | ✅ pass | class selector rules: none |
| `css.size-budget` | rendered livery stylesheet stays within the 12KB hard budget (4–8KB target) | ✅ pass | 8077 bytes rendered CSS (target 4–8KB, hard cap 12KB) |
| `css.no-whole-document-observers` | the livery adds no document-wide MutationObserver (shell baseline excluded; Livery-owned attribution = 0) | ✅ pass | Livery-attributed whole-document observers: 0; whole-document observers stock=2 → livery-active=2 (shell itself observes documentElement; delta must not grow) |

### Web surface

| check | title | result | detail |
|---|---|---|---|
| `web.multi-tab` | a second tab loads the same committed livery | ✅ pass | tab2 attr=fjord tokens={"--dsw-alias-bg-base":"#f0f3f6","--dsw-alias-label-primary":"#1b2733","--dsw-alias-border-l1":"#0000000a"} |
| `web.no-overflow-1023` | no horizontal overflow at 1023px width with the livery active | ✅ pass | scrollWidth=1023 clientWidth=1023 overflowX=0 attr=fjord |
| `web.no-overflow-767` | no horizontal overflow at 767px width with the livery active | ✅ pass | scrollWidth=767 clientWidth=767 overflowX=0 attr=fjord |

### Fonts / locale

| check | title | result | detail |
|---|---|---|---|
| `fonts.zh-cjk` | zh-CN page resolves the livery CJK stack (role-hooks) | ✅ pass | strategy=role-hooks html lang=zh-CN; --dsh-font-family-text="PingFang SC","Microsoft YaHei UI","Noto Sans CJK SC","Source Han Sans SC",system-ui,sans-serif; expected="PingFang SC", "Microsoft YaHei UI", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif; body font="PingFang SC", "Microsoft YaHei UI", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif |
| `fonts.zh-role-hooks` | host font role hooks carry the livery UI and code stacks (0.2.1+) | ✅ pass | --dsh-font-family-text="PingFang SC","Microsoft YaHei UI","Noto Sans CJK SC","Source Han Sans SC",system-ui,sans-serif (expected "PingFang SC", "Microsoft YaHei UI", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif); --dsh-font-family-code="SFMono-Regular",Consolas,"Liberation Mono","Noto Sans Mono CJK SC",monospace (expected "SFMono-Regular", Consolas, "Liberation Mono", "Noto Sans |
| `fonts.zh-document-check` | document.fonts.check() finds a CJK family from the stack | ✅ pass | document.fonts.check(14px "PingFang SC") = true |
| `fonts.en-latin` | en page resolves the livery latin stack (role-hooks) | ✅ pass | strategy=role-hooks html lang=en; --dsh-font-family-text=system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; expected=system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; body font=system-ui, -apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif, -apple-syst |

### locale

| check | title | result | detail |
|---|---|---|---|
| `locale.en-gallery` | English shell shows the Livery sidebar entry and English panel copy | ✅ pass | sidebar row label "Livery" (expected "Livery"); via=sidebar-panellist |

### Self-check & diagnostics

| check | title | result | detail |
|---|---|---|---|
| `selfcheck.capabilities` | self-check lists capability availability from the certified adapter contract (incl. host-font-role-hooks on 0.2.1) | ✅ pass | 10 capability row(s): forced-colors=true, host-density-tokens=false, host-font-family=true, host-font-role-hooks=true, host-message-flow=false, host-transcript-width=false, reduced-motion=true, reduced-transparency=true, surface-material=true, theme-css=true |
| `selfcheck.identity` | self-check shows the live host version, adapter id and contract hash | ✅ pass | panel shows 0.2.1-rc.2 / dsh-0.2.1-rc.2-r1 / fc5ccff8… |
| `selfcheck.catalog-profile` | self-check shows the catalog profile id | ✅ pass | panel shows 060e80ef… (sha256:060e80efd4f553754718f62…) |
| `selfcheck.contrast` | self-check reports 0 contrast failures | ✅ pass | contrast failures=0 (panel: Self-check \| Hide self-check \| First-frame handshake \| Accepted \| Adapter: dsh-0.2.1-rc.2-r1 \| Contract: fc5ccff8885e \| Plugin: 0.2.2 \| Host: 0.2.1-rc.2 \| Color mode: Light \| Locale: en \| Catalog: Loa) |
| `selfcheck.css-safety` | self-check reports 0 !important / 0 hash selectors | ✅ pass | !important=0 hashSelectors=0 (panel: !important rules: 0 · Hashed class selectors: 0 · Remote URLs: 0 · Unscoped tokens: 0 · Fixed z-index values: 0) |
| `selfcheck.optional-info` | self-check discloses optional capability fallbacks (optional-info line, or a degraded notice on older builds) | ✅ pass | 1 livery-optional-info line(s) |
| `selfcheck.copy-diagnostics` | copy diagnostics produces diagnostics text | ✅ pass | clipboard 1421 byte(s), starts: DSH Livery (dsh-livery) diagnostics ## Environment Plugin: 0.2.2 Adapter: dsh-0.2.1-rc.2-r1 Contract: fc5ccff8885e Host: 0.2.1-rc.2 Catalog profile: sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f6 |

### First paint

| check | title | result | detail |
|---|---|---|---|
| `firstpaint.no-stock-frame` | every painted frame after body creation already carries the livery body attribute and boot style | ✅ pass | 45 rAF sample(s); 0 without attribute/boot style; first sample: {"t":4,"htmlLang":"en","themeSource":"system","dark":false,"attr":"fjord","hash":"sha256:7f8a3ef9fab68c85980c31e70c06d3a450b082b6fe8c33c97cdaac3261d44e42","tokenBg":"#f0f3f6","bg":"rgb(240, 243, 246)","bootStyle":true,"liveryStyles":1} |
| `firstpaint.first-colour` | the first painted frame already uses the livery background token | ✅ pass | first sample --dsw-alias-bg-base=#f0f3f6 (canonical rgb(240, 243, 246)) vs livery light rgb(240, 243, 246) |
| `firstpaint.paint-timings` | paint timing entries are recorded (first-paint / first-contentful-paint) | ✅ pass | first-paint=28ms fcp=120ms dcl=24.200000286102295ms load=124.30000019073486ms |

### Stock restore

| check | title | result | detail |
|---|---|---|---|
| `restore.stock` | Restore stock appearance removes the livery and returns stock tokens | ✅ pass | body attr=null tokens=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] expected stock=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] |
| `restore.no-styles` | Restore removes Livery-owned style elements | ✅ pass | 0 livery style element(s) |
| `restore.persists` | stock restore survives a hard reload | ✅ pass | body attr=null handshake=(absent) |

### console

| check | title | result | detail |
|---|---|---|---|
| `console.no-livery-errors` | no console errors, page errors, failed requests or 4xx/5xx responses for Livery-owned URLs | ✅ pass | 0 console error(s), 0 page error(s), 0 failed request(s), 0 HTTP error response(s) |

### Uninstall residue

| check | title | result | detail |
|---|---|---|---|
| `residue.no-boot-row` | after uninstall the boot graph has no plugin row | ✅ pass | 71 entries, none for dsh-livery |
| `residue.no-dom` | after uninstall + restart body has no Livery attributes or style elements | ✅ pass | data-dsh-livery=null data-dsh-livery-hash=null styles=0 |
| `residue.stock-tokens` | after uninstall + restart computed tokens equal the stock baseline | ✅ pass | actual=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] stock=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] |
| `residue.no-boot-payload` | after uninstall the first-frame handshake global is absent | ✅ pass | window.__DSH_LIVERY_BOOT__=false |
| `residue.catalog-route` | after uninstall /livery/api/catalog returns 404 | ✅ pass | GET /livery/api/catalog → 404 |
| `residue.preview-route` | after uninstall /livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/fjord-zh-light.svg returns 404 | ✅ pass | GET /livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/fjord-zh-light.svg → 404 |
| `residue.plugin-route` | after uninstall /plugins/dsh-livery/client.js returns 404 | ✅ pass | GET /plugins/dsh-livery/client.js → 404 |
| `residue.old-bundle-url` | after uninstall the previously served client bundle URL returns 404 | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=32cd0492bce3 → 404 |
| `residue.profile-manifest` | uninstall removes dependency/bundle selection; any stale settings row is documented (not silently ignored) | ✅ pass | profile dependency removed; patch liveryRows=1 skinId=stock |

## Screenshots

| file | locale | mode | state |
|---|---|---|---|
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-home.png` | zh | light | home |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-home.png` | zh | light | home |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-panel.png` | zh | light | panel |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-panel-gallery.png` | zh | light | panel-gallery |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-panel-gallery-search-tag.png` | zh | light | panel-gallery-search-tag |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-panel-gallery-search-empty.png` | zh | light | panel-gallery-search-empty |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-panel-previewing.png` | zh | light | panel-previewing |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-panel-applied.png` | zh | light | panel-applied |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-panel-applied-after-reload.png` | zh | light | panel-applied-after-reload |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-dark-applied.png` | zh | dark | applied |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-forced-colors.png` | zh | light | forced-colors |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/en-light-panel-applied.png` | en | light | panel-applied |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/en-light-panel-gallery.png` | en | light | panel-gallery |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-selfcheck.png` | zh | light | selfcheck |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-panel-diagnostics-copied.png` | zh | light | panel-diagnostics-copied |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-applied-after-ready.png` | zh | light | applied-after-ready |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-applied-1023.png` | zh | light | applied-1023 |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-applied-767.png` | zh | light | applied-767 |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-panel-stock.png` | zh | light | panel-stock |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-stock-after-reload.png` | zh | light | stock-after-reload |
| `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/screens/0.2.1-rc.2-web-chrome/zh-light-stock-post-uninstall.png` | zh | light | stock-post-uninstall |

## Artifacts

- probe: `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/probe.json`
- console/network: `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/console.json`
- timings: `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/timings.json`
- filmstrip frames: `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/filmstrip` (9 frames)
- HTML snapshots: `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/html`

## Lifecycle

| step | result |
|---|---|
| SIGTERM stop before uninstall | exit 0, port closed: true, 106 ms |
| official `dsh plugin remove` | exit 0, dependency removed: true, bundle deselected: true, 1.5 s |
| fresh boot after uninstall | ready in 1.2 s, port 64037 |
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

Active livery: `fjord` (峡湾 / Fjord)

Apply mutation (profile patch):

```text
before skinId=(none) (0 row(s)) → after skinId=fjord (1 row(s), added 1); row: - id: livery name: dsh-livery config: skinId: fjord # dsh-vscode-bridge: end
```

Self-check capabilities:

| capability | available |
|---|---|
| forced-colors | true |
| host-density-tokens | false |
| host-font-family | true |
| host-font-role-hooks | true |
| host-message-flow | false |
| host-transcript-width | false |
| reduced-motion | true |
| reduced-transparency | true |
| surface-material | true |
| theme-css | true |

First paint timings:

```json
{
  "timeOrigin": 1792909704030.7,
  "responseStart": 1.5,
  "domContentLoaded": 24.200000286102295,
  "load": 124.30000019073486,
  "firstPaint": 28,
  "firstContentfulPaint": 120,
  "duration": 124.30000019073486
}
```

Lifecycle:

```json
{
  "stopBeforeUninstall": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 106,
    "forceKilled": false,
    "port": 63880,
    "portClosed": true,
    "portClosedWaitedMs": 1,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log",
    "logTail": "[stderr] dsh: warning: 1 entry did not activate\ndsh-vscode-bridge (dsh-vscode-bridge): failed to import: Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'dsh-vscode-bridge' imported from /Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home/profiles/web/\n    at Object.getPackageJSONURL (node:internal/modules/package_json_reader:314:9)\n    at packageResolve (node:internal/modules/esm/resolve:768:81)\n    at moduleResolve (node:internal/modules/esm/resolve:855:18)\n    at defaultResolve (node:internal/modules/esm/resolve:985:11)\n    at #cachedDefaultResolve (node:internal/modules/esm/loader:747:20)\n    at ModuleLoader.resolve (node:internal/modules/esm/loader:724:38)\n    at file:///Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js:1942:77\n    at adapted (file:///Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js:1889:15)\n    at file:///Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js:1914:19\n    at ModuleLoader.wrapped [as resolve] (file:///Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js:1944:71)\ndsh web: http://127.0.0.1:63880/?token=<redacted>\n"
  },
  "uninstall": {
    "phase": "uninstall",
    "command": "dsh plugin --profile web remove dsh-livery",
    "startedAt": "2026-10-25T06:28:30.426Z",
    "exitCode": 0,
    "signal": null,
    "timedOut": false,
    "durationMs": 1539,
    "stdout": "? Verifying lockfile against supply-chain policies (7 entries)...\n✓ Lockfile passes supply-chain policies (7 entries in 1.3s)\nLockfile is up to date, resolution step is skipped\nPackages: +7 -1\n+++++++-\nProgress: resolved 7, reused 7, downloaded 0, added 7, done\n\ndependencies:\n- dsh-livery file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.2.2.tgz\n\nDone in 1.5s using pnpm v12.3.4\n",
    "stderr": "",
    "dependencyPresent": false,
    "bundleSelected": false
  },
  "postUninstallBoot": {
    "url": "http://127.0.0.1:64037/?token=J2slsi9QKZs2J01lvQ-r-6Ewpjk3qPNCZ_TqlDZ1jrI",
    "baseUrl": "http://127.0.0.1:64037",
    "port": 64037,
    "readyMs": 1223
  },
  "stopAfterResidue": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 84,
    "forceKilled": false,
    "port": 64037,
    "portClosed": true,
    "portClosedWaitedMs": 0,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web-post-uninstall.log",
    "logTail": "[stderr] dsh: warning: 1 entry did not activate\ndsh-vscode-bridge (dsh-vscode-bridge): failed to import: Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'dsh-vscode-bridge' imported from /Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home/profiles/web/\n    at Object.getPackageJSONURL (node:internal/modules/package_json_reader:314:9)\n    at packageResolve (node:internal/modules/esm/resolve:768:81)\n    at moduleResolve (node:internal/modules/esm/resolve:855:18)\n    at defaultResolve (node:internal/modules/esm/resolve:985:11)\n    at #cachedDefaultResolve (node:internal/modules/esm/loader:747:20)\n    at ModuleLoader.resolve (node:internal/modules/esm/loader:724:38)\n    at file:///Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js:1942:77\n    at adapted (file:///Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js:1889:15)\n    at file:///Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js:1914:19\n    at ModuleLoader.wrapped [as resolve] (file:///Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js:1944:71)\ndsh web: http://127.0.0.1:64037/?token=<redacted>\n"
  }
}
```

---

_Generated by `scripts/acceptance-web.mjs`. The command is listed in `docs/verification/README.md`;
the checklist mapping to IMPLEMENTATION_PLAN.md §20 lives there too._
