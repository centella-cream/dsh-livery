# Verification

## Release `0.2.1` (current published)

The `0.2.1` artifact is `dsh-livery-0.2.1.tgz`, published on npm `latest`. Its
exact sha256 (`78f1c8d1…`), byte size **3,529,494 B** and build commit are recorded
in the committed evidence JSON under `contracts/dsh/evidence/0.2.1/`. The
repository working tree contains post-0.2.1 packaged-doc and screenshot changes
that are `0.2.2` material; they are **not** part of the published 0.2.1 tarball,
and the accepted 0.2.1 evidence must never be rebound to them.

The accepted artifact was installed from the exact tarball and probed on all 13
declared scopes (7 Web + 6 Desktop, eight host adapters):

| Host | Profile / platform | Runtime | Result |
|---|---|---|---|
| DSH `0.2.1-rc.2` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **275 pass / 0 fail / 4 skip / 2 warn** |
| DSH `0.2.1-rc.4` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **275 pass / 0 fail / 4 skip / 2 warn** |
| DSH `0.2.1-rc.5` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **275 pass / 0 fail / 4 skip / 2 warn** |
| DSH `0.2.2-rc.1` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **275 pass / 0 fail / 4 skip / 2 warn** |
| DSH `0.2.2-rc.2` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **275 pass / 0 fail / 4 skip / 2 warn** |
| DSH `0.2.2-rc.3` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **275 pass / 0 fail / 4 skip / 2 warn** |
| DSH `0.2.2-rc.5` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **275 pass / 0 fail / 4 skip / 2 warn** |
| DSH `0.2.1-rc.3` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **35 pass / 0 fail / 2 skip / 0 warn** |
| DSH `0.2.1-rc.5` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **35 pass / 0 fail / 2 skip / 0 warn** |
| DSH `0.2.2-rc.1` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **35 pass / 0 fail / 2 skip / 0 warn** |
| DSH `0.2.2-rc.2` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **35 pass / 0 fail / 2 skip / 0 warn** |
| DSH `0.2.2-rc.3` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **35 pass / 0 fail / 2 skip / 0 warn** |
| DSH `0.2.2-rc.5` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **35 pass / 0 fail / 2 skip / 0 warn** |

Evidence:

- `contracts/dsh/evidence/0.2.1/` contains one JSON per declared scope (13 files),
  plus sanitized raw probes, reports and canonical audit envelopes.
- Each evidence file binds the exact tarball sha256/bytes, probe/report sha256,
  critical check ids, build commit and audit envelope; schema v2 re-derives
  critical checks from probe statuses rather than trusting a self-reported list.
- `pnpm prepublishOnly` verifies all 13 declared-scope files against the final
  candidate.
- The accepted probe measured the client bundle at **60,902 B gzip / 230,487 B
  raw** against the then-current 60 KiB (61,440 B) cap, and the largest livery CSS
  at **9,066 B** (bauhaus) against the 13,312 B cap.

Every run used the official plugin install path from a fresh isolated `DSH_HOME`
and its own run directory; concurrent suites are run serially and never share a
`DSH_HOME`. Web runs used the
declared Node runtime and Playwright with the exact certified Chrome build, and
Desktop runs drove the real Electron renderer with an isolated
`DSH_HOME`/user-data dir. A real-profile clone run remains a supplementary
diagnostic and is intentionally **not** part of formal release evidence: only
isolated-home runs are authoritative.

The Desktop probe records `desktop.sidebar-path` from the real `sidebarCol` DOM
background and compares it with the host-composited target (`fillAlpha × host
tint factor`), not with the tint token. The Web probe covers the merged
preset/wallpaper checks and the Settings floating-surface check; the Desktop
probe covers the Electron renderer surface, not native window shell/vibrancy.

## Release `0.2.2` (target, acceptance pending)

`0.2.2` is the **client-only target release** described in
[`design/0.2.2-plan.md`](design/0.2.2-plan.md); it is not published, and
**no 0.2.2 acceptance evidence exists**. Every 0.2.2 statement in this file is a
target or working-tree measurement, not proof of a shipped artifact. The
published artifact remains `dsh-livery@0.2.1`, and no 0.2.1 evidence may be reused
for 0.2.2 bytes. 0.2.2 adds no host adapter and no host capability: the declared
host set stays at the eight adapters above.

Before packaging, acceptance must:

1. **Re-accept all 13 scopes** (7 Web + 6 Desktop) on **one final tarball**, with
   a fresh isolated `DSH_HOME` and the official plugin-manager install of the
   exact `--tgz` candidate (AGENTS §3). The client bundle and the packaged
   docs/assets change, so every previous acceptance run is invalid.
2. **Run the Web `0.2.1 → 0.2.2` update probe on one `0.2.2`-line Web scope**
   (and on one `0.2.1`-line Web scope when that line's manager proves it can
   apply the candidate in process). The harness mode and evidence schema are
   implemented; a local probe on the working-tree candidate **passed**
   (`0.2.1` `78f1c8d1…` → `0.2.2` candidate `3b2e4b38…`, 35 pass / 0 fail /
   2 skip / 1 warn, no page reload, stale boot observed, catalog re-adopted,
   manager `applied`). No schema-v3 evidence is committed yet, so the formal
   transition remains to be re-run and bound on the frozen candidate. The claim
   is **Web only** — Desktop needs a renderer reload/app restart.

   Local working-tree smoke (explicitly not acceptance evidence): the fresh
   Web quick run passed **88 / 0 / 5 skip / 1 warn**, and the update probe
   passed **35 / 0 / 2 skip / 1 warn** on candidate `3b2e4b38…` (fresh quick run on the later candidate `eb17d22b…` passed 88 / 0 / 5 / 1); neither run has
   committed evidence, and both must be repeated on the frozen candidate.

   **Manual Web verification (real web profile; not acceptance evidence):** the
   exact candidate was installed through `dsh plugin --profile web add
   file:<candidate.tgz>` into the user's real Web profile and inspected through a
   temporary `dsh web --no-open --port 0` server with Playwright:
   the live `MenuSurface` used by the subagent popover rendered an opaque
   `--dsw-menu-surface-fill` layer in both light (`#f7f1e6` / material
   `rgb(247,241,230)`) and dark (`#35332e`); the same stayed opaque with stock
   style + wallpaper; a remote preset imported with
   `attribution.providerId=openverse` rendered immediately without reload and
   kept the Openverse notice; Recent re-application kept providerId and the
   notice; built-in/upload wallpapers, effects and preset export worked; the
   plugin-detail facts rendered as a compact grid with internal `详情` / `热更新`
   tabs (plus a top-level `热更新` action that jumps to them); built-in wallpaper
   swatches render as explicit 4-column rows (2 columns under 640 px); a 1024 px
   viewport had no horizontal overflow. This run found and fixed one real bug (preset
   provenance update blanked the cached wallpaper until reload) and one styling
   gap (unstyled detail facts). The real Openverse/Wikimedia network endpoints
   were unreachable from this environment (request timeout), so provider flows
   were also exercised with Playwright route mocks; that is UI verification, not
   provider acceptance.
3. **Bind the accepted transition in evidence schema v3** and keep that evidence
   file next to the ordinary fresh-install files for the same candidate. The
   update evidence is validated by `release-evidence.mjs`; `prepublish-check.mjs
   --require-update` refuses to publish a release claiming an in-process update
   without at least one accepted schema-v3 file covering a matrix-passed Web
   scope.

### Web `0.2.1 → 0.2.2` update probe (implemented; local pass on working-tree candidate; no accepted evidence yet)

`scripts/acceptance/web.mjs --update-from <previous.tgz>` is the harness mode.
It uses its own isolated `DSH_HOME` and never touches the real user profile. It:

1. verifies the `--update-from` tarball is the *exact* artifact bound by committed
   `contracts/dsh/evidence/**` (currently the published `0.2.1` tarball,
   3,529,494 B, sha256 `78f1c8d1…`), and installs it through the official
   `dsh plugin --profile web add file:<0.2.1.tgz>` path;
2. boots the declared Host with `--dsh-bin`/`--expect-version` and performs the
   normal authenticated Chrome session (boot payload, handshake, boot graph);
3. pre-seeds the isolated profile with an active style (the same `- id: livery`
   config row the Host's own config editor writes) before boot, so the `0.2.1`
   first-frame payload exists and there is a saved configuration the updated
   client must re-apply;
4. installs the exact `--tgz` candidate through the **running Host's own plugin
   manager**: Plugins → Add plugin → `file:<absolute candidate.tgz>` → Install.
   The Host must answer `applied`; a `restart-required`, refused or unattempted
   dialog is a recorded failure, never replaced by a CLI fallback;
5. proves the update happened in process without a page reload (window sentinel,
   `performance.timeOrigin`, navigation-entry count, history length, `load`
   events), that `__DSH_LIVERY_BOOT__.pluginVersion` still says `0.2.1`, that the
   live client build is `0.2.2`, that the client bundle was reloaded through the
   page's module reloader, that the catalog route was re-fetched, that the saved
   style was re-applied from the new catalog, and that the plugin-detail
   badge/facts section shows handshake `stale` with the stale update-boundary
   copy;
6. exports a schema-v3 `transition` block and requires all
   `REQUIRED_UPDATE_CHECKS` in the raw probe.

Exact commands (replace the host path/version with the declared scope):

```sh
# 1. Build/measure the final candidate exactly as it will be published.
pnpm release:check   # writes .tmp/release-check/dsh-livery-0.2.2.tgz

# 2. Run the in-process update probe against one declared Web host.
node scripts/acceptance/web.mjs \
  --tgz .tmp/release-check/dsh-livery-0.2.2.tgz \
  --update-from .tmp/fixtures/dsh-livery-0.2.1.tgz \
  --dsh-bin /tmp/dsh-hosts/0.2.2-rc.5/node_modules/.bin/dsh \
  --expect-version 0.2.2-rc.5 \
  --expect-browser-version 156.0.8078.48 \
  --chrome-binary ".tmp/acceptance/browsers/chrome-156.0.8078.48/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  --dsh-home .tmp/acceptance/update-0.2.2-rc.5 \
  --out .tmp/acceptance/update-0.2.2-rc.5/artifacts \
  --json .tmp/acceptance/update-0.2.2-rc.5/artifacts/probe.json \
  --report .tmp/acceptance/update-0.2.2-rc.5/artifacts/report.md

# 3. Emit the schema-v3 evidence file (probes/reports are committed beside it).
node scripts/acceptance/evidence.mjs \
  --evidence contracts/dsh/evidence/<release>/0.2.2-rc.5-web-chrome-update.json \
  --probes-dir contracts/dsh/evidence/<release>/probes \
  --reports-dir contracts/dsh/evidence/<release>/reports \
  --tgz .tmp/release-check/dsh-livery-0.2.2.tgz --package-version 0.2.2 \
  --update-from .tmp/fixtures/dsh-livery-0.2.1.tgz \
  --audit-envelope <canonical audit envelope.json> \
  --run web-update:0.2.2-rc.5:dsh-0.2.2-rc.5-r1:<probe>:<report>

# 4. Gate the claim: candidate bytes + every fresh-install scope + update run.
node scripts/release-evidence.mjs \
  --tgz .tmp/release-check/dsh-livery-0.2.2.tgz \
  --evidence contracts/dsh/evidence/<release>/0.2.2-rc.5-web-chrome-update.json
node scripts/prepublish-check.mjs --require-update --tgz .tmp/release-check/dsh-livery-0.2.2.tgz
```

The `0.2.1` tarball is a fixture, never an evidence run of its own: every run
still binds exactly one candidate tarball, one commit and one matrix scope.

Schema-v3 evidence (`schemaVersion: 3`) adds exactly one block to the schema-v2
document:

```json
"transition": {
  "fromVersion": "0.2.1",
  "fromSha256": "78f1c8d1…",
  "fromBytes": 3529494,
  "toVersion": "0.2.2",
  "toSha256": "<candidate sha256>",
  "trigger": "host-install-dialog",
  "pageReloaded": false,
  "staleBootObserved": true,
  "catalogReadopted": true,
  "managerOutcome": "applied"
}
```

Validation rules enforced by `scripts/release-lib.mjs`,
`scripts/acceptance/evidence.mjs` and `scripts/release-evidence.mjs`:

- exact field set; both artifact identities exact; `fromVersion !== toVersion`;
  `trigger` ∈ `{host-install-dialog}`; `pageReloaded === false`;
  `staleBootObserved === true`; `catalogReadopted === true`;
  `managerOutcome === 'applied'` for acceptance;
- `toSha256` equals the candidate tarball, `toVersion` equals the package version,
  and every run's raw probe records the same transition;
- `fromSha256`/`fromBytes`/`fromVersion` are bound by a **previously committed**
  evidence artifact under `contracts/dsh/evidence/` (never the candidate, never a
  locally rebuilt tarball);
- all `REQUIRED_UPDATE_CHECKS` (`env.certified-host`, `env.browser-version`,
  `update.from-artifact-verified`, `update.from-installed`,
  `update.dialog-available`, `update.dialog-install-completed`,
  `update.manager-outcome`, `update.new-client-bundle-loaded`,
  `update.no-page-navigation`, `update.boot-payload-previous`,
  `update.live-client-build-candidate`, `update.catalog-refetched`,
  `update.catalog-applied`, `update.stale-boot-observed`,
  `update.detail-section-renders`, `update.transition-recorded`) are present and
  passing in the sanitized raw probe;
- schema-v2 (fresh-install) runs keep their existing required-check sets and may
  not carry a `transition` block.

The probe records the same facts in `artifacts/.../probe.json` under `update`
(`from`, `to`, `requiredChecks`, dialog `phases`, captured catalog/client-bundle
`responses`, `transition`, and the handler observations), and the Markdown report
renders the transition table.

### Candidate budgets (measured, not accepted)

| Measure | Current working-tree candidate | Budget | Accepted `0.2.1` probe |
|---|---|---|---|
| Client bundle gzip | **73,630 B** build gate (`lib/build-report.json`; 280,268 B raw) / **73,675 B** acceptance probe (280,335 B served raw) — **53 B headroom at the gate** | **73,728 B** (72 KiB) | 60,902 B (cap 61,440 B / 60 KiB) |
| Largest livery/boot CSS | **10,366 B** (bauhaus) | **14,336 B** (14 KiB) | 9,066 B (cap 13,312 B) |
| Host bundle gzip | **15,506 B** (61,649 B raw) | **368,640 B** (360 KiB) | — |
| Package tarball | **3,422,883 B** (993 files; the fresh probe ran on `e55507d8…`; any later packaged-doc edit changes the tarball and requires a re-run on the frozen candidate) | **4,194,304 B** (4 MiB) | 3,529,494 B |

The client/host/CSS numbers come from the latest working-tree build and the fresh
Web quick acceptance probe. The acceptance probe now compresses the served
bundle at the same zlib level 9 as `scripts/build.mjs`; the previous default-level
measurement overstated it by ~318 B. The tarball number was measured before the
final packaged-doc and screenshot refresh; any packaged-byte change (including
edits to this file) changes the tarball and requires a rebuild, a fresh
measurement and full re-acceptance. None of these numbers is acceptance evidence.

### New probe areas in the 0.2.2 candidate (implemented, not yet accepted)

The 0.2.2 probe replaces 0.2.1's fixed Picsum-batch checks and adds:

- wallpaper studio: `wallpaper.no-request-before-online`,
  `wallpaper.online-first-batch`, `wallpaper.provider-selector`,
  `wallpaper.provider-served-by`, `wallpaper.provider-failover`,
  `wallpaper.provider-rate-limited`, `wallpaper.provider-pinned-no-failover`,
  `wallpaper.builtin-visible-8`, `wallpaper.builtin-classic`,
  `wallpaper.builtin-current-classic`, `wallpaper.style-card`,
  `wallpaper.style-applied`, `wallpaper.style-disabled-no-catalog`,
  `wallpaper.attribution-links`;
- plugin detail surface: `plugin.detail-section-renders`,
  `plugin.detail-subject-filter`, `plugin.detail-config-slot-clean`,
  `plugin.detail-no-config-slot`, `plugin.detail-copy-diagnostics`;
- host floating surfaces: `visual.menu-surface-opaque` verifies the real
  computed `--dsw-menu-surface-fill` / `--dsw-alias-fill-l1/l2` cascade is fully
  opaque; `visual.jobs-popover-opaque` and `visual.stock-wallpaper-menu-opaque`
  are explicit skips in the current shell (see limitations);
- handshake/update: the `stale` boot path (exact `0.2.1` allowlist) with
  no-adopt-boot-CSS and catalog re-adoption, asserted by the executable
  `--update-from` probe above.

Their probe and unit-test implementations exist in the working tree; their
status is unproven until the acceptance runs above produce evidence.

### Known pre-acceptance limitations

- **Screenshots are not final.** Packaged README screenshots must be recaptured
  from the final accepted candidate build, replacing the pre-0.2.2
  wallpaper-studio capture that showed an online photo (see `NOTICE.md`).
  Recapture changes packaged bytes, so a candidate measured before it is invalid
  and must be rebuilt and re-accepted.
- **Slot-proof coverage is 6 of 8 hosts.**
  `contracts/dsh/client-slot-declarations.json` inspected six host trees;
  `0.2.1-rc.2` and `0.2.1-rc.3` are explicit gaps ("plugin-manager package
  metadata not installed in the local host tree"). The runtime
  `plugin.detail-section-renders` check currently runs in the Web flow only, so
  `0.2.1-rc.2` (Web) is covered by it; **`0.2.1-rc.3` (Desktop) has no runtime
  detail check yet** and remains a documented per-scope limitation until the
  Desktop probe gains the same check. A missing/failed detail check is recorded
  as skipped-with-reason, never as a pass.
- **Update-probe evidence is pending.** The `--update-from` harness mode,
  schema-v3 transition validation and `REQUIRED_UPDATE_CHECKS` set are
  implemented and unit-tested. The harness was also exercised end-to-end locally
  on an uncommitted intermediate candidate (DSH `0.2.2-rc.5`, Chrome
  `156.0.8078.48`): the Host's Add-plugin dialog applied the candidate in
  process, the probe recorded `pageReloaded: false`, `staleBootObserved: true`,
  `catalogReadopted: true`, `managerOutcome: applied` and passed every
  `REQUIRED_UPDATE_CHECKS`. That local output is a harness validation, **not
  accepted evidence**: the final candidate must be rebuilt from the committed
  tree, and the probe/report/evidence files must be committed for those exact
  bytes and pass `release-evidence.mjs` / `prepublish-check.mjs --require-update`
  before the transition is claimed.
- **Host floating-surface coverage is partial in the automated probe.** The real
  jobs popover/subagent cards are not triggerable in the isolated shell, so
  `visual.jobs-popover-opaque` records a skip; `visual.menu-surface-opaque`
  covers the computed token cascade, and the derive/unit tests cover every
  shipped livery in both modes. The stock-style + wallpaper bridge rule is
  covered by a CSS unit assertion, not by a rendered browser check, until the
  harness can toggle to stock with a wallpaper active.
- **Hot update is Web-only.** DSH client HMR is a Web-profile mechanism; Desktop
  update copy requires a reload/restart and no Desktop hot update is claimed.
  `0.2.1` has no stale path and fails closed on any plugin-version difference.
- **No live-provider guarantee.** Openverse and Wikimedia Commons are accepted by
  the committed provider gate, but the probe exercises the online card with
  mocked responses, so third-party uptime, rate-limit enforcement and licence
  data are not acceptance claims.
- **0.2.2 host support is unchanged**: the eight host adapters are re-probed, not
  newly certified.

## What is verified (accepted `0.2.1` artifact)

- Official install, activation and uninstall lifecycle; boot gate and handshake.
- Eight adapters (`0.2.1-rc.2` through `0.2.2-rc.5`) and their per-adapter
  catalog profiles: 28 styles per profile.
- Style page: preview, single-mutation Apply, restore, persistence, self-check.
- Style gallery, preview language switching, family filters and keyboard tabs.
- Wallpaper studio: 24 built-in CSS wallpapers (0.2.1; 0.2.2 ships 8 curated + 16
  Classic with identical IDs/CSS), online search/random, uploads (IndexedDB),
  recent history/cache, effects and global atmosphere (safe layering: below all
  floating UI; no visual-coverage guarantee on opaque third-party plugin pages).
- Wallpaper state v2: v1 migration, focal position on page/atmosphere/preview,
  multi-tab sync, preset export/import validation and local-data cleanup.
- Performance/network canaries: catalog JSON cap, cold-start p50/p95 baselines and
  a non-blocking Openverse canary (reported in `probe.json`).
- Floating-surface layering: atmosphere `z-index:90` below host ordinary
  Menu/Tooltip/HoverCard (100/101), Modal (1000) and Toast (1100); host Settings
  modal is opaque while wallpaper frost is active.
- Wallpaper selection: active tab/swatch state, selected-swatch ring, readable
  light-swatch labels, hidden native file input and keyboard-operable dropzone.
- Desktop app: official install, renderer boot, panel, apply/persist, reload
  handshake and stock restore.
- CSS/token/contrast audits: 0 missing tokens, contrast assertions and 0 failures.
- Loader-ABI checks for the certified host builds; production dependency audit
  clean.

## What is not verified / not supported

- Native macOS window chrome, traffic lights/leading clearance, vibrancy,
  Dock/rightbar window states, OS-level DPI and the packaged GPU/sandbox path.
  These are host-owned and outside this plugin's certification.
- Desktop Windows, Web Edge, any Web browser other than Chrome `156.0.8078.48`,
  any Node other than the two certified runtimes (`22.23.1`, `24.21.0`), and any
  DSH build not listed in `contracts/dsh/support-matrix.json`.
- A second **theme registry**: the build intentionally ships one adapter per
  certified host; the per-adapter catalog profiles only reflect upstream token
  contract differences.
- Live provider availability: online search/random is exercised with mocked
  responses, so the probe proves client behaviour, not third-party uptime. The
  0.2.1 online-batch checks were mock-backed as well and are replaced by the
  0.2.2 provider probes.
- Malicious/corrupted host payloads beyond the client's structural validation.
- Uninstall residue: DSH keeps the plugin's `livery` config row after plugin
  removal (by design of the host profile store). A stock value is harmless; a
  non-stock value can be inherited on reinstall. This is documented in the
  README/SUPPORT uninstall notes and is not counted as "zero residue".
- All host surfaces using `--dsw-alias-bg-layer-2` remain opaque under frost
  (not only Modal). This is an accepted 0.1.4 product boundary; plugin cards keep
  the glass effect through `--dsh-livery-card-surface`.

## Previous releases

`0.1.8` and `0.1.9` are previous published releases; their artifacts, scope
tables and acceptance counts are retained only for audit under
`contracts/dsh/evidence/0.1.8/` and `contracts/dsh/evidence/0.1.9/`. They are
historical and must not be read as the current support matrix or as 0.2.1/0.2.2
evidence. `0.2.1` is the current published artifact.

## Reproduce

```bash
pnpm install
pnpm verify
pnpm build:cli
pnpm gate:support-matrix -- --all
pnpm gate:release -- --all
pnpm pack:candidate
# exact candidate produced above; version is derived from package.json
pnpm release:prepare -- --tgz .tmp/release-check/dsh-livery-<version>.tgz
```

The tag/publication workflow does **not** rebuild the candidate. The accepted
artifact is produced by the manual `acceptance-artifact.yml` workflow, which
builds from the accepted commit, requires the expected sha256, and uploads the
tarball + manifest as one immutable Actions artifact. The tag workflow downloads
that exact accepted tarball + release manifest from the run named by the
`LIVERY_ACCEPTANCE_RUN_ID` repository variable,
verifies every matrix evidence file, publishes those bytes, then downloads the
version back from npm and checks sha256, byte size and package version. The accepted
tarball, `SHA256SUMS` and release manifest are attached to the GitHub Release.
The Web acceptance harness must be run with `--expect-browser-version
156.0.8078.48` for the Web hosts; any other system Chrome version fails the run.
When the system Chrome channel auto-updates to an uncertified build, the same
official Chrome for Testing build for the certified version is provisioned
explicitly; the harness still fails fast unless the reported four-part version
matches the matrix exactly.

For 0.2.2, a new candidate must be rebuilt after all packaged-doc/screenshot
changes, measured again, and accepted from fresh isolated environments; a
0.2.1-era report is never reused. Raw screenshots remain local under
`artifacts/`; the sanitized raw probes and reports are committed next to each
evidence file so the release gate can re-derive critical checks and verify report
hashes. The evidence files record the exact artifact identity and run commit.
