> **Status note (2026-10-27):** this document is the original implementation plan.
> The shipped 0.1.0 limited release supports only DSH `0.2.1-rc.2` + Web Profile +
> Chrome 155 + Node 22.23.1. Desktop macOS/Windows and Web Edge are
> unsupported/no-guarantee (same-version sessions may load but are not certified);
> only unsupported DSH builds are rejected/fail closed. The authoritative scope is
> `README.md` and `contracts/dsh/support-matrix.json`; the older Chrome 120+/Edge/
> Desktop target tables below are historical.

# DSH Livery 实施方案

本文写于 0.1.0 开发初期，是一份历史实施方案，记录当时的版本基线、阶段计划和风险清单。
文中“只支持精确版本”“壁纸只用内置设计”等说法已被后续实现取代；兼容范围、在线壁纸和
卡片布局等现状，以 README、`package.json` 和验收总结为准。

状态：版本与 Profile 目标已定，契约基线待 Phase 0 签名冻结。

- 目标：为 DSH Desktop 和 Web Profile 提供样式渲染插件。
- 首个实现基线：DSH `0.2.0-rc.2` 精确版本（当时不声明 `0.2.x` 通配兼容）。
- 首版支持：Desktop Profile（macOS、Windows）和 Web Profile。
- 首版界面语言：简体中文 `zh-CN`、英文 `en-US`。

## 1. 结论

DSH Livery 的目标是一套受宿主契约约束的样式渲染系统，覆盖颜色、字体、表面材质和有限的布局样式。它不接管 DSH 的主题偏好，不重绘窗口，不修改宿主源码，也不依赖内部类名或推测出来的 DOM 结构。

整体方案分为四部分：

1. 编译期从皮肤定义生成 light/dark token、字体规则、安全布局规则、预览图和兼容报告。
2. Host 在首帧注入当前皮肤，避免启动闪烁；Client 在设置可用后接管同一份状态。
3. DSH 适配层只处理宿主 API、公开 `data-*`、slot、配置和资源路由，颜色及排版算法不依赖 DSH。
4. 中文和英文共用颜色与组件语义，但分别定义字体、行高、字重、文案长度、搜索词和截图基线，不把英文界面机械翻译成中文。

第一条发布线以本机确认的 DSH `0.2.0-rc.2` 为目标版本。版本号只是索引，真正的兼容身份由 Client loader、Host API、Client API、token、布局和 profile schema 六类契约哈希共同决定。Phase 0 必须先签名并归档这六类哈希，之后才把 `dsh-0.2.0-rc.2-r1` 视为冻结基线；在产物完成前，Phase 1 不得开始。即使版本号相同，只要 required contract 哈希不同，也必须重新认证。

首版只实现宿主安全范围内的样式能力：

| 能力 | 首版策略 |
|---|---|
| 颜色 | 完整 light/dark 语义 token pair |
| 字体 | 按语言切换经过登记的系统字体栈，支持 UI、正文、代码三种角色 |
| 字号与行高 | 只使用宿主公开 typography token；`font-family` 是 MVP 必选能力，字号和行高可按宿主能力降级 |
| 布局 | 使用经过验证的布局配方，只改公开变量和文档化节点，不重排宿主 DOM |
| 壁纸 | Phase 0 验证背景层；通过后进入 MVP，否则从 schema、UI 和验收矩阵移除 |
| 第三方插件 | token 原生插件自动适配；公开钩子或显式 opt-in 插件有限适配；iframe/canvas/terminal 只统一外框 |
| 宿主主题 | 始终跟随宿主，不调用 `theme.register()` 或 `theme.setTheme()` |
| 窗口标题栏 | 不重绘，不占用 `shell.overlay`，不修改 frame padding 或拖拽区 |

## 2. 参考内容分析

### 2.1 `design-notes.md`

[设计审计](design-notes.md) 对旧实现的问题判断是正确的，后续实现应保留这些结论：

- 每个皮肤必须同时提供 light/dark 两种形态。
- 激活时只加载一份皮肤 CSS，不能让全部皮肤常驻。
- 主题通过语义 token 生效，CSS 只处理 token 无法覆盖的少量表面。
- 不注册宿主主题，不改宿主深浅属性，不抢宿主外观控制权。
- 不自绘 Windows 或 macOS 标题栏。
- 不使用元素级全局选择器、CSS Modules 哈希类名和 `!important`。
- 右栏、Dock、全屏、折叠侧栏、窄窗口和高对比度都必须进入验收矩阵。
- 第三方插件兼容应成为明确契约，而不是依靠加载顺序碰运气。

该文档仍有若干待定项。本方案在第 5 节给出首版决定，不把这些问题留到编码阶段。

### 2.2 `references/deepseek-harness-skin`

参考项目中可以复用的思路：

- `plugin/src/skins/color.ts`、`derive.ts` 中的 OKLab/OKLCh 转换、色域收敛和对比度保持算法。
- `extract.ts` 中从图片提取种子色的思路。
- `render.ts` 中由结构化主题数据生成 CSS 的方式。
- `build-skins.mjs --check` 的生成物一致性检查。
- Host 首帧注入与 Client 接管使用同一份主题状态。
- body 自有属性作为皮肤作用域，移除属性即可恢复 stock 样式。
- 图片内容寻址、上传大小限制、文件数量和总容量限制。

不能直接复用的部分：

- 43 次 `ctx.theme.register()`、`setTheme()` 和 `theme/change` 重申逻辑。
- `TitleBar`、frame padding、自绘标题栏及相关 DOM 推断。
- 全文档 `MutationObserver`。
- `[class*='_primary']`、父节点推断和其他内部 DOM 选择器。
- 所有皮肤完整 CSS 一次性注入。
- 只在编辑器中存在、构建时并未真正执行的 JSON Schema。
- 分散在多个文件中的版本号。
- 来源不清晰的图片、角色、商标和品牌素材。
- 依赖作者本机 DSH checkout 中 esbuild 的构建方式。

参考项目的版本演进说明了一个关键问题：DSH `0.1.x` 的源码覆盖、`0.2.0-rc.2` 的 profile 插件和 `0.2.1-rc.2` 的布局状态不是同一套适配面。旧项目把“插件能加载”“token 名没有变化”和“真实布局可用”混在一起，因此经常在 DSH 升级后出现兼容问题。新项目必须分别验证加载 ABI、静态契约和运行时行为，不能再用 README 中的“0.2.x”作为支持依据。

### 2.3 `references/taste-skill`

可以借鉴的是检查流程，不是其中的审美禁令：

- 把浏览器数据采集和规则判断分开。
- 在固定视口生成截图和 JSON 报告。
- 检查真实加载字体、文字截断、横向溢出、低对比度和 reduced-motion。
- App 界面与营销页面使用不同规则。
- 自动检查之后仍保留人工截图复核。
- 每条规则支持有记录的豁免。

不采用“一律禁止渐变、阴影、玻璃、紫色”等 house style，也不采用固定图片数量和动态元素数量。这些规则不适合桌面应用主题系统。

### 2.4 `references/taste-skill-zh-CN`

中文版基于较早的英文架构，可以参考其中的术语翻译，但不能作为当前工具链的基础。中文文案应按大陆简体中文的产品语境单独编写；英文文案也应独立校对，不从中文逐句直译。

## 3. 产品目标

### 3.1 固定版本与 Profile 基线

第一条发布线定义如下：

| 项目 | 固定目标 |
|---|---|
| DSH Livery 发布线 | `0.1.x` |
| DSH 实现基线 | 精确版本 `0.2.0-rc.2` |
| 基线来源 | 当前工作环境 `dsh --version` 已确认；六类哈希尚未冻结，Phase 0 必须记录安装物来源、包集合、文件哈希和签名 |
| Adapter ID | 计划为 `dsh-0.2.0-rc.2-r1`；只有 Phase 0 签名快照完成后才正式生效 |
| Desktop Profile | 正式支持；macOS、Windows 分别认证 |
| Web Profile | 正式支持；独立安装、启动、生命周期和浏览器运行时认证 |
| Web 浏览器 | 首版认证 Chrome 120+、Edge 120+；构建 target 固定为 `chrome120`，Safari/Firefox 不在首版支持声明中 |
| Node | 当前认证环境为 `v22.23.1`；最终 engine range 必须从 DSH `0.2.0-rc.2` 契约原样读取 |
| DSH `0.2.1-rc.2` | 认证候选，不属于首版支持范围；通过全部门禁后才能加入 allowlist |
| DSH `0.1.x` | 不支持，不提供源码覆盖、宿主补丁或 dist 替换路线 |
| 其他 DSH `0.2.x` | 默认不支持，不因 semver 接近自动放行 |

支持声明只接受精确 allowlist，不使用 `^0.2.0`、`>=0.2.0` 或 `0.2.x`。首版支持项必须同时包含精确 DSH 版本、契约哈希、Profile 和平台；Web 项还必须包含浏览器族、最低浏览器版本和 Client 构建 target。计划中的目标支持矩阵为：

```text
DSH 0.2.0-rc.2
├── desktop / macOS     required
├── desktop / Windows   required
└── web / Chrome 120+、Edge 120+   required

DSH 0.2.1-rc.2
└── candidate           not supported until certified
```

Web Profile 与 Desktop Profile 共用主题编译核心，但不是 Desktop 的浏览器替身。两者要分别安装、分别保存配置、分别运行生命周期和视觉测试。Desktop 的原生标题栏、DPI、vibrancy 等结果不能由 Web 测试代替；Web 的 Origin、浏览器信任、硬刷新、多标签页和反向代理场景也不能由 Desktop 测试代替。

如果 Phase 0 发现 DSH `0.2.0-rc.2` 的正式 Client target 与 `chrome120` 冲突，应暂停 Web 认证并修订目标，不能静默扩大或缩小浏览器范围。

### 3.2 必须实现

- 皮肤包含颜色、字体、表面材质和安全布局配方，不局限于换色。
- 每个皮肤生成 light/dark 两套结果并自动跟随宿主外观。
- 中文和英文有独立的字体、排版和文案设计。
- 首帧样式正确，Client 加载后不闪回默认样式。
- 大部分使用 DSH 语义 token 和公开接入方式的插件能自动跟随。
- 自带一套契约快照、覆盖率、对比度、CSS 安全和视觉回归检查。
- 禁用、卸载或加载失败时能恢复 stock 状态，不留下属性、样式或背景节点。
- 内置皮肤和后续自定义皮肤走同一条编译与渲染路径。
- Desktop 与 Web Profile 都能通过正式 profile 机制安装和卸载，不直接改 profile manifest 作为发布路径。
- 遇到未认证 DSH 版本或 required contract 不匹配时 fail closed：不注入样式、撤销 boot 影响、恢复 stock 并输出结构化诊断。

### 3.3 首版不做

- 不修改 DSH 安装目录或宿主源码。
- 不接管 `light/dark/system` 偏好。
- 不提供固定 light 或固定 dark 模式，首版只支持 `auto`。
- 不重绘窗口标题栏、窗口按钮、拖拽区或原生 caption。
- 不改变侧栏宽度、右栏停靠方式、Dock 层级和窗口结构。
- 不进入第三方 iframe、closed Shadow DOM、PDF、Excel、canvas、xterm 内部换肤。
- 不允许皮肤包携带任意 JavaScript 或任意 CSS。
- 不从远程 URL 加载字体；壁纸最初只使用内置设计，在线壁纸是后续轮次加入的。
- 不承诺不同操作系统上字体像素完全一致。
- 不为未知 DSH 版本尝试内部 DOM、私有类名或父节点推断等兼容兜底。

## 4. 兼容范围

插件兼容分为三档。设置中的“皮肤自检”应显示每一档的结果。

本文所称“标准 DSH 插件”，是指按目标版本的 DSH plugin contract 装载，只使用文档化或 typed public API、官方 slot、公开 token 和公开状态钩子的插件。“当前常见插件”只作为人工兼容观察样本，不属于标准兼容承诺。

| 档位 | 插件特征 | DSH Livery 行为 |
|---|---|---|
| A：token 原生 | 使用 `--dsw-alias-*`、`--dsw-specific-*` 和公开状态 token | 自动跟随颜色、深浅形态和大部分状态色 |
| B：公开钩子或 opt-in | 使用宿主公开 `data-*`，或插件明确提供 Livery 适配 layer/API | 宿主节点可用低优先级补偿规则；第三方硬编码样式只在插件显式 opt-in 时适配 |
| C：隔离内容 | iframe、canvas、terminal、PDF、Excel、closed Shadow DOM、自带完整调色板 | 只统一外框、标题区和周围表面，内部保持原样并在自检中说明 |

“兼容大部分标准插件”的可验收定义：

- A 档 fixture 全部自动跟随，不要求插件为 Livery 写专用代码。
- B 档只使用公开钩子或插件明确提供的 opt-in，不依赖类名哈希或 DOM 父子推断。
- C 档只验收宿主外框、标题区和周围表面；Livery 不得新增文字不可读、遮挡、层级冲突或输入失效。隔离内容内部保持原状，只记录限制，不纳入 Livery 可读性承诺。
- 第三方未分层的硬编码 CSS 优先于 Livery 低优先级补偿层；Livery 不承诺强行覆盖。
- 第三方插件声明 quiet 后，Livery 的节点级布局和材质补偿不进入该插件根节点。DSH 全局语义 token 和宿主级字体 token 仍会继承，插件若要完全独立，应在自身根节点声明自己的 token。
- 第三方插件自带主题管理器时，Livery 不注册主题、不改主题偏好，也不产生 ID 冲突。

## 5. 已定案的设计决策

| 问题 | 首版决定 | 原因 |
|---|---|---|
| 固定 light/dark 皮肤 | 不支持，只提供 `auto` | 避免宿主原生 chrome 与内容形态不一致 |
| `chrome` 字段含义不清 | 拆成 `surfaceStyle` 和未来的 `decorationPack` | 表面材质与窗口装饰不是同一能力 |
| 窗口装饰 | `decorationPack` 首版不实现 | 先保证布局和原生窗口行为正确 |
| 字体是否跟随宿主 | 允许按角色和语言覆盖字体族；字号、行高仅在宿主公开能力存在时覆盖 | 用户需求明确包含字体，同时避免元素级 CSS 破坏宿主 |
| 布局可改范围 | 只提供已登记的布局配方 | 防止皮肤包任意修改窗口结构 |
| 壁纸 `z-index:-1` | 不直接采用；Phase 0 验证 stacking context 后确定挂载点 | 负层级可能落到根背景之后 |
| 首帧节点生命周期 | Host 节点使用稳定 ID、插件归属标记和 boot/client 交接协议 | Host 注入不天然属于 Client 的 `ctx.effect` |
| 启动 DOM 写入指标 | 允许 Host 首帧一次注入；Client 在 loading 阶段零写入，ready 后在同一同步 task 完成一次渲染批次 | DOM 没有跨 style、属性和资源节点的真正原子事务，改用可测的批处理定义 |
| 中英文标签 | 使用稳定 tag ID，再从 locale 字典显示 | 避免英文界面出现中文 tag，支持双语搜索 |
| CSS 级联 | token sheet 不分层并使用自有 body 作用域；宿主补偿 CSS 放在低优先级 layer；第三方硬编码样式只通过 opt-in 适配 | token 能压过 stock，第三方未分层样式仍能覆盖补偿规则 |
| 导入包 | 首版接收 manifest；仅在背景层验证通过时接收位图资源，token 必须由本地编译器重新生成 | 禁止任意代码、任意 CSS 和自定义字体进入首版导入路径 |
| capability 门禁 | host font-family 和至少一项宿主级布局能力是 MVP 前置条件 | Phase 0 若确认缺失，应停止 MVP 实施并推动宿主补充正式 hook，不能用 Livery 自有 UI 冒充宿主级能力 |
| 预览 | 预览是独立 transient 状态，不直接改已确认配置 | 支持取消、确认、失败回滚和设置页卸载清理 |
| Linux | 首版不承诺支持，Phase 0 记录探测结果 | 当前参考材料没有 Linux 契约和测试矩阵 |

这里的“至少一项宿主级布局能力”只指 `density`、`conversationWidth` 或 `messageFlow`，`surfaceStyle` 属于材质能力，不能用来满足布局门禁。

## 6. 技术架构

首版保持单包工程，通过目录划分模块，不提前拆成多个 npm package。纯算法模块不得导入 React、Cordis 或 DSH 包，后续需要复用时再独立发布。

### 6.1 编译流程

```text
DSH 安装物 / 契约 fixture
        │
        ▼
contract snapshot ──► tokens / references / public hooks / slots / capabilities
        │
skin manifest ──► schema validate ──► derive light/dark ──► contrast audit
        │                                      │
        └──────────────────────────────────────┤
                                               ▼
                                  token CSS / typography CSS
                                  safe layout CSS / manifest
                                  zh/en previews / audit report
```

编译器职责：

- 执行真实 schema 校验，不把 schema 只当编辑器提示。
- 检查 ID、文件名、资源引用、locale、tag、字体和兼容字段。
- 从种子色推导 light/dark 色板。
- 生成宿主 alias、specific 和白名单 static 桥接。
- 生成字体角色和安全布局配方。
- 计算文本、非文本、状态和壁纸复合表面的对比度。
- 输出当前 DSH 版本的 token 覆盖率和新增缺口。
- 基于固定契约场景生成中文、英文各自的 light/dark 可重复预览；发布前再用真实 DSH Desktop 抽查。
- 生成内容哈希，供 Host 首帧和 Client 接管比对。
- 支持 `--check`，CI 中发现生成物漂移时失败。

### 6.2 Host 端

Host 端只负责配置、首帧、资源和导入安全：

- 注册 DSH profile 配置。
- 读取当前皮肤和已编译产物。
- 在宿主 stock theme 之后注入当前 token pair。
- 注入 Livery 自有属性，不修改任何 `data-ds-*` 属性。
- 提供本地、只读、内容寻址的壁纸资源路由；自定义字体进入后续 schemaVersion 时再增加字体路由。
- 为设置页提供导入、删除、自检和资源状态接口。
- 所有配置更新使用一次配置 mutation。
- 配置或资源损坏时回退 stock，并提供可复制诊断信息。

### 6.3 Client 端

Client 端采用单一 presenter 和明确状态机。已确认配置与临时预览分开保存：

```text
boot -> loading -> ready <-> previewing
                    |
                    +-> degraded -> disposed
```

各状态行为：

| 状态 | 行为 |
|---|---|
| `boot` | 使用 Host 已注入的属性、CSS 和背景信息 |
| `loading` | 不写 DOM，不移除 boot 样式，等待 settings 和 locale 就绪 |
| `ready` | 比较内容哈希；必要时在同一同步 task 内批量替换 style、属性、字体和壁纸，不读取布局 |
| `previewing` | 使用 transient preview；支持 `cancelPreview()`、`commitPreview()` 和 `rollbackPreview()`，设置页卸载时自动回到 confirmed 状态 |
| `degraded` | 保留可安全工作的颜色层，关闭不满足能力要求的字体、布局或壁纸能力 |
| `disposed` | 逆序移除所有自有属性、style、font face、背景节点和事件订阅 |

一次渲染批次的可测定义：同一同步 task 完成、最多一次 style 文本替换、批次中不调用布局读取 API，并且最多出现一个渲染帧的可见变化。配置 mutation、渲染批次和文件系统提交事务是三种不同边界，不统称“原子”。

禁止在运行时安装全文档 `MutationObserver`。若某个功能只能靠监听不稳定 DOM 才能实现，该功能不进入首版。

### 6.4 DSH 适配层

DSH 适配层集中处理：

- Cordis context 与生命周期。
- `configForms` 的读取、订阅和单次 mutation。
- locale、settings slot 和必要的 renderer API。
- `webserver/index-inject`。
- 客户端模块加载协议。
- 当前宿主版本与 capability 探测。
- DSH 公开 token、`data-*` 和布局状态映射。

主题算法、schema、对比度和 CSS 渲染器不能直接访问 `ctx`。

适配层按版本耦合面继续拆分，避免一个 `if (version)` 文件同时处理所有差异：

```text
adapter/dsh/
├── loader/     # Client loader ABI，加载前契约
├── host/       # Cordis、settings、webserver、profile
├── client/     # configForms、locale、slots、renderer
├── theme/      # token、深浅状态和 CSS 注入顺序
├── layout/     # 文档化 data-*、clearance、breakpoint、z-index
└── registry/   # 精确版本、契约哈希和 adapter 选择
```

core、schema、皮肤编译器和 UI 不允许判断 DSH 版本。版本选择只能发生在 adapter registry 中。

### 6.5 DSH 插件装载契约

Phase 0 必须从目标 DSH 版本确认并记录完整装载方式，Phase 1 才能固定工程基线。交付物至少包括：

- `package.json` 的 Host 主入口、`exports["./client"]`、`dsh.client.inject` 和准确的 Node engine range。
- `cordis.patch.yml` 或目标版本认可的等效挂载文件。
- Cordis entry ID、settings namespace 和客户端模块 ID 的稳定命名规则。
- Host ESM bundle 与 DSH Client loader envelope 的准确格式。
- peer dependency、optional peer 和宿主 external 模块清单。
- Host 配置如何暴露给 Client form。
- 针对目标 DSH 版本的真实 profile 安装、启动、禁用和卸载 smoke test。

这些内容属于版本化 DSH adapter，不能散落在编译脚本和 UI 代码中。

### 6.6 版本识别与协商

版本适配分为三层，三层都通过才算兼容：

1. **加载兼容**：Host entry、Cordis patch、Client loader envelope 和 external module table 能成功装载。
2. **契约兼容**：required Host/Client API、slot、token、profile schema 和公开 hook 的签名与哈希匹配。
3. **行为兼容**：首帧、CSS 级联、配置时序、窗口 chrome、sidebar/rightbar/Dock/fullscreen 和生命周期在真实运行中通过。

Client loader ABI 是加载前契约。一旦 loader envelope 改变，Client 代码没有机会运行 capability probe，因此不能靠运行时 `if` 修复。loader ABI 变化时必须生成新兼容发布线或插件 major，不能同时猜测多个私有全局入口。

每个 adapter manifest 至少包含：

```jsonc
{
  "hostVersion": "0.2.0-rc.2",
  "adapterId": "dsh-0.2.0-rc.2-r1",
  "loaderAbi": "sha256:...",
  "hostApiContract": "sha256:...",
  "clientApiContract": "sha256:...",
  "tokenContract": "sha256:...",
  "layoutContract": "sha256:...",
  "profileSchema": "sha256:...",
  "nodeRange": "<copied from target contract>",
  "clientTarget": "chrome120",
  "verifiedProfiles": ["desktop", "web"],
  "verifiedPlatforms": ["darwin", "win32", "web"],
  "verifiedBrowsers": [
    { "family": "chrome", "minVersion": 120 },
    { "family": "edge", "minVersion": 120 }
  ]
}
```

兼容校验分两道执行：

1. **pre-loader gate**：Host 在注入任何 boot CSS、属性或背景之前，先核对 `observedHostVersion`、`loaderAbi`、`profileKind` 和已认证 adapter。核对失败时保持 stock，根本不注入 Livery boot 内容。
2. **post-loader handshake**：loader 已成功 materialize Client 后，Host 注入 `pluginVersion`、`adapterId`、`observedHostVersion`、`contractHash`、`profileKind`、capabilities 和当前皮肤哈希；Client 再核对 Host/Client adapter ID、required contract 和 required capabilities。

如果目标宿主无法向 Host 暴露可信 loader ABI，正式安装或激活入口必须在启用插件前完成 loader 验证。该构建不能宣称运行时可识别 loader 漂移后再撤销 boot，只能保证验证失败时插件从未被启用。

post-loader handshake 不匹配时按以下顺序处理：

1. 停止 Client presenter，不写宿主 DOM。
2. 移除 Livery boot style、属性和背景节点。
3. 回到 stock。
4. 输出包含版本、Profile、契约差异和建议动作的结构化诊断。
5. 不尝试私有 DOM fallback。

必须增加一个故意破坏 loader envelope 的测试：Client 入口不得执行，页面保持 stock，DOM 中不存在 Livery style、属性和背景节点。

### 6.7 版本支持政策

- 首版只支持 DSH `0.2.0-rc.2` 精确版本和通过认证的契约哈希。
- `0.2.1-rc.2` 作为第一候选版本运行完整认证，不因参考项目曾声称支持而自动加入。
- `0.x` 和 RC 版本不按 semver 推断 ABI 兼容。
- stable 版本出现后，目标政策调整为“当前 stable + 前一 stable”；RC 只作为 canary，除非产品明确发布 RC 专线。
- 两个版本只有在 loader ABI 和全部 required contract 一致时才能共用 adapter；否则各自生成 adapter manifest。
- optional contract 缺失必须有明确降级测试；required contract 差异阻止发布；diagnostic-only 差异只报告。
- 未知版本默认恢复 stock，不提供“尽力运行”模式。
- 移除一个支持版本时，保留最后一个兼容的 Livery 版本并发布弃用说明。
- 宿主支持范围只由插件级 `supportedHostContracts` 与 `support-matrix.json` 管理，不进入单个皮肤 manifest。

### 6.8 Profile 隔离

- `desktop` 和 `web` 是两个独立部署目标，不能依靠“优先找到 desktop，否则 web”的隐式选择。
- 开发、安装和测试命令都必须显式传 `--profile desktop|web`。
- Desktop Profile 由 Electron 应用管理时，使用该版本提供的正式应用安装入口；CLI 拒绝管理 Desktop 时，不得绕过保护直接改 profile manifest 作为发布流程。
- Web Profile 使用该版本正式 plugin manager；当前 DSH `0.2.0-rc.2` 中 `dsh plugin --profile web ...` 实际委托给 profile 包管理器，具体 add/remove 命令在 Phase 0 固化到 wrapper。
- Web 运行时 wrapper 使用 `dsh --profile web --no-open --port 0` 启动隔离实例，再分别用 Chrome 和 Edge 的最低认证版本执行测试。
- 两个 Profile 的配置、备份、安装事务和诊断证据分别存放。共享内容寻址资源时必须采用引用计数或所有权索引，禁止卸载一个 Profile 时删除另一个仍在使用的资源。
- 同一 `DSH_HOME` 下同时安装 Desktop 与 Web 是发布前必测场景，restore 和 upgrade 不得串 Profile。

## 7. 皮肤数据格式

新项目从 `schemaVersion: 1` 开始，不沿用参考项目的版本号。建议格式如下：

下面的 `wallpaper` 字段只在 Phase 0 背景层验证通过时进入 schemaVersion 1；若验证失败，首版 schema、设置 UI、测试矩阵和导入格式都删除该字段，不保留无效配置。

```jsonc
{
  "schemaVersion": 1,
  "id": "fjord",
  "meta": {
    "name": {
      "zh-CN": "峡湾",
      "en-US": "Fjord"
    },
    "description": {
      "zh-CN": "低彩度蓝灰配色",
      "en-US": "A restrained blue-grey palette"
    },
    "tags": ["calm", "cool"],
    "order": 100
  },
  "variants": {
    "light": {
      "seeds": {
        "accent": "#5b7c99",
        "secondary": "#8ba7bd",
        "surface": "#f0f3f6",
        "text": "#1b2733"
      },
      "tokens": {}
    },
    "dark": {
      "seeds": {
        "accent": "#8fb3d1",
        "secondary": "#7098b8",
        "surface": "#181c21",
        "text": "#eef2f6"
      },
      "tokens": {}
    }
  },
  "typography": {
    "ui": {
      "zh-CN": "system-cjk",
      "en-US": "system-latin"
    },
    "content": {
      "zh-CN": "system-cjk",
      "en-US": "system-latin"
    },
    "code": "system-mono",
    "metrics": {
      "zh-CN": "cjk-comfortable",
      "en-US": "latin-default"
    }
  },
  "layout": {
    "density": "comfortable",
    "conversationWidth": "focused",
    "messageFlow": "stock",
    "surfaceStyle": "solid"
  },
  "wallpaper": {
    "file": "wallpaper.webp",
    "focus": {
      "wide": "50% 40%",
      "narrow": "60% 50%"
    }
  },
  "compat": {
    "requiredCapabilities": ["theme-css", "host-font-family"],
    "optionalCapabilities": ["conversation-width", "wallpaper-layer"]
  }
}
```

格式约束：

- `id` 是持久化标识，发布后不能重命名。
- `meta.tags` 只存稳定 ID，显示名称放在项目 locale 字典中。
- light/dark 都必须生成；dark seeds 可以在作者阶段省略，但编译结果不能缺失。
- `tokens` 只允许覆盖编译器白名单中的语义 token。
- 字体使用 registry ID，不接受原始 `@font-face` 或任意 CSS 字符串。
- 布局只允许已登记配方，不能携带选择器。
- 壁纸只允许包内相对路径，禁止 `http:`、`https:`、`file:` 和 data URL。
- `compat.requiredCapabilities` 缺失时，该皮肤不可应用并回 stock；`compat.optionalCapabilities` 缺失时才允许关闭相应能力并降级。
- DSH 版本、Profile 和平台支持范围不写进皮肤 manifest，统一由插件级 `supportedHostContracts` 和 `support-matrix.json` 管理。

## 8. 颜色与主题系统

### 8.1 推导策略

- 使用 OKLab/OKLCh 计算中性色阶和 accent 色阶。
- 保持宿主原 token 的相对对比结构，不按绝对亮度生搬颜色。
- 做 sRGB gamut fitting，避免宽色域颜色在普通屏幕上剪裁后失真。
- 状态色 error、warning、success 默认保留其语义色相，只调整满足对比度所需的亮度和表面关系。
- 链接、brand、on-accent、selected、focus、disabled 和 placeholder 单独进入验证矩阵。
- 自定义图片派生和内置皮肤调用同一个 `deriveLivery()`。

### 8.2 token 覆盖

契约快照需要分别记录：

- 宿主定义的全部 `--dsw-*`。
- 宿主和项目自有标准插件 fixture 实际引用的全部 `--dsw-*`。
- light/dark stock 值。
- token 引用链、fallback 和无法解析的复杂表达式。
- 当前皮肤生成的 token。
- 已批准的豁免及原因。

CI 对 A 档承诺范围要求“实际引用集合 - 生成集合 - 豁免集合”为空。宿主新增且被当前生产代码或 A 档 fixture 消费的 token 时必须实现或记录豁免，不能静默回落成混色界面；未消费 token 只进入非阻断诊断报告。

### 8.3 CSS 作用域和级联

token sheet 使用以下作用域：

```css
body[data-dsh-livery="fjord"] { /* light tokens */ }
body[data-dsh-livery="fjord"][data-ds-dark-theme] { /* dark tokens */ }
```

约束如下：

- 只写 Livery 自有属性。
- 不写 `:root` 全局 token。
- 不使用 `!important`。
- token sheet 不放入低优先级 layer，依靠自有 body 作用域和注入顺序压过 stock。
- 宿主公开节点的组件补偿放入 `@layer dsh-livery.compat`。
- 未分层的第三方 CSS 优先于 Livery 补偿层，Livery 不使用提高 specificity 或 `!important` 的方式抢回控制权。
- 第三方硬编码表面只有在插件自身改用 DSH token，或明确提供适配 CSS/API 时进入 B 档；否则按 C 档披露。
- 每条补偿规则必须注明 token 无法处理的原因和所需 capability。
- 静态扫描拒绝元素级全局选择器、哈希类选择器、父子结构推断和超过预算的 specificity。

## 9. 字体设计与渲染

字体是本项目的一等能力，但需要按安全级别处理。

### 9.1 字体角色

| 角色 | 用途 | 首版行为 |
|---|---|---|
| `ui` | 设置、菜单、按钮、标签 | 按当前 locale 选择字体栈 |
| `content` | 对话正文、说明和较长文本 | 按语言选择更适合连续阅读的字体栈 |
| `code` | 代码、路径、ID、日志 | 中英文共用等宽栈，保留 CJK fallback |

### 9.2 首版字体 registry

`system-cjk`：

```css
"PingFang SC", "Microsoft YaHei UI", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif
```

`system-latin`：

```css
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
```

`system-mono`：

```css
"SFMono-Regular", Consolas, "Liberation Mono", "Noto Sans Mono CJK SC", monospace
```

registry 中不存在的字体 ID 构建失败。首版不从网络加载字体。构建期只校验 registry ID 和字体栈语法；字体是否实际存在、最终 computed family 和测试字形能否显示，分别在 Windows、macOS 真机浏览器探测中记录。系统 generic fallback 不被宣称为覆盖全部字符。

### 9.3 字体应用边界

- 优先覆盖宿主公开的 font-family token。
- 宿主没有公开 typography token 时，不使用 `button`、`input`、`p` 等元素选择器强制覆盖。
- 字号、行高和字重只在公开 token 存在且通过布局回归时应用。
- 代码字体只进入宿主公开 code token 或明确的 `data-*` 钩子。
- 字体切换不得引入远程请求。
- 后续若支持 WOFF2，每个文件必须带许可证元数据、字形覆盖报告和大小预算。

## 10. 布局样式

“布局样式”指不改变宿主功能结构的呈现配方，不包含窗口和 Dock 布局管理。

### 10.1 首版配方

| 维度 | 候选值 | 允许改变 |
|---|---|---|
| `density` | `host`、`compact`、`comfortable` | 公开 spacing/control token |
| `conversationWidth` | `host`、`focused`、`wide` | 公开 transcript 宽度变量，或宿主文档化/typed capability 明确声明节点的 `max-width` |
| `messageFlow` | `stock`、`separated` | 公开消息容器的间距和表面，不改消息顺序与结构 |
| `surfaceStyle` | `solid`、`soft`、`glass` | 页面级表面、边框、阴影、透明度 token；属于材质能力，不计入布局 MVP 门禁 |

每个配方都必须声明 capability。可选视觉能力缺失时回退 `host` 或 `solid`，并在自检中显示原因；MVP 声明包含的宿主级字体与布局能力若缺失，则阻止发布，不能仅在 Livery 设置页模拟该能力。

### 10.2 明确禁止

- 改 frame padding、宽高、transform 或 position。
- 改侧栏和右栏宽度。
- 改 Dock、float、modal、toast 和 overlay 的 z-index。
- 对普通按钮和输入框强制统一圆角或边框。
- 重排、复制或隐藏宿主关键控制。
- 为布局状态新增镜像 DOM 属性。
- 用伪元素制造不存在的标题栏、面板头或拖拽区域。

### 10.3 壁纸与表面

- 壁纸只绘制一次，不随会话滚动容器尺寸变化。
- 只允许页面级表面透出壁纸。
- 菜单、弹窗、输入框、代码块、toast 和 tooltip 保持不透明。
- Windows 和 Web 可默认使用 ambient 背景；macOS 默认保留宿主 vibrancy，壁纸由用户显式开启。
- 窄窗口切换 `focus.narrow`。
- `prefers-reduced-transparency` 下使用不透明纯色；forced colors 下关闭壁纸、玻璃、作者色和自定义表面，让系统色接管，并验证 focus、selected、disabled 和图标。
- 壁纸长边不超过 2560px，建议小于 400KB。
- Phase 0 必须在真实宿主上确定背景节点挂载点、stacking context 和根表面透明方式。

## 11. 中英文分别设计

中英文使用同一套功能和颜色语义，但分别定义排版 profile、文案、搜索、预览和视觉回归。这样既保持皮肤身份一致，也处理两种文字在字面长度和字形密度上的差异。

### 11.1 中文设计 `zh-CN`

- 使用 `system-cjk`，不依赖拉丁字体临时回退 CJK 字形。
- Livery 自有正文默认行高目标为 `1.55`，英文和数字混排保持正常基线。
- 常规字重使用 400，强调使用 500 或 600；不依赖细体表达次要信息。
- UI 文案使用自然、直接的简体中文，不保留无必要英文术语。
- 不使用全角空格排版，不人为增加汉字字距。
- 标题和说明按中文语义断句，避免单字孤行。
- 按钮保持单行；说明文字可两行；皮肤名称超长时截断并提供完整可访问名称。
- 搜索同时匹配中文名、英文名、ID 和 tag 的中文显示名。
- 数字、文件大小、日期和相对时间使用 `Intl` 的 `zh-CN` 格式。

### 11.2 英文设计 `en-US`

- 使用 `system-latin`，不声明未实际加载的 Inter 等字体。
- Livery 自有正文默认行高目标为 `1.45`。
- UI 文案使用 sentence case，不使用大段全大写标签。
- 控件宽度按英文长文案校验，不用为中文长度写死像素宽度。
- 按钮保持单行；需要解释的内容放在辅助说明，不把长句塞进按钮。
- 标题、说明和错误信息由英文单独撰写，不逐句翻译中文。
- 搜索同时匹配英文名、中文名、ID 和 tag 的英文显示名。
- 数字、文件大小、日期和相对时间使用 `Intl` 的 `en-US` 格式。

### 11.3 两套设计共同要求

- locale fallback 顺序固定：当前完整 locale -> 同语言基础 locale -> `en-US` -> ID。
- 皮肤包缺少 `zh-CN` 或 `en-US` 名称时不能进入官方内置集合。
- tag 字典、筛选器、错误提示、导入结果和自检报告全部本地化。
- 屏幕阅读器文本使用当前 locale，不把两种语言拼在一个 label 中。
- 预览图按 `zh-CN/en-US × light/dark` 生成，画面内使用真实本地化文案。
- 两种语言分别运行截图比较，不能只验证 DOM 中存在翻译键。
- Livery 设置 UI 在 200% 缩放下可操作，文案不遮挡控件。

## 12. 设置界面

设置界面放入宿主官方 settings slot，不占用 root、main 或 overlay 主位。

首版页面组成：

1. 当前皮肤摘要。
2. 语言自适应的皮肤搜索与 tag 筛选。
3. 固定契约场景缩略图画廊。
4. light/dark 双形态预览标记。
5. 字体、布局和壁纸能力说明。
6. 恢复 stock 操作。
7. 皮肤自检与诊断复制。
8. 关于和版本信息。

交互要求：

- 画廊支持键盘导航、选中状态和可见焦点。
- 切换皮肤先进入 transient preview，确认后执行一次配置 mutation；取消、关闭设置页或预览失败时恢复 confirmed 状态。
- 写入失败时恢复上一个已确认状态。
- 被删除或不兼容的皮肤 ID 自动回 stock，并显示原因。
- 预览只加载当前 locale 的缩略图，light/dark 图按需加载。
- 不把色带当作最终预览；缩略图由固定 fixture 生成，必须包含对话、侧栏、输入区和一个标准插件面板。发布前再用真实 DSH Desktop 抽查，不把 fixture 图称为宿主实拍。

设置页必须覆盖 `loading`、stock、正常、搜索无结果、缩略图失败、不兼容、自检进行中/部分失败、预览、写入失败、删除确认、复制诊断失败、离线和配置迁移状态。每个状态都进入中英文、键盘和截图测试。

## 13. 第三方插件公开契约

首版只公开最小只读契约：

```text
body[data-dsh-livery="<id>"]
[data-dsh-livery-quiet]
```

第三方读取深浅形态和 locale 时使用 DSH 自身的正式属性/API，不由 Livery 再维护一份镜像。作者色和 layer 名称在出现真实扩展需求后再版本化公开，避免首版形成不必要的长期兼容负担。

插件作者建议：

- 优先消费 DSH 的 `--dsw-alias-*` 和 `--dsw-specific-*`。
- 使用 fallback，例如 `var(--dsw-alias-label-primary, currentColor)`。
- 自带完整主题或特殊画布时，在插件根节点加 `data-dsh-livery-quiet`。
- 不依赖具体皮肤 ID 决定业务行为。
- 不修改 Livery 自有属性。

DSH Livery 的承诺：

- 不写第三方根节点属性。
- 不覆盖插件 slot、position 和 z-index。
- 不注册主题 ID。
- 不使用全局元素选择器重置插件组件。
- 禁用或卸载后移除所有自有影响。

## 14. 契约快照

`contract-snapshot` 是实现前置，不应等到皮肤完成后补做。

快照以实际消费面为主。每个成员必须记录：

```text
provenance: documented | typed-public-api | host-owned-approved | observed-internal
consumedBy: string[]
supportLevel: required | optional | diagnostic-only
```

只有 `documented`、`typed-public-api` 或经过项目明确批准的 `host-owned-approved` 项能用于生产选择器和运行时调用。`observed-internal` 只能帮助诊断，不能升级为兼容承诺。

每个支持的 DSH 版本记录：

- 实际使用的 Host 和 Client 服务及准确方法签名。
- 实际使用的 settings、locale、renderer、slot、theme state 和 webserver 能力。
- 客户端模块加载格式。
- 所有 DSH 语义 token 的定义与引用，其中未消费项标为 `diagnostic-only`。
- 公开 `data-*`、布局状态和 clearance 变量。
- Livery 实际需要验证的 frame、sidebar、rightbar、dock、fullscreen、modal 层级常量。
- 允许注入首帧 style 和属性的位置。
- Windows、macOS、Web 的平台属性。
- 契约文件哈希和来源版本。
- Client loader ABI、Host API、Client API、token、layout、profile schema 六个独立哈希。
- Node engine、Client browser target、Host external 和 Client external 模块清单。
- 已认证的 Profile、平台、测试时间和证据索引。

更新 DSH 时 CI 比较新旧快照：

- token 新增或删除。
- hook 新增或删除。
- slot 和服务变化。
- 布局常量变化。
- 模块加载 ABI 变化。

只有生产代码或 A 档兼容声明实际消费的 `required` 契约发生删除或不兼容变化时阻止发布。optional 项触发降级测试，diagnostic-only 项只生成报告。

contract snapshot 只能证明符号和静态结构存在，不能证明语义兼容。以下内容必须由运行时证据验证：

- `webserver/index-inject` 相对 stock theme、root mount 和首次绘制的真实顺序。
- `configForms` 的 loading/ready、revision、并发 mutation 和失败回滚语义。
- slot 同 order 排序、冲突和卸载回收。
- token 的 computed value、注入优先级和第三方 CSS 级联。
- 公开 `data-*` 在各页面、remount 和布局状态中的稳定性。
- Desktop 原生标题栏、DPI、vibrancy、Dock 与 portal 层级。
- Profile 安装、重启、禁用、升级、卸载和残留。

支持矩阵单独保存在 `contracts/dsh/support-matrix.json`。它不得手写扩大范围，只能由通过全部发布门禁的证据更新。

候选条目先写入 `support-matrix.proposed.json`，每个精确 DSH 版本独立维护状态：

```text
draft -> g0-g5-passed -> g6-approved -> released
```

- `draft`：只完成静态登记。
- `g0-g5-passed`：该版本的加载、契约、Profile 和运行时证据齐全，等待发布 gate。
- `g6-approved`：G6 已针对该精确版本和候选包通过，可作为发布候选，但尚不能对外声明正式支持。
- `released`：Phase 6 用最终包重跑 G6 后，与正式发布同一事务晋级。

G6 必须按精确 `--version` 只审核目标版本的全部 Profile、平台和浏览器项，不能批准、阻塞或改变 proposed matrix 中其他版本的状态。正式 `support-matrix.json` 只从 `released` 条目生成。

## 15. 自定义包与安全

建议扩展名为 `.dshlivery`。它是 ZIP 的受限子集，不是插件格式，只允许 stored/deflate 条目。

本节的壁纸导入只在 Phase 0 背景层验证通过时实施；否则 Phase 5 仅保留 manifest、颜色种子和安全配置的导入设计，位图条目与焦点编辑不进入当前格式。

允许内容：

- `manifest.json`。
- `wallpaper.webp`、PNG 或 JPEG 位图。

禁止内容：

- JavaScript、HTML、SVG、任意 CSS。
- 远程 URL。
- 绝对路径和 `..` 路径。
- 符号链接。
- hard link、device/special file、加密条目和不支持的压缩算法。
- Unicode 规范化、大小写折叠或重复 entry 后发生路径冲突的归档。
- 未声明文件。
- 可执行文件和脚本。

导入限制建议：

| 项目 | 限制 |
|---|---|
| 压缩包 | 不超过 8MB |
| 解压总量 | 不超过 20MB |
| 文件数量 | 不超过 32 |
| 壁纸尺寸 | 长边不超过 4096px，编译后输出不超过 2560px |
| 官方发布壁纸 | 建议不超过 400KB |
| 嵌套深度 | 不超过 2 层 |

导入流程：

```text
流式读取目录 -> 规范化路径与唯一性检查 -> 流式数量/大小限额
-> MIME/魔数与图片头尺寸检查 -> 隔离 worker 中受限解码
-> schema 校验 -> 资源哈希 -> light/dark 推导 -> 对比度矩阵
-> CSS 安全生成 -> 重新生成报告和预览 -> 用户确认 -> 文件系统提交事务
```

导入失败不能留下临时文件、配置和 style。解压总量限制在流式处理过程中执行；图片解码设置像素、内存和超时上限。归档自带报告、预览和编译产物一律不受信，首版直接拒绝。

Host 变更接口只接受明确方法和 Content-Type，不开放 wildcard CORS，拒绝跨 Origin 请求，并复用 DSH 会话鉴权；若目标版本没有可复用鉴权，则使用 Host 每次启动生成并注入 Client 的随机 nonce。安装顺序固定为 staging directory -> 完整验证 -> 单目录 rename -> 配置 mutation -> 延迟 GC；删除和替换不能先移除正在使用的资源。内容寻址文件名在读取时重新与内容哈希比对，并发配额检查和提交在同一锁内完成。

Phase 5 开始前必须单独完成导入威胁模型。自定义 WOFF2 不属于首版 schema；只有跨平台解码、字形检查、许可证记录和资源隔离都验证后，才通过新的 schemaVersion 引入。

## 16. 工具链

建议使用：

| 项目 | 选择 |
|---|---|
| 语言 | TypeScript、ESM |
| Node | Phase 0 从目标 DSH 插件契约读取并原样使用准确 engine range，不写宽泛的 `22.19+` |
| 包管理 | pnpm，单 package 起步 |
| 构建 | 固定版本 esbuild，作为项目 devDependency |
| CSS 解析 | PostCSS，不用正则解析完整 CSS |
| Schema | JSON Schema 为发布格式，Ajv 在编译和导入时执行；TS 类型由 schema 生成 |
| 单元测试 | Vitest |
| 浏览器与视觉测试 | Playwright |
| 无障碍 | axe-core + forced-colors 场景 |
| 图片构建 | 构建期工具处理预览；运行时不依赖作者本机路径 |

构建必须能在干净 checkout 中完成，不依赖 `references` 嵌套仓库、本机 DSH 源码路径或全局安装的构建器。

## 17. 建议目录

```text
dsh-livery/
├── package.json
├── cordis.patch.yml
├── pnpm-lock.yaml
├── tsconfig.json
├── contracts/
│   └── dsh/
│       ├── support-matrix.json
│       ├── support-matrix.proposed.json
│       └── <version>/
│           ├── contract.json
│           └── adapter.json
├── schemas/
│   └── livery.schema.json
├── liveries/
│   └── <id>/manifest.json
├── src/
│   ├── core/
│   │   ├── color.ts
│   │   ├── derive.ts
│   │   ├── contrast.ts
│   │   ├── typography.ts
│   │   ├── layout.ts
│   │   └── render.ts
│   ├── contract/
│   │   ├── snapshot.ts
│   │   └── diff.ts
│   ├── compiler/
│   │   ├── compile.ts
│   │   ├── validate.ts
│   │   ├── previews.ts
│   │   └── audit.ts
│   ├── host/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── boot.ts
│   │   ├── assets.ts
│   │   └── imports.ts
│   ├── client/
│   │   ├── index.ts
│   │   ├── runtime.ts
│   │   ├── presenter.ts
│   │   ├── settings/
│   │   └── diagnostics.ts
│   ├── adapter/dsh/
│   │   ├── loader/
│   │   ├── host/
│   │   ├── client/
│   │   ├── theme/
│   │   ├── layout/
│   │   └── registry/
│   ├── i18n/
│   │   ├── zh-CN.ts
│   │   └── en-US.ts
│   └── styles/
├── scripts/
│   ├── contract-snapshot.mjs
│   ├── contract-diff.mjs
│   ├── adapter-generate.mjs
│   ├── profile-smoke.mjs
│   ├── compile-liveries.mjs
│   ├── check-liveries.mjs
│   └── build.mjs
├── tests/
│   ├── unit/
│   ├── contract/
│   ├── fixtures/plugins/
│   ├── runtime/
│   ├── browser-probe/
│   └── visual/
├── artifacts/
│   ├── contracts/
│   ├── profiles/
│   ├── runtime/
│   ├── visual/
│   └── release/
└── references/
```

`references/` 只用于研究，不参与正式构建和发布。

## 18. 测试与质量门禁

### 18.1 单元测试

- RGB、OKLab、OKLCh 转换与往返误差。
- 色域收敛和极端颜色。
- 中性色阶单调性。
- accent 锚点与语义 token 解析。
- token 引用循环和无效 fallback。
- light/dark 推导稳定性。
- 字体 registry、字体栈语法和 locale fallback；实际字体及测试字形检查由真机浏览器探测负责。
- 布局配方 capability 降级。
- 壁纸 veil 计算。
- schema、ID、tag、路径和资源限制。

### 18.2 对比度矩阵

至少覆盖：

- 正文、次要、三级、caption、link、brand、on-accent。
- error、warning、success、disabled、placeholder。
- base、sidebar、layer、bubble、menu、toast、tooltip、code、input、card。
- default、hover、active、selected、focus、disabled。
- light、dark。
- 壁纸 P95 最坏亮度与 veil 复合结果。

所有壁纸相关单元测试、对比度项和视觉场景只在 Phase 0 背景层验证通过时启用；未通过时不以 skip 长期保留，而是从首版测试清单和 schema 中移除。

标准：

- 普通文本 WCAG 2.2 AA 不低于 4.5:1。
- 大字号文本不低于 3:1。
- 非文本和焦点指示不低于 3:1。
- APCA 作为附加报告，不代替首版 WCAG 门禁。

### 18.3 CSS 静态检查

- 0 个 `!important`。
- 0 个 CSS Modules 哈希类选择器。
- 0 个未登记元素级全局选择器。
- 0 个远程 URL。
- 0 个未作用域 token。
- 0 个超过 20 的新增固定 z-index。
- 不修改 frame padding、drag region 和宿主主题属性。
- 所有补偿规则都在指定 layer 中并带原因元数据。
- 首屏 CSS 和每皮肤 CSS 不超过预算。

### 18.4 Runtime 状态机测试

- Host boot 有效，Client settings 延迟到达。
- Host boot 哈希与 Client 一致时零替换。
- 配置无效时回 stock。
- 皮肤已删除时回 stock。
- light/dark 在宿主切换时只换 token 分支。
- 中文和英文切换时更新字体、文案和预览，不改主题偏好。
- 配置写入失败时回滚。
- 进入、取消、确认和失败回滚 transient preview。
- 设置页在 previewing 中卸载时恢复 confirmed 状态。
- 禁用、热卸载和重载后零残留。
- 其他主题插件存在时不冲突。
- 自定义资源缺失时关闭壁纸，颜色层继续工作。

### 18.5 插件 fixture

| Fixture | 覆盖内容 |
|---|---|
| F1 | 纯 DSH token 插件 |
| F2 | 使用公开 `data-*` 的插件 |
| F3 | Tailwind 或其他全局 CSS 污染 |
| F4 | 自己注册宿主主题的插件 |
| F5 | 动态添加和移除 style 的插件 |
| F6 | `data-dsh-livery-quiet` |
| F7 | frame clearance 与平台标题栏 |
| F8 | 同名主题和同序 settings slot |
| F9 | iframe、canvas、terminal 外框 |
| F10 | Shadow DOM open/closed 降级 |
| F11 | 中文长文案和英文长文案插件 |
| F12 | 插件卸载与重新挂载 |

fixture 必须是项目自有的最小实现，注明模拟的契约和来源，不直接复制当前常见插件代码。真实第三方插件只在人工兼容抽查中使用；如需固定进 CI，必须锁定 commit、确认许可证且排除在发布包之外。

### 18.6 浏览器探测与人工复核

Playwright 在每个关键场景输出结构化报告，采集：

- 实际 computed font family、`document.fonts.check()` 和中英测试字形宽度。
- 横向溢出、文字/按钮换行数、截断、碰撞和视口边缘距离。
- computed color、背景复合结果和运行时对比度。
- focus、selected、disabled、forced-colors 和 reduced-motion 状态。
- 破图、console error、未加载资源、style 数量和自有节点残留。

自动门禁通过后仍要人工查看截图。复核模板只检查桌面应用相关项目：信息层级、空间与边缘、字体、颜色、碰撞、窗口原生控件、双语文案、插件一致性和不可控内容降级。每轮记录最严重的三项，修复后使用同一场景复测，不套用 `taste-skill` 的营销页审美禁令。

### 18.7 视觉矩阵

最低矩阵：

```text
平台：Web / Windows / macOS
语言：zh-CN / en-US
形态：light / dark
宽度：宽 / 1023 / 767 / 最小支持宽度
侧栏：展开 / rail / 无 rail
右栏：closed / push / fullscreen / dock / float
样式：stock / solid / soft / glass / wallpaper（仅 Phase 0 验证通过时）
缩放：100% / 125% / 150% / 200%
无障碍：reduced-motion / reduced-transparency / forced-colors
```

全量笛卡尔积成本过高。CI 分为两层：

- 每个提交运行 pairwise 组合，确保每个状态对至少覆盖一次。
- 发布前在真机运行高风险全矩阵，重点覆盖 Windows caption、macOS leading、rightbar fullscreen、Dock、壁纸和中英文长文案。

### 18.8 性能预算

| 指标 | 目标 |
|---|---|
| Client bundle gzip，不含宿主 peer | 不超过 25KB，设置画廊可拆分加载 |
| 首帧 CSS | 不超过 12KB |
| 激活皮肤 CSS | 目标 4KB 至 8KB，硬上限 12KB |
| 启动主题注册 | 0 |
| 启动 `theme/change` | 0 |
| 全文档 observer | 0 |
| Client loading 阶段 DOM 写入 | 0 |
| ready 接管 | 同一同步 task、最多一次 style 文本替换、无布局读取、最多一个可见变化帧 |
| 切肤可见延迟 | 目标 p95 小于 100ms，真机记录 |
| 切肤布局偏移 | 非字体切换 CLS ≤0.01；字体 profile 切换 CLS ≤0.05，并单独记录 |

测量协议必须固定在仓库中：

- bundle 使用固定工具和参数计算 gzip 大小。
- 启动、切肤、画廊打开、locale 切换分别建立场景。
- 切肤从用户确认事件开始，到下一帧样式、属性和资源状态一致结束。
- 冷缓存和热缓存分开记录；壁纸下载、解码和 paint 单独列项。
- 每个 p95 至少 30 次样本，记录机器、OS、DSH 版本和硬件加速状态。
- 切肤 p95 必须小于 100ms，30 次样本中不得有超过 200ms 的失败样本；若环境噪声导致失败，必须重跑完整样本，不能删除单次结果。
- 保存 Playwright trace 或 Chrome trace，检查 style recalculation、layout、paint、long task、图片请求数和画廊峰值内存。
- CLS 使用 `PerformanceObserver` 采集；字体 profile 切换产生的位移单独报告，不能被总体均值掩盖。

### 18.9 Profile 验收矩阵

每个受支持的 DSH 精确版本都必须分别通过以下矩阵：

| 验收面 | Desktop / macOS | Desktop / Windows | Web Profile |
|---|---|---|---|
| 安装 | Electron 正式插件入口 | Electron 正式插件入口 | Web Profile 正式 package manager |
| 启动 | 完整退出后冷启动 | 完整退出后冷启动 | 重启 `dsh --profile web`，全新浏览器 context |
| 首帧 | 从窗口显示前录 filmstrip | 从窗口显示前录 filmstrip | 从 navigation response 到 first paint 录 trace |
| 原生窗口 | traffic lights、leading、fullscreen、vibrancy | caption、min/max/close、drag region、DPI | 不存在原生 chrome；确认插件不制造假标题栏 |
| 布局 | sidebar 展开/rail/无 rail、rightbar/Dock/float | sidebar、rightbar/Dock/float、缩放 | sidebar/rightbar/Dock 与 1023/767/min-width |
| 字体 | macOS 系统栈和测试字形 | Windows 系统栈和测试字形 | 支持浏览器的实际字体环境，结果单独存档 |
| 无障碍 | reduced-motion/transparency | HCM、DPI、reduced-motion | forced-colors 与 media emulation 快速门禁 |
| 配置 | 只写 desktop profile | 只写 desktop profile | 只写 web profile |
| 安全 | Electron 本地 Origin、鉴权、nonce | Electron 本地 Origin、鉴权、nonce | browser trust、Origin、CSRF、CORS、反向代理 |
| 生命周期 | install/start/disable/enable/upgrade/uninstall | 同左 | 同左，且服务重启与硬刷新后无残留 |

跨 Profile 必测：

- 同一 `DSH_HOME` 中 Desktop 与 Web 同时安装，配置不能互相覆盖。
- 同一内容寻址资源被两个 Profile 引用时，卸载任一 Profile 不得删除另一方资源。
- upgrade、restore、disable、uninstall 按 Profile 精确归属，不能复用“最新备份”。
- 相同发布包分别安装到两个 Profile，不能依靠 Desktop 安装产生的 symlink 让 Web 偶然可用。
- Web 多标签页同时预览和提交时，revision/配置 mutation 不得让旧状态覆盖新状态。

### 18.10 固定命令与证据产物

以下是项目必须提供的稳定命令接口。它们不是文档示例：G0 至 G2 在 Phase 1 交付，G3 至 G6 在 Phase 2 交付。Phase 2 的 G6 只验证 gate 本身；Phase 4 对 MVP 候选执行并批准 proposed matrix，Phase 6 对最终发布包重跑并晋级正式矩阵。命令必须接受任意候选精确版本，下面先设置首版变量：

```bash
export TARGET_VERSION="0.2.0-rc.2"
export TARGET_DSH_INSTALL="$DSH_INSTALL"

# G0：目标安装物和静态契约
pnpm contract:snapshot -- --dsh-install "$TARGET_DSH_INSTALL" --version "$TARGET_VERSION"
pnpm contract:verify -- --dsh-install "$TARGET_DSH_INSTALL" --version "$TARGET_VERSION"
pnpm contract:diff -- --base 0.2.0-rc.2 --candidate "$TARGET_VERSION" --fail-on required

# G1：adapter 与 loader ABI
pnpm adapter:generate -- --version "$TARGET_VERSION"
pnpm adapter:check -- --version "$TARGET_VERSION"
pnpm test:loader-abi -- --version "$TARGET_VERSION"

# G2：工程、皮肤和 CSS
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm liveries:compile
pnpm liveries:check
pnpm audit:tokens -- --version "$TARGET_VERSION"
pnpm audit:css
pnpm audit:contrast
pnpm build
pnpm pack:check

# G3：Profile 生命周期
pnpm smoke:profile -- --version "$TARGET_VERSION" --profile desktop --platform darwin --lifecycle install,start,disable,enable,upgrade,uninstall
pnpm smoke:profile -- --version "$TARGET_VERSION" --profile desktop --platform win32 --lifecycle install,start,disable,enable,upgrade,uninstall
pnpm smoke:profile -- --version "$TARGET_VERSION" --profile web --lifecycle install,start,disable,enable,upgrade,uninstall

# G4/G5：运行时
pnpm test:runtime:web -- --version "$TARGET_VERSION" --profile web --browser chrome --min-browser 120
pnpm test:runtime:web -- --version "$TARGET_VERSION" --profile web --browser edge --min-browser 120
pnpm test:runtime:desktop -- --version "$TARGET_VERSION" --profile desktop --platform macos
pnpm test:runtime:desktop -- --version "$TARGET_VERSION" --profile desktop --platform windows

# G6：候选/正式发布矩阵
pnpm gate:support-matrix -- --matrix contracts/dsh/support-matrix.proposed.json --version "$TARGET_VERSION"
pnpm gate:release -- --matrix contracts/dsh/support-matrix.proposed.json --version "$TARGET_VERSION"
```

Desktop Profile 若不提供 CLI 安装权限，`smoke:profile` 必须驱动 Electron 正式插件入口或测试专用官方接口；不得退回直接编辑 `package.json`、`cordis.patch.yml` 或 `node_modules` 的脚本作为验收替代。

标准证据目录：

```text
artifacts/
├── contracts/<version>/
│   ├── provenance.json
│   ├── hashes.json
│   └── diff.{json,md}
├── abi/<version>/
│   ├── loader.json
│   ├── external-resolution.json
│   └── handshake.json
├── profiles/<version>/<profile-platform>/
│   ├── lifecycle.json
│   ├── before/
│   ├── after/
│   └── residue.json
├── runtime/<version>/<profile-platform-or-web-browser>/
│   ├── probe.json
│   ├── trace/
│   └── boot-filmstrip/
├── visual/<version>/<profile-platform-or-web-browser>/
├── performance/<version>/<profile-platform-or-web-browser>.json
└── release/
    ├── compatibility.{json,md}
    ├── known-limitations.md
    ├── evidence-index.json
    └── checksums.txt
```

Desktop 目录使用 `desktop-darwin`、`desktop-win32`；Web 目录使用 `web-chrome-120`、`web-edge-120`。不同浏览器族或最低版本的证据不得覆盖、合并或只保留最新一次。G6 必须逐项核对 Web support entry 的 `browserFamily`、`minBrowserVersion` 和 `clientTarget`。

发布阻断条件：

- loader ABI 失败或任一 external 无法解析。
- pre-loader gate 失败后仍注入了任意 Livery boot 内容，或损坏 loader 时 Client 入口被执行。
- required contract diff 未处理。
- 任一正式支持 Profile 生命周期失败或有残留。
- Desktop 原生窗口门禁失败。
- Web Profile 的首帧、配置隔离、browser trust 或多标签页一致性失败。
- A 档 token 存在无豁免缺口。
- 未知版本没有安全回到 stock。
- package 声明范围大于 `support-matrix.json` 的实测 allowlist。
- 构建或发布包包含本机路径、legacy 宿主补丁、`references/` 或来源不清资产。

## 19. 分阶段实施

### Phase 0：冻结 DSH 0.2.0-rc.2 契约与高风险原型，4 至 6 人日

任务：

- 对本机 DSH `0.2.0-rc.2` 安装物生成第一份 contract snapshot 和 adapter manifest。
- 分别采集 loader ABI、Host API、Client API、token、layout、profile schema 六类哈希。
- 记录安装物来源、包集合、关键文件 SHA-256，并签名归档；完成前不宣称 `dsh-0.2.0-rc.2-r1` 已冻结。
- 记录 `package.json`、Cordis patch、Host/Client entry、loader envelope、peer/external 和 settings namespace 组成的插件装载契约。
- 验证 `webserver/index-inject` 的准确注入顺序。
- 做一套 light/dark token pair 最小皮肤，不注册主题。
- 验证 Host 首帧到 Client 接管无闪。
- 在 Windows 验证 caption、拖拽区和窗口按钮。
- 在 macOS 验证 sidebar 展开、折叠和 leading clearance。
- 验证 rightbar、Dock、fullscreen 和 portal 层级。
- 确定壁纸层挂载点和 stacking context。
- 分别确认 `font-family`、typography、conversation width、density 和 surface 的公开 capability。
- 确认 Desktop Profile 的 Electron 正式插件安装入口和 Web Profile 的 package manager wrapper。
- 分别完成 Desktop/macOS、Desktop/Windows、Web Profile 的最小加载 smoke test。
- 验证未知 contract hash 会 fail closed 到 stock。
- 验证损坏 loader envelope 时 pre-loader gate 阻止 boot 注入，Client 入口不执行。

交付物：

- `contracts/dsh/0.2.0-rc.2/contract.json` 与 `adapter.json`。
- 只包含 `0.2.0-rc.2` 目标项的初始 `contracts/dsh/support-matrix.proposed.json`；此时正式 `support-matrix.json` 仍为空或不存在。
- 六类哈希、安装物来源和包集合的签名证据。
- 一页 capability 表。
- 一份插件装载契约和准确 Node engine range。
- 最小插件原型。
- Windows、macOS、Web 三组关键状态截图。
- 三个正式目标的加载、契约和行为三层兼容结论。

退出条件：

- 不调用 `register/setTheme` 也能稳定覆盖 light/dark token。
- 从首个应用内容绘制到 Client ready 的 filmstrip 中不出现 stock 样式帧；boot style 必须在宿主 root 可见前生效。
- 未修改宿主主题属性和窗口结构。
- 壁纸方案在 Windows、macOS 真机通过并进入 MVP，或记录无法安全实现的原因并从首版 schema、UI 和验收矩阵移除。
- 宿主级 `font-family` 和至少一项布局 capability 已确认；若缺失，Phase 0 输出宿主能力提案并暂停 MVP，不能以收缩成单纯换色插件的方式继续。
- `0.2.0-rc.2 × desktop/macos`、`desktop/windows`、`web/Chrome 120+`、`web/Edge 120+` 的最小加载均通过。
- 未知或篡改 contract hash 时不写宿主 DOM，boot 影响已撤销，stock 可用。
- loader ABI 不匹配时 Host 不注入 boot 内容；若 Host 无法可信探测，则安装/激活入口拒绝启用。
- Phase 0 证据签名归档完成，`dsh-0.2.0-rc.2-r1` 才转为冻结状态，Phase 1 才可开始。

### Phase 1：工程骨架与编译核心，5 至 8 人日

任务：

- 建立 TypeScript、构建、lint、test 和 pack 基线。
- 落实 `package.json`、`cordis.patch.yml`、Host ESM bundle、DSH Client loader bundle、`./client` export 和 entry/settings namespace 测试。
- 定义并执行 `livery.schema.json`。
- 移植并清理颜色、推导、对比度和渲染算法。
- 实现 contract snapshot diff。
- 实现 adapter registry、boot handshake 和 unknown-version fail-closed。
- 实现 token 覆盖率门禁。
- 实现字体 registry 和四个布局配方的数据模型。
- 实现 `compile` 和 `--check`。

交付物：

- 可在干净 checkout 构建的项目。
- 一套示例皮肤的 light/dark 产物。
- schema、算法、覆盖率和 CSS 安全测试。
- 可由目标 DSH profile 识别并加载的最小标准插件包。
- G0、G1、G2 命令和标准证据目录。

退出条件：

- 生成物可重复。
- A 档实际消费 token 缺失且没有已批准的版本化豁免时，以及坏字体 ID、非法选择器或对比度失败时，阻止构建。
- 构建不读取 `references` 中的代码或本机绝对路径。
- Desktop 与 Web 两个目标 Profile 的安装和启动 smoke test 通过。
- 若移植参考项目源代码，已记录 MIT 来源并保留所需许可证与版权信息。

### Phase 2：Host、Client 与可逆生命周期，5 至 7 人日

任务：

- 实现 Host 配置和首帧注入。
- 实现包含 transient preview 的 Client 状态机和 presenter。
- 实现同步渲染批次和 stock 恢复。
- 接入宿主 locale、settings slot 和资源路由。
- 实现 capability 降级和自检报告。
- 验证禁用、热卸载和重载。
- 提前建立 F1 token-only、F2 public-hook、F6 quiet、F7 frame clearance、F9 isolated content 以及固定聊天/侧栏/输入区/插件面板截图场景。
- 建立字体加载、溢出、截断、碰撞和运行时对比度浏览器探测。
- 实现 G3、G4、G5 Profile 生命周期和运行时命令。
- 实现 G6 gate 本身并用故意失败的 proposed matrix 验证阻断行为；此阶段不发布支持矩阵。
- 在同一 `DSH_HOME` 下验证 Desktop/Web 配置、资源和卸载隔离。

交付物：

- 可安装到 profile 的插件包。
- 首帧、切肤、宿主深浅切换和卸载测试。
- 可重复的固定契约场景与第一批浏览器探测报告。

退出条件：

- 0 theme register、0 theme preference 写入、0 全文档 observer。
- 所有自有 DOM 和 CSS 都可撤销。
- 配置损坏和资源缺失不会阻止 DSH 启动。
- Desktop 与 Web 禁用、卸载、重启后各自无残留，互不影响。

### Phase 3：中英文设置 UI 与代表性皮肤，5 至 7 人日

任务：

- 完成 `zh-CN` 和 `en-US` 文案。
- 实现搜索、tag、键盘导航和固定契约场景缩略图。
- 完成中文、英文字体 profile。
- 先做 3 套代表性双形态皮肤：纯 token、表面材质、高对比压力测试。壁纸只在 Phase 0 通过时加入其中一套。
- 为两种语言生成独立预览和视觉基线。
- 建立中英文独立文案审校项和极长按钮、混排、文件路径、错误、空状态测试数据。

交付物：

- 可用的双语设置界面。
- 3 套 light/dark 代表性内置皮肤。
- `zh-CN/en-US × light/dark` 预览资产。

退出条件：

- 两种语言都没有截断、错行、缺字和未翻译键。
- 中英文分别完成文案审校；浏览器报告验证 `scrollWidth`、换行数、截断、实际字体和 accessible name。
- 每套皮肤在两种语言和两种形态下通过对比度检查。

### Phase 4：插件兼容与布局矩阵，5 至 8 人日

任务：

- 完成 F1 至 F12 fixtures。
- 以锁定版本的当前常见 DSH 插件做人工只读兼容抽查，不让其代码进入正式 CI 或发布包。
- 完成 sidebar、rightbar、Dock、fullscreen 和窄窗口适配。
- 完成 forced-colors、reduced-transparency 和 reduced-motion 降级。
- 建立 Playwright pairwise 截图和真机发布矩阵。
- 对 `0.2.1-rc.2` 候选运行 G0 至 G5，生成 `support-matrix.proposed.json`；不得直接修改正式 support matrix。
- 记录 C 档不可控内容。
- 兼容矩阵稳定后，再把内置皮肤从 3 套扩展到 10 套；新增皮肤不得改变运行时架构或公开契约。

交付物：

- 插件兼容报告。
- 浏览器检查 JSON 和截图报告。
- 已登记的补偿规则及豁免清单。
- 10 套通过完整双语、双形态门禁的内置皮肤。
- DSH `0.2.1-rc.2` 候选认证报告；失败时保留为不支持并列明 required diff 或行为差异。
- 待 G6 审核的候选矩阵；G6 未通过时不得晋级正式矩阵。

退出条件：

- A 档 fixture 全绿。
- B 档没有内部类名和 DOM 结构依赖。
- C 档只验收 Livery 不破坏宿主外框和周围交互；隔离内容内部保持原状并记录限制。
- 关键布局状态无覆盖、错位和层级冲突。
- 正式 `support-matrix.json` 保持为空或只包含此前已发布支持项；所有 MVP 候选只进入 proposed 文件。
- 对 `0.2.0-rc.2` MVP 候选执行带 `--version 0.2.0-rc.2` 的 G6，只把该条目标记为 `g6-approved`；不得影响 `0.2.1-rc.2` 条目，也不得在 Phase 4 生成或修改正式 support matrix。

### Phase 5：自定义皮肤与导入导出，按需 5 至 8 人日

图片取色、壁纸、焦点编辑和位图归档条目以 Phase 0 背景层验证通过为前提；若未通过，Phase 5 只实现不含位图的受限皮肤数据导入导出。

任务：

- 背景层验证通过时，实现图片取色和 light/dark 双形态派生。
- 背景层验证通过时，实现 veil 建议和焦点编辑。
- 先完成 `.dshlivery` 导入威胁模型和 Host 变更接口信任边界。
- 实现 `.dshlivery` 安全导入、导出、替换和删除。
- 实现内容寻址存储、配额、并发锁和垃圾回收。
- 自定义 WOFF2 不进入当前 schema；若后续验证跨平台解码、字形、许可证和隔离，再以新 schemaVersion 单独设计。

退出条件：

- 自定义皮肤和内置皮肤走同一编译器。
- 对比度失败的皮肤不能直接应用，并给出明确修正建议。
- 恶意归档、路径穿越、压缩炸弹、假图片和并发超配额测试通过。

### Phase 6：发布，2 至 3 人日

任务：

- 对齐 package version、运行时版本、CHANGELOG 和更新元数据。
- 检查 `npm pack` 内容和许可证。
- 检查参考代码的来源记录、NOTICE 和第三方许可证。
- 在新 profile 安装、升级、禁用、卸载和恢复。
- 验证离线环境和只读网络环境。
- 发布兼容矩阵、已知限制和第三方接入说明。
- 执行 G6，生成 release evidence index。
- G6 通过后，以一次受审查变更把 proposed matrix 晋级为正式 `support-matrix.json`。

退出条件：

- 干净环境可构建、安装和卸载。
- 发布包不包含 `references`、归档主题、来源不清素材和本机路径。
- 版本和文档信息一致。
- package 兼容声明没有超过 support matrix allowlist。
- Phase 6 是唯一允许生成或更新正式 `support-matrix.json` 的阶段；晋级与最终发布包、evidence index 和 checksums 同一次发布事务完成。

## 20. MVP 发布候选验收标准

MVP 发布候选指 Phase 0 至 Phase 4 完成，不包含自定义导入。它证明实现已经具备发布条件，但在 Phase 6 最终包通过 G6、矩阵晋级和发布事务完成前，不对外宣称正式支持。

- DSH `0.2.0-rc.2` 精确安装物及认证 contract hash 是首版 required target。
- Desktop Profile 在 macOS、Windows，以及 Web Profile，均达到拟正式支持标准，不再把 Web 只作为调试路径。
- 三个目标分别通过加载兼容、契约兼容和行为兼容，证据进入 release index。
- MVP 候选 package metadata 只能声明 proposed matrix 中当前 `g6-approved` 的精确范围，不声明 `0.2.x`；正式发布包只声明正式 `support-matrix.json` 中的范围。
- DSH `0.2.1-rc.2` 先进入 proposed matrix，只有 G0 至 G6 全部通过并完成矩阵晋级后才增加为支持版本；否则保持 candidate/unsupported。
- `zh-CN`、`en-US` 设置界面和预览完整。
- 至少 10 套双形态皮肤。
- 颜色、宿主级 `font-family` 和至少一项安全布局 capability 实际生效；不得用仅修改 Livery 设置页替代宿主级能力。
- 跟随宿主 light/dark，不改变宿主偏好。
- 启动 filmstrip 中没有 stock 样式帧，Client 接管不产生可见回闪。
- A 档插件自动适配，B 档使用公开钩子或插件 opt-in，C 档正确降级。
- A 档实际消费 token 的覆盖缺口为 0，或每个缺口都有版本化豁免；只有存在用户可见影响的豁免才显示在自检中。
- 所有对比度门禁通过。
- 0 `!important`、0 哈希类名选择器、0 全文档 observer。
- Window caption、macOS leading、sidebar、rightbar、Dock、fullscreen 和 modal 不被遮挡。
- forced-colors 下让系统色接管，reduced-transparency 下回到可读不透明表面。
- 禁用、卸载、热重载后无样式和节点残留。
- 同一 `DSH_HOME` 下 Desktop/Web 配置、资源、备份和卸载互相隔离。
- Web Profile 通过硬刷新、多标签页、Origin/browser trust 和服务重启验收。
- 未知版本或 required contract mismatch 自动回 stock，不执行内部 DOM fallback。
- 满足第 18.8 节性能硬门禁。调整阈值必须有批准人、原因、替代值和失效日期，并作为版本化例外进入 release evidence；单纯“已有测量数据”不能放行。

## 21. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| DSH 公开 token 不覆盖字体或布局 | 用户要求的宿主级能力无法安全实现 | Phase 0 先确认；推动宿主增加正式 token/hook，在能力可用前不宣称 MVP 完成，不能用 Livery UI 替代 |
| DSH Client ABI 变化 | 插件无法加载 | 版本化 contract snapshot 和双版本 CI |
| 版本号相同但安装物契约不同 | 错误复用 adapter | 版本号加六类 contract hash 双重识别；required hash 不同即重新认证 |
| 只做静态 diff，真实布局已变化 | 包能加载但界面破相 | 加载、契约、行为三层兼容；Desktop/Web 分别保存运行时证据 |
| 宽泛声明 `0.2.x` | 未测试版本被误判支持 | 精确 allowlist，未知版本 fail closed 到 stock |
| Desktop/Web 安装脚本串 Profile | 配置或恢复错误 | 命令显式 profile、独立事务和备份归属；同一 DSH_HOME 并存测试 |
| 宿主新增 token | 新组件混入 stock 色 | 引用覆盖率差集阻止发布 |
| 系统字体差异 | 中英文排版和宽度不同 | 使用系统栈、长文案基线、各平台真机截图，不承诺像素一致 |
| 壁纸 stacking context 不稳定 | 背景不可见或挡住交互 | Phase 0 原型先验证；无法稳定时 MVP 关闭壁纸而不是使用结构推断 |
| 第三方插件硬编码颜色 | 低优先级 layer 无法覆盖 | 要求插件改用 DSH token 或显式 opt-in；否则按 C 档外框统一并披露 |
| 视觉矩阵过大 | CI 过慢 | 提交时 pairwise，发布前高风险全矩阵 |
| 自定义字体带来许可证和安全问题 | 发布和导入风险 | MVP 和当前导入 schema 只用 registry；WOFF2 若实现，使用新 schemaVersion 并单独审计 |
| 参考项目资产权利不清 | 无法公开分发 | 不复制图片、角色名、商标和品牌化标题栏 |
| 参考项目代码移植遗漏归属 | 许可证不完整 | Phase 1 记录移植文件和 MIT 来源，Phase 6 检查 NOTICE/许可证 |
| CSS layer 与宿主实际级联不同 | token 或补偿不生效 | contract fixture 中记录宿主层级，Phase 0 用真实页面验证 |

## 22. 第一轮实施清单

实际编码应从下面这组任务开始，不先制作大量皮肤：

1. 只建立能运行 spike 的最小 package 和构建脚本。
2. 对 DSH `0.2.0-rc.2` 编写 contract snapshot，记录 loader、Host、Client、token、layout、profile schema、来源等级和公开状态。
3. 生成 `dsh-0.2.0-rc.2-r1` adapter manifest 和只含该版本 draft 条目的 `support-matrix.proposed.json`。
4. 从目标契约确定准确 Node range、Host/Client bundle 格式和正式工程依赖，再建立 TypeScript、Vitest、Playwright 和固定版本 esbuild 基线。
5. 分别验证 Desktop/macOS、Desktop/Windows、Web Profile 的最小加载和 unknown-version fail-closed。
6. 做一套只有四个种子色的 `fjord` 测试皮肤，生成 light/dark token pair 和对比度报告。
7. 做 Host 首帧注入、boot handshake 和 Client loading 不写 DOM 的最小状态机。
8. 验证 Windows caption、macOS leading、rightbar fullscreen、Web 硬刷新和 stock 恢复。
9. 验证 `system-cjk`、`system-latin` 两套字体 profile 和至少一项宿主级布局 capability。
10. 确认壁纸挂载点；不稳定则从首版 schema、UI 和 MVP 矩阵移除。
11. 实现 Desktop/Web 生命周期 wrapper 和同一 DSH_HOME 隔离测试。
12. 原型通过后扩展 schema、设置画廊和 3 套代表性皮肤；兼容矩阵稳定后再扩展到 10 套。

这组顺序先验证宿主边界，再扩展视觉内容，可以避免参考项目中“皮肤数量已经很多，但基础接入方式需要推翻”的情况。
