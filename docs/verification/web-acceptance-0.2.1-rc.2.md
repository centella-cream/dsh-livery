# Acceptance evidence — DSH Livery on DSH 0.2.1-rc.2 (installed-package)

Run `2026-10-25T03-54-47-413Z-isolated` · isolated DSH_HOME · **121 passed / 0 failed / 3 skipped / 1 warnings** · RESULT: PASS

## Environment

| item | value |
|---|---|
| date | 2026-10-25T03:55:32.039Z |
| DSH | 0.2.1-rc.2 |
| Node | v22.23.1 |
| OS | darwin 25.6.0 (arm64) |
| Chrome | 155.0.8059.85 (system Chrome via playwright-core, `channel: 'chrome'`) |
| playwright-core | 1.63.0 |
| target package | dsh-livery@0.1.0 (`file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.1.0.tgz`) |
| tarball sha256 | 19dc6895e8986fab1581c2b22da10e0507811e94f5596a2f32a82fe02b60ac0b |
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

## Boot

```text
dsh web: http://127.0.0.1:64074/?token=<redacted>
```

- boot ready: 1.2 s; install via official profile package manager: 1.7 s

## IMPLEMENTATION_PLAN.md §20 coverage (Web profile)

| §20 criterion | result | mapped checks |
|---|---|---|
| Exact DSH 0.2.0-rc.2 install + certified contract hash | ✅ all mapped checks passed | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.applied-boot`, `catalog.schema`, `catalog.livery-hashes` |
| Live host matches a certified adapter (version + adapter id + contract hash + catalog profile) | ✅ all mapped checks passed | `env.certified-host`, `handshake.certified-adapter`, `handshake.applied-boot`, `catalog.certified-identity`, `handshake.catalog-identity` |
| Platform module table / client bundle ABI resolves on this host build | ✅ all mapped checks passed | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.certified-adapter` |
| zh-CN + en-US settings UI and previews complete | ✅ all mapped checks passed | `settings.livery-section`, `settings.section-label`, `gallery.cards`, `search.name`, `keyboard.arrow-right`, `fonts.en-latin`, `locale.en-gallery`, `preview.previewing` |
| At least 10 double-mode liveries | ✅ all mapped checks passed | `catalog.gallery-size`, `gallery.cards`, `previews.assets-served` |
| Colour + host-level font-family actually effective (not just the settings page) | ✅ font strategy is capability-selected: role hooks (--dsh-font-family-text/-code) on 0.2.1+, legacy composite tokens on 0.2.0-rc.2 | `theme.light-tokens`, `theme.dark-tokens`, `fonts.zh-cjk`, `fonts.zh-role-hooks`, `css.token-scoping` |
| At least one safe layout capability actually effective | — HONEST GAP: DSH 0.2.0-rc.2 exposes no public density / transcript-width / message-flow hook. Livery degrades layout to host/stock and lists the unavailable capabilities in the self-check; no fake compensation is shipped. Wallpaper is removed from schema v1. | — |
| Follows host light/dark without changing host preference | ✅ all mapped checks passed | `theme.dark-tokens`, `theme.light-restored`, `theme.host-preference`, `theme.host-preference-file` |
| Startup filmstrip has no stock-style frame / no takeover flash | ✅ all mapped checks passed | `firstpaint.no-stock-frame`, `firstpaint.first-colour`, `handshake.body-hash-catalog` |
| 0 !important, 0 hash-class selectors, 0 whole-document observers | ✅ all mapped checks passed | `css.no-important`, `css.no-hash-selectors`, `css.no-whole-document-observers`, `selfcheck.css-safety` |
| All contrast gates pass | ✅ all mapped checks passed | `catalog.contrast-zero-failures`, `selfcheck.contrast` |
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
| `lifecycle.install` | official `dsh plugin --profile web add file:<tgz>` installs and selects the bundle | ✅ pass | dsh plugin --profile web add file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.1.0.tgz → exit 0 in 1723ms; dependency=file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.1.0.tgz; bundles=["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-livery"] |
| `lifecycle.profile-initialized` | isolated profile initialized from the shipped web template | ✅ pass | home=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home; profile=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home/profiles/web; initialized=true; sha256=19dc6895e8986fab1581c2b22da10e0507811e94f5596a2f32a82fe02b60ac0b |
| `lifecycle.boot` | `dsh --profile web --no-open --port 0` boots and prints its authenticated URL | ✅ pass | ready in 1224ms on port 64074; log=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log |
| `lifecycle.boot-warnings` | boot log has no skipped-bundle or compatibility warnings | ✅ pass | no skipped/incompatible/warning lines in the boot log |
| `lifecycle.sigterm` | SIGTERM stops the web service cleanly and closes the port | ✅ pass | exit=0 signal=null shutdown=109ms portClosed=true forced=false |
| `lifecycle.uninstall` | official `dsh plugin remove` uninstalls without residue in the profile manifest | ✅ pass | exit=0 depPresent=false bundleSelected=false duration=107ms |
| `lifecycle.final-stop` | final SIGTERM stops the restarted service and closes the port | ✅ pass | exit=0 portClosed=true forced=false |

### Boot graph & handshake

| check | title | result | detail |
|---|---|---|---|
| `boot.token-exchange` | launch token is exchanged for the signed cookie and dropped from the URL | ✅ pass | final url http://127.0.0.1:64074/; navigation 235ms |
| `boot.graph-entry` | __DSH_BOOT__ lists client entry "dsh-livery" | ✅ pass | url plugins/??dsh-livery/client.js&rev=90a93e2fe9db |

### Client bundle route

| check | title | result | detail |
|---|---|---|---|
| `bundle.serves-client-js` | plugin client bundle (boot-graph URL) is served as JavaScript | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=90a93e2fe9db → 200 text/javascript; charset=utf-8 (80166 bytes) |
| `bundle.requires-rev` | plugin client bundle requires its graph rev | ✅ pass | GET graph URL without rev → 404 |
| `bundle.canonical-route` | bare /plugins/<pkg>/client.js?rev= route (doc-comment form) | ⚠️ warn | GET /plugins/dsh-livery/client.js?rev=<graph rev> → 404; this DSH build serves only the graph-encoded URL (verified deviation from the doc comment) |
| `bundle.gzip-budget` | client bundle gzip stays within the 25KB performance budget (host peers excluded) | ✅ pass | 20380 bytes gzip / 80166 bytes raw (budget 25600) |

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
| `trust.cookie-issued` | browser trust: cookie issued | ✅ pass | Set-Cookie: Max-Age=2592000; Path=/; Expires=Tue, 24 Nov 2026 03:54:51 GMT; HttpOnly; SameSite=Strict |
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

### Settings section

| check | title | result | detail |
|---|---|---|---|
| `settings.opens` | settings dialog opens | ✅ pass | settings dialog visible (launcher path: account-menu) |
| `settings.launcher-path` | settings launcher resolved on this shell version | ✅ pass | path=account-menu |
| `settings.livery-section` | Livery settings section is registered and opens | ✅ pass | nav label "皮肤" (index 4), marker [data-testid="livery-section"] |
| `settings.section-label` | section nav label matches the shipped zh/en copy | ✅ pass | nav label "皮肤" (page locale "zh") vs shipped "皮肤"/"Livery" |
| `settings.no-degraded-notice` | optional-only capability fallbacks do not surface as a degraded notice (runtime stays ready) | ✅ pass | 0 livery-degraded notice(s) with all required capabilities available |
| `settings.no-offline-notice` | the settings page is not in catalog-unavailable state | ✅ pass | 0 livery-offline notice(s) |

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
| `search.empty-state` | search-empty state renders for an unknown query | ✅ pass | 0 card(s) remain; panel text: 设置 通用设置 模型 内置插件 Agent 预设 皮肤 打开配置文件 关闭 皮肤 为整个会话挑选颜色、字体与安全布局。 当前皮肤 默认外观 DSH 自带外观，未应用任何皮肤。 ID stock 浅色与深色 清空搜索 按标签筛选 全部 安静 冷调 雅致 低饱和 暖调 高对比 中性 古典 深邃 活泼 可用皮肤 0 套皮肤 没有匹配的皮肤 换一个名称、ID 或标签试试。 清除筛选 使用方向键在皮肤之间移动，按回车预览。 恢复默认外观 自检 展 |

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
| `apply.one-mutation` | Apply writes exactly one livery config mutation to the profile patch | ✅ pass | before skinId=(none) (0 row(s)) → after skinId=fjord (1 row(s), added 1); row: - id: livery name: dsh-livery config: skinId: fjord; no ui-theme row written |
| `apply.persists` | applied skin survives a hard reload (boot injection + client ready) | ✅ pass | body attr=fjord handshake.skinId=fjord cssHash=sha256:7f8a3ef9fab68… |

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
| `locale.en-gallery` | English settings gallery renders with English section copy | ✅ pass | nav label "Livery" (expected "Livery") |

### Self-check & diagnostics

| check | title | result | detail |
|---|---|---|---|
| `selfcheck.capabilities` | self-check lists capability availability from the certified adapter contract (incl. host-font-role-hooks on 0.2.1) | ✅ pass | 10 capability row(s): forced-colors=true, host-density-tokens=false, host-font-family=true, host-font-role-hooks=true, host-message-flow=false, host-transcript-width=false, reduced-motion=true, reduced-transparency=true, surface-material=true, theme-css=true |
| `selfcheck.identity` | self-check shows the live host version, adapter id and contract hash | ✅ pass | panel shows 0.2.1-rc.2 / dsh-0.2.1-rc.2-r1 / fc5ccff8… |
| `selfcheck.catalog-profile` | self-check shows the catalog profile id | ✅ pass | panel shows 060e80ef… (sha256:060e80efd4f553754718f62…) |
| `selfcheck.contrast` | self-check reports 0 contrast failures | ✅ pass | contrast failures=0 (panel: 自检 \| 收起自检 \| 首帧握手 \| 已接受 \| 适配器: dsh-0.2.1-rc.2-r1 \| 契约哈希: fc5ccff8885e \| 插件版本: 0.1.0 \| 宿主版本: 0.2.1-rc.2 \| 颜色模式: 浅色 \| 语言: zh \| 目录: 已加载 \| 目录分组: sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba9) |
| `selfcheck.css-safety` | self-check reports 0 !important / 0 hash selectors | ✅ pass | !important=0 hashSelectors=0 (panel: !important 规则：0 · 哈希类选择器：0 · 远程 URL：0 · 未作用域 token：0 · 固定 z-index：0) |
| `selfcheck.optional-info` | self-check discloses optional capability fallbacks (optional-info line, or a degraded notice on older builds) | ✅ pass | 1 livery-optional-info line(s) |
| `selfcheck.copy-diagnostics` | copy diagnostics produces diagnostics text | ✅ pass | clipboard 977 byte(s), starts: DSH Livery（dsh-livery）诊断信息 ## 环境 插件版本：0.1.0 适配器：dsh-0.2.1-rc.2-r1 契约哈希：fc5ccff8885e 宿主版本：0.2.1-rc.2 目录分组：sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50 语言：zh 颜色模式：浅色 ## 首帧握手 首 |

### First paint

| check | title | result | detail |
|---|---|---|---|
| `firstpaint.no-stock-frame` | every painted frame after body creation already carries the livery body attribute and boot style | ✅ pass | 48 rAF sample(s); 0 without attribute/boot style; first sample: {"t":16,"htmlLang":"en","themeSource":"system","dark":false,"attr":"fjord","hash":"sha256:7f8a3ef9fab68c85980c31e70c06d3a450b082b6fe8c33c97cdaac3261d44e42","tokenBg":"#f0f3f6","bg":"rgb(240, 243, 246)","bootStyle":true,"liveryStyles":1} |
| `firstpaint.first-colour` | the first painted frame already uses the livery background token | ✅ pass | first sample --dsw-alias-bg-base=#f0f3f6 (canonical rgb(240, 243, 246)) vs livery light rgb(240, 243, 246) |
| `firstpaint.paint-timings` | paint timing entries are recorded (first-paint / first-contentful-paint) | ✅ pass | first-paint=28ms fcp=204ms dcl=48.09999990463257ms load=202.5ms |

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
| `residue.no-boot-row` | after uninstall the boot graph has no plugin row | ✅ pass | 69 entries, none for dsh-livery |
| `residue.no-dom` | after uninstall + restart body has no Livery attributes or style elements | ✅ pass | data-dsh-livery=null data-dsh-livery-hash=null styles=0 |
| `residue.stock-tokens` | after uninstall + restart computed tokens equal the stock baseline | ✅ pass | actual=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] stock=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] |
| `residue.no-boot-payload` | after uninstall the first-frame handshake global is absent | ✅ pass | window.__DSH_LIVERY_BOOT__=false |
| `residue.catalog-route` | after uninstall /livery/api/catalog returns 404 | ✅ pass | GET /livery/api/catalog → 404 |
| `residue.preview-route` | after uninstall /livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/fjord-zh-light.svg returns 404 | ✅ pass | GET /livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/fjord-zh-light.svg → 404 |
| `residue.plugin-route` | after uninstall /plugins/dsh-livery/client.js returns 404 | ✅ pass | GET /plugins/dsh-livery/client.js → 404 |
| `residue.old-bundle-url` | after uninstall the previously served client bundle URL returns 404 | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=90a93e2fe9db → 404 |
| `residue.profile-manifest` | uninstall removes dependency/bundle selection; any stale settings row is documented (not silently ignored) | ✅ pass | profile dependency removed; patch liveryRows=1 skinId=stock |

## Screenshots

| file | locale | mode | state |
|---|---|---|---|
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-home.png` | zh | light | home |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-home-before-settings.png` | zh | light | home-before-settings |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-gallery.png` | zh | light | gallery |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-gallery-search-tag.png` | zh | light | gallery-search-tag |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-gallery-search-empty.png` | zh | light | gallery-search-empty |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-previewing.png` | zh | light | previewing |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-applied.png` | zh | light | applied |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-applied-after-reload.png` | zh | light | applied-after-reload |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-dark-applied.png` | zh | dark | applied |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-forced-colors.png` | zh | light | forced-colors |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/en-light-applied.png` | en | light | applied |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/en-light-gallery.png` | en | light | gallery |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-selfcheck.png` | zh | light | selfcheck |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-diagnostics-copied.png` | zh | light | diagnostics-copied |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-applied-after-ready.png` | zh | light | applied-after-ready |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-applied-1023.png` | zh | light | applied-1023 |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-applied-767.png` | zh | light | applied-767 |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-stock.png` | zh | light | stock |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-stock-after-reload.png` | zh | light | stock-after-reload |
| `artifacts/acceptance/0.2.1-rc.2-web/screens/0.2.1-rc.2-web-chrome/zh-light-stock-post-uninstall.png` | zh | light | stock-post-uninstall |

## Artifacts

- probe: `artifacts/acceptance/0.2.1-rc.2-web/probe.json`
- console/network: `artifacts/acceptance/0.2.1-rc.2-web/console.json`
- timings: `artifacts/acceptance/0.2.1-rc.2-web/timings.json`
- filmstrip frames: `artifacts/acceptance/0.2.1-rc.2-web/filmstrip` (10 frames)
- HTML snapshots: `artifacts/acceptance/0.2.1-rc.2-web/html`

## Lifecycle

| step | result |
|---|---|
| SIGTERM stop before uninstall | exit 0, port closed: true, 109 ms |
| official `dsh plugin remove` | exit 0, dependency removed: true, bundle deselected: true, 107 ms |
| fresh boot after uninstall | ready in 1.2 s, port 64214 |
| residue sweep (boot graph / DOM / routes / tokens) | see residue checks above |
| final SIGTERM | exit 0, port closed: true |

## Deviations / known limitations

- HONEST GAP — IMPLEMENTATION_PLAN.md §20 "at least one safe layout capability actually effective" cannot be met on DSH 0.2.1-rc.2: the certified adapter (installed-package) exposes no public density / transcript-width / message-flow hook (all three capability facts are unavailable). Livery degrades layout to host/stock and reports the unavailable capabilities in the self-check rather than faking them. Wallpaper is removed from schema v1.
- Disable/hot-reload state-machine transitions and unknown-version fail-closed to stock are covered by unit/contract tests; this black-box run proves install → boot → stock start → settings apply → hard reload → restore stock → official uninstall → restart residue (web) / install-admission + app-runtime boot (desktop).
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
before skinId=(none) (0 row(s)) → after skinId=fjord (1 row(s), added 1); row: - id: livery name: dsh-livery config: skinId: fjord
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
  "timeOrigin": 1792900524079.8,
  "responseStart": 4.900000095367432,
  "domContentLoaded": 48.09999990463257,
  "load": 202.5,
  "firstPaint": 28,
  "firstContentfulPaint": 204,
  "duration": 202.5
}
```

Lifecycle:

```json
{
  "stopBeforeUninstall": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 109,
    "forceKilled": false,
    "port": 64074,
    "portClosed": true,
    "portClosedWaitedMs": 0,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log",
    "logTail": "dsh web: http://127.0.0.1:64074/?token=<redacted>\n"
  },
  "uninstall": {
    "phase": "uninstall",
    "command": "dsh plugin --profile web remove dsh-livery",
    "startedAt": "2026-10-25T03:55:29.458Z",
    "exitCode": 0,
    "signal": null,
    "timedOut": false,
    "durationMs": 107,
    "stdout": "Packages: -1\n-\n\ndependencies:\n- dsh-livery file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.1.0.tgz\n\nDone in 21ms using pnpm v12.3.4\n",
    "stderr": "",
    "dependencyPresent": false,
    "bundleSelected": false
  },
  "postUninstallBoot": {
    "url": "http://127.0.0.1:64214/?token=2sebfFdQN1U6k5n7Vdbf57mYYkDTU8pfCagzSUTyrIw",
    "baseUrl": "http://127.0.0.1:64214",
    "port": 64214,
    "readyMs": 1220
  },
  "stopAfterResidue": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 77,
    "forceKilled": false,
    "port": 64214,
    "portClosed": true,
    "portClosedWaitedMs": 1,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web-post-uninstall.log",
    "logTail": "dsh web: http://127.0.0.1:64214/?token=<redacted>\n"
  }
}
```

---

_Generated by `scripts/acceptance-web.mjs`. The command is listed in `docs/verification/README.md`;
the checklist mapping to IMPLEMENTATION_PLAN.md §20 lives there too._
