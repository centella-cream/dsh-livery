/**
 * DOM layer for the wallpaper studio.
 *
 * Sole writer of the wallpaper pseudoelement stylesheet and the
 * `body[data-dsh-wallpaper]` attribute. Mirrors the presenter's ownership rules:
 * one plugin-owned `<style>` found/created by id, `data-plugin-css` marker,
 * text updated in place, and teardown removes exactly what this module added.
 */
import { WALLPAPER_ATTRIBUTE, WALLPAPER_CSS_FILE } from '../wallpaper.js'

/** Stable id of the plugin-owned wallpaper stylesheet. */
export const WALLPAPER_STYLE_ID = 'dsh-livery-wallpaper'
const PLUGIN_MARKER = 'dsh-livery'

/** Minimal DOM face so the layer can be unit-tested with a fake document. */
export interface WallpaperDocument {
  readonly body: {
    setAttribute(name: string, value: string): void
    removeAttribute(name: string): void
  }
  getElementById(id: string): WallpaperStyleElement | null
  createElement(tag: 'style'): WallpaperStyleElement
  readonly head: { appendChild(element: WallpaperStyleElement): unknown }
}

/** Minimal style element face. */
export interface WallpaperStyleElement {
  id: string
  textContent: string | null
  readonly ownerDocument: WallpaperDocument
  setAttribute(name: string, value: string): void
  remove(): void
}

/** Wallpaper DOM layer. */
export interface WallpaperLayer {
  /** Create/update the owned stylesheet and mark the body. */
  apply(css: string): void
  /** Remove the stylesheet text and the body attribute. */
  clear(): void
  /** Remove everything this layer created (safe to call twice). */
  dispose(): void
}

const NOOP_LAYER: WallpaperLayer = { apply: () => undefined, clear: () => undefined, dispose: () => undefined }

/**
 * Build a wallpaper layer over the given document, or a no-op layer when no
 * document exists (SSR/tests).
 * @param doc - document-like object; defaults to the browser document.
 * @returns the wallpaper DOM layer.
 */
export function createWallpaperLayer(doc?: WallpaperDocument | undefined): WallpaperLayer {
  const target = doc ?? (typeof document === 'undefined' ? undefined : document as unknown as WallpaperDocument)
  if (target === undefined) return NOOP_LAYER

  const findStyle = (): WallpaperStyleElement | null => {
    const existing = target.getElementById(WALLPAPER_STYLE_ID)
    return existing !== null && existing.id === WALLPAPER_STYLE_ID ? existing : null
  }

  const ensureStyle = (): WallpaperStyleElement => {
    const existing = findStyle()
    if (existing !== null) return existing
    const style = target.createElement('style')
    style.id = WALLPAPER_STYLE_ID
    style.setAttribute('data-plugin', PLUGIN_MARKER)
    style.setAttribute('data-plugin-css', WALLPAPER_CSS_FILE)
    target.head.appendChild(style)
    return style
  }

  const clear = (): void => {
    findStyle()?.remove()
    target.body.removeAttribute(WALLPAPER_ATTRIBUTE)
  }

  return {
    apply: (css: string) => {
      if (css.trim().length === 0) {
        clear()
        return
      }
      const style = ensureStyle()
      if (style.textContent !== css) style.textContent = css
      target.body.setAttribute(WALLPAPER_ATTRIBUTE, '')
    },
    clear,
    dispose: clear,
  }
}
