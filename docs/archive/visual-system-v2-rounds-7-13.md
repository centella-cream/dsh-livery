> **Historical archive.** This document is preserved for engineering history and
> is not authoritative. Current documentation starts at
> [`docs/README.md`](../README.md); current support is defined by
> [`contracts/dsh/support-matrix.json`](../../contracts/dsh/support-matrix.json).

# DSH Livery visual system (unreleased 0.1.0) — compatibility, wallpaper, gallery UX (rounds 7-13)

Frozen design for the user-feedback round. Three product changes plus a README
repositioning. UI/copy may evolve; the contracts below are what the parallel work
must match.

## 1. Version policy: certified matrix + compatibility mode

Problem: exact-version matching means a DSH update can disable the plugin.

New policy:

- `package.json engines.dsh` becomes the **compatibility range**
  `>=0.2.0-rc.2 <1.0.0` (install-time gate). The **certified matrix** remains the
  three exact builds in `contracts/dsh/support-matrix.proposed.json`; certification
  is about guarantees, not installability.
- Host gate resolution:
  1. exact observed version → that adapter (certified path, unchanged);
  2. otherwise, if the observed version is readable and satisfies the compatibility
     range → **compat mode**: synthesize identity
     `{ adapterId: 'dsh-compat', hostVersion: observed, contractHash: <newest
     adapter's contractHash>, catalogProfile: <newest adapter's profile>,
     capabilities: <newest adapter's capabilities> }` and serve the newest compiled
     catalog. Payload gains `compat: true`; diagnostics + self-check mark
     "未认证兼容模式 / Uncertified compatibility mode".
  3. unreadable or out-of-range version → closed gate, zero rows (unchanged).
- Client handshake accepts the compat triple only when `payload.compat === true`,
  the observed version satisfies the same range, and the catalog repeats the compat
  identity/profile. Self-check shows a warning tag and the observed version; the UI
  keeps working.
- Docs/README explain: certified = fully verified; compat = best-effort token-only
  styling on newer builds, never a hard break; older-than-0.2.0-rc.2 stays rejected.

## 2. Wallpaper system (client-owned)

Wallpaper is a **client-only visual layer** (no host boot/config change), persisted
in `localStorage` under `dsh-livery.wallpaper.v1` and applied by the client
presenter via one plugin-owned `<style data-plugin-css="dsh-livery/wallpaper">`.

- Built-in wallpapers: 8 deterministic CSS-only designs (aurora, dusk, mist, paper,
  ink, ember, sea, mono), expanded to 24 in round 9. They are gradients and meshes
  only: no network, no bundled images.
- Online: **Search** uses the Openverse API (CC0/PDM filter,
  `https://api.openverse.org/v1/images/`), with a query, a 12-item result grid,
  attribution/licence line, paging and a graceful offline/error state. **Random**
  refreshes from Picsum's public list (`https://picsum.photos/v2/list`). Network
  requests only start when the user opens the tab or clicks an action; README and
  SECURITY document them.
- Custom URL: `https` only, max length; no `javascript:`/`data:`/`http:`.
- Effects: blur 0–24 px, dim 0–70 %, frost 0–100 % (translucent livery surfaces:
  background tokens from the active compiled livery are mixed toward transparent by
  a validated percentage). Wallpaper requires an active visual style for surface
  translucency; with stock appearance the layer applies but surfaces stay stock.
- Layer DOM: client sets `body[data-dsh-wallpaper]`; CSS uses only
  `body[data-dsh-wallpaper]::before/::after` (own pseudo-elements) plus token
  overrides with the plugin's `body[data-dsh-livery]` scope. No host component
  selectors, no `!important`, no remote fonts. URLs are injected only as a
  single-quoted `background-image` value after validation, and escaped.
- The wallpaper panel is a second top-level tab in the visual-style page:
  `视觉风格 / 壁纸` (Visual styles / Wallpapers). Applying a livery and applying a
  wallpaper are independent mutations (wallpaper localStorage, livery host config).

## 3. Gallery UX

Replace the 24-card flat grid + 16 always-visible tag chips with:

- Primary filter chips: `全部` + six **style families** derived from tags
  (`calm`, `nature`, `light`, `retro`, `vivid`, `dark`) with localized labels; all six must be non-empty for the shipped set.
- A `更多筛选 / More filters` toggle reveals the remaining tag chips (the current
  16-tag vocabulary) only on demand; search stays always visible.
- Gallery rendered as family **sections** (heading + count + cards) in family order (calm, nature, light, retro, vivid, dark),
  cards remain one focusable listbox with roving keyboard focus (sections are
  presentation only; global card index keeps Arrow/Home/End semantics).
- Keyboard/`data-testid` contract preserved: `livery-gallery`, `livery-card`,
  `livery-tag`, `livery-search`; new hooks: `livery-family` (section),
  `livery-family-<id>`, `livery-more-filters`, `livery-family-chip`.

## 4. README / positioning

Rewrite EN + zh README around the DSH Livery visual styling feature set: what it adds over
a generic skin: a 24-style visual system, a wallpaper studio with online search and
effects, the certified compatibility policy, token-only/zero-takeover safety, and the
verification matrix with its known limitations. Explicitly explain "不接管主题 ≠ 普通皮肤" and the
certified-vs-compat policy table. Update SECURITY for wallpaper network requests,
docs/verification for wallpaper coverage, and CHANGELOG (unreleased 0.1.0).

## 5. Round 9 — wallpaper fixes/expansion (still unreleased 0.1.0)

User feedback after testing the real Web Profile:

1. **Tab bounce.** Selecting a wallpaper sometimes resets the page to the
   视觉风格 tab. Root fix: the active page tab is remembered at module scope (and
   `sessionStorage`, best-effort) so a workspace remount/navigation restores it;
   selecting a wallpaper must never touch view state.
2. **Third-party plugin coverage.** The current design only tints surfaces that
   use the active livery's tokens, so plugin pages with their own opaque surfaces
   hide the wallpaper. Add a generic **global atmosphere layer**: a
   plugin-owned fixed overlay above all app content (`pointer-events:none`,
   `mix-blend-mode:soft-light`, default opacity ~30 %) that guarantees the
   wallpaper is perceptible on any plugin page without targeting their DOM.
   Keep the immersive under-content layer + token frost for core surfaces.
   New effect control: 全局氛围 / Atmosphere (0–100, 0 = immersive only).
3. **More wallpapers + a curated crawler.** Expand built-ins from 8 to 24 CSS-only
   designs. Add an **online wallpaper library** ("轻量策展爬虫"): curated style
   categories (nature/city/abstract/minimal/sky/texture/space/gradient) mapped to
   licence-safe Openverse CC0/PDM queries, pageable batches, a localStorage cache
   with a 6 h TTL, request timeout/retry, dedupe, a cached fallback when offline and
   attribution on selection. The library appears first in the wallpaper tab;
   custom upload/URL stays below it. The library was removed in round 11; see §7.
4. **User upload + adaptive sizing.** File picker + drag/drop (JPEG/PNG/WebP/AVIF,
   ≤10 MiB), stored in IndexedDB (`dsh-livery-wallpapers`), restored after reload;
   https URL input retained. Rendering always uses viewport-relative
   `background-size:cover; background-position:center` (both layers), so portrait,
   ultrawide and resized windows crop instead of distorting.
5. **Version policy.** Still unreleased `0.1.0`; no version bump for any of the
   above. Commits stay one-line.

## 6. Round 10 — layout redesign (still unreleased 0.1.0)

User feedback: the wallpaper page modules (built-ins, effects, upload, random/library)
are flat/monotonous, and the style page is too simple. Requirements:

- **Module hierarchy, not one flat list.** Every area is a card or section with a
  header, bordered surface, consistent padding and spacing. The visual hierarchy runs
  from the hero to main modules to secondary modules. Avoid 100%-width sliders and
  rows.
- **Wallpaper page**: responsive two-column card layout at ≥1100 px: main column
  (current-wallpaper hero card → online wallpapers card → custom upload/URL card) and
  a side rail (effects card with compact constrained sliders in a 2×2/stacked
  layout → built-ins card with a compact 24-swatch grid). Stack to one column
  below 1100 px. The effects module must NOT use viewport-wide sliders; sliders are
  bounded (~160–220 px) with value badges, in a gridded card.
- **Style page**: current-style hero/summary card + action area, gallery card with
  toolbar and family sections, and a side rail (self-check/details; current
  style/actions may live here on wide screens) using the same card system.
  Preserve all existing behavior/testids; only presentation/layout changes.
- Preserve data-testids used by acceptance, keyboard/focus, no `!important`, no
  remote assets, no host component selectors. CLIENT_CSS budget raised to 12 KiB;
  client gzip stays within 48 KiB.
- Version unchanged (unreleased 0.1.0); commit stays one line.

## 7. Round 11 — copy, typography and online-wallpaper simplification (unreleased 0.1.0)

User feedback:

1. **About/footer copy is machine-speak.** Replace the concatenated jargon
   ("契约 … 适配器 … 预览来自固定的契约场景，不是宿主实拍截图") with human
   sentences, e.g. “DSH Livery 0.1.0，已适配 DeepSeek Harness
   <hostVersion>。” + “画廊预览图按固定场景生成，用于展示风格差异，不是宿主界面
   截图。” Keep technical ids available in the copyable self-check/diagnostics only.
2. **Typography is fragmented across modules.** Introduce one typography primitive
   set shared by both pages (no ad-hoc per-module font sizes): design tokens for
   display/title/body/label/caption/value, one family/line-height scale, applied
   to card titles, section heads, hints, chips, badges and hero text. Target ≤5
   font sizes across the client UI; add a CSS guard test.
3. **Remove the curated online wallpaper library.** It is not maintained and does
   not load; drop category chips, cache/crawler module and its UI/tests.
4. **Search-first online wallpaper card, auto random batch on open.** The
   wallpaper page's online card moves up (after the hero) and is just search +
   随机 + 换一批 + result grid/status/attribution. Opening the wallpaper tab
   automatically triggers one random fetch and shows a batch (Picsum list works;
   Openverse search remains for explicit queries). Keep uploads/URL/builtins/
   effects/hero unchanged; keep all other acceptance testids where possible.
5. Version unchanged (unreleased 0.1.0); one-line commit.

## 8. Round 13 — product name and recent-wallpaper cache (unreleased 0.1.0)

1. **Product name.** The visible name is **DSH Livery** again (package `dsh-livery`);
   An earlier editorial label was used during the README repositioning and is not the
   project name. Update footer (`DSH Livery <version>`), diagnostics header and
   README/docs references; describe the feature set plainly, without a separate
   product name.
2. **Recent wallpapers.** Every applied **online** wallpaper is remembered locally
   and shown in a new “最近使用 / Recent wallpapers” card on the wallpaper page:
   thumbnail, title/source, click to re-apply, clear-history action. Persist in
   `localStorage['dsh-livery.wallpaper.recent.v1']` (max 24, newest first, dedupe
   by URL, corrupt records ignored). While adding an entry, try to cache the remote
   image blob in the existing IndexedDB store (`remote-<hash(url)>`) so re-applying
   can use the local copy when available; CORS/network failures are non-fatal and
   fall back to the original URL (browser cache may still serve it). The cache is
   browser-local, never uploaded, and independent of the DSH profile.
   Testids: `wallpaper-recent-card`, `wallpaper-recent-item` (`data-url`),
   `wallpaper-recent-clear`; cached status may be exposed as `data-cached`.
3. Version stays unreleased `0.1.0`; one-line commit.
