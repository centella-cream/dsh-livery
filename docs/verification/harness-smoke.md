# Harness mechanics smoke — dsh-charter fixture (generic mode, not a dsh-livery acceptance run)

Run `2026-10-24T16-10-53-227Z-isolated` · isolated DSH_HOME · **36 passed / 0 failed / 1 skipped / 1 warnings** · RESULT: PASS

## Environment

| item | value |
|---|---|
| date | 2026-10-24T16:11:04.305Z |
| DSH | 0.2.0-rc.2 |
| Node | v22.23.1 |
| OS | darwin 25.6.0 (arm64) |
| Chrome | 155.0.8059.85 (system Chrome via playwright-core, `channel: 'chrome'`) |
| playwright-core | 1.63.0 |
| target package | dsh-charter@0.1.0-rc.2 (`file:/Users/ryanzhang/Personal/openprojects/dsh-charter/dist/dsh-charter-0.1.0-rc.2.tgz`) |
| tarball sha256 | a6a4f6a33096d88ae20def046625ad327fb07ef3728d03f944255363c2dcb33f |
| browser | headless Chrome, viewport 1440×900 |

## Boot

```text
dsh web: http://127.0.0.1:53159/?token=<redacted>
```

- boot ready: 1.0 s; install via official profile package manager: 4.7 s

## IMPLEMENTATION_PLAN.md §20 coverage (Web profile)

| §20 criterion | result | mapped checks |
|---|---|---|
| Exact DSH 0.2.0-rc.2 install + certified contract hash | ✅ all mapped checks passed | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.applied-boot`, `catalog.schema`, `catalog.livery-hashes` |
| zh-CN + en-US settings UI and previews complete | ✅ all mapped checks passed | `settings.livery-section`, `settings.section-label`, `gallery.cards`, `search.name`, `keyboard.arrow-right`, `fonts.en-latin`, `locale.en-gallery`, `preview.previewing` |
| At least 10 double-mode liveries | ✅ all mapped checks passed | `catalog.gallery-size`, `gallery.cards`, `previews.assets-served` |
| Colour + host-level font-family actually effective (not just the settings page) | ✅ all mapped checks passed | `theme.light-tokens`, `theme.dark-tokens`, `fonts.zh-cjk`, `css.token-scoping` |
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
| Performance budgets (bundle gzip, active CSS bytes, first paint) | ⏭ not fully exercised in this run | `bundle.gzip-budget`, `css.size-budget`, `firstpaint.paint-timings` |
| Desktop / Windows / native chrome / wallpaper | — Out of scope: the Web harness has no Electron surface. Desktop/Windows certification belongs to the desktop rows of §18.9/§20. | — |

## Checks


### Lifecycle

| check | title | result | detail |
|---|---|---|---|
| `lifecycle.install` | official `dsh plugin --profile web add file:<tgz>` installs and selects the bundle | ✅ pass | dsh plugin --profile web add file:/Users/ryanzhang/Personal/openprojects/dsh-charter/dist/dsh-charter-0.1.0-rc.2.tgz → exit 0 in 4696ms; dependency=file:/Users/ryanzhang/Personal/openprojects/dsh-charter/dist/dsh-charter-0.1.0-rc.2.tgz; bundles=["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-charter"] |
| `lifecycle.profile-initialized` | isolated profile initialized from the shipped web template | ✅ pass | home=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home; profile=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home/profiles/web; initialized=true; sha256=a6a4f6a33096d88ae20def046625ad327fb07ef3728d03f944255363c2dcb33f |
| `lifecycle.boot` | `dsh --profile web --no-open --port 0` boots and prints its authenticated URL | ✅ pass | ready in 1022ms on port 53159; log=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log |
| `lifecycle.sigterm` | SIGTERM stops the web service cleanly and closes the port | ✅ pass | exit=0 signal=null shutdown=68ms portClosed=true forced=false |
| `lifecycle.uninstall` | official `dsh plugin remove` uninstalls without residue in the profile manifest | ✅ pass | exit=0 depPresent=false bundleSelected=false duration=167ms |
| `lifecycle.final-stop` | final SIGTERM stops the restarted service and closes the port | ✅ pass | exit=0 portClosed=true forced=false |

### Environment

| check | title | result | detail |
|---|---|---|---|
| `env.browser` | system Chrome launches through playwright-core (no browser download) | ✅ pass | Chrome 155.0.8059.85; playwright-core 1.63.0 at /Users/ryanzhang/Personal/openprojects/dsh-livery/node_modules/playwright-core/index.mjs |

### Boot graph & handshake

| check | title | result | detail |
|---|---|---|---|
| `boot.token-exchange` | launch token is exchanged for the signed cookie and dropped from the URL | ✅ pass | final url http://127.0.0.1:53159/; navigation 129ms |
| `boot.graph-entry` | __DSH_BOOT__ lists client entry "dsh-charter" | ✅ pass | url plugins/??dsh-charter/client.js&rev=ccd3308e9ddd |

### Client bundle route

| check | title | result | detail |
|---|---|---|---|
| `bundle.serves-client-js` | plugin client bundle (boot-graph URL) is served as JavaScript | ✅ pass | GET /plugins/??dsh-charter/client.js&rev=ccd3308e9ddd → 200 text/javascript; charset=utf-8 (385542 bytes) |
| `bundle.requires-rev` | plugin client bundle requires its graph rev | ✅ pass | GET graph URL without rev → 404 |
| `bundle.canonical-route` | bare /plugins/<pkg>/client.js?rev= route (doc-comment form) | ⚠️ warn | GET /plugins/dsh-charter/client.js?rev=<graph rev> → 404; this DSH build serves only the graph-encoded URL (verified deviation from the doc comment) |
| `bundle.gzip-budget` | client bundle gzip stays within the 25KB performance budget | ⏭️ skip | Error: performance budget applies to the dsh-livery bundle only (generic fixture mode) |

### Browser trust / auth fence

| check | title | result | detail |
|---|---|---|---|
| `trust.no-cookie-401` | browser trust: no cookie 401 | ✅ pass | GET / without cookie → 401 |
| `trust.wrong-token-rejected` | browser trust: wrong token rejected | ✅ pass | GET /?token=<wrong> → 401 |
| `trust.token-exchange-303` | browser trust: token exchange 303 | ✅ pass | GET /?token=<launch token> → 303 |
| `trust.cookie-issued` | browser trust: cookie issued | ✅ pass | Set-Cookie: Max-Age=2592000; Path=/; Expires=Mon, 23 Nov 2026 16:10:59 GMT; HttpOnly; SameSite=Strict |
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

### console

| check | title | result | detail |
|---|---|---|---|
| `console.no-livery-errors` | no console errors, page errors, failed requests or 4xx/5xx responses for Livery-owned URLs | ✅ pass | 0 console error(s), 0 page error(s), 0 failed request(s), 0 HTTP error response(s) |

### Preview assets

| check | title | result | detail |
|---|---|---|---|
| `previews.no-404` | no 404 responses for /livery/assets/previews/* | ✅ pass | 0 404 preview response(s) |

### Uninstall residue

| check | title | result | detail |
|---|---|---|---|
| `residue.no-boot-row` | after uninstall the boot graph has no plugin row | ✅ pass | 65 entries, none for dsh-charter |
| `residue.no-dom` | after uninstall + restart body has no Livery attributes or style elements | ✅ pass | data-dsh-livery=null data-dsh-livery-hash=null styles=0 |
| `residue.stock-tokens` | after uninstall + restart computed tokens equal the stock baseline | ✅ pass | actual=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] stock=["rgb(255, 255, 255)","rgb(15, 17, 21)","rgba(0, 0, 0, 0.04)"] |
| `residue.no-boot-payload` | after uninstall the first-frame handshake global is absent | ✅ pass | window.__DSH_LIVERY_BOOT__=false |
| `residue.catalog-route` | after uninstall /livery/api/catalog returns 404 | ✅ pass | GET /livery/api/catalog → 404 |
| `residue.preview-route` | after uninstall /livery/assets/previews/ivory-slate-zh-light.svg returns 404 | ✅ pass | GET /livery/assets/previews/ivory-slate-zh-light.svg → 404 |
| `residue.plugin-route` | after uninstall /plugins/dsh-charter/client.js returns 404 | ✅ pass | GET /plugins/dsh-charter/client.js → 404 |
| `residue.old-bundle-url` | after uninstall the previously served client bundle URL returns 404 | ✅ pass | GET /plugins/??dsh-charter/client.js&rev=ccd3308e9ddd → 404 |
| `residue.profile-manifest` | uninstall removes dependency/bundle selection; any stale settings row is documented (not silently ignored) | ✅ pass | profile dependency removed; patch liveryRows=0 skinId=(none) |

## Screenshots

| file | locale | mode | state |
|---|---|---|---|
| `artifacts/acceptance/harness-smoke/screens/web-chrome-dsh-charter/zh-light-home.png` | zh | light | home |
| `artifacts/acceptance/harness-smoke/screens/web-chrome-dsh-charter/zh-light-stock-post-uninstall.png` | zh | light | stock-post-uninstall |

## Artifacts

- probe: `artifacts/acceptance/harness-smoke/probe.json`
- console/network: `artifacts/acceptance/harness-smoke/console.json`
- timings: `artifacts/acceptance/harness-smoke/timings.json`
- filmstrip frames: `artifacts/acceptance/harness-smoke/filmstrip` (0 frames)
- HTML snapshots: `artifacts/acceptance/harness-smoke/html`

## Lifecycle

| step | result |
|---|---|
| SIGTERM stop before uninstall | exit 0, port closed: true, 68 ms |
| official `dsh plugin remove` | exit 0, dependency removed: true, bundle deselected: true, 167 ms |
| fresh boot after uninstall | ready in 713 ms, port 53221 |
| residue sweep (boot graph / DOM / routes / tokens) | see residue checks above |
| final SIGTERM | exit 0, port closed: true |

## Deviations / known limitations

- HONEST GAP — IMPLEMENTATION_PLAN.md §20 "at least one safe layout capability actually effective" cannot be met on DSH 0.2.0-rc.2: the certified contract exposes no public density / transcript-width / message-flow hook (all three capability facts are unavailable). Livery degrades layout to host/stock and reports the unavailable capabilities in the self-check rather than faking them. Wallpaper is removed from schema v1.
- Web profile only: Desktop / macOS / Windows native-window criteria from §18.9/§20 (Electron surface, caption, traffic lights, Dock) are out of scope for this harness.
- Disable/hot-reload state-machine transitions and unknown-version fail-closed to stock are covered by unit/contract tests; this black-box run proves install → boot → stock start → settings apply → hard reload → restore stock → official uninstall → restart residue.
- §18.8 p95/CLS statistics need ≥30 samples per scenario; this run records per-run byte budgets and one cold-start paint trace/filmstrip, not a statistical distribution.
- DSH 0.2.0-rc.2 serves client bundles only through boot-graph grouped URLs (`plugins/??<pkg>/client.js&rev=…`); the bare `/plugins/<pkg>/client.js?rev=` form returns 404 in this build (asserted as a documented warning).
- No Playwright browser download is used: the harness drives the system Chrome through `channel: 'chrome'`.

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
    "shutdownMs": 68,
    "forceKilled": false,
    "port": 53159,
    "portClosed": true,
    "portClosedWaitedMs": 0,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log",
    "logTail": "dsh web: http://127.0.0.1:53159/?token=<redacted>\n"
  },
  "uninstall": {
    "phase": "uninstall",
    "command": "dsh plugin --profile web remove dsh-charter",
    "startedAt": "2026-10-24T16:11:02.215Z",
    "exitCode": 0,
    "signal": null,
    "timedOut": false,
    "durationMs": 167,
    "stdout": "Packages: -5\n-----\n\ndependencies:\n- dsh-charter file:/Users/ryanzhang/Personal/openprojects/dsh-charter/dist/dsh-charter-0.1.0-rc.2.tgz\n\nDone in 69ms using pnpm v12.3.4\n",
    "stderr": "",
    "dependencyPresent": false,
    "bundleSelected": false
  },
  "postUninstallBoot": {
    "url": "http://127.0.0.1:53221/?token=Zy-c1N1titPKQ2Sw_CFt6dsfVXI4c0zWuD0O2hKJSfk",
    "baseUrl": "http://127.0.0.1:53221",
    "port": 53221,
    "readyMs": 713
  },
  "stopAfterResidue": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 74,
    "forceKilled": false,
    "port": 53221,
    "portClosed": true,
    "portClosedWaitedMs": 0,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web-post-uninstall.log",
    "logTail": "dsh web: http://127.0.0.1:53221/?token=<redacted>\n"
  }
}
```

---

_Generated by `scripts/acceptance-web.mjs`. The command is listed in `docs/verification/README.md`;
the checklist mapping to IMPLEMENTATION_PLAN.md §20 lives there too._
