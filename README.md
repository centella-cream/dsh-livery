# DSH Visual Studio (dsh-livery)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.23.1%20%7C%7C%20%5E24.21.0-339933.svg)](package.json)
[![DSH](https://img.shields.io/badge/DSH-0.2.x%20certified%20%2B%200.x%20compat-6d6df6.svg)](#host-support-and-version-policy)

A **visual studio for DeepSeek Harness**: 24 contract-gated styles, a wallpaper
studio with online image search and blur/frost effects, and a curated gallery —
packaged as a plugin that adds a visual layer **instead of hijacking the host
theme**.

[English](README.md) · [中文](README.zh-CN.md)

![24 built-in styles](docs/assets/gallery-24-light.jpg)

## Why not "just another skin"

Ordinary skin plugins often own the host theme, register their own theme ids, paint
window chrome, and inject broad CSS — which is exactly what makes them fragile
across DSH updates. DSH Visual Studio takes the opposite trade:

| Typical skin plugin | DSH Visual Studio |
|---|---|
| Takes over `ctx.theme`, registers themes, calls `setTheme` | Emits one scoped semantic token pair per style; never registers or owns a host theme |
| Paints window chrome (title bars, overlays) | Never draws chrome; the host owns the window |
| Wide selector-based CSS that breaks on host refactors | Token-only rendered CSS + a body-scoped wallpaper layer; no host component selectors |
| Breaks (or half-works) when DSH changes | Certified matrix for exact builds **plus a compatibility mode for newer in-range builds** — clearly labelled, never a hard break |
| "Trust me" theming | Frozen contract hashes, loader-ABI checks, contrast/CSS audits, and a published acceptance matrix |

The difference is a **visual system with engineering guarantees**, not a stylesheet:
24 designed styles across five axes, a wallpaper studio, a curated gallery, and a
version policy that survives DSH updates.

## Features

- **24 styles, five visual axes.** Palette (OKLab seeds → full light/dark token
  set), typography (10 local-only font stacks + 9 type scales), module shape
  (`--dsw-radius-*`, `--dsw-corner-shape`), elevation/material (flat/paper hairline
  panels, elevated cards, glass blur), and border/focus treatment. 10 original
  designs + 12 open-source-inspired palettes (MIT/Apache-2.0, see [NOTICE](NOTICE.md))
  + 2 original Chinese-aesthetic designs (Celadon 青瓷, Cinnabar 朱砂).
- **Wallpaper studio.** 24 built-in CSS wallpapers; an **online wallpapers** card
  that auto-loads one random Picsum batch when you open the tab, then supports
  explicit Openverse (CC0/PDM) search, random and “next batch”; local image upload
  (stored in IndexedDB) and https URLs. Effects: blur 0–24 px, dim 0–70 %,
  frost 0–100 % and a global atmosphere overlay that keeps the wallpaper visible on
  **every** plugin page, including third-party panels with opaque surfaces. Both
  layers are viewport-relative `cover`, so portrait/ultrawide/resized windows crop
  instead of distorting. Network requests start from opening the tab / explicit
  actions; choices are local.
- **Module-first studio layout with one type scale.** Both pages use responsive card
  modules rather than one flat list: wallpaper hero, search-first online card,
  custom upload/URL card, and a side rail with compact bounded effect sliders
  (140 px) + the 24-swatch grid; the style page pairs a current-style hero (with
  preview thumbnail) + gallery card with an 操作/自检 rail. A single five-step type
  scale is shared across every module, and cards stack cleanly on narrow windows.
- **Curated gallery.** Styles grouped into six families (Calm / Nature / Light /
  Retro / Vivid / Dark), primary filters first, the full tag vocabulary behind
  "More filters"; a preview-language tab switches thumbnails between Follow DSH /
  Chinese / English.
- **First-class entry.** A left-sidebar plugin panel (**视觉风格 / Visual styles**,
  with a second **壁纸 / Wallpapers** tab), next to Plugins / Automation / Context.
- **Honest degradation.** Missing host capabilities and unverified modes are shown
  in the self-check instead of being faked.

![Wallpaper studio](docs/assets/wallpaper.jpg)

![Wallpaper visible over a third-party plugin page](docs/assets/wallpaper-coverage.jpg)

## Host support and version policy

`engines.dsh` declares the compatibility range **`>=0.2.0-rc.2 <1.0.0`**. Inside
it there are two tiers:

| Tier | Host builds | Guarantees |
|---|---|---|
| **Certified** | DSH `0.2.0-rc.2`, `0.2.1-rc.2`, `0.2.1-rc.3` | Exact six-hash contract, loader-ABI check, full acceptance matrix (Web + Desktop runtime + real Electron renderer) |
| **Compatibility mode** | Any other readable version in the range | Best-effort visual layer using the newest certified contract; clearly marked "unverified" in the panel and self-check; no hard failure |
| **Rejected** | Versions outside the range or unreadable | Fail closed to the stock appearance, zero injected rows |

Certification means "verified on that exact build", not "installable only there".
When a new DSH build is added to the certified matrix it moves from compat to
certified automatically. See
[docs/design/multi-version.md](docs/design/multi-version.md) for the mechanism and
[docs/verification.md](docs/verification.md) for the current matrix.

![Style differences](docs/assets/style-differences.jpg)

## Install

### Web Profile (CLI)

```bash
pnpm build && pnpm pack                 # or use a released dsh-livery-*.tgz
dsh plugin --profile web add ./dsh-livery-0.1.0.tgz
dsh web                                 # open the printed URL
```

### Desktop Profile (0.2.1-rc.3)

Install through the DeepSeek Harness Desktop app's plugin manager. The app runtime
enforces `engines.dsh` at install time.

## Usage

Open the left sidebar, click **视觉风格 / Visual styles** above the Workspace
section. Two tabs:

- **视觉风格 / Visual styles** — preview (transient), Apply (one config mutation),
  Restore default appearance; family sections + search + "More filters"; preview
  language tab.
- **壁纸 / Wallpapers** — open the tab to get a random online batch automatically, or
  search Openverse / draw another random batch; pick one of 24 built-in designs, upload
  a local image, or paste an https URL, then tune blur / dim / frost / global
  atmosphere. Wallpaper choices are stored in the browser and survive restarts; the
  global atmosphere keeps them visible on third-party plugin pages too.

Applying a style and applying a wallpaper are independent: wallpapers keep working
when you switch styles.

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

Current certified matrix (unreleased 0.1.0): Web `0.2.1-rc.2` isolated full run and a
real-profile clone; Desktop `0.2.1-rc.3` packaged web carrier and real Electron
renderer; repo gates include `tsc`, 680+ tests, contrast/token/CSS audits, loader ABI
and package checks. Raw evidence is generated locally under `artifacts/` and is not
committed. Details and honest limitations: [docs/verification.md](docs/verification.md).

## Contributing

- [Contributing guide](CONTRIBUTING.md) · [贡献指南](CONTRIBUTING.zh-CN.md)
- [Code of Conduct](CODE_OF_CONDUCT.md) · [Security policy](SECURITY.md) · [Support](SUPPORT.md)

Commits are one concise line (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## Documentation

- [Docs index](docs/README.md)
- Design: [interfaces](docs/design/interfaces.md) · [style system](docs/design/style-system.md) · [multi-version & compat](docs/design/multi-version.md) · [visual studio v2](docs/design/visual-studio-v2.md) · [implementation plan](docs/design/implementation-plan.md)
- Research: [host contract](docs/research/host-contract.md) · [client contract](docs/research/client-contract.md) · [design references](docs/research/design-references.md)
- [Verification summary](docs/verification.md)

## License

MIT — see [LICENSE](LICENSE). Palette attributions are in [NOTICE.md](NOTICE.md).
Preview thumbnails and built-in wallpapers are generated from the plugin's own data;
no third-party images or fonts are bundled. The optional wallpaper studio loads
third-party images only on explicit user action (see [SECURITY.md](SECURITY.md)).
