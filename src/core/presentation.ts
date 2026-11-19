/**
 * DSH Livery 0.2.0 presentation model.
 *
 * Pure data: recipe ids and bounded parameters only. No CSS, selectors, HTML,
 * SVG or host DOM is representable here.
 */

import type { CapabilityId, CapabilityMap, ChromeStyleId, LiveryManifest, SurfaceStyleId } from './types.js'
import { CAP } from './types.js'
import { SURFACE_STYLE_DEFINITIONS } from './registry.js'

export type AxisStatus = 'Full' | 'Inherited' | 'Degraded' | 'Unavailable'

export type PresentationAxis =
  | 'palette'
  | 'typography'
  | 'geometry'
  | 'border'
  | 'elevation'
  | 'material'
  | 'chrome'
  | 'density'
  | 'transcriptWidth'
  | 'texture'
  | 'studioDecoration'
  | 'navigationStructure'
  | 'messageFlow'
  | 'messageUser'
  | 'messageAssistant'
  | 'ornament'
  | 'motion'

export const PRESENTATION_AXES: readonly PresentationAxis[] = [
  'palette', 'typography', 'geometry', 'border', 'elevation', 'material', 'chrome',
  'density', 'transcriptWidth', 'texture', 'studioDecoration', 'navigationStructure',
  'messageFlow', 'messageUser', 'messageAssistant', 'ornament', 'motion',
]

export interface RecipeInstance {
  readonly id: string
  readonly parameters: Readonly<Record<string, string | number>>
}

export type RecipeRef = RecipeInstance | string

export type StudioDecorationId = 'none' | 'studio-grid' | 'studio-frame' | 'studio-dots' | 'studio-rules'

export interface PresentationSpec {
  readonly geometry: string
  readonly border: string
  readonly elevation: string
  readonly material: string
  readonly chrome: ChromeStyleId
  readonly density: 'host' | 'compact' | 'comfortable'
  readonly transcriptWidth: 'host' | 'focused' | 'wide'
  readonly texture: string
  readonly studioDecoration: {
    readonly recipe: StudioDecorationId
    readonly parameters: Readonly<Record<string, string | number>>
  }
  readonly navigation: { readonly structure: 'host' }
  readonly messages: {
    readonly flow: 'stock' | 'separated'
    readonly user: 'stock'
    readonly assistant: 'stock'
  }
  readonly ornament: string
  readonly motion: 'static'
}

export interface AxisPresentation {
  readonly declared: RecipeRef
  readonly effective: RecipeRef
  readonly status: AxisStatus
  readonly missingCapabilities: readonly CapabilityId[]
  readonly fallbackReason?: string
}

export interface ResponsivePolicy {
  readonly breakpoints: readonly [999, 799, 599]
  readonly studioDecoration: {
    readonly full: string
    readonly reduced: string
    readonly minimal: string
    readonly none: string
  }
}

export interface EffectivePresentation {
  readonly axes: Readonly<Record<PresentationAxis, AxisPresentation>>
  readonly overall: AxisStatus
  readonly responsivePolicy: ResponsivePolicy
}

export interface MediaState {
  readonly forcedColors: boolean
  readonly reducedTransparency: boolean
  readonly reducedMotion: boolean
}

export interface RuntimeAxisPresentation extends AxisPresentation {
  readonly reason?: 'container-too-narrow' | 'forced-colors' | 'reduced-transparency' | 'reduced-motion'
}

export interface RenderedPresentation {
  readonly axes: Readonly<Record<PresentationAxis, RuntimeAxisPresentation>>
  readonly overall: AxisStatus
  readonly containerWidth: number
  readonly media: MediaState
}

export const RESPONSIVE_POLICY: ResponsivePolicy = Object.freeze({
  breakpoints: [999, 799, 599] as const,
  studioDecoration: {
    full: 'width > 999',
    reduced: '799 < width <= 999',
    minimal: '599 < width <= 799',
    none: 'width <= 599',
  },
})

/** Frozen v1 surfaceStyle -> four v2 axes. */
export const SURFACE_AXES: Readonly<Record<SurfaceStyleId, {
  geometry: string
  border: string
  elevation: string
  material: string
}>> = {
  solid: { geometry: 'stock', border: 'hairline', elevation: 'stock', material: 'solid' },
  soft: { geometry: 'soft', border: 'hairline', elevation: 'soft', material: 'solid' },
  glass: { geometry: 'soft', border: 'hairline', elevation: 'soft', material: 'glass' },
  flat: { geometry: 'square', border: 'hairline', elevation: 'flat', material: 'solid' },
  sharp: { geometry: 'sharp', border: 'strong', elevation: 'hard-1px', material: 'solid' },
  rounded: { geometry: 'rounded', border: 'hairline', elevation: 'soft', material: 'solid' },
  paper: { geometry: 'paper', border: 'warm-hairline', elevation: 'flat', material: 'solid' },
  elevated: { geometry: 'rounded', border: 'hairline', elevation: 'elevated', material: 'solid' },
  terminal: { geometry: 'square', border: 'terminal', elevation: 'flat', material: 'solid' },
  brutal: { geometry: 'square', border: 'brutal', elevation: 'hard-offset', material: 'solid' },
  pill: { geometry: 'pill', border: 'hairline', elevation: 'soft', material: 'solid' },
  editorial: { geometry: 'editorial', border: 'strong', elevation: 'flat', material: 'solid' },
}

export const STUDIO_DECORATION_IDS: readonly StudioDecorationId[] = ['none', 'studio-grid', 'studio-frame', 'studio-dots', 'studio-rules']

export function isStudioDecorationId(value: unknown): value is StudioDecorationId {
  return typeof value === 'string' && (STUDIO_DECORATION_IDS as readonly string[]).includes(value)
}

export function presentationFromLayout(layout: LiveryManifest['layout']): PresentationSpec {
  const axes = SURFACE_AXES[layout.surfaceStyle]
  return {
    geometry: axes.geometry,
    border: axes.border,
    elevation: axes.elevation,
    material: axes.material,
    chrome: layout.chrome ?? 'plain',
    density: layout.density,
    transcriptWidth: layout.conversationWidth,
    texture: 'none',
    studioDecoration: { recipe: 'none', parameters: {} },
    navigation: { structure: 'host' },
    messages: { flow: layout.messageFlow, user: 'stock', assistant: 'stock' },
    ornament: 'none',
    motion: 'static',
  }
}

function capabilityAvailability(map: CapabilityMap, id: CapabilityId): boolean {
  return map[id]?.available === true
}

function axis(
  declared: RecipeRef,
  effective: RecipeRef,
  status: AxisStatus,
  missing: readonly CapabilityId[] = [],
  fallbackReason?: string,
): AxisPresentation {
  return fallbackReason === undefined
    ? { declared, effective, status, missingCapabilities: missing }
    : { declared, effective, status, missingCapabilities: missing, fallbackReason }
}

/**
 * Derive static axes from the exact host capability map. This is deliberately
 * conservative: only capabilities that are actually present are granted.
 */
export function derivePresentation(
  spec: PresentationSpec,
  capabilities: CapabilityMap,
): EffectivePresentation {
  const has = (id: CapabilityId): boolean => capabilityAvailability(capabilities, id)
  const axes = {} as Record<PresentationAxis, AxisPresentation>

  const baseTheme = has(CAP.themeCss)
  axes.palette = axis('palette', baseTheme ? 'palette' : 'stock', baseTheme ? 'Full' : 'Unavailable', baseTheme ? [] : [CAP.themeCss])
  const hasFont = has(CAP.hostFontFamily)
  axes.typography = axis('typography', hasFont ? 'typography' : 'host', hasFont ? 'Full' : 'Degraded', hasFont ? [] : [CAP.hostFontFamily], hasFont ? undefined : 'host-font')
  axes.geometry = axis(spec.geometry, spec.geometry, 'Full')
  axes.border = axis(spec.border, spec.border, 'Full')
  axes.elevation = axis(spec.elevation, spec.elevation, 'Full')
  const hasMaterial = has(CAP.surfaceMaterial) || spec.material === 'solid'
  axes.material = spec.material === 'solid'
    ? axis('solid', 'solid', 'Full')
    : hasMaterial
      ? axis(spec.material, spec.material, 'Full')
      : axis(spec.material, 'solid', 'Degraded', [CAP.surfaceMaterial], 'solid')
  axes.chrome = spec.chrome === 'plain' ? axis('plain', 'plain', 'Inherited') : axis(spec.chrome, spec.chrome, 'Full')
  axes.density = spec.density === 'host'
    ? axis('host', 'host', 'Inherited')
    : has(CAP.hostDensity)
      ? axis(spec.density, spec.density, 'Full')
      : axis(spec.density, 'host', 'Degraded', [CAP.hostDensity], 'host')
  axes.transcriptWidth = spec.transcriptWidth === 'host'
    ? axis('host', 'host', 'Inherited')
    : has(CAP.hostTranscriptWidth)
      ? axis(spec.transcriptWidth, spec.transcriptWidth, 'Full')
      : axis(spec.transcriptWidth, 'host', 'Degraded', [CAP.hostTranscriptWidth], 'host')
  axes.texture = spec.texture === 'none' ? axis('none', 'none', 'Inherited') : axis(spec.texture, 'none', 'Inherited')
  axes.studioDecoration = spec.studioDecoration.recipe === 'none'
    ? axis('none', 'none', 'Inherited')
    : axis({ id: spec.studioDecoration.recipe, parameters: spec.studioDecoration.parameters }, { id: spec.studioDecoration.recipe, parameters: spec.studioDecoration.parameters }, 'Full')
  axes.navigationStructure = axis('host', 'host', 'Inherited')
  axes.messageFlow = spec.messages.flow === 'stock'
    ? axis('stock', 'stock', 'Inherited')
    : has(CAP.hostMessageFlow)
      ? axis(spec.messages.flow, spec.messages.flow, 'Full')
      : axis(spec.messages.flow, 'stock', 'Degraded', [CAP.hostMessageFlow], 'stock')
  axes.messageUser = axis('stock', 'stock', 'Inherited')
  axes.messageAssistant = axis('stock', 'stock', 'Inherited')
  axes.ornament = spec.ornament === 'none' ? axis('none', 'none', 'Inherited') : axis(spec.ornament, 'none', 'Inherited')
  axes.motion = spec.motion === 'static' ? axis('static', 'static', 'Inherited') : axis(spec.motion, 'static', 'Inherited')

  return {
    axes,
    overall: aggregateStatic(axes),
    responsivePolicy: RESPONSIVE_POLICY,
  }
}

const STATUS_PRIORITY: Readonly<Record<AxisStatus, number>> = {
  Unavailable: 3,
  Degraded: 2,
  Full: 1,
  Inherited: 0,
}

export function aggregateStatic(axes: Readonly<Record<PresentationAxis, AxisPresentation>>): AxisStatus {
  return aggregateStatuses(PRESENTATION_AXES.map((name) => axes[name].status))
}

export function aggregateRuntime(axes: Readonly<Record<PresentationAxis, RuntimeAxisPresentation>>): AxisStatus {
  return aggregateStatuses(PRESENTATION_AXES.map((name) => axes[name].status))
}

function aggregateStatuses(statuses: readonly AxisStatus[]): AxisStatus {
  let result: AxisStatus = 'Inherited'
  for (const status of statuses) {
    if (STATUS_PRIORITY[status] > STATUS_PRIORITY[result]) result = status
  }
  return result
}

export function resolveRuntimeAxis(
  staticAxis: AxisPresentation,
  containerWidth: number,
  media: MediaState,
): RuntimeAxisPresentation {
  if (staticAxis.status === 'Unavailable') return staticAxis
  if (staticAxis.declared !== 'host' && staticAxis.declared !== 'stock' && staticAxis.declared !== 'none') {
    const instance = staticAxis.declared as RecipeInstance
    if (instance.id.startsWith('studio-')) {
      const tier = media.forcedColors ? 'none' : containerWidth > 999 ? 'full' : containerWidth > 799 ? 'reduced' : containerWidth > 599 ? 'minimal' : 'none'
      const effective: RecipeRef = tier === 'none' ? 'none' : { id: instance.id, parameters: { ...instance.parameters, tier } }
      const result: RuntimeAxisPresentation = {
        ...staticAxis,
        effective,
        status: tier === 'full' ? 'Full' : 'Degraded',
      }
      return tier === 'full' ? result : { ...result, reason: tier === 'none' && media.forcedColors ? 'forced-colors' : 'container-too-narrow' }
    }
  }
  if (media.forcedColors && (staticAxis.declared === 'none' || String(staticAxis.declared) === 'none')) return staticAxis
  return staticAxis
}

export function resolveRuntime(
  presentation: EffectivePresentation,
  containerWidth: number,
  media: MediaState,
): RenderedPresentation {
  const axes = {} as Record<PresentationAxis, RuntimeAxisPresentation>
  for (const name of PRESENTATION_AXES) axes[name] = resolveRuntimeAxis(presentation.axes[name], containerWidth, media)
  return { axes, overall: aggregateRuntime(axes), containerWidth, media }
}

/** Canonical JSON with recursively sorted object keys. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`
}

/** Raw v2 manifest shape (validated by schemas/livery.schema.json before use). */
export interface LiveryManifestV2Input {
  readonly schemaVersion: 2
  readonly id: string
  readonly meta: LiveryManifest['meta']
  readonly variants: LiveryManifest['variants']
  readonly typography: LiveryManifest['typography']
  readonly presentation: PresentationSpec
}

function surfaceStyleForAxes(axes: { geometry: string; border: string; elevation: string; material: string }): SurfaceStyleId | undefined {
  for (const [id, candidate] of Object.entries(SURFACE_AXES) as [SurfaceStyleId, typeof axes][]) {
    if (candidate.geometry === axes.geometry && candidate.border === axes.border
      && candidate.elevation === axes.elevation && candidate.material === axes.material) return id
  }
  return undefined
}

function surfaceTokenFamily(name: string): 'geometry' | 'border' | 'elevation' | 'material' | undefined {
  if (name.startsWith('--dsw-radius-') || name === '--dsw-corner-shape') return 'geometry'
  if (name.startsWith('--dsw-alias-border-')) return 'border'
  if (name.startsWith('--dsw-elevation-') || name.startsWith('--dsw-shadow-')) return 'elevation'
  if (name === '--dsw-menu-backdrop-filter' || name === '--dsw-mask-blur') return 'material'
  return undefined
}

/** Compose independent geometry/border/elevation/material token families from matching styles. */
export function compositeSurfaceTokens(spec: PresentationSpec): { light: Record<string, string>; dark: Record<string, string> } {
  const exact = surfaceStyleForAxes(spec)
  if (exact !== undefined) {
    const definition = SURFACE_STYLE_DEFINITIONS[exact]
    return { light: { ...definition.light }, dark: { ...definition.dark } }
  }
  const axes = { geometry: spec.geometry, border: spec.border, elevation: spec.elevation, material: spec.material }
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}
  for (const axis of ['geometry', 'border', 'elevation', 'material'] as const) {
    const style = Object.values(SURFACE_STYLE_DEFINITIONS).find((candidate) => SURFACE_AXES[candidate.id][axis] === axes[axis])
    if (style === undefined) continue
    for (const [name, value] of Object.entries(style.light)) if (surfaceTokenFamily(name) === axis) light[name] = value
    for (const [name, value] of Object.entries(style.dark)) if (surfaceTokenFamily(name) === axis) dark[name] = value
  }
  return { light, dark }
}

function derivedCompat(spec: PresentationSpec): LiveryManifest['compat'] {
  const required: CapabilityId[] = [CAP.themeCss]
  const optional: CapabilityId[] = [
    CAP.hostFontFamily, CAP.hostFontRoleHooks, CAP.reducedTransparency, CAP.forcedColors, CAP.reducedMotion,
  ]
  if (spec.material !== 'solid') optional.push(CAP.surfaceMaterial)
  if (spec.density !== 'host') optional.push(CAP.hostDensity)
  if (spec.transcriptWidth !== 'host') optional.push(CAP.hostTranscriptWidth)
  if (spec.messages.flow !== 'stock') optional.push(CAP.hostMessageFlow)
  return { requiredCapabilities: required, optionalCapabilities: optional }
}

/**
 * Normalize a validated v1 or v2 manifest into the single internal model used
 * by the compiler. Raw v2 manifests have no layout/compat; those are derived
 * here, not by style-id special cases.
 */
export function normalizeManifest(raw: unknown): LiveryManifest {
  const record = raw as Record<string, unknown>
  if (record.schemaVersion === 2) {
    const v2 = record as unknown as LiveryManifestV2Input
    const spec = v2.presentation
    const layout: LiveryManifest['layout'] = {
      density: spec.density,
      conversationWidth: spec.transcriptWidth,
      messageFlow: spec.messages.flow,
      surfaceStyle: surfaceStyleForAxes(spec) ?? 'solid',
      surfaceTokens: compositeSurfaceTokens(spec),
      chrome: spec.chrome,
    }
    return {
      schemaVersion: 2,
      id: v2.id,
      meta: v2.meta,
      variants: v2.variants,
      typography: v2.typography,
      layout,
      compat: derivedCompat(spec),
      presentation: spec,
    }
  }
  const v1 = record as unknown as LiveryManifest
  const presentation = v1.presentation ?? presentationFromLayout(v1.layout)
  return { ...v1, presentation, compat: derivedCompat(presentation) }
}
