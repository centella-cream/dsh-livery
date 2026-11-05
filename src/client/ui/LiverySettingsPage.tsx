/**
 * The Livery settings page: the fallback composition used only on hosts that do
 * not declare the plugin panel-navigation slots (`sidebar.panellist` + keyed
 * `main`). Certified hosts get the full-page `LiveryPanelPage` from the sidebar
 * instead; this page keeps the same workspace and `data-testid` contract so the
 * feature behaves identically wherever it is mounted.
 */
import { useId } from 'react'
import { LIVERY_VERSION } from '../../core/types.js'
import type { LiverySettingsPageProps } from '../platform.js'
import { LiveryWorkspace } from './LiveryWorkspace.js'

/**
 * Render the Livery settings page (legacy Settings-section composition).
 * @param props - owner `{close}`, locale `t` seat, and the runtime face.
 * @returns the settings section.
 */
export function LiverySettingsPage({ runtime, t }: LiverySettingsPageProps): JSX.Element {
  const headingId = useId()
  return (
    <section className="livery-settings" aria-labelledby={headingId}>
      <header className="livery-head">
        <div className="livery-title-row">
          <h2 id={headingId} className="livery-title">{t('section.title')}</h2>
          <span className="livery-version" data-testid="livery-version" title={`dsh-livery v${LIVERY_VERSION}`}>v{LIVERY_VERSION}</span>
        </div>
        <p className="livery-subtitle">{t('section.subtitle')}</p>
      </header>
      <LiveryWorkspace t={t} runtime={runtime} />
    </section>
  )
}
