import { describe, expect, it } from 'vitest'
import {
  FORCED_COLORS_TOKEN_MAP,
  LAYOUT_LAYER_STATEMENT,
  layoutDegradations,
  renderLayoutCss,
  renderMaterialCss,
} from '../../src/core/layout.js'
import { HOST_CAPABILITIES } from '../../src/generated/contract.js'
import { CAP, COMPAT_LAYER, type CapabilityMap } from '../../src/core/types.js'
import { FIXTURE_MANIFESTS } from './fixtures.js'
import { buildFixture } from './helpers.js'

const GLASS = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-slate-glass')!
const SOLID = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-fjord')!
const SOFT = FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-sand')!

function capsWith(overrides: Readonly<Record<string, boolean>>): CapabilityMap {
  const result: Record<string, (typeof HOST_CAPABILITIES)[string]> = {}
  for (const [id, fact] of Object.entries(HOST_CAPABILITIES)) {
    result[id] = overrides[id] === undefined ? fact : { ...fact, available: overrides[id] as boolean }
  }
  return result
}

describe('layout fragment', () => {
  it('is exactly the documented compat-layer order statement', () => {
    const build = buildFixture(SOLID)
    const layout = build.renderable.layout
    const { light, dark, id } = build.renderable
    expect(renderLayoutCss({ id, layout, light, dark }, build.evaluation.map)).toBe(LAYOUT_LAYER_STATEMENT)
    expect(renderLayoutCss({ id, layout, light, dark }, build.evaluation.map, { pretty: true }).trim()).toBe(
      LAYOUT_LAYER_STATEMENT,
    )
    expect(LAYOUT_LAYER_STATEMENT).toBe(`@layer ${COMPAT_LAYER};`)
  })

  it('emits no selectors for unavailable density/width/flow recipes', () => {
    const build = buildFixture(SOLID)
    const { id, light, dark } = build.renderable
    const layout = build.evaluation.effectiveLayout
    for (const css of [
      renderLayoutCss({ id, layout, light, dark }, build.evaluation.map, { pretty: true }),
      renderMaterialCss({ id, layout, light, dark }, build.evaluation.map, { pretty: true }),
    ]) {
      expect(css).not.toContain('data-density')
      expect(css).not.toContain('compact')
      expect(css).not.toContain('focused')
      expect(css).not.toContain('separated')
      expect(css).not.toContain('transcript')
    }
  })

  it('reports the recipe fallbacks for self-check diagnostics', () => {
    const build = buildFixture(FIXTURE_MANIFESTS.find((manifest) => manifest.id === 'fixture-contrast')!)
    const notes = layoutDegradations(build.manifest.layout, HOST_CAPABILITIES)
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
    const glassBuild = buildFixture(GLASS)
    const glassCss = renderMaterialCss(
      { id: glassBuild.renderable.id, layout: glassBuild.renderable.layout, light: glassBuild.light, dark: glassBuild.dark },
      glassBuild.evaluation.map,
    )
    expect(glassCss).toContain('@media (prefers-reduced-transparency: reduce)')
    const reducedSection = glassCss.slice(glassCss.indexOf('prefers-reduced-transparency'))
    expect(reducedSection).not.toContain('rgba(')
    expect(reducedSection).toContain('body[data-dsh-livery="fixture-slate-glass"]{')
    expect(reducedSection).toContain('[data-ds-dark-theme]{')

    const solidBuild = buildFixture(SOLID)
    const solidCss = renderMaterialCss(
      { id: solidBuild.renderable.id, layout: solidBuild.renderable.layout, light: solidBuild.light, dark: solidBuild.dark },
      solidBuild.evaluation.map,
    )
    expect(solidCss).not.toContain('prefers-reduced-transparency')
  })

  it('soft material stays opaque so it needs no reduced-transparency override', () => {
    const build = buildFixture(SOFT)
    const css = renderMaterialCss(
      { id: build.renderable.id, layout: build.renderable.layout, light: build.light, dark: build.dark },
      build.evaluation.map,
    )
    expect(build.evaluation.effectiveLayout.surfaceStyle).toBe('soft')
    expect(css).not.toContain('prefers-reduced-transparency')
  })

  it('maps author tokens to system colours under forced colors', () => {
    const build = buildFixture(SOLID)
    const css = renderMaterialCss(
      { id: build.renderable.id, layout: build.renderable.layout, light: build.light, dark: build.dark },
      build.evaluation.map,
    )
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('--dsw-alias-bg-base:Canvas')
    expect(css).toContain('--dsw-alias-label-primary:CanvasText')
    expect(css).toContain('--dsw-alias-label-dimmed:GrayText')
    expect(css).toContain('--dsw-alias-state-business-primary:Highlight')
    expect(FORCED_COLORS_TOKEN_MAP.length).toBeGreaterThan(10)
    // The dark block repeats the system mapping (higher specificity wins over
    // our own normal dark declarations).
    const forcedSection = css.slice(css.indexOf('forced-colors'))
    expect(forcedSection).toContain('[data-ds-dark-theme]{')
  })

  it('omits media fallbacks whose capability is unavailable', () => {
    const build = buildFixture(GLASS)
    const disabled = capsWith({ [CAP.forcedColors]: false, [CAP.reducedTransparency]: false })
    const css = renderMaterialCss(
      { id: build.renderable.id, layout: build.renderable.layout, light: build.light, dark: build.dark },
      disabled,
    )
    expect(css).not.toContain('forced-colors')
    expect(css).not.toContain('prefers-reduced-transparency')
  })

  it('never emits prefers-reduced-motion (no authored motion) and keeps rules unlayered', () => {
    for (const manifest of [GLASS, SOLID, SOFT]) {
      const build = buildFixture(manifest)
      const css = renderMaterialCss(
        { id: build.renderable.id, layout: build.renderable.layout, light: build.light, dark: build.dark },
        build.evaluation.map,
      )
      expect(css).not.toContain('prefers-reduced-motion')
      expect(css).not.toContain('!important')
      expect(css).not.toContain('@layer ')
      expect(css).not.toContain('</style')
    }
  })
})
