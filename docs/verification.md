# Verification

**Release scope for 0.1.1 (limited release):**

| Host | Profile / platform | Runtime | Status |
|---|---|---|---|
| DSH `0.2.1-rc.2` | Web Profile, Chrome 155 | Node 22.23.1 | Certified |
| DSH `0.2.1-rc.3` | Desktop app, macOS | Electron / Node 24.21.0 | Certified renderer surface |
| Desktop Windows, Web Edge, other DSH builds | — | — | Not supported; no guarantee |

There is no compatibility mode. A different DSH version is rejected at install and
fails closed at runtime. The Desktop certification covers plugin installation, boot,
the Electron renderer, settings/gallery, persistence and the first-frame handshake.
Native macOS window chrome, traffic lights/leading, vibrancy, Dock/rightbar and
OS-level DPI are host-owned and outside the plugin's certification surface.

The published artifact is the exact tarball named in the committed evidence files
(including committed report markdown + sha256 checks). Both release gates and
`prepublish-check` refuse to publish bytes that do not match them.

Evidence:

- `contracts/dsh/evidence/0.2.1-rc.2-web-chrome.json`
- `contracts/dsh/evidence/0.2.1-rc.3-desktop-macos.json`

Each file records the exact sha256, byte size, commit, scope and per-run results.

## Acceptance runs (accepted artifact)

| Run | Environment | Result |
|---|---|---|
| Web isolated full run | DSH `0.2.1-rc.2`, macOS arm64, Node 22.23.1, Chrome 155.0.8059.85 | 227 pass / 0 fail / 4 skip / 2 warn |
| Web real-profile clone | same | 227 pass / 0 fail / 4 skip / 5 warn (clone-only dependency-repair warning) |
| Desktop app renderer | DSH `0.2.1-rc.3`, macOS arm64, Electron / Node 24.21.0 | recorded in the committed Desktop evidence/report |

The Web runs use the official plugin install path, an isolated `DSH_HOME`, Node
22.23.1 and Playwright with system Chrome 155. The Desktop run uses the real
Electron app, the official rc.3 plugin manager and an isolated app
`DSH_HOME`/user-data-dir, driving the actual renderer.

## What is verified

- Official install, activation and uninstall lifecycle; boot gate and handshake.
- Two adapters (`dsh-0.2.1-rc.2-r1`, `dsh-0.2.1-rc.3-r1`) sharing one catalog
  profile: 24 styles.
- Style page: preview, single-mutation Apply, restore, persistence, self-check.
- Style gallery, preview language switching, family filters and keyboard tabs.
- Wallpaper studio: built-in designs, online search/random, uploads (IndexedDB),
  recent history/cache, effects and global atmosphere.
- Desktop app: official install, renderer boot, panel, apply/persist, reload
  handshake and stock restore.
- CSS/token/contrast audits: 0 missing tokens, contrast assertions and 0 failures.
- Loader-ABI checks for the certified host builds; production dependency audit clean.

## What is not verified / not supported

- Native macOS window chrome, traffic lights/leading clearance, vibrancy,
  Dock/rightbar window states, OS-level DPI and the packaged GPU/sandbox path.
  These are host-owned and outside this plugin's certification.
- Desktop Windows, Web Edge, any browser other than Chrome 155, any Node other than
  the two certified runtimes, and any other DSH version.
- A second catalog profile or any second theme registry. The build intentionally
  ships one adapter per certified host and one shared catalog profile.
- Live Openverse availability: search is exercised with mocked responses; the
  automatic Picsum batch works in the acceptance environment.
- Malicious/corrupted host payloads beyond the client's structural validation.
- Uninstall residue: DSH keeps the plugin's `livery` config row after plugin
  removal (by design of the host profile store). A stock value is harmless; a
  non-stock value can be inherited on reinstall. This is documented in the
  README/SUPPORT uninstall notes and is not counted as "zero residue".

## Reproduce

```bash
pnpm install
pnpm verify
pnpm build:cli
pnpm gate:support-matrix -- --all
pnpm gate:release -- --all
pnpm pack:candidate
pnpm verify:evidence -- --tgz dsh-livery-0.1.1.tgz --evidence contracts/dsh/evidence/0.2.1-rc.2-web-chrome.json
pnpm verify:evidence -- --tgz dsh-livery-0.1.1.tgz --evidence contracts/dsh/evidence/0.2.1-rc.3-desktop-macos.json
```

Raw probes and screenshots are generated locally under `artifacts/` and are not
committed; the committed evidence files record their result summaries and the exact
artifact identity.
