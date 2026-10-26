# DSH Livery (dsh-livery)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.23.1%20%7C%7C%20%5E24.21.0-339933.svg)](package.json)
[![DSH](https://img.shields.io/badge/DSH-0.2.1--rc.2%20Web%20%2B%200.2.1--rc.3%20Desktop-6d6df6.svg)](#host-support-and-version-policy)

A visual styling plugin for DeepSeek Harness: 24 styles built on a frozen contract, a
wallpaper studio with online image search and blur/frost effects, and a style
gallery. It ships as a plugin that adds a visual layer **instead of taking over
the host theme**.

> **Release status: 0.1.0 limited release.** Supported exactly for:
> DSH `0.2.1-rc.2` + Web Profile + Chrome, and DSH `0.2.1-rc.3` Desktop app on
> macOS. Desktop Windows, Web Edge and all other DSH builds are not supported and
> are rejected. The published artifact is bound to the committed evidence files;
> `prepublish-check` refuses mismatched bytes.

[English](README.md) · [中文](README.zh-CN.md)

![24 built-in styles](docs/assets/gallery-24-light.jpg)

## Why not another skin plugin

Skin plugins often take over the host theme, register their own theme ids, paint
window chrome and inject broad CSS. That is also why they tend to break when DSH
changes. DSH Livery makes the opposite trade:

| Typical skin plugin | DSH Livery |
|---|---|
| Takes over `ctx.theme`, registers themes, calls `setTheme` | Emits one scoped semantic token pair per style; never registers or owns a host theme |
| Paints window chrome (title bars, overlays) | Draws no chrome; the host owns the window |
| Wide selector-based CSS that breaks when the host refactors | CSS built only from tokens, plus a body-scoped wallpaper layer; no host component selectors |
| Breaks or half-works after DSH updates | A formal limited-release scope: exact host build, Web profile, Chrome; every other host is rejected instead of guessed |
| "Trust me" theming | Frozen contract hashes, loader-ABI checks, contrast/CSS audits and a published acceptance matrix |

The result is a visual system you can check, not just a stylesheet: 24 styles
across five axes, a wallpaper studio, a style gallery and a version policy that
survives DSH updates.

## Features

- **24 styles across five visual axes.** Colour (OKLab seeds to a full light/dark
  token set), typography (10 local-only font stacks and 9 typography profiles), module
  shape (`--dsw-radius-*`, `--dsw-corner-shape`), elevation and material (flat or
  paper hairline panels, elevated cards, glass blur), and border/focus treatment.
  The set has 10 original designs, 12 palettes inspired by permissively licensed
  projects (MIT/Apache-2.0; see [NOTICE](NOTICE.md)) and 2 original Chinese designs
  (Celadon 青瓷, Cinnabar 朱砂).
- **Wallpaper studio.** 24 built-in CSS wallpapers and an **online wallpapers**
  card. Opening the wallpaper tab loads one random Picsum batch automatically; from
  there you can search Openverse (CC0/PDM), draw another random batch or load the next
  one. Local image upload (stored in IndexedDB) and https URLs are also supported.
  Effects: blur 0–24 px, dim 0–70 %, frost 0–100 %, and a global atmosphere
  overlay that keeps the wallpaper visible on **every** plugin page, including
  third-party panels with opaque surfaces. Both layers are viewport-relative
  `cover`, so portrait, ultrawide and resized windows crop instead of distorting.
  Network requests start when you open the tab or take an explicit action; your
  choices stay local.
- **Card-based studio layout with one type scale.** Both pages use responsive card
  modules instead of one flat list. The wallpaper page has a wallpaper preview, a
  search-first online card, a custom upload/URL card, and a side rail with compact
  bounded effect sliders (140 px) and the 24-swatch grid. The style page pairs a
  current-style card (with preview thumbnail) and gallery card with an Actions /
  Self-check rail. A single five-step type scale is shared across every module, and
  cards stack cleanly on narrow windows.
- **Style gallery.** Styles are grouped into six families (Calm / Nature / Light /
  Retro / Vivid / Dark). Primary filters come first, and the full tag set is
  available under "More filters". A preview-language tab switches thumbnails
  between Follow DSH, Chinese and English.
- **Sidebar entry.** A left-sidebar plugin panel (**视觉风格 / Visual Style**, with
  a second **壁纸 / Wallpapers** tab), next to Plugins / Automation / Context.
- **Missing features are reported.** Missing host capabilities and unverified
  modes are shown in the self-check instead of being faked.

![Wallpaper studio](docs/assets/wallpaper.jpg)

![Wallpaper visible over a third-party plugin page](docs/assets/wallpaper-coverage.jpg)

## Host support and version policy

`engines.dsh` is the exact allowlist **`0.2.1-rc.2 || 0.2.1-rc.3`**. The
supported scope for this release line is deliberately narrow:

| Scope | Value |
|---|---|
| DSH `0.2.1-rc.2` | Web Profile, Chrome (Chrome 120+ target; tested on Chrome 155) |
| DSH `0.2.1-rc.3` | Desktop app on macOS (real Electron renderer) |
| Everything else | Not installed and not supported; runtime fails closed to stock |

There is no compatibility mode. Any other host version is rejected at install
time; a mismatched runtime payload/preview is rejected at runtime. The formal,
machine-checked scope lives in `contracts/dsh/support-matrix.json` (repository)
and the evidence in [docs/verification.md](docs/verification.md).

![Style differences](docs/assets/style-differences.jpg)

## Install

### Web Profile (CLI)

```bash
pnpm build && pnpm pack                 # candidate build; not published
dsh plugin --profile web add ./dsh-livery-0.1.0.tgz
dsh web                                 # open the printed URL
```

### Desktop Profile (0.2.1-rc.3, macOS)

Install through the DeepSeek Harness Desktop app's plugin manager. The app runtime
enforces `engines.dsh` at install time; this release supports the macOS Desktop app
only. Disable any other theme/skin bundle before applying a visual style.

## Uninstall

Use the DSH plugin manager to remove the plugin. DSH leaves the plugin's
`livery` configuration row in the profile; reinstalling may therefore restore the
last applied style. To avoid inheriting it, choose **Restore default appearance**
before uninstalling, or remove the `livery` row from the profile configuration.

## Usage

Open the left sidebar and click **视觉风格 / Visual Style** above the Workspace
section. The page has two tabs:

- **视觉风格 / Visual styles**: preview (temporary), Apply (one config write),
  Restore default appearance; family sections, search, "More filters" and the
  preview-language tab.
- **壁纸 / Wallpapers**: opening the tab loads a random online batch automatically.
  You can search Openverse, draw another random batch or load the next one; pick
  one of 24 built-in designs, upload a local image or paste an https URL, then
  adjust blur, dim, frost and global atmosphere. Wallpaper choices are stored in
  the browser and survive restarts. The global atmosphere keeps them visible on
  third-party plugin pages too.

Applying a style and applying a wallpaper are independent: switching styles does
not remove the wallpaper.

![Entry and gallery](docs/assets/livery-panel.jpg)

![Preview language](docs/assets/preview-language.jpg)

## Repository layout

| Path | Contents |
|---|---|
| `src/core` | Colour derivation, contrast, token renderer, registries, style audit, compatibility range |
| `src/compiler` | Manifest validation, previews, audits, compiler CLI |
| `src/host` | Cordis host plugin: certified/compat gate, first-frame injection, catalog/preview routes |
| `src/client` | Browser plugin: handshake, runtime, style gallery, wallpaper studio, settings UI |
| `src/contract` | Contract snapshot/diff tooling, adapter generator, support-matrix gate |
| `src/generated` | Committed generated contracts, stock snapshots and compiled catalogs |
| `liveries/` | 24 built-in style manifests (`schemas/livery.schema.json`) |
| `contracts/` | Frozen host contract snapshots and support matrix |
| `scripts/` | Build/CLI tooling and the browser acceptance harness |
| `tests/` | Unit, compiler, host, client, contract and browser-harness suites |
| `docs/` | Design docs, research notes and verification summary |

## Development

Requirements: Node `^22.23.1 || ^24.21.0`, pnpm 12.

```bash
pnpm install
pnpm verify          # typecheck + tests + generated-data check + audits + build + pack check
pnpm lint
pnpm test:loader-abi
pnpm adapter:check
```

The generated contracts, stock token snapshots and compiled catalogs are committed,
so `pnpm build` works without a local DSH install. Browser acceptance (needs a local
DSH install, system Chrome and a packed tarball):

```bash
node scripts/acceptance/web.mjs --tgz ./dsh-livery-0.1.0.tgz
node tests/browser/run.mjs --tgz ./dsh-livery-0.1.0.tgz      # thin wrapper
```

## Verification

Limited-release evidence (0.1.0): Web `0.2.1-rc.2` isolated full run and a
real-profile clone; Desktop `0.2.1-rc.3` packaged web carrier and real Electron
renderer. Repo gates include `tsc`, 680+ tests, contrast/token/CSS audits, loader ABI
and package checks. Raw evidence is generated locally under `artifacts/` and is not
committed. Details and known limitations: [docs/verification.md](docs/verification.md).

## Contributing

- [Contributing guide](CONTRIBUTING.md) · [贡献指南](CONTRIBUTING.zh-CN.md)
- [Code of Conduct](CODE_OF_CONDUCT.md) · [Security policy](SECURITY.md) · [Support](SUPPORT.md)

Commits are one concise line (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## Documentation

- [Docs index](docs/README.md)
- Design: [interfaces](docs/design/interfaces.md) · [style system](docs/design/style-system.md) · [multi-version & compat](docs/design/multi-version.md) · [visual system v2](docs/design/visual-system-v2.md) · [implementation plan](docs/design/implementation-plan.md)
- Research: [host contract](docs/research/host-contract.md) · [client contract](docs/research/client-contract.md) · [design references](docs/research/design-references.md)
- [Verification summary](docs/verification.md)

## License

MIT, see [LICENSE](LICENSE). Palette attributions are in [NOTICE.md](NOTICE.md).
Preview thumbnails and built-in wallpapers are generated from the plugin's own data;
no third-party images or fonts are bundled. The optional wallpaper studio loads
third-party images only when you open the wallpaper tab or take an explicit action
(see [SECURITY.md](SECURITY.md)).
