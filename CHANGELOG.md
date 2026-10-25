# Changelog

All notable changes to DSH Livery are recorded here. The project is **not yet
released**: everything below ships in the first release line, `0.1.0`. Earlier
development rounds used temporary internal version numbers for evidence packaging;
they are folded into this single unreleased entry.

## [0.1.0] — unreleased

DSH Visual Studio: a token-only visual layer for DeepSeek Harness with 24 styles,
a wallpaper studio, a curated gallery and a certified/compat version policy.

### Added

- **24 built-in styles across five visual axes.** Palette (OKLab seeds → complete
  light/dark token set), typography (10 local-only font stacks, 9 metric profiles),
  shape (`--dsw-radius-*`, `--dsw-corner-shape`), elevation/material (hairline,
  elevated, glass) and border/focus treatment. 10 originals + 12 palettes inspired
  by permissively licensed projects (attributions in `NOTICE.md`) + 2 original
  Chinese-aesthetic designs (青瓷 Celadon, 朱砂 Cinnabar).
- **Wallpaper studio** (client-only): 8 built-in CSS wallpapers, user-initiated
  online search (Openverse CC0/PDM) and random refresh (Picsum), custom https image
  URL, blur 0–24px / dim 0–70% / frost 0–100% effects, and local persistence
  (`localStorage['dsh-livery.wallpaper.v1']`). One plugin-owned wallpaper layer
  (`style[data-plugin-css="dsh-livery/wallpaper"]` + `body[data-dsh-wallpaper]`)
  using body pseudo-elements and `color-mix` surface translucency. The only
  networked feature; requests are user-initiated (see SECURITY.md).
- **Main-page entry**: a left-sidebar plugin panel **视觉风格 / Visual styles**
  (`main` keyed slot + `sidebar.panellist` row, order 30), with a second page tab
  **壁纸 / Wallpapers**. Forward-compatible entry detection falls back to the
  legacy settings page on hosts without panel navigation.
- **Wallpaper studio expansion (round 9)**: 24 CSS-only built-in wallpapers;
  user file upload (JPEG/PNG/WebP/AVIF, ≤10 MiB) stored in IndexedDB and restored
  after reload; https URL kept; both wallpaper layers are viewport-relative `cover`
  with an `inset:-24px` blur bleed (adaptive to any window aspect); new **global
  atmosphere overlay** above app content (`pointer-events:none`, soft-light,
  default 30 %) so the wallpaper is visible on third-party plugin pages with opaque
  surfaces; page tab now remembers the last active tab across workspace
  remounts/navigation (`sessionStorage`).
- **Studio layout redesign (round 10)**: both pages use hierarchical, responsive
  card modules instead of a flat list; wallpaper page = hero preview + search-first
  online card + custom upload/URL cards and a rail with compact bounded 140 px
  effect sliders (no viewport-wide sliders) + 24-swatch grid; style page =
  current-style hero (preview thumbnail) + gallery card + 操作/自检 rail; stacks
  below 1100 px with no horizontal overflow.
- **Copy, typography and wallpaper edits (round 11)**: human About footer copy
  (no contract/adapter jargon; ids stay in the copyable diagnostics); a single
  five-step typography scale shared by both pages; removed the non-loading curated
  category library and replaced it with one search-first **在线壁纸 / Online
  wallpapers** card that automatically loads one Picsum random batch when the tab
  opens, with explicit Openverse search / random / next-batch / retry.
- **Curated gallery**: six style families (calm/nature/light/retro/vivid/dark),
  family-grouped sections and counts, primary family chips, the full 16-tag
  vocabulary behind a 更多筛选/More filters toggle, search, roving keyboard focus
  and a preview-language tab (Follow DSH / 中文 / English; preview-only).
- **Compatibility range + compat mode.** `engines.dsh` is
  `>=0.2.0-rc.2 <1.0.0`. Certified exact builds keep the frozen six-hash contract
  path; in-range uncertified builds resolve to the synthetic `dsh-compat` adapter
  using the newest certified contract (`payload.compat`, `compat.mode`
  diagnostics, panel banner + self-check row). Out-of-range/unreadable versions
  still fail closed. See `docs/design/multi-version.md`.
- **Verification and safety tooling**: contract snapshots/diffs, loader-ABI checks,
  token/CSS/contrast audits, style-value audits, package-content checks, support
  matrix gate, Playwright browser acceptance harness and bilingual docs.

### Changed

- Plugin version is fixed at **`0.1.0` (unreleased)**; tarball
  `dsh-livery-0.1.0.tgz`.
- Client gzip budget raised to 32 KiB for the wallpaper studio (actual 29,628 B),
  then to 48 KiB for the round-9 expansion (actual 35,062 B); CLIENT_CSS budget
  9 KiB (actual 8,449 B).
- README repositioned as **DSH Visual Studio** (visual system + wallpapers +
  verification policy) instead of a plain skin, with a certified-vs-compat table.

### Verified

- Final artifact `dsh-livery-0.1.0.tgz` sha256
  `675b26bce2059c595286915c12b0b91a393260a2721f890bc4b0a8cd7073527a` (548,779 B, 233 files).
- Four-target acceptance on the final artifact: Web `0.2.1-rc.2` isolated full
  run 219/0/3/2, real-profile clone 220/0/3/4, Desktop `0.2.1-rc.3` packaged
  carrier 219/0/3/2, real Electron renderer 27/0/1; live final-build QA on the real
  profile (auto online batch with 12 results, unified computed font sizes
  {11,12,13,15}, two-line About footer, no console errors).
- Repo gates: `tsc` clean, 681 tests (1 optional skip), 204 generated files /
  2 catalog profiles in sync, all token/CSS/contrast audits, loader-ABI 12/12,
  `adapter:check`, `pack:check` (see `docs/verification.md` for evidence notes).

### Known limitations

- Native Electron window surfaces (traffic lights, vibrancy, Dock/rightbar, native
  DPI beyond `devicePixelRatio`, packaged GPU/sandbox path) are not verified;
  `desktop.macos` stays pending. Web/Edge is not certified (Chrome only).
- Compatibility mode is best-effort and covered by unit/host tests only (a browser
  cannot forge an uncertified host); a future DSH 1.x requires an explicit support
  decision. Certification remains exact-build.
- Online wallpaper search is mocked in acceptance; live third-party APIs/image
  loading are not part of CI. Wallpaper effects are layer/token-level (no
  per-component backdrop filters), and wallpaper choices live in browser
  `localStorage` rather than the DSH profile.
- Structural layout is host-owned (no public density/transcript-width hook); those
  recipes degrade to host/stock and are disclosed in the self-check.
- Host bundle is ~2.5 MB raw / ~295.7 KB gzip because both catalog profiles embed
  full audit payloads (post-release optimization).
