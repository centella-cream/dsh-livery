# Verification

**Release scope for 0.1.0 (limited release):** DSH `0.2.1-rc.2` on Web Profile /
Chrome, and DSH `0.2.1-rc.3` Desktop app on macOS. Desktop Windows, Web Edge and
every other DSH build are explicitly **not supported** and are rejected at
install/runtime.

The published artifact is the exact tarball named in the committed evidence
file (including committed report markdown + sha256 checks). Both release gates pass for its released matrix entry; `prepublish-check`
refuses to publish bytes that differ from that evidence.

Evidence for the published artifact is committed at:

- `contracts/dsh/evidence/0.2.1-rc.2-web-chrome.json` (repository)
- `contracts/dsh/evidence/0.2.1-rc.3-desktop-macos.json` (repository)

Each file records the exact sha256, byte size, commit and per-run results.
That file records the exact candidate tarball sha256, bytes, commit, scope and
per-run probe/report results. Release gates and `prepublish-check` refuse to
publish bytes that do not match it.

## Acceptance runs (accepted artifact)

| Run | Environment | Result |
|---|---|---|
| Web isolated full run | DSH `0.2.1-rc.2`, Web Profile, macOS arm64, Node 22.23.1, Chrome 155.0.8059.85 | recorded in the committed Web evidence/report |
| Web real-profile clone | same | recorded in the committed Web evidence/report |
| Desktop app renderer | DSH `0.2.1-rc.3`, macOS arm64, real Electron via Playwright | recorded in the committed Desktop evidence/report |

Exact pass/skip/warning counts and report hashes live in the evidence JSON and
the committed report markdown, so a clean checkout can verify them without local
`artifacts/`.

## What is verified

- Official install, activation and uninstall lifecycle; boot gate and handshake.
- Two adapters (`dsh-0.2.1-rc.2-r1`, `dsh-0.2.1-rc.3-r1`) sharing one catalog
  profile: 24 styles.
- Desktop app: real Electron renderer boot, panel, apply/persist, relaunch.
- Style page: preview, single-mutation Apply, restore, persistence, self-check.
- Wallpaper page: 24 built-ins, one automatic random Picsum batch plus explicit
  Openverse search/random/refresh, uploads (IndexedDB), recent-wallpaper history
  and best-effort cache, effects, atmosphere layer and adaptive cover.
- Card layout, unified five-step type scale, keyboard tabs, tab persistence.
- Host-token style differences after Apply (radius, font family, shadow, glass).
- CSS/token/contrast audits: 0 missing tokens, 5,664 contrast assertions, 0
  failures per profile, max per-style CSS 8,892 B.
- Loader-ABI checks for the exact host build; production dependency audit clean.

## What is not verified / not supported

- Desktop Windows, Web Edge, and any other DSH version.
- A second catalog profile or any second adapter. The build intentionally ships
  one adapter and one profile.
- Live Openverse availability: search is exercised with mocked responses; the
  automatic Picsum batch works in the acceptance environment.
- Native OS DPI beyond `devicePixelRatio`, Windows, and browser engines other
  than Chrome.
- Malicious/corrupted host payloads beyond the client's structural validation.
- Uninstall residue: DSH keeps the plugin's `livery` config row after plugin
  removal (by design of the host profile store). A stock value is harmless; a
  non-stock value can be inherited on reinstall. This is documented in the
  README/SUPPORT uninstall notes and is not counted as "zero residue".

## Reproduce

```bash
pnpm install
pnpm verify
pnpm gate:support-matrix -- --all
pnpm gate:release -- --all
pnpm pack:candidate
pnpm verify:evidence -- --tgz dsh-livery-0.1.0.tgz --evidence contracts/dsh/evidence/0.2.1-rc.2-web-chrome.json
pnpm verify:evidence -- --tgz dsh-livery-0.1.0.tgz --evidence contracts/dsh/evidence/0.2.1-rc.3-desktop-macos.json
```

Raw probes and screenshots are generated locally under `artifacts/` and are not
committed; the committed evidence file records their result summaries and the
exact artifact identity.
