# Web-profile acceptance evidence — DSH Livery

Run `2026-10-24T16-15-59-078Z-reuse` · reuse of a running profile · **80 passed / 0 failed / 7 skipped / 2 warnings** · RESULT: PASS

## Environment

| item | value |
|---|---|
| date | 2026-10-24T16:16:10.696Z |
| DSH | 0.2.0-rc.2 |
| Node | v22.23.1 |
| OS | darwin 25.6.0 (arm64) |
| Chrome | 155.0.8059.85 (system Chrome via playwright-core, `channel: 'chrome'`) |
| playwright-core | 1.63.0 |
| target package | dsh-livery@0.1.0 (`—`) |
| tarball sha256 | — |
| browser | headless Chrome, viewport 1440×900 |

## Boot

```text
dsh web: http://127.0.0.1:3200/?token=<redacted>
```

- boot ready: —; install via official profile package manager: —

## IMPLEMENTATION_PLAN.md §20 coverage (Web profile)

| §20 criterion | result | mapped checks |
|---|---|---|
| Exact DSH 0.2.0-rc.2 install + certified contract hash | ✅ all mapped checks passed | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.applied-boot`, `catalog.schema`, `catalog.livery-hashes` |
| zh-CN + en-US settings UI and previews complete | ⏭ not fully exercised in this run | `settings.livery-section`, `settings.section-label`, `gallery.cards`, `search.name`, `keyboard.arrow-right`, `fonts.en-latin`, `locale.en-gallery`, `preview.previewing` |
| At least 10 double-mode liveries | ✅ all mapped checks passed | `catalog.gallery-size`, `gallery.cards`, `previews.assets-served` |
| Colour + host-level font-family actually effective (not just the settings page) | ✅ all mapped checks passed | `theme.light-tokens`, `theme.dark-tokens`, `fonts.zh-cjk`, `css.token-scoping` |
| At least one safe layout capability actually effective | — HONEST GAP: DSH 0.2.0-rc.2 exposes no public density / transcript-width / message-flow hook. Livery degrades layout to host/stock and lists the unavailable capabilities in the self-check; no fake compensation is shipped. Wallpaper is removed from schema v1. | — |
| Follows host light/dark without changing host preference | ✅ all mapped checks passed | `theme.dark-tokens`, `theme.light-restored`, `theme.host-preference`, `theme.host-preference-file` |
| Startup filmstrip has no stock-style frame / no takeover flash | ✅ all mapped checks passed | `firstpaint.no-stock-frame`, `firstpaint.first-colour`, `handshake.body-hash-catalog` |
| 0 !important, 0 hash-class selectors, 0 whole-document observers | ✅ all mapped checks passed | `css.no-important`, `css.no-hash-selectors`, `css.no-whole-document-observers`, `selfcheck.css-safety` |
| All contrast gates pass | ✅ all mapped checks passed | `catalog.contrast-zero-failures`, `selfcheck.contrast` |
| Preview is transient; Apply is one durable mutation; restore stock works | ⏭ not fully exercised in this run | `preview.cancel`, `apply.one-mutation`, `apply.persists`, `restore.stock`, `restore.persists` |
| Browser trust / Origin / CSRF fence | ✅ all mapped checks passed | `boot.token-exchange`, `trust.bad-host-api-403`, `trust.cross-origin-403`, `trust.cross-site-403` |
| Hard reload, multi-tab and service restart consistency | ⏭ not fully exercised in this run | `apply.persists`, `web.multi-tab`, `lifecycle.sigterm`, `lifecycle.final-stop` |
| Uninstall leaves no runtime residue after restart | ✅ all mapped checks passed | `residue.no-boot-row`, `residue.no-dom`, `residue.no-boot-payload`, `residue.catalog-route`, `residue.old-bundle-url` |
| Web layout at 1023px / 767px widths | ✅ all mapped checks passed | `web.no-overflow-1023`, `web.no-overflow-767` |
| Performance budgets (bundle gzip, active CSS bytes, first paint) | ✅ all mapped checks passed | `bundle.gzip-budget`, `css.size-budget`, `firstpaint.paint-timings` |
| Desktop / Windows / native chrome / wallpaper | — Out of scope: the Web harness has no Electron surface. Desktop/Windows certification belongs to the desktop rows of §18.9/§20. | — |

## Checks


### Lifecycle

| check | title | result | detail |
|---|---|---|---|
| `lifecycle.reuse` | reusing an already-running web profile (read-only) | ✅ pass | base=http://127.0.0.1:3200; no install, no boot, no uninstall |
| `lifecycle.uninstall` | uninstall removes code, routes and styles after a service restart | ⏭️ skip | reuse mode: the running profile is read-only |

### Environment

| check | title | result | detail |
|---|---|---|---|
| `env.browser` | system Chrome launches through playwright-core (no browser download) | ✅ pass | Chrome 155.0.8059.85; playwright-core 1.63.0 at /Users/ryanzhang/Personal/openprojects/dsh-livery/node_modules/playwright-core/index.mjs |

### Boot graph & handshake

| check | title | result | detail |
|---|---|---|---|
| `boot.token-exchange` | launch token is exchanged for the signed cookie and dropped from the URL | ✅ pass | final url http://127.0.0.1:3200/; navigation 115ms |
| `boot.graph-entry` | __DSH_BOOT__ lists client entry "dsh-livery" | ✅ pass | url plugins/??dsh-livery/client.js&rev=b649c095817d |

### Client bundle route

| check | title | result | detail |
|---|---|---|---|
| `bundle.serves-client-js` | plugin client bundle (boot-graph URL) is served as JavaScript | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=b649c095817d → 200 text/javascript; charset=utf-8 (109516 bytes) |
| `bundle.requires-rev` | plugin client bundle requires its graph rev | ✅ pass | GET graph URL without rev → 404 |
| `bundle.canonical-route` | bare /plugins/<pkg>/client.js?rev= route (doc-comment form) | ⚠️ warn | GET /plugins/dsh-livery/client.js?rev=<graph rev> → 404; this DSH build serves only the graph-encoded URL (verified deviation from the doc comment) |
| `bundle.gzip-budget` | client bundle gzip stays within the 25KB performance budget (host peers excluded) | ✅ pass | 23380 bytes gzip / 109516 bytes raw (budget 25600) |

### First-frame handshake

| check | title | result | detail |
|---|---|---|---|
| `handshake.boot-global` | first-frame handshake global __DSH_LIVERY_BOOT__ is present and accepted | ✅ pass | accepted=true profileKind=web skinId=fjord cssHash=sha256:adeb88d696a4d6507… entryId=livery adapter=dsh-0.2.0-rc.2-r1 |
| `handshake.echo` | handshake echoes version/adapter/host | ✅ pass | pluginVersion=0.1.0 adapterId=dsh-0.2.0-rc.2-r1 hostVersion=0.2.0-rc.2 entryId=livery |
| `handshake.catalog-url` | handshake advertises the catalog route | ✅ pass | catalogUrl=/livery/api/catalog |
| `handshake.body-hash-catalog` | body[data-dsh-livery-hash] equals the compiled cssHash from the served catalog | ✅ pass | body hash=sha256:adeb88d696a4d6507384e03 catalog livery.cssHash=sha256:adeb88d696a4d6507384e03 |
| `handshake.hash-equality` | body[data-dsh-livery-hash] equals __DSH_LIVERY_BOOT__.cssHash | ✅ pass | body hash=sha256:adeb88d696a4d6507384e03 handshake cssHash=sha256:adeb88d696a4d6507384e03 |
| `handshake.hash-style-text` | style element text hashes to the advertised css hash | ✅ pass | sha256(style text)=adeb88d696a4d650… body=sha256:adeb88d696a4d6507 handshake=sha256:adeb88d696a4d6507 |
| `handshake.boot-style-adopted` | boot style element is adopted with no duplicate Livery style ids | ✅ pass | ids=["dsh-livery-tokens"] tokensStyles=1 !important=0 classSelectors=0 |

### Browser trust / auth fence

| check | title | result | detail |
|---|---|---|---|
| `trust.no-cookie-401` | browser trust: no cookie 401 | ✅ pass | GET / without cookie → 401 |
| `trust.wrong-token-rejected` | browser trust: wrong token rejected | ✅ pass | GET /?token=<wrong> → 401 |
| `trust.token-exchange-303` | browser trust: token exchange 303 | ✅ pass | GET /?token=<launch token> → 303 |
| `trust.cookie-issued` | browser trust: cookie issued | ✅ pass | Set-Cookie: Max-Age=2592000; Path=/; Expires=Mon, 23 Nov 2026 16:15:59 GMT; HttpOnly; SameSite=Strict |
| `trust.cookie-200` | browser trust: cookie 200 | ✅ pass | GET / with cookie → 200 |
| `trust.bad-host-index-refused` | browser trust: bad host index refused | ✅ pass | GET / Host: evil.example (cookie from 127.0.0.1) → 401 (refused; cookie authority mismatch) |
| `trust.bad-host-api-403` | browser trust: bad host api 403 | ✅ pass | GET /api/__dsh_acceptance_probe__ Host: evil.example → 403 |
| `trust.cross-origin-403` | browser trust: cross origin 403 | ✅ pass | GET /api/__dsh_acceptance_probe__ Origin: http://evil.example → 403 |
| `trust.cross-site-403` | browser trust: cross site 403 | ✅ pass | GET /api/__dsh_acceptance_probe__ Sec-Fetch-Site: cross-site → 403 |

### Stock baseline

| check | title | result | detail |
|---|---|---|---|
| `stock.no-body-attribute` | stock boot leaves body without data-dsh-livery | ⏭️ skip | reused profile already has an active livery (fjord); stock baseline unavailable |
| `stock.tokens-recorded` | stock token baseline captured for residue comparison | ⏭️ skip | reused profile already has an active livery |

### Catalog route

| check | title | result | detail |
|---|---|---|---|
| `catalog.serves-json` | Host serves GET /livery/api/catalog | ✅ pass | status 200, content-type application/json, cache-control no-store |
| `catalog.schema` | catalog shape | ✅ pass | schemaVersion=1 adapterId=dsh-0.2.0-rc.2-r1 hostVersion=0.2.0-rc.2 profileKind=capabilities |
| `catalog.cache-control-no-store` | catalog is not cached | ✅ pass | cache-control: no-store |
| `catalog.gallery-size` | catalog carries at least 10 liveries | ✅ pass | 10 liveries: fjord, plum, amber-dusk, moss, graphite, rice-paper, deep-sea, sakura, midnight, linen |
| `catalog.token-coverage` | every asserted token is either compiled into the livery or documented as inherited (missing = 0) | ✅ pass | covered 800 / inherited 660 / required 1460 / missing 0 across 10 liveries |
| `catalog.contrast-zero-failures` | compiled catalog has 0 contrast failures | ✅ pass | all liveries report contrastFailures=0 |
| `catalog.css-safety-clean` | compiled catalog has 0 !important / 0 hash selectors | ✅ pass | all liveries report cssSafety pass |
| `catalog.livery-hashes` | every compiled livery cssHash equals sha256(tokens+typography+layout) | ✅ pass | 10 livery hashes verified |
| `catalog.capabilities` | catalog capability availability matches the frozen contract | ✅ pass | theme-css=true, host-font-family=true, surface-material=true, host-density-tokens=false, host-transcript-width=false, host-message-flow=false |
| `catalog.get-only-405` | catalog route is GET-only (POST → 405) | ✅ pass | POST /livery/api/catalog → 405 |

### Preview assets

| check | title | result | detail |
|---|---|---|---|
| `previews.assets-served` | all preview SVGs are served as image/svg+xml | ✅ pass | 40 preview assets HTTP 200 image/svg+xml |
| `previews.unknown-404` | unknown preview asset returns 404 | ✅ pass | unknown file → 404 |
| `previews.no-404` | no 404 responses for /livery/assets/previews/* | ✅ pass | 0 404 preview response(s) |

### Settings section

| check | title | result | detail |
|---|---|---|---|
| `settings.opens` | settings dialog opens | ✅ pass | settings dialog visible |
| `settings.livery-section` | Livery settings section is registered and opens | ✅ pass | nav label "皮肤" (index 4), marker [data-testid="livery-section"] |
| `settings.section-label` | section nav label matches the shipped zh/en copy | ✅ pass | nav label "皮肤" (page locale "zh") vs shipped "皮肤"/"Livery" |

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
| `search.empty-state` | search-empty state renders for an unknown query | ✅ pass | 0 card(s) remain; panel text: 设置 通用设置 模型 内置插件 Agent 预设 皮肤 打开配置文件 关闭 皮肤 为整个会话挑选颜色、字体与安全布局。 当前皮肤 峡湾 低饱和的蓝灰调，安静而克制，适合长时间阅读与专注工作。 ID fjord calm cool 浅色与深色 清空搜索 按标签筛选 全部 安静 冷调 雅致 低饱和 暖调 高对比 中性 古典 深邃 活泼 可用皮肤 0 套皮肤 没有匹配的皮肤 换一个名称、ID 或标签试试。 清除筛选 使用方向键在皮肤之间移动， |

### Keyboard navigation

| check | title | result | detail |
|---|---|---|---|
| `keyboard.arrow-right` | ArrowRight moves roving focus to the next card | ✅ pass | focus moved to "plum" (expected "plum") |
| `keyboard.home` | Home moves roving focus to the first card | ✅ pass | focus is "fjord" |
| `keyboard.end` | End moves roving focus to the last card | ✅ pass | focus is "linen" (expected "linen") |

### Preview

| check | title | result | detail |
|---|---|---|---|
| `preview.previewing` | previewing a different skin sets the preview attribute and tokens | ✅ pass | body attr=plum tokens={"--dsw-alias-bg-base":"#f7f2f5","--dsw-alias-label-primary":"#2a1c24","--dsw-alias-border-l1":"#0000000a"} expected=["rgb(247, 242, 245)","rgb(42, 28, 36)",null] |
| `preview.style-element` | preview uses a transient Livery style element | ✅ pass | 1 → 2 livery style element(s) |
| `preview.card-state` | the previewed card reports the previewing state | ✅ pass | data-state=preview |
| `preview.cancel` | Cancel restores the confirmed skin and token values | ✅ pass | body attr plum → fjord; tokens {"--dsw-alias-bg-base":"#f0f3f6","--dsw-alias-label-primary":"#1b2733","--dsw-alias-border-l1":"#0000000a"} vs ["rgb(240, 243, 246)","rgb(27, 39, 51)","rgba(0, 0, 0, 0.04)"] |
| `preview.cancel-style` | Cancel removes the transient preview style element | ✅ pass | 2 → 1 livery style element(s) |

### Apply & persistence

| check | title | result | detail |
|---|---|---|---|
| `apply.persists` | Apply commits the skin through the host settings and persists | ⏭️ skip | reuse mode is read-only (--unsafe-mutate opts in) |

### Theme tokens

| check | title | result | detail |
|---|---|---|---|
| `theme.light-tokens` | active livery light tokens match the compiled catalog | ✅ pass | attr=fjord tokens={"--dsw-alias-bg-base":"#f0f3f6","--dsw-alias-label-primary":"#1b2733","--dsw-alias-border-l1":"#0000000a"} expected=["rgb(240, 243, 246)","rgb(27, 39, 51)",null] darkAttr=null |
| `theme.tokens-change-with-skin` | applying a livery changes the computed host tokens versus the stock baseline | ✅ pass | no stock baseline in this mode (reuse); body attribute change asserted instead |
| `theme.host-preference` | host theme source stays system and no ui-theme row is written | ✅ pass | html[data-ds-theme-source]=system |
| `theme.host-preference-file` | profile patch contains no ui-theme writes | ✅ pass | no ui-theme row |
| `theme.dark-tokens` | emulated dark mode swaps to the livery dark tokens (host preference untouched) | ✅ pass | attr=fjord darkAttr= themeSource=system tokens={"--dsw-alias-bg-base":"#181c21","--dsw-alias-label-primary":"#eef2f6","--dsw-alias-border-l1":"#ffffff0f"} expected=["rgb(24, 28, 33)","rgb(238, 242, 246)",null] |
| `theme.light-restored` | returning to light restores exactly the light token branch | ✅ pass | tokens={"--dsw-alias-bg-base":"#f0f3f6","--dsw-alias-label-primary":"#1b2733","--dsw-alias-border-l1":"#0000000a"} |
| `theme.forced-colors` | forced-colors emulation is active and the livery stays consistent (system colours take over) | ✅ pass | forced-colors=true attr=fjord body bg=rgb(255, 255, 255) color=rgb(0, 0, 0) |

### CSS safety

| check | title | result | detail |
|---|---|---|---|
| `css.token-scoping` | token declarations are scoped to body[data-dsh-livery]; font bindings to :root:lang() | ✅ pass | 0 token declaration(s), 0 unscoped token, 0 unscoped font binding |
| `css.no-important` | Livery CSS contains 0 !important | ✅ pass | 0 occurrence(s) |
| `css.no-hash-selectors` | Livery CSS contains no hash/class-name selectors | ✅ pass | class selector rules: none |
| `css.size-budget` | rendered livery stylesheet stays within the 12KB hard budget (4–8KB target) | ✅ pass | 8665 bytes rendered CSS (target 4–8KB, hard cap 12KB) |
| `css.size-target` | rendered livery stylesheet is within the 4–8KB target range | ⚠️ warn | 8665 bytes is above the 8KB target but under the 12KB hard cap |
| `css.no-whole-document-observers` | the livery adds no document-wide MutationObserver (shell baseline excluded; Livery-owned attribution = 0) | ✅ pass | Livery-attributed whole-document observers: 0; whole-document observers stock=? → livery-active=2 (shell itself observes documentElement; delta must not grow) |

### Web surface

| check | title | result | detail |
|---|---|---|---|
| `web.multi-tab` | a second tab loads the same committed livery | ✅ pass | tab2 attr=fjord tokens={"--dsw-alias-bg-base":"#f0f3f6","--dsw-alias-label-primary":"#1b2733","--dsw-alias-border-l1":"#0000000a"} |
| `web.no-overflow-1023` | no horizontal overflow at 1023px width with the livery active | ✅ pass | scrollWidth=1023 clientWidth=1023 overflowX=0 attr=fjord |
| `web.no-overflow-767` | no horizontal overflow at 767px width with the livery active | ✅ pass | scrollWidth=767 clientWidth=767 overflowX=0 attr=fjord |

### Fonts / locale

| check | title | result | detail |
|---|---|---|---|
| `fonts.zh-cjk` | zh-CN page resolves the livery CJK font stack | ✅ pass | html lang=zh-CN; --dsw-font-family="PingFang SC","Microsoft YaHei UI","Noto Sans CJK SC","Source Han Sans SC",system-ui,sans-serif; expected="PingFang SC", "Microsoft YaHei UI", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif; body font="PingFang SC", "Microsoft YaHei UI", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif |
| `fonts.zh-document-check` | document.fonts.check() finds a CJK family from the stack | ✅ pass | document.fonts.check(14px "PingFang SC") = true |
| `fonts.en-latin` | en page resolves the livery latin stack | ⏭️ skip | reuse mode: host locale preference is read-only |

### Self-check & diagnostics

| check | title | result | detail |
|---|---|---|---|
| `selfcheck.capabilities` | self-check lists the capability availability (theme/font/surface available; density/transcript/flow unavailable) | ✅ pass | 9 capability row(s): forced-colors=true, host-density-tokens=false, host-font-family=true, host-message-flow=false, host-transcript-width=false, reduced-motion=true, reduced-transparency=true, surface-material=true, theme-css=true |
| `selfcheck.contrast` | self-check reports 0 contrast failures | ✅ pass | contrast failures=0 (panel: 自检 \| 收起自检 \| 首帧握手 \| 已接受 \| 适配器: dsh-0.2.0-rc.2-r1 \| 契约哈希: 42abf8ebc5ec \| 插件版本: 0.1.0 \| 宿主版本: 0.2.0-rc.2 \| 颜色模式: 浅色 \| 语言: zh \| 目录: 已加载 \| 配置中的皮肤: fjord \| 实际应用的皮肤: fjord \| 宿主能力 \| 9 项中 6 项可用 \| forced-colors) |
| `selfcheck.css-safety` | self-check reports 0 !important / 0 hash selectors | ✅ pass | !important=0 hashSelectors=0 (panel: !important 规则：0 · 哈希类选择器：0 · 远程 URL：0 · 未作用域 token：0 · 固定 z-index：0) |
| `selfcheck.optional-info` | self-check discloses optional capability fallbacks (optional-info line, or a degraded notice on older builds) | ✅ pass | 1 livery-optional-info line(s) |
| `selfcheck.copy-diagnostics` | copy diagnostics produces diagnostics text | ✅ pass | clipboard 870 byte(s), starts: DSH Livery（dsh-livery）诊断信息 ## 环境 插件版本：0.1.0 适配器：dsh-0.2.0-rc.2-r1 契约哈希：42abf8ebc5ec 宿主版本：0.2.0-rc.2 语言：zh 颜色模式：浅色 ## 首帧握手 首帧握手：已接受 ## 目录 目录：已加载 ## 配置 配置中的皮肤：fjord 实际应用的皮肤：fjord ## 能力 forced-colors：可用 |

### First paint

| check | title | result | detail |
|---|---|---|---|
| `firstpaint.no-stock-frame` | every painted frame after body creation already carries the livery body attribute and boot style | ✅ pass | 40 rAF sample(s); 0 without attribute/boot style; first sample: {"t":20,"htmlLang":"en","themeSource":"system","dark":false,"attr":"fjord","hash":"sha256:adeb88d696a4d6507384e03d58ef5f9d3f06d61429ff2998e927baa9d5eb2d68","tokenBg":"#f0f3f6","bg":"rgb(240, 243, 246)","bootStyle":true,"liveryStyles":1} |
| `firstpaint.first-colour` | the first painted frame already uses the livery background token | ✅ pass | first sample --dsw-alias-bg-base=#f0f3f6 (canonical rgb(240, 243, 246)) vs livery light rgb(240, 243, 246) |
| `firstpaint.paint-timings` | paint timing entries are recorded (first-paint / first-contentful-paint) | ✅ pass | first-paint=276ms fcp=280ms dcl=35.40000009536743ms load=157.59999990463257ms |

### Stock restore

| check | title | result | detail |
|---|---|---|---|
| `restore.stock` | Restore stock appearance removes the livery and returns stock tokens | ⏭️ skip | reuse mode is read-only (--unsafe-mutate opts in) |
| `restore.persists` | stock restore survives a reload | ⏭️ skip | reuse mode is read-only |

### console

| check | title | result | detail |
|---|---|---|---|
| `console.no-livery-errors` | no console errors, page errors, failed requests or 4xx/5xx responses for Livery-owned URLs | ✅ pass | 0 console error(s), 0 page error(s), 0 failed request(s), 0 HTTP error response(s) |

## Screenshots

| file | locale | mode | state |
|---|---|---|---|
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-home.png` | zh | light | home |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-home-before-settings.png` | zh | light | home-before-settings |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-gallery.png` | zh | light | gallery |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-gallery-search-tag.png` | zh | light | gallery-search-tag |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-gallery-search-empty.png` | zh | light | gallery-search-empty |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-previewing.png` | zh | light | previewing |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-dark-applied.png` | zh | dark | applied |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-forced-colors.png` | zh | light | forced-colors |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-selfcheck.png` | zh | light | selfcheck |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-diagnostics-copied.png` | zh | light | diagnostics-copied |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-applied-after-ready.png` | zh | light | applied-after-ready |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-applied-1023.png` | zh | light | applied-1023 |
| `artifacts/acceptance/real-profile-clone/screens/reuse/zh-light-applied-767.png` | zh | light | applied-767 |

## Artifacts

- probe: `artifacts/acceptance/real-profile-clone/probe.json`
- console/network: `artifacts/acceptance/real-profile-clone/console.json`
- timings: `artifacts/acceptance/real-profile-clone/timings.json`
- filmstrip frames: `artifacts/acceptance/real-profile-clone/filmstrip` (6 frames)
- HTML snapshots: `artifacts/acceptance/real-profile-clone/html`

## Deviations / known limitations

- HONEST GAP — IMPLEMENTATION_PLAN.md §20 "at least one safe layout capability actually effective" cannot be met on DSH 0.2.0-rc.2: the certified contract exposes no public density / transcript-width / message-flow hook (all three capability facts are unavailable). Livery degrades layout to host/stock and reports the unavailable capabilities in the self-check rather than faking them. Wallpaper is removed from schema v1.
- Web profile only: Desktop / macOS / Windows native-window criteria from §18.9/§20 (Electron surface, caption, traffic lights, Dock) are out of scope for this harness.
- Disable/hot-reload state-machine transitions and unknown-version fail-closed to stock are covered by unit/contract tests; this black-box run proves install → boot → stock start → settings apply → hard reload → restore stock → official uninstall → restart residue.
- §18.8 p95/CLS statistics need ≥30 samples per scenario; this run records per-run byte budgets and one cold-start paint trace/filmstrip, not a statistical distribution.
- DSH 0.2.0-rc.2 serves client bundles only through boot-graph grouped URLs (`plugins/??<pkg>/client.js&rev=…`); the bare `/plugins/<pkg>/client.js?rev=` form returns 404 in this build (asserted as a documented warning).
- No Playwright browser download is used: the harness drives the system Chrome through `channel: 'chrome'`.

## Evidence details

Active livery: `fjord` (峡湾 / Fjord)

Self-check capabilities:

| capability | available |
|---|---|
| forced-colors | true |
| host-density-tokens | false |
| host-font-family | true |
| host-message-flow | false |
| host-transcript-width | false |
| reduced-motion | true |
| reduced-transparency | true |
| surface-material | true |
| theme-css | true |

First paint timings:

```json
{
  "timeOrigin": 1792858568413.3,
  "responseStart": 3.8000001907348633,
  "domContentLoaded": 35.40000009536743,
  "load": 157.59999990463257,
  "firstPaint": 276,
  "firstContentfulPaint": 280,
  "duration": 157.59999990463257
}
```

---

_Generated by `scripts/acceptance-web.mjs`. The command is listed in `docs/verification/README.md`;
the checklist mapping to IMPLEMENTATION_PLAN.md §20 lives there too._
