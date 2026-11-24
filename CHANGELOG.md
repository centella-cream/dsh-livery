# Changelog

All notable changes to DSH Livery are recorded here. `0.1.0` was the first limited
release for DSH `0.2.1-rc.2` Web/Chrome; `0.1.1` added Desktop `0.2.1-rc.3` macOS
support; `0.1.2` added the latest-DSH preview and fixed wallpaper UI/layering;
`0.1.3` is the release-trust, storage-reliability and accessibility release.
Earlier development rounds used temporary internal version numbers for evidence
packaging; they are folded into the `0.1.0` entry.

## [0.2.2] — unreleased (target)

目标版本 `0.2.2`（只改客户端）。本条目描述目标行为，不是发布或验收声明：
`0.2.1` 仍是当前已发布版本，0.2.2 的全部证据必须在同一份最终 tarball 上重新绑定后才成立。

### Added

- 壁纸工作室改为精选目录：主网格固定 8 张精选内置壁纸（`paper`、`ink`、`aurora`、`cyber`、`dusk`、`minimal`、`mono`、`sand`），其余 16 张收入折叠的 **Classic** 组；全部 24 个 ID 与 CSS 逐字节不变、不重映射。选中旧内置 ID 时显示置顶的 “Current (Classic)” 色板，且该 ID 不会在网格或 Classic 组中重复出现。
- 新增 `kind:'style'` 壁纸：由当前 Livery 的 catalog token 按明/暗模式生成一条确定的 CSS 背景，不写 blob、IndexedDB 或缓存记录；不可重新定位（只有 remote/upload 可调整焦点），无 catalog token 时禁用并给出可见原因。新增 sidecar 存储键 `dsh-livery.wallpaper.style.v1`（schemaVersion 1，`{variant:'mesh', revision, sourceId}`），主记录仍是 0.2.1 可读的 v2；仅当 sidecar 解析成功、主记录 selection 为空且 `(revision, sourceId)` 完全一致时才 hydrate。
- 在线图源注册表新增 **Openverse** 与 **Wikimedia Commons**（唯一通过 `docs/research/provider-access-gate.json` 的两个来源），均为免密钥；带来源选择器（Auto + 通过门禁的来源）、加载/空/超时/限流/不可用/无效响应状态与重试。Auto 使用 12 秒总时限、单次尝试 `min(6 s, remaining)`、最多两个来源，并显示实际服务来源；固定来源只尝试一次且不会静默切换。
- 归属信息持久化：远程 selection 增加可选 `provenance`（provider/title/creator/creatorUrl/license/licenseUrl/source/sourceUrl）；creator/licence/source 链接必须为 https、公网主机、≤2048 字符，并以 `rel="noreferrer noopener"` 打开；`license:null` 的结果可见但不可选。Recent 历史增加归属 URL 字段，仅作展示镜像；旧的 attribution 存储迁移一次后移除。
- 预设 schema v2：新增 `{kind:'style', variant:'mesh'}` 壁纸目标与 attribution URL（creatorUrl/licenseUrl/sourceUrl）；导出固定写 v2，导入同时接受 v1/v2；v1 文件声明 style 会被拒绝（`wallpaper-kind`），v2 style variant 错误使用 `wallpaper-variant`。
- 新增 Livery 插件详情面：消费 `plugins.detail.actions`、`plugins.detail.badge`、`plugins.detail.section`（`scope:'root'`、`kind:'list'`、`ownerProps:['subject']`），展示构建版本、启动握手状态、宿主/adapter/契约哈希/catalog profile、目录阶段、已应用 CSS hash、当前风格与壁纸等可观测事实；提供真实操作 “Open Livery”（仅主面板注册存在时）与 “Copy diagnostics”。不添加更新按钮、不拦截宿主安装控件。slot 声明证明覆盖 8 个宿主中的 6 个；`0.2.1-rc.2`（Web）由运行时 detail 检查覆盖，`0.2.1-rc.3`（Desktop）暂无运行时 detail 检查，作为 per-scope limitation 记录，不是已通过声明。
- 新增 `contracts/dsh/client-slot-declarations.json`（repo-only 的 per-host slot 声明证明）与 `scripts/client-slots-proof.mjs`；`clientSlotHash()` 随消费的 detail slots 变化，contract 测试与 release-check 校验其一致性。
- 新增真实升级验收路径：`scripts/acceptance/web.mjs --update-from <0.2.1.tgz>` 在隔离 DSH_HOME 中通过运行中 Host 的 Add plugin 对话框安装候选包，并记录 schema v3 `transition`（from/to sha、无页面重载、stale boot、catalog 重新采用、manager outcome）；配套 `REQUIRED_UPDATE_CHECKS`、`release-evidence` v3 校验和 `prepublish-check --require-update`。本地 0.2.2-rc.5 Web 探针已通过（0.2.1 `78f1c8d1…` → 0.2.2 `3b2e4b38…`，35 pass / 0 fail / 2 skip / 1 warn），正式 evidence 需在冻结候选上重跑并提交。
- Web HMR stale-boot 修复：`BootCheck` 增加 `stale`；精确 allowlist `STALE_BOOT_VERSIONS = ['0.2.1']`，严格校验已认证 `(hostVersion, adapterId, contractHash)` 三元组、entryId、catalog-profile 严格相等与 accepted；其余版本仍 mismatch/fail closed。stale 路径不采纳 boot CSS，catalog 成功后执行一次 catalog 派生的 `applyConfirmed` 并恢复已保存壁纸/配置。该声明的边界仅为 Web Profile：Desktop 更新后仍需 renderer 重载或重启应用，不声称 Desktop 热更新。

### Changed

- 壁纸来源不变量更新为“两张背景预设卡（`No wallpaper`、`Follow style`）+ 四个图片来源页签”；默认图片来源为 Built-in，打开壁纸页不发起网络请求，首次激活 Online 页签只请求一批（仅 idle 状态），之后切页签不重新请求；搜索、Random、Refresh、Retry 是其余请求触发点。无轮询、无预取、无遥测。
- 在线壁纸不再默认走 Picsum：Auto 只会在通过门禁的来源中选择；Picsum 从来源列表移除。
- 远程图片下载改为 provider 声明的 `imageHosts`/`redirectHosts` 策略（精确主机或 `*.` 通配，禁止后缀匹配；`redirect:'error'` 或校验最终 URL），替换 Picsum-only 的 redirect 分支。
- client gzip 预算从 60 KiB 显式上调到 **72 KiB（73,728 B）**（评审通过，用于壁纸工作室/provider 注册表/详情面）；per-livery/boot CSS 从 13 KiB 显式上调到 **14 KiB（14,336 B）**（`MenuSurface`/jobs fill token 增加约 176 B；legacy typography probe fixture 达到 13,409 B，shipped profile 为 10,366 B）；host gzip 保持 360 KiB；tarball 上限保持 **4 MiB（4,194,304 B）**，README 图片使用保画质的压缩/尺寸调整，不提高上限。
- 为保持 72 KiB client gzip 上限，精简了若干状态/预设/错误提示文案（含义不变，仅缩短措辞）；验收 probe 的 gzip 测量改为与 build 相同的 zlib level 9（旧默认级别会高估约 318 B）。这是一次显式的预算适配，不是静默放宽。
- README/README.zh-CN/SECURITY/NOTICE 与 interfaces/compatibility/wallpaper-workbench/style-system 设计文档更新到 0.2.2 目标状态；README 壁纸说明不再声称使用真实在线照片。
- `docs/design/interfaces.md` 修正 “synchronous slot-spec probing” 的旧描述：实现通过 `ctx.slots.inject` 注册，settings fallback 有 1500 ms grace，测试禁止 `slots.spec`。

### Fixed

- 修复 0.2.1 client 对任意插件版本差异 fail closed、导致 HMR 重试与 stale-profile 分支不可达的问题。stale 路径不信任 `catalogUrl`/`bootStyleId`，config fallback 不回退到旧 boot skin；catalog 重试失败时 fail closed 到 degraded/stock 并移除 boot artifacts，`retryCatalog()` 可在不刷新页面的情况下恢复。
- 修复 stale boot HMR 期间只校验 `compilerVersion` 是否为字符串的问题：上一构建编译的 catalog 即使 200/自洽也视为瞬态失败，继续消耗重试并在最终失败时 fail closed 到 degraded/stock；update probe 现在断言捕获的 catalog `compilerVersion === 候选版本`。
- 修复 preset 导入远程壁纸后当前会话已选中但图片为空、必须 reload 才显示的问题：provider attribution 的二次 provenance 写入不再清除已缓存图片的 object URL（本地图片 URL 是渲染状态，不是 credit 元数据）。
- 插件详情 facts 从 UA `<dl>` 默认排版改为紧凑网格（`.livery-detail__facts`），并补 `dd` 间距归零；真实插件详情页截图验证。
- 在线结果与 Recent 重应用下载失败时不再静默丢弃：显示带稳定 id/role=alert 的错误提示，提示词新增 `wallpaper.downloadFailed`。
- 修复远程 selection 写入时重建紧凑对象、丢弃 provenance 的问题；0.2.1 产生的重写仍显示图片，但会丢弃 provenance（0.2.1 无该字段）。
- 修复 `sourceId`/`revision` 跨标签页竞争可能让落后标签页覆盖胜者 style sidecar 的问题：写入前重新读取主记录，identity 不一致时跳过 sidecar 写入；Clear local data 保留主记录与 style sidecar。
- 修复 Openverse notice 在 preset 导入与 Recent 重新应用后消失：`PresetAttribution` 与 `RecentWallpaperEntry` 增加 providerId，并补齐 Recent 写入/合并路径（`addRecentEntry`/`mergeRecentEntries`）的字段保留；面板仍从持久化 credit 派生 notice。
- 统一 `acceptance/evidence` 与 `release-evidence` 的 fresh-install required-check 列表（含 `plugin.detail.*` / `visual.menu-surface-opaque`），避免最终 gate 接受缺少 detail check 的 evidence；stable host 的 slot proof waiver 文案改为明确“Desktop 尚无 runtime detail check，记录为 limitation”。
- 修复插件详情 facts section 在首帧把 runtime 类方法直接传给 `useSyncExternalStore` 导致的 `this` 丢失异常；改为稳定的绑定 wrappers，并用真实 class-like runtime 测试回归。
- 修复 Openverse 商标提示在刷新/预设/Recent 后消失：现在也从持久化的 `provenance.providerId` 派生；429 无 `Retry-After` 时增加 30 s 客户端冷却，且服务端 `Retry-After` 上限钳制为 60 s，避免单个来源的 24h 头让整个 Online 页签瘫痪；Wikimedia Random 补 gate 证据；gate id 与 registry 统一并在 release-check 交叉校验，registry 解析改为从 `ProviderId` union 读取、新增 provider 漏门禁时 fail closed。
- 修复 style sidecar 事件不被观察与 clear 顺序：controller 现在订阅 sidecar key，clear 按 plan 先删 sidecar 再写 tombstone；补 winner/sidecar-key 事件测试。
- 修复宿主浮层菜单的真实表面：0.2.1 只把 `--dsw-specific-menu` 改成不透明，但 `MenuSurface.module.css` 实际绘制用 `--dsw-menu-surface-fill`，且 jobs live row 直接读取未声明的 `--dsw-alias-fill-l1/l2`。0.2.2 现在拥有 `menu-surface-fill`（不透明 layer-1，与 `specific-menu` 同步）并强制输出 `fill-l1/l2`（layer-1/2）；stock style + wallpaper 时通过 `body[data-dsh-wallpaper]:not([data-dsh-livery])` 补齐同样的不透明表面。0.2.1 的 `specific-menu` 修复不覆盖这些表面。
- 移除在线壁纸打开页面即自动请求 Picsum 批次的行为。

### Removed

- 从 0.2.2 provider 列表移除 Picsum（Unsplash 许可禁止这种编译/再发布用途）；已有 Picsum 远程选择仍通过 legacy 缓存路径渲染，新结果不再携带 `license:'Picsum'`。
- 不列入 NASA（权利不可机器验证、图片 CDN CORS 不一致，拒绝）、The Met（图片 CDN 无 CORS，推迟）、Art Institute of Chicago（Cloudflare 验证受阻，推迟）；Pexels、Pixabay、Unsplash 继续拒绝；无 API key、无 Host proxy、无 `web_fetch` 依赖。
- 移除 README 中 “24 张内置壁纸” 的旧表述，统一为 “24 张总量：8 张精选 + 16 张 Classic”。
- 移除 0.2.1 中包含未署名在线照片的 `wallpaper-studio` README 截图；0.2.2 截图必须在最终验收候选上重新采集（内置 CSS 壁纸，或带 `NOTICE.md` 署名的 CC0/公有领域照片）。

### Compatibility

- 0.2.1 继续可读主壁纸记录（schema v2）与 v1 预设；0.2.2 的 style 只写入 sidecar，0.2.1 不会删除它。
- 已记录的降级限制：0.2.2 选择 Style 后，0.2.1 的任何壁纸状态写入会使主记录 identity 前移，升级回 0.2.2 后 Style 不再显示（sidecar 字节保留但被忽略）；0.2.1 拒绝 v2 预设（既有 `schema-version` 错误）；0.2.1 重写远程 selection 会丢弃 provenance URL。
- 打包 README 截图必须遵循许可规则：使用 Livery 自己的内置 CSS 壁纸，或带 `NOTICE.md` 署名的 CC0/公有领域照片；在线图片仅在运行时获取，不随包分发。

## [0.2.1] — 2026-11-23

### Fixed

- 修复无 backdrop blur 的浮层菜单仍使用 70% 半透明底色、导致后台任务详情等卡片透出下层文字的问题。所有 Livery 风格的 `--dsw-specific-menu` 现在使用不透明的 layer-1 表面。
- 修复 Web/Windows/macOS drawer 与 macOS ordinary sidebar 的有效透明度不一致：直接绘制路径现在匹配宿主合成后的 34%（浅色）/ 42.5%（深色）alpha。
- 补充分层菜单不透明度与 sidebar 有效 alpha 的回归测试。

## [0.2.0] — 2026-11-21

### Added

- Visual language pass: 3 new local CJK stacks (`kai-cjk`, `fangsong-cjk`, `rounded-cjk`), per-style Chinese UI/content families, and stronger secondary/tertiary label hierarchy.
- L5a Studio Decoration now covers 26 of 28 styles (grid/dots/rules/frame derived from the surface axis); `solid` and `glass` stay plain.
- macOS sidebar legibility: sidebar fill is frosted at `min(94, 100 - frost + 20)` so the rail is distinct and readable while retaining a wallpaper trace; acceptance measures the real `sidebarCol` DOM composite.
- v2 manifest protocol: `presentation` axes (geometry/border/elevation/material/chrome/density/transcriptWidth/texture/studioDecoration/navigation/messages/motion), v1→v2 normalization, and four v2 archetype manifests (`graphite`, `clay`, `cinnabar`, `rice-paper`); other 24 styles remain v1-normalized.
- Catalog v2 envelope with full grammar identity, `grammarHash`/`catalogHash`, per-livery static presentation axes, compact audit summary and canonical recipe parameters.
- L5a Studio Decoration on Livery-owned gallery/wallpaper/settings surfaces: `studio-grid`, `studio-dots`, `studio-frame`, `studio-rules`, with continuous 999/799/599 container tiers.
- Exact-only runtime policy: unknown DSH builds fail closed before adapter selection; `engines.dsh` remains installability-only.

### Changed

- Split manifest/catalog/preset schema versions; v2 manifests no longer hand-declare capability lists (derived from base axes + recipe registry).
- Compiler derives static presentation axes and emits runtime-safe catalogs; full contrast detail stays in audit artifacts rather than the boot bundle.
- Client catalog validation requires catalog v2 grammar/hash fields.

### Fixed

- v1 `messageFlow` normalizes to `presentation.messages.flow`; surfaceStyle expansion is frozen for all 12 recipes.
- Runtime audit payload no longer inflates the host gzip budget; host/client budgets remain within limits.

## [0.1.9] — 2026-11-16

### Added

- 视觉风格页改为紧凑目录：当前风格为 220×138 摘要条，28 套风格在一个连续网格中展示，分类 chip 成为唯一分类导航，不再重复六段分组标题；默认按表面配方从粗野/终端/胶囊/编辑/玻璃向柔和排序，第一屏先展示形状差异。1440 宽下为 6 列，1024/767 为 3 列；1440 的目录滚动高度从约 2788px 降到 1480px，无横向溢出。
- 风格卡片新增三项由编译数据派生的“风格 DNA”：表面配方（终端/粗野/胶囊/纸张/玻璃等）、组件 chrome（素色/着色/描边/深侧栏/素纸/海报）与 UI 字体族（无衬线/衬线/等宽/展示/圆体），卡片不再重复长描述，描述保留在摘要条和原生 title 中。
- 新增 4 套原创 palette：蓝图 Blueprint（工程图纸 + 等宽标签 + editorial/outline）、包豪斯 Bauhaus（明黄/钴蓝 + 几何展示字 + brutal/poster）、陶土 Clay（赤陶 + 胶囊 + pill/tinted）、磷光 Phosphor（绿色 CRT + 方形终端 + terminal/terminal）。四套均含完整明暗 seeds、字体、字号阶梯与预览。
- 适配 DSH `0.2.2-rc.5`（当前 npm `latest` / 本机 Desktop）：新增冻结契约、adapter、slot 声明和 Web/Desktop 验收。
- 适配 DSH `0.2.2-rc.3`（当前 npm `next` / 本机 Desktop）：新增冻结契约、adapter、兼容 catalog profile override 和 Desktop 验收；Web/Desktop rc.3 均已完成验收。
- 新增可选 `layout.chrome` 组件配方轴：`plain`、`tinted`、`outline`、`terminal`、`editorial`、`poster`，只改侧栏、composer、气泡、导航 active、selector 等已消费 token；配方由每套配色的种子在 OKLab 中推导，28 套风格分别分配，对比度矩阵 0 失败。
- 新增 3 个表面配方 `brutal`、`pill`、`editorial`，并启用既有 `terminal`：`graphite` 改为终端、`cinnabar` 改为粗野、`sakura` 改为胶囊、`rice-paper` 改为编辑。预设总数增至 28，形状/阴影/边框轴明显拉开。host gzip 预算从 320 KiB 上调到 360 KiB（实测 353,625 B），client gzip 仍在 60 KiB 内（实测 60,084 B），tarball 预算从 3 MiB 上调到 3.5 MiB（实测约 3.22 MB），构建/打包门禁同步更新。

### Changed

- 版本面升级到 `0.1.9`（package、`LIVERY_VERSION`、`CATALOG_COMPILER_VERSION`、生成物、README/CHANGELOG 与设计文档）。
- host gzip 预算 320 → 360 KiB（实测 353,625 B），tarball 预算 3 → 3.5 MiB（实测约 3.22 MB）；client gzip 保持 60 KiB 上限（实测 60,084 B）。这些上调随 28 套内容显式记录，构建/打包门禁同步。

### Fixed

- 修复预览 SVG 不解析无单位 `0` 圆角、导致方形配方回退为 16px 预览圆角的问题；粗野/终端/编辑配方现在在画廊中真实呈现方形几何。
- 修复 macOS 普通侧栏在壁纸模式下比右侧主内容区明显更透、白字对比度不足的问题：宿主把 `--dsw-specific-sidebar-fill` 以 40%（浅色）/ 50%（深色）合成进 `--dsw-specific-sidebar-tint`，而壁纸 frost 又先把 fill 降到 65%，两层相乘后侧栏只剩约 26–33% 不透明度。现在按同一 frost 比例直接写入 `--dsw-specific-sidebar-tint`（浅色模式保留宿主 97/3 的蓝色偏移），侧栏与主栏共享同一透明度；Web/Windows 与 macOS 抽屉路径仍使用 fill。设计说明见 `docs/design/wallpaper-workbench.md` 的 Sidebar surface。

- 修复热更新跨版本时的 catalog-profile 误判：插件自身版本变化会带来新的 catalog profile，但 HMR 仍持有旧 boot payload；现在按匹配 adapter 接受旧 profile、重新拉取并校验 live catalog，并延长 HMR 窗口内的 catalog 重试。
## [0.1.8] — 2026-11-12

### Changed

- 兼容架构重构：新增 API 兼容的运行时回退（0.2.2+ 同系列版本复用最新 certified adapter，`engines.dsh` 改到 `>=0.2.1-rc.2 <0.3.0`），不再为每个 rc 版本新增完整 catalog profile。
- 新增 `contracts/dsh/catalog-profile-overrides.json`：经 review 的跨 token-contract profile 复用；DSH 0.2.2-rc.2 复用 rc.1 profile，host bundle 不再随每个 rc 线性增长。
- 新增 DSH 0.2.2-rc.2 adapter/契约与验收：Web/Desktop 入口 preview；隔离验收通过后进入发布链。
- 兼容模式不再静默：诊断输出 `gate.compatibility-fallback`，exact evidence/claim 仍绑定精确版本。

### Fixed

- DSH Desktop `0.2.2-rc.2` 更新后插件被 exact allowlist 拒绝的问题。
- 热更新握手：client 新版本看到旧版本 boot payload 时不再按 plugin-version mismatch fail closed；adapter identity 一致时标记为 HMR 警告，重新拉取 live catalog 并恢复已保存皮肤。
- HMR recomposition 期间 catalog 路由短暂不可用时增加有限重试，避免 Web/Desktop 页面落到 “视觉风格暂时无法加载”。


## [0.1.7] — 2026-11-11

### Fixed

- 恢复在线壁纸结果缩略图：Online 结果卡重新渲染图源 thumbnail 图片，加载中/失败时保留本地骨架回退。此前只渲染骨架，正常检索结果看起来像空白，但点击后壁纸仍能生效。
- 修复壁纸在左侧导航栏边缘被截断：将 `--dsw-specific-sidebar-fill` 纳入壁纸 frost surface 集合，侧栏随壁纸一起透出；不写宿主 hashed class。
- 统一插件页面 surface：为宿主 `--dsw-alias-bg-layer-1/2/3` 增加 livery 颜色一致的轻微 elevation ramp，并映射第三方插件使用的 `--color-*` 调色变量，使轨迹、上下文、编队等页面与风格页使用同一套颜色和层级。
- 更新验收：`wallpaper.online-thumbnails` 现在要求结果卡图片数量、成功加载数量和 fallback 同时成立；在线壁纸验收直接覆盖缩略图渲染。

### Changed

- 版本面升级到 `0.1.7`（package、LIVERY_VERSION、CATALOG_COMPILER_VERSION、生成物与文档）。
- 在线壁纸说明补充：打开 Online 页签会加载图源缩略图；网络行为与来源页签一致，仍无后台请求或遥测。

## [0.1.6] — 2026-11-05

### Added

- 适配 DSH `0.2.2-rc.1` 的 Web 与 Desktop 入口：新增冻结契约、正式矩阵、adapter 注册、`engines.dsh` allowlist 和验收探针镜像。
- 支持 0.2.2 的 peer-scoped index injection/rendering 与新的 188-token 契约；新增语义/静态 token 继承边界，保留宿主语义色。
- 新增 0.2.2 Desktop macOS 真实 Electron 入口验证（Electron 44.7.0 / Node 24.21.0 / Chromium 152.0.7977.130）。

### Fixed

- 修复壁纸工作台在中等宽度被压成横条、预览图严重裁切的问题：移除 `max-height` 变形约束，保持 16:9；1024px 使用双列工作台，窄屏改回全宽比例预览。
- 壁纸来源选择保持单卡四页签；来源入口在常见宽度下不再被异常压缩。
- 壁纸页当前壁纸与效果卡在宽屏等高对齐，避免一侧高一侧低、底边错位；1024/767 使用等高单列，保持左右边缘一致。
- 恢复“视觉风格”标题旁的插件版本号标识（`v0.1.x`），并加入验收断言防止后续重排时再次丢失。
- 视觉/布局验收与 README 样式截图改用真实在线 Picsum 壁纸，不再用内置壁纸作为风格、frost、atmosphere 和矩阵截图的基准。
- 1024/767 壁纸工作台明确采用单列滚动口径；仅 1440 并排布局承诺首屏可见来源页签。

### Changed

- README/README.zh-CN 基于 0.1.6 重新梳理：发布状态、0.1.6 更新、功能、在线壁纸展示、精确宿主支持矩阵、安装与验收层级化，移除过时的发布冻结段落。
- 新增 `docs/design/wallpaper-workbench.md`，记录 0.1.6 壁纸工作台断点、等高规则、16:9 预览和在线壁纸验收策略；`docs/README.md` 同步索引。
- `AGENTS.md` 新增文档纪律：版本适配、样式/布局/能力变化必须同步 README/CHANGELOG；重要设计变更随版本落到 `docs/design/`，小改动仍需 CHANGELOG；随包文档变化必须重建候选并重新验收。
- 版本面升级到 `0.1.6`（package、LIVERY_VERSION、CATALOG_COMPILER_VERSION、生成物与文档）。
- 0.2.2 的多 profile catalog 使 host gzip 与 livery/boot CSS 预算上调；在文档与构建门禁中明确记录，不静默放宽。

## [0.1.5] — 2026-11-01

### Added

- 适配 DSH `0.2.1-rc.5` 的 Web 与 Desktop 入口：新增冻结契约、正式矩阵条目、adapter 注册和 `engines.dsh` allowlist。
- Desktop 侧按真实 `DeepSeek Harness 0.2.1-rc.5` macOS 应用（Electron 44.7.0 / Node 24.21.0 / Chromium 152.0.7977.130）完成入口验证。
- 验收探针的 certified-adapter 镜像与 Desktop 运行时身份检查支持 rc.5 动态版本。
- 版本面升级到 `0.1.5`（package、LIVERY_VERSION、CATALOG_COMPILER_VERSION、生成物与文档）。

## [0.1.4] — 2026-10-29

### Changed

- 显式将 client gzip 预算从 56 KiB 调整为 60 KiB，用于容纳新的 Studio 布局/容器查询；实际 57.9 KiB，已在构建与验收门禁中同步。
- 重构视觉风格与壁纸页面的信息层级，采用当前工作区、内容选择区和次要管理区三层布局。
- 当前视觉风格改为大幅 16:10 预览，并将预览应用、取消和恢复默认操作合并到当前风格卡。
- 风格画廊改为全宽 4 列布局，搜索、分类、更多标签和预览语言压缩为两行以内工具栏。
- 壁纸来源整合为在线、内置、最近使用、本地与链接四个来源页签。
- 在线壁纸保持 12 条搜索数据但按 6 条分页展示；最近使用改为横向轨道；内置壁纸降级为来源页签。
- 预设与本地数据清理归入默认折叠的管理区域。
- 统一 22/16/14/13/12 五级字号、1.3/1.5/1.35 行高、卡片等级和控件高度。
- 响应式布局主要改为基于插件工作区宽度的容器查询，并保留设置页/回退路径的视口媒体查询；移除 CSS order 改写阅读顺序。

### Fixed

- 修复窄宽度下效果、内置和在线来源出现在当前壁纸之前的问题。
- 修复当前视觉风格预览过小、画廊长期被右栏挤窄的问题。
- 修复在线结果、最近使用和上传模块同时展开导致页面过长的问题。
- 修复模块标题、正文、辅助文字和控件尺寸不一致的问题。
- 修复 1024px 单列工作区首屏看不到壁纸来源入口的问题：压缩壁纸 ON 状态的预览高度，使来源卡在首屏可见。

## [0.1.3] — 2026-10-27

### Added

- Lightweight appearance presets export/import existing styles, builtin/https
  wallpapers, effects and focal position; uploaded blobs, CSS, tokens, fonts,
  local paths and history are explicitly excluded.
- Nine-grid focal position for remote/upload wallpapers, applied to the page
  layer, atmosphere layer, hero preview, reload, tabs and presets.
- Live synchronization of wallpaper selection/effects/position/clear/recent
  history across tabs in the same Web Profile.
- Local wallpaper data cleanup with reported results and storage quota/GC
  boundaries (uploads: current only; remote cache: 24 entries / 128 MiB LRU).

### Fixed

- Pending uploads/sweeps now publish a per-tab upload reference with a heartbeat;
  external selection adoption republishes refs immediately, disposal flushes the
  pending save before removing its ref, and automatic GC is paused when the
  browser cannot provide a cross-tab Web Lock.
- Remote cache candidates are pruned only after the selection commit; the current
  live/durable/persisted images are protected. Same-URL cache writes use a
  cross-tab Web Lock and cancelled operations never delete a potentially newer
  row.
- Picsum's bounded production redirects are followed and the final URL is
  revalidated (https/public/no credentials) before MIME/size/decode checks; an
  actual 302 fixture is part of acceptance instead of a direct-200 mock.
- Recent clear invalidates in-flight remote commits; theme observers are
  reference-counted; preset unmount prevents the wallpaper half of a slow
  application; DOM lease ids use cross-module UUIDs.
- Production IndexedDB store implements atomic `deleteIfGeneration` (get →
  compare token → delete in one readwrite transaction); cache prune, upload GC
  and clear-all fail closed instead of falling back to unconditional delete.
  Record generations are collision-free UUID tokens; legacy rows are upgraded on
  touch. Prune only accounts a deletion when the compare-delete returned true.
- The release workflow consumes an immutable acceptance artifact produced by the
  new `acceptance-artifact.yml` workflow (same expected sha), validates manifest
  sha/bytes/version before use, and checks `LIVERY_ACCEPTANCE_RUN_ID` before
  downloading; it has `actions: read` and never rebuilds the candidate.
- Stock restore now verifies the final confirmed/effective style after the write;
  a newer host style superseding the stock write returns `refused` instead of a
  false success. Added a runtime regression test.
- Custom/Openverse image downloads use `redirect:'error'`; only Picsum's known
  CDN host may follow redirects, with final URL host revalidation. Search-result
  thumbnails no longer issue direct remote `<img>` requests.
- Search JSON is consumed through a streaming 2 MiB cap (reader cancelled on
  overflow), not materialized in full before checking size.
- Session-only uploads (IndexedDB put failed) use a non-persistable controller
  transition: the unreadable upload key is not written to localStorage.
- Runtime observation serial is now the primary supersession signal for same-id
  updates even when the host omits revisions; same-target notifications roll
  forward normally instead of being silently treated as self echoes. `applyStyle`
  checks settled/phase/preview state before the already-effective no-op and only
  enforces writable for an actual config write.
- Recent eviction/clear protect live, durable and persisted remote URLs.
  Client CSS upgrades content when a newer instance supplies different CSS.
- Remote pruning now actually enforces `protectedUrls` as a set (current live,
  durable, persisted and candidate), and prune/delete share the same per-URL
  cross-tab lock as writes. IndexedDB records carry a write generation and use
  atomic compare/delete so a stale prune cannot delete a newer blob.
- IDB errors preserve the original DOMException name/message via `cause`, so
  production QuotaExceededError reaches the quota-prune-and-retry path.
- Manual clear-local-data invalidates in-flight remote commits before cleanup.
  Recent metadata merges write back when full canonical entries differ, not only
  when URL count/order differ.
- Runtime reconciliation uses a local observation serial (not optional host
  revision) so same/undefined-revision updates cannot be overwritten by a late
  write. Wallpaper DOM lease and ref heartbeat start only with `start()`.
- Client CSS first/reused owners share one reference-count release path.
  `applyStyle()` allows the already-active style no-op even in read-only mode so
  wallpaper-only presets still apply.
- Search JSON is capped at 2 MiB; decoded image dimensions are capped at 40 MP
  when createImageBitmap is available.
- Mount sweep now reads live/durable/persisted selections and tab refs INSIDE the
  cross-tab lock (then re-reads protection before each delete); if the browser
  cannot enumerate refs, destructive GC fails closed instead of assuming empty.
- Cross-tab recent clear cancels the receiving tab's in-flight remote commit
  before clearing UI/history, so a late download cannot resurrect the old list.
- Client CSS uses node reference counting rather than the presenter lease, so a
  normal teardown or HMR overlap cannot leave the plugin stylesheet behind.
- Remote-cache prune/delete take the same per-URL cross-tab lock as writes;
  quota errors prune once with current/candidate URLs protected and retry the
  put only once.
- Async recent reads and remote commits capture the shared selection version, so
  selecting a builtin/upload/clear while a read is pending cannot be overwritten.
- Recent metadata merging is ordered by `addedAt` (stable JSON tie-break): older
  events only fill missing fields and cannot replace newer creator/license data.
- Uploaded blobs are staged and committed inside ONE GC critical section: blob
  write, ticket/selection-version check, selection commit, localStorage flush and
  failure rollback cannot interleave with mount/clear GC. A failed persist rolls
  the memory selection back and removes the staged blob.
- Remote wallpapers are downloaded, MIME/decode-verified and cached BEFORE the
  selection is committed; network/IDB/host-safety/decode failure leaves the
  previous wallpaper in place instead of persisting an unrenderable remote URL.
- A per-tab cross-tab upload reference table protects live/durable upload keys;
  clear-all additionally re-reads the persisted selection. Delayed GC checks
  live, durable, persisted and all live tab refs under the shared lock.
- Recent-history clear propagates as an authoritative removal instead of being
  merged back from stale local entries; same-URL updates preserve metadata.
- Remote cache follow-ups revalidate the final response URL, use redirect:'error',
  preserve the real image MIME, optionally decode-verify via createImageBitmap,
  and serialize same-URL writes so an older put cannot commit after a newer one.
- All config write entries share a central writable gate; same-id/higher-revision
  host updates supersede an in-flight write; presenter and wallpaper DOM layers
  use cross-module DOM leases; attribution is persisted and remote presets
  without attribution suppress stale history credit.
- Uploaded blobs are deleted only after the replacement state is persisted, with
  a delayed cross-tab convergence window; mount/clear GC protects the live, last
  durable and currently persisted selections, and upload commits are serialized
  with GC through a shared lock.
- A pending upload captures the selection version before its IndexedDB write and
  aborts if a local or cross-tab selection changed; picking an invalid file also
  cancels an earlier slow upload.
- Same-revision multi-tab writes converge to the deterministic maximum
  `(revision, sourceId)`, not merely against the local tab id, so three or more
  tabs converge regardless of event order.
- IndexedDB blocked/error/versionchange recovery reopens on the next operation;
  cache operation tokens prevent a cancelled same-URL download from deleting a
  newer record; LRU touch is a single transaction and cannot resurrect cleared
  rows.
- Recent history merges concurrent additions and preserves metadata when the
  same URL is selected again; attribution derives from the persisted recent
  metadata so it survives style-tab remounts.
- Preset import/export rejects deep/cyclic/non-JSON structures with stable
  `invalid-json` errors (no stack overflow), and portable URLs reject
  single-label, site-local, multicast and mapped-private hosts.
- Boot-less/unknown hosts wait for catalog certification before wallpaper starts;
  the direct style apply API enforces `configStatus==='ready' && writable`; the
  theme service is declared as an injection dependency.
- Wallpaper DOM layers carry an ownership lease, so an older plugin/HMR instance
  cannot clear the newer instance's stylesheet/overlay; clipboard results are
  operation-ticketed.
- Acceptance evidence is bound to sanitized raw probes, summaries, host/adapter
  identities, report hashes and the run commit; critical checks are re-derived
  from probe check statuses. Desktop user-data directories are unique and cleared
  per run; Web defaults are unique per process.

- Uploaded blobs are deleted only after the replacement state is confirmed
  persisted; a failed localStorage write leaves the old upload recoverable.
  IndexedDB read failures no longer count as a missing upload.
- IndexedDB v2 upgrade handles blocked/versionchange connections, migrates v1
  rows inside the versionchange transaction, and waits for transaction commit
  before reporting put/delete/clear success.
- Concurrent same-revision writes from two tabs converge deterministically by
  source id and persist the winning state, preventing split histories.
- Local-data cleanup re-reads the live selection before each async delete, and
  remote cache cancellation is checked after the put await so a stale download
  cannot update the LRU index or prune the new current wallpaper.
- Preset import/apply operations carry generation tickets: consecutive imports
  cannot overwrite each other, apply captures its own preset, and stale results
  cannot clear a newer import.
- Attribution is bound to the wallpaper identity; cross-tab selection changes
  cannot show/export another wallpaper's credit. Partial preset failures no
  longer commit attribution.
- Preset URLs reject loopback/private/link-local IPv4, IPv6 ULA/link-local and
  IPv4-mapped private addresses; attribution text is validated as plain text
  (length/control chars) rather than CSS/path payload rules.
- Thumbnail object URLs are owned by one ref map and released without leaving
  cached state behind; cache loads refresh the LRU timestamp; URL/upload ARIA
  associations and clipboard rejection handling are complete.
- Release workflow pins every job to the triggering SHA; acceptance evidence
  must include explicit passing critical checks, and the acceptance selftest is
  part of `pnpm verify`.

- Web certification now records and enforces the exact Chrome version
  (`156.0.8078.48`); the acceptance harness fails on any other system browser
  version instead of silently accepting `minVersion`.
- Desktop evidence no longer contradicts itself: skipped first-paint sampling is
  reported as not verified, the report distinguishes renderer certification from
  native window certification, and the release gate checks report claims against
  the support matrix.
- Uploaded wallpapers and remote wallpaper caches no longer accumulate orphaned
  IndexedDB records: replaced/cleared uploads are deleted, cached history entries
  are evicted with their blobs, and the cache is bounded by 24 entries / 128 MiB
  LRU with the current wallpaper protected.
- Remote wallpaper downloads check `Content-Length` and stream body chunks with a
  15 MiB cap and timeout, so oversized responses never fully enter memory. Remote
  URLs are rendered only from the verified cached blob; the raw URL never enters
  CSS (no bypass of credentials/timeout/size/content-type checks). Failed
  downloads keep the history entry but show no unsafe fallback image.
- The visually hidden native file input is removed from the Tab order, the
  dropzone has a visible focus ring and a single Enter/Space activation, and
  upload/URL errors stay linked to both visible controls through ARIA.

### Changed

- Wallpaper persistence is now schema v2 (revision + selection + effects +
  focal position) with lossless migration from 0.1.2 flat records.
- Release tooling derives the version, candidate tarball name and evidence list
  from `package.json` and the formal support matrix; no release script or workflow
  path hardcodes a version or tarball name. `release:prepare` no longer lists
  evidence files manually.
- After npm publication, a workflow job downloads the exact registry tarball,
  verifies its sha256, byte size and package version against the accepted
  candidate, and fails the release without republishing on mismatch.
- GitHub Release assets include the accepted tarball, `SHA256SUMS` and the release
  manifest.
- The formal matrix now distinguishes `claimTier` (`stable`/`preview`),
  `distributionChannel`, exact `certifiedBrowserVersions`,
  `certifiedRuntimeVersions` and upstream provenance. `0.2.1-rc.4` has an
  upstream GitHub prerelease tag and npm `next` package, but remains a preview
  until the GitHub release is non-prerelease and the npm channel is `latest`.
- The npm package carries only the current documentation tree and shipped
  contracts; historical archive material and the proposed matrix are no longer
  packaged. The 0.1.2 evidence and CHANGELOG entry remain unchanged.

### Compatibility

- DSH `0.2.1-rc.2` Web/Chrome, `0.2.1-rc.3` Desktop/macOS and `0.2.1-rc.4`
  Web/Chrome remain the exact allowlist.
- Desktop Windows, Web Edge and other DSH builds remain unsupported.

## [0.1.2] — 2026-10-27

### Added

- Next-channel preview for DSH `0.2.1-rc.4` Web/Chrome 155 alongside the stable
  `0.2.1-rc.2` Web and `0.2.1-rc.3` Desktop/macOS adapters. The rc.4 package was
  verified from the signed official npm `next` tarball; upstream has no matching
  GitHub tag yet, so this is preview compatibility, not a stability promise.
  `engines.dsh` admits the exact allowlist
  `0.2.1-rc.2 || 0.2.1-rc.3 || 0.2.1-rc.4`; rc.4 Desktop is not claimed because
  no rc.4 Desktop app was available.
- Desktop docs now cover the local-npm-tarball fallback for the plugin manager's
  ~24-hour minimum-release-age/supply-chain window: `npm pack`, verify sha256,
  then install the local `.tgz` through the app-bundled CLI and restart.

### Fixed

- The global wallpaper atmosphere now sits below host floating surfaces
  (Menu/Tooltip/HoverCard `z-index` 100/101, Modal 1000, Toast 1100) instead of
  tinting menus, tooltips, dialogs and toasts from above.
- Frost no longer rewrites host-modal, input or tooltip surface tokens. Host
  `--dsw-alias-bg-layer-2`, `--dsw-alias-bg-layer-1` and
  `--dsw-alias-tooltip-bg` stay opaque; plugin cards keep their glass effect via
  the plugin-private `--dsh-livery-card-surface` variable.
- `forced-colors` and `prefers-reduced-transparency` now suppress the frost token
  overrides, the private card surface and card backdrop blur; decorative wallpaper
  layers remain hidden.
- Top tabs expose an `aria-selected` visual state and built-in swatches expose an
  `aria-pressed` outline/ring; light-swatch labels gain a dark gradient and text
  shadow for contrast.
- Upload controls no longer show a duplicate native file input: the native input
  is visually hidden and the dropzone is clickable, focusable and Enter/Space
  operable; upload/URL errors are linked with `aria-invalid`,
  `aria-describedby` and `aria-errormessage`.
- Narrow layouts wrap the search toolbar, show effects/built-in wallpapers before
  online/upload modules, keep the empty wallpaper state 16:9 to prevent layout
  jump, and bound diagnostics with wrapping/scrolling.

### Known limitations

- All host surfaces that use `--dsw-alias-bg-layer-2` stay opaque under frost
  (not only Modal). This is an accepted product boundary for 0.1.2; plugin-owned
  cards retain the glass effect through their private surface token.
- The global atmosphere layer is deliberately below all floating UI. It tints
  page surfaces only where host layering permits it; opaque third-party plugin
  pages may show no perceptible atmosphere change, and no visual-coverage over
  other plugins is claimed.

## [0.1.1] — 2026-10-27

### Added

- Desktop app support for DSH `0.2.1-rc.3` on macOS: official plugin-manager
  install, Electron renderer acceptance, shared catalog profile with Web rc.2.
- Package engines now admit the exact allowlist `0.2.1-rc.2 || 0.2.1-rc.3` and
  the two certified Node runtimes (`^22.23.1 || ^24.21.0`).

### Changed

- Release workflow and acceptance harness cover both Web rc.2/Chrome 155 and
  Desktop rc.3/macOS; publish uses both committed evidence files.

### Known limitations

- Native macOS window chrome, traffic lights/leading, vibrancy, Dock/rightbar and
  OS-level DPI are host-owned and outside the plugin certification surface.
- Desktop Windows, Web Edge and other DSH builds remain unsupported.

## [0.1.0] — 2026-10-27

DSH Livery: a token-only visual layer for DeepSeek Harness with 24 styles,
a wallpaper studio, a curated gallery and a certified/compat version policy.

### Added

- **24 built-in styles across five visual axes.** Palette (OKLab seeds → complete
  light/dark token set), typography (10 local-only font stacks, 9 metric profiles),
  shape (`--dsw-radius-*`, `--dsw-corner-shape`), elevation/material (hairline,
  elevated, glass) and border/focus treatment. 10 originals + 12 palettes inspired
  by permissively licensed projects (attributions in `NOTICE.md`) + 2 original
  Chinese-aesthetic designs (青瓷 Celadon, 朱砂 Cinnabar).
- **Wallpaper studio** (client-only): 8 built-in CSS wallpapers, user-initiated
  online search (Openverse CC0/PDM) and random refresh (Picsum), custom https image
  URL, blur 0–24px / dim 0–70% / frost 0–100% effects, and local persistence
  (`localStorage['dsh-livery.wallpaper.v1']`). One plugin-owned wallpaper layer
  (`style[data-plugin-css="dsh-livery/wallpaper"]` + `body[data-dsh-wallpaper]`)
  using body pseudo-elements and `color-mix` surface translucency. The only
  networked feature; requests are user-initiated (see SECURITY.md).
- **Main-page entry**: a left-sidebar plugin panel **视觉风格 / Visual styles**
  (`main` keyed slot + `sidebar.panellist` row, order 30), with a second page tab
  **壁纸 / Wallpapers**. Forward-compatible entry detection falls back to the
  legacy settings page on hosts without panel navigation.
- **Wallpaper studio expansion (round 9)**: 24 CSS-only built-in wallpapers;
  user file upload (JPEG/PNG/WebP/AVIF, ≤10 MiB) stored in IndexedDB and restored
  after reload; https URL kept; both wallpaper layers are viewport-relative `cover`
  with an `inset:-24px` blur bleed (adaptive to any window aspect); new **global
  atmosphere overlay** above app content (`pointer-events:none`, soft-light,
  default 30 %) so the wallpaper is visible on third-party plugin pages with opaque
  surfaces; page tab now remembers the last active tab across workspace
  remounts/navigation (`sessionStorage`).
- **Studio layout redesign (round 10)**: both pages use hierarchical, responsive
  card modules instead of a flat list; wallpaper page = hero preview + search-first
  online card + custom upload/URL cards and a rail with compact bounded 140 px
  effect sliders (no viewport-wide sliders) + 24-swatch grid; style page =
  current-style hero (preview thumbnail) + gallery card + 操作/自检 rail; stacks
  below 1100 px with no horizontal overflow.
- **Recent wallpapers + product name (round 13)**: used online wallpapers are kept
  in browser-local history (`localStorage['dsh-livery.wallpaper.recent.v1']`, max
  24, newest first) and shown in a Recent wallpapers card where they can be
  re-applied; images are cached in IndexedDB when the server allows CORS, with the
  original URL as fallback. Clear history removes local records. The visible
  product name is **DSH Livery**; an editorial label used in earlier docs has been
  removed.
- **Copy, typography and wallpaper edits (round 11)**: human About footer copy
  (no contract/adapter jargon; ids stay in the copyable diagnostics); a single
  five-step typography scale shared by both pages; removed the non-loading curated
  category library and replaced it with one search-first **在线壁纸 / Online
  wallpapers** card that automatically loads one Picsum random batch when the tab
  opens, with explicit Openverse search / random / next-batch / retry.
- **Curated gallery**: six style families (calm/nature/light/retro/vivid/dark),
  family-grouped sections and counts, primary family chips, the full 16-tag
  vocabulary behind a 更多筛选/More filters toggle, search, roving keyboard focus
  and a preview-language tab (Follow DSH / 中文 / English; preview-only).
- **Compatibility range + compat mode.** `engines.dsh` is
  `>=0.2.0-rc.2 <1.0.0`. Certified exact builds keep the frozen six-hash contract
  path; in-range uncertified builds resolve to the synthetic `dsh-compat` adapter
  using the newest certified contract (`payload.compat`, `compat.mode`
  diagnostics, panel banner + self-check row). Out-of-range/unreadable versions
  still fail closed. See `docs/design/multi-version.md`.
- **Verification and safety tooling**: contract snapshots/diffs, loader-ABI checks,
  token/CSS/contrast audits, style-value audits, package-content checks, support
  matrix gate, Playwright browser acceptance harness and bilingual docs.

### Changed

- Plugin version was fixed at **`0.1.0`** for the Web-only release; tarball
  `dsh-livery-0.1.0.tgz`.
- **Release-workflow and upload-race hardening (round 18):** later release jobs build
  only the gate CLIs (`pnpm build:cli`) so they work from a clean checkout without
  rebuilding the candidate tgz; every wallpaper selection change (builtin, online,
  URL, clear, recent restore) invalidates a pending local upload ticket, so a late
  IndexedDB completion cannot roll the selection back.
- **Stable limited release:** support scope is DSH `0.2.1-rc.2` + Web Profile +
  Chrome 155 on Node 22.23.1; Desktop/Edge are unsupported/no-guarantee (same-version
  sessions may load but are not certified), and only unsupported DSH builds are
  rejected/fail closed. Production adapters/catalog/stock are generated only from
  the formal released matrix (one adapter, one profile). Compatibility mode is
  removed. Release workflow builds a candidate from the tag, verifies the
  downloaded artifact and evidence on the default branch, and publishes the same
  accepted bytes; `private` is off with `prepublishOnly` bound to the committed
  evidence.
- **Release pipeline (round 14 follow-up):** the release workflow now builds and
  uploads the candidate tarball first, then runs support/release gates on the
  same candidate identity; `gate:release -- --all` requires every packaged adapter
  to have a released matrix entry. `prepublishOnly` runs both gates against all
  adapters, and `pack:candidate` produces the inspected tarball manifest.
- **Final release hardening (round 16):** uploads use a monotonic ticket so a
  late local upload cannot overwrite a newer one; all controller mutations are
  no-ops after dispose; catalog validation covers capability values, light/dark
  seeds and contrast/degraded internals; the client compat branch/UI/i18n keys and
  the unused core compat module were removed. Evidence now includes committed
  report markdown plus sha256 checks so a clean CI checkout can verify it; the
  release workflow has a publish job that verifies and publishes the exact
  downloaded candidate tarball. Uninstall config residue is documented.
- **Runtime hardening (round 15):** boot
  stylesheet text is verified before zero-write adoption; wallpaper does not start
  on a rejected handshake; page tabs have roving focus, arrow/Home/End keys, and
  cancel an active preview when leaving the style tab; wallpaper layers hide under
  `forced-colors` and `prefers-reduced-transparency`.
- **Release posture (round 14):** no build has passed G6, so the project is a
  release candidate, not a release. README/support wording now says candidate /
  draft and the compatibility range is explicitly not a support guarantee. The
  package is marked `private`, `prepublishOnly` runs the support-matrix and
  release gates, and a tagged release workflow runs `pnpm verify`, both gates and
  the packaging check. Community docs and `docs/` are included in the package so
  README links resolve on npm; the bundled `@deepseek-ai/schemastery` MIT licence
  is reproduced in NOTICE.
- Client gzip budget raised to 32 KiB for the wallpaper studio (actual 29,628 B),
  then to 48 KiB for the round-9 expansion (actual 35,062 B); CLIENT_CSS budget
  9 KiB (actual 8,449 B).
- README repositioned around the visual styling feature set (24 styles, wallpapers,
  verification policy), with a certified-vs-compat table.

### Verified

- Published artifact `dsh-livery-0.1.0.tgz`; its exact sha256/bytes/commit are
  recorded in `contracts/dsh/evidence/0.2.1-rc.2-web-chrome.json`. The matrix entry
  is `released` and bound to that evidence file.
- Limited-release acceptance on the exact artifact: Web `0.2.1-rc.2` isolated full
  run **227 pass / 0 fail / 4 skip / 2 warn**, real-profile clone **227 / 0 / 4 / 5**
  (Chrome 155, Node 22.23.1, macOS arm64; the extra clone warning is a clone-only
  dependency-repair warning). Chrome 155 and Node 22.23.1 are the only certified
  versions. Desktop macOS/Windows and Web Edge are unsupported/no-guarantee.
- Repo gates: `tsc` clean, 716 tests (1 optional skip), 103 generated files /
  1 catalog profile in sync, all token/CSS/contrast audits, loader-ABI 8/8,
  `adapter:check`, `pack:check`, both release gates OK on the accepted artifact,
  `verify:evidence` and `prepublish-check` OK.

### Known limitations

- Desktop macOS/Windows and Web Edge are outside the certified scope and receive no
  support guarantee; same-version sessions may load but are not claimed. Only
  unsupported DSH builds are rejected/fail closed. There is no compatibility mode.
- Chrome 155 and Node 22.23.1 are the only certified runtime versions; the build
  target (`chrome120`) is not a browser certification claim. Other Chrome/Node
  versions are not guaranteed.
- Online wallpaper search is mocked in acceptance; live third-party APIs/image
  loading are not part of CI. Wallpaper effects are layer/token-level (no
  per-component backdrop filters), and wallpaper choices live in browser
  `localStorage` rather than the DSH profile.
- Structural layout is host-owned (no public density/transcript-width hook); those
  recipes degrade to host/stock and are disclosed in the self-check.
- Host bundle is ~2.5 MB raw / ~295.7 KB gzip because both catalog profiles embed
  full audit payloads (post-release optimization).
