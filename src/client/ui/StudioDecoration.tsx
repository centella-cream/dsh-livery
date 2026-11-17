/**
 * L5a Studio Decoration — Livery-owned pages only.
 *
 * The renderer consumes a recipe id and bounded parameters from the Catalog.
 * It never reads host DOM/classes and never claims to decorate the DSH shell.
 */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { StudioDecorationId } from '../../core/presentation.js'

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

export function StudioDecoration({ recipe, parameters = {} }: StudioDecorationProps): JSX.Element | null {
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
        <div
          className={`livery-studio-decoration__art livery-studio-decoration__art--${tier}`}
          data-density={String(parameters['density'] ?? 'subtle')}
        />
      )}
    </div>
  )
}
