/**
 * DSH Livery — typography registry, tags and surface styles.
 *
 * Raw font stacks never appear in a manifest: manifests reference these stable
 * ids. The stacks are the frozen first-release registry from
 * IMPLEMENTATION_PLAN.md §9.2. Fonts are never loaded from the network.
 */

import type {
  FontId,
  FontStackDefinition,
  LiveryManifest,
  LocaleId,
  MetricsDefinition,
  MetricsId,
  ResolvedTypography,
  SurfaceStyleId,
  TagDefinition,
  TagId,
} from './types.js'

/** Frozen font registry (`IMPLEMENTATION_PLAN.md` §9.2). */
export const FONT_STACKS: Readonly<Record<FontId, FontStackDefinition>> = {
  'system-cjk': {
    id: 'system-cjk',
    stack: '"PingFang SC", "Microsoft YaHei UI", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif',
    note: 'System CJK UI stack; no network font is loaded.',
  },
  'system-latin': {
    id: 'system-latin',
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    note: 'System Latin UI stack; no network font is loaded.',
  },
  'system-mono': {
    id: 'system-mono',
    stack: '"SFMono-Regular", Consolas, "Liberation Mono", "Noto Sans Mono CJK SC", monospace',
    note: 'System monospace stack with CJK fallback; no network font is loaded.',
  },
}

/**
 * Typography metric profiles. Line-heights are design metadata: they are only
 * applied where a public host token exists (§9.3), so the first release ships
 * the targets as resolved metadata for previews/audits instead of rewriting
 * host shorthands.
 */
export const METRICS: Readonly<Record<MetricsId, MetricsDefinition>> = {
  'cjk-comfortable': {
    id: 'cjk-comfortable',
    lineHeight: 1.55,
    note: 'Comfortable CJK body leading target (IMPLEMENTATION_PLAN.md §11.1).',
  },
  'latin-default': {
    id: 'latin-default',
    lineHeight: 1.45,
    note: 'Default Latin body leading target (IMPLEMENTATION_PLAN.md §11.2).',
  },
  compact: {
    id: 'compact',
    lineHeight: 1.35,
    note: 'Dense reading profile for information-heavy surfaces.',
  },
  airy: {
    id: 'airy',
    lineHeight: 1.75,
    note: 'Generous leading profile for long-form reading.',
  },
}

/** Stable tag ids; display names live here, never in a manifest. */
export const TAGS: readonly TagDefinition[] = [
  { id: 'calm', label: { 'zh-CN': '宁静', 'en-US': 'Calm' } },
  { id: 'cool', label: { 'zh-CN': '冷调', 'en-US': 'Cool' } },
  { id: 'warm', label: { 'zh-CN': '暖调', 'en-US': 'Warm' } },
  { id: 'neutral', label: { 'zh-CN': '中性', 'en-US': 'Neutral' } },
  { id: 'deep', label: { 'zh-CN': '深邃', 'en-US': 'Deep' } },
  { id: 'elegant', label: { 'zh-CN': '雅致', 'en-US': 'Elegant' } },
  { id: 'playful', label: { 'zh-CN': '俏皮', 'en-US': 'Playful' } },
  { id: 'contrast', label: { 'zh-CN': '高对比', 'en-US': 'High contrast' } },
  { id: 'muted', label: { 'zh-CN': '低饱和', 'en-US': 'Muted' } },
  { id: 'classic', label: { 'zh-CN': '经典', 'en-US': 'Classic' } },
] as const

/** All registered tag ids, frozen. */
export const TAG_IDS: readonly TagId[] = TAGS.map((tag) => tag.id)

/** Registered surface material recipes. */
export const SURFACE_STYLES: readonly SurfaceStyleId[] = ['solid', 'soft', 'glass'] as const

/** Locales every livery must resolve typography for. */
export const TYPOGRAPHY_LOCALES: readonly LocaleId[] = ['zh-CN', 'en-US'] as const

/** Look up a font stack by registry id. Throws for any unregistered id. */
export function fontStackOf(id: FontId): string {
  const definition = FONT_STACKS[id]
  if (definition === undefined) {
    throw new RangeError(`Unknown font registry id: ${JSON.stringify(id)}`)
  }
  return definition.stack
}

/** Look up a metrics profile by id. Throws for any unregistered id. */
export function metricsOf(id: MetricsId): MetricsDefinition {
  const definition = METRICS[id]
  if (definition === undefined) {
    throw new RangeError(`Unknown metrics profile id: ${JSON.stringify(id)}`)
  }
  return definition
}

function resolveStack(id: FontId, role: string, locale: LocaleId): string {
  try {
    return fontStackOf(id)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new RangeError(`Invalid ${role} font for ${locale}: ${reason}`)
  }
}

function resolveMetrics(id: MetricsId, locale: LocaleId): MetricsDefinition {
  try {
    return metricsOf(id)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new RangeError(`Invalid metrics profile for ${locale}: ${reason}`)
  }
}

/**
 * Resolve a manifest's locale-specific font ids and metric ids into concrete
 * stacks / definitions. Throws for any id outside the registry.
 */
export function resolveTypography(manifest: LiveryManifest): ResolvedTypography {
  const { typography } = manifest
  const ui: Record<LocaleId, string> = {
    'zh-CN': resolveStack(typography.ui['zh-CN'], 'ui', 'zh-CN'),
    'en-US': resolveStack(typography.ui['en-US'], 'ui', 'en-US'),
  }
  const content: Record<LocaleId, string> = {
    'zh-CN': resolveStack(typography.content['zh-CN'], 'content', 'zh-CN'),
    'en-US': resolveStack(typography.content['en-US'], 'content', 'en-US'),
  }
  const metrics: Record<LocaleId, MetricsDefinition> = {
    'zh-CN': resolveMetrics(typography.metrics['zh-CN'], 'zh-CN'),
    'en-US': resolveMetrics(typography.metrics['en-US'], 'en-US'),
  }
  return {
    ui,
    content,
    code: resolveStack(typography.code, 'code', 'zh-CN'),
    metrics,
  }
}
