# Verification — Web profile acceptance

> ## Certified host matrix — acceptance evidence (round 3)
>
> Shipped package: `dsh-livery-0.1.0.tgz` sha256
> `19dc6895e8986fab1581c2b22da10e0507811e94f5596a2f32a82fe02b60ac0b`
> (runtime bytes identical to `14327502…`; only certification JSON changed).
>
> | target | host / adapter / catalog profile | result | evidence |
> |---|---|---|---|
> | Web Profile (npm CLI) | 0.2.1-rc.2 · `dsh-0.2.1-rc.2-r1` · `sha256:060e80ef…` | **PASS 121 / 0 / 3 / 1** | [web-acceptance-0.2.1-rc.2.md](web-acceptance-0.2.1-rc.2.md) · `artifacts/acceptance/0.2.1-rc.2-web/` |
> | Web real-profile clone (byte-clone of `~/.dsh/profiles/web`) | 0.2.1-rc.2 · same adapter · same profile | **PASS 121 / 0 / 3 / 3** | [web-acceptance-0.2.1-rc.2-real-profile-clone.md](web-acceptance-0.2.1-rc.2-real-profile-clone.md) · `artifacts/acceptance/0.2.1-rc.2-web-real-profile-clone/` |
> | Desktop app runtime serving a Web carrier (bundled rc.3 CLI) | 0.2.1-rc.3 · `dsh-0.2.1-rc.3-r1` · `sha256:060e80ef…` | **PASS 121 / 0 / 3 / 1** | [web-acceptance-0.2.1-rc.3-runtime-carrier.md](web-acceptance-0.2.1-rc.3-runtime-carrier.md) · `artifacts/acceptance/0.2.1-rc.3-runtime-web-carrier/` |
> | Desktop app — real Electron renderer (isolated app launch, CDP/Playwright) | 0.2.1-rc.3 · same adapter · same profile | **PASS 22 / 0 / 1** (renderer evidence; native window chrome NOT verified) | [desktop-acceptance-0.2.1-rc.3.md](desktop-acceptance-0.2.1-rc.3.md) · `artifacts/acceptance/0.2.1-rc.3-desktop/` |
> | Web Profile (npm CLI) | 0.2.0-rc.2 · `dsh-0.2.0-rc.2-r1` · `sha256:4c5ee1a2…` | **PASS 110 / 0 / 3 / 2** (round-2 evidence retained) | [web-acceptance.md](web-acceptance.md) · `artifacts/acceptance/` |
>
> 3 skips in each Web run are the stock-boot handshake rows (the host emits zero
> rows for `skinId: stock`; re-asserted as `handshake.applied-boot` after Apply).
> Web warnings: the documented rc.2/rc.3 grouped-bundle-URL deviation; the clone
> run additionally records its local dependency-spec repair and one
> non-activating cloned bundle. Desktop renderer: 1 skip = pre-paint rAF
> sampling on the native startup path (host-owned boot-ready injection;
> Playwright attaches after window creation).
>
> **Desktop honesty:** adapted and renderer-verified, but `desktop.macos` stays
> pending in the support matrix: native traffic lights/leading, vibrancy, Dock
> window states, OS DPI behaviour and the packaged Chromium sandbox/GPU path are
> NOT verified. The desktop composition cannot be booted by the CLI; all runtime
> evidence comes from launching the real Electron application with an isolated
> DSH_HOME/user-data-dir. See the desktop report's scope statement. Coexistence
> with `dsh-skin` in a cloned real desktop profile could not be exercised at
> runtime (bundled pnpm 11 refuses the cloned profile's foreign store location);
> the attempt and blocker are recorded in
> `artifacts/acceptance/0.2.1-rc.3-desktop-clone/probe.json`.

This directory holds the evidence reports for the DSH Livery Web-profile
acceptance harness. The harness is a **black-box** test: it installs the packed
tarball through DSH's own profile package manager, boots the real
`dsh --profile web`, and asserts what a user's Chrome can observe. Nothing is
imported from `src/`; no fixture fakes the host.

- Runbook / mechanics: [`scripts/probe/README.md`](../../scripts/probe/README.md)
- Harness entry point: [`scripts/acceptance-web.mjs`](../../scripts/acceptance-web.mjs)
- Standalone runner: [`tests/browser/run.mjs`](../../tests/browser/run.mjs)
- Auto-generated full evidence: [web-acceptance.md](web-acceptance.md)
- Harness mechanics smoke (charter fixture, not a livery result): [harness-smoke.md](harness-smoke.md)

## Commands

```bash
# 1. Full acceptance: isolated DSH_HOME + official install + boot + probe + uninstall.
pnpm build                                  # produces dist/dsh-livery-0.1.0.tgz
node scripts/acceptance-web.mjs --tgz dist/dsh-livery-0.1.0.tgz

# 2. Same via the standalone runner / package script.
node tests/browser/run.mjs --tgz dist/dsh-livery-0.1.0.tgz
pnpm acceptance:web -- --tgz dist/dsh-livery-0.1.0.tgz

# 3. Read-only probe of an already-running real web profile (no install, no boot,
#    no uninstall; preview/cancel only — settings writes are opt-in).
dsh --profile web --no-open --port 0        # copy the printed `dsh web: …` URL
node scripts/acceptance-web.mjs --reuse "http://127.0.0.1:<port>/?token=<hex>"

# 4. Harness mechanics smoke against the dsh-charter fixture (generic mode).
node tests/browser/run.mjs --smoke

# 5. Certified-matrix runs by version (evidence paths used above).
node scripts/acceptance-web.mjs --tgz dsh-livery-0.1.0.tgz \
  --out artifacts/acceptance/0.2.1-rc.2-web \
  --json artifacts/acceptance/0.2.1-rc.2-web/probe.json \
  --report docs/verification/web-acceptance-0.2.1-rc.2.md
node scripts/acceptance-web.mjs --tgz dsh-livery-0.1.0.tgz \
  --clone-from "$HOME/.dsh/profiles/web" \
  --out artifacts/acceptance/0.2.1-rc.2-web-real-profile-clone \
  --json artifacts/acceptance/0.2.1-rc.2-web-real-profile-clone/probe.json \
  --report docs/verification/web-acceptance-0.2.1-rc.2-real-profile-clone.md
node scripts/acceptance-web.mjs --tgz dsh-livery-0.1.0.tgz \
  --dsh-bin "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  --dsh-home /tmp/dsh-livery-rc3-web-home --expect-version 0.2.1-rc.3 \
  --expect-profile-kind desktop \
  --out artifacts/acceptance/0.2.1-rc.3-runtime-web-carrier \
  --report docs/verification/web-acceptance-0.2.1-rc.3-runtime-carrier.md

# 6. Real Electron desktop renderer probe (isolated /tmp DSH_HOME + user-data-dir;
#    never touches the user's running app; renderer screenshots only).
node scripts/probe/desktop-probe.mjs --tgz dsh-livery-0.1.0.tgz \
  --out artifacts/acceptance/0.2.1-rc.3-desktop \
  --report docs/verification/desktop-acceptance-0.2.1-rc.3.md
```

Requirements: Node 22.19+, a certified `dsh` CLI on `PATH` (0.2.0-rc.2 /
0.2.1-rc.2) or the Desktop app runtime (0.2.1-rc.3), system Google Chrome,
`playwright-core` in `node_modules` (`pnpm install`). **No browser download is
ever needed** — Web runs drive `channel: 'chrome'`; Desktop runs launch the real
Electron app through Playwright `_electron`. Expectations are registry-driven:
`scripts/probe/certified-adapters.mjs` mirrors `src/generated/contract.ts`, so a
run asserts the live `(hostVersion, adapterId, contractHash, catalogProfile)`
quadruple and per-profile preview base rather than hardcoded versions.

Isolation: the isolated run creates `.tmp/acceptance/dsh-home` inside the repo
and refuses any path outside `.tmp/`. The user's real `~/.dsh` is never written.
All evidence goes to `artifacts/acceptance/`.

## What the harness does, phase by phase

| phase | what really happens | evidence |
|---|---|---|
| prepare | `dsh plugin --profile web add file:<abs tgz>` on a fresh `DSH_HOME`; the plugin manager initializes the profile from the shipped web template and reconciles the bundle list. Profile patch pre-pins `locale: zh` and suppresses the first-run welcome notice. | install stdout/exit/duration, profile manifest snapshot, plugin-manager logs |
| boot | `DSH_HOME=… dsh --profile web --no-open --port 0`; parse the single `dsh web: http://127.0.0.1:<port>/?token=<hex>` line; SIGTERM stop later must close the port. | `timings.json`, boot log, port-closed result |
| probe | one Playwright navigation to the token URL (303 + cookie), then the assertions below; system Chrome 155 headless, viewport 1440×900. | `probe.json`, `console.json`, screenshots, filmstrip |
| lifecycle | official `dsh plugin --profile web remove dsh-livery`, fresh boot, residue sweep, final SIGTERM. | `probe.json` lifecycle/residue checks |
| report | `probe.json` + auto-filled Markdown (`docs/verification/web-acceptance.md`). | this directory |

## Acceptance checklist mapping (IMPLEMENTATION_PLAN.md §20 → checks)

| §20 / §18 criteria | check ids | notes |
|---|---|---|
| Exact DSH 0.2.0-rc.2 + certified contract | `boot.graph-entry`, `bundle.serves-client-js`, `handshake.boot-global`, `handshake.echo`, `catalog.schema` (`adapterId`, `contractHash` recorded) | `catalog.capabilities` cross-checks the frozen contract facts |
| zh-CN / en-US settings UI + preview complete | `settings.livery-section`, `settings.section-label`, `gallery.*`, `search.*`, `keyboard.*`, `fonts.en-latin`, `locale.en-gallery`, `preview.*` | en pass flips the pinned profile locale, reloads, then restores zh |
| ≥10 dual-mode liveries | `catalog.gallery-size`, `gallery.cards`, `previews.assets-served`, `catalog.token-coverage` | 10 liveries × zh/en × light/dark preview SVGs fetched |
| Colour + host `font-family` actually effective (not just the settings page) | `theme.light-tokens`, `theme.dark-tokens`, `fonts.zh-cjk`, `fonts.en-latin`, `css.token-scoping`, `bundle.gzip-budget` | computed CSS compared against the **served catalog** values, not hard-coded hex |
| Follow host light/dark, never change host preference | `theme.light-tokens`, `theme.dark-tokens`, `theme.light-restored`, `theme.host-preference`, `theme.host-preference-file`, `stock.host-theme-source` | dark via `page.emulateMedia({colorScheme:'dark'})` with `data-ds-theme-source` staying `system`; no `ui-theme` row written |
| Startup filmstrip has no stock-style frame / no takeover flash | `firstpaint.no-stock-frame`, `firstpaint.first-colour`, `firstpaint.paint-timings` | rAF colour samples from the first frame + CDP screencast filmstrip + screenshots |
| Boot handshake consistency | `handshake.boot-global`, `handshake.catalog-url`, `handshake.hash-equality`, `handshake.hash-style-text`, `handshake.boot-style-adopted` | body attr hash = `__DSH_LIVERY_BOOT__.cssHash` = sha256 of the rendered style text |
| 0 `!important`, 0 hash-class selectors, 0 whole-document observers | `css.no-important`, `css.no-hash-selectors`, `selfcheck.css-safety`, `catalog.css-safety-clean`, `css.no-whole-document-observers` | observer count compared stock boot → livery-active boot |
| All contrast gates pass | `catalog.contrast-zero-failures`, `selfcheck.contrast` | compiled catalog values + self-check panel |
| Capability honesty (layout falls back, never fakes) | `catalog.capabilities`, `selfcheck.capabilities`, `css.token-scoping` | theme-css/host-font-family/surface-material available; host-density-tokens/host-transcript-width/host-message-flow unavailable → layout degrades to host/stock |
| Apply is one mutation, durable | `apply.commits`, `apply.one-mutation`, `apply.persists` | profile patch gains exactly one `- id: livery` row with the new `skinId`; survives hard reload |
| Preview is transient; Cancel restores | `preview.previewing`, `preview.style-element`, `preview.card-state`, `preview.cancel`, `preview.cancel-style` | token snapshot before preview is compared after cancel |
| Restore stock | `restore.stock`, `restore.no-styles`, `restore.persists` | body attributes removed, stock tokens restored, durable across reload |
| Browser trust / Origin / CSRF | `boot.token-exchange`, `trust.*` | 401 without cookie, 303 + HttpOnly/SameSite=Strict cookie, `/api` fence 403 for bad Host / Origin / `Sec-Fetch-Site: cross-site` |
| Hard reload, multi-tab, service restart | `apply.persists`, `web.multi-tab`, `lifecycle.sigterm`, `lifecycle.final-stop` | |
| Uninstall leaves no residue | `residue.no-boot-row`, `residue.no-dom`, `residue.stock-tokens`, `residue.no-boot-payload`, `residue.*-route`, `residue.old-bundle-url`, `residue.profile-manifest` | full restart between remove and residue sweep |
| Web layout at 1023/767 widths | `web.no-overflow-1023`, `web.no-overflow-767` | no horizontal overflow with the livery active |
| Forced colors | `theme.forced-colors` | `emulateMedia({forcedColors:'active'})` smoke |
| Performance budgets (§18.8) | `bundle.gzip-budget` (≤25KB gzip), `css.size-budget` (≤12KB hard cap, warns above 8KB target), `firstpaint.paint-timings` | p95 latency/CLS sampling is not part of this single-run harness (see known limitations) |
| Disable / hot-reload residue | — | covered by `tests/unit`/`tests/client` state-machine tests; black-box e2e uses uninstall + restart. Documented in the report's known limitations. |
| Desktop / Windows / native chrome | — | out of scope for the Web harness (§18.9 Desktop rows need Electron) |
| Unknown-version fail-closed to stock | — | covered by host contract tests (needs a forged contract hash; not part of a black-box run) |

## How to read a failure

| failing check | likely cause / first thing to look at |
|---|---|
| `lifecycle.install` | tarball malformed, `dsh.bundle.patch` missing from `files`, peer preflight rejected, pnpm failure — read its `stdout`/`stderr` in `probe.json` and `.plugin-manager/logs/**/pnpm.log` |
| `lifecycle.boot` | `dsh web:` line never printed; boot log tail is in `timings.json`/`.tmp/acceptance/logs/web.log`; often a bundle peer mismatch (`skippedBundles`) |
| `boot.graph-entry` | bundle not selected (`dsh.profile.bundles`), `dsh.client.platform` missing, or client entry failed to load — check `<html>` `__DSH_BOOT__` dump in `artifacts/acceptance/html/index.html` |
| `bundle.serves-client-js` | `exports["./client"]` path wrong or file not shipped; the deviating-form factor is explained below |
| `catalog.*` | Host route not registered, pre-loader gate refused (no boot rows at all), or compiled artifact invalid — read `BootPayload.diagnostics` |
| `handshake.hash-equality` | Client ready path replaced CSS instead of adopting boot style, or boot payload `cssHash` and body hash drift |
| `theme.*-tokens` | token derivation/compile mismatch, host specificity loss, or `body[data-dsh-livery]` not set — compare `probe.json` evidence expected/actual canonical colours |
| `fonts.*` | `:root:lang()` bindings missing or locale pin not applied; headless font availability can make only the `document.fonts.check` warning fire |
| `gallery.cards` / `search.*` / `keyboard.*` / `preview.*` | settings section slot registration, i18n copy drift, gallery keyboard model, or a stale `data-testid`; the check detail lists the visible card ids and current state |
| `apply.one-mutation` | host settings write duplicated/overwrote unrelated patch rows — evidence contains the whole profile patch before/after |
| `restore.*` / `residue.*` | DOM/style cleanup on config change or dispose is incomplete; check `data-dsh-livery-hash`/style ids in `probe.json` |
| `trust.*` | DSH auth/fence regression; `/api` route is the fence boundary |
| `console.no-livery-errors` | Livery-owned URL produced an error/4xx; `console.json` has the filtered lists |

## Verified environment deviations (documented rather than hidden)

1. **Client bundle URL form.** DSH 0.2.0-rc.2 prints boot-graph rows as
   `plugins/??<pkg>/client.js&rev=<rev>` and serves exactly that URL. The bare
   `/plugins/<pkg>/client.js?rev=` form (as noted in earlier research notes)
   returns 404 in this build, so the harness asserts the graph URL and records
   the bare-form result as a warning (`bundle.canonical-route`).
2. **Fence boundary.** `Host`/`Origin`/`Sec-Fetch-Site` checks are enforced on
   `/api` traffic (403). A forged `Host` on the document itself gets 401 because
   the signed cookie is authority-bound — still refused, asserted as such.
3. **Launch token reuse.** The printed token can be exchanged more than once;
   the harness still navigates it once and reuses the cookie.
4. **Isolated first-run overlays.** A fresh home shows the welcome notice and
   API-key onboarding; the harness suppresses/dismisses both so settings
   automation is deterministic. A real profile has already dismissed them.
5. **Locale.** The isolated web template does not pin a locale; the harness
   writes the same `- id: locale / preference: zh` row the real web profile
   uses. The en pass flips that row and restores it afterwards.
6. **Reuse mode is read-only.** `--reuse` performs no install/boot/uninstall and
   skips apply/restore unless `--unsafe-mutate` is passed; preview+cancel and
   all reads still run.

## Known limitations of this harness

- Desktop/macOS/Windows/native-chrome criteria of §18.9/§20 need the Electron
  surface and are out of scope here.
- The harness proves *presence and correctness of the warning* for the layout
  capability gate (density/transcript/message-flow are absent in DSH
  0.2.0-rc.2); it cannot prove a layout capability actually takes effect
  because the certified host exposes none. This is reported as a §20 gap, not
  papered over.
- Disable/hot-reload state-machine transitions and unknown-version fail-closed
  are covered by unit/contract tests, not by this single black-box run.
- §18.8 p95/CLS statistics need ≥30 samples per scenario; this harness records
  one startup trace (FCP/first-paint, filmstrip frames) and per-run byte
  budgets, not a statistical distribution.
