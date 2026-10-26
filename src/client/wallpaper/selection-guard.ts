/**
 * Late-async guard for wallpaper work: only adopt a cached blob when the active
 * selection is still the wallpaper that started the work (A→B ordering).
 */
import type { WallpaperSelection } from '../wallpaper.js'

/**
 * Whether the current selection is still this online wallpaper.
 * @param selection - current controller selection.
 * @param url - URL captured when the async cache started.
 * @returns true only for the same remote URL.
 */
export function isCurrentRemoteSelection(selection: WallpaperSelection, url: string): boolean {
  return selection !== undefined && selection.kind === 'remote' && selection.url === url
}
