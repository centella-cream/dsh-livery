
export * from './decoration-recipes.js'

export const DECORATION_PATH_REGISTRY: Readonly<Record<string, string>> = Object.freeze({
  'corner': 'M0 0 L0 1 L1 1',
  'tick': 'M0 0 L0.5 0',
})


export function isToken(value: unknown): boolean {
  return typeof value === 'string' && /^--dsh-livery-decoration-[a-z0-9-]+$/u.test(value)
}

export function finiteIn(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}


export * from './decoration-recipes.js'



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

