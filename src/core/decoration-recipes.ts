/** L5a decoration primitives: bounded, token-referencing, no arbitrary SVG. */
export type DecorationTokenRef = `--dsh-livery-decoration-${string}`
export type PathId = string

export type DecorationPrimitive =
  | { readonly kind: 'line'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly stroke: DecorationTokenRef; readonly width: number }
  | { readonly kind: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly fill?: DecorationTokenRef; readonly stroke?: DecorationTokenRef; readonly width?: number }
  | { readonly kind: 'circle'; readonly cx: number; readonly cy: number; readonly r: number; readonly fill?: DecorationTokenRef; readonly stroke?: DecorationTokenRef; readonly width?: number }
  | { readonly kind: 'polyline'; readonly points: readonly (readonly [number, number])[]; readonly stroke: DecorationTokenRef; readonly width: number }
  | { readonly kind: 'path'; readonly pathId: PathId; readonly x: number; readonly y: number; readonly scale: number; readonly fill?: DecorationTokenRef; readonly stroke?: DecorationTokenRef; readonly width?: number }

export interface DecorationRecipe {
  readonly primitives: readonly DecorationPrimitive[]
}

export const DECORATION_RENDERER_VERSION = 1
const T = (name: string): DecorationTokenRef => `--dsh-livery-decoration-${name}` as DecorationTokenRef

export const STUDIO_DECORATION_PRIMITIVES: Readonly<Record<string, DecorationRecipe>> = Object.freeze({
  'studio-grid': { primitives: [
    { kind: 'line', x1: 0, y1: 32, x2: 1000, y2: 32, stroke: T('line'), width: 1 },
    { kind: 'line', x1: 0, y1: 992, x2: 1000, y2: 992, stroke: T('line'), width: 1 },
  ] },
  'studio-dots': { primitives: [
    { kind: 'circle', cx: 16, cy: 16, r: 2, fill: T('accent') },
    { kind: 'circle', cx: 984, cy: 984, r: 2, fill: T('accent') },
  ] },
  'studio-frame': { primitives: [
    { kind: 'rect', x: 8, y: 8, w: 984, h: 984, stroke: T('line'), width: 1 },
  ] },
  'studio-rules': { primitives: [
    { kind: 'line', x1: 8, y1: 24, x2: 992, y2: 24, stroke: T('line'), width: 1 },
    { kind: 'line', x1: 8, y1: 976, x2: 992, y2: 976, stroke: T('line'), width: 1 },
  ] },
})


