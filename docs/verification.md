# Verification

DSH Livery is validated against **exact, frozen host builds** and refuses to style
anything it has not been certified against. This page summarises the current
evidence and how to reproduce it. Raw screenshots/probes are generated locally under
`artifacts/` (not committed).

## Host matrix (release 0.3.0)

| Target | Result | What it covers |
|---|---|---|
| DSH `0.2.1-rc.2`, Web Profile, isolated full run | **139 pass / 0 fail / 3 skip / 2 warn** | official install + lifecycle, boot gate, handshake, catalog/previews, 24-card gallery, preview/apply/restore, self-check, fonts/theme, style differences, unpause + residue |
| DSH `0.2.1-rc.2`, Web Profile, clone of a real user profile | **140 / 0 / 3 / 3** | same as above in a realistic composition (charter/context/vscode-bridge etc.) |
| DSH `0.2.1-rc.3`, Desktop packaged runtime (web carrier) | **139 / 0 / 3 / 2** | packaged-app adapter, its own Node/Electron runtime, same browser checks |
| DSH `0.2.1-rc.3`, Desktop Profile, real Electron renderer | **22 / 0 / 1** | real Electron app: boot graph, catalog identity, 24-card panel, preview/apply/persist, relaunch boot payload, light/dark tokens, font hooks, self-check, sidebar entry |

Skipped/warned checks are documented in the local run reports (stock-boot handshake
rows re-asserted after Apply; grouped-bundle URL deviation; clone composition
warnings; native pre-paint sampling on the Electron path).

Repo gates on the same tree:

- `tsc --noEmit` clean, `vitest run` 35 files / 588 tests green.
- `liveries:check`: 204 generated files across 2 catalog profiles.
- Token coverage: 146/80 covered (0.2.0 profile), 144/78 (0.2.1 profile), 0 missing.
- Contrast: 2,832 assertions per profile, 0 failures.
- Per-livery CSS: 8,134–11,778 B (hard cap 12,288 B).
- Loader ABI: 12/12 checks; adapter allowlist and pack checks green.

## What is verified

- Exact host version + adapter id + contract hash + catalog profile on the wire.
- Byte equality: first-frame CSS ↔ catalog CSS ↔ body hash; shared catalog profile
  is byte-identical between `0.2.1-rc.2` and `0.2.1-rc.3`.
- 24 styles × 2 profiles: gallery, preview, single-mutation Apply, persistence,
  restore stock, uninstall/restart residue.
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
- Web/Edge browsers (Chrome only) and Windows Desktop.
- Structural layout changes: DSH exposes no public density/transcript-width/
  message-flow hook, so those recipes degrade to host/stock and are disclosed in the
  self-check. Style differences are token-level module design.
- `0.2.0-rc.2` has no fresh round-5 browser boot (the local installed CLI was
  upgraded); its contract/package gates and earlier live evidence stand.
- Performance evidence is static and first-paint only; switch-latency p95/CLS
  sampling is not archived.

## Reproduce

```bash
pnpm verify
node scripts/acceptance/web.mjs --tgz ./dsh-livery-0.3.0.tgz --out artifacts/acceptance/local
node scripts/acceptance/probe/desktop-probe.mjs --tgz ./dsh-livery-0.3.0.tgz
```

The browser harness creates an isolated `DSH_HOME`, installs the tarball through the
official plugin manager, boots a local server, drives system Chrome via
Playwright, and writes screenshots + `probe.json` under the chosen output directory.
Contract snapshots can be regenerated from a matching DSH install with
`pnpm contract:snapshot -- --dsh-install <path>` (see `docs/design/multi-version.md`).
