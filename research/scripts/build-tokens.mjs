#!/usr/bin/env node
/**
 * Build research/tokens.json — the machine-readable inventory of every
 * `--dsw-*` design token declared by the installed DSH 0.2.0-rc.2 theme plugin,
 * plus the public `--dsh-*` layout/content hooks.
 *
 * Inputs:
 *   research/extracted/theme-declarations.json  (from extract-theme-css.mjs)
 *   research/extracted/references.json          (from build-references.mjs)
 * Output: research/tokens.json
 */
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE = '/Users/ryanzhang/Personal/openprojects/dsh-livery';
const PKG_ROOT =
  '/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai';
const THEME_PKG_REL = '@deepseek-ai/dsh-client-ui-theme';
const THEME_CLIENT_REL = `${THEME_PKG_REL}/lib/client.js`;

const decls = JSON.parse(fs.readFileSync(path.join(WORKSPACE, 'research/extracted/theme-declarations.json'), 'utf8'));
const refs = JSON.parse(fs.readFileSync(path.join(WORKSPACE, 'research/extracted/references.json'), 'utf8'));

const themePkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'dsh-client-ui-theme/package.json'), 'utf8'));
const dshPkg = JSON.parse(
  fs.readFileSync(
    '/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/package.json',
    'utf8',
  ),
);

const CATEGORY_BY_PREFIX = [
  ['--dsw-static-', 'static'],
  ['--dsw-alias-', 'alias'],
  ['--dsw-specific-', 'specific'],
  ['--dsw-font-', 'font'],
  ['--dsw-radius-', 'radius'],
  ['--dsw-shadow-', 'shadow'],
  ['--dsw-elevation-', 'elevation'],
  ['--dsw-focus-ring-', 'focus'],
];

function categoryOf(name) {
  for (const [prefix, category] of CATEGORY_BY_PREFIX) if (name.startsWith(prefix)) return category;
  if (name === '--dsw-corner-shape') return 'radius';
  return 'other';
}

/* ---------------- value analysis ---------------- */

const tokenModeValues = new Map(); // name -> {light, dark}
for (const token of decls.tokens) {
  tokenModeValues.set(token.name, { light: token.lightValue, dark: token.darkValue ?? token.lightValue });
}

const STATIC_RESOLUTION_BASES = new Map([
  ['--ds-font-family-code', '"SF Mono", "JetBrains Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, Courier, "PingFang SC", "Microsoft YaHei"'],
  ['--dsh-content-font-size', '14px'],
  ['--dsh-content-font-size-secondary', '13px'],
  ['--dsh-content-font-delta', '0px'],
  ['--dsh-content-font-delta-secondary', '0px'],
]);

/** Replace var(--x[, fallback]) recursively. Returns { text, usedRuntimeDefault }. */
function substitute(expr, mode, depth = 0) {
  if (depth > 12) return { text: expr, usedRuntimeDefault: false };
  let out = '';
  let i = 0;
  let usedRuntimeDefault = false;
  while (i < expr.length) {
    const start = expr.indexOf('var(', i);
    if (start < 0) {
      out += expr.slice(i);
      break;
    }
    out += expr.slice(i, start);
    // find matching close paren
    let j = start + 4;
    let paren = 1;
    while (j < expr.length && paren > 0) {
      if (expr[j] === '(') paren += 1;
      if (expr[j] === ')') paren -= 1;
      j += 1;
    }
    const inner = expr.slice(start + 4, j - 1);
    const comma = inner.indexOf(',');
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma < 0 ? null : inner.slice(comma + 1).trim();
    let replacement = null;
    if (STATIC_RESOLUTION_BASES.has(name)) {
      replacement = STATIC_RESOLUTION_BASES.get(name);
      usedRuntimeDefault = true;
    } else if (tokenModeValues.has(name)) {
      const nested = substitute(tokenModeValues.get(name)[mode] ?? '', mode, depth + 1);
      replacement = nested.text;
      usedRuntimeDefault = usedRuntimeDefault || nested.usedRuntimeDefault;
    } else if (fallback !== null) {
      const nested = substitute(fallback, mode, depth + 1);
      replacement = nested.text;
      usedRuntimeDefault = usedRuntimeDefault || nested.usedRuntimeDefault;
    }
    out += replacement === null ? expr.slice(start, j) : replacement;
    i = j;
  }
  return { text: out, usedRuntimeDefault };
}

function directRefs(value) {
  return [...value.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((m) => m[1]);
}

function valueKind(value, name) {
  if (name === '--dsw-font-family' || name === '--dsw-font-family-brand') return 'font-stack';
  if (name === '--dsw-corner-shape') return 'shape';
  if (/^color-mix\(/i.test(value)) return 'color-mix';
  if (/^linear-gradient\(/i.test(value)) return 'gradient';
  if (/\bcalc\(/.test(value)) return 'calc';
  if (/^var\(/.test(value) && value.trim().endsWith(')') ) return 'var-chain';
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return 'hex-literal';
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(value)) return 'color-function';
  if (/^[a-z]+$/i.test(value)) return 'keyword';
  if (/^(italic\s+)?\d{3}\s|^\d+px\/\d+px/.test(value) || /(\d{3}|\d+px)\s+[^/]*\/[^ ]*\s+var\(--(dsw|ds)-font/.test(value)) return 'font-shorthand';
  if (/^0 0 0 /.test(value) || /\d+px \d+px/.test(value)) return 'shadow-list';
  if (/^\d+(\.\d+)?px$/.test(value)) return 'length';
  return 'other';
}

const CATEGORY_NOTES = {
  alias: 'Semantic alias layer consumed by components; the layer a theme plugin normally overrides.',
  specific: 'Product-specific surface token (sidebar, bubble, input, menu, selector, tip).',
  static: 'Raw palette step; theme-invariant or near-invariant, not meant to be re-themed per component.',
  font: 'Typography token (family, markdown ladder, or UI scale).',
  radius: 'Corner geometry token.',
  shadow: 'Box-shadow scale.',
  elevation: 'Composited elevation token built on the hairline stroke + soft shadows.',
  focus: 'Focus-ring contract.',
  other: 'Material / gradient / mask helper token outside the semantic alias naming scheme.',
};

const tokens = decls.tokens.map((token) => {
  const category = categoryOf(token.name);
  const light = token.lightValue;
  const dark = token.darkValue ?? token.lightValue;
  const lightSub = substitute(light, 'light');
  const darkSub = substitute(dark, 'dark');
  const refsList = [...new Set([...directRefs(light), ...directRefs(dark)])];
  const reference = refs.dswReads[token.name];
  const referencedBy = reference ? Object.keys(reference.byPackage) : [];
  const notes = [];

  notes.push(CATEGORY_NOTES[category]);
  if (token.themeInvariant) notes.push('Theme-invariant: declared once, so dark inherits the same value.');
  else if (light === dark) notes.push('Light and dark declarations are identical.');
  if (refsList.length) {
    const chain = refsList
      .map((n) => `${n}=${tokenModeValues.get(n)?.light ?? STATIC_RESOLUTION_BASES.get(n) ?? '?'}`)
      .join(', ');
    notes.push(`var() chain → ${chain}.`);
  }
  if (lightSub.text !== light || darkSub.text !== dark) {
    const l = lightSub.text === darkSub.text ? lightSub.text : `${lightSub.text} (light) / ${darkSub.text} (dark)`;
    notes.push(`Fully substituted: ${l}${lightSub.usedRuntimeDefault || darkSub.usedRuntimeDefault ? ' (uses the default content font size 14px where user-scaled)' : ''}.`);
  }
  if (/color-mix\(/i.test(light) || /color-mix\(/i.test(dark)) notes.push('Computed with color-mix(in srgb, …) — resolves in the browser, not statically.');
  if (/\bcalc\(/.test(light) || /\bcalc\(/.test(dark)) notes.push('Computed with calc() against a runtime variable.');
  if (!reference) notes.push('Not referenced by any shipped client bundle (design-system definition only).');
  if (token.name === '--dsw-alias-brand-primary-new-colorprimary-new-color') {
    notes.push('Name looks like a design-tool export artifact (duplicated "new-color" suffix); value differs per palette but is unlikely to be consumed.');
  }
  if (token.name === '--dsw-static-neutral-bluish-60') {
    notes.push('The only static step whose light and dark declarations differ (#f5f6f7 vs #f9fafb).');
  }
  if (['--dsw-elevation-stroke', '--dsw-elevation-panel', '--dsw-elevation-prominent', '--dsw-elevation-soft'].includes(token.name)) {
    notes.push('Theme-sensitive through its chain: --dsw-elevation-stroke-color is #00000029-border-l4 in light but is rebound to border-l3 on dark menus, so the effective dark shadow differs although this declaration is single.');
  }
  if (token.name === '--dsw-elevation-stroke-color') {
    notes.push('Rebindable per surface: dark mode rebinds it only under body[data-ds-dark-theme] [data-menu-material] to border-l3.');
  }
  if (token.name === '--dsw-specific-menu') {
    notes.push('Platform override: html[data-platform=darwin] body re-declares it as a near-opaque fill (#f8f9faf0 light / #303136f0 dark).');
  }
  if (token.name === '--dsw-corner-shape') {
    notes.push('Only declared inside @supports (corner-shape: superellipse(1.5)); applied through *, ::before, ::after.');
  }
  if (!token.themeInvariant && token.darkSelector && token.darkSelector !== 'body[data-ds-dark-theme]') {
    notes.push(`Dark declaration selector is ${token.darkSelector}, not body[data-ds-dark-theme].`);
  }

  const relevantDefs = token.definitions.filter((d) => d.sheet !== 'base.css' || token.name.startsWith('--dsw-radius') || token.name.startsWith('--dsw-font'));
  const firstLightDef = token.definitions.find((d) => !d.selector.includes('data-ds-dark-theme'));
  const primaryDef = firstLightDef ?? token.definitions[0];

  return {
    name: token.name,
    category,
    lightValue: light,
    darkValue: dark,
    definedIn: `${THEME_CLIENT_REL}:${primaryDef.compiledLine}`,
    definedInSheet: primaryDef.sheet,
    definedInSelector: primaryDef.selector,
    extractedRef: `research/extracted/${primaryDef.sheet}:${primaryDef.sheetLine}`,
    lightSelector: token.lightSelector,
    darkSelector: token.darkSelector,
    themeInvariant: token.themeInvariant,
    valueKind: valueKind(light, token.name),
    varChain: refsList,
    resolved: { light: lightSub.text, dark: darkSub.text },
    referencedBy,
    referenceCount: reference?.count ?? 0,
    definitionsCount: token.definitions.length,
    ...(relevantDefs.length > 1
      ? {
          definitions: token.definitions.map((d) => ({
            sheet: d.sheet,
            selector: d.selector,
            value: d.value,
            ref: `${THEME_CLIENT_REL}:${d.compiledLine}`,
            extractedRef: `research/extracted/${d.sheet}:${d.sheetLine}`,
          })),
        }
      : {}),
    notes: notes.join(' '),
  };
});

/* ---------------- --dsh public hooks ---------------- */

/** Scan the installed packages for a variable's declarations with exact line numbers. */
const SCAN_FILES = [];
for (const entry of fs.readdirSync(PKG_ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const libDir = path.join(PKG_ROOT, entry.name, 'lib');
  if (!fs.existsSync(libDir)) continue;
  for (const file of fs.readdirSync(libDir)) {
    if (file.endsWith('.js')) SCAN_FILES.push({ pkg: entry.name, file: `@deepseek-ai/${entry.name}/lib/${file}`, abs: path.join(libDir, file) });
  }
}
const FRONTEND_ASSETS = path.join(PKG_ROOT, 'dsh-web-frontend/dist/assets');
for (const file of fs.readdirSync(FRONTEND_ASSETS)) {
  if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
  SCAN_FILES.push({ pkg: 'dsh-web-frontend', file: `@deepseek-ai/dsh-web-frontend/dist/assets/${file}`, abs: path.join(FRONTEND_ASSETS, file) });
}

function findDshDeclarations(name) {
  const hits = [];
  for (const { pkg, file, abs } of SCAN_FILES) {
    const text = fs.readFileSync(abs, 'utf8');
    let idx = text.indexOf(`${name}:`);
    while (idx >= 0) {
      const line = text.slice(0, idx).split('\n').length;
      const value = text.slice(idx + name.length + 1, idx + name.length + 90).split(/[;}]/)[0].trim();
      hits.push({ package: pkg, file, line, value });
      idx = text.indexOf(`${name}:`, idx + name.length + 1);
    }
    for (const m of text.matchAll(new RegExp(`setProperty\\(\\s*"${name}"`, 'g'))) {
      const line = text.slice(0, m.index).split('\n').length;
      hits.push({ package: pkg, file, line, value: 'set via JS style.setProperty (runtime-measured)' });
    }
  }
  // dedupe identical file+line+value
  const seen = new Set();
  return hits.filter((h) => {
    const key = `${h.file}:${h.line}:${h.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const README_DOCS = {
  '--dsh-content-font-size': [
    '@deepseek-ai/dsh-client-ui-theme/README.md:40',
    '@deepseek-ai/dsh-client-ui-theme/README.md:78',
    '@deepseek-ai/dsh-client-ui-layout/README.md:45',
  ],
  '--dsh-content-font-delta': ['@deepseek-ai/dsh-client-ui-theme/README.md:78'],
  '--dsh-content-font-size-secondary': ['@deepseek-ai/dsh-client-ui-theme/README.md:78'],
  '--dsh-content-font-delta-secondary': ['@deepseek-ai/dsh-client-ui-theme/README.md:78'],
  '--dsh-scrollbar-thumb': ['@deepseek-ai/dsh-client-ui-theme/README.md:86'],
  '--dsh-scrollbar-thumb-hover': ['@deepseek-ai/dsh-client-ui-theme/README.md:86'],
  '--dsh-scrollbar-thumb-border': ['@deepseek-ai/dsh-client-ui-theme/README.md:86'],
  '--dsh-scrollbar-track-margin': ['@deepseek-ai/dsh-client-ui-theme/README.md:86'],
  '--dsh-scrollbar-width': ['@deepseek-ai/dsh-client-ui-theme/README.md:86'],
  '--dsh-frame-leading-clearance': ['@deepseek-ai/dsh-client-ui-layout/README.md:37'],
  '--dsh-frame-top-clearance': [
    '@deepseek-ai/dsh-client-ui-layout/README.md:37',
    '@deepseek-ai/dsh-client-ui-layout/README.md:41',
  ],
  '--dsh-frame-overlay-top': ['@deepseek-ai/dsh-client-ui-layout/README.md:41'],
  '--dsh-frame-chrome-top': ['@deepseek-ai/dsh-client-ui-layout/README.md:41'],
  '--dsh-windows-content-radius': [
    '@deepseek-ai/dsh-client-ui-layout/README.md:39',
    '@deepseek-ai/dsh-client-ui-sidebar-right/README.md:46',
  ],
  '--dsh-windows-sidebar-width': [
    '@deepseek-ai/dsh-client-ui-layout/README.md:39',
    '@deepseek-ai/dsh-client-ui-sidebar-right/README.md:46',
  ],
  '--dsh-windows-menu-start': ['@deepseek-ai/dsh-client-ui-sidebar/README.md:48'],
  '--dsh-composer-model-text-display': ['@deepseek-ai/dsh-client-ui-conversation/README.md:49'],
  '--dsh-composer-model-icon-display': ['@deepseek-ai/dsh-client-ui-conversation/README.md:49'],
  '--dsh-file-type-icon-color': ['@deepseek-ai/dsh-client-ui-primitives/README.md:87'],
  '--dsh-sidebar-width': [],
};

const PUBLIC_HOOKS = new Set([
  // content typography scale (theme README:78 documents the four axes)
  '--dsh-content-font-size',
  '--dsh-content-font-size-secondary',
  '--dsh-content-font-delta',
  '--dsh-content-font-delta-secondary',
  // scrollbar rebinding contract (theme README:86)
  '--dsh-scrollbar-thumb',
  '--dsh-scrollbar-thumb-hover',
  '--dsh-scrollbar-thumb-border',
  '--dsh-scrollbar-track-margin',
  '--dsh-scrollbar-width',
  // frame / window chrome clearance (layout README:37-41)
  '--dsh-frame-leading-clearance',
  '--dsh-frame-top-clearance',
  '--dsh-frame-overlay-top',
  '--dsh-frame-chrome-top',
  '--dsh-windows-titlebar-height',
  '--dsh-windows-content-radius',
  '--dsh-windows-sidebar-width',
  '--dsh-windows-menu-start',
  // right panel / dockkit
  '--dsh-sidebar-width',
  '--dsh-dockkit-dock-layer',
  '--dsh-dockkit-float-layer',
  '--dsh-dockkit-strip-inline-start',
  '--dsh-dockkit-float-top',
  // composer + conversation geometry
  '--dsh-composer-height',
  '--dsh-composer-card-max-width',
  '--dsh-composer-side-clearance',
  '--dsh-composer-stack-gap',
  '--dsh-composer-dock-inset',
  '--dsh-composer-text-max-height',
  '--dsh-composer-model-text-display',
  '--dsh-composer-model-icon-display',
  '--dsh-chat-content-width',
  '--dsh-chat-user-width',
  '--dsh-conversation-column-width',
  '--dsh-conversation-viewport-height',
  '--dsh-sidebar-inline-padding',
  '--dsh-session-list-edge-inset',
  '--dsh-session-list-scrollbar-width',
  '--dsh-session-list-scrollbar-offset',
  '--dsh-trajectory-toolbar-height',
  '--dsh-trajectory-bottom-clearance',
  // boot / first-paint palette
  '--dsh-boot-bg',
  '--dsh-boot-label-primary',
  '--dsh-boot-label-secondary',
  '--dsh-boot-label-tertiary',
  '--dsh-boot-border',
  '--dsh-boot-brand',
  '--dsh-file-type-default-color',
  '--dsh-file-type-violet',
  '--dsh-file-type-icon-color',
]);


/** Hooks whose declaration is an inline style object / single-quoted setProperty, missed by the CSS scan. */
const EXTRA_DSH = [
  {
    name: '--dsh-content-font-size',
    visibility: 'public-documented',
    declarations: [
      { package: 'dsh-client-ui-layout', file: '@deepseek-ai/dsh-client-ui-layout/lib/client.js', line: 539, value: 'set via body.style.setProperty(`${snapshot.fontSize}px`) by the theme presenter' },
      { package: 'dsh-client-ui-theme', file: '@deepseek-ai/dsh-client-ui-theme/lib/index.js', line: 56, value: "set via body.style.setProperty('<n>px') by the pre-plugin boot script" },
      { package: 'dsh-client-ui-theme', file: '@deepseek-ai/dsh-client-ui-theme/lib/gradient-shadow-text.css', line: 30, value: 'read with fallback 14px by --dsw-font-markdown-* and --dsh-content-font-delta' },
    ],
  },
  {
    name: '--dsh-sidebar-width',
    visibility: 'public-observed',
    declarations: [
      { package: 'dsh-client-ui-sidebar-right', file: '@deepseek-ai/dsh-client-ui-sidebar-right/lib/client.js', line: 5678, value: 'inline style: 100vw when fullscreen, else the panel width in px' },
    ],
  },
  {
    name: '--dsh-windows-sidebar-width',
    visibility: 'public-documented',
    declarations: [
      { package: 'dsh-client-ui-layout', file: '@deepseek-ai/dsh-client-ui-layout/lib/client.js', line: 319, value: 'inline style: `${cols.sidebar}px` when html[data-windows-titlebar]' },
    ],
  },
  {
    name: '--dsh-windows-titlebar-height',
    visibility: 'public-documented',
    declarations: [
      { package: 'dsh-client-ui-layout', file: '@deepseek-ai/dsh-client-ui-layout/lib/client.js', line: 73, value: 'read only (padding-top / caption height); never declared by the web packages — the Windows shell supplies it' },
    ],
  },
  {
    name: '--dsh-file-type-icon-color',
    visibility: 'public-documented',
    declarations: [
      { package: 'dsh-client-ui-primitives', file: '@deepseek-ai/dsh-client-ui-primitives/lib/FileTypeIcon.module.css', line: 5, value: 'read as var(--dsh-file-type-icon-color, var(--dsh-file-type-default-color)); override-only hook, never declared' },
    ],
  },
];

const dshNames = new Set([
  ...decls.declarations.filter((d) => d.name.startsWith('--dsh-')).map((d) => d.name),
  ...refs.dshDeclarations.map((d) => d.name),
  ...refs.dshSetProperty.map((d) => d.name),
  ...EXTRA_DSH.map((e) => e.name),
  '--dsh-windows-titlebar-height',
]);

const dshVariables = [...dshNames]
  .sort()
  .filter((name) => name !== '--dsh-version')
  .map((name) => {
    const extra = EXTRA_DSH.find((e) => e.name === name);
    const found = findDshDeclarations(name);
    const documented = README_DOCS[name] ?? [];
    const declarations = extra ? [...extra.declarations, ...found.slice(0, 4)] : found.slice(0, 8);
    return {
      name,
      visibility:
        extra?.visibility ??
        (documented.length > 0 ? 'public-documented' : PUBLIC_HOOKS.has(name) ? 'public-observed' : 'component-internal'),
      provenance: documented.length > 0 ? 'documented' : 'observed-only',
      documentedAt: documented,
      declarations,
      notes:
        name === '--dsh-windows-titlebar-height'
          ? 'Read by the frame as the caption height and only meaningful under html[data-windows-titlebar]; supplied by the Windows shell, not declared in any web package.'
          : documented.length > 0
            ? 'Documented in a package README and/or the layout contract.'
          : 'Observed in built bundles only; treat as an implementation detail unless the owning package documents it.',
    };
  });

/* ---------------- meta ---------------- */

const counts = {};
for (const token of tokens) counts[token.category] = (counts[token.category] ?? 0) + 1;

const noRef = tokens.filter((t) => t.referenceCount === 0).length;
const varChains = tokens.filter((t) => t.varChain.length > 0).length;
const computed = tokens.filter((t) => /color-mix|calc\(/.test(t.lightValue) || /color-mix|calc\(/.test(t.darkValue)).length;

const undeclaredTokens = Object.keys(refs.dswReads)
  .filter((name) => !tokenModeValues.has(name))
  .map((name) => ({
    name,
    category: categoryOf(name),
    referencedBy: Object.keys(refs.dswReads[name].byPackage),
    referenceCount: refs.dswReads[name].count,
    notes:
      name === '--dsw-hovercard-bg'
        ? 'Declared only by a component stylesheet, @deepseek-ai/dsh-client-ui-primitives/lib/HoverCard.module.css:10, as the hardcoded #2C2C2E — so hover cards stay dark in light mode. Not declared by ui-theme: a token gap.'
        : name === '--dsw-font'
          ? 'Read by dsh-client-ui-sidebar-documentpreview as var(--dsw-font, sans-serif|inherit) but never declared anywhere; the design system declares --dsw-font-family instead.'
          : name === '--dsw-font-mono'
            ? 'Read as var(--dsw-font-mono, ui-monospace, …) by agent-preset/plugin-manager/jobs/sidebar-documentpreview; never declared (the code font token is --ds-font-family-code).'
            : 'Read through var(--token[, fallback]) but never declared by ui-theme; consumers rely on a hardcoded fallback or expect an older token name.',
  }));

/* recommended override set: every token whose value actually changes with the
 * palette, excluding the static palette steps and the geometry/type scales. */
const paletteTokens = tokens.filter(
  (t) => t.lightValue !== t.darkValue && !['static', 'font', 'radius', 'shadow', 'elevation'].includes(t.category),
);
const fontTokenNames = tokens.filter((t) => t.category === 'font').map((t) => t.name);
const fontFamilies = fontTokenNames.filter((n) => n === '--dsw-font-family' || n === '--dsw-font-family-brand');
const markdownSets = [...new Set(fontTokenNames.filter((n) => n.includes('markdown')).map((n) => n.replace(/-(font-family|font-weight|font-size|line-height|font-style)$/, '')))];
const uiSets = [...new Set(fontTokenNames.filter((n) => /^--dsw-font-(?:xl|l|m|base|s|xs|xxs|xxxs)/.test(n) && !n.includes('markdown')).map((n) => n.replace(/-(font-family|font-weight|font-size|line-height|font-style)$/, '')))];

const out = {
  $schema: 'research/tokens.schema.json',
  generatedAt: new Date().toISOString(),
  target: {
    dshVersion: dshPkg.version,
    themePackage: themePkg.name,
    themePackageVersion: themePkg.version,
    packagesRoot: PKG_ROOT,
  },
  sources: {
    tokenSheets: `${THEME_CLIENT_REL}:1142-1163 (inline-css regions, one JS string per sheet)`,
    sourceOrder: decls.sheets.map((s) => ({ sheet: s.name, compiledAt: `${THEME_CLIENT_REL}:${s.compiledLine}`, bytes: s.bytes, declarations: s.declarations })),
    hostBootstrap: '@deepseek-ai/dsh-client-ui-theme/lib/index.js:36-76 (head CSS + body script via webserver/index-inject at :92-94)',
    stylesheetInjection: `${THEME_CLIENT_REL}:1166-1191 (STYLES array + installThemeStyles: <style data-plugin data-plugin-css> appended to document.head, removed on unload/HMR)`,
    themePresenter: '@deepseek-ai/dsh-client-ui-layout/lib/client.js:498-560 (html color-scheme + data-ds-theme-source, body data-ds-dark-theme, inline token vars, theme-color meta)',
    registryApi: `${THEME_CLIENT_REL}:1339-1520 (ctx.theme register/overrideTokens; {light,dark} pairs required)`,
  },
  selectors: {
    light: ['body', ':root (font/radius/corner-shape/focus-width)', 'body, body * (elevation shadows)'],
    dark: 'body[data-ds-dark-theme]',
    darkScopedRebinds: [
      'body[data-ds-dark-theme] [data-menu-material] → --dsw-elevation-stroke-color',
      'html[data-platform=darwin] body[data-ds-dark-theme] → --dsw-specific-menu',
    ],
    platformOverrides: [
      'html[data-platform=darwin] body → --dsw-specific-menu: #f8f9faf0',
      'html[data-platform=darwin] body[data-ds-dark-theme] → --dsw-specific-menu: #303136f0',
    ],
  },
  counts: {
    total: tokens.length,
    byCategory: counts,
    declarations: decls.declarations.filter((d) => d.name.startsWith('--dsw-')).length,
    withVarChain: varChains,
    computedExpressions: computed,
    neverReferencedByShippedBundles: noRef,
    undeclaredButRead: undeclaredTokens.length,
    themeInvariant: tokens.filter((t) => t.themeInvariant).length,
    paletteDiffering: tokens.filter((t) => t.lightValue !== t.darkValue).length,
    recommendedPaletteOverrideCount: paletteTokens.length,
    fontVariables: fontTokenNames.length,
  },
  fontTokens: {
    family: fontFamilies,
    markdownSets,
    uiScaleSets: uiSets,
    totalVariables: fontTokenNames.length,
    codeStackVariable: '--ds-font-family-code',
    notes:
      'Each of the 30 style sets declares one font shorthand plus five longhands (family/weight/size/line-height/style). Markdown h1-h3 and the table ladder are driven by --dsh-content-font-size through --dsh-content-font-delta; the UI scale and small/code variants are fixed px.',
  },
  themeOverrideChecklist: {
    note:
      'A complete palette override only needs the tokens whose value changes between light and dark and that are not raw palette steps or fixed geometry/type scales. Static steps, radius, shadow, font and elevation tokens are theme-invariant by design; overriding alias tokens automatically flows through every var() chain.',
    tokens: paletteTokens.map((t) => t.name),
    derivedRebinds: ['--dsw-elevation-stroke-color', '--dsw-focus-ring-color', '--dsh-scrollbar-thumb', '--dsh-scrollbar-thumb-hover'],
  },
  categoryDescriptions: CATEGORY_NOTES,
  topReferenced: Object.entries(refs.dswReads)
    .slice(0, 20)
    .map(([name, v]) => ({ name, count: v.count, packages: Object.keys(v.byPackage) })),
  tokens,
  dshVariables,
  undeclaredTokens,
  supportingVariables: [
    { name: '--ds-font-family-code', value: '"SF Mono", "JetBrains Mono", …', definedIn: `${THEME_CLIENT_REL}:1142`, notes: 'Not a --dsw token but the font stack behind every --dsw-font-markdown-code* token.' },
    { name: '--ds-ease-in-out', value: 'cubic-bezier(.4, 0, .2, 1)', definedIn: `${THEME_CLIENT_REL}:1142`, notes: 'Motion easing used by layout/sidebar transitions.' },
    { name: '--ds-transition-duration', value: '.2s', definedIn: `${THEME_CLIENT_REL}:1142`, notes: 'Base transition duration.' },
    { name: '--ds-transition-duration-fast', value: '.1s', definedIn: `${THEME_CLIENT_REL}:1142`, notes: 'Fast transition duration.' },
    { name: '--ds-transition-duration-slow', value: '.3s', definedIn: `${THEME_CLIENT_REL}:1142`, notes: 'Slow transition duration (frame track animation).' },
  ],
};

fs.writeFileSync(path.join(WORKSPACE, 'research/tokens.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log('tokens:', tokens.length, counts);
console.log('declarations:', out.counts.declarations, 'varChains:', varChains, 'computed:', computed, 'noRef:', noRef);
console.log('dshVariables:', dshVariables.length, 'public:', dshVariables.filter((v) => v.visibility === 'public').length);
console.log('undeclared:', undeclaredTokens.map((t) => t.name).join(', '));
console.log('top5:', out.topReferenced.slice(0, 5));
