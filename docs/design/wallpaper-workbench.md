# Wallpaper workbench layout (0.1.7)

Status: current for the DSH Livery `0.1.9` release candidate. This note is versioned with the release so the layout
decision and its acceptance boundary stay reviewable after later changes.

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
3. The source tabs remain the only source-picker control surface. The remote
   wallpaper focal-position control is not hidden to win a first-viewport metric.
4. At 1024/767 the source card is reached by normal scrolling. Only the
   side-by-side 1440 workbench promises the source tabs in the initial viewport.
   That boundary is intentional, not an accidental threshold relaxation.
5. No card height is hard-coded per module; equal-height behavior comes from the
   grid stretch and the card's flex column, so future copy changes do not reopen
   the mismatch.

## Online result thumbnails

The Online tab renders each provider result's `thumbnail` as an `<img>` inside the
result card, with the local skeleton underneath while loading and if the image
fails. Opening the tab already requests one Picsum list batch; thumbnail requests
are made only for those returned results and are not background polling. If a
thumbnail cannot load, the card remains usable and the title/skeleton are shown.
The 0.1.7 acceptance check `wallpaper.online-thumbnails` asserts both the image
count and successful natural-size load count, in addition to the fallback.

## Host plugin surfaces

All host plugin pages inherit the livery layer ladder. Livery adds a small
hue-preserving lift to `--dsw-alias-bg-layer-1/2/3` so cards, tables and overlays
remain visible above the page base, and rebinds the framework Tailwind palette
variables used by data-heavy plugins (e.g. `dsh-context` charts) to the active
livery tokens. This is one implementation for every plugin surface, not a
per-page selector override.

## Sidebar surface

The host left navigation is painted through two different token paths, and both
must produce the same wall-relative transparency as the main column:

| Host path | Painted value | Wallpaper treatment |
|---|---|---|
| Web, Windows, macOS drawer | `--dsw-specific-sidebar-fill` directly | Frost the fill once at `remaining%` (`100 - frost`). |
| macOS ordinary sidebar | wash gradient over `--dsw-specific-sidebar-tint` (stock: 40% of the fill in light mode, 50% in dark mode; light mode adds a 3% `#7a9bf0` cast) | Author the tint at the same `remaining%`; do not let the host's 40/50% multiply the frosted fill again. |

Frosting only the fill is not enough on macOS: the host would compose
`40–50% × remaining%` (26–33% at the default 35% frost) for the sidebar while the
main column uses `remaining%` (65%). Over a light wallpaper the left rail then reads as
a pale sheet under white labels, and the two sides no longer look like one theme.

The wallpaper stylesheet therefore emits
`--dsw-specific-sidebar-tint: color-mix(in srgb, color-mix(in srgb, <fill> 97%, #7a9bf0) <remaining>%, transparent)`
in light mode and `color-mix(in srgb, <fill> <remaining>%, transparent)` in dark
mode. This is token-only (no host hashed classes), preserves the host's light-mode
blue cast, and leaves the sidebar fill slightly distinct from the main base by
colour rather than by opacity. The fill remains frosted for the other host paths
and for the macOS drawer. With no wallpaper the host keeps its stock 40/50% vibrancy;
under `prefers-reduced-transparency: reduce` or `forced-colors: active` the whole
glass block is absent and the host paints its opaque fallback.

## Visual verification

- `scripts/acceptance/layout-preview.mjs` measures card boxes, source-tab position,
  horizontal overflow, effects columns and preview geometry at 1440/1024/767 in
  light/dark and wallpaper-off/on states.
- The 0.1.7 matrix applies a **real online Picsum wallpaper** through the Online
  path (mock 302 + final URL revalidation + blob cache), never the built-in Aurora
  default. Per-livery style and README showcase captures use the same online path.
- Layout preview is expected to report 0 high / 0 medium on the accepted candidate.
- Browser acceptance still asserts no horizontal overflow, one source card with
  four tabs, and one-column workbench behavior at 1024/767. The release evidence
  for 0.1.7 binds these runs to the artifact.
- Before the next artifact is frozen, Desktop acceptance must add a sidebar
  parity check: with a dark livery and a light wallpaper active, the computed
  `--dsw-specific-sidebar-tint` alpha must equal the computed
  `--dsw-alias-bg-base` alpha (both `remaining%`), and the captured dark-theme
  screenshot must show the navigation text at the same surface family as the main
  column. The stylesheet unit test covers the token math, not the rendered host.

## Related evidence

- `contracts/dsh/evidence/0.1.7/` — seven host evidence files.
- `docs/verification.md` — scope, counts, known limitations.
- `CHANGELOG.md` — 0.1.7 change record.

Any future change to these breakpoints, card order or preview behavior is a
user-visible design change: update this note, README, CHANGELOG and the acceptance
layout checks before rebuilding the candidate.
