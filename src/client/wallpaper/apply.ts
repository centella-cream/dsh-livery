/**
 * DOM layer for the wallpaper studio.
 *
 * Sole writer of the wallpaper stylesheet, the immersive `body[data-dsh-wallpaper]`
 * marker and the plugin-owned atmosphere overlay above app content. Mirrors the
 * presenter ownership rules: one owned `<style>` found/created by id, a fixed
 * overlay element created/removed by id, and teardown removes exactly what this
 * module added. The overlay carries classes/attributes only — no inline styles —
 * and the stylesheet sets `pointer-events:none`, so it never blocks clicks.
 */
import {
  WALLPAPER_ATTRIBUTE,
  WALLPAPER_CSS_FILE,
  WALLPAPER_DIRECT_CLASS,
  WALLPAPER_DIRECT_ID,
  WALLPAPER_OVERLAY_CLASS,
  WALLPAPER_OVERLAY_ID,
} from '../wallpaper.js'

/** Stable id of the plugin-owned wallpaper stylesheet. */
export const WALLPAPER_STYLE_ID = 'dsh-livery-wallpaper'
const PLUGIN_MARKER = 'dsh-livery'

/** Minimal style/overlay element face used by the layer. */
export interface WallpaperStyleElement {
  id: string
  textContent: string | null
  setAttribute(name: string, value: string): void
  removeAttribute?(name: string): void
  appendChild?(child: WallpaperStyleElement): unknown
  readonly children?: readonly WallpaperStyleElement[]
  remove(): void
}

/** Minimal DOM face so the layer can be unit-tested with a fake document. */
export interface WallpaperDocument {
  readonly body: {
    setAttribute(name: string, value: string): void
    removeAttribute(name: string): void
    appendChild(element: WallpaperStyleElement): unknown
  }
  getElementById(id: string): WallpaperStyleElement | null
  createElement(tag: 'style' | 'div' | 'img'): WallpaperStyleElement
  readonly head: { appendChild(element: WallpaperStyleElement): unknown }
}

/** Direct-provider image input for the owned `<img>` layer. */
export interface WallpaperDirectImage {
  /** Provider-controlled https image URL, already host-allowlisted. */
  readonly url: string
  /** Provider thumbnail tried once if the full image fails. */
  readonly fallbackUrl?: string
}

/** Wallpaper DOM layer. */
export interface WallpaperLayer {
  /**
   * Create/update the owned stylesheet + overlay and mark the body.
   * @param css - stylesheet text ('' clears the layer).
   * @param overlay - whether the above-content atmosphere overlay should exist.
   * @param direct - optional direct-provider image; absent removes the layer.
   */
  apply(css: string, overlay: boolean, direct?: WallpaperDirectImage | undefined): void
  /** Remove the stylesheet, overlay and body attribute. */
  clear(): void
  /** Remove everything this layer created (safe to call twice). */
  dispose(): void
}

const NOOP_LAYER: WallpaperLayer = {
  apply: () => undefined,
  clear: () => undefined,
  dispose: () => undefined,
}

/**
 * Build a wallpaper layer over the given document, or a no-op layer when no
 * document exists (SSR/tests).
 * @param doc - document-like object; defaults to the browser document.
 * @returns the wallpaper DOM layer.
 */
const activeLayerOwners = new WeakMap<object, string>()

function layerOwnerId(): string {
  try {
    const cryptoApi = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto
    if (typeof cryptoApi?.randomUUID === 'function') return `layer-${cryptoApi.randomUUID()}`
  } catch { /* fall through */ }
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Build a wallpaper layer with an owner lease. A newer layer for the same
 * document becomes the sole writer; an older controller's cleanup can no longer
 * remove the new instance's stylesheet/overlay (HMR/React overlap safety).
 * @param doc - document-like object.
 * @param ownerId - optional explicit owner id.
 * @returns the wallpaper DOM layer.
 */
export function createWallpaperLayer(doc?: WallpaperDocument | undefined, ownerId?: string): WallpaperLayer {
  const target = doc ?? (typeof document === 'undefined' ? undefined : document as unknown as WallpaperDocument)
  if (target === undefined) return NOOP_LAYER
  const owner = ownerId ?? layerOwnerId()
  activeLayerOwners.set(target, owner)
  const root = (target as unknown as { documentElement?: { setAttribute?: (n: string, v: string) => void; getAttribute?: (n: string) => string | null } }).documentElement
  try { root?.setAttribute?.('data-dsh-livery-layer', owner) } catch { /* fake DOM */ }
  // DOM lease is shared across module copies; the WeakMap is the fake-doc fallback.
  const isActive = (): boolean => {
    if (root?.getAttribute !== undefined) {
      try { return root.getAttribute('data-dsh-livery-layer') === owner } catch { /* fall through */ }
    }
    return activeLayerOwners.get(target) === owner
  }

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

  const syncOverlay = (show: boolean): void => {
    const existing = target.getElementById(WALLPAPER_OVERLAY_ID)
    if (!show) {
      existing?.remove()
      return
    }
    if (existing !== null) return
    const overlay = target.createElement('div')
    overlay.id = WALLPAPER_OVERLAY_ID
    overlay.setAttribute('class', WALLPAPER_OVERLAY_CLASS)
    overlay.setAttribute('data-plugin', PLUGIN_MARKER)
    overlay.setAttribute('aria-hidden', 'true')
    target.body.appendChild(overlay)
  }

  const findDirect = (): WallpaperStyleElement | null => {
    const existing = target.getElementById(WALLPAPER_DIRECT_ID)
    return existing !== null && existing.id === WALLPAPER_DIRECT_ID ? existing : null
  }

  const removeDirect = (): void => {
    findDirect()?.remove()
  }

  let currentDirect: WallpaperDirectImage | undefined
  let fallbackTried = false
  const syncDirect = (direct: WallpaperDirectImage | undefined): void => {
    if (direct === undefined) {
      currentDirect = undefined
      fallbackTried = false
      removeDirect()
      return
    }
    currentDirect = direct
    fallbackTried = false
    let wrapper = findDirect()
    if (wrapper === null) {
      wrapper = target.createElement('div')
      wrapper.id = WALLPAPER_DIRECT_ID
      wrapper.setAttribute('class', WALLPAPER_DIRECT_CLASS)
      wrapper.setAttribute('data-plugin', PLUGIN_MARKER)
      wrapper.setAttribute('aria-hidden', 'true')
      const image = target.createElement('img')
      image.setAttribute('class', `${WALLPAPER_DIRECT_CLASS}__img`)
      image.setAttribute('alt', '')
      image.setAttribute('referrerpolicy', 'no-referrer')
      image.setAttribute('decoding', 'async')
      const imageError = (): void => {
        if (!fallbackTried && currentDirect?.fallbackUrl !== undefined) {
          fallbackTried = true
          image.setAttribute('src', currentDirect.fallbackUrl)
          return
        }
        try {
          wrapper?.setAttribute('data-failed', 'true')
          const targetWindow = (globalThis as unknown as { dispatchEvent?: (event: unknown) => boolean }).dispatchEvent
          const EventCtor = (globalThis as unknown as { CustomEvent?: new (type: string) => unknown }).CustomEvent
          if (typeof targetWindow === 'function' && EventCtor !== undefined) targetWindow(new EventCtor('dsh-livery-wallpaper-error'))
        } catch {
          /* a disposed/fake DOM must not throw from the image handler */
        }
      }
      ;(image as unknown as { onerror?: () => void }).onerror = imageError
      wrapper.appendChild?.(image)
      target.body.appendChild(wrapper)
    }
    const image = (wrapper as unknown as { children?: WallpaperStyleElement[] }).children?.[0]
    image?.setAttribute('src', direct.url)
    wrapper.removeAttribute?.('data-failed')
  }

  const clear = (): void => {
    findStyle()?.remove()
    target.getElementById(WALLPAPER_OVERLAY_ID)?.remove()
    removeDirect()
    target.body.removeAttribute(WALLPAPER_ATTRIBUTE)
  }

  return {
    apply: (css: string, overlay: boolean, direct?: WallpaperDirectImage | undefined) => {
      if (!isActive()) return
      if (css.trim().length === 0) {
        clear()
        return
      }
      const style = ensureStyle()
      if (style.textContent !== css) style.textContent = css
      target.body.setAttribute(WALLPAPER_ATTRIBUTE, '')
      syncOverlay(overlay)
      syncDirect(direct)
    },
    clear: () => {
      if (isActive()) clear()
    },
    dispose: () => {
      if (!isActive()) return
      clear()
      try {
        if (root?.getAttribute?.('data-dsh-livery-layer') === owner) {
          (root as unknown as { removeAttribute?: (name: string) => void }).removeAttribute?.('data-dsh-livery-layer')
        }
      } catch { /* fake DOM */ }
    },
  }
}
