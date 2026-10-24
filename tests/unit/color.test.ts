import { describe, expect, it } from 'vitest'
import {
  clampToSrgbGamut,
  contrastRatio,
  evaluateColorMix,
  formatCssColor,
  formatHex,
  isHexColor,
  mixOklab,
  oklabToRgb,
  oklchToRgb,
  parseColor,
  parseColorWithAlpha,
  relativeLuminance,
  rgbToOklab,
  rgbToOklch,
  splitTopLevelList,
  substituteVars,
  withAlpha,
  type Oklch,
  type Rgb,
} from '../../src/core/color.js'

const SAMPLES: readonly Rgb[] = [
  { r: 0, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 },
  { r: 59, g: 130, b: 246 },
  { r: 15, g: 17, b: 21 },
  { r: 245, g: 246, b: 247 },
  { r: 236, g: 19, b: 19 },
  { r: 122, g: 170, b: 255 },
  { r: 12.5, g: 200.25, b: 99.75 },
]

function expectRgbClose(actual: Rgb, expected: Rgb, tolerance = 1e-6): void {
  expect(Math.abs(actual.r - expected.r)).toBeLessThan(tolerance)
  expect(Math.abs(actual.g - expected.g)).toBeLessThan(tolerance)
  expect(Math.abs(actual.b - expected.b)).toBeLessThan(tolerance)
}

describe('parseColor / format', () => {
  it('parses every supported notation', () => {
    expectRgbClose(parseColor('#fff'), { r: 255, g: 255, b: 255 })
    expectRgbClose(parseColor('#8ba7bd'), { r: 139, g: 167, b: 189 })
    expectRgbClose(parseColor('#8ba7bd4d'), { r: 139, g: 167, b: 189 })
    expectRgbClose(parseColor('rgb(1, 2, 3)'), { r: 1, g: 2, b: 3 })
    expectRgbClose(parseColor('rgba(1, 2, 3, 0.5)'), { r: 1, g: 2, b: 3 })
    expectRgbClose(parseColor('rgb(100% 0% 50%)'), { r: 255, g: 0, b: 127.5 })
    expect(parseColorWithAlpha('#8ba7bd4d').alpha).toBeCloseTo(0x4d / 255, 6)
    expect(parseColorWithAlpha('rgba(0,0,0,0.25)').alpha).toBe(0.25)
  })

  it('throws for unsupported values', () => {
    for (const value of ['red', 'var(--x)', '#12', '#ggg', 'color(display-p3 1 0 0)', '', 'rgb()']) {
      expect(() => parseColor(value)).toThrow()
    }
  })

  it('formats deterministic hex and css colours', () => {
    expect(formatHex({ r: 15.6, g: 17, b: 21 })).toBe('#101115')
    expect(formatHex({ r: -5, g: 300, b: 0 })).toBe('#00ff00')
    expect(formatCssColor({ r: 1, g: 2, b: 3 })).toBe('#010203')
    expect(formatCssColor({ r: 1, g: 2, b: 3 }, 1)).toBe('#010203')
    expect(formatCssColor({ r: 1, g: 2, b: 3 }, 0.4)).toBe('rgba(1, 2, 3, 0.4)')
    expect(formatCssColor({ r: 1, g: 2, b: 3 }, 0)).toBe('rgba(1, 2, 3, 0)')
  })

  it('withAlpha round-trips a colour at a given alpha', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)')
    expect(withAlpha('rgb(0, 128, 255)', 1)).toBe('#0080ff')
  })

  it('detects hex literals only', () => {
    expect(isHexColor('#abc')).toBe(true)
    expect(isHexColor('#aabbcc')).toBe(true)
    expect(isHexColor('#aabbccdd')).toBe(true)
    expect(isHexColor('rgb(0,0,0)')).toBe(false)
    expect(isHexColor('  #abc  ')).toBe(true)
    expect(isHexColor('#ab')).toBe(false)
  })
})

describe('OKLab / OKLCh', () => {
  it('round-trips RGB through OKLab below 1e-6 in OKLab space', () => {
    for (const sample of SAMPLES) {
      const lab = rgbToOklab(sample)
      const back = rgbToOklab(oklabToRgb(lab))
      expect(Math.abs(back.l - lab.l)).toBeLessThan(1e-6)
      expect(Math.abs(back.a - lab.a)).toBeLessThan(1e-6)
      expect(Math.abs(back.b - lab.b)).toBeLessThan(1e-6)
      // Channel-space roundtrip is limited only by the published matrix precision.
      expectRgbClose(oklabToRgb(lab), sample, 1e-3)
    }
  })

  it('round-trips RGB through OKLCh below 1e-6 in OKLab space', () => {
    for (const sample of SAMPLES) {
      const lab = rgbToOklab(sample)
      const lch = rgbToOklch(sample)
      const back = rgbToOklab(oklchToRgb(lch))
      expect(Math.abs(back.l - lab.l)).toBeLessThan(1e-6)
      expect(Math.abs(back.a - lab.a)).toBeLessThan(1e-6)
      expect(Math.abs(back.b - lab.b)).toBeLessThan(1e-6)
      expectRgbClose(oklchToRgb(lch), sample, 1e-3)
    }
  })

  it('reports a neutral hue for achromatic colours', () => {
    expect(rgbToOklch({ r: 128, g: 128, b: 128 }).c).toBeLessThan(1e-3)
    expect(rgbToOklch({ r: 0, g: 0, b: 0 }).c).toBe(0)
  })

  it('fits out-of-gamut OKLCh by reducing chroma at constant hue and lightness', () => {
    const extreme: Oklch = { l: 0.55, c: 0.5, h: 150 }
    const fitted = clampToSrgbGamut(extreme)
    expect(fitted.c).toBeLessThan(extreme.c)
    expect(fitted.l).toBeCloseTo(extreme.l, 12)
    expect(fitted.h).toBeCloseTo(extreme.h, 12)
    const rgb = oklchToRgb(fitted)
    expect(rgb.r).toBeGreaterThanOrEqual(0)
    expect(rgb.r).toBeLessThanOrEqual(255)
    expect(rgb.g).toBeGreaterThanOrEqual(0)
    expect(rgb.g).toBeLessThanOrEqual(255)
    expect(rgb.b).toBeGreaterThanOrEqual(0)
    expect(rgb.b).toBeLessThanOrEqual(255)
  })

  it('clamps lightness into [0, 1]', () => {
    expect(clampToSrgbGamut({ l: 1.4, c: 0, h: 0 }).l).toBe(1)
    expect(clampToSrgbGamut({ l: -0.2, c: 0, h: 0 }).l).toBe(0)
  })
})

describe('WCAG luminance and contrast', () => {
  it('uses the standard luminances', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 12)
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 12)
  })

  it('computes the 21:1 black/white ratio and is symmetric', () => {
    const white = { r: 255, g: 255, b: 255 }
    const black = { r: 0, g: 0, b: 0 }
    expect(contrastRatio(white, black)).toBeCloseTo(21, 10)
    expect(contrastRatio(black, white)).toBeCloseTo(21, 10)
    expect(contrastRatio(white, white)).toBeCloseTo(1, 12)
  })
})

describe('OKLab mixing', () => {
  it('returns the endpoints and a perceptual midpoint', () => {
    const black = { r: 0, g: 0, b: 0 }
    const white = { r: 255, g: 255, b: 255 }
    expectRgbClose(mixOklab(black, white, 0), black, 0.5)
    expectRgbClose(mixOklab(black, white, 1), white, 0.5)
    const middle = mixOklab(black, white, 0.5)
    // OKLab midpoint of black↔white is a middle grey (~#6a6a6a), never #808080.
    expect(middle.r).toBeGreaterThan(90)
    expect(middle.r).toBeLessThan(130)
    expect(middle.r).toBeCloseTo(middle.g, 3)
  })

  it('clamps t and stays displayable for saturated endpoints', () => {
    const red = { r: 255, g: 0, b: 0 }
    const blue = { r: 0, g: 0, b: 255 }
    expectRgbClose(mixOklab(red, blue, 0), red, 0.5)
    expectRgbClose(mixOklab(red, blue, 1), blue, 0.5)
    expectRgbClose(mixOklab(red, blue, -3), red, 0.5)
    expectRgbClose(mixOklab(red, blue, 3), blue, 0.5)
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      const mixed = mixOklab(red, blue, t)
      for (const channel of [mixed.r, mixed.g, mixed.b]) {
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(255)
      }
    }
  })
})

describe('CSS expression helpers', () => {
  it('splits top-level lists while ignoring nested commas', () => {
    expect(splitTopLevelList('a, rgb(1, 2, 3), c')).toEqual(['a', ' rgb(1, 2, 3)', ' c'])
    expect(splitTopLevelList('color-mix(in srgb, #fff 40%, transparent)')).toEqual([
      'color-mix(in srgb, #fff 40%, transparent)',
    ])
  })

  it('substitutes var() chains with and without fallbacks', () => {
    const values: Record<string, string> = { '--a': '#010203', '--b': 'var(--a)' }
    const resolve = (name: string): string | null => values[name] ?? null
    expect(substituteVars('var(--a)', resolve)).toBe('#010203')
    expect(substituteVars('x var(--b) y', resolve)).toBe('x #010203 y')
    expect(substituteVars('var(--missing, 7px)', resolve)).toBe('7px')
    expect(substituteVars('var(--missing)', resolve)).toBeNull()
    expect(substituteVars('var(--missing, var(--a))', resolve)).toBe('#010203')
  })

  it('evaluates srgb color-mix with premultiplied alpha and percentages', () => {
    expect(evaluateColorMix('color-mix(in srgb, #ff0000 50%, #0000ff)')).toBe('#800080')
    expect(evaluateColorMix('color-mix(in srgb, #3b82f6 40%, transparent)')).toBe('rgba(59, 130, 246, 0.4)')
    expect(evaluateColorMix('color-mix(in srgb, #ffffff 50%, transparent)')).toBe('rgba(255, 255, 255, 0.5)')
    expect(evaluateColorMix('color-mix(in srgb, #000 100%, transparent)')).toBe('#000000')
    expect(evaluateColorMix('color-mix(in oklab, #fff 50%, #000)')).toBeNull()
    expect(evaluateColorMix('not-a-mix')).toBeNull()
  })
})
