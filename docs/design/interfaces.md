# Interfaces and architecture

**Status (0.2.2 target):** current implementation reference for the `0.2.2`
target release; the published baseline is `0.2.1`. The authoritative support
policy is [`contracts/dsh/support-matrix.json`](../../contracts/dsh/support-matrix.json);
the exact evidence bound to the published baseline is in
[`docs/verification.md`](../verification.md), and 0.2.2 evidence must be bound
after the candidate is accepted. Historical interfaces and pre-0.1.0 design
notes are under
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
adapter per certified host build**, plus the reviewed 0.2 compatibility range:

```text
>=0.2.1-rc.2 <0.3.0
```

Exact hosts in `contracts/dsh/support-matrix.json` are the evidence authority;
runtime resolution is exact-only. An in-range but uncertified build installs and
then fails closed before adapter selection — there is no version-string fallback
and no compatible-preview runtime path. Unknown/out-of-family builds fail closed
to stock. Stable vs next-preview rules are in
[multi-version.md](multi-version.md).

The current matrix has eight host builds. The generated registry carries a
catalog profile per adapter and `contracts/dsh/catalog-profile-overrides.json`
currently records no overrides, so no profile is shared across host versions. A
reviewed v2 override may share a profile only when the loader/host/client API
hashes match; the host serves only the active adapter's profile.

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

### 4.1 Stale-boot repair (0.2.2 target)

`checkBoot` returns `valid | stale | absent | mismatch`. The only in-process
repair path is `stale`, and only for an exact allowlisted previous client build:

```ts
const STALE_BOOT_VERSIONS: readonly string[] = Object.freeze(['0.2.1'])
```

- Acceptance order: payload shape → certified `(hostVersion, adapterId,
  contractHash)` triple → `entryId` → version (`=== LIVERY_VERSION` → `valid`;
  exact membership in `STALE_BOOT_VERSIONS` → `stale`; anything else →
  `mismatch`) → `catalogProfile === adapter.catalogProfile` (strict, no
  HMR-profile exception) → `accepted` (`false` → `absent`). Exact string
  equality only: no semver, prefix or range inference, and extending the list is
  a reviewed release change tied to an accepted transition.
- Trusted stale fields: `hostVersion`, `adapterId`, `contractHash` (certified
  triple), `catalogProfile` (must equal the adapter's), `entryId`,
  `pluginVersion` (allowlist membership). `skinId`, `cssHash`, `diagnostics` and
  `profileKind` are diagnostic hints only; `catalogUrl` and `bootStyleId` are
  never trusted.
- Stale never adopts boot CSS: the client re-fetches the catalog, performs
  exactly one catalog-derived `applyConfirmed`, and re-applies the saved
  wallpaper/config. On catalog failure it fails closed to `degraded` with boot
  artifacts removed and `effectiveId: STOCK_ID`; a stale payload's `skinId` is
  never used as a config fallback. `retryCatalog()` may recover without a page
  reload.
- `BootPayload.pluginVersion` and `LiveryCatalog.compilerVersion` are
  `string`; `BootStatus` and every UI/diagnostic union include `stale`;
  `BootCheck.reloadRequired` is consumed by the plugin-detail copy.
- Claim boundary: DSH client HMR is a Web-profile mechanism. The 0.2.2 hot
  update claim is **Web only**; on Desktop an update requires a renderer
  reload/app restart, and no Desktop hot update is claimed.

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
  entry. Capability is discovered through the declared client slots: both
  registrations go through `ctx.slots.inject`, and a 1500 ms grace timer installs
  the settings fallback only if no panel row declares itself; a late row then
  disposes that fallback so exactly one entry exists. There is no host-version
  string branching and no synchronous `slots.spec` probing (the architecture test
  forbids `slots.spec`).

The page has **视觉风格 / Visual styles** and **壁纸 / Wallpapers** tabs. Required
states include loading, stock, gallery, search-empty, thumbnail error,
incompatible livery, self-check partial failure, previewing, write failure and
diagnostics-copied. Keyboard navigation, `aria-selected`/`aria-pressed` states,
focus rings, visible selected swatches and readable labels are part of the UI
contract.

### 6.1 Client slot consumption and per-host proof (0.2.2 target)

`src/contract/client-slots.ts` freezes the slots Livery consumes, in order:
`main`, `sidebar.panellist`, `settings.section`, then the appended detail slots
`plugins.detail.actions`, `plugins.detail.badge`, `plugins.detail.section`
(`scope: 'root'`, `kind: 'list'`, `ownerProps: ['subject']`, one `inject` key
each). `clientSlotHash()` is sha256 over that canonical list. The consumed-slot
list is not part of the adapter identity and
`contracts/dsh/catalog-profile-overrides.json` is empty, so the expected
regeneration diff is contract metadata only; any frozen contract or generated
adapter byte change is reviewed as an adapter change.

- The per-host declaration proof is
  `contracts/dsh/client-slot-declarations.json` (repo-only, not a package file):
  for each inspected host tree it records the plugin-manager package version and
  source sha256 plus declared key/kind/scope/ownerProps, and records a missing
  tree as an explicit gap. `scripts/client-slots-proof.mjs` regenerates it,
  `release-check.mjs` recomputes the current `clientSlotHash` and rejects a stale
  proof, and `tests/contract/client-slots-proof.test.ts` covers the generator and
  validator.
- Detail registration is `ctx.slots.inject(key, () => ctx.slots.register(...))`.
  If the plugin-manager page is absent the callback never fires, so Livery
  renders nothing and throws nothing. Entries return `null` unless
  `subject.kind === 'bundle' && subject.pkg.name === 'dsh-livery'`. Livery does
  not use `plugins.bundle.config` (the bundle config body) or `plugins.item`
  (official settings pages). Actions are limited to Open Livery (rendered only
  while the main panel registration is live) and a hot-update tab jump — no copy-diagnostics action, no update
  button and no interception of the host's install control.
- The detail section shows observable facts only: client build and installed
  package version, boot handshake state and reason, host version/adapter/contract
  hash/catalog profile, catalog phase and applied CSS hash, active style and
  wallpaper, plus exactly one update-boundary message selected by handshake
  state. The current detail design note is
  [`plugin-detail-surface.md`](plugin-detail-surface.md).

Wallpaper application is client-only: one owned `<style>` plus
`body[data-dsh-wallpaper]`, viewport-relative `cover` pseudo-element layers, and
a plugin-private card surface token. It does not use host component selectors or
`!important`. The optional atmosphere layer stays below all host floating UI;
opaque third-party pages may show no perceptible change and no visual coverage
is claimed. The local `dsh-charter` example is only a rendering fixture for
screenshots, not a dependency.

### 6.2 Wallpaper persistence: style sidecar, provenance and preset v2 (0.2.2 target)

The main record stays 0.2.1-readable: key `dsh-livery.wallpaper.v1`, schema v2,
`{schemaVersion:2, revision, selection, effects, position}`, selection kinds
`builtin | remote | upload | none`; `remote` gains one additive optional
`provenance` member (provider/title/creator/creatorUrl/license/licenseUrl/
source/sourceUrl) that 0.2.1 ignores. Flat v1 records migrate losslessly with
position 50/50. Focal position is one of nine stops and applies only to
remote/upload wallpapers. The generated Follow-style selection is never written
into the main record; it lives in the sidecar `dsh-livery.wallpaper.style.v1` as
`{schemaVersion: 1, variant: 'mesh', revision, sourceId}`.

- Hydration is `style` iff the sidecar parses, the main record parses with
  `selection` cleared, and the sidecar's `(revision, sourceId)` exactly equals
  the main record's identity; otherwise the main record wins and a stale sidecar
  is ignored. Tabs re-read the sidecar after adopting an external main record.
- Persist ordering: to style (or any persist while style is active) write the
  main tombstone with its new identity, then write/refresh the sidecar with the
  same identity; to image write the main selection, then remove the sidecar; to
  none remove the sidecar, then write the tombstone. Before any sidecar write the
  current main record is re-read and the write is skipped when another tab's
  newer identity won.
- `kind: 'style'` is generated by one pure function from the catalog tokens per
  light/dark mode (one fixed recipe); it creates no `url(...)`, blob, IndexedDB
  row or cache record. `canReposition` is true only for remote/upload; style
  always renders centered. Without catalog tokens the control is disabled with a
  visible reason, and an already-persisted style hydrates as “no wallpaper”.
- Provenance URLs are https, public-host and ≤2048 chars, and are rendered as
  `<a rel="noreferrer noopener" target="_blank">`; invalid URLs are dropped on
  write and preset import. Recent history is a display mirror that also carries
  the attribution URLs; the current image's credit resolves from the selection,
  and the legacy attribution key is migrated once.
- Preset schema v2 (`PRESET_SCHEMA_VERSION = 2`) adds
  `{kind: 'style', variant: 'mesh'}` and the attribution URLs; v1 files stay
  importable and a v1 file claiming `kind: 'style'` is rejected
  (`wallpaper-kind`); a bad style variant is `wallpaper-variant`, a bad
  attribution URL is `attribution`. Export always writes v2; 0.2.1 rejects v2
  with its existing `schema-version` error (documented downgrade limit).
  Selection/effects/position changes still go through one batch state transition
  and are synchronized between tabs via storage events with revision/source
  protection. Presets never contain upload blobs, CSS, tokens, fonts, local
  paths or history. Local image storage is IndexedDB v2 with explicit metadata,
  upload/remote kinds, LRU bounds and a clear-local-data operation; clearing local
  data preserves the main record and the style sidecar.

## 7. Build artifacts

- `src/generated/contract.ts` — shipped adapter registry.
- `src/generated/stock.ts` — per-version stock snapshots.
- `src/generated/liveries.ts` — compiled catalog profiles.
- `lib/index.js` — Host ESM bundle.
- `lib/client.js` — one self-contained client loader envelope with inlined CSS.
- `lib/previews/<catalogProfile>/` — 112 previews (28 styles × 2 locales × 2 modes)
  plus `index.json`.
- `schemas/`, `liveries/` and `contracts/dsh/<version>/` — shipped data.

Client gzip budget is **72 KiB (73,728 B)** for the 0.2.2 target — a reviewed
increase from 60 KiB for the wallpaper studio, provider registry and detail
surface. Per-livery/boot compiled CSS is **14 KiB** and the package tarball cap
stays at **4 MiB (4,194,304 B)**; `scripts/build.mjs` and the release/probe gates
enforce them, and the final measured numbers are recorded on the accepted
candidate. The optional wallpapers page fetches provider images directly from
the browser; Livery adds no Host fetch route and no proxy.

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
files, the matrix/release gates, the provider-access gate record and — for 0.2.2
— the Web update-probe evidence for the `0.2.1 → 0.2.2` transition on the final
candidate. See [verification.md](../verification.md).
