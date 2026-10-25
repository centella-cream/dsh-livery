# Multi-version host support (0.2.0-rc.2 / 0.2.1-rc.2 / 0.2.1-rc.3)

This document began as the design for the second adaptation round. The certified
matrix is still exact, but install-time compatibility is now a range; the final
section describes the current policy.

The same shipped plugin package must style three exact, independently certified
host builds:

| Host version | Source | Certified runtime | Certified browser/profile |
|---|---|---|---|
| `0.2.0-rc.2` | npm/CLI install | Node v22.23.1 | Web/Chrome (already accepted) |
| `0.2.1-rc.2` | npm/CLI install | Node v22.23.1 | Web/Chrome (this round) |
| `0.2.1-rc.3` | Electron `app.asar` (Desktop app) | Node v24.21.0, Electron 44.7.0 | Desktop/macOS (this round, native chrome limits documented) |

On the certified path there is no semver inference: an exact build either has an
adapter or it does not. `engines.node` is the union of the certified runtimes
`^22.23.1 || ^24.21.0`. The install-time `engines.dsh` range also admits newer
builds in compat mode, as described at the end of this document.

## 1. Generated contract registry (`src/generated/contract.ts`)

```ts
export interface AdapterRecord {
  readonly hostVersion: string
  readonly adapterId: string              // dsh-<version>-r1
  readonly contractHash: string
  readonly loaderAbiHash: string
  readonly hostApiHash: string
  readonly clientApiHash: string
  readonly tokenHash: string
  readonly layoutHash: string            // presentation contract (attributes, --dsh-* hooks, README-gated)
  readonly profileSchemaHash: string
  readonly nodeRange: string
  readonly nodeRangeSource: string
  readonly clientTarget: string
  readonly platformModules: readonly string[]
  readonly capabilities: CapabilityMap
  readonly catalogProfile: string        // render-equivalent group id
  readonly sourceKind: 'installed-package' | 'packaged-app'
  readonly sourceEvidence: readonly string[]
  readonly capturedAt: string
}
export const ADAPTERS: readonly AdapterRecord[]
export const ADAPTER_BY_VERSION: Readonly<Record<string, AdapterRecord>>
export const ADAPTER_BY_CONTRACT_HASH: Readonly<Record<string, AdapterRecord>>
export const SUPPORTED_HOST_VERSIONS: readonly string[]
export const DEFAULT_ADAPTER: AdapterRecord
export function adapterForVersion(version: string | undefined): AdapterRecord | undefined
export function adapterForContractHash(hash: string | undefined): AdapterRecord | undefined
```

Contract facts for the current freeze (do not hardcode; read the generated file):

- `0.2.1` changed the loader ABI platform module table: adds `zod` and
  `@tanstack/react-virtual` (11 modules). Our bundle still requires only the nine
  modules it always did; `test:loader-abi` asserts every adapter seeds them.
- `0.2.1` changed the token **values** of the font family ladder:
  `--dsw-font-family` now resolves through the documented host hooks
  `--dsh-font-family-text` / `--dsh-font-family-text-default`, and the code family
  through `--dsh-font-family-code` / `--dsh-font-family-code-default`. Token *names*
  and color semantics are unchanged.
- New capability fact `host-font-role-hooks` (`host-font-role-hooks` in
  `CapabilityMap`): true for both 0.2.1 builds, false for 0.2.0-rc.2.
- `0.2.1-rc.2` and `0.2.1-rc.3` have the same token contract, so they share one
  `catalogProfile` (one compiled catalog + one preview set). `0.2.0-rc.2` has its own.
- Host API, Client API and profile-schema class hashes are identical on all three
  versions: the Host/Client integration code does not fork per version.

## 2. Generated stock snapshot (`src/generated/stock.ts`)

```ts
export interface StockSnapshot {
  readonly version: string
  readonly tokenContractHash: string
  readonly tokens: Readonly<Record<string, StockTokenDeclaration>>
  readonly dshVariables: Readonly<Record<string, { light: string|null; dark: string|null; notes: string|null; declared: boolean }>>
}
export const STOCK_BY_VERSION: Readonly<Record<string, StockSnapshot>>
export const STOCK_VERSIONS: readonly string[]
export function stockForVersion(version: string): StockSnapshot | undefined
export function stockLightFor(version: string): TokenMap
export function stockDarkFor(version: string): TokenMap
```

**Core rule:** derivation/render/audit receive the stock snapshot explicitly
(`deriveLivery(manifest, stock)`, `renderLiveryCss(livery, capabilities, stock)`,
contrast helpers take the needed stock data). No core module may read a single
global `STOCK_TOKENS` anymore; a catalog compiled for 0.2.0-rc.2 must never render
against 0.2.1 values or vice versa.

## 3. Core / renderer changes

`renderLiveryCss(livery, capabilities, stock)` keeps the frozen fragment contract
(`tokens` → `typography` → `layout`, scoped under `body[data-dsh-livery]`) and gains
two typography strategies selected by capability facts, never by a version string:

- `host-font-role-hooks` available (0.2.1+): typography fragment binds only the
  documented host hooks, per language, unlayered, same scoping:
  `:root:lang(zh) body[data-dsh-livery="<id>"]{--dsh-font-family-text:<ui/content stack>;--dsh-font-family-code:<mono stack>}`.
  Do **not** override the composite `--dsw-font-*` ladder on these hosts.
- hooks absent (0.2.0-rc.2): keep the current strategy (override `--dsw-font-family`
  and the consumed composite tokens with `var(--dsw-font-family)` de-referencing).

Both strategies must keep per-livery CSS inside the size budget and stay
deterministic. `renderStyleText`/`cssHash` semantics are unchanged.

## 4. Catalog profiles (`src/generated/liveries.ts`)

```ts
export interface CatalogProfile {
  readonly profileId: string
  readonly compiledAt: string
  readonly sourceHash: string
  readonly sourceAdapters: readonly string[]   // host versions sharing it
  readonly liveries: readonly CompiledLivery[]
}
export const CATALOG_PROFILES: Readonly<Record<string, CatalogProfile>>
export const CATALOG_PROFILE_IDS: readonly string[]
```

The compiler compiles **once per `catalogProfile`** (representative adapter's stock +
capability map), then verifies that every adapter in the group renders identical
bytes. Previews are emitted per profile: `lib/previews/<profileId>/<id>-<zh|en>-<light|dark>.svg`
plus `lib/previews/<profileId>/index.json` (`{"files":[...],"count":96}`).

## 5. Host runtime

- Pre-loader gate: `resolveAdapterForVersion(observedHostVersion)` first looks for an
  exact adapter. Since round 7, an in-range version without one resolves to the
  synthetic `dsh-compat` identity (see the final section). If no adapter is available
  because the version is out of range or unreadable, the gate closes with zero rows
  and a structured diagnostic. Accepted state carries the adapter's `adapterId`,
  `hostVersion`, `contractHash`, `catalogProfile` and capability map. `profileKind` is
  recorded in the payload for diagnostics; certification scope is a support-matrix
  claim, not a runtime switch (the certified builds are profile-agnostic style layers).
- `buildCatalog(adapter)` returns the `LiveryCatalog` shape with that adapter's
  identity fields + `catalogProfile` + `previewsBase = PREVIEW_ROUTE_PREFIX + profileId + '/'`
  and the profile's liveries.
- Boot rows/payload: same row order and escaping as today; `BootPayload` gains
  `catalogProfile` and uses the adapter's identity fields.
- Routes: `GET /livery/api/catalog` (per-adapter identity), previews served from
  `lib/previews/<catalogProfile>/` via a per-profile whitelist; other profile dirs 404.

## 6. Client runtime

- Handshake whitelist: `__DSH_LIVERY_BOOT__` is accepted only when its
  `(hostVersion, adapterId, contractHash)` triple matches one `ADAPTERS` record, and
  the fetched catalog repeats the same triple + `catalogProfile`. A compat triple is
  accepted only when the payload also sets `compat: true` (see the final section).
- All style/preview decisions use the catalog data; preview URLs come from
  `catalog.previewsBase`, never from a hardcoded path.
- Self-check shows the live host version, adapter id, contract hash and catalog
  profile; capability rows come from the catalog's capability map (so on 0.2.1 it
  additionally lists `host-font-role-hooks: available`).
- **Entry point:** the primary UI is a main-page panel (`main` keyed, key `livery`)
  plus a `sidebar.panellist` row (order 30, after 插件 0 / 自动化任务 10 / 上下文观察
  20; label 视觉风格 / Visual Style). This is the same integration the shipped Plugins
  page uses. The old `settings.section` page remains only as a fallback for hosts
  without panel navigation (pre-`0.1.5-alpha.2`). See `docs/research/client-contract.md` §4 for the
  version history of this capability.
- If the boot payload/catalog identity is not in the registry: fail closed to stock,
  remove boot style/attributes, report the mismatch.

## 7. Contract tooling (Lead)

- `pnpm contract:snapshot -- --dsh-install <tree>` works for any version; Desktop uses
  `scripts/prepare-desktop-contract.mjs --app-asar …` first (extracts runtime bytes,
  supplements stripped `.d.ts`/README from the same published version, records the
  mixture in the snapshot's `source.prepared`).
- `contract:verify` verifies the version installed at `--dsh-install` against its
  committed contract (or `--all` for generated-registry reproducibility).
- `contract:diff --base … --candidate …`; `adapter:generate` (all versions);
  `adapter:check` (all versions + exact `engines.dsh` allowlist);
  `contract:regenerate` regenerates `contract.ts`/`stock.ts`.
- `test:loader-abi` validates every adapter's seeded module table contains the
  modules our client bundle requires.

## 8. Evidence plan

- Web Profile `0.2.1-rc.2`: isolated full acceptance (official install/lifecycle) + a
  read-only pass on a clone of the user's real Web Profile; expected boot payload
  `hostVersion=0.2.1-rc.2`, adapter `dsh-0.2.1-rc.2-r1`, token behavior as compiled.
- Desktop Profile `0.2.1-rc.3`: isolate/clone the real desktop profile, install the
  tarball through the official path available to the Desktop app runtime, boot the
  composition with the app-bundled Node 24 runtime, and run the read-only acceptance
  probe. Native Electron chrome/DPI/vibrancy remain explicitly unverified unless a
  real window session is driven; the report must say so.
- Support matrix: new entries stay `draft`/`g0-g5-passed` until their evidence lands;
  no G6 claim, no formal `support-matrix.json`.

## Certified matrix vs compatibility mode (round 7 policy)

The original policy was exact-version only. That made every DSH update a hard
failure, so install-time compatibility is now expressed as a **range** while the
certified matrix stays exact:

- `engines.dsh` = `>=0.2.0-rc.2 <1.0.0` (install allowed, older builds rejected).
- Exact versions in `contracts/dsh/<version>/` keep their frozen six hashes and
  full verification evidence — the **certified matrix**.
- A readable version inside the range without a certified adapter is served in
  **compat mode**: the host synthesizes `{ adapterId: 'dsh-compat',
  hostVersion: observed, contractHash: <newest certified contract>,
  catalogProfile: <newest catalog profile>, capabilities: <newest adapter's> }`,
  injects the newest compiled catalog and sets `payload.compat = true`. The client
  accepts the compat triple only when the payload flag is set, the version is in
  range and the catalog repeats the same contract/profile. The self-check marks it
  as unverified.
- Unreadable or out-of-range versions still fail closed with zero rows.

Certification therefore means "verified on this exact build", not "installable".
A future DSH release keeps a working, clearly-labelled best-effort visual layer
instead of disabling the plugin; when a release is added to the matrix it moves
from compat to certified automatically through the generated adapter registry.
