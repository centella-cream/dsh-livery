# NOTICE

DSH Livery is an independent plugin for DeepSeek Harness. It does not copy
source code from other DSH skin/theme plugins; the OKLab/OKLCh conversion
approach and the general "semantic token layer + boot injection" architecture
are reimplemented from the public design notes in `references/design.md`.

* Research caches and extracted third-party materials are kept outside the
  repository (untracked); none are part of the build, the packed plugin or the
  acceptance evidence.
* DSH Livery ships no third-party images, fonts, character art, brands or
  trademarks. All preview thumbnails are generated from the plugin's own token
  data at build time.
* DeepSeek Harness (`@deepseek-ai/*`) is MIT licensed; see the host package for
  its own notice.

## Round-5 design inspirations (palettes)

The 24-livery set keeps 10 original designs and adds 12 palettes **inspired by**
well-known open-source themes, plus 2 original Chinese-aesthetic designs
(青瓷 Celadon, 朱砂 Cinnabar). No source code, images, fonts, character art or
trademarks are copied; the colours are re-derived into DSH Livery's own OKLab
seed/token pipeline (light + dark variants authored for host-token contrast), so
each shipped livery is an interpretation rather than a pixel-exact port. The
following projects are credited as colour inspirations under their permissive
licences:

- Nord — © Arctic Ice Studio / Sven Greb — MIT — https://github.com/nordtheme/nord
- Dracula — © Dracula Theme contributors — MIT — https://github.com/dracula/dracula-theme
- Gruvbox — © Pavel Pertsev — MIT/X11 — https://github.com/morhetz/gruvbox
- Solarized — © Ethan Schoonover — MIT — https://github.com/altercation/solarized
- Catppuccin — © Catppuccin contributors — MIT — https://github.com/catppuccin/catppuccin
- Tokyo Night — © Folke Wüstenberg / tokyonight.nvim contributors — Apache-2.0 — https://github.com/folke/tokyonight.nvim
- Rosé Pine — © Rosé Pine contributors — MIT — https://github.com/rose-pine/palette
- Everforest — © sainnhe — MIT — https://github.com/sainnhe/everforest
- Kanagawa — © rebelot — MIT — https://github.com/rebelot/kanagawa.nvim
- One Dark — © GitHub/Atom contributors — MIT — https://github.com/atom/one-dark-syntax
- Ayu — © Ayu Theme contributors — MIT — https://github.com/ayu-theme/ayu-colors
- Flexoki — © Steph Ango — MIT — https://github.com/kepano/flexoki

Names identify the inspiration only; DSH Livery is not affiliated with or
endorsed by these projects. See `docs/research/design-references.md` for the full
design table and rationale.
