# Multi-version policy

**Status (0.1.3):** current policy. This page replaces the earlier
compatibility-range/compat-mode proposal, which was removed and is archived
under [`docs/archive/`](https://github.com/centella-cream/dsh-livery/tree/main/docs/archive).

## 1. Exact versions, no compatibility mode

The plugin ships exactly one adapter per supported DSH build. `engines.dsh` is an
exact allowlist derived from `contracts/dsh/support-matrix.json`:

```text
0.2.1-rc.2 || 0.2.1-rc.3 || 0.2.1-rc.4
```

There is no `^`, `~`, range or synthetic compat adapter. A different host
version is rejected at install time; at runtime a non-matching boot payload
fails closed to stock. Compatibility is proven by a frozen contract snapshot and
real host acceptance, not inferred from semver.

## 2. Stable vs next-channel preview

| DSH version | Source | Claim |
|---|---|---|
| `0.2.1-rc.2` | npm `latest` + official GitHub release | Stable certified (Web) |
| `0.2.1-rc.3` | GitHub-tagged Desktop app | Stable certified (Desktop/macOS renderer) |
| `0.2.1-rc.4` | npm `next` package + GitHub prerelease tag (commit 504a01a…) | Next-channel preview (Web) |

Matrix entries also carry the exact certification fields:

- `claimTier` — `stable` or `preview`.
- `distributionChannel` — `latest`, `next` or `desktop-app`.
- `certifiedBrowserVersions` — full versions (for example `156.0.8078.48`),
  not an ambiguous minimum.
- `certifiedRuntimeVersions` — exact Node versions; Electron/Chromium details stay
  in the Desktop report and notes.
- `upstream` — `githubTag` (nullable) and `npmVersion`.

A `stable` claim is invalid without an upstream GitHub tag and must not use the
`next` channel. A tagless npm `next` build is `preview`. The adapter's
`verifiedBrowsers` is generated from these exact versions; acceptance fails if
the observed Chrome version is not in `certifiedBrowserVersions`.

Stable support requires a **non-prerelease** official GitHub release and the matching
signed npm package. A version that exists only on npm's `next` channel cannot be
called stable; it may be withdrawn or changed before promotion. Preview support
is still real acceptance work: it must bind the exact signed npm tarball, extract
its contract, and pass real host acceptance. If upstream later tags or withdraws
the build, re-certify or remove the preview entry and say so in the release notes.

## 3. Adding a new DSH release

Do not remove or narrow an existing version while adding the newest one. The
minimum sequence is:

1. **Confirm provenance.** Check the official GitHub tags/releases and npm
   `dist-tags`. Record whether the release is stable (GitHub-tagged) or
   next-channel preview. Do not infer official status from a version string
   alone.
2. **Freeze the contract.** Extract the host tree and run
   `pnpm contract:snapshot -- --dsh-install <tree> --version <version>`; for a
   Desktop app use `scripts/prepare-desktop-contract.mjs` first. Review the
   contract diff before accepting it.
3. **Add the adapter and matrix entry.** Generate `contracts/dsh/<version>/`,
   add the exact matrix entry with its in-scope profiles, update
   `engines.dsh` and `dsh.compatibility.dshReleases`, then run
   `pnpm adapter:generate`, `pnpm contract:regenerate` and
   `pnpm liveries:compile`.
4. **Prove catalog identity.** Check whether the new adapter shares a catalog
   profile with existing adapters. A new render-affecting token contract needs
   its own profile, previews and tests; a matching contract should stay in the
   shared profile.
5. **Run all declared scopes.** The release gate must re-run every previously
   declared host plus the new one (Web rc.2, rc.4; Desktop rc.3 in 0.1.3), using
   the same exact candidate tarball. Preserve the old evidence rather than
   replacing it with an unbound report.
6. **Update release surfaces.** README/README.zh-CN, CHANGELOG, docs index,
   support table, workflow filenames/evidence lists, release scripts and evidence
   paths. Package `files` must include every shipped contract directory and no
   removed/unsupported one.
7. **Gate and tag.** Run `pnpm release:check`, all `verify:evidence` entries,
   `prepublish-check` and the real acceptance matrix. Only then tag and publish;
   pushing and publishing require explicit human approval.

## 4. Generated registry and catalog profiles

`contracts/dsh/<version>/contract.json` is the frozen source of truth for the
six adapter hashes and capability facts. `src/generated/contract.ts` is
regenerated from the formal matrix and snapshots; tests assert that it is
byte-reproducible.

Adapters that share the same render-affecting token contract share a
`catalogProfile`. A profile is compiled once; every adapter in the group renders
identical CSS bytes and serves the same preview set. Do not force a new profile
for a version-only metadata change, and do not merge adapters with different
token contracts.

## 5. Forward compatibility, declared precisely

“Forward compatibility” here means **preserving every version already declared
in the matrix while adding a new one**, not silently accepting unknown future
versions. The exact-allowlist policy is intentional: it makes install failures
obvious and keeps the advertised support honest.

When upstream publishes a new DSH version, the correct action is a plugin release
that adds a verified adapter for it, not a range that guesses compatibility. If a
new release is only on npm `next`, ship it as preview compatibility with the
channel caveat; promote it to stable only after the upstream GitHub tag and a
fresh acceptance run.
