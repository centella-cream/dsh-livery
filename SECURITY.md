# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `0.1.x` (unreleased) | Yes |

Certified host builds and the compatibility policy are documented in
[README.md](README.md#supported-hosts). Hosts outside the compatibility range fail
closed to stock; in-range uncertified hosts run in clearly-labelled compat mode.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities)
on this repository (Security → Report a vulnerability). Include reproduction steps,
the affected version, host build and impact. We aim to acknowledge reports within
7 days.

## Scope and design notes

DSH Livery is a browser/host plugin that emits scoped CSS custom properties and a
small first-frame payload. It:

- **styles are offline**: no remote fonts or scripts, and no network requests for
  visual styles or previews;
- **the optional wallpaper studio is the only networked feature**: opening the
  wallpaper tab automatically loads one random batch from `picsum.photos`, and
  explicit search/random/next-batch actions call `api.openverse.org` (CC0/PDM
  search; only the query leaves the browser) / `picsum.photos`. User-selected images come
  from a validated https URL or a local file upload; uploads are stored in the
  browser's IndexedDB and never uploaded. Results are cached in `localStorage`.
  No telemetry, no background requests, no API keys. Wallpaper choices/effects are
  stored locally, not in the profile;
- ships no secrets and writes only the plugin's own configuration field
  (`skinId`) plus scoped `style` elements/attributes it owns;
- fails closed on unknown host versions/contract hashes rather than guessing;
- is not a sandbox boundary: it runs inside the DeepSeek Harness plugin runtime and
  inherits that runtime's trust model.

Reports about DeepSeek Harness itself should go to the upstream project.

## 安全策略（中文）

- 支持版本：`0.3.x`；更早版本为开发预发布，不提供安全修复。
- 报告方式：**不要开公开 issue**，请使用 GitHub 私有漏洞报告（Security → Report a
  vulnerability），附复现步骤、版本、宿主 build 与影响；我们计划 7 天内响应。
- 范围说明：风格层完全离线（不加载远程字体/脚本/图片）；唯一的联网功能是**壁纸工作室**，
  由用户主动触发：搜索调用 `api.openverse.org`（CC0/PDM 图片）、随机调用
  `picsum.photos`、自定义 https 图片 URL 作为背景。无遥测、无后台请求、无 API key；
  网络仅发送搜索词/加载所选图片 URL。壁纸选择保存在浏览器 `localStorage`，写入 profile
  的仍只有 `skinId`。插件不是沙箱边界，运行在 DSH 插件运行时的信任模型内。DSH 本身的漏洞
  请反馈给上游项目。
