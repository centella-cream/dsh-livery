#!/usr/bin/env node
/**
 * Gap analysis: hardcoded colour literals outside the token sheets, and the
 * token names that components read but ui-theme never declares.
 *
 * Scope: shipped CSS files only (the only place selectors are unambiguous):
 *   - @deepseek-ai/dsh-web-frontend/dist/assets/*.css   (built app shell)
 *   - @deepseek-ai/dsh-client-ui-primitives/lib/*.css   (component stylesheets)
 * Output: research/extracted/hardcoded-colors.json
 */
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE = '/Users/ryanzhang/Personal/openprojects/dsh-livery';
const PKG_ROOT =
  '/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai';
const OUT = path.join(WORKSPACE, 'research/extracted/hardcoded-colors.json');

const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/;

function parseRules(css) {
  const rules = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i += 1;
    if (i >= css.length) break;
    if (css[i] === '@') {
      // skip at-rule prelude; keep inner rules by descending one level
      const brace = css.indexOf('{', i);
      if (brace < 0) break;
      const prelude = css.slice(i, brace).trim().slice(0, 80);
      i = brace + 1;
      // only descend for supports/media; skip keyframes bodies crudely
      let depth = 1;
      const start = i;
      while (i < css.length && depth > 0) {
        if (css[i] === '{') depth += 1;
        if (css[i] === '}') depth -= 1;
        i += 1;
      }
      if (/@(media|supports|layer)/.test(prelude)) {
        rules.push(...parseRules(css.slice(start, i - 1)).map((r) => ({ ...r, at: prelude })));
      }
      continue;
    }
    let sel = '';
    while (i < css.length && css[i] !== '{' && css[i] !== '}') {
      sel += css[i];
      i += 1;
    }
    if (i >= css.length) break;
    if (css[i] === '}') {
      i += 1;
      continue;
    }
    i += 1;
    let body = '';
    let depth = 1;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1;
      if (css[i] === '}') depth -= 1;
      if (depth > 0) body += css[i];
      i += 1;
    }
    rules.push({ selector: sel.trim().replace(/\s+/g, ' '), body, at: null });
  }
  return rules;
}

const files = [];
const frontend = path.join(PKG_ROOT, 'dsh-web-frontend/dist/assets');
for (const f of fs.readdirSync(frontend)) if (f.endsWith('.css')) files.push({ pkg: 'dsh-web-frontend', abs: path.join(frontend, f) });
const primitives = path.join(PKG_ROOT, 'dsh-client-ui-primitives/lib');
for (const f of fs.readdirSync(primitives)) if (f.endsWith('.css')) files.push({ pkg: 'dsh-client-ui-primitives', abs: path.join(primitives, f) });

const findings = [];
const byFile = {};
let tokenDecls = 0;

for (const { pkg, abs } of files) {
  const css = fs.readFileSync(abs, 'utf8');
  const rel = path.relative(PKG_ROOT, abs);
  const stats = { rules: 0, literalDeclarations: 0, tokenDeclarations: 0, samples: [] };
  for (const rule of parseRules(css)) {
    stats.rules += 1;
    for (const decl of rule.body.split(';')) {
      const idx = decl.indexOf(':');
      if (idx < 0) continue;
      const prop = decl.slice(0, idx).trim();
      const value = decl.slice(idx + 1).trim();
      if (!prop) continue;
      if (prop.startsWith('--dsw-') || prop.startsWith('--dsh-')) {
        tokenDecls += 1;
        if (prop.startsWith('--dsw-')) {
          findings.push({ kind: 'token-declaration-outside-theme', file: rel, selector: rule.selector, property: prop, value, note: 'Token declared outside ui-theme (component-local rebind or gap).' });
        }
        continue;
      }
      if (prop.startsWith('--')) continue;
      if (!COLOR.test(value)) continue;
      if (/var\(/.test(value)) continue;
      stats.literalDeclarations += 1;
      if (stats.samples.length < 6 && /color|background|border|fill|shadow|outline/.test(prop)) {
        stats.samples.push({ selector: rule.selector.slice(0, 120), property: prop, value });
      }
    }
  }
  byFile[rel] = stats;
}

const summary = {
  generatedAt: new Date().toISOString(),
  scope: 'shipped CSS files only (frontend dist + primitives component css)',
  files: byFile,
  totalLiteralDeclarations: Object.values(byFile).reduce((a, b) => a + b.literalDeclarations, 0),
  totalTokenDeclarations: tokenDecls,
  tokenDeclarationsOutsideTheme: findings,
};

fs.writeFileSync(OUT, `${JSON.stringify(summary, null, 2)}\n`);
console.log('files:', Object.keys(byFile).length);
for (const [f, s] of Object.entries(byFile)) console.log(` ${f}: rules=${s.rules} literal=${s.literalDeclarations}`);
console.log('token declarations outside theme:', findings.length);
for (const f of findings.slice(0, 10)) console.log(' -', f.file, f.selector, f.property, '=', f.value);
