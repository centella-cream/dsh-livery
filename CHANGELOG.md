# Changelog

All notable changes to DSH Livery are recorded here.

## [0.1.0] — unreleased

First release line, certified against DeepSeek Harness `0.2.0-rc.2`
(adapter `dsh-0.2.0-rc.2-r1`).

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

### Known limitations

- Desktop Profile (macOS/Windows) is not certified in this release line; the
  proposed support matrix keeps those targets pending.
- Host-level density/transcript-width/message-flow capability is unavailable in DSH
  `0.2.0-rc.2`; those recipes degrade to host/stock and are reported in self-check.
  See `docs/verification/phase0-contract.md`.
- Wallpaper and custom `.dshlivery` import are not part of `schemaVersion: 1`
  (Phase 0 background-layer verification did not pass inside the public contract).
