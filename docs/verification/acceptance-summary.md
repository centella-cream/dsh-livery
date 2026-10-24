# DSH Livery 0.1.0 — Web Profile acceptance summary

Captured: 2026-10-25 (Asia/Shanghai). Lead verdict: **Web Profile MVP acceptance
passes for Chrome; three explicit deviations are recorded below and none is hidden.**

| Item | Value |
|---|---|
| Plugin | `dsh-livery@0.1.0` |
| Artifact | `dsh-livery-0.1.0.tgz` · sha256 `3000f199f7aea7aa3b2db47af4b88f9a68acf44326cb007fbf893fc2bd55fdeb` · 162,024 B · 62 files |
| Host | `@deepseek-ai/dsh@0.2.0-rc.2` exact |
| Adapter | `dsh-0.2.0-rc.2-r1` |
| contractHash | `sha256:42abf8ebc5ec1df1e6abd6760680ec82fd062db650036e5e9f2a052138b6b2ce` |
| Client target / verified browser | `chrome120` / Chrome 155.0.8059.85 |
| Node | v22.23.1 |
| Evidence index | `artifacts/release/evidence-index.json` |
| Support matrix (proposed) | `contracts/dsh/support-matrix.proposed.json` → `g0-g5-passed`, web/chrome passed |

## 1. Runs

### Isolated full Web Profile (fresh `DSH_HOME`, official install/lifecycle)

Command: `node scripts/acceptance-web.mjs --tgz dsh-livery-0.1.0.tgz`

**110 passed / 0 failed / 3 expected skips / 2 warnings** (~85 s).

- install via official `dsh plugin --profile web add` 207 ms, bundle selected;
- boot ready 1,018 ms on an OS-assigned port; SIGTERM exit 0 + port closed;
- uninstall exit 0, dependency removed and bundle deselected;
- post-uninstall restart: no boot graph row, no `data-dsh-livery`/hash, no Livery
  styles, `__DSH_LIVERY_BOOT__` absent, computed tokens back to stock; catalog,
  preview and old bundle URLs 404;
- apply/first-paint: 46 rAF samples, 0 without livery attr/style; first sample at
  7 ms already `attr=fjord`, bg `#f0f3f6`, hash matches; FCP 104 ms; 12-frame
  CDP filmstrip.
- 20 screenshots (zh/en × gallery/applied/light/dark/stock/preview/self-check/
  diagnostics/1023/767/post-uninstall/multitab) in
  `artifacts/acceptance/screens/web-chrome-dsh-livery/`.

Skips are expected: `handshake.boot-global/echo/catalog-url` are asserted at stock
default where the host intentionally injects zero rows; they are re-asserted after
Apply as `handshake.applied-boot` PASS.

### Real-profile-equivalent (byte-clone of the user's Web Profile)

The user's real `~/.dsh/profiles/web` was **not mutated**. It was byte-cloned into
`.tmp/real-profile-home/profiles/web` (same bundles `dsh-base`, `dsh-web-app`,
`dsh-context`, `dsh-charter`; same `cordis.patch.yml` incl. locale zh and the
vscode-bridge insert; same installed node_modules), then the tarball was installed
through the official plugin manager and the read-only acceptance pass executed:

**80 passed / 0 failed / 7 expected skips / 2 warnings** (reuse mode).

Passes include handshake/hash equality, catalog 10 liveries + coverage/contrast/
css-safety, boot style adoption with zero re-render, host light/dark following
(`data-ds-theme-source=system`, no ui-theme write), zh CJK fonts, first-paint
no-stock-frame, self-check disclosure, preview→cancel exact restore, multi-tab,
1023/767 no overflow, no Livery-owned console errors, and `dsh-charter`/`dsh-context`
remaining functional in the same page.

Evidence: `artifacts/acceptance/real-profile-clone/probe.json`,
`docs/verification/web-acceptance-real-profile-clone.md`.

Skipped in reuse mode (read-only): stock baseline (profile already has an active
livery), en font pass, apply/restore persistence, uninstall. These are covered by
the isolated full run.

## 2. Gate evidence

| Gate | Result |
|---|---|
| Contract snapshot + verify (six hashes) | PASS — `artifacts/contracts/0.2.0-rc.2/` |
| Adapter generate/check | PASS — `contracts/dsh/0.2.0-rc.2/adapter.json` |
| Loader ABI (single classic-script factory, seeded modules only, broken envelope runs no plugin code) | PASS — `artifacts/abi/0.2.0-rc.2/loader.json` |
| TypeScript | 0 errors |
| Unit/compiler/host/client/contract tests | 425+ passing (30 files; final count in CI log) |
| 10 liveries, schema strict, deterministic previews | PASS — `artifacts/liveries/report.json` |
| Contrast matrix | 1,180 WCAG assertions, 0 failures |
| Token coverage | required 146 / covered 80 / inherited 66 documented exemptions / missing 0 |
| CSS safety | 0 `!important`, 0 hash selectors, 0 remote URLs, token declarations scoped only |
| CSS budgets | per livery 8,650–9,096 B (hard cap 12,288 B; 8 KB target exceeded by 665 B, warning only) |
| Client gzip budget | 23,145 B (cap 25,600 B) |
| Package check | no dev CLIs, no references/research/artifacts, no host paths |
| Support matrix gate | correctly BLOCKED (G6 not claimed; desktop + edge pending) |

## 3. Explicit deviations (not hidden)

1. **Layout capability gate open** — DSH 0.2.0-rc.2 exposes no documented host-level
   density / transcript-width / message-flow hook. Livery applies colors, host
   font-family and surface material; those three recipes degrade to host/stock and
   self-check reports them. No Livery UI fakes a host capability. Host proposal in
   `docs/verification/phase0-contract.md` §7.
2. **Wallpaper and custom import removed from schemaVersion 1** (Phase 0 background
   layer verification failed inside the public contract).
3. **Desktop (macOS/Windows) and Web/Edge uncertified** — proposed support matrix keeps
   them pending; no support is claimed and the formal `support-matrix.json` is absent.

## 4. Known warnings

- `bundle.canonical-route`: DSH 0.2.0-rc.2 serves client bundles only through the
  boot-graph grouped URL; the bare `/plugins/<pkg>/client.js?rev=` form 404s. Host
  documentation drift, not a plugin defect.
- `css.size-target`: active livery CSS 8,665 B vs the 8 KB target (hard cap 12 KB).

## 5. Reproduce

```bash
pnpm install
pnpm verify                      # typecheck + tests + compile/check + audits + build + pack:check
node scripts/acceptance-web.mjs --tgz dsh-livery-0.1.0.tgz
node scripts/cli.mjs gate:support-matrix   # expected: BLOCKED until G6
```
