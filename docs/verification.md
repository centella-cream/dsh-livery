# Verification

DSH Livery is validated against **exact, frozen host builds** and refuses to style
anything it has not been certified against. This page summarises the acceptance
evidence for the **unreleased `0.1.0`** package and how to reproduce it. Raw
screenshots/probes are generated locally under `artifacts/` (not committed).

Shipped artifact: `dsh-livery-0.1.0.tgz`
sha256 `179ca228c2a568c7d3d65736c1993fa163e9cf8c7566954b67ad00f3db263842`
(548,723 B).

## Host matrix (release 0.1.0 — unreleased)

| Target | Result | What it covers |
|---|---|---|
| DSH `0.2.1-rc.2`, Web Profile, isolated full run | **213 pass / 0 fail / 3 skip / 2 warn** | official install + lifecycle, boot gate, handshake, catalog/previews, visual-studio tabs, 6/6 family sections (calm 7 / nature 3 / light 4 / retro 5 / vivid 2 / dark 3) + family chips/mapping/more-filters/keyboard, 24-card gallery, preview-language tab, wallpaper studio (24 built-ins, search-first online card with one auto Picsum batch + explicit Openverse search/random/refresh/retry, IndexedDB upload, atmosphere overlay, adaptive cover, tab persistence), round-10 card layout (two-column ≥1100px, stacked at 1024, bounded sliders, hero thumbnails, no overflow), round-11 human About footer + unified five-step typography, preview/apply/restore, self-check, fonts/theme, style differences, unpause + residue |
| DSH `0.2.1-rc.2`, Web Profile, clone of a real user profile | **214 / 0 / 3 / 4** | same as above in a realistic composition (charter/context/vscode-bridge etc.), including the atmosphere overlay measured over the third-party 上下文洞察 panel and the round-10 card layout checks; the clone's own Livery config row is reset to stock inside the isolated clone for a comparable stock → apply matrix (source profile untouched, recorded as a warning) |
| DSH `0.2.1-rc.3`, Desktop packaged runtime (web carrier) | **213 / 0 / 3 / 2** | packaged-app adapter, its own Node/Electron runtime, same browser checks |
| DSH `0.2.1-rc.3`, Desktop Profile, real Electron renderer | **27 / 0 / 1** | real Electron app: boot graph, catalog identity, 6 family sections + tabs, 24 built-in wallpapers + atmosphere layer, preview-language tab, preview/apply/persist, relaunch boot payload, light/dark tokens, font hooks, self-check, sidebar entry |

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
- **Preserved wallpaper behaviours measured on the real host:** 24 built-in
  cards; upload of a generated PNG → `blob:` layer + IndexedDB round-trip across
  a hard reload, non-image and >10 MiB uploads rejected with a validation
  message; atmosphere overlay computed styles and removal at 0; overlay measured
  over the third-party 上下文洞察 panel with atmosphere 0 vs 60 screenshots
  (mean colour delta 14.7–19.3 per channel at 8-bit scale — perceptible in the
  captured frames, reported as a measured value, not a subjective claim);
  page-tab persistence across navigation and reload; adaptive cover at the three
  viewports.
- **Round-10 presentation layout (measured at 1440×900 and 1024×800):** the
  style page renders `livery-layout` with **two tracks at 1440
  (`728px 364px`)** and **one track at 1024 (`696px`)**; the current-style hero
  (`livery-current-card`, loaded `livery-hero-thumb` preview SVG) + gallery card
  sit in the main column, while the 操作 card (`livery-actions-card`) and
  self-check card sit in `livery-rail`. The wallpaper page has the same
  two-column/stacked behaviour with the five visible cards (hero/online/custom/
  effects/builtins), a hero preview background-image + clear action, and
  a `wallpaper-effects-grid` containing **four bounded 140 px sliders** (never
  viewport-wide; grid becomes 2 tracks when stacked at 1024). Card surfaces are
  visibly separated (non-flat surface material: background/backdrop/shadow; note
  the host shell computes `section` border-width as 0 even though the card rule
  sets a 1px border — separation remains visible via the material, and the
  check accepts the measured surface material). No horizontal overflow at
  either width; screenshots `layout-style-1440/1024` and
  `layout-wallpaper-1440/1024` per Web target.
- **Round-11 copy and type system (measured at 1440×900):** the About footer
  renders **two separated lines** — `DSH Visual Studio 0.1.0 · 已适配 DeepSeek
  Harness <hostVersion>` and the preview note — with a flex-column layout
  (tops 333–373 / 377–413), no contract hash/adapter id/jargon in the footer,
  while copied diagnostics still carry the adapter id (`dsh-0.2.1-rc.2-r1` /
  `dsh-0.2.1-rc.3-r1`) and the contract prefix (`fc5ccff8` / `d246181d`). The
  visible computed type sizes are exactly **{11,12,13,15}** on both the style
  page (100/28/57/4 occurrences) and wallpaper page (4/18/28/7) — **no
  14/16/18.72 leaks** — and the shared `--lw-fs-*` tokens resolve to
  20/15/13/12/11 px on the real `.livery-workspace` **and** `.livery-panel`
  roots (not only a legacy `.livery-section`).
- **Round-11 online card:** the curated category/cache library is **removed**
  (0 `wallpaper-library-*` elements, 0 category chips); a single search-first
  `wallpaper-online-card` directly follows the hero (main card order:
  hero → online → custom). Opening the tab auto-loads **exactly one** mocked
  Picsum batch (1 `/v2/list` request, 2 results, thumbnails loaded); changing
  effect sliders re-fetches nothing (Picsum 1→1, Openverse 0→0); explicit
  Openverse search (1 request, titled results), 随机 (Picsum 1→2), 换一批
  (2→3), a simulated failure → visible `wallpaper-online-retry` → successful
  retry (4→5), and applying a result sets the URL + attribution are all
  verified. No live network is used in acceptance (Picsum/Openverse intercepted).
- **Wallpaper studio** (client-only). **24 deterministic CSS-only built-ins**,
  blur 0–24 px, dim 0–70 %, frost 0–100 %, global atmosphere 0–100 %, custom
  https-only URL validation, local image upload (JPEG/PNG/WebP/AVIF, ≤10 MiB,
  IndexedDB) and one search-first online card: opening the tab auto-loads
  exactly one random Picsum batch, followed by explicit Openverse (CC0/PDM)
  search, 随机/换一批 and retry; effect-slider changes never re-fetch. The
  former curated category/cache library was removed in round 11.
  Applied through one plugin-owned
  `<style data-plugin-css="dsh-livery/wallpaper">` plus
  `body[data-dsh-wallpaper]`; frost makes the active style's surface tokens
  translucent via `color-mix(...)`. The atmosphere overlay
  (`#dsh-livery-wallpaper-overlay`, atmo > 0) sits above app content
  (`z-index:2147483000`, `pointer-events:none`, `mix-blend-mode:soft-light`,
  opacity = atmosphere/100) so the wallpaper is visible over opaque third-party
  plugin pages too. Both layers use adaptive `background-size:cover`
  (1024×768 / 1920×1080 / 900×1300 verified). Selection/effects persist in
  `localStorage`, uploads in IndexedDB; page-tab choice persists in
  `sessionStorage` across navigation and hard reload. Clearing removes the
  style, overlay, body attribute and stored record. No host config or boot
  payload changes.
- **Accessibility safety:** no `!important`, no hash selectors, no remote URLs
  bundled, no whole-document observers; contrast and focus-ring checks pass.

## What is NOT verified

- Native Electron window surfaces: traffic lights/leading, vibrancy, native
  Dock/rightbar states, OS DPI beyond `devicePixelRatio`, packaged Chromium
  sandbox/GPU path.
- Compat-mode UI: browser acceptance cannot fake an uncertified host; the compat
  notice/self-check path is covered by client unit tests only and is **not**
  claimed as browser coverage.
- Live online wallpaper card: acceptance intercepts Picsum/Openverse and image
  requests with fixtures (the live services are not reachable from the CI
  environment; the Picsum auto batch and explicit Openverse search are therefore
  mocked); real third-party availability/behaviour is not tested. The client
  requests only on tab-open/user action, and CSP/offline failure states are
  unit-tested.
- Atmosphere perceptibility is reported as a measured screenshot colour delta on
  the 上下文洞察 page, not as a subjective visual guarantee.
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
- Per-livery CSS under the 12 KiB hard cap; **client gzip 34,684 B** (48 KiB
  budget; harness-measured served bundle 34,823–34,824 B) and **client CSS
  12,123 B** (12 KiB cap); **host gzip 295,744 B**.
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
