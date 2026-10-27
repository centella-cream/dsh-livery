# Desktop-profile acceptance evidence — DSH Livery on DSH 0.2.1-rc.3 (Electron app runtime)

Run `2026-10-27T03-38-45-328Z-desktop` · **27 passed / 0 failed / 1 skipped / 0 warnings** · RESULT: PASS

**Scope (explicit):** this run covers DSH 0.2.1-rc.3 + Desktop Profile + macOS + the real Electron renderer. Web Profile/Chrome on DSH 0.2.1-rc.2 is covered by separate Web evidence; Windows and Web Edge are not-supported. The native macOS window shell (traffic lights/leading, vibrancy, Dock/rightbar, OS DPI) is host-owned and outside plugin certification scope.

## Environment

| item | value |
|---|---|
| date | 2026-10-27T03:38:45.327Z |
| Desktop app runtime | 0.2.1-rc.3 (Electron 44.7.0, Node 24.21.0, Chrome 152.0.7977.130) |
| app CLI | `<system-app> Harness.app/Contents/Resources/runtime/cli/bin/dsh` |
| renderer URL | dsh-app://app/ (window 1280×820, DPR 2) |
| package | dsh-livery@0.1.1 · tarball sha256 `8af4da38a66aeb75b8e9b30f89614cf95e856d71dcd3c77e9716d10aabfe3489` |
| commit | 898938d765c408a09f820c46596cdb2d5c66a4ae |
| tarball bytes | 2147289 |
| certified adapter | 0.2.1-rc.3 / dsh-0.2.1-rc.3-r1 / sha256:d246181d2613… / 11-module table / packaged-app |
| isolated home | `<tmp>` (outside the repository; deleted after the run unless --keep) |

## Official install acceptance (app-bundled rc.3 runtime)

```text
<system-app> Harness.app/Contents/Resources/runtime/cli/bin/dsh plugin --profile desktop add file:dsh-livery-0.1.1.tgz
exit 0 in 454 ms
[WARN] The store at <local> is not used because packages cannot be hard linked from it into this project. Using the store at <tmp> instead. Set storeDir to choose the store. Progress: resolved 0, reused 1, downloaded 0, added 0 Packages: +1 + Packages are cloned from the content-addressable store to the virtual store. Content-addressable store is at: <tmp> Virtual store is at: node_modules/.pnpm Progress: resolved 1, reused 1, downloaded 0, added 1, done dependencies: + dsh-livery 0.1.1 Done in 284ms using pnpm v11.2
```

- profile dependencies: `{"dsh-livery":"file:dsh-livery-0.1.1.tgz"}`
- profile bundles: `["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","@deepseek-ai/dsh-experimental-agent-team-profile","dsh-livery"]`
- installed preview profiles: `sha256:d369c1f14a8c04e31b44ce3922b09d4583e7e88164a0bbae342dec719201b8a0`
- engines.dsh enforcement (negative control): exit 1, rejected=true
- CLI boot refusal: exit 1 — error: profile "desktop" is managed exclusively by the Electron application

## Renderer checks (real Electron window overs Playwright)

| check | title | result | detail |
|---|---|---|---|
| `desktop.certified-runtime` | app-bundled CLI reports a certified host version | ✅ pass | 0.2.1-rc.3 / dsh-0.2.1-rc.3-r1 / sha256:d246181d2613… / 11-module table / packaged-app |
| `desktop.official-install` | official rc.3 plugin-manager install accepts the package with no version exemption | ✅ pass | <system-app> Harness.app/Contents/Resources/runtime/cli/bin/dsh plugin --profile desktop add file:dsh-livery-0.1.1.tgz → exit 0 in 454ms; dependency=file:dsh-livery-0.1.1.tgz; bundles=["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","@deepseek-ai/dsh-experimental-agent-team-profile","ds |
| `desktop.preview-profiles-installed` | the shared compiled catalog profile ships (both certified adapters share it) | ✅ pass | 1 preview profile dir(s): sha256:d369c1f14a8c04e31b44ce3922b09d4583e7e88164a0bbae342dec719201b8a0 |
| `desktop.engines-enforced` | rc.3 runtime rejects a plugin whose engines.dsh allowlist excludes it (no exemption) | ✅ pass | synthetic 0.2.0-only plugin install → exit 1: [WARN] The store at <local> is not used because packages cannot be hard linked from it into this project. Using the store at <tmp> instead. Set storeDir to choose the store. ? Verifying lockfile against supply-chain policies (1 entry)... ✓ Lockfile passes supply-ch |
| `desktop.cli-refuses-boot` | CLI boot of the desktop composition is refused (Electron-managed profile) | ✅ pass | dsh --profile desktop --no-open → exit 1: error: profile "desktop" is managed exclusively by the Electron application |
| `desktop.renderer-launches` | real Electron renderer launches under the isolated app runtime | ✅ pass | url=dsh-app://app/ title="DeepSeek Harness" Electron=44.7.0 Node=24.21.0 Chrome=152.0.7977.130 dpr=2 window=1280x820 |
| `desktop.boot-graph-row` | boot graph lists the dsh-livery client module | ✅ pass | rev=45c6c38ce0fc; entries=74; dsh-livery=true |
| `desktop.catalog-identity` | desktop catalog route reports the certified rc.3 identity and shared 0.2.1 catalog profile | ✅ pass | 0.2.1-rc.3 / dsh-0.2.1-rc.3-r1 / sha256:d246181d2613… / 11-module table / packaged-app; 24 liveries; previewsBase=/livery/assets/previews/sha256:d369c1f14a8c04e31b44ce3922b09d4583e7e88164a0bbae342dec719201b8a0/ |
| `desktop.stock-start` | stock default boots with no livery attributes or skin styles | ✅ pass | data-dsh-livery=null; skinStyles=0; themeSource=system; lang=zh-CN |
| `desktop.sidebar-entry` | Livery is registered as a left-sidebar plugin navigation row in the desktop shell | ✅ pass | row #2 label "视觉风格" panellistSlot=true icon=true |
| `desktop.main-panel` | selecting the sidebar row opens the Visual Style main panel (h1 matches, conversation replaced) in the desktop shell | ✅ pass | via=sidebar-panellist panelVisible=true conversationVisible=false selected="视觉风格" h1="视觉风格" |
| `desktop.gallery` | desktop Visual Style panel renders the 24 compiled styles | ✅ pass | 24 cards: fjord, plum, linen, nord, solarized, catppuccin, rose-pine, moss, everforest, celadon, rice-paper, deep-sea, kanagawa, flexoki, amber-dusk, sakura, gruvbox, ayu, cinnabar, dracula, tokyo-night, graphite, midnight, one-dark |
| `desktop.preview-locale` | desktop gallery exposes the preview-language tab with Follow DSH active and zh thumbnails | ✅ pass | tab found=true; buttons=[follow*,zh,en]; thumb locales=["zh"] |
| `desktop.preview-locale-en` | desktop preview-language tab pins thumbnail URLs to -en- without touching copy | ✅ pass | 24 thumbs; locales=["en"] |
| `desktop.preview-locale-zh` | desktop preview-language tab pins thumbnail URLs back to -zh- | ✅ pass | 24 thumbs; locales=["zh"] |
| `desktop.gallery-families` | desktop gallery renders page tabs and all six non-empty family sections in display order | ✅ pass | sections=[calm:7, nature:3, light:4, retro:5, vivid:2, dark:3]; expected=[calm:7, nature:3, light:4, retro:5, vivid:2, dark:3] |
| `desktop.wallpaper` | desktop wallpaper studio applies a built-in CSS layer through the owned stylesheet | ✅ pass | builtins=24; attr=; marker=dsh-livery/wallpaper; selected=aurora |
| `desktop.preview` | previewing a different livery updates desktop body attributes and tokens transiently | ✅ pass | body attr null → plum; bg=#f7f2f5 (expected sample rgb(247, 242, 245)) |
| `desktop.preview-cancel` | cancel restores the confirmed desktop state | ✅ pass | body attr=null |
| `desktop.apply-persists` | apply writes exactly one livery config mutation into the isolated desktop profile patch | ✅ pass | patch skinId=fjord (before (none)); rows=1 |
| `desktop.boot-injection` | fresh desktop application launch delivers the certified rc.3 first-frame boot payload for the persisted skin | ✅ pass | boot payload available 1214 ms after launch: accepted hostVersion=0.2.1-rc.3 adapterId=dsh-0.2.1-rc.3-r1 profileKind=desktop skinId=fjord cssHash=sha256:cc8551943e49cb054… |
| `desktop.hash-equality` | desktop body hash equals the handshake cssHash and the compiled catalog cssHash | ✅ pass | body=sha256:cc8551943e49cb054… handshake=sha256:cc8551943e49cb054… catalog=sha256:cc8551943e49cb054… |
| `desktop.theme-light` | desktop light tokens match the compiled catalog values | ✅ pass | actual=["rgb(240, 243, 246)","rgb(27, 39, 51)","rgba(0, 0, 0, 0.04)"] expected=["rgb(240, 243, 246)","rgb(27, 39, 51)","rgba(0, 0, 0, 0.04)"] |
| `desktop.theme-dark` | desktop follows host dark mode with the livery dark tokens without changing the host preference | ✅ pass | darkAttr="" themeSource=system actual=["rgb(24, 28, 33)","rgb(238, 242, 246)","rgba(255, 255, 255, 0.06)"] expected=["rgb(24, 28, 33)","rgb(238, 242, 246)","rgba(255, 255, 255, 0.06)"] |
| `desktop.font-role-hooks` | desktop renderer applies the documented 0.2.1 font role hooks (--dsh-font-family-text/-code) | ✅ pass | --dsh-font-family-text="Hiragino Sans GB","PingFang SC","Noto Sans CJK SC","Microsoft YaHei UI",sans-serif; --dsh-font-family-code="SFMono-Regular",Consolas,"Liberation Mono","Noto Sans Mono CJK SC",monospace |
| `desktop.first-paint-sampling` | first painted desktop frames carry the livery styling | ⏭️ skip | the desktop host injects first-frame rows through its internal boot-ready handshake; Playwright attaches after window creation, so pre-paint rAF frames cannot be sampled on the native startup path. Web-profile filmstrip covers the same renderer code path; boot payload availability is asserted instead. |
| `desktop.self-check` | self-check shows the rc.3 identity and reports host-font-role-hooks available | ✅ pass | hostVersion shown=true adapter shown=true host-font-role-hooks=true |
| `desktop.restore-stock` | restore stock removes the livery from the desktop renderer | ✅ pass | data-dsh-livery=null; hash=null; styles=0 |

## Screenshots (renderer web contents only)

- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-stock-desktop.png` (stock)
- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-panel-gallery-desktop.png` (panel-gallery)
- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-gallery-preview-en-desktop.png` (gallery-preview-en)
- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-gallery-preview-zh-desktop.png` (gallery-preview-zh)
- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-wallpaper-desktop.png` (wallpaper-builtin)
- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-preview-desktop.png` (previewing)
- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-applied-desktop.png` (applied)
- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-applied-dark-desktop.png` (applied-dark)
- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-applied-desktop-reload.png` (applied-after-relaunch)
- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-selfcheck-desktop.png` (selfcheck)
- `artifacts/acceptance/pkg-0.1.1-r1/desktop-0.2.1-rc.3/screens/zh-stock-restored-desktop.png` (stock-restored)

## Honest scope statement — what this proves and what it does not

**Verified:** the shipped tarball installs through the official rc.3 plugin manager with no version exemption; the bundled Electron application (0.2.1-rc.3, Electron 44.7.0, Node 24.21.0) renders the real desktop shell; the Livery client module is in the boot graph; the catalog route reports the certified rc.3 adapter and the shared 0.2.1 catalog profile; settings gallery, preview/cancel, apply-persist, reload boot handshake, light/dark tokens, documented font role hooks, first-paint samples and stock restore all behave in the real desktop renderer.

**NOT verified (explicit):** native macOS window chrome (traffic lights/leading), vibrancy/transparency, Dock/rightbar native window states, OS-level DPI scaling beyond `window.devicePixelRatio`, and behaviour of the packaged Chromium sandbox/GPU path (the probe had to pass `--no-sandbox --disable-gpu` to run inside this file-sandboxed automation session). The desktop profile itself cannot be booted by the CLI; all runtime evidence comes from the Electron application. `desktop.macos` therefore remains **pending** in the support matrix — adapted, runtime verification partial.

## Known limitations

- NATIVE-WINDOW SCOPE: screenshots are renderer web contents only; native macOS window chrome (traffic lights, leading padding), vibrancy/transparency, Dock/rightbar window states and any OS-level DPI scaling behaviour are NOT verified by this probe.
- The desktop profile cannot be booted by the CLI ("profile desktop is managed exclusively by the Electron application"); runtime evidence comes from launching the real Electron application with an isolated DSH_HOME/user-data-dir and driving its renderer over Playwright.
- Chromium renderer required --no-sandbox --disable-gpu in this file-sandboxed session; behaviour under the packaged sandbox/GPU path is not exercised here.
- Coexistence with third-party first-paint plugins is only observed when --profile-mode clone is used; conflicts are recorded, never hidden.

---

_Generated by `scripts/acceptance/probe/desktop-probe.mjs`. Artifacts: `artifacts/acceptance/0.2.1-rc.3-desktop/`._
