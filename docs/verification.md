# Verification

DSH Livery is validated against **exact, frozen host builds** and refuses to style
anything it has not been certified against. This page summarises the acceptance
evidence for the **unreleased `0.1.0`** package and how to reproduce it. Raw
screenshots/probes are generated locally under `artifacts/` (not committed).

Shipped artifact: `dsh-livery-0.1.0.tgz`
sha256 `bbe991ba04f532d4afc14f1cf957e07eb58a28321687c31770b21172c5e5b25e`
(542,784 B).

## Host matrix (release 0.1.0 — unreleased)

| Target | Result | What it covers |
|---|---|---|
| DSH `0.2.1-rc.2`, Web Profile, isolated full run | **170 pass / 0 fail / 3 skip / 2 warn** | official install + lifecycle, boot gate, handshake, catalog/previews, visual-studio tabs, 6/6 family sections (calm 7 / nature 3 / light 4 / retro 5 / vivid 2 / dark 3) + family chips/mapping/more-filters/keyboard, 24-card gallery, preview-language tab, wallpaper studio (8 built-ins, blur/dim/frost, persistence, https-only URL validation, mocked online search), preview/apply/restore, self-check, fonts/theme, style differences, unpause + residue |
| DSH `0.2.1-rc.2`, Web Profile, clone of a real user profile | **171 / 0 / 3 / 4** | same as above in a realistic composition (charter/context/vscode-bridge etc.); the clone's own Livery config row is reset to stock inside the isolated clone for a comparable stock → apply matrix (source profile untouched, recorded as a warning) |
| DSH `0.2.1-rc.3`, Desktop packaged runtime (web carrier) | **170 / 0 / 3 / 2** | packaged-app adapter, its own Node/Electron runtime, same browser checks |
| DSH `0.2.1-rc.3`, Desktop Profile, real Electron renderer | **27 / 0 / 1** | real Electron app: boot graph, catalog identity, 6 family sections + tabs, wallpaper studio built-in layer, preview-language tab, preview/apply/persist, relaunch boot payload, light/dark tokens, font hooks, self-check, sidebar entry |

The package is **not released**; `0.1.0` is the unreleased version line. Earlier
matrices exist only as development-round evidence (see below) and are not
releases.

## What the unreleased 0.1.0 package ships (verified)

- **24 built-in styles** across five axes (palette, typography, module shape,
  elevation/material, borders) × 2 catalog profiles. Gallery, preview,
  single-mutation Apply, persistence, restore stock, uninstall/restart residue.
- **Real host-level style differences** after Apply (measured computed styles,
  not stylesheet text): composer border-radius differs across styles
  (10/18/32/36 px), body font stack switches between sans (PingFang SC) and
  serif (Songti SC), 10 distinct computed shadows, glass `backdrop-filter`
  reaches the host, and style tokens resolve exactly as compiled.
- **Left-sidebar entry.** A main-page plugin panel in the left sidebar
  (**视觉风格 / Visual Style**), next to Plugins / Automation / Context, with the
  legacy settings section only as a fallback for hosts without panel navigation.
- **Grouped gallery.** Page tabs 视觉风格 / 壁纸; family chips (全部 + 静谧/自然/
  明亮/复古/霓虹/深色) and **all six non-empty family sections** in display
  order calm → nature → light → retro → vivid → dark, with tag-priority mapping
  nature → calm → light → retro → vivid → dark (counts 7/3/4/5/2/3). The 16 tag
  chips sit behind a 更多筛选 toggle; roving focus stays one flattened list
  across sections. Family grouping is presentation-only.
- **Preview-language tab.** Follow DSH / 中文 / English switches only the
  thumbnail SVG locale (`<id>-<zh|en>-<light|dark>.svg`); names, descriptions
  and other copy stay in the host language, and Apply/restore semantics are
  unchanged (verified while a language is pinned).
- **Wallpaper studio** (client-only). 8 deterministic CSS-only built-ins,
  blur 0–24 px, dim 0–70 %, frost 0–100 %, custom https-only URL validation, and
  optional user-initiated Openverse/Picsum search. Applied through one
  plugin-owned `<style data-plugin-css="dsh-livery/wallpaper">` plus
  `body[data-dsh-wallpaper]` using body pseudo-elements; frost makes the active
  style's surface tokens translucent via `color-mix(...)`. Selection/effects
  persist in `localStorage`; clearing removes the layer and the stored record.
  No host config or boot payload changes.
- **Accessibility safety:** no `!important`, no hash selectors, no remote URLs
  bundled, no whole-document observers; contrast and focus-ring checks pass.

## What is NOT verified

- Native Electron window surfaces: traffic lights/leading, vibrancy, native
  Dock/rightbar states, OS DPI beyond `devicePixelRatio`, packaged Chromium
  sandbox/GPU path.
- Compat-mode UI: browser acceptance cannot fake an uncertified host; the compat
  notice/self-check path is covered by client unit tests only and is **not**
  claimed as browser coverage.
- Live online wallpaper search: acceptance intercepts Openverse/Picsum and image
  requests with fixtures; real third-party availability/behaviour is not tested
  (requests are user-initiated only; CSP/offline failure states are unit-tested).
- Web/Edge browsers (Chrome only) and Windows Desktop.
- Structural layout changes: DSH exposes no public density/transcript-width/
  message-flow hook, so those recipes degrade to host/stock and are disclosed in
  the self-check. Style differences are token-level module design.
- `0.2.0-rc.2` has no fresh browser boot in recent rounds (the local installed CLI
  was upgraded); its contract/package gates and earlier development-round live
  evidence stand.
- Performance evidence is static and first-paint only; switch-latency p95/CLS
  sampling is not archived.

## Repo gates on the same tree

- `tsc --noEmit` clean, `vitest run` 661 tests green.
- `liveries:check`: 24 styles across 2 catalog profiles.
- Token coverage: 0 missing; contrast: 2,832 assertions per profile, 0 failures.
- Per-livery CSS under the 12 KiB hard cap; **client gzip 29,628 B** (32 KiB
  budget) and **host gzip 295,744 B**.
- Loader ABI 12/12 checks; adapter allowlist, pack and lint checks green.

## Development-round evidence (not releases)

The internal packaging labels `pkg-0.1.0` (this release line), `pkg-0.2.2`,
`pkg-0.3.0`, `pkg-0.4.0`, `pkg-0.5.0` and `pre-repack-a225849a` under
`artifacts/acceptance/` are development-round evidence from the same unreleased
0.1.0 package: the higher numbers were **internal iteration labels, never
released versions**. They are kept locally for reproducibility only; no public
release history precedes 0.1.0. Two earlier candidate packs were dead on arrival (empty `vivid` family /
stale installed bytes) and were never accepted;
the shipped bytes are the `bbe991ba…` tarball above.

## Reproduce

```bash
pnpm verify
node scripts/acceptance/web.mjs --tgz ./dsh-livery-0.1.0.tgz --out artifacts/acceptance/local
node scripts/acceptance/probe/desktop-probe.mjs --tgz ./dsh-livery-0.1.0.tgz
```

The browser harness creates an isolated `DSH_HOME`, installs the tarball through the
official plugin manager, boots a local server, drives system Chrome via
Playwright, and writes screenshots + `probe.json` under the chosen output directory.
Contract snapshots can be regenerated from a matching DSH install with
`pnpm contract:snapshot -- --dsh-install <path>` (see `docs/design/multi-version.md`).
