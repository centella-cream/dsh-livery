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
  readonly id: string
  readonly primitives: readonly DecorationPrimitive[]
}

export const DECORATION_RENDERER_VERSION = 1
export const DECORATION_PATH_REGISTRY: Readonly<Record<string, string>> = Object.freeze({
  'corner': 'M0 0 L0 1 L1 1',
  'tick': 'M0 0 L0.5 0',
})

function isToken(value: unknown): boolean {
  return typeof value === 'string' && /^--dsh-livery-decoration-[a-z0-9-]+$/u.test(value)
}

function finiteIn(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

const T = (name: string): DecorationTokenRef => `--dsh-livery-decoration-${name}` as DecorationTokenRef

export const STUDIO_DECORATION_PRIMITIVES: Readonly<Record<string, DecorationRecipe>> = Object.freeze({
  'studio-grid': { id: 'studio-grid', primitives: [
    { kind: 'line', x1: 0, y1: 32, x2: 1000, y2: 32, stroke: T('line'), width: 1 },
    { kind: 'line', x1: 0, y1: 992, x2: 1000, y2: 992, stroke: T('line'), width: 1 },
  ] },
  'studio-dots': { id: 'studio-dots', primitives: [
    { kind: 'circle', cx: 16, cy: 16, r: 2, fill: T('accent') },
    { kind: 'circle', cx: 984, cy: 984, r: 2, fill: T('accent') },
  ] },
  'studio-frame': { id: 'studio-frame', primitives: [
    { kind: 'rect', x: 8, y: 8, w: 984, h: 984, stroke: T('line'), width: 1 },
  ] },
  'studio-rules': { id: 'studio-rules', primitives: [
    { kind: 'line', x1: 8, y1: 24, x2: 992, y2: 24, stroke: T('line'), width: 1 },
    { kind: 'line', x1: 8, y1: 976, x2: 992, y2: 976, stroke: T('line'), width: 1 },
  ] },
})


export function validatePrimitive(value: unknown): string[] {
  const issues: string[] = []
  if (typeof value !== 'object' || value === null) return ['primitive must be an object']
  const primitive = value as Record<string, unknown>
  const kind = primitive['kind']
  if (!['line', 'rect', 'circle', 'polyline', 'path'].includes(String(kind))) issues.push('unknown primitive kind')
  if (kind === 'line') {
    for (const key of ['x1', 'y1', 'x2', 'y2'] as const) if (!finiteIn(primitive[key], 0, 1000)) issues.push(`${key} out of range`)
    if (!isToken(primitive['stroke'])) issues.push('stroke must be a private decoration token')
    if (!finiteIn(primitive['width'], 0.5, 8)) issues.push('width out of range')
  } else if (kind === 'rect') {
    for (const key of ['x', 'y'] as const) if (!finiteIn(primitive[key], 0, 1000)) issues.push(`${key} out of range`)
    for (const key of ['w', 'h'] as const) if (!finiteIn(primitive[key], 0, 1000)) issues.push(`${key} out of range`)
    if (!isToken(primitive['fill']) && !isToken(primitive['stroke'])) issues.push('rect needs a fill or stroke token')
  } else if (kind === 'circle') {
    for (const key of ['cx', 'cy'] as const) if (!finiteIn(primitive[key], 0, 1000)) issues.push(`${key} out of range`)
    if (!finiteIn(primitive['r'], 1, 500)) issues.push('r out of range')
    if (!isToken(primitive['fill']) && !isToken(primitive['stroke'])) issues.push('circle needs a fill or stroke token')
  } else if (kind === 'polyline') {
    const points = primitive['points']
    if (!Array.isArray(points) || points.length < 2 || points.length > 16) issues.push('polyline needs 2..16 points')
    else for (const point of points) if (!Array.isArray(point) || point.length !== 2 || !finiteIn(point[0], 0, 1000) || !finiteIn(point[1], 0, 1000)) issues.push('polyline point out of range')
    if (!isToken(primitive['stroke'])) issues.push('polyline stroke invalid')
    if (!finiteIn(primitive['width'], 0.5, 8)) issues.push('polyline width out of range')
  } else if (kind === 'path') {
    if (typeof primitive['pathId'] !== 'string' || DECORATION_PATH_REGISTRY[primitive['pathId']] === undefined) issues.push('unknown pathId')
    for (const key of ['x', 'y'] as const) if (!finiteIn(primitive[key], 0, 1000)) issues.push(`${key} out of range`)
    if (!finiteIn(primitive['scale'], 0.1, 10)) issues.push('scale out of range')
  }
  return issues
}

