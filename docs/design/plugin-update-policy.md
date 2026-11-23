# Plugin update policy: hot reload vs restart

Target: DSH 0.3 plugin manager and HMR. Status: design proposal; no host API
exists for the pre-update decision described here.

## Context

DSH already distinguishes two update outcomes:

- `application: 'applied'` — the update was loaded through HMR and is live.
- `application: 'restart-required'` — the files are installed but the running
  host keeps the old generation. `restartReason` is one of `no-hmr`,
  `package-moved`, `host-module`, `unmanaged-plugin`, or `module-comparison`.

The plugin manager's current update dialog asks for confirmation, runs the
update, and only then reports `updateRestart` when the Host answered
`restart-required`. That is correct but too late: the user has already accepted
an operation that cannot take effect until DSH restarts.

`dsh-context` demonstrates the adjacent capability: its plugin detail body is a
Client Slot (`plugins.bundle.config`), so its custom React UI can be replaced by
HMR. Its description is not custom: the Host renders `meta.description` (or a
`plugins.item` summary) with `--dsw-alias-label-secondary` and the active
`--dsw-font-family`. Livery therefore styles that description indirectly through
theme tokens, not through a per-plugin detail page.

## Goals

1. Decide before a confirmed update whether it is expected to be hot-live or to
   need a restart.
2. If it is hot-live, let the user's Update click apply it directly, with progress
   and a success confirmation; no restart prompt.
3. If it needs a restart, show a modal **before** installation that explains the
   reason and offers Cancel / Update and restart later.
4. Keep the final Host result authoritative: if a preflight guess was wrong, show
   the actual outcome instead of hiding it.
5. Keep the policy in the Host plugin manager, not in each bundle. Every bundle
   gets the same behavior; Livery is only a consumer.

## Non-goals

- Automatically restarting DSH, killing sessions, or discarding unsaved state.
- Installing or executing a target package just to probe it.
- Letting a plugin declare "I am hot" in package metadata as a trust bypass.
  Package metadata can describe a target, but the Host owns the decision.
- Changing the existing HMR implementation or the meaning of `restartReason`.

## Decision model

Add a Host preflight method:

```ts
planBundleUpdate(name: string, version: string): Promise<UpdatePlan>

type UpdatePlan =
  | { kind: 'hot'; name: string; version: string; from: string }
  | { kind: 'restart'; name: string; version: string; from: string; reason: RestartReason; detail?: string }
  | { kind: 'unknown'; name: string; version: string; from: string; why: string }
```

`planBundleUpdate` performs only the existing version/spec/compatibility checks.
It must not remove, install, or import the target. It returns `unknown` when the
Host cannot prove the classification without installing.

Classification order:

| Condition | Plan |
| --- | --- |
| Update target fails `engines.dsh` / peer / bundle checks | not a plan; existing check error |
| No `hmr` service in the running composition | `restart`, reason `no-hmr` |
| The package itself carries the plugin manager or another unmanaged host plugin whose replacement is not in the HMR graph | `restart`, reason `unmanaged-plugin` |
| The target resolves to another directory / package mapping changes | `restart`, reason `package-moved` |
| Target changes only modules already inside the HMR replacement graph (including Livery's client and host plugin modules) | `hot` |
| Target changes host modules outside the replaceable graph | `restart`, reason `host-module` |
| HMR comparison cannot prove the above (unreadable files, links, packed worker loader) | `unknown`, reason `module-comparison` |

The final answer remains `updateBundle`'s result. A `hot` plan that ends
`restart-required` must show the restart modal with the actual reason; a
`restart` plan that unexpectedly ends `applied` shows success and no restart
prompt. Never suppress either.

## UX

### Hot plan

Clicking Update on a package with a `hot` plan:

1. Opens no additional confirmation dialog.
2. Shows the existing update progress (checking, removing, installing, restoring).
3. On `applied`, shows the normal success state and closes after acknowledgement.
4. On failure, uses the existing restore/error states.

The Host must keep the operation cancellable where it already is.

### Restart plan

Clicking Update opens a modal before any package mutation:

```text
This update requires a DSH restart
<reason sentence>
The package will be installed now; the running DSH keeps the old version until
you restart.
[Cancel] [Update and restart later]
```

- `Cancel` leaves the profile and lockfile unchanged.
- `Update and restart later` runs the normal update, then shows the existing
  `updateRestart` outcome with restart instructions.
- If the Host knows how to offer a restart action, it may offer it as a separate
  explicit action after a successful install; it must not restart automatically.
- The modal needs a focus trap, Escape to cancel, localized reason text, and a
  stable accessible name. It must not use a host hashed class.

Reason copy:

- `no-hmr`: “This DSH build has no HMR; updates apply after restart.”
- `package-moved`: “The package moved to another directory; the running process
  still holds the old mapping.”
- `host-module`: “This update changes a host module that can only load at startup.”
- `unmanaged-plugin`: “This package includes a plugin the running process cannot
  replace.”
- `module-comparison`: “The Host cannot compare loaded modules reliably; choose
  restart or continue with the result.”

### Unknown plan

Run the update as today, then show either success or the restart modal with the
actual `restartReason`. The UI should not claim “no restart needed” before the
Host answers.

## Livery-specific detail page

Livery can adopt the same surface without owning the decision:

- Register `plugins.bundle.config` keyed `dsh-livery` to show a live summary:
  current host/adapter, catalog profile, active style, runtime status, and a
  short “Update policy” section.
- Optionally register `plugins.detail.badge` to show `Hot update` or `Restart
  required` from the Host plan.
- Use `plugins.detail.section` for diagnostics and a manual “Check for updates”
  link that opens the Host update flow.
- Do not register `plugins.item`: that slot is occupied by official settings
  pages and is the description summary path, not a bundle configuration body.
- The Client Slot is HMR-replaceable. Host catalog/token changes still require a
  Host restart; a custom detail page must not claim otherwise.

This gives Livery a dsh-context-style detail page without duplicating the Host
update button or inventing a second installer.

## Interfaces and ownership

| Piece | Owner |
| --- | --- |
| `planBundleUpdate`, `updateBundle`, `restartReason` | Host plugin manager |
| HMR availability and module comparison | Host HMR |
| Update dialog, reason copy, focus management | Client plugin manager |
| Livery detail summary and policy badge | Livery client slot |
| Restart execution | User / DSH launcher; never automatic |

`planBundleUpdate` must be usable by the Host update button and by any future
detail action. A plugin cannot call a private preflight to bypass policy; only
the public Host method is allowed.

## Consistency and failure rules

- The plan and the update are separated by a version/spec recheck; the target is
  revalidated at execution. A changed registry response is reported as the
  existing check error.
- A plan never changes the profile. It may query the registry plan already used
  by `listVersions`, but must not write the lockfile.
- If HMR is enabled but the update would replace the `hmr` entry itself, the plan
  is `unknown` and the actual result decides.
- If the package is already installed with the same version, keep the existing
  no-op/`already-installed` behavior; no hot/restart dialog.
- If the update is `overridden`, do not show a restart prompt; report the
  override as today.
- A restart plan is not permission to skip a failed install; failures and
  rollback keep their current UX.

## Test matrix

Host/plan:

- HMR absent → `restart/no-hmr`; no package mutation after Cancel.
- HMR present, client-only target → `hot`; update result `applied`.
- HMR present, host-module target → `restart/host-module`; no auto restart.
- Unmanaged plugin / plugin-manager-carrying bundle → `restart/unmanaged-plugin`.
- Package moved → `restart/package-moved`.
- Unreadable files / packed worker loader → `unknown`; actual result authoritative.
- Target check failure, install failure, restore failure, cancel.
- Plan/update race: target version disappears or changes; error is surfaced.

Client:

- Hot plan skips the extra modal and shows progress directly.
- Restart plan shows the modal before any mutation; Cancel leaves the profile
  unchanged; confirm shows restart outcome.
- Unknown plan runs and reports actual result.
- zh/en reason copy; keyboard focus trap; Escape; screen reader name.
- 390 px width and long package names do not overflow.

Livery detail:

- `plugins.bundle.config` renders the summary for `dsh-livery` only.
- Client HMR updates the summary; host token/catalog changes still show the
  restart boundary.
- No `plugins.item` registration, no host hashed selectors.

## Rollout

1. Host: add `planBundleUpdate` and the five reason mappings; keep
   `updateBundle` behavior unchanged.
2. Client plugin manager: replace the current confirm-only path with plan-driven
   UI; keep the existing outcome dialog as the final authority.
3. Livery: add its `plugins.bundle.config` detail summary and optional badge,
   with an explicit note that the Host owns update policy.
4. Add the above tests and re-run the full acceptance matrix before release.

## Open questions

- Can the Host reliably classify Livery's host plugin module as inside the HMR
  graph across Web and Desktop? If not, Livery updates should be `unknown` until
  the module comparison proves `hot`.
- Should the restart modal offer a “Restart DSH” button when the launcher exposes
  a restart command, or only instructions? The default is instructions only.
- Should hot updates still show a short confirmation when the package is marked
  security-sensitive? This design follows the existing explicit Update click; no
  second confirmation for `hot`.
