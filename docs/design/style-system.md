# Style system: how the 28 styles differ

> **Status (0.2.2):** current implementation reference for the released `0.2.2`
> artifact. The registry paths and
> feature flags below are the shipped style-system contract; the release support
> matrix is in [`contracts/dsh/support-matrix.json`](../../contracts/dsh/support-matrix.json).
> The 0.1.9 gallery/recipe expansion is recorded in
> [`style-gallery.md`](style-gallery.md). The 28-style catalog itself is unchanged
> in 0.2.2.

The goal is to make each style visibly different in **palette, typography,
background material, module shape/elevation and type scale**, while staying inside
the frozen token-only renderer (no selectors, no `!important`, no remote assets, no
bundled fonts). The details below are fixed for implementation.

## 1. Registries (src/core/{types,registry}.ts)

### Font ids (+7)

Already registered: `system-cjk`, `system-latin`, `system-mono`.

New local-only stacks (never loaded from the network; CSS stacks with fallbacks are
allowed because they are just font-family names):

| id | stack (primary → fallback) |
|---|---|
| `serif-cjk` | `"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", serif` |
| `serif-latin` | `"Iowan Old Style", "Palatino", "Palatino Linotype", Georgia, "Times New Roman", serif` |
| `humanist-cjk` | `"Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei UI", sans-serif` |
| `humanist-latin` | `"Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", Helvetica, sans-serif` |
| `display-latin` | `"Futura", "Avenir Next", "Trebuchet MS", "Century Gothic", sans-serif` |
| `rounded-latin` | `"SF Pro Rounded", "Arial Rounded MT Bold", "Avenir Next", "Trebuchet MS", system-ui, sans-serif` |
| `tech-latin` | `"SF Mono", "JetBrains Mono", Menlo, Consolas, "Liberation Mono", monospace` |

The existing `typography.ui/content/code` shape is unchanged; manifests refer to ids.

### Metrics ids (+4) with token overrides

Existing ids: `cjk-comfortable`, `latin-default`, `compact`, `airy`.
New ids: `editorial`, `punchy`, `technical`, `quiet`.

`MetricsDefinition` gains `tokens: Readonly<Record<string, string>>`, mode-independent
overrides that apply to both variants. Only **consumed** host font tokens may be
overridden (verified against 0.2.1-rc.2 `referencedBy`):

- `--dsw-font-xxxs-11` (11px/14px → compact variants 10–12px)
- `--dsw-font-xxs-12` (12px/18px)
- `--dsw-font-xs-13` (13px/20px)
- `--dsw-font-xs-strong-13` (500 13px/20px)
- `--dsw-font-s-14` (14px/22px)
- `--dsw-font-l-20` (500 20px/28px)
- `--dsw-font-markdown-small` (12px/20px)
- `--dsw-font-family-brand` (settings account brand row; gives display-font flourishes)

Do **not** override content/user-size tokens (`--dsh-content-font-size`,
`--dsh-code-font-size` family, markdown base/code shorthands): the user's font-size
setting must stay authoritative.

### Surface-style ids (+6) with token maps

Registered: `solid`, `soft`, `glass`, `flat`, `sharp`, `rounded`, `paper`,
`elevated`, `terminal`, `brutal`, `pill`, `editorial`.

`SurfaceStyleDefinition = { id, note, light: TokenMap, dark: TokenMap }`; the maps
may only contain these token families (all consumed by host CSS):

- shape: `--dsw-radius-xs|sm|md|lg|xl|panel`, `--dsw-corner-shape`
- elevation: `--dsw-shadow-lv1`, `--dsw-shadow-lv1-blur`, `--dsw-shadow-lv2`,
  `--dsw-shadow-lv3`, `--dsw-elevation-panel|prominent|soft|stroke|stroke-color`
- material: `--dsw-menu-backdrop-filter`, `--dsw-mask-blur`, `--dsw-focus-ring-width`
  (keep focus ring width ≥ 2px for a11y unless the style note justifies)
- borders: `--dsw-alias-border-l1|l2|l3|l4` (alpha tints only; these are derived
  colors today, the style map may re-tint them)

Recipes are the baseline; exact values live in the registry:
`solid` stock-ish, `soft` 6/10/14 radius + soft shadows, `glass` 12/16/24 + blur
material, `flat` 4/8/12 with zero shadows and 1px hairline borders, `sharp` 2/4/6
with stronger square borders, `rounded` 10/16/24 + panel 32, `paper` 2/4/8 with warm
hairlines and no shadows, `elevated` 8/12/20 + prominent shadows, `terminal` 0/2/4
with no shadows and mono-density radii, `brutal` square blocks with hard offset
shadows and strong rules, `pill` capsule controls with large soft panels and
hairline separation, `editorial` near-square print geometry with strong rules and
no elevation.

## 1b. Chrome recipes (`layout.chrome`)

An optional fourth presentation axis for the shell's component fills. It may
only author the consumed component tokens
`--dsw-specific-sidebar-fill`, `--dsw-specific-sidebar-nav-item-{hover,active,active-accent}`,
`--dsw-specific-input-major`, `--dsw-specific-bubble`,
`--dsw-specific-bubble-highlight` and `--dsw-specific-selector`. Recipes are pure
functions of the variant seeds and mode (`src/core/chrome.ts`):

| id | relationship |
|---|---|
| `plain` | no override (default; omitted manifests behave as plain) |
| `tinted` | low accent tint on rail, composer and bubbles |
| `outline` | page-coloured fills; active rail carried by its accent mark |
| `terminal` | darker rail, page composer, faint accent active row |
| `editorial` | paper rail/composer, text-tinted bubbles |
| `poster` | strong accent blocks on rail, bubble and selected controls |

Chrome never changes shape, elevation, text colours or selectors. The contrast
matrix audits every recipe against its palette before it can ship.

## 2. Derivation merge order (src/core/derive.ts)

1. derive colour tokens from the four OKLab seeds (existing A-tier logic)
2. merge `metrics.tokens` (both modes)
3. merge `surfaceStyle.light|dark`
4. merge `chrome.<mode>` component-fill recipes (see §1b)
5. merge explicit `variants.light|dark.tokens` (manifest overrides win; existing rule)

The renderer emits the resulting `CompiledVariant.tokens` unchanged. Token values
must pass the extended CSS-safety audit. Allowed value shapes are lengths, unitless
numbers, hex/rgb/hsl colours, `var(--dsw-*)`, `color-mix(...)`, box-shadow lists,
`blur(...)`/`saturate(...)` filter lists, `superellipse(...)`, `none`, `0`, and
`0 0 0 .5px ...`. Values containing `url(`, `@`, `!important`, selectors, `<` or
newlines are rejected.

## 3. Preview contract (src/compiler/previews.ts)

The 640×400 fixture must show the style differences deterministically:

- corner radius: read `--dsw-radius-*` px values from the compiled token map (fall
  back to stock snapshot) and use them for the sidebar chips / transcript bubbles /
  plugin card / composer (SVG `rx`).
- elevation: parse offset/blur from `--dsw-elevation-panel`/`prominent`/`soft` or
  `--dsw-shadow-lv*`; render it with a deterministic SVG `feDropShadow` (skip when
  the style has no shadow). Flat styles show hairline strokes instead.
- type scale: read font sizes from the consumed shorthand tokens listed above and use
  them in the fixture text (with the resolved font stacks).
- palette/background: existing token-driven colours.

The output is byte-stable and uses no filters other than `feDropShadow` and no
external assets.

## 4. Livery set: 28 designs

The 28 designs comprise 14 original, 12 permissively licensed palettes and 2
original Chinese designs. Each manifest declares seeds
(light + dark), a font pairing (ui/content/code from the registry), a metrics id,
a surface style and tags. The lead author maintains the design table
(`docs/research/design-references.md`) with MIT/ISC/PD open-source inspirations and
their attribution, plus self-designed entries. `NOTICE.md` records the palette
attributions (no code copied; palette values reused under their permissive
licences).

## 5. Compatibility / budgets

- Manifest schema stays `schemaVersion: 1`; only enum ids are extended (additive).
- The style count is **28**: 14 original designs, 12 permissively licensed
  palettes and 2 original Chinese designs. **0.2.2 adds, removes or remaps no
  style**. There are eight certified hosts and eight compiled catalog profiles
  (one per adapter; `contracts/dsh/catalog-profile-overrides.json` is empty), so
  the compiled catalog is 28 liveries per profile and the preview dirs contain
  112 SVGs per profile.
- Per-livery and first-frame boot CSS budgets are **14 KiB (14,336 B)** for
  0.2.2 (reviewed increase from 13 KiB). Shipped profiles measure 10,366 B; the
  increase is required by the legacy typography-strategy probe fixture, whose
  composite font ladder plus the new host-surface tokens reaches 13,409 B. The
  added `MenuSurface`/jobs fill tokens are included in these bytes.
  The accepted `0.2.1` probe measured a largest livery of **9,066 B** (bauhaus);
  the current `0.2.2` candidate measures **10,366 B** and must be re-measured on
  the final tarball.
- Client gzip budget is **72 KiB (73,728 B)** — an explicit, reviewed increase
  from 60 KiB for the wallpaper studio, provider registry, direct layer and
  detail surface. The accepted `0.2.2` build measured 73,094 B; the 0.2.3
  candidate measures **73,655 B (73 B headroom)**. The exact measured bytes and
  headroom are recorded by `lib/build-report.json` and the acceptance probe.
- **Pre-release review item:** when client gzip headroom is **< 100 B**, the
  candidate must record the exact headroom in the build report and re-measure it
  after all packaged docs/code are frozen. This is a warning in `build`, not a
  failure; only exceeding the 73,728 B cap fails the build.
- Host gzip budget stays at **360 KiB (368,640 B)** for the 28-style catalog;
  `scripts/build.mjs` enforces the cap on the accepted build.
- Package tarball cap stays at **4 MiB (4,194,304 B)**. The accepted `0.2.2`
  tarball is within budget; its exact sha256 and byte size are recorded in
  `contracts/dsh/evidence/0.2.2/`. If a candidate exceeds the cap, reduce or drop
  README images in descending size order rather than raising the cap. Those images are README screenshots
  only: built-in wallpapers are CSS and online wallpapers are fetched at provider
  resolution at runtime, so this budget never reduces wallpaper rendering
  quality.
- 0.2.2 is a client-only release: no new host capability or host version. The
  consumed detail-slot list changes `clientSlotHash()`, so verify the regeneration
  diff with `adapter:generate` / `contract:regenerate`; any frozen contract or
  generated adapter byte change is reviewed as an adapter change. Layout
  structure stays host/stock: DSH exposes no public density, transcript or
  message-flow hook, so differences are limited to shape, elevation, type and
  palette, and the UI discloses that.

The candidate numbers above are working-tree measurements, **not acceptance
evidence**; every one of them must be re-measured after any packaged-doc, asset
or code change. Final accepted numbers for the published `0.2.1` artifact are
recorded in [`docs/verification.md`](../verification.md) and the committed
evidence files.
