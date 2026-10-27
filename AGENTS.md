# AGENTS.md — DSH Livery engineering rules

This file is binding for every agent working in this repository. It records the
rules and pitfalls that produced the current release process. When a rule and a
ticket disagree, ask the Lead before weakening it.

## 1. Sources of truth

- Support policy: `contracts/dsh/support-matrix.json`
- Exact accepted artifact: `contracts/dsh/evidence/*.json` + committed reports
- Current docs index: `docs/README.md`
- Historical material: `docs/archive/` only (never cite as current)
- Generated adapter registry: `src/generated/contract.ts` (never hand-edit)
- Release mechanics: `.github/workflows/release.yml`, `scripts/release-check.mjs`,
  `scripts/release-evidence.mjs`, `scripts/prepublish-check.mjs`

## 2. DSH version compatibility

### Exact allowlist, no guessing

- `engines.dsh` must equal the exact allowlist derived from the formal matrix.
  Never add a range, wildcard, `^`, `~` or synthetic compatibility mode.
- One adapter per supported host build. Unknown builds are rejected at install
  time and fail closed to stock at runtime.
- Every adapter needs a frozen `contracts/dsh/<version>/` snapshot and a matching
  matrix entry. Do not add a version by editing only `engines.dsh`.

### Stable vs preview claims

- **Stable** requires both an official GitHub tag/release and the matching signed
  npm package. Current stable claims: `0.2.1-rc.2` (Web) and `0.2.1-rc.3`
  (Desktop/macOS).
- A version that exists only on npm's `next` channel is **next-channel preview**,
  never "latest stable". It may be withdrawn or changed before promotion. Verify
  the exact signed npm tarball and real host behavior, then document the preview
  boundary in README, matrix notes, CHANGELOG and release notes.
- `0.2.1-rc.4` is currently preview (npm `next`, no upstream GitHub tag). Do not
  promote it to stable without a GitHub tag and fresh acceptance.

### Adding a new DSH version

Do this in one change set, without dropping an older declared version:

1. Confirm provenance from official GitHub tags/releases and npm dist-tags.
2. Extract the contract (`contract:snapshot`; Desktop uses
   `prepare-desktop-contract.mjs`), review the diff.
3. Add the matrix entry and adapter; update `engines.dsh` and
   `dsh.compatibility.dshReleases`.
4. Run `adapter:generate`, `contract:regenerate`, `liveries:compile`, `build`.
5. Re-run acceptance for **all declared hosts** plus the new one on one exact
   candidate; never infer old-version success from a new-version run.
6. Update README/README.zh-CN, CHANGELOG, docs index, workflow evidence lists,
   package `files`, release scripts and filenames.
7. Run `release:check`, every `verify:evidence`, and `prepublish-check` before
   tagging.

“Forward compatibility” means preserving every already-declared version while
adding a verified adapter for the new one — not silently accepting future
versions. Prefer an explicit install failure over an unverified guess.

## 3. Acceptance must use independent environments

**Never use the developer's real environment as acceptance evidence.**

- Do not use `~/.dsh`, a real user profile, a running Desktop session, a personal
  browser profile, or local installed state as the acceptance target.
- Use a fresh isolated `DSH_HOME` under `.tmp/acceptance/<unique-name>`. The
  harness rejects non-isolated paths on purpose.
- Give every run its own directory and run concurrent suites serially. Parallel
  runs sharing the default DSH_HOME contaminate each other; that failure is a
  harness failure, not a product result.
- Install through the official plugin-manager path, using the **exact built
  tarball** (`--tgz`), never a rebuild and never a registry tag.
- Web runs must boot the declared host version explicitly
  (`--dsh-bin ... --expect-version ...`). Desktop runs must use the real Electron
  app with an isolated app home/user-data dir.
- Record exact sha256/bytes/commit/version/adapter identity in evidence. Reports
  must be sanitized (no absolute home paths, no tokens, no local usernames).
- Any change to the packaged artifact, matrix or evidence inputs invalidates all
  previous evidence; rebuild and reaccept. Evidence must bind the final bytes, not
  an earlier candidate.

## 4. UI behavior and visual verification

- Verify the real rendered UI (screenshots and computed styles) on desktop and
  narrow widths (at least 1440, 1024, 767), light/dark, keyboard focus, and with
  wallpaper effects enabled. A CSS-string assertion alone is not visual evidence.
- Token-only styling: no host component selectors, no hashed class selectors, no
  `!important`, no remote assets or fonts.
- Host floating surfaces stay legible. Frost must not rewrite Modal/Input/Tooltip
  surface tokens; plugin cards use the private card surface token.
- The atmosphere layer must stay below host floating layers (Menu/Tooltip/
  HoverCard, Modal, Toast). It is page tint only; do not claim visible coverage on
  opaque third-party pages. This safe-layering boundary is documented and tested.
- Respect `forced-colors: active` and `prefers-reduced-transparency: reduce`:
  no frost overrides, no translucent private card surface, no card backdrop blur.
- Error states need stable IDs plus `aria-invalid`, `aria-describedby` and
  `aria-errormessage`; custom dropzones need role, tabindex and Enter/Space.
- Selected tabs/swatches need visible state; light thumbnails need a contrast
  treatment. Fix the cause, not only the screenshot.

## 5. Build and release chain

- Build deterministically from a clean commit. Do not embed local runtime
  versions, timestamps, absolute paths or environment details in shipped bytes.
  `.github/workflows/release.yml` pins Node for artifact reproducibility.
- The release workflow must download and publish the exact accepted tarball; it
  must not rebuild between acceptance and publish.
- Verify the exact npm artifact bytes after publish. The npm tarball sha256 must
  equal the accepted candidate sha256.
- Package `files` must match the matrix: include every shipped
  `contracts/dsh/<version>/` and remove unsupported metadata. Runtime code must
  not depend on files omitted from the package.
- A version bump touches all release surfaces:
  `package.json`, `src/core/types.ts`, `src/contract/snapshot.ts`,
  generated files, README/README.zh-CN, CHANGELOG, docs, release workflow/scripts,
  acceptance fallback filenames, support matrix and evidence.
- Run at minimum: `pnpm verify`, `pnpm lint`, `pnpm test:loader-abi`,
  `pnpm adapter:check`, `pnpm gate:support-matrix -- --all`,
  `pnpm gate:release -- --all`, `pnpm audit --prod`,
  `pnpm release:check`, all `verify:evidence` runs and `prepublish-check`.
- Commit final evidence before tagging. Tag locally only when asked; **do not
  push or publish without explicit human approval**. Do not rewrite a published
  tag or npm version.

## 6. Known pitfalls (keep these fixed)

- DSH updates while the plugin pins an exact old version cause install rejection.
  Add the new adapter/contract; never relax the gate as a shortcut.
- A newly published npm version can be blocked by the Desktop plugin manager's
  minimum-release-age/supply-chain window. The documented fallback is
  `npm pack` the exact version, verify its sha256, then install the local `.tgz`
  through the app-bundled CLI and restart the app. Do not disable security
  checks or publish an untested tarball.
- Parallel acceptance runs sharing one `DSH_HOME` produce false failures. Use
  unique isolated homes and run suites serially.
- Matrix/adapter/package metadata changes alter the tarball. Reaccept after them;
  never reuse evidence from an earlier candidate.
- `layer-2` is used by host Modal/Settings surfaces. Keeping it out of frost is
  an accepted boundary; plugin cards retain glass through their private token.
- Do not use the user's `dsh-charter` project as the product subject; it is only a
  third-party rendering example in screenshots and must be linked as such.
- Keep published release docs/CHANGELOG frozen for that version. Post-release
  doc cleanup belongs in a separate docs commit and must not be silently folded
  into the published artifact's evidence.

## 7. Commits and documentation

- Use concise conventional commit messages (`fix:`, `docs:`, `release:`,
  `test:`). If a ticket asks for a one-line commit, make exactly one commit.
- Current docs must describe the current release. Stale design proposals,
  compatibility-mode history and old host contracts live in `docs/archive/` and
  must be marked historical. Update `docs/README.md` and root README links when
  moving docs.
- Never commit secrets, absolute local paths in evidence/reports, browser
  caches, or generated acceptance artifacts.
