# Multi-version acceptance — DSH 0.2.0-rc.2 / 0.2.1-rc.2 / 0.2.1-rc.3

Captured 2026-10-25 (Asia/Shanghai). Lead verdict: **the multi-version adaptation is
implemented and verified end-to-end on the shipped artifact for all three certified
hosts; two honest certification gaps remain (Web/Edge, and native Electron window
surfaces), neither of which is claimed.**

| Item | Value |
|---|---|
| Artifact | `dsh-livery-0.1.0.tgz` · sha256 `19dc6895e8986fab1581c2b22da10e0507811e94f5596a2f32a82fe02b60ac0b` · 257,022 B · 107 files |
| Certified hosts | `0.2.0-rc.2`, `0.2.1-rc.2` (npm/CLI) and `0.2.1-rc.3` (Desktop app.asar runtime) |
| Adapters | `dsh-0.2.0-rc.2-r1`, `dsh-0.2.1-rc.2-r1`, `dsh-0.2.1-rc.3-r1` |
| Catalog profiles | `sha256:4c5ee1a2…` (0.2.0 only), `sha256:060e80ef…` (0.2.1-rc.2 + rc.3, byte-identical) |
| Support matrix | `contracts/dsh/support-matrix.proposed.json` (rc.2 Web = g0-g5-passed; rc.3 = draft, native window pending) |
| Release evidence | `artifacts/release/evidence-index.json` |

## 1. What changed for the new hosts

Contract snapshots were re-frozen for both new builds (six class hashes each; exact
versions only). Differences that mattered:

| Contract class | 0.2.0-rc.2 → 0.2.1-rc.2 | 0.2.1-rc.2 → 0.2.1-rc.3 |
|---|---|---|
| loader ABI | platform table 9 → **11** modules (adds `zod`, `@tanstack/react-virtual`) | identical |
| tokens | font family ladder now resolves through documented host hooks `--dsh-font-family-text/-code`; token names and colours unchanged | identical |
| layout | documented font role hooks added to the layout contract; **still no public density / transcript-width / message-flow hook** | README availability differences only |
| Host API / Client API / profile schema | **identical** | identical |
| Node runtime | v22.23.1 | v24.21.0 (Electron 44.7.0 bundled) |

Implementation adaptation (no host-version strings outside the adapter registry):

- **Adapters**: exact-version registry with frozen contract hashes; unknown hosts
  fail closed to stock. Package allowlist `0.2.0-rc.2 || 0.2.1-rc.2 || 0.2.1-rc.3`,
  Node range `^22.23.1 || ^24.21.0`.
- **Core/compiler**: stock tokens and capability maps are explicit inputs; the compiler
  emits one catalog per render-equivalent profile and fails if any adapter in a shared
  profile renders different bytes. Typography is capability-driven: 0.2.0 keeps the
  `--dsw-*` override strategy (8650–9096 B/livery); 0.2.1 binds only the documented
  host role hooks (8062–8508 B/livery).
- **Host**: observed version → adapter; boot payload carries adapter identity +
  catalog profile; preview routes are profile-scoped; fail-closed diagnostics.
- **Client**: boot payload and catalog must match a generated lite adapter identity
  and profile; no version constants in the browser bundle.
- **Desktop contract**: `scripts/prepare-desktop-contract.mjs` extracts the runtime
  bytes from the packaged `app.asar` and supplements the stripped type documents
  from the same published npm version, recorded in `source.prepared`.

## 2. Verification runs (all on the shipped tarball sha)

### Web Profile 0.2.1-rc.2 — isolated full acceptance

121 passed / 0 failed / 3 expected skips / 1 warning.
Official install/lifecycle, first paint (no stock frame), hash equality
boot↔catalog↔body, catalog 10 liveries × 2 profiles, capability rows including
`host-font-role-hooks`, settings UI zh/en, preview/apply/restore, uninstall +
restart residue. Evidence: `artifacts/acceptance/0.2.1-rc.2-web/`,
`docs/verification/web-acceptance-0.2.1-rc.2.md`.

### Web Profile 0.2.1-rc.2 — real-profile clone

121 passed / 0 failed / 3 expected skips / 3 warnings. Byte-clone of the user's
Web Profile (dsh-charter + dsh-context + locale zh) in an isolated DSH_HOME; the
clone repaired one pre-existing broken `dsh-charter` tarball reference (warn); one
unrelated entry did not activate (warn). Evidence:
`artifacts/acceptance/0.2.1-rc.2-web-real-profile-clone/`,
`docs/verification/web-acceptance-0.2.1-rc.2-real-profile-clone.md`.

### Desktop runtime 0.2.1-rc.3 — packaged-app runtime, headless web carrier

121 passed / 0 failed / 3 expected skips / 1 warning. The Desktop app's own
0.2.1-rc.3 runtime was resolved from the packaged `app.asar` (`sourceKind:
packaged-app`, adapter `dsh-0.2.1-rc.3-r1`, contract `sha256:d246181d…`) and
exercised through its web carrier. Evidence:
`artifacts/acceptance/0.2.1-rc.3-runtime-web-carrier/`,
`docs/verification/web-acceptance-0.2.1-rc.3-runtime-carrier.md`.

### Desktop Profile 0.2.1-rc.3 — real Electron renderer (macOS)

**22 passed / 0 failed / 1 documented skip / 0 warnings.** The real DeepSeek
Harness Electron application (0.2.1-rc.3, Electron 44.7.0, Node 24.21.0,
Chrome 152, window 1280×820 @ DPR 2) was launched with an isolated `/tmp`
desktop home and driven through Playwright `_electron`:

- official plugin-manager install exit 0 with no version exemption (both catalog
  profiles installed); a synthetic 0.2.0-only plugin is rejected, proving the
  rc.3 `engines.dsh` gate; CLI boot of the desktop profile is refused by design;
- boot graph lists `dsh-livery`; stock start has no livery attributes/styles;
- settings → 皮肤 → 10-livery gallery; preview plum is transient, cancel restores;
  Apply writes exactly one `- id: livery` config row; a fresh application launch
  delivers the certified rc.3 boot payload (accepted, `profileKind=desktop`)
  ~907 ms after launch; boot↔body↔catalog hash equality holds;
- light/dark tokens, documented `--dsh-font-family-text/-code` role hooks,
  self-check identity/capabilities and restore-stock all behave in the real
  renderer; 8 renderer screenshots archived.

**Not verified for desktop** (explicit): native traffic lights/leading, vibrancy,
Dock/rightbar native window states, OS-level DPI beyond `window.devicePixelRatio`,
and the packaged Chromium sandbox/GPU path (automation ran with
`--no-sandbox --disable-gpu` in this file-sandboxed session). Pre-paint rAF
sampling on the native startup path is a documented skip (host owns boot-ready
injection; boot-payload availability is asserted instead). The user's running
instance was untouched. `desktop.macos` remains **pending**, not a support claim.
Evidence: `artifacts/acceptance/0.2.1-rc.3-desktop/`,
`docs/verification/desktop-acceptance-0.2.1-rc.3.md`.

Coexistence with the user's real desktop plugin stack (old `dsh-skin`,
`dsh-charter`, `dsh-context`) is **runtime-unverified**: cloning the real desktop
profile fails official install with `ERR_PNPM_UNEXPECTED_STORE` (the Desktop-bundled
pnpm refuses the user store the clone's node_modules came from). The attempt and
exact blocker are recorded, not hidden:
`docs/verification/desktop-acceptance-0.2.1-rc.3-coexistence-clone.md`.

### Round-2 evidence (0.2.0-rc.2 Web/Chrome) still stands

110 passed / 0 failed / 3 expected skips / 2 warnings (isolated full) and
80/0/7/2 (real-profile clone) from the previous round; the 0.2.0 catalog profile
was re-rendered in round 3 and is byte-identical for 8/10 liveries (plum and
rice-paper changed only because their explicit manifest token overrides are now
honoured).

## 3. Gates on the final repo state

tsc 0 errors · vitest 527/527 · compiler 2 profiles / 3 adapters / 92 generated
files in sync · per-livery CSS 9096 B (0.2.0) / 8508 B (0.2.1) vs 12,288 B cap ·
contrast 1180 assertions per profile, 0 failures · token coverage missing 0 per
profile · loader-ABI + adapter-check + pack-check + lint green · client gzip
20,282 B vs 25,600 B budget.

## 4. Explicit certification gaps (not claimed)

1. **Web/Edge**: the Web support statement names Chrome 120+ and Edge 120+, but only
   Chrome 155 was executed. Edge remains pending.
2. **Native Electron window surfaces**: desktop 0.2.1-rc.3 was verified through its
   packaged runtime web carrier, not through an Electron-rendered window. Native
   caption/traffic lights, frame clearance, DPI and vibrancy are **not verified**;
   `desktop.macos` stays `pending` and `0.2.1-rc.3` stays `draft` in the proposed
   matrix. Boot via CLI is refused ("profile desktop is managed exclusively by the
   Electron application") and the Electron binary rejects headless debug flags in
   this session, so this gap could not be closed safely.
3. **Layout capability gate** (unchanged from round 2): no public density /
   transcript-width / message-flow hook in any certified host; recipes degrade to
   host/stock and are disclosed in self-check. No fake compensation.
4. **G6 / formal support matrix**: not claimed. The release gates intentionally block
   while desktop/edge remain pending.
5. **Wallpaper / custom import**: still out of schemaVersion 1.

## 5. Reproduce

```bash
# contracts (installed hosts)
pnpm contract:snapshot -- --dsh-install <dsh-package-root>     # 0.2.1-rc.2
node scripts/prepare-desktop-contract.mjs --app-asar "/Applications/DeepSeek Harness.app/Contents/Resources/app.asar" --version 0.2.1-rc.3
pnpm contract:snapshot -- --dsh-install .tmp/desktop-contract
pnpm contract:verify -- --dsh-install <dsh-package-root>
pnpm contract:diff -- --base 0.2.0-rc.2 --candidate 0.2.1-rc.2
pnpm adapter:generate && pnpm adapter:check && pnpm test:loader-abi

# catalogs + build
pnpm liveries:compile && pnpm verify

# acceptance (fresh isolated homes)
node scripts/acceptance-web.mjs --tgz dsh-livery-0.1.0.tgz            # installed CLI host
node scripts/acceptance-web.mjs --reuse <token-url> --out artifacts/acceptance/reuse
# desktop runtime carrier: see docs/verification/README.md ("packaged-app runtime")
```

Evidence index: `artifacts/release/evidence-index.json`; per-run probes, screenshots
and filmstrips live under `artifacts/acceptance/<host>/`.
