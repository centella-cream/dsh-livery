# Web profile runbook — DSH 0.2.0-rc.2 (`dsh-livery`)

Read-only research, 2026-10-24. The server was never booted here (sandbox blocks `~/.dsh` writes), so live-server outputs are marked **UNVERIFIED**; code claims cite `/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/` (below `$PKG/`).

## 0. Environment (verified)

| item | value |
|---|---|
| CLI / runtime | `dsh` 0.2.0-rc.2, Node v22.23.1 (fnm), `pnpm` 12.3.4; binary `…/node-versions/v22.23.1/installation/bin/dsh` if PATH lacks it |
| probe tools | `curl`, `jq`, `lsof`, `shasum`, `python3` present; `timeout` is **absent** on this macOS |
| home / profile | `DSH_HOME=/Users/ryanzhang/.dsh`, `~/.dsh/profiles/web` |
| bundles | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, `dsh-context`, `dsh-charter`; `dsh.profile.patchReload: live` |
| default bind | `127.0.0.1:3080` (`$PKG/dsh-web-app/cordis.patch.yml` webserver row, `webStartup.port ?? 3080`) |
| Chrome | 155.0.8059.85 (`/Applications/Google Chrome.app`), headless works |
| Playwright | no global/local install; `playwright-core@1.61.0-alpha-1778188671000` in `~/.npm/_npx/dd6c45a6a1785775/node_modules/playwright-core`; registry latest `1.64.1` |
| other drivers | no puppeteer, no chromedriver; no `ms-playwright` browsers (only launch markers) |

## 1. Install / uninstall lifecycle

### 1.1 What `dsh plugin --profile web add <spec>` does

`$PKG/../../lib/bin.js:115-127` → `lib/plugin-BGnVfe_D.js` (`runPlugin`) → `@deepseek-ai/dsh-plugin-manager/operations` `runPluginCommand` (`$PKG/dsh-plugin-manager/lib/types/operations.js:526`) → `runProfilePnpm` (`:438`):

1. `mkdir -p` profile, take write lock `<profile>/package.json.lock` (`$PKG/dsh-atomic-write/lib/index.js:188`); if `package.json` is missing, `initProfile` + `dsh: initialized profile web at <dir>`.
2. Snapshot `package.json` + `pnpm-lock.yaml` (restored on failure).
3. Peer preflight per named spec (local directory → its `package.json`; registry name → `pnpm view`): any `peerDependencies` on `@deepseek-ai/dsh*` not satisfying `0.2.0-rc.2` (prereleases included) rejects before pnpm. Tarball/git specs can only be judged **after** install (fetch needed), then restored on refusal.
4. `execa("pnpm", [...args], { cwd: profileDir, env: process.env, stdio: "inherit" })`. Relative specs (`./x.tgz`, `../x.tgz`, `file:./x.tgz`) are anchored against the **caller cwd** (`anchorPathSpec`); bare `file:dist/x.tgz` is not.
5. Exit 0 → `reconcile()` (`$PKG/dsh-plugin-manager/lib/index.js:238`): each **new** direct dependency declaring `dsh.bundle.patch` is appended to `dsh.profile.bundles`; otherwise `dsh: warning: <name> declares no dsh.bundle — installed as a plain dependency, not a profile layer`. Existing selections are kept (never auto re-enabled).
6. Each run logs to `~/.dsh/profiles/web/.plugin-manager/logs/operation-XXXXXX/pnpm.log` (+ transient `run.json`). Exit code = pnpm's; `127` = pnpm missing. **`cordis.patch.yml` is never written by install** — rows must self-insert from the package's `dsh.bundle.patch` (dsh-charter model: `- insert: [{id: charter, name: dsh-charter}]`).

### 1.2 Files touched by `add`

| path | change |
|---|---|
| profile `package.json` | `dependencies["dsh-livery"]="file:<abs tgz>"`; appended to `dsh.profile.bundles` |
| profile `pnpm-lock.yaml` | importer entry + tarball integrity |
| profile `node_modules/**` | package copied/hoisted (+ `.modules.yaml`) |
| profile `.plugin-manager/logs/operation-*/pnpm.log` | retained diagnostics |
| profile `package.json.lock` | transient lock (also taken by read-only `dsh plugin … why`) |
| `~/Library/pnpm/store/v11/**` | pnpm store (`pnpm store path` *inside the profile*) |
| profile `cordis.yml` | boot only; rewritten to the constant empty-root template on every boot |

### 1.3 Exact commands + expected result

```sh
cd /Users/ryanzhang/Personal/openprojects/dsh-livery
dsh plugin --profile web add file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dist/dsh-livery-0.1.0-rc.2.tgz
# or relative (anchored to cwd): dsh plugin --profile web add ./dist/dsh-livery-0.1.0-rc.2.tgz
```
Expected stdout (pnpm 12 shape; exact line for this package **UNVERIFIED**):
```
Progress: resolved 1, reused 0, downloaded 1, added 1, done
dependencies:
+ dsh-livery file:/…/dist/dsh-livery-0.1.0-rc.2.tgz
Done in 1.2s using pnpm v12.3.4
```
exit `0`; then `jq '.dependencies["dsh-livery"], .dsh.profile.bundles' ~/.dsh/profiles/web/package.json`. Failures: preflight → `dsh: installation rejected: Plugin dsh-livery@… is incompatible …` + `nothing was installed`, exit `1`, pnpm never runs; pnpm failure → pnpm's code + `dsh: plugin command failed; diagnostics: <logPath>`; pnpm absent → `dsh: pnpm was not found…`, exit `127`. Boot re-checks bundle peers; a mismatch is **skipped** (`skippedBundles`) and contributes no rows (`$PKG/dsh-app-boot/README.md` §Profiles).
Tarball prerequisites (checked after pnpm): `dsh.bundle.patch` file included in the package `files`, a `dsh.client` declaration with `platform: "web"`, and DSH peers accepting `0.2.0-rc.2` (or none). A malformed bundle patch fails **after** download, leaving pnpm's files behind.

### 1.4 Uninstall and residue

```sh
dsh plugin --profile web remove dsh-livery    # expect "- dsh-livery …", exit 0
```
CLI order: pnpm removes from manifest/lock/`node_modules`, then `reconcile` drops it from `dsh.profile.bundles` (the service deselects first; CLI is post-hoc). Residue: `.plugin-manager/logs/**` (never cleaned), pnpm-store entries, `pnpm-workspace.yaml` `allowBuilds`, `compatibility.json` if granted, and any rows you hand-added to `cordis.patch.yml` (the bundle's own inserts vanish). A failed remove "may leave dependencies partially changed" and keeps the bundle deselected (`$PKG/dsh-plugin-manager/README.md` §Failure behavior). Check: `jq -e '.dependencies["dsh-livery"]==null and (.dsh.profile.bundles|index("dsh-livery")==null)'`. UNVERIFIED: exact hoisted orphans; pruned by the next package operation.

### 1.5 Proving the entry is composed (`--dump-config`)

`runDumpConfig` composes bundle layers + profile patch + `$DSH_HOME/cordis.patch.yml` and prints `# == <source>` groups (`$PKG/../../lib/dump-config-BEDI-dNY.js`; renderer `$PKG/dsh-app-boot/lib/index.js:3604`):

```sh
dsh --profile web --dump-config > /tmp/web-dump.yml
awk '/^# == dsh-livery/{f=1} /^# == /&&!/dsh-livery/{if(f)exit} f' /tmp/web-dump.yml | head -30
```
A `# == dsh-livery` group with the inserted rows proves admission; its absence = not selected, unreadable, or skipped for incompatible DSH peers. **It always rewrites `cordis.yml` first** (`prepareProfile:189`), so it is not read-only; in this sandbox it dies (same for `dsh --profile web --help`, before help is printed):

```
Error: EPERM: operation not permitted, open '/Users/ryanzhang/.dsh/profiles/web/cordis.yml'   # exit 1
```
`cordis.yml` sha256 stayed `e63968eb…` (byte-identical rewrite blocked).

## 2. Web profile boot

### 2.1 Flags (`$PKG/dsh-web-app/lib/startup.js`)

| flag | effect / default |
|---|---|
| `--host <host>` | bind host, composed default `127.0.0.1`; `0.0.0.0` rejected (`error: --host 0.0.0.0 is intentionally not supported…`) |
| `--port <n>` | composed default `3080`; `0` = OS-assigned; non-numeric rejected |
| `--no-open` | skip default-browser handoff (SSH launch already suppresses it) |
| `--trusted-host <authority...>` | repeatable extra `/api` fence authorities (off-loopback only) |
| `--headless` | **does not exist** for web; use `--no-open` (or `dsh --profile headless`) |

`dsh web` ≡ `dsh --profile web`; flags follow the launcher flags.

### 2.2 Isolated instance on a fixed port / clean stop

```sh
mkdir -p research/profile-probe/.run
dsh --profile web --no-open --port 3081 > research/profile-probe/.run/web.log 2>&1 &
echo $! > research/profile-probe/.run/web.pid
for i in $(seq 1 120); do grep -q '^dsh web:' research/profile-probe/.run/web.log && break; sleep 0.5; done
grep '^dsh web:' research/profile-probe/.run/web.log   # dsh web: http://127.0.0.1:3081/?token=<hex> [ (LAN: …)]
kill -TERM "$(cat research/profile-probe/.run/web.pid)"; wait    # graceful: exit 0 (SIGINT → 130)
lsof -nP -iTCP:3081 -sTCP:LISTEN                                  # empty = stopped
```
The `dsh web:` line appears only after the Loader tree settles, the required-entry audit passes and Connection auth exists (`$PKG/dsh-web-app/lib/index.js:194-218`). Ports 3080/3081 are free today; `60229` belongs to the live GUI (different process). Avoid `kill -9` unless disposal exceeds the 5 s bounded shutdown.

### 2.3 Browser trust / authentication (what a Playwright page must do)

* Every request passes the Host/Origin fence (`$PKG/dsh-client-connection/lib/index.js:202-210`): `Host` must be loopback (`localhost`, `[::1]`, `127.0.0.0/8`) or a `trustedHosts`/`--trusted-host` entry (exact `host:port`, or port-less = any port). If `Origin` is present it must equal the Host; `sec-fetch-site: cross-site` refused. → **403**.
* Each process mints a launch token. `GET /?token=…` → **303** `Location: ./` + signed, host/port-bound cookie (`HttpOnly; SameSite=Strict; Path=/`, 30 d, no `Secure`); missing/wrong cookie → **401**. Token only on `GET /`, no query token elsewhere, no Authorization header. Static assets and `/plugins/**` are public.
* So: `page.goto(<printed URL>)` **once**, let it redirect; the context keeps the cookie (also for the `/api/remote.mux` WebSocket). Do not inject `Origin`/Authorization headers — same-origin fetch already matches.

### 2.4 curl probe (no browser)

```sh
BASE=http://127.0.0.1:3081; TOKEN=$(grep -o 'token=[0-9A-Za-z_-]*' research/profile-probe/.run/web.log | head -1 | cut -d= -f2)
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/"                                        # 401
curl -s -D - -o /dev/null -c research/profile-probe/.run/cookies.txt "$BASE/?token=$TOKEN" | head -5
#   HTTP/1.1 303 See Other / Location: ./ / Set-Cookie: …; Path=/; HttpOnly; SameSite=Strict
curl -s -b research/profile-probe/.run/cookies.txt -o research/profile-probe/.run/index.html -w '%{http_code}\n' "$BASE/"   # 200
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: evil.example' "$BASE/"                 # 403
grep -o '/plugins/dsh-livery/client.js?rev=[^"]*' research/profile-probe/.run/index.html | head -1
```
Loaded-plugin signal: inline `globalThis["__DSH_BOOT__"] = {rev, entries:[{id,url,…}], batches:[…]}` contains `{"id":"dsh-livery","url":"/plugins/dsh-livery/client.js?rev=…"}` (client entry ids are package names, `$PKG/dsh-client-modules/lib/index.js:883`; route uses the same id, `:918`) and that exact URL (rev mandatory; without it 404) returns `200 text/javascript; charset=utf-8`. Host log: no `skippedBundles`/`client-modules:` error. UNVERIFIED live. Automate: `research/profile-probe/probe-http.sh` (401/303/200/403 + bundle route, exit≠0 on failure).

## 3. Browser testing

* **Recommended, zero download:** npx `playwright-core@1.61.0-alpha-1778188671000` + `channel:'chrome'` → system Chrome 155.0.8059.85. Verified here: `research/profile-probe/pw-smoke.mjs` launched headless (UA `HeadlessChrome/155.0.0.0`, `browser.version()==155.0.8059.85`), read computed CSS and screenshot `research/profile-probe/pw-smoke.png`, no console errors. Set `PLAYWRIGHT_BROWSERS_PATH=$PWD/research/profile-probe/.pw-browsers` and a workspace `userDataDir`.
* Optional pin: `playwright-core@1.64.1` (registry `latest`, 2026-10-24) — still **no browser download** with `channel:'chrome'`. No `npm install` is needed for the probe as written.
* Fallback with no packages at all: Node 22 has global `WebSocket`; raw CDP against `--remote-debugging-port`. `puppeteer`/`chromedriver`: absent — do not plan on them.

```sh
PLAYWRIGHT_BROWSERS_PATH=$PWD/research/profile-probe/.pw-browsers \
  node research/profile-probe/probe-web.mjs \
  --token-url "$(grep '^dsh web:' research/profile-probe/.run/web.log | sed 's/^dsh web: //;s/ (LAN.*//')" \
  --out research/profile-probe/.run --expect-plugin dsh-livery
```
Writes `probe-report.json` + `web-light.png`/`web-dark.png`; exits 1 on console/page errors, token not dropped, or missing plugin row.

## 4. Screenshot / probe evidence

* **Console/network:** `page.on('console')` (error+warning), `page.on('pageerror')`, `page.on('requestfailed')`, `page.on('response')` for `/api/` + `/plugins/` + status ≥400; assert the post-redirect URL has no `token=`.
* **Computed CSS:** `getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base'|'--dsw-alias-label-primary'|'--dsh-content-font-size')` (font default `14px`). Dark palette selector `body[data-ds-dark-theme]`; `html[data-ds-theme-source]` ∈ `light|dark|system` (`$PKG/dsh-client-ui-layout/lib/client.js:499-520`).
* **Dark mode:** durable preference is Host settings namespace `ui-theme`, field `preference` ∈ `light|dark|system` (default `system`), `fontSize` 10–22. Writer is `configEditor` → `profileContext.patchPath` (`$PKG/dsh-config-editor/lib/index.js:25`) = **`~/.dsh/profiles/web/cordis.patch.yml`**, row `- id: ui-theme` + `config: {preference: dark}`. (Theme README's `$DSH_HOME/cordis.patch.yml` is the *home* layer, which outranks the profile; it does not exist here — doc drift.) No-write test: keep default `system`, call `page.emulateMedia({colorScheme:'dark'})`. Durable test: Settings → General → Appearance (writes the patch), then re-read the file.
* **Locale:** namespace `locale`, field `preference` (`LOCALE_IDS=["zh","en"]`); this profile already pins `- id: locale / config: {preference: zh}`. `<html lang>` = `zh-CN` for zh, `en` for en (`$PKG/dsh-client-locale/lib/client.js:1174`). Force `en` by editing that row (escalated) then reload/restart; web has no per-page override (`__DSH_LOCALE__` is a native-shell bridge). Settings writes are refused when a higher layer (home patch / `--patch`) overrides the same entry.

## 5. Sandbox escalation — exact minimal set

Workspace-write policy: every write outside `/Users/ryanzhang/Personal/openprojects/dsh-livery` is EPERM. Request one approval covering:

1. `dsh plugin --profile web add file:<abs>/dist/dsh-livery-0.1.0-rc.2.tgz` — writes profile `{package.json,pnpm-lock.yaml,node_modules,.plugin-manager}` **and** `~/Library/pnpm/store/v11`.
2. `dsh plugin --profile web remove dsh-livery` — same paths.
3. `dsh --profile web --dump-config` — writes `~/.dsh/profiles/web/cordis.yml` only (result to stdout).
4. `dsh --profile web --no-open --port 3081` (background) — rewrites `cordis.yml`, then writes `~/.dsh/sessions/**`, `~/.dsh/storages/**` and reads `~/.dsh/.credentials.yaml`.

No escalation: all `curl`/`jq`/`lsof` probes, reading `~/.dsh` or package files, and `node research/profile-probe/probe-web.mjs` (writes only `research/profile-probe/**`). Process signals need no fs scope. Note: **every** `dsh plugin …` call takes `package.json.lock`, even `why`.

## 6. Twelve-line summary

1. Install: `dsh plugin --profile web add file:/…/dist/dsh-livery-0.1.0-rc.2.tgz` (escalated).
2. Internals: profile lock → DSH-peer preflight → `pnpm add` in the profile → bundle appended to `dsh.profile.bundles`.
3. Files: profile `package.json`, `pnpm-lock.yaml`, `node_modules`, `.plugin-manager/logs`, pnpm store; never `cordis.patch.yml`.
4. Uninstall: `dsh plugin --profile web remove dsh-livery`; residue = logs/store/build approvals/optional manual patch rows.
5. Proof: `dsh --profile web --dump-config` → `# == dsh-livery` group (it also rewrites `cordis.yml`, hence EPERM today).
6. Boot: `dsh --profile web --no-open --port 3081`; host `127.0.0.1`, port `3080` default; no `--headless`.
7. Readiness: `dsh web: http://127.0.0.1:3081/?token=<hex>`; stop with SIGTERM (exit 0).
8. Auth: token → 303 → signed cookie on `GET /`; Host/Origin fence 403, no cookie 401; static/plugins public.
9. Verify plugin: `__DSH_BOOT__.entries` has `dsh-livery` and `/plugins/dsh-livery/client.js?rev=…` returns 200.
10. Browser: npx `playwright-core` 1.61.0-alpha + `channel:'chrome'` (Chrome 155.0.8059.85), zero download; 1.64.1 on registry.
11. Evidence: console/pageerror/requestfailed, computed `--dsw-*`/`--dsh-content-font-size`, `data-ds-dark-theme`, `<html lang>`; dark via `emulateMedia` or `ui-theme` row.
12. Escalate only: install/remove, `--dump-config`, server boot (cordis.yml, sessions, storages, pnpm store).
