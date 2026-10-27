> **Historical archive.** This document is preserved for engineering history and
> is not authoritative. Current documentation starts at
> [`docs/README.md`](../README.md); current support is defined by
> [`contracts/dsh/support-matrix.json`](../../contracts/dsh/support-matrix.json).

# 皮肤引擎 v3 设计笔记

本文记录对旧皮肤插件的审计结论和 v3 设计方案。审计覆盖三个方面：插件本体、宿主契约和第三方生态。文中的代码名、字段和路径都是当时的设计草案，不代表当前实现。

# 一、结论：问题在架构层，不在 bug 层

现有插件有三个根本问题，和 DSH 0.2.1 的平台模型正面冲突：

| 根本冲突 | 后果 |
|---|---|
| **A. 皮肤把自己做成宿主主题的所有者**：注册 43 个 `ctx.theme` 主题 + `setTheme(skinId)` | 外观设置失效、`data-ds-theme-source` 被钉死、任何设置写入都和皮肤互相改写、主题 id 撞名直接抛错 |
| **B. 皮肤把窗口 chrome 画进 `shell.overlay`**：46px 标题栏 + `[data-dsh-frame]{padding-top:46px}` | Windows 压住宿主标题栏拖拽条；macOS 盖住 `shell.leading` 的“展开侧栏/新会话”；与红绿灯/`--dsh-frame-top-clearance` 双计；fullscreen 全错位 |
| **C. 43 套完整 CSS 全量常驻**：315 KB CSS / 429 KB bundle / 43 次主题注册 | 启动 43 次强制样式重算；每套皮肤与自定义皮肤走两条渲染路径；宿主每加一个 token 就出新缺口 |

所以，零散的 bug 可以修；但要同时解决“风格表现力、不同布局适配、第三方插件适配”，就必须换架构。新的设计方向可以概括为一句话：

> **皮肤 = 一对（light/dark）语义 token 覆盖层 + 受宿主布局状态机约束的少量表面规则；不再拥有宿主主题偏好，也不再自己画窗口。**

---

# 二、四个维度的具体问题（均带证据）

## 1. 功能

**P0**
- **Windows 上 QQ 风格标题栏仍会渲染**：`presenter.ts:63-66` 只在 Windows 下 `removeAttribute(data-dsh-titlebar)`（取消 46px 占位），但 `_chrome.css:301-315` 的显示规则只看 `body[data-skin-chrome]`，所以 46px 绝对定位、`pointer-events:auto` 的 overlay 带正好压在宿主 caption 拖拽条（`.frame::before{-webkit-app-region:drag}`）和原生最小化、最大化、关闭按钮上。
- **主题 id 撞名会导致插件加载失败**：宿主 `ctx.theme.register` 重复 id 直接 throw（`ui-theme/src/client/index.ts:326-341`），而插件无 try/catch 注册 43 个裸 id（含 `custom`），`client/index.ts:113-149`。
- **卸载后残留 CSS**：自定义皮肤 `<style id="dsh-custom-skin">` 无 `data-plugin*`、不在 `ctx.effect` 内（`custom-skin.ts:125-141`），module system 只回收 `style[data-plugin]`（`entry-lifecycle.ts:23-28`）。

**P1**
- **首屏防闪逻辑被自己抵消**：`configForms` 初始 `status:'loading'`、`value:undefined`，`adopt()` 把它当 `'none'` 摘掉 boot 脚本写好的属性（`client/index.ts:197-216`），同时 theme presenter 已按 `system` 刷出深色属性 → 深色偏好下先闪错帧。
- **抢走外观控制**：43 次 `register({tokens:{}})` + `setTheme(skinId)` 把 preference 变成裸皮肤 id；外观设置的三个立方体控件没有选中态；每次写入设置都会触发 adopt 重置和插件 reassert（2 次 publish + 2 次 `getComputedStyle`）；Electron 原生窗口装饰也被固定住。宿主推荐的做法是 `ctx.theme.overrideTokens(source,{light,dark})`，或者只做 CSS token 层。
- **43 次注册的启动代价**（每次 publish + presenter 强制重算，`ui-theme/src/client/index.ts:380-419`）。
- **自定义皮肤分两次非原子写入**（先 customSkin 再 skin，中间态各触发一次 adopt）；宿主已有 `mutate(ops)` 原子多写，但没有用上。
- **安装器 `--restore` 二次安装后回不到安装前**（备份的是已装插件的 manifest）。
- **版本/文档漂移**：package 2.1.0、update-contract 2.1.0、CHANGELOG 2.3.0；README 47/49/45 混用；中文硬编码在英文 UI（`SkinRow.tsx:79-82`、`TitleBar.tsx:66`）。
- 无用的配置字段 `focus` 恒为 `50% 50%`；DOM 副作用没有统一的 dispose owner。

## 2. 皮肤风格

- **契约只有 8 对**（7 个 alias + 1 个 chrome，`derive.ts:573-591`），缺少菜单材质、shiki/代码块、hover/selected、state 色、mask/diff、边框、禁用态和深色形态。自定义皮肤的 `report` 算完就丢，运行时没有检查。
- **token 覆盖 147/190**：缺 24 个 alias/specific（state-*/mask-*/menu-group-header-fill 等）+ 19 个 static（amber/green/red）；`README` 的“完整覆盖色板”不成立，也是深色形态难做的根因。
- **43 套全部浅色**：17 套深色被归档；深色偏好用户无皮肤可选，“默认”的 `previousPreference` 初始 `system` 还可能回错。
- **元素级全局规则破坏组件几何**：`_chrome.css:103-129` 对 `button/input/select` 强制 6px 圆角+描边（(0,1,1) 压过组件 (0,1,0)）——侧栏 icon button、dockkit 28px 圆形控件、设置按钮全被改成方框。截图里能看到（`docs/images/fjord.webp`、`skin-center-v2.webp`）。
- **失效或脆弱的钩子**：`[data-message-bubble]` 在 rc.2 全仓 0 命中；`button[class*='_primary']` 依赖 CSS Modules 哈希；`[data-phase]` 同时命中输入框可编辑区，罩层刷到 composer 上。
- **硬编码面未补偿**：shiki 9+9 色、menu group header、onboarding 三段渐变、darwin 侧栏渐变/玻璃、docpreview/trajectory 阴影、attachment 插画、pdf/excel/xterm 调色板。
- **无 reduced-transparency / reduced-motion / forced-colors 分支**：玻璃预设系统降透明时反而更透。
- **基于选择器的“预览”只是色带**，不是真实 UI 缩略图；QQ 风格标题栏和原生窗口按钮重复。

## 3. 布局适配（主要问题）

| 状态 | 当前表现 |
|---|---|
| macOS 桌面 | darwin 下 `.centerCol` 有不透明 `bg-base`，插件只把 `[data-phase]` 刷透明 → **背景图可能完全不可见**（推断，需真机；docs 截图疑似来自 web） |
| sidebar 折叠（darwin 无 rail） | titlebar 46px 盖住 `shell.leading`（z15、top11、left88）唯一“展开侧栏/新会话”入口，`--dsh-frame-leading-clearance` 160/84 未处理 |
| macOS/Windows 顶部 | 宿主 `--dsh-frame-top-clearance:48px` 已给 settings/plugin-manager/schedule 页面留白，插件再加 46px → 双计；README 声称的 darwin 84px 让位在 CSS 里 grep 零命中 |
| 右栏 | 0.2.1 右栏是 `ui-sidebar-right`+`ui-dockkit`（push/fullscreen、单/双 pane、tab strip、浮动、drop zone、iframe/canvas/xterm）。插件只对 `[data-rightbar-col]` 刷渐变 + `::before` 76px 假面板头：dock 不透明时是死代码，半透明时错位；fullscreen 时面板 z40 盖标题栏但 46px 留白还在；无 track 时宽 0；右栏二次 veil 约 0.93 造成双曝光 |
| fullscreen | 固定 46px 带与宿主 `--dsh-frame-overlay-top:20` 冲突；无分支 |
| 窄视口 | 无 @media：<1024 侧栏自动折叠、<768 右栏自动 fullscreen 时，壁纸取景/品牌/字号不收缩 |
| 全局 main panel | 色板跟随但 centerCol 不透明，壁纸不显示；pdf/excel/iframe 内容不跟随 |
| shell.bottom / overlay / 模态 | 无规则；titlebar 与后注册 notice/toast 叠放顺序不确定 |

## 4. 其他插件适配

- **现有插件没有硬冲突（已确认）**：dsh-charter 只注入 1 张 `data-plugin-css` + 注册 `conversation.view`；dsh-context 注入 18 张（含完整编译 Tailwind v4）+ 注册 view/overlay/sidebar/main 等席位。都不注册主题、不写 body 属性，90%+ 颜色走 `--dsw-alias-*`，**只要 token 完整就会自动跟随**。
- **真正的风险**：① 皮肤抢 `ctx.theme`（id 撞名、preference 互写）；② 全局元素选择器/哈希类名选择器误伤；③ 皮肤单张未分层 style 让第三方无法用正常 CSS 覆盖；④ 第三方自带调色板（dsh-context 图表 Tailwind `--color-*`、shiki、pdf/excel/xterm、attachment 插画）不会跟随，只能“外框统一、内容保留”；⑤ 皮肤和 ui-chat 的 `transcript-view` 都占 settings order 12，顺序依赖装载序。
- **官方契约（rc.2 确认）**：插件 CSS 未分层、按注入顺序层叠；生命周期只回收 `style[data-plugin]`；主题扩展正解是 `overrideTokens`；CSS Modules 的 `<hash>_<local>` 是内部实现，不可依赖。

## 5. 哪些问题修 bug 解决不了，必须换架构

1. **外观控制权**：不再 `register/setTheme`；用纯 CSS 双形态 token 层（或只在第三方扩展色时用 `overrideTokens`）。
2. **窗口 chrome**：不把标题栏画进 `shell.overlay`；要复古窗框就做“内容区装饰条”的独立可选包。
3. **皮肤生成/分发**：43 套 = 43 组 seeds + 运行期 derive + 只注入激活皮肤；内置与自定义同一条路径。
4. **背景图分层**：独立 fixed 壁纸层 + 表面透明度策略 + 平台/无障碍降级，不依赖“frame 背景穿透各列”。
5. **组件外观协议**：禁元素级/哈希类名选择器；只用 token + 公开 data-* + `@layer`。
6. **可逆生命周期与首屏**：单一 presenter + 按 `configForms.status` 分派的状态机；安装/卸载事务化。

---

# 三、新插件设计：DSH Skin Engine v3

## 1. 目标与边界

**做**：官方契约内工作；双形态一等公民；纯 CSS 布局状态机；第三方可组合；有性能预算；可验证；可逆生命周期。
**不做**：默认窗口 chrome 定制（降级为可选 chrome pack）；替换宿主外观控件；PDF/Excel/iframe 内容换肤；改宿主源码。

## 2. 六个关键决策

| # | 主题 | 现状 | v3 |
|---|---|---|---|
| 1 | 与宿主主题关系 | 43 theme + setTheme，占 preference | **零 register、零 setTheme**；双形态 token CSS 按 `body[data-ds-dark-theme]` 切换 |
| 2 | token 应用 | 43 份 CSS 全量常驻 | 每皮肤 token pair 数据；激活时注入 1 份；首帧 Host 内联；内置/自定义同一 derive |
| 3 | 组件外观 | 元素选择器 + 哈希类名 | `@layer dsh-skin.chrome` + data-attr 白名单 + `:where()`；能 token 化绝不写 CSS |
| 4 | 窗口 chrome | overlay 自绘 + frame padding | 默认不做；可选装饰条只占内容区，按 `clearance` 变量让位 |
| 5 | 背景图 | frame/右栏，依赖穿透 | 独立 fixed backdrop + 表面透明度策略 + 平台矩阵 |
| 6 | 生命周期/安装 | 散落 DOM 写、备份式安装 | 单一 presenter + `ctx.effect` 逆序撤销；首帧状态机；事务化安装 |

## 3. 皮肤格式 `skin.json` v3

```jsonc
{
  "schemaVersion": 3,
  "id": "fjord-blue",
  "name": { "zh": "峡湾", "en": "Fjord Blue" },
  "tags": ["素雅"], "order": 100,
  "schemePolicy": "auto",            // auto=双形态跟随宿主；light/dark=锁定（可选）
  "seeds": {
    "accent": "#5b7c99", "secondary": "#8ba7bd",
    "surface": "#f0f3f6", "text": "#1b2733",
    "dark": { "accent": "#8fb3d1", "surface": "#181c21", "text": "#eef2f6" } // 可选，缺省自动推导
  },
  "tokens": { "light": {}, "dark": {} },  // 显式覆盖
  "assets": { "wallpaper": { "file": "fjord.webp", "focus": { "wide": "50% 40%", "narrow": "60% 50%" } } },
  "chrome": "flat",                  // flat | glass | neon | none
  "compat": { "minHost": "0.2.1", "capabilities": ["theme-css", "frame-top-clearance"] }
}
```

**token 契约（生成器强制）**
- alias 101 + specific 11：**逐 token 双形态必供**，缺一即构建失败（除非显式豁免）。
- static 77：只桥接白名单家族（blue/deepseek→accent；neutral→带色相中性阶）；amber/green/red 语义色不覆盖。
- typography/radius/shadow/elevation：默认不改动，跟随宿主。
- shiki 9×2、onboarding/mask/think 渐变：显式覆盖清单。
- **覆盖门禁**：构建期从目标 DSH 安装物抽取所有被引用的 `--dsw-*`，与皮肤定义求差；新增缺口必须“实现或显式豁免”，CI 输出 diff。

**对比度契约 v3（8 对 → 矩阵）**
- 角色 × 表面 × 状态 × 形态（light/dark）：正文/次要/三级/caption、brand/link/on-accent、state-{error,warn,success}、disabled、placeholder；bg-base/sidebar/bg-layer/bubble/menu/toast/tooltip/code-block/input/card/**壁纸最坏复合表面**；default/hover/active/selected/focus/disabled。
- 文本 4.5:1（大字号 3:1，WCAG 2.2 AA，附 APCA 报告）；非文本 3:1；壁纸按 P95 最坏亮度 + veil 复合测。
- **自定义皮肤同样过矩阵**，失败拒绝应用并给出“换图/提高遮罩/降彩度”建议，而不是算完就丢。

**schemePolicy**：默认 `auto`（皮肤提供双形态，用户的外观选择决定用哪套 token，原生窗口装饰保持一致）；确实需要固定形态的皮肤才用 `light/dark`，并明确提示“不跟随系统”，不把它作为默认路径。

## 4. 布局适配协议

**状态模型（纯 CSS，无 DOM 打标）**
- 平台：`html[data-platform]` / `[data-windows-titlebar]`；窗口：`[data-fullscreen]` / `[data-input-modality]`；深浅：`body[data-ds-dark-theme]`；左栏：`frame[data-sidebar-collapsed]`；右栏：`frame[data-rightbar-*]` + `[data-sidebar-right-*]` + `[data-dockkit-*]`；宽度：`@media 1023/767`；让路：`[data-dsh-skin-quiet]`；无障碍：reduced-transparency/motion、forced-colors。
- **禁止**：改宿主 frame 属性/padding、依赖哈希类名、新增 >20 的全局 z 层。

**行为矩阵（验收）**
- sidebar 展开/rail/无 rail：不覆盖宿主顶部控制区；chrome pack 自动隐藏并让位 leading clearance。
- rightbar push/无 track/fullscreen/<768：只 token 化面板/条带/分割线；不写列背景/伪元素；不新增顶部留白；不覆盖 dock 层。
- dock 双 pane/浮动：token 覆盖材质，不抬 z。
- shell.bottom/overlay/模态：皮肤不进入 overlay；预留 bottom 规则。
- Windows 标题栏：不渲染自绘标题栏，只用 token 调整 caption。
- fullscreen/窄视口/无障碍媒体查询：装饰收起、壁纸取景切换、glass→solid、壁纸→纯色。

**可选 chrome pack**：独立包、默认 OFF；高度 = `max(0, 设计高度 - var(--dsh-frame-top-clearance))`；不写 frame padding、不改 drag region、不进 shell.overlay；darwin 展开可显示/折叠隐藏，Windows 永不显示，fullscreen/rightbar fullscreen 关闭。

**壁纸层**
```
body
 ├─ #dsh-skin-backdrop（fixed, inset:0, z-index:-1, aria-hidden, pointer-events:none）
 ├─ #root（宿主内容；表面透明度由 token 决定）
 └─ portal 层（模态/菜单，不透明材质，不透视壁纸）
```
- 只绘制一次，fixed 不随 scrollport 变化，从根源上避免 v2 中“消息变长后背景放大”的问题；
- 表面透明度策略：只让页面级表面透壁纸，菜单/弹窗/输入框/代码块保持不透明；
- 平台矩阵：web/win 默认 ambient；darwin 默认 vibrancy tint（保留系统毛玻璃），壁纸为显式选项；reduced-transparency/HCM 回退纯色；
- 取景 `focus.wide/narrow` + 安全区；壁纸 ≤2560 长边、≤400KB、按需加载。

## 5. 组件补偿：三档分治

| 档 | 面 | 做法 |
|---|---|---|
| A token 化 | alias/specific/static 桥接、state、mask、menu fill、onboarding accent、think 渐变、elevation/shadow | 生成器输出双形态值 + 覆盖门禁 |
| B CSS 补偿（`@layer` + data-attr 白名单） | shiki 9 token、file-diff、menu group header、onboarding 卡/渐变、darwin 侧栏渐变/玻璃、docpreview/trajectory 阴影、meter tint、深色卡文字 | 只用 `[data-*]`/平台属性/`body[data-ds-dark-theme]`，`:where()`，可被第三方覆盖，每条注明“token 不可达原因” |
| C 不可控降级（文档化） | pdf.js 7.1MB、Excel 6.4MB、xterm 687KB、browser iframe、canvas、attachment 插画 | 只统一外框；内容保留；在“皮肤自检”里列出 |

z-index 预算：皮肤内容 ≤10、装饰 ≤15、不新建 >20 固定层；dock 40/float 60/tab-menu 70/模态 100+ 一律不覆盖。

## 6. 第三方插件兼容契约 v1

**公开只读 API**
- `body[data-dsh-skin="<id>"]`、`body[data-dsh-skin-scheme="light|dark"]`
- `--dsh-skin-accent / on-accent / surface / ink`（4 个作者语义色，可选读）
- 消费色板的推荐方式：`--dsw-alias-*` / `--dsw-specific-*` + fallback
- `[data-dsh-skin-quiet]`：第三方根节点标了它，皮肤 chrome 对其不生效
- `@layer dsh-skin.chrome`：未分层的第三方 CSS 始终优先

**皮肤承诺**：不改 `data-ds-*`/body 非自有属性；0 `!important`；不占 overlay/root/main/rightbar 主位；所有 DOM 写进 `ctx.effect`；alias 覆盖双形态完整。

**fixture（进 CI）**：F1 token-only、F2 host-dom（charter/context 同款隐藏规则）、F3 tailwind 污染、F4 第三方主题所有者、F5 custom-style 生命周期、F6 quiet、F7 frame-clearance 双计、F8 主题 id 撞名、F9 order 并列、F10 壁纸+iframe/terminal。

## 7. 运行时与生命周期

- **Host**：Config v3（skinId/customPair/wallpaper/schemePolicy）；`webserver/index-inject` 在宿主 theme 注入之后 push ①激活皮肤 token pair CSS（`body[data-dsh-skin][data-ds-dark-theme]` 与 `:not(...)` 两段，(0,2,1) 稳定压过 stock）②属性脚本（只写 `data-dsh-skin`/scheme/壁纸层，不碰 `data-ds-dark-theme`/`color-scheme`/`data-ds-theme-source`）。首帧即正确、无 adopt 竞态。
- **Client**：一个 presenter + 状态机 `boot → loading（不写 DOM，保留 boot 结果）→ ready → degraded → disposed`；切肤 = 换 1 个 `<style>` token pair + 1 个属性 + 壁纸 URL，0 次 theme/change、0 次全局重算；自定义皮肤原子 `mutate` 一次写完；dispose 逆序撤销。
- **降级/自检**：皮肤不可用自动回 stock 并说明原因；能力缺失用 fallback；设置行增加“皮肤自检”（契约结果、token 缺口、不可换肤面、布局探测，可复制成 issue）。

## 8. 性能预算

| 指标 | v2 | v3 |
|---|---|---|
| client bundle gzip | ~63 KB | ≤25 KB |
| 首屏 CSS | ~340 KB 常驻 | ≤12 KB |
| 每皮肤增量 | 7.3 KB×43 | 切肤 4–8 KB |
| theme 事件 | 43 register + 每次切肤 reassert | 0 register / 0 theme/change |
| 启动 DOM 写 | MutationObserver + 属性 | 0 observer，ready 后一次写入 |

## 9. 设置 UI / 自定义皮肤 v2

- 画廊用**真实界面缩略图**（构建期 token+壁纸渲染静态 WebP），双形态标记、筛选/搜索/键盘导航；
- 自定义：选图 → 双形态派生 → 契约矩阵校验（失败给建议）→ 壁纸焦点位置可视化（修掉 v2 中无效的 `focus` 字段）→ 删除/替换/导入导出 `.dshskin`；
- 版本/更新移到“关于”，i18n 完整；安装器事务化（首次安装前快照，`--restore` 幂等）。

## 10. 工具链与质量门禁

- `contract-snapshot`（从 DSH 安装物抽 token/引用/data 钩子/布局常量，哈希提交）→ compile（skin.json → token pair JSON + chrome CSS + 缩略图 + manifest）→ gate（schema/覆盖 diff/对比度矩阵/CSS golden/`!important`/元素选择器/哈希类名 静态扫描/体积预算）→ pack。
- CI：单元 + F1–F10 + Playwright 视觉矩阵（web/win/darwin × 宽窄 × light/dark × stock/壁纸/玻璃 × 右栏 closed/push/fullscreen/dock/float × sidebar 展开/rail/无 rail）+ axe/forced-colors + 性能 trace + 对最新 rc/上一个 stable 的 contract diff。

## 11. 迁移：哪些留、哪些扔

**留**：OKLCH 推导/对比度求解（`derive.ts`）、图片取色（`extract.ts`）、43 套皮肤数据与壁纸、内容寻址图床与配额/嗅探、生成器契约门禁与 `--check`。
**扔**：43 个 theme 注册、`setTheme(skinId)`、`previousPreference`、theme/change reassert、TitleBar+`data-dsh-titlebar`+frame padding（降级为可选 chrome pack）、元素级/哈希选择器与 `[data-message-bubble]`、340 KB 全量 `sheets.ts`、备份式安装器。
**归档的 17 套深色皮肤**：作为 dark-first 皮肤回归，正好补齐“深色偏好用户无皮可用”。

## 12. 分阶段与验收

- **Phase 0（3–5 人日原型，先验证风险）**：在真机上复核五项：macOS 桌面背景图是否可见、Windows 标题栏是否压住题注行、macOS 折叠侧栏后 leading 区域是否被盖、外观设置中的立方体控件是否有选中态、`--restore` 是否残留；再做“CSS token pair + boot 内联”的最小原型，验证首屏不闪。
- **Phase 1（1.5–2 周 MVP）**：引擎/契约/首帧/设置画廊/10 套双形态皮肤，移除 titlebar 与 theme 注册，CI 骨架。
- **Phase 2（1–2 周）**：右栏 dockkit 全状态、sidebar/leading/fullscreen/windows、壁纸层+降级、F1–F10、视觉回归矩阵。
- **Phase 3（按需）**：43 套双形态、深色回归、skin pack 导入导出、chrome pack、自检面板。
- **完成标准（DoD）**：三种形态和所有布局状态的截图矩阵都没有异常；外观、系统深浅和原生窗口装饰与 stock 一致；主题冲突风险为 0；第三方 fixture 全部通过；首屏不闪；体积、启动和切肤时间达标；卸载后零残留；覆盖缺口为 0，或有豁免记录。

---

# 四、一句话总结

v3 不是把 v2 的 bug 逐个修一遍，而是把皮肤从“宿主主题的所有者、窗口装饰的绘制者、全量 CSS 的搬运者”改回它本来该有的样子：**一对受契约保护的语义 token、一套遵守宿主布局状态机的表面规则，以及一个可被第三方组合的只读契约**。v2 中有价值的工程资产全部保留，成为负担的四件事全部移出。
