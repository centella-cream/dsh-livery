/**
 * English (en-US) UI dictionary for the Livery settings page.
 *
 * This file is the source of truth for the dictionary key union: `LiveryKey`
 * derives from it, and the Chinese dictionary is typed as a complete
 * `Record<LiveryKey, string>`, so a missing or extra key fails to compile.
 *
 * Copy rules (plan §11.2): sentence case, no shouting labels, no literal
 * translation of the Chinese text, buttons stay on one line, explanations ride
 * the supporting line instead of the button.
 */
export const enUS = {
  // Settings section shell / header.
  'section.label': 'Livery',
  'section.title': 'Livery',
  'section.subtitle': 'Choose the colors, type, and safe layout the whole conversation wears.',
  'section.loading': 'Loading liveries…',

  // Sidebar plugin-navigation row + full-page panel.
  'panel.label': 'Livery',
  'panel.title': 'Livery',
  'panel.description': 'Choose the colors, type, and safe layout the whole conversation wears.',

  // Current livery summary card.
  'current.title': 'Current livery',
  'current.stockName': 'Stock appearance',
  'current.stockDescription': 'The built-in DSH look. No livery is applied.',
  'current.applied': 'Applied',
  'current.previewing': 'Previewing {name}',
  'current.incompatible': 'Unavailable on this host',
  'current.degraded': 'Degraded',
  'current.modes': 'Light and dark',
  'current.idLabel': 'ID',
  'current.tagsLabel': 'Tags',
  'current.previewNotice': 'This is only a preview. Apply it to keep it.',

  // Search and tag filters.
  'search.label': 'Search liveries',
  'search.placeholder': 'Search by name, ID, or tag',
  'search.clear': 'Clear search',
  'filter.label': 'Filter by tag',
  'filter.all': 'All',
  'filter.clear': 'Clear filters',
  'filter.none': 'No tags',

  // Gallery.
  'gallery.title': 'Available liveries',
  'gallery.aria': 'Livery gallery',
  'gallery.stockAria': 'Stock appearance card',
  'gallery.count': '{count} liveries',
  'gallery.countOne': '1 livery',
  'gallery.stockCard': 'Stock appearance',
  'gallery.stockDescription': 'No livery: the built-in DSH look.',

  // Search empty state.
  'empty.title': 'No liveries match',
  'empty.body': 'Try a different name, ID, or tag.',
  'empty.action': 'Clear filters',

  // One livery card.
  'card.previewAria': 'Preview {name}',
  'card.applyAria': 'Apply {name}',
  'card.current': 'Current',
  'card.previewing': 'Previewing',
  'card.light': 'Light',
  'card.dark': 'Dark',
  'card.modesAria': 'Supports light and dark',
  'card.unavailable': 'Unavailable',
  'card.unavailableHint': 'A required host capability is missing.',
  'card.thumbnailAlt': '{name} preview in {mode} mode',
  'card.thumbnailError': 'Preview image unavailable',

  // Transient preview bar.
  'preview.title': 'Previewing {name}',
  'preview.body': 'Nothing is saved until you apply it.',
  'preview.apply': 'Apply livery',
  'preview.cancel': 'Cancel preview',

  // Actions.
  'action.restoreStock': 'Restore stock appearance',
  'action.restoreTitle': 'Restore stock appearance',
  'action.restoreBody': 'This applies the built-in DSH look and removes the current livery.',
  'action.restoreConfirm': 'Restore stock',
  'action.cancel': 'Cancel',
  'action.close': 'Close',
  'action.retry': 'Try again',

  // Write feedback.
  'write.applying': 'Applying…',
  'write.refused': 'The host did not accept this livery.',
  'write.transport': 'The host could not be reached.',
  'write.rolledBack': 'The preview was rolled back to the applied livery.',

  // Page states.
  'state.loading': 'Loading liveries…',
  'state.offlineTitle': 'Livery catalog unavailable',
  'state.offlineBody': 'First-frame colors are still active. The gallery needs the local catalog route.',
  'state.incompatibleTitle': 'Incompatible host build',
  'state.incompatibleBody': 'The host and this client disagree on the same contract. Livery stays out of the way and the stock appearance is kept.',
  'state.degradedTitle': 'Degraded livery',
  'state.degradedBody': 'Some capabilities are unavailable, so only the layers that can work safely are applied. Colors keep working.',
  'state.configUnavailable': 'The host is not serving livery settings right now.',
  'state.readOnly': 'This deployment stores settings read-only, so liveries can be previewed but not saved.',
  'state.catalogEmpty': 'No liveries are installed.',

  // Self-check panel.
  'check.title': 'Self-check',
  'check.show': 'Show self-check',
  'check.hide': 'Hide self-check',
  'check.capabilities': 'Host capabilities',
  'check.capabilitiesValue': '{available} of {total} available',
  'check.available': 'Available',
  'check.unavailable': 'Unavailable',
  'check.required': 'Required',
  'check.optional': 'Optional',
  'check.contrast': 'Contrast',
  'check.contrastValue': '{failed} of {total} checks fail',
  'check.contrastPass': 'All {total} checks pass',
  'check.coverage': 'Token coverage',
  'check.coverageValue': '{covered} covered, {inherited} inherited, {missing} missing',
  'check.cssSafety': 'CSS safety',
  'check.pass': 'Pass',
  'check.fail': 'Fail',
  'check.important': '!important rules: {count}',
  'check.hashSelectors': 'Hashed class selectors: {count}',
  'check.elementSelectors': 'Element selectors: {count}',
  'check.remoteUrls': 'Remote URLs: {count}',
  'check.unscopedTokens': 'Unscoped tokens: {count}',
  'check.fixedZIndexes': 'Fixed z-index values: {count}',
  'check.degraded': 'Degraded capabilities',
  'check.none': 'None',
  'check.diagnostics': 'Diagnostics',
  'check.copy': 'Copy diagnostics',
  'check.copied': 'Diagnostics copied',
  'check.copyFailed': 'Could not copy the diagnostics',
  'check.copyFailedHint': 'Select the text below and copy it manually.',
  'check.boot': 'First-frame handshake',
  'check.bootAccepted': 'Accepted',
  'check.bootAbsent': 'No first-frame payload',
  'check.bootRejected': 'Rejected',
  'check.adapter': 'Adapter',
  'check.contract': 'Contract',
  'check.plugin': 'Plugin',
  'check.host': 'Host',
  'check.mode': 'Color mode',
  'check.locale': 'Locale',
  'check.configured': 'Configured livery',
  'check.effective': 'Applied livery',
  'check.catalog': 'Catalog',
  'check.profile': 'Catalog profile',
  'check.catalogLoaded': 'Loaded',
  'check.catalogUnavailable': 'Unavailable',

  // About footer.
  'about.title': 'About',
  'about.plugin': 'DSH Livery {version}',
  'about.contract': 'Contract {hash}',
  'about.adapter': 'Adapter {adapter}',
  'about.note': 'Previews use fixed contract scenes, not live screenshots.',

  // Modes.
  'mode.light': 'Light',
  'mode.dark': 'Dark',

  // Tag labels (stable ids live in the manifests; display names live here).
  'tag.calm': 'Calm',
  'tag.cool': 'Cool',
  'tag.warm': 'Warm',
  'tag.muted': 'Muted',
  'tag.deep': 'Deep',
  'tag.elegant': 'Elegant',
  'tag.neutral': 'Neutral',
  'tag.contrast': 'High contrast',
  'tag.classic': 'Classic',
  'tag.playful': 'Playful',

  // Capability display names (stable ids live in the generated contract).
  'capability.host-density-tokens': 'density',
  'capability.host-transcript-width': 'conversation width',
  'capability.host-message-flow': 'message flow',
  'capability.theme-css': 'theme CSS',
  'capability.host-font-family': 'font family',
  'capability.host-font-role-hooks': 'font role hooks',
  'capability.surface-material': 'surface material',

  // Optional-capability degradation note shown inside the self-check panel.
  'check.optionalInfo': 'Optional layout capabilities are unavailable on this host: {items}. The host layout is used instead.',

  // Keyboard hint.
  'hint.keyboard': 'Use the arrow keys to move between liveries and Enter to preview.',

  // Diagnostics report (copied to the clipboard; technical but still localized).
  'diag.header': 'DSH Livery (dsh-livery) diagnostics',
  'diag.environment': 'Environment',
  'diag.boot': 'First-frame handshake',
  'diag.catalog': 'Catalog',
  'diag.configuration': 'Configuration',
  'diag.capabilities': 'Capabilities',
  'diag.degraded': 'Degraded capabilities',
  'diag.contrast': 'Contrast',
  'diag.coverage': 'Token coverage',
  'diag.cssSafety': 'CSS safety',
  'diag.diagnostics': 'Boot diagnostics',
  'diag.none': '(none)',
  'diag.line': '{label}: {value}',
  'diag.capabilityLine': '{id}: {state}{required}',
  'diag.degradedLine': '{id}: {reason} (fallback: {fallback})',
  'diag.ratio': '{value}:1',
  'diag.count': '{count}',
} as const

/** Union of every dictionary key in the `dsh-livery` locale namespace. */
export type LiveryKey = keyof typeof enUS
