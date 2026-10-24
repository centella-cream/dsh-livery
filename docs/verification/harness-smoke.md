# Harness mechanics smoke — dsh-charter fixture (generic mode, not a dsh-livery acceptance run)

Run `2026-10-24T15-55-08-647Z-isolated` · isolated DSH_HOME · **36 passed / 0 failed / 1 skipped / 1 warnings** · RESULT: PASS

## Environment

| item | value |
|---|---|
| date | 2026-10-24T15:55:17.480Z |
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
dsh web: http://127.0.0.1:64392/?token=<redacted>
```

- boot ready: 909 ms; install via official profile package manager: 2.3 s

## Checks

### Lifecycle

| check | title | result | detail |
|---|---|---|---|
| `lifecycle.install` | official `dsh plugin --profile web add file:<tgz>` installs and selects the bundle | ✅ pass | dsh plugin --profile web add file:/Users/ryanzhang/Personal/openprojects/dsh-charter/dist/dsh-charter-0.1.0-rc.2.tgz → exit 0 in 2255ms; dependency=file:/Users/ryanzhang/Personal/openprojects/dsh-charter/dist/dsh-charter-0.1.0-rc.2.tgz; bundles=["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-charter"] |
| `lifecycle.profile-initialized` | isolated profile initialized from the shipped web template | ✅ pass | home=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home; profile=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/dsh-home/profiles/web; initialized=true; sha256=a6a4f6a33096d88ae20def046625ad327fb07ef3728d03f944255363c2dcb33f |
| `lifecycle.boot` | `dsh --profile web --no-open --port 0` boots and prints its authenticated URL | ✅ pass | ready in 909ms on port 64392; log=/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log |
| `lifecycle.sigterm` | SIGTERM stops the web service cleanly and closes the port | ✅ pass | exit=0 signal=null shutdown=267ms portClosed=true forced=false |
| `lifecycle.uninstall` | official `dsh plugin remove` uninstalls without residue in the profile manifest | ✅ pass | exit=0 depPresent=false bundleSelected=false duration=200ms |
| `lifecycle.final-stop` | final SIGTERM stops the restarted service and closes the port | ✅ pass | exit=0 portClosed=true forced=false |

### Environment

| check | title | result | detail |
|---|---|---|---|
| `env.browser` | system Chrome launches through playwright-core (no browser download) | ✅ pass | Chrome 155.0.8059.85; playwright-core 1.63.0 at /Users/ryanzhang/Personal/openprojects/dsh-livery/node_modules/playwright-core/index.mjs |

### Boot graph & handshake

| check | title | result | detail |
|---|---|---|---|
| `boot.token-exchange` | launch token is exchanged for the signed cookie and dropped from the URL | ✅ pass | final url http://127.0.0.1:64392/; navigation 147ms |
| `boot.graph-entry` | __DSH_BOOT__ lists client entry "dsh-charter" | ✅ pass | url plugins/??dsh-charter/client.js&rev=01c86f621a21 |

### Client bundle route

| check | title | result | detail |
|---|---|---|---|
| `bundle.serves-client-js` | plugin client bundle (boot-graph URL) is served as JavaScript | ✅ pass | GET /plugins/??dsh-charter/client.js&rev=01c86f621a21 → 200 text/javascript; charset=utf-8 (385542 bytes) |
| `bundle.requires-rev` | plugin client bundle requires its graph rev | ✅ pass | GET graph URL without rev → 404 |
| `bundle.canonical-route` | bare /plugins/<pkg>/client.js?rev= route (doc-comment form) | ⚠️ warn | GET /plugins/dsh-charter/client.js?rev=<graph rev> → 404; this DSH build serves only the graph-encoded URL (verified deviation from the doc comment) |
| `bundle.gzip-budget` | client bundle gzip stays within the 25KB performance budget | ⏭️ skip | Error: performance budget applies to the dsh-livery bundle only (generic fixture mode) |

### Browser trust / auth fence

| check | title | result | detail |
|---|---|---|---|
| `trust.no-cookie-401` | browser trust: no cookie 401 | ✅ pass | GET / without cookie → 401 |
| `trust.wrong-token-rejected` | browser trust: wrong token rejected | ✅ pass | GET /?token=<wrong> → 401 |
| `trust.token-exchange-303` | browser trust: token exchange 303 | ✅ pass | GET /?token=<launch token> → 303 |
| `trust.cookie-issued` | browser trust: cookie issued | ✅ pass | Set-Cookie: Max-Age=2592000; Path=/; Expires=Mon, 23 Nov 2026 15:55:12 GMT; HttpOnly; SameSite=Strict |
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
| `residue.old-bundle-url` | after uninstall the previously served client bundle URL returns 404 | ✅ pass | GET /plugins/??dsh-charter/client.js&rev=01c86f621a21 → 404 |
| `residue.profile-manifest` | uninstall leaves no dependency/bundle/livery config rows | ✅ pass | profile patch skinId=(none) liveryRows=0 |

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

## Deviations / known limitations

- Web profile only: Desktop/native-window criteria from IMPLEMENTATION_PLAN.md §20 are out of scope for this harness.
- system Chrome via playwright-core `channel: 'chrome'`; no Playwright browser download is used.

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
    "shutdownMs": 267,
    "forceKilled": false,
    "port": 64392,
    "portClosed": true,
    "portClosedWaitedMs": 1,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web.log",
    "logTail": "dsh web: http://127.0.0.1:64392/?token=<redacted>\n"
  },
  "uninstall": {
    "phase": "uninstall",
    "command": "dsh plugin --profile web remove dsh-charter",
    "startedAt": "2026-10-24T15:55:15.206Z",
    "exitCode": 0,
    "signal": null,
    "timedOut": false,
    "durationMs": 200,
    "stdout": "Packages: -5\n-----\n\ndependencies:\n- dsh-charter file:/Users/ryanzhang/Personal/openprojects/dsh-charter/dist/dsh-charter-0.1.0-rc.2.tgz\n\nDone in 52ms using pnpm v12.3.4\n",
    "stderr": "",
    "dependencyPresent": false,
    "bundleSelected": false
  },
  "postUninstallBoot": {
    "url": "http://127.0.0.1:64498/?token=h9XYShCzl87PhPk86PQ9GuQvSMz4wLXhiDTCtz6vHOU",
    "baseUrl": "http://127.0.0.1:64498",
    "port": 64498,
    "readyMs": 809
  },
  "stopAfterResidue": {
    "stopped": true,
    "exitCode": 0,
    "signal": null,
    "shutdownMs": 121,
    "forceKilled": false,
    "port": 64498,
    "portClosed": true,
    "portClosedWaitedMs": 0,
    "logPath": "/Users/ryanzhang/Personal/openprojects/dsh-livery/.tmp/acceptance/logs/web-post-uninstall.log",
    "logTail": "dsh web: http://127.0.0.1:64498/?token=<redacted>\n"
  }
}
```

---

_Generated by `scripts/acceptance-web.mjs`. The command is listed in `docs/verification/README.md`;
the checklist mapping to IMPLEMENTATION_PLAN.md §20 lives there too._
