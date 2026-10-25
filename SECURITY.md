# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `0.3.x` | Yes |
| `< 0.3` | No (pre-release development builds) |

Supported host builds are listed in [README.md](README.md#supported-hosts).
Uncertified hosts fail closed to stock.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities)
on this repository (Security → Report a vulnerability). Include reproduction steps,
the affected version, host build and impact. We aim to acknowledge reports within
7 days.

## Scope and design notes

DSH Livery is a browser/host plugin that emits scoped CSS custom properties and a
small first-frame payload. It:

- makes **no network requests** and loads no remote fonts, images or scripts;
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
- 范围说明：本插件不发起网络请求、不加载远程字体/图片/脚本、不附带密钥；只写自己的配置
  字段与自有的作用域样式；未知宿主版本会 fail-closed。插件不是沙箱边界，运行在 DSH 插件
  运行时的信任模型内。DSH 本身的漏洞请反馈给上游项目。
