# Wallpaper workbench layout (0.1.7)

Status: current for DSH Livery `0.1.7`. This note is versioned with the release so
the layout decision and its acceptance boundary stay reviewable after later changes.

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

## Sidebar surface

The host left navigation uses `--dsw-specific-sidebar-fill`. Wallpaper frost
includes that token in the same active-livery surface override set, so the image
continues behind the navigation instead of stopping at an opaque sidebar edge.
The host remains the painter; Livery only provides the translucent color-mix value
when wallpaper is active and never targets host hashed classes.

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

## Related evidence

- `contracts/dsh/evidence/0.1.7/` — seven host evidence files.
- `docs/verification.md` — scope, counts, known limitations.
- `CHANGELOG.md` — 0.1.7 change record.

Any future change to these breakpoints, card order or preview behavior is a
user-visible design change: update this note, README, CHANGELOG and the acceptance
layout checks before rebuilding the candidate.
