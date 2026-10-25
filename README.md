# DSH Livery

Contract-bound color, typography, surface and safe-layout liveries for
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
Certified host builds (exact versions, no wildcards): **0.2.0-rc.2**,
**0.2.1-rc.2**, **0.2.1-rc.3**.

DSH Livery is a style renderer, not a theme owner: it never registers a host
theme, never calls `setTheme`, never touches `data-ds-*` attributes, and never
redraws window chrome. It injects one scoped semantic token pair per livery
(`light`/`dark`) for the first frame, hands the same bytes to the client
presenter, and restores stock immediately when disabled.

* Targets: DSH `0.2.0-rc.2` (`dsh-0.2.0-rc.2-r1`), `0.2.1-rc.2`
  (`dsh-0.2.1-rc.2-r1`), `0.2.1-rc.3` Desktop app runtime (`dsh-0.2.1-rc.3-r1`).
  Compatibility is decided by exact version + adapter id + frozen contract hash;
  unknown hosts fail closed to stock.
* Profiles: Web Profile certified for Chrome on `0.2.0-rc.2` and `0.2.1-rc.2`.
  The Desktop app runtime (`0.2.1-rc.3`) is adapted and passes the official
  plugin-manager install acceptance; full Electron-rendered runtime certification
  is tracked in `contracts/dsh/support-matrix.proposed.json` and not claimed.
* Per-version rendering: `0.2.0-rc.2` overrides the `--dsw-*` semantic token
  ladder; `0.2.1` uses the documented host font role hooks
  (`--dsh-font-family-text/code`) and a separate compiled catalog profile, shared
  byte-identically by the two 0.2.1 builds.
* Languages: `zh` / `en`.
* **24 built-in dual-mode liveries** designed across five visual axes: palette,
  typography (10 local-only font stacks + type-scale metrics), module shape
  (`--dsw-radius-*` / `--dsw-corner-shape`), elevation/material
  (shadows, `none`-shadow paper styles, glass backdrop blur) and border
  treatment. 12 palettes are inspired by permissively licensed open-source themes
  (see `NOTICE.md`), 10 are original, and 2 are original Chinese-aesthetic
  designs (青瓷 Celadon, 朱砂 Cinnabar). The compiler derives full light/dark
  token pairs from four seed colors per mode and gates every palette on a
  contrast matrix (2 832 assertions per profile, 0 failures).

## Install (Web Profile)

```bash
pnpm build
pnpm pack
dsh plugin --profile web add ./dsh-livery-0.3.0.tgz   # Web Profile (0.2.0-rc.2 / 0.2.1-rc.2)
dsh web                                               # then open the printed URL
# Desktop Profile 0.2.1-rc.3: install through the Desktop app's plugin manager
# (the app runtime enforces the exact engines.dsh allowlist at install time).
```

### Where to find it

After installing, open DSH and look at the **left sidebar above the Workspace
section**: the entry sits in the plugin-navigation group next to 插件 /
自动化任务 / 上下文洞察 (zh: **视觉风格**, en: **Visual Style**). Click it to open
the full-page gallery with 24 styles, search/tag filters, preview, apply, restore
and self-check — it is no longer inside the Settings page. The module shapes,
typography, elevation and background material change with the selected style.

Panel navigation exists since DSH `0.1.5-alpha.2` (first release line
`0.1.5-rc.1`). On hosts without it the plugin automatically falls back to the
legacy Settings page entry (设置 → 皮肤); certified hosts always use the sidebar
entry.

Picking a style is transactional: preview is transient, Apply performs one config
mutation, and Restore default appearance removes it. The module shapes,
typography, elevation and background material change with the selected style.

## Develop

```bash
pnpm install
pnpm typecheck && pnpm test
pnpm liveries:compile
pnpm audit:css && pnpm audit:contrast && pnpm audit:tokens
pnpm build
pnpm pack:check
node scripts/acceptance-web.mjs --tgz ./dsh-livery-0.3.0.tgz
```

The Web-profile acceptance harness creates an isolated `DSH_HOME` under
`.tmp/acceptance/`, installs the packed tarball through the official
`dsh plugin --profile web add` path, boots an isolated server, drives Chrome via
Playwright, and archives screenshots + `probe.json` under
`artifacts/acceptance/`. Desktop hosts are snapshotted from the packaged
Electron `app.asar` via `scripts/prepare-desktop-contract.mjs` (runtime bytes)
supplemented with the same published version's type documents, then certified
adapter-by-adapter and exercised through the Desktop app's official plugin
manager path.

## Contract

See [docs/implementation/interfaces.md](docs/implementation/interfaces.md) and
`contracts/dsh/0.2.0-rc.2/`. Compatibility is decided by six frozen contract
hashes, not by a version range; an unknown or mismatching host fails closed to
stock with a structured diagnostic.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
