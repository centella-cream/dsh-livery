# DSH Livery (dsh-livery)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/dsh-livery.svg)](https://www.npmjs.com/package/dsh-livery)
[![Node](https://img.shields.io/badge/node-%5E22.23.1%20%7C%7C%20%5E24.21.0-339933.svg)](package.json)
[![DSH](https://img.shields.io/badge/DSH-0.2.1--rc.2%20Web%20%2B%200.2.2--rc.5%20Desktop-6d6df6.svg)](#supported-dsh-builds)

> **Make your DSH beautiful to look at — and alive to use.**

A visual layer for DeepSeek Harness: **28 curated styles**, a wallpaper studio with
online images and blur/frost effects, and a style gallery. It is a plugin, not a
host theme takeover.

> **Release status: `0.2.1` — visual and protocol release.**
> All 13 declared scopes have current acceptance evidence and the release gates
> pass. The published artifact is `dsh-livery@0.2.1`.
> **Stable certified:** DSH `0.2.1-rc.2` + Web Profile, and DSH `0.2.1-rc.3` +
> macOS Desktop. **Preview:** DSH `0.2.1-rc.4` Web, DSH `0.2.1-rc.5` Web/Desktop,
> DSH `0.2.2-rc.1` Web/Desktop, DSH `0.2.2-rc.2` Web/Desktop, DSH `0.2.2-rc.3`
> Web/Desktop and DSH `0.2.2-rc.5` Web/Desktop. `0.2.2-rc.3` is npm `next` and a GitHub prerelease; `0.2.2-rc.5` is npm
> `latest` but still a GitHub prerelease, so both remain preview claims. The `0.2.1` candidate is **exact-certified only**: unknown
> builds fail closed; Windows Desktop, Edge and other DSH builds remain
> unsupported.

English · [中文](README.zh-CN.md)

![DSH Livery 0.2.1 Visual Style page: live preview, current style, and 28-style catalog](docs/assets/hero-en.jpg)

Screenshots are from the English UI; the Chinese README uses the Chinese UI.
Livery follows the DSH host locale.

## What's new in 0.2.0

- **Chinese typography is now a real choice.** 13 local font stacks (up from 10),
  including new `kai-cjk`, `fangsong-cjk` and `rounded-cjk` families. Chinese UI,
  content and code can differ per style; Bauhaus, Blueprint, Linen, Sakura,
  Celadon, Clay, Cinnabar, Plum and Rose Pine use different CJK families.
- **A visible label hierarchy.** Secondary and tertiary labels are derived from
  each style's text/surface seeds instead of one neutral host ramp, so captions,
  metadata and links read as a family without hurting contrast.
- **L5a Studio Decoration across 26 of 28 styles.** Grid, dots, rules and frame
  patterns are derived from the surface axis and appear on Livery-owned surfaces;
  only `solid` and `glass` stay plain.
- **A calmer style page.** The live preview and current-style copy now share one
  row on wide layouts; the restore action never wraps.
- **A more legible macOS rail.** The sidebar is frosted slightly more than the main
  column (`+20 %`, capped at 94 %), keeping labels readable while preserving a
  wallpaper trace. The host still owns its final tint/wash composition.
- **Protocol hardening.** v2 presentation axes, audit envelopes, exact-host
  adapters, deep catalog validation and 13 reaccepted scopes.

## 0.2.1 patch

- All floating menus are now opaque, fixing background-task details and nested popovers showing page text.
- Direct-paint sidebars (Web/Windows/drawer) now match the macOS composite alpha (34% light / 42.5% dark).

## Highlights

- **28 styles across six visual axes.** Colour (OKLab seeds → complete light/dark
  tokens), typography (13 local-only font stacks, including 6 CJK families, and 9 typography profiles), shape,
  elevation/material, border/focus treatment and component chrome. The set includes
  14 original designs, 12 permissively licensed palettes and 2 original Chinese
  designs.
- **A live preview, not a hero-plus-scroll.** The current style shows a real DSH
  surface beside its description; 28 styles sit in one continuous 6/4/3/2-column
  grid, with the family chips as the only taxonomy.
- **Style DNA on every card.** Each card names its surface recipe, component
  chrome and UI type family, so visually different designs are recognisable before
  applying them.
- **GUI-first palettes.** Blueprint, Bauhaus, Clay and Phosphor push the set beyond
  colour swaps: engineering cyan, mustard/cobalt display type, terracotta pills and
  green CRT terminal surfaces.
- **Component chrome.** `layout.chrome` can tint, outline, darken or block-fill the
  rail, composer, bubble, active row and selector from the palette seeds; six
  recipes ship and all 28 styles choose one.
- **Wallpaper studio.** Online Picsum/Openverse sources, 24 built-in CSS wallpapers,
  Recent, and local/link uploads (IndexedDB). Blur 0–24 px, dim 0–70 %, frost
  0–100 % and a global atmosphere overlay. The painted wallpaper layers are
  viewport-relative `cover`, so images crop without geometric distortion.
- **Presets and focal position.** Export/import style + wallpaper + effects +
  nine-grid focal point; remote/upload wallpapers support pointer and keyboard
  focal positioning. Presets never contain uploaded blobs, CSS, tokens or paths.
- **Legible, distinct macOS rail.** The sidebar fill is frosted slightly more than
  the main column (`+20 %`, capped at 94 %) so labels stay readable over a light
  wallpaper while the rail keeps a visible wallpaper trace. The host still owns
  its final tint/wash composition; the probe measures the real DOM surface.
- **Trust by construction.** Exact host allowlist, frozen contracts, token-only
  CSS, loader-ABI checks, contrast/CSS audits and committed acceptance evidence.
  Unknown hosts are rejected at install and fail closed to stock at runtime.

## Styles

![Six selected styles: Blueprint, Bauhaus, Clay, Phosphor, Cinnabar and Graphite](docs/assets/styles-en.jpg)

Six of the 28 styles: **Blueprint, Bauhaus, Clay, Phosphor, Cinnabar and Graphite**.
Each tile is a live DSH surface with that style applied; the gallery uses the same
preview scenes.

## Wallpapers

![Online photo wallpaper with blur, dim, frost, atmosphere and focal controls](docs/assets/wallpaper-studio-en.jpg)

The 0.2.1 wallpaper studio with a real online photo and the live 16:9 preview. Blur, dim,
frost and the global atmosphere controls apply to the whole interface. Focal
positioning is available for remote and uploaded wallpapers, not for built-in
designs. Opening
a tab loads one batch of content; search, randomise, page or switch source
explicitly. Wallpaper choices stay local.

## Every DSH plugin page

![Context insight page rendered with the active Blueprint style and Aurora wallpaper](docs/assets/plugin-surfaces-en.jpg)

The Context insight page shown with the same active style and wallpaper. Host
plugin pages such as Trajectory, Context and Agent Team share the livery token
layer: cards, tables and overlays get the same surface ladder, and third-party
chart palette variables resolve to the active livery tokens. No per-plugin
selectors or hashed host classes.

## Supported DSH builds

`engines.dsh` is the reviewed 0.2 **installability** range; runtime acceptance is exact-certified only:

```text
>=0.2.1-rc.2 <0.3.0
```

Only builds listed in the formal matrix have a runtime adapter. An in-range but
uncertified build installs but fails closed before adapter selection; there is no
version-string compatibility fallback.

| Host build | Entry | Runtime | Status |
|---|---|---|---|
| DSH `0.2.1-rc.2` | Web Profile + Chrome `156.0.8078.48` | Node `22.23.1` | **Stable certified** (npm `latest`) |
| DSH `0.2.1-rc.3` | macOS Desktop app | Electron `44.7.0` / Node `24.21.0` / Chromium `152.0.7977.130` | **Stable certified** renderer surface |
| DSH `0.2.1-rc.4` | Web Profile + Chrome `156.0.8078.48` | Node `22.23.1` | **Next-channel preview** |
| DSH `0.2.1-rc.5` | Web + macOS Desktop | Node `22.23.1` / `24.21.0` | **Preview** |
| DSH `0.2.2-rc.1` | Web + macOS Desktop | Node `22.23.1` / `24.21.0` | **Preview** |
| DSH `0.2.2-rc.2` | Web + macOS Desktop | Node `22.23.1` / `24.21.0` | **Preview** (npm `next`) |
| DSH `0.2.2-rc.3` | Web + macOS Desktop | Chrome `156.0.8078.48` / Electron `44.7.0` / Node `24.21.0` / Chromium `152.0.7977.130` | **Preview** (npm `next`) |
| DSH `0.2.2-rc.5` | Web + macOS Desktop | Chrome `156.0.8078.48` / Electron `44.7.0` / Node `22.23.1` / `24.21.0` / Chromium `152.0.7977.130` | **Preview** (npm `latest`, GitHub prerelease) |

Compatible-preview mode is not a stability claim; 0.3+ and API-divergent builds
still fail closed. Stable support requires a non-prerelease official GitHub
release plus the matching signed npm package on `latest`; npm `next` and GitHub
prereleases are preview claims, not stability promises. Native macOS window chrome,
traffic lights, vibrancy, Dock/rightbar states and OS-level DPI are host-owned and
outside plugin certification. Full policy: [docs/design/multi-version.md](docs/design/multi-version.md).

## Install

Latest published package: [`dsh-livery@0.2.1`](https://www.npmjs.com/package/dsh-livery).

### Web Profile

```bash
dsh plugin --profile web add dsh-livery@0.2.1
dsh web
```

### Desktop app

```bash
dsh plugin --profile desktop add dsh-livery@0.2.1
```

Restart the app after the package changes. You can also install by package name
from **Settings → Plugins**.

If the registry age window rejects a fresh release, install the exact release
tarball after verifying its published sha256. Never install an unverified tarball.

## Verification

The `0.2.1` artifact passed full isolated acceptance on 13 Web/Desktop scopes:
Web `0.2.1-rc.2`, `0.2.1-rc.4`, `0.2.1-rc.5`, `0.2.2-rc.1`, `0.2.2-rc.2`,
`0.2.2-rc.3`, `0.2.2-rc.5` with **275 passed / 0 failed each**, and Desktop
`0.2.1-rc.3`, `0.2.1-rc.5`, `0.2.2-rc.1`, `0.2.2-rc.2`, `0.2.2-rc.3`,
`0.2.2-rc.5` with **34 / 0 each**. Evidence is bound under
`contracts/dsh/evidence/0.2.1/`. Scope, counts and limitations:
[docs/verification.md](docs/verification.md).

Release gates include `tsc`, the full test suite, token/contrast/CSS audits,
loader-ABI checks, exact support-matrix / release gates, `release:prepare` and
`prepublish-check`. The publish workflow never rebuilds the accepted tarball.

## Documentation

- [Docs index](docs/README.md)
- Design: [interfaces](docs/design/interfaces.md) · [style system](docs/design/style-system.md) · [wallpaper workbench](docs/design/wallpaper-workbench.md) · [multi-version policy](docs/design/multi-version.md)
- [Verification summary](docs/verification.md)
- [CHANGELOG](CHANGELOG.md) · [SECURITY](SECURITY.md) · [SUPPORT](SUPPORT.md)

## License

MIT, see [LICENSE](LICENSE). Palette attributions are in [NOTICE.md](NOTICE.md).
Preview thumbnails and built-in wallpapers are generated from the plugin's own data.
The optional wallpaper studio loads online images only when you open the wallpaper
tab or take an explicit action (see [SECURITY.md](SECURITY.md)).
