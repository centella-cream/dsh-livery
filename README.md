# DSH Livery

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.23.1%20%7C%7C%20%5E24.21.0-339933.svg)](package.json)
[![DeepSeek Harness](https://img.shields.io/badge/DSH-0.2.0--rc.2%20%7C%200.2.1--rc.2%20%7C%200.2.1--rc.3-6d6df6.svg)](#supported-hosts)

**24 built-in visual styles for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).**
DSH Livery changes palette, typography, module shape, elevation and material — as a
contract-bound plugin that never takes ownership of the host theme or redraws window
chrome.

[English](README.md) · [中文](README.zh-CN.md)

![24 built-in styles](docs/assets/gallery-24-light.jpg)

## Why DSH Livery

Most skin plugins own the host theme, register their own theme IDs, paint window
chrome, or inject broad CSS. DSH Livery is deliberately narrower:

- **Contract-bound.** Exact host builds only (`0.2.0-rc.2`, `0.2.1-rc.2`,
  `0.2.1-rc.3`), six frozen contract hashes plus an aggregate hash. Unknown hosts
  fail closed to stock — nothing is guessed or approximated.
- **Token-only rendering.** One scoped semantic token pair per style
  (`light`/`dark`) is emitted for the first frame and adopted by the client with
  zero CSS-text writes. No `ctx.theme.register`/`setTheme`, no `data-ds-*` writes,
  no window-chrome drawing.
- **First-class entry.** A main-page plugin panel in the left sidebar
  (**视觉风格 / Visual Style**), next to Plugins / Automation / Context — not buried
  in Settings.
- **Honest degradation.** Host capabilities that do not exist (e.g. structural
  layout hooks) are reported in self-check instead of faked.

## Styles

The gallery ships 24 light/dark styles that differ on five axes:

| Axis | What changes |
|---|---|
| Palette | 4 OKLab seeds per mode → full semantic token set, contrast-gated (2,832 assertions per profile, 0 failures) |
| Typography | 10 local-only font stacks (system, humanist, serif, display, rounded, mono) + 9 type-scale profiles |
| Module shape | `--dsw-radius-*` and `--dsw-corner-shape` from 2–6 px sharp to 16–32 px round |
| Elevation / material | 9 surface recipes: flat/paper hairline borders, elevated shadows, glass `backdrop-filter` |
| Borders | Border tints, focus rings and hairline emphasis per style |

Ten styles are original. Twelve are inspired by permissively licensed open-source
palettes — Nord, Dracula, Gruvbox, Solarized, Catppuccin, Tokyo Night, Rosé Pine,
Everforest, Kanagawa, One Dark, Ayu and Flexoki — with attributions and licences in
[NOTICE.md](NOTICE.md); two are original Chinese-aesthetic designs (Celadon 青瓷,
Cinnabar 朱砂). Palettes are re-derived into DSH's token system, not pixel-exact ports.

![Style differences](docs/assets/style-differences.jpg)

## Install

### Web Profile (CLI)

```bash
pnpm build && pnpm pack                 # or use a released dsh-livery-*.tgz
dsh plugin --profile web add ./dsh-livery-0.3.0.tgz
dsh web                                 # open the printed URL
```

### Desktop Profile (0.2.1-rc.3)

Install through the DeepSeek Harness Desktop app's plugin manager. The app runtime
enforces `engines.dsh` at install time; this package declares
`0.2.0-rc.2 || 0.2.1-rc.2 || 0.2.1-rc.3`.

## Usage

Open the left sidebar, look above the **Workspace** section and click
**视觉风格** (Chinese) or **Visual Style** (English). Preview is transient; **Apply**
performs exactly one configuration mutation; **Restore default appearance** removes
it. The selected style changes palette, typography and module design across the
whole app.

![Entry and panel](docs/assets/livery-panel.jpg)

## Supported hosts

| DSH build | Adapter | Status |
|---|---|---|
| `0.2.0-rc.2` | `dsh-0.2.0-rc.2-r1` | Web/Chrome certified; Desktop pending |
| `0.2.1-rc.2` | `dsh-0.2.1-rc.2-r1` | Web/Chrome certified; Edge/Desktop pending |
| `0.2.1-rc.3` | `dsh-0.2.1-rc.3-r1` | Desktop packaged runtime + real Electron renderer verified; native window chrome pending |

See [docs/verification.md](docs/verification.md) for the acceptance matrix,
[contracts/dsh/support-matrix.proposed.json](contracts/dsh/support-matrix.proposed.json)
for the machine-readable status, and [docs/design/multi-version.md](docs/design/multi-version.md)
for the multi-version design.

## Repository layout

| Path | Contents |
|---|---|
| `src/core` | Colour derivation, contrast, token renderer, registries, style audit |
| `src/compiler` | Manifest validation, previews, audits, compiler CLI |
| `src/host` | Cordis host plugin: gate, first-frame injection, catalog/preview routes |
| `src/client` | Browser plugin: handshake, runtime, settings UI, sidebar panel |
| `src/contract` | Contract snapshot/diff tooling, adapter generator, support matrix gate |
| `src/generated` | Committed generated contracts, stock snapshots and compiled catalogs |
| `liveries/` | 24 built-in style manifests (schema: `schemas/livery.schema.json`) |
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
so `pnpm build` works without a local DSH install. To regenerate host contracts you
need the matching DSH build — see [docs/design/multi-version.md](docs/design/multi-version.md).

Browser acceptance (needs a local DSH install, system Chrome and a packed tarball):

```bash
node scripts/acceptance/web.mjs --tgz ./dsh-livery-0.3.0.tgz
node tests/browser/run.mjs --tgz ./dsh-livery-0.3.0.tgz      # thin wrapper
```

## Contributing

- [Contributing guide](CONTRIBUTING.md) · [贡献指南](CONTRIBUTING.zh-CN.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Support](SUPPORT.md)

Commits are kept to a single concise line (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## Documentation

- [Docs index](docs/README.md)
- Design: [interfaces](docs/design/interfaces.md) · [style system](docs/design/style-system.md) · [multi-version](docs/design/multi-version.md) · [implementation plan](docs/design/implementation-plan.md)
- Research: [host contract](docs/research/host-contract.md) · [client contract](docs/research/client-contract.md) · [design references](docs/research/design-references.md)
- [Verification summary](docs/verification.md)

## License

MIT — see [LICENSE](LICENSE). Palette attributions are listed in [NOTICE.md](NOTICE.md).
All preview thumbnails and screenshots are generated from the plugin's own token
data; no third-party images or fonts are bundled.
