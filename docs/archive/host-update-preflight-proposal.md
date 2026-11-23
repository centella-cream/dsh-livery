# Host update preflight proposal (unscheduled)

Status: **unscheduled design proposal for the DSH Host plugin manager**. No DSH
release implements the API described here; `grep planBundleUpdate` across the
0.2.1/0.2.2 host packages returns nothing. This document is **not** part of
Livery 0.2.2, is not shipped in the npm package (`docs/archive/` is excluded from
`package.json` `files`), and must not be cited as current behaviour. The current
Livery design is [`docs/design/plugin-detail-surface.md`](../design/plugin-detail-surface.md).

The proposal is retained for a future Host-side change: deciding **before** a
confirmed update whether it can be hot-live or needs a DSH restart, instead of
reporting `restart-required` only after installation.

## Decision summary

- The **Host plugin manager** owns the hot-vs-restart decision through a new
  `planBundleUpdate` preflight. Livery cannot implement this by itself: the Host
  owns the Update button, the HMR graph, installation and `restartReason`.
- `hot` keeps the process running; `restart` shows a modal before any package
  mutation; `unknown` runs the normal update and reports the actual result.
- Livery's contribution is limited to its own `plugins.detail.section`, badge,
  actions and documentation. It must not add a second installer, use
  `plugins.bundle.config` as a neutral summary, or claim that Host catalog/token
  changes hot-reload.
- Browser-client replacement is separate from Host HMR. A hot Host update may
  still require a page reload; the UI must say so explicitly.

## Context

DSH already distinguishes two update outcomes:

- `application: 'applied'` — the update was loaded through HMR and is live.
- `application: 'restart-required'` — the files are installed but the running
  host keeps the old generation. `restartReason` is one of `no-hmr`,
  `package-moved`, `host-module`, `unmanaged-plugin`, or `module-comparison`.

The 0.2.2 plugin manager's Versions flow asks for confirmation, runs the update,
and only then reports `updateRestart` when the Host answered
`restart-required`. That is correct but too late: the user has already accepted
an operation that cannot take effect until DSH restarts. The 0.2.1 line has no
registry Versions list/API at all, so a Host preflight only makes sense where a
Versions/update flow exists.

## Goals

1. Decide before a confirmed update whether it is expected to be hot-live or to
   need a restart.
2. If it is hot-live, let the Update click apply it directly, with progress and
   a success confirmation; no restart prompt.
3. If it needs a restart, show a modal **before** installation that explains the
   reason and offers Cancel / Update and restart later.
4. Keep the final Host result authoritative: if a preflight guess was wrong, show
   the actual outcome instead of hiding it.
5. Keep the policy in the Host plugin manager, not in each bundle. Every bundle
   gets the same behaviour; Livery is only a consumer.

## Non-goals

- Automatically restarting DSH, killing sessions or discarding unsaved state.
- Installing or executing a target package just to probe it. Fetching and
  extracting a registry tarball into a temporary directory is allowed for a plan
  when the registry already exposes it; the code is never imported or run.
- Letting a plugin declare “I am hot” in package metadata as a trust bypass.
- Changing the existing HMR implementation or the meaning of `restartReason`.
- Promising that a hot Host update also updates an already-open browser client;
  browser module replacement is a separate mechanism and may still need a page
  reload.
- Covering `file:`/tarball, `link:`, git or plain-path installs as registry
  updates: they have no Versions list, no `update` target and no offered version.
  Their documented path stays uninstall/reinstall through **Add plugin**.

## Decision model

Add a Host preflight method. A target is identified by its install spec/options
(a name has no unambiguous registry target when the profile was installed from a
tarball or git spec, and a git update needs its spec pinned to a commit):

```ts
interface UpdateTarget {
  readonly version: string
  readonly registry?: string
  readonly spec?: string
}

planBundleUpdate(name: string, target: UpdateTarget): Promise<UpdatePlan>

type UpdatePlan =
  | { kind: 'hot'; name: string; version: string; from: string }
  | { kind: 'restart'; name: string; version: string; from: string; reason: RestartReason; detail?: string }
  | { kind: 'unknown'; name: string; version: string; from: string; why: string }
```

`planBundleUpdate` performs only the existing version/spec/compatibility checks.
It must not remove, install or import the target. To classify host/client files
it may fetch and extract the target tarball into a temporary directory, inspect
`package.json`/`files`/bundle patch metadata and clean up before returning; it
must never execute package scripts, follow archive traversal/symlink escapes,
accept a tarball without an integrity/size check, or leave temporary files on
failure. It returns `unknown` when the target cannot be inspected, the registry
is offline, or the Host cannot prove the classification without installing.

Classification order:

| Condition | Plan |
| --- | --- |
| Update target fails `engines.dsh` / peer / bundle checks | not a plan; existing check error |
| No `hmr` service in the running composition | `restart`, reason `no-hmr` |
| The package itself carries the plugin manager or another unmanaged host plugin whose replacement is not in the HMR graph | `restart`, reason `unmanaged-plugin` |
| The target is known to resolve to another directory / package mapping changes | `restart`, reason `package-moved` |
| The Host can prove every changed module is already in the HMR replacement graph (for example a client-only bundle, or Livery's Loader-managed host plugin) | `hot` |
| The target changes host modules outside the replaceable graph | `restart`, reason `host-module` |
| The target cannot be inspected, the registry is offline, or HMR comparison cannot prove the above (unreadable files, links, packed worker loader) | `unknown`, reason `module-comparison` |
| The profile install is not a registry install (tarball/path/link/git without a version target) | `unknown`, why “no update target; use uninstall + install” |

The final answer remains `updateBundle`'s result. A `hot` plan that ends
`restart-required` must show the restart modal with the actual reason; a
`restart` plan that unexpectedly ends `applied` shows success and no restart
prompt. Never suppress either.

## UX

### Hot plan

Clicking Update on a package with a `hot` plan:

1. Keeps the existing explicit Update confirmation if the current page shows
   one; it adds no restart-specific dialog. The click is the user's consent.
2. Shows the existing update progress (checking, removing, installing,
   restoring).
3. On `applied`, shows the normal success state and closes after acknowledgement.
4. On failure, uses the existing restore/error states.

The Host must keep the operation cancellable where it already is. A hot Host
result does not promise that an already-open browser client has loaded the new
client bundle; if client code changed, the UI must show the client reload state
separately from a DSH process restart.

### Restart plan

Clicking Update opens a modal **before any package mutation**. For a restart plan
this modal **replaces** the existing plain confirmation; it is not stacked on top
of it (one consent step, not two).

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
- After a successful `restart-required` outcome, keep a visible “update installed;
  restart to apply” notice on the plugin detail/list until the process restarts.
  Closing the outcome dialog is not evidence that the update is live.
- The modal needs a focus trap, Escape to cancel, localized reason text and a
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

## Livery-specific part

Livery's own contribution is scheduled and implementable without this proposal:
it consumes `plugins.detail.section`/`badge`/`actions` on the Host's existing
detail page and shows observable facts plus the neutral update-boundary copy.
See [`plugin-detail-surface.md`](../design/plugin-detail-surface.md). Livery does
not use `plugins.bundle.config` for a neutral summary, does not register
`plugins.item`, and does not add an update control.

Without the Host preflight API, Livery cannot satisfy the requested
“click-through with no restart surprise” behaviour for its own updates. A
Livery-only fallback can only show a note and a link to the Host update dialog; it
cannot decide before the click, cannot suppress the Host dialog, and must not
inspect or replace the running package itself. That fallback is explicitly not
the feature described in this document.

## Observed profile behaviour (exploratory, not acceptance evidence)

The following was observed on DSH `0.2.1-rc.5` / `0.2.2-rc.5` with the author's
Web profile and Desktop app:

| Profile | dsh-context | Detail body | Description styling |
| --- | --- | --- | --- |
| Web | `0.73.0` | custom `plugins.bundle.config` form; no feature image | Host `detailDesc`, label-secondary |
| Desktop | `0.85.1` | custom `plugins.bundle.config` form; localized README detail image | Host `detailDesc`, same font/color after class-hash change |

Both profiles use the same Host detail page; the Web/Desktop difference is the
installed dsh-context version. The host class hash differs between builds, so
tests and selectors must use stable semantics, never the hash. These
observations are not reproducible acceptance evidence: they were not captured on
one isolated `DSH_HOME` with one exact artifact. Re-measure with the normal
acceptance harness before citing them in a release claim.

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
- A target that cannot be fetched or inspected is `unknown`, not `hot`; offline
  and registry failures never get a misleading no-restart message.
- If the package is already installed with the same version, keep the existing
  no-op/`already-installed` behaviour; no hot/restart dialog.
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
- Tarball/path/link install → `unknown` with “no update target”.
- Target check failure, install failure, restore failure, cancel.
- Plan/update race: target version disappears or changes; error is surfaced.

Client:

- Hot plan skips the extra modal and shows progress directly.
- Restart plan shows the modal before any mutation; Cancel leaves the profile
  unchanged; confirm shows restart outcome; no stacked confirmation.
- Unknown plan runs and reports actual result.
- zh/en reason copy; keyboard focus trap; Escape; screen reader name.
- 390 px width and long package names do not overflow.

## Rollout

1. Host: add `planBundleUpdate` and the five reason mappings; keep
   `updateBundle` behaviour unchanged.
2. Client plugin manager: replace the current confirm-only path with plan-driven
   UI; keep the existing outcome dialog as the final authority.
3. Livery: consumes the existing detail slots independently, with an explicit
   note that the Host owns update policy.
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
- Should an update over a tarball/path install be offered as a manual
  “install new file” target, or remain an uninstall/reinstall flow? The default
  is the latter until the Host can express a version transition for file installs.
