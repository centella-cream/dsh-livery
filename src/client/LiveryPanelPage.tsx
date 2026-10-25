/**
 * Full-page Livery panel for the host's plugin-navigation composition.
 *
 * Mounted as the keyed `main` panel selected by the `sidebar.panellist` row on
 * certified hosts (the same pattern as the Plugins / Scheduled tasks / Context
 * inspector pages). The workspace below the header is shared verbatim with the
 * legacy `settings.section` page, so preview/apply/restore/self-check behavior
 * and the `data-testid` contract are identical in both compositions.
 */
import { useId } from 'react'
import type { LiveryPanelPageProps } from './platform.js'
import { LiveryWorkspace } from './settings/LiveryWorkspace.js'

/**
 * Render the Livery main-panel page.
 * @param props - locale `t` seat (owner props are empty for the keyed slot) and
 * the runtime face.
 * @returns the scrollable full-page panel.
 */
export function LiveryPanelPage({ runtime, t }: LiveryPanelPageProps): JSX.Element {
  const headingId = useId()
  return (
    <div
      className="livery-panel"
      data-testid="livery-panel"
      data-plugin-panel="true"
      aria-labelledby={headingId}
    >
      <header className="livery-panel__head">
        <h1 id={headingId} className="livery-panel__title">{t('panel.title')}</h1>
        <p className="livery-panel__description">{t('panel.description')}</p>
      </header>
      <div className="livery-panel__body">
        <LiveryWorkspace t={t} runtime={runtime} />
      </div>
    </div>
  )
}
