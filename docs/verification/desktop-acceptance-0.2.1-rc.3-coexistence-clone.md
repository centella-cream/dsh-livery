# Desktop-profile acceptance evidence — DSH Livery on DSH 0.2.1-rc.3 (Electron app runtime)

Run `2026-10-25T04-02-46-448Z-desktop` · **3 passed / 5 failed / 0 skipped / 1 warnings** · RESULT: FAIL

## Environment

| item | value |
|---|---|
| date | 2026-10-25T04:02:46.448Z |
| Desktop app runtime | 0.2.1-rc.3 (Electron 44.7.0, Node 24.21.0, Chrome 152.0.7977.130) |
| app CLI | `/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh` |
| renderer URL | dsh-app://app/ (window 1280×820, DPR 2) |
| package | dsh-livery@? · tarball sha256 `19dc6895e8986fab1581c2b22da10e0507811e94f5596a2f32a82fe02b60ac0b` |
| certified adapter | 0.2.1-rc.3 / dsh-0.2.1-rc.3-r1 / sha256:d246181d2613… / 11-module table / packaged-app |
| isolated home | `/tmp/dsh-livery-desktop-clone` (outside the repository; deleted after the run unless --keep) |

## Official install acceptance (app-bundled rc.3 runtime)

```text
/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh plugin --profile desktop add file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.1.0.tgz
exit 1 in 290 ms
[WARN] The store at /Users/ryanzhang/Library/pnpm/store/v11 is not used because packages cannot be hard linked from it into this project. Using the store at /private/tmp/.pnpm-store/v11 instead. Set storeDir to choose the store. [ERR_PNPM_UNEXPECTED_STORE] Unexpected store location The dependencies at "/private/tmp/dsh-livery-desktop-clone/profiles/desktop/node_modules" are currently linked from the store at "/Users/ryanzhang/Library/pnpm/store/v11". pnpm now wants to use the store at "/private/tmp/.pnpm-store/v11" to link dependencies. If you want to use the new store location, reinstall your
```

- profile dependencies: `{"dsh-charter":"file:/Users/ryanzhang/Personal/openprojects/dsh-charter/dist/dsh-charter-0.1.0-rc.2.tgz","dsh-context":"^0.74.0","dsh-skin":"link:/Users/ryanzhang/Personal/opensources/deepseek-harness-skin/plugin"}`
- profile bundles: `["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-skin","@deepseek-ai/dsh-experimental-agent-team-profile","dsh-charter","dsh-context"]`
- installed preview profiles: ``
- engines.dsh enforcement (negative control): exit 1, rejected=false
- CLI boot refusal: exit 1 — error: profile "desktop" is managed exclusively by the Electron application

## Renderer checks (real Electron window overs Playwright)

| check | title | result | detail |
|---|---|---|---|
| `desktop.certified-runtime` | app-bundled CLI reports a certified host version | ✅ pass | 0.2.1-rc.3 / dsh-0.2.1-rc.3-r1 / sha256:d246181d2613… / 11-module table / packaged-app |
| `desktop.profile-repaired` | cloned desktop profile needed local dependency-spec repair | ⚠️ warn | dsh-charter: file-replaced (file:/Users/ryanzhang/Personal/openprojects/dsh-charter/dist/dsh-charter-0.1.0-rc.1.tgz → file:/Users/ryanzhang/Personal/openprojects/dsh-charter/dist/dsh-charter-0.1.0-rc.2.tgz) |
| `desktop.official-install` | official rc.3 plugin-manager install accepts the package with no version exemption | ❌ fail | /Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh plugin --profile desktop add file:/Users/ryanzhang/Personal/openprojects/dsh-livery/dsh-livery-0.1.0.tgz → exit 1 in 290ms; dependency=(none); bundles=["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app","dsh-skin","@deepseek-ai/dsh-experimental-agent-team-profile","dsh-charter","dsh-context"]; installed@? |
| `desktop.preview-profiles-installed` | both compiled catalog profiles ship into the installed package | ❌ fail | 0 preview profile dirs: |
| `desktop.engines-enforced` | rc.3 runtime rejects a plugin whose engines.dsh allowlist excludes it (no exemption) | ❌ fail | synthetic 0.2.0-only plugin install → exit 1: [WARN] The store at /Users/ryanzhang/Library/pnpm/store/v11 is not used because packages cannot be hard linked from it into this project. Using the store at /private/tmp/.pnpm-store/v11 instead. Set storeDir to choose the store. [ERR_PNPM_UNEXPECTED_STORE] Unexpected store location The dependencies at "/private/tmp/dsh |
| `desktop.cli-refuses-boot` | CLI boot of the desktop composition is refused (Electron-managed profile) | ✅ pass | dsh --profile desktop --no-open → exit 1: error: profile "desktop" is managed exclusively by the Electron application |
| `desktop.renderer-launches` | real Electron renderer launches under the isolated app runtime | ✅ pass | url=dsh-app://app/ title="DeepSeek Harness" Electron=44.7.0 Node=24.21.0 Chrome=152.0.7977.130 dpr=2 window=1280x820 |
| `desktop.boot-graph-row` | boot graph lists the dsh-livery client module | ❌ fail | rev=6213f808c967; entries=76; dsh-livery=false |
| `desktop.probe` | desktop probe completes | ❌ fail | Error: could not fetch the catalog from the desktop renderer: status 404 at main (file:///Users/ryanzhang/Personal/openprojects/dsh-livery/scripts/probe/desktop-probe.mjs:369:31) |

## Screenshots (renderer web contents only)


## Honest scope statement — what this proves and what it does not

**Verified:** the shipped tarball installs through the official rc.3 plugin manager with no version exemption; the bundled Electron application (0.2.1-rc.3, Electron 44.7.0, Node 24.21.0) renders the real desktop shell; the Livery client module is in the boot graph; the catalog route reports the certified rc.3 adapter and the shared 0.2.1 catalog profile; settings gallery, preview/cancel, apply-persist, reload boot handshake, light/dark tokens, documented font role hooks, first-paint samples and stock restore all behave in the real desktop renderer.

**NOT verified (explicit):** native macOS window chrome (traffic lights/leading), vibrancy/transparency, Dock/rightbar native window states, OS-level DPI scaling beyond `window.devicePixelRatio`, and behaviour of the packaged Chromium sandbox/GPU path (the probe had to pass `--no-sandbox --disable-gpu` to run inside this file-sandboxed automation session). The desktop profile itself cannot be booted by the CLI; all runtime evidence comes from the Electron application. `desktop.macos` therefore remains **pending** in the support matrix — adapted, runtime verification partial.

## Known limitations

- NATIVE-WINDOW SCOPE: screenshots are renderer web contents only; native macOS window chrome (traffic lights, leading padding), vibrancy/transparency, Dock/rightbar window states and any OS-level DPI scaling behaviour are NOT verified by this probe.
- The desktop profile cannot be booted by the CLI ("profile desktop is managed exclusively by the Electron application"); runtime evidence comes from launching the real Electron application with an isolated DSH_HOME/user-data-dir and driving its renderer over Playwright.
- Chromium renderer required --no-sandbox --disable-gpu in this file-sandboxed session; behaviour under the packaged sandbox/GPU path is not exercised here.
- Coexistence with third-party first-paint plugins is only observed when --profile-mode clone is used; conflicts are recorded, never hidden.

---

_Generated by `scripts/probe/desktop-probe.mjs`. Artifacts: `artifacts/acceptance/0.2.1-rc.3-desktop/`._
