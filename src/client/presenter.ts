/**
 * The one owner of every DOM write in the client bundle.
 *
 * Rules:
 * - Writes only Livery-owned style elements (`#dsh-livery-*`, marked with
 *   `data-plugin="dsh-livery"`, which the DSH kernel reclaims on disable/HMR)
 *   and the two public body attributes (`data-dsh-livery`,
 *   `data-dsh-livery-hash`).
 * - Never touches `data-ds-*` (host theme presenter's domain), never uses a
 *   `MutationObserver`, never reads layout.
 * - A presentation batch is synchronous: at most one style-text assignment and
 *   the attribute update happen in the same task (implementation-plan.md §6.3).
 */
import {
  BODY_ATTRIBUTE,
  BOOT_STYLE_ID,
  HASH_ATTRIBUTE,
  PLUGIN_MARKER,
  PREVIEW_STYLE_ID,
  TOKEN_STYLE_ID,
} from '../core/types.js'

/** One fully resolved skin presentation. */
export interface SkinCss {
  /** Livery id, or `stock` for "no livery". */
  readonly id: string
  /** Complete stylesheet text ('' for stock). */
  readonly cssText: string
  /** `hashCss(cssText)`; '' for stock. */
  readonly hash: string
}

/** Recorded style element marker of the client-owned stylesheet. */
export const CLIENT_CSS_FILE = 'dsh-livery/client.css'
const TOKEN_CSS_FILE = 'dsh-livery/tokens.css'
const PREVIEW_CSS_FILE = 'dsh-livery/preview.css'

/** Inspectable presenter state (used by unit tests and the self-check). */
export interface PresenterSnapshot {
  /** Number of skin stylesheet text assignments so far (0 after adoption). */
  readonly cssTextWrites: number
  /** The host boot style element was renamed into the client-owned token style. */
  readonly adoptedBootStyle: boolean
  readonly tokenStylePresent: boolean
  readonly previewStylePresent: boolean
  readonly bootStylePresent: boolean
  readonly bodyId: string | null
  readonly bodyHash: string | null
}

/** All DOM writes the runtime may perform. */
export interface Presenter {
  /** Mount the settings-page stylesheet; returns an idempotent disposer. */
  installClientCss(css: string): () => void
  /** Rename the host boot style into the client-owned token style without rewriting its text. */
  adoptBootStyle(skin: SkinCss): boolean
  /** Apply one confirmed skin in a single synchronous batch. */
  applyConfirmed(skin: SkinCss): void
  /** Apply one transient preview skin (separate style + body attribute). */
  applyPreview(skin: SkinCss): void
  /** Drop the preview and restore the confirmed presentation. */
  rollbackPreview(confirmed: SkinCss | undefined): void
  /** Remove every owned style and attribute (stock appearance). */
  clearSkin(): void
  /** Fail-closed handshake cleanup: remove only the host boot artifacts we can see. */
  removeBootArtifacts(): void
  /** Full teardown; leaves no Livery-owned node or attribute behind. */
  dispose(): void
  snapshot(): PresenterSnapshot
}

function asStyle(element: Element | null): HTMLStyleElement | null {
  return element !== null && element.tagName === 'STYLE' ? (element as HTMLStyleElement) : null
}

/**
 * Build the DOM presenter.
 * @param doc - document to write into; defaults to the browser document and is
 * injectable so the runtime can be unit-tested without a DOM.
 * @returns the presenter face.
 */
export function createPresenter(
  doc: Document | undefined = typeof document === 'undefined' ? undefined : document,
): Presenter {
  let cssTextWrites = 0
  let adoptedBootStyle = false

  const head = (): HTMLElement | undefined => doc?.head ?? undefined
  const body = (): HTMLElement | undefined => doc?.body ?? undefined
  const byId = (id: string): HTMLStyleElement | null => asStyle(doc?.getElementById(id) ?? null)
  const bootStyle = (): HTMLStyleElement | null => byId(BOOT_STYLE_ID)

  function setText(element: HTMLStyleElement, text: string): void {
    if (element.textContent === text) return
    element.textContent = text
    cssTextWrites += 1
  }

  function createOwnedStyle(id: string, cssFile: string): HTMLStyleElement | undefined {
    const parent = head()
    if (parent === undefined) return undefined
    const element = doc!.createElement('style')
    element.id = id
    element.dataset.plugin = PLUGIN_MARKER
    element.dataset.pluginCss = cssFile
    parent.appendChild(element)
    return element
  }

  function ensureTokenStyle(): HTMLStyleElement | undefined {
    return byId(TOKEN_STYLE_ID) ?? createOwnedStyle(TOKEN_STYLE_ID, TOKEN_CSS_FILE)
  }

  function ensurePreviewStyle(): HTMLStyleElement | undefined {
    const existing = byId(PREVIEW_STYLE_ID)
    if (existing !== null) return existing
    const parent = head()
    if (parent === undefined) return undefined
    const element = doc!.createElement('style')
    element.id = PREVIEW_STYLE_ID
    element.dataset.plugin = PLUGIN_MARKER
    element.dataset.pluginCss = PREVIEW_CSS_FILE
    // Preview must win over the confirmed token sheet: append directly after it
    // when present, otherwise at the end of head.
    const token = byId(TOKEN_STYLE_ID)
    if (token !== null && token.parentNode === parent) {
      token.insertAdjacentElement('afterend', element)
    } else {
      parent.appendChild(element)
    }
    return element
  }

  function setBodySkin(id: string | null, hash: string | null): void {
    const target = body()
    if (target === undefined) return
    if (id === null) {
      target.removeAttribute(BODY_ATTRIBUTE)
    } else {
      target.setAttribute(BODY_ATTRIBUTE, id)
    }
    if (hash === null || hash.length === 0) {
      target.removeAttribute(HASH_ATTRIBUTE)
    } else {
      target.setAttribute(HASH_ATTRIBUTE, hash)
    }
  }

  function removeElement(element: Element | null): void {
    element?.remove()
  }

  return {
    installClientCss(css: string): () => void {
      const existing = doc?.querySelector(`style[data-plugin-css="${CLIENT_CSS_FILE}"]`) ?? null
      if (existing !== null) {
        // The kernel already owns an identical tag (HMR re-materialization);
        // never remove a tag we did not create.
        return () => undefined
      }
      const parent = head()
      if (parent === undefined) return () => undefined
      const element = doc!.createElement('style')
      element.dataset.plugin = PLUGIN_MARKER
      element.dataset.pluginCss = CLIENT_CSS_FILE
      element.textContent = css
      parent.appendChild(element)
      return () => {
        removeElement(element)
      }
    },

    adoptBootStyle(skin: SkinCss): boolean {
      const element = bootStyle()
      if (element === null) return false
      element.id = TOKEN_STYLE_ID
      element.dataset.plugin = PLUGIN_MARKER
      element.dataset.pluginCss = TOKEN_CSS_FILE
      adoptedBootStyle = true
      // Attribute writes only; the host bootstrap script normally already set
      // these. No CSS text is touched on this path.
      setBodySkin(skin.id, skin.hash)
      return true
    },

    applyConfirmed(skin: SkinCss): void {
      if (skin.id === 'stock' || skin.cssText.length === 0) {
        this.clearSkin()
        return
      }
      // A stale boot element (host first frame for a different configured
      // livery) would otherwise keep a second scope alive.
      removeElement(bootStyle())
      const token = ensureTokenStyle()
      if (token !== undefined) setText(token, skin.cssText)
      removeElement(byId(PREVIEW_STYLE_ID))
      setBodySkin(skin.id, skin.hash)
    },

    applyPreview(skin: SkinCss): void {
      if (skin.id === 'stock' || skin.cssText.length === 0) {
        removeElement(byId(PREVIEW_STYLE_ID))
        setBodySkin(null, null)
        return
      }
      removeElement(bootStyle())
      const preview = ensurePreviewStyle()
      if (preview !== undefined) setText(preview, skin.cssText)
      setBodySkin(skin.id, skin.hash)
    },

    rollbackPreview(confirmed: SkinCss | undefined): void {
      removeElement(byId(PREVIEW_STYLE_ID))
      if (confirmed === undefined || confirmed.id === 'stock' || confirmed.cssText.length === 0) {
        setBodySkin(null, null)
        return
      }
      const token = ensureTokenStyle()
      if (token !== undefined) setText(token, confirmed.cssText)
      setBodySkin(confirmed.id, confirmed.hash)
    },

    clearSkin(): void {
      removeElement(byId(TOKEN_STYLE_ID))
      removeElement(byId(PREVIEW_STYLE_ID))
      removeElement(bootStyle())
      setBodySkin(null, null)
    },

    removeBootArtifacts(): void {
      removeElement(bootStyle())
      setBodySkin(null, null)
    },

    dispose(): void {
      this.clearSkin()
    },

    snapshot(): PresenterSnapshot {
      return {
        cssTextWrites,
        adoptedBootStyle,
        tokenStylePresent: byId(TOKEN_STYLE_ID) !== null,
        previewStylePresent: byId(PREVIEW_STYLE_ID) !== null,
        bootStylePresent: bootStyle() !== null,
        bodyId: body()?.getAttribute(BODY_ATTRIBUTE) ?? null,
        bodyHash: body()?.getAttribute(HASH_ATTRIBUTE) ?? null,
      }
    },
  }
}
