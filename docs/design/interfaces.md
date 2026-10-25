# DSH Livery — implementation interfaces (freeze v1)

Status: frozen for parallel implementation. Any change requires the Lead to update this
file and notify every owner. Certified host matrix (exact versions):
`0.2.0-rc.2` (adapter `dsh-0.2.0-rc.2-r1`), `0.2.1-rc.2` (`dsh-0.2.1-rc.2-r1`),
`0.2.1-rc.3` (`dsh-0.2.1-rc.3-r1`). Install-time compatibility range:
`>=0.2.0-rc.2 <1.0.0` (see §4 compat mode and `docs/design/multi-version.md`). Multi-version mechanics:
[docs/design/multi-version.md](multi-version.md).

## 1. Module boundaries

| Path | Owner scope | May import | Must not import |
|---|---|---|---|
| `src/core/**` | pure algorithms only | Node builtins, own modules | React, Cordis, DSH packages, DOM |
| `src/compiler/**` | build-time compiler (runs in Node) | `src/core`, Node builtins, `ajv`, `postcss`, `esbuild` types | React, Cordis, DOM |
| `src/host/**` | Cordis host plugin + boot injection + catalog route | `src/core`, Node builtins, type-only DSH imports | React, client modules |
| `src/client/**` | browser plugin (React) | `src/core`, React, platform modules (see §3), type-only DSH imports | Node builtins, host modules |
| `src/i18n/**` | dictionaries | nothing | everything else |
| `src/contract/**` | contract snapshot/diff + adapter registry (Node) | Node builtins, type-only DSH imports | React, DOM |
| `scripts/**` | CLI wrappers around `lib/cli/*` (esbuild bundle of `src/compiler/cli.ts`, `src/contract/cli.ts`) | `lib/` only | — |
| `liveries/<id>/manifest.json` | data | — | code |
| `schemas/livery.schema.json` | JSON Schema for manifests | — | code |

`src/core` is duplicated into the Host bundle and into the Client bundle by the two
separate esbuild builds. That is intentional; do not try to share a chunk.

## 2. Frozen core interfaces

```ts
// src/core/color.ts
export interface Rgb { r: number; g: number; b: number }          // 0-255 floats
export interface Oklab { l: number; a: number; b: number }
export interface Oklch { l: number; c: number; h: number }
export function parseColor(input: string): Rgb                   // throws on unsupported
export function formatHex(rgb: Rgb): string                       // #rrggbb
export function formatCssColor(rgb: Rgb, alpha?: number): string  // #rrggbb or rgb(a)
export function rgbToOklab(rgb: Rgb): Oklab
export function oklabToRgb(lab: Oklab): Rgb
export function oklchToRgb(lch: Oklch): Rgb
export function rgbToOklch(rgb: Rgb): Oklch
export function clampToSrgbGamut(lch: Oklch): Oklch               // reduce chroma until in gamut
export function relativeLuminance(rgb: Rgb): number
export function contrastRatio(a: Rgb, b: Rgb): number             // WCAG 2.x
export function mixOklab(a: Rgb, b: Rgb, t: number): Rgb
export function withAlpha(color: string, alpha: number): string
export function isHexColor(value: string): boolean

// src/core/registry.ts
export const FONT_STACKS: Readonly<Record<FontId, FontStackDefinition>>
export const METRICS: Readonly<Record<MetricsId, MetricsDefinition>>
export const TAGS: readonly TagDefinition[]
export const SURFACE_STYLES: readonly SurfaceStyleId[]
export function resolveTypography(manifest: LiveryManifest): ResolvedTypography
export function fontStackOf(id: FontId): string                    // throws for unknown id

// src/core/capabilities.ts
export function evaluateCapabilities(
  contract: ContractCapabilityFacts,
  manifest: LiveryManifest,
): { readonly map: CapabilityMap; readonly effectiveLayout: LiveryManifest['layout']; readonly degraded: readonly CapabilityDegrade[] }
// effective layout falls back per recipe when its capability is unavailable:
// density/messageFlow/conversationWidth -> 'host'/'stock', surfaceStyle -> 'solid'.

// src/core/derive.ts
export function deriveLivery(
  manifest: LiveryManifest,
  stock: StockTokens,               // from src/core/stock.ts (generated from contract snapshot)
): { light: CompiledVariant; dark: CompiledVariant }
// deterministic, no I/O. Explicit `variant.tokens` overrides win over derived values.

// src/core/contrast.ts
export function auditContrast(variant: CompiledVariant, mode: Mode, stock: StockSnapshot): readonly ContrastEntry[]
export function summarizeContrast(entries: readonly ContrastEntry[]): { failures: number; total: number }

// src/core/render.ts
export function renderLiveryCss(
  livery: Pick<CompiledLivery,'id'|'light'|'dark'|'typography'|'layout'|'requiredCapabilities'|'optionalCapabilities'>,
  capabilities: CapabilityMap,
  stock: StockSnapshot,
  options?: { readonly pretty?: boolean; readonly typography?: 'auto' | 'role-hooks' | 'legacy' },
): LiveryCss
export function renderBootCss(catalog: LiveryCatalog, skinId: string, stock: StockSnapshot): { css: string; hash: string }
export function renderStyleText(livery: CompiledLivery, capabilities: CapabilityMap, stock: StockSnapshot): string
export function hashCss(css: string): string                       // "sha256:<hex>"
export function hashLivery(livery: Omit<CompiledLivery,'hash'>): string

// src/core/catalog.ts
export function findLivery(catalog: LiveryCatalog, id: string): CompiledLivery | undefined
export function isKnownSkinId(catalog: LiveryCatalog, id: string): boolean

// src/core/catalog.ts (runtime-safe: types only, no derivation/stock imports)
export function findLivery(source, id): CompiledLivery | undefined
export function isKnownSkinId(source, id): boolean
export function resolveActiveLivery(source, skinId): { livery?: CompiledLivery; normalizedId: string }
export function normalizeSkinId(source, skinId): string
export function resolveSkinForBoot(source, skinId): { livery?: CompiledLivery; css: string; hash: string }
export function styleTextOf(livery): string                 // css.tokens + css.typography + css.layout
export function liveryCssHash(livery): string               // livery.cssHash (frozen)
export function renderBootCssFromCatalog(catalog, skinId): { css: string; hash: string }

// src/core/render.ts (COMPILER-ONLY: may import generated/stock; never imported by client)
export function renderLiveryCss(livery, capabilities): LiveryCss   // compact bytes by default; { pretty: true } audit-only
export function styleTextFromFragments(css): string
export function computeLiveryCssHash(css): string
export function renderStyleText(livery, capabilities): string      // compile-time only
export function renderBootCss(catalog, skinId): { css: string; hash: string }  // compile-time only
export function hashCss(css: string): string                        // "sha256:<hex>"
export function hashLivery(livery: Omit<CompiledLivery, 'hash'>): string

// CompiledLivery extra field (frozen): cssHash = hashCss(styleTextOf(livery)).
// src/core/index.ts re-exports all of the above for Node/test consumption only.
```

**A-tier emission policy:** compiled token output contains every alias/specific/static
token with at least one shipped-package `var()` consumer (`STOCK_TOKENS[name].referencedBy`
non-empty). Unconsumed tokens stay inherited from stock and are listed as versioned
exemptions in `artifacts/liveries/token-coverage.json`; `audit:tokens` fails only on a
consumed-and-uncovered token with no exemption. Runtime bundles never filter or render.

## 3. Client platform modules (seeded, no `dsh.client.external` needed)

`react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@deepseek-ai/cordis`,
`@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-slots`,
`@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-dockkit`.

Everything else imported by `src/client/**` must be bundled by esbuild. Never import
another plugin's client module for values; collaborate through Cordis services.

## 4. Host ↔ Client handshake

**Hash equality (frozen):** the compiler stores the final stylesheet bytes on every
compiled livery (`css.tokens`, `css.typography`, `css.layout`) plus
`cssHash = hashCss(tokens + typography + layout)`. At runtime no component derives
stylesheets: the Host and Client concatenate the stored fragments byte-for-byte
(`styleTextOf(livery)`) and compare `livery.cssHash` with
`BootPayload.cssHash` / `body[data-dsh-livery-hash]`. No wrapper, banner, comment,
indentation or newline may be added at runtime. Equality triggers the zero-write
adoption path. When `skinId === 'stock'` the Host emits NO boot style and
`cssHash = ''`. Runtime modules MUST NOT import the derivation/stock modules; the
compile-time renderer is compiler-only (`src/core/render.ts`), while
`src/core/catalog.ts` exposes the pure runtime helpers (`styleTextOf`,
`liveryCssHash`, `findLivery`).

Host (`src/host/boot.ts`) contributes three `webserver/index-inject` rows when the
pre-loader gate accepts the host:

1. `{ kind: 'html', placement: 'head', html: '<style id="dsh-livery-boot" data-plugin="dsh-livery" data-dsh-livery-hash="<hash>">' + bootCss + '</style>' }`
   — `body[data-dsh-livery]` light/dark token pair, `:root:lang()` font bindings and
   `@layer dsh-livery.compat` layout rules for the active livery, all scoped under
   `body[data-dsh-livery="<id>"]`. The element carries the stable id + plugin marker so
   the client can adopt it (rename, zero CSS-text writes) or remove it.
2. `{ kind: 'global', name: '__DSH_LIVERY_BOOT__', value: BootPayload }`.
3. `{ kind: 'html', placement: 'body', html: '<script>…setAttribute…</script>' }` —
   sets `body[data-dsh-livery]` and `body[data-dsh-livery-hash]` before app scripts.

Gate failure (unreadable/out-of-range version / adapter mismatch / required
contract mismatch / no active livery / invalid compiled artifact): **no rows are
pushed at all**; stock remains.

**Compatibility mode (round 7):** a readable observed version inside the
compatibility range `>=0.2.0-rc.2 <1.0.0` without a certified adapter resolves to
the synthetic identity `dsh-compat` using the **newest certified contract**:
`{ adapterId: 'dsh-compat', hostVersion: observed, contractHash: <newest>,
catalogProfile: <newest profile>, capabilities: <newest adapter's> }`. The Host
injects the newest compiled catalog and sets `payload.compat = true`; diagnostics
carry a `compat.mode` line. The Client accepts that triple only when `compat` is
true, the observed version is inside the same range, and the catalog repeats the
same contract/profile; the self-check shows an unverified-compat notice. Because
the range is still `<1.0.0`, a future 1.x host requires an explicit support
decision rather than being silently accepted.

Client (`src/client/runtime.ts`) reads `globalThis.__DSH_LIVERY_BOOT__`, fetches
`BootPayload.catalogUrl` once (lazily, starts on `start()` after settings load), and:

- `boot`: host rows already active.
- `loading`: zero DOM writes; waits `ctx.configForms.get(entryId)` first snapshot and
  catalog fetch (catalog fetch failure degrades to boot-only, colors still work).
- `ready`: compares `renderStyleText(activeLivery, capabilities)` hash with
  `bootPayload.cssHash`. Equal → adopt boot style (rename id) with zero CSS text
  writes. Different/invalid → one synchronous batch: replace style text, set body
  attributes, mark ready.
- Unknown/deleted configured skin id: render stock visually (no automatic config
  write), report the reason in self-check and offer an explicit "restore stock" action.
- `previewing`: separate style element with the preview livery; body attribute set to
  the preview id; `cancelPreview()` removes it; `commitPreview()` performs one
  `configForms.mutate([{ op: 'set', path: ['skinId'], value: id }])`; failure rolls
  back the preview and returns to `ready` with the confirmed skin.
- `degraded`: catalog fetch failed or a required capability is unavailable; colors
  keep working; font/layout capability pieces are reported in self-check.
- `disposed`: reverse-order removal of styles, attributes and subscriptions.

## 5. Host routes

- `GET /livery/api/catalog` → `LiveryCatalog` JSON, `cache-control: no-store`,
  same-origin GET only; 405 otherwise. Read-only, no secrets.
- `GET /livery/assets/previews/<catalogProfile>/<file>.svg` → `image/svg+xml`; the
  path is a whitelist lookup against that profile's
  `lib/previews/<catalogProfile>/index.json` (no filesystem traversal; other profiles
  404). 404 on unknown. File-name convention (frozen):
  `<id>-<zh|en>-<light|dark>.svg`, e.g. `fjord-zh-light.svg`. The client builds the
  URL from `LiveryCatalog.previewsBase` and falls back to a token-swatch mockup on
  image error; the per-profile index is the host's authoritative whitelist.
- Anything else: not handled by Livery.

## 6. Client UI entry contract

The primary entry is a **main-page panel plus a left-sidebar row**, the same shape the
shipped Plugins page uses:

- `main` keyed slot occupant with `key: PANEL_ID ('livery')`, `locale: LOCALE_NS`.
- `sidebar.panellist` list row: `id: PANEL_ID`, `order: 30` (after 插件 0 /
  自动化任务 10 / 上下文观察 20), `locale: LOCALE_NS`, `label: () => t('panel.label')`
  (zh 皮肤 / en Livery), icon component receiving `{ size, active }`.
- Hosts without panel navigation (pre-DSH `0.1.5-alpha.2`) fall back to the legacy
  `settings.section` entry (`id: 'livery'`, `order: 25`, owner props `{ close }`). The
  capability is probed synchronously with `ctx.slots.spec('sidebar.panellist')` /
  `spec('main')`; no host-version strings. On panel-nav hosts the settings section must
  not be registered.
- UI states required (identical in both containers): `loading`, stock, normal gallery,
  search-empty, thumbnail-error, incompatible livery, checking/self-check partial
  failure, previewing, write-failure, diagnostics-copied. The main-panel page renders
  its own title/description and a scrollable body; the fallback section keeps the
  settings shell chrome.
- Gallery: keyboard roving focus (←→↑↓/Home/End/Enter), `aria-selected`, visible focus.
- **Preview-language tab (0.4+):** the gallery toolbar carries a segmented control
  (`livery-locale-tab`) with `Follow DSH` (default) / `中文` / `English`
  (`livery-locale-follow|zh|en`, `aria-pressed`). It selects which precompiled
  preview SVG locale the thumbnails load (`follow` resolves to the host locale);
  it never changes app copy, names/descriptions or applied-style semantics.
  Labels: zh 预览语言/跟随 DSH/中文/English; en Preview language/Follow DSH/中文/English.
  All copy from `src/i18n`; no hard-coded Chinese in default UI or English in default UI.

Search matches: localized name (current locale first, both locales), id, localized tag
labels in the active locale, English name.

## 6b. Visual-studio UI contract (unreleased 0.1.0)

The page has two top-level tabs: **视觉风格 / Visual styles** and **壁纸 / Wallpapers**
(`livery-page-tab-style`, `livery-page-tab-wallpaper`). Style tab keeps the
24-style gallery; gallery UX (task-19):

- primary filter row: `all` + six style families (`calm/nature/light/retro/vivid/dark`;
  `livery-family-chip`, `data-family`, `aria-pressed`); the 16 tag chips live behind
  `更多筛选 / More filters` (`livery-more-filters`, `aria-expanded`, `aria-controls`).
- the gallery is one `role=listbox` (`livery-gallery`) of six `role=group` sections
  in family order (`livery-family`, `livery-family-<id>`, `data-family`); cards stay
  `role=option` (`livery-card`, `data-livery-id`, `data-state`); one global roving
  focus index keeps ←/→/↑/↓/Home/End/Enter semantics across sections.
- preview-language tab (`livery-locale-tab`, `livery-locale-follow|zh|en`) unchanged.

Wallpaper tab (client-only, no host config/boot): 8 built-in CSS wallpapers
(`wallpaper-builtin`, `data-wallpaper-id`), blur/dim/frost sliders
(`wallpaper-blur|dim|frost`), custom https URL (`wallpaper-url`, `wallpaper-url-apply`),
optional online search via Openverse (`wallpaper-search`, `wallpaper-refresh`) and
random via Picsum (`wallpaper-random`), result cards (`wallpaper-result`), status and
attribution (`wallpaper-status`, `wallpaper-attribution`). Persistence is
`localStorage['dsh-livery.wallpaper.v1']`. Application: one plugin-owned
`<style data-plugin-css="dsh-livery/wallpaper">` + `body[data-dsh-wallpaper]`, only
body pseudo-element layers (`::before` image with blur, `::after` dim veil) and
`color-mix` overrides of the active livery background tokens for frost; no host
component selectors, no `!important`.

Round-9 wallpaper additions (unreleased 0.1.0):

- 24 built-ins (`wallpaper-builtin`, `data-wallpaper-id`, stable ids: the original
  8 + forest/desert/ocean/sky/snow/bloom/neon/cyber/retro/sand/rose/violet/
  midnight/sunrise/glacier/minimal).
- Online wallpapers card: search/random/next-batch/retry, one automatic random
  Picsum batch on tab mount; the round-9 curated category library was removed in
  round 11 (no `wallpaper-library-*`/`wallpaper-category` hooks).
- Upload: `wallpaper-upload` (file input), `wallpaper-upload-button`,
  `wallpaper-upload-dropzone`, `wallpaper-upload-error`; JPEG/PNG/WebP/AVIF ≤10 MiB;
  blob stored in IndexedDB `dsh-livery-wallpapers`/`images`; selection kind
  `upload` persists in localStorage and hydrates as a blob object URL.
- Effects: `wallpaper-atmosphere` 0–100 (default 30) controls the generic
  above-content overlay `#dsh-livery-wallpaper-overlay`
  (`.dsh-livery-wallpaper-overlay`, pointer-events none, soft-light); presence
  requires a selected wallpaper and atmosphere > 0. Both wallpaper layers use
  viewport-relative `cover`/`center`.
- Page tab is remembered at module scope + `sessionStorage`
  (`dsh-livery.page-tab.v1`), so navigating away and back restores the wallpaper
  tab; explicit `initialTab` still wins.

Compatibility mode: when the host payload has `compat: true` (see §4), the panel shows
an unverified-compat notice/tag and the self-check adds `compat.mode`; applied styles
come from the newest certified contract.

## 6c. Studio layout (round 10, unreleased 0.1.0)

Presentation-only responsive card layout; all behaviour/testids from §6b remain.

- Style page: `livery-layout` grid (`minmax(0,2fr) minmax(280px,1fr)` ≥1100 px,
  single column below) → main `livery-current-card` (with `livery-hero-thumb`),
  optional `livery-preview-card`, notices, `livery-gallery-card`; rail `livery-rail`
  with `livery-actions-card` + self-check card.
- Wallpaper page: `wallpaper-layout` grid → main `wallpaper-hero`
  (`wallpaper-hero-preview`/`wallpaper-hero-empty`), `wallpaper-online-card`,
  `wallpaper-custom-card`; rail
  `wallpaper-effects-card` (+`wallpaper-effects-grid`; sliders bounded ≤220 px,
  fixed value badges) and `wallpaper-builtins-card`.
- Cards share `.livery-ui-card` (token-derived surface, 1 px border, 14 px radius,
  subtle shadow/backdrop blur); no `!important`, no host selectors. 1440/1024 and
  light/dark verified with no horizontal overflow.

## 7. Generated artifacts (build-time, committed)

- `src/generated/contract.ts` — multi-adapter registry (`ADAPTERS`,
  `ADAPTER_BY_VERSION`, `adapterForVersion`, `SUPPORTED_HOST_VERSIONS`, per-adapter
  capabilities, `catalogProfile`, platform modules). Regenerated by
  `contract:regenerate` (or any snapshot run) from `contracts/dsh/*/contract.json`.
- `src/generated/stock.ts` — per-version stock snapshots (`STOCK_BY_VERSION`,
  `stockForVersion`), generated by `contract:regenerate`. Never hand-edited.
- `src/generated/liveries.ts` — per-catalog-profile compiled data
  (`CATALOG_PROFILES`, `CATALOG_PROFILE_IDS`). Generated by `liveries:compile`.
- `lib/previews/<id>-<zh|en>-<light|dark>.svg` + `lib/previews/index.json`.
- `artifacts/contracts/<version>/{contract,adapter,provenance,hashes,diff}.json`,
  `artifacts/liveries/**`, `artifacts/acceptance/**`.

`pnpm build` order: `liveries:compile` (all catalog profiles) → esbuild host →
esbuild client → budgets. `liveries:check` recompiles in memory and fails on drift
for every profile. Contract snapshots are produced separately by
`contract:snapshot` (host installs) / `scripts/prepare-desktop-contract.mjs`
(packaged Desktop app) and materialize the multi-version registry.

## 8. Build outputs

- `lib/index.js` — Host ESM bundle, externals: Node builtins only; `@deepseek-ai/schemastery`
  is bundled. Exports `Config`, `inject`, `apply`.
- `lib/client.js` — Client IIFE-ish loader envelope:
  `window.__ModuleLoader__.load({ id: 'dsh-livery', factory: (require) => { … } })`,
  CJS, one self-contained file, CSS inlined into a `<style data-plugin="dsh-livery">`
  insertion inside the factory.
- `lib/index.d.ts`, `lib/client.d.ts` — declarations copied from `tsc` emit (optional but
  shipped).
- `lib/previews/<catalogProfile>/<id>-<zh|en>-<light|dark>.svg` + `index.json`
  (one set per catalog profile; the host serves only its adapter's profile).

## 9. Ownership matrix (parallel work)

| Owner | Write scope |
|---|---|
| Lead | `package.json`, `tsconfig.json`, `cordis.patch.yml`, `scripts/build.mjs`, `src/core/types.ts`, `src/core/index.ts`, `src/host/*`, `src/contract/*`, integration fixes, final gates |
| core-compiler | `src/core/color.ts`, `derive.ts`, `contrast.ts`, `typography.ts` (`registry.ts`), `layout.ts`, `render.ts`, `capabilities.ts`, `catalog.ts`, `src/compiler/**`, `schemas/**`, `liveries/**`, `src/i18n/**`, `tests/unit/**`, `tests/compiler/**` |
| client | `src/client/**`, `src/styles/**`, `tests/client/**` |
| verification | `tests/browser/**`, `scripts/acceptance/web.mjs`, `scripts/acceptance/probe/**`, `artifacts/acceptance/**`, `docs/verification.md**` |
| host-support | `src/host/config.ts`, `src/host/catalog.ts`, `src/host/routes.ts`, `src/host/diagnostics.ts`, `tests/host/**` (Lead owns `src/host/index.ts`, `boot.ts`) |

No owner edits another owner's files. Cross-cutting changes are requested from the Lead.
