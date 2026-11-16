# Style gallery and GUI style recipes (target 0.1.9)

Status: working-tree design for the next release. This note covers the compact
style catalog (information architecture) and the GUI-level recipe expansion. The
support matrix and release evidence remain in
[`contracts/dsh/support-matrix.json`](../../contracts/dsh/support-matrix.json) and
[`docs/verification.md`](../verification.md).

## Problem

Two failures were visible on the 1440×900 DSH Desktop style page:

1. **The stage pushed the catalog out of view.** The page opened with a 16:10
   current-style hero (about 500 px) and then a 4-column catalog grouped into six
   family sections. Only four cards were visible before scrolling, the full set
   needed roughly 2.8k px of scroll, and the family headings repeated the category
   navigation already provided by the chips above the grid.
2. **Palette and type carried most of the difference.** The surface-style system
   already changed radius, elevation, borders and material, but the shipped set
   clustered around `paper`, `soft` and `rounded`; zero-radius and hard-shadow
   recipes were underused. The card did not say which shape/material/type a style
   would apply, so the gallery read as “same GUI, different colours and fonts”.

## Catalog: one compact grid, chips are the only taxonomy

- The current style is a **summary bar**, not a stage: a 220×138 preview, name,
  short description, tags and actions inline. At 1440 the hero is 164 px tall
  instead of about 500 px.
- The catalog is **one continuous grid**. Family chips filter it; there are no
  per-family section headings and no second category nav below the grid. Cards
  keep `data-family` for tests and filtering, but the taxonomy is not repeated in
  the DOM.
- The default order teaches the range immediately: surface recipes sort from the
  most distinctive (`brutal`, `terminal`, `pill`, `editorial`, `glass`) through
  `elevated`, `sharp`, `flat`, `rounded`, `paper` back to `soft`, then manifest
  order inside a recipe. The first row therefore shows four visibly different GUI
  shapes, not four recolours of the same one.
- Cards are compact: thumbnail, name and two **style-DNA** labels. The longer
  description lives in the native `title` and in the current-style bar, so it is
  available without making every cell tall. Tags remain searchable metadata.
- Density by container width (`livery-studio`):

  | Container width | Columns | 1440/1024/767 measurement |
  |---|---|---|
  | > 999 px | 6 | 1440 px panel: 6 columns, card 184×163 |
  | 800–999 px | 4 | — |
  | 600–799 px | 3 | 1024/767 px panel: 3 columns, card 224×188 / 232×193 |
  | ≤ 599 px | 2 | — |

- The single `role="listbox"` keeps the existing roving-focus contract; the sort
  order is the flattened order, not a second DOM structure.
- Measured at 1440×900: 24 cards, 6 columns, grid starts at y = 529, document
  scroll 1307 px (was 2788 px), no horizontal overflow. At 1024/767 the panel is
  691/714 px wide, so 3 columns and about 2.3k px of scroll are the correct
  density; the target is no overflow, not an equal column count at every viewport.

## Style DNA

Every card names two traits derived from compiled data:

- **shape/material** from `layout.surfaceStyle` (`terminal`, `brutal`, `pill`,
  `paper`, `glass`, …);
- **UI type family** from the resolved UI font stack (`sans`, `serif`, `mono`,
  `display`, `rounded`).

There is no second manifest field, so a card cannot advertise a recipe the
stylesheet does not ship. The classifier resolves `sans-serif` before `serif` so
every normal UI stack is not mislabeled.

## GUI recipes: spread the surface axis

The twelve registered surface recipes now include three new ones and one existing
unused recipe is assigned:

| Recipe | Shape / elevation language | Assigned style |
|---|---|---|
| `terminal` | square, no shadows, crisp rules | `graphite` |
| `brutal` | square blocks, hard offset shadows, strong rules | `cinnabar` |
| `pill` | capsule controls, large panels, soft shadows | `sakura` |
| `editorial` | near-square print geometry, strong rules, no elevation | `rice-paper` |

The other palettes keep their existing recipe. The set stays at 24 styles; the
change is a rebalance of the shape/elevation axis, not a new palette round. The
preview renderer now parses unitless `0` radius values; before this fix square
recipes silently fell back to the stock 16 px preview radius, which is why the
gallery under-reported their difference.

## Boundaries

- Token-only: recipes use the frozen shape/elevation/material/border families;
  there are no host component selectors, hashed classes or `!important`.
- Contrast and capability gates run on every compiled profile; the twelve
  recipes are validated by the same registry self-check as the previous nine.
- Long descriptions are not removed from the product; they move to the current
  style bar and the native card title.
- The compact layout does not claim equal visual density on opaque third-party
  pages.

## Verification

- Unit: gallery render, style-DNA classification, registry order, preview
  zero-radius regression. `pnpm verify` must be green.
- Measured layout: 1440/1024/767 via the real Electron renderer with a brand-new
  isolated DSH home and user-data dir; no horizontal overflow.
- Before the next artifact is frozen, re-run the full Web and Desktop acceptance
  matrix and update `docs/verification.md` with the counts. This note is not
  release evidence.
