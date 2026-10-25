import { describe, expect, it } from 'vitest'
import {
  FORCED_COLORS_TOKEN_MAP,
  LAYOUT_LAYER_STATEMENT,
  layoutDegradations,
  renderLayoutCss,
  renderMaterialCss,
} from '../../src/core/layout.js'
import { CAP, COMPAT_LAYER } from '../../src/core/types.js'
import type { CapabilityMap } from '../../src/core/types.js'
import { FIXTURE_MANIFESTS } from './fixtures.js'
import { ADAPTER_020, ADAPTER_021_RC2, buildFixture } from './helpers.js'

const GLASS = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-slate-glass')!
const SOLID = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-fjord')!
const SOFT = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-sand')!

function capsWith(overrides: Readonly<Record<string, boolean>>, base: CapabilityMap = ADAPTER_020.capabilities): CapabilityMap {
  const result: Record<string, (typeof base)[string]> = {}
  for (const [id, fact] of Object.entries(base)) {
    const override = overrides[id]
    result[id] = override === undefined ? fact : { ...fact, available: override }
  }
  return result
}

function layoutParts(manifest: (typeof FIXTURE_MANIFESTS)[number], capabilities: CapabilityMap = ADAPTER_020.capabilities) {
  const build = buildFixture(manifest, { capabilities })
  const { id, layout, light, dark } = build.renderable
  return { build, livery: { id, layout, light, dark }, capabilities }
}

describe('layout fragment', () => {
  it('is exactly the documented compat-layer order statement on every host generation', () => {
    for (const manifest of [SOLID, GLASS]) {
      for (const capabilities of [ADAPTER_020.capabilities, ADAPTER_021_RC2.capabilities]) {
        const { livery, capabilities: caps } = layoutParts(manifest, capabilities)
        expect(renderLayoutCss(livery, caps)).toBe(LAYOUT_LAYER_STATEMENT)
        expect(renderLayoutCss(livery, caps, { pretty: true }).trim()).toBe(LAYOUT_LAYER_STATEMENT)
      }
    }
    expect(LAYOUT_LAYER_STATEMENT).toBe(`@layer ${COMPAT_LAYER};`)
  })

  it('emits no selectors for unavailable density/width/flow recipes', () => {
    const { livery, capabilities } = layoutParts(SOLID)
    for (const css of [
      renderLayoutCss(livery, capabilities, { pretty: true }),
      renderMaterialCss(livery, capabilities, { pretty: true }),
    ]) {
      expect(css).not.toContain('data-density')
      expect(css).not.toContain('compact')
      expect(css).not.toContain('focused')
      expect(css).not.toContain('separated')
      expect(css).not.toContain('transcript')
    }
  })

  it('reports the recipe fallbacks for self-check diagnostics', () => {
    const contrastManifest = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-contrast')!
    const build = buildFixture(contrastManifest)
    const notes = layoutDegradations(build.manifest.layout, ADAPTER_020.capabilities)
    expect(notes).toContain('density=comfortable unavailable → host')
    expect(notes).toContain('conversationWidth=wide unavailable → host')
    expect(notes.some((note) => note.startsWith('surfaceStyle='))).toBe(false)
    const materialCaps = capsWith({ [CAP.surfaceMaterial]: false })
    const withMaterial = layoutDegradations({ ...build.manifest.layout, surfaceStyle: 'glass' }, materialCaps)
    expect(withMaterial).toContain('surfaceStyle=glass unavailable → solid')
  })
})

describe('material media fallbacks', () => {
  it('forces opaque surfaces under prefers-reduced-transparency for glass only', () => {
    const glassParts = layoutParts(GLASS)
    const glassCss = renderMaterialCss(glassParts.livery, glassParts.capabilities)
    expect(glassCss).toContain('@media (prefers-reduced-transparency: reduce)')
    const reducedSection = glassCss.slice(glassCss.indexOf('prefers-reduced-transparency'))
    expect(reducedSection).not.toContain('rgba(')
    expect(reducedSection).toContain('body[data-dsh-livery="fixture-slate-glass"]{')
    expect(reducedSection).toContain('[data-ds-dark-theme]{')

    const solidParts = layoutParts(SOLID)
    const solidCss = renderMaterialCss(solidParts.livery, solidParts.capabilities)
    expect(solidCss).not.toContain('prefers-reduced-transparency')
  })

  it('soft material stays opaque so it needs no reduced-transparency override', () => {
    const { build, livery, capabilities } = layoutParts(SOFT)
    expect(build.evaluation.effectiveLayout.surfaceStyle).toBe('soft')
    expect(renderMaterialCss(livery, capabilities)).not.toContain('prefers-reduced-transparency')
  })

  it('maps author tokens to system colours under forced colors', () => {
    const { livery, capabilities } = layoutParts(SOLID)
    const css = renderMaterialCss(livery, capabilities)
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('--dsw-alias-bg-base:Canvas')
    expect(css).toContain('--dsw-alias-label-primary:CanvasText')
    expect(css).toContain('--dsw-alias-label-dimmed:GrayText')
    expect(css).toContain('--dsw-alias-state-business-primary:Highlight')
    expect(FORCED_COLORS_TOKEN_MAP.length).toBeGreaterThan(10)
    const forcedSection = css.slice(css.indexOf('forced-colors'))
    expect(forcedSection).toContain('[data-ds-dark-theme]{')
  })

  it('omits media fallbacks whose capability is unavailable', () => {
    const { livery } = layoutParts(GLASS)
    const disabled = capsWith({ [CAP.forcedColors]: false, [CAP.reducedTransparency]: false })
    const css = renderMaterialCss(livery, disabled)
    expect(css).not.toContain('forced-colors')
    expect(css).not.toContain('prefers-reduced-transparency')
  })

  it('never emits prefers-reduced-motion (no authored motion) and keeps rules unlayered', () => {
    for (const manifest of [GLASS, SOLID, SOFT]) {
      const { livery, capabilities } = layoutParts(manifest)
      const css = renderMaterialCss(livery, capabilities)
      expect(css).not.toContain('prefers-reduced-motion')
      expect(css).not.toContain('!important')
      expect(css).not.toContain('@layer ')
      expect(css).not.toContain('</style')
    }
  })
})
