# Verification

**Release scope for 0.1.0 (limited release):** DSH `0.2.1-rc.2`, Web Profile,
Chrome **155** only; Node **22.23.1** only. Desktop macOS/Windows and Web Edge are
**not supported and not guaranteed** (same-version sessions may load but are outside
certification). Other DSH builds are rejected at install and fail closed at runtime.

The published artifact is the exact tarball named in the committed evidence
file (including committed report markdown + sha256 checks). Both release gates pass for its released matrix entry; `prepublish-check`
refuses to publish bytes that differ from that evidence.

Evidence for the published artifact is committed at
[`contracts/dsh/evidence/0.2.1-rc.2-web-chrome.json`](../contracts/dsh/evidence/0.2.1-rc.2-web-chrome.json)
(the file records the exact sha256, byte size, commit and per-run results).

## Acceptance runs (accepted artifact)

| Run | Environment | Result |
|---|---|---|
| Web isolated full run | DSH `0.2.1-rc.2`, macOS arm64, Node 22.23.1, Chrome 155.0.8059.85 | 227 pass / 0 fail / 4 skip / 2 warn |
| Web real-profile clone | same | 227 pass / 0 fail / 4 skip / 5 warn (clone-only dependency-repair warning) |

The two runs use the official plugin install path, an isolated `DSH_HOME`, Node
22.23.1, and Playwright with system Chrome 155. Chrome 155 and Node 22.23.1 are the
only certified versions; the build target (`chrome120`) is not a browser
certification claim. Skips are expected: stock-boot handshake rows are
re-asserted after Apply, and cross-profile preview isolation is not applicable
because this release ships exactly one catalog profile. Warnings are the grouped
bundle URL deviation, the accepted CSS-size target and clone-composition warnings.

## What is verified

- Official install, activation and uninstall lifecycle; boot gate and handshake.
- One adapter (`dsh-0.2.1-rc.2-r1`) and one catalog profile: 24 styles.
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

- Desktop macOS/Windows native surfaces, Web Edge, and any other DSH version.
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
```

Raw probes and screenshots are generated locally under `artifacts/` and are not
committed; the committed evidence file records their result summaries and the
exact artifact identity.
