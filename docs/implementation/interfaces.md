# DSH Livery — implementation interfaces (freeze v1)

Status: frozen for parallel implementation. Any change requires the Lead to update this
file and notify every owner. DSH baseline: `0.2.0-rc.2`; adapter: `dsh-0.2.0-rc.2-r1`.

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
export function auditContrast(variant: CompiledVariant, mode: Mode): readonly ContrastEntry[]
export function summarizeContrast(entries: readonly ContrastEntry[]): { failures: number; total: number }

// src/core/render.ts
export function renderLiveryCss(
  livery: Pick<CompiledLivery,'id'|'light'|'dark'|'typography'|'layout'|'requiredCapabilities'|'optionalCapabilities'>,
  capabilities: CapabilityMap,
  options?: { readonly pretty?: boolean },
): LiveryCss
export function renderBootCss(catalog: LiveryCatalog, skinId: string): { css: string; hash: string }
export function renderStyleText(livery: CompiledLivery, capabilities: CapabilityMap): string   // tokens+typography+layout concatenated
export function hashCss(css: string): string                       // "sha256:<hex>"
export function hashLivery(livery: Omit<CompiledLivery,'hash'>): string

// src/core/catalog.ts
export function findLivery(catalog: LiveryCatalog, id: string): CompiledLivery | undefined
export function isKnownSkinId(catalog: LiveryCatalog, id: string): boolean

// src/core/index.ts re-exports all of the above.
```

## 3. Client platform modules (seeded, no `dsh.client.external` needed)

`react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@deepseek-ai/cordis`,
`@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-slots`,
`@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-dockkit`.

Everything else imported by `src/client/**` must be bundled by esbuild. Never import
another plugin's client module for values; collaborate through Cordis services.

## 4. Host ↔ Client handshake

Host (`src/host/boot.ts`) contributes three `webserver/index-inject` rows when the
pre-loader gate accepts the host:

1. `{ kind: 'style', text: bootCss }` — `body[data-dsh-livery]` light/dark token pair,
   `:root:lang()` font bindings and `@layer dsh-livery.compat` layout rules for the
   active livery, all scoped under `body[data-dsh-livery="<id>"]`.
2. `{ kind: 'global', name: '__DSH_LIVERY_BOOT__', value: BootPayload }`.
3. `{ kind: 'html', placement: 'body', html: '<script>…setAttribute…</script>' }` —
   sets `body[data-dsh-livery]` and `body[data-dsh-livery-hash]` before app scripts.

Gate failure (unknown version / adapter / required contract mismatch / no active
livery / invalid compiled artifact): **no rows are pushed at all**; stock remains.

Client (`src/client/runtime.ts`) reads `globalThis.__DSH_LIVERY_BOOT__`, fetches
`BootPayload.catalogUrl` once (lazily, starts on `start()` after settings load), and:

- `boot`: host rows already active.
- `loading`: zero DOM writes; waits `ctx.configForms.get(entryId)` first snapshot and
  catalog fetch (catalog fetch failure degrades to boot-only, colors still work).
- `ready`: compares `renderStyleText(activeLivery, capabilities)` hash with
  `bootPayload.cssHash`. Equal → adopt boot style (rename id) with zero CSS text
  writes. Different/invalid → one synchronous batch: replace style text, set body
  attributes, mark ready.
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
- `GET /livery/assets/previews/<file>.svg` → `image/svg+xml`, path is a whitelist
  lookup against `lib/previews/index.json` (no filesystem traversal). 404 on unknown.
- Anything else: not handled by Livery.

## 6. Settings page contract (Client)

Registered into slot `settings.section` with `id: 'livery'`, `order: 40`,
`locale: LOCALE_NS`. Component receives `{ close }` owner props. States required:
`loading`, stock, normal gallery, search-empty, thumbnail-error, incompatible livery,
checking/self-check partial failure, previewing, write-failure, diagnostics-copied.
Gallery: keyboard roving focus (←→↑↓/Home/End/Enter), `aria-selected`, visible focus.
All copy from `src/i18n`; no hard-coded Chinese in default UI or English in default UI.

Search matches: localized name (current locale first, both locales), id, localized tag
labels in the active locale, English name.

## 7. Generated artifacts (build-time, committed)

- `src/generated/stock.ts` — `StockTokens` light/dark snapshot extracted from the
  frozen DSH install (by `contract:snapshot`). Never hand-edited.
- `src/generated/liveries.ts` — `export const LIVERIES: readonly CompiledLivery[]`
  and `export const CATALOG_META`. Generated by `liveries:compile`.
- `lib/previews/<id>-<zh|en>-<light|dark>.svg` + `lib/previews/index.json`.
- `artifacts/contracts/<version>/{contract,adapter,provenance,hashes,diff}.json`,
  `artifacts/liveries/**`, `artifacts/acceptance/**`.

`pnpm build` order: `contract:snapshot` (only if generated stock missing and a DSH
install is provided) → `liveries:compile` → esbuild host → esbuild client →
write `lib/` assets. `liveries:check` recompiles in memory and fails on drift.

## 8. Build outputs

- `lib/index.js` — Host ESM bundle, externals: Node builtins only; `@deepseek-ai/schemastery`
  is bundled. Exports `Config`, `inject`, `apply`.
- `lib/client.js` — Client IIFE-ish loader envelope:
  `window.__ModuleLoader__.load({ id: 'dsh-livery', factory: (require) => { … } })`,
  CJS, one self-contained file, CSS inlined into a `<style data-plugin="dsh-livery">`
  insertion inside the factory.
- `lib/index.d.ts`, `lib/client.d.ts` — declarations copied from `tsc` emit (optional but
  shipped).
- `lib/previews/**`, `lib/liveries.json` (catalog metadata; host bundles generated TS).

## 9. Ownership matrix (parallel work)

| Owner | Write scope |
|---|---|
| Lead | `package.json`, `tsconfig.json`, `cordis.patch.yml`, `scripts/build.mjs`, `src/core/types.ts`, `src/core/index.ts`, `src/host/*`, `src/contract/*`, integration fixes, final gates |
| core-compiler | `src/core/color.ts`, `derive.ts`, `contrast.ts`, `typography.ts` (`registry.ts`), `layout.ts`, `render.ts`, `capabilities.ts`, `catalog.ts`, `src/compiler/**`, `schemas/**`, `liveries/**`, `src/i18n/**`, `tests/unit/**`, `tests/compiler/**` |
| client | `src/client/**`, `src/styles/**`, `tests/client/**` |
| verification | `tests/browser/**`, `scripts/acceptance-web.mjs`, `scripts/probe/**`, `artifacts/acceptance/**`, `docs/verification/**` |
| host-support | `src/host/config.ts`, `src/host/catalog.ts`, `src/host/routes.ts`, `src/host/diagnostics.ts`, `tests/host/**` (Lead owns `src/host/index.ts`, `boot.ts`) |

No owner edits another owner's files. Cross-cutting changes are requested from the Lead.
