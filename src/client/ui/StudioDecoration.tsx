/**
 * L5a Studio Decoration — Livery-owned pages only.
 *
 * The renderer consumes a recipe id and bounded parameters from the Catalog.
 * It never reads host DOM/classes and never claims to decorate the DSH shell.
 */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { StudioDecorationId } from '../../core/presentation.js'
import { DECORATION_PATH_REGISTRY, STUDIO_DECORATION_PRIMITIVES } from '../../core/decoration-data.js'
import type { DecorationPrimitive } from '../../core/decoration-data.js'

export interface StudioDecorationProps {
  readonly recipe: StudioDecorationId
  readonly parameters?: Readonly<Record<string, string | number>> | undefined
}

export function studioDecorationTier(width: number): 'full' | 'reduced' | 'minimal' | 'none' {
  if (width > 999) return 'full'
  if (width > 799) return 'reduced'
  if (width > 599) return 'minimal'
  return 'none'
}

export function StudioDecoration({ recipe }: StudioDecorationProps): JSX.Element | null {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const host = hostRef.current
    if (host === null) return undefined
    const measure = (): void => setWidth(host.getBoundingClientRect().width)
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])
  const tier = studioDecorationTier(width)
  const visibleRecipe = tier === 'none' ? 'none' : recipe
  return (
    <div
      ref={hostRef}
      className="livery-studio-decoration"
      data-testid="livery-studio-decoration"
      data-recipe={visibleRecipe}
      data-tier={tier}
      aria-hidden="true"
    >
      {visibleRecipe === 'none' ? null : (
        <svg
          className={`livery-studio-decoration__svg livery-studio-decoration__svg--${tier}`}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          focusable="false"
          aria-hidden="true"
        >
          {(STUDIO_DECORATION_PRIMITIVES[visibleRecipe]?.primitives ?? []).map((primitive, index) => (
            <Primitive key={`${visibleRecipe}-${index}`} primitive={primitive} />
          ))}
        </svg>
      )}
    </div>
  )
}

function Primitive({ primitive }: { readonly primitive: DecorationPrimitive }): JSX.Element | null {
  const stroke = 'stroke' in primitive && primitive.stroke !== undefined ? `var(${primitive.stroke})` : 'none'
  const fill = 'fill' in primitive && primitive.fill !== undefined ? `var(${primitive.fill})` : 'none'
  const width = 'width' in primitive && primitive.width !== undefined ? primitive.width : 1
  if (primitive.kind === 'line') return <line x1={primitive.x1} y1={primitive.y1} x2={primitive.x2} y2={primitive.y2} stroke={stroke} strokeWidth={width} />
  if (primitive.kind === 'rect') return <rect x={primitive.x} y={primitive.y} width={primitive.w} height={primitive.h} fill={fill} stroke={stroke} strokeWidth={width} />
  if (primitive.kind === 'circle') return <circle cx={primitive.cx} cy={primitive.cy} r={primitive.r} fill={fill} stroke={stroke} strokeWidth={width} />
  if (primitive.kind === 'polyline') return <polyline points={primitive.points.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={stroke} strokeWidth={width} />
  const path = DECORATION_PATH_REGISTRY[primitive.pathId]
  if (path === undefined) return null
  return <path d={path} transform={`translate(${primitive.x} ${primitive.y}) scale(${primitive.scale})`} fill={fill} stroke={stroke} strokeWidth={width} />
}
