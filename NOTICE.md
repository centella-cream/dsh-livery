# NOTICE

DSH Livery is an independent plugin for DeepSeek Harness. It does not copy
source code from other DSH skin or theme plugins. Its OKLab/OKLCh conversion
approach and the general "semantic token layer + boot injection" architecture
were reimplemented from the public design notes in `references/design.md`.

* Research caches and extracted third-party materials stay outside the
  repository (untracked). None are part of the build, the packed plugin or the
  acceptance evidence.
* DSH Livery ships no third-party images, fonts, character art, brands or
  trademarks. All preview thumbnails are generated from the plugin's own token
  data at build time.
* DeepSeek Harness (`@deepseek-ai/*`) is MIT licensed; see the host package for
  its own notice.

## Design inspirations (palettes)

The 24 styles include 10 original designs, 12 palettes **inspired by**
well-known open-source themes, and 2 original Chinese designs (青瓷 Celadon,
朱砂 Cinnabar). No source code, images, fonts, character art or trademarks are
copied. Colours are re-derived through DSH Livery's own OKLab seed/token
pipeline, with light and dark variants written for host-token contrast, so each
shipped style is an interpretation rather than a pixel-exact port. The following
projects are credited as colour inspirations under their permissive licences:

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

Names identify the inspiration only. DSH Livery is not affiliated with or
endorsed by these projects. See `docs/research/design-references.md` for the full
design table and rationale.

## Bundled third-party code

The packed host plugin is minified and includes the following dependency. Its
licence text is reproduced below as required.

### @deepseek-ai/schemastery 3.18.5

MIT License

Copyright (c) 2021-present Shigma

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### @deepseek-ai/cosmokit 1.8.6

MIT License

Copyright (c) 2021-present Shigma

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
