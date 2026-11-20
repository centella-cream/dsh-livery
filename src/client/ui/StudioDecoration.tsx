import type { JSX } from 'react'
import type { StudioDecorationId } from '../../core/presentation.js'
import { STUDIO_DECORATION_PRIMITIVES } from '../../core/decoration-recipes.js'
import { DECORATION_PATH_REGISTRY } from '../../core/decoration-data.js'

export interface StudioDecorationProps { readonly recipe: StudioDecorationId }

export function StudioDecoration({ recipe }: StudioDecorationProps): JSX.Element | null {
  const primitives = STUDIO_DECORATION_PRIMITIVES[recipe]?.primitives ?? []
  if (primitives.length === 0) return null
  return (
    <div className="livery-studio-decoration">
      <svg className="livery-studio-decoration__svg" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        {primitives.map((p, i) => {
          const stroke = 'stroke' in p && p.stroke !== undefined ? `var(${p.stroke})` : 'none'
          const fill = 'fill' in p && p.fill !== undefined ? `var(${p.fill})` : 'none'
          const width = 'width' in p && p.width !== undefined ? p.width : 1
          if (p.kind === 'line') return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={stroke} strokeWidth={width} />
          if (p.kind === 'rect') return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={fill} stroke={stroke} strokeWidth={width} />
          if (p.kind === 'circle') return <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={fill} stroke={stroke} strokeWidth={width} />
          if (p.kind === 'polyline') return <polyline key={i} points={p.points.map(([x, y]) => `${x},${y}`).join(' ')} fill={fill} stroke={stroke} strokeWidth={width} />
          if (p.kind === 'path') return <path key={i} d={DECORATION_PATH_REGISTRY[p.pathId]} transform={`translate(${p.x} ${p.y}) scale(${p.scale})`} fill={fill} stroke={stroke} strokeWidth={width} />
          return null
        })}
      </svg>
    </div>
  )
}
