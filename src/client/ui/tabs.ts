/**
 * Page-tab memory for the visual-studio workspace.
 *
 * The active tab is a pure view preference, so it must survive workspace
 * remounts/navigation. It is kept at module scope (instant, synchronous) and
 * mirrored best-effort into `sessionStorage` so an in-app navigation or a
 * remount restores the tab the user left. Selecting a wallpaper never writes
 * here; only explicit tab clicks do.
 */
export type PageTab = 'style' | 'wallpaper'

/** sessionStorage key mirroring the remembered tab for the browser session. */
export const PAGE_TAB_STORAGE_KEY = 'dsh-livery.page-tab.v1'

let remembered: PageTab | undefined

function isPageTab(value: unknown): value is PageTab {
  return value === 'style' || value === 'wallpaper'
}

function readSession(): PageTab | undefined {
  try {
    if (typeof sessionStorage === 'undefined') return undefined
    const stored = sessionStorage.getItem(PAGE_TAB_STORAGE_KEY)
    return isPageTab(stored) ? stored : undefined
  } catch {
    return undefined
  }
}

/**
 * The tab to restore on mount: module memory first, then sessionStorage.
 * @returns the remembered page tab, or undefined for the default.
 */
export function rememberedPageTab(): PageTab | undefined {
  return remembered ?? readSession()
}

/**
 * Remember an explicit tab click (module scope + best-effort sessionStorage).
 * @param tab - newly active page tab.
 */
export function rememberPageTab(tab: PageTab): void {
  remembered = tab
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(PAGE_TAB_STORAGE_KEY, tab)
  } catch {
    /* storage can be disabled; module memory still covers this page session */
  }
}

/** Test seam: forget the remembered tab (module memory + sessionStorage mirror). */
export function resetRememberedPageTab(): void {
  remembered = undefined
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(PAGE_TAB_STORAGE_KEY)
  } catch {
    /* nothing to clear when storage is unavailable */
  }
}
