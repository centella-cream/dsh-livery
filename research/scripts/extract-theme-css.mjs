#!/usr/bin/env node
/**
 * Extract the eight ui-theme inline CSS sheets from the compiled client bundle.
 *
 * Source of truth:
 *   @deepseek-ai/dsh-client-ui-theme/lib/client.js
 * The bundle embeds each sheet as a single-line JS string literal:
 *   var base_css_default = "...";
 * preceded by a `//#region \0dsh-inline-css:<repo source path>.mjs` marker.
 *
 * Outputs (workspace-relative):
 *   research/extracted/<sheet>.css        pretty-printed, line-numbered copy
 *   research/extracted/theme-declarations.json  { sheets, declarations, tokens }
 */
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE = '/Users/ryanzhang/Personal/openprojects/dsh-livery';
const PKG_ROOT =
  '/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai';
const THEME_REL = '@deepseek-ai/dsh-client-ui-theme/lib/client.js';
const THEME = path.join(PKG_ROOT, 'dsh-client-ui-theme/lib/client.js');

const outDir = path.join(WORKSPACE, 'research/extracted');
fs.mkdirSync(outDir, { recursive: true });

const lines = fs.readFileSync(THEME, 'utf8').split('\n');

/** Locate `var <name>_css_default = "<json string>";` and its region marker. */
function findSheet(name, fileLines) {
  const re = new RegExp(`^\\s*var ${name}_css_default = ("(?:[^"\\\\]|\\\\.)*");\\s*$`);
  for (let i = 0; i < fileLines.length; i += 1) {
    const m = fileLines[i].match(re);
    if (!m) continue;
    const value = JSON.parse(m[1]);
    let sourceRegion = null;
    for (let j = i; j >= 0 && j > i - 4; j -= 1) {
      const region = fileLines[j].match(/region .*dsh-inline-css:(.*)\.mjs$/);
      if (region) {
        sourceRegion = region[1];
        break;
      }
    }
    return { line: i + 1, value, sourceRegion };
  }
  throw new Error(`sheet ${name} not found`);
}

/* ------------------------------------------------------------------ *
 * Minimal CSS parser: top-level rules + one level of at-rule blocks
 * (@supports only in these sheets). Produces declarations with the
 * full selector and at-context.
 * ------------------------------------------------------------------ */
function parseCss(css) {
  const rules = [];
  let i = 0;
  let atContext = null;
  let depth = 0;

  function readUntil(ch) {
    let out = '';
    while (i < css.length) {
      const c = css[i];
      if (c === ch) {
        i += 1;
        return out;
      }
      if (c === '{') {
        // nested block seen by declaration reader -> handled by caller
        break;
      }
      out += c;
      i += 1;
    }
    return out;
  }

  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i += 1;
    if (i >= css.length) break;
    // read selector / at-rule prelude
    let prelude = '';
    while (i < css.length && css[i] !== '{' && css[i] !== '}') {
      prelude += css[i];
      i += 1;
    }
    if (i >= css.length) break;
    if (css[i] === '}') {
      i += 1;
      atContext = null;
      depth = 0;
      continue;
    }
    i += 1; // consume '{'
    prelude = prelude.trim().replace(/\s+/g, ' ');
    if (prelude.startsWith('@')) {
      atContext = prelude;
      // parse inner rules: selectors then decls
      while (i < css.length) {
        while (i < css.length && /\s/.test(css[i])) i += 1;
        if (css[i] === '}') {
          i += 1;
          atContext = null;
          break;
        }
        let sel = '';
        while (i < css.length && css[i] !== '{') {
          sel += css[i];
          i += 1;
        }
        if (i >= css.length) break;
        i += 1;
        let body = '';
        let d = 1;
        while (i < css.length && d > 0) {
          if (css[i] === '{') d += 1;
          if (css[i] === '}') d -= 1;
          if (d > 0) body += css[i];
          i += 1;
        }
        rules.push({ atContext, selector: sel.trim().replace(/\s+/g, ' '), body });
      }
      continue;
    }
    let body = '';
    let d = 1;
    while (i < css.length && d > 0) {
      if (css[i] === '{') d += 1;
      if (css[i] === '}') d -= 1;
      if (d > 0) body += css[i];
      i += 1;
    }
    rules.push({ atContext, selector: prelude, body });
  }
  return rules;
}

function splitDecls(body) {
  const out = [];
  let buf = '';
  let paren = 0;
  for (const c of body) {
    if (c === '(') paren += 1;
    if (c === ')') paren -= 1;
    if (c === ';' && paren === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const SHEETS = [
  ['base.css', 'base'],
  ['corner-shape.css', 'corner_shape'],
  ['design-platform.css', 'design_platform'],
  ['focus.css', 'focus'],
  ['onboarding.css', 'onboarding'],
  ['scrollbar.css', 'scrollbar'],
  ['gradient-shadow-text.css', 'gradient_shadow_text'],
  ['shiki.css', 'shiki'],
];

const sheets = [];
const declarations = [];

for (const [sheet, symbol] of SHEETS) {
  const found = findSheet(symbol, lines);
  const rules = parseCss(found.value);
  // pretty print
  const pretty = [];
  pretty.push(`/* ${sheet}`);
  pretty.push(` * source: ${found.sourceRegion ?? 'unknown'}.mjs`);
  pretty.push(` * compiled: ${THEME_REL}:${found.line}`);
  pretty.push(' */');
  for (const rule of rules) {
    if (rule.atContext) pretty.push(`${rule.atContext} {`);
    pretty.push(`${rule.selector} {`);
    for (const decl of splitDecls(rule.body)) {
      pretty.push(`  ${decl};`);
    }
    pretty.push('}');
    if (rule.atContext) pretty.push('}');
    pretty.push('');
  }
  const prettyText = pretty.join('\n');
  fs.writeFileSync(path.join(outDir, sheet), prettyText);

  // walk rules in order, consume matching pretty lines sequentially
  let cursor = 0;
  const consumed = new Set();
  for (const rule of rules) {
    const decls = splitDecls(rule.body);
    const selectorLine = pretty.findIndex(
      (l, idx) => idx >= cursor && l === `${rule.selector} {`,
    );
    if (selectorLine >= 0) cursor = selectorLine;
    let searchFrom = cursor + 1;
    for (const decl of decls) {
      const idx = pretty.findIndex(
        (l, li) => li >= searchFrom && l === `  ${decl};` && !consumed.has(li),
      );
      const declLine = idx >= 0 ? idx + 1 : null;
      if (idx >= 0) {
        consumed.add(idx);
        searchFrom = idx + 1;
      }
      const m = decl.match(/^(--[a-zA-Z0-9-]+)\s*:\s*([\s\S]*)$/);
      if (!m) continue;
      declarations.push({
        sheet,
        selector: rule.selector,
        atContext: rule.atContext,
        name: m[1],
        value: m[2].trim(),
        compiledLine: found.line,
        sheetLine: declLine,
      });
    }
  }

  sheets.push({
    name: sheet,
    symbol,
    sourcePath: found.sourceRegion ? `${found.sourceRegion}.css` : null,
    compiledLine: found.line,
    bytes: found.value.length,
    rules: rules.length,
    declarations: declarations.filter((d) => d.sheet === sheet).length,
  });
}

function ruleKeyAt() {
  return '';
}

/* ------------------------------------------------------------------ *
 * Token table: light value, dark value, selector provenance.
 * ------------------------------------------------------------------ */
const LIGHT_SELECTORS = new Set([':root', 'body', 'body,body *', '*', 'body *']);
const isDarkSelector = (sel) => sel.includes('data-ds-dark-theme');
const isLightDecl = (d) => !isDarkSelector(d.selector);

function normalizeSelector(sel) {
  return sel.replace(/\s+/g, ' ').trim();
}

/** per-token accumulator preserving first-definition order */
const tokenMap = new Map();
for (const d of declarations) {
  if (!d.name.startsWith('--dsw-')) continue;
  const entry = tokenMap.get(d.name) ?? {
    name: d.name,
    definitions: [],
    lightValue: null,
    darkValue: null,
    lightSelector: null,
    darkSelector: null,
  };
  entry.definitions.push({
    sheet: d.sheet,
    selector: d.selector,
    atContext: d.atContext,
    value: d.value,
    compiledLine: d.compiledLine,
    sheetLine: d.sheetLine,
  });
  if (isLightDecl(d) && entry.lightValue === null) {
    entry.lightValue = d.value;
    entry.lightSelector = d.selector;
  }
  if (isDarkSelector(d.selector) && entry.darkValue === null) {
    entry.darkValue = d.value;
    entry.darkSelector = d.selector;
  }
  tokenMap.set(d.name, entry);
}

const tokens = [...tokenMap.values()].map((entry) => ({
  ...entry,
  // tokens defined only once are theme-invariant: dark inherits the light value
  darkValue: entry.darkValue ?? entry.lightValue,
  darkSelector: entry.darkSelector ?? entry.lightSelector,
  themeInvariant: entry.darkValue === null,
}));

fs.writeFileSync(
  path.join(outDir, 'theme-declarations.json'),
  `${JSON.stringify({ sheets, declarations, tokens }, null, 2)}\n`,
);

const bySheet = Object.fromEntries(sheets.map((s) => [s.name, s.declarations]));
console.log('sheets:', JSON.stringify(bySheet));
console.log('total --dsw declarations:', declarations.filter((d) => d.name.startsWith('--dsw-')).length);
console.log('unique --dsw tokens:', tokens.length);
const dsh = [...new Set(declarations.filter((d) => d.name.startsWith('--dsh-')).map((d) => d.name))];
console.log('--dsh declared:', dsh.length, dsh);
