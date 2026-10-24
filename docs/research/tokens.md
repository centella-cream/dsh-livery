# DSH 0.2.0-rc.2 theme tokens & public hooks

Authoritative inventory for the `dsh-livery` theme work. Machine-readable data: [`tokens.json`](../../research/tokens.json) (403 tokens, 601 declarations), [`public-hooks.json`](../../research/public-hooks.json), plus pretty-printed sheets in `research/extracted/*.css` and the extraction/verification scripts in `research/scripts/`. All values below were extracted from the installed `@deepseek-ai/dsh-client-ui-theme` 0.2.0-rc.2 bundle and re-checked declaration-by-declaration against it (`verify-tokens.mjs`: 807 checks, 0 failures).

## How tokens are declared and injected

- **Eight CSS sheets are embedded as JS strings** in `@deepseek-ai/dsh-client-ui-theme/lib/client.js` (one line per sheet): `base.css:1142`, `corner-shape.css:1145`, `design-platform.css:1148`, `focus.css:1151`, `onboarding.css:1154`, `scrollbar.css:1157`, `gradient-shadow-text.css:1160`, `shiki.css:1163`. Source paths are preserved in the `\0dsh-inline-css:` region comments.
- **Injection order** is the `STYLES` array (`client.js:1167-1176`); `installThemeStyles` (`client.js:1181-1191`) appends one `<style data-plugin="@deepseek-ai/dsh-client-ui-theme" data-plugin-css="…/<sheet>">` per sheet to `document.head` inside `ctx.effect`, so unload/HMR removes them. Order matters: `scrollbar.css` consumes `--dsw-alias-scrollbar-*` declared in `design-platform.css`, and `gradient-shadow-text.css` owns the type ladder + elevation after both (README:56-58, 78).
- **Pre-plugin bootstrap** (first paint, before any module script): the host injects a `<style>` and a body `<script>` through `webserver/index-inject` with `prepend: true` (`lib/index.js:92-94`). The head CSS sets `:root{color-scheme}` and `body{background-color; --dsh-boot-bg}` (`lib/index.js:36-45`); the body script sets `html[data-ds-theme-source]`, toggles `body[data-ds-dark-theme]`, and sets `--dsh-content-font-size` (`lib/index.js:47-57`).
- **Runtime presenter** (`@deepseek-ai/dsh-client-ui-layout/lib/client.js:498-560`) owns `html.style.color-scheme`, `html[data-ds-theme-source]` (`light|dark|system`), `body[data-ds-dark-theme]`, `--dsh-content-font-size`, the inline theme alias variables, and one `<meta name="theme-color">`.
- **Third-party override seam**: `ctx.theme.register({id, colorScheme, tokens})` / `ctx.theme.overrideTokens(source, tokens)` with `{ light, dark }` pairs (`client.js:1339-1520`; bare strings throw at `:1546`). Overrides are applied as **inline styles on `body`**, so they beat the stylesheet declarations without `!important`.

## Scoping (light / dark)

| Role | Selector | Citation |
|---|---|---|
| Light palette | `body` | `client.js:1148` (design-platform; extracted `design-platform.css:5`, aliases `:165`) |
| Dark palette | `body[data-ds-dark-theme]` | `client.js:1148` (extracted `design-platform.css:85`, `:282`); same selector in onboarding `:1154`, gradient `:1160`, shiki `:1163` |
| Font / radius / corner-shape / ring width | `:root` | `base.css` `:1142`, `corner-shape.css` `:1145`, `focus.css` `:1151` |
| Elevation shadows (rebindable per surface) | `body, body *` | `gradient-shadow-text.css:21` (`client.js:1160`) |
| Dark menu stroke rebind | `body[data-ds-dark-theme] [data-menu-material]` | `gradient-shadow-text.css:17` |
| macOS menu material | `html[data-platform=darwin] body` / `… body[data-ds-dark-theme]` | `design-platform.css:398`, `:402` |
| Corner smoothing | inside `@supports (corner-shape:superellipse(1.5))` | `corner-shape.css` (`client.js:1145`) |

## Token categories

| Category | Count | Notes / example |
|---|---|---|
| `font` | 182 | 30 style sets × (shorthand + 5 longhands) + `--dsw-font-family` + `--dsw-font-family-brand`; e.g. `--dsw-font-markdown-h1` at `client.js:1160` |
| `alias` | 107 | Semantic layer; 89 differ light↔dark; e.g. `--dsw-alias-bg-base` = `var(--dsw-static-neutral-bluish-00)` → `#fff`, dark `…-950` → `#151517` (`design-platform.css:88/283`) |
| `static` | 77 | Raw palette steps; declared twice (light + dark) but identical except `--dsw-static-neutral-bluish-60` (`#f5f6f7` vs `#f9fafb`) |
| `specific` | 11 | `bubble`, `sidebar-*`, `menu`, `tip`, `input-major`, `selector`; 10 differ by palette |
| `radius` | 7 | `xs 4 / sm 8 / md 12 / lg 16 / xl 20 / panel 28` (`base.css:1142`) + `--dsw-corner-shape: superellipse(1.5)` |
| `shadow` | 4 | `--dsw-shadow-lv1…lv3`, `--dsw-shadow-lv1-blur` |
| `elevation` | 5 | `-stroke-color`, `-stroke`, `-panel`, `-prominent`, `-soft`; only the stroke colour changes with palette |
| `focus` | 2 | `--dsw-focus-ring-width: 2px` (`:root`) and the read-only `--dsw-focus-ring-color` |
| `other` | 8 | menu material `--dsw-menu-surface-fill`/`-backdrop-filter`, `--dsw-mask-blur`, two think-selection gradients, three onboarding gradient stop lists |

Totals: **403 tokens, 601 declarations, 207 theme-invariant, 104 palette-differing, 176 values contain `var()` chains, 30 are `color-mix()`/`calc()` expressions, 200 are never referenced by shipped bundles, 14 are read but never declared.**

## Font-family semantics

- `--dsw-font-family` (`:root`, `base.css:1142`) is the system UI stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", …`), theme-invariant and referenced by 73 declarations in 9 packages.
- `--dsw-font-family-brand` = `"Montserrat", var(--dsw-font-family)`; only `dsh-client-ui-settings-account` consumes it. `brand-font.css` registers Montserrat 300/400/500 from `lib/styles/*.woff2` (OFL); ordinary UI keeps the system stack (README:74, 80).
- Code uses **`--ds-font-family-code`** (a `--ds-*` variable, not `--dsw-*`), referenced by every `--dsw-font-markdown-code*` token.
- The Markdown ladder (`--dsw-font-markdown-h1…h4`, `base`, `table`, `small`, `code*`) scales from `--dsh-content-font-size` (10–22 px, default 14) through `--dsh-content-font-delta` (`gradient-shadow-text.css:33`, README:78); the UI scale (`--dsw-font-*-{11..24}`) is fixed px. `--dsw-font-m-18` is a 16 px size with an 18 px-ish name — follow values, not names.

## Minimum override set for a complete palette

`tokens.json.meta.themeOverrideChecklist` lists **102 tokens**: 89 `--dsw-alias-*`, 10 `--dsw-specific-*`, and 3 material tokens (`--dsw-menu-surface-fill`, `--dsw-linear-gradient-think`, `--dsw-linear-think-select`). These are exactly the tokens whose light and dark values differ after excluding static steps and fixed type/geometry scales. Consequences:

- Overriding aliases automatically flows through every `var()` chain (borders, scrollbars, elevation stroke, focus fallback).
- `--dsw-elevation-stroke-color` needs no direct override: dark menus rebind it to `--dsw-alias-border-l3` and the light default is `--dsw-alias-border-l4`.
- `--dsw-focus-ring-color` is **not declared globally**; keep the theme rule's fallback `var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary))` (`focus.css`, `client.js:1151`) or rings on 26 packages break.
- Optional families a full skin usually also touches: 11 `--shiki-*` syntax colours (`shiki.css`, `client.js:1163`), onboarding accent/gradient tokens (`onboarding.css`, `client.js:1154`), and `--dsw-alias-menu-group-header-fill`.

## Gaps (hardcoded or missing outside the token sheets)

- **14 `--dsw-*` names are read but never declared**: `--dsw-font` (7 reads in sidebar-documentpreview, real token is `--dsw-font-family`), `--dsw-font-mono`, `--dsw-font-sm-13`, `--dsw-alias-label-quaternary`, `--dsw-alias-label-error`, `--dsw-alias-fill-l1/l2/tertiary/tsp-secondary`, `--dsw-alias-bg-l1/l2/layer-4`, `--dsw-alias-separator-primary`, `--dsw-hovercard-bg`.
- **Hover cards stay dark in light mode**: `--dsw-hovercard-bg: #2C2C2E` is declared inside the component (`@deepseek-ai/dsh-client-ui-primitives/lib/HoverCard.module.css:10`, compiled copy in `dsh-web-frontend/dist/assets/index-BPHePDI_.css`), not by ui-theme.
- **No violet token**: `FileTypeIcon.module.css:3` declares component-local `--dsh-file-type-violet: rgb(139, 118, 246)` because the palette has no matching step.
- **Hardcoded literals in the built app shell**: 8 literal colour declarations in `index-BPHePDI_.css` (`#fff` on the copied label `._copied_38jqx_36`, `#FFFFFF` on `.copied`, `#fff0` copy-button background, transparent `rgb(255 255 255 / 0)` link borders) and 1 in `HoverCard.module.css`; all 34 other shipped component stylesheets are fully tokenised.
- **Hardcoded stacking layers** (not tokens): menus/tooltips/hover cards `100–101`, modal/lightbox `1000`, toast `1100` (`primitives/lib/*.css`); frame overlay is `20`, dockkit dock `10/40`, floats `60`. A theme overlay above `20` must also clear `100/1000/1100`.

## Public DOM hooks (details in `public-hooks.json`)

- Body: only `data-ds-dark-theme` (documented, `ui-theme/README.md:40`, `ui-layout/README.md:45`).
- HTML: `data-platform=darwin`, `data-windows-titlebar`, `data-ds-theme-source=light|dark|system`, `data-input-modality=pointer|keyboard`, `data-fullscreen` (`ui-layout/README.md:37-41`, `ui-primitives/README.md:152`).
- Frame state: `data-sidebar-collapsed`, `data-rightbar-collapsed|fullscreen|instant`, `data-animating`, `data-dragging`, `data-shell-overlay|leading`.
- Right panel: `data-sidebar-right-panel="push|fullscreen"`, `data-sidebar-right-open`, `data-sidebar-right-mode` (next mode), `data-dockkit-host="dock|float"`, `data-dockkit-pane|float|column|empty|divider`.
- CSS hooks: `--dsh-content-font-size`, `--dsh-content-font-{delta,size-secondary,delta-secondary}`, `--dsh-scrollbar-{width,thumb,thumb-hover,thumb-border,track-margin}`, `--dsh-frame-{top,leading,overlay-top,chrome-top}-clearance`, `--dsh-windows-{content-radius,sidebar-width,titlebar-height,menu-start}`, `--dsh-dockkit-*`, `--dsh-composer-*`, `--dsh-chat-*`, `--dsh-sidebar-width`, `--dsh-session-list-*`.
