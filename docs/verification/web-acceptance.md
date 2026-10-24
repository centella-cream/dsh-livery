# Web-profile acceptance evidence — DSH Livery

Run `2026-10-24T15-59-57-608Z-isolated` · isolated DSH_HOME · **96 passed / 4 failed / 2 skipped / 2 warnings** · RESULT: FAIL

## Environment

| item | value |
|---|---|
| date | 2026-10-24T16:00:39.445Z |
| DSH | 0.2.0-rc.2 |
| Node | v22.23.1 |
| OS | darwin 25.6.0 (arm64) |
| Chrome | 155.0.8059.85 (system Chrome via playwright-core, `channel: 'chrome'`) |
| playwright-core | 1.63.0 |
| target package | dsh-livery@0.1.0 (`file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.1.0.tgz`) |
| tarball sha256 | 388299f7ae61037a1fa8f2081c88b49dd8f6f647142b970230bb17a7da452af3 |
| browser | headless Chrome, viewport 1440×900 |

## Boot

```text
dsh web: http://127.0.0.1:49844/?token=<redacted>
```

- boot ready: 814 ms; install via official profile package manager: 179 ms

## Checks

### Lifecycle

| check | title | result | detail |
|---|---|---|---|
| `lifecycle.install` | official `dsh plugin --profile web add file:<tgz>` installs and selects the bundle | ✅ pass | dsh plugin --profile web add file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.1.0.tgz → exit 0 in 179ms; dependency=file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.1.0.tgz; bundles=["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-livery"] |
| `lifecycle.profile-initialized` | isolated profile initialized from the shipped web template | ✅ pass | home=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home; profile=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home/profiles/web; initialized=false; sha256=388299f7ae61037a1fa8f2081c88b49dd8f6f647142b970230bb17a7da452af3 |
| `lifecycle.boot` | `dsh --profile web --no-open --port 0` boots and prints its authenticated URL | ✅ pass | ready in 814ms on port 49844; log=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log |
| `lifecycle.sigterm` | SIGTERM stops the web service cleanly and closes the port | ✅ pass | exit=0 signal=null shutdown=77ms portClosed=true forced=false |
| `lifecycle.uninstall` | official `dsh plugin remove` uninstalls without residue in the profile manifest | ✅ pass | exit=0 depPresent=false bundleSelected=false duration=178ms |
| `lifecycle.final-stop` | final SIGTERM stops the restarted service and closes the port | ✅ pass | exit=0 portClosed=true forced=false |

### Environment

| check | title | result | detail |
|---|---|---|---|
| `env.browser` | system Chrome launches through playwright-core (no browser download) | ✅ pass | Chrome 155.0.8059.85; playwright-core 1.63.0 at /Users/ryanzhang/Personal/openprojects/dsh-livery/node_modules/playwright-core/index.mjs |

### Boot graph & handshake

| check | title | result | detail |
|---|---|---|---|
| `boot.token-exchange` | launch token is exchanged for the signed cookie and dropped from the URL | ✅ pass | final url http://127.0.0.1:49844/; navigation 271ms |
| `boot.graph-entry` | __DSH_BOOT__ lists client entry "dsh-livery" | ✅ pass | url plugins/??dsh-livery/client.js&rev=b8049fcbfe10 |

### Client bundle route

| check | title | result | detail |
|---|---|---|---|
| `bundle.serves-client-js` | plugin client bundle (boot-graph URL) is served as JavaScript | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=b8049fcbfe10 → 200 text/javascript; charset=utf-8 (106451 bytes) |
| `bundle.requires-rev` | plugin client bundle requires its graph rev | ✅ pass | GET graph URL without rev → 404 |
| `bundle.canonical-route` | bare /plugins/<pkg>/client.js?rev= route (doc-comment form) | ⚠️ warn | GET /plugins/dsh-livery/client.js?rev=<graph rev> → 404; this DSH build serves only the graph-encoded URL (verified deviation from the doc comment) |
| `bundle.gzip-budget` | client bundle gzip stays within the 25KB performance budget (host peers excluded) | ✅ pass | 22704 bytes gzip / 106451 bytes raw (budget 25600) |

### First-frame handshake

| check | title | result | detail |
|---|---|---|---|
| `handshake.boot-global` | first-frame handshake global __DSH_LIVERY_BOOT__ is present and accepted | ✅ pass | accepted=true profileKind=web skinId=fjord cssHash=sha256:adeb88d696a4d6507… entryId=livery adapter=dsh-0.2.0-rc.2-r1 |
| `handshake.echo` | handshake echoes version/adapter/host | ✅ pass | pluginVersion=0.1.0 adapterId=dsh-0.2.0-rc.2-r1 hostVersion=0.2.0-rc.2 entryId=livery |
| `handshake.catalog-url` | handshake advertises the catalog route | ✅ pass | catalogUrl=/livery/api/catalog |
| `handshake.applied-boot` | configured skin boot handshake is accepted with the expected identity and catalog route | ✅ pass | accepted=true skinId=fjord adapter=dsh-0.2.0-rc.2-r1 host=0.2.0-rc.2 entry=livery catalogUrl=/livery/api/catalog cssHash=sha256:adeb88d696a4d6507… |
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
| `trust.cookie-issued` | browser trust: cookie issued | ✅ pass | Set-Cookie: Max-Age=2592000; Path=/; Expires=Mon, 23 Nov 2026 15:59:59 GMT; HttpOnly; SameSite=Strict |
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
| `settings.section-label` | section nav label matches the shipped copy | ✅ pass | nav label "皮肤" vs expected "皮肤" |

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
| `search.empty-state` | search-empty state renders for an unknown query | ✅ pass | 0 card(s) remain; panel text: 设置 通用设置 模型 内置插件 Agent 预设 皮肤 打开配置文件 关闭 皮肤 为整个会话挑选颜色、字体与安全布局。 当前皮肤 峡湾 低饱和的蓝灰调，安静而克制，适合长时间阅读与专注工作。 ID fjord calm cool 浅色与深色 已降级 皮肤已降级 部分能力不可用，因此只应用能够安全生效的层；颜色仍会正常显示。 清空搜索 按标签筛选 全部 安静 冷调 雅致 低饱和 暖调 高对比 中性 古典 深邃 活泼 可用皮肤 0 套皮肤 |

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
| `apply.commits` | Apply commits the previewed skin as the active livery | ✅ pass | body attr=fjord (expected fjord) |
| `apply.card-state` | the applied card reports the current state | ✅ pass | data-state=active |
| `apply.previewbar-cleared` | the transient preview bar is gone after Apply | ✅ pass | 0 preview bar(s) remain |
| `apply.one-mutation` | Apply writes exactly one livery config mutation to the profile patch | ❌ fail | before skinId=fjord (1 row(s)) → after skinId=fjord (1 row(s), added 0); row: - id: livery name: dsh-livery config: skinId: fjord; no ui-theme row written |
| `apply.persists` | applied skin survives a hard reload (boot injection + client ready) | ✅ pass | body attr=fjord handshake.skinId=fjord cssHash=sha256:adeb88d696a4d… |

### Theme tokens

| check | title | result | detail |
|---|---|---|---|
| `theme.light-tokens` | active livery light tokens match the compiled catalog | ✅ pass | attr=fjord tokens={"--dsw-alias-bg-base":"#f0f3f6","--dsw-alias-label-primary":"#1b2733","--dsw-alias-border-l1":"#0000000a"} expected=["rgb(240, 243, 246)","rgb(27, 39, 51)",null] darkAttr=null |
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
| `css.no-whole-document-observers` | the livery adds no document-wide MutationObserver | ❌ fail | stock boot: ? whole-document observer(s); livery-active reload: 2 |

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
| `fonts.en-latin` | en page resolves the livery latin font stack | ✅ pass | html lang=en; --dsw-font-family=system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; expected=system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif |

### locale

| check | title | result | detail |
|---|---|---|---|
| `locale.en-gallery` | English settings gallery renders with English section copy | ✅ pass | nav label "Livery" (expected "Livery") |

### Self-check & diagnostics

| check | title | result | detail |
|---|---|---|---|
| `selfcheck.panel` | self-check panel reports capability availability | ❌ fail | TimeoutError: locator.click: Timeout 20000ms exceeded. Call log: - waiting for locator('button[aria-label="设置"], button[aria-label="Settings"]').first() - locator resolved to <button type="button" aria-label="Settings" aria-expanded="false" class="VOzbGW_trigger" aria-haspopup="dialog" aria-keyshortcuts="Alt+Meta+,">…</button> - attempting click action 2 × waiting for element to be visible, enable |

### First paint

| check | title | result | detail |
|---|---|---|---|
| `firstpaint.no-stock-frame` | every painted frame after body creation already carries the livery body attribute and boot style | ✅ pass | 45 rAF sample(s); 0 without attribute/boot style; first sample: {"t":13,"htmlLang":"en","themeSource":"system","dark":false,"attr":"fjord","hash":"sha256:adeb88d696a4d6507384e03d58ef5f9d3f06d61429ff2998e927baa9d5eb2d68","tokenBg":"#f0f3f6","bg":"rgb(240, 243, 246)","bootStyle":true,"liveryStyles":1} |
| `firstpaint.first-colour` | the first painted frame already uses the livery background token | ✅ pass | first sample --dsw-alias-bg-base=#f0f3f6 (canonical rgb(240, 243, 246)) vs livery light rgb(240, 243, 246) |
| `firstpaint.paint-timings` | paint timing entries are recorded (first-paint / first-contentful-paint) | ✅ pass | first-paint=32ms fcp=136ms dcl=42.59999990463257ms load=134.19999980926514ms |

### Stock restore

| check | title | result | detail |
|---|---|---|---|
| `restore.stock` | Restore stock appearance removes the livery and returns stock tokens | ✅ pass | body attr=null tokens=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] expected stock=null (no stock baseline recorded in reuse mode; attribute removal asserted) |
| `restore.no-styles` | Restore removes Livery-owned style elements | ✅ pass | 0 livery style element(s) |
| `restore.persists` | stock restore survives a hard reload | ✅ pass | body attr=null handshake=(absent) |

### console

| check | title | result | detail |
|---|---|---|---|
| `console.no-livery-errors` | no console errors, page errors, failed requests or 4xx/5xx responses for Livery-owned URLs | ✅ pass | 0 console error(s), 0 page error(s), 0 failed request(s), 0 HTTP error response(s) |

### Uninstall residue

| check | title | result | detail |
|---|---|---|---|
| `residue.no-boot-row` | after uninstall the boot graph has no plugin row | ✅ pass | 65 entries, none for dsh-livery |
| `residue.no-dom` | after uninstall + restart body has no Livery attributes or style elements | ✅ pass | data-dsh-livery=null data-dsh-livery-hash=null styles=0 |
| `residue.stock-tokens` | after uninstall + restart computed tokens equal the stock baseline | ❌ fail | actual=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] stock=null |
| `residue.no-boot-payload` | after uninstall the first-frame handshake global is absent | ✅ pass | window.__DSH_LIVERY_BOOT__=false |
| `residue.catalog-route` | after uninstall /livery/api/catalog returns 404 | ✅ pass | GET /livery/api/catalog → 404 |
| `residue.preview-route` | after uninstall /livery/assets/previews/ivory-slate-zh-light.svg returns 404 | ✅ pass | GET /livery/assets/previews/ivory-slate-zh-light.svg → 404 |
| `residue.plugin-route` | after uninstall /plugins/dsh-livery/client.js returns 404 | ✅ pass | GET /plugins/dsh-livery/client.js → 404 |
| `residue.old-bundle-url` | after uninstall the previously served client bundle URL returns 404 | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=b8049fcbfe10 → 404 |
| `residue.profile-manifest` | uninstall removes dependency/bundle selection; any stale settings row is documented (not silently ignored) | ✅ pass | profile dependency removed; patch liveryRows=1 skinId=stock |

## Screenshots

| file | locale | mode | state |
|---|---|---|---|
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-home.png` | zh | light | home |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-home-before-settings.png` | zh | light | home-before-settings |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-gallery.png` | zh | light | gallery |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-gallery-search-tag.png` | zh | light | gallery-search-tag |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-gallery-search-empty.png` | zh | light | gallery-search-empty |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-previewing.png` | zh | light | previewing |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-applied.png` | zh | light | applied |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-applied-after-reload.png` | zh | light | applied-after-reload |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-dark-applied.png` | zh | dark | applied |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-forced-colors.png` | zh | light | forced-colors |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/en-light-applied.png` | en | light | applied |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/en-light-gallery.png` | en | light | gallery |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-applied-after-ready.png` | zh | light | applied-after-ready |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-applied-1023.png` | zh | light | applied-1023 |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-applied-767.png` | zh | light | applied-767 |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-stock.png` | zh | light | stock |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-stock-after-reload.png` | zh | light | stock-after-reload |
| `artifacts/acceptance/screens/web-chrome-dsh-livery/zh-light-stock-post-uninstall.png` | zh | light | stock-post-uninstall |

## Artifacts

- probe: `artifacts/acceptance/probe.json`
- console/network: `artifacts/acceptance/console.json`
- timings: `artifacts/acceptance/timings.json`
- filmstrip frames: `artifacts/acceptance/filmstrip` (9 frames)
- HTML snapshots: `artifacts/acceptance/html`

## Deviations / known limitations

- Web profile only: Desktop/native-window criteria from IMPLEMENTATION_PLAN.md §20 are out of scope for this harness.
- system Chrome via playwright-core `channel: 'chrome'`; no Playwright browser download is used.

## Evidence details

Active livery: `fjord` (峡湾 / Fjord)

Apply mutation (profile patch):

```text
before skinId=fjord (1 row(s)) → after skinId=fjord (1 row(s), added 0); row: - id: livery name: dsh-livery config: skinId: fjord
```

First paint timings:

```json
{
  "timeOrigin": 1792857632099.3,
  "responseStart": 5.299999713897705,
  "domContentLoaded": 42.59999990463257,
  "load": 134.19999980926514,
  "firstPaint": 32,
  "firstContentfulPaint": 136,
  "duration": 134.19999980926514
}
```

Lifecycle:

```json
{
  "stopBeforeUninstall": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 77,
    "forceKilled": false,
    "port": 49844,
    "portClosed": true,
    "portClosedWaitedMs": 1,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log",
    "logTail": "dsh web: http://127.0.0.1:49844/?token=<redacted>\n"
  },
  "uninstall": {
    "phase": "uninstall",
    "command": "dsh plugin --profile web remove dsh-livery",
    "startedAt": "2026-10-24T16:00:37.205Z",
    "exitCode": 0,
    "signal": null,
    "timedOut": false,
    "durationMs": 178,
    "stdout": "Packages: -1\n-\n\ndependencies:\n- dsh-livery file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.1.0.tgz\n\nDone in 37ms using pnpm v12.3.4\n",
    "stderr": "",
    "dependencyPresent": false,
    "bundleSelected": false
  },
  "postUninstallBoot": {
    "url": "http://127.0.0.1:50037/?token=_hFIKjkXxwxeNXRa9Oe1e2zVoFydJBJKro8M07MjRGo",
    "baseUrl": "http://127.0.0.1:50037",
    "port": 50037,
    "readyMs": 913
  },
  "stopAfterResidue": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 80,
    "forceKilled": false,
    "port": 50037,
    "portClosed": true,
    "portClosedWaitedMs": 0,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web-post-uninstall.log",
    "logTail": "dsh web: http://127.0.0.1:50037/?token=<redacted>\n"
  }
}
```

---

_Generated by `scripts/acceptance-web.mjs`. The command is listed in `docs/verification/README.md`;
the checklist mapping to IMPLEMENTATION_PLAN.md §20 lives there too._
