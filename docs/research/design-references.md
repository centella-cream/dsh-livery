# Design references: the 24-style set

> **Status (0.1.3):** current attribution record for the 24 shipped styles.

The set keeps the 10 original ids (retuned for the new style system) and
adds 14: 12 palettes inspired by open-source themes plus 2 original
Chinese-aesthetic designs (青瓷/朱砂). The open-source palettes are used as *colour
inspiration* under their permissive licences. No source code, images, fonts or
trademarks are copied, and every colour is re-derived through the plugin's own
OKLab seed/token pipeline, with light and dark variants written for DSH token
contrast. The machine-readable table is `docs/research/design-table.json`.

## Open-source inspirations

| id | name | source | licence | usage |
|---|---|---|---|---|
| nord | Nord | https://github.com/nordtheme/nord | MIT | palette inspiration |
| dracula | Dracula | https://github.com/dracula/dracula-theme | MIT | palette inspiration |
| gruvbox | Gruvbox | https://github.com/morhetz/gruvbox | MIT/X11 | palette inspiration |
| solarized | Solarized | https://github.com/altercation/solarized | MIT | palette inspiration |
| catppuccin | Catppuccin | https://github.com/catppuccin/catppuccin | MIT | palette inspiration (Latte light / Mocha dark) |
| tokyo-night | Tokyo Night | https://github.com/folke/tokyonight.nvim | Apache-2.0 | palette inspiration (Night dark / Day light) |
| rose-pine | Rosé Pine | https://github.com/rose-pine/palette | MIT | palette inspiration (Dawn light / Moon dark) |
| everforest | Everforest | https://github.com/sainnhe/everforest | MIT | palette inspiration |
| kanagawa | Kanagawa | https://github.com/rebelot/kanagawa.nvim | MIT | palette inspiration (wave dark / lotus light) |
| one-dark | One Dark | https://github.com/atom/one-dark-syntax | MIT | palette inspiration |
| ayu | Ayu | https://github.com/ayu-theme/ayu-colors | MIT | palette inspiration (Light + dark) |
| flexoki | Flexoki | https://github.com/kepano/flexoki | MIT | palette inspiration (official VS Code themes) |

**Attribution:** these names identify the inspiration only; DSH Livery is not
affiliated with or endorsed by the respective projects. Tokyo Night is
Apache-2.0 licensed (the only non-MIT inspiration); it is used as colour
inspiration only, with no source code or assets copied. Palette values are
adapted (contrast-repaired, re-derived into light/dark token sets for DSH), so
resulting liveries are interpretations rather than pixel-exact ports. Each
project's licence is cited above; the full licence texts live in their
repositories. The two original entries below are authored for this project.

## Original entries

| id | name | rationale |
|---|---|---|
| celadon | 青瓷 Celadon | 宋代青瓷釉色：微青、温润、留白充足；衬线标题 + 人文无衬线正文 + 大行距。 |
| cinnabar | 朱砂 Cinnabar | 印章朱砂：浓而不刺的红，圆角正式感，衬线正文 + 显示体标题。 |

## Style axes used to differentiate the 24 designs

Every livery differs on at least three axes (see `docs/design/style-system.md`):

1. **Palette** — light + dark seeds (accent / secondary / surface / text), each
   contrast-repaired by the compiler.
2. **Typography** — 10 local-only font stacks (system sans, humanist, serif
   CJK/Latin, display, rounded, mono-UI) plus 9 metric profiles that override the
   consumed host type-scale tokens (UI micro text, small text, brand row).
3. **Module shape** — 9 surface styles: radii scale (`--dsw-radius-xs…panel`),
   `--dsw-corner-shape`, elevation/shadow tokens and border tints, from sharp
   squared panels to pill-rounded cards and floating elevated panels.
4. **Material/背景质感** — glass-style translucent panels with
   `--dsw-menu-backdrop-filter`, paper/flat styles with hairline borders and no
   shadow, plus palette-driven surface tints.

Structural layout (transcript width, message flow, density) is still host-owned:
DSH exposes no public hook for it in any certified build, so those recipes remain
`host`/`stock` and are disclosed in the self-check rather than faked. The user-
visible module design differences come from the shape/elevation/material tokens
above, which the host consumes directly.
