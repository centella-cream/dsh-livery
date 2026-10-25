# Changelog

All notable changes to DSH Livery are recorded here.

## [0.1.0] — unreleased

First release line. Certified host builds (exact versions): DeepSeek Harness
`0.2.0-rc.2` (adapter `dsh-0.2.0-rc.2-r1`), `0.2.1-rc.2` (`dsh-0.2.1-rc.2-r1`) and
the Desktop `0.2.1-rc.3` runtime (`dsh-0.2.1-rc.3-r1`).

### Added

- Contract snapshot for the exact DSH `0.2.0-rc.2` build: six independent contract
  hashes (loader ABI, Host API, Client API, token, layout, profile schema), an
  adapter manifest, and a proposed support matrix.
- Pure derivation core: OKLab/OKLCh color math, gamut fitting, data-driven light/dark
  palette derivation from four seeds, WCAG contrast matrix with bounded adjustment,
  font/metrics/tag registries, safe layout recipe resolution with capability gates.
- Build-time compiler: strict JSON Schema validation, deterministic compilation,
  bilingual (`zh-CN`/`en-US`) preview generation, token coverage/CSS safety/contrast
  audits, and `--check` drift detection.
- Ten built-in dual-mode liveries: fjord, plum, amber-dusk, moss, graphite,
  rice-paper, deep-sea, sakura, midnight, linen.
- Host plugin: volatile `skinId` config, pre-loader contract gate that fails closed to
  stock, first-frame token/style/preview injection through `webserver/index-inject`,
  read-only catalog and preview routes, structured diagnostics, dispose-safe effects.
- Client plugin: boot → loading → ready ⇄ previewing → degraded → disposed state
  machine, hash-equal boot-style adoption with zero CSS writes, transactional preview
  with single-mutation commit and rollback, stock restore, bilingual settings page
  with search, tag filters, keyboard gallery navigation and self-check.
- Web Profile acceptance harness (isolated `DSH_HOME`, official `dsh plugin` install
  path, Playwright + system Chrome, screenshots/trace/`probe.json`) and the
  corresponding verification documentation.
- Contract, adapter, support-matrix, loader-ABI, CSS, contrast, token-coverage and
  package-content gates exposed as stable `pnpm` commands.

### Changed in the multi-version round (0.2.1 adaptation)

- Added exact-version adapters and frozen contract snapshots for `0.2.1-rc.2`
  (npm/CLI) and `0.2.1-rc.3` (Desktop `app.asar` runtime, contract supplemented
  from the same published type/README documents, recorded in `source.prepared`).
- The loader ABI platform module table grew to 11 modules (`zod`,
  `@tanstack/react-virtual`); all three adapters are validated to seed the nine
  modules Livery requires. Host/Client/profile-schema contract hashes are
  identical across the three versions.
- 0.2.1 changed the font ladder to documented host role hooks. Livery now selects
  typography strategy by capability (`host-font-role-hooks`): on 0.2.1 it binds
  only `--dsh-font-family-text` / `--dsh-font-family-code`; on 0.2.0 it keeps the
  `--dsw-*` token override strategy. Per-livery CSS shrank to 8062–8508 B on 0.2.1.
- Compiler now emits one catalog per render-equivalent `catalogProfile`
  (0.2.0 vs 0.2.1; the two 0.2.1 builds share one profile byte-identically), with
  per-profile previews, audits and explicit-override-aware emission.
- Host gate resolves the exact observed version to an adapter registry entry and
  fails closed for anything uncertified; preview routes are profile-scoped.
- Client accepts only a boot payload/catalog whose `(hostVersion, adapterId,
  contractHash, catalogProfile)` matches a generated lite adapter identity.
- Desktop 0.2.1-rc.3 passes the official plugin-manager install acceptance (no
  version exemption). Full Electron-rendered runtime verification remains tracked
  as pending in the proposed support matrix.

### Verified in the multi-version round

- Artifact `dsh-livery-0.1.0.tgz` sha256 `19dc6895e8986fab1581c2b22da10e0507811e94f5596a2f32a82fe02b60ac0b`.
- 0.2.1-rc.2 Web/Chrome: 121/0/3/1 isolated full acceptance and 121/0/3/3 on a clone of
  the real Web Profile.
- 0.2.1-rc.3 Desktop packaged runtime: official plugin-manager install acceptance plus
  121/0/3/1 runtime acceptance through the packaged web carrier.
- 0.2.1-rc.3 Desktop Profile, real Electron renderer (macOS): 22/0/1 — boot graph,
  catalog identity, settings/gallery, preview/apply-persist, relaunch boot payload,
  light/dark tokens, documented font role hooks, self-check and restore-stock verified
  in the real application. Native window chrome/vibrancy/DPI beyond devicePixelRatio
  and the packaged GPU/sandbox path remain unverified (explicit gap); real-profile
  plugin coexistence is blocked by a pnpm-store clone constraint and recorded as an
  attempt.
- 0.2.0-rc.2 Web/Chrome round-2 evidence remains valid (110/0/3/2 isolated, 80/0/7/2 clone).
- Repo gates: tsc clean, 527/527 tests, 2 catalog profiles / 92 generated files in sync,
  0 contrast failures per profile, CSS under the 12 KiB hard cap, client gzip 20,282 B.

### Known limitations

- Desktop Profile (macOS/Windows) is not certified in this release line; the
  proposed support matrix keeps those targets pending.
- Host-level density/transcript-width/message-flow capability is unavailable in DSH
  `0.2.0-rc.2`; those recipes degrade to host/stock and are reported in self-check.
  See `docs/verification/phase0-contract.md`.
- Wallpaper and custom `.dshlivery` import are not part of `schemaVersion: 1`
  (Phase 0 background-layer verification did not pass inside the public contract).
