# 参与 DSH Livery 贡献

感谢参与。本项目是契约约束的插件，改动通常比普通主题仓库需要更谨慎。

## 开始之前

- 阅读[行为准则](CODE_OF_CONDUCT.md)。
- 提交 issue/PR 前先搜索是否已有相关内容。
- 安全问题**不要**开公开 issue，请按 [SECURITY.md](SECURITY.md) 处理。

## 开发环境

要求：Node `^22.23.1 || ^24.21.0`，pnpm 12。

```bash
pnpm install
pnpm verify      # typecheck + 测试 + 生成物检查 + 审计 + 构建 + 打包检查
pnpm lint
pnpm test:loader-abi
pnpm adapter:check
```

已提交的契约、stock token 与编译后的 catalog 使得没有本地 DSH 安装也能 `pnpm build`。

## 仓库约定

- **契约冻结**：`contracts/dsh/<version>/contract.json` 中六类哈希与汇总哈希冻结；不要手改
  `src/generated/`，使用文档中的生成脚本。
- **纯 token 渲染**：宿主/客户端只能输出作用域内的 `--dsw-*` token 声明（以及文档化的字体
  hook），不得出现组件选择器、`!important`、远程 URL、捆绑字体或图片；CSS 审计会强制检查。
  新增风格 token 必须在 `src/core/registry.ts` 注册并符合允许的值形态。
- **Manifest 变更**经过 `schemas/livery.schema.json` 与 `liveries/<id>/manifest.json`，
  然后运行 `pnpm liveries:compile` 与审计。
- **新增风格**：在 [`docs/research/design-table.json`](docs/research/design-table.json) 增加条目，
  生成 manifest，运行 `pnpm liveries:compile`、`pnpm audit:tokens`、`pnpm audit:css`、
  `pnpm audit:contrast`；如配色来自其他项目，更新 [NOTICE.md](NOTICE.md)。
- **新增宿主版本**需要契约快照、adapter 生成与验收证据，见 [docs/design/multi-version.md](docs/design/multi-version.md)。
- **提交**：一句话 Conventional Commits（`feat:`、`fix:`、`docs:`、`test:`、`chore:`），不写长正文。
- **不要提交**本地路径或生成证据：`artifacts/`、`.tmp/`、`references/`、`*.tgz` 均已忽略；
  文档中不要出现个人绝对路径。

## Pull Request 要求

- [ ] 改动聚焦，并含对应测试（unit/compiler/host/client）。
- [ ] `pnpm verify`、`pnpm lint`、`pnpm test:loader-abi`、`pnpm adapter:check` 全绿。
- [ ] 更新文档（设计文档、NOTICE 归属、验收总结）。
- [ ] diff 中不含个人路径、密钥、tarball 或生成证据。
- [ ] 一句话 conventional commit。

## 许可证

提交贡献即表示同意以 [MIT 许可证](LICENSE) 授权你的贡献。
