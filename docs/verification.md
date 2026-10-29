# Verification

**Release `0.1.3` — release candidate.** The exact accepted artifact, sha256,
byte size and commit are recorded in the three committed evidence files at
`contracts/dsh/evidence/0.1.3/`; the publication workflow downloads the same bytes
from npm and attaches the tarball, `SHA256SUMS` and release manifest to the GitHub
Release. `0.1.2` evidence is retained unchanged under
`contracts/dsh/evidence/` for the prior release.

**Release scope for 0.1.3 (limited release):**

| Host | Profile / platform | Certified runtime | Status |
|---|---|---|---|
| DSH `0.2.1-rc.2` | Web Profile, Chrome `156.0.8078.48` | Node `22.23.1` | Stable certified (npm `latest`) |
| DSH `0.2.1-rc.4` | Web Profile, Chrome `156.0.8078.48` | Node `22.23.1` | Next-channel preview (npm `next`; GitHub prerelease tag exists) |
| DSH `0.2.1-rc.3` | Desktop app, macOS | Electron/Node `24.21.0` (Chromium `152.0.7977.130`) | Stable certified renderer surface (GitHub-tagged) |
| Desktop Windows, Web Edge, other DSH builds | — | — | Not supported; no guarantee |

There is no compatibility mode. A different DSH version is rejected at install and
fails closed at runtime. Stable claims require a non-prerelease official GitHub
release and the matching signed npm tarball on `latest`; `0.2.1-rc.4` is verified against the signed npm `next`
tarball and has an upstream GitHub prerelease tag (commit 504a01a…) but npm remains on the next channel, so it is a preview compatibility claim,
not a channel-stability promise. The Desktop certification covers plugin
installation, boot, the Electron renderer, settings/gallery, persistence and the
restart handshake; native macOS window chrome, traffic lights/leading, vibrancy,
Dock/rightbar, OS-level DPI and the packaged GPU/sandbox path remain outside the
certification surface. First-paint sampling is only claimed when the Desktop report
contains actual sample data.

The candidate artifact is the exact tarball named in the committed evidence files
(including committed report markdown + sha256 checks). Both release gates and
`prepublish-check` refuse to publish bytes that do not match them.

Evidence:

- `contracts/dsh/evidence/0.1.3/0.2.1-rc.2-web-chrome.json`
- `contracts/dsh/evidence/0.1.3/0.2.1-rc.4-web-chrome.json`
- `contracts/dsh/evidence/0.1.3/0.2.1-rc.3-desktop-macos.json`

Each file records the exact sha256, byte size, commit, exact browser/runtime
versions, scope and per-run results. Evidence schema v2 also binds a sanitized
raw probe path+sha256, run summary, host/adapter identity, report hash and run
commit; critical checks are re-derived from probe statuses rather than trusted
from a self-reported list. The `0.1.2` evidence files are never rewritten.

## Acceptance runs (accepted artifact)

| Run | Environment | Result |
|---|---|---|
| Web isolated full run | DSH `0.2.1-rc.2`, macOS arm64, Node `22.23.1`, Chrome `156.0.8078.48` | recorded in the committed rc.2 evidence/report |
| Latest Web isolated | DSH `0.2.1-rc.4`, macOS arm64, Node `22.23.1`, Chrome `156.0.8078.48` | recorded in the committed rc.4 evidence/report |
| Desktop app renderer | DSH `0.2.1-rc.3`, macOS arm64, Electron / Node `24.21.0` | recorded in the committed Desktop evidence/report |

A real-profile clone run remains a supplementary diagnostic and is intentionally
not part of formal release evidence: only isolated-home runs are authoritative.
The Web runs use the official plugin install path, an isolated `DSH_HOME`, Node
22.23.1 and Playwright with the exact certified Chrome build 156.0.8078.48. When
the system Chrome channel auto-updates to an uncertified build, the same official
Chrome for Testing build for the certified version is provisioned explicitly;
the harness still fails fast unless the reported four-part version matches the
matrix exactly. The Desktop run uses the real
Electron app, the official rc.3 plugin manager and an isolated app
`DSH_HOME`/user-data-dir, driving the actual renderer.

## What is verified

- Official install, activation and uninstall lifecycle; boot gate and handshake.
- Three adapters (`dsh-0.2.1-rc.2-r1`, `dsh-0.2.1-rc.4-r1`, `dsh-0.2.1-rc.3-r1`)
  sharing one catalog profile: 24 styles.
- Style page: preview, single-mutation Apply, restore, persistence, self-check.
- Style gallery, preview language switching, family filters and keyboard tabs.
- Wallpaper studio: built-in designs, online search/random, uploads (IndexedDB),
  recent history/cache, effects and global atmosphere (safe layering: below all floating UI; no visual-coverage guarantee on opaque third-party plugin pages).
- Wallpaper state v2: v1 migration, focal position on page/atmosphere/preview,
  multi-tab sync, preset export/import validation and local-data cleanup.
- Performance/network canaries: catalog JSON cap, cold-start p50/p95 baselines and
  a non-blocking real Openverse canary (reported in probe.json).
- Floating-surface layering: atmosphere `z-index:90` below host ordinary
  Menu/Tooltip/HoverCard (100/101), Modal (1000) and Toast (1100); host Settings
  modal is opaque while wallpaper frost is active.
- Wallpaper selection: active tab/swatch state, selected-swatch ring, readable
  light-swatch labels, hidden native file input and keyboard-operable dropzone.
- Desktop app: official install, renderer boot, panel, apply/persist, reload
  handshake and stock restore.
- CSS/token/contrast audits: 0 missing tokens, contrast assertions and 0 failures.
- Loader-ABI checks for the certified host builds; production dependency audit clean.

## What is not verified / not supported

- Native macOS window chrome, traffic lights/leading clearance, vibrancy,
  Dock/rightbar window states, OS-level DPI and the packaged GPU/sandbox path.
  These are host-owned and outside this plugin's certification.
- Desktop Windows, Web Edge, any browser other than Chrome 156.0.8078.48, any Node other than
  the two certified runtimes, DSH Desktop rc.4 (not released/available), and any
  other DSH version.
- A second catalog profile or any second theme registry. The build intentionally
  ships one adapter per certified host and one shared catalog profile.
- Live Openverse availability: search is exercised with mocked responses; the
  automatic Picsum batch works in the acceptance environment.
- Malicious/corrupted host payloads beyond the client's structural validation.
- Uninstall residue: DSH keeps the plugin's `livery` config row after plugin
  removal (by design of the host profile store). A stock value is harmless; a
  non-stock value can be inherited on reinstall. This is documented in the
  README/SUPPORT uninstall notes and is not counted as "zero residue".
- All host surfaces using `--dsw-alias-bg-layer-2` remain opaque under frost
  (not only Modal). This is an accepted 0.1.3 product boundary; plugin cards keep
  the glass effect through `--dsh-livery-card-surface`.

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

Raw probes and screenshots are generated locally under `artifacts/` and are not
committed; the committed evidence files record their result summaries and the exact
artifact identity.
