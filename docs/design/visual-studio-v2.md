# Visual Studio (unreleased 0.1.0) — compatibility, wallpaper, gallery UX (round 7)

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
  ink, ember, sea, mono) — gradients/mesh, no network, no bundled images.
- Online: `搜索` uses the Openverse API (CC0/PDM filter, `https://api.openverse.org/v1/images/`),
  with search query, result grid (12), attribution/licence line, refresh page and
  graceful offline/error state; `随机` refreshes from Picsum's public list
  (`https://picsum.photos/v2/list`). Network requests are user-initiated only and
  documented in README/SECURITY.
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

Rewrite EN + zh README around **DSH Visual Studio** (视觉工作室): what it adds over
a generic skin — 24-style visual system, wallpaper library with online search and
effects, certified compatibility policy, token-only/zero-takeover safety, verification
matrix and honest limitations. Explicitly explain "不接管主题 ≠ 普通皮肤" and the
certified-vs-compat policy table. Update SECURITY for wallpaper network requests,
docs/verification for wallpaper+welcome, CHANGELOG (unreleased 0.1.0).

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
3. **More wallpapers + curated crawler.** Expand built-ins 8 → 24 CSS-only
   designs. Add an **online wallpaper library** ("轻量策展爬虫"): curated style
   categories (nature/city/abstract/minimal/sky/texture/space/gradient) mapped to
   license-safe Openverse CC0/PDM queries, pageable batches, localStorage cache
   with TTL (6 h), request timeout/retry, dedupe, cached fallback when offline,
   attribution on selection. The library appears first in the wallpaper tab;
   custom upload/URL remains below.
4. **User upload + adaptive sizing.** File picker + drag/drop (JPEG/PNG/WebP/AVIF,
   ≤10 MiB), stored in IndexedDB (`dsh-livery-wallpapers`), restored after reload;
   https URL input retained. Rendering always uses viewport-relative
   `background-size:cover; background-position:center` (both layers), so portrait,
   ultrawide and resized windows crop instead of distorting.
5. **Version policy.** Still unreleased `0.1.0`; no version bump for any of the
   above. Commits stay one-line.
