# 参与 DSH Livery 贡献

感谢参与。本项目依赖冻结的宿主契约，改动通常比普通主题仓库更需要谨慎。

## 开始之前

- 阅读[行为准则](CODE_OF_CONDUCT.md)。
- 提交 issue 或 PR 前，先搜索是否已有相关内容。
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

已提交的契约、stock token 快照和编译后的 catalog 让 `pnpm build` 在没有本地 DSH 安装时也能运行。

## 仓库约定

- **契约冻结**：`contracts/dsh/<version>/contract.json` 中的六类哈希和汇总哈希是冻结的。不要手改
  `src/generated/`，请使用文档里的生成脚本。
- **纯 token 渲染**：宿主和客户端只能输出作用域内的 `--dsw-*` token 声明（以及文档化的字体
  hook）。不得出现组件选择器、`!important`、远程 URL、捆绑字体或图片；CSS 审计会检查这些
  规则。新增风格 token 必须在 `src/core/registry.ts` 注册，并使用允许的值形态。
- **Manifest 变更**经过 `schemas/livery.schema.json` 与 `liveries/<id>/manifest.json`，
  然后运行 `pnpm liveries:compile` 和各项审计。
- **新增风格**：在 [`docs/research/design-table.json`](docs/research/design-table.json) 增加条目，
  生成 manifest，运行 `pnpm liveries:compile`、`pnpm audit:tokens`、`pnpm audit:css`、
  `pnpm audit:contrast`；如果配色来自其他项目，更新 [NOTICE.md](NOTICE.md)。
- **新增宿主版本**需要契约快照、adapter 生成和验收证据，见
  [docs/design/multi-version.md](docs/design/multi-version.md)。
- **提交**：提交信息保持一行，采用 Conventional Commits（`feat:`、`fix:`、`docs:`、`test:`、
  `chore:`），不写长正文。
- **不要提交**本地路径或生成证据：`artifacts/`、`.tmp/`、`references/`、`*.tgz` 均已忽略；
  文档中不要出现个人绝对路径。

## Pull Request 要求

- [ ] 改动聚焦，并包含对应测试（unit、compiler、host 或 client）。
- [ ] `pnpm verify`、`pnpm lint`、`pnpm test:loader-abi`、`pnpm adapter:check` 全部通过。
- [ ] 更新文档（设计文档、NOTICE 归属、验收总结）。
- [ ] diff 中不含个人路径、密钥、tarball 或生成证据。
- [ ] 提交信息为一句话，采用 conventional commit 格式。

## 许可证

提交贡献即表示你同意以 [MIT 许可证](LICENSE) 授权你的贡献。
