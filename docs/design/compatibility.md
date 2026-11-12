# DSH compatibility architecture (0.1.8)

Status: current for DSH Livery `0.1.8`.

## Why the old model broke

Before 0.1.8 every host build had to be captured as an exact adapter: version
string, contract hash, token contract and catalog profile. A Desktop nightly
update from `0.2.2-rc.1` to `0.2.2-rc.2` therefore rejected the plugin even though
the loader, host and client APIs were identical; only the token/layout contracts
had changed. Shipping a complete catalog for every token contract also made the
host bundle grow by roughly 150 KiB gzip per version.

## Model

1. **API compatibility decides admission.** A host version is exact-certified when
   it appears in the formal matrix. A newer `0.2.2+`/`0.2.x` prerelease whose
   loader ABI, host API and client API hashes match the certified family is
   admitted in `compatible-preview` mode and reuses the newest certified adapter.
   Out-of-family versions (`0.2.0`, `0.3.x`, ...) still fail closed.
2. **Catalog profiles are shared by review.** `contracts/dsh/catalog-profile-overrides.json`
   records reviewed profile reuse. The provider must have identical
   loader/host/client API hashes and layout-compatible slots; token additions are
   safe because every livery token is emitted concretely and unknown tokens inherit
   stock. The compiler skips byte-identity only for explicit shared-profile records.
3. **Evidence stays exact.** Formal evidence and stable/preview claims remain bound
   to exact host versions and artifact bytes. Compatibility mode is an unclaimed
   preview path; diagnostics carry a `gate.compatibility-fallback` warning.
4. **Package manager range.** `engines.dsh` is `>=0.2.1-rc.2 <0.3.0`; the exact
   certified set is still the formal matrix. `dsh.compatibility.dshReleases` lists
   the exact reviewed builds.

## Adding a version

- If API hashes match: add the contract snapshot, share the certified profile via
  an override with a reviewed reason, run full acceptance on the new host, and add
  exact evidence. No new catalog profile is needed.
- If API hashes differ: add a new adapter/profile and follow the full evidence chain.
- Unknown compatible versions may run, but are not claimed; promote them with evidence
  before listing them as stable or preview claims.

## Verified in 0.1.8

- Desktop `0.2.2-rc.2`: 34 checks pass on the real Electron app with the shared
  rc.1 catalog profile.
- Web `0.2.2-rc.2`: quick acceptance passes; full 0.1.8 evidence pending.
- All older certified hosts remain in the test matrix.

## Hot update (HMR)

DSH base enables `dsh-hmr` when the launcher provides `profileContext`; direct
Plugin Manager operations and profile manifest changes recompose running plugins
and replace modules whose files under the profile changed. Livery keeps this path
safe:

- every client contribution is owned by `ctx.effect` and disposed in reverse
  order; the presenter owns a cross-module DOM lease so a replaced copy cannot
  write after its owner is gone;
- style elements are reference-counted/shared across a hot replacement, and a
  stale host boot style is removed by the new confirmed apply;
- a new client build accepts the previous build's boot payload when the adapter
  identity is unchanged, reports `plugin version changed by HMR`, and re-fetches
  the catalog instead of failing closed;
- the catalog fetch retries briefly across the recomposition window;
- saved skin/wallpaper state is host-backed, so the new instance reapplies it.

Cold start remains the acceptance target; HMR is a convenience path and is covered
by the client handshake/runtime tests and a Web 0.1.7→0.1.8 smoke run.
