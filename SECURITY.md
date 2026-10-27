# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `0.1.x` (limited release) | Yes |

The supported scope is DSH `0.2.1-rc.2` + Web Profile + Chrome 156.0.8078.48 + Node 22.23.1,
and DSH `0.2.1-rc.3` + macOS Desktop app + Electron/Node 24.21.0, as documented in
[README.md](README.md#host-support-and-version-policy). Desktop Windows, Web Edge and
other DSH builds are unsupported and receive no guarantee. Other host versions are
rejected at install time; at runtime, uncertified payloads/contracts fail closed to
the stock appearance. There is no default compatibility fallback.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities)
on this repository (Security → Report a vulnerability). Include reproduction steps,
the affected version, host build and impact. We aim to acknowledge reports within
7 days.

## Scope and design notes

DSH Livery is a browser/host plugin that emits scoped CSS custom properties and a
small first-frame payload. It is designed to:

- **work offline for styles:** no remote fonts or scripts, and no network requests
  for visual styles or previews;
- **keep the wallpaper studio as its only networked feature:** opening the wallpaper
  tab loads one random batch from `picsum.photos`, and explicit search/random/next-batch
  actions call `api.openverse.org` (CC0/PDM search; only the query leaves the
  browser) or `picsum.photos`. You can also use an image from a validated https URL
  or upload a local file; uploads are stored in the browser's IndexedDB and never
  uploaded. There is no telemetry, no background request and no API key. Wallpaper
  choices and effects are stored locally, not in the profile;
- **ship no secrets** and write only the plugin's own configuration field (`skinId`)
  plus scoped `style` elements and attributes it owns;
- **fail closed** on any host version other than the certified exact build and on unknown contract hashes;
- **stay inside the runtime trust model:** it is not a sandbox boundary, and it runs
  inside the DeepSeek Harness plugin runtime.

Reports about DeepSeek Harness itself should go to the upstream project.

## 安全策略（中文）

- 支持版本：`0.1.x` 已发布版本；当前为 `0.1.3`。
- 报告方式：**不要开公开 issue**，请使用 GitHub 私有漏洞报告（Security → Report a
  vulnerability），附上复现步骤、版本、宿主 build 与影响；我们会在 7 天内回复。
- 范围说明：风格层完全离线，不加载远程字体、脚本或图片；唯一的联网功能是**壁纸工作室**。打开
  壁纸标签页时，它会自动从 `picsum.photos` 加载一批随机壁纸，主动搜索、随机或换一批时会调用
  `api.openverse.org`（CC0/PDM 搜索，只发送搜索词）或 `picsum.photos`。也可以使用校验过的
  https 图片 URL 或上传本地文件；上传内容保存在浏览器 IndexedDB 中，不会上传。没有遥测、
  后台请求或 API key；壁纸选择和效果保存在浏览器 `localStorage`，写入 profile 的仍然只有
  `skinId`。插件不是沙箱边界，运行在 DSH 插件运行时的信任模型内。DSH 本身的漏洞请反馈给
  上游项目。
