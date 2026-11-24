# Verification

## Release `0.2.2` (current)

The `0.2.2` artifact is `dsh-livery-0.2.2.tgz`. Its exact sha256, byte size, file
count and run commit are recorded in every committed evidence file under
`contracts/dsh/evidence/0.2.2/`; the package is published as
`dsh-livery@0.2.2`.

`0.2.2` is a client-only release on the same eight exact-certified host adapters
as `0.2.1`: it adds no host adapter and no host capability. The final artifact was
installed from the exact tarball through the official plugin-manager path and
probed on all 13 declared scopes (7 Web + 6 Desktop):

| Host | Profile / platform | Certified runtime | Result |
|---|---|---|---|
| DSH `0.2.1-rc.2` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **PASS** |
| DSH `0.2.1-rc.4` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **PASS** |
| DSH `0.2.1-rc.5` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **PASS** |
| DSH `0.2.2-rc.1` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **PASS** |
| DSH `0.2.2-rc.2` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **PASS** |
| DSH `0.2.2-rc.3` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **PASS** |
| DSH `0.2.2-rc.5` | Web, Chrome `156.0.8078.48` | Node `22.23.1` | **PASS** |
| DSH `0.2.1-rc.3` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **PASS** |
| DSH `0.2.1-rc.5` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **PASS** |
| DSH `0.2.2-rc.1` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **PASS** |
| DSH `0.2.2-rc.2` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **PASS** |
| DSH `0.2.2-rc.3` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **PASS** |
| DSH `0.2.2-rc.5` | Desktop app, macOS | Electron `44.7.0` / Node `24.21.0` | **PASS** |

Every scope recorded zero failed checks; the exact pass/skip/warn counts are in
the per-scope probe and evidence JSON. The Desktop probe covers the real Electron
renderer with an isolated app home/user-data dir, not the native macOS window
shell.

### Evidence

- `contracts/dsh/evidence/0.2.2/` contains one schema-v2 JSON per declared scope
  (13 files), plus one schema-v3 Web update file, sanitized raw probes, reports
  and canonical audit envelopes.
- Each schema-v2 file binds the exact tarball sha256/bytes, probe/report sha256,
  critical check ids, build commit and audit envelope. Critical checks are
  re-derived from the raw probe, never trusted from a self-reported list.
- `0.2.2-rc.5-web-chrome-update.json` binds the real `0.2.1 → 0.2.2` in-process
  transition. It records both artifact identities, trigger
  `host-install-dialog`, `pageReloaded: false`, `staleBootObserved: true`,
  `catalogReadopted: true` and `managerOutcome: applied`, and is covered by
  `prepublish-check.mjs --require-update`.
- `pnpm release:prepare` and `pnpm prepublishOnly` verify all 14 files against
  the same candidate bytes.

### Build budgets on the frozen candidate

| Measure | Budget | Result |
|---|---|---|
| Client bundle gzip | 72 KiB (73,728 B) | within budget (build gate) |
| Largest livery/boot CSS | 14 KiB (14,336 B) | within budget (build gate) |
| Host bundle gzip | 360 KiB (368,640 B) | within budget (build gate) |
| Package tarball | 4 MiB (4,194,304 B) | within budget (`release-check`) |

The exact measured values are in `.tmp/release-check/release-manifest.json` and
the project build report; the budget gates run as part of `pnpm verify` and
`pnpm release:check`. The accepted probe compresses the served client at the same
zlib level 9 as `scripts/build.mjs`.

Every run used a fresh isolated `DSH_HOME` under `.tmp/acceptance/`, its own run
directory and the official plugin install path with the exact `--tgz`; concurrent
suites were run serially and never shared a `DSH_HOME`. Web runs booted the
declared host with `--dsh-bin`/`--expect-version` and the exact certified Chrome
build; Desktop runs drove the real Electron renderer. A real-profile clone run is
a supplementary diagnostic and intentionally **not** part of formal evidence.

## Web `0.2.1 → 0.2.2` update probe

`scripts/acceptance/web.mjs --update-from <0.2.1.tgz>` is the accepted harness
mode. It uses its own isolated `DSH_HOME` and never touches a real user profile:

1. verifies that the `--update-from` tarball is the exact published `0.2.1`
   artifact bound by committed evidence
   (`3,529,494 B`, sha256 `78f1c8d1…`), then installs it through the official
   `dsh plugin --profile web add file:<0.2.1.tgz>` path;
2. boots the declared host with the exact Node/Chrome versions and performs the
   normal authenticated session (boot payload, handshake, boot graph);
3. pre-seeds the isolated profile with an active style, so the `0.2.1`
   first-frame payload exists and the updated client has saved configuration to
   re-apply;
4. installs the exact candidate through the **running Host's own plugin
   manager** (Plugins → Add plugin → `file:<candidate.tgz>` → Install). The Host
   must answer `applied`; a `restart-required`, refused or unattempted dialog is a
   recorded failure, never replaced by a CLI fallback;
5. proves the update happened in process without a page reload (window sentinel,
   `performance.timeOrigin`, navigation-entry count, history length, `load`
   events): the old boot payload is observed as `stale`, the new client bundle is
   loaded through the page's module reloader, the catalog is re-fetched and the
   saved style is re-applied from it, without adopting CSS from the stale frame;
6. records the schema-v3 `transition` block and all `REQUIRED_UPDATE_CHECKS`.
   `scripts/acceptance/evidence.mjs --update-from` emits the evidence file and
   `scripts/release-evidence.mjs` re-validates it against the raw probe.

The `0.2.1` tarball is a fixture, never an evidence run of its own: every run
binds exactly one candidate tarball, one commit and one matrix scope. This claim
is **Web only**; Desktop update copy requires a renderer reload or app restart
and no Desktop hot update is claimed.

## Known limitations

- **Slot-proof coverage is 6 of 8 hosts.**
  `contracts/dsh/client-slot-declarations.json` inspected six host trees;
  `0.2.1-rc.2` and `0.2.1-rc.3` are explicit gaps ("plugin-manager package
  metadata not installed in the local host tree"). The runtime
  `plugin.detail-section-renders` check runs in the Web flow only, so
  `0.2.1-rc.2` (Web) is covered by it; **`0.2.1-rc.3` (Desktop) has no runtime
  detail check** and remains a documented per-scope limitation. A missing/failed
  detail check is recorded as skipped-with-reason, never as a pass.
- **Host floating-surface coverage is partial in the automated probe.** The real
  jobs popover/subagent cards are not triggerable in the isolated shell, so
  `visual.jobs-popover-opaque` records a skip; `visual.menu-surface-opaque`
  verifies the computed `--dsw-menu-surface-fill`/`--dsw-alias-fill-l1/l2`
  cascade is fully opaque, and unit tests cover every shipped livery in both
  modes. The stock-style + wallpaper bridge rule is covered by a CSS unit
  assertion rather than a rendered browser check.
- **Hot update is Web-only.** DSH client hot update is a Web-profile mechanism;
  Desktop requires a renderer reload or app restart. `0.2.1` has no stale path and
  fails closed on any plugin-version difference.
- **No live-provider guarantee.** Wikimedia Commons is the only offered online
  source; Openverse was accepted by the provider access gate but removed from the
  offered registry because anonymous limits made it unusable. The acceptance
  probe exercises online cards with mocked responses, so third-party uptime,
  rate-limit enforcement and live licence data are not acceptance claims.
- **Screenshots.** The packaged README screenshots show the Visual Style page,
  which is unchanged in `0.2.2`; wallpaper-studio and plugin-detail screenshots
  are intentionally not asserted as pixel evidence here. Pixel comparisons from
  acceptance remain local under `artifacts/`, not in the package.

## What is verified

- Official install, activation, uninstall and restart lifecycle; boot gate and
  handshake on all eight exact-certified hosts.
- Eight adapters and their per-adapter catalog profiles; 28 styles per profile,
  preview, single-mutation Apply, restore, persistence and self-check.
- Style gallery, preview-language switching, family filters and keyboard tabs.
- Wallpaper studio: 8 curated + 16 Classic built-ins with stable IDs/CSS,
  Follow style, Wikimedia Commons search/random with attribution, local/link
  uploads (IndexedDB), Recent/cache, effects and global atmosphere (safe layering
  below floating UI).
- Wallpaper state v2 and v1 migration, focal position, multi-tab sync, preset
  export/import validation (v1 and v2) and local-data cleanup.
- Plugin-detail slots, facts and truthful update boundary; Web in-process update
  transition described above.
- Floating surfaces: atmosphere layering below host Menu/Tooltip/HoverCard,
  Modal and Toast; opaque Settings Modal while frost is active.
- CSS/token/contrast audits, loader-ABI checks and production dependency audit.
- Desktop app: official install, renderer boot, sidebar path, panel,
  apply/persist, reload handshake and stock restore.

## What is not verified / not supported

- Native macOS window chrome, traffic lights/leading clearance, vibrancy,
  Dock/rightbar window states, OS-level DPI and the packaged GPU/sandbox path.
  These are host-owned and outside this plugin's certification.
- Desktop Windows, Web Edge, any Web browser other than Chrome `156.0.8078.48`,
  any Node other than the two certified runtimes (`22.23.1`, `24.21.0`), and any
  DSH build not listed in `contracts/dsh/support-matrix.json`.
- A second theme registry: the build intentionally ships one adapter per certified
  host; the per-adapter catalog profiles only reflect upstream token contract
  differences.
- Live provider availability, third-party uptime and licence freshness.
- Malicious/corrupted host payloads beyond the client's structural validation.
- Uninstall residue: DSH keeps the plugin's `livery` config row after plugin
  removal (by design of the host profile store). A stock value is harmless; a
  non-stock value can be inherited on reinstall. This is documented in the
  README/SUPPORT uninstall notes and is not counted as "zero residue".
- All host surfaces using `--dsw-alias-bg-layer-2` remain opaque under frost
  (not only Modal). This is an accepted product boundary; plugin cards keep the
  glass effect through `--dsh-livery-card-surface`.

## Previous releases

`0.2.1` is the previous published release. It was accepted on the same 13 scopes
with the `0.2.1` artifact; its evidence remains under
`contracts/dsh/evidence/0.2.1/` and is historical. `0.1.8` and `0.1.9` evidence
under `contracts/dsh/evidence/` is retained for audit only and must not be read as
the current support matrix or as `0.2.2` evidence.

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

The tag/publication workflow does **not** rebuild the candidate. The tag workflow
downloads the exact accepted tarball and release manifest from the Actions run
named by the `LIVERY_ACCEPTANCE_RUN_ID` repository variable, verifies every
matrix evidence file, publishes those bytes, then downloads the version back from
npm and checks sha256, byte size and package version. The accepted tarball,
`SHA256SUMS` and release manifest are attached to the GitHub Release.

The Web acceptance harness must be run with `--expect-browser-version
156.0.8078.48`; any other system Chrome version fails the run. When the system
Chrome channel auto-updates to an uncertified build, the same official Chrome for
Testing build for the certified version is provisioned explicitly; the harness
still fails fast unless the reported four-part version matches the matrix
exactly. Raw screenshots remain local under `artifacts/`; sanitized raw probes and
reports are committed next to each evidence file so the release gate can re-derive
critical checks and verify report hashes.
