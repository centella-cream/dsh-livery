/**
 * DSH Livery — colour maths.
 *
 * Pure, dependency-free sRGB / OKLab / OKLCh conversion, gamut fitting, WCAG
 * 2.x relative luminance and contrast, OKLab mixing and alpha helpers. No DOM,
 * no React, no Node builtins: this module is duplicated into both bundles.
 *
 * Conventions:
 * - `Rgb` channels are 0–255 floats (never pre-rounded inside conversion
 *   helpers, so round-trips stay below 1e-6).
 * - Alpha is a separate 0–1 value; `parseColor` deliberately discards it while
 *   `parseColorWithAlpha` keeps it (used by the contrast auditor).
 * - Every function is deterministic: fixed rounding happens only in the
 *   serializers `formatHex` / `formatCssColor`.
 */

/** sRGB colour, channels 0–255 floats. */
export interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

/** OKLab colour (Björn Ottosson's definition). */
export interface Oklab {
  readonly l: number
  readonly a: number
  readonly b: number
}

/** OKLCh colour: lightness 0–1, chroma ≥ 0, hue degrees 0–360. */
export interface Oklch {
  readonly l: number
  readonly c: number
  readonly h: number
}

/** Parsed colour with its (discarded by `parseColor`) alpha channel. */
export interface RgbaColor {
  readonly rgb: Rgb
  readonly alpha: number
}

const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const RGB_FN_RE = /^rgba?\(\s*([^)]*)\)$/i
const HEX_PART_RE = /^[0-9a-fA-F]+$/

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function hexChannel(hex: string): number {
  return parseInt(hex, 16)
}

/**
 * Parse the four supported CSS colour notations:
 * `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(...)`, `rgba(...)`.
 *
 * Throws for anything else (named colours, `color()`, `var()`…). Percentages
 * are supported inside `rgb()`; the alpha component is validated and ignored.
 */
export function parseColor(input: string): Rgb {
  return parseColorWithAlpha(input).rgb
}

/** Like `parseColor`, but keeps the parsed alpha (defaults to 1). */
export function parseColorWithAlpha(input: string): RgbaColor {
  const value = input.trim()
  if (HEX_RE.test(value)) {
    const hex = value.slice(1)
    if (hex.length === 3 || hex.length === 4 || hex.length === 6 || hex.length === 8) {
      // `#rgb` / `#rgba` expand each nibble.
      const expanded =
        hex.length <= 4
          ? hex
              .split('')
              .map((part) => part + part)
              .join('')
          : hex
      const r = hexChannel(expanded.slice(0, 2))
      const g = hexChannel(expanded.slice(2, 4))
      const b = hexChannel(expanded.slice(4, 6))
      const alpha = expanded.length === 8 ? hexChannel(expanded.slice(6, 8)) / 255 : 1
      return { rgb: { r, g, b }, alpha }
    }
  }

  const fn = RGB_FN_RE.exec(value)
  if (fn) {
    const body = fn[1]
    if (body === undefined) throw new TypeError(`Unsupported colour: ${JSON.stringify(input)}`)
    const parts = body
      .split(/[,\s/]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    if (parts.length < 3 || parts.length > 4) {
      throw new TypeError(`Unsupported colour: ${JSON.stringify(input)}`)
    }
    const channels: number[] = []
    for (let i = 0; i < 3; i += 1) {
      const part = parts[i]
      if (part === undefined) throw new TypeError(`Unsupported colour: ${JSON.stringify(input)}`)
      if (part.endsWith('%')) {
        channels.push((Number.parseFloat(part) / 100) * 255)
      } else {
        channels.push(Number.parseFloat(part))
      }
    }
    let alpha = 1
    const alphaPart = parts[3]
    if (alphaPart !== undefined) {
      if (alphaPart.endsWith('%')) alpha = Number.parseFloat(alphaPart) / 100
      else alpha = Number.parseFloat(alphaPart)
    }
    const [r, g, b] = channels as [number, number, number]
    if (![r, g, b, alpha].every((channel) => Number.isFinite(channel))) {
      throw new TypeError(`Unsupported colour: ${JSON.stringify(input)}`)
    }
    return { rgb: { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255) }, alpha: clamp01(alpha) }
  }

  throw new TypeError(`Unsupported colour: ${JSON.stringify(input)}`)
}

/** True when `value` is a full `#rgb`/`#rrggbb`/`#rrggbbaa` hex literal. */
export function isHexColor(value: string): boolean {
  return HEX_RE.test(value.trim())
}

function hex2(value: number): string {
  const channel = Math.round(clamp(value, 0, 255))
  return channel.toString(16).padStart(2, '0')
}

/** Serialize to lowercase `#rrggbb` (channels clamped and rounded). */
export function formatHex(rgb: Rgb): string {
  return `#${hex2(rgb.r)}${hex2(rgb.g)}${hex2(rgb.b)}`
}

function formatAlpha(alpha: number): string {
  return String(round3(clamp01(alpha)))
}

/**
 * Serialize to CSS: opaque colours become `#rrggbb`; translucent colours become
 * `rgb(r, g, b, a)` with a fixed 3-decimal alpha so output is stable.
 */
export function formatCssColor(rgb: Rgb, alpha?: number): string {
  if (alpha === undefined || alpha >= 1) return formatHex(rgb)
  if (alpha <= 0) return `rgba(${Math.round(clamp(rgb.r, 0, 255))}, ${Math.round(clamp(rgb.g, 0, 255))}, ${Math.round(clamp(rgb.b, 0, 255))}, 0)`
  return `rgba(${Math.round(clamp(rgb.r, 0, 255))}, ${Math.round(clamp(rgb.g, 0, 255))}, ${Math.round(clamp(rgb.b, 0, 255))}, ${formatAlpha(alpha)})`
}

/** Return a copy of `color` (any supported notation) at `alpha`. */
export function withAlpha(color: string, alpha: number): string {
  const parsed = parseColorWithAlpha(color)
  return formatCssColor(parsed.rgb, clamp01(alpha))
}

// ---------------------------------------------------------------------------
// Transfer functions
// ---------------------------------------------------------------------------

function toLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function fromLinear(channel: number): number {
  const c = channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055
  return c * 255
}

/** WCAG 2.x relative luminance of an sRGB colour. */
export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b)
}

function linearComponents(rgb: Rgb): [number, number, number] {
  return [toLinear(rgb.r), toLinear(rgb.g), toLinear(rgb.b)]
}

/** WCAG 2.x contrast ratio, always ≥ 1. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

// ---------------------------------------------------------------------------
// OKLab / OKLCh
// ---------------------------------------------------------------------------

/** sRGB → OKLab. */
export function rgbToOklab(rgb: Rgb): Oklab {
  const [r, g, b] = linearComponents(rgb)
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
  const lRoot = Math.cbrt(l)
  const mRoot = Math.cbrt(m)
  const sRoot = Math.cbrt(s)
  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  }
}

/** OKLab → sRGB (unclamped conversion is clamped into the 0–255 cube). */
export function oklabToRgb(lab: Oklab): Rgb {
  const lRoot = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b
  const mRoot = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b
  const sRoot = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b
  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return {
    r: clamp(fromLinear(r), 0, 255),
    g: clamp(fromLinear(g), 0, 255),
    b: clamp(fromLinear(b), 0, 255),
  }
}

/** OKLab → OKLCh (hue in degrees 0–360, 0 for achromatic colours). */
export function oklabToOklch(lab: Oklab): Oklch {
  const c = Math.hypot(lab.a, lab.b)
  const h = c < 1e-9 ? 0 : ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360
  return { l: lab.l, c, h }
}

/** OKLCh → OKLab. */
export function oklchToOklab(lch: Oklch): Oklab {
  const hue = (lch.h * Math.PI) / 180
  return { l: lch.l, a: lch.c * Math.cos(hue), b: lch.c * Math.sin(hue) }
}

/** sRGB → OKLCh. */
export function rgbToOklch(rgb: Rgb): Oklch {
  return oklabToOklch(rgbToOklab(rgb))
}

/** OKLCh → sRGB (clamped to the cube; use `clampToSrgbGamut` first). */
export function oklchToRgb(lch: Oklch): Rgb {
  return oklabToRgb(oklchToOklab(lch))
}

function inGamut(rgb: Rgb): boolean {
  const epsilon = 1e-6
  return (
    rgb.r >= -epsilon * 255 &&
    rgb.r <= 255 + epsilon * 255 &&
    rgb.g >= -epsilon * 255 &&
    rgb.g <= 255 + epsilon * 255 &&
    rgb.b >= -epsilon * 255 &&
    rgb.b <= 255 + epsilon * 255
  )
}

/**
 * Fit an OKLCh colour into the sRGB gamut by reducing chroma while preserving
 * hue and lightness (binary search on chroma, 40 iterations).
 */
export function clampToSrgbGamut(lch: Oklch): Oklch {
  const lightness = clamp01(lch.l)
  const hue = ((lch.h % 360) + 360) % 360
  const chroma = Math.max(0, lch.c)
  const candidate: Oklch = { l: lightness, c: chroma, h: hue }
  if (inGamut(oklchToRgbRaw(candidate))) return candidate

  let low = 0
  let high = chroma
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2
    if (inGamut(oklchToRgbRaw({ l: lightness, c: mid, h: hue }))) low = mid
    else high = mid
  }
  return { l: lightness, c: low, h: hue }
}

/** `oklchToRgb` without the final channel clamp (used for gamut probing). */
function oklchToRgbRaw(lch: Oklch): Rgb {
  const lab = oklchToOklab(lch)
  const lRoot = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b
  const mRoot = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b
  const sRoot = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b
  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3
  return {
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  }
}

/**
 * Interpolate two sRGB colours in OKLab. `t = 0` returns `a`, `t = 1` returns
 * `b`; the result is gamut fitted so it is always displayable sRGB.
 */
export function mixOklab(a: Rgb, b: Rgb, t: number): Rgb {
  const clamped = clamp01(t)
  const labA = rgbToOklab(a)
  const labB = rgbToOklab(b)
  const mixed: Oklab = {
    l: labA.l + (labB.l - labA.l) * clamped,
    a: labA.a + (labB.a - labA.a) * clamped,
    b: labA.b + (labB.b - labA.b) * clamped,
  }
  return oklchToRgb(clampToSrgbGamut(oklabToOklch(mixed)))
}
