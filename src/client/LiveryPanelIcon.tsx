/**
 * Sidebar row icon for the Livery global panel.
 *
 * The shell owns the row button and its accessible name (resolved from the
 * registered `label` thunk); this component draws only the glyph and honors the
 * row's requested geometry/selected state. Inline SVG, no external requests.
 */

/** A palette glyph: outline body + three colour wells + a handle dot. */
export function LiveryPanelIcon({ size, active }: { readonly size: number; readonly active: boolean }): JSX.Element {
  return (
    <svg
      className="livery-panel-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 1.3-3.03 1.8 1.8 0 0 1 1.3-3.05H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="6.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.2" cy="7.4" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
