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

---

# Round 3 — multi-version acceptance (2026-10-25)

Final artifact: `dsh-livery-0.1.0.tgz` sha256 `19dc6895e8986fab1581c2b22da10e0507811e94f5596a2f32a82fe02b60ac0b` (257,022 B). Full report:
[docs/verification/multi-version-acceptance.md](multi-version-acceptance.md).

| Host | Profile / runtime | Result | Evidence |
|---|---|---|---|
| `0.2.1-rc.2` | Web/Chrome, isolated full acceptance | **121 pass / 0 fail / 3 skip / 1 warn** | `artifacts/acceptance/0.2.1-rc.2-web/` |
| `0.2.1-rc.2` | Web/Chrome, user Web Profile clone | **121 pass / 0 fail / 3 skip / 3 warn** | `artifacts/acceptance/0.2.1-rc.2-web-real-profile-clone/` |
| `0.2.1-rc.3` | Desktop packaged-app runtime, headless web carrier | **121 pass / 0 fail / 3 skip / 1 warn** | `artifacts/acceptance/0.2.1-rc.3-runtime-web-carrier/` |
| `0.2.1-rc.3` | **Desktop Profile, real Electron renderer (macOS)** | **22 pass / 0 fail / 1 documented skip** | `artifacts/acceptance/0.2.1-rc.3-desktop/` |
| `0.2.0-rc.2` | Web/Chrome (round 2, unchanged) | **110 pass / 0 fail / 3 skip / 2 warn** + clone 80/0/7/2 | `artifacts/acceptance/` (round-2 dirs) |

Repo gates on the final state: tsc 0 errors, vitest 527/527, 92 generated files across
2 catalog profiles in sync, per-livery CSS 9096 B (0.2.0) / 8508 B (0.2.1) vs 12,288 B
hard cap, contrast 1180 assertions/profile with 0 failures, token coverage missing 0
per profile, loader-ABI/adapter-check/pack-check/lint green, client gzip 20,282 B
(25,600 B budget).

Certification gaps are explicit: Web/Edge pending; native Electron window surfaces
(traffic lights/leading/vibrancy/native Dock states/OS DPI beyond devicePixelRatio)
and the packaged Chromium sandbox/GPU path remain unverified even though the real
Electron renderer was driven; desktop third-party coexistence
(`dsh-skin`/`dsh-charter`/`dsh-context`) is blocked by a clone/pnpm-store constraint
and recorded as an attempt; G6/formal support matrix not claimed; layout capability
gate and wallpaper/import limitations unchanged. See
`artifacts/release/known-limitations.md`.


---

# Round 4 — sidebar entry + 0.2.2 matrix

`dsh-livery-0.2.2.tgz` sha256 `74725a779f0fd8d88b11fac2688a3fb587185e19840ac8398aef3830861f9c17` · plugin 0.2.2 · client 20,927 B gzip.

| Host | Profile / runtime | Result | Evidence |
|---|---|---|---|
| 0.2.1-rc.2 | Web/Chrome, isolated full | **127 pass / 0 fail / 3 skip / 1 warn** | `artifacts/acceptance/pkg-0.2.2/web-0.2.1-rc.2/` |
| 0.2.1-rc.2 | Web/Chrome, real Web Profile clone | **128 / 0 / 3 / 2** | `artifacts/acceptance/pkg-0.2.2/web-real-profile-clone/` |
| 0.2.1-rc.3 | Desktop packaged runtime, web carrier | **127 / 0 / 3 / 1** | `artifacts/acceptance/pkg-0.2.2/web-carrier-0.2.1-rc.3/` |
| 0.2.1-rc.3 | Desktop Profile, real Electron renderer | **22 / 0 / 1** (native chrome unverified) | `artifacts/acceptance/pkg-0.2.2/desktop-0.2.1-rc.3/` |
| 0.2.1-rc.2 | **User's real `~/.dsh/profiles/web` (live)** | **11 / 0** | `artifacts/acceptance/real-web-profile/` |

The Livery entry now lives in the left sidebar above 工作区 (皮肤/Livery, order 30)
instead of the Settings page; the Settings section is not registered on these hosts
and only serves as the pre-`0.1.5-alpha.2` fallback. Evidence and capability history:
[sidebar-navigation.md](sidebar-navigation.md).


---

# Round 5 — 24 styles + 视觉风格/Visual Style

`dsh-livery-0.3.0.tgz` sha256 `f06ee765bb10363fb0ed6008e4667cc672e6e8c4c7ad4dba11da32b49e6ad950` · plugin 0.3.0 · client 21,106 B gzip ·
host 2.5 MB raw / 295 KB gzip.

| Host | Profile / runtime | Result | Evidence |
|---|---|---|---|
| 0.2.1-rc.2 | Web/Chrome, isolated full | **139 pass / 0 fail / 3 skip / 2 warn** | `artifacts/acceptance/pkg-0.3.0/web-0.2.1-rc.2/` |
| 0.2.1-rc.2 | Web/Chrome, real Web Profile clone | **140 / 0 / 3 / 3** | `artifacts/acceptance/pkg-0.3.0/web-real-profile-clone/` |
| 0.2.1-rc.3 | Desktop packaged runtime, web carrier | **139 / 0 / 3 / 2** | `artifacts/acceptance/pkg-0.3.0/web-carrier-0.2.1-rc.3/` |
| 0.2.1-rc.3 | Desktop Profile, real Electron renderer | **22 / 0 / 1** (native chrome unverified) | `artifacts/acceptance/pkg-0.3.0/desktop-0.2.1-rc.3/` |
| 0.2.1-rc.2 | User's real `~/.dsh/profiles/web` (live QA) | **24-card gallery, 4 styles applied + stock restored** | `artifacts/acceptance/real-web-styles/` |

The Livery entry is now 视觉风格 / Visual Style in the left sidebar above 工作区;
24 styles differ in palette, local font stack, module radii/shape, elevation and
glass/paper material. Full numbers and honest scope:
[style-system-0.3.0.md](style-system-0.3.0.md) (verifier) and the round-5 section
of [multi-version-acceptance.md](multi-version-acceptance.md).
