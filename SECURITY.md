# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `0.2.1` (current published release) | Yes |
| `0.2.2` (target release, not published) | No (not accepted or released) |
| `0.1.x` (prior releases) | No (superseded) |

This document describes the `0.2.2` target artifact. `0.2.1` remains the published
release until the 0.2.2 candidate is accepted and released; the network behavior
below is the 0.2.2 target scope.

The supported scope is the exact matrix in
[contracts/dsh/support-matrix.json](contracts/dsh/support-matrix.json), documented in
[README.md](README.md#supported-dsh-builds). Desktop Windows, Web Edge and
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
- **keep the wallpaper studio as its only networked feature:** opening the
  wallpapers page triggers no provider batch and the default image source is
  Built-in; a persisted online wallpaper may load from the guarded local cache. The
  first activation of the Online tab requests exactly one batch; explicit
  search/random/refresh/retry are the only other request triggers. There is no
  polling, prefetch or telemetry, and no Livery-hosted proxy or `web_fetch` path —
  the browser calls provider endpoints directly. In 0.2.2 the online sources are
  keyless and limited to the two providers the committed access-gate record
  accepted:
  - **Openverse** — `https://api.openverse.org/v1` for search and the proxied
    image endpoints on `api.openverse.org` (`/v1/images/…/thumb/`, including
    `?full_size=true`); origin image hosts returned in results are never fetched;
  - **Wikimedia Commons** — `https://commons.wikimedia.org/w/api.php` (with the
    MediaWiki `origin=*` CORS mode) for search; image bytes are loaded only from
    `upload.wikimedia.org` and `thumb.wikimedia.org`.

  Remote selections cached by 0.2.1 — including legacy **Picsum** photos (Unsplash
  images served by `picsum.photos`/`fastly.picsum.photos`) and Openverse images —
  still render from the local IndexedDB cache; 0.2.2 lists no Picsum source and
  makes no new Picsum requests (Picsum was removed because the Unsplash licence
  does not permit this use). You can also use an image from a validated https URL (fetched only on
  explicit action) or upload a local file; uploads are stored in the browser's
  IndexedDB and never uploaded. No API keys are used or stored; wallpaper choices
  and effects are stored locally, not in the profile;
- **treat attribution as untrusted data:** creator/licence/source URLs are
  validated as https public-host links (≤2048 chars), invalid URLs are dropped on
  write and on preset import, and stored credit is rendered as plain text links
  opened with `rel="noreferrer noopener"`. Attribution metadata never controls
  script execution or styling;
- **ship no secrets** and write only the plugin's own configuration field (`skinId`)
  plus scoped `style` elements and attributes it owns;
- **fail closed** on any host version other than the certified exact build and on unknown contract hashes;
- **stay inside the runtime trust model:** it is not a sandbox boundary, and it runs
  inside the DeepSeek Harness plugin runtime.

Reports about DeepSeek Harness itself should go to the upstream project.

## 安全策略（中文）

- 支持版本：`0.2.1` 是当前已发布版本；`0.2.2` 是目标版本，尚未验收或发布（通过完整验收前不在支持范围）；`0.1.x` 已被取代。
- 报告方式：**不要开公开 issue**，请使用 GitHub 私有漏洞报告（Security → Report a
  vulnerability），附上复现步骤、版本、宿主 build 与影响；我们会在 7 天内回复。
- 范围说明：风格层完全离线，不加载远程字体、脚本或图片；唯一的联网功能是**壁纸工作室**。
  打开壁纸页不发起请求，默认来源是内置；首次激活 Online 页签时只请求一批，搜索、随机、
  刷新、重试是其余请求触发点；没有轮询、预取、遥测，也没有 Livery 自建代理或 `web_fetch`，
  浏览器直接访问 provider 端点。0.2.2 的在线来源均免密钥，且只包含访问门禁记录接受的
  两个来源：
  - **Openverse**：`https://api.openverse.org/v1` 搜索，以及 `api.openverse.org` 上的
    代理图片端点（`/v1/images/…/thumb/`，可带 `?full_size=true`）；绝不请求结果中的
    原始图片主机；
  - **Wikimedia Commons**：`https://commons.wikimedia.org/w/api.php`（MediaWiki
    `origin=*` CORS 模式）搜索；图片字节只从 `upload.wikimedia.org` 和
    `thumb.wikimedia.org` 加载。

  0.2.1 缓存过的远程选择——包括来自 `picsum.photos`/`fastly.picsum.photos` 的旧
  **Picsum**（Unsplash 照片）图片——仍从本地 IndexedDB 缓存渲染；0.2.2 不列出 Picsum，
  也不会发起新的 Picsum 请求（Picsum 已移除，因为 Unsplash 许可不允许这种用途）。也可以使用校验过的
  https 图片 URL（只在主动操作时请求）或上传本地文件；上传内容保存在浏览器 IndexedDB 中，
  不会上传。不使用也不保存 API key；壁纸选择和效果保存在本地，写入 profile 的仍然只有
  `skinId`。
- 归属信息按不可信数据处理：creator/licence/source 链接必须是 https 公网主机
  （≤2048 字符），无效 URL 在写入和预设导入时被丢弃；保存的归属以纯文本链接渲染，并以
  `rel="noreferrer noopener"` 打开新标签页。归属元数据不参与脚本执行或样式控制。
- 插件不是沙箱边界，运行在 DSH 插件运行时的信任模型内。DSH 本身的漏洞请反馈给上游项目。
