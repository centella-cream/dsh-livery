# Style-system v2 acceptance evidence — DSH Livery 0.3.0 (24 visual styles, 视觉风格 / Visual Style)

Shipped package: `dsh-livery-0.3.0.tgz` sha256
`f06ee765bb10363fb0ed6008e4667cc672e6e8c4c7ad4dba11da32b49e6ad950` (527,683 B).

Repack note: this is the final pack after a packaged-README update. Runtime bytes
are byte-identical to the first pack (`a225849a…`): `lib/index.js`,
`lib/client.js`, `schemas/livery.schema.json`, `package.json`, `NOTICE.md` all
match the pre-repack build installed in the real Web profile; only `README.md`
differs. The matrix below is the re-run on `f06ee765…` and reproduces the
pre-repack results exactly. Pre-repack evidence:
`artifacts/acceptance/pre-repack-a225849a/`.

This document summarises the round-5 evidence; the authoritative per-check results are in each
target's `probe.json` (paths below). The full reports are the auto-filled `docs/verification/*-pkg0.3.0.md` files.

## Matrix

| target | pass / fail / skip / warn | evidence dir | report |
|---|---|---|---|
| Web 0.2.1-rc.2 isolated full | **139 / 0 / 3 / 2** | `artifacts/acceptance/pkg-0.3.0/web-0.2.1-rc.2/` | [web-acceptance-0.2.1-rc.2-pkg0.3.0.md](web-acceptance-0.2.1-rc.2-pkg0.3.0.md) |
| Web real-profile clone | **140 / 0 / 3 / 3** | `artifacts/acceptance/pkg-0.3.0/web-real-profile-clone/` | [web-acceptance-0.2.1-rc.2-real-profile-clone-pkg0.3.0.md](web-acceptance-0.2.1-rc.2-real-profile-clone-pkg0.3.0.md) |
| 0.2.1-rc.3 packaged web carrier | **139 / 0 / 3 / 2** | `artifacts/acceptance/pkg-0.3.0/web-carrier-0.2.1-rc.3/` | [web-acceptance-0.2.1-rc.3-runtime-carrier-pkg0.3.0.md](web-acceptance-0.2.1-rc.3-runtime-carrier-pkg0.3.0.md) |
| 0.2.1-rc.3 real Electron renderer | **22 / 0 / 1** | `artifacts/acceptance/pkg-0.3.0/desktop-0.2.1-rc.3/` | [desktop-acceptance-0.2.1-rc.3-pkg0.3.0.md](desktop-acceptance-0.2.1-rc.3-pkg0.3.0.md) |

## Label rename (视觉风格 / Visual Style) — asserted in every Web run

- `nav.sidebar-entry` — sidebar row aria-label 视觉风格 (icon + sidebar.panellist slot): **pass** — row #2 aria-label "视觉风格" icon=true panellistSlot=true (page locale zh)
- `nav.main-panel` — main-panel page h1 视觉风格: **pass** — row selected=true; main panel visible=true; selected row "视觉风格"; page h1 "视觉风格" (expected "视觉风格")
- `search.accessible-name` — search accessible name 搜索视觉风格: **pass** — search accessible name "搜索视觉风格" (expected "搜索视觉风格")
- `gallery.aria-label` — gallery region aria-label 视觉风格画廊: **pass** — aria-label="视觉风格画廊" (expected "视觉风格画廊")
- `locale.en-gallery` — English shell shows the Visual Style row/page: **pass** — sidebar row label "Visual Style" (expected "Visual Style"); via=sidebar-panellist

Unchanged copy is still asserted through the old checks (restore 恢复默认外观, cancel 取消预览,
self-check 自检, copy diagnostics 复制诊断信息, current/previewing/Light/Dark/stock name).
The empty state (没有匹配的视觉风格), loading (正在加载视觉风格…), unavailable/degraded/write-refused
copy changes are carried in the harness label table; the exercised paths are the normal gallery,
search-empty and write-success states (failure-state copy is unit-tested by the client).

## Counts and budgets (served catalog, all Web targets)

- `catalog.gallery-size`: **pass** — 24 liveries: fjord, plum, amber-dusk, moss, graphite, rice-paper, deep-sea, sakura, midnight, linen, nord, dracula, gruvbox, solarized, catppuccin, tokyo-night, rose-pine, everforest, kanagawa, one-dark, ayu, flexoki, celadon, cinnabar
- `previews.assets-served`: **pass** — 96/96 preview assets HTTP 200 image/svg+xml under /livery/assets/previews/sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50/ (24 liveries × zh/en × light/dark)
- `catalog.css-budget`: **pass** — max 8892 B (tokyo-night); budget 12288 B across 24 liveries
- `catalog.style-vocabulary`: **pass** — surfaceStyles=7 [soft, rounded, elevated, paper, sharp, glass, flat]; en UI stacks=5; zh content stacks=3; family coverage shape=24 elevation=24 material=2 border=12 / 24
- `gallery.cards`: **pass** — 24 livery card(s) (catalog 24); stock card=false (optional; stock appearance is reachable through the restore action); ids: fjord, plum, amber-dusk, moss, graphite, rice-paper, deep-sea, sakura, midnight, linen, nord, dracula, gruvbox, solarized, catppuccin, tokyo-night, rose-pine, everforest, kanag

Per-livery CSS: 24 liveries, max **8,892 B** (tokyo-night) on the shared 0.2.1 catalog profile —
under the 12,288 B hard cap (the 0.2.0 profile's build-time worst is ~10.6 KiB, also under the cap).
The small-font/scale metric overrides are included in those bytes; the 8 KiB *target* is exceeded
by the active palette (8,248 B at fjord), recorded as the accepted `css.size-target` warning.

## Real host-level style differences (not just token text)

Contrasting styles are activated through the real UI (Apply button; transient preview in read-only
mode), then the host is measured:

- `style.candidates`: **pass** — 4 styles: graphite[sharp, sf mono], catppuccin[rounded, sf pro rounded], rice-paper[paper, iowan old style], tokyo-night[glass, sf mono] (applied via UI)
- `style.host-radius`: **pass** — max spread 26px on composerShell: [graphite=10px, catppuccin=32px, rice-paper=18px, tokyo-night=36px]
- `style.host-font`: **pass** — 2 distinct computed stacks; first families: [graphite=pingfang sc, catppuccin=pingfang sc, rice-paper=songti sc, tokyo-night=pingfang sc]
- `style.host-elevation`: **pass** — 10 distinct shadow values; samples: [graphite/composer=none | graphite/composerShell=rgba(0, 0, 0, 0.16) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.03) 0px 4px 16px 0px, rgba(0, 0, 0, 0.03) 0px 0px 24px 0px | graphite/sendButton=none | graphite/newSessionButton=none | graphite/navRow=none | graphite/--dsw-shadow-lv1=0 1px 0 0 #00000014 | graphite/--dsw-elevation-panel=0 0 0 .5px #00000047, 0 3px 8px 0 #00000008, 0 0 16px 0 #
- `style.material-glass`: **pass** — glass candidate=tokyo-night; computed backdrop-filter=false; --dsw-menu-backdrop-filter=blur(40px) saturate(150%); declared material tokens=--dsw-mask-blur
- `style.cascade-tokens`: **pass** — graphite: 6/10 style tokens computed identically; catppuccin: 8/13 style tokens computed identically; rice-paper: 13/13 style tokens computed identically; tokyo-night: 9/14 style tokens computed identically
- `style.screenshots`: **pass** — 8 style screenshot(s) for 4 style candidate(s)

Measured values (0.2.1-rc.2 web isolated):

| style | surface recipe | en UI stack | composer-shell radius | computed body first family |
|---|---|---|---|---|
| `graphite` | sharp | SF Mono | 10 px | PingFang SC |
| `catppuccin` | rounded | SF Pro Rounded | 32 px | PingFang SC |
| `rice-paper` | paper | Iowan Old Style | 18 px | Songti SC (serif) |
| `tokyo-night` | glass | SF Mono | 36 px | PingFang SC |

Evidence screenshots per Web target: 8 style images (panel view + conversation view for each of
graphite / catppuccin / rice-paper / tokyo-night) under `artifacts/acceptance/pkg-0.3.0/<target>/screens/`.

## Honest scope / not verified

- DSH still exposes no public density / transcript-width / message-flow hook, so visual
  differences are **palette + typography + background material + module shape/elevation only**;
  layout structure stays host/stock and the self-check reports the unavailable capabilities.
- `0.2.0-rc.2` host was not re-booted this round: the installed npm CLI is now 0.2.1-rc.2, so that
  host build cannot be started from this workspace. Its catalog profile is still compiled and
  exercised by the package gates (`liveries:check`, `loader-ABI`, `adapter:check`, `pack:check`);
  the earlier 0.2.0-rc.2 runtime acceptance (round 3) remains the runtime evidence for that host.
- Desktop native window chrome (traffic lights/leading, vibrancy, Dock/DPI) remains unverified;
  the rc.3 Electron renderer evidence is renderer-only (same as round 3/4).
- Read-only `--reuse` style verification (if used) previews styles transiently instead of
  persisting them; the isolated/clone runs use the real Apply path.

---

_Generated from the archived probe.json evidence by the verifier for round 5._
