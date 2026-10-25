/**
 * Chinese (zh-CN) UI dictionary for the Livery settings page.
 *
 * Written natively rather than translated sentence by sentence (plan §11.1):
 * direct, plain Simplified Chinese, no unnecessary English terms, buttons stay
 * on one line, and explanations live in the supporting line.
 */
import type { LiveryKey } from './en-US.js'

export const zhCN: Record<LiveryKey, string> = {
  // Settings section shell / header.
  'section.label': '皮肤',
  'section.title': '皮肤',
  'section.subtitle': '为整个会话挑选颜色、字体与安全布局。',
  'section.loading': '正在加载皮肤…',

  // Current livery summary card.
  'current.title': '当前皮肤',
  'current.stockName': '默认外观',
  'current.stockDescription': 'DSH 自带外观，未应用任何皮肤。',
  'current.applied': '已应用',
  'current.previewing': '正在预览「{name}」',
  'current.incompatible': '当前宿主不支持',
  'current.degraded': '已降级',
  'current.modes': '浅色与深色',
  'current.idLabel': 'ID',
  'current.tagsLabel': '标签',
  'current.previewNotice': '当前只是预览，应用后才会保存。',

  // Search and tag filters.
  'search.label': '搜索皮肤',
  'search.placeholder': '按名称、ID 或标签搜索',
  'search.clear': '清空搜索',
  'filter.label': '按标签筛选',
  'filter.all': '全部',
  'filter.clear': '清除筛选',
  'filter.none': '暂无标签',

  // Gallery.
  'gallery.title': '可用皮肤',
  'gallery.aria': '皮肤画廊',
  'gallery.stockAria': '默认外观卡片',
  'gallery.count': '{count} 套皮肤',
  'gallery.countOne': '1 套皮肤',
  'gallery.stockCard': '默认外观',
  'gallery.stockDescription': '不使用皮肤，保持 DSH 自带外观。',

  // Search empty state.
  'empty.title': '没有匹配的皮肤',
  'empty.body': '换一个名称、ID 或标签试试。',
  'empty.action': '清除筛选',

  // One livery card.
  'card.previewAria': '预览「{name}」',
  'card.applyAria': '应用「{name}」',
  'card.current': '当前',
  'card.previewing': '预览中',
  'card.light': '浅色',
  'card.dark': '深色',
  'card.modesAria': '支持浅色与深色',
  'card.unavailable': '不可用',
  'card.unavailableHint': '缺少必需的宿主能力。',
  'card.thumbnailAlt': '「{name}」的{mode}模式预览',
  'card.thumbnailError': '预览图暂不可用',

  // Transient preview bar.
  'preview.title': '正在预览「{name}」',
  'preview.body': '应用之前不会保存任何更改。',
  'preview.apply': '应用此皮肤',
  'preview.cancel': '取消预览',

  // Actions.
  'action.restoreStock': '恢复默认外观',
  'action.restoreTitle': '恢复默认外观',
  'action.restoreBody': '将应用 DSH 自带外观，并移除当前皮肤。',
  'action.restoreConfirm': '恢复默认',
  'action.cancel': '取消',
  'action.close': '关闭',
  'action.retry': '重试',

  // Write feedback.
  'write.applying': '正在应用…',
  'write.refused': '宿主没有接受这套皮肤。',
  'write.transport': '无法连接宿主。',
  'write.rolledBack': '预览已回退到当前已应用的皮肤。',

  // Page states.
  'state.loading': '正在加载皮肤…',
  'state.offlineTitle': '皮肤目录暂不可用',
  'state.offlineBody': '首帧颜色仍会生效。画廊需要本地目录接口。',
  'state.incompatibleTitle': '宿主版本不兼容',
  'state.incompatibleBody': '宿主与本客户端约定的契约不一致。皮肤不会介入，保持默认外观。',
  'state.degradedTitle': '皮肤已降级',
  'state.degradedBody': '部分能力不可用，因此只应用能够安全生效的层；颜色仍会正常显示。',
  'state.configUnavailable': '宿主当前未提供皮肤设置。',
  'state.readOnly': '当前部署以只读方式保存设置，可以预览皮肤但无法保存。',
  'state.catalogEmpty': '尚未安装任何皮肤。',

  // Self-check panel.
  'check.title': '自检',
  'check.show': '展开自检',
  'check.hide': '收起自检',
  'check.capabilities': '宿主能力',
  'check.capabilitiesValue': '{total} 项中 {available} 项可用',
  'check.available': '可用',
  'check.unavailable': '不可用',
  'check.required': '必需',
  'check.optional': '可选',
  'check.contrast': '对比度',
  'check.contrastValue': '{total} 项中有 {failed} 项未达标',
  'check.contrastPass': '{total} 项全部达标',
  'check.coverage': 'token 覆盖',
  'check.coverageValue': '覆盖 {covered}，继承 {inherited}，缺失 {missing}',
  'check.cssSafety': 'CSS 安全',
  'check.pass': '通过',
  'check.fail': '未通过',
  'check.important': '!important 规则：{count}',
  'check.hashSelectors': '哈希类选择器：{count}',
  'check.elementSelectors': '元素选择器：{count}',
  'check.remoteUrls': '远程 URL：{count}',
  'check.unscopedTokens': '未作用域 token：{count}',
  'check.fixedZIndexes': '固定 z-index：{count}',
  'check.degraded': '降级能力',
  'check.none': '无',
  'check.diagnostics': '诊断信息',
  'check.copy': '复制诊断信息',
  'check.copied': '诊断信息已复制',
  'check.copyFailed': '复制诊断信息失败',
  'check.copyFailedHint': '请选中下方文本手动复制。',
  'check.boot': '首帧握手',
  'check.bootAccepted': '已接受',
  'check.bootAbsent': '无首帧数据',
  'check.bootRejected': '被拒绝',
  'check.adapter': '适配器',
  'check.contract': '契约哈希',
  'check.plugin': '插件版本',
  'check.host': '宿主版本',
  'check.mode': '颜色模式',
  'check.locale': '语言',
  'check.configured': '配置中的皮肤',
  'check.effective': '实际应用的皮肤',
  'check.catalog': '目录',
  'check.profile': '目录分组',
  'check.catalogLoaded': '已加载',
  'check.catalogUnavailable': '不可用',

  // About footer.
  'about.title': '关于',
  'about.plugin': 'DSH Livery {version}',
  'about.contract': '契约 {hash}',
  'about.adapter': '适配器 {adapter}',
  'about.note': '预览来自固定的契约场景，不是宿主实拍截图。',

  // Modes.
  'mode.light': '浅色',
  'mode.dark': '深色',

  // Tag labels.
  'tag.calm': '安静',
  'tag.cool': '冷调',
  'tag.warm': '暖调',
  'tag.muted': '低饱和',
  'tag.deep': '深邃',
  'tag.elegant': '雅致',
  'tag.neutral': '中性',
  'tag.contrast': '高对比',
  'tag.classic': '古典',
  'tag.playful': '活泼',

  // Capability display names (stable ids live in the generated contract).
  'capability.host-density-tokens': '密度',
  'capability.host-transcript-width': '会话宽度',
  'capability.host-message-flow': '消息流',
  'capability.theme-css': '主题样式',
  'capability.host-font-family': '字体族',
  'capability.host-font-role-hooks': '字体角色钩子',
  'capability.surface-material': '表面材质',

  // Optional-capability degradation note shown inside the self-check panel.
  'check.optionalInfo': '可选布局能力在当前宿主不可用：{items}；已回退到宿主布局。',

  // Keyboard hint.
  'hint.keyboard': '使用方向键在皮肤之间移动，按回车预览。',

  // Diagnostics report.
  'diag.header': 'DSH Livery（dsh-livery）诊断信息',
  'diag.environment': '环境',
  'diag.boot': '首帧握手',
  'diag.catalog': '目录',
  'diag.configuration': '配置',
  'diag.capabilities': '能力',
  'diag.degraded': '降级能力',
  'diag.contrast': '对比度',
  'diag.coverage': 'token 覆盖',
  'diag.cssSafety': 'CSS 安全',
  'diag.diagnostics': '启动诊断',
  'diag.none': '（无）',
  'diag.line': '{label}：{value}',
  'diag.capabilityLine': '{id}：{state}{required}',
  'diag.degradedLine': '{id}：{reason}（回退：{fallback}）',
  'diag.ratio': '{value}:1',
  'diag.count': '{count}',
}
