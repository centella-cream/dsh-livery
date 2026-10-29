# Interfaces and architecture

**Status (0.1.4):** current implementation reference. The authoritative support
policy is [`contracts/dsh/support-matrix.json`](../../contracts/dsh/support-matrix.json);
the exact release evidence is in [`docs/verification.md`](../verification.md).
Historical interfaces and pre-0.1.0 design notes are under
[`docs/archive/`](https://github.com/centella-cream/dsh-livery/tree/main/docs/archive).

## 1. Module boundaries

| Path | Scope | May import | Must not import |
|---|---|---|---|
| `src/core/**` | pure color/derive/render/catalog algorithms | Node builtins, own modules | React, Cordis, DSH packages, DOM |
| `src/compiler/**` | build-time compiler | `src/core`, Node builtins, `ajv`, `postcss` | React, Cordis, DOM |
| `src/host/**` | Cordis host plugin, boot rows, catalog route | `src/core`, Node builtins, type-only DSH imports | React, client modules |
| `src/client/**` | browser plugin (React) | `src/core`, React, platform modules, type-only DSH imports | Node builtins, host modules |
| `src/i18n/**` | localized dictionaries | nothing | everything else |
| `src/contract/**` | contract snapshot/diff and adapter registry | Node builtins, type-only DSH imports | React, DOM |
| `scripts/**` | CLI wrappers over `lib/cli/*` | `lib/` only | — |
| `liveries/<id>/manifest.json` | livery data | — | code |
| `schemas/livery.schema.json` | manifest JSON Schema | — | code |

`src/core` is bundled separately into the Host and Client builds. Do not share a
runtime chunk between them.

## 2. Supported hosts and adapter model

The formal matrix is the only generation authority. The package ships **one
adapter per certified host build**, selected by the exact observed DSH version:

| Host | Adapter | Scope |
|---|---|---|
| `0.2.1-rc.2` | `dsh-0.2.1-rc.2-r1` | Web/Chrome (stable) |
| `0.2.1-rc.3` | `dsh-0.2.1-rc.3-r1` | Desktop/macOS renderer (stable) |
| `0.2.1-rc.4` | `dsh-0.2.1-rc.4-r1` | Web/Chrome (next-channel preview) |

`engines.dsh` is the exact allowlist derived from the matrix; there is **no**
semver range and **no** compatibility mode. Unknown builds are rejected at
install time and fail closed to stock at runtime. Stable vs next-preview rules
are in [multi-version.md](multi-version.md).

The three adapters share one catalog profile (`sha256:1962031f…`) because their
render-affecting token contracts match. The host serves only the active
adapter's profile.

## 3. Generated registry and stock snapshots

`src/generated/contract.ts` exports the shipped adapter records:

```ts
export interface AdapterRecord {
  readonly hostVersion: string
  readonly adapterId: string              // dsh-<version>-r1
  readonly contractHash: string
  readonly loaderAbiHash: string
  readonly hostApiHash: string
  readonly clientApiHash: string
  readonly tokenHash: string
  readonly layoutHash: string
  readonly profileSchemaHash: string
  readonly nodeRange: string
  readonly clientTarget: string
  readonly platformModules: readonly string[]
  readonly capabilities: CapabilityMap
  readonly catalogProfile: string
  readonly sourceKind: 'installed-package' | 'packaged-app'
  readonly sourceEvidence: readonly string[]
  readonly capturedAt: string
}
export const ADAPTERS: readonly AdapterRecord[]
export const ADAPTER_BY_VERSION: Readonly<Record<string, AdapterRecord>>
export const SUPPORTED_HOST_VERSIONS: readonly string[]
export const DEFAULT_ADAPTER: AdapterRecord
export function adapterForVersion(version: string | undefined): AdapterRecord | undefined
```

`src/generated/stock.ts` holds the per-version stock token snapshot. Derivation
and rendering receive the stock snapshot explicitly; no core module reads a
global stock table. Never hand-edit generated files.

## 4. Host ↔ Client handshake

The compiler stores the final stylesheet fragments (`css.tokens`,
`css.typography`, `css.layout`) on each compiled livery and a content hash
`cssHash = sha256(styleText)`. Runtime modules never derive styles.

For an accepted exact adapter, the Host injects:

1. a `<style id="dsh-livery-boot">` row with the boot CSS, scoped to
   `body[data-dsh-livery="<id>"]`;
2. `globalThis.__DSH_LIVERY_BOOT__` containing adapter identity, catalog URL,
   active style and `cssHash`;
3. a body script that sets `body[data-dsh-livery]` and
   `body[data-dsh-livery-hash]` before app scripts.

Gate failure (unreadable version, unsupported version, adapter/contract mismatch,
missing livery or invalid compiled artifact) pushes **no** boot rows; the host
stays stock. The client accepts only an adapter triple present in the generated
registry, fetches the catalog once, and adopts the boot CSS with no text writes
when the hash matches; otherwise it performs one synchronous replacement.
Unknown/deleted configured styles fall back to stock without an automatic config
write.

## 5. Host routes

- `GET /livery/api/catalog` — active adapter identity plus the compiled catalog;
  `cache-control: no-store`; same-origin GET only.
- `GET /livery/assets/previews/<catalogProfile>/<file>.svg` — whitelist lookup
  from `lib/previews/<profile>/index.json`; filenames are
  `<id>-<zh|en>-<light|dark>.svg`; other profiles 404.
- No other routes are owned by Livery.

## 6. Client UI entry

The primary entry is a **main panel plus a left-sidebar row**, matching the host
Plugins page shape:

- `main` keyed slot with `key: 'livery'` and the Livery locale namespace;
- `sidebar.panellist` row (`order: 30`, label 视觉风格 / Visual Style, icon);
- hosts without panel navigation fall back to the legacy `settings.section`
  entry; the capability is probed synchronously via slot specs, never by a host
  version string.

The page has **视觉风格 / Visual styles** and **壁纸 / Wallpapers** tabs. Required
states include loading, stock, gallery, search-empty, thumbnail error,
incompatible livery, self-check partial failure, previewing, write failure and
diagnostics-copied. Keyboard navigation, `aria-selected`/`aria-pressed` states,
focus rings, visible selected swatches and readable labels are part of the UI
contract.

Wallpaper application is client-only: one owned `<style>` plus
`body[data-dsh-wallpaper]`, viewport-relative `cover` pseudo-element layers, and
a plugin-private card surface token. It does not use host component selectors or
`!important`. The optional atmosphere layer stays below all host floating UI;
opaque third-party pages may show no perceptible change and no visual coverage
is claimed. The local `dsh-charter` example is only a rendering fixture for
screenshots, not a dependency.

Wallpaper state is schema v2 in the existing localStorage key:
`{schemaVersion:2, revision, selection, effects, position}`. Flat v1 records
migrate losslessly with position 50/50. Focal position is one of nine stops and
applies only to remote/upload wallpapers; builtin gradients remain centered.
Selection/effects/position changes go through one batch state transition, and
the same state is synchronized between tabs via storage events with
revision/source protection. Preset v1 carries an existing style id, builtin or
HTTPS wallpaper, effects and position; it never carries upload blobs, CSS,
tokens, fonts, local paths or history. Local image storage is IndexedDB v2 with
explicit metadata, upload/remote kinds, LRU bounds and a clear-local-data
operation.

## 7. Build artifacts

- `src/generated/contract.ts` — shipped adapter registry.
- `src/generated/stock.ts` — per-version stock snapshots.
- `src/generated/liveries.ts` — compiled catalog profiles.
- `lib/index.js` — Host ESM bundle.
- `lib/client.js` — one self-contained client loader envelope with inlined CSS.
- `lib/previews/<catalogProfile>/` — 96 previews (24 styles × 2 locales × 2 modes)
  plus `index.json`.
- `schemas/`, `liveries/` and `contracts/dsh/<version>/` — shipped data.

Regenerate with:

```bash
pnpm liveries:compile
pnpm contract:regenerate
pnpm build
```

Contract snapshots are produced with `pnpm contract:snapshot` or, for the
packaged Desktop app, `scripts/prepare-desktop-contract.mjs`. The generated
registry must stay byte-reproducible from committed snapshots.

## 8. Verification

`pnpm verify` runs typecheck, build, the full test suite, livery drift checks,
CSS/contrast audits and package checks. Release acceptance additionally requires
an exact built tarball, official plugin-manager installs, the committed evidence
files and the matrix/release gates. See [verification.md](../verification.md).
