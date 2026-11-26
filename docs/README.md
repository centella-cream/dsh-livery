# Documentation

**`0.2.3` is the current release (`dsh-livery@0.2.3`).** The authoritative
support policy is `contracts/dsh/support-matrix.json`; the exact accepted artifact
and probe evidence are recorded in `contracts/dsh/evidence/0.2.3/` and
`docs/verification.md`.

`0.2.3` adds two keyless direct-display sources (Cleveland Museum of Art, The
Met), data-driven Host provider manifests, a dedicated direct `<img>` layer, the
legacy-Openverse notice, and the `0.2.2 → 0.2.3` update transition. It keeps the
same 13 declared scopes as `0.2.2`.

## Livery 0.2.3 acceptance scope

This table records the DSH host builds against which the **`0.2.2` artifact** was
accepted against the formal support policy (see
`contracts/dsh/support-matrix.json` and [multi-version policy](design/multi-version.md)
for stable vs preview rules).

| Host | Scope | Status (Livery `0.2.3`) |
|---|---|---|
| DSH `0.2.1-rc.2` | Web Profile, Chrome 156.0.8078.48, Node 22.23.1 | Stable certified (npm `latest`); Web accepted |
| DSH `0.2.1-rc.3` | Desktop app, macOS, Electron/Node 24.21.0, Chromium 152.0.7977.130 | Stable certified renderer surface (GitHub-tagged); Desktop accepted |
| DSH `0.2.1-rc.4` | Web Profile, Chrome 156.0.8078.48, Node 22.23.1 | Preview (npm `next`; GitHub prerelease tag); Web accepted |
| DSH `0.2.1-rc.5` | Web Profile + Desktop macOS, Chrome 156.0.8078.48 / Chromium 152.0.7977.130, Node 22.23.1 / 24.21.0 | Preview (npm `latest`); Web + Desktop accepted |
| DSH `0.2.2-rc.1` | Web Profile + Desktop macOS, Chrome 156.0.8078.48 / Chromium 152.0.7977.130, Node 22.23.1 / 24.21.0 | Preview (npm `latest`); Web + Desktop accepted |
| DSH `0.2.2-rc.2` | Web Profile + Desktop macOS, Chrome 156.0.8078.48 / Chromium 152.0.7977.130, Node 22.23.1 / 24.21.0 | Preview (npm `next`); Web + Desktop accepted |
| DSH `0.2.2-rc.3` | Web + Desktop macOS, Chrome 156.0.8078.48 / Electron 44.7.0 / Node 24.21.0 / Chromium 152.0.7977.130 | Preview (npm `next`); Web + Desktop accepted |
| DSH `0.2.2-rc.5` | Web + Desktop macOS, Chrome 156.0.8078.48 / Electron 44.7.0 / Node 22.23.1 / 24.21.0 / Chromium 152.0.7977.130 | Preview (npm `latest`); Web + Desktop accepted |

These are eight host adapters and 13 scopes (7 Web + 6 Desktop). `0.2.3` keeps the
same host set: it is a client/Host release with no new host adapter, plus one
accepted `0.2.2 → 0.2.3` Web update transition under `0.2.2-rc.5`. DSH Desktop
Windows, Web Edge and any other DSH build are not supported.

## Current documents

- **[Verification](verification.md)** — release scope, exact artifact binding,
  acceptance matrix, known limitations and reproduction commands.
- **[0.2.0 visual language](design/0.2.0-visual-language.md)** — CJK font
  choices, label hierarchy, L5a decoration, border boundaries and sidebar
  readability.
- **[Wallpaper workbench layout](design/wallpaper-workbench.md)** — responsive breakpoints, equal-height rules and online-wallpaper visual policy.
- **[Interfaces and architecture](design/interfaces.md)** — module boundaries,
  frozen host/client handshake, generated artifacts and build outputs.
- **[Compatibility architecture](design/compatibility.md)** — exact evidence, shared catalog profiles and reviewed fallback boundaries.
- **[Multi-version policy](design/multi-version.md)** — API compatibility range, exact evidence, stable
  vs next-preview rules, how to add a DSH release without dropping older ones.
- **[Style system](design/style-system.md)** — the 28 styles across palette,
  typography, shape, material and type scale.
- **[Host contrast audit](design/host-contrast-audit.md)** — host-component token pairs checked against the stock host, with the badge/send/error regressions fixed for 0.2.3.
- **[Style gallery and GUI recipes](design/style-gallery.md)** — compact catalog,
  style-DNA labels and the terminal/brutal/pill/editorial surface recipes.
- **[Design references](research/design-references.md)** — palette attributions
  and the machine-readable [28-style table](research/design-table.json).

## Current design

- **[0.2.0 proposal](design/0.2.0-proposal.md)** — 0.2.0 multi-axis GUI style
  engine, capability gating, manifest v2 and the host APIs needed for structural
  layout. Shipped in the 0.2.0 release (2026-11-21); historical, not current behavior.
- **[0.2.2 implementation record](design/0.2.2-plan.md)** — shipped 0.2.2
  wallpaper studio, provider registry, stale-boot HMR handshake and plugin-detail
  surface; retained as the design/acceptance record.
- **[Plugin detail surface](design/plugin-detail-surface.md)** — 0.2.2 detail
  slots, observable-facts section, truthful actions and update-boundary copy.
  Slot proof covers 6 of 8 hosts: `0.2.1-rc.2` (Web) is covered by the runtime
  detail check; `0.2.1-rc.3` (Desktop) has no runtime detail check, so it is a
  documented per-scope limitation, not a passed claim.
- **[0.2.3 plan](design/0.2.3-plan.md)** — shipped 0.2.3 release notes for two keyless direct wallpaper
  sources (Cleveland + Met), data-driven provider manifests with **no client
  gzip increase**, direct-display mode, the 0.2.2 legacy Openverse-notice fix
  (Openverse itself is not re-added) and the robustness backlog. **Planning
  only; not shipped.** Source probes:
  [0.2.3 wallpaper-source research](research/wallpaper-sources-0.2.3.md).

Repository-only records (not shipped in the npm package): the 0.2.3 wallpaper
source research `docs/research/wallpaper-sources-0.2.3.md`, the 0.2.2 provider
access-gate record `docs/research/provider-access-gate.json` and the per-host
slot declaration proof `contracts/dsh/client-slot-declarations.json`.

## Archive (historical, not authoritative)

Old design notes, implementation plans, compatibility-mode proposals and the
DSH `0.2.0-rc.2` research contracts are kept for history under
[`archive/`](https://github.com/centella-cream/dsh-livery/tree/main/docs/archive). They may contradict the current policy and must
not be cited as current support or behavior.

---

# 文档

**`0.2.2` 是当前版本（`dsh-livery@0.2.2`）。** 支持策略以
`contracts/dsh/support-matrix.json` 为准；精确验收制品与探针证据记录在
`contracts/dsh/evidence/0.2.2/` 与 `docs/verification.md`。

## Livery 0.2.2 验收范围

本表记录 **`0.2.2` 制品**在哪些 DSH 宿主构建上完成验收（权威支持策略见
`contracts/dsh/support-matrix.json`，稳定/预览规则见[多版本策略](design/multi-version.md)）。

| 宿主 | 范围 | 状态（Livery `0.2.2`） |
|---|---|---|
| DSH `0.2.1-rc.2` | Web Profile、Chrome 156.0.8078.48、Node 22.23.1 | 稳定认证（npm `latest`）；Web 已验收 |
| DSH `0.2.1-rc.3` | Desktop 应用、macOS、Electron/Node 24.21.0、Chromium 152.0.7977.130 | 稳定认证渲染器表面（GitHub 已 tag）；Desktop 已验收 |
| DSH `0.2.1-rc.4` | Web Profile、Chrome 156.0.8078.48、Node 22.23.1 | next 通道预览（npm `next`；已有 GitHub prerelease tag）；Web 已验收 |
| DSH `0.2.1-rc.5` | Web + macOS Desktop，Chrome 156.0.8078.48 / Chromium 152.0.7977.130，Node 22.23.1 / 24.21.0 | 预览（npm `latest`）；Web + Desktop 已验收 |
| DSH `0.2.2-rc.1` | Web + macOS Desktop，Chrome 156.0.8078.48 / Chromium 152.0.7977.130，Node 22.23.1 / 24.21.0 | 预览（npm `latest`）；Web + Desktop 已验收 |
| DSH `0.2.2-rc.2` | Web + macOS Desktop，Chrome 156.0.8078.48 / Chromium 152.0.7977.130，Node 22.23.1 / 24.21.0 | 预览（npm `next`）；Web + Desktop 已验收 |
| DSH `0.2.2-rc.3` | Web + Desktop macOS，Chrome 156.0.8078.48 / Electron 44.7.0 / Node 24.21.0 / Chromium 152.0.7977.130 | 预览（npm `next`）；Web + Desktop 已验收 |
| DSH `0.2.2-rc.5` | Web + Desktop macOS，Chrome 156.0.8078.48 / Electron 44.7.0 / Node 22.23.1 / 24.21.0 / Chromium 152.0.7977.130 | 预览（npm `latest`）；Web + Desktop 已验收 |

共 **8 个宿主 adapter、13 个 scope（7 Web + 6 Desktop）**。`0.2.2` 保持同一宿主集合：
只改客户端，不新增宿主 adapter；另外绑定 `0.2.2-rc.5` 上一条 `0.2.1 → 0.2.2` Web 更新证据。
DSH Desktop Windows、Web Edge 及其他 DSH 版本不在支持范围内。

## 当前文档

- **[验收总结](verification.md)**：发布范围、精确制品绑定、验收矩阵、已知限制与复现命令。
- **[0.2.0 视觉语言](design/0.2.0-visual-language.md)**：中文字体、标签层级、L5a 装饰、边框边界与 sidebar 可读性策略。
- **[壁纸工作台布局](design/wallpaper-workbench.md)**：响应式断点、等高规则和在线壁纸视觉策略。
- **[接口与架构](design/interfaces.md)**：模块边界、冻结的 Host/Client 握手、生成产物与构建输出。
- **[兼容架构](design/compatibility.md)** — API 兼容回退、共享 catalog profile 与 exact evidence 边界。
- **[多版本策略](design/multi-version.md)**：兼容范围、exact evidence、稳定/预览边界、新增 DSH 版本时不丢失旧版本。
- **[风格系统](design/style-system.md)**：28 套风格在调色、字体、形状、材质、字号阶梯和组件 chrome 上的差异。
- **[宿主对比度审计](design/host-contrast-audit.md)**：以 stock 宿主为基线检查宿主组件 token 对，记录 0.2.3 修复的 badge/发送/错误等回归。
- **[风格画廊与 GUI 配方](design/style-gallery.md)**：紧凑目录、风格 DNA 标签与 terminal/brutal/pill/editorial 表面配方。
- **[设计参考](research/design-references.md)**：配色归属与机器可读的 [28 套风格表](research/design-table.json)。

## 方案稿

- **[0.2.0 视觉语言](design/0.2.0-visual-language.md)** 与 **[0.2.0 方案稿](design/0.2.0-proposal.md)**：已实现的字体/标签/L5a/sidebar 视觉语言，以及 manifest v2 多轴设计。
- **[0.2.2 实施方案](design/0.2.2-plan.md)**：已发布的 0.2.2 壁纸工作室、provider 注册表、stale boot HMR 握手与插件详情面；作为设计与验收记录保留。
- **[插件详情面](design/plugin-detail-surface.md)**：0.2.2 的 detail slots、可观测事实区块、真实操作与更新边界文案；per-host slot 证明覆盖 8 个宿主中的 6 个，`0.2.1-rc.2` / `0.2.1-rc.3` 为显式缺口，其中 `0.2.1-rc.2`（Web）由运行时 detail 检查覆盖；`0.2.1-rc.3`（Desktop）没有运行时 detail 检查，属于文档化的 per-scope limitation，不是已通过声明。
- **[0.2.3 目标](design/0.2.3-plan.md)**：Cleveland + Met 两个新增 keyless 源、Host manifest 路由、direct `<img>` 层、**不提高 client gzip**，以及 0.2.2 legacy Openverse 提示修复；Openverse 不再重加。**已实现为候选，尚未验收/发布；下表仍是 0.2.2 冻结记录。** 源调研见 [0.2.3 壁纸源研究](research/wallpaper-sources-0.2.3.md)。

仅仓库记录（不随 npm 包发布）：0.2.3 壁纸源研究
`docs/research/wallpaper-sources-0.2.3.md`、0.2.2 provider 访问门禁记录
`docs/research/provider-access-gate.json`，以及 per-host slot 声明证明
`contracts/dsh/client-slot-declarations.json`。

## 历史归档（非权威）

旧设计笔记、实施方案、兼容模式提案和 DSH `0.2.0-rc.2` 研究契约保留在
[`archive/`](https://github.com/centella-cream/dsh-livery/tree/main/docs/archive)。它们可能与当前策略冲突，不能作为当前支持或行为依据。
