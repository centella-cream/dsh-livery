# Documentation

**Current release: `0.1.2` (2026-10-27).** The authoritative support policy is
`contracts/dsh/support-matrix.json`; the exact accepted artifact is recorded in
`contracts/dsh/evidence/` and `docs/verification.md`.

| Host | Scope | Status |
|---|---|---|
| DSH `0.2.1-rc.2` | Web Profile, Chrome 155, Node 22.23.1 | Stable certified (npm `latest`) |
| DSH `0.2.1-rc.3` | Desktop app, macOS, Electron/Node 24.21.0 | Stable certified renderer surface (GitHub-tagged) |
| DSH `0.2.1-rc.4` | Web Profile, Chrome 155, Node 22.23.1 | Next-channel preview (npm `next`; no GitHub tag yet) |

Stable claims require both an official GitHub tag/release and the signed npm
package. A version that exists only on npm's `next` channel is documented as
preview compatibility, never as a stability promise. DSH Desktop Windows, Web
Edge and any other DSH build are not supported.

## Current documents

- **[Verification](verification.md)** — release scope, exact artifact binding,
  acceptance matrix, known limitations and reproduction commands.
- **[Interfaces and architecture](design/interfaces.md)** — module boundaries,
  frozen host/client handshake, generated artifacts and build outputs.
- **[Multi-version policy](design/multi-version.md)** — exact allowlist, stable
  vs next-preview rules, how to add a DSH release without dropping older ones.
- **[Style system](design/style-system.md)** — the 24 styles across palette,
  typography, shape, material and type scale.
- **[Design references](research/design-references.md)** — palette attributions
  and the machine-readable [24-style table](research/design-table.json).

## Archive (historical, not authoritative)

Old design notes, implementation plans, compatibility-mode proposals and the
DSH `0.2.0-rc.2` research contracts are kept for history under
[`archive/`](archive/README.md). They may contradict the current policy and must
not be cited as current support or behavior.

---

# 文档

**当前版本：`0.1.2`（2026-10-27）。** 支持策略以
`contracts/dsh/support-matrix.json` 为准；精确验收制品记录在
`contracts/dsh/evidence/` 与 `docs/verification.md`。

| 宿主 | 范围 | 状态 |
|---|---|---|
| DSH `0.2.1-rc.2` | Web Profile、Chrome 155、Node 22.23.1 | 稳定认证（npm `latest`） |
| DSH `0.2.1-rc.3` | Desktop 应用、macOS、Electron/Node 24.21.0 | 稳定认证渲染器表面（GitHub 已 tag） |
| DSH `0.2.1-rc.4` | Web Profile、Chrome 155、Node 22.23.1 | next 通道预览（npm `next`；尚无 GitHub tag） |

“稳定”要求官方 GitHub tag/release 与签名 npm 包同时存在；只有 npm `next`
通道的版本只作为预览兼容性记录，不承诺稳定性。DSH Desktop Windows、Web Edge
及其他 DSH 版本不在支持范围内。

## 当前文档

- **[验收总结](verification.md)**：发布范围、精确制品绑定、验收矩阵、已知限制与复现命令。
- **[接口与架构](design/interfaces.md)**：模块边界、冻结的 Host/Client 握手、生成产物与构建输出。
- **[多版本策略](design/multi-version.md)**：精确允许列表、稳定版与 next 预览规则、新增 DSH 版本时不丢失旧版本。
- **[风格系统](design/style-system.md)**：24 套风格在调色、字体、形状、材质和字号阶梯上的差异。
- **[设计参考](research/design-references.md)**：配色归属与机器可读的 [24 套风格表](research/design-table.json)。

## 历史归档（非权威）

旧设计笔记、实施方案、兼容模式提案和 DSH `0.2.0-rc.2` 研究契约保留在
[`archive/`](archive/README.md)。它们可能与当前策略冲突，不能作为当前支持或行为依据。
