import { createHash } from 'node:crypto'
import type { DecorationAudit } from './types.js'

const STUDIO_PARAMETERS: Readonly<Record<string, Record<string, readonly string[]>>> = {
  'studio-grid': { density: ['subtle', 'dense'] },
  'studio-dots': { density: ['subtle', 'dense'] },
  'studio-frame': { weight: ['hairline', 'bold'] },
  'studio-rules': { density: ['subtle', 'dense'] },
}

function parameterIssues(recipe: string, parameters: Readonly<Record<string, string | number>>): { code: string; path: string; message: string }[] {
  const spec = STUDIO_PARAMETERS[recipe]
  if (spec === undefined) return []
  const issues: { code: string; path: string; message: string }[] = []
  for (const [key, value] of Object.entries(parameters)) {
    const allowed = spec[key]
    if (allowed === undefined) issues.push({ code: 'parameter.unknown', path: `/parameters/${key}`, message: `unknown parameter ${key}` })
    else if (typeof value !== 'string' || !allowed.includes(value)) issues.push({ code: 'parameter.invalid', path: `/parameters/${key}`, message: `${key} must be one of ${allowed.join(', ')}` })
  }
  return issues
}
import { DECORATION_PATH_REGISTRY, DECORATION_RENDERER_VERSION, STUDIO_DECORATION_PRIMITIVES, validatePrimitive } from './decoration-data.js'
import type { DecorationTokenRef } from './decoration-data.js'
export * from './decoration-data.js'

function round3(value: number): number {
  const rounded = Math.sign(value) * Math.round(Math.abs(value) * 1000) / 1000
  return Object.is(rounded, -0) ? 0 : rounded
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(typeof value === 'number' ? round3(value) : value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`
}
function sha(text: string): string { return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}` }

export function auditStudioDecoration(recipe: string, parameters: Readonly<Record<string, string | number>> = {}): DecorationAudit {
  const entry = STUDIO_DECORATION_PRIMITIVES[recipe]
  const primitives = entry?.primitives ?? []
  const issues = [...parameterIssues(recipe, parameters), ...primitives.flatMap((primitive, index) => validatePrimitive(primitive).map((message) => ({ code: 'primitive.invalid', path: `/primitives/${index}`, message })))] 
  const tokenRefs = [...new Set(primitives.flatMap((primitive) => {
    const record = primitive as { fill?: DecorationTokenRef; stroke?: DecorationTokenRef }
    return [record.fill, record.stroke].filter((value): value is DecorationTokenRef => typeof value === 'string')
  }))].sort()
  const pathRegistryHash = sha(canonical(DECORATION_PATH_REGISTRY))
  const recipeHash = sha(canonical({ recipe, parameters, primitives }))
  const decorationAuditHash = sha(canonical({ recipe, parameters, primitives, rendererVersion: DECORATION_RENDERER_VERSION, pathRegistryHash }))
  return {
    recipe,
    recipeHash,
    rendererVersion: DECORATION_RENDERER_VERSION,
    pathRegistryHash,
    grammarHash: sha('decoration:1'),
    primitiveCount: primitives.length,
    primitiveKinds: [...new Set(primitives.map((primitive) => primitive.kind))].sort(),
    tokenRefs,
    issues,
    decorationAuditHash,
  }
}
