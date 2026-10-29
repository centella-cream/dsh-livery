# Changelog

All notable changes to DSH Livery are recorded here. `0.1.0` was the first limited
release for DSH `0.2.1-rc.2` Web/Chrome; `0.1.1` added Desktop `0.2.1-rc.3` macOS
support; `0.1.2` added the latest-DSH preview and fixed wallpaper UI/layering;
`0.1.3` is the release-trust, storage-reliability and accessibility release.
Earlier development rounds used temporary internal version numbers for evidence
packaging; they are folded into the `0.1.0` entry.

## [0.1.4] — 2026-10-29

### Changed

- 显式将 client gzip 预算从 56 KiB 调整为 60 KiB，用于容纳新的 Studio 布局/容器查询；实际 57.9 KiB，已在构建与验收门禁中同步。
- 重构视觉风格与壁纸页面的信息层级，采用当前工作区、内容选择区和次要管理区三层布局。
- 当前视觉风格改为大幅 16:10 预览，并将预览应用、取消和恢复默认操作合并到当前风格卡。
- 风格画廊改为全宽 4 列布局，搜索、分类、更多标签和预览语言压缩为两行以内工具栏。
- 壁纸来源整合为在线、内置、最近使用、本地与链接四个来源页签。
- 在线壁纸保持 12 条搜索数据但按 6 条分页展示；最近使用改为横向轨道；内置壁纸降级为来源页签。
- 预设与本地数据清理归入默认折叠的管理区域。
- 统一 22/16/14/13/12 五级字号、1.3/1.5/1.35 行高、卡片等级和控件高度。
- 响应式布局主要改为基于插件工作区宽度的容器查询，并保留设置页/回退路径的视口媒体查询；移除 CSS order 改写阅读顺序。

### Fixed

- 修复窄宽度下效果、内置和在线来源出现在当前壁纸之前的问题。
- 修复当前视觉风格预览过小、画廊长期被右栏挤窄的问题。
- 修复在线结果、最近使用和上传模块同时展开导致页面过长的问题。
- 修复模块标题、正文、辅助文字和控件尺寸不一致的问题。
- 修复 1024px 单列工作区首屏看不到壁纸来源入口的问题：压缩壁纸 ON 状态的预览高度，使来源卡在首屏可见。

## [0.1.3] — 2026-10-27

### Added

- Lightweight appearance presets export/import existing styles, builtin/https
  wallpapers, effects and focal position; uploaded blobs, CSS, tokens, fonts,
  local paths and history are explicitly excluded.
- Nine-grid focal position for remote/upload wallpapers, applied to the page
  layer, atmosphere layer, hero preview, reload, tabs and presets.
- Live synchronization of wallpaper selection/effects/position/clear/recent
  history across tabs in the same Web Profile.
- Local wallpaper data cleanup with reported results and storage quota/GC
  boundaries (uploads: current only; remote cache: 24 entries / 128 MiB LRU).

### Fixed

- Pending uploads/sweeps now publish a per-tab upload reference with a heartbeat;
  external selection adoption republishes refs immediately, disposal flushes the
  pending save before removing its ref, and automatic GC is paused when the
  browser cannot provide a cross-tab Web Lock.
- Remote cache candidates are pruned only after the selection commit; the current
  live/durable/persisted images are protected. Same-URL cache writes use a
  cross-tab Web Lock and cancelled operations never delete a potentially newer
  row.
- Picsum's bounded production redirects are followed and the final URL is
  revalidated (https/public/no credentials) before MIME/size/decode checks; an
  actual 302 fixture is part of acceptance instead of a direct-200 mock.
- Recent clear invalidates in-flight remote commits; theme observers are
  reference-counted; preset unmount prevents the wallpaper half of a slow
  application; DOM lease ids use cross-module UUIDs.
- Production IndexedDB store implements atomic `deleteIfGeneration` (get →
  compare token → delete in one readwrite transaction); cache prune, upload GC
  and clear-all fail closed instead of falling back to unconditional delete.
  Record generations are collision-free UUID tokens; legacy rows are upgraded on
  touch. Prune only accounts a deletion when the compare-delete returned true.
- The release workflow consumes an immutable acceptance artifact produced by the
  new `acceptance-artifact.yml` workflow (same expected sha), validates manifest
  sha/bytes/version before use, and checks `LIVERY_ACCEPTANCE_RUN_ID` before
  downloading; it has `actions: read` and never rebuilds the candidate.
- Stock restore now verifies the final confirmed/effective style after the write;
  a newer host style superseding the stock write returns `refused` instead of a
  false success. Added a runtime regression test.
- Custom/Openverse image downloads use `redirect:'error'`; only Picsum's known
  CDN host may follow redirects, with final URL host revalidation. Search-result
  thumbnails no longer issue direct remote `<img>` requests.
- Search JSON is consumed through a streaming 2 MiB cap (reader cancelled on
  overflow), not materialized in full before checking size.
- Session-only uploads (IndexedDB put failed) use a non-persistable controller
  transition: the unreadable upload key is not written to localStorage.
- Runtime observation serial is now the primary supersession signal for same-id
  updates even when the host omits revisions; same-target notifications roll
  forward normally instead of being silently treated as self echoes. `applyStyle`
  checks settled/phase/preview state before the already-effective no-op and only
  enforces writable for an actual config write.
- Recent eviction/clear protect live, durable and persisted remote URLs.
  Client CSS upgrades content when a newer instance supplies different CSS.
- Remote pruning now actually enforces `protectedUrls` as a set (current live,
  durable, persisted and candidate), and prune/delete share the same per-URL
  cross-tab lock as writes. IndexedDB records carry a write generation and use
  atomic compare/delete so a stale prune cannot delete a newer blob.
- IDB errors preserve the original DOMException name/message via `cause`, so
  production QuotaExceededError reaches the quota-prune-and-retry path.
- Manual clear-local-data invalidates in-flight remote commits before cleanup.
  Recent metadata merges write back when full canonical entries differ, not only
  when URL count/order differ.
- Runtime reconciliation uses a local observation serial (not optional host
  revision) so same/undefined-revision updates cannot be overwritten by a late
  write. Wallpaper DOM lease and ref heartbeat start only with `start()`.
- Client CSS first/reused owners share one reference-count release path.
  `applyStyle()` allows the already-active style no-op even in read-only mode so
  wallpaper-only presets still apply.
- Search JSON is capped at 2 MiB; decoded image dimensions are capped at 40 MP
  when createImageBitmap is available.
- Mount sweep now reads live/durable/persisted selections and tab refs INSIDE the
  cross-tab lock (then re-reads protection before each delete); if the browser
  cannot enumerate refs, destructive GC fails closed instead of assuming empty.
- Cross-tab recent clear cancels the receiving tab's in-flight remote commit
  before clearing UI/history, so a late download cannot resurrect the old list.
- Client CSS uses node reference counting rather than the presenter lease, so a
  normal teardown or HMR overlap cannot leave the plugin stylesheet behind.
- Remote-cache prune/delete take the same per-URL cross-tab lock as writes;
  quota errors prune once with current/candidate URLs protected and retry the
  put only once.
- Async recent reads and remote commits capture the shared selection version, so
  selecting a builtin/upload/clear while a read is pending cannot be overwritten.
- Recent metadata merging is ordered by `addedAt` (stable JSON tie-break): older
  events only fill missing fields and cannot replace newer creator/license data.
- Uploaded blobs are staged and committed inside ONE GC critical section: blob
  write, ticket/selection-version check, selection commit, localStorage flush and
  failure rollback cannot interleave with mount/clear GC. A failed persist rolls
  the memory selection back and removes the staged blob.
- Remote wallpapers are downloaded, MIME/decode-verified and cached BEFORE the
  selection is committed; network/IDB/host-safety/decode failure leaves the
  previous wallpaper in place instead of persisting an unrenderable remote URL.
- A per-tab cross-tab upload reference table protects live/durable upload keys;
  clear-all additionally re-reads the persisted selection. Delayed GC checks
  live, durable, persisted and all live tab refs under the shared lock.
- Recent-history clear propagates as an authoritative removal instead of being
  merged back from stale local entries; same-URL updates preserve metadata.
- Remote cache follow-ups revalidate the final response URL, use redirect:'error',
  preserve the real image MIME, optionally decode-verify via createImageBitmap,
  and serialize same-URL writes so an older put cannot commit after a newer one.
- All config write entries share a central writable gate; same-id/higher-revision
  host updates supersede an in-flight write; presenter and wallpaper DOM layers
  use cross-module DOM leases; attribution is persisted and remote presets
  without attribution suppress stale history credit.
- Uploaded blobs are deleted only after the replacement state is persisted, with
  a delayed cross-tab convergence window; mount/clear GC protects the live, last
  durable and currently persisted selections, and upload commits are serialized
  with GC through a shared lock.
- A pending upload captures the selection version before its IndexedDB write and
  aborts if a local or cross-tab selection changed; picking an invalid file also
  cancels an earlier slow upload.
- Same-revision multi-tab writes converge to the deterministic maximum
  `(revision, sourceId)`, not merely against the local tab id, so three or more
  tabs converge regardless of event order.
- IndexedDB blocked/error/versionchange recovery reopens on the next operation;
  cache operation tokens prevent a cancelled same-URL download from deleting a
  newer record; LRU touch is a single transaction and cannot resurrect cleared
  rows.
- Recent history merges concurrent additions and preserves metadata when the
  same URL is selected again; attribution derives from the persisted recent
  metadata so it survives style-tab remounts.
- Preset import/export rejects deep/cyclic/non-JSON structures with stable
  `invalid-json` errors (no stack overflow), and portable URLs reject
  single-label, site-local, multicast and mapped-private hosts.
- Boot-less/unknown hosts wait for catalog certification before wallpaper starts;
  the direct style apply API enforces `configStatus==='ready' && writable`; the
  theme service is declared as an injection dependency.
- Wallpaper DOM layers carry an ownership lease, so an older plugin/HMR instance
  cannot clear the newer instance's stylesheet/overlay; clipboard results are
  operation-ticketed.
- Acceptance evidence is bound to sanitized raw probes, summaries, host/adapter
  identities, report hashes and the run commit; critical checks are re-derived
  from probe check statuses. Desktop user-data directories are unique and cleared
  per run; Web defaults are unique per process.

- Uploaded blobs are deleted only after the replacement state is confirmed
  persisted; a failed localStorage write leaves the old upload recoverable.
  IndexedDB read failures no longer count as a missing upload.
- IndexedDB v2 upgrade handles blocked/versionchange connections, migrates v1
  rows inside the versionchange transaction, and waits for transaction commit
  before reporting put/delete/clear success.
- Concurrent same-revision writes from two tabs converge deterministically by
  source id and persist the winning state, preventing split histories.
- Local-data cleanup re-reads the live selection before each async delete, and
  remote cache cancellation is checked after the put await so a stale download
  cannot update the LRU index or prune the new current wallpaper.
- Preset import/apply operations carry generation tickets: consecutive imports
  cannot overwrite each other, apply captures its own preset, and stale results
  cannot clear a newer import.
- Attribution is bound to the wallpaper identity; cross-tab selection changes
  cannot show/export another wallpaper's credit. Partial preset failures no
  longer commit attribution.
- Preset URLs reject loopback/private/link-local IPv4, IPv6 ULA/link-local and
  IPv4-mapped private addresses; attribution text is validated as plain text
  (length/control chars) rather than CSS/path payload rules.
- Thumbnail object URLs are owned by one ref map and released without leaving
  cached state behind; cache loads refresh the LRU timestamp; URL/upload ARIA
  associations and clipboard rejection handling are complete.
- Release workflow pins every job to the triggering SHA; acceptance evidence
  must include explicit passing critical checks, and the acceptance selftest is
  part of `pnpm verify`.

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
  15 MiB cap and timeout, so oversized responses never fully enter memory. Remote
  URLs are rendered only from the verified cached blob; the raw URL never enters
  CSS (no bypass of credentials/timeout/size/content-type checks). Failed
  downloads keep the history entry but show no unsafe fallback image.
- The visually hidden native file input is removed from the Tab order, the
  dropzone has a visible focus ring and a single Enter/Space activation, and
  upload/URL errors stay linked to both visible controls through ARIA.

### Changed

- Wallpaper persistence is now schema v2 (revision + selection + effects +
  focal position) with lossless migration from 0.1.2 flat records.
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
  `certifiedRuntimeVersions` and upstream provenance. `0.2.1-rc.4` has an
  upstream GitHub prerelease tag and npm `next` package, but remains a preview
  until the GitHub release is non-prerelease and the npm channel is `latest`.
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
