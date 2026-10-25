# DSH Visual Studio（dsh-livery）

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.23.1%20%7C%7C%20%5E24.21.0-339933.svg)](package.json)
[![DSH](https://img.shields.io/badge/DSH-0.2.x%20certified%20%2B%200.x%20compat-6d6df6.svg)](#宿主支持与版本策略)

**DeepSeek Harness 的视觉工作室**：24 套契约约束的风格、带在线图片搜索与虚化/磨砂效果的壁纸工作室、
以及经过策展的画廊——以插件形式提供视觉层，而**不是接管宿主主题**。

[English](README.md) · [中文](README.zh-CN.md)

![24 套内置风格](docs/assets/gallery-24-light.jpg)

## 为什么不是"又一个皮肤"

普通皮肤插件常常接管宿主主题、注册自己的主题 id、绘制窗口 chrome、注入大范围 CSS——这正是它们在
DSH 更新后容易失效的原因。DSH Visual Studio 选择了相反的取舍：

| 普通皮肤插件 | DSH Visual Studio |
|---|---|
| 接管 `ctx.theme`、注册主题、调用 `setTheme` | 每套风格只输出一组作用域内的语义 token；从不注册/拥有宿主主题 |
| 绘制窗口 chrome（标题栏、浮层） | 从不绘制 chrome，窗口归宿主所有 |
| 大量选择器 CSS，宿主重构即失效 | 纯 token 渲染 + body 作用域壁纸层；不使用宿主组件选择器 |
| DSH 一更新就失效或半失效 | **认证矩阵**覆盖精确版本 + **兼容模式**覆盖范围内的新版本，明确标注、不会硬失效 |
| "相信我"的主题 | 冻结契约哈希、loader-ABI 检查、对比度/CSS 审计、公开验收矩阵 |

区别在于：这是带工程保证的**视觉系统**，不是一份样式表——24 套五维设计、壁纸工作室、策展画廊，以及
能跟上 DSH 更新的版本策略。

## 功能

- **24 套风格、五个维度**：配色（OKLab 种子 → 完整明暗 token）、字体（10 个纯本地字体栈 + 9 种排版尺度）、
  模块造型（`--dsw-radius-*`、`--dsw-corner-shape`）、层次/材质（纸感/扁平发丝面板、高浮起卡片、玻璃虚化）、
  边框/focus 处理。10 套原创 + 12 套受开源配色启发（MIT/Apache-2.0，见 [NOTICE](NOTICE.md)）+ 2 套中式原创
  （青瓷、朱砂）。
- **壁纸工作室**：8 套内置 CSS 壁纸；在线搜索（Openverse CC0/PDM）与随机刷新（Picsum）；自定义 https 图片
  URL；虚化 0–24px、暗化 0–70%、磨砂 0–100%（面板半透明透出壁纸）。仅在用户主动操作时联网，选择保存在本地。
- **策展画廊**：风格按六个家族分组（静谧 / 自然 / 明亮 / 复古 / 霓虹 / 深色），主筛选优先，完整标签收进
  「更多筛选」；预览语言 tab 可在 跟随 DSH / 中文 / English 之间切换缩略图。
- **一级入口**：左侧栏插件面板（**视觉风格**，含第二 tab **壁纸**），与插件/自动化任务/上下文洞察同级。
- **诚实降级**：缺失的宿主能力与未认证模式都在自检中展示，不伪造。

![壁纸工作室](docs/assets/wallpaper.jpg)

## 宿主支持与版本策略

`engines.dsh` 声明兼容范围 **`>=0.2.0-rc.2 <1.0.0`**，范围内分两层：

| 层级 | 宿主版本 | 保证 |
|---|---|---|
| **已认证** | DSH `0.2.0-rc.2`、`0.2.1-rc.2`、`0.2.1-rc.3` | 精确六类哈希契约、loader-ABI 检查、完整验收矩阵（Web + Desktop runtime + 真实 Electron 渲染器） |
| **兼容模式** | 范围内其他可读版本 | 用最新认证契约尽力渲染，面板与自检明确标注"未认证"；不会硬失效 |
| **拒绝** | 范围外或不可读版本 | fail-closed 回退原生外观，零注入 |

认证表示"在该精确版本上验证通过"，不表示"只能装在那里"。新 DSH 版本加入认证矩阵后会自动从兼容模式
升级为已认证。机制见 [docs/design/multi-version.md](docs/design/multi-version.md)，当前矩阵见
[docs/verification.md](docs/verification.md)。

![风格差异](docs/assets/style-differences.jpg)

## 安装

### Web Profile（CLI）

```bash
pnpm build && pnpm pack                 # 或使用已发布的 dsh-livery-*.tgz
dsh plugin --profile web add ./dsh-livery-0.1.0.tgz
dsh web                                 # 打开命令输出的地址
```

### Desktop Profile（0.2.1-rc.3）

通过 DeepSeek Harness Desktop 应用的插件管理器安装；应用运行时会强制校验 `engines.dsh`。

## 使用

打开左侧栏，在「工作区」上方点击 **视觉风格**。页面有两个 tab：

- **视觉风格**：预览（临时）、应用（只写一次配置）、恢复默认外观；家族分组 + 搜索 +「更多筛选」；
  预览语言 tab。
- **壁纸**：选内置壁纸、在线搜索/刷新、粘贴自定义 https URL，然后调节虚化/暗化/磨砂。壁纸保存在浏览器，
  重启后仍然生效。

风格与壁纸相互独立：切换风格不会丢掉壁纸。

![入口与画廊](docs/assets/livery-panel.jpg)

![预览语言](docs/assets/preview-language.jpg)

## 仓库结构

| 路径 | 内容 |
|---|---|
| `src/core` | 颜色推导、对比度、token 渲染、注册表、风格审计、兼容版本范围 |
| `src/compiler` | Manifest 校验、预览、审计、编译器 CLI |
| `src/host` | Cordis 宿主插件：认证/兼容门禁、首帧注入、catalog/预览路由 |
| `src/client` | 浏览器插件：握手、运行时、风格画廊、壁纸工作室、设置 UI |
| `src/contract` | 契约快照/diff、adapter 生成、支持矩阵门禁 |
| `src/generated` | 已提交的生成物：契约、stock token 快照、编译后的 catalog |
| `liveries/` | 24 套内置风格 manifest（`schemas/livery.schema.json`） |
| `contracts/` | 冻结的宿主契约快照与支持矩阵 |
| `scripts/` | 构建/CLI 工具与浏览器验收 harness |
| `tests/` | 单元、编译器、宿主、客户端、契约与浏览器 harness 测试 |
| `docs/` | 设计文档、研究笔记与验收总结 |

## 开发

要求：Node `^22.23.1 || ^24.21.0`，pnpm 12。

```bash
pnpm install
pnpm verify          # typecheck + 测试 + 生成物检查 + 审计 + 构建 + 打包检查
pnpm lint
pnpm test:loader-abi
pnpm adapter:check
```

契约、stock token 与编译后的 catalog 已提交，因此没有本地 DSH 安装也能 `pnpm build`。浏览器验收
（需要本地 DSH、系统 Chrome 与已打包 tarball）：

```bash
node scripts/acceptance/web.mjs --tgz ./dsh-livery-0.1.0.tgz
node tests/browser/run.mjs --tgz ./dsh-livery-0.1.0.tgz      # 薄封装
```

## 验收

当前认证矩阵（未发布的 0.1.0）：Web `0.2.1-rc.2` 隔离全量与真实 profile 克隆；Desktop `0.2.1-rc.3` packaged
web carrier 与真实 Electron 渲染器；仓库门禁包含 `tsc`、600+ 测试、对比度/token/CSS 审计、loader ABI
与打包检查。原始证据在本地 `artifacts/` 生成、不提交。详见 [docs/verification.md](docs/verification.md)。

## 参与贡献

- [贡献指南](CONTRIBUTING.zh-CN.md) · [Contributing](CONTRIBUTING.md)
- [行为准则](CODE_OF_CONDUCT.md) · [安全策略](SECURITY.md) · [支持](SUPPORT.md)

提交保持一句话简洁（`feat:`、`fix:`、`docs:`、`test:`、`chore:`）。

## 文档

- [文档索引](docs/README.md)
- 设计：[接口](docs/design/interfaces.md) · [风格系统](docs/design/style-system.md) · [多版本与兼容](docs/design/multi-version.md) · [视觉工作室 v2](docs/design/visual-studio-v2.md) · [实现计划](docs/design/implementation-plan.md)
- 研究：[宿主契约](docs/research/host-contract.md) · [客户端契约](docs/research/client-contract.md) · [设计参考](docs/research/design-references.md)
- [验收总结](docs/verification.md)

## 许可证

MIT，见 [LICENSE](LICENSE)。配色归属见 [NOTICE.md](NOTICE.md)。预览图与内置壁纸均由插件自身数据生成，
不捆绑第三方图片或字体。可选的壁纸工作室仅在用户主动操作时加载第三方图片（见 [SECURITY.md](SECURITY.md)）。
