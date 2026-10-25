/**
 * One-shot automatic random batch for the online wallpaper card.
 *
 * Opening the wallpaper tab should show a random batch immediately, but effect
 * slider changes (which re-render the panel) must never re-trigger a request.
 * The loader is created once per mount and its trigger is idempotent; tests can
 * inject the random-page source instead of touching the network.
 */
export interface AutoRandomLoader {
  /** Fire the single automatic batch (no-op on later calls). */
  trigger(): void
}

/**
 * Build an idempotent one-shot loader.
 * @param load - starts one random batch for the given page.
 * @param randomPage - page source (1-based); injectable for tests.
 * @returns the loader whose trigger fires exactly once.
 */
export function createAutoRandomLoader(
  load: (page: number) => void,
  randomPage: () => number = () => Math.floor(Math.random() * 8) + 1,
): AutoRandomLoader {
  let fired = false
  return {
    trigger: () => {
      if (fired) return
      fired = true
      load(randomPage())
    },
  }
}
