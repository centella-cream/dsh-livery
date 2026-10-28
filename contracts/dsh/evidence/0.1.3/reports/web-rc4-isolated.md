# Acceptance evidence — DSH Livery on DSH 0.2.1-rc.4 (installed-package)

Run `2026-10-28T17-15-55-984Z-isolated` · isolated DSH_HOME · **259 passed / 0 failed / 5 skipped / 2 warnings** · RESULT: PASS

**Scope (explicit):** this run covers DSH 0.2.1-rc.4 + Web Profile + Chrome only. The DSH 0.2.1-rc.3 Desktop/macOS target is covered by separate real-Electron desktop evidence; Windows and Web Edge are not-supported and not claimed.

## Environment

| item | value |
|---|---|
| date | 2026-10-28T17:18:52.591Z |
| run commit | 93151d62b89c4933088db28d911c4ba93dc751da |
| DSH | 0.2.1-rc.4 |
| Node | v22.23.1 |
| OS | darwin 27.0.0 (arm64) |
| Chrome | 156.0.8078.48 (system Chrome via playwright-core, `channel: 'chrome'`) |
| certified browser versions | 156.0.8078.48 |
| claim tier / channel | preview / next |
| certified runtime versions | 22.23.1 |
| upstream | no GitHub tag / npm 0.2.1-rc.4 |
| playwright-core | 1.63.0 |
| target package | dsh-livery@0.1.3 (`file:<home>/Personal/openprojects/dsh-livery/dsh-livery-0.1.3.tgz`) |
| tarball sha256 | 13da37ed79e2ff14ca2913892431d1bc3033c4fe2cbf2b9e2c8fcef218d30496 |
| browser | headless Chrome, viewport 1440×900 |

## Host identity & certification

| item | expected (certified) | observed live |
|---|---|---|
| host version | 0.2.1-rc.4 | 0.2.1-rc.4 |
| adapter id | dsh-0.2.1-rc.4-r1 | dsh-0.2.1-rc.4-r1 |
| contract hash | sha256:18e63d003897b8485451218bf584f29ecfdaa5b6d07caafced77314eb29de7bf | sha256:18e63d003897b8485451218bf584f29ecfdaa5b6d07caafced77314eb29de7bf |
| catalog profile | sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec | sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec |
| platform module table | 11 modules | — (resolved at boot) |
| package source kind | installed-package | — |
| BootPayload.profileKind | web | web |
| previews base | — | /livery/assets/previews/sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec/ |

Certified-adapter match: ✅ yes · catalog profile sha256:2de1e8f801ff…

## Boot

```text
dsh web: http://127.0.0.1:53666/?token=<redacted>
```

- boot ready: 2.0 s; install via official profile package manager: 179 ms

## docs/design/implementation-plan.md §20 coverage (Web profile)

| §20 criterion | result | mapped checks |
|---|---|---|
| Exact certified host install + certified contract hash | ✅ all mapped checks passed | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.applied-boot`, `catalog.schema`, `catalog.livery-hashes` |
| Live host matches a certified adapter (version + adapter id + contract hash + catalog profile) | ✅ all mapped checks passed | `env.certified-host`, `handshake.certified-adapter`, `handshake.applied-boot`, `catalog.certified-identity`, `handshake.catalog-identity` |
| Platform module table / client bundle ABI resolves on this host build | ✅ all mapped checks passed | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.certified-adapter` |
| zh-CN + en-US Livery UI and previews complete (sidebar navigation entry) | ✅ all mapped checks passed | `nav.sidebar-entry`, `nav.main-panel`, `gallery.cards`, `search.name`, `keyboard.arrow-right`, `fonts.en-latin`, `locale.en-gallery`, `preview.previewing` |
| At least 24 double-mode, visually distinct visual styles (palette + typography + material + shape/elevation) | ✅ style-system v2: 24 liveries per profile, 96 previews per profile; per-livery CSS ≤ 12 KiB | `catalog.gallery-size`, `gallery.cards`, `previews.assets-served`, `catalog.style-vocabulary`, `catalog.css-budget` |
| Colour + host-level font-family actually effective (not just the settings page) | ✅ font strategy is capability-selected: this certified host exposes the documented role hooks (--dsh-font-family-text/-code); no legacy composite-token fallback is required | `theme.light-tokens`, `theme.dark-tokens`, `fonts.zh-cjk`, `fonts.zh-role-hooks`, `css.token-scoping` |
| At least one safe layout capability actually effective | — HONEST GAP: the certified hosts expose no public density / transcript-width / message-flow hook. Livery degrades layout to host/stock and lists the unavailable capabilities in the self-check; no fake compensation is shipped. Wallpaper is removed from schema v1. | — |
| Follows host light/dark without changing host preference | ✅ all mapped checks passed | `theme.dark-tokens`, `theme.light-restored`, `theme.host-preference`, `theme.host-preference-file` |
| Startup filmstrip has no stock-style frame / no takeover flash | ✅ all mapped checks passed | `firstpaint.no-stock-frame`, `firstpaint.first-colour`, `handshake.body-hash-catalog` |
| 0 !important, 0 hash-class selectors, 0 whole-document observers | ✅ all mapped checks passed | `css.no-important`, `css.no-hash-selectors`, `css.no-whole-document-observers`, `selfcheck.css-safety` |
| All contrast gates pass | ✅ all mapped checks passed | `catalog.contrast-zero-failures`, `selfcheck.contrast` |
| Applied visual styles change the real host UI (computed styles/CSS cascade) | ✅ contrasting styles applied through the UI; border-radius, font stack, shadow/material and cascade-resolved style tokens measured on live host nodes | `style.candidates`, `style.host-radius`, `style.host-font`, `style.host-elevation`, `style.material-glass`, `style.cascade-tokens` |
| Gallery preview-language tab switches only thumbnail preview locale (Follow DSH default / 中文 / English) | ✅ thumbnail SVG URLs only (<id>-<zh\|en>-<light\|dark>.svg); names/descriptions/copy stay host-locale and Apply/restore semantics are unchanged | `previewLocale.tab-present`, `previewLocale.tab-labels`, `previewLocale.default-follow`, `previewLocale.switch-en`, `previewLocale.switch-zh`, `previewLocale.follow-restores`, `previewLocale.apply-copy`, `previewLocale.apply-with-pinned`, `previewLocale.en-follow` |
| Gallery groups styles into six non-empty family sections with compact filters | ✅ display order calm→nature→light→retro→vivid→dark; family priority nature→calm→light→retro→vivid→dark; all six sections non-empty; 16 tag chips behind 更多筛选; roving focus crosses sections | `gallery.page-tabs`, `gallery.family-chips`, `gallery.family-sections`, `gallery.family-mapping`, `gallery.more-filters`, `gallery.more-filters-expanded`, `gallery.more-filters-collapsed`, `gallery.family-filter`, `gallery.family-keyboard` |
| Wallpaper studio (client-only layer, effects, validation, online search) | ✅ owned <style data-plugin-css="dsh-livery/wallpaper"> + body[data-dsh-wallpaper]; 24 built-ins, search-first online card (auto Picsum batch; mocked Openverse/Picsum), uploads, atmosphere overlay, tab persistence (no live network) | `wallpaper.tab`, `wallpaper.builtin-count`, `wallpaper.builtin-applied`, `wallpaper.effects-blur-dim`, `wallpaper.frost`, `wallpaper.reset`, `wallpaper.persistence`, `wallpaper.url-validation`, `wallpaper.url-accepted`, `wallpaper.search-results`, `wallpaper.search-applied`, `wallpaper.clear`, `wallpaper.tab-restore` |
| Round-11 copy/type/online card: human About footer, unified five-step typography, search-first online card with one auto random batch | ✅ About footer: two human lines, engineering ids only in copied diagnostics; visible type sizes ⊆ {11,12,13,15,20}; curated library removed; exactly one mocked Picsum auto batch on tab open; sliders never refetch; explicit Openverse search / random / refresh / retry flows | `footer.about-copy`, `footer.about-lines`, `footer.about-no-jargon`, `typography.five-step-style`, `typography.root-tokens`, `typography.five-step-wallpaper`, `typography.about-rail`, `wallpaper.library-removed`, `wallpaper.online-auto-random`, `wallpaper.online-no-refetch`, `wallpaper.online-search`, `wallpaper.online-random`, `wallpaper.online-refresh`, `wallpaper.online-retry`, `wallpaper.online-applied`, `selfcheck.copy-diagnostics-content` |
| Round-10 card layout: two-column card hierarchy, responsive stacking, bounded sliders, no overflow | ✅ style page: current-style hero + gallery card + 操作/自检 rail; wallpaper page: hero/library/random/custom/effects/builtins cards; 2 tracks ≥1100px, single column below; sliders 80–220px; screenshots at 1440×900 and 1024×800 | `layout.style-2col`, `layout.style-cards`, `layout.style-hero-thumb`, `layout.style-card-surfaces`, `layout.style-stacked-1024`, `layout.style-no-overflow-1440`, `layout.style-no-overflow-1024`, `layout.wallpaper-2col`, `layout.wallpaper-cards`, `layout.wallpaper-card-surfaces`, `layout.effects-sliders-bounded`, `layout.wallpaper-stacked-1024`, `layout.wallpaper-no-overflow-1440`, `layout.wallpaper-no-overflow-1024` |
| Livery lives in the left-sidebar plugin navigation (main panel), not in Settings | ✅ sidebar.panellist row (id/panel key livery, order 30, zh 视觉风格 / en Visual Style) + main keyed page; legacy settings.section must stay unregistered on panel-navigation hosts | `nav.sidebar-entry`, `nav.row-order`, `nav.above-workspaces`, `nav.conversation-hidden`, `nav.settings-section-absent` |
| Preview is transient; Apply is one durable mutation; restore stock works | ✅ all mapped checks passed | `preview.cancel`, `apply.one-mutation`, `apply.persists`, `restore.stock`, `restore.persists` |
| Browser trust / Origin / CSRF fence | ✅ all mapped checks passed | `boot.token-exchange`, `trust.bad-host-api-403`, `trust.cross-origin-403`, `trust.cross-site-403` |
| Hard reload, multi-tab and service restart consistency | ✅ all mapped checks passed | `apply.persists`, `web.multi-tab`, `lifecycle.sigterm`, `lifecycle.final-stop` |
| Uninstall leaves no runtime residue after restart | ✅ all mapped checks passed | `residue.no-boot-row`, `residue.no-dom`, `residue.no-boot-payload`, `residue.catalog-route`, `residue.old-bundle-url` |
| Web layout at 1023px / 767px widths | ✅ all mapped checks passed | `web.no-overflow-1023`, `web.no-overflow-767` |
| Performance budgets (bundle gzip, active CSS bytes, first paint) | ✅ all mapped checks passed | `bundle.gzip-budget`, `css.size-budget`, `firstpaint.paint-timings` |
| Desktop / Windows / Edge / native chrome | — Not-supported for this release line (explicitly not claimed): Web Profile/Chrome is certified on DSH 0.2.1-rc.2 and 0.2.1-rc.4; DSH 0.2.1-rc.3 Desktop/macOS is covered by separate Electron evidence; Desktop Windows and Web Edge are outside the formal matrix scope. | — |

## Checks


### Environment

| check | title | result | detail |
|---|---|---|---|
| `env.certified-host` | dsh CLI host version maps to a certified adapter record | ✅ pass | 0.2.1-rc.4 / dsh-0.2.1-rc.4-r1 / sha256:18e63d003897… / 11-module table / installed-package |
| `env.browser` | Chrome launches through playwright-core (no automatic browser download) | ✅ pass | Chrome 156.0.8078.48 (explicit Chrome-for-Testing executable); playwright-core 1.63.0 at <home>/Personal/openprojects/dsh-livery/node_modules/playwright-core/index.mjs |
| `env.browser-version` | actual full Chrome version matches the exact certified browser version requirement | ✅ pass | 156.0.8078.48 (--expect-browser-version 156.0.8078.48); matrix certifiedBrowserVersions=[156.0.8078.48]; claimTier=preview · channel=next · browsers=[156.0.8078.48] · runtimes=[22.23.1] · upstream=no-github-tag / npm-0.2.1-rc.4 |

### Lifecycle

| check | title | result | detail |
|---|---|---|---|
| `lifecycle.install` | official `dsh plugin --profile web add file:<tgz>` installs and selects the bundle | ✅ pass | <tmp> plugin --profile web add file:<home>/Personal/openprojects/dsh-livery/dsh-livery-0.1.3.tgz → exit 0 in 179ms; dependency=file:<home>/Personal/openprojects/dsh-livery/dsh-livery-0.1.3.tgz; bundles=["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-livery"] |
| `lifecycle.profile-initialized` | isolated profile initialized from the shipped web template | ✅ pass | home=<home>/Personal/openprojects/dsh-livery/.tmp/acceptance/r8-final/web-rc4-home; profile=<home>/Personal/openprojects/dsh-livery/.tmp/acceptance/r8-final/web-rc4-home/profiles/web; initialized=true; sha256=13da37ed79e2ff14ca2913892431d1bc3033c4fe2cbf2b9e2c8fcef218d30496 |
| `lifecycle.boot` | `dsh --profile web --no-open --port 0` boots and prints its authenticated URL | ✅ pass | ready in 2021ms on port 53666; log=<home>/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log |
| `lifecycle.boot-warnings` | boot log has no skipped-bundle or compatibility warnings | ✅ pass | no skipped/incompatible/warning lines in the boot log |
| `lifecycle.sigterm` | SIGTERM stops the web service cleanly and closes the port | ✅ pass | exit=0 signal=null shutdown=94ms portClosed=true forced=false |
| `lifecycle.uninstall` | official `dsh plugin remove` uninstalls without residue in the profile manifest | ✅ pass | exit=0 depPresent=false bundleSelected=false duration=134ms |
| `lifecycle.final-stop` | final SIGTERM stops the restarted service and closes the port | ✅ pass | exit=0 portClosed=true forced=false |

### Boot graph & handshake

| check | title | result | detail |
|---|---|---|---|
| `boot.token-exchange` | launch token is exchanged for the signed cookie and dropped from the URL | ✅ pass | final url http://127.0.0.1:53666/; navigation 189ms |
| `boot.graph-entry` | __DSH_BOOT__ lists client entry "dsh-livery" | ✅ pass | url plugins/??dsh-livery/client.js&rev=3fa0293d1e0d |

### Client bundle route

| check | title | result | detail |
|---|---|---|---|
| `bundle.serves-client-js` | plugin client bundle (boot-graph URL) is served as JavaScript | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=3fa0293d1e0d → 200 text/javascript; charset=utf-8 (213098 bytes) |
| `bundle.requires-rev` | plugin client bundle requires its graph rev | ✅ pass | GET graph URL without rev → 404 |
| `bundle.canonical-route` | bare /plugins/<pkg>/client.js?rev= route (doc-comment form) | ⚠️ warn | GET /plugins/dsh-livery/client.js?rev=<graph rev> → 404; this DSH build serves only the graph-encoded URL (verified deviation from the doc comment) |
| `bundle.gzip-budget` | client bundle gzip stays within the final 56 KiB performance budget (host peers excluded) | ✅ pass | 55288 bytes gzip / 213098 bytes raw (budget 57344 B / 56 KiB) |

### First-frame handshake

| check | title | result | detail |
|---|---|---|---|
| `handshake.stock-no-rows` | stock default injects no first-frame rows (fail-safe stock) | ✅ pass | __DSH_LIVERY_BOOT__ absent; skin style elements=0; body attribute=null |
| `handshake.boot-global` | first-frame handshake is asserted once a livery is configured | ⏭️ skip | initial boot is stock (no rows expected); asserted after the settings apply step |
| `handshake.echo` | first-frame handshake is asserted once a livery is configured | ⏭️ skip | initial boot is stock (no rows expected); asserted after the settings apply step |
| `handshake.catalog-url` | first-frame handshake is asserted once a livery is configured | ⏭️ skip | initial boot is stock (no rows expected); asserted after the settings apply step |
| `handshake.applied-boot` | configured skin boot handshake is accepted with a certified host identity | ✅ pass | post-apply reload: accepted=true hostVersion=0.2.1-rc.4 adapterId=dsh-0.2.1-rc.4-r1 contractHash=sha256:18e63d003897b… catalogProfile=sha256:2de1e8f801ffc… profileKind=web skinId=fjord cssHash=sha256:cc8551943e49cb054… |
| `handshake.certified-adapter` | live host matches a certified adapter record (exact version + adapter + contract + catalog profile) | ✅ pass | 0.2.1-rc.4 / dsh-0.2.1-rc.4-r1 / sha256:18e63d003897… / 11-module table / installed-package |
| `handshake.applied-skin` | configured skin is echoed by the boot handshake | ✅ pass | handshake.skinId=fjord (expected fjord) |
| `handshake.catalog-identity` | served catalog repeats the exact certified identity of the boot handshake | ✅ pass | 0.2.1-rc.4 / dsh-0.2.1-rc.4-r1 / sha256:18e63d003897b… / sha256:2de1e8f801ffc… |
| `handshake.body-hash-catalog` | body[data-dsh-livery-hash] equals the compiled cssHash from the served catalog | ✅ pass | body hash=sha256:cc8551943e49cb05426880b catalog livery.cssHash=sha256:cc8551943e49cb05426880b |
| `handshake.hash-equality` | body[data-dsh-livery-hash] equals __DSH_LIVERY_BOOT__.cssHash | ✅ pass | body hash=sha256:cc8551943e49cb05426880b handshake cssHash=sha256:cc8551943e49cb05426880b |
| `handshake.hash-style-text` | style element text hashes to the advertised css hash | ✅ pass | sha256(style text)=cc8551943e49cb05… body=sha256:cc8551943e49cb054 handshake=sha256:cc8551943e49cb054 |
| `handshake.boot-style-adopted` | boot style element is adopted with no duplicate Livery style ids | ✅ pass | ids=["dsh-livery-tokens"] tokensStyles=1 !important=0 classSelectors=0 |

### Browser trust / auth fence

| check | title | result | detail |
|---|---|---|---|
| `trust.no-cookie-401` | browser trust: no cookie 401 | ✅ pass | GET / without cookie → 401 |
| `trust.wrong-token-rejected` | browser trust: wrong token rejected | ✅ pass | GET /?token=<redacted> → 401 |
| `trust.token-exchange-303` | browser trust: token exchange 303 | ✅ pass | GET /?token=<redacted> token> → 303 |
| `trust.cookie-issued` | browser trust: cookie issued | ✅ pass | Set-Cookie: Max-Age=2592000; Path=/; Expires=Fri, 27 Nov 2026 17:15:59 GMT; HttpOnly; SameSite=Strict |
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
| `nav.sidebar-entry-present-stock` | Livery sidebar row is present on a stock start (client navigation registration) | ✅ pass | row #2 label "视觉风格" panellistSlot=true icon=true selected=false |
| `nav.sidebar-entry` | Livery row is registered in the left-sidebar plugin navigation (aria-label + icon + panellist slot) | ✅ pass | row #2 aria-label "视觉风格" icon=true panellistSlot=true (page locale zh) |
| `nav.row-order` | Livery row comes after the existing plugin rows (order 30) | ✅ pass | row #2; existing plugin rows at [0,1]; rows: 插件, 自动化任务, 视觉风格, 更多 |
| `nav.above-workspaces` | Livery row sits above the workspace section in the sidebar | ✅ pass | navBeforeWorkspaces=true rowTop=196 workspacesTop=0 workspacesHeight=0 |
| `nav.main-panel` | selecting the row opens the Visual Style main-panel page (h1 matches the entry label) | ✅ pass | row selected=true; main panel visible=true; selected row "视觉风格"; page h1 "视觉风格" (expected "视觉风格") |
| `nav.conversation-hidden` | the conversation is replaced while the Livery panel is selected | ✅ pass | composer visible=false; conversation copy visible=false; body starts: 新会话 ⌥ ⌘ N 插件 自动化任务 视觉风格 更多 工作区 默认工作区 新会话 更多 视觉风格 挑选配色、字体和界面细节。 视觉风格 壁纸 当前风格 浅色与深色 当前视觉风格 默认外观 DSH 自带的默认外观。 ID stock 全部 静 |
| `nav.settings-section-absent` | legacy settings.section Livery entry is NOT registered on panel-navigation hosts | ✅ pass | settings launcher path=account-menu; section labels=[通用设置, 模型, 内置插件, Agent 预设]; livery nodes in settings dialog=0 |
| `nav.settings-open-path` | settings dialog is still usable for the absence assertion | ✅ pass | launcher path=account-menu |
| `nav.panel-still-selected` | closing the settings dialog returns to the selected Livery panel | ✅ pass | panel visible=true; selected row "视觉风格" |
| `nav.panel-after-reload` | after a hard reload the Livery panel opens again from the sidebar row and shows the persisted skin | ✅ pass | via=sidebar-panellist; panel visible=true; selected "视觉风格" |

### Catalog route

| check | title | result | detail |
|---|---|---|---|
| `catalog.serves-json` | Host serves GET /livery/api/catalog | ✅ pass | status 200, content-type application/json, cache-control no-store |
| `catalog.schema` | catalog shape carries the certified host identity and catalog profile | ✅ pass | schemaVersion=1 hostVersion=0.2.1-rc.4 adapterId=dsh-0.2.1-rc.4-r1 contractHash=sha256:18e63d003897b… catalogProfile=sha256:2de1e8f801ffc… previewsBase=/livery/assets/previews/sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec/ |
| `catalog.certified-identity` | catalog reports a certified (hostVersion, adapterId, contractHash, catalogProfile) quadruple | ✅ pass | 0.2.1-rc.4 / dsh-0.2.1-rc.4-r1 / sha256:18e63d003897… / 11-module table / installed-package |
| `catalog.cache-control-no-store` | catalog is not cached | ✅ pass | cache-control: no-store |
| `catalog.gallery-size` | catalog carries at least 24 liveries (style system v2) | ✅ pass | 24 liveries: fjord, plum, amber-dusk, moss, graphite, rice-paper, deep-sea, sakura, midnight, linen, nord, dracula, gruvbox, solarized, catppuccin, tokyo-night, rose-pine, everforest, kanagawa, one-dark, ayu, flexoki, celadon, cinnabar |
| `catalog.token-coverage` | every asserted token is either compiled into the livery or documented as inherited (missing = 0) | ✅ pass | covered 1920 / inherited 1536 / required 3456 / missing 0 across 24 liveries |
| `catalog.contrast-zero-failures` | compiled catalog has 0 contrast failures | ✅ pass | all liveries report contrastFailures=0 |
| `catalog.css-safety-clean` | compiled catalog has 0 !important / 0 hash selectors | ✅ pass | all liveries report cssSafety pass |
| `catalog.livery-hashes` | every compiled livery cssHash equals sha256(tokens+typography+layout) | ✅ pass | 24 livery hashes verified |
| `catalog.css-budget` | every compiled livery stays inside the 12288 B CSS hard budget | ✅ pass | max 8892 B (tokyo-night); budget 12288 B across 24 liveries |
| `catalog.style-vocabulary` | the catalog covers palettes, typography, surface shape/elevation/material families | ✅ pass | surfaceStyles=7 [soft, rounded, elevated, paper, sharp, glass, flat]; en UI stacks=5; zh content stacks=3; family coverage shape=24 elevation=24 material=2 border=12 / 24 |
| `catalog.capabilities` | catalog capability availability matches the certified adapter contract | ✅ pass | theme-css=true, host-font-family=true, surface-material=true, host-density-tokens=false, host-transcript-width=false, host-message-flow=false, reduced-transparency=true, forced-colors=true, reduced-motion=true, host-font-role-hooks=true |
| `catalog.get-only-405` | catalog route is GET-only (POST → 405) | ✅ pass | POST /livery/api/catalog → 405 |

### Preview assets

| check | title | result | detail |
|---|---|---|---|
| `previews.assets-served` | all preview SVGs are served as image/svg+xml under the declared catalog-profile base | ✅ pass | 96/96 preview assets HTTP 200 image/svg+xml under /livery/assets/previews/sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec/ (24 liveries × zh/en × light/dark) |
| `previews.unknown-404` | unknown preview asset returns 404 | ✅ pass | unknown file → 404 |
| `previews.profile-isolation` | previews are served per catalog profile; another profile directory is not exposed | ⏭️ skip | both certified adapters share exactly one catalog profile — cross-profile isolation is not applicable |
| `previews.no-404` | no 404 responses for /livery/assets/previews/* | ✅ pass | 0 404 preview response(s) |

### copy

| check | title | result | detail |
|---|---|---|---|
| `copy.selfcheck-labels-zh` | zh self-check uses the round-12 plain-language labels (启动信息 / 样式覆盖 / 协议校验码) | ✅ pass | missing=[]; panel=自检 收起自检 启动信息 没有启动数据 no first-frame payload 适配器: dsh-0.2.1-rc.4-r1 协议校验码: 18e63d003897 插件版本: 0.1.3 宿主版本: 0.2.1-rc.4 颜色模式: 浅色 语言: zh 目录: 已加载 目录分组: sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec 配置中的视觉风格: stock 实际应用的视觉 |
| `copy.state-strings` | acceptance label constants match the round-12 rewritten copy for the non-happy-path states (unit-covered) | ✅ pass | zh.catalogUnavailable="视觉风格暂时无法加载"; zh.writeRefused="宿主没有保存这套视觉风格。"; en.catalogUnavailable="Visual styles are unavailable right now"; en.writeRefused="The host did not save this visual style." |
| `copy.selfcheck-labels-zh-active` | zh self-check shows the full plain-language label set with an active style (incl. 未限定范围的变量) | ✅ pass | missing=[]; panel=自检 收起自检 启动信息 没有启动数据 no first-frame payload 适配器: dsh-0.2.1-rc.4-r1 协议校验码: 18e63d003897 插件版本: 0.1.3 宿主版本: 0.2.1-rc.4 颜色模式: 浅色 语言: zh 目录: 已加载 目录分组: sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec 配置中的视觉风格: fjord 实际应用的视觉风格: fjord 宿主能力 10 项中 |
| `copy.selfcheck-labels` | self-check uses the round-12 plain-language labels | ✅ pass | locale=en; missing=[]; panel=Self-check Hide self-check Startup check Loaded Adapter: dsh-0.2.1-rc.4-r1 Contract hash: 18e63d003897 Plugin: 0.1.3 Host: 0.2.1-rc.4 Color mode: Light Locale: en Catalog: Loaded Catalog profile: sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1 |
| `copy.product-name` | visible product name is DSH Livery (no “Visual Studio” anywhere in the UI) | ✅ pass | footer line1="DSH Livery 0.1.3 · 已适配 DeepSeek Harness 0.2.1-rc.4"; bodyHasDSHLivery=true; bodyHasVisualStudio=false |
| `copy.wallpaper-online-hint` | online card uses the round-12 human hint copy | ✅ pass | online card text=在线壁纸 打开这个标签页会自动加载一批随机壁纸。点“搜索”“随机”或“换一批”才会联网获取新图片。 搜索 随机 换一批 Picsum #10 Picsum #11 |
| `copy.frost-label` | effect slider keeps the plain 磨砂 (Frost) label | ✅ pass | effects card labels=效果 重置效果 模糊 8 px 变暗 25% 磨砂 35% 全局氛围 30% 让界面表面像磨砂玻璃一样透出壁纸。 0 时壁纸只从透明处透出；调高后，所有页面都会罩上一层壁纸。 |

### Gallery

| check | title | result | detail |
|---|---|---|---|
| `gallery.cards` | gallery renders one card per catalog livery (≥24) | ✅ pass | 24 livery card(s) (catalog 24); stock card=false (optional; stock appearance is reachable through the restore action); ids: fjord, plum, linen, nord, solarized, catppuccin, rose-pine, moss, everforest, celadon, rice-paper, deep-sea, kanagawa, flexoki, amber-dusk, sakura, gruvbox, ayu, cinnabar, dracula, tokyo-night, graphite, midnight, one-dark |
| `gallery.aria-label` | gallery region exposes the renamed accessible label | ✅ pass | aria-label="视觉风格画廊" (expected "视觉风格画廊") |
| `gallery.thumbnails` | every livery card shows a loaded preview thumbnail | ✅ pass | 24/24 thumbs, broken: none |
| `gallery.no-error-state` | gallery is not in an error/catalog-unavailable state | ✅ pass | 0 livery-error node(s) |
| `gallery.page-tabs` | visual studio exposes 视觉风格 / 壁纸 page tabs with the style tab selected by default | ✅ pass | tabs=[{"id":"style","role":"tab","selected":true,"text":"视觉风格"},{"id":"wallpaper","role":"tab","selected":false,"text":"壁纸"}]; stylePanel=true; wallpaperPanel=false; expected texts 视觉风格\|壁纸 |
| `gallery.family-chips` | primary filter row shows 全部 + six family chips in display order | ✅ pass | chips=all:全部*, calm:静谧, nature:自然, light:明亮, retro:复古, vivid:霓虹, dark:深色 |
| `gallery.family-sections` | all six family sections render (not five) in display order with their styles and counts | ✅ pass | sections=[calm:7, nature:3, light:4, retro:5, vivid:2, dark:3]; expected counts=[calm:7, nature:3, light:4, retro:5, vivid:2, dark:3]; empty families=none |
| `gallery.family-mapping` | family assignment follows the nature→calm→light→retro→vivid→dark tag priority for every style | ✅ pass | 24/24 cards mapped to the priority-picked family |
| `gallery.more-filters` | 更多筛选 reveals the 16 tag chips and collapses again | ✅ pass | more-filters found=true; expanded=false; tag chips visible=0 |
| `gallery.more-filters-expanded` | expanded 更多筛选 shows the tag chips (aria-expanded=true) | ✅ pass | expanded=true; tag chips=16; toggle text="收起筛选" |
| `gallery.more-filters-collapsed` | collapsing 更多筛选 hides the tag chips again | ✅ pass | expanded=false; tag chips=0 |
| `gallery.family-filter` | selecting a family chip narrows the gallery to that one family section | ✅ pass | sections=[nature:3]; cards=3 (expected nature=3) |
| `gallery.family-keyboard` | roving focus crosses family-section boundaries as one flattened list | ✅ pass | focus after ArrowRight="moss" (expected first nature card "moss") |

### Gallery preview language

| check | title | result | detail |
|---|---|---|---|
| `previewLocale.tab-present` | gallery toolbar exposes the 预览语言 / Preview language segmented control with 3 options | ✅ pass | group role=group aria-label="预览语言" buttons=[follow:跟随 DSH*, zh:中文, en:English] (expected label "预览语言") |
| `previewLocale.tab-labels` | the segmented control labels and hint match the host locale copy | ✅ pass | texts=[follow:"跟随 DSH", zh:"中文", en:"English"]; title="只影响预览图；应用后的字体仍跟随 DSH 当前语言。" (expected "只影响预览图；应用后的字体仍跟随 DSH 当前语言。") |
| `previewLocale.default-follow` | Follow DSH is pressed by default and every thumbnail follows the host preview locale | ✅ pass | 24 thumbs; follow pressed=true; locales=["zh"]; host=zh |
| `previewLocale.switch-en` | switching the preview language to English pins every thumbnail to -en- SVG URLs | ✅ pass | 24 thumbs; -en-=24; pressed=follow,zh,en* |
| `previewLocale.switch-zh` | switching the preview language to 中文 pins every thumbnail to -zh- SVG URLs | ✅ pass | 24 thumbs; -zh-=24; pressed=follow,zh*,en |
| `previewLocale.follow-restores` | switching back to Follow DSH restores thumbnails to the host preview locale without changing card copy | ✅ pass | follow pressed=true; thumb locales=["zh"]; card copy unchanged while pinned=true |
| `previewLocale.apply-copy` | Apply control copy is unchanged while a preview language is pinned | ✅ pass | pinned=true; apply text "应用此视觉风格" (expected "应用此视觉风格") |
| `previewLocale.apply-with-pinned` | a pinned preview language survives Apply (thumbnails only) and the applied state is otherwise unchanged | ✅ pass | en pressed=true; thumb locales=["en"] |
| `previewLocale.en-follow` | Follow DSH follows the English host locale for thumbnails | ✅ pass | 24 thumbs; locales=["en"]; follow pressed=true |

### Search

| check | title | result | detail |
|---|---|---|---|
| `search.accessible-name` | gallery search exposes the renamed accessible name | ✅ pass | search accessible name "搜索视觉风格" (expected "搜索视觉风格") |
| `search.name` | search: localized name filters to its card | ✅ pass | query "峡湾" → 1 card(s): fjord |
| `search.id` | search: livery id filters to its card | ✅ pass | query "fjord" → 1 card(s): fjord |
| `search.tag` | search: localized tag label filters the gallery | ✅ pass | query "安静" → 7 card(s): fjord, linen, nord, catppuccin, moss, everforest, celadon |
| `search.empty-state` | search-empty state renders for an unknown query | ✅ pass | 0 card(s) remain; panel text: 视觉风格 挑选配色、字体和界面细节。 视觉风格 壁纸 当前风格 浅色与深色 当前视觉风格 默认外观 DSH 自带的默认外观。 ID stock 清空搜索 全部 静谧 自然 明亮 复古 霓虹 深色 更多筛选 预览语言 跟随 DSH 中文 English 可用视觉风格 0 种视觉风格 没有匹配的视觉风格换一个名称、ID 或标签试试。清除筛选 用方向键切换视觉风格，按回车预览。 操作 恢复默认外观 自检 展开自检 DSH Livery 0.1 |

### Keyboard navigation

| check | title | result | detail |
|---|---|---|---|
| `keyboard.arrow-right` | ArrowRight moves roving focus to the next card | ✅ pass | focus moved to "plum" (expected "plum") |
| `keyboard.home` | Home moves roving focus to the first card | ✅ pass | focus is "fjord" |
| `keyboard.end` | End moves roving focus to the last card | ✅ pass | focus is "one-dark" (expected "one-dark") |

### Preview

| check | title | result | detail |
|---|---|---|---|
| `preview.previewing` | previewing a different skin sets the preview attribute and tokens | ✅ pass | body attr=plum tokens={"--dsw-alias-bg-base":"#f7f2f5","--dsw-alias-label-primary":"#2a1c25","--dsw-alias-border-l1":"#0000000a"} expected=["rgb(247, 242, 245)","rgb(42, 28, 37)","rgba(0, 0, 0, 0.04)"] |
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
| `apply.persists` | applied skin survives a hard reload (boot injection + client ready) | ✅ pass | body attr=fjord handshake.skinId=fjord cssHash=sha256:cc8551943e49c… |

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
| `css.size-budget` | rendered livery/client stylesheet stays within the final 20 KiB hard budget | ✅ pass | 8248 bytes rendered CSS (soft target 16384 B, hard cap 20480 B / 20 KiB) |
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
| `fonts.zh-cjk` | zh-CN page resolves the livery CJK stack (role-hooks) | ✅ pass | strategy=role-hooks html lang=zh-CN; --dsh-font-family-text="Hiragino Sans GB","PingFang SC","Noto Sans CJK SC","Microsoft YaHei UI",sans-serif; expected="Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei UI", sans-serif; body font="Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei UI", sans-serif, -apple-syst |
| `fonts.zh-role-hooks` | host font role hooks carry the livery UI and code stacks (0.2.1+) | ✅ pass | --dsh-font-family-text="Hiragino Sans GB","PingFang SC","Noto Sans CJK SC","Microsoft YaHei UI",sans-serif (expected "Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei UI", sans-serif); --dsh-font-family-code="SFMono-Regular",Consolas,"Liberation Mono","Noto Sans Mono CJK SC",monospace (expected "SFMono-Regular", Consolas, "Liberation Mono", "Noto Sans Mono CJK SC", monospace) |
| `fonts.zh-document-check` | document.fonts.check() finds a CJK family from the stack | ✅ pass | document.fonts.check(14px "Hiragino Sans GB") = true |
| `fonts.en-latin` | en page resolves the livery latin stack (role-hooks) | ✅ pass | strategy=role-hooks html lang=en; --dsh-font-family-text="Avenir Next",Avenir,"Segoe UI","Helvetica Neue",Helvetica,sans-serif; expected="Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", Helvetica, sans-serif; body font="Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", Helvetica, sans-serif, -apple-system, "system-u |

### locale

| check | title | result | detail |
|---|---|---|---|
| `locale.en-gallery` | English shell shows the Livery sidebar entry and English panel copy | ✅ pass | sidebar row label "Visual Style" (expected "Visual Style"); via=sidebar-panellist |

### Self-check & diagnostics

| check | title | result | detail |
|---|---|---|---|
| `selfcheck.capabilities` | self-check lists capability availability from the certified adapter contract (incl. host-font-role-hooks on 0.2.1) | ✅ pass | 10 capability row(s): forced-colors=true, host-density-tokens=false, host-font-family=true, host-font-role-hooks=true, host-message-flow=false, host-transcript-width=false, reduced-motion=true, reduced-transparency=true, surface-material=true, theme-css=true |
| `selfcheck.style-coverage` | self-check reports token coverage with no missing tokens, and the applied style exposes style-token families | ✅ pass | applied=fjord styleFamilies={"shape":6,"elevation":7,"material":0,"border":0} selfCheckMissingTokens=0 |
| `selfcheck.identity` | self-check shows the live host version, adapter id and contract hash | ✅ pass | panel shows 0.2.1-rc.4 / dsh-0.2.1-rc.4-r1 / 18e63d00… |
| `selfcheck.catalog-profile` | self-check shows the catalog profile id | ✅ pass | panel shows 2de1e8f8… (sha256:2de1e8f801ffc4c49c65552…) |
| `selfcheck.contrast` | self-check reports 0 contrast failures | ✅ pass | contrast failures=0 (panel: Self-check \| Hide self-check \| Startup check \| Loaded \| Adapter: dsh-0.2.1-rc.4-r1 \| Contract hash: 18e63d003897 \| Plugin: 0.1.3 \| Host: 0.2.1-rc.4 \| Color mode: Light \| Locale: en \| Catalog: Loaded \|) |
| `selfcheck.css-safety` | self-check reports 0 !important / 0 hash selectors | ✅ pass | !important=0 hashSelectors=0 (panel: !important rules: 0 · Hashed class selectors: 0 · Remote URLs: 0 · Unscoped variables: 0 · Fixed z-index values: 0) |
| `selfcheck.optional-info` | self-check discloses optional capability fallbacks (optional-info line, or a degraded notice on older builds) | ✅ pass | 1 livery-optional-info line(s) |
| `selfcheck.copy-diagnostics` | copy diagnostics produces diagnostics text | ✅ pass | clipboard 982 byte(s), starts: DSH Livery（dsh-livery）诊断信息 ## 环境 插件版本：0.1.3 适配器：dsh-0.2.1-rc.4-r1 协议校验码：18e63d003897 宿主版本：0.2.1-rc.4 目录分组：sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec 语言：zh 颜色模式：浅色 ## 启动信息 |
| `selfcheck.copy-diagnostics-content` | copied diagnostics carry the DSH Livery header + adapter id + contract prefix (engineering ids live in diagnostics, not the About footer) | ✅ pass | adapterId="dsh-0.2.1-rc.4-r1" present=true; contractPrefix="18e63d00" present=true; headerDSHLivery=true; noVisualStudio=true |

### First paint

| check | title | result | detail |
|---|---|---|---|
| `firstpaint.no-stock-frame` | every painted frame after body creation already carries the livery body attribute and boot style | ✅ pass | 43/45 painted rAF sample(s) considered (pre-first-paint samples ignored); 0 without attribute/boot style; first painted sample: {"t":42,"htmlLang":"zh-CN","themeSource":"system","dark":false,"attr":"fjord","hash":"sha256:cc8551943e49cb05426880b8f0afcffd46ada58e88ce03915bb737608356361e","tokenBg":"#f0f3f6","bg":"rgb(240, 243, 246)","bootStyle":true,"liveryStyles":1} |
| `firstpaint.first-colour` | the first painted frame already uses the livery background token | ✅ pass | first sample --dsw-alias-bg-base=#f0f3f6 (canonical rgb(240, 243, 246)) vs livery light rgb(240, 243, 246) |
| `firstpaint.paint-timings` | paint timing entries are recorded (first-paint / first-contentful-paint) | ✅ pass | first-paint=28ms fcp=132ms dcl=35.30000001192093ms load=139.5ms |

### Presentation layout & card structure

| check | title | result | detail |
|---|---|---|---|
| `layout.style-2col` | style page uses a two-column card layout (main + rail) at 1440×900 | ✅ pass | tracks=2 [728px 364px]; main={"left":304,"top":162,"width":728,"height":5063}; rail={"left":1052,"top":162,"width":364,"height":232} |
| `layout.style-cards` | style page renders current-style hero, gallery card, actions rail and self-check card | ✅ pass | cards=livery-current-card:visible(728px), livery-gallery-card:visible(728px), livery-actions-card:visible(364px), livery-selfcheck:visible(364px) |
| `layout.style-hero-thumb` | current-style hero shows a loaded preview thumbnail | ✅ pass | thumb={"present":true,"visible":true,"tag":"img","src":"/livery/assets/previews/sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec/fjord-zh-light.svg","naturalWidth":640,"backgroundImage":"none","width":98,"height":62} |
| `layout.style-card-surfaces` | style page cards have a visible border and a non-flat surface (background/backdrop/shadow) | ✅ pass | livery-current-card: border=1px color(srgb 0.105882 0.152941 0.2 / 0.2), bg=color(srgb 0.899412 0.912941 0.926471), backdrop=blur(14px) saturate(1.08) \| livery-gallery-card: border=1px color(srgb 0.105882 0.152941 0.2 / 0.2), bg=color(srgb 0.899412 0.912941 0.926471), backdrop=blur(14px) saturate(1.08) \| livery-actions-card: border=1px color(srgb 0.105882 0.152941 0.2 / 0.2), bg=color(srgb 0.899 |
| `layout.style-no-overflow-1440` | style page has no horizontal overflow at 1440×900 | ✅ pass | scrollWidth=1440 clientWidth=1440 |
| `layout.style-stacked-1024` | style page stacks to a single column at 1024×800 (rail below main) | ✅ pass | tracks=1 [696px]; main={"left":304,"top":162,"width":696,"height":5010}; rail={"left":304,"top":5191,"width":696,"height":214} |
| `layout.style-no-overflow-1024` | style page has no horizontal overflow at 1024×800 | ✅ pass | scrollWidth=1024 clientWidth=1024; cards=livery-current-card:true,livery-gallery-card:true,livery-actions-card:true,livery-selfcheck:true |
| `layout.wallpaper-2col` | wallpaper page uses a two-column card layout at 1440×900 | ✅ pass | tracks=2 [728px 364px]; main={"left":304,"top":162,"width":728,"height":1362}; rail={"left":1052,"top":162,"width":364,"height":1007} |
| `layout.wallpaper-cards` | wallpaper page renders hero / online / custom / effects / builtins cards (library removed) | ✅ pass | cards=wallpaper-hero:visible(728px), wallpaper-online-card:visible(728px), wallpaper-custom-card:visible(728px), wallpaper-effects-card:visible(364px), wallpaper-builtins-card:visible(364px); heroPreview={"present":true,"visible":true,"tag":"div","src":"background-image: radial-gradient(120% 130% at 8% 0%, rgb(94, 234, 212) 0%, transparent 55%), radial-gradient(110% 130% at 92% 12%, rgb(129, 140,  |
| `layout.wallpaper-card-surfaces` | wallpaper page cards have a visible border and a non-flat surface | ✅ pass | wallpaper-hero: border=1px color(srgb 0.105882 0.152941 0.2 / 0.2), bg=color(srgb 0.878608 0.893016 0.907425 / 0.6675) \| wallpaper-online-card: border=1px color(srgb 0.105882 0.152941 0.2 / 0.2), bg=color(srgb 0.878608 0.893016 0.907425 / 0.6675) \| wallpaper-custom-card: border=1px color(srgb 0.105882 0.152941 0.2 / 0.2), bg=color(srgb 0.878608 0.893016 0.907425 / 0.6675) \| wallpaper-effects-ca |
| `layout.effects-sliders-bounded` | effect sliders are bounded (80–220px) inside the effects card, not viewport-wide | ✅ pass | 4 sliders expected; widths=[140,140,140,140] (viewport 1440); effectsGrid tracks=1 columns="326px" |
| `layout.wallpaper-no-overflow-1440` | wallpaper page has no horizontal overflow at 1440×900 | ✅ pass | scrollWidth=1440 clientWidth=1440 |
| `layout.wallpaper-stacked-1024` | wallpaper page stacks to a single column at 1024×800 with effects/built-ins before the current wallpaper and bounded sliders | ✅ pass | tracks=1; main={"left":304,"top":1021,"width":696,"height":1352}; rail={"left":304,"top":162,"width":696,"height":839}; effectsGridTracks=2; sliders=[140,140,140,140] |
| `layout.wallpaper-no-overflow-1024` | wallpaper page has no horizontal overflow at 1024×800 | ✅ pass | scrollWidth=1024 clientWidth=1024 |

### About footer (human copy)

| check | title | result | detail |
|---|---|---|---|
| `footer.about-copy` | About footer shows the human two-line copy (product + certified host, then the preview note) | ✅ pass | lines=["DSH Livery 0.1.3 · 已适配 DeepSeek Harness 0.2.1-rc.4", "画廊预览图按固定场景生成，用于展示风格差异，不是宿主界面截图。"] |
| `footer.about-lines` | About footer renders its two lines separately (no run-on concatenation) | ✅ pass | display=flex/column gap=4px; tops=333-353 / 357-393 |
| `footer.about-no-jargon` | About footer carries no contract hash / adapter id / jargon (ids live in diagnostics only) | ✅ pass | footer text="DSH Livery 0.1.3 · 已适配 DeepSeek Harness 0.2.1-rc.4画廊预览图按固定场景生成，用于展示风格差异，不是宿主界面截图。" |

### Unified five-step type scale

| check | title | result | detail |
|---|---|---|---|
| `typography.five-step-style` | style page uses the unified five-step type scale {11,12,13,15} (+20 display), no 14/16/18.72 leaks | ✅ pass | sizes=[11,12,13,15] counts={"11":100,"12":28,"13":57,"15":4} leaked=[] |
| `typography.root-tokens` | shared --lw-fs-* type tokens exist on the real .livery-workspace/.livery-panel roots (not only a legacy .livery-section) | ✅ pass | workspace={"display":"20px","title":"15px","body":"13px","label":"12px","caption":"11px"}; panel={"display":"20px","title":"15px","body":"13px","label":"12px","caption":"11px"} |
| `typography.five-step-wallpaper` | wallpaper page uses the same unified five-step type scale (no 14/16/18.72 leaks) | ✅ pass | sizes=[11,12,13,15] counts={"11":4,"12":24,"13":28,"15":9} leaked=[] |
| `typography.about-rail` | About footer is visible on the wallpaper page as well (rail shared) | ✅ pass | footer lines=2 |

### style

| check | title | result | detail |
|---|---|---|---|
| `style.candidates` | 2–4 contrasting styles were activated and observed (shape/typography/material diversity) | ✅ pass | 4 styles: graphite[sharp, sf mono], catppuccin[rounded, sf pro rounded], rice-paper[paper, iowan old style], tokyo-night[glass, sf mono] (applied via UI) |
| `style.host-radius` | contrasting styles change real host border-radius values (sharp vs rounded) | ✅ pass | max spread 26px on composerShell: [graphite=10px, catppuccin=32px, rice-paper=18px, tokyo-night=36px] |
| `style.host-font` | contrasting styles change the computed host font stack (serif vs sans) | ✅ pass | 2 distinct computed stacks; first families: [graphite=pingfang sc, catppuccin=pingfang sc, rice-paper=songti sc, tokyo-night=pingfang sc] |
| `style.host-elevation` | contrasting styles change real host motion/elevation (distinct shadow values, at least one visible) | ✅ pass | 10 distinct shadow values; samples: [graphite/composer=none \| graphite/composerShell=rgba(0, 0, 0, 0.16) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.03) 0px 4px 16px 0px, rgba(0, 0, 0, 0.03) 0px 0px 24px 0px \| graphite/sendButton=none \| graphite/newSessionButton=none \| graphite/navRow=none \| graphite/--dsw-shadow-lv1=0 1px 0 0 #00000014 \| graphite/--dsw-elevation-panel=0 0 0 .5px #00000047, 0 3px 8px |
| `style.material-glass` | a glass style is shipped and its material (backdrop/blur) reaches the host | ✅ pass | glass candidate=tokyo-night; computed backdrop-filter=false; --dsw-menu-backdrop-filter=blur(40px) saturate(150%); declared material tokens=--dsw-mask-blur |
| `style.cascade-tokens` | applied style tokens reach the host CSS cascade with the compiled values | ✅ pass | graphite: 6/10 style tokens computed identically; catppuccin: 8/13 style tokens computed identically; rice-paper: 13/13 style tokens computed identically; tokyo-night: 9/14 style tokens computed identically |
| `style.screenshots` | multi-livery comparison screenshots were captured | ✅ pass | 8 style screenshot(s) for 4 style candidate(s) |

### Wallpaper studio

| check | title | result | detail |
|---|---|---|---|
| `wallpaper.tab` | 壁纸 page tab switches to the wallpaper studio panel | ✅ pass | selected=true; wallpaper panel=true; style panel=false; label="壁纸" |
| `wallpaper.library-removed` | curated library/category UI is removed; one search-first online card directly follows the hero | ✅ pass | onlineCard=true; libraryElements=0; categoryChips=0; mainCardOrder=["wallpaper-hero","wallpaper-online-card","wallpaper-custom-card","wallpaper-clear-local-card"] |
| `wallpaper.online-auto-random` | opening the wallpaper tab auto-loads exactly one Picsum random batch (mockable) | ✅ pass | picsum list requests=1; openverse requests=0; results=2; loaded thumbs=2; status=null |
| `wallpaper.online-no-refetch` | changing effect sliders never refetches the online card | ✅ pass | picsum 1→1; openverse 0→0 |
| `wallpaper.online-search` | explicit Openverse search renders the mocked results | ✅ pass | openverse requests=1; results=["https://images.example.test/one.jpg","https://images.example.test/two-full.jpg"]; firstLabel="Aurora One · Tester · cc0 · openverse.org" |
| `wallpaper.online-random` | 随机 requests a new Picsum batch | ✅ pass | picsum 1→2; results=2 |
| `wallpaper.online-refresh` | 换一批/refresh requests another batch for the active source | ✅ pass | picsum 2→3 |
| `wallpaper.online-retry` | a failed online batch exposes retry and succeeds when retried | ✅ pass | status=error; retryVisible=true; picsum 4→5; results=2 |
| `wallpaper.online-applied` | clicking an online result applies that wallpaper (cached blob or URL layer) and shows attribution | ✅ pass | url=https://picsum.photos/id/10/1600/900; blob=true fetchOk=true rawInStyle=false; attr=true; attribution="Picsum #10 · Tester · Picsum · picsum.photos" |
| `wallpaper.builtin-count` | wallpaper studio ships 24 deterministic built-in wallpapers | ✅ pass | 24 builtins: aurora, dusk, mist, paper, ink, ember, sea, mono, forest, desert, ocean, sky, snow, bloom, neon, cyber, retro, sand, rose, violet, midnight, sunrise, glacier, minimal |
| `wallpaper.builtin-applied` | clicking a built-in wallpaper writes the owned stylesheet + body attribute | ✅ pass | attr=; marker=dsh-livery/wallpaper; cover rules=2; sliders={"blur":16,"dim":25,"frost":35,"atmosphere":30}; filter=filter:blur(16px) |
| `wallpaper.atmosphere-default` | the global atmosphere overlay exists at the default atmosphere with the expected computed styles | ✅ pass | overlay={"present":true,"id":"dsh-livery-wallpaper-overlay","className":"dsh-livery-wallpaper-overlay","ariaHidden":"true","zIndex":"90","pointerEvents":"none","opacity":"0.3","mixBlendMode":"soft-light","backgroundSize":"cover, cover, cover","backgroundImage":"radial-gradient(120% 130% at 8% 0%, rgb(94, 234, 212) 0%, rgba(0, 0, 0, 0) 55%), radial-gradient(110% 130% at 92% 12%, rgb(129, 140, 248)  |
| `wallpaper.selected-state` | the active wallpaper and tab expose a visible selected state | ✅ pass | selected=[{"id":"aurora","pressed":true,"label":"极光"}]; tab=rgb(52, 84, 138)/rgb(52, 84, 138); swatch outline=2px, shadow=color(srgb 0.203922 0.329412 0.541176 / 0.28) 0px 0px 0px 4px |
| `wallpaper.host-surfaces-opaque` | frost never rewrites host modal, input or tooltip surface tokens | ✅ pass | --dsw-alias-bg-layer-2=#d5d6db; --dsw-alias-bg-layer-1=#d5d6db; --dsw-alias-tooltip-bg=#484f6a |
| `wallpaper.atmosphere-below-floating` | the atmosphere layer stays below host Menu/Tooltip/HoverCard/Modal surfaces | ✅ pass | atmosphere z-index=90; host ordinary floats=100/101, Modal=1000, Toast=1100 |
| `wallpaper.modal-clear` | host Settings modal stays opaque above the atmosphere when wallpaper frost is active | ✅ pass | overlay z=90; modal z=1; background=rgb(213, 214, 219); backdrop=none |
| `wallpaper.atmosphere-zero` | atmosphere 0 removes the overlay element (immersive-only layer remains) | ✅ pass | overlay present=false; attribute=; style=true |
| `wallpaper.atmosphere-60` | atmosphere 60 sets overlay opacity 0.6 (z-index/pointer-events preserved) | ✅ pass | overlay={"present":true,"id":"dsh-livery-wallpaper-overlay","className":"dsh-livery-wallpaper-overlay","ariaHidden":"true","zIndex":"90","pointerEvents":"none","opacity":"0.6","mixBlendMode":"soft-light","backgroundSize":"cover, cover, cover","backgroundImage":"radial-gradient(120% 130% at 8% 0%, rgb(94, 234, 212) 0%, rgba(0, 0, 0, 0) 55%), radial-gradient(110% 130% at 92% 12%, rgb(129, 140, 248)  |
| `wallpaper.tab-stable-after-selection` | selecting a wallpaper never changes the active page tab | ✅ pass | selected tab=wallpaper |
| `wallpaper.tab-navigation` | the wallpaper tab survives navigation to another plugin panel and back | ✅ pass | navigated to "插件" (selected=true); reopened=true; restored selected=true; wallpaper panel=true |
| `wallpaper.effects-blur-dim` | blur/dim sliders update the wallpaper layer (filter + veil) | ✅ pass | sliders={"blur":20,"dim":60,"frost":35,"atmosphere":60}; filter=blur(20px); veil=rgba(0, 0, 0, 0.6) none repeat scroll 0% 0% / auto padding-box border-box |
| `wallpaper.frost` | frost makes active visual-style surface tokens translucent via color-mix | ✅ pass | active livery=tokyo-night; frost=80; color-mix=true; --dsw-alias-bg-base="color-mix(in srgb, #d5d6db 20%, transparent)" |
| `wallpaper.reset` | reset restores the default blur/dim/frost/atmosphere values | ✅ pass | sliders={"blur":8,"dim":25,"frost":35,"atmosphere":30}; filter=filter:blur(8px) |
| `wallpaper.persistence-layer` | the persisted wallpaper layer (body attribute + atmosphere overlay) is re-applied globally after a reload, before the panel mounts | ✅ pass | attr=(present); style=true; overlay=true; opacity=0.6 |
| `wallpaper.persistence` | selected wallpaper and effects persist across a hard reload | ✅ pass | global layer attr=true; builtin=aurora; sliders={"blur":12,"dim":40,"frost":55,"atmosphere":60}; stored={"schemaVersion":2,"revision":16,"selection":{"kind":"builtin","id":"aurora"},"effects":{"blur":12,"dim":40,"frost":55,"atmosphere":60},"position":{"x":50,"y":5 |
| `wallpaper.tab-reload` | the wallpaper tab survives a hard reload (sessionStorage mirror) | ✅ pass | reopened=true; wallpaper tab auto-selected after reload=true; overlay=true |
| `wallpaper.upload-accept` | upload input accepts the documented image MIME set | ✅ pass | accept="image/jpeg,image/png,image/webp,image/avif" |
| `wallpaper.upload-applied` | uploading a PNG applies a blob: wallpaper layer stored in IndexedDB | ✅ pass | blobInStyle=true; stored={"schemaVersion":2,"revision":17,"selection":{"kind":"upload","key":"upload-1793207822640-0yvnn2f72y"},"effects":{"blur":12,"dim":40,"frost"; error="" |
| `wallpaper.upload-invalid-type` | a non-image upload is rejected with a validation message | ✅ pass | error="不支持的图片格式。" |
| `wallpaper.upload-invalid-size` | an upload above the 10 MiB cap is rejected with a validation message | ✅ pass | error="图片超过 10 MiB。" |
| `wallpaper.upload-reload` | an uploaded wallpaper re-hydrates from IndexedDB after a hard reload | ✅ pass | blobInStyle=true; attribute=; stored={"schemaVersion":2,"revision":17,"selection":{"kind":"upload","key":"upload-1793207822640-0yvnn2f72y"},"effects":{"blur" |
| `wallpaper.url-validation` | non-https / javascript / data URLs are rejected with a validation message | ✅ pass | http://insecure.test/a.j rejected=true; javascript:alert(1) rejected=true; data:image/svg+xml,<svg/ rejected=true |
| `wallpaper.url-accepted` | https custom image URLs are accepted and applied through the owned layer | ✅ pass | blob=true fetchOk=true rawInStyle=false; attr=; error="" (custom URLs surface no attribution line by design) |
| `wallpaper.remote-failure` | failed remote cache (network/status or non-image MIME) keeps the previous selection/storage and never records history or raw-URL CSS | ✅ pass | [{"label":"network/status failure","url":"https://images.example.test/broken.jpg","errorVisible":true,"oldSelectionPreserved":true,"oldStylePreserved":true,"rawInStyle":false,"history":false},{"label":"non-image MIME failure","url":"https://images.example.test/mime.jpg","errorVisible":true,"oldSelectionPreserved":true,"oldStylePreserved":true,"rawInStyle":false,"history":false},{"label":"private-h |
| `wallpaper.adaptive-cover` | both wallpaper layers stay background-size:cover across 1024×768 / 1920×1080 / 900×1300 | ✅ pass | 1024x768: pseudo=cover, cover, cover, overlay=cover, cover, cover, coverRules=2; 1920x1080: pseudo=cover, cover, cover, overlay=cover, cover, cover, coverRules=2; 900x1300: pseudo=cover, cover, cover, overlay=cover, cover, cover, coverRules=2 |
| `wallpaper.atmosphere-conversation` | the atmosphere overlay stays present over the host conversation page | ✅ pass | attr=; overlay={"present":true,"id":"dsh-livery-wallpaper-overlay","className":"dsh-livery-wallpaper-overlay","ariaHidden":"true","zIndex":"90","pointerEvents":"none","opacity":"0.6","mixBlendMode":"soft-light","backgroundSize":"cover, cover, cover","backgroundImage":"radial-gradient(120% 130% at 8% 0%, rgb(94, 234, 212) 0%, rgba(0, 0, 0, 0) 55%), radial-gradient(110% 130% at 92% 12%, rgb(129, 140 |
| `wallpaper.overlay-plugin` | atmosphere layer stays present and below floating UI over the third-party "插件" panel; opaque-page visual coverage is not claimed | ✅ pass | third-party="插件"; atmo0 overlay=false; atmo60 overlay=true z=90 opacity=0.6; measured pixel delta={"avg":13,"grid":15.33,"score":28.33}; perceptible=true (informational only; no visual-coverage claim) |
| `wallpaper.clear` | clear removes the owned stylesheet/overlay/attribute and stores a v2 cleared record (or removes the key) | ✅ pass | stylePresent=false; attribute=null; overlay=false; stored={"schemaVersion":2,"revision":23,"selection":{"kind":"none"},"effects":{"blur":12,"dim":40,"frost":55,"atmosphere":60},"position":{"x":50,"y":50},"sourceId":"0cad74d6-3063-4cb7-a4d2-702c20bf7eaf"} |
| `wallpaper.tab-restore` | returning to the 视觉风格 tab restores the gallery and the wallpaper layer stays cleared | ✅ pass | style selected=true; stylePanel=true; wallpaperPanel=false |

### recent

| check | title | result | detail |
|---|---|---|---|
| `recent.hidden-empty` | the Recent wallpapers card is absent while the local history is empty | ✅ pass | present=false; items=0 |
| `recent.online-entry` | applying an online wallpaper records it in the Recent card (newest first, cached flag best-effort) | ✅ pass | card=true; items=[{"url":"https://picsum.photos/id/10/1600/900","cached":"true","label":"Picsum #10 · 已缓存"}]; applied=https://picsum.photos/id/10/1600/900 |
| `recent.two-entries` | two applied online wallpapers appear newest-first in the Recent card | ✅ pass | items=["https://picsum.photos/id/11/1600/900","https://picsum.photos/id/10/1600/900"] |
| `recent.reload-persist` | Recent wallpapers survive a hard reload (localStorage history + cached thumbnails) | ✅ pass | items=2; cached=["true","true"] |
| `recent.three-entries` | a custom https wallpaper is added as the newest Recent entry (3 entries, cached where possible) | ✅ pass | items=[{"url":"https://images.example.test/custom.jpg","cached":"true","label":"自定义地址 · 已缓存"},{"url":"https://picsum.photos/id/11/1600/900","cached":"true","label":"Picsum #11 · 已缓存"},{"url":"https://picsum.photos/id/10/1600/900","cached":"true","label":"Picsum #10 · 已缓存"}] |
| `recent.reapply` | clicking a Recent item re-applies that wallpaper and moves it to newest (cached blob layer is legitimate) | ✅ pass | newest=https://picsum.photos/id/10/1600/900; expected=https://picsum.photos/id/10/1600/900; blob=true fetchOk=true rawInStyle=false; hero="当前壁纸 移除壁纸 picsum.photos picsum.photos Picsum #10 · Tester · Picsum · picsum.photos 焦点位置 只有在线和上传的图片可以调整位置，内置壁纸始终居中。 左上 上 "; expectedTitle="Picsum #10" |
| `recent.cache-failure` | a failed cache download leaves the previous wallpaper selected, records no history entry for the URL, and never falls back to raw CSS | ✅ pass | history=false; rawInStyle=false; selection={"kind":"remote","url":"https://picsum.photos/id/10/1600/900"} vs {"kind":"remote","url":"https://picsum.photos/id/10/1600/900"}; recent 3→3 |
| `recent.clear` | clear removes the Recent card, the localStorage history and the best-effort remote image cache | ✅ pass | card=false; stored=null; remote cache keys 3→0 |

### visual

| check | title | result | detail |
|---|---|---|---|
| `visual.matrix-shots` | real screenshots captured for 1440/1024/767 × light/dark × wallpaper off/on | ✅ pass | frames=12; bytes=[133575,357025,359513,133542,125937,222166,221464,130148,113703,287438,286521,135467] |
| `visual.no-overflow-767` | no horizontal overflow at 767px with wallpaper off and on | ✅ pass | off=767/767; on=767/767 |
| `visual.narrow-card-order` | at 767px the effects/built-ins rail renders before online/upload cards | ✅ pass | {"wallpaper-effects-card":{"top":-376.3125,"left":80,"width":663,"height":232.78125,"visible":true},"wallpaper-builtins-card":{"top":47,"left":80,"width":663,"height":411.75,"visible":true},"wallpaper-online-card":{"top":959.3125,"left":80,"width":663,"height":369.296875,"visible":true},"wallpaper-custom-card":{"top":1348.609375,"left":80,"width":663,"height":315.28125,"visible":true}} |
| `visual.theme-tokens` | light/dark themes swap computed livery background tokens with wallpaper active | ✅ pass | attr light=tokyo-night dark=tokyo-night; light=color(srgb 0.835294 0.839216 0.858824 / 0.45); dark=color(srgb 0.101961 0.105882 0.14902 / 0.45); darkAttr=""; lightCard={"backgroundColor":"color(srgb 0.766718 0.773103 0.802156 / 0.4775)","backgroundAlpha":1,"backdropFilter":"blur(14px) saturate(1.08)","border":"1px solid","boxShadow":"rgba(0, 0, 0, 0.06) 0px 1px 2px 0px, rgba(0, 0, 0, 0.45) 0px 10p |
| `visual.frost-steps` | frost 0/35/80 changes active token transparency while plugin cards keep their private glass | ✅ pass | frost=0 colorMix=true pct=100 bgBase="color-mix(in srgb, #d5d6db 100%, transparent)" card={"backgroundColor":"color(srgb 0.802549 0.807647 0.831765)","backgroundAlpha":1,"backdropFilter":"blur(14px) saturate(1.08)","border":"1px solid","boxShadow":"rgba(0, 0, 0, 0.06) 0px 1px 2px 0px, rgba(0, 0, 0, 0.45) 0px 10px 28px -22px"} \| frost=35 colorMix=true pct=65 bgBase="color-mix(in srgb, #d5d6db 65%, |
| `visual.atmosphere-steps` | atmosphere 0/30/60 maps to no overlay / 0.30 / 0.60 opacity, below floating UI | ✅ pass | atmo=0 overlay={"present":false} \| atmo=30 overlay={"present":true,"id":"dsh-livery-wallpaper-overlay","className":"dsh-livery-wallpaper-overlay","ariaHidden":"true","zIndex":"90","pointerEvents":"none","opacity":"0.3","mixBlendMode":"soft-light","backgroundSize":"cover, cover, cover","backgroundImage":"radial-gradient(120% 130% at 8% 0%, rgb(94, 234, 212) 0%, rgba(0, 0, 0, 0) 55%), radial-gradie |
| `visual.forced-colors` | forced-colors active keeps the livery scoped and removes translucent card glass | ✅ pass | attr=tokyo-night; card={"backgroundColor":"rgb(255, 255, 255)","backgroundAlpha":1,"backdropFilter":"none","border":"1px solid","boxShadow":"none"} |
| `visual.reduced-transparency` | prefers-reduced-transparency:reduce removes card blur/translucent private surface | ✅ pass | media=true; card={"backgroundColor":"color(srgb 0.802549 0.807647 0.831765)","backgroundAlpha":1,"backdropFilter":"none","border":"1px solid","boxShadow":"rgba(0, 0, 0, 0.06) 0px 1px 2px 0px, rgba(0, 0, 0, 0.45) 0px 10px 28px -22px"} |
| `visual.keyboard-focus` | keyboard focus reaches a builtin and shows a visible focus ring | ✅ pass | focused={"testId":"wallpaper-builtin","outline":"solid 2px rgb(52, 84, 138)","boxShadow":"none"} |
| `visual.selected-state` | keyboard Enter selects exactly one builtin with a visible selected state | ✅ pass | {"count":1,"id":"aurora","pressed":"true"} |
| `visual.floating-surfaces` | host Settings modal stays opaque above frost+atmosphere | ✅ pass | {"background":"rgb(213, 214, 219)","alpha":1,"backdrop":"none","overlayZ":90} |
| `visual.other-floating-surfaces` | confirm dialog / Toast / Tooltip / Menu / HoverCard stay opaque above the atmosphere | ⏭️ skip | not triggerable without synthetic host interactions in this shell; Settings modal path covers the shared floating-surface token |

### merged

| check | title | result | detail |
|---|---|---|---|
| `merged.position-remote` | nine-grid position applies to page/overlay/hero for remote wallpapers and persists as state-v2 position | ✅ pass | initial={"present":true,"radios":9,"name":"wallpaper-position","checked":"wallpaper-position-center","checkedValue":"50,50"} position={"x":50,"y":50}; topLeft={"x":0,"y":0} cssMatch=true; bottomRight={"x":100,"y":100} |
| `merged.position-keyboard` | position radios are keyboard operable with native radio semantics | ✅ pass | keyboard={"x":100,"y":50} group={"present":true,"radios":9,"name":"wallpaper-position","checked":"wallpaper-position-right","checkedValue":"100,50"} |
| `merged.position-builtin-hidden` | built-in wallpaper hides the focal-position control | ✅ pass | group={"present":false} attr= |
| `merged.preset-export` | preset export produces schema-v1 JSON with style/wallpaper/effects/position and no executable data | ✅ pass | bytes=289; preset={"schemaVersion":1,"createdWith":"dsh-livery/0.1.3","styleId":"tokyo-night","wallpaper":{"kind":"builtin","id":"aurora"},"effects":{"blur":12,"dim":40,"frost":35,"atmosphere":60},"position":{"x":50,"y":50}} |
| `merged.preset-import-diff` | valid preset import shows a diff with the changed style/wallpaper/effects/position | ✅ pass | preset={"card":true,"exportButton":true,"importFile":true,"diff":true,"diffRows":4,"apply":true,"cancel":true,"exportStatus":"","importStatus":"已载入由 dsh-livery/0.1.3 创建的预设。","applyStatus":"","error":null} diffRows=4 |
| `merged.preset-apply-atomic` | preset apply switches style + wallpaper + effects + position together from one confirmed action | ✅ pass | applyStatus="预设已应用。关闭提示" stored={"schemaVersion":2,"revision":52,"selection":{"kind":"remote","url":"https://images.example.test/preset.jpg"},"effects":{"blur":14,"dim":30,"frost":45,"atmosphere":25},"position":{"x":100,"y":100},"sourceId":"0cad74d6-30 |
| `merged.preset-invalid-rejected` | invalid presets are rejected with a stable preset-error id and ARIA invalid/describedby/errormessage | ✅ pass | [{"name":"unknown-field","error":{"id":"preset-error","kind":"import","code":"unknown-field","text":"预设包含不支持的字段（css）。关闭提示","importAriaInvalid":"true","importDescribedBy":"preset-error","importErrorMessage":"preset-error","retryWallpaper":false}},{"name":"bad-url","error":{"id":"preset-error","kind":"import","code":"wallpaper-url","text":"预设壁纸不是有效的 https 图片地址。关闭提示","importAriaInvalid":"true","impor |
| `merged.preset-partial-failure` | injected wallpaper-persistence failure applies the style, shows an explicit retry (no false success), and retry applies wallpaper with coherent attribution | ✅ pass | styleApplied=true; error={"id":"preset-error","kind":"apply","code":"wallpaper","text":"视觉风格已应用，但本设备未能更改壁纸。可重试壁纸，或关闭提示保留新风格。重试壁纸关闭提示","importAriaInvalid":null,"importDescribedBy":null,"importErrorMessage":null,"retryWallpaper":true}; noFalseSuccess=true; hasRetry=true; recoveredSelection={"kind":"remote","url":"https://images.example.test/partial.jpg"}; attrib="Partial Preset · Tester · CC0 · http |
| `merged.state-migration-v1` | legacy v1 flat records hydrate position 50/50 without clearing wallpaper, persist as v2 on the next change, and corrupt records are ignored | ✅ pass | visible={"kind":"builtin","id":"aurora","blur":12,"dim":40,"frost":35,"atmosphere":60} style=true attr=""; persisted={"schemaVersion":2,"revision":1,"selection":{"kind":"builtin","id":"aurora"},"effects":{"blur":12,"dim":40,"frost":60,"atmosphere":60},"position":{"x":50,"y":50},"sourceId":"d8490f6e-e32b-489b-a009-27942b298030"} style=true attr=""; corruptStyle=true corruptAttr="" corruptStored={no |
| `merged.clear-local-data` | clear-local-data keeps the current wallpaper, reports a result, and clears disposable local history/cache | ✅ pass | dbBefore=[{"kind":"remote","size":70,"createdAt":1793207880064,"lastUsedAt":1793207888073,"sourceUrl":"https://images.example.test/remote.jpg","hasBlob":true},{"kind":"remote","size":70,"createdAt":1793207887282,"lastUsedAt":1793207888058,"sourceUrl":"https://images.example.test/partial.jpg","hasBlob":true},{"kind":"remote","size":70,"createdAt":1793207882544,"lastUsedAt":1793207882544,"sourceUrl" |
| `merged.two-tab-sync` | a second real page in the same profile applies wallpaper/position changes through storage events without reload loops | ✅ pass | selection={"kind":"remote","url":"https://images.example.test/sync.jpg"} position={"x":0,"y":0} style=true attr="" storageEvents=9 |
| `merged.two-tab-clear` | clearing wallpaper in page A clears page B through the same sync path | ✅ pass | style=false attr=null |
| `merged.two-tab-upload-ref` | page B externally adopts an upload selection, publishes its own ref, and clear-local-data protects the current upload ref | ✅ pass | {"uploadKey":"upload-1793207913167-04myfu1ec0","refRows":2,"refsAfterAdopt":[{"key":"dsh-livery.wallpaper.ref.caf91851-5587-47fc-b2f2-1533df8783e0","uploads":["upload-1793207913167-04myfu1ec0","upload-1793207894197-0ygr7ssx8f"],"updatedAt":1793207913174},{"key":"dsh-livery.wallpaper.ref.07d84654-6f84-46b2-ae9a-2f4fafcd4bec","uploads":["upload-1793207822640-0yvnn2f72y"],"updatedAt":1793207822641},{ |

### perf

| check | title | result | detail |
|---|---|---|---|
| `perf.catalog-size` | catalog JSON response stays within the measured headroom cap (+50% extreme regression tolerated as warning) | ✅ pass | actual 1313436 bytes; cap 1511424 bytes (93151d62b89c4933088db28d911c4ba93dc751da); within cap |
| `perf.cold-start` | cold-start time stays near the measured baseline (warn only unless extreme) | ✅ pass | actual boot=2021ms fcp=132ms; baseline p50=1614ms p95=1816ms; pass |

### network

| check | title | result | detail |
|---|---|---|---|
| `network.openverse-canary` | real Openverse API canary is non-blocking | ⚠️ warn | network unavailable/third-party failure: This operation was aborted |

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
| `residue.no-boot-row` | after uninstall the boot graph has no plugin row | ✅ pass | 70 entries, none for dsh-livery |
| `residue.no-dom` | after uninstall + restart body has no Livery attributes or style elements | ✅ pass | data-dsh-livery=null data-dsh-livery-hash=null styles=0 |
| `residue.stock-tokens` | after uninstall + restart computed tokens equal the stock baseline | ✅ pass | actual=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] stock=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] |
| `residue.no-boot-payload` | after uninstall the first-frame handshake global is absent | ✅ pass | window.__DSH_LIVERY_BOOT__=false |
| `residue.catalog-route` | after uninstall /livery/api/catalog returns 404 | ✅ pass | GET /livery/api/catalog → 404 |
| `residue.preview-route` | after uninstall /livery/assets/previews/sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec/fjord-zh-light.svg returns 404 | ✅ pass | GET /livery/assets/previews/sha256:2de1e8f801ffc4c49c65552fe1d4886eff8bf73329ff43fce8217d1d1d0f1bec/fjord-zh-light.svg → 404 |
| `residue.plugin-route` | after uninstall /plugins/dsh-livery/client.js returns 404 | ✅ pass | GET /plugins/dsh-livery/client.js → 404 |
| `residue.old-bundle-url` | after uninstall the previously served client bundle URL returns 404 | ✅ pass | GET /plugins/??dsh-livery/client.js&rev=3fa0293d1e0d → 404 |
| `residue.profile-manifest` | uninstall removes dependency/bundle selection; any stale settings row is documented (not silently ignored) | ✅ pass | profile dependency removed; patch liveryRows=1 skinId=stock |

## Screenshots

| file | locale | mode | state |
|---|---|---|---|
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-home.png` | zh | light | home |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-home.png` | zh | light | home |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel.png` | zh | light | panel |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-gallery.png` | zh | light | panel-gallery |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-gallery-preview-en.png` | zh | light | panel-gallery-preview-en |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-gallery-preview-zh.png` | zh | light | panel-gallery-preview-zh |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-gallery-search-tag.png` | zh | light | panel-gallery-search-tag |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-gallery-search-empty.png` | zh | light | panel-gallery-search-empty |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-previewing.png` | zh | light | panel-previewing |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-applied.png` | zh | light | panel-applied |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-applied-preview-en.png` | zh | light | panel-applied-preview-en |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-applied-after-reload.png` | zh | light | panel-applied-after-reload |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-dark-applied.png` | zh | dark | applied |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-forced-colors.png` | zh | light | forced-colors |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/en-light-panel-applied.png` | en | light | panel-applied |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/en-light-panel-gallery.png` | en | light | panel-gallery |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-selfcheck.png` | zh | light | selfcheck |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-diagnostics-copied.png` | zh | light | panel-diagnostics-copied |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-applied-after-ready.png` | zh | light | applied-after-ready |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-applied-1023.png` | zh | light | applied-1023 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-applied-767.png` | zh | light | applied-767 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-layout-style-1440.png` | zh | light | layout-style-1440 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-layout-style-1024.png` | zh | light | layout-style-1024 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-layout-wallpaper-1440.png` | zh | light | layout-wallpaper-1440 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-layout-wallpaper-1024.png` | zh | light | layout-wallpaper-1024 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-style-graphite.png` | zh | light | style-graphite |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-style-graphite-conversation.png` | zh | light | style-graphite-conversation |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-style-catppuccin.png` | zh | light | style-catppuccin |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-style-catppuccin-conversation.png` | zh | light | style-catppuccin-conversation |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-style-rice-paper.png` | zh | light | style-rice-paper |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-style-rice-paper-conversation.png` | zh | light | style-rice-paper-conversation |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-style-tokyo-night.png` | zh | light | style-tokyo-night |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-style-tokyo-night-conversation.png` | zh | light | style-tokyo-night-conversation |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-online-auto.png` | zh | light | wallpaper-online-auto |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-online-search.png` | zh | light | wallpaper-online-search |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-online-retry.png` | zh | light | wallpaper-online-retry |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-online-applied.png` | zh | light | wallpaper-online-applied |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-builtin.png` | zh | light | wallpaper-builtin |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-atmosphere.png` | zh | light | wallpaper-atmosphere |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-blurred.png` | zh | light | wallpaper-blurred |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-frost.png` | zh | light | wallpaper-frost |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-persisted.png` | zh | light | wallpaper-persisted |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-upload.png` | zh | light | wallpaper-upload |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-upload-persisted.png` | zh | light | wallpaper-upload-persisted |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-custom-url.png` | zh | light | wallpaper-custom-url |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-resize-1024x768.png` | zh | light | wallpaper-resize-1024x768 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-resize-1920x1080.png` | zh | light | wallpaper-resize-1920x1080 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-resize-900x1300.png` | zh | light | wallpaper-resize-900x1300 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-atmosphere-conversation.png` | zh | light | wallpaper-atmosphere-conversation |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-plugin-atmosphere-0.png` | zh | light | wallpaper-plugin-atmosphere-0 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-wallpaper-plugin-atmosphere-60.png` | zh | light | wallpaper-plugin-atmosphere-60 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-1440-light-off.png` | zh | light | visual-1440-light-off |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-1440-light-on.png` | zh | light | visual-1440-light-on |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-dark-visual-1440-dark-on.png` | zh | dark | visual-1440-dark-on |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-dark-visual-1440-dark-off.png` | zh | dark | visual-1440-dark-off |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-1024-light-off.png` | zh | light | visual-1024-light-off |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-1024-light-on.png` | zh | light | visual-1024-light-on |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-dark-visual-1024-dark-on.png` | zh | dark | visual-1024-dark-on |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-dark-visual-1024-dark-off.png` | zh | dark | visual-1024-dark-off |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-767-light-off.png` | zh | light | visual-767-light-off |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-767-light-on.png` | zh | light | visual-767-light-on |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-dark-visual-767-dark-on.png` | zh | dark | visual-767-dark-on |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-dark-visual-767-dark-off.png` | zh | dark | visual-767-dark-off |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-frost-0.png` | zh | light | visual-frost-0 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-frost-35.png` | zh | light | visual-frost-35 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-frost-80.png` | zh | light | visual-frost-80 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-atmosphere-0.png` | zh | light | visual-atmosphere-0 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-atmosphere-30.png` | zh | light | visual-atmosphere-30 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-atmosphere-60.png` | zh | light | visual-atmosphere-60 |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-forced-colors.png` | zh | light | visual-forced-colors |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-reduced-transparency.png` | zh | light | visual-reduced-transparency |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-visual-keyboard-selected.png` | zh | light | visual-keyboard-selected |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-merged-position-top-left.png` | zh | light | merged-position-top-left |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-merged-position-bottom-right.png` | zh | light | merged-position-bottom-right |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-merged-preset-diff.png` | zh | light | merged-preset-diff |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-merged-preset-applied.png` | zh | light | merged-preset-applied |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-merged-preset-error.png` | zh | light | merged-preset-error |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-merged-preset-partial-fault.png` | zh | light | merged-preset-partial-fault |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-merged-preset-partial-recovered.png` | zh | light | merged-preset-partial-recovered |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-panel-stock.png` | zh | light | panel-stock |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-stock-after-reload.png` | zh | light | stock-after-reload |
| `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/screens/0.2.1-rc.4-web-chrome/zh-light-stock-post-uninstall.png` | zh | light | stock-post-uninstall |

## Artifacts

- probe: `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/probe.json`
- console/network: `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/console.json`
- timings: `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/timings.json`
- filmstrip frames: `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/filmstrip` (10 frames)
- HTML snapshots: `artifacts/acceptance/pkg-0.1.3-r8-final/web-0.2.1-rc.4/html`

## Lifecycle

| step | result |
|---|---|
| SIGTERM stop before uninstall | exit 0, port closed: true, 94 ms |
| official `dsh plugin remove` | exit 0, dependency removed: true, bundle deselected: true, 134 ms |
| fresh boot after uninstall | ready in 1.6 s, port 54256 |
| residue sweep (boot graph / DOM / routes / tokens) | see residue checks above |
| final SIGTERM | exit 0, port closed: true |

## Deviations / known limitations

- SCOPE — this run covers DSH 0.2.1-rc.4 + Web Profile + Chrome only. The DSH 0.2.1-rc.3 Desktop/macOS target is covered by the separate real-Electron desktop evidence; Windows and Web Edge are not-supported and are not claimed.
- HONEST GAP — docs/design/implementation-plan.md §20 "at least one safe layout capability actually effective" cannot be met on DSH 0.2.1-rc.4: the certified adapter (installed-package) exposes no public density / transcript-width / message-flow hook (all three capability facts are unavailable). Livery degrades layout to host/stock and reports the unavailable capabilities in the self-check rather than faking them. Wallpaper is removed from schema v1.
- Disable/hot-reload state-machine transitions and unknown-version fail-closed to stock are covered by unit/contract tests; this black-box run proves install → boot → stock start → panel config apply → hard reload → restore stock → official uninstall → restart residue (web) / install-admission + app-runtime boot (desktop).
- §18.8 p95/CLS statistics need ≥30 samples per scenario; this run records per-run byte budgets and one cold-start paint trace/filmstrip, not a statistical distribution.
- DSH 0.2.1-rc.4 serves client bundles only through boot-graph grouped URLs (plugins/??<pkg>/client.js&rev=…); the bare /plugins/<pkg>/client.js?rev= form returns 404 in this build (asserted as a documented warning).
- No automatic Playwright browser download is used: the harness drives the system Chrome through channel: 'chrome' (or an explicit --chrome-binary matching the frozen certified version) for the web carrier, and connects over CDP to the Electron renderer (desktop).
- Web Profile + Chrome only: desktop macOS/Windows native-window criteria, packaged-app runtime claims and Edge coverage are explicitly not-supported for this release line (not pending, not claimed).

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
  "timeOrigin": 1793207783141.4,
  "responseStart": 3.100000023841858,
  "domContentLoaded": 35.30000001192093,
  "load": 139.5,
  "firstPaint": 28,
  "firstContentfulPaint": 132,
  "duration": 139.5
}
```

Lifecycle:

```json
{
  "stopBeforeUninstall": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 94,
    "forceKilled": false,
    "port": 53666,
    "portClosed": true,
    "portClosedWaitedMs": 1,
    "logPath": "<home>/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log",
    "logTail": "dsh web: http://127.0.0.1:53666/?token=<redacted>"
  },
  "uninstall": {
    "phase": "uninstall",
    "command": "<tmp> plugin --profile web remove dsh-livery",
    "startedAt": "2026-10-28T17:18:49.641Z",
    "exitCode": 0,
    "signal": null,
    "timedOut": false,
    "durationMs": 134,
    "stdout": "Packages: -1\n-\n\ndependencies:\n- dsh-livery file:<home>/Personal/openprojects/dsh-livery/dsh-livery-0.1.3.tgz\n\nDone in 26ms using pnpm v12.3.4\n",
    "stderr": "",
    "dependencyPresent": false,
    "bundleSelected": false
  },
  "postUninstallBoot": {
    "url": "http://127.0.0.1:54256/?token=<redacted>",
    "baseUrl": "http://127.0.0.1:54256",
    "port": 54256,
    "readyMs": 1626
  },
  "stopAfterResidue": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 82,
    "forceKilled": false,
    "port": 54256,
    "portClosed": true,
    "portClosedWaitedMs": 0,
    "logPath": "<home>/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web-post-uninstall.log",
    "logTail": "dsh web: http://127.0.0.1:54256/?token=<redacted>"
  }
}
```

---

_Generated by `scripts/acceptance/web.mjs`. The command is listed in `docs/verification.md`;
the checklist mapping to docs/design/implementation-plan.md §20 lives there too._
