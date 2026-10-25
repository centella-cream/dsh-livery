/**
 * DSH Livery — layout recipe rendering.
 *
 * Hard host fact (src/generated/contract.ts `HOST_CAPABILITIES`): DSH
 * 0.2.0-rc.2 exposes no documented public hook for density, transcript width or
 * message flow. Those recipes therefore degrade to `host` / `stock` and emit NO
 * selectors — fixed code can never invent component selectors for them.
 *
 * `surfaceStyle` is implemented token-only: the derived token values (see
 * derive.ts) carry the material, while this module emits the token-level media
 * fallbacks that must stay unlayered to win the cascade:
 * - `prefers-reduced-transparency: reduce` → force the translucent material
 *   tokens back to their opaque value (only when the livery authored glass);
 * - `forced-colors: active` → point author surface/text tokens at system
 *   colours so the UA can take over.
 *
 * The `layout` CSS fragment itself only establishes the documented
 * `@layer dsh-livery.compat` name; on this host no component-compensation rule
 * is safe, so the layer contains no rules.
 */

import type { CapabilityMap, CompiledVariant, LiveryManifest, Mode } from './types.js'
import { CAP, COMPAT_LAYER } from './types.js'
import { surfaceStyleOf } from './registry.js'

/** Minimal livery shape needed to render layout/material CSS. */
export interface LayoutLivery {
  readonly id: string
  readonly layout: LiveryManifest['layout']
  readonly light: CompiledVariant
  readonly dark: CompiledVariant
}

/** Deterministic layout fragment: the documented compat layer order statement. */
export const LAYOUT_LAYER_STATEMENT = `@layer ${COMPAT_LAYER};`

/** System-colour token mapping applied under forced colors. */
export const FORCED_COLORS_TOKEN_MAP: readonly (readonly [token: string, systemColor: string])[] = [
  ['--dsw-alias-bg-base', 'Canvas'],
  ['--dsw-specific-sidebar-fill', 'Canvas'],
  ['--dsw-specific-bubble', 'Canvas'],
  ['--dsw-specific-input-major', 'Canvas'],
  ['--dsw-alias-label-primary', 'CanvasText'],
  ['--dsw-alias-label-secondary', 'CanvasText'],
  ['--dsw-alias-label-tertiary', 'CanvasText'],
  ['--dsw-alias-label-caption', 'CanvasText'],
  ['--dsw-alias-label-dimmed', 'GrayText'],
  ['--dsw-alias-label-primary-foreground', 'ButtonText'],
  ['--dsw-alias-brand-primary', 'ButtonFace'],
  ['--dsw-alias-link', 'LinkText'],
  ['--dsw-alias-state-business-primary', 'Highlight'],
] as const

/** Options shared with the CSS renderer. */
export interface RenderOptions {
  readonly pretty?: boolean
}

/** Escape a value placed inside a double-quoted CSS attribute selector. */
export function cssAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n\u0000]/g, '')
}

/** `body[data-dsh-livery="<id>"]` — the only scope Livery owns. */
export function bodyScope(id: string): string {
  return `body[data-dsh-livery="${cssAttributeValue(id)}"]`
}

/** `body[data-dsh-livery="<id>"][data-ds-dark-theme]` — the host dark switch. */
export function bodyDarkScope(id: string): string {
  return `${bodyScope(id)}[data-ds-dark-theme]`
}

function formatDeclarations(
  declarations: readonly (readonly [token: string, value: string])[],
  pretty: boolean,
): string {
  if (declarations.length === 0) return ''
  if (!pretty) return declarations.map(([token, value]) => `${token}:${value}`).join(';')
  return declarations.map(([token, value]) => `  ${token}: ${value};`).join('\n')
}

function formatRule(selector: string, declarations: readonly (readonly [token: string, value: string])[], pretty: boolean): string {
  const body = formatDeclarations(declarations, pretty)
  if (body.length === 0) return ''
  return pretty ? `${selector}{\n${body}\n}` : `${selector}{${body}}`
}

function formatMedia(condition: string, rules: readonly string[], pretty: boolean): string {
  const body = rules.filter((rule) => rule.length > 0).join(pretty ? '\n' : '')
  if (body.length === 0) return ''
  return pretty ? `@media (${condition}){\n${body}\n}` : `@media (${condition}){${body}}`
}

function capabilityAvailable(capabilities: CapabilityMap, id: string): boolean {
  return capabilities[id]?.available !== false
}

/**
 * Material filter tokens a surface style may author. Under
 * `prefers-reduced-transparency: reduce` every authored blur/saturation filter is
 * forced back to `none` so the reduced-transparency preference is honoured.
 */
export const MATERIAL_FILTER_TOKENS: readonly string[] = [
  '--dsw-menu-backdrop-filter',
  '--dsw-mask-blur',
] as const

const FILTER_FUNCTION_PATTERN = /(?:blur|saturate|brightness|contrast|grayscale|sepia|drop-shadow)\(/i

/**
 * Material filter tokens the active surface-style recipe actually authors with a
 * filter function. Under reduced transparency both the authored values and the
 * host stock blur are forced back to `none`.
 */
function authoredMaterialFilters(livery: LayoutLivery): readonly string[] {
  const definition = surfaceStyleOf(livery.layout.surfaceStyle)
  const filters: string[] = []
  for (const name of MATERIAL_FILTER_TOKENS) {
    const light = definition.light[name]
    const dark = definition.dark[name]
    const authored =
      (light !== undefined && FILTER_FUNCTION_PATTERN.test(light)) ||
      (dark !== undefined && FILTER_FUNCTION_PATTERN.test(dark))
    if (authored) filters.push(name)
  }
  return filters
}

/**
 * Unlayered token-level media fallbacks, appended by the token renderer after
 * the two required token blocks.
 */
export function renderMaterialCss(livery: LayoutLivery, capabilities: CapabilityMap, options: RenderOptions = {}): string {
  const pretty = options.pretty ?? false
  const blocks: string[] = []

  const materialSupported = capabilityAvailable(capabilities, CAP.surfaceMaterial)
  const reducedTransparencySupported = capabilityAvailable(capabilities, CAP.reducedTransparency)
  if (materialSupported && reducedTransparencySupported) {
    const filters = authoredMaterialFilters(livery)
    if (filters.length > 0) {
      const overrides: [string, string][] = filters.map((token) => [token, 'none'])
      const rules = [
        formatRule(bodyScope(livery.id), overrides, pretty),
        formatRule(bodyDarkScope(livery.id), overrides, pretty),
      ]
      blocks.push(formatMedia('prefers-reduced-transparency: reduce', rules, pretty))
    }
  }

  if (capabilityAvailable(capabilities, CAP.forcedColors)) {
    const declarations: [string, string][] = FORCED_COLORS_TOKEN_MAP.map(([token, systemColor]) => [token, systemColor])
    const rules = [
      formatRule(bodyScope(livery.id), declarations, pretty),
      formatRule(bodyDarkScope(livery.id), declarations, pretty),
    ]
    blocks.push(formatMedia('forced-colors: active', rules, pretty))
  }

  return blocks.filter((block) => block.length > 0).join(pretty ? '\n' : '')
}

/**
 * The `layout` CSS fragment. Component-compensation rules must live inside
 * `@layer dsh-livery.compat`; no documented host hook makes one safe for the
 * certified DSH build, so the layer is established empty. Recipes requested but
 * unavailable produce no selectors (they are reported by
 * `evaluateCapabilities`).
 */
export function renderLayoutCss(
  livery: LayoutLivery,
  capabilities: CapabilityMap,
  options: RenderOptions = {},
): string {
  void livery
  void capabilities
  const pretty = options.pretty ?? false
  return pretty ? `${LAYOUT_LAYER_STATEMENT}\n` : LAYOUT_LAYER_STATEMENT
}

/** Deterministic description of the recipe fallbacks for diagnostics/self-check. */
export function layoutDegradations(
  layout: LiveryManifest['layout'],
  capabilities: CapabilityMap,
): readonly string[] {
  const notes: string[] = []
  if (layout.density !== 'host' && !capabilityAvailable(capabilities, CAP.hostDensity)) {
    notes.push(`density=${layout.density} unavailable → host`)
  }
  if (layout.conversationWidth !== 'host' && !capabilityAvailable(capabilities, CAP.hostTranscriptWidth)) {
    notes.push(`conversationWidth=${layout.conversationWidth} unavailable → host`)
  }
  if (layout.messageFlow !== 'stock' && !capabilityAvailable(capabilities, CAP.hostMessageFlow)) {
    notes.push(`messageFlow=${layout.messageFlow} unavailable → stock`)
  }
  if (layout.surfaceStyle !== 'solid' && !capabilityAvailable(capabilities, CAP.surfaceMaterial)) {
    notes.push(`surfaceStyle=${layout.surfaceStyle} unavailable → solid`)
  }
  return notes
}

/** Mode used only for typing discipline when callers pass a variant. */
export type LayoutMode = Mode
