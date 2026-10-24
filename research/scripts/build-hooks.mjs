#!/usr/bin/env node
/**
 * Build research/public-hooks.json — the public-ish DOM contract a theme plugin
 * may rely on: body/html attributes, layout state attributes, panel states,
 * custom-property hooks, and z-index layers.
 *
 * Provenance per hook:
 *   documented     — named in a shipped package README (cited file:line)
 *   observed-only  — only present in built CSS/JS, no README contract
 * Built evidence is cited as package-relative path:line.
 */
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE = '/Users/ryanzhang/Personal/openprojects/dsh-livery';
const PKG = '@deepseek-ai';
const L = (pkg, file, line) => `${PKG}/${pkg}/lib/${file}:${line}`;

const tokens = JSON.parse(fs.readFileSync(path.join(WORKSPACE, 'research/tokens.json'), 'utf8'));

const documentedTheme = `${PKG}/dsh-client-ui-theme/README.md`;
const documentedLayout = `${PKG}/dsh-client-ui-layout/README.md`;
const documentedSidebar = `${PKG}/dsh-client-ui-sidebar/README.md`;
const documentedSidebarRight = `${PKG}/dsh-client-ui-sidebar-right/README.md`;
const documentedPrimitives = `${PKG}/dsh-client-ui-primitives/README.md`;
const documentedConversation = `${PKG}/dsh-client-ui-conversation/README.md`;

const bodyAttributes = [
  {
    name: 'data-ds-dark-theme',
    element: 'body',
    values: 'present (empty string) = dark palette; absent = light palette',
    owner: '@deepseek-ai/dsh-client-ui-layout (ThemePresenter) + ui-theme boot script',
    provenance: 'documented',
    publicContract: true,
    sources: [`${documentedTheme}:40`, `${documentedLayout}:45`, `${documentedTheme}:58`],
    builtEvidence: [
      L('dsh-client-ui-layout', 'client.js', 499),
      L('dsh-client-ui-layout', 'client.js', 537),
      L('dsh-client-ui-theme', 'index.js', 55),
    ],
    notes:
      'Single switch for the whole dark palette: every dark token declaration is scoped to body[data-ds-dark-theme]. Written before first paint by the injected body script and afterwards by the layout presenter; a theme plugin must not toggle it itself.',
  },
];

const elementAttributes = [
  {
    name: 'data-platform',
    element: 'html',
    values: 'darwin (only value observed in shipped CSS)',
    owner: 'Electron/desktop preload (not set by web packages)',
    provenance: 'documented',
    publicContract: true,
    sources: [`${documentedLayout}:37`, `${documentedSidebar}:52`],
    builtEvidence: [
      L('dsh-client-ui-layout', 'client.js', 73),
      L('dsh-client-ui-sidebar', 'client.js', 91),
      L('dsh-client-ui-sidebar-right', 'client.js', 5409),
    ],
    notes:
      'macOS desktop chrome branch: collapsed sidebar hides the column, leading seat clearance, 52px sidebar top strip. Third-party plugins may branch on it, but must keep the light/dark palette independent.',
  },
  {
    name: 'data-windows-titlebar',
    element: 'html',
    values: 'boolean marker (present)',
    owner: 'Windows Electron shell',
    provenance: 'documented',
    publicContract: true,
    sources: [`${documentedLayout}:39`, `${documentedLayout}:41`],
    builtEvidence: [
      L('dsh-client-ui-layout', 'client.js', 73),
      L('dsh-client-ui-sidebar', 'client.js', 91),
      L('dsh-client-ui-sidebar-right', 'client.js', 5409),
    ],
    notes:
      'Reserves the caption strip above all columns, publishes --dsh-windows-titlebar-height / --dsh-windows-content-radius / --dsh-windows-sidebar-width, and removes the collapsed rail.',
  },
  {
    name: 'data-ds-theme-source',
    element: 'html',
    values: 'light | dark | system',
    owner: '@deepseek-ai/dsh-client-ui-layout (ThemePresenter) + ui-theme boot script',
    provenance: 'observed-only',
    publicContract: false,
    sources: ['code comment: @deepseek-ai/dsh-client-ui-layout/lib/client.js:502-508'],
    builtEvidence: [L('dsh-client-ui-layout', 'client.js', 509), L('dsh-client-ui-layout', 'client.js', 535), L('dsh-client-ui-theme', 'index.js', 54)],
    notes:
      'Resolved palette source for host shells: the Electron preload mirrors it into nativeTheme.themeSource. Value is "system" only while the preference is system, otherwise the resolved scheme. Not mentioned in any README.',
  },
  {
    name: 'data-input-modality',
    element: 'html',
    values: 'pointer | keyboard',
    owner: '@deepseek-ai/dsh-client-ui-primitives (input-modality)',
    provenance: 'documented',
    publicContract: true,
    sources: [`${documentedPrimitives}:152`],
    builtEvidence: [L('dsh-client-ui-primitives', 'index.js', 4589), L('dsh-client-ui-theme', 'client.js', 1151)],
    notes:
      'Focus-ring visibility switch: html[data-input-modality=pointer] body :focus-visible:not(:read-write) makes the ring transparent. A theme that paints focus rings must respect it.',
  },
  {
    name: 'data-fullscreen',
    element: 'html',
    values: 'boolean marker (present)',
    owner: 'desktop shell (no writer in the installed web packages)',
    provenance: 'observed-only',
    publicContract: false,
    sources: [],
    builtEvidence: [
      L('dsh-client-ui-layout', 'client.js', 73),
      L('dsh-client-ui-sidebar', 'client.js', 91),
      L('dsh-client-ui-sidebar-right', 'client.js', 5409),
    ],
    notes: 'Native fullscreen: frame overlay top drops to 20px, leading clearance 84px, sidebar top strip left-aligns.',
  },
  {
    name: 'data-window-drag',
    element: 'any window-chrome row',
    values: 'boolean marker (present)',
    owner: '@deepseek-ai/dsh-client-ui-layout / ui-sidebar chrome rows',
    provenance: 'documented',
    publicContract: true,
    sources: [`${documentedLayout}:37`, `${documentedSidebar}:52`],
    builtEvidence: [L('dsh-client-ui-sidebar', 'client.js', 303), L('dsh-client-ui-sidebar', 'client.js', 308)],
    notes:
      'ui-web base.css turns this mark into the single darwin -webkit-app-region: drag rule, so the marked row own box is the draggable geometry. New chrome rows in a theme should carry it.',
  },
  {
    name: 'data-sidebar-collapsed',
    element: 'frame element (AppFrame root div)',
    values: 'true when collapsed; attribute omitted otherwise',
    owner: '@deepseek-ai/dsh-client-ui-layout',
    provenance: 'observed-only',
    publicContract: false,
    sources: [],
    builtEvidence: [L('dsh-client-ui-layout', 'client.js', 322), L('dsh-client-ui-sidebar', 'client.js', 91)],
    notes:
      'Carries layout state, not only styling: ui-sidebar queries html[data-windows-titlebar]:has([data-sidebar-collapsed=true]) to shift --dsh-windows-menu-start. Value is the literal string "true".',
  },
  {
    name: 'data-rightbar-collapsed',
    element: 'frame element',
    values: 'true when the right column width is 0',
    owner: '@deepseek-ai/dsh-client-ui-layout',
    provenance: 'observed-only',
    publicContract: false,
    sources: [],
    builtEvidence: [L('dsh-client-ui-layout', 'client.js', 323)],
    notes: 'Set when cols.rightbar === 0 (closed or fullscreen with no track).',
  },
  {
    name: 'data-rightbar-fullscreen',
    element: 'frame element',
    values: 'true while the right panel covers the viewport',
    owner: '@deepseek-ai/dsh-client-ui-layout',
    provenance: 'observed-only',
    publicContract: false,
    sources: [`${documentedSidebarRight}:44`],
    builtEvidence: [L('dsh-client-ui-layout', 'client.js', 324)],
    notes: 'Suppresses grid/handle transitions; pairs with data-sidebar-right-panel="fullscreen" on the panel itself.',
  },
  {
    name: 'data-rightbar-instant',
    element: 'frame element',
    values: 'true during instant geometry switches',
    owner: '@deepseek-ai/dsh-client-ui-layout',
    provenance: 'observed-only',
    publicContract: false,
    sources: [],
    builtEvidence: [L('dsh-client-ui-layout', 'client.js', 325)],
    notes: 'Transition-free switch marker (also covers drags).',
  },
  {
    name: 'data-animating',
    element: 'frame element',
    values: 'true while a discrete open/close animates',
    owner: '@deepseek-ai/dsh-client-ui-layout',
    provenance: 'documented',
    publicContract: true,
    sources: [`${documentedLayout}:94`],
    builtEvidence: [L('dsh-client-ui-layout', 'client.js', 327)],
    notes: 'Track transition and occupant slide share --ds-transition-duration-slow / --ds-ease-in-out only while this marker is present.',
  },
  {
    name: 'data-dragging',
    element: 'frame element and conversation width handle',
    values: 'boolean marker (present)',
    owner: '@deepseek-ai/dsh-client-ui-layout / ui-conversation',
    provenance: 'observed-only',
    publicContract: false,
    sources: [],
    builtEvidence: [L('dsh-client-ui-layout', 'client.js', 326), L('dsh-client-ui-layout', 'client.js', 198), L('dsh-client-ui-conversation', 'client.js', 15897)],
    notes: 'Disables transitions during column/panel drags; raises the handle (z-index 8).',
  },
  {
    name: 'data-shell-overlay',
    element: 'frame overlay layer div',
    values: 'boolean marker (present)',
    owner: '@deepseek-ai/dsh-client-ui-layout',
    provenance: 'observed-only',
    publicContract: false,
    sources: [],
    builtEvidence: [L('dsh-client-ui-layout', 'client.js', 345)],
    notes: 'Full-viewport modal/menu layer above the frame (z-index 20), below menus/modals from primitives.',
  },
  {
    name: 'data-shell-leading',
    element: 'frame leading-seat div',
    values: 'boolean marker (present)',
    owner: '@deepseek-ai/dsh-client-ui-layout',
    provenance: 'observed-only',
    publicContract: false,
    sources: [`${documentedLayout}:37`],
    builtEvidence: [L('dsh-client-ui-layout', 'client.js', 350)],
    notes: 'MacOS-only seat beside the traffic lights; while mounted the frame publishes --dsh-frame-leading-clearance.',
  },
  {
    name: 'data-menu-material',
    element: 'menu surface root div',
    values: 'translucent',
    owner: '@deepseek-ai/dsh-client-ui-primitives (MenuSurface)',
    provenance: 'observed-only',
    publicContract: false,
    sources: [],
    builtEvidence: [`${PKG}/dsh-client-ui-primitives/lib/index.js:3792`],
    notes:
      'Theme CSS hooks the dark stroke rebind on it: body[data-ds-dark-theme] [data-menu-material] sets --dsw-elevation-stroke-color to border-l3. Menus also paint --dsw-menu-surface-fill and --dsw-menu-backdrop-filter.',
  },
  {
    name: 'data-dsh-automatic-focus',
    element: 'focused control (primitives focus helper)',
    values: 'boolean marker (present while programmatic focus is active)',
    owner: '@deepseek-ai/dsh-client-ui-primitives',
    provenance: 'documented',
    publicContract: true,
    sources: [`${documentedTheme}:66`],
    builtEvidence: [`${PKG}/dsh-client-ui-primitives/lib/index.js:3660`, L('dsh-client-ui-theme', 'client.js', 1142)],
    notes: 'base.css suppresses only the outline for this marker; borders, shadows and error states stay intact.',
  },
];

const sidePanelStates = [
  {
    attribute: 'data-sidebar-right-panel',
    values: ['push', 'fullscreen'],
    element: 'right panel root',
    owner: '@deepseek-ai/dsh-client-ui-sidebar-right',
    provenance: 'documented',
    sources: [`${documentedSidebarRight}:42-46`, `${documentedSidebarRight}:48`],
    builtEvidence: [L('dsh-client-ui-sidebar-right', 'client.js', 5681), L('dsh-client-ui-sidebar-right', 'client.js', 5409)],
    notes:
      'The two presentations: push = the panel occupies the frame\'s right track and the conversation makes room; fullscreen = covers the viewport while the wide-screen columns stay underneath. Opened below 768px uses fullscreen automatically. The same element sets --dsh-sidebar-width (100vw when fullscreen).',
  },
  {
    attribute: 'data-sidebar-right-open',
    values: ['present (true)', 'absent'],
    element: 'right panel root',
    owner: '@deepseek-ai/dsh-client-ui-sidebar-right',
    provenance: 'observed-only',
    sources: [`${documentedSidebarRight}:70`],
    builtEvidence: [L('dsh-client-ui-sidebar-right', 'client.js', 78), L('dsh-client-ui-sidebar-right', 'client.js', 5682)],
    notes: 'Expansion state (the column is expanded and the panel is visible); drives the slide-in of dock content.',
  },
  {
    attribute: 'data-sidebar-right-unavailable',
    values: ['boolean marker (present)'],
    element: 'right panel root',
    owner: '@deepseek-ai/dsh-client-ui-sidebar-right',
    provenance: 'observed-only',
    sources: [],
    builtEvidence: [L('dsh-client-ui-sidebar-right', 'client.js', 5582)],
    notes: 'No room for the requested track; the occupant closes deterministically.',
  },
  {
    attribute: 'data-sidebar-right-mode',
    values: ['push', 'fullscreen'],
    element: 'presentation-switch button',
    owner: '@deepseek-ai/dsh-client-ui-sidebar-right',
    provenance: 'observed-only',
    sources: [],
    builtEvidence: [L('dsh-client-ui-sidebar-right', 'client.js', 5643)],
    notes: 'Value is the *next* presentation the button will switch to, not the current one.',
  },
  {
    attribute: 'data-dockkit-host',
    values: ['dock', 'float'],
    element: 'dock host containers inside the right panel',
    owner: '@deepseek-ai/dsh-client-ui-dockkit (via ui-sidebar-right)',
    provenance: 'observed-only',
    sources: [`${documentedSidebarRight}:34`, `${documentedSidebarRight}:48`],
    builtEvidence: [L('dsh-client-ui-sidebar-right', 'client.js', 5409)],
    notes: 'Dock = the split tree in the panel; float = independent floating panes. Floats reorder inside a fixed stacking layer (float layer 60 vs dock 10/40) and do not rise above menus.',
  },
  {
    attribute: 'data-dockkit-pane / data-dockkit-float',
    values: ['pane id (string)'],
    element: 'dock panes and floating panes',
    owner: '@deepseek-ai/dsh-client-ui-dockkit',
    provenance: 'observed-only',
    sources: [],
    builtEvidence: [L('dsh-client-ui-sidebar-right', 'client.js', 48), L('dsh-client-ui-sidebar-right', 'client.js', 76)],
    notes: 'Used by sidebar-right to resolve the focused pane (closest("[data-dockkit-pane], [data-dockkit-float]")). Also data-dockkit-pane-active / data-dockkit-float-active markers.',
  },
  {
    attribute: 'data-dockkit-column / data-dockkit-empty / data-dockkit-divider',
    values: ['0 | 1', 'boolean', 'boolean'],
    element: 'dock split columns, empty panes, dividers',
    owner: '@deepseek-ai/dsh-client-ui-dockkit',
    provenance: 'observed-only',
    sources: [],
    builtEvidence: [L('dsh-client-ui-sidebar-right', 'client.js', 5409)],
    notes: 'Windows fullscreen radius targets [data-dockkit-column="0"][data-dockkit-pane]; darwin strip inset targets [data-dockkit-host=dock][data-dockkit-column="0"|"1"].',
  },
];

const zIndexLayers = [
  { layer: 'conversation tabs', value: 1, source: L('dsh-client-ui-conversation', 'client.js', 15797) },
  { layer: 'conversation composer seat', value: 7, source: L('dsh-client-ui-conversation', 'client.js', 15797) },
  { layer: 'conversation width handle (dragging)', value: 8, source: L('dsh-client-ui-conversation', 'client.js', 15797) },
  { layer: 'conversation composer with open trigger menu', value: 9, source: L('dsh-client-ui-conversation', 'client.js', 15797) },
  { layer: 'frame drag handle', value: 11, source: L('dsh-client-ui-layout', 'client.js', 73) },
  { layer: 'frame leading (macOS traffic-light) seat', value: 15, source: L('dsh-client-ui-layout', 'client.js', 73) },
  { layer: 'frame overlay layer (menus, modal masks)', value: 20, source: L('dsh-client-ui-layout', 'client.js', 73) },
  { layer: 'windows caption toggles', value: 30, source: L('dsh-client-ui-sidebar', 'client.js', 91) },
  { layer: 'dockkit dock panes (normal / fullscreen)', value: '10 / 40', source: L('dsh-client-ui-sidebar-right', 'client.js', 5409) },
  { layer: 'dockkit floating panes', value: 60, source: L('dsh-client-ui-sidebar-right', 'client.js', 5409) },
  { layer: 'menus / tooltips / hover cards / trigger menu', value: '100-101', source: `${PKG}/dsh-client-ui-primitives/lib/Menu.module.css`, note: 'Hardcoded in primitives, not a token.' },
  { layer: 'modal / image lightbox', value: '1000', source: `${PKG}/dsh-client-ui-primitives/lib/Modal.module.css`, note: 'Hardcoded.' },
  { layer: 'toast / tooltip top layer', value: '1100', source: `${PKG}/dsh-client-ui-primitives/lib/Toast.module.css`, note: 'Hardcoded.' },
];

function groupOf(name) {
  if (name.startsWith('--dsh-content-font')) return 'content-typography';
  if (name.startsWith('--dsh-scrollbar')) return 'scrollbar';
  if (/^--dsh-(frame|windows)-/.test(name)) return 'frame-chrome';
  if (name.startsWith('--dsh-dockkit') || name === '--dsh-sidebar-width') return 'right-panel';
  if (name.startsWith('--dsh-sidebar') || name.startsWith('--dsh-session-list')) return 'sidebar';
  if (name.startsWith('--dsh-composer')) return 'composer';
  if (/^--dsh-(chat|conversation)-/.test(name)) return 'conversation';
  if (name.startsWith('--dsh-trajectory')) return 'trajectory';
  if (name.startsWith('--dsh-boot')) return 'boot-first-paint';
  if (name.startsWith('--dsh-file-type')) return 'file-type';
  return 'other';
}

const variables = tokens.dshVariables
  .filter((v) => v.visibility !== 'component-internal')
  .map((v) => ({
    name: v.name,
    group: groupOf(v.name),
    tier: v.visibility,
    declarations: v.declarations.slice(0, 3),
    documentedAt: v.documentedAt,
    provenance: v.provenance,
    notes: v.notes,
  }));

const rebindableVariables = [
  {
    name: '--dsw-focus-ring-color',
    declared: false,
    readAt: `${PKG}/dsh-client-ui-theme/lib/client.js:1151 (focus.css: :focus-visible { outline-color: var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)) })`,
    provenance: 'documented',
    sources: [`${documentedTheme}:60`, `${documentedTheme}:62`],
    notes:
      'Never declared globally: components rebind it per control (108 reads across shipped bundles). Light resolves to #4176E6 and dark to #7AAAFF through the fallback alias. In pointer modality the theme rule sets it to transparent; a theme must keep the fallback expression so rebinding still works.',
  },
  {
    name: '--dsw-elevation-stroke-color',
    declared: true,
    readAt: `${PKG}/dsh-client-ui-theme/lib/client.js:1160 (gradient-shadow-text.css)`,
    provenance: 'documented',
    sources: [`${documentedTheme}:78`],
    notes:
      'Rebindable per elevated surface so the 0.5px hairline picks up the surface own border colour; dark menus rebind it to --dsw-alias-border-l3 under body[data-ds-dark-theme] [data-menu-material].',
  },
  {
    name: '--dsw-menu-surface-fill',
    declared: true,
    readAt: `${PKG}/dsh-client-ui-theme/lib/client.js:1148 (design-platform.css body)`,
    provenance: 'documented',
    sources: [`${documentedTheme}:47`, `${documentedTheme}:78`],
    notes:
      'Menu material contract: #f8f9fa94 light / #43454a73 dark (94%/45% alpha). Shared menus must keep it; --dsw-menu-backdrop-filter: blur(40px) saturate(150%) is applied by elevated surfaces that paint --dsw-specific-menu.',
  },
  {
    name: '--dsw-hovercard-bg',
    declared: false,
    readAt: `${PKG}/dsh-client-ui-primitives/lib/HoverCard.module.css:10 (--dsw-hovercard-bg: #2C2C2E)`,
    provenance: 'observed-only',
    sources: [],
    notes:
      'Gap: hover cards hardcode a dark fill in the component stylesheet, so they stay dark in light mode and ignore every palette token. A theme cannot fix this by overriding a token (the declaration is local); it needs a component-level override.',
  },
  {
    name: '--dsh-menu-anchor',
    declared: false,
    readAt: `${PKG}/dsh-client-ui-primitives/lib/index.js:3789 (inline style on the menu surface)`,
    provenance: 'observed-only',
    sources: [],
    notes: 'Per-menu anchor custom property pair (--dsh-menu-<id>); positioning detail, not a theming hook.',
  },
];

const out = {
  $schema: 'research/public-hooks.schema.json',
  generatedAt: new Date().toISOString(),
  target: tokens.target,
  conventions: {
    darkMode:
      'body[data-ds-dark-theme] is the only palette switch. html carries color-scheme and data-ds-theme-source; the presenter writes inline --dsw-* overrides on body after the stylesheet values.',
    thirdPartyExtension:
      'The supported override seam is ctx.theme.register({id, colorScheme, tokens}) / ctx.theme.overrideTokens(source, tokens) with {light,dark} pairs — not DOM attribute writes. See @deepseek-ai/dsh-client-ui-theme/lib/client.js:1339-1520.',
    provenanceLegend: {
      documented: 'Named in a shipped package README (source cited).',
      'observed-only': 'Present only in compiled CSS/JS; no README contract, may change without notice.',
    },
  },
  bodyAttributes,
  elementAttributes,
  layoutStateAttributes: elementAttributes.filter((a) =>
    ['data-sidebar-collapsed', 'data-rightbar-collapsed', 'data-rightbar-fullscreen', 'data-rightbar-instant', 'data-animating', 'data-dragging', 'data-shell-overlay', 'data-shell-leading'].includes(a.name),
  ),
  sidePanelStates,
  zIndexLayers,
  variables,
  rebindableVariables,
  notes: [
    'Only body[data-ds-dark-theme] is a stable, documented theming switch; everything else in layoutStateAttributes is an implementation detail of ui-layout.',
    'Right-panel presentation is published twice: data-rightbar-fullscreen on the frame and data-sidebar-right-panel="push|fullscreen" on the panel. "dock" and "float" are dockkit hosts, not presentations.',
    'The frame overlay layer (z-index 20) sits below primitives menus (100) and modals (1000), so a theme must not raise its own overlay above those without matching the primitive layers.',
    '--dsh-scrollbar-* are the one family of hooks designed for rebinding from component CSS: an elevated surface rebinds thumb/hover to the l2 alias tokens and its own container width.',
  ],
};

fs.writeFileSync(path.join(WORKSPACE, 'research/public-hooks.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log('bodyAttributes:', bodyAttributes.length);
console.log('elementAttributes:', elementAttributes.length, 'layoutState:', out.layoutStateAttributes.length);
console.log('sidePanelStates:', sidePanelStates.length, 'variables:', variables.length, 'rebindable:', rebindableVariables.length, 'zIndexLayers:', zIndexLayers.length);
