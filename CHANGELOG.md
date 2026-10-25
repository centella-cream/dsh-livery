# Changelog

All notable changes to DSH Livery are recorded here.

## [0.4.0] — unreleased

### Added

- **Preview-language tab** in the gallery toolbar: `跟随 DSH / Follow DSH`,
  `中文`, `English`. It switches gallery thumbnails between the language-specific
  preview assets without changing the app language; applied styles still match
  fonts to the host language. Labels and title hint are localized; `data-testid`s
  `livery-locale-tab`, `livery-locale-follow|zh|en` keep the UI testable.

### Changed

- Plugin version `0.3.0` → `0.4.0`; tarball `dsh-livery-0.4.0.tgz`.
- No contract, manifest, catalog or CSS-budget change: the tab only selects which
  precompiled preview SVG locale is displayed (client-only).

## [0.3.0] — unreleased

Visual style system v2 + 24-style gallery, and the entry rename requested by the
user.

### Added

- **24 liveries** (was 10) built from a design table
  (`docs/research/design-table.json`): 10 retuned originals, 12 palettes inspired
  by permissively licensed open-source themes (Nord, Dracula, Gruvbox, Solarized,
  Catppuccin, Tokyo Night, Rosé Pine, Everforest, Kanagawa, One Dark, Ayu,
  Flexoki — attributions and licences in `NOTICE.md`), and 2 original
  Chinese-aesthetic designs (青瓷 Celadon, 朱砂 Cinnabar).
- **Style axes** so liveries differ beyond colour: 10 local-only font stacks
  (system/humanist/serif/display/rounded/mono) instead of 3; 9 metric profiles
  driving the consumed host type-scale tokens; 9 surface styles emitting
  `--dsw-radius-*`, `--dsw-corner-shape`, `--dsw-elevation-*`/`--dsw-shadow-*`,
  border tints and glass material (`--dsw-menu-backdrop-filter`) — from sharp
  squared panels to pill-rounded cards and floating/glass panels.
- Preview v2: thumbnails now draw the real corner radii, elevation/hairlines and
  type scale per livery (deterministic SVG, no assets), so the gallery shows the
  actual design differences.
- Style-token audit: frozen value grammar (shape/elevation/material/border/font
  families, hostile-value rejection) attached per livery to the compiler report.
- 6 new gallery tags: retro/paper/ink/neon/organic/tech (16 total).

### Changed

- Entry rename: zh **视觉风格**, en **Visual Style** (was 皮肤 / Livery) for the
  sidebar row, page title, Settings fallback and all supporting copy; internal
  ids/testids unchanged.
- Plugin version `0.2.2` → `0.3.0`; tarball `dsh-livery-0.3.0.tgz`.
- Contrast-repaired 8 seed colours across 6 palettes (OKLCH lightness only,
  hue/chroma preserved) so toast/tooltip inverse-label contrast passes; the
  design table stores the final seeds.
- Host bundle grows to ~2.5 MB raw / ~295 KB gzip because both catalog profiles
  embed the full per-livery audit payloads (no host budget declared; trimming
  runtime-irrelevant audit data is a documented post-release optimization).

### Verified

- Package `dsh-livery-0.3.0.tgz` sha256 `f06ee765bb10363fb0ed6008e4667cc672e6e8c4c7ad4dba11da32b49e6ad950`.
- Repo gates: tsc 0, vitest 588/588, 204 generated files / 2 profiles,
  24 liveries/profile + 96 previews/profile, contrast 2 832 assertions/profile
  0 failures, per-livery CSS 8 134–11 778 B (cap 12 288 B), client gzip 21 106 B.
- Real Web Profile live QA with the final package: 24-card gallery; applying
  graphite / catppuccin / rice-paper / tokyo-night produced real host-level
  differences (serif vs sans font stack, radius 6px vs 24px, different surface
  backgrounds, glass backdrop material); stock restored afterwards.
- Full four-target acceptance matrix is re-run and reported in
  `docs/verification.md`.

## [0.2.2] — unreleased

User-directed UI round: the Livery entry moves out of the Settings page into DSH's
main-page left-sidebar plugin navigation (the same pattern as 插件 / 自动化任务 /
上下文观察).

### Added

- Main-page panel (`main` keyed slot, key `livery`) with the full gallery/preview/
  apply/restore/self-check UI, plus a `sidebar.panellist` row (order 30, label
  皮肤/Livery, active-state icon).
- Forward-compatible entry detection: panel navigation exists since DSH
  `0.1.5-alpha.2` (verified from published sidebar/layout packages); on older hosts
  the plugin falls back to the legacy `settings.section` page instead of failing.
- Research note documenting the capability history
  (`docs/research/client-contract.md` §4) and the entry contract
  (`docs/design/interfaces.md` §6).

### Changed

- Plugin version `0.1.0` → `0.2.2`; tarball name `dsh-livery-0.2.2.tgz`.
- On panel-navigation hosts the Settings → 皮肤 section is no longer registered
  (single entry point, no duplicate navigation).

### Verified

- Package `dsh-livery-0.2.2.tgz` sha256 `74725a779f0fd8d88b11fac2688a3fb587185e19840ac8398aef3830861f9c17`.
- Sidebar entry accepted on all four targets: Web 0.2.1-rc.2 isolated 127/0/3/1,
  real-web-profile clone 128/0/3/2, Desktop 0.2.1-rc.3 packaged runtime 127/0/3/1,
  Desktop 0.2.1-rc.3 real Electron renderer 22/0/1 (native chrome/DPI/vibrancy
  still explicitly unverified). Live run on the user's real Web Profile: 11/11.
- Repo gates: tsc 0, vitest 547/547, 92 generated files / 2 profiles, all audits,
  loader-ABI 12/12, client 20,927 B gzip.

### Fixed in 0.2.1/0.2.2 (found while validating on the real Web Profile)

- 0.2.1: the capability probe for the new slots extracted the service method and
  lost its receiver, which threw during plugin activation on 0.2.1 hosts.
- 0.2.2: replaced the synchronous availability probe with inject-first registration
  (`ctx.slots.inject` for `main` and `sidebar.panellist`) plus a 1500 ms grace-period
  fallback to the legacy Settings page; a late declaration retires the fallback, so
  plugin activation order can never decide the entry point or take the shell down.
- Live verification on the user's real Web Profile (`~/.dsh/profiles/web`, DSH
  0.2.1-rc.2, dsh-charter + dsh-context + dsh-vscode-bridge installed): official
  plugin-manager install, sidebar rows 插件/自动化任务/上下文洞察/**皮肤**, page
  gallery/preview/self-check all pass (11/11), Settings no longer contains an active
  皮肤 section.

### Unchanged

- Host adapters/contracts (0.2.0-rc.2 / 0.2.1-rc.2 / 0.2.1-rc.3), catalog profiles,
  previews, self-check capability facts, fail-closed handshake and all acceptance
  gates.

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
  See `docs/verification.md`.
- Wallpaper and custom `.dshlivery` import are not part of `schemaVersion: 1`
  (Phase 0 background-layer verification did not pass inside the public contract).
