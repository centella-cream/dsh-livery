/**
 * UI copy the acceptance harness uses for accessible-name queries.
 *
 * These strings are the frozen settings-page copy of dsh-livery 0.1.0 for the
 * zh and en locales (from the client contract). The DOM selectors prefer the
 * stable `data-testid` hooks; these labels are the human-facing fallback and
 * the assertion vocabulary for the copy itself.
 */

export const LABELS = {
  zh: {
    section: '视觉风格',
    searchPlaceholder: '按名称、ID 或标签搜索',
    searchName: '搜索视觉风格',
    gallery: '视觉风格画廊',
    apply: '应用此视觉风格',
    cancel: '取消预览',
    restoreStock: '恢复默认外观',
    restoreConfirm: '恢复默认',
    copyDiagnostics: '复制诊断信息',
    diagnosticsCopied: '诊断信息已复制',
    selfCheck: '自检',
    loading: '正在加载视觉风格…',
    catalogUnavailable: '视觉风格目录暂不可用',
    incompatible: '宿主版本不兼容',
    writeRefused: '宿主没有接受这套视觉风格。',
    current: '当前',
    previewing: '预览中',
    light: '浅色',
    dark: '深色',
    stockName: '默认外观',
    empty: '没有匹配的视觉风格',
  },
  en: {
    section: 'Visual Style',
    searchPlaceholder: 'Search by name, ID, or tag',
    searchName: 'Search visual styles',
    gallery: 'Visual style gallery',
    apply: 'Apply visual style',
    cancel: 'Cancel preview',
    restoreStock: 'Restore stock appearance',
    restoreConfirm: 'Restore stock',
    copyDiagnostics: 'Copy diagnostics',
    diagnosticsCopied: 'Diagnostics copied',
    selfCheck: 'Self-check',
    loading: 'Loading visual styles…',
    catalogUnavailable: 'Visual style catalog unavailable',
    incompatible: 'Incompatible host build',
    writeRefused: 'The host did not accept this visual style.',
    current: 'Current',
    previewing: 'Previewing',
    light: 'Light',
    dark: 'Dark',
    stockName: 'Stock appearance',
    empty: 'No visual styles match',
  },
}

/** Tag id → localized label, used by the search-by-tag check. */
export const TAG_LABELS = {
  zh: {
    calm: '安静',
    cool: '冷调',
    warm: '暖调',
    muted: '低饱和',
    deep: '深邃',
    elegant: '雅致',
    neutral: '中性',
    contrast: '高对比',
    classic: '古典',
    playful: '活泼',
    retro: '复古',
    paper: '纸感',
    ink: '墨感',
    neon: '霓虹',
    organic: '自然',
    tech: '科技',
  },
  en: {
    calm: 'Calm',
    cool: 'Cool',
    warm: 'Warm',
    muted: 'Muted',
    deep: 'Deep',
    elegant: 'Elegant',
    neutral: 'Neutral',
    contrast: 'High contrast',
    classic: 'Classic',
    playful: 'Playful',
    retro: 'Retro',
    paper: 'Paper',
    ink: 'Ink',
    neon: 'Neon',
    organic: 'Organic',
    tech: 'Tech',
  },
}

export function labelsFor(locale) {
  return locale === 'en' ? LABELS.en : LABELS.zh
}

export function tagLabelsFor(locale) {
  return locale === 'en' ? TAG_LABELS.en : TAG_LABELS.zh
}

/** Merge a `--labels <json>` override file on top of the defaults. */
export function mergeLabels(locale, override) {
  if (!override) return labelsFor(locale)
  const base = labelsFor(locale)
  return { ...base, ...(override[locale] ?? override) }
}

/**
 * Baseline capability availability shared by every certified host build.
 * `host-font-role-hooks` is version-dependent and comes from the certified
 * adapter matrix in `certified-adapters.mjs`; checks merge the two.
 */
export const BASE_CAPABILITIES = {
  'theme-css': true,
  'host-font-family': true,
  'surface-material': true,
  'host-density-tokens': false,
  'host-transcript-width': false,
  'host-message-flow': false,
}
