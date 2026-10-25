# Verification

DSH Livery is validated against **exact, frozen host builds** and refuses to style
anything it has not been certified against. This page summarises the current
evidence and how to reproduce it. Raw screenshots/probes are generated locally under
`artifacts/` (not committed).

## Host matrix (release 0.5.0)

| Target | Result | What it covers |
|---|---|---|
| DSH `0.2.1-rc.2`, Web Profile, isolated full run | **170 pass / 0 fail / 3 skip / 2 warn** | official install + lifecycle, boot gate, handshake, catalog/previews, visual-studio tabs, 6/6 family sections (calm 7 / nature 3 / light 4 / retro 5 / vivid 2 / dark 3) + family chips/mapping/more-filters/keyboard, 24-card gallery, preview-language tab, wallpaper studio (8 built-ins, blur/dim/frost, persistence, https-only URL validation, mocked online search), preview/apply/restore, self-check, fonts/theme, style differences, unpause + residue |
| DSH `0.2.1-rc.2`, Web Profile, clone of a real user profile | **171 / 0 / 3 / 3** | same as above in a realistic composition (charter/context/vscode-bridge etc.) |
| DSH `0.2.1-rc.3`, Desktop packaged runtime (web carrier) | **170 / 0 / 3 / 2** | packaged-app adapter, its own Node/Electron runtime, same browser checks |
| DSH `0.2.1-rc.3`, Desktop Profile, real Electron renderer | **27 / 0 / 1** | real Electron app: boot graph, catalog identity, 6 family sections + tabs, wallpaper studio built-in layer, preview-language tab, preview/apply/persist, relaunch boot payload, light/dark tokens, font hooks, self-check, sidebar entry |

Release `0.5.0` ("visual studio") is client-only over `0.4.0`: host adapters,
contracts, the 24 manifests/catalogs and pre-generated previews are unchanged.
New in this release:

- **Grouped gallery.** Family chips (全部 + 静谧/自然/明亮/复古/霓虹/深色) and a
  page-level 视觉风格 / 壁纸 tab pair; the gallery renders **all six**
  non-empty family sections in display order calm → nature → light → retro →
  vivid → dark, with the tag-priority mapping nature → calm → light → retro →
  vivid → dark (so organic styles are not absorbed by calm). The 16 tag chips
  move behind a 更多筛选 toggle; roving focus stays one flattened list across
  sections. Family sections/chips are presentation-only and never affect the
  compiled stylesheet.
- **Wallpaper studio.** 8 deterministic CSS-only built-ins, blur 0–24 px, dim
  0–70 %, frost 0–100 %, custom https-only URL validation, and optional
  user-initiated Openverse/Picsum search. Applied through one plugin-owned
  `<style data-plugin-css="dsh-livery/wallpaper">` plus
  `body[data-dsh-wallpaper]` using body pseudo-elements; frost makes the active
  style's surface tokens translucent via `color-mix(...)`. Selection/effects
  persist in `localStorage`; clearing removes the layer and storage record.
  Client-only: no host config or boot payload changes.
- **Compat UI.** A compat notice/self-check path exists for uncertified hosts.
  The browser acceptance cannot fake an uncertified host, so this is verified by
  the client unit suite only and is **not** claimed as browser coverage.
- Client bundle grew deliberately to 113,072 B raw / 29,628 B gzip (32 KiB
  budget); host gzip is 295,742 B.

### Previous release — `0.4.0` (evidence kept locally under `artifacts/acceptance/pkg-0.4.0/`)

| Target | Result |
|---|---|
| DSH `0.2.1-rc.2`, Web Profile, isolated full run | 148 / 0 / 3 / 2 |
| DSH `0.2.1-rc.2`, Web Profile, clone of a real user profile | 149 / 0 / 3 / 3 |
| DSH `0.2.1-rc.3`, Desktop packaged runtime (web carrier) | 148 / 0 / 3 / 2 |
| DSH `0.2.1-rc.3`, Desktop Profile, real Electron renderer | 25 / 0 / 1 |

### Earlier releases

`0.3.0` (24 styles, Visual Style rename): 139/140/139/22.
`0.2.2` (sidebar navigation entry): 127/128/127/22.
`0.1.0` (settings-page entry): 121/121/121/22.
Superseded evidence and defect records stay annotated under `artifacts/acceptance/`.

The two earlier `0.5.0` candidate packs sha256 `4f57e763…` (empty `vivid`
family) and `03c9afb7…` (stale installed bytes found in live QA) are **dead**:
no acceptance run directories were produced for them. The shipped artifact is
`b881281773ecefdecd8ca086c0a19244dad02299c1f023ff2b3c1da59be24c3b`
(542,781 B). The matrix below was produced against the accepted runtime bytes of
`fc2c02635da2396cfe74bd3412c01cc880ce428babfa92a3572b3cbc7504473a`; the final
tarball is a README-only repack — `lib/index.js`, `lib/client.js`, catalog and
preview assets are byte-identical (verified by extracting and hashing both), so
the accepted results apply to the shipped artifact unchanged.

Skipped/warned checks are documented in the local run reports (stock-boot handshake
rows re-asserted after Apply; grouped-bundle URL deviation; clone composition
warnings; native pre-paint sampling on the Electron path).

Repo gates on the same tree:

- `tsc --noEmit` clean, `vitest run` 661 tests green.
- `liveries:check`: 24 styles across 2 catalog profiles.
- Token coverage: 0 missing; contrast: 2,832 assertions per profile, 0 failures.
- Per-livery CSS: under the 12 KiB hard cap; client gzip 29,628 B (32 KiB budget);
  host gzip 295,742 B.
- Loader ABI: 12/12 checks; adapter allowlist and pack checks green.

## What is verified

- Exact host version + adapter id + contract hash + catalog profile on the wire.
- Byte equality: first-frame CSS ↔ catalog CSS ↔ body hash; shared catalog profile
  is byte-identical between `0.2.1-rc.2` and `0.2.1-rc.3`.
- 24 styles × 2 profiles: gallery, preview, single-mutation Apply, persistence,
  restore stock, uninstall/restart residue.
- Grouped gallery (0.5.0): page tabs, 6/6 non-empty family sections in display
  order, counts 7/3/4/5/2/3 with tag-priority mapping verified per card, family
  filtering, 16 tag chips behind the collapsed 更多筛选 toggle, and roving focus
  crossing section boundaries.
- Wallpaper studio (0.5.0): owned stylesheet + `body[data-dsh-wallpaper]`, 8
  built-ins, blur/dim sliders measured in the applied layer, frost producing
  `color-mix(...)` translucency on the active style's surface tokens, reset,
  persistence across a hard reload, https-only URL validation (http/javascript/
  data rejected), mocked Openverse search → result → remote URL + attribution,
  and clear removing layer + storage. All network is intercepted in acceptance;
  live third-party image loading is not exercised.
- Preview-language tab (0.4.0) still works in the grouped gallery (tabs, family
  chips, sections, more-filters and Apply semantics unchanged).
- Gallery preview-language tab (Follow DSH default / 中文 / English): Follow
  tracks the host locale, pinning every mounted thumbnail switches its preview
  URL to the chosen locale, card copy is unchanged, and Apply with a pinned
  language is still exactly one config mutation; the real Electron renderer
  shows the same tab behaviour.
- Real host-level style differences after Apply (not just stylesheet text):
  composer border-radius differs across styles (10/18/32/36 px), body font stack
  switches between sans (PingFang SC) and serif (Songti SC), 10 distinct computed
  shadows, glass `backdrop-filter` reaches the host, and style tokens resolve exactly
  as compiled.
- Accessibility safety: no `!important`, no hash selectors, no remote URLs, no
  whole-document observers; contrast and focus-ring checks.

## What is NOT verified

- Native Electron window surfaces: traffic lights/leading, vibrancy, native
  Dock/rightbar states, OS DPI beyond `devicePixelRatio`, packaged Chromium
  sandbox/GPU path.
- Compat-mode UI: browser acceptance cannot fake an uncertified host; the compat
  notice/self-check path is covered by client unit tests only.
- Live online wallpaper search: acceptance intercepts Openverse/Picsum and image
  requests with fixtures; real third-party availability/behaviour is not tested
  (requests are user-initiated only; CSP/offline failure states are unit-tested).
- Web/Edge browsers (Chrome only) and Windows Desktop.
- Structural layout changes: DSH exposes no public density/transcript-width/
  message-flow hook, so those recipes degrade to host/stock and are disclosed in the
  self-check. Style differences are token-level module design.
- `0.2.0-rc.2` has no fresh browser boot in recent rounds (the local installed CLI
  was upgraded); its contract/package gates and earlier live evidence stand.
- Performance evidence is static and first-paint only; switch-latency p95/CLS
  sampling is not archived.

## Reproduce

```bash
pnpm verify
node scripts/acceptance/web.mjs --tgz ./dsh-livery-0.5.0.tgz --out artifacts/acceptance/local
node scripts/acceptance/probe/desktop-probe.mjs --tgz ./dsh-livery-0.5.0.tgz
```

The browser harness creates an isolated `DSH_HOME`, installs the tarball through the
official plugin manager, boots a local server, drives system Chrome via
Playwright, and writes screenshots + `probe.json` under the chosen output directory.
Contract snapshots can be regenerated from a matching DSH install with
`pnpm contract:snapshot -- --dsh-install <path>` (see `docs/design/multi-version.md`).
