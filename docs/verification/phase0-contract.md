# Phase 0 evidence — DSH 0.2.0-rc.2 boundary freeze

Status: **complete for the Web Profile; desktop platforms remain uncertified.**
Captured: 2026-10-24. Adapter: `dsh-0.2.0-rc.2-r1`.

## 1. Fixrated installation

| Fact | Value | Evidence |
|---|---|---|
| DSH version | `0.2.0-rc.2` | `contracts/dsh/0.2.0-rc.2/contract.json` → `hostVersion` |
| Package install | `@deepseek-ai/dsh@0.2.0-rc.2` (npm global, Node v22.23.1) | `artifacts/contracts/0.2.0-rc.2/provenance.json` |
| Node engine range | `^22.19.0 || >=24.0.0` (copied from the target package) | `contract.json` → `source.nodeRange` |
| Client target | `chrome120` | `contract.json` → `source.clientTarget` |

## 2. Six contract hashes

| Class | Hash |
|---|---|
| loader ABI | `contracts/dsh/0.2.0-rc.2/contract.json` → `hashes.loaderAbi` |
| Host API | → `hashes.hostApi` |
| Client API | → `hashes.clientApi` |
| token | → `hashes.token` |
| layout | → `hashes.layout` |
| profile schema | → `hashes.profileSchema` |

The aggregate `contractHash` is recomputed from the six class hashes plus the Node
range and client target; `pnpm contract:verify` re-extracts all six from the installed
build and fails on any drift.

## 3. Plugin loading contract

- One Loader entry: `{ id: 'livery', name: 'dsh-livery' }` inserted by the package's
  `cordis.patch.yml`, applied as one bundle layer (`dsh.bundle.patch`).
- Host entry shape: named exports `Config`, `apply`, `inject?` (functional Cordis
  plugin). Volatile config field `skinId` → live-editable through `configForms`.
- Client entry: `window.__ModuleLoader__.load({ id: 'dsh-livery', factory })`, one
  classic script, CJS factory, CSS inlined at materialization.
- Seeded platform modules (exact, 9): `react`, `react/jsx-runtime`, `react-dom`,
  `react-dom/client`, `@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-store`,
  `@deepseek-ai/dsh-client-ui-slots`, `@deepseek-ai/dsh-client-ui-primitives`,
  `@deepseek-ai/dsh-client-ui-dockkit`. `dsh.client.external` stays empty; every other
  request is bundled.
- Peer gate: `peerDependencies` on `@deepseek-ai/dsh*` are checked against the exact
  runtime version. Livery declares no DSH peers (zero runtime dependencies) and only
  `engines.dsh: "0.2.0-rc.2"`; the adapter hash check supplies the real gate.

## 4. First-frame injection

`ctx.on('webserver/index-inject', table => …)` is the only pre-paint hook. Ordering
fact: injected head rows splice immediately after `<head>`, therefore **before** the
shell stylesheets and before ui-theme's client-owned token sheet. Consequences:

- first-frame rules are scoped to `body[data-dsh-livery="<id>"]` (specificity 0,1,1+)
  instead of bare `:root`/`body` (which would lose the cascade tie);
- the active livery's token pair, font bindings and layout rules all ride the same
  injected `<style id="dsh-livery-boot" data-plugin="dsh-livery">` element;
- a body-placement script sets `body[data-dsh-livery]` + `data-dsh-livery-hash` before
  the app scripts run;
- the client adopts the same element when `hashCss(renderStyleText(...))` equals the
  injected hash (zero CSS-text writes), otherwise replaces it in one synchronous batch.

## 5. Capability table

| Capability | Available | Provenance | Consequence |
|---|---|---|---|
| `theme-css` | yes | documented design tokens | full light/dark alias + specific + static bridge |
| `host-font-family` | yes | documented `--dsw-font-family` + markdown ladder | zh/en UI and content font stacks apply at host level |
| `surface-material` | yes | documented alias surface/elevation/shadow tokens | solid/soft/glass surface recipes |
| `host-density-tokens` | **no** | absent | density degrades to host |
| `host-transcript-width` | **no** | absent | conversationWidth degrades to host |
| `host-message-flow` | **no** | absent | messageFlow degrades to stock |
| `reduced-transparency` | yes | CSS media | glass → opaque under the media query |
| `forced-colors` | yes | CSS media | author surfaces yield to system colors |
| `reduced-motion` | yes | CSS media | no layout recipe depends on motion |

Real numbers: 403 `--dsw-*` declarations, 177 of them consumed by shipped packages,
extracted from `@deepseek-ai/dsh-client-ui-theme/lib/client.js` token sheets. The
documented public dark switch is `body[data-ds-dark-theme]`; the theme presenter also
writes `html[data-ds-theme-source]` and inline token overrides on `body` when a
third-party theme is active (documented last-writer precedence — see §7).

## 6. Decisions taken

1. **Layout host capability gate: not met by the host.** DSH `0.2.0-rc.2` exposes no
   documented document-level spacing / transcript-width / message-flow hook; the
   conversation width is a host-owned user-dragged preference published on
   component-local custom properties, and flow gaps are declared on internal
   containers. Per IMPLEMENTATION_PLAN.md §5/§10.1/§21 this blocks the "at least one
   host-level layout capability" MVP gate. Livery therefore:
   - keeps colors, typography and surface material as first-class capabilities,
   - ships density/conversationWidth/messageFlow recipes in the schema with capability
     gates that resolve to `host`/`stock` on this host,
   - reports the gap in Settings → Livery → Self-check and in the host capability
     proposal below.
   No Livery-owned UI is used to simulate a host-level layout capability.
2. **Wallpaper layer: removed from schemaVersion 1.** The Phase 0 requirement is a
   verified stacking-context mount point that keeps menus/dialogs/inputs/code blocks
   opaque and never occludes host controls. Without a host-provided page-surface
   transparency contract, the fixed-backdrop plan depends on opaque internal
   containers and would require unverified internal selectors. Per
   IMPLEMENTATION_PLAN.md §7/§10.3/§21 the field, UI and matrix entries are removed
   rather than shipped half-verified.
3. **Desktop/Electron first paint remains unverified.** The Web carrier emits
   `webserver/index-inject`; Electron loads the dist over `file://` and was not part of
   this environment's certification. No desktop support is claimed in the matrix.
4. **Third-party theme plugins take precedence by design.** When a third-party theme is
   active, the host presenter writes inline token overrides on `body`; Livery does not
   fight inline styles with `!important`. This is a documented B-tier limitation shown
   in self-check ("another theme is active").

## 7. Host capability proposal (for DSH `0.2.1`+)

To satisfy the layout gate with documented contracts rather than internal CSS:

- a document-level spacing/control token set (`--dsh-density-*` or an equivalent), or a
  typed `ctx.layout` capability declaring a public transcript-width node;
- a public message-flow spacing token for the transcript container;
- a documented page-surface transparency token for wallpaper/ambient surfaces;
- a stable public hook for the active color scheme (the existing
  `body[data-ds-dark-theme]` is sufficient and is what Livery uses).

Until then the MVP layout gate stays open and no layout claim is made outside the
capability table above.
