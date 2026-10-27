# Changelog

All notable changes to DSH Livery are recorded here. `0.1.0` was the first limited
release for DSH `0.2.1-rc.2` Web/Chrome; `0.1.1` added Desktop `0.2.1-rc.3` macOS
support; `0.1.2` added the latest-DSH preview and fixed wallpaper UI/layering;
`0.1.3` is the release-trust, storage-reliability and accessibility release.
Earlier development rounds used temporary internal version numbers for evidence
packaging; they are folded into the `0.1.0` entry.

## [0.1.3] — 2026-10-27

### Fixed

- Web certification now records and enforces the exact Chrome version
  (`156.0.8078.48`); the acceptance harness fails on any other system browser
  version instead of silently accepting `minVersion`.
- Desktop evidence no longer contradicts itself: skipped first-paint sampling is
  reported as not verified, the report distinguishes renderer certification from
  native window certification, and the release gate checks report claims against
  the support matrix.
- Uploaded wallpapers and remote wallpaper caches no longer accumulate orphaned
  IndexedDB records: replaced/cleared uploads are deleted, cached history entries
  are evicted with their blobs, and the cache is bounded by 24 entries / 128 MiB
  LRU with the current wallpaper protected.
- Remote wallpaper downloads check `Content-Length` and stream body chunks with a
  15 MiB cap and timeout, so oversized responses never fully enter memory; failed,
  timed-out or non-image downloads fall back to the original URL without an
  IndexedDB write.
- The visually hidden native file input is removed from the Tab order, the
  dropzone has a visible focus ring and a single Enter/Space activation, and
  upload/URL errors stay linked to both visible controls through ARIA.

### Changed

- Release tooling derives the version, candidate tarball name and evidence list
  from `package.json` and the formal support matrix; no release script or workflow
  path hardcodes a version or tarball name. `release:prepare` no longer lists
  evidence files manually.
- After npm publication, a workflow job downloads the exact registry tarball,
  verifies its sha256, byte size and package version against the accepted
  candidate, and fails the release without republishing on mismatch.
- GitHub Release assets include the accepted tarball, `SHA256SUMS` and the release
  manifest.
- The formal matrix now distinguishes `claimTier` (`stable`/`preview`),
  `distributionChannel`, exact `certifiedBrowserVersions`,
  `certifiedRuntimeVersions` and upstream provenance. `0.2.1-rc.4` remains a
  next-channel preview until upstream publishes a matching GitHub tag.
- The npm package carries only the current documentation tree and shipped
  contracts; historical archive material and the proposed matrix are no longer
  packaged. The 0.1.2 evidence and CHANGELOG entry remain unchanged.

### Compatibility

- DSH `0.2.1-rc.2` Web/Chrome, `0.2.1-rc.3` Desktop/macOS and `0.2.1-rc.4`
  Web/Chrome remain the exact allowlist.
- Desktop Windows, Web Edge and other DSH builds remain unsupported.

## [0.1.2] — 2026-10-27

### Added

- Next-channel preview for DSH `0.2.1-rc.4` Web/Chrome 155 alongside the stable
  `0.2.1-rc.2` Web and `0.2.1-rc.3` Desktop/macOS adapters. The rc.4 package was
  verified from the signed official npm `next` tarball; upstream has no matching
  GitHub tag yet, so this is preview compatibility, not a stability promise.
  `engines.dsh` admits the exact allowlist
  `0.2.1-rc.2 || 0.2.1-rc.3 || 0.2.1-rc.4`; rc.4 Desktop is not claimed because
  no rc.4 Desktop app was available.
- Desktop docs now cover the local-npm-tarball fallback for the plugin manager's
  ~24-hour minimum-release-age/supply-chain window: `npm pack`, verify sha256,
  then install the local `.tgz` through the app-bundled CLI and restart.

### Fixed

- The global wallpaper atmosphere now sits below host floating surfaces
  (Menu/Tooltip/HoverCard `z-index` 100/101, Modal 1000, Toast 1100) instead of
  tinting menus, tooltips, dialogs and toasts from above.
- Frost no longer rewrites host-modal, input or tooltip surface tokens. Host
  `--dsw-alias-bg-layer-2`, `--dsw-alias-bg-layer-1` and
  `--dsw-alias-tooltip-bg` stay opaque; plugin cards keep their glass effect via
  the plugin-private `--dsh-livery-card-surface` variable.
- `forced-colors` and `prefers-reduced-transparency` now suppress the frost token
  overrides, the private card surface and card backdrop blur; decorative wallpaper
  layers remain hidden.
- Top tabs expose an `aria-selected` visual state and built-in swatches expose an
  `aria-pressed` outline/ring; light-swatch labels gain a dark gradient and text
  shadow for contrast.
- Upload controls no longer show a duplicate native file input: the native input
  is visually hidden and the dropzone is clickable, focusable and Enter/Space
  operable; upload/URL errors are linked with `aria-invalid`,
  `aria-describedby` and `aria-errormessage`.
- Narrow layouts wrap the search toolbar, show effects/built-in wallpapers before
  online/upload modules, keep the empty wallpaper state 16:9 to prevent layout
  jump, and bound diagnostics with wrapping/scrolling.

### Known limitations

- All host surfaces that use `--dsw-alias-bg-layer-2` stay opaque under frost
  (not only Modal). This is an accepted product boundary for 0.1.2; plugin-owned
  cards retain the glass effect through their private surface token.
- The global atmosphere layer is deliberately below all floating UI. It tints
  page surfaces only where host layering permits it; opaque third-party plugin
  pages may show no perceptible atmosphere change, and no visual-coverage over
  other plugins is claimed.

## [0.1.1] — 2026-10-27

### Added

- Desktop app support for DSH `0.2.1-rc.3` on macOS: official plugin-manager
  install, Electron renderer acceptance, shared catalog profile with Web rc.2.
- Package engines now admit the exact allowlist `0.2.1-rc.2 || 0.2.1-rc.3` and
  the two certified Node runtimes (`^22.23.1 || ^24.21.0`).

### Changed

- Release workflow and acceptance harness cover both Web rc.2/Chrome 155 and
  Desktop rc.3/macOS; publish uses both committed evidence files.

### Known limitations

- Native macOS window chrome, traffic lights/leading, vibrancy, Dock/rightbar and
  OS-level DPI are host-owned and outside the plugin certification surface.
- Desktop Windows, Web Edge and other DSH builds remain unsupported.

## [0.1.0] — 2026-10-27

DSH Livery: a token-only visual layer for DeepSeek Harness with 24 styles,
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
- **Recent wallpapers + product name (round 13)**: used online wallpapers are kept
  in browser-local history (`localStorage['dsh-livery.wallpaper.recent.v1']`, max
  24, newest first) and shown in a Recent wallpapers card where they can be
  re-applied; images are cached in IndexedDB when the server allows CORS, with the
  original URL as fallback. Clear history removes local records. The visible
  product name is **DSH Livery**; an editorial label used in earlier docs has been
  removed.
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

- Plugin version was fixed at **`0.1.0`** for the Web-only release; tarball
  `dsh-livery-0.1.0.tgz`.
- **Release-workflow and upload-race hardening (round 18):** later release jobs build
  only the gate CLIs (`pnpm build:cli`) so they work from a clean checkout without
  rebuilding the candidate tgz; every wallpaper selection change (builtin, online,
  URL, clear, recent restore) invalidates a pending local upload ticket, so a late
  IndexedDB completion cannot roll the selection back.
- **Stable limited release:** support scope is DSH `0.2.1-rc.2` + Web Profile +
  Chrome 155 on Node 22.23.1; Desktop/Edge are unsupported/no-guarantee (same-version
  sessions may load but are not certified), and only unsupported DSH builds are
  rejected/fail closed. Production adapters/catalog/stock are generated only from
  the formal released matrix (one adapter, one profile). Compatibility mode is
  removed. Release workflow builds a candidate from the tag, verifies the
  downloaded artifact and evidence on the default branch, and publishes the same
  accepted bytes; `private` is off with `prepublishOnly` bound to the committed
  evidence.
- **Release pipeline (round 14 follow-up):** the release workflow now builds and
  uploads the candidate tarball first, then runs support/release gates on the
  same candidate identity; `gate:release -- --all` requires every packaged adapter
  to have a released matrix entry. `prepublishOnly` runs both gates against all
  adapters, and `pack:candidate` produces the inspected tarball manifest.
- **Final release hardening (round 16):** uploads use a monotonic ticket so a
  late local upload cannot overwrite a newer one; all controller mutations are
  no-ops after dispose; catalog validation covers capability values, light/dark
  seeds and contrast/degraded internals; the client compat branch/UI/i18n keys and
  the unused core compat module were removed. Evidence now includes committed
  report markdown plus sha256 checks so a clean CI checkout can verify it; the
  release workflow has a publish job that verifies and publishes the exact
  downloaded candidate tarball. Uninstall config residue is documented.
- **Runtime hardening (round 15):** boot
  stylesheet text is verified before zero-write adoption; wallpaper does not start
  on a rejected handshake; page tabs have roving focus, arrow/Home/End keys, and
  cancel an active preview when leaving the style tab; wallpaper layers hide under
  `forced-colors` and `prefers-reduced-transparency`.
- **Release posture (round 14):** no build has passed G6, so the project is a
  release candidate, not a release. README/support wording now says candidate /
  draft and the compatibility range is explicitly not a support guarantee. The
  package is marked `private`, `prepublishOnly` runs the support-matrix and
  release gates, and a tagged release workflow runs `pnpm verify`, both gates and
  the packaging check. Community docs and `docs/` are included in the package so
  README links resolve on npm; the bundled `@deepseek-ai/schemastery` MIT licence
  is reproduced in NOTICE.
- Client gzip budget raised to 32 KiB for the wallpaper studio (actual 29,628 B),
  then to 48 KiB for the round-9 expansion (actual 35,062 B); CLIENT_CSS budget
  9 KiB (actual 8,449 B).
- README repositioned around the visual styling feature set (24 styles, wallpapers,
  verification policy), with a certified-vs-compat table.

### Verified

- Published artifact `dsh-livery-0.1.0.tgz`; its exact sha256/bytes/commit are
  recorded in `contracts/dsh/evidence/0.2.1-rc.2-web-chrome.json`. The matrix entry
  is `released` and bound to that evidence file.
- Limited-release acceptance on the exact artifact: Web `0.2.1-rc.2` isolated full
  run **227 pass / 0 fail / 4 skip / 2 warn**, real-profile clone **227 / 0 / 4 / 5**
  (Chrome 155, Node 22.23.1, macOS arm64; the extra clone warning is a clone-only
  dependency-repair warning). Chrome 155 and Node 22.23.1 are the only certified
  versions. Desktop macOS/Windows and Web Edge are unsupported/no-guarantee.
- Repo gates: `tsc` clean, 716 tests (1 optional skip), 103 generated files /
  1 catalog profile in sync, all token/CSS/contrast audits, loader-ABI 8/8,
  `adapter:check`, `pack:check`, both release gates OK on the accepted artifact,
  `verify:evidence` and `prepublish-check` OK.

### Known limitations

- Desktop macOS/Windows and Web Edge are outside the certified scope and receive no
  support guarantee; same-version sessions may load but are not claimed. Only
  unsupported DSH builds are rejected/fail closed. There is no compatibility mode.
- Chrome 155 and Node 22.23.1 are the only certified runtime versions; the build
  target (`chrome120`) is not a browser certification claim. Other Chrome/Node
  versions are not guaranteed.
- Online wallpaper search is mocked in acceptance; live third-party APIs/image
  loading are not part of CI. Wallpaper effects are layer/token-level (no
  per-component backdrop filters), and wallpaper choices live in browser
  `localStorage` rather than the DSH profile.
- Structural layout is host-owned (no public density/transcript-width hook); those
  recipes degrade to host/stock and are disclosed in the self-check.
- Host bundle is ~2.5 MB raw / ~295.7 KB gzip because both catalog profiles embed
  full audit payloads (post-release optimization).
