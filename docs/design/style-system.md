# Style system v2: how the 24 styles differ (round 5)

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

Existing: `solid`, `soft`, `glass`. New: `flat`, `sharp`, `rounded`, `paper`,
`elevated`, `terminal`.

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
with no shadows and mono-density radii.

## 2. Derivation merge order (src/core/derive.ts)

1. derive colour tokens from the four OKLab seeds (existing A-tier logic)
2. merge `metrics.tokens` (both modes)
3. merge `surfaceStyle.light|dark`
4. merge explicit `variants.light|dark.tokens` (manifest overrides win; existing rule)

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

## 4. Livery set: 24 designs

Keep the 10 existing ids and add 14 new ones. Each manifest declares seeds
(light + dark), a font pairing (ui/content/code from the registry), a metrics id,
a surface style and tags. The lead author maintains the design table
(`docs/research/design-references.md`) with MIT/ISC/PD open-source inspirations and
their attribution, plus self-designed entries. `NOTICE.md` records the palette
attributions (no code copied; palette values reused under their permissive
licences).

## 5. Compatibility / budgets

- Manifest schema stays `schemaVersion: 1`; only enum ids are extended (additive).
- Per-livery CSS budget stays 12 KiB (expected ~9.5 KiB after style tokens).
- Catalog grows to 24 liveries × 2 profiles; preview dirs get 96 SVGs/profile.
- Host adapters and contracts are unchanged; this is a token-contract change only,
  with no new host capability. Layout structure stays host/stock: DSH exposes no
  public density, transcript or message-flow hook, so differences are limited to
  shape, elevation, type and palette, and the UI discloses that.
