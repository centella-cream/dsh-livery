# Plugin detail surface and update boundary

Status: **current design note, target `0.2.2`**. Baseline: published
`dsh-livery@0.2.1`. The client implementation is present in the working tree, but
0.2.2 has **no acceptance evidence yet** and is not published. Implementation plan
and acceptance sequencing live in [`0.2.2-plan.md`](0.2.2-plan.md) §5. The
unscheduled DSH Host preflight proposal this note used to be bundled with is not
part of the package; it lives in the repository at
`docs/archive/host-update-preflight-proposal.md`.

## Decision

Livery contributes to the existing DSH plugin detail page through the three
client slots the plugin-manager client declares. Slot declarations and page
composition were inspected on the shipped 0.2.1-rc.5 and 0.2.2-rc.5
plugin-manager packages; the per-host declaration proof in
`contracts/dsh/client-slot-declarations.json` covers **6 of the 8 declared
hosts**. `0.2.1-rc.2` and `0.2.1-rc.3` are explicit gaps in that proof (the
plugin-manager package metadata was not available in the local host tree).
`0.2.1-rc.2` (Web) is still covered by the runtime detail check; `0.2.1-rc.3`
(Desktop) has no runtime detail check yet, so it remains a documented
per-scope limitation until the Desktop probe gains the same check. A host that
genuinely lacks a slot or fails a runtime check gets a documented
detail-surface limitation (the rest of Livery is unaffected), not a silent
claim and not a release blocker — and it can never be reported as a pass.

The contributed surfaces are:

- `plugins.detail.actions` — real, observable actions;
- `plugins.detail.badge` — a small observable fact;
- `plugins.detail.section` — an observable-facts section.

Their placement within the page is described under “Slot facts” as observed on the
two inspected packages, not as a cross-host guarantee.

The Host owns installation, update policy, HMR and restart. Livery shows facts
and truthful boundary copy; it does not own or duplicate the update control.

## README localization

The plugin detail document is host-owned. DSH selects a package's detail document
from `locale/<language>.json` `meta.detail`, then falls back to the package
README. Livery ships `locale/zh.json` with `meta.detail: "README.zh.md"`;
`README.md` remains the default/fallback. Renaming the Chinese README alone is
not enough, and no license term changes: these are ordinary documentation files.

## Slot facts (inspected on DSH 0.2.1-rc.5 and 0.2.2-rc.5 packages)

- All three keys exist in both inspected plugin-manager client packages. The
  0.2.1 and 0.2.2 sets are identical for these slots. In the inspected
  0.2.2-rc.5 package the plugin-manager client also adds a Versions UI/API and a
  `plugins.tab` update field; Livery consumes neither, and this note does not
  assert the Versions surface for hosts whose package was inspected only for slot
  declarations.
- Entries render for **every** detail subject and must return `null` for subjects
  they do not own. This render behaviour was read from the two inspected client
  packages; the per-host proof records only the declaration, so the other hosts
  are confirmed only by the runtime acceptance check.
- Placement is taken from the two inspected packages: the section is a list slot
  rendered after the page's own content (on a bundle page: after the
  source/rows), the badge sits after the host's version/experimental/problem
  tags, and actions render before the host's switch/uninstall. Treat this as
  observed on those two packages, not as a placement guarantee on the other
  hosts; the runtime check proves that the contributions render, not their exact
  order.
- Registration goes through `ctx.slots.inject(key, () => ctx.slots.register(…))`.
  `inject` fires when the slot's declaring owner is live; if the plugin-manager
  page is not loaded (e.g. `pluginManager/listBundles` access unavailable), the
  callback never runs and Livery renders nothing. Registering into an undeclared
  slot throws, so registration must stay inside the `inject` callback.
- `plugins.bundle.config` is the bundle's configuration body (a registrant
  replaces it and owns the config UI), and `plugins.item` is occupied by official
  settings pages. Livery uses neither.
- The subject shape is `{kind: 'bundle', pkg}` on a bundle page. Livery filters on
  `subject.kind === 'bundle' && subject.pkg.name === 'dsh-livery'`.

## Wiring (repository files)

| File | Change |
| --- | --- |
| `src/client/platform.ts` | Add the three `inject` literal keys, a `LiveryDetailRegistration` register overload, and structural `PluginDetailProps`/`PluginsSubject` types (vendored; no runtime dependency on the host package). |
| `src/client/detail.tsx` | New detail components and per-slot `inject` + `register`; disposer cleanup; subject filter. |
| `src/client/index.tsx` | Import/install the detail registrations in the client `apply()` entry and dispose them with the plugin entries; without this import the three slots are never registered. |
| `src/contract/client-slots.ts` | Append the three consumed slots (`scope: 'root'`, `kind: 'list'`, `ownerProps: ['subject']`); `clientSlotHash()` changes. |
| `package.json` | Add `@deepseek-ai/dsh-client-ui-plugin-manager` to `dsh.client.inject` (module arrival ordering); keep `dsh.client.external: []`. |
| `contracts/dsh/client-slot-declarations.json` | New generated per-host proof: plugin-manager package version/sha256 and declared keys/kind/scope/ownerProps for each host tree inspected; a missing tree is recorded as an explicit gap. |
| `docs/verification.md`, `docs/README.md` | Record the slot-consumption boundary and index this note. |

The consumed-slot list changes `clientSlotHash()`; expected adapter/contract
diff is metadata only (the list is not part of adapter identity and
`catalog-profile-overrides.json` is empty). Verify with `adapter:generate` /
`contract:regenerate`; if any frozen contract or generated adapter bytes change,
treat it as an adapter change. Either way the client bundle and all 13 evidence
files change and must be re-accepted.

## Content

The section is a labelled `<section>` with an internal tab strip: **详情** shows
the full facts `<dl>`, and **热更新** shows the update-critical subset (client
build, handshake, installed package, host, catalog) plus the single boundary
statement. A top-level **热更新** action in the actions slot scrolls to and
selects that tab. This is deliberately an in-section tab: the inspected host
documentation says `plugins.tab` entries are **hidden on a bundle's page**, so
the bundle detail page cannot receive a real page-level tab without replacing
the host surface (which Livery does not do). The README remains host-owned.

Values come from the runtime
snapshot, the wallpaper controller snapshot and the subject (the runtime snapshot
does not carry wallpaper state):

- Livery client build version and installed package version (`subject.pkg.version`
  when present);
- boot handshake state (`valid | stale | absent | mismatch`) and its reason;
- host version, adapter id, short contract hash, catalog profile;
- catalog phase and the applied CSS hash from `body[data-dsh-livery-hash]`;
- active style id and state (confirmed/effective/invalid) and active wallpaper
  kind/name (from `getWallpaperController()?.getSnapshot().selection`);
- the update-boundary statement below.

The badge shows only an observable fact, e.g. `Livery 0.2.2`. No “Hot update” or
“Restart required” badge is derived from a Host plan that does not exist.

## Actions

- **Open Livery** — call the public `ctx.layout.selectPanel('livery')`, rendered
  only when Livery's `main` panel registration is present on this host; the call
  throws for an unregistered key.
- **热更新** — scroll to and select the Livery detail's hot-update tab. There is
  no copy-diagnostics action in the plugin detail surface; diagnostics remain in
  the Livery self-check panel.
- No update button, no disabled duplicate, no interception of the Host install
  control. The Host's own control stays the only update path.

## Update boundary copy

Copy is selected by handshake state; exactly one message is shown at a time,
never the whole table:

| State | Copy |
| --- | --- |
| `valid` / no update in flight | “DSH's plugin manager installs and updates Livery. If an update is installed, reload this page so the browser loads the new Livery client.” |
| `stale` (hot client replacement succeeded) | “Updated without a page reload; the startup frame came from the previous build.” |
| `stale` + catalog unavailable (degraded) | “The Livery client updated, but its catalog is unavailable; Retry or reload this page.” |
| `mismatch` / `reloadRequired` | “Reload required: this page still runs the previous Livery startup frame.” |
| `absent` (host gate closed) | “Livery is not active on this host; the plugin manager still owns installation and updates.” |

| Layer | Truthful statement |
| --- | --- |
| Livery client code | Web: may hot-replace after a bundle update; a page reload is always a safe completion step. Desktop: reload the renderer/window after an update. |
| Livery Host module | Host HMR may replace it; the Host reports the actual result. |
| Livery catalog/theme tokens | A page reload re-reads the boot rows; a Host build/token change may require a restart. |
| DSH core / unmanaged module | Restart required. |
| Package directory moved | Restart required. |

The hot-update claim is Web-profile only. DSH client HMR is not the Electron
update path; desktop copy must not promise a hot client swap.

## Accessibility and styling

- Heading + `<dl>` semantics; real buttons with visible focus; live region for
  copy success/failure.
- Token-only styling: no host/hashed selectors, no `!important`, no remote
  assets; stock/degraded fallbacks when the catalog is unavailable; the section
  must stay legible over Host floating surfaces.
- zh/en keys for every field, state and action; parity enforced by
  `tests/client/i18n.test.ts`.

## Tests

- Registration happens only through `inject`; absent plugin-manager page renders
  nothing and does not throw.
- Section/badge/actions return null for row/item subjects and for other bundles.
- No `plugins.bundle.config` or `plugins.item` registration.
- Detail section in stock/degraded state renders token fallbacks and the neutral
  boundary copy.
- `stale` shows the hot-reload note when the catalog is ready; `stale` +
  degraded shows the catalog-unavailable note; `mismatch` shows reload-required.
- Open Livery hidden when the main panel is not registered. The detail surface
  does not add a copy-diagnostics action.
- Acceptance: `plugin.detail-section-renders`, `plugin.detail-subject-filter`,
  `plugin.detail-no-config-slot`, plus the
  visual matrix (1440/1024/767/390, light/dark, keyboard focus, forced-colors,
  reduced-transparency) on Web and Desktop fresh installs.
- Coverage limits: the per-host declaration proof covers 6 of the 8 declared
  hosts — `0.2.1-rc.2` and `0.2.1-rc.3` are recorded as explicit `missingHosts`
  gaps. Those scopes rest on the runtime `plugin.detail-section-renders` check; if
  it fails there, the report/evidence records a documented detail-surface
  limitation (skipped with reason) and never a pass. No 0.2.2 acceptance has run
  yet; the slot surface is unproven until all scopes are accepted on one final
  tarball.
