# Wallpaper workbench layout (0.2.2 target)

Status: current for the DSH Livery `0.2.2` target release. The published baseline
is `0.2.1`. This note is versioned with the release so the layout decision and
its acceptance boundary stay reviewable after later changes.

## Problem

The 0.1.5 workbench kept a 16:9 preview but capped its height at 150 px on
medium-width panels. The preview therefore rendered as a wide, short strip: the
image was cropped into a bar and the current-wallpaper and effects cards had
different heights (one short card, one tall card, misaligned bottom edges). The
style page looked visually unbalanced even though its computed styles were valid.

## Decision

The workbench uses two explicit layout modes:

| Container width | Layout | Preview | Source picker |
|---|---|---|---|
| ≥ 1100 px | two columns, `1.9fr / minmax(320px, 1fr)` | fills the stretched card with `cover`; baseline 16:9 | below both cards |
| 800–1099 px | one column | 16:9, max 520 px | below effects, normal page scroll |
| ≤ 639 px | one column | 16:9, full width | below effects, normal page scroll |

Rules:

1. In the two-column mode the current-wallpaper and effects cards stretch to the
   same height; both bottom edges align and the source card starts immediately
   after the taller row. The preview grows with the card and uses `cover`, so the
   photo crops without geometric distortion.
2. In single-column modes the cards share the same width. The preview keeps a
   16:9 box (max 520 px at 1024/767, full width at phone width); it is never
   height-capped into a strip.
3. **Source-picker invariant (0.2.2):** the workbench has exactly two
   background-preset cards (`No wallpaper`, `Follow style`) above the unchanged
   four image-source tabs (`Online | Built-in | Recent | Local & link`). Those are
   the only source-picker surfaces; no other control changes the wallpaper. The
   remote/upload focal-position control is not hidden to win a first-viewport
   metric.
4. At 1024/767 the source card is reached by normal scrolling. Only the
   side-by-side 1440 workbench promises the source tabs in the initial viewport.
   That boundary is intentional, not an accidental threshold relaxation.
5. No card height is hard-coded per module; equal-height behavior comes from the
   grid stretch and the card's flex column, so future copy changes do not reopen
   the mismatch.

## Source picker and presets (0.2.2 target)

- The two preset cards are single-select real buttons with `aria-pressed`:
  `No wallpaper` is selected when the selection is `undefined`; `Follow style`
  when `selection.kind === 'style'`. The hero's existing Clear button remains a
  shortcut for `No wallpaper`.
- `Follow style` is disabled with a visible, programmatically associated reason
  when no catalog/tokens are available; the controller also rejects `setStyle`
  without tokens.
- The generated style background is not repositionable and has no focal control:
  only remote and upload wallpapers expose the nine-grid and pointer/keyboard
  focal positioning. A merely previewed preset changes nothing.
- Preset export/import covers the style target and attribution URLs in schema v2;
  v1 presets remain importable (details in [interfaces.md](interfaces.md) §6.2).

## Built-in gallery: 8 curated + 16 Classic (0.2.2 target)

- `VISIBLE_BUILTIN_IDS` is fixed, in order: `paper`, `ink`, `aurora`, `cyber`,
  `dusk`, `minimal`, `mono`, `sand` (four light, four dark). The Built-in panel
  renders: hint, optional pinned row, the 8-swatch grid, then a collapsed
  `<details>` group.
- The other 16 IDs stay loadable as **Classic** with byte-identical IDs and CSS.
  The Classic summary is dynamic: “Classic built-in designs (16)” normally, or
  “Classic built-in designs (16 total; 1 pinned above)” when one Classic ID is
  pinned out of the group.
- When the current selection is a built-in outside the visible 8 (including after
  a preset apply), a pinned “Current (Classic)” swatch renders above the grid with
  `aria-pressed="true"`; that ID is omitted from the grid and the Classic group so
  no `data-wallpaper-id` or selected state is duplicated. A merely previewed
  preset does not pin anything.
- No ID is remapped, and a preset referencing a legacy ID still applies.

## Online requests and states (0.2.2 target)

- **No request on panel mount or app boot.** The default image tab is Built-in,
  so opening the Wallpapers page renders the 8 curated swatches without network.
- The first activation of the Online tab triggers exactly one batch for the
  current provider/query (guarded to run only from `idle`). Later tab switches do
  not refetch. Search, Random, Refresh and Retry are the only other request
  triggers.
- The provider selector is a native `<select id="wallpaper-provider">` labelled
  “Source”, with `Auto` first and then the gate-passed providers in registry
  order (0.2.2 ships Wikimedia Commons only; Openverse was removed from the offered registry). Changing the provider
  clears results to `idle` and never fetches implicitly. Native keyboard behaviour
  is the keyboard model; no custom listbox.
- **Auto failover:** one overall 12 s deadline from request start; each attempt
  gets `min(6 s, remaining)`; Auto tries at most two gate-passed providers in
  registry order and names the provider that served the results (“Served by: …”,
  polite live region). A pinned provider makes one attempt and never silently
  changes. Picsum is never selected by Auto.
- Online status union: `idle | loading | ready | empty | timeout | rate-limited |
  auth-required | unavailable | invalid-response`; `empty` is a settled state,
  not a failure. All failures produce one error with Retry and links to
  Built-in/None. No polling, prefetch, background health check or telemetry.
- 0.2.2 no longer auto-Picsum: Picsum is not listed and not passed to Auto.
  Existing Picsum remote selections still render from the local cache; no new
  result carries a Picsum licence.
- Attribution is persisted with the selected remote image, never in the cache
  key: creator/licence/source links are HTTPS-validated and rendered as links
  opened with `rel="noreferrer noopener"`; `license:null` results are visible but
  not selectable. Recent history is a display mirror.

## Online result thumbnails

The Online tab renders each provider result's thumbnail as an `<img>` inside the
result card, with the local skeleton underneath while loading and if the image
fails. Thumbnail requests are made only for the results returned by a triggered
batch; they are not background polling. If a thumbnail cannot load, the card
remains usable and the title/skeleton are shown. Acceptance keeps
`wallpaper.online-thumbnails` for image count and natural-size load count plus the
fallback.

## Host plugin surfaces

All host plugin pages inherit the livery layer ladder. Livery adds a small
hue-preserving lift to `--dsw-alias-bg-layer-1/2/3` so cards, tables and overlays
remain visible above the page base, and rebinds the framework Tailwind palette
variables used by data-heavy plugins (e.g. `dsh-context` charts) to the active
livery tokens. This is one implementation for every plugin surface, not a
per-page selector override.

## Sidebar surface

The host left navigation is painted through two different token paths. They do
**not** produce identical alpha on macOS:

| Host path | Painted value | Wallpaper treatment |
|---|---|---|
| Web, Windows, macOS drawer | `--dsw-specific-sidebar-fill` directly | Frost the fill once at `remaining%` (`100 - frost`). |
| macOS ordinary sidebar | wash gradient over `--dsw-specific-sidebar-tint` (stock: 40% of the fill in light mode, 50% in dark mode) | The host composes the final surface; Livery only supplies the frosted fill/tint inputs. |

On DSH 0.2.x the macOS ordinary sidebar's final DOM alpha is therefore
`host tint factor × fill alpha` (about `0.4 × 0.65 = 0.26` in light mode at the
default 35% frost). The main column remains at `remaining%` (0.65).

This is a host-composition limitation, not a token that Livery can override
without host selectors. Token-only styling cannot make the ordinary sidebar reach
the main column's alpha on this host. The accepted behavior since 0.2.0 is:

- Web/Windows/drawer keep the frosted fill at `remaining%`;
- macOS ordinary sidebar keeps the host's 40/50% composite;
- `desktop.sidebar-path` measures the **real `sidebarCol` DOM background** and
  compares it with `fillAlpha × hostTintFactor`, not with the tint token;
- `prefers-reduced-transparency` and `forced-colors` keep their opaque host
  fallbacks.

No hashed host class selector or `!important` is used to force parity.

## Visual verification

- `scripts/acceptance/layout-preview.mjs` measures card boxes, source-tab
  position, horizontal overflow, effects columns and preview geometry at
  1440/1024/767 in light/dark and wallpaper-off/on states. The breakpoints and
  equal-height rules above are unchanged from 0.2.1.
- The 0.2.2 probe replaces the fixed Picsum-batch checks with
  `wallpaper.no-request-before-online`, `wallpaper.online-first-batch`,
  `wallpaper.provider-selector`, `wallpaper.provider-served-by`,
  `wallpaper.provider-failover`, `wallpaper.provider-rate-limited`,
  `wallpaper.builtin-visible-8`, `wallpaper.builtin-classic`,
  `wallpaper.builtin-current-classic`, `wallpaper.style-card`,
  `wallpaper.style-applied` (CSS only, no blob/image-store row),
  `wallpaper.style-disabled-no-catalog` and `wallpaper.attribution-links`.
- The README wallpaper showcase capture must use a built-in CSS wallpaper (or a
  CC0/public-domain photo with a documented credit) before packaging, so
  `NOTICE.md`'s “ships no third-party images” stays true. Visual-acceptance
  captures follow the same licensing rule.
- Layout preview is expected to report 0 high / 0 medium on the accepted
  candidate.
- Browser acceptance still asserts no horizontal overflow, the two preset cards
  plus the four image tabs, and one-column workbench behavior at 1024/767.

## Related evidence

- `contracts/dsh/evidence/0.2.1/` — published baseline acceptance (13 scopes).
- `docs/verification.md` — scope, counts, known limitations.
- `CHANGELOG.md` — 0.2.2 change record under `[0.2.2]`.
- 0.2.2 has no acceptance evidence yet; this note's target behaviour must be
  covered by the re-accepted final candidate before packaging.

Any future change to these breakpoints, card order, source picker or preview
behavior is a user-visible design change: update this note, README, CHANGELOG and
the acceptance layout checks before rebuilding the candidate.
