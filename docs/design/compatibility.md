# DSH compatibility architecture (0.2.2)

Status: current for the released DSH Livery `0.2.2` artifact. The previous
compatibility model is retained below only as context.

## Why the old model broke

Before 0.1.8 every host build had to be captured as an exact adapter: version
string, contract hash, token contract and catalog profile. A Desktop nightly
update from `0.2.2-rc.1` to `0.2.2-rc.2` therefore rejected the plugin even though
the loader, host and client APIs were identical; only the token/layout contracts
had changed. Shipping a complete catalog for every token contract also made the
host bundle grow by roughly 150 KiB gzip per version.

## Model

1. **Exact certification decides admission.** A host version is admitted only
   when it appears in the formal matrix. In-range uncertified builds fail closed
   before adapter selection; there is no `compatible-preview` runtime path.
2. **Catalog profiles are shared by review.** `contracts/dsh/catalog-profile-overrides.json`
   records reviewed profile reuse. The provider must have identical
   loader/host/client API hashes and layout-compatible slots; token additions are
   safe because every livery token is emitted concretely and unknown tokens inherit
   stock. The compiler skips byte-identity only for explicit shared-profile records.
   HMR never relaxes this: a stale boot payload is accepted only when its
   `catalogProfile` strictly equals the matched adapter's profile.
3. **Evidence stays exact.** Formal evidence and stable/preview claims are bound
   to exact host versions and artifact bytes. Unknown builds emit
   `gate.host-unsupported`, never a compatibility success claim.
4. **Package manager range.** `engines.dsh` is `>=0.2.1-rc.2 <0.3.0` as an
   installability declaration only. `dsh.compatibility.dshReleases` lists the exact
   runtime-certified builds.

## Adding a version

- If API hashes match: add the contract snapshot, share the certified profile via
  an override with a reviewed reason, run full acceptance on the new host, and add
  exact evidence. No new catalog profile is needed.
- If API hashes differ: add a new adapter/profile and follow the full evidence chain.
- Unknown builds are not claimed and do not run: an in-range but uncertified
  build fails closed before adapter selection. Promote a build only with exact
  evidence (and, where profile sharing applies, a reviewed override) before
  listing it as stable or preview.
- Extending the HMR stale allowlist (`STALE_BOOT_VERSIONS`) is also a reviewed
  release change tied to an accepted transition, not a compatibility fallback.

## Verified baseline: 0.2.2 (current)

- The `0.2.2` artifact was accepted on all 13 declared scopes (7 Web + 6 Desktop)
  with isolated `DSH_HOME`, official plugin-manager install of the exact tarball,
  and committed evidence under `contracts/dsh/evidence/0.2.2/`.
- Desktop scopes run the real Electron app; Web scopes run the declared Chrome
  build. Exact counts and the desktop renderer boundary are in
  [`docs/verification.md`](../verification.md).
- One schema-v3 Web update transition from the exact published `0.2.1` tarball to
  the accepted `0.2.2` candidate is bound in the same evidence directory. The
  `0.2.1` evidence is retained but never reused for `0.2.2` bytes.

## Hot update (HMR) — 0.2.2

DSH enables client HMR when the launcher provides `profileContext`; direct
Plugin Manager operations and profile manifest changes recompose running plugins
and replace modules whose files under the profile changed. Livery keeps this path
safe:

- every client contribution is owned by `ctx.effect` and disposed in reverse
  order; the presenter owns a cross-module DOM lease so a replaced copy cannot
  write after its owner is gone;
- style elements are reference-counted/shared across a hot replacement, and a
  stale host boot style is removed by the new confirmed apply;
- the 0.2.2 client accepts a boot payload from one exact previous build as
  `stale`: `STALE_BOOT_VERSIONS = ['0.2.1']`. The check order is payload shape →
  certified `(hostVersion, adapterId, contractHash)` triple → `entryId` → exact
  version allowlist → strict `catalogProfile === adapter.catalogProfile` →
  `accepted`. It is exact string equality only: no semver, prefix or range
  inference, and there is no exception for a profile id that "changed by HMR"
  (that earlier claim was reverted and is not true for 0.2.1);
- a stale payload never adopts its boot CSS. The client re-fetches the catalog
  once, performs exactly one catalog-derived `applyConfirmed`, and re-applies the
  saved wallpaper/config. If the catalog stays unavailable it fails closed to
  `degraded` with boot artifacts removed and `effectiveId: STOCK_ID`; the config
  fallback never uses the stale `skinId`, and `retryCatalog()` may recover without
  a page reload. Anything not exactly allowlisted remains `mismatch`/fail closed;
- the catalog fetch retries across the recomposition window (up to eight bounded
  attempts for a detected hot reload);
- saved skin/wallpaper state is host-backed, so the new instance reapplies it.

**Claim boundary.** DSH client HMR is a Web-profile mechanism (the client-hmr SSE
path is Web-only; Electron does not use it). The 0.2.2 claim is exactly that a
real `0.2.1 → 0.2.2` **Web** client update can be repaired in process, and it
must be evidenced by an update probe that installs the exact published 0.2.1
tarball and updates through the running Host's plugin manager to the exact
candidate. Desktop requires a renderer reload/app restart; no Desktop hot update
is claimed. 0.2.1 itself has no stale path — it fails closed on any
plugin-version difference; the repair exists only in the 0.2.2 client.
